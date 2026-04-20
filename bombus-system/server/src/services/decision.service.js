/**
 * Decision Service — 面試決策簽核狀態轉換
 *
 * 狀態機：
 *   pending_decision → (HR submit) → pending_approval
 *   pending_approval → (subsidiary_admin approve) → offered | not_hired
 *   pending_approval → (subsidiary_admin reject) → pending_decision
 *
 * 簽核欄位寫 invitation_decisions 表，薪資核定欄位寫 candidates 表。
 */

const { v4: uuidv4 } = require('uuid');

const SALARY_TYPE_VALUES = [10, 50, 60];
const APPROVER_ROLES = ['super_admin', 'subsidiary_admin'];

/**
 * 根據職缺 grade 計算薪資範圍 + 職等資訊
 *
 * 回傳含：
 * - grade: 職等數字 (1-7)
 * - grade_title: 主要顯示名稱（向後相容，優先取管理職）
 * - title_management / title_professional: 兩條軌道分別的職稱
 * - code_range: grade_levels.code_range
 * - salary_levels: 該職等的所有職級（含 code/salary），依 sort_order 排序
 * - salary_low / salary_high / has_range: 薪資範圍摘要
 */
function resolveSalaryRange(tenantDB, candidateId) {
  const empty = {
    grade: null, grade_title: null,
    title_management: null, title_professional: null, code_range: null,
    salary_levels: [], salary_low: null, salary_high: null,
    has_range: false, reason: null
  };

  const row = tenantDB.prepare(`
    SELECT j.grade AS grade, c.id AS candidate_id
    FROM candidates c
    JOIN jobs j ON j.id = c.job_id
    WHERE c.id = ?
  `).get(candidateId);

  if (!row) return { ...empty, reason: 'candidate_not_found' };
  if (row.grade == null) return { ...empty, reason: 'no_grade' };

  const gradeRow = tenantDB.prepare(`
    SELECT title_management, title_professional, code_range
    FROM grade_levels WHERE grade = ?
  `).get(row.grade);
  const title_management = gradeRow?.title_management || null;
  const title_professional = gradeRow?.title_professional || null;
  const code_range = gradeRow?.code_range || null;
  const grade_title = title_management || title_professional || String(row.grade);

  // org_unit_id 以 candidate 的 job 所屬為範圍（向上涵蓋 NULL 集團預設）
  const orgRow = tenantDB.prepare(`
    SELECT j.org_unit_id FROM jobs j JOIN candidates c ON c.job_id = j.id WHERE c.id = ?
  `).get(candidateId);
  const orgId = orgRow ? orgRow.org_unit_id : null;

  // 列出該 grade 的所有職級（含薪資），供前端顯示
  const salary_levels = tenantDB.prepare(`
    SELECT code, salary, sort_order
    FROM grade_salary_levels
    WHERE grade = ? AND (org_unit_id = ? OR org_unit_id IS NULL)
    ORDER BY sort_order ASC, salary ASC
  `).all(row.grade, orgId);

  if (salary_levels.length === 0) {
    return {
      ...empty,
      grade: row.grade, grade_title,
      title_management, title_professional, code_range,
      reason: 'no_salary_levels'
    };
  }

  const salaries = salary_levels.map(s => s.salary).filter(s => s != null);
  return {
    grade: row.grade,
    grade_title,
    title_management,
    title_professional,
    code_range,
    salary_levels,
    salary_low: Math.min(...salaries),
    salary_high: Math.max(...salaries),
    has_range: true,
    reason: null
  };
}

/**
 * 檢查候選人目前狀態
 */
function getCandidateStatus(tenantDB, candidateId) {
  const row = tenantDB.prepare('SELECT id, status FROM candidates WHERE id = ?').get(candidateId);
  return row ? row.status : null;
}

/**
 * 取得候選人最新一筆 invitation_decisions
 */
function getLatestDecision(tenantDB, candidateId) {
  return tenantDB.prepare(
    'SELECT * FROM invitation_decisions WHERE candidate_id = ? ORDER BY decided_at DESC LIMIT 1'
  ).get(candidateId);
}

/**
 * 驗證薪資輸入
 * @returns {{valid: boolean, message?: string}}
 */
function validateSalary(type, amount) {
  if (!SALARY_TYPE_VALUES.includes(type)) {
    return { valid: false, message: `薪資類型必須為 ${SALARY_TYPE_VALUES.join('/')} 其中之一` };
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return { valid: false, message: '薪資金額必須為正整數' };
  }
  return { valid: true };
}

/**
 * 提交簽核：pending_decision → pending_approval
 */
function submitForApproval(tenantDB, {
  candidateId, decision, decisionReason, approvedSalaryType, approvedSalaryAmount, currentUserId
}) {
  if (!['Offered', 'Rejected'].includes(decision)) {
    const err = new Error('Invalid decision'); err.status = 400; throw err;
  }
  if (!decisionReason || !String(decisionReason).trim()) {
    const err = new Error('decision_reason is required'); err.status = 400; throw err;
  }

  // 先驗證薪資輸入（400 錯誤優先於 404/409，讓前端可先修正表單）
  if (decision === 'Offered') {
    const v = validateSalary(approvedSalaryType, approvedSalaryAmount);
    if (!v.valid) { const e = new Error(v.message); e.status = 400; throw e; }
  }

  const status = getCandidateStatus(tenantDB, candidateId);
  if (!status) { const e = new Error('Candidate not found'); e.status = 404; throw e; }
  if (status !== 'pending_decision') {
    const e = new Error(`Candidate status must be pending_decision, got ${status}`); e.status = 409; throw e;
  }

  let outOfRange = 0;
  if (decision === 'Offered') {
    // 超範圍 flag 伺服器端重算
    const range = resolveSalaryRange(tenantDB, candidateId);
    if (range.has_range && (approvedSalaryAmount < range.salary_low || approvedSalaryAmount > range.salary_high)) {
      outOfRange = 1;
    }
  }

  const now = new Date().toISOString();
  const decisionId = uuidv4();

  tenantDB.transaction(() => {
    if (decision === 'Offered') {
      tenantDB.prepare(`
        UPDATE candidates
        SET approved_salary_type = ?, approved_salary_amount = ?, approved_salary_out_of_range = ?,
            status = 'pending_approval', updated_at = ?
        WHERE id = ?
      `).run(approvedSalaryType, approvedSalaryAmount, outOfRange, now, candidateId);
    } else {
      tenantDB.prepare(`
        UPDATE candidates
        SET approved_salary_type = NULL, approved_salary_amount = NULL, approved_salary_out_of_range = 0,
            status = 'pending_approval', updated_at = ?
        WHERE id = ?
      `).run(now, candidateId);
    }

    tenantDB.prepare(`
      INSERT INTO invitation_decisions (
        id, candidate_id, decision, decided_by, reason, decided_at,
        approval_status, submitted_for_approval_at, approval_note
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, NULL)
    `).run(decisionId, candidateId, decision, currentUserId || null, decisionReason, now, now);
  });

  return { decisionId, outOfRange, fromStatus: status, toStatus: 'pending_approval' };
}

/**
 * 簽核通過：pending_approval → offered | not_hired
 */
function approveDecision(tenantDB, { candidateId, approvalNote, currentUserId, currentUserRoles }) {
  if (!hasApproverRole(currentUserRoles)) {
    const e = new Error('需要 subsidiary_admin 或 super_admin 角色才能簽核'); e.status = 403; throw e;
  }

  const status = getCandidateStatus(tenantDB, candidateId);
  if (!status) { const e = new Error('Candidate not found'); e.status = 404; throw e; }
  if (status !== 'pending_approval') {
    const e = new Error(`Candidate status must be pending_approval, got ${status}`); e.status = 409; throw e;
  }

  const latest = getLatestDecision(tenantDB, candidateId);
  if (!latest) { const e = new Error('No pending decision found'); e.status = 409; throw e; }

  const newCandidateStatus = latest.decision === 'Offered' ? 'offered' : 'not_hired';
  const now = new Date().toISOString();

  let responseToken = null;
  let replyDeadline = null;
  if (latest.decision === 'Offered') {
    responseToken = uuidv4();
    replyDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  tenantDB.transaction(() => {
    tenantDB.prepare(`
      UPDATE invitation_decisions
      SET approval_status = 'APPROVED', approver_id = ?, approved_at = ?,
          approval_note = ?, response_token = COALESCE(?, response_token), reply_deadline = COALESCE(?, reply_deadline)
      WHERE id = ?
    `).run(currentUserId || null, now, approvalNote || null, responseToken, replyDeadline, latest.id);

    tenantDB.prepare(`
      UPDATE candidates SET status = ?, updated_at = ? WHERE id = ?
    `).run(newCandidateStatus, now, candidateId);
  });

  return {
    decisionId: latest.id,
    newStatus: newCandidateStatus,
    responseToken,
    replyDeadline,
    responseLink: responseToken ? `/public/offer-response/${responseToken}` : null
  };
}

/**
 * 簽核退回：pending_approval → pending_decision
 */
function rejectApproval(tenantDB, { candidateId, approvalNote, currentUserId, currentUserRoles }) {
  if (!hasApproverRole(currentUserRoles)) {
    const e = new Error('需要 subsidiary_admin 或 super_admin 角色才能退回簽核'); e.status = 403; throw e;
  }
  if (!approvalNote || !String(approvalNote).trim()) {
    const e = new Error('退回原因 approval_note 為必填'); e.status = 400; throw e;
  }

  const status = getCandidateStatus(tenantDB, candidateId);
  if (!status) { const e = new Error('Candidate not found'); e.status = 404; throw e; }
  if (status !== 'pending_approval') {
    const e = new Error(`Candidate status must be pending_approval, got ${status}`); e.status = 409; throw e;
  }

  const latest = getLatestDecision(tenantDB, candidateId);
  if (!latest) { const e = new Error('No pending decision found'); e.status = 409; throw e; }

  const now = new Date().toISOString();

  tenantDB.transaction(() => {
    tenantDB.prepare(`
      UPDATE invitation_decisions
      SET approval_status = 'REJECTED', approver_id = ?, approved_at = ?, approval_note = ?
      WHERE id = ?
    `).run(currentUserId || null, now, approvalNote, latest.id);

    tenantDB.prepare(`
      UPDATE candidates SET status = 'pending_decision', updated_at = ? WHERE id = ?
    `).run(now, candidateId);
  });

  return { decisionId: latest.id, newStatus: 'pending_decision' };
}

function hasApproverRole(roles) {
  if (!Array.isArray(roles)) return false;
  return roles.some(r => APPROVER_ROLES.includes(r));
}

module.exports = {
  submitForApproval,
  approveDecision,
  rejectApproval,
  resolveSalaryRange,
  validateSalary,
  hasApproverRole,
  APPROVER_ROLES,
  SALARY_TYPE_VALUES
};
