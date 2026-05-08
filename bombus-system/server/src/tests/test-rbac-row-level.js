/**
 * ROW_FILTERS registry + buildScopeFilter 整合測試
 * 對應 spec：feature-perm-data-scope/spec.md
 *   - Named predicate registry for row-level filtering
 *   - Shared scope filter utility for backend routes (MODIFIED — 含 row_filter 整合)
 *
 * 大部分測試純函式（applyRowFilter / ROW_FILTERS predicates 不需 server）。
 * 少數需 mock req（含 user / tenantDB）。
 *
 * 執行：node server/src/tests/test-rbac-row-level.js
 */

const { ROW_FILTERS, applyRowFilter, buildScopeFilter } = require('../middleware/permission');

let passed = 0, failed = 0;
const results = [];

function assert(cond, desc) {
    if (cond) { passed++; results.push(`  ✅ ${desc}`); }
    else { failed++; results.push(`  ❌ ${desc}`); }
}

console.log('=== ROW_FILTERS registry + buildScopeFilter 整合測試 ===\n');

// ─── ROW_FILTERS registry 註冊驗證 ───
console.log('[註冊驗證]');
{
    assert(typeof ROW_FILTERS === 'object', 'ROW_FILTERS exports as object');
    assert(typeof ROW_FILTERS['interview_assigned'] === 'function', 'registry has interview_assigned');
    assert(typeof ROW_FILTERS['subordinate_only'] === 'function', 'registry has subordinate_only');
    assert(typeof ROW_FILTERS['self_only'] === 'function', 'registry has self_only');
    assert(typeof ROW_FILTERS['org_unit_scope'] === 'function', 'registry has org_unit_scope');
    assert(Object.keys(ROW_FILTERS).length === 4, '4 個首發 predicate（不能多也不能少）');
}

// ─── interview_assigned predicate 行為 ───
console.log('\n[interview_assigned predicate]');
{
    const req = { user: { userId: 'user-A', employeeId: 'emp-A' } };
    const result = ROW_FILTERS['interview_assigned'](req, {});
    assert(result.clause.includes('EXISTS'), '回傳 EXISTS 子查詢');
    assert(result.clause.includes('interview_invitations'), '反查 interview_invitations');
    assert(result.clause.includes('interviews'), '反查 interviews');
    assert(result.clause.includes('UNION'), 'UNION 兩張表');
    assert(result.clause.includes("status NOT IN ('Cancelled')"), '排除 Cancelled invitation');
    assert(result.clause.includes('c.id'), '預設 candidateTableAlias=c, candidateIdColumn=id');
    assert(result.params.length === 2, 'params 長度 = 2（兩個 ? for interviewer_id）');
    assert(result.params[0] === 'emp-A' && result.params[1] === 'emp-A',
           '✨ 用 employeeId（而非 userId）— interview_invitations.interviewer_id REFERENCES employees(id)');

    // 自訂 candidateTableAlias / candidateIdColumn（用於 interview_evaluations）
    const result2 = ROW_FILTERS['interview_assigned'](req, {
        candidateTableAlias: 'ie', candidateIdColumn: 'candidate_id'
    });
    assert(result2.clause.includes('ie.candidate_id'),
           '自訂 alias/column → 產生 ie.candidate_id（適用 interview_evaluations 表）');

    // 沒 employeeId → deny
    const denyResult = ROW_FILTERS['interview_assigned'](
        { user: { userId: 'u', employeeId: null } }, {}
    );
    assert(denyResult.clause === '1=0', '✨ 沒 employeeId 的 user → 1=0 deny');
}

// ─── subordinate_only / self_only predicate ───
console.log('\n[subordinate_only / self_only predicate]');
{
    const req = { user: { userId: 'u', employeeId: 'emp-A' } };
    const sub = ROW_FILTERS['subordinate_only'](req, {});
    assert(sub.clause.includes('manager_id'), 'subordinate_only 用 manager_id 欄位');
    assert(sub.params[0] === 'emp-A', '✨ subordinate_only 用 employeeId（manager_id REFERENCES employees(id)）');

    const self = ROW_FILTERS['self_only'](req, {});
    assert(self.clause.includes('id = ?'), 'self_only 用 id 比對');
    assert(self.params[0] === 'emp-A', '✨ self_only 用 employeeId');

    // 沒 employeeId → deny
    const denyReq = { user: { userId: 'u', employeeId: null } };
    assert(ROW_FILTERS['subordinate_only'](denyReq, {}).clause === '1=0',
           '沒 employeeId → subordinate_only deny');
    assert(ROW_FILTERS['self_only'](denyReq, {}).clause === '1=0',
           '沒 employeeId → self_only deny');
}

// ─── applyRowFilter 安全 fallback ───
console.log('\n[applyRowFilter 安全 fallback]');
{
    // unknown key → deny
    const unknown = applyRowFilter('not_a_real_key', { user: { userId: 'u' } }, {});
    assert(unknown.clause === '1=0', '未知 row_filter_key → 1=0 deny by default');
    assert(unknown.params.length === 0, '未知 key 不帶 params');

    // null/undefined key → 不過濾
    const nullKey = applyRowFilter(null, { user: { userId: 'u' } }, {});
    assert(nullKey.clause === null, 'null key → 不過濾（clause=null）');
}

// ─── buildScopeFilter row_filter 整合（需 mock req）───
console.log('\n[buildScopeFilter row_filter 整合]');

// 簡化的 mock tenantDB（只支援 queryOne 的兩種情境）
function mockTenantDB(opts = {}) {
    return {
        queryOne: (sql, params) => {
            if (sql.includes('FROM org_units WHERE id = ?')) {
                if (params[0] === 'org-group-1') return { type: 'group', id: 'org-group-1' };
                if (params[0] === 'org-sub-1') return { type: 'subsidiary', id: 'org-sub-1' };
                if (params[0] === 'org-dept-1') return { type: 'department', id: 'org-dept-1' };
                return null;
            }
            return null;
        },
        query: (sql, params) => {
            if (sql.includes('WITH RECURSIVE dept_tree')) {
                if (params[0] === 'org-dept-1') return [{ id: 'org-dept-1' }];
                if (params[0] === 'org-sub-1') return [{ id: 'org-sub-1' }, { id: 'org-dept-1' }];
                return [];
            }
            return [];
        }
    };
}

// company scope + row_filter='interview_assigned'：應 AND 串接
{
    const req = {
        user: { userId: 'u', employeeId: 'emp-A', subsidiaryId: 'org-group-1', roles: [] },
        tenantDB: mockTenantDB(),
        featurePerm: {
            action_level: 'edit', view_scope: 'company', edit_scope: 'company',
            can_approve: 0, approve_scope: null, row_filter_key: 'interview_assigned'
        }
    };
    const r = buildScopeFilter(req, { tableAlias: 'j', orgUnitColumn: 'org_unit_id' });
    assert(r.clause.includes('EXISTS'),
           'company + row_filter → row_filter 生效（含 EXISTS）');
}

// scope=1=0 short-circuit：row_filter 不執行
{
    const req = {
        user: { userId: 'u', employeeId: 'emp-A', subsidiaryId: null, roles: [] },
        tenantDB: mockTenantDB(),
        featurePerm: {
            action_level: 'view', view_scope: 'company', edit_scope: null,
            can_approve: 0, approve_scope: null, row_filter_key: 'interview_assigned'
        }
    };
    const r = buildScopeFilter(req, { tableAlias: 'j', orgUnitColumn: 'org_unit_id' });
    assert(r.clause === '1=0',
           'scope=1=0 (no_subsidiary_link) → 整體 1=0，row_filter 短路不執行');
}

// 無權限（action_level=none）→ 1=0，不論 row_filter
{
    const req = {
        user: { userId: 'u', roles: [] },
        tenantDB: mockTenantDB(),
        featurePerm: {
            action_level: 'none', view_scope: null, edit_scope: null,
            can_approve: 0, approve_scope: null, row_filter_key: 'interview_assigned'
        }
    };
    const r = buildScopeFilter(req, {});
    assert(r.clause === '1=0', 'action_level=none → 1=0 (不論 row_filter)');
}

// row_filter=NULL → 等於既有 buildScopeFilter 行為（向後相容）
{
    const req = {
        user: { userId: 'u', roles: ['super_admin'] },
        tenantDB: mockTenantDB(),
        featurePerm: {
            action_level: 'edit', view_scope: 'company', edit_scope: 'company',
            can_approve: 0, approve_scope: null, row_filter_key: null
        }
    };
    const r = buildScopeFilter(req, {});
    assert(r.clause === '1=1', 'super_admin + row_filter=NULL → 1=1（向後相容，無 row 限制）');
}

// 結果
console.log(results.join('\n'));
console.log(`\n=== 結果：${passed} 通過 / ${failed} 失敗 ===`);
process.exit(failed === 0 ? 0 : 1);
