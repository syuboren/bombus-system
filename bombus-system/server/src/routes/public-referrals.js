/**
 * Public Referral API — 候選人（未登入）透過 token 連結填寫內推履歷
 *
 * 本 router 掛在 authMiddleware 與 tenantMiddleware **之外**：
 *   - 先透過 platform DB 的 `public_tokens` 表解析 tenant
 *   - 用 tenant_id 透過 tenantDBManager 載入 tenantDB
 *   - 後續驗證與寫入都操作在該 tenantDB 上
 *
 * 對齊 Decision：公開端點以平台級 `public_tokens` 表解析租戶。
 */

const express = require('express');
const router = express.Router();
const { getPlatformDB } = require('../db/platform-db');
const { tenantDBManager } = require('../db/tenant-db-manager');
const { insertFullCandidate } = require('../services/candidate-write.service');
const { resolveCompanyFromOrgUnit } = require('../utils/org-unit');

/**
 * 從 token 解析 tenantDB
 * @param {string} token
 * @returns {Promise<{ tenantDB: object|null, tenantId: string|null }>}
 */
function resolveTenantByToken(token) {
  if (!token || typeof token !== 'string') {
    return { tenantDB: null, tenantId: null, tenantName: null };
  }
  const platformDB = getPlatformDB();
  const row = platformDB.queryOne(
    "SELECT tenant_id FROM public_tokens WHERE token = ? AND resource_type = 'referral_invitation'",
    [token]
  );
  if (!row) return { tenantDB: null, tenantId: null, tenantName: null };

  // 取 tenant 名稱作為「公司」顯示
  const tenantRow = platformDB.queryOne('SELECT name FROM tenants WHERE id = ?', [row.tenant_id]);
  const tenantName = tenantRow ? tenantRow.name : null;

  try {
    const tenantDB = tenantDBManager.getDB(row.tenant_id);
    return { tenantDB, tenantId: row.tenant_id, tenantName };
  } catch (err) {
    console.error('[public-referrals] failed to load tenant DB:', err);
    return { tenantDB: null, tenantId: null, tenantName: null };
  }
}

/**
 * 檢查並自動轉移過期狀態
 * @returns {{status:string, row:object}}
 */
function checkAndExpire(tenantDB, invitation) {
  if (invitation.status !== 'pending') return { status: invitation.status };
  const expired = new Date(invitation.expires_at).getTime() < Date.now();
  if (expired) {
    const now = new Date().toISOString();
    tenantDB.prepare(
      "UPDATE referral_invitations SET status = 'expired', updated_at = ? WHERE id = ?"
    ).run(now, invitation.id);
    return { status: 'expired' };
  }
  return { status: 'pending' };
}

/**
 * 取得邀請摘要（候選人填寫頁初始載入）
 * GET /api/public/referrals/:token
 */
router.get('/:token', (req, res) => {
  const { tenantDB, tenantName } = resolveTenantByToken(req.params.token);
  if (!tenantDB) {
    return res.status(410).json({ error: 'INVALID_TOKEN', message: '連結無效或已失效' });
  }

  const invitation = tenantDB.prepare(
    'SELECT * FROM referral_invitations WHERE token = ?'
  ).get(req.params.token);
  if (!invitation) {
    return res.status(410).json({ error: 'INVALID_TOKEN', message: '連結無效或已失效' });
  }

  const { status } = checkAndExpire(tenantDB, invitation);
  if (status === 'expired') {
    return res.status(410).json({ error: 'EXPIRED', message: '連結已過期，請聯繫 HR 重新發起' });
  }
  if (status === 'submitted') {
    return res.status(410).json({ error: 'ALREADY_SUBMITTED', message: '此連結已完成填寫' });
  }
  if (status === 'cancelled') {
    return res.status(410).json({ error: 'CANCELLED', message: '此邀請已取消' });
  }

  // 取職缺摘要 + 推薦人摘要（含部門 / 公司）
  const job = tenantDB.prepare(
    'SELECT id, title, department FROM jobs WHERE id = ?'
  ).get(invitation.job_id);

  // 推薦人基本資料
  const recommender = tenantDB.prepare(
    'SELECT name, department, org_unit_id FROM employees WHERE id = ?'
  ).get(invitation.recommender_employee_id);

  // 公司顯示：從員工 org_unit 往上走，找第一個 subsidiary / group；找不到則 fallback 為 tenant name
  const recommenderCompany = recommender
    ? resolveCompanyFromOrgUnit(tenantDB, recommender.org_unit_id, tenantName)
    : tenantName;

  res.json({
    job: job ? { ...job, company: tenantName } : null,
    recommender: recommender
      ? {
          name: recommender.name,
          department: recommender.department || null,
          company: recommenderCompany
        }
      : { name: '（推薦人資訊無法取得）', department: null, company: null },
    company: tenantName,
    custom_message: invitation.custom_message || null,
    candidate_email: invitation.candidate_email,
    expires_at: invitation.expires_at
  });
});

/**
 * 候選人提交履歷
 * POST /api/public/referrals/:token/submit
 * body: { name, phone, currentCompany?, currentPosition?, experienceYears?, expectedSalary?, resumeUrl? }
 */
router.post('/:token/submit', (req, res) => {
  const { tenantDB } = resolveTenantByToken(req.params.token);
  if (!tenantDB) {
    return res.status(410).json({ error: 'INVALID_TOKEN', message: '連結無效或已失效' });
  }

  const invitation = tenantDB.prepare(
    'SELECT * FROM referral_invitations WHERE token = ?'
  ).get(req.params.token);
  if (!invitation) {
    return res.status(410).json({ error: 'INVALID_TOKEN', message: '連結無效或已失效' });
  }

  const { status } = checkAndExpire(tenantDB, invitation);
  if (status !== 'pending') {
    return res.status(410).json({
      error: status === 'expired' ? 'EXPIRED' : status === 'submitted' ? 'ALREADY_SUBMITTED' : 'CANCELLED',
      message: '連結已失效'
    });
  }

  const form = req.body || {};

  // 必填驗證
  if (!form.name || !form.phone || !form.gender || !form.birthday || !form.nationality) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: '基本資料必填欄位未完成' });
  }
  const educationList = Array.isArray(form.educationList) ? form.educationList : [];
  if (educationList.length === 0 || !educationList[0].schoolName) {
    return res.status(400).json({ error: 'MISSING_EDUCATION', message: '請至少填寫一筆學歷' });
  }
  const specialityList = Array.isArray(form.specialityList) ? form.specialityList : [];
  if (specialityList.length === 0 || !specialityList[0].skill) {
    return res.status(400).json({ error: 'MISSING_SPECIALITY', message: '請至少填寫一筆技能專長' });
  }
  const languageList = Array.isArray(form.languageList) ? form.languageList : [];
  if (languageList.length === 0 || !languageList[0].langType) {
    return res.status(400).json({ error: 'MISSING_LANGUAGE', message: '請至少填寫一筆語言能力' });
  }

  // email 鎖定為 HR 邀請時指定值（候選人傳入的 email 一律 ignore）
  const lockedEmail = invitation.candidate_email;

  // 重複應徵檢查：同 job_id + 同 email 候選人已存在？
  const dupCandidate = tenantDB.prepare(
    'SELECT id FROM candidates WHERE job_id = ? AND lower(email) = lower(?)'
  ).get(invitation.job_id, lockedEmail);

  if (dupCandidate) {
    const nowCancel = new Date().toISOString();
    tenantDB.prepare(
      "UPDATE referral_invitations SET status = 'cancelled', cancel_reason = 'duplicate', updated_at = ? WHERE id = ?"
    ).run(nowCancel, invitation.id);
    return res.status(409).json({
      error: 'DUPLICATE_CANDIDATE',
      message: '您已應徵過此職缺，請聯繫 HR'
    });
  }

  const recommender = tenantDB.prepare(
    'SELECT id, employee_no, name FROM employees WHERE id = ?'
  ).get(invitation.recommender_employee_id);

  const sourceDetail = JSON.stringify({
    invitation_id: invitation.id,
    recommender_employee_no: recommender ? recommender.employee_no : null,
    recommender_name: recommender ? recommender.name : null
  });

  try {
    const { candidateId } = insertFullCandidate(tenantDB, {
      jobId: invitation.job_id,
      lockedEmail,
      regSource: 'referral',
      sourceDetail,
      form
    });

    const now = new Date().toISOString();
    tenantDB.prepare(
      "UPDATE referral_invitations SET status = 'submitted', submitted_at = ?, submitted_candidate_id = ?, updated_at = ? WHERE id = ?"
    ).run(now, candidateId, now, invitation.id);

    res.json({ success: true, candidateId });
  } catch (err) {
    console.error('[public-referrals] submit failed:', err);
    res.status(500).json({ error: 'DB_ERROR', message: '提交失敗，請稍後再試' });
  }
});

module.exports = router;
