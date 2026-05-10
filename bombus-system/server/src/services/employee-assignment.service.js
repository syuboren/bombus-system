/**
 * Employee Assignment Service (D-10 + D-14)
 *
 * 集中所有對 `employee_assignments` 表的寫入，並維持 `employees.org_unit_id` 與
 * 「該員工 is_primary=1 任職」一致。
 *
 * 設計決策（見 design.md）：
 *   - 路徑 A：employees.org_unit_id 保留為主任職代理鍵，避免動 D-13 列表 / D-02 row scope / 5 個 caller
 *   - DB 層 partial UNIQUE INDEX uq_assignments_primary 保證每員工最多一筆 is_primary=1
 *   - service 層 setPrimary 走 transaction：demote 舊 primary → promote 目標 → sync employees.org_unit_id
 *   - addAssignment 結尾整合 D-14 trigger：active assignments ≥ 2 且 cross_company_code IS NULL
 *     呼叫 codeGenerator.tryNext('employee_cross', ctx) 寫入 employees + 寫 audit_logs
 *
 * 所有寫入操作必須在呼叫端 transaction 內執行（service 不自行 BEGIN/COMMIT）。
 */

const { v4: uuidv4 } = require('uuid');
const codeGenerator = require('./code-generator');

/**
 * 列出員工所有任職紀錄（含 active + 結束）依 is_primary DESC, start_date ASC 排序
 * @param {*} tenantDB
 * @param {string} employeeId
 * @returns {Array}
 */
function listAssignments(tenantDB, employeeId) {
  return tenantDB.query(
    `SELECT id, employee_id, org_unit_id, position, grade, level, is_primary, start_date, end_date, created_at, updated_at
     FROM employee_assignments
     WHERE employee_id = ?
     ORDER BY is_primary DESC, start_date ASC`,
    [employeeId]
  );
}

function _countActive(tenantDB, employeeId) {
  const r = tenantDB.queryOne(
    'SELECT COUNT(*) AS cnt FROM employee_assignments WHERE employee_id = ? AND end_date IS NULL',
    [employeeId]
  );
  return r ? r.cnt : 0;
}

/**
 * 新增任職（必須在 transaction 內呼叫）
 *
 * 行為：
 *   - 若 isPrimary=true，會自動把該員工既有的主任職降為 is_primary=0，再把新筆設為 1
 *     並 sync employees.org_unit_id → 新筆 org_unit_id
 *   - 若 isPrimary=false，新增一筆副任職，主任職保持原狀
 *   - 結尾觸發 D-14：若加入後 active assignments >= 2 且 employees.cross_company_code IS NULL
 *     呼叫 codeGenerator.tryNext('employee_cross', ctx) 寫入 cross_company_code
 *     若 codeGen 回 null（規則不存在 / disabled），cross_company_code 保持 NULL（不阻擋本次）
 *
 * @param {*} tenantDB
 * @param {string} employeeId
 * @param {object} data - { orgUnitId, position?, grade?, level?, isPrimary, startDate, actor? }
 * @returns {object} 新建的 assignment row（含 id 與生成的 crossCompanyCode 若有）
 */
function addAssignment(tenantDB, employeeId, data) {
  if (!tenantDB || tenantDB._inTransaction !== true) {
    throw new Error('addAssignment 必須在 tenantDB.transaction() 內呼叫');
  }
  if (!data || !data.orgUnitId || !data.startDate) {
    throw new Error('addAssignment 必填欄位：orgUnitId, startDate');
  }

  const emp = tenantDB.queryOne('SELECT id, cross_company_code FROM employees WHERE id = ?', [employeeId]);
  if (!emp) throw new Error(`員工不存在：${employeeId}`);

  const id = data.id || `asgn-${uuidv4()}`;
  const isPrimary = data.isPrimary === true ? 1 : 0;

  // 若指定為主任職，先 demote 既有主任職（partial UNIQUE 才不會撞）
  if (isPrimary === 1) {
    tenantDB.run(
      "UPDATE employee_assignments SET is_primary = 0, updated_at = datetime('now') WHERE employee_id = ? AND is_primary = 1",
      [employeeId]
    );
  }

  tenantDB.run(
    `INSERT INTO employee_assignments
      (id, employee_id, org_unit_id, position, grade, level, is_primary, start_date, end_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'))`,
    [id, employeeId, data.orgUnitId, data.position || null, data.grade || null, data.level || null, isPrimary, data.startDate]
  );

  // 同步 employees.org_unit_id 至新主任職
  if (isPrimary === 1) {
    tenantDB.run('UPDATE employees SET org_unit_id = ?, updated_at = datetime(\'now\') WHERE id = ?', [data.orgUnitId, employeeId]);
  }

  // D-14 trigger：active assignments >= 2 且 cross_company_code 仍 NULL → 嘗試生成
  let generatedCode = emp.cross_company_code || null;
  if (!emp.cross_company_code) {
    const activeCount = _countActive(tenantDB, employeeId);
    if (activeCount >= 2) {
      const code = codeGenerator.tryNext(tenantDB, 'employee_cross', { tenantId: data.tenantId, employeeId });
      if (code) {
        tenantDB.run(
          'UPDATE employees SET cross_company_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
          [code, employeeId]
        );
        generatedCode = code;
        // audit log
        tenantDB.run(
          `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, created_at)
           VALUES (?, ?, 'cross_company_code_generated', 'employee', ?, ?, datetime('now'))`,
          [
            uuidv4(),
            data.actor || null,
            employeeId,
            JSON.stringify({ code, triggering_assignment_id: id })
          ]
        );
      }
      // codeGen 回 null（規則不存在 / disabled）→ 不寫入 cross_company_code，亦不 audit；不阻擋 addAssignment
    }
  }

  return {
    id,
    employee_id: employeeId,
    org_unit_id: data.orgUnitId,
    position: data.position || null,
    grade: data.grade || null,
    level: data.level || null,
    is_primary: isPrimary,
    start_date: data.startDate,
    end_date: null,
    cross_company_code: generatedCode
  };
}

/**
 * 更新任職欄位（position / grade / level / start_date / end_date / is_primary）
 *
 * - 若 updates.isPrimary 為 true 且該筆原本不是 primary，會自動把現有 primary 降級
 *   並 sync employees.org_unit_id
 * - end_date 一旦設置（任職結束）不影響 cross_company_code（D-14 永久保留）
 *
 * @param {*} tenantDB
 * @param {string} assignmentId
 * @param {object} updates
 * @returns {object} 更新後的 row
 */
function updateAssignment(tenantDB, assignmentId, updates) {
  if (!tenantDB || tenantDB._inTransaction !== true) {
    throw new Error('updateAssignment 必須在 tenantDB.transaction() 內呼叫');
  }

  const existing = tenantDB.queryOne(
    'SELECT * FROM employee_assignments WHERE id = ?',
    [assignmentId]
  );
  if (!existing) throw new Error(`任職紀錄不存在：${assignmentId}`);

  const fields = [];
  const params = [];
  for (const col of ['position', 'grade', 'level', 'start_date', 'end_date', 'org_unit_id']) {
    const camelKey = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[camelKey] !== undefined) {
      fields.push(`${col} = ?`);
      params.push(updates[camelKey]);
    }
  }

  if (updates.isPrimary === true && existing.is_primary !== 1) {
    // 升級為主任職
    tenantDB.run(
      "UPDATE employee_assignments SET is_primary = 0, updated_at = datetime('now') WHERE employee_id = ? AND is_primary = 1",
      [existing.employee_id]
    );
    fields.push('is_primary = 1');
    // sync employees.org_unit_id 至這筆 assignment 的 org_unit_id（可能也被 updates.orgUnitId 改）
    const targetOrgUnitId = updates.orgUnitId || existing.org_unit_id;
    tenantDB.run(
      "UPDATE employees SET org_unit_id = ?, updated_at = datetime('now') WHERE id = ?",
      [targetOrgUnitId, existing.employee_id]
    );
  } else if (updates.isPrimary === false && existing.is_primary === 1) {
    // 不允許把目前唯一主任職直接 demote（會留下無主任職員工）
    throw new Error('不可直接降級主任職；請改用 setPrimary 指定另一筆為主任職');
  }

  if (fields.length === 0) return existing;

  fields.push("updated_at = datetime('now')");
  params.push(assignmentId);
  tenantDB.run(`UPDATE employee_assignments SET ${fields.join(', ')} WHERE id = ?`, params);

  return tenantDB.queryOne('SELECT * FROM employee_assignments WHERE id = ?', [assignmentId]);
}

/**
 * 結束任職（設 end_date）。不釋放 cross_company_code（D-14 永久保留）。
 * 若該筆是 primary 且員工還有其他 active assignment，必須先 setPrimary 切換；
 * 否則拋錯（避免無主任職）。
 */
function endAssignment(tenantDB, assignmentId, endDate) {
  if (!tenantDB || tenantDB._inTransaction !== true) {
    throw new Error('endAssignment 必須在 tenantDB.transaction() 內呼叫');
  }
  const a = tenantDB.queryOne('SELECT * FROM employee_assignments WHERE id = ?', [assignmentId]);
  if (!a) throw new Error(`任職紀錄不存在：${assignmentId}`);
  if (a.end_date) throw new Error('該任職已結束');

  if (a.is_primary === 1) {
    // 若還有其他 active 副任職，要求先 setPrimary 切換
    const otherActive = tenantDB.queryOne(
      'SELECT id FROM employee_assignments WHERE employee_id = ? AND id != ? AND end_date IS NULL LIMIT 1',
      [a.employee_id, assignmentId]
    );
    if (otherActive) {
      throw new Error('要結束主任職前，請先把另一筆指定為主任職');
    }
    // 否則這是員工最後一筆 active assignment：拒絕（保留至少一筆）
    throw new Error('不可結束員工的最後一筆有效任職紀錄');
  }

  tenantDB.run(
    "UPDATE employee_assignments SET end_date = ?, updated_at = datetime('now') WHERE id = ?",
    [endDate, assignmentId]
  );
  return tenantDB.queryOne('SELECT * FROM employee_assignments WHERE id = ?', [assignmentId]);
}

/**
 * 設定員工的主任職（指定一筆 active assignment 為 is_primary=1）
 * 同時 sync employees.org_unit_id
 */
function setPrimary(tenantDB, employeeId, assignmentId) {
  if (!tenantDB || tenantDB._inTransaction !== true) {
    throw new Error('setPrimary 必須在 tenantDB.transaction() 內呼叫');
  }
  const target = tenantDB.queryOne(
    'SELECT * FROM employee_assignments WHERE id = ? AND employee_id = ?',
    [assignmentId, employeeId]
  );
  if (!target) throw new Error(`任職紀錄不存在或不屬於該員工：${assignmentId}`);
  if (target.end_date) throw new Error('已結束的任職不可設為主任職');

  // demote 既有 primary
  tenantDB.run(
    "UPDATE employee_assignments SET is_primary = 0, updated_at = datetime('now') WHERE employee_id = ? AND is_primary = 1",
    [employeeId]
  );
  // promote 目標
  tenantDB.run(
    "UPDATE employee_assignments SET is_primary = 1, updated_at = datetime('now') WHERE id = ?",
    [assignmentId]
  );
  // sync employees.org_unit_id
  tenantDB.run(
    "UPDATE employees SET org_unit_id = ?, updated_at = datetime('now') WHERE id = ?",
    [target.org_unit_id, employeeId]
  );

  return tenantDB.queryOne('SELECT * FROM employee_assignments WHERE id = ?', [assignmentId]);
}

/**
 * 刪除任職紀錄（DB DELETE）。安全規則：
 *   - 不可刪除員工最後一筆 active assignment
 *   - 若是 primary 必須先 setPrimary 切換
 *   - cross_company_code 不清空（永久保留）
 */
function deleteAssignment(tenantDB, assignmentId) {
  if (!tenantDB || tenantDB._inTransaction !== true) {
    throw new Error('deleteAssignment 必須在 tenantDB.transaction() 內呼叫');
  }
  const a = tenantDB.queryOne('SELECT * FROM employee_assignments WHERE id = ?', [assignmentId]);
  if (!a) throw new Error(`任職紀錄不存在：${assignmentId}`);

  const activeCount = _countActive(tenantDB, a.employee_id);
  if (activeCount <= 1 && !a.end_date) {
    throw new Error('員工至少需保留一筆有效任職紀錄');
  }
  if (a.is_primary === 1 && !a.end_date) {
    throw new Error('要刪除主任職前，請先把另一筆指定為主任職');
  }

  tenantDB.run('DELETE FROM employee_assignments WHERE id = ?', [assignmentId]);
}

module.exports = {
  listAssignments,
  addAssignment,
  updateAssignment,
  endAssignment,
  setPrimary,
  deleteAssignment,
};
