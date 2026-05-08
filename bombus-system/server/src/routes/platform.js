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
    { key: 'interviewer', name: 'interviewer', desc: '面試官（僅見被指派候選人）', scope: 'global' },
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

  // 驗證 industry（若提供）：必須是 industries.code 中的有效值（D-16）
  if (industry) {
    const industryRow = platformDB.queryOne(
      'SELECT code FROM industries WHERE code = ?',
      [industry]
    );
    if (!industryRow) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `產業代碼 '${industry}' 無效，必須為 industries 表中已存在的代碼`
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
    // 驗證 industry FK（若非 null/空字串）
    if (industry) {
      const industryRow = platformDB.queryOne(
        'SELECT code FROM industries WHERE code = ?',
        [industry]
      );
      if (!industryRow) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `產業代碼 '${industry}' 無效，必須為 industries 表中已存在的代碼`
        });
      }
    }
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

// ════════════════════════════════════════════════════════════
//  D-16 產業類別管理 (industry-classification)
// ════════════════════════════════════════════════════════════

// GET /api/platform/industries — 列表 (支援 ?active=true 過濾)
router.get('/industries', (req, res) => {
  const platformDB = getPlatformDB();
  const onlyActive = req.query.active === 'true';

  let sql = `
    SELECT i.code, i.name, i.display_order, i.is_active, i.created_at,
           (SELECT COUNT(*) FROM tenants WHERE industry = i.code) AS tenant_count,
           (SELECT COUNT(*) FROM industry_dept_assignments WHERE industry_code = i.code) AS assignment_count
    FROM industries i
  `;
  if (onlyActive) sql += ' WHERE i.is_active = 1';
  sql += ' ORDER BY i.display_order ASC, i.code ASC';

  const rows = platformDB.query(sql);
  res.json(rows);
});

// POST /api/platform/industries — 新增
router.post('/industries', (req, res) => {
  const { code, name, display_order } = req.body;
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  if (!code || !name) {
    return res.status(400).json({ error: 'BadRequest', message: '缺少必要欄位：code, name' });
  }
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(code)) {
    return res.status(400).json({ error: 'BadRequest', message: 'code 格式不正確（kebab-case，至少 2 字元）' });
  }

  const existing = platformDB.queryOne('SELECT code FROM industries WHERE code = ?', [code]);
  if (existing) {
    return res.status(409).json({ error: 'Conflict', message: `產業代碼 '${code}' 已存在` });
  }

  platformDB.run(
    'INSERT INTO industries (code, name, display_order, is_active) VALUES (?, ?, ?, 1)',
    [code, name, display_order || 0]
  );

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'industry_create',
    resource: 'industry',
    details: { code, name },
    ip
  });

  res.status(201).json({ code, name, display_order: display_order || 0, is_active: 1 });
});

// PUT /api/platform/industries/:code — 更新（不可改 code）
router.put('/industries/:code', (req, res) => {
  const { name, display_order, is_active } = req.body;
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  const existing = platformDB.queryOne('SELECT code FROM industries WHERE code = ?', [req.params.code]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: '產業不存在' });
  }

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (display_order !== undefined) { updates.push('display_order = ?'); params.push(display_order); }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'BadRequest', message: '沒有提供任何更新欄位' });
  }

  params.push(req.params.code);
  platformDB.run(`UPDATE industries SET ${updates.join(', ')} WHERE code = ?`, params);

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'industry_update',
    resource: 'industry',
    details: { code: req.params.code, ...req.body },
    ip
  });

  const updated = platformDB.queryOne('SELECT * FROM industries WHERE code = ?', [req.params.code]);
  res.json(updated);
});

// DELETE /api/platform/industries/:code — 刪除（被引用時阻擋）
router.delete('/industries/:code', (req, res) => {
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  const existing = platformDB.queryOne('SELECT code FROM industries WHERE code = ?', [req.params.code]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: '產業不存在' });
  }

  // 檢查引用：tenants.industry 或 industry_dept_assignments.industry_code
  const refTenants = platformDB.query(
    'SELECT id, name FROM tenants WHERE industry = ?',
    [req.params.code]
  );
  const refAssignments = platformDB.query(
    'SELECT COUNT(*) AS cnt FROM industry_dept_assignments WHERE industry_code = ?',
    [req.params.code]
  );
  const assignCount = refAssignments[0]?.cnt || 0;

  if (refTenants.length > 0 || assignCount > 0) {
    return res.status(409).json({
      error: 'Conflict',
      message: `產業使用中無法刪除（${refTenants.length} 個租戶、${assignCount} 個範本指派引用），請改用「停用」(PUT { is_active: 0 })`,
      tenants: refTenants.map(t => ({ id: t.id, name: t.name })),
      assignment_count: assignCount
    });
  }

  platformDB.run('DELETE FROM industries WHERE code = ?', [req.params.code]);

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'industry_delete',
    resource: 'industry',
    details: { code: req.params.code },
    ip
  });

  res.json({ code: req.params.code, deleted: true });
});

// POST /api/platform/industries/:code/move — 上下移動排序（與相鄰列交換 display_order）
// body: { direction: 'up' | 'down' }
// 'other' 視為固定錨點：不可移動，且其他列的相鄰計算會跳過 'other'
router.post('/industries/:code/move', (req, res) => {
  const { direction } = req.body || {};
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'BadRequest', message: 'direction 必須為 up 或 down' });
  }

  const target = platformDB.queryOne(
    'SELECT code, name, display_order FROM industries WHERE code = ?',
    [req.params.code]
  );
  if (!target) {
    return res.status(404).json({ error: 'NotFound', message: '產業不存在' });
  }
  if (target.code === 'other') {
    return res.status(400).json({ error: 'BadRequest', message: '"other" 為固定錨點，無法移動' });
  }

  const adjacent = direction === 'up'
    ? platformDB.queryOne(
        `SELECT code, display_order FROM industries
         WHERE display_order < ? AND code != 'other'
         ORDER BY display_order DESC, code DESC LIMIT 1`,
        [target.display_order]
      )
    : platformDB.queryOne(
        `SELECT code, display_order FROM industries
         WHERE display_order > ? AND code != 'other'
         ORDER BY display_order ASC, code ASC LIMIT 1`,
        [target.display_order]
      );

  if (!adjacent) {
    return res.status(409).json({
      error: 'Conflict',
      message: direction === 'up' ? '已位於最上方' : '已位於最下方'
    });
  }

  platformDB.transaction(() => {
    platformDB.run('UPDATE industries SET display_order = ? WHERE code = ?', [adjacent.display_order, target.code]);
    platformDB.run('UPDATE industries SET display_order = ? WHERE code = ?', [target.display_order, adjacent.code]);
  });

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'industry_move',
    resource: 'industry',
    details: { code: target.code, direction, swapped_with: adjacent.code },
    ip
  });

  res.json({ swapped: [target.code, adjacent.code], direction });
});

// ════════════════════════════════════════════════════════════
//  D-16 部門範本管理 (department-template-import)
// ════════════════════════════════════════════════════════════

// GET /api/platform/department-templates — 列表（可選 ?industry= / ?is_common=true）
router.get('/department-templates', (req, res) => {
  const platformDB = getPlatformDB();
  const { industry, is_common } = req.query;

  let sql = 'SELECT * FROM department_templates';
  const params = [];
  const conds = [];

  if (industry) {
    sql = `
      SELECT dt.*, ida.sizes_json, ida.display_order AS assignment_order
      FROM department_templates dt
      JOIN industry_dept_assignments ida ON ida.dept_template_id = dt.id
      WHERE ida.industry_code = ?
    `;
    params.push(industry);
    if (is_common !== undefined) {
      sql += ' AND dt.is_common = ?';
      params.push(is_common === 'true' ? 1 : 0);
    }
    sql += ' ORDER BY dt.is_common DESC, ida.display_order ASC, dt.name ASC';
  } else {
    if (is_common !== undefined) conds.push('is_common = ' + (is_common === 'true' ? 1 : 0));
    if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
    sql += ' ORDER BY is_common DESC, name ASC';
  }

  const rows = platformDB.query(sql, params);
  // 解析 value JSON
  const result = rows.map(r => ({
    ...r,
    value: parseJsonField(r.value, []),
    sizes_json: r.sizes_json ? parseJsonField(r.sizes_json, []) : undefined
  }));
  res.json(result);
});

// POST /api/platform/department-templates — 新增範本
router.post('/department-templates', (req, res) => {
  const { name, value, is_common } = req.body;
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  if (!name) {
    return res.status(400).json({ error: 'BadRequest', message: '缺少必要欄位：name' });
  }

  const id = uuidv4();
  platformDB.run(
    `INSERT INTO department_templates (id, name, value, is_common) VALUES (?, ?, ?, ?)`,
    [id, name, JSON.stringify(value || []), is_common ? 1 : 0]
  );

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'dept_template_create',
    resource: 'department_template',
    details: { id, name, is_common: !!is_common },
    ip
  });

  res.status(201).json({ id, name, value: value || [], is_common: is_common ? 1 : 0 });
});

// PUT /api/platform/department-templates/:id — 更新
router.put('/department-templates/:id', (req, res) => {
  const { name, value, is_common } = req.body;
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  const existing = platformDB.queryOne('SELECT id FROM department_templates WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: '範本不存在' });
  }

  const updates = [];
  const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (value !== undefined) { updates.push('value = ?'); params.push(JSON.stringify(value)); }
  if (is_common !== undefined) { updates.push('is_common = ?'); params.push(is_common ? 1 : 0); }
  updates.push("updated_at = datetime('now')");

  if (updates.length === 1) {
    return res.status(400).json({ error: 'BadRequest', message: '沒有提供任何更新欄位' });
  }

  params.push(req.params.id);
  platformDB.run(`UPDATE department_templates SET ${updates.join(', ')} WHERE id = ?`, params);

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'dept_template_update',
    resource: 'department_template',
    details: { id: req.params.id, name },
    ip
  });

  const updated = platformDB.queryOne('SELECT * FROM department_templates WHERE id = ?', [req.params.id]);
  res.json({ ...updated, value: parseJsonField(updated.value, []) });
});

// DELETE /api/platform/department-templates/:id — 刪除（CASCADE 連帶刪除指派）
router.delete('/department-templates/:id', (req, res) => {
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  const existing = platformDB.queryOne('SELECT id, name FROM department_templates WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: '範本不存在' });
  }

  // CASCADE 自動刪除 industry_dept_assignments 中的對應 row
  platformDB.run('DELETE FROM department_templates WHERE id = ?', [req.params.id]);

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'dept_template_delete',
    resource: 'department_template',
    details: { id: req.params.id, name: existing.name },
    ip
  });

  res.json({ id: req.params.id, deleted: true });
});

// ─── 產業 × 範本指派 (industry_dept_assignments) ───

// GET /api/platform/industry-dept-assignments?industry=xxx — 列表（必填 industry）
router.get('/industry-dept-assignments', (req, res) => {
  const platformDB = getPlatformDB();
  const { industry } = req.query;

  if (!industry) {
    return res.status(400).json({ error: 'BadRequest', message: 'industry query param 必填' });
  }

  const rows = platformDB.query(
    `SELECT ida.id, ida.industry_code, ida.dept_template_id, ida.sizes_json, ida.display_order,
            dt.name AS template_name, dt.value AS template_value, dt.is_common
     FROM industry_dept_assignments ida
     JOIN department_templates dt ON dt.id = ida.dept_template_id
     WHERE ida.industry_code = ?
     ORDER BY dt.is_common DESC, ida.display_order ASC, dt.name ASC`,
    [industry]
  );

  const result = rows.map(r => ({
    ...r,
    sizes_json: parseJsonField(r.sizes_json, []),
    template_value: parseJsonField(r.template_value, [])
  }));
  res.json(result);
});

// POST /api/platform/industry-dept-assignments — 新增指派
router.post('/industry-dept-assignments', (req, res) => {
  const { industry_code, dept_template_id, sizes_json, display_order } = req.body;
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  if (!industry_code || !dept_template_id) {
    return res.status(400).json({ error: 'BadRequest', message: '缺少必要欄位：industry_code, dept_template_id' });
  }

  // 驗證 FK
  const industry = platformDB.queryOne('SELECT code FROM industries WHERE code = ?', [industry_code]);
  if (!industry) {
    return res.status(400).json({ error: 'BadRequest', message: `產業代碼 '${industry_code}' 不存在` });
  }
  const tpl = platformDB.queryOne('SELECT id FROM department_templates WHERE id = ?', [dept_template_id]);
  if (!tpl) {
    return res.status(400).json({ error: 'BadRequest', message: '範本不存在' });
  }

  // 重複檢查
  const existing = platformDB.queryOne(
    'SELECT id FROM industry_dept_assignments WHERE industry_code = ? AND dept_template_id = ?',
    [industry_code, dept_template_id]
  );
  if (existing) {
    return res.status(409).json({ error: 'Conflict', message: '此產業已指派此範本' });
  }

  const id = uuidv4();
  const sizes = Array.isArray(sizes_json) ? sizes_json : (sizes_json || []);
  platformDB.run(
    'INSERT INTO industry_dept_assignments (id, industry_code, dept_template_id, sizes_json, display_order) VALUES (?, ?, ?, ?, ?)',
    [id, industry_code, dept_template_id, JSON.stringify(sizes), display_order || 0]
  );

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'industry_dept_assignment_create',
    resource: 'industry_dept_assignment',
    details: { id, industry_code, dept_template_id, sizes },
    ip
  });

  res.status(201).json({ id, industry_code, dept_template_id, sizes_json: sizes, display_order: display_order || 0 });
});

// PUT /api/platform/industry-dept-assignments/:id — 更新（主要更新 sizes_json）
router.put('/industry-dept-assignments/:id', (req, res) => {
  const { sizes_json, display_order } = req.body;
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  const existing = platformDB.queryOne('SELECT id FROM industry_dept_assignments WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: '指派不存在' });
  }

  const updates = [];
  const params = [];
  if (sizes_json !== undefined) {
    const sizes = Array.isArray(sizes_json) ? sizes_json : sizes_json;
    updates.push('sizes_json = ?');
    params.push(JSON.stringify(sizes));
  }
  if (display_order !== undefined) {
    updates.push('display_order = ?');
    params.push(display_order);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'BadRequest', message: '沒有提供任何更新欄位' });
  }

  params.push(req.params.id);
  platformDB.run(`UPDATE industry_dept_assignments SET ${updates.join(', ')} WHERE id = ?`, params);

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'industry_dept_assignment_update',
    resource: 'industry_dept_assignment',
    details: { id: req.params.id, ...req.body },
    ip
  });

  const updated = platformDB.queryOne('SELECT * FROM industry_dept_assignments WHERE id = ?', [req.params.id]);
  res.json({ ...updated, sizes_json: parseJsonField(updated.sizes_json, []) });
});

// DELETE /api/platform/industry-dept-assignments/:id — 移除指派
router.delete('/industry-dept-assignments/:id', (req, res) => {
  const platformDB = getPlatformDB();
  const ip = getClientIP(req);

  const existing = platformDB.queryOne('SELECT * FROM industry_dept_assignments WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: '指派不存在' });
  }

  platformDB.run('DELETE FROM industry_dept_assignments WHERE id = ?', [req.params.id]);

  logAudit(platformDB, {
    user_id: req.user.userId,
    action: 'industry_dept_assignment_delete',
    resource: 'industry_dept_assignment',
    details: { id: req.params.id },
    ip
  });

  res.json({ id: req.params.id, deleted: true });
});

// ─── helper：JSON 欄位安全解析 ───
function parseJsonField(s, fallback) {
  if (s === null || s === undefined) return fallback;
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

module.exports = router;
