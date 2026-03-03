/**
 * Platform Management Routes — 平台管理 API
 *
 * 所有端點需 Platform Admin 身份驗證
 *
 * === 租戶管理 ===
 * GET    /api/platform/tenants          — 租戶列表（分頁+搜尋）
 * POST   /api/platform/tenants          — 新增租戶
 * GET    /api/platform/tenants/:id      — 租戶詳情
 * PUT    /api/platform/tenants/:id      — 更新租戶（狀態/方案/恢復）
 * DELETE /api/platform/tenants/:id      — 軟刪除租戶
 * DELETE /api/platform/tenants/:id/purge — 硬刪除租戶（需二次確認）
 *
 * === 方案管理 ===
 * GET    /api/platform/plans            — 方案列表
 * POST   /api/platform/plans            — 新增方案
 * PUT    /api/platform/plans/:id        — 更新方案
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { authMiddleware, platformAdminMiddleware } = require('../middleware/auth');
const { getPlatformDB } = require('../db/platform-db');
const { tenantDBManager } = require('../db/tenant-db-manager');
const { initTenantSchema } = require('../db/tenant-schema');
const { logAudit, getClientIP } = require('../utils/audit-logger');

// 所有路由需 Platform Admin
router.use(authMiddleware, platformAdminMiddleware);

// ══════════════════════════════════════════════════════════
//  租戶管理
// ══════════════════════════════════════════════════════════

// ─── 租戶列表 ───

router.get('/tenants', (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const platformDB = getPlatformDB();

  let whereClauses = [];
  let params = [];

  if (search) {
    whereClauses.push('(t.name LIKE ? OR t.slug LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClauses.push('t.status = ?');
    params.push(status);
  }

  const whereSQL = whereClauses.length > 0
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';

  const total = platformDB.queryOne(
    `SELECT COUNT(*) as count FROM tenants t ${whereSQL}`,
    params
  ).count;

  const tenants = platformDB.query(
    `SELECT t.*, sp.name as plan_name
     FROM tenants t
     LEFT JOIN subscription_plans sp ON sp.id = t.plan_id
     ${whereSQL}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    data: tenants,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// ─── 租戶詳情 ───

router.get('/tenants/:id', (req, res) => {
  const platformDB = getPlatformDB();
  const tenant = platformDB.queryOne(
    `SELECT t.*, sp.name as plan_name
     FROM tenants t
     LEFT JOIN subscription_plans sp ON sp.id = t.plan_id
     WHERE t.id = ?`,
    [req.params.id]
  );

  if (!tenant) {
    return res.status(404).json({
      error: 'NotFound',
      message: '租戶不存在'
    });
  }

  // 查詢租戶統計（若 DB 存在）
  let stats = null;
  if (tenant.status !== 'deleted' && tenantDBManager.exists(tenant.id)) {
    try {
      const tenantDB = tenantDBManager.getDB(tenant.id);
      const userCount = tenantDB.queryOne('SELECT COUNT(*) as count FROM users');
      const employeeCount = tenantDB.queryOne('SELECT COUNT(*) as count FROM employees');
      stats = {
        users: userCount ? userCount.count : 0,
        employees: employeeCount ? employeeCount.count : 0
      };
    } catch (err) {
      // 統計失敗不影響回傳
    }
  }

  res.json({ ...tenant, stats });
});

// ─── 新增租戶 ───

router.post('/tenants', (req, res) => {
  const { name, slug, plan_id } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  if (!name || !slug) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：name, slug'
    });
  }

  // slug 格式驗證：小寫英數字 + 短橫線
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || slug.length < 3) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'slug 格式不正確（僅限小寫英數字與短橫線，至少 3 字元）'
    });
  }

  // 檢查 slug 重複
  const existing = platformDB.queryOne(
    'SELECT id FROM tenants WHERE slug = ?',
    [slug]
  );
  if (existing) {
    return res.status(409).json({
      error: 'Conflict',
      message: `slug '${slug}' 已被使用`
    });
  }

  // 驗證 plan_id（若提供）
  if (plan_id) {
    const plan = platformDB.queryOne(
      'SELECT id FROM subscription_plans WHERE id = ?',
      [plan_id]
    );
    if (!plan) {
      return res.status(400).json({
        error: 'BadRequest',
        message: '指定的方案不存在'
      });
    }
  }

  const tenantId = uuidv4();
  const dbFile = `tenant_${tenantId}.db`;

  try {
    // 在 platform.db 註冊租戶
    platformDB.run(
      `INSERT INTO tenants (id, name, slug, status, plan_id, db_file)
       VALUES (?, ?, ?, 'active', ?, ?)`,
      [tenantId, name, slug, plan_id || null, dbFile]
    );

    // 建立租戶資料庫並初始化 schema
    tenantDBManager.createTenantDB(tenantId, initTenantSchema);

    logAudit(platformDB, {
      user_id: req.user.userId,
      action: 'tenant_create',
      resource: 'tenant',
      details: { tenant_id: tenantId, name, slug },
      ip
    });

    const tenant = platformDB.queryOne(
      'SELECT * FROM tenants WHERE id = ?',
      [tenantId]
    );

    res.status(201).json(tenant);
  } catch (err) {
    console.error('Create tenant error:', err);
    return res.status(500).json({
      error: 'InternalError',
      message: '建立租戶失敗'
    });
  }
});

// ─── 更新租戶（狀態/方案/恢復） ───

router.put('/tenants/:id', (req, res) => {
  const { name, status, plan_id } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  const tenant = platformDB.queryOne(
    'SELECT * FROM tenants WHERE id = ?',
    [req.params.id]
  );

  if (!tenant) {
    return res.status(404).json({
      error: 'NotFound',
      message: '租戶不存在'
    });
  }

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (status) {
    const validStatuses = ['active', 'suspended', 'deleted'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `無效狀態：${status}（有效值：${validStatuses.join(', ')}）`
      });
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (plan_id !== undefined) {
    if (plan_id) {
      const plan = platformDB.queryOne(
        'SELECT id FROM subscription_plans WHERE id = ?',
        [plan_id]
      );
      if (!plan) {
        return res.status(400).json({
          error: 'BadRequest',
          message: '指定的方案不存在'
        });
      }
    }
    updates.push('plan_id = ?');
    params.push(plan_id || null);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '沒有提供任何更新欄位'
    });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  platformDB.run(
    `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  // 記錄審計
  let auditAction = 'tenant_update';
  if (status === 'suspended') auditAction = 'tenant_suspend';
  if (status === 'active' && tenant.status === 'deleted') auditAction = 'tenant_restore';
  if (status === 'active' && tenant.status === 'suspended') auditAction = 'tenant_reactivate';

  logAudit(platformDB, {
    tenant_id: tenant.id,
    user_id: req.user.userId,
    action: auditAction,
    resource: 'tenant',
    details: { name, status, plan_id, prev_status: tenant.status },
    ip
  });

  const updated = platformDB.queryOne(
    'SELECT * FROM tenants WHERE id = ?',
    [req.params.id]
  );

  res.json(updated);
});

// ─── 軟刪除租戶 ───

router.delete('/tenants/:id', (req, res) => {
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  const tenant = platformDB.queryOne(
    'SELECT * FROM tenants WHERE id = ?',
    [req.params.id]
  );

  if (!tenant) {
    return res.status(404).json({
      error: 'NotFound',
      message: '租戶不存在'
    });
  }

  if (tenant.status === 'deleted') {
    return res.status(400).json({
      error: 'BadRequest',
      message: '租戶已處於刪除狀態'
    });
  }

  platformDB.run(
    "UPDATE tenants SET status = 'deleted', updated_at = datetime('now') WHERE id = ?",
    [req.params.id]
  );

  logAudit(platformDB, {
    tenant_id: tenant.id,
    user_id: req.user.userId,
    action: 'tenant_soft_delete',
    resource: 'tenant',
    details: { name: tenant.name, prev_status: tenant.status },
    ip
  });

  res.json({ message: '租戶已標記為刪除（可恢復）' });
});

// ─── 硬刪除租戶（需二次確認） ───

router.delete('/tenants/:id/purge', (req, res) => {
  const { confirm } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  const tenant = platformDB.queryOne(
    'SELECT * FROM tenants WHERE id = ?',
    [req.params.id]
  );

  if (!tenant) {
    return res.status(404).json({
      error: 'NotFound',
      message: '租戶不存在'
    });
  }

  // 只有 deleted 狀態的租戶可以硬刪除
  if (tenant.status !== 'deleted') {
    return res.status(400).json({
      error: 'BadRequest',
      message: '只有已軟刪除的租戶才能執行硬刪除（目前狀態：' + tenant.status + '）'
    });
  }

  // 二次確認
  if (confirm !== true && confirm !== 'true') {
    return res.status(400).json({
      error: 'ConfirmationRequired',
      message: '硬刪除不可復原，請在 body 中提供 { "confirm": true }'
    });
  }

  try {
    // 刪除租戶 DB 檔案
    tenantDBManager.deleteTenantDB(tenant.id);

    // 從 platform.db 移除記錄
    platformDB.run('DELETE FROM tenants WHERE id = ?', [tenant.id]);

    logAudit(platformDB, {
      tenant_id: tenant.id,
      user_id: req.user.userId,
      action: 'tenant_purge',
      resource: 'tenant',
      details: { name: tenant.name, slug: tenant.slug },
      ip
    });

    res.json({ message: '租戶已永久刪除' });
  } catch (err) {
    console.error('Purge tenant error:', err);
    return res.status(500).json({
      error: 'InternalError',
      message: '硬刪除租戶失敗'
    });
  }
});

// ══════════════════════════════════════════════════════════
//  方案管理
// ══════════════════════════════════════════════════════════

// ─── 方案列表 ───

router.get('/plans', (req, res) => {
  const platformDB = getPlatformDB();
  const plans = platformDB.query(
    'SELECT * FROM subscription_plans ORDER BY created_at ASC'
  );

  // 附加使用中的租戶數
  const planUsage = platformDB.query(
    "SELECT plan_id, COUNT(*) as tenant_count FROM tenants WHERE status != 'deleted' GROUP BY plan_id"
  );
  const usageMap = {};
  for (const u of planUsage) {
    usageMap[u.plan_id] = u.tenant_count;
  }

  const result = plans.map(p => ({
    ...p,
    tenant_count: usageMap[p.id] || 0
  }));

  res.json(result);
});

// ─── 新增方案 ───

router.post('/plans', (req, res) => {
  const { name, max_users, max_subsidiaries, features } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  if (!name) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：name'
    });
  }

  const id = uuidv4();
  const featuresStr = typeof features === 'object' ? JSON.stringify(features) : (features || '{}');

  platformDB.run(
    `INSERT INTO subscription_plans (id, name, max_users, max_subsidiaries, features)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, max_users || 50, max_subsidiaries || 5, featuresStr]
  );

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'plan_create',
    resource: 'subscription_plan',
    details: { plan_id: id, name },
    ip
  });

  const plan = platformDB.queryOne(
    'SELECT * FROM subscription_plans WHERE id = ?',
    [id]
  );

  res.status(201).json(plan);
});

// ─── 更新方案 ───

router.put('/plans/:id', (req, res) => {
  const { name, max_users, max_subsidiaries, features } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  const plan = platformDB.queryOne(
    'SELECT * FROM subscription_plans WHERE id = ?',
    [req.params.id]
  );

  if (!plan) {
    return res.status(404).json({
      error: 'NotFound',
      message: '方案不存在'
    });
  }

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (max_users !== undefined) {
    updates.push('max_users = ?');
    params.push(max_users);
  }
  if (max_subsidiaries !== undefined) {
    updates.push('max_subsidiaries = ?');
    params.push(max_subsidiaries);
  }
  if (features !== undefined) {
    const featuresStr = typeof features === 'object' ? JSON.stringify(features) : features;
    updates.push('features = ?');
    params.push(featuresStr);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '沒有提供任何更新欄位'
    });
  }

  params.push(req.params.id);

  platformDB.run(
    `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'plan_update',
    resource: 'subscription_plan',
    details: { plan_id: req.params.id, name },
    ip
  });

  const updated = platformDB.queryOne(
    'SELECT * FROM subscription_plans WHERE id = ?',
    [req.params.id]
  );

  res.json(updated);
});

module.exports = router;
