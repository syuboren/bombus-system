/**
 * Email 同步測試
 *
 * 驗證員工 email 更新時同步 users.email 的行為：
 * 1. 更新員工 email → users.email 同步更新
 * 2. 員工列表 API 回傳 userEmail 欄位
 * 3. 用新 email 可以登入
 * 4. email 唯一性衝突回傳 409
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const BASE = 'http://localhost:3001';
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, description) {
  if (condition) {
    passed++;
    results.push(`  PASS: ${description}`);
  } else {
    failed++;
    results.push(`  FAIL: ${description}`);
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

async function run() {
  console.log('=== Email 同步測試 ===\n');

  // ============================================================
  // Step 1: admin 登入 demo 租戶
  // ============================================================
  console.log('[1] Admin 登入\n');

  const adminLogin = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(adminLogin.status === 200, '1.1 Admin 登入成功 (200)');
  const token = adminLogin.data?.access_token;

  if (!token) {
    console.log('\n  ⚠ 無法取得 token，中止測試');
    results.forEach(r => console.log(r));
    console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // ============================================================
  // Step 2: 建立測試員工 + 帳號
  // ============================================================
  console.log('[2] 建立測試員工與帳號\n');

  const ts = Date.now();
  const testEmail = `test-sync-${ts}@test.com`;
  const testEmpNo = `ESYNC${ts}`;
  const createEmp = await req('POST', '/api/employee', {
    name: 'Email Sync Test',
    email: testEmail,
    employee_no: testEmpNo,
    department: '專案部',
    position: '工程師',
    level: 'Grade 1',
    grade: 'BS01',
    status: 'active',
    contract_type: 'full-time',
    createUser: false
  }, token);
  assert(createEmp.status === 201 || createEmp.status === 200, '2.1 建立測試員工');
  const empId = createEmp.data?.id || createEmp.data?.employee?.id;
  assert(!!empId, '2.2 取得員工 ID');

  // 建立帳號
  const createAccount = await req('POST', `/api/employee/${empId}/create-account`, null, token);
  assert(createAccount.status === 201 || createAccount.status === 200, '2.3 建立帳號');
  const initialPassword = createAccount.data?.initialPassword || createAccount.data?.password;
  assert(!!initialPassword, '2.4 取得初始密碼');

  // 驗證用原始 email 可以登入
  const loginOriginal = await req('POST', '/api/auth/login', {
    email: testEmail,
    password: initialPassword,
    tenant_slug: 'demo'
  });
  assert(loginOriginal.status === 200, '2.5 用原始 email 登入成功');

  // ============================================================
  // Step 3: 員工列表 API 回傳 userEmail
  // ============================================================
  console.log('[3] 員工列表 API 回傳 userEmail\n');

  const listRes = await req('GET', '/api/employee/list', null, token);
  assert(listRes.status === 200, '3.1 取得員工列表 (200)');

  const testEmpInList = listRes.data?.find(e => e.id === empId);
  assert(!!testEmpInList, '3.2 測試員工在列表中');
  assert(testEmpInList?.userEmail === testEmail, '3.3 userEmail 等於原始 email');

  // ============================================================
  // Step 4: 更新員工 email → users.email 同步
  // ============================================================
  console.log('[4] 更新員工 email 同步測試\n');

  const newEmail = `test-sync-new-${Date.now()}@test.com`;
  const updateRes = await req('PUT', `/api/employee/${empId}`, {
    email: newEmail
  }, token);
  assert(updateRes.status === 200, '4.1 更新員工 email (200)');
  assert(updateRes.data?.email === newEmail, '4.2 employees.email 已更新');

  // 驗證列表中 userEmail 也已更新
  const listAfter = await req('GET', '/api/employee/list', null, token);
  const empAfter = listAfter.data?.find(e => e.id === empId);
  assert(empAfter?.userEmail === newEmail, '4.3 列表中 userEmail 已同步為新 email');

  // ============================================================
  // Step 5: 用新 email 登入
  // ============================================================
  console.log('[5] 用新 email 登入\n');

  const loginNew = await req('POST', '/api/auth/login', {
    email: newEmail,
    password: initialPassword,
    tenant_slug: 'demo'
  });
  assert(loginNew.status === 200, '5.1 用新 email 登入成功');

  // 用舊 email 應該登入失敗
  const loginOld = await req('POST', '/api/auth/login', {
    email: testEmail,
    password: initialPassword,
    tenant_slug: 'demo'
  });
  assert(loginOld.status === 401, '5.2 用舊 email 登入失敗 (401)');

  // ============================================================
  // Step 6: email 唯一性衝突
  // ============================================================
  console.log('[6] Email 唯一性衝突\n');

  // 嘗試將員工 email 改為 admin 的 email
  const conflictRes = await req('PUT', `/api/employee/${empId}`, {
    email: 'admin@demo.com'
  }, token);
  assert(conflictRes.status === 409, '6.1 email 衝突回傳 409');

  // ============================================================
  // Cleanup: 刪除測試員工
  // ============================================================
  console.log('[Cleanup] 清理測試資料\n');
  await req('DELETE', `/api/employee/${empId}`, null, token);

  // ============================================================
  // 結果
  // ============================================================
  console.log('');
  results.forEach(r => console.log(r));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
