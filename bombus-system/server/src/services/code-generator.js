/**
 * Code Generator Service (D-15)
 *
 * 提供 tryNext / previewBatch 兩個 API，承接 D-15「代碼命名規則」需求：
 *   - 員工編號 / 部門編號 / 跨公司編號（HQ-xxx）
 *   - 規則由 super_admin 在 /settings/code-naming 設定
 *
 * 設計決策（見 design.md「D-15 引擎以單一 service 集中、target 為列舉」）：
 *   - target 為列舉，避免拼寫錯誤建立孤兒規則
 *   - tryNext 必須在呼叫端 transaction 內執行（透過 tenantDB._inTransaction 檢查），
 *     讓 ROLLBACK 自動還原 current_seq、避免兩個批次並發消耗時撞號
 *   - previewBatch 純查詢，validate 階段顯示「預計分配」用，不消耗 seq
 */

const SUPPORTED_TARGETS = new Set(['employee', 'department', 'employee_cross']);

/**
 * 取得規則 row（enabled = 1 才回；其他狀況回 null）
 * @param {*} tenantDB
 * @param {string} target
 * @returns {{ target: string, prefix: string, padding: number, current_seq: number, enabled: number } | null}
 */
function _getEnabledRule(tenantDB, target) {
  const rule = tenantDB.queryOne(
    'SELECT target, prefix, padding, current_seq, enabled FROM code_naming_rules WHERE target = ?',
    [target]
  );
  if (!rule || rule.enabled !== 1) return null;
  return rule;
}

/** 把整數依 padding 補零；超過位數時不截斷（HR-1000 仍允許） */
function _format(prefix, padding, seq) {
  const padded = String(seq).padStart(padding, '0');
  return prefix + padded;
}

/**
 * 取下一個編號並消耗 seq（必須在呼叫端 transaction 內呼叫）
 *
 * @param {*} tenantDB - 必須是 SqliteAdapter，且呼叫前已進入 transaction
 * @param {'employee'|'department'|'employee_cross'} target
 * @param {object} _ctx - reserved for future extension（tenantId / employeeId 等）
 * @returns {string|null} 下一個 code，或 null（target 不支援 / 規則不存在 / disabled）
 * @throws {Error} 若 tenantDB 不在 transaction 內
 */
function tryNext(tenantDB, target, _ctx = {}) {
  if (!SUPPORTED_TARGETS.has(target)) return null;

  // 強制要求 caller transaction：保證 SELECT-UPDATE 序列化、ROLLBACK 自動還原 current_seq
  if (!tenantDB || tenantDB._inTransaction !== true) {
    throw new Error(
      `code-generator.tryNext('${target}') 必須在 tenantDB.transaction() 內呼叫，` +
      `否則並發批次無法正確序列化 current_seq`
    );
  }

  const rule = _getEnabledRule(tenantDB, target);
  if (!rule) return null;

  const next = (rule.current_seq || 0) + 1;
  tenantDB.run(
    'UPDATE code_naming_rules SET current_seq = ?, updated_at = datetime(\'now\') WHERE target = ?',
    [next, target]
  );
  return _format(rule.prefix || '', rule.padding || 4, next);
}

/**
 * 純預覽下一批編號（不消耗 seq），給批次匯入 validate 階段顯示「預計分配」
 *
 * @param {*} tenantDB
 * @param {'employee'|'department'|'employee_cross'} target
 * @param {number} count
 * @returns {string[]|null} 預估的 code 陣列（與 count 等長）；target 不支援 / 規則不存在 / disabled 回 null
 */
function previewBatch(tenantDB, target, count, _ctx = {}) {
  if (!SUPPORTED_TARGETS.has(target)) return null;
  if (!Number.isInteger(count) || count < 0) return null;

  const rule = _getEnabledRule(tenantDB, target);
  if (!rule) return null;

  const startSeq = (rule.current_seq || 0) + 1;
  const codes = [];
  for (let i = 0; i < count; i++) {
    codes.push(_format(rule.prefix || '', rule.padding || 4, startSeq + i));
  }
  return codes;
}

module.exports = {
  tryNext,
  previewBatch,
  SUPPORTED_TARGETS,
};
