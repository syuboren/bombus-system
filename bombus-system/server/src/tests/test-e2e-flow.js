/**
 * 11.1 端到端流程測試
 *
 * 測試分兩段：
 * A) 平台管理員 — 登入 → 建立租戶 → 驗證租戶存在 → 清理
 * B) Demo 租戶管理員 — 登入 → 查看/建立組織 → 建立角色 → 建立使用者
 *    → 指派角色 → 使用者登入 → 存取功能 → 權限隔離
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const BASE = 'http://localhost:3001';

// 平台管理員帳號 — 與 migrate-demo.js 使用相同的 .env / fallback 邏輯
const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'platform@bombus.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'platform123';
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
  console.log('=== 11.1 端到端流程測試 ===\n');

  // ===========================================================
  // Part A: 平台管理員流程
  // ===========================================================
  console.log('[Part A] 平台管理員流程\n');

  // A1: 平台管理員登入
  console.log('  [A1] 平台管理員登入');
  const platformLogin = await req('POST', '/api/auth/platform-login', {
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD
  });
  assert(platformLogin.status === 200, 'A1.1 平台管理員登入成功 (200)');
  assert(!!platformLogin.data?.access_token, 'A1.2 回傳 access_token');
  assert(platformLogin.data?.user?.isPlatformAdmin === true, 'A1.3 isPlatformAdmin = true');

  const platformToken = platformLogin.data?.access_token;

  // A2: 取得方案列表
  console.log('  [A2] 取得方案列表');
  const plans = await req('GET', '/api/platform/plans', null, platformToken);
  assert(plans.status === 200, 'A2.1 取得方案列表 (200)');
  assert(Array.isArray(plans.data) && plans.data.length >= 3, 'A2.2 至少 3 個方案 (Free/Basic/Enterprise)');

  // A3: 建立新租戶
  console.log('  [A3] 建立新租戶');
  const testSlug = `test-e2e-${Date.now()}`;
  const planId = plans.data?.[0]?.id;
  const createTenant = await req('POST', '/api/platform/tenants', {
    name: 'E2E Test Company',
    slug: testSlug,
    plan_id: planId
  }, platformToken);
  assert(createTenant.status === 201, `A3.1 建立新租戶 (201) slug=${testSlug}`);
  const tenantId = createTenant.data?.id;
  assert(!!tenantId, 'A3.2 回傳租戶 ID');

  // A4: 驗證租戶在列表中
  console.log('  [A4] 驗證租戶在列表中');
  const tenantList = await req('GET', '/api/platform/tenants', null, platformToken);
  assert(tenantList.status === 200, 'A4.1 取得租戶列表 (200)');
  const foundTenant = tenantList.data?.data?.find(t => t.slug === testSlug);
  assert(!!foundTenant, 'A4.2 新租戶出現在列表中');
  assert(foundTenant?.status === 'active', 'A4.3 新租戶狀態為 active');

  // A5: slug 重複測試
  console.log('  [A5] slug 重複測試');
  const dupTenant = await req('POST', '/api/platform/tenants', {
    name: 'Duplicate',
    slug: testSlug,
    plan_id: planId
  }, platformToken);
  assert(dupTenant.status === 409, 'A5.1 重複 slug 回傳 409');

  // A6: 清理 — 軟刪除 + 硬刪除
  console.log('  [A6] 清理測試租戶');
  if (tenantId) {
    const softDel = await req('DELETE', `/api/platform/tenants/${tenantId}`, null, platformToken);
    assert(softDel.status === 200, 'A6.1 軟刪除成功 (200)');

    const hardDel = await req('DELETE', `/api/platform/tenants/${tenantId}/purge`, { confirm: true }, platformToken);
    assert(hardDel.status === 200, 'A6.2 硬刪除成功 (200)');
  }

  // ===========================================================
  // Part B: Demo 租戶管理員完整流程
  // ===========================================================
  console.log('\n[Part B] Demo 租戶管理員流程\n');

  // B1: Demo 管理員登入
  console.log('  [B1] Demo 管理員登入');
  const adminLogin = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(adminLogin.status === 200, 'B1.1 Demo 管理員登入成功 (200)');
  assert(!!adminLogin.data?.access_token, 'B1.2 回傳 access_token');
  assert(!!adminLogin.data?.refresh_token, 'B1.3 回傳 refresh_token');
  assert(!!adminLogin.data?.user?.tenant_id, 'B1.4 回傳 tenant_id');

  const adminToken = adminLogin.data?.access_token;

  // B2: Token 刷新
  console.log('  [B2] Token 刷新');
  const refreshResult = await req('POST', '/api/auth/refresh', {
    refresh_token: adminLogin.data?.refresh_token
  });
  assert(refreshResult.status === 200, 'B2.1 Token 刷新成功 (200)');
  assert(!!refreshResult.data?.access_token, 'B2.2 刷新後回傳新 access_token');

  // 使用新 token 繼續
  const freshAdminToken = refreshResult.data?.access_token || adminToken;

  // B3: 查看組織架構
  console.log('  [B3] 查看組織架構');
  const orgUnits = await req('GET', '/api/tenant-admin/org-units', null, freshAdminToken);
  assert(orgUnits.status === 200, 'B3.1 取得組織架構 (200)');
  assert(Array.isArray(orgUnits.data), 'B3.2 回傳陣列');
  assert(orgUnits.data?.length >= 9, `B3.3 至少 9 個組織單位 (1集團+1子公司+7部門) 實際: ${orgUnits.data?.length}`);

  // B4: 建立新部門
  console.log('  [B4] 建立新部門');
  const subsidiary = orgUnits.data?.find(u => u.type === 'subsidiary');
  const subId = subsidiary?.id;

  const createDept = await req('POST', '/api/tenant-admin/org-units', {
    name: 'E2E 測試部門',
    type: 'department',
    parent_id: subId
  }, freshAdminToken);
  assert(createDept.status === 201, 'B4.1 建立新部門 (201)');
  const newDeptId = createDept.data?.id;

  // B5: 取得權限定義
  console.log('  [B5] 取得權限定義');
  const permsResult = await req('GET', '/api/tenant-admin/permissions', null, freshAdminToken);
  assert(permsResult.status === 200, 'B5.1 取得權限定義 (200)');
  const allPerms = permsResult.data?.permissions || [];
  assert(allPerms.length > 0, `B5.2 權限定義不為空 (${allPerms.length} 個)`);

  // B6: 建立自訂角色
  console.log('  [B6] 建立自訂角色');
  const readPermIds = allPerms.filter(p => p.action === 'read').map(p => p.id).slice(0, 5);
  const createRole = await req('POST', '/api/tenant-admin/roles', {
    name: 'E2E 唯讀角色',
    description: '只有讀取權限',
    scope_type: 'department',
    permission_ids: readPermIds
  }, freshAdminToken);
  assert(createRole.status === 201, 'B6.1 建立自訂角色 (201)');
  const customRoleId = createRole.data?.id;

  // 驗證角色在列表中
  const rolesList = await req('GET', '/api/tenant-admin/roles', null, freshAdminToken);
  assert(rolesList.status === 200, 'B6.2 取得角色列表 (200)');
  assert(Array.isArray(rolesList.data), 'B6.3 角色列表為陣列');
  const foundRole = rolesList.data?.find(r => r.name === 'E2E 唯讀角色');
  assert(!!foundRole, 'B6.4 自訂角色出現在列表中');

  // B7: 建立普通使用者
  console.log('  [B7] 建立普通使用者');
  const testEmail = `e2e-reader-${Date.now()}@demo.com`;
  const createUser = await req('POST', '/api/tenant-admin/users', {
    email: testEmail,
    password: 'Reader1234',
    name: 'E2E 唯讀使用者'
  }, freshAdminToken);
  assert(createUser.status === 201, 'B7.1 建立使用者 (201)');
  const newUserId = createUser.data?.id;

  // B8: 指派角色
  console.log('  [B8] 指派角色');
  const assignRole = await req('POST', '/api/tenant-admin/user-roles', {
    user_id: newUserId,
    role_id: customRoleId,
    org_unit_id: newDeptId
  }, freshAdminToken);
  assert(assignRole.status === 201, 'B8.1 指派角色 (201)');

  // 驗證角色指派
  const userRoles = await req('GET', `/api/tenant-admin/user-roles/${newUserId}`, null, freshAdminToken);
  assert(userRoles.status === 200, 'B8.2 取得使用者角色 (200)');
  assert(Array.isArray(userRoles.data) && userRoles.data.length > 0, 'B8.3 使用者至少有 1 個角色');

  // B9: 新使用者登入
  console.log('  [B9] 新使用者登入');
  const userLogin = await req('POST', '/api/auth/login', {
    email: testEmail,
    password: 'Reader1234',
    tenant_slug: 'demo'
  });
  assert(userLogin.status === 200, 'B9.1 新使用者登入成功 (200)');
  assert(userLogin.data?.user?.roles?.length > 0, 'B9.2 使用者有角色');

  const userToken = userLogin.data?.access_token;

  // B10: 使用者存取業務 API
  console.log('  [B10] 使用者存取業務 API');
  const empList = await req('GET', '/api/employee/list', null, userToken);
  assert(empList.status === 200, 'B10.1 使用者可存取員工列表 (200)');

  // B11: 權限隔離 — 普通使用者不能存取 tenant-admin
  console.log('  [B11] 權限隔離');
  const noAdmin = await req('GET', '/api/tenant-admin/roles', null, userToken);
  assert(noAdmin.status === 403, 'B11.1 普通使用者無法存取 tenant-admin (403)');

  // B12: 無 Token 被拒
  const noTokenReq = await req('GET', '/api/employee/list', null, null);
  assert(noTokenReq.status === 401, 'B11.2 無 Token 回傳 401');

  // B13: 登出後 refresh token 失效
  console.log('  [B13] 登出測試');
  const logoutResp = await req('POST', '/api/auth/logout', {
    refresh_token: userLogin.data?.refresh_token
  });
  assert(logoutResp.status === 200, 'B13.1 登出成功 (200)');

  const refreshAfterLogout = await req('POST', '/api/auth/refresh', {
    refresh_token: userLogin.data?.refresh_token
  });
  assert(refreshAfterLogout.status === 401, 'B13.2 登出後 refresh 失敗 (401)');

  // B14: 錯誤密碼登入
  console.log('  [B14] 錯誤密碼測試');
  const wrongPw = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'wrong_password',
    tenant_slug: 'demo'
  });
  assert(wrongPw.status === 401, 'B14.1 錯誤密碼回傳 401');

  // ===========================================================
  // Cleanup: 刪除 E2E 測試資料
  // ===========================================================
  console.log('\n[Cleanup] 清理測試資料');

  if (customRoleId && newUserId) {
    await req('DELETE', '/api/tenant-admin/user-roles', {
      user_id: newUserId,
      role_id: customRoleId,
      org_unit_id: newDeptId
    }, freshAdminToken);
    await req('DELETE', `/api/tenant-admin/roles/${customRoleId}`, null, freshAdminToken);
  }
  if (newDeptId) {
    await req('DELETE', `/api/tenant-admin/org-units/${newDeptId}`, null, freshAdminToken);
  }

  // ===========================================================
  // 結果摘要
  // ===========================================================
  console.log('\n' + results.join('\n'));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);

  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('測試執行錯誤:', err.message);
  process.exit(1);
});
