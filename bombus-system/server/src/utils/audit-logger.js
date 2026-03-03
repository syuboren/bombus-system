/**
 * Audit Logger — 審計日誌寫入工具
 *
 * 寫入 platform.db 的 audit_logs 表
 * 記錄敏感操作：登入、租戶管理、角色變更、使用者指派等
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 記錄審計日誌
 * @param {import('../db/db-adapter').SqliteAdapter} platformDB - platform.db adapter
 * @param {Object} params
 * @param {string} [params.tenant_id] - 租戶 ID
 * @param {string} [params.user_id] - 操作者 ID
 * @param {string} params.action - 操作類型（如 login_success, tenant_create）
 * @param {string} [params.resource] - 操作對象（如 auth, tenant, role）
 * @param {string} [params.details] - 操作詳情（JSON 字串）
 * @param {string} [params.ip] - 來源 IP
 */
function logAudit(platformDB, { tenant_id, user_id, action, resource, details, ip }) {
  try {
    const id = uuidv4();
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : (details || null);

    platformDB.run(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, resource, details, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, tenant_id || null, user_id || null, action, resource || null, detailsStr, ip || null]
    );
  } catch (err) {
    // 審計日誌寫入失敗不應阻斷業務流程
    console.error('Audit log write error:', err.message);
  }
}

/**
 * 從 Express request 取得客戶端 IP
 * @param {import('express').Request} req
 * @returns {string}
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
}

module.exports = { logAudit, getClientIP };
