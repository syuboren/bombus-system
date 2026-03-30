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
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const { authMiddleware, platformAdminMiddleware } = require('../middleware/auth');
const { getPlatformDB } = require('../db/platform-db');
const { tenantDBManager } = require('../db/tenant-db-manager');
const { initTenantSchema, seedDefaultRoleFeaturePerms } = require('../db/tenant-schema');
const { logAudit, getClientIP } = require('../utils/audit-logger');

// ══════════════════════════════════════════════════════════
//  RBAC 種子資料（新租戶初始化用）
// ══════════════════════════════════════════════════════════

const PERMISSION_RESOURCES = [
  { resource: 'employee', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'recruitment', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'talent_pool', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'meeting', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'competency', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'monthly_check', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'weekly_report', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'quarterly_review', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'template', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'submission', actions: ['read', 'create', 'update'] },
  { resource: 'approval', actions: ['read', 'approve', 'reject'] },
  { resource: 'job_description', actions: ['read', 'create', 'update', 'delete', 'approve'] },
  { resource: 'grade_matrix', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'organization', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'export', actions: ['read'] },
  { resource: 'job', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'onboarding', actions: ['read', 'create', 'update', 'manage'] },
  { resource: 'user', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'role', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'audit', actions: ['read'] },
];

/**
 * 在新租戶 DB 建立 RBAC 種子資料
 */
function seedTenantRBAC(tenantAdapter, tenantName, adminEmail, adminName, passwordHash) {
  const db = tenantAdapter.raw;

  function rawExec(sql, params) {
    try {
      const stmt = db.prepare(sql);
      stmt.bind(params.map(p => p === undefined ? null : p));
      stmt.step();
      stmt.free();
    } catch (e) { /* INSERT OR IGNORE */ }
  }

  db.run('PRAGMA foreign_keys = OFF');
  db.run('BEGIN TRANSACTION');

  // 1. 組織根節點
  const orgRootId = uuidv4();
  rawExec('INSERT OR IGNORE INTO org_units (id, name, type, parent_id, level) VALUES (?, ?, ?, ?, ?)',
    [orgRootId, tenantName, 'group', null, 0]);

  // 2. 系統角色
  const roleIds = {};
  const roles = [
    { key: 'super_admin', name: 'super_admin', desc: '超級管理員（全權限）', scope: 'global' },
    { key: 'subsidiary_admin', name: 'subsidiary_admin', desc: '子公司管理員', scope: 'subsidiary' },
    { key: 'hr_manager', name: 'hr_manager', desc: '人資管理員', scope: 'global' },
    { key: 'dept_manager', name: 'dept_manager', desc: '部門主管', scope: 'department' },
    { key: 'employee', name: 'employee', desc: '一般員工', scope: 'department' },
  ];
  for (const r of roles) {
    roleIds[r.key] = uuidv4();
    rawExec('INSERT OR IGNORE INTO roles (id, name, description, scope_type, is_system) VALUES (?, ?, ?, ?, 1)',
      [roleIds[r.key], r.name, r.desc, r.scope]);
  }

  // 3. 權限定義
  const allPerms = [];
  for (const r of PERMISSION_RESOURCES) {
    for (const action of r.actions) {
      const id = `perm-${r.resource}-${action}`;
      allPerms.push({ id, resource: r.resource, action });
      rawExec('INSERT OR IGNORE INTO permissions (id, resource, action, description) VALUES (?, ?, ?, ?)',
        [id, r.resource, action, `${r.resource}:${action}`]);
    }
  }

  // 4. 角色-權限對應
  for (const p of allPerms) {
    rawExec('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      [roleIds.super_admin, p.id]);
  }
  for (const p of allPerms) {
    const isAdminOnly = ['user', 'role'].includes(p.resource) && p.action !== 'read';
    if (!isAdminOnly) {
      rawExec('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleIds.subsidiary_admin, p.id]);
    }
  }
  const hrRes = ['employee', 'recruitment', 'talent_pool', 'meeting', 'competency',
    'monthly_check', 'weekly_report', 'quarterly_review', 'template', 'submission',
    'approval', 'job_description', 'grade_matrix', 'organization', 'export', 'job', 'onboarding'];
  for (const p of allPerms) {
    if (hrRes.includes(p.resource)) {
      rawExec('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleIds.hr_manager, p.id]);
    }
  }
  const deptRes = ['employee', 'meeting', 'monthly_check', 'weekly_report',
    'quarterly_review', 'submission', 'approval', 'export', 'onboarding'];
  for (const p of allPerms) {
    if (deptRes.includes(p.resource)) {
      rawExec('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleIds.dept_manager, p.id]);
    }
  }
  const empRead = ['employee', 'meeting', 'monthly_check', 'weekly_report',
    'quarterly_review', 'submission', 'export', 'job_description', 'grade_matrix',
    'organization', 'competency'];
  const empWrite = ['weekly_report', 'submission'];
  for (const p of allPerms) {
    const canRead = p.action === 'read' && empRead.includes(p.resource);
    const canWrite = ['create', 'update'].includes(p.action) && empWrite.includes(p.resource);
    if (canRead || canWrite) {
      rawExec('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [roleIds.employee, p.id]);
    }
  }

  // 5. Feature-based 角色權限（新模型）
  seedDefaultRoleFeaturePerms(db, roleIds);

  // 6. 管理員帳號
  const userId = uuidv4();
  rawExec('INSERT OR IGNORE INTO users (id, email, password_hash, name, status) VALUES (?, ?, ?, ?, ?)',
    [userId, adminEmail, passwordHash, adminName, 'active']);

  // 7. 指派 super_admin
  rawExec('INSERT OR IGNORE INTO user_roles (user_id, role_id, org_unit_id) VALUES (?, ?, ?)',
    [userId, roleIds.super_admin, orgRootId]);

  db.run('COMMIT');
  db.run('PRAGMA foreign_keys = ON');
  tenantAdapter.save();
}

// Logo 上傳設定
const logoDir = path.join(__dirname, '../../uploads/logos');
if (!fs.existsSync(logoDir)) {
  fs.mkdirSync(logoDir, { recursive: true });
}

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `tenant-logo-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('僅支援 JPEG、PNG、WebP 格式'), false);
    }
  }
});

// 所有路由需 Platform Admin
router.use(authMiddleware, platformAdminMiddleware);

// ══════════════════════════════════════════════════════════
//  Logo 上傳
// ══════════════════════════════════════════════════════════

router.post('/upload-logo', logoUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'BadRequest', message: '未上傳檔案' });
  }
  res.json({
    success: true,
    url: `/uploads/logos/${req.file.filename}`
  });
});

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
    total,
    page: parseInt(page),
    limit: parseInt(limit)
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

router.post('/tenants', async (req, res) => {
  const { name, slug, plan_id, logo_url, industry, admin_email, admin_name, admin_password } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  if (!name || !slug) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：name, slug'
    });
  }

  // 管理員欄位驗證
  if (!admin_email || !admin_name || !admin_password) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少管理員帳號欄位：admin_email, admin_name, admin_password'
    });
  }

  if (admin_password.length < 6) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '管理員密碼至少 6 個字元'
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
      `INSERT INTO tenants (id, name, slug, status, plan_id, db_file, logo_url, industry)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?)`,
      [tenantId, name, slug, plan_id || null, dbFile, logo_url || null, industry || null]
    );

    // 建立租戶資料庫並初始化 schema
    const tenantAdapter = tenantDBManager.createTenantDB(tenantId, initTenantSchema);

    // 建立 RBAC 種子資料 + 管理員帳號
    const passwordHash = await bcrypt.hash(admin_password, 10);
    seedTenantRBAC(tenantAdapter, name, admin_email, admin_name, passwordHash);

    logAudit(platformDB, {
      user_id: req.user.userId,
      action: 'tenant_create',
      resource: 'tenant',
      details: { tenant_id: tenantId, name, slug, admin_email },
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
  const { name, status, plan_id, logo_url, industry, feature_overrides, feature_overrides_note } = req.body;
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

  if (logo_url !== undefined) {
    updates.push('logo_url = ?');
    params.push(logo_url || null);
  }

  if (industry !== undefined) {
    updates.push('industry = ?');
    params.push(industry || null);
  }

  if (feature_overrides !== undefined) {
    let overridesStr = null;
    if (feature_overrides !== null) {
      overridesStr = typeof feature_overrides === 'object'
        ? JSON.stringify(feature_overrides)
        : feature_overrides;
    }
    updates.push('feature_overrides = ?');
    params.push(overridesStr);
  }

  if (feature_overrides_note !== undefined) {
    updates.push('feature_overrides_note = ?');
    params.push(feature_overrides_note || null);
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

// ─── 租戶管理員列表 ───

router.get('/tenants/:id/admins', (req, res) => {
  const platformDB = getPlatformDB();
  const tenant = platformDB.queryOne('SELECT * FROM tenants WHERE id = ?', [req.params.id]);

  if (!tenant) {
    return res.status(404).json({ error: 'NotFound', message: '租戶不存在' });
  }

  if (tenant.status === 'deleted' || !tenantDBManager.exists(tenant.id)) {
    return res.json([]);
  }

  try {
    const tenantDB = tenantDBManager.getDB(tenant.id);
    const admins = tenantDB.query(
      `SELECT u.id, u.email, u.name, u.status, u.created_at,
              GROUP_CONCAT(r.name, ', ') as role_names
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name IN ('super_admin', 'subsidiary_admin')
       GROUP BY u.id
       ORDER BY u.created_at ASC`
    );
    res.json(admins);
  } catch (err) {
    console.error('Get tenant admins error:', err);
    res.json([]);
  }
});

// ─── 更新租戶管理員 ───

router.put('/tenants/:id/admins/:userId', async (req, res) => {
  const { name, email, password } = req.body;
  const platformDB = getPlatformDB();
  const tenant = platformDB.queryOne('SELECT * FROM tenants WHERE id = ?', [req.params.id]);

  if (!tenant) {
    return res.status(404).json({ error: 'NotFound', message: '租戶不存在' });
  }

  if (!tenantDBManager.exists(tenant.id)) {
    return res.status(400).json({ error: 'BadRequest', message: '租戶資料庫不存在' });
  }

  try {
    const tenantDB = tenantDBManager.getDB(tenant.id);
    const user = tenantDB.queryOne('SELECT * FROM users WHERE id = ?', [req.params.userId]);

    if (!user) {
      return res.status(404).json({ error: 'NotFound', message: '使用者不存在' });
    }

    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email) {
      // 檢查 email 是否被其他使用者佔用
      const emailExists = tenantDB.queryOne(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.params.userId]
      );
      if (emailExists) {
        return res.status(409).json({ error: 'Conflict', message: `email '${email}' 已被使用` });
      }
      updates.push('email = ?');
      params.push(email);
    }
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'BadRequest', message: '密碼至少 6 個字元' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'BadRequest', message: '沒有提供任何更新欄位' });
    }

    updates.push("updated_at = datetime('now')");
    params.push(req.params.userId);

    tenantDB.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    const updated = tenantDB.queryOne(
      'SELECT id, email, name, status, created_at FROM users WHERE id = ?',
      [req.params.userId]
    );

    res.json(updated);
  } catch (err) {
    console.error('Update tenant admin error:', err);
    return res.status(500).json({ error: 'InternalError', message: '更新管理員失敗' });
  }
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
  const { name, max_users, max_subsidiaries, max_storage_gb, features, price_monthly, price_yearly, is_active } = req.body;
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
    `INSERT INTO subscription_plans (id, name, max_users, max_subsidiaries, max_storage_gb, features, price_monthly, price_yearly, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, max_users || 50, max_subsidiaries || 5, max_storage_gb || 5, featuresStr, price_monthly || 0, price_yearly || 0, is_active !== undefined ? is_active : 1]
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
  const { name, max_users, max_subsidiaries, max_storage_gb, features, price_monthly, price_yearly, is_active } = req.body;
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
  if (max_storage_gb !== undefined) {
    updates.push('max_storage_gb = ?');
    params.push(max_storage_gb);
  }
  if (features !== undefined) {
    const featuresStr = typeof features === 'object' ? JSON.stringify(features) : features;
    updates.push('features = ?');
    params.push(featuresStr);
  }
  if (price_monthly !== undefined) {
    updates.push('price_monthly = ?');
    params.push(price_monthly);
  }
  if (price_yearly !== undefined) {
    updates.push('price_yearly = ?');
    params.push(price_yearly);
  }
  if (is_active !== undefined) {
    updates.push('is_active = ?');
    params.push(is_active);
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
