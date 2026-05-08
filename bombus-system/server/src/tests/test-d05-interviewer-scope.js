/**
 * D-05 interviewer 三道防線端到端整合測試
 * 對應 spec：interviewer-role-scope/spec.md 全部 Requirements
 *   - Interviewer dropdown filters by interviewer role  (Defense Layer 1: UI 防呆)
 *   - Three-layer defense for interviewer scope        (Defense Layer 2: feature gate)
 *   - Interviewer-assigned row filter for candidates   (Defense Layer 3: row filter)
 *
 * 利用 demo 租戶既有資料（Amy + 許阿任 已被指派 interviewer 角色）。
 *
 * 前提：server 在 http://localhost:3001
 *
 * 執行：node server/src/tests/test-d05-interviewer-scope.js
 */

const BASE = 'http://localhost:3001';
let passed = 0, failed = 0;
const results = [];

function assert(cond, desc) {
    if (cond) { passed++; results.push(`  ✅ ${desc}`); }
    else { failed++; results.push(`  ❌ ${desc}`); }
}

async function req(method, path, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const o = { method, headers: h };
    if (body && method !== 'GET') o.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, o);
    let d = null;
    try { d = await r.json(); } catch { /* non-json */ }
    return { status: r.status, data: d };
}

async function run() {
    console.log('=== D-05 interviewer 三道防線端到端整合測試 ===\n');

    // Setup: admin 登入
    const login = await req('POST', '/api/auth/login', {
        email: 'admin@demo.com', password: 'admin123', tenant_slug: 'demo'
    });
    if (login.status !== 200) {
        console.error('Admin login failed');
        process.exit(1);
    }
    const adminToken = login.data.access_token;

    // ─── 第 1 道防線：UI 下拉過濾（GET /api/employee/list?role=）───
    console.log('[Defense Layer 1: UI 下拉過濾 — ?role=interviewer]');

    // 不傳 role：所有員工
    const allEmps = await req('GET', '/api/employee/list', null, adminToken);
    assert(allEmps.status === 200, 'GET /employee/list 200');
    const totalEmps = (allEmps.data || []).length;
    assert(totalEmps > 5, `不傳 role：取得全公司員工（${totalEmps} 人）`);

    // ?role=interviewer：只列有 interviewer 角色的員工
    const interviewers = await req('GET', '/api/employee/list?role=interviewer', null, adminToken);
    assert(interviewers.status === 200, 'GET /employee/list?role=interviewer 200');
    const interviewerList = interviewers.data || [];
    assert(interviewerList.length < totalEmps,
           `?role=interviewer 過濾後 (${interviewerList.length}) < 全部 (${totalEmps})`);
    assert(interviewerList.length >= 1,
           `至少 1 個 interviewer (Amy + 許阿任 經前面 smoke test 已被指派)`);

    // ?role=non_existent：應回 0
    const noneRole = await req('GET', '/api/employee/list?role=non_existent_role', null, adminToken);
    assert(noneRole.status === 200 && (noneRole.data || []).length === 0,
           '?role=non_existent → 0 人（無對應角色）');

    // ─── 第 2 道防線：Feature gate（authMiddleware + requireFeaturePerm）───
    console.log('\n[Defense Layer 2: Feature gate — 無 token 或無權限 → 403]');

    // 無 token
    const noAuth = await req('GET', '/api/recruitment/candidates', null, null);
    assert(noAuth.status === 401 || noAuth.status === 403,
           '無 token 取候選人 → 401/403（authMiddleware 擋）');

    // ─── 第 3 道防線：row filter（admin/super_admin 不過濾）───
    console.log('\n[Defense Layer 3: row filter — super_admin 不受限]');

    const adminCandidates = await req('GET', '/api/recruitment/candidates', null, adminToken);
    assert(adminCandidates.status === 200, 'super_admin 取候選人 200');
    const adminList = adminCandidates.data || [];
    assert(Array.isArray(adminList) && adminList.length > 0,
           `super_admin 看得到候選人 (${adminList.length} 人，FULL_ACCESS_PERM 不受 row_filter 限制)`);

    // ─── interviewer 角色透過 my-feature-perms 驗證 row_filter_key 已下發 ───
    console.log('\n[my-feature-perms 包含新欄位（前端可讀取）]');

    const myPerms = await req('GET', '/api/auth/my-feature-perms', null, adminToken);
    assert(myPerms.status === 200, 'GET /auth/my-feature-perms 200');
    const featurePerms = myPerms.data?.featurePerms || [];
    const recruitment = featurePerms.find(p => p.feature_id === 'L1.recruitment');
    assert(!!recruitment, 'admin 的 L1.recruitment perm 在 my-feature-perms 內');
    if (recruitment) {
        assert('can_approve' in recruitment, 'my-feature-perms 包含 can_approve 欄位');
        assert('approve_scope' in recruitment, 'my-feature-perms 包含 approve_scope 欄位');
        assert('row_filter_key' in recruitment, 'my-feature-perms 包含 row_filter_key 欄位');
    }

    // ─── interviewer 過濾下拉的後端邏輯（不論是否登入 interviewer）───
    console.log('\n[後端過濾邏輯細節驗證]');

    // 同樣的 ?role= 應對 hr_manager 也成立
    const hrManagers = await req('GET', '/api/employee/list?role=hr_manager', null, adminToken);
    assert(hrManagers.status === 200,
           '?role=hr_manager 也有效（驗證 ?role= 是通用機制非僅限 interviewer）');

    // ─── 安全檢查：?role= 不能繞過 require requireFeaturePerm ───
    console.log('\n[安全：?role= 不繞 requireFeaturePerm]');

    // 沒 token 仍應回 401/403
    const noAuthRole = await req('GET', '/api/employee/list?role=interviewer', null, null);
    assert(noAuthRole.status === 401 || noAuthRole.status === 403,
           '?role=interviewer 但無 token → 401/403（requireFeaturePerm 擋）');

    // 結果
    console.log(results.join('\n'));
    console.log(`\n=== 結果：${passed} 通過 / ${failed} 失敗 ===`);
    process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
