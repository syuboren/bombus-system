/**
 * Audit Log Routes — 審計日誌查詢 API
 *
 * GET /api/audit/logs — 查詢審計日誌（分頁+篩選）
 *   - 平台管理員：查看所有租戶日誌
 *   - 租戶管理員：僅查看自家租戶日誌
 *
 * PUT/PATCH/DELETE /api/audit/logs — 回傳 405 Method Not Allowed
 */

const express = require('express');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const { getPlatformDB } = require('../db/platform-db');

// 所有路由需認證
router.use(authMiddleware);

// ─── 審計日誌查詢 ───

router.get('/logs', (req, res) => {
  const {
    page = 1,
    limit = 50,
    tenant_id,
    action,
    resource,
    user_id,
    start_date,
    end_date
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const platformDB = getPlatformDB();

  let whereClauses = [];
  let params = [];

  // 非平台管理員只能看自家租戶
  if (!req.user.isPlatformAdmin) {
    if (!req.user.tenantId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: '缺少租戶資訊'
      });
    }
    whereClauses.push('tenant_id = ?');
    params.push(req.user.tenantId);
  } else if (tenant_id) {
    // 平台管理員可篩選特定租戶
    whereClauses.push('tenant_id = ?');
    params.push(tenant_id);
  }

  if (action) {
    whereClauses.push('action = ?');
    params.push(action);
  }

  if (resource) {
    whereClauses.push('resource = ?');
    params.push(resource);
  }

  if (user_id) {
    whereClauses.push('user_id = ?');
    params.push(user_id);
  }

  if (start_date) {
    whereClauses.push('created_at >= ?');
    params.push(start_date);
  }

  if (end_date) {
    whereClauses.push('created_at <= ?');
    params.push(end_date);
  }

  const whereSQL = whereClauses.length > 0
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';

  const total = platformDB.queryOne(
    `SELECT COUNT(*) as count FROM audit_logs ${whereSQL}`,
    params
  ).count;

  const logs = platformDB.query(
    `SELECT * FROM audit_logs
     ${whereSQL}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), offset]
  );

  // 保持 details 為字串（前端自行解析顯示），ip → ip_address
  const data = logs.map(log => ({
    ...log,
    ip_address: log.ip || null
  }));

  res.json({
    data,
    total,
    page: parseInt(page),
    limit: parseInt(limit)
  });
});

// ─── 405 Method Not Allowed ───

router.put('/logs', (req, res) => {
  res.status(405).json({
    error: 'MethodNotAllowed',
    message: '審計日誌不可修改'
  });
});

router.patch('/logs', (req, res) => {
  res.status(405).json({
    error: 'MethodNotAllowed',
    message: '審計日誌不可修改'
  });
});

router.delete('/logs', (req, res) => {
  res.status(405).json({
    error: 'MethodNotAllowed',
    message: '審計日誌不可刪除'
  });
});

module.exports = router;
