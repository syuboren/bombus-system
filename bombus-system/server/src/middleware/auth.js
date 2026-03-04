/**
 * Auth Middleware — JWT Access Token 驗證
 *
 * 驗證請求的 Authorization: Bearer <token>
 * 解析後將 user_id, tenant_id, roles, scope 注入 req.user
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bombus-dev-secret-key-change-in-production';

/**
 * 認證中介層
 * 驗證 JWT Access Token，解析 payload 注入 req.user
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: '未提供認證 Token'
    });
  }

  const token = authHeader.substring(7); // 移除 'Bearer ' 前綴

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // 注入使用者資訊至 req.user
    req.user = {
      userId: payload.sub,
      tenantId: payload.tid || null,
      roles: payload.roles || [],
      scope: payload.scope || null,
      isPlatformAdmin: payload.isPlatformAdmin || false
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'TokenExpired',
        message: 'Token 已過期，請重新整理'
      });
    }
    return res.status(401).json({
      error: 'InvalidToken',
      message: 'Token 無效'
    });
  }
}

/**
 * 平台管理員專用中介層
 * 需先經過 authMiddleware，再檢查 isPlatformAdmin
 */
function platformAdminMiddleware(req, res, next) {
  if (!req.user || !req.user.isPlatformAdmin) {
    return res.status(403).json({
      error: 'Forbidden',
      message: '僅平台管理員可存取'
    });
  }
  next();
}

module.exports = { authMiddleware, platformAdminMiddleware, JWT_SECRET };
