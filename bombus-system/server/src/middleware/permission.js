/**
 * Permission Middleware — 角色權限檢查
 *
 * 工廠函數 requirePermission('resource:action')
 * 檢查使用者角色是否具備指定權限且範圍正確
 * 多角色時取聯集（union）判定
 */

const { getPlatformDB } = require('../db/platform-db');

/**
 * 解析 features JSON 字串為陣列
 * @param {string} featuresStr - JSON 字串
 * @returns {string[]} feature ID 陣列
 */
function parseFeaturesJson(featuresStr) {
  if (!featuresStr) return [];
  try {
    const parsed = JSON.parse(featuresStr);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.modules)) return parsed.modules;
  } catch (e) { /* ignore */ }
  return [];
}

/**
 * 取得租戶的有效啟用功能（租戶覆寫優先，否則走方案）
 * @param {string} tenantId - 租戶 ID
 * @returns {string[]} 啟用的 feature ID 陣列（空陣列 = 全部開放）
 */
function getTenantEnabledFeatures(tenantId) {
  const platformDB = getPlatformDB();
  const tenant = platformDB.queryOne(
    'SELECT plan_id, feature_overrides FROM tenants WHERE id = ?',
    [tenantId]
  );
  if (!tenant) return [];

  // 租戶覆寫優先
  if (tenant.feature_overrides) {
    const overrides = parseFeaturesJson(tenant.feature_overrides);
    if (overrides.length > 0) return overrides;
  }

  // 否則走方案
  if (!tenant.plan_id) return [];
  const plan = platformDB.queryOne(
    'SELECT features FROM subscription_plans WHERE id = ? AND is_active = 1',
    [tenant.plan_id]
  );
  return parseFeaturesJson(plan?.features);
}

/**
 * 檢查租戶是否啟用指定模組（Layer 1）
 * 優先檢查租戶級覆寫，再檢查方案級功能
 * @param {string} tenantId - 租戶 ID
 * @param {string} featureId - feature ID（例如 'L1.jobs'）
 * @returns {boolean} 是否啟用
 */
function isModuleEnabledByPlan(tenantId, featureId) {
  const enabledFeatures = getTenantEnabledFeatures(tenantId);
  if (enabledFeatures.length === 0) return true; // 無設定 → 優雅降級

  const modulePrefix = featureId.split('.')[0];
  return enabledFeatures.includes(featureId) || enabledFeatures.includes(modulePrefix);
}

/**
 * 權限檢查中介層工廠函數
 * @param {string} requiredPermission - 格式 'resource:action'，例如 'employee:read'
 * @returns {Function} Express middleware
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    // 平台管理員跳過權限檢查
    if (req.user && req.user.isPlatformAdmin) {
      return next();
    }

    if (!req.user || !req.tenantDB) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '未認證'
      });
    }

    const { userId } = req.user;
    const [resource, action] = requiredPermission.split(':');

    try {
      // 查詢使用者所有角色的權限（聯集）
      const permissions = req.tenantDB.query(`
        SELECT DISTINCT p.resource, p.action, r.scope_type, ur.org_unit_id
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        JOIN role_permissions rp ON rp.role_id = r.id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE ur.user_id = ?
      `, [userId]);

      // 檢查是否有匹配的權限（多角色聯集：任一角色有此權限即通過）
      const hasPermission = permissions.some(
        p => p.resource === resource && p.action === action
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `缺少權限: ${requiredPermission}`
        });
      }

      // 將使用者的有效權限注入 req 供後續使用
      req.userPermissions = permissions;
      next();
    } catch (err) {
      console.error('Permission check error:', err.message);
      return res.status(500).json({
        error: 'InternalError',
        message: '權限檢查失敗'
      });
    }
  };
}

/**
 * 角色檢查中介層工廠函數
 * @param {...string} allowedRoles - 允許的角色名稱
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (req.user && req.user.isPlatformAdmin) {
      return next();
    }

    if (!req.user || !req.tenantDB) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '未認證'
      });
    }

    const { userId } = req.user;

    try {
      const userRoles = req.tenantDB.query(`
        SELECT DISTINCT r.name
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `, [userId]);

      const roleNames = userRoles.map(r => r.name);
      const hasRole = allowedRoles.some(role => roleNames.includes(role));

      if (!hasRole) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `需要以下角色之一: ${allowedRoles.join(', ')}`
        });
      }

      next();
    } catch (err) {
      console.error('Role check error:', err.message);
      return res.status(500).json({
        error: 'InternalError',
        message: '角色檢查失敗'
      });
    }
  };
}

// ── Feature-based Permission 合併常數 ──
const ACTION_LEVEL_RANK = { none: 0, view: 1, edit: 2 };
const SCOPE_RANK = { self: 1, department: 2, company: 3 };
const FULL_ACCESS_PERM = Object.freeze({ action_level: 'edit', edit_scope: 'company', view_scope: 'company' });

/**
 * 合併多角色的 feature 權限（Decision 9: 取最高權限）
 * @param {Array} rows - role_feature_perms 查詢結果
 * @returns {Object} { action_level, edit_scope, view_scope }
 */
function mergeFeaturePerms(rows) {
  let actionLevel = 'none';
  let editScope = null;
  let viewScope = null;

  for (const row of rows) {
    // action_level 取最高
    if (ACTION_LEVEL_RANK[row.action_level] > ACTION_LEVEL_RANK[actionLevel]) {
      actionLevel = row.action_level;
    }
    // edit_scope 取最大
    if (row.edit_scope && (!editScope || SCOPE_RANK[row.edit_scope] > SCOPE_RANK[editScope])) {
      editScope = row.edit_scope;
    }
    // view_scope 取最大
    if (row.view_scope && (!viewScope || SCOPE_RANK[row.view_scope] > SCOPE_RANK[viewScope])) {
      viewScope = row.view_scope;
    }
  }

  return { action_level: actionLevel, edit_scope: editScope, view_scope: viewScope };
}

/**
 * Feature 權限檢查中介層（新模型）
 * Layer 1：檢查租戶訂閱方案是否啟用該模組
 * Layer 2：查詢使用者所有角色的 feature perms，合併取最高權限，注入 req.featurePerm
 * @param {string} featureId - feature ID
 * @param {'view'|'edit'} requiredLevel - 要求的最低操作等級
 * @returns {Function} Express middleware
 */
function requireFeaturePerm(featureId, requiredLevel) {
  return (req, res, next) => {
    // 平台管理員跳過權限檢查
    if (req.user && req.user.isPlatformAdmin) {
      req.featurePerm = FULL_ACCESS_PERM;
      return next();
    }

    if (!req.user || !req.tenantDB) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: '未認證'
      });
    }

    // Layer 1：訂閱方案模組檢查（super_admin 也受限）
    if (req.user.tenantId && !isModuleEnabledByPlan(req.user.tenantId, featureId)) {
      return res.status(403).json({
        error: 'ModuleNotEnabled',
        message: '此功能未包含在您的訂閱方案中'
      });
    }

    // super_admin 繞過 Layer 2（角色權限），但仍受 Layer 1（訂閱方案）限制
    const roles = req.user.roles || [];
    if (roles.includes('super_admin')) {
      req.featurePerm = FULL_ACCESS_PERM;
      return next();
    }

    const { userId } = req.user;

    try {
      // 查詢使用者所有角色對此 feature 的權限
      const rows = req.tenantDB.query(`
        SELECT rfp.action_level, rfp.edit_scope, rfp.view_scope
        FROM user_roles ur
        JOIN role_feature_perms rfp ON rfp.role_id = ur.role_id
        WHERE ur.user_id = ? AND rfp.feature_id = ?
      `, [userId, featureId]);

      // 合併權限
      const merged = mergeFeaturePerms(rows);

      // 檢查 action_level 是否 >= requiredLevel
      if (ACTION_LEVEL_RANK[merged.action_level] < ACTION_LEVEL_RANK[requiredLevel]) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `缺少功能權限: ${featureId} (需要 ${requiredLevel}，目前 ${merged.action_level})`
        });
      }

      // 注入合併後的 feature perm 供路由處理器做 scope 檢查
      req.featurePerm = merged;
      next();
    } catch (err) {
      console.error('Feature permission check error:', err.message);
      return res.status(500).json({
        error: 'InternalError',
        message: '功能權限檢查失敗'
      });
    }
  };
}

// ── 子公司判斷 helper ──

/**
 * 從員工的 org_unit_id 向上走 parent chain，找到所屬子公司或集團
 * @param {Object} db - tenant DB adapter
 * @param {string|null} orgUnitId - 員工的 org_unit_id
 * @returns {string|null} subsidiary/group 的 org_unit_id，找不到回傳 null
 */
function findUserSubsidiaryId(db, orgUnitId) {
  if (!orgUnitId) return null;

  let currentId = orgUnitId;
  // org_units 樹最多 3 層（group → subsidiary → department），用 while loop 即可
  const maxDepth = 10;
  for (let i = 0; i < maxDepth; i++) {
    const unit = db.queryOne(
      'SELECT id, type, parent_id FROM org_units WHERE id = ?',
      [currentId]
    );
    if (!unit) return null;

    if (unit.type === 'subsidiary' || unit.type === 'group') {
      return unit.id;
    }

    // department → 往上走
    if (!unit.parent_id) return null;
    currentId = unit.parent_id;
  }

  return null;
}

// ── Scope 過濾共用函式（Decision 6） ──

/**
 * 遞迴查詢使用者所屬部門及所有子部門的 org_unit_id 列表
 * @param {Object} db - tenant DB adapter
 * @param {string} departmentId - 使用者所屬部門 ID
 * @returns {string[]} org_unit_id 列表（含自身）
 */
function getUserDepartmentIds(db, departmentId) {
  if (!departmentId) return [];
  const rows = db.query(`
    WITH RECURSIVE dept_tree AS (
      SELECT id FROM org_units WHERE id = ?
      UNION ALL
      SELECT o.id FROM org_units o JOIN dept_tree d ON o.parent_id = d.id
    )
    SELECT id FROM dept_tree
  `, [departmentId]);
  return rows.map(r => r.id);
}

/**
 * 根據使用者的 view_scope 產生 SQL WHERE clause
 * @param {Object} req - Express request（需有 req.featurePerm、req.user、req.tenantDB）
 * @param {Object} [options]
 * @param {string} [options.tableAlias] - 表別名
 * @param {string} [options.employeeIdColumn] - employee_id 欄位名（預設 'employee_id'）
 * @param {string} [options.createdByColumn] - 若指定則 self scope 改用此欄位
 * @param {string} [options.orgUnitColumn] - org_unit_id 欄位名（預設 'org_unit_id'）
 * @returns {{ clause: string, params: any[] }}
 */
function buildScopeFilter(req, options = {}) {
  const { tableAlias = '', employeeIdColumn = 'employee_id', createdByColumn = null, orgUnitColumn = 'org_unit_id' } = options;
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const perm = req.featurePerm;

  // 無權限 → 空結果
  if (!perm || perm.action_level === 'none') {
    return { clause: '1=0', params: [] };
  }

  // company scope → 子公司過濾
  if (perm.view_scope === 'company') {
    // super_admin 不限
    const roles = req.user.roles || [];
    if (roles.includes('super_admin')) {
      return { clause: '1=1', params: [] };
    }
    // 有 subsidiaryId → 限制到該子公司下所有 org_unit
    if (req.user.subsidiaryId) {
      // 若 subsidiaryId 為 group（最頂層），等同不限
      const subUnit = req.tenantDB.queryOne(
        'SELECT type FROM org_units WHERE id = ?',
        [req.user.subsidiaryId]
      );
      if (subUnit?.type === 'group') {
        return { clause: '1=1', params: [] };
      }
      const subIds = getUserDepartmentIds(req.tenantDB, req.user.subsidiaryId);
      if (subIds.length === 0) {
        return { clause: '1=0', params: [], reason: 'empty_subsidiary_scope' };
      }
      const placeholders = subIds.map(() => '?').join(',');
      return { clause: `${prefix}${orgUnitColumn} IN (${placeholders})`, params: subIds };
    }
    // 無 subsidiaryId → fail-secure
    return { clause: '1=0', params: [], reason: 'no_subsidiary_link' };
  }

  // self scope → 僅自己
  if (perm.view_scope === 'self') {
    if (!req.user.employeeId) {
      return { clause: '1=0', params: [], reason: 'no_employee_link' };
    }
    const col = createdByColumn || `${prefix}${employeeIdColumn}`;
    return { clause: `${col} = ?`, params: [req.user.employeeId] };
  }

  // department scope → 使用者部門及子部門
  if (perm.view_scope === 'department') {
    if (!req.user.departmentId) {
      return { clause: '1=0', params: [], reason: 'no_department_link' };
    }
    // 防護：確認 departmentId 指向 department 類型，避免 group/subsidiary 導致全域存取
    const orgUnit = req.tenantDB.queryOne(
      'SELECT type FROM org_units WHERE id = ?',
      [req.user.departmentId]
    );
    if (orgUnit && orgUnit.type !== 'department') {
      console.warn(`[Scope] department scope but org_unit "${req.user.departmentId}" is type="${orgUnit.type}", denying access`);
      return { clause: '1=0', params: [], reason: 'org_unit_not_department' };
    }
    const deptIds = getUserDepartmentIds(req.tenantDB, req.user.departmentId);
    if (deptIds.length === 0) {
      return { clause: '1=0', params: [] };
    }
    const placeholders = deptIds.map(() => '?').join(',');
    return { clause: `${prefix}${orgUnitColumn} IN (${placeholders})`, params: deptIds };
  }

  // 預設 fail-secure：未知的 view_scope 值不應授予存取權
  return { clause: '1=0', params: [], reason: 'unknown_scope' };
}

/**
 * 驗證寫入操作的目標記錄是否在 edit_scope 範圍內
 * @param {Object} req - Express request
 * @param {Object} targetRecord - 目標記錄（需含 employee_id 或 org_unit_id）
 * @param {Object} [options]
 * @param {string} [options.employeeIdField] - 記錄中 employee_id 欄位名
 * @param {string} [options.orgUnitField] - 記錄中 org_unit_id 欄位名
 * @returns {{ allowed: boolean, message?: string }}
 */
function checkEditScope(req, targetRecord, options = {}) {
  const { employeeIdField = 'employee_id', orgUnitField = 'org_unit_id' } = options;
  const perm = req.featurePerm;

  if (!perm || perm.action_level !== 'edit') {
    return { allowed: false, message: '缺少編輯權限' };
  }

  // company → 子公司範圍限制
  if (perm.edit_scope === 'company') {
    // super_admin 不限
    const roles = req.user.roles || [];
    if (roles.includes('super_admin')) {
      return { allowed: true };
    }
    // 有 subsidiaryId → 檢查目標 org_unit_id 是否在子公司範圍內
    if (req.user.subsidiaryId) {
      // 若 subsidiaryId 為 group（最頂層），等同不限
      const subUnit = req.tenantDB.queryOne(
        'SELECT type FROM org_units WHERE id = ?',
        [req.user.subsidiaryId]
      );
      if (subUnit?.type === 'group') {
        return { allowed: true };
      }
      // 目標記錄無 org_unit_id → 無法驗證歸屬，拒絕
      if (!targetRecord[orgUnitField]) {
        return { allowed: false, message: '記錄缺少組織單位資訊，無法驗證編輯範圍' };
      }
      const subIds = getUserDepartmentIds(req.tenantDB, req.user.subsidiaryId);
      if (!subIds.includes(targetRecord[orgUnitField])) {
        return { allowed: false, message: '僅可編輯所屬子公司的記錄' };
      }
    }
    return { allowed: true };
  }

  // self → 目標記錄的 employee_id 必須為自己
  if (perm.edit_scope === 'self') {
    if (!req.user.employeeId) {
      return { allowed: false, message: '使用者未關聯員工記錄，無法判斷編輯範圍' };
    }
    if (targetRecord[employeeIdField] !== req.user.employeeId) {
      return { allowed: false, message: '僅可編輯自己的記錄' };
    }
    return { allowed: true };
  }

  // department → 目標記錄的 org_unit_id 必須在使用者部門範圍內
  if (perm.edit_scope === 'department') {
    if (!req.user.departmentId) {
      return { allowed: false, message: '使用者未關聯部門，無法判斷編輯範圍' };
    }
    const deptIds = getUserDepartmentIds(req.tenantDB, req.user.departmentId);
    if (!deptIds.includes(targetRecord[orgUnitField])) {
      return { allowed: false, message: '僅可編輯所屬部門的記錄' };
    }
    return { allowed: true };
  }

  // 預設 fail-secure：未知的 edit_scope 值不應授予編輯權
  return { allowed: false, message: '未知的編輯範圍設定' };
}

module.exports = {
  requirePermission,
  requireRole,
  isModuleEnabledByPlan,
  getTenantEnabledFeatures,
  requireFeaturePerm,
  mergeFeaturePerms,
  buildScopeFilter,
  checkEditScope,
  getUserDepartmentIds,
  findUserSubsidiaryId,
  ACTION_LEVEL_RANK,
  SCOPE_RANK
};
