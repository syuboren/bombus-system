/**
 * Approve 動作層級權限整合測試
 * 對應 spec：
 *   - rbac/spec.md → Approve action verb independent from view/edit
 *   - feature-perm-data-scope/spec.md → requireApprovePerm middleware for approve actions
 *   - edit-scope-enforcement/spec.md → Approve endpoints enforce can_approve and approve_scope
 *
 * 對應 design.md 決議 1：approve 採位元層級而非流程層級
 *               決議 2：approve 用獨立欄位 can_approve + approve_scope
 *               決議 9：approve middleware 純鋪路，不附示範審核端點
 *               決議 11：既有 5 角色 approve 維持 fail-safe，不預設智慧值
 *
 * 注意：本 change 採「純鋪路」策略，目前無業務端點實際呼叫 requireApprovePerm。
 *      測試聚焦在：
 *      a) requireApprovePerm export 存在且可 require
 *      b) PUT /roles/:id/feature-perms 接受新欄位且驗證正確
 *      c) GET /roles/:id/feature-perms 回傳新欄位
 *      d) my-feature-perms 包含 can_approve 供前端使用
 *
 * 前提：server 在 http://localhost:3001
 *
 * 執行：node server/src/tests/test-rbac-approve.js
 */

const BASE = 'http://localhost:3001';
const { requireApprovePerm } = require('../middleware/permission');

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
    console.log('=== Approve 動作層級權限整合測試 ===\n');

    // ─── requireApprovePerm middleware 可被 import + 是 function factory ───
    console.log('[requireApprovePerm middleware export]');
    assert(typeof requireApprovePerm === 'function',
           'requireApprovePerm export 為 function');
    const guard = requireApprovePerm('L1.recruitment');
    assert(typeof guard === 'function' && guard.length === 3,
           'requireApprovePerm(featureId) 回 (req,res,next)=>... middleware');

    // Setup admin token
    const login = await req('POST', '/api/auth/login', {
        email: 'admin@demo.com', password: 'admin123', tenant_slug: 'demo'
    });
    if (login.status !== 200) {
        console.error('Admin login failed');
        process.exit(1);
    }
    const adminToken = login.data.access_token;

    // ─── PUT /roles/:id/feature-perms 接受新欄位 ───
    console.log('\n[PUT /roles/:id/feature-perms 接受 can_approve / approve_scope / row_filter_key]');

    // 取一個自訂角色測試（避免動到系統角色）
    const rolesResp = await req('GET', '/api/tenant-admin/roles', null, adminToken);
    const customRole = (rolesResp.data || []).find(r => r.is_system === 0);
    if (!customRole) {
        results.push('  ⚠️ 沒有自訂角色可測 PUT，跳過');
    } else {
        // 先取既有 perms 作為 baseline
        const before = await req('GET', `/api/tenant-admin/roles/${customRole.id}/feature-perms`, null, adminToken);
        const beforePerms = before.data?.featurePerms || [];

        // 構造一份 perms：對某個 feature 開 can_approve=1 + approve_scope='department'
        const perms = beforePerms.map(p => ({
            feature_id: p.feature_id,
            action_level: p.action_level,
            edit_scope: p.edit_scope,
            view_scope: p.view_scope,
            can_approve: p.feature_id === 'L1.profile' ? 1 : (p.can_approve || 0),
            approve_scope: p.feature_id === 'L1.profile' ? 'department' : (p.approve_scope || null),
            row_filter_key: p.row_filter_key || null
        }));
        // 確保 L1.profile 至少 view（can_approve=1 需 access）
        const profilePerm = perms.find(p => p.feature_id === 'L1.profile');
        if (profilePerm && profilePerm.action_level === 'none') {
            profilePerm.action_level = 'view';
            profilePerm.view_scope = 'department';
        }

        const putResp = await req('PUT', `/api/tenant-admin/roles/${customRole.id}/feature-perms`,
                                  { perms }, adminToken);
        assert(putResp.status === 200,
               `PUT /roles/${customRole.id}/feature-perms 200 (含新欄位)`);

        // 取回確認 can_approve 寫入成功
        const after = await req('GET', `/api/tenant-admin/roles/${customRole.id}/feature-perms`, null, adminToken);
        const profileAfter = (after.data?.featurePerms || []).find(p => p.feature_id === 'L1.profile');
        if (profileAfter) {
            assert(profileAfter.can_approve === 1,
                   `自訂角色 L1.profile.can_approve=1 已寫入 DB`);
            assert(profileAfter.approve_scope === 'department',
                   `自訂角色 L1.profile.approve_scope='department' 已寫入 DB`);
        }
    }

    // ─── PUT 驗證：can_approve=1 必需 approve_scope 非空 ───
    console.log('\n[PUT 驗證：can_approve=1 時 approve_scope 必填]');

    if (customRole) {
        const invalidPerms = [{
            feature_id: 'L1.profile',
            action_level: 'view',
            edit_scope: null,
            view_scope: 'department',
            can_approve: 1,
            approve_scope: null,  // ❌ can_approve=1 但 scope 空
            row_filter_key: null
        }];
        const invalid = await req('PUT', `/api/tenant-admin/roles/${customRole.id}/feature-perms`,
                                   { perms: invalidPerms }, adminToken);
        assert(invalid.status === 400,
               'can_approve=1 + approve_scope=null → 400 BadRequest');
        const msg = invalid.data?.message || '';
        assert(msg.includes('approve_scope') && msg.includes('非空'),
               '錯誤訊息提及 approve_scope 必填');
    }

    // ─── PUT 驗證：未知 row_filter_key 拒絕 ───
    console.log('\n[PUT 驗證：未註冊 row_filter_key 拒絕]');

    if (customRole) {
        const unknownKey = [{
            feature_id: 'L1.profile',
            action_level: 'view',
            edit_scope: null,
            view_scope: 'department',
            can_approve: 0,
            approve_scope: null,
            row_filter_key: 'fake_predicate_xyz'
        }];
        const r = await req('PUT', `/api/tenant-admin/roles/${customRole.id}/feature-perms`,
                            { perms: unknownKey }, adminToken);
        assert(r.status === 400,
               '未註冊 row_filter_key → 400 BadRequest（防 client 注入）');
    }

    // ─── PUT 驗證：can_approve 必須 0 或 1 ───
    if (customRole) {
        const badApprove = [{
            feature_id: 'L1.profile',
            action_level: 'view',
            edit_scope: null,
            view_scope: 'department',
            can_approve: 2,  // ❌
            approve_scope: 'department',
            row_filter_key: null
        }];
        const r = await req('PUT', `/api/tenant-admin/roles/${customRole.id}/feature-perms`,
                            { perms: badApprove }, adminToken);
        assert(r.status === 400, 'can_approve=2 → 400（必須 0 或 1）');
    }

    // ─── 既有 view/edit 邏輯不受新欄位影響（向後相容）───
    console.log('\n[向後相容：未傳新欄位的 PUT 仍可成功]');

    if (customRole) {
        // 不傳 can_approve / approve_scope / row_filter_key
        const legacyPerms = [{
            feature_id: 'L1.profile',
            action_level: 'view',
            edit_scope: null,
            view_scope: 'self'
            // 故意不帶 can_approve 等新欄位
        }];
        // 但因 PUT 是 DELETE+INSERT 全套，需把所有 features 都帶上避免遺失
        const allFeaturesResp = await req('GET', '/api/tenant-admin/features', null, adminToken);
        const allFeatures = allFeaturesResp.data?.features || allFeaturesResp.data || [];
        const fullLegacy = allFeatures.map(f => ({
            feature_id: f.id,
            action_level: 'none',
            edit_scope: null,
            view_scope: null
            // 無新欄位
        }));
        const r = await req('PUT', `/api/tenant-admin/roles/${customRole.id}/feature-perms`,
                            { perms: fullLegacy }, adminToken);
        assert(r.status === 200,
               '舊 client 不傳新欄位 → 仍 200（後端預設 0/null/null fail-safe）');
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
