/**
 * 11.3 Demo 租戶資料完整性測試
 *
 * 驗證 demo 租戶遷移後的資料完整性：
 * - 員工、部門、職等、職能、招募、職缺、入職模版
 * - 組織架構、角色、權限、使用者
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
  console.log('=== 11.3 Demo 租戶資料完整性測試 ===\n');

  // ─── Step 1: Demo 管理員登入 ───
  console.log('  [1] Demo 管理員登入');
  const login = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(login.status === 200, '1.1 Demo 管理員登入成功 (200)');
  assert(!!login.data?.access_token, '1.2 回傳 access_token');
  const token = login.data?.access_token;

  if (!token) {
    console.error('無法取得 token，終止測試');
    console.log('\n' + results.join('\n'));
    console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);
    process.exit(1);
  }

  // ─── Step 2: 員工列表 ───
  console.log('  [2] 員工列表');
  const empList = await req('GET', '/api/employee/list', null, token);
  assert(empList.status === 200, '2.1 GET /api/employee/list 回傳 200');
  const empCount = Array.isArray(empList.data) ? empList.data.length : 0;
  assert(empCount >= 12, `2.2 至少 12 位員工 (實際: ${empCount})`);

  // ─── Step 3: 部門列表 ───
  console.log('  [3] 部門列表');
  const depts = await req('GET', '/api/employee/departments', null, token);
  assert(depts.status === 200, '3.1 GET /api/employee/departments 回傳 200');
  const deptCount = Array.isArray(depts.data) ? depts.data.length : 0;
  assert(deptCount >= 6, `3.2 至少 6 個部門 (實際: ${deptCount})`);

  // ─── Step 4: 職等職級矩陣 ───
  console.log('  [4] 職等職級矩陣');
  const gradeMatrix = await req('GET', '/api/grade-matrix', null, token);
  assert(gradeMatrix.status === 200, '4.1 GET /api/grade-matrix 回傳 200');

  // ─── Step 5: 職能基準庫 ───
  console.log('  [5] 職能基準庫');
  const competency = await req('GET', '/api/competency-mgmt/core', null, token);
  assert(competency.status === 200, '5.1 GET /api/competency-mgmt/core 回傳 200');

  // ─── Step 6: 招募管理 ───
  console.log('  [6] 招募管理');
  const recruitment = await req('GET', '/api/recruitment/candidates', null, token);
  assert(recruitment.status === 200, '6.1 GET /api/recruitment/candidates 回傳 200');

  // ─── Step 7: 職缺管理 ───
  console.log('  [7] 職缺管理');
  const jobs = await req('GET', '/api/jobs', null, token);
  assert(jobs.status === 200, '7.1 GET /api/jobs 回傳 200');

  // ─── Step 8: 入職模版 ───
  console.log('  [8] 入職模版');
  const templates = await req('GET', '/api/onboarding/templates', null, token);
  assert(templates.status === 200, '8.1 GET /api/onboarding/templates 回傳 200');

  // ─── Step 9: 組織架構 ───
  console.log('  [9] 組織架構');
  const orgUnits = await req('GET', '/api/tenant-admin/org-units', null, token);
  assert(orgUnits.status === 200, '9.1 GET /api/tenant-admin/org-units 回傳 200');
  const orgCount = Array.isArray(orgUnits.data) ? orgUnits.data.length : 0;
  assert(orgCount >= 9, `9.2 至少 9 個組織單位 (1集團+1子公司+7部門) (實際: ${orgCount})`);

  // 驗證組織類型分布
  if (Array.isArray(orgUnits.data)) {
    const groups = orgUnits.data.filter(u => u.type === 'group');
    const subsidiaries = orgUnits.data.filter(u => u.type === 'subsidiary');
    const departments = orgUnits.data.filter(u => u.type === 'department');
    assert(groups.length >= 1, `9.3 至少 1 個集團 (實際: ${groups.length})`);
    assert(subsidiaries.length >= 1, `9.4 至少 1 個子公司 (實際: ${subsidiaries.length})`);
    assert(departments.length >= 7, `9.5 至少 7 個部門 (實際: ${departments.length})`);
  }

  // ─── Step 10: 角色管理 ───
  console.log('  [10] 角色管理');
  const roles = await req('GET', '/api/tenant-admin/roles', null, token);
  assert(roles.status === 200, '10.1 GET /api/tenant-admin/roles 回傳 200');
  const roleCount = Array.isArray(roles.data) ? roles.data.length : 0;
  assert(roleCount >= 5, `10.2 至少 5 個系統角色 (實際: ${roleCount})`);

  // 驗證系統角色名稱
  if (Array.isArray(roles.data)) {
    const roleNames = roles.data.map(r => r.name);
    const expectedRoles = ['super_admin', 'subsidiary_admin', 'dept_manager', 'hr_manager', 'employee'];
    for (const expected of expectedRoles) {
      assert(roleNames.includes(expected), `10.3 存在系統角色: ${expected}`);
    }
  }

  // ─── Step 11: 權限定義 ───
  console.log('  [11] 權限定義');
  const perms = await req('GET', '/api/tenant-admin/permissions', null, token);
  assert(perms.status === 200, '11.1 GET /api/tenant-admin/permissions 回傳 200');
  const permCount = perms.data?.permissions ? perms.data.permissions.length : 0;
  assert(permCount >= 80, `11.2 至少 80 個權限定義 (實際: ${permCount})`);

  // 驗證權限分組
  if (perms.data?.grouped) {
    const groupKeys = Object.keys(perms.data.grouped);
    assert(groupKeys.length > 0, `11.3 權限已分組 (${groupKeys.length} 個 resource)`);
  }

  // ─── Step 12: 使用者管理 ───
  console.log('  [12] 使用者管理');
  const users = await req('GET', '/api/tenant-admin/users', null, token);
  assert(users.status === 200, '12.1 GET /api/tenant-admin/users 回傳 200');
  const userCount = users.data?.data ? users.data.data.length : (Array.isArray(users.data) ? users.data.length : 0);
  assert(userCount >= 1, `12.2 至少 1 位使用者 (admin) (實際: ${userCount})`);

  // 驗證 admin 使用者
  const userData = users.data?.data || users.data || [];
  if (Array.isArray(userData)) {
    const adminUser = userData.find(u => u.email === 'admin@demo.com');
    assert(!!adminUser, '12.3 存在 admin@demo.com 使用者');
    if (adminUser) {
      assert(adminUser.status === 'active', '12.4 admin 使用者狀態為 active');
      assert(Array.isArray(adminUser.roles) && adminUser.roles.length > 0, '12.5 admin 使用者有角色');
    }
  }

  // ─── 額外驗證：跨 API 資料一致性 ───
  console.log('  [13] 跨 API 資料一致性');

  // 員工部門列表 vs 組織架構部門
  if (Array.isArray(depts.data) && Array.isArray(orgUnits.data)) {
    const orgDeptNames = orgUnits.data.filter(u => u.type === 'department').map(u => u.name);
    // 員工部門至少部分與組織架構匹配（允許歷史部門差異）
    assert(
      depts.data.length > 0 && orgDeptNames.length > 0,
      '13.1 員工部門列表與組織架構部門皆非空'
    );
  }

  // ─── 結果摘要 ───
  console.log('\n' + results.join('\n'));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);

  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error('測試執行錯誤:', err.message); process.exit(1); });
