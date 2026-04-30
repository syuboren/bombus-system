/**
 * Tenant Admin Routes — 租戶管理 API
 *
 * 需租戶認證（authMiddleware + tenantMiddleware）
 * 需 super_admin 或 subsidiary_admin 角色
 *
 * === 組織架構 ===
 * GET    /api/tenant-admin/org-units          — 組織架構列表（樹狀）
 * POST   /api/tenant-admin/org-units          — 新增組織單位
 * PUT    /api/tenant-admin/org-units/:id      — 更新組織單位
 * DELETE /api/tenant-admin/org-units/:id      — 刪除組織單位
 *
 * === 角色管理 ===
 * GET    /api/tenant-admin/roles              — 角色列表
 * POST   /api/tenant-admin/roles              — 新增角色
 * PUT    /api/tenant-admin/roles/:id          — 更新角色（含權限矩陣）
 * DELETE /api/tenant-admin/roles/:id          — 刪除角色
 *
 * === 權限定義 ===
 * GET    /api/tenant-admin/permissions        — 全部權限定義列表
 *
 * === 使用者管理 ===
 * GET    /api/tenant-admin/users              — 使用者列表
 * POST   /api/tenant-admin/users              — 新增使用者
 * PUT    /api/tenant-admin/users/:id          — 更新使用者
 *
 * === 角色指派 ===
 * GET    /api/tenant-admin/user-roles/:userId — 使用者角色列表
 * POST   /api/tenant-admin/user-roles         — 指派角色
 * DELETE /api/tenant-admin/user-roles         — 撤銷角色
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { requireRole } = require('../middleware/permission');
const { getPlatformDB } = require('../db/platform-db');
const { logAudit, getClientIP } = require('../utils/audit-logger');
const { resolveCompanyOrgUnitId } = require('../utils/org-unit');

// 所有路由需認證 + 租戶上下文 + 管理員角色
router.use(authMiddleware, tenantMiddleware, requireRole('super_admin', 'subsidiary_admin'));

// ══════════════════════════════════════════════════════════
//  組織架構 CRUD
// ══════════════════════════════════════════════════════════

router.get('/org-units', (req, res) => {
  const orgUnits = req.tenantDB.query(
    'SELECT * FROM org_units ORDER BY level ASC, name ASC'
  );
  res.json(orgUnits);
});

router.post('/org-units', (req, res) => {
  const { name, type, parent_id, code } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：name, type'
    });
  }

  const validTypes = ['group', 'subsidiary', 'department'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `無效類型：${type}（有效值：${validTypes.join(', ')}）`
    });
  }

  // code 格式驗證（選填）
  const trimmedCode = (code || '').trim() || null;
  if (trimmedCode && trimmedCode.length > 50) {
    return res.status(400).json({
      error: 'BadRequest',
      message: 'code 不可超過 50 字元'
    });
  }

  // 計算層級
  let level = 0;
  if (parent_id) {
    const parent = req.tenantDB.queryOne(
      'SELECT level FROM org_units WHERE id = ?',
      [parent_id]
    );
    if (!parent) {
      return res.status(400).json({
        error: 'BadRequest',
        message: '上層組織單位不存在'
      });
    }
    level = parent.level + 1;
  }

  const dup = req.tenantDB.queryOne(
    'SELECT id FROM org_units WHERE name = ? AND type = ? AND parent_id IS ?',
    [name, type, parent_id || null]
  );
  if (dup) {
    return res.status(409).json({
      error: 'Conflict',
      message: `「${name}」已存在於此上層單位下，請使用其他名稱`,
      existing_id: dup.id
    });
  }

  // 同上層單位下 code 也不可重複（若有提供 code）
  if (trimmedCode) {
    const dupCode = req.tenantDB.queryOne(
      'SELECT id, name FROM org_units WHERE code = ? AND parent_id IS ?',
      [trimmedCode, parent_id || null]
    );
    if (dupCode) {
      return res.status(409).json({
        error: 'Conflict',
        message: `代碼「${trimmedCode}」已被「${dupCode.name}」使用，請使用其他代碼`,
        existing_id: dupCode.id
      });
    }
  }

  // 部門層額外檢查 departments 業務主檔（不同 parent_id 但同 org_unit_id 也算重複）
  let companyOrgUnitId = null;
  if (type === 'department' && parent_id) {
    companyOrgUnitId = resolveCompanyOrgUnitId(req.tenantDB, parent_id);
    if (companyOrgUnitId) {
      const dupDept = req.tenantDB.queryOne(
        'SELECT id FROM departments WHERE name = ? AND org_unit_id = ?',
        [name, companyOrgUnitId]
      );
      if (dupDept) {
        return res.status(409).json({
          error: 'Conflict',
          message: `「${name}」已存在於此公司，請使用其他名稱`,
          existing_id: dupDept.id
        });
      }
      // departments 表 code 重複檢查（同公司內）
      if (trimmedCode) {
        const dupDeptCode = req.tenantDB.queryOne(
          'SELECT id, name FROM departments WHERE code = ? AND org_unit_id = ?',
          [trimmedCode, companyOrgUnitId]
        );
        if (dupDeptCode) {
          return res.status(409).json({
            error: 'Conflict',
            message: `代碼「${trimmedCode}」已被部門「${dupDeptCode.name}」使用，請使用其他代碼`,
            existing_id: dupDeptCode.id
          });
        }
      }
    }
  }

  const id = uuidv4();

  req.tenantDB.run(
    'INSERT INTO org_units (id, name, type, parent_id, level, code) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, type, parent_id || null, level, trimmedCode]
  );

  // 同步建立 departments 表（type=department 才需要，沿用既有設計）
  if (type === 'department' && companyOrgUnitId) {
    req.tenantDB.run(
      'INSERT INTO departments (id, name, code, org_unit_id) VALUES (?, ?, ?, ?)',
      [uuidv4(), name, trimmedCode, companyOrgUnitId]
    );
  }

  const created = req.tenantDB.queryOne(
    'SELECT * FROM org_units WHERE id = ?',
    [id]
  );

  res.status(201).json(created);
});

router.put('/org-units/:id', (req, res) => {
  const { name, parent_id } = req.body;

  const orgUnit = req.tenantDB.queryOne(
    'SELECT * FROM org_units WHERE id = ?',
    [req.params.id]
  );

  if (!orgUnit) {
    return res.status(404).json({
      error: 'NotFound',
      message: '組織單位不存在'
    });
  }

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (parent_id !== undefined) {
    if (parent_id) {
      const parent = req.tenantDB.queryOne(
        'SELECT level FROM org_units WHERE id = ?',
        [parent_id]
      );
      if (!parent) {
        return res.status(400).json({
          error: 'BadRequest',
          message: '上層組織單位不存在'
        });
      }
      updates.push('parent_id = ?', 'level = ?');
      params.push(parent_id, parent.level + 1);
    } else {
      updates.push('parent_id = NULL', 'level = 0');
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '沒有提供任何更新欄位'
    });
  }

  params.push(req.params.id);

  req.tenantDB.run(
    `UPDATE org_units SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const updated = req.tenantDB.queryOne(
    'SELECT * FROM org_units WHERE id = ?',
    [req.params.id]
  );

  res.json(updated);
});

router.delete('/org-units/:id', (req, res) => {
  const orgUnit = req.tenantDB.queryOne(
    'SELECT * FROM org_units WHERE id = ?',
    [req.params.id]
  );

  if (!orgUnit) {
    return res.status(404).json({
      error: 'NotFound',
      message: '組織單位不存在'
    });
  }

  // 檢查是否有子組織
  const children = req.tenantDB.queryOne(
    'SELECT COUNT(*) as count FROM org_units WHERE parent_id = ?',
    [req.params.id]
  );

  if (children.count > 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `此組織單位下仍有 ${children.count} 個子組織，請先刪除或移動`
    });
  }

  // 檢查是否有角色綁定；列出前 5 筆具體 user × role，避免訊息與 payload 過大
  const totalBinding = req.tenantDB.queryOne(
    'SELECT COUNT(*) AS count FROM user_roles WHERE org_unit_id = ?',
    [req.params.id]
  );

  if (totalBinding && totalBinding.count > 0) {
    const sampleBindings = req.tenantDB.query(
      `SELECT u.id AS user_id, u.name AS user_name, u.email, r.name AS role_name
       FROM user_roles ur
       JOIN users u ON u.id = ur.user_id
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.org_unit_id = ?
       ORDER BY u.name
       LIMIT 5`,
      [req.params.id]
    );
    const detail = sampleBindings
      .map(b => `${b.user_name}（${b.role_name}）`)
      .join('、');
    const more = totalBinding.count > sampleBindings.length
      ? `（另有 ${totalBinding.count - sampleBindings.length} 筆）`
      : '';
    return res.status(400).json({
      error: 'BadRequest',
      message: `此組織單位仍有角色綁定：${detail}${more}。請至「員工與帳號管理」移除後再刪除。`,
      bindings: sampleBindings,
      total: totalBinding.count
    });
  }

  // 部門類型：額外檢查員工綁定 + 同步刪除 departments 表的對應 row
  if (orgUnit.type === 'department') {
    const empCount = req.tenantDB.queryOne(
      'SELECT COUNT(*) as count FROM employees WHERE department = ? AND org_unit_id = ?',
      [orgUnit.name, orgUnit.parent_id]
    );

    if (empCount && empCount.count > 0) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `此部門仍有 ${empCount.count} 名員工，請先移動員工`
      });
    }

    const companyOrgUnitId = resolveCompanyOrgUnitId(req.tenantDB, orgUnit.parent_id);

    req.tenantDB.transaction(() => {
      req.tenantDB.run('DELETE FROM org_units WHERE id = ?', [req.params.id]);
      if (companyOrgUnitId) {
        req.tenantDB.run(
          'DELETE FROM departments WHERE name = ? AND org_unit_id = ?',
          [orgUnit.name, companyOrgUnitId]
        );
      }
    });
  } else {
    req.tenantDB.run('DELETE FROM org_units WHERE id = ?', [req.params.id]);
  }

  res.json({ success: true, message: '組織單位已刪除' });
});

// ══════════════════════════════════════════════════════════
//  角色管理 CRUD
// ══════════════════════════════════════════════════════════

router.get('/roles', (req, res) => {
  const roles = req.tenantDB.query(
    'SELECT * FROM roles ORDER BY is_system DESC, created_at ASC'
  );

  // 附加每個角色的權限數量和使用者數量
  const result = roles.map(role => {
    const permCount = req.tenantDB.queryOne(
      'SELECT COUNT(*) as count FROM role_permissions WHERE role_id = ?',
      [role.id]
    );
    const userCount = req.tenantDB.queryOne(
      'SELECT COUNT(DISTINCT user_id) as count FROM user_roles WHERE role_id = ?',
      [role.id]
    );
    return {
      ...role,
      permission_count: permCount.count,
      user_count: userCount.count
    };
  });

  res.json(result);
});

router.post('/roles', (req, res) => {
  const { name, description, permission_ids, scope_type } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  if (!name) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：name'
    });
  }

  const validScopeTypes = ['global', 'subsidiary', 'department'];
  const effectiveScopeType = validScopeTypes.includes(scope_type) ? scope_type : 'global';
  const id = uuidv4();

  req.tenantDB.run(
    'INSERT INTO roles (id, name, description, scope_type, is_system) VALUES (?, ?, ?, ?, 0)',
    [id, name, description || null, effectiveScopeType]
  );

  // 批量設定權限
  if (Array.isArray(permission_ids) && permission_ids.length > 0) {
    for (const pid of permission_ids) {
      req.tenantDB.run(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [id, pid]
      );
    }
  }

  logAudit(platformDB, {
    tenant_id: req.tenantId,
    user_id: req.user.userId,
    action: 'role_create',
    resource: 'role',
    details: { role_id: id, name, scope_type: effectiveScopeType },
    ip
  });

  const created = req.tenantDB.queryOne('SELECT * FROM roles WHERE id = ?', [id]);
  res.status(201).json(created);
});

router.put('/roles/:id', (req, res) => {
  const { name, description, permission_ids, scope_type } = req.body;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  const role = req.tenantDB.queryOne(
    'SELECT * FROM roles WHERE id = ?',
    [req.params.id]
  );

  if (!role) {
    return res.status(404).json({
      error: 'NotFound',
      message: '角色不存在'
    });
  }

  // 更新基本資訊
  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (scope_type && ['global', 'subsidiary', 'department'].includes(scope_type)) {
    updates.push('scope_type = ?');
    params.push(scope_type);
  }

  if (updates.length > 0) {
    params.push(req.params.id);
    req.tenantDB.run(
      `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  // 更新權限矩陣（全量替換）
  if (Array.isArray(permission_ids)) {
    req.tenantDB.run(
      'DELETE FROM role_permissions WHERE role_id = ?',
      [req.params.id]
    );
    for (const pid of permission_ids) {
      req.tenantDB.run(
        'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        [req.params.id, pid]
      );
    }
  }

  logAudit(platformDB, {
    tenant_id: req.tenantId,
    user_id: req.user.userId,
    action: 'role_update',
    resource: 'role',
    details: { role_id: req.params.id, name: name || role.name },
    ip
  });

  const updated = req.tenantDB.queryOne('SELECT * FROM roles WHERE id = ?', [req.params.id]);
  res.json(updated);
});

router.delete('/roles/:id', (req, res) => {
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  const role = req.tenantDB.queryOne(
    'SELECT * FROM roles WHERE id = ?',
    [req.params.id]
  );

  if (!role) {
    return res.status(404).json({
      error: 'NotFound',
      message: '角色不存在'
    });
  }

  // 系統角色不可刪除
  if (role.is_system === 1) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '系統角色不可刪除'
    });
  }

  // 檢查是否仍有使用者使用此角色
  const usageCount = req.tenantDB.queryOne(
    'SELECT COUNT(*) as count FROM user_roles WHERE role_id = ?',
    [req.params.id]
  );

  if (usageCount.count > 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `仍有 ${usageCount.count} 位使用者使用此角色，請先移除指派`
    });
  }

  // CASCADE 會自動刪除 role_permissions
  req.tenantDB.run('DELETE FROM roles WHERE id = ?', [req.params.id]);

  logAudit(platformDB, {
    tenant_id: req.tenantId,
    user_id: req.user.userId,
    action: 'role_delete',
    resource: 'role',
    details: { role_id: req.params.id, name: role.name },
    ip
  });

  res.json({ message: '角色已刪除' });
});

// ══════════════════════════════════════════════════════════
//  權限定義查詢
// ══════════════════════════════════════════════════════════

/**
 * GET /api/tenant-admin/my-permissions
 * 取得當前使用者的有效權限列表（依角色聯集）
 */
router.get('/my-permissions', (req, res) => {
  const userId = req.user.userId;
  const roles = req.user.roles || [];

  // super_admin 擁有所有權限
  if (roles.includes('super_admin')) {
    const allPerms = req.tenantDB.query(
      'SELECT DISTINCT resource || \':\' || action as perm FROM permissions'
    );
    return res.json({ permissions: allPerms.map(p => p.perm) });
  }

  // 查詢使用者所有角色的權限聯集
  const perms = req.tenantDB.query(
    `SELECT DISTINCT p.resource || ':' || p.action as perm
     FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = ?`,
    [userId]
  );

  res.json({ permissions: perms.map(p => p.perm) });
});

router.get('/permissions', (req, res) => {
  const permissions = req.tenantDB.query(
    'SELECT * FROM permissions ORDER BY resource ASC, action ASC'
  );

  // 依 resource 分組回傳
  const grouped = {};
  for (const p of permissions) {
    if (!grouped[p.resource]) {
      grouped[p.resource] = [];
    }
    grouped[p.resource].push(p);
  }

  res.json({ permissions, grouped });
});

// ══════════════════════════════════════════════════════════
//  使用者管理
// ══════════════════════════════════════════════════════════

router.get('/users', (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClauses = [];
  let params = [];

  if (search) {
    whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (status) {
    whereClauses.push('u.status = ?');
    params.push(status);
  }

  const whereSQL = whereClauses.length > 0
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';

  const total = req.tenantDB.queryOne(
    `SELECT COUNT(*) as count FROM users u ${whereSQL}`,
    params
  ).count;

  const users = req.tenantDB.query(
    `SELECT u.id, u.email, u.name, u.avatar, u.status, u.employee_id,
            u.last_login, u.created_at,
            e.name as employee_name, e.department
     FROM users u
     LEFT JOIN employees e ON e.id = u.employee_id
     ${whereSQL}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  // 附加角色資訊
  const result = users.map(user => {
    const roles = req.tenantDB.query(
      `SELECT r.id, r.name as role_name,
              CASE WHEN ur.org_unit_id IS NULL THEN 'global' ELSE ou.type END as scope_type,
              ur.org_unit_id as scope_id, ou.name as scope_name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       LEFT JOIN org_units ou ON ou.id = ur.org_unit_id
       WHERE ur.user_id = ?`,
      [user.id]
    );
    return { ...user, roles };
  });

  res.json({
    data: result,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

/**
 * @deprecated 請改用 POST /api/employee 統一員工+帳號建立流程
 * 此端點保留向後相容，未來版本將移除
 */
router.post('/users', async (req, res) => {
  res.set('Deprecation', 'true');
  res.set('Sunset', '2026-12-31');
  res.set('Link', '</api/employee>; rel="successor-version"');

  const { email, password, name, employee_id } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：email, password, name'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '密碼至少需要 8 個字元'
    });
  }

  // 檢查 email 重複
  const existing = req.tenantDB.queryOne(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );
  if (existing) {
    return res.status(409).json({
      error: 'Conflict',
      message: `email '${email}' 已被使用`
    });
  }

  // 驗證 employee_id（若提供）
  if (employee_id) {
    const emp = req.tenantDB.queryOne(
      'SELECT id FROM employees WHERE id = ?',
      [employee_id]
    );
    if (!emp) {
      return res.status(400).json({
        error: 'BadRequest',
        message: '指定的員工不存在'
      });
    }
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  req.tenantDB.run(
    `INSERT INTO users (id, email, password_hash, name, employee_id, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [id, email, passwordHash, name, employee_id || null]
  );

  const created = req.tenantDB.queryOne(
    'SELECT id, email, name, employee_id, status, created_at FROM users WHERE id = ?',
    [id]
  );

  res.status(201).json(created);
});

// ── 密碼重設 ──
router.post('/users/:id/reset-password', async (req, res) => {
  const { resetUserPassword } = require('../services/account-creation');
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  try {
    const result = await resetUserPassword(req.tenantDB, req.params.id);

    logAudit(platformDB, {
      tenant_id: req.tenantId,
      user_id: req.user.userId,
      action: 'user_password_reset',
      resource: 'user',
      details: { target_user_id: req.params.id },
      ip
    });

    res.json({ newPassword: result.newPassword });
  } catch (e) {
    if (e.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: '使用者不存在'
      });
    }
    console.error('Error resetting password:', e);
    res.status(500).json({
      error: 'InternalError',
      message: '密碼重設失敗'
    });
  }
});

router.put('/users/:id', async (req, res) => {
  const { name, status, password } = req.body;

  const user = req.tenantDB.queryOne(
    'SELECT * FROM users WHERE id = ?',
    [req.params.id]
  );

  if (!user) {
    return res.status(404).json({
      error: 'NotFound',
      message: '使用者不存在'
    });
  }

  const updates = [];
  const params = [];

  if (name) {
    updates.push('name = ?');
    params.push(name);
  }

  if (status) {
    const validStatuses = ['active', 'inactive', 'locked'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `無效狀態：${status}`
      });
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (password) {
    if (password.length < 8) {
      return res.status(400).json({
        error: 'BadRequest',
        message: '密碼至少需要 8 個字元'
      });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    updates.push('password_hash = ?');
    params.push(passwordHash);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '沒有提供任何更新欄位'
    });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);

  req.tenantDB.run(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  const updated = req.tenantDB.queryOne(
    'SELECT id, email, name, status, employee_id, last_login, created_at, updated_at FROM users WHERE id = ?',
    [req.params.id]
  );

  res.json(updated);
});

// ══════════════════════════════════════════════════════════
//  角色指派
// ══════════════════════════════════════════════════════════

router.get('/user-roles/:userId', (req, res) => {
  const roles = req.tenantDB.query(
    `SELECT (ur.user_id || '-' || ur.role_id || '-' || COALESCE(ur.org_unit_id, '')) as id,
            ur.user_id, ur.role_id, ur.org_unit_id as scope_id,
            r.name as role_name,
            CASE WHEN ur.org_unit_id IS NULL THEN 'global' ELSE ou.type END as scope_type,
            ou.name as scope_name,
            parent.name as parent_name,
            ur.created_at
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     LEFT JOIN org_units ou ON ou.id = ur.org_unit_id
     LEFT JOIN org_units parent ON parent.id = ou.parent_id
     WHERE ur.user_id = ?`,
    [req.params.userId]
  );

  res.json(roles);
});

router.post('/user-roles', (req, res) => {
  const { user_id, role_id } = req.body;
  const org_unit_id = req.body.org_unit_id || req.body.scope_id || null;
  const scope_type = req.body.scope_type || 'global';
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  if (!user_id || !role_id) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：user_id, role_id'
    });
  }

  // 驗證使用者存在
  const user = req.tenantDB.queryOne('SELECT id, name FROM users WHERE id = ?', [user_id]);
  if (!user) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '使用者不存在'
    });
  }

  // 驗證角色存在
  const role = req.tenantDB.queryOne('SELECT id, name FROM roles WHERE id = ?', [role_id]);
  if (!role) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '角色不存在'
    });
  }

  // 非 global 範圍需要 org_unit_id
  if (scope_type !== 'global' && !org_unit_id) {
    return res.status(400).json({
      error: 'BadRequest',
      message: `${scope_type} 範圍需要指定範圍對象`
    });
  }

  // 驗證 org_unit_id（若提供）
  if (org_unit_id) {
    const orgUnit = req.tenantDB.queryOne(
      'SELECT id FROM org_units WHERE id = ?',
      [org_unit_id]
    );
    if (!orgUnit) {
      return res.status(400).json({
        error: 'BadRequest',
        message: '組織單位不存在'
      });
    }
  }

  // 檢查是否已指派
  const existing = req.tenantDB.queryOne(
    'SELECT user_id FROM user_roles WHERE user_id = ? AND role_id = ? AND org_unit_id IS ?',
    [user_id, role_id, org_unit_id || null]
  );
  if (existing) {
    return res.status(409).json({
      error: 'Conflict',
      message: '此角色已指派給該使用者'
    });
  }

  req.tenantDB.run(
    'INSERT INTO user_roles (user_id, role_id, org_unit_id) VALUES (?, ?, ?)',
    [user_id, role_id, org_unit_id || null]
  );

  logAudit(platformDB, {
    tenant_id: req.tenantId,
    user_id: req.user.userId,
    action: 'user_role_assign',
    resource: 'user_role',
    details: {
      target_user_id: user_id,
      target_user_name: user.name,
      role_id,
      role_name: role.name,
      org_unit_id
    },
    ip
  });

  res.status(201).json({ message: '角色已指派' });
});

router.delete('/user-roles', (req, res) => {
  const { user_id, role_id } = req.body;
  const org_unit_id = req.body.org_unit_id || req.body.scope_id || null;
  const ip = getClientIP(req);
  const platformDB = getPlatformDB();

  if (!user_id || !role_id) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：user_id, role_id'
    });
  }

  const result = req.tenantDB.run(
    'DELETE FROM user_roles WHERE user_id = ? AND role_id = ? AND org_unit_id IS ?',
    [user_id, role_id, org_unit_id || null]
  );

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'NotFound',
      message: '找不到此角色指派記錄'
    });
  }

  logAudit(platformDB, {
    tenant_id: req.tenantId,
    user_id: req.user.userId,
    action: 'user_role_revoke',
    resource: 'user_role',
    details: { target_user_id: user_id, role_id, org_unit_id },
    ip
  });

  res.json({ message: '角色指派已撤銷' });
});

/**
 * 查詢租戶訂閱方案的已開通模組
 * @returns {Set<string>|null} - 已開通模組的 Set，null 表示不過濾（優雅降級）
 */
function getEnabledModules(req) {
  const { getTenantEnabledFeatures } = require('../middleware/permission');
  const features = getTenantEnabledFeatures(req.tenantId);
  if (features.length === 0) return null;
  const modules = new Set(features.map(id => {
    const dotIdx = id.indexOf('.');
    return dotIdx > 0 ? id.substring(0, dotIdx) : id;
  }));
  return modules.size > 0 ? modules : null;
}

// ══════════════════════════════════════════════════════════
//  Feature 定義查詢
// ══════════════════════════════════════════════════════════

router.get('/features', (req, res) => {
  const features = req.tenantDB.query(
    'SELECT * FROM features ORDER BY sort_order ASC'
  );

  // 依租戶方案過濾（SYS 始終可見，無方案時不過濾）
  const enabledModules = getEnabledModules(req);
  const filtered = enabledModules
    ? features.filter(f => f.module === 'SYS' || enabledModules.has(f.module))
    : features;

  const grouped = {};
  for (const f of filtered) {
    if (!grouped[f.module]) grouped[f.module] = [];
    grouped[f.module].push(f);
  }

  res.json({ features: filtered, grouped });
});

// ══════════════════════════════════════════════════════════
//  角色 Feature 權限 CRUD
// ══════════════════════════════════════════════════════════

router.get('/roles/:id/feature-perms', (req, res) => {
  const perms = req.tenantDB.query(
    `SELECT rfp.role_id, rfp.feature_id, rfp.action_level, rfp.edit_scope, rfp.view_scope,
            f.module, f.name AS feature_name, f.sort_order
     FROM role_feature_perms rfp
     JOIN features f ON f.id = rfp.feature_id
     WHERE rfp.role_id = ?
     ORDER BY f.sort_order ASC`,
    [req.params.id]
  );

  // 依租戶方案過濾
  const enabledModules = getEnabledModules(req);
  const filtered = enabledModules
    ? perms.filter(p => p.module === 'SYS' || enabledModules.has(p.module))
    : perms;

  res.json({ featurePerms: filtered });
});

// 取得角色下的使用者列表
router.get('/roles/:id/users', requireRole('super_admin'), async (req, res) => {
  try {
    const db = req.tenantDB;

    const role = db.queryOne('SELECT id FROM roles WHERE id = ?', [req.params.id]);
    if (!role) {
      return res.status(404).json({ error: '角色不存在' });
    }

    const rows = db.query(
      `SELECT u.id, u.name, u.email, ou.name as scope_name
       FROM user_roles ur
       JOIN users u ON u.id = ur.user_id
       LEFT JOIN org_units ou ON ou.id = ur.org_unit_id
       WHERE ur.role_id = ?
       ORDER BY u.name ASC`,
      [req.params.id]
    );

    res.json({ users: rows });
  } catch (err) {
    console.error('查詢角色使用者失敗:', err);
    res.status(500).json({ error: '查詢角色使用者失敗' });
  }
});

router.put('/roles/:id/feature-perms', (req, res) => {
  const { perms } = req.body;
  const roleId = req.params.id;

  // 驗證角色存在
  const role = req.tenantDB.queryOne(
    'SELECT * FROM roles WHERE id = ?',
    [roleId]
  );
  if (!role) {
    return res.status(404).json({
      error: 'NotFound',
      message: '角色不存在'
    });
  }

  if (!Array.isArray(perms)) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少 perms 陣列'
    });
  }

  // 載入所有 feature ID 做驗證
  const allFeatures = req.tenantDB.query('SELECT id FROM features');
  const featureIds = new Set(allFeatures.map(f => f.id));

  const SCOPE_RANK = { self: 1, department: 2, company: 3 };
  const validLevels = ['none', 'view', 'edit'];
  const validScopes = ['self', 'department', 'company'];

  // 預先驗證所有項目
  for (const p of perms) {
    if (!featureIds.has(p.feature_id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `無效的 feature_id: ${p.feature_id}`
      });
    }

    if (!validLevels.includes(p.action_level)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `無效的 action_level: ${p.action_level}（feature: ${p.feature_id}）`
      });
    }

    // 約束規則驗證
    if (p.action_level === 'none') {
      if (p.edit_scope || p.view_scope) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `action_level=none 時 scope 必須為空（feature: ${p.feature_id}）`
        });
      }
    } else if (p.action_level === 'view') {
      if (p.edit_scope) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `action_level=view 時 edit_scope 必須為空（feature: ${p.feature_id}）`
        });
      }
      if (!p.view_scope || !validScopes.includes(p.view_scope)) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `action_level=view 時 view_scope 必須為 self/department/company（feature: ${p.feature_id}）`
        });
      }
    } else if (p.action_level === 'edit') {
      if (!p.edit_scope || !validScopes.includes(p.edit_scope)) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `action_level=edit 時 edit_scope 必須為 self/department/company（feature: ${p.feature_id}）`
        });
      }
      if (!p.view_scope || !validScopes.includes(p.view_scope)) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `action_level=edit 時 view_scope 必須為 self/department/company（feature: ${p.feature_id}）`
        });
      }
      // view_scope >= edit_scope
      if (SCOPE_RANK[p.view_scope] < SCOPE_RANK[p.edit_scope]) {
        return res.status(400).json({
          error: 'BadRequest',
          message: `view_scope(${p.view_scope}) 必須 >= edit_scope(${p.edit_scope})（feature: ${p.feature_id}）`
        });
      }
    }
  }

  // Transaction: DELETE + INSERT
  try {
    req.tenantDB.transaction(() => {
      req.tenantDB.run(
        'DELETE FROM role_feature_perms WHERE role_id = ?',
        [roleId]
      );

      for (const p of perms) {
        req.tenantDB.run(
          'INSERT INTO role_feature_perms (role_id, feature_id, action_level, edit_scope, view_scope) VALUES (?, ?, ?, ?, ?)',
          [roleId, p.feature_id, p.action_level, p.edit_scope || null, p.view_scope || null]
        );
      }
    });

    // 回傳更新後的資料
    const updated = req.tenantDB.query(
      `SELECT rfp.role_id, rfp.feature_id, rfp.action_level, rfp.edit_scope, rfp.view_scope,
              f.module, f.name, f.sort_order
       FROM role_feature_perms rfp
       JOIN features f ON f.id = rfp.feature_id
       WHERE rfp.role_id = ?
       ORDER BY f.sort_order ASC`,
      [roleId]
    );

    res.json(updated);
  } catch (err) {
    console.error('Update role feature perms error:', err.message);
    return res.status(500).json({
      error: 'InternalError',
      message: '更新角色功能權限失敗'
    });
  }
});

module.exports = router;
