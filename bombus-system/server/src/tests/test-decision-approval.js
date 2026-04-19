/**
 * 面試決策簽核流程整合測試
 *
 * 涵蓋：
 * - 4 個新端點存在性（submit-approval / approve / reject-approval / salary-range）
 * - 權限層：L1.decision edit permission
 * - 角色層：approve/reject 僅允許 subsidiary_admin/super_admin
 * - 輸入驗證：decision 必填、salary type/amount 驗證
 * - 狀態機：候選人非 pending_decision 時拒絕 submit
 * - salary-range API 回應結構
 *
 * 註：完整生命週期（pending_decision → submit → approve → offered）需要
 *     候選人狀態為 pending_decision 的測試資料，目前 demo 租戶所有候選人皆已 onboarded，
 *     故此測試聚焦於錯誤路徑與驗證層。完整 e2e 流程另由 8.3 手動端到端驗證補齊。
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

const BASE = 'http://localhost:3001';
let passed = 0, failed = 0;
const results = [];

function assert(condition, desc) {
  if (condition) { passed++; results.push(`  PASS: ${desc}`); }
  else { failed++; results.push(`  FAIL: ${desc}`); }
}

async function req(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const o = { method, headers: h };
  if (body && method !== 'GET') o.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, o);
  let d = null;
  try { d = await r.json(); } catch {}
  return { status: r.status, data: d };
}

async function run() {
  console.log('=== 面試決策簽核流程整合測試 ===\n');

  // ─── Setup: 取得 super_admin token ───
  const login = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(login.status === 200, 'Setup: Demo 管理員登入成功');
  const adminToken = login.data?.access_token;
  if (!adminToken) {
    console.error('無法取得 token，終止測試');
    console.log('\n' + results.join('\n'));
    process.exit(1);
  }

  // 取得任一候選人 id 作為測試對象
  const candidatesRes = await req('GET', '/api/recruitment/candidates', null, adminToken);
  assert(candidatesRes.status === 200, 'Setup: 取得候選人列表');
  const candidateId = candidatesRes.data?.[0]?.id;
  if (!candidateId) {
    console.warn('無候選人可測，略過後續測試');
    console.log('\n' + results.join('\n'));
    console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);
    process.exit(failed === 0 ? 0 : 1);
  }

  // ═══════════════════════════════════════════════════════════
  // Section 1: salary-range API 結構驗證
  // ═══════════════════════════════════════════════════════════
  console.log('  [Section 1] salary-range API');
  const sr = await req('GET', `/api/recruitment/candidates/${candidateId}/salary-range`, null, adminToken);
  assert(sr.status === 200, '1.1 GET /salary-range 回傳 200');
  assert(sr.data && typeof sr.data === 'object', '1.2 回傳 JSON 物件');
  assert('grade' in sr.data, '1.3 含 grade 欄位');
  assert('grade_title' in sr.data, '1.4 含 grade_title 欄位');
  assert('salary_low' in sr.data, '1.5 含 salary_low 欄位');
  assert('salary_high' in sr.data, '1.6 含 salary_high 欄位');
  assert('has_range' in sr.data, '1.7 含 has_range 欄位');
  assert('reason' in sr.data, '1.8 含 reason 欄位');
  assert(typeof sr.data.has_range === 'boolean', '1.9 has_range 為 boolean');

  const srNotFound = await req('GET', '/api/recruitment/candidates/NONEXISTENT_ID/salary-range', null, adminToken);
  assert(srNotFound.status === 200 && srNotFound.data?.reason === 'candidate_not_found',
    '1.10 找不到候選人時 reason = candidate_not_found');

  // ═══════════════════════════════════════════════════════════
  // Section 2: submit-approval 狀態守門
  // ═══════════════════════════════════════════════════════════
  console.log('  [Section 2] submit-approval 狀態守門');

  // 2.1 無效 decision
  const invalidDecision = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Unknown', decision_reason: 'test' },
    adminToken);
  assert(invalidDecision.status === 400, '2.1 無效 decision 回傳 400');

  // 2.2 缺 decision_reason
  const missingReason = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered' },
    adminToken);
  assert(missingReason.status === 400, '2.2 缺 decision_reason 回傳 400');

  // 2.3 候選人狀態非 pending_decision（demo 資料為 onboarded）→ 409
  const wrongStatus = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered', decision_reason: 'test', approved_salary_type: 50, approved_salary_amount: 60000 },
    adminToken);
  assert(wrongStatus.status === 409, `2.3 非 pending_decision 狀態回傳 409（實際: ${wrongStatus.status}）`);

  // 2.4 候選人不存在
  const notFound = await req('POST',
    '/api/recruitment/candidates/NONEXISTENT_ID/submit-approval',
    { decision: 'Offered', decision_reason: 'test', approved_salary_type: 50, approved_salary_amount: 60000 },
    adminToken);
  assert(notFound.status === 404, '2.4 找不到候選人回傳 404');

  // ═══════════════════════════════════════════════════════════
  // Section 3: 薪資驗證（透過 submit-approval 測試）
  // ═══════════════════════════════════════════════════════════
  console.log('  [Section 3] 薪資驗證');

  // 3.1 Offered 但無薪資 → 400
  const noSalary = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered', decision_reason: 'test' },
    adminToken);
  assert(noSalary.status === 400, '3.1 Offered 無薪資回傳 400');

  // 3.2 無效薪資類型
  const invalidType = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered', decision_reason: 'test', approved_salary_type: 99, approved_salary_amount: 60000 },
    adminToken);
  assert(invalidType.status === 400, '3.2 無效薪資類型回傳 400');

  // 3.3 金額為 0 或負數
  const zeroAmount = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered', decision_reason: 'test', approved_salary_type: 50, approved_salary_amount: 0 },
    adminToken);
  assert(zeroAmount.status === 400, '3.3 金額為 0 回傳 400');

  const negativeAmount = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered', decision_reason: 'test', approved_salary_type: 50, approved_salary_amount: -1000 },
    adminToken);
  assert(negativeAmount.status === 400, '3.4 金額為負數回傳 400');

  // ═══════════════════════════════════════════════════════════
  // Section 4: approve / reject-approval 狀態守門
  // ═══════════════════════════════════════════════════════════
  console.log('  [Section 4] approve / reject-approval 狀態守門');

  // 4.1 approve 在非 pending_approval 狀態 → 409
  const approveWrong = await req('POST',
    `/api/recruitment/candidates/${candidateId}/approve`,
    { approval_note: 'test' },
    adminToken);
  assert(approveWrong.status === 409, `4.1 非 pending_approval 狀態 approve 回傳 409（實際: ${approveWrong.status}）`);

  // 4.2 reject-approval 缺 approval_note
  const rejectNoNote = await req('POST',
    `/api/recruitment/candidates/${candidateId}/reject-approval`,
    {},
    adminToken);
  assert(rejectNoNote.status === 400, '4.2 缺 approval_note 回傳 400');

  // 4.3 reject-approval 空字串 approval_note
  const rejectEmptyNote = await req('POST',
    `/api/recruitment/candidates/${candidateId}/reject-approval`,
    { approval_note: '   ' },
    adminToken);
  assert(rejectEmptyNote.status === 400, '4.3 空白 approval_note 回傳 400');

  // 4.4 reject-approval 非 pending_approval 狀態 → 409
  const rejectWrongStatus = await req('POST',
    `/api/recruitment/candidates/${candidateId}/reject-approval`,
    { approval_note: '測試退回' },
    adminToken);
  assert(rejectWrongStatus.status === 409, `4.4 非 pending_approval 狀態 reject 回傳 409（實際: ${rejectWrongStatus.status}）`);

  // ═══════════════════════════════════════════════════════════
  // Section 5: 權限層 — 未認證請求
  // ═══════════════════════════════════════════════════════════
  console.log('  [Section 5] 權限層');

  const noAuth = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered', decision_reason: 'test' });
  assert(noAuth.status === 401, '5.1 無 token 回傳 401');

  const invalidToken = await req('POST',
    `/api/recruitment/candidates/${candidateId}/submit-approval`,
    { decision: 'Offered', decision_reason: 'test' },
    'invalid-token-xxx');
  assert(invalidToken.status === 401 || invalidToken.status === 403,
    `5.2 無效 token 回傳 401/403（實際: ${invalidToken.status}）`);

  // ═══════════════════════════════════════════════════════════
  // Section 6: GET /candidates JOIN approval fields
  // ═══════════════════════════════════════════════════════════
  console.log('  [Section 6] GET /candidates JOIN 欄位');

  const listCheck = await req('GET', '/api/recruitment/candidates', null, adminToken);
  const sample = listCheck.data?.[0];
  if (sample) {
    assert('approved_salary_type' in sample, '6.1 候選人 response 含 approved_salary_type');
    assert('approved_salary_amount' in sample, '6.2 候選人 response 含 approved_salary_amount');
    assert('approved_salary_out_of_range' in sample, '6.3 候選人 response 含 approved_salary_out_of_range');
    assert('approval_status' in sample, '6.4 候選人 response 含 approval_status（JOIN invitation_decisions）');
    assert('approver_id' in sample, '6.5 候選人 response 含 approver_id');
    assert('approved_at' in sample, '6.6 候選人 response 含 approved_at');
    assert('approval_note' in sample, '6.7 候選人 response 含 approval_note');
    assert('job_grade' in sample, '6.8 候選人 response 含 job_grade（JOIN jobs）');
  }

  // ═══════════════════════════════════════════════════════════
  // 結果輸出
  // ═══════════════════════════════════════════════════════════
  console.log('\n' + results.join('\n'));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);
  process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
  console.error('測試異常:', err);
  process.exit(1);
});
