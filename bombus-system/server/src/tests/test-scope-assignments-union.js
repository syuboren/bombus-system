/**
 * Integration test for buildScopeFilter useAssignmentsUnion (D-10)
 *
 * 場景：建立跨公司員工 emp-X 同時任職 sub-A 與 sub-B；驗證
 *   - HR-A（scope=sub-A subtree）的查詢列表含 emp-X
 *   - HR-B（scope=sub-B subtree）的查詢列表也含 emp-X
 *   - 不啟用 useAssignmentsUnion 時 HR-B 看不到 emp-X（fallback 路徑）
 */

require('dotenv').config({ path: __dirname + '/../../.env' });

const { tenantDBManager } = require('../db/tenant-db-manager');
const svc = require('../services/employee-assignment.service');
const { buildScopeFilter } = require('../middleware/permission');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { console.log('  ✅', msg); pass++; }
  else { console.log('  ❌', msg); fail++; }
}

(async () => {
  await tenantDBManager.init();
  const adapter = tenantDBManager.getDB('demo');

  // 取兩個不同部門 + 一位員工（其主任職為 deptA）作為跨公司測試對象
  const deptA = adapter.queryOne("SELECT id FROM org_units WHERE id = 'org-dept-hr' LIMIT 1")?.id;
  const deptB = adapter.queryOne("SELECT id FROM org_units WHERE id = 'org-dept-fin' LIMIT 1")?.id;
  if (!deptA || !deptB) { console.error('test orgs missing'); process.exit(1); }

  const emp = adapter.queryOne(
    "SELECT id FROM employees WHERE org_unit_id = ? LIMIT 1",
    [deptA]
  );
  if (!emp) { console.error('no emp in deptA'); process.exit(1); }

  // 確保 emp 是跨公司：保留主任職在 deptA，新增副任職至 deptB
  adapter.transaction(() => {
    adapter.run(
      "DELETE FROM employee_assignments WHERE employee_id = ? AND org_unit_id = ? AND is_primary = 0",
      [emp.id, deptB]
    );
  });
  adapter.transaction(() => {
    svc.addAssignment(adapter, emp.id, {
      orgUnitId: deptB,
      isPrimary: false,
      startDate: '2026-05-11'
    });
  });

  console.log('\n[1] HR-A scope = deptA subtree');
  const reqA = {
    user: { roles: ['hr_manager'], departmentId: deptA, employeeId: 'fake-hr-a' },
    featurePerm: { action_level: 'view', view_scope: 'department', row_filter_key: null },
    tenantDB: adapter
  };
  const scopeA = buildScopeFilter(reqA, { employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id', useAssignmentsUnion: true });
  console.log('  clause:', scopeA.clause.substring(0, 80) + '...');
  const visibleA = adapter.prepare(`SELECT id FROM employees WHERE ${scopeA.clause}`).all(...scopeA.params);
  const hasA = visibleA.some(r => r.id === emp.id);
  assert(hasA, `HR-A 看見跨公司員工 emp.id=${emp.id}（主任職在 deptA）`);

  console.log('\n[2] HR-B scope = deptB subtree（union 啟用）');
  const reqB = {
    user: { roles: ['hr_manager'], departmentId: deptB, employeeId: 'fake-hr-b' },
    featurePerm: { action_level: 'view', view_scope: 'department', row_filter_key: null },
    tenantDB: adapter
  };
  const scopeB = buildScopeFilter(reqB, { employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id', useAssignmentsUnion: true });
  const visibleB = adapter.prepare(`SELECT id FROM employees WHERE ${scopeB.clause}`).all(...scopeB.params);
  const hasB = visibleB.some(r => r.id === emp.id);
  assert(hasB, `HR-B 經 union 看見跨公司員工 emp.id=${emp.id}（副任職在 deptB）`);

  console.log('\n[3] HR-B 不啟用 union → 看不到（既有行為）');
  const scopeB_noUnion = buildScopeFilter(reqB, { employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id' });
  const visibleB_noUnion = adapter.prepare(`SELECT id FROM employees WHERE ${scopeB_noUnion.clause}`).all(...scopeB_noUnion.params);
  const hasB_noUnion = visibleB_noUnion.some(r => r.id === emp.id);
  assert(!hasB_noUnion, `不啟用 union 時 HR-B 看不到 emp（驗證 fallback 路徑）`);

  console.log('\n[4] 非 employees 表 sanity（不應使用 union）');
  // 用 interview_invitations 表（org_unit_id 過濾）— useAssignmentsUnion 不應影響
  const interviewScopeA = buildScopeFilter(reqA, { tableAlias: 'i', orgUnitColumn: 'org_unit_id' });
  assert(!interviewScopeA.clause.includes('employee_assignments'), 'interview_invitations scope clause 不含 employee_assignments JOIN');

  // cleanup
  adapter.transaction(() => {
    adapter.run(
      "DELETE FROM employee_assignments WHERE employee_id = ? AND org_unit_id = ? AND is_primary = 0",
      [emp.id, deptB]
    );
    adapter.run('UPDATE employees SET cross_company_code = NULL WHERE id = ?', [emp.id]);
    adapter.run("DELETE FROM audit_logs WHERE resource = 'employee' AND resource_id = ?", [emp.id]);
  });

  console.log(`\n=== 測試結果：通過 ${pass}，失敗 ${fail} ===`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
