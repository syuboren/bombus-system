/**
 * Permission Middleware — 角色權限檢查
 *
 * 工廠函數 requirePermission('resource:action')
 * 檢查使用者角色是否具備指定權限且範圍正確
 * 多角色時取聯集（union）判定
 */

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

module.exports = { requirePermission, requireRole };
