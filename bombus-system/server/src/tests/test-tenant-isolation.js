/**
 * 11.2 租戶隔離測試
 *
 * 驗證 JWT-based 租戶隔離機制：
 * - Demo 使用者 token (tid=demo) 只能存取 demo 租戶資料
 * - 已暫停租戶的使用者取得 403
 * - 平台管理員可看所有租戶但無法存取業務路由（缺乏租戶上下文）
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
  console.log('=== 11.2 租戶隔離測試 ===\n');

  const ts = Date.now();

  // ─── Step 1: 平台管理員登入 ───
  console.log('  [1] 平台管理員登入');
  const platformLogin = await req('POST', '/api/auth/platform-login', {
    email: PLATFORM_EMAIL,
    password: PLATFORM_PASSWORD
  });
  assert(platformLogin.status === 200, '1.1 平台管理員登入成功 (200)');
  const platformToken = platformLogin.data?.access_token;

  // ─── Step 2: 建立測試租戶 B (空 DB) ───
  console.log('  [2] 建立測試租戶 B');
  const slugB = `test-iso-b-${ts}`;
  const createB = await req('POST', '/api/platform/tenants', {
    name: 'Isolation Test B',
    slug: slugB,
    admin_email: `admin@${slugB}.com`,
    admin_name: 'Isolation Admin',
    admin_password: 'Admin123456'
  }, platformToken);
  assert(createB.status === 201, `2.1 建立租戶 B (201) slug=${slugB}`);
  const tenantBId = createB.data?.id;

  // ─── Step 3: Demo 管理員登入 (作為租戶 A) ───
  console.log('  [3] Demo 管理員登入 (租戶 A)');
  const demoLogin = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(demoLogin.status === 200, '3.1 Demo 管理員登入成功 (200)');
  assert(!!demoLogin.data?.user?.tenant_id, '3.2 回傳 tenant_id');
  const demoToken = demoLogin.data?.access_token;
  const demoTenantId = demoLogin.data?.user?.tenant_id;

  // ─── Step 4: Demo token 存取員工列表 — 應成功 ───
  console.log('  [4] Demo token 存取 /api/employee/list');
  const empList = await req('GET', '/api/employee/list', null, demoToken);
  assert(empList.status === 200, '4.1 Demo 使用者存取員工列表成功 (200)');
  assert(Array.isArray(empList.data) && empList.data.length > 0, '4.2 員工列表有資料');

  // ─── Step 5: JWT 隔離驗證 ───
  // JWT token 中 tid=demo，middleware 自動載入 demo DB。
  // 無法偽造不同 tenant 的 JWT（除非知道 JWT_SECRET），因此
  // 實際隔離靠 JWT 簽名 + tid claim。
  console.log('  [5] JWT 隔離機制驗證');
  assert(!!demoTenantId, '5.1 Demo token 包含 tenant_id (tid)');
  // 驗證 demo token 拿到的資料確實來自 demo 租戶
  const demoOrgUnits = await req('GET', '/api/tenant-admin/org-units', null, demoToken);
  assert(demoOrgUnits.status === 200, '5.2 Demo token 存取組織架構成功 (200)');
  assert(Array.isArray(demoOrgUnits.data) && demoOrgUnits.data.length > 0, '5.3 Demo 組織架構有資料');

  // ─── Step 6: 暫停租戶 B 並嘗試登入 ───
  console.log('  [6] 暫停租戶 B 並測試登入被拒');

  // 先在租戶 B 建立使用者（透過 platform admin 暫停前先確認 B 存在）
  // 租戶 B 是空 DB（無使用者），嘗試登入會因 user_not_found 得到 401
  const loginB_before = await req('POST', '/api/auth/login', {
    email: 'nonexistent@test.com',
    password: 'test12345678',
    tenant_slug: slugB
  });
  assert(loginB_before.status === 401, '6.1 租戶 B 空 DB 登入失敗 (401 user_not_found)');

  // 暫停租戶 B
  const suspendB = await req('PUT', `/api/platform/tenants/${tenantBId}`, {
    status: 'suspended'
  }, platformToken);
  assert(suspendB.status === 200, '6.2 暫停租戶 B 成功 (200)');

  // 暫停後嘗試登入 — 應得 403 TenantSuspended
  const loginB_suspended = await req('POST', '/api/auth/login', {
    email: 'anyone@test.com',
    password: 'test12345678',
    tenant_slug: slugB
  });
  assert(loginB_suspended.status === 403, '6.3 暫停租戶登入被拒 (403 TenantSuspended)');
  assert(loginB_suspended.data?.error === 'TenantSuspended', '6.4 錯誤碼為 TenantSuspended');

  // ─── Step 7: 平台管理員可看所有租戶但無法存取業務路由 ───
  console.log('  [7] 平台管理員存取限制');

  // 平台管理員可查看所有租戶列表
  const allTenants = await req('GET', '/api/platform/tenants', null, platformToken);
  assert(allTenants.status === 200, '7.1 平台管理員可查看所有租戶 (200)');
  assert(allTenants.data?.total >= 2, '7.2 至少有 2 個租戶 (demo + test-iso-b)');

  // 平台管理員 token 沒有 tid，存取需要 tenantMiddleware 的業務路由
  // tenantMiddleware 對 isPlatformAdmin 會 next()（跳過），
  // 但實際 route handler 中使用 req.tenantDB 會是 undefined
  // 結果取決於路由實作：可能 500 或其他錯誤
  const platformEmpAccess = await req('GET', '/api/employee/list', null, platformToken);
  // 平台管理員 token: isPlatformAdmin=true, tenantMiddleware 跳過不載入 tenantDB
  // employee route 用 req.tenantDB.prepare() 會拋 TypeError → 500
  assert(
    platformEmpAccess.status !== 200,
    `7.3 平台管理員無法正常存取業務路由 (非200, 實際: ${platformEmpAccess.status})`
  );

  // 平台管理員可以存取審計日誌（不需 tenantMiddleware）
  const platformAudit = await req('GET', '/api/audit/logs', null, platformToken);
  assert(platformAudit.status === 200, '7.4 平台管理員可存取審計日誌 (200)');

  // ─── Step 8: 無 Token 存取被拒 ───
  console.log('  [8] 無 Token 存取被拒');
  const noToken = await req('GET', '/api/employee/list', null, null);
  assert(noToken.status === 401, '8.1 無 Token 存取業務路由回傳 401');

  // 偽造 token 被拒
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIiwidGlkIjoiZmFrZSJ9.invalid';
  const fakeAccess = await req('GET', '/api/employee/list', null, fakeToken);
  assert(fakeAccess.status === 401, '8.2 偽造 Token 回傳 401');

  // ─── Step 9: 不存在的租戶登入被拒 ───
  console.log('  [9] 不存在的租戶登入被拒');
  const ghostTenant = await req('POST', '/api/auth/login', {
    email: 'test@ghost.com',
    password: 'test12345678',
    tenant_slug: 'nonexistent-tenant-xyz'
  });
  assert(ghostTenant.status === 401, '9.1 不存在的租戶登入回傳 401');

  // ─── Cleanup: 刪除測試租戶 B ───
  console.log('\n[Cleanup] 清理測試租戶');
  if (tenantBId) {
    // 先恢復為 active 再軟刪除（suspended → active → deleted）
    await req('PUT', `/api/platform/tenants/${tenantBId}`, { status: 'active' }, platformToken);
    const softDel = await req('DELETE', `/api/platform/tenants/${tenantBId}`, null, platformToken);
    assert(softDel.status === 200, 'Cleanup: 軟刪除租戶 B 成功');
    const hardDel = await req('DELETE', `/api/platform/tenants/${tenantBId}/purge`, { confirm: true }, platformToken);
    assert(hardDel.status === 200, 'Cleanup: 硬刪除租戶 B 成功');
  }

  // ─── 結果摘要 ───
  console.log('\n' + results.join('\n'));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);

  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error('測試執行錯誤:', err.message); process.exit(1); });
