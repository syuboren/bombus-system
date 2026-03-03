/**
 * Tenant Context Middleware — 租戶上下文注入
 *
 * 從 req.user.tenantId 載入租戶 DB 至 req.tenantDB
 * 檢查租戶狀態（suspended/deleted 回傳 403）
 */

const { tenantDBManager } = require('../db/tenant-db-manager');
const { getPlatformDB } = require('../db/platform-db');

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
