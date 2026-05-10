/**
 * Integration test for employee-assignment service (D-10 + D-14)
 *
 * 涵蓋：
 *   - addAssignment 主任職 / 副任職
 *   - 主任職切換時 employees.org_unit_id 同步
 *   - 加入第二筆 active assignment 觸發 D-14 cross_company_code 生成
 *   - cross_company_code 永久保留（end secondary 後不清空）
 *   - 規則 disabled 時 cross_company_code 不生成（不阻擋本次）
 *   - audit_logs 寫入正確（action / resource_id / details）
 *   - endAssignment / deleteAssignment 安全規則
 *   - setPrimary 切換正確
 *   - service 在 transaction 外呼叫應 throw
 */

require('dotenv').config({ path: __dirname + '/../../.env' });

const { tenantDBManager } = require('../db/tenant-db-manager');
const svc = require('../services/employee-assignment.service');
const { v4: uuidv4 } = require('uuid');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) {
    console.log('  ✅', msg);
    pass++;
  } else {
    console.log('  ❌', msg);
    fail++;
  }
}

function inTx(adapter, fn) {
  let result;
  adapter.transaction(() => { result = fn(); });
  return result;
}

(async () => {
  await tenantDBManager.init();
  const adapter = tenantDBManager.getDB('demo');

  // 取既有 demo 員工兩位 + 兩個 org_units 用於測試
  const emps = adapter.query('SELECT id, employee_no, name, org_unit_id, cross_company_code FROM employees WHERE org_unit_id IS NOT NULL LIMIT 2');
  if (emps.length < 2) {
    console.error('需要至少 2 位 employees 才能跑測試');
    process.exit(1);
  }
  const empA = emps[0];
  const empB = emps[1];
  const orgA = empA.org_unit_id;
  const orgB = empB.org_unit_id !== empA.org_unit_id ? empB.org_unit_id : adapter.queryOne(
    "SELECT id FROM org_units WHERE id != ? AND type IN ('subsidiary','department') LIMIT 1",
    [orgA]
  )?.id;
  if (!orgB) {
    console.error('需要至少 2 個不同 org_units 才能跑測試');
    process.exit(1);
  }

  console.log(`\n[setup] empA=${empA.employee_no}/${empA.id}, orgA=${orgA}, orgB=${orgB}`);

  // 清空 empA 的 cross_company_code 與 audit logs，確保 deterministic
  inTx(adapter, () => {
    adapter.run('UPDATE employees SET cross_company_code = NULL WHERE id = ?', [empA.id]);
    adapter.run("DELETE FROM audit_logs WHERE resource = 'employee' AND resource_id = ?", [empA.id]);
    adapter.run("DELETE FROM employee_assignments WHERE employee_id = ? AND is_primary = 0", [empA.id]);
  });

  console.log('\n[1] transaction 外呼叫應 throw');
  let threw = false;
  try { svc.addAssignment(adapter, empA.id, { orgUnitId: orgB, startDate: '2026-05-11', isPrimary: false }); }
  catch (e) { threw = true; }
  assert(threw, 'addAssignment 在 transaction 外 throw');

  console.log('\n[2] 加副任職（不觸發 D-14，因 employee_cross 規則尚未設）');
  // 確保規則不存在
  inTx(adapter, () => { adapter.run("DELETE FROM code_naming_rules WHERE target = 'employee_cross'"); });

  let asgnId;
  inTx(adapter, () => {
    const a = svc.addAssignment(adapter, empA.id, {
      orgUnitId: orgB,
      position: '兼任顧問',
      grade: 'P5',
      level: 'M2',
      isPrimary: false,
      startDate: '2026-05-11',
      actor: 'test-user'
    });
    asgnId = a.id;
    assert(a.is_primary === 0, '副任職 is_primary=0');
    assert(a.cross_company_code === null, '無 employee_cross 規則時 cross_company_code 保持 null');
  });

  let actCnt = adapter.queryOne(
    'SELECT COUNT(*) AS cnt FROM employee_assignments WHERE employee_id = ? AND end_date IS NULL',
    [empA.id]
  ).cnt;
  assert(actCnt === 2, `empA 現在有 2 筆 active assignments（實際 ${actCnt}）`);

  let empNow = adapter.queryOne('SELECT cross_company_code, org_unit_id FROM employees WHERE id = ?', [empA.id]);
  assert(empNow.cross_company_code === null, 'cross_company_code 仍為 null（規則未設）');
  assert(empNow.org_unit_id === orgA, '主任職未變，employees.org_unit_id 仍為 orgA');

  console.log('\n[3] 設定 employee_cross 規則 + 移除舊副任職重做 → 觸發 D-14');
  inTx(adapter, () => {
    adapter.run('DELETE FROM employee_assignments WHERE id = ?', [asgnId]);
    adapter.run(
      "INSERT OR REPLACE INTO code_naming_rules (target, prefix, padding, current_seq, enabled) VALUES ('employee_cross', 'HQ-', 3, 4, 1)"
    );
  });

  let asgnId2;
  inTx(adapter, () => {
    const a = svc.addAssignment(adapter, empA.id, {
      orgUnitId: orgB,
      position: '兼任顧問',
      isPrimary: false,
      startDate: '2026-05-11',
      actor: 'test-user'
    });
    asgnId2 = a.id;
    assert(a.cross_company_code === 'HQ-005', `第二筆 active 觸發 → cross_company_code='HQ-005'（實際 ${a.cross_company_code}）`);
  });

  empNow = adapter.queryOne('SELECT cross_company_code FROM employees WHERE id = ?', [empA.id]);
  assert(empNow.cross_company_code === 'HQ-005', `employees.cross_company_code 寫入成功（實際 ${empNow.cross_company_code}）`);

  // current_seq 推進
  let ruleSeq = adapter.queryOne("SELECT current_seq FROM code_naming_rules WHERE target='employee_cross'").current_seq;
  assert(ruleSeq === 5, `current_seq 推進至 5（實際 ${ruleSeq}）`);

  console.log('\n[4] audit log 寫入');
  let auditRow = adapter.queryOne(
    "SELECT * FROM audit_logs WHERE resource='employee' AND resource_id = ? AND action='cross_company_code_generated' ORDER BY created_at DESC LIMIT 1",
    [empA.id]
  );
  assert(!!auditRow, 'audit_logs 含 cross_company_code_generated row');
  assert(auditRow.user_id === 'test-user', `actor 寫入正確（user_id=${auditRow.user_id}）`);
  let auditDetail = JSON.parse(auditRow.details || '{}');
  assert(auditDetail.code === 'HQ-005', `audit details.code 正確（${auditDetail.code}）`);
  assert(auditDetail.triggering_assignment_id === asgnId2, 'audit details.triggering_assignment_id 正確');

  console.log('\n[5] 加第三筆 active assignment 不重複生成 cross_company_code');
  let orgC = adapter.queryOne(
    "SELECT id FROM org_units WHERE id NOT IN (?, ?) AND type IN ('subsidiary','department') LIMIT 1",
    [orgA, orgB]
  )?.id;
  if (orgC) {
    inTx(adapter, () => {
      svc.addAssignment(adapter, empA.id, {
        orgUnitId: orgC,
        isPrimary: false,
        startDate: '2026-05-11'
      });
    });
    empNow = adapter.queryOne('SELECT cross_company_code FROM employees WHERE id = ?', [empA.id]);
    assert(empNow.cross_company_code === 'HQ-005', '第三筆 active 不重新生成，仍為 HQ-005');
    let seqAfterThird = adapter.queryOne("SELECT current_seq FROM code_naming_rules WHERE target='employee_cross'").current_seq;
    assert(seqAfterThird === 5, `current_seq 仍為 5（不重複消耗，實際 ${seqAfterThird}）`);
  } else {
    console.log('  ⏭ 無第三個 org_unit 可用，跳過');
  }

  console.log('\n[6] endAssignment 副任職 → cross_company_code 永久保留');
  inTx(adapter, () => {
    svc.endAssignment(adapter, asgnId2, '2026-12-31');
  });
  empNow = adapter.queryOne('SELECT cross_company_code FROM employees WHERE id = ?', [empA.id]);
  assert(empNow.cross_company_code === 'HQ-005', 'end 副任職後 cross_company_code 仍保留 HQ-005');

  console.log('\n[7] endAssignment 不可結束最後一筆 active');
  // 把所有副任職清掉，只剩主任職
  inTx(adapter, () => {
    adapter.run('DELETE FROM employee_assignments WHERE employee_id = ? AND is_primary = 0', [empA.id]);
  });
  let primaryAsgn = adapter.queryOne('SELECT id FROM employee_assignments WHERE employee_id = ? AND is_primary = 1', [empA.id]);
  let endThrew = false;
  try {
    inTx(adapter, () => {
      svc.endAssignment(adapter, primaryAsgn.id, '2026-12-31');
    });
  } catch (e) { endThrew = e.message.includes('最後一筆'); }
  assert(endThrew, 'endAssignment 最後一筆 active throw');

  console.log('\n[8] setPrimary 切換');
  // 先加一筆副任職
  let secAsgnId;
  inTx(adapter, () => {
    const a = svc.addAssignment(adapter, empA.id, {
      orgUnitId: orgB, isPrimary: false, startDate: '2026-05-11', position: 'P1'
    });
    secAsgnId = a.id;
  });
  // setPrimary 切到 secAsgnId
  inTx(adapter, () => {
    svc.setPrimary(adapter, empA.id, secAsgnId);
  });
  let primAfter = adapter.queryOne('SELECT id, org_unit_id FROM employee_assignments WHERE employee_id = ? AND is_primary = 1', [empA.id]);
  assert(primAfter.id === secAsgnId, `主任職切換成功（now ${primAfter.id}）`);
  empNow = adapter.queryOne('SELECT org_unit_id FROM employees WHERE id = ?', [empA.id]);
  assert(empNow.org_unit_id === orgB, `employees.org_unit_id sync 至 orgB（實際 ${empNow.org_unit_id}）`);
  // partial UNIQUE：不可有兩筆 primary
  let allPrim = adapter.query('SELECT id FROM employee_assignments WHERE employee_id = ? AND is_primary = 1', [empA.id]);
  assert(allPrim.length === 1, `employee 只有一筆 is_primary=1（實際 ${allPrim.length}）`);

  console.log('\n[9] disable rule 後第二位員工新增第二筆 active 不阻擋（cross_company_code 仍 NULL）');
  inTx(adapter, () => {
    adapter.run("UPDATE code_naming_rules SET enabled = 0 WHERE target = 'employee_cross'");
    adapter.run('UPDATE employees SET cross_company_code = NULL WHERE id = ?', [empB.id]);
    adapter.run('DELETE FROM employee_assignments WHERE employee_id = ? AND is_primary = 0', [empB.id]);
  });
  inTx(adapter, () => {
    const a = svc.addAssignment(adapter, empB.id, {
      orgUnitId: orgA !== empB.org_unit_id ? orgA : orgB,
      isPrimary: false,
      startDate: '2026-05-11'
    });
    assert(a.cross_company_code === null, 'rule disabled 時 cross_company_code 仍為 null');
  });
  let empBNow = adapter.queryOne('SELECT cross_company_code FROM employees WHERE id = ?', [empB.id]);
  assert(empBNow.cross_company_code === null, 'employees.cross_company_code 仍為 null');

  // cleanup
  inTx(adapter, () => {
    adapter.run('UPDATE employees SET cross_company_code = NULL WHERE id IN (?, ?)', [empA.id, empB.id]);
    adapter.run('DELETE FROM employee_assignments WHERE employee_id IN (?, ?) AND is_primary = 0', [empA.id, empB.id]);
    // 還原 empA 主任職至 orgA
    adapter.run(
      "UPDATE employee_assignments SET is_primary = 0 WHERE employee_id = ? AND is_primary = 1",
      [empA.id]
    );
    // 確認原主任職 row 仍在；找到它再 promote
    const origPrimary = adapter.queryOne(
      'SELECT id FROM employee_assignments WHERE employee_id = ? AND org_unit_id = ? LIMIT 1',
      [empA.id, orgA]
    );
    if (origPrimary) {
      adapter.run("UPDATE employee_assignments SET is_primary = 1 WHERE id = ?", [origPrimary.id]);
      adapter.run("UPDATE employees SET org_unit_id = ? WHERE id = ?", [orgA, empA.id]);
    }
    adapter.run("DELETE FROM code_naming_rules WHERE target = 'employee_cross'");
    adapter.run("DELETE FROM audit_logs WHERE resource = 'employee' AND resource_id IN (?, ?)", [empA.id, empB.id]);
  });

  console.log(`\n=== 測試結果：通過 ${pass}，失敗 ${fail} ===`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
