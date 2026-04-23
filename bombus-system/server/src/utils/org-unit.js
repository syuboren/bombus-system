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

module.exports = { resolveCompanyFromOrgUnit };
