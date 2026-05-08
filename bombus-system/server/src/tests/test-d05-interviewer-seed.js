/**
 * D-05 interviewer 系統角色 seed 驗證測試
 * 對應 spec：interviewer-role-scope/spec.md
 *   - Interviewer system role with locked semantics
 * 對應 modified spec：rbac/spec.md → 預設角色初始化（6 角色含 interviewer）
 *
 * 驗證：
 * - 既有 demo 租戶經 _runMigrations 後有 interviewer 角色（is_system=1）
 * - interviewer 對 L1.recruitment 有 row_filter_key='interview_assigned'
 * - 其他 features 為 'none'
 * - DELETE /api/tenant-admin/roles/:id 對 interviewer 回 400（系統角色不可刪）
 *
 * 前提：server 在 http://localhost:3001
 *
 * 執行：node server/src/tests/test-d05-interviewer-seed.js
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
    console.log('=== D-05 interviewer 系統角色 seed 驗證 ===\n');

    // Setup: 取 admin token
    const login = await req('POST', '/api/auth/login', {
        email: 'admin@demo.com', password: 'admin123', tenant_slug: 'demo'
    });
    if (login.status !== 200 || !login.data?.access_token) {
        console.error('Login failed, cannot run tests');
        process.exit(1);
    }
    const token = login.data.access_token;

    // ─── interviewer 角色存在 ───
    const rolesResp = await req('GET', '/api/tenant-admin/roles', null, token);
    assert(rolesResp.status === 200, 'GET /roles 200');
    const roles = rolesResp.data || [];
    const interviewer = roles.find(r => r.name === 'interviewer');
    assert(!!interviewer, 'demo 租戶有 interviewer 角色（透過 migration 補入既有租戶）');
    assert(interviewer && interviewer.is_system === 1, 'interviewer is_system=1（系統鎖死）');

    // 6 個系統角色都在
    const systemNames = roles.filter(r => r.is_system === 1).map(r => r.name).sort();
    const expectedSystem = ['dept_manager', 'employee', 'hr_manager', 'interviewer', 'subsidiary_admin', 'super_admin'];
    assert(JSON.stringify(systemNames) === JSON.stringify(expectedSystem),
           `6 個系統角色齊全：${expectedSystem.join(', ')}`);

    // ─── interviewer feature_perms 正確 seed ───
    if (interviewer) {
        const permsResp = await req('GET', `/api/tenant-admin/roles/${interviewer.id}/feature-perms`, null, token);
        assert(permsResp.status === 200, 'GET /roles/:id/feature-perms 200');
        const perms = permsResp.data?.featurePerms || [];

        const recruitment = perms.find(p => p.feature_id === 'L1.recruitment');
        assert(!!recruitment, 'interviewer 有 L1.recruitment perm');
        if (recruitment) {
            assert(recruitment.action_level === 'edit',
                   'interviewer.L1.recruitment.action_level=edit (含評分編輯權)');
            assert(recruitment.view_scope === 'company',
                   'interviewer.L1.recruitment.view_scope=company');
            assert(recruitment.edit_scope === 'company',
                   'interviewer.L1.recruitment.edit_scope=company');
            assert(recruitment.row_filter_key === 'interview_assigned',
                   '✨ interviewer.L1.recruitment.row_filter_key=interview_assigned (D-05 核心)');
            assert(recruitment.can_approve === 0,
                   'interviewer.L1.recruitment.can_approve=0 (fail-safe)');
        }

        // L1.decision 應為 none（interviewer 不參與決策）
        const decision = perms.find(p => p.feature_id === 'L1.decision');
        assert(decision && decision.action_level === 'none',
               'interviewer.L1.decision.action_level=none (不參與決策)');

        // L1.profile 等其他 features 應為 none
        const profile = perms.find(p => p.feature_id === 'L1.profile');
        assert(profile && profile.action_level === 'none',
               'interviewer.L1.profile.action_level=none (其他 feature 全 none)');

        // L2 / L3 抽樣（demo 租戶方案可能沒啟用 L6，conditional 檢查）
        const l2 = perms.find(p => p.feature_id === 'L2.framework');
        if (l2) {
            assert(l2.action_level === 'none', 'interviewer.L2.framework=none');
        }
        const l6 = perms.find(p => p.feature_id === 'L6.handbook');
        if (l6) {
            assert(l6.action_level === 'none', 'interviewer.L6.handbook=none');
        } else {
            // 若 plan filter 排除 L6，視為 expected（不影響 D-05 邏輯）
            assert(true, 'L6 不在 response 內（demo 方案未啟用 L6 — plan-based filter）');
        }
        // 確認所有非 L1.recruitment 的 feature 都是 none
        const grantingPerms = perms.filter(p => p.action_level !== 'none' && p.feature_id !== 'L1.recruitment');
        assert(grantingPerms.length === 0,
               `interviewer 僅 L1.recruitment 有權限，其他 ${perms.length - 1} feature 全 none`);
    }

    // ─── 系統角色不可刪 ───
    if (interviewer) {
        const delResp = await req('DELETE', `/api/tenant-admin/roles/${interviewer.id}`, null, token);
        assert(delResp.status === 400, 'DELETE interviewer → 400 (系統角色不可刪)');
        const msg = delResp.data?.message || '';
        assert(msg.includes('系統') || msg.includes('system'), '錯誤訊息提及系統角色');
    }

    // ─── 既有 5 角色的新欄位都是 fail-safe (0/null/null) ───
    const existingFiveRoles = ['super_admin', 'subsidiary_admin', 'hr_manager', 'dept_manager', 'employee'];
    for (const roleName of existingFiveRoles) {
        const r = roles.find(rr => rr.name === roleName);
        if (!r) continue;
        const permsResp = await req('GET', `/api/tenant-admin/roles/${r.id}/feature-perms`, null, token);
        const perms = permsResp.data?.featurePerms || [];
        // 抽樣檢查 1 個 feature
        const sample = perms.find(p => p.feature_id === 'L1.profile');
        if (sample) {
            assert(sample.can_approve === 0,
                   `${roleName}.L1.profile.can_approve=0 (fail-safe，HR 上線後自勾)`);
            assert(sample.row_filter_key === null,
                   `${roleName}.L1.profile.row_filter_key=null (fail-safe)`);
        }
    }

    // 結果
    console.log(results.join('\n'));
    console.log(`\n=== 結果：${passed} 通過 / ${failed} 失敗 ===`);
    process.exit(failed === 0 ? 0 : 1);
}

run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
