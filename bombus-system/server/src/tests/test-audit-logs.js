/**
 * 11.5 審計日誌測試
 *
 * 驗證敏感操作的審計日誌記錄：
 * - login_success / login_failed
 * - role_create / role_delete
 * - user_role_assign / user_role_revoke
 * - platform_login_success
 * - 405 Method Not Allowed 保護
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const BASE = 'http://localhost:3001';
const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'platform@bombus.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'platform123';
let passed = 0, failed = 0;
const results = [];
function assert(condition, desc) { if (condition) { passed++; results.push(`  PASS: ${desc}`); } else { failed++; results.push(`  FAIL: ${desc}`); } }
async function req(method, path, body, token) { const h = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; const o = { method, headers: h }; if (body && method !== 'GET') o.body = JSON.stringify(body); const r = await fetch(`${BASE}${path}`, o); let d = null; try { d = await r.json(); } catch {} return { status: r.status, data: d }; }

async function run() {
  console.log('=== 11.5 審計日誌測試 ===\n');

  const ts = Date.now();

  // ─── Step 1: Demo 管理員登入 (產生 login_success) ───
  console.log('  [1] Demo 管理員登入 (產生 login_success)');
  const adminLogin = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(adminLogin.status === 200, '1.1 Demo 管理員登入成功 (200)');
  const adminToken = adminLogin.data?.access_token;

  if (!adminToken) {
    console.error('無法取得 admin token，終止測試');
    console.log('\n' + results.join('\n'));
    console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);
    process.exit(1);
  }

  // ─── Step 2: 查詢 login_success 審計日誌 ───
  console.log('  [2] 查詢 login_success 審計日誌');
  const loginLogs = await req('GET', '/api/audit/logs?action=login_success', null, adminToken);
  assert(loginLogs.status === 200, '2.1 GET /api/audit/logs?action=login_success 回傳 200');
  const loginLogCount = loginLogs.data?.data ? loginLogs.data.data.length : 0;
  assert(loginLogCount >= 1, `2.2 至少 1 筆 login_success 記錄 (實際: ${loginLogCount})`);

  // ─── Step 3: 建立角色 (產生 role_create) ───
  console.log('  [3] 建立角色 (產生 role_create)');
  const testRoleName = `audit-test-role-${ts}`;
  const createRole = await req('POST', '/api/tenant-admin/roles', {
    name: testRoleName,
    description: '審計測試用角色',
    scope_type: 'department'
  }, adminToken);
  assert(createRole.status === 201, '3.1 建立角色成功 (201)');
  const testRoleId = createRole.data?.id;

  // ─── Step 4: 查詢 role_create 審計日誌 ───
  console.log('  [4] 查詢 role_create 審計日誌');
  const roleCreateLogs = await req('GET', '/api/audit/logs?action=role_create', null, adminToken);
  assert(roleCreateLogs.status === 200, '4.1 GET /api/audit/logs?action=role_create 回傳 200');
  const roleCreateCount = roleCreateLogs.data?.data ? roleCreateLogs.data.data.length : 0;
  assert(roleCreateCount >= 1, `4.2 至少 1 筆 role_create 記錄 (實際: ${roleCreateCount})`);

  // 驗證最新記錄包含角色名稱
  if (roleCreateLogs.data?.data?.length > 0) {
    const latestRoleCreate = roleCreateLogs.data.data[0];
    const details = latestRoleCreate.details;
    assert(
      details && details.name === testRoleName,
      `4.3 role_create 記錄包含角色名稱: ${testRoleName}`
    );
  }

  // ─── Step 5: 建立使用者 ───
  console.log('  [5] 建立使用者');
  const testEmail = `audit-user-${ts}@demo.com`;
  const createUser = await req('POST', '/api/tenant-admin/users', {
    email: testEmail,
    password: 'AuditTest1234',
    name: '審計測試使用者'
  }, adminToken);
  assert(createUser.status === 201, '5.1 建立使用者成功 (201)');
  const testUserId = createUser.data?.id;

  // ─── Step 6: 指派角色 (產生 user_role_assign) ───
  console.log('  [6] 指派角色 (產生 user_role_assign)');
  // 取得部門 ID
  const orgUnits = await req('GET', '/api/tenant-admin/org-units', null, adminToken);
  const dept = orgUnits.data?.find(u => u.type === 'department');
  const deptId = dept?.id;

  if (testUserId && testRoleId && deptId) {
    const assignRole = await req('POST', '/api/tenant-admin/user-roles', {
      user_id: testUserId,
      role_id: testRoleId,
      org_unit_id: deptId
    }, adminToken);
    assert(assignRole.status === 201, '6.1 指派角色成功 (201)');
  }

  // ─── Step 7: 查詢 user_role_assign 審計日誌 ───
  console.log('  [7] 查詢 user_role_assign 審計日誌');
  const assignLogs = await req('GET', '/api/audit/logs?action=user_role_assign', null, adminToken);
  assert(assignLogs.status === 200, '7.1 GET /api/audit/logs?action=user_role_assign 回傳 200');
  const assignCount = assignLogs.data?.data ? assignLogs.data.data.length : 0;
  assert(assignCount >= 1, `7.2 至少 1 筆 user_role_assign 記錄 (實際: ${assignCount})`);

  // 驗證最新指派記錄
  if (assignLogs.data?.data?.length > 0) {
    const latestAssign = assignLogs.data.data[0];
    assert(
      latestAssign.details && latestAssign.details.target_user_id === testUserId,
      '7.3 user_role_assign 記錄包含正確的 target_user_id'
    );
  }

  // ─── Step 8: 撤銷角色 (產生 user_role_revoke) ───
  console.log('  [8] 撤銷角色 (產生 user_role_revoke)');
  if (testUserId && testRoleId) {
    const revokeRole = await req('DELETE', '/api/tenant-admin/user-roles', {
      user_id: testUserId,
      role_id: testRoleId,
      org_unit_id: deptId
    }, adminToken);
    assert(revokeRole.status === 200, '8.1 撤銷角色成功 (200)');
  }

  // ─── Step 9: 查詢 user_role_revoke 審計日誌 ───
  console.log('  [9] 查詢 user_role_revoke 審計日誌');
  const revokeLogs = await req('GET', '/api/audit/logs?action=user_role_revoke', null, adminToken);
  assert(revokeLogs.status === 200, '9.1 GET /api/audit/logs?action=user_role_revoke 回傳 200');
  const revokeCount = revokeLogs.data?.data ? revokeLogs.data.data.length : 0;
  assert(revokeCount >= 1, `9.2 至少 1 筆 user_role_revoke 記錄 (實際: ${revokeCount})`);

  // ─── Step 10: 刪除角色 (產生 role_delete) ───
  console.log('  [10] 刪除角色 (產生 role_delete)');
  if (testRoleId) {
    const deleteRole = await req('DELETE', `/api/tenant-admin/roles/${testRoleId}`, null, adminToken);
    assert(deleteRole.status === 200, '10.1 刪除角色成功 (200)');
  }

  // ─── Step 11: 查詢 role_delete 審計日誌 ───
  console.log('  [11] 查詢 role_delete 審計日誌');
  const deleteLogs = await req('GET', '/api/audit/logs?action=role_delete', null, adminToken);
  assert(deleteLogs.status === 200, '11.1 GET /api/audit/logs?action=role_delete 回傳 200');
  const deleteCount = deleteLogs.data?.data ? deleteLogs.data.data.length : 0;
  assert(deleteCount >= 1, `11.2 至少 1 筆 role_delete 記錄 (實際: ${deleteCount})`);

  // 驗證刪除記錄包含角色名稱
  if (deleteLogs.data?.data?.length > 0) {
    const latestDelete = deleteLogs.data.data[0];
    assert(
      latestDelete.details && latestDelete.details.name === testRoleName,
      `11.3 role_delete 記錄包含角色名稱: ${testRoleName}`
    );
  }

  // ─── Step 12: 405 保護測試 ───
  console.log('  [12] 405 Method Not Allowed 保護');
  const putAudit = await req('PUT', '/api/audit/logs', { test: true }, adminToken);
  assert(putAudit.status === 405, `12.1 PUT /api/audit/logs 回傳 405 (實際: ${putAudit.status})`);

  const deleteAudit = await req('DELETE', '/api/audit/logs', { test: true }, adminToken);
  assert(deleteAudit.status === 405, `12.2 DELETE /api/audit/logs 回傳 405 (實際: ${deleteAudit.status})`);

  // ─── Step 13: 平台管理員登入審計 ───
  console.log('  [13] 平台管理員登入審計');
  const platformLogin = await req('POST', '/api/auth/platform-login', {
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD
  });
  assert(platformLogin.status === 200, '13.1 平台管理員登入成功 (200)');
  const platformToken = platformLogin.data?.access_token;

  // 用平台管理員 token 查詢 platform_login_success
  const platformLoginLogs = await req('GET', '/api/audit/logs?action=platform_login_success', null, platformToken);
  assert(platformLoginLogs.status === 200, '13.2 查詢 platform_login_success (200)');
  const platformLoginCount = platformLoginLogs.data?.data ? platformLoginLogs.data.data.length : 0;
  assert(platformLoginCount >= 1, `13.3 至少 1 筆 platform_login_success 記錄 (實際: ${platformLoginCount})`);

  // ─── Step 14: 錯誤密碼登入產生 login_failed ───
  console.log('  [14] 錯誤密碼登入審計');
  const wrongPw = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'wrong_password_' + ts,
    tenant_slug: 'demo'
  });
  assert(wrongPw.status === 401, '14.1 錯誤密碼登入回傳 401');

  // 查詢 login_failed 日誌
  const failedLogs = await req('GET', '/api/audit/logs?action=login_failed', null, adminToken);
  assert(failedLogs.status === 200, '14.2 查詢 login_failed (200)');
  const failedCount = failedLogs.data?.data ? failedLogs.data.data.length : 0;
  assert(failedCount >= 1, `14.3 至少 1 筆 login_failed 記錄 (實際: ${failedCount})`);

  // 驗證最新的 login_failed 記錄包含失敗原因
  if (failedLogs.data?.data?.length > 0) {
    const latestFailed = failedLogs.data.data[0];
    assert(
      latestFailed.details && latestFailed.details.reason,
      `14.4 login_failed 記錄包含失敗原因: ${latestFailed.details?.reason}`
    );
  }

  // ─── Step 15: 日誌分頁與篩選 ───
  console.log('  [15] 日誌分頁與篩選');
  const pagedLogs = await req('GET', '/api/audit/logs?page=1&limit=5', null, adminToken);
  assert(pagedLogs.status === 200, '15.1 分頁查詢成功 (200)');
  assert(pagedLogs.data?.pagination?.page === 1, '15.2 分頁資訊正確 (page=1)');
  assert(pagedLogs.data?.pagination?.limit === 5, '15.3 分頁資訊正確 (limit=5)');
  const pagedDataCount = pagedLogs.data?.data ? pagedLogs.data.data.length : 0;
  assert(pagedDataCount <= 5, `15.4 回傳資料不超過 limit (實際: ${pagedDataCount})`);

  // resource 篩選
  const resourceLogs = await req('GET', '/api/audit/logs?resource=auth', null, adminToken);
  assert(resourceLogs.status === 200, '15.5 resource 篩選成功 (200)');
  if (resourceLogs.data?.data?.length > 0) {
    const allAuth = resourceLogs.data.data.every(l => l.resource === 'auth');
    assert(allAuth, '15.6 resource=auth 篩選結果正確');
  }

  // ─── 結果摘要 ───
  console.log('\n' + results.join('\n'));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);

  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error('測試執行錯誤:', err.message); process.exit(1); });
