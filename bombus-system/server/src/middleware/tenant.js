/**
 * Tenant Context Middleware — 租戶上下文注入
 *
 * 從 req.user.tenantId 載入租戶 DB 至 req.tenantDB
 * 檢查租戶狀態（suspended/deleted 回傳 403）
 */

const { tenantDBManager } = require('../db/tenant-db-manager');
const { getPlatformDB } = require('../db/platform-db');
const { findUserSubsidiaryId } = require('./permission');

/**
 * 租戶上下文中介層
 * 需先經過 authMiddleware（req.user 已存在）
 */
function tenantMiddleware(req, res, next) {
  // 平台管理員不需要租戶上下文
  if (req.user && req.user.isPlatformAdmin) {
    return next();
  }

  const tenantId = req.user && req.user.tenantId;

  if (!tenantId) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '缺少租戶資訊'
    });
  }

  // 查詢租戶狀態
  const platformDB = getPlatformDB();
  const tenant = platformDB.queryOne(
    'SELECT id, status, db_file FROM tenants WHERE id = ?',
    [tenantId]
  );

  if (!tenant) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '租戶不存在'
    });
  }

  if (tenant.status === 'suspended') {
    return res.status(403).json({
      error: 'TenantSuspended',
      message: '租戶已暫停，請聯繫平台管理員'
    });
  }

  if (tenant.status === 'deleted') {
    return res.status(403).json({
      error: 'TenantDeleted',
      message: '租戶已停用'
    });
  }

  try {
    // 載入租戶 DB
    const tenantDB = tenantDBManager.getDB(tenantId);
    req.tenantDB = tenantDB;
    req.tenantId = tenantId;

    // Decision 7：注入 employeeId 與 departmentId 供 scope 過濾使用
    if (req.user && req.user.userId) {
      const userEmployee = tenantDB.queryOne(
        'SELECT u.employee_id, e.org_unit_id as department_id FROM users u LEFT JOIN employees e ON e.id = u.employee_id WHERE u.id = ?',
        [req.user.userId]
      );
      req.user.employeeId = userEmployee?.employee_id || null;
      req.user.departmentId = userEmployee?.department_id || null;
      req.user.subsidiaryId = findUserSubsidiaryId(tenantDB, req.user.departmentId);
    }

    next();
  } catch (err) {
    console.error('Failed to load tenant DB:', tenantId, err.message);
    return res.status(500).json({
      error: 'InternalError',
      message: '無法載入租戶資料庫'
    });
  }
}

module.exports = { tenantMiddleware };
