/**
 * mergeFeaturePerms 多角色合併邏輯整合測試
 * 對應 spec：rbac/spec.md 之 ADDED Requirements
 *   - Approve action verb independent from view/edit
 *   - Row-level filter key in role_feature_perms
 * 對應 design.md 風險 1：filterByScope short-circuit + 決議 11/12
 *
 * 不需 server 跑，純函式測試（mergeFeaturePerms is pure）
 *
 * 執行：node server/src/tests/test-rbac-merge-multi-role.js
 */

const { mergeFeaturePerms } = require('../middleware/permission');

let passed = 0, failed = 0;
const results = [];

function assert(cond, desc) {
    if (cond) { passed++; results.push(`  ✅ ${desc}`); }
    else { failed++; results.push(`  ❌ ${desc}`); }
}

function deepEq(actual, expected, desc) {
    const ok = JSON.stringify(actual) === JSON.stringify(expected);
    assert(ok, `${desc} → expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

console.log('=== mergeFeaturePerms 多角色合併邏輯測試 ===\n');

// Scenario 1: 空 rows → 全部預設
{
    const r = mergeFeaturePerms([]);
    deepEq(r, {
        action_level: 'none', edit_scope: null, view_scope: null,
        can_approve: 0, approve_scope: null, row_filter_key: null
    }, '空 rows 回 fail-safe 預設');
}

// Scenario 2: 單一角色 view + scope
{
    const r = mergeFeaturePerms([
        { action_level: 'view', edit_scope: null, view_scope: 'department',
          can_approve: 0, approve_scope: null, row_filter_key: null }
    ]);
    assert(r.action_level === 'view' && r.view_scope === 'department', '單一 view 角色');
}

// Scenario 3: action_level 取最高（none < view < edit）
{
    const r = mergeFeaturePerms([
        { action_level: 'view', edit_scope: null, view_scope: 'self',
          can_approve: 0, approve_scope: null, row_filter_key: null },
        { action_level: 'edit', edit_scope: 'department', view_scope: 'department',
          can_approve: 0, approve_scope: null, row_filter_key: null }
    ]);
    assert(r.action_level === 'edit', 'action_level 取最高 view+edit → edit');
    assert(r.edit_scope === 'department', 'edit_scope 取最高');
    assert(r.view_scope === 'department', 'view_scope 取最高');
}

// Scenario 4: scope 取最大 (self < department < company)
{
    const r = mergeFeaturePerms([
        { action_level: 'view', edit_scope: null, view_scope: 'self',
          can_approve: 0, approve_scope: null, row_filter_key: null },
        { action_level: 'view', edit_scope: null, view_scope: 'company',
          can_approve: 0, approve_scope: null, row_filter_key: null }
    ]);
    assert(r.view_scope === 'company', 'scope 取最大 self+company → company');
}

// Scenario 5: can_approve OR 合併
{
    const r = mergeFeaturePerms([
        { action_level: 'view', edit_scope: null, view_scope: 'department',
          can_approve: 0, approve_scope: null, row_filter_key: null },
        { action_level: 'view', edit_scope: null, view_scope: 'department',
          can_approve: 1, approve_scope: 'self', row_filter_key: null }
    ]);
    assert(r.can_approve === 1, 'can_approve OR：0+1 → 1');
    assert(r.approve_scope === 'self', 'approve_scope 取最大');
}

// Scenario 6: approve_scope 取最大
{
    const r = mergeFeaturePerms([
        { action_level: 'view', edit_scope: null, view_scope: 'department',
          can_approve: 1, approve_scope: 'department', row_filter_key: null },
        { action_level: 'view', edit_scope: null, view_scope: 'department',
          can_approve: 1, approve_scope: 'company', row_filter_key: null }
    ]);
    assert(r.approve_scope === 'company', 'approve_scope 取最大 department+company → company');
}

// Scenario 7: row_filter_key least-restrictive — 都有 access 且任一 NULL → NULL
{
    const r = mergeFeaturePerms([
        { action_level: 'edit', edit_scope: 'company', view_scope: 'company',
          can_approve: 0, approve_scope: null, row_filter_key: 'interview_assigned' },
        { action_level: 'edit', edit_scope: 'company', view_scope: 'company',
          can_approve: 0, approve_scope: null, row_filter_key: null }
    ]);
    assert(r.row_filter_key === null, 'row_filter least-restrictive：access-granting 角色都有，任一 NULL → NULL');
}

// Scenario 8 (CRITICAL BUGFIX): action_level='none' 角色不該解除 row_filter
// 對應 spec scenario "action_level='none' row does NOT lift row_filter_key restriction"
{
    const r = mergeFeaturePerms([
        // interviewer 角色：edit + row_filter='interview_assigned'
        { action_level: 'edit', edit_scope: 'company', view_scope: 'company',
          can_approve: 0, approve_scope: null, row_filter_key: 'interview_assigned' },
        // employee 角色：none + row_filter=NULL（不該影響 row_filter merge）
        { action_level: 'none', edit_scope: null, view_scope: null,
          can_approve: 0, approve_scope: null, row_filter_key: null }
    ]);
    assert(r.action_level === 'edit', '雙角色 action_level 取最高 (edit)');
    assert(r.row_filter_key === 'interview_assigned',
           '✨ BUGFIX: action_level=none 的角色不解除 row_filter（保留 interview_assigned）');
}

// Scenario 9 (BUGFIX): action_level='none' 角色不該貢獻 can_approve
{
    const r = mergeFeaturePerms([
        { action_level: 'edit', edit_scope: 'company', view_scope: 'company',
          can_approve: 0, approve_scope: null, row_filter_key: null },
        // 這筆 action='none' 但 can_approve=1（不該被計入）
        { action_level: 'none', edit_scope: null, view_scope: null,
          can_approve: 1, approve_scope: 'company', row_filter_key: null }
    ]);
    assert(r.can_approve === 0, '✨ BUGFIX: action_level=none 的角色不貢獻 can_approve');
    assert(r.approve_scope === null, '✨ BUGFIX: action_level=none 的角色不貢獻 approve_scope');
}

// Scenario 10: 三角色混合（真實場景：interviewer + dept_manager + employee）
{
    const r = mergeFeaturePerms([
        // interviewer：edit + interview_assigned
        { action_level: 'edit', edit_scope: 'company', view_scope: 'company',
          can_approve: 0, approve_scope: null, row_filter_key: 'interview_assigned' },
        // dept_manager：view + department + 無 row_filter（因為 access-granting → 解除 row_filter）
        { action_level: 'view', edit_scope: null, view_scope: 'department',
          can_approve: 0, approve_scope: null, row_filter_key: null },
        // employee：none（不該影響任何欄位）
        { action_level: 'none', edit_scope: null, view_scope: null,
          can_approve: 0, approve_scope: null, row_filter_key: null }
    ]);
    assert(r.action_level === 'edit', '三角色：action_level=edit (interviewer)');
    assert(r.view_scope === 'company', '三角色：view_scope=company');
    assert(r.row_filter_key === null,
           '三角色：dept_manager (access-granting + NULL row_filter) 正確解除 row_filter');
}

// 結果輸出
console.log(results.join('\n'));
console.log(`\n=== 結果：${passed} 通過 / ${failed} 失敗 ===`);
process.exit(failed === 0 ? 0 : 1);
