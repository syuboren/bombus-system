/**
 * org_units 相關輔助函式
 */

/**
 * 從員工的 org_unit_id 往上找第一個 subsidiary/group 節點名稱作為「公司」。
 * 找不到或員工沒有 org_unit_id 時 fallback 為 tenantName。
 * @param {object} tenantDB
 * @param {string|null} orgUnitId
 * @param {string|null} fallback
 * @returns {string|null}
 */
function resolveCompanyFromOrgUnit(tenantDB, orgUnitId, fallback) {
  if (!orgUnitId) return fallback;
  const seen = new Set();
  let current = tenantDB.prepare(
    'SELECT id, name, type, parent_id FROM org_units WHERE id = ?'
  ).get(orgUnitId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    if (current.type === 'subsidiary' || current.type === 'group') {
      return current.name;
    }
    if (!current.parent_id) break;
    current = tenantDB.prepare(
      'SELECT id, name, type, parent_id FROM org_units WHERE id = ?'
    ).get(current.parent_id);
  }
  return fallback;
}

/**
 * 從任一 org_unit_id 往上找第一個 subsidiary/group 節點 id。
 * 用於部門相關操作中決定「所屬公司」。10 層深度上限防無窮迴圈。
 * @param {object} tenantDB
 * @param {string|null} startId
 * @returns {string|null}
 */
function resolveCompanyOrgUnitId(tenantDB, startId) {
  let walkId = startId;
  for (let i = 0; i < 10; i++) {
    if (!walkId) return null;
    const unit = tenantDB.queryOne(
      'SELECT id, type, parent_id FROM org_units WHERE id = ?',
      [walkId]
    );
    if (!unit) return null;
    if (unit.type === 'subsidiary' || unit.type === 'group') return unit.id;
    walkId = unit.parent_id;
  }
  return null;
}

module.exports = { resolveCompanyFromOrgUnit, resolveCompanyOrgUnitId };
