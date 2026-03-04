/**
 * Auth Routes — 認證路由
 *
 * POST /api/auth/login          — 租戶使用者登入
 * POST /api/auth/refresh        — Token 刷新
 * POST /api/auth/logout         — 登出
 * POST /api/auth/platform-login — 平台管理員登入
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const { getPlatformDB } = require('../db/platform-db');
const { tenantDBManager } = require('../db/tenant-db-manager');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit, getClientIP } = require('../utils/audit-logger');

const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

// ─── 租戶使用者登入 ───

router.post('/login', async (req, res) => {
  const { email, password, tenant_slug } = req.body;
  const ip = getClientIP(req);

  if (!email || !password || !tenant_slug) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少必要欄位：email, password, tenant_slug'
    });
  }

  const platformDB = getPlatformDB();

  // 查詢租戶
  const tenant = platformDB.queryOne(
    'SELECT id, status, plan_id FROM tenants WHERE slug = ?',
    [tenant_slug]
  );

  if (!tenant) {
    logAudit(platformDB, {
      action: 'login_failed',
      resource: 'auth',
      details: { email, reason: 'tenant_not_found', slug: tenant_slug },
      ip
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: '帳號或密碼錯誤'
    });
  }

  if (tenant.status === 'suspended') {
    logAudit(platformDB, {
      tenant_id: tenant.id,
      action: 'login_failed',
      resource: 'auth',
      details: { email, reason: 'tenant_suspended' },
      ip
    });
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
    const tenantDB = tenantDBManager.getDB(tenant.id);

    // 查詢使用者
    const user = tenantDB.queryOne(
      'SELECT id, email, password_hash, name, avatar, status FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      logAudit(platformDB, {
        tenant_id: tenant.id,
        action: 'login_failed',
        resource: 'auth',
        details: { email, reason: 'user_not_found' },
        ip
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: '帳號或密碼錯誤'
      });
    }

    if (user.status === 'locked' || user.status === 'inactive') {
      logAudit(platformDB, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'login_failed',
        resource: 'auth',
        details: { reason: 'account_' + user.status },
        ip
      });
      return res.status(403).json({
        error: 'AccountLocked',
        message: '帳號已被鎖定或停用'
      });
    }

    // 驗證密碼
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      logAudit(platformDB, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'login_failed',
        resource: 'auth',
        details: { reason: 'wrong_password' },
        ip
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: '帳號或密碼錯誤'
      });
    }

    // 查詢使用者角色與權限範圍
    const userRoles = tenantDB.query(`
      SELECT r.name, r.scope_type, ur.org_unit_id
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, [user.id]);

    const roles = userRoles.map(r => r.name);
    // 取第一個角色的 scope（簡化，前端可再查詢完整 scope）
    const scope = userRoles.length > 0
      ? { type: userRoles[0].scope_type, id: userRoles[0].org_unit_id }
      : null;

    // 產生 Access Token
    const accessToken = jwt.sign(
      {
        sub: user.id,
        tid: tenant.id,
        roles,
        scope
      },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRES }
    );

    // 產生 Refresh Token
    const refreshTokenValue = uuidv4();
    const refreshTokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
    const refreshExpiresAt = new Date(
      Date.now() + parseDuration(JWT_REFRESH_EXPIRES)
    ).toISOString();

    // 儲存 Refresh Token
    tenantDB.run(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
      [uuidv4(), user.id, refreshTokenHash, refreshExpiresAt]
    );

    // 更新最後登入時間
    tenantDB.run(
      'UPDATE users SET last_login = datetime(\'now\') WHERE id = ?',
      [user.id]
    );

    // 記錄成功登入
    logAudit(platformDB, {
      tenant_id: tenant.id,
      user_id: user.id,
      action: 'login_success',
      resource: 'auth',
      details: { roles },
      ip
    });

    // 查詢租戶訂閱方案的啟用功能
    let enabledFeatures = [];
    if (tenant.plan_id) {
      const plan = platformDB.queryOne(
        'SELECT features FROM subscription_plans WHERE id = ? AND is_active = 1',
        [tenant.plan_id]
      );
      if (plan && plan.features) {
        try {
          const parsed = JSON.parse(plan.features);
          if (Array.isArray(parsed)) enabledFeatures = parsed;
        } catch (e) { /* ignore invalid JSON */ }
      }
    }

    res.json({
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      token_type: 'Bearer',
      expires_in: JWT_ACCESS_EXPIRES,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        roles,
        scope,
        tenant_id: tenant.id,
        enabled_features: enabledFeatures
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: 'InternalError',
      message: '登入過程發生錯誤'
    });
  }
});

// ─── Token 刷新 ───

router.post('/refresh', (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少 refresh_token'
    });
  }

  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const platformDB = getPlatformDB();

  // 需要在所有活躍租戶中查找此 token
  // 先遍歷所有活躍租戶
  const tenants = platformDB.query(
    "SELECT id, plan_id FROM tenants WHERE status = 'active'"
  );

  for (const tenant of tenants) {
    try {
      const tenantDB = tenantDBManager.getDB(tenant.id);
      const tokenRecord = tenantDB.queryOne(
        'SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = ?',
        [tokenHash]
      );

      if (!tokenRecord) continue;

      // 檢查是否過期
      if (new Date(tokenRecord.expires_at) < new Date()) {
        // 刪除過期 token
        tenantDB.run('DELETE FROM refresh_tokens WHERE id = ?', [tokenRecord.id]);
        return res.status(401).json({
          error: 'TokenExpired',
          message: 'Refresh Token 已過期，請重新登入'
        });
      }

      // 查詢使用者
      const user = tenantDB.queryOne(
        'SELECT id, email, name, avatar, status FROM users WHERE id = ?',
        [tokenRecord.user_id]
      );

      if (!user || user.status !== 'active') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: '使用者帳號異常'
        });
      }

      // 查詢角色
      const userRoles = tenantDB.query(`
        SELECT r.name, r.scope_type, ur.org_unit_id
        FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = ?
      `, [user.id]);

      const roles = userRoles.map(r => r.name);
      const scope = userRoles.length > 0
        ? { type: userRoles[0].scope_type, id: userRoles[0].org_unit_id }
        : null;

      // 產生新 Access Token
      const accessToken = jwt.sign(
        {
          sub: user.id,
          tid: tenant.id,
          roles,
          scope
        },
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRES }
      );

      // 查詢租戶訂閱方案的啟用功能
      let enabledFeatures = [];
      if (tenant.plan_id) {
        const plan = platformDB.queryOne(
          'SELECT features FROM subscription_plans WHERE id = ? AND is_active = 1',
          [tenant.plan_id]
        );
        if (plan && plan.features) {
          try {
            const parsed = JSON.parse(plan.features);
            if (Array.isArray(parsed)) enabledFeatures = parsed;
          } catch (e) { /* ignore */ }
        }
      }

      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: JWT_ACCESS_EXPIRES,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          roles,
          scope,
          tenant_id: tenant.id,
          enabled_features: enabledFeatures
        }
      });
    } catch (err) {
      // DB 載入失敗，繼續下一個租戶
      continue;
    }
  }

  return res.status(401).json({
    error: 'InvalidToken',
    message: 'Refresh Token 無效或已撤銷'
  });
});

// ─── 登出 ───

router.post('/logout', (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(200).json({ message: '已登出' });
  }

  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
  const platformDB = getPlatformDB();
  const tenants = platformDB.query("SELECT id FROM tenants WHERE status = 'active'");

  for (const tenant of tenants) {
    try {
      const tenantDB = tenantDBManager.getDB(tenant.id);
      const result = tenantDB.run(
        'DELETE FROM refresh_tokens WHERE token_hash = ?',
        [tokenHash]
      );
      if (result.changes > 0) break;
    } catch (err) {
      continue;
    }
  }

  res.json({ message: '已登出' });
});

// ─── 平台管理員登入 ───

router.post('/platform-login', async (req, res) => {
  const { email, password } = req.body;
  const ip = getClientIP(req);

  if (!email || !password) {
    return res.status(400).json({
      error: 'BadRequest',
      message: '缺少 email 或 password'
    });
  }

  const platformDB = getPlatformDB();

  const admin = platformDB.queryOne(
    'SELECT id, email, password_hash, name FROM platform_admins WHERE email = ?',
    [email]
  );

  if (!admin) {
    logAudit(platformDB, {
      action: 'platform_login_failed',
      resource: 'auth',
      details: { email, reason: 'admin_not_found' },
      ip
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: '帳號或密碼錯誤'
    });
  }

  const passwordValid = await bcrypt.compare(password, admin.password_hash);
  if (!passwordValid) {
    logAudit(platformDB, {
      user_id: admin.id,
      action: 'platform_login_failed',
      resource: 'auth',
      details: { reason: 'wrong_password' },
      ip
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: '帳號或密碼錯誤'
    });
  }

  // 產生 Access Token（平台管理員不含 tenant_id）
  const accessToken = jwt.sign(
    {
      sub: admin.id,
      isPlatformAdmin: true,
      name: admin.name
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES }
  );

  logAudit(platformDB, {
    user_id: admin.id,
    action: 'platform_login_success',
    resource: 'auth',
    ip
  });

  res.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: JWT_ACCESS_EXPIRES,
    user: {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      isPlatformAdmin: true
    }
  });
});

// ─── 工具函數 ───

/**
 * 解析持續時間字串（如 '15m', '7d'）為毫秒
 * @param {string} duration
 * @returns {number}
 */
function parseDuration(duration) {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000; // 預設 15 分鐘

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000;
  }
}

module.exports = router;
