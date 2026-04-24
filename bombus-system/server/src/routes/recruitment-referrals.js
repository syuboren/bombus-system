/**
 * Recruitment Referral API — HR 代發起內部推薦邀請
 *
 * 本 router 掛在 authMiddleware + tenantMiddleware 後，所有端點需 HR 登入。
 * 公開端點（候選人填寫）在 `public-referrals.js`。
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireFeaturePerm } = require('../middleware/permission');
const { getPlatformDB } = require('../db/platform-db');
const { buildReferralLink } = require('../utils/referral-link');
const { resolveCompanyFromOrgUnit } = require('../utils/org-unit');

// 邀請有效期：7 天（與既有 response token 一致）
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 判斷 email 格式粗略合法 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 推薦人員編預覽 — 供內推 Modal 即時驗證
 * GET /api/recruitment/referrals/recommender-preview?employee_no=E001
 */
router.get(
  '/recommender-preview',
  requireFeaturePerm('L1.recruitment', 'view'),
  (req, res) => {
    const employeeNo = (req.query.employee_no || '').toString().trim();
    if (!employeeNo) {
      return res.status(400).json({ error: 'EMPLOYEE_NO_REQUIRED', message: '請輸入員編' });
    }

    const emp = req.tenantDB.prepare(
      "SELECT id, employee_no, name, department, position, org_unit_id FROM employees WHERE employee_no = ? AND status = 'active'"
    ).get(employeeNo);

    if (!emp) {
      return res.status(400).json({
        error: 'RECOMMENDER_INVALID',
        message: '查無此員工或已離職'
      });
    }

    // 取 tenant 名稱作為 company fallback
    const platformDB = getPlatformDB();
    const tenantRow = platformDB.queryOne('SELECT name FROM tenants WHERE id = ?', [req.user.tenantId]);
    const tenantName = tenantRow ? tenantRow.name : null;
    const company = resolveCompanyFromOrgUnit(req.tenantDB, emp.org_unit_id, tenantName);

    res.json({
      id: emp.id,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      company
    });
  }
);

/**
 * 發起內推邀請
 * POST /api/recruitment/referrals
 * body: { jobId, recommenderEmployeeNo, candidateEmail, customMessage? }
 */
router.post(
  '/',
  requireFeaturePerm('L1.recruitment', 'edit'),
  (req, res) => {
    const { jobId, recommenderEmployeeNo, candidateEmail, customMessage } = req.body || {};

    // 輸入驗證
    if (!jobId || !recommenderEmployeeNo || !candidateEmail) {
      return res.status(400).json({
        error: 'MISSING_FIELDS',
        message: '缺少必填欄位：jobId、recommenderEmployeeNo、candidateEmail'
      });
    }
    if (!isValidEmail(candidateEmail)) {
      return res.status(400).json({ error: 'INVALID_EMAIL', message: '候選人 email 格式錯誤' });
    }

    // 驗證職缺：屬當前租戶且為 published
    const job = req.tenantDB.prepare(
      'SELECT id, status FROM jobs WHERE id = ?'
    ).get(jobId);
    if (!job) {
      return res.status(400).json({ error: 'JOB_NOT_FOUND', message: '職缺不存在' });
    }
    if (job.status !== 'published') {
      return res.status(400).json({
        error: 'JOB_NOT_PUBLISHED',
        message: '僅已發佈職缺可發起內推邀請'
      });
    }

    // 驗證推薦人員編
    const recommender = req.tenantDB.prepare(
      "SELECT id, name FROM employees WHERE employee_no = ? AND status = 'active'"
    ).get(recommenderEmployeeNo);
    if (!recommender) {
      return res.status(400).json({
        error: 'RECOMMENDER_INVALID',
        message: '推薦人員編無效或已離職'
      });
    }

    // 檢查重複 pending 邀請
    const dup = req.tenantDB.prepare(
      "SELECT id FROM referral_invitations WHERE job_id = ? AND candidate_email = ? AND status = 'pending'"
    ).get(jobId, candidateEmail);
    if (dup) {
      return res.status(409).json({
        error: 'DUPLICATE_PENDING_INVITATION',
        message: '此職缺已有此候選人 email 的進行中邀請'
      });
    }

    const invitationId = uuidv4();
    const token = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();
    const tenantId = req.user.tenantId;

    const platformDB = getPlatformDB();

    // 1) Tenant DB insert
    try {
      req.tenantDB.prepare(`
        INSERT INTO referral_invitations (
          id, token, job_id, recommender_employee_id, candidate_email,
          status, custom_message, expires_at, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
      `).run(
        invitationId, token, jobId, recommender.id, candidateEmail,
        customMessage || null, expiresAt, req.user.userId, now, now
      );
    } catch (err) {
      console.error('[referrals] tenant insert failed:', err);
      return res.status(500).json({ error: 'DB_ERROR', message: '建立邀請失敗' });
    }

    // 2) Platform DB insert（公開端點解析 tenant 用）
    try {
      platformDB.run(
        "INSERT INTO public_tokens (token, tenant_id, resource_type, resource_id) VALUES (?, ?, 'referral_invitation', ?)",
        [token, tenantId, invitationId]
      );
    } catch (err) {
      // 補償式 cleanup — 刪除 tenant 紀錄
      console.error('[referrals] platform insert failed, rolling back tenant:', err);
      try {
        req.tenantDB.prepare('DELETE FROM referral_invitations WHERE id = ?').run(invitationId);
      } catch (cleanupErr) {
        console.error('[referrals] cleanup also failed:', cleanupErr);
      }
      return res.status(500).json({ error: 'DB_ERROR', message: '建立邀請失敗（token 索引寫入失敗）' });
    }

    res.status(201).json({
      invitationId,
      referralLink: buildReferralLink(token),
      expiresAt
    });
  }
);

/**
 * 列出職缺內推邀請
 * GET /api/recruitment/referrals?job_id=...&status=pending
 */
router.get(
  '/',
  requireFeaturePerm('L1.recruitment', 'view'),
  (req, res) => {
    const jobId = (req.query.job_id || '').toString();
    const status = (req.query.status || '').toString();

    if (!jobId) {
      return res.status(400).json({ error: 'JOB_ID_REQUIRED', message: 'job_id 必填' });
    }

    let sql = `
      SELECT ri.id, ri.token, ri.job_id, ri.candidate_email, ri.status,
             ri.custom_message, ri.expires_at, ri.submitted_at, ri.created_at,
             ri.submitted_candidate_id, ri.cancel_reason,
             e.id AS recommender_id, e.employee_no AS recommender_employee_no,
             e.name AS recommender_name, e.department AS recommender_department
      FROM referral_invitations ri
      JOIN employees e ON e.id = ri.recommender_employee_id
      WHERE ri.job_id = ?
    `;
    const params = [jobId];
    if (status) {
      sql += ' AND ri.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY ri.created_at DESC';

    const rows = req.tenantDB.prepare(sql).all(...params);

    // pending / expired 附 referralLink；submitted / cancelled 不附
    const list = rows.map(r => {
      const exposeLink = r.status === 'pending' || r.status === 'expired';
      const { token, ...rest } = r;
      return exposeLink ? { ...rest, referralLink: buildReferralLink(token) } : rest;
    });

    res.json({ invitations: list });
  }
);

/**
 * 取消 pending 邀請
 * POST /api/recruitment/referrals/:id/cancel
 */
router.post(
  '/:id/cancel',
  requireFeaturePerm('L1.recruitment', 'edit'),
  (req, res) => {
    const invitation = req.tenantDB.prepare(
      'SELECT id, status FROM referral_invitations WHERE id = ?'
    ).get(req.params.id);

    if (!invitation) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '邀請不存在' });
    }
    if (invitation.status !== 'pending') {
      return res.status(409).json({
        error: 'INVALID_STATE',
        message: `狀態為 ${invitation.status} 的邀請無法取消`
      });
    }

    const now = new Date().toISOString();
    req.tenantDB.prepare(
      "UPDATE referral_invitations SET status = 'cancelled', cancel_reason = COALESCE(cancel_reason, 'hr_cancelled'), updated_at = ? WHERE id = ?"
    ).run(now, req.params.id);

    res.json({ success: true });
  }
);

/**
 * 延長邀請效期（renew）— 同時處理 pending 與 expired
 * POST /api/recruitment/referrals/:id/renew
 */
router.post(
  '/:id/renew',
  requireFeaturePerm('L1.recruitment', 'edit'),
  (req, res) => {
    const invitation = req.tenantDB.prepare(
      'SELECT id, token, status FROM referral_invitations WHERE id = ?'
    ).get(req.params.id);

    if (!invitation) {
      return res.status(404).json({ error: 'NOT_FOUND', message: '邀請不存在' });
    }
    if (invitation.status !== 'pending' && invitation.status !== 'expired') {
      return res.status(409).json({
        error: 'INVALID_STATE',
        message: `狀態為 ${invitation.status} 的邀請無法延長`
      });
    }

    const now = new Date().toISOString();
    const newExpiresAt = new Date(Date.now() + INVITATION_TTL_MS).toISOString();

    req.tenantDB.prepare(
      "UPDATE referral_invitations SET status = 'pending', expires_at = ?, updated_at = ? WHERE id = ?"
    ).run(newExpiresAt, now, req.params.id);

    res.json({
      success: true,
      expiresAt: newExpiresAt,
      referralLink: buildReferralLink(invitation.token)
    });
  }
);

module.exports = router;
