/**
 * Department Import Service (D-16)
 *
 * 為「公司頁 → 新增部門」的「範本庫導入」與「批次匯入(CSV)」共用。
 *
 * 兩階段（對齊 routes/batch-import.js 模式）：
 *   1. validateImport(tenantDB, companyId, items, mode) — 純檢查，不寫 DB
 *   2. executeImport(tenantDB, companyId, items, mode, opts) — 包 transaction 寫入
 *
 * items 格式：[{ name: string (必填), value?: string[] (預設 []) }]
 * mode: 'overwrite' | 'merge'
 *
 * CSV 解析在前端完成（UTF-8 / UTF-8 BOM 偵測、欄位對映），後端只接收 JSON items。
 */

const { v4: uuidv4 } = require('uuid');
const { resolveCompanyOrgUnitId } = require('../utils/org-unit');

const MAX_IMPORT_ROWS = 1000;
const VALID_MODES = ['overwrite', 'merge'];

/**
 * 驗證 items 格式（單純結構檢查，不查 DB）
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateItem(item, idx, allItems) {
  const errors = [];

  if (!item || typeof item !== 'object') {
    errors.push('資料格式錯誤');
    return { valid: false, errors };
  }

  if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
    errors.push('部門名稱（name）不可為空');
  } else if (item.name.length > 100) {
    errors.push('部門名稱不可超過 100 字元');
  }

  if (item.value !== undefined && item.value !== null) {
    if (!Array.isArray(item.value)) {
      errors.push('value 欄位必須為陣列');
    } else if (item.value.some(v => typeof v !== 'string')) {
      errors.push('value 陣列元素必須為字串');
    }
  }

  // code 驗證（選填，但提供時需檢查格式）
  if (item.code !== undefined && item.code !== null && item.code !== '') {
    if (typeof item.code !== 'string') {
      errors.push('code 必須為字串');
    } else if (item.code.length > 50) {
      errors.push('code 超過 50 字元');
    }
  }

  // CSV 內部重名檢查（同一批次中是否有重複 name）
  if (item.name) {
    const dupIdx = allItems.findIndex(
      (it, i) => i < idx && it.name && it.name.trim() === item.name.trim()
    );
    if (dupIdx >= 0) {
      errors.push(`與第 ${dupIdx + 1} 列同名「${item.name}」`);
    }
  }

  // CSV 內部重複 code 檢查（同一批次中是否有重複 code，空字串/null 跳過）
  if (item.code) {
    const dupCodeIdx = allItems.findIndex(
      (it, i) => i < idx && it.code && it.code === item.code
    );
    if (dupCodeIdx >= 0) {
      errors.push(`code「${item.code}」與第 ${dupCodeIdx + 1} 列重複`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 預檢匯入：驗證格式 + 衝突檢查（不寫 DB）
 *
 * @param {object} tenantDB - SqliteAdapter 實例（req.tenantDB）
 * @param {string} companyId - 目標公司 org_unit id（可為 group/subsidiary，部門將掛在其下）
 * @param {Array} items - [{name, value?}]
 * @param {string} mode - 'overwrite' | 'merge'
 * @returns {object}
 */
function validateImport(tenantDB, companyId, items, mode) {
  if (!Array.isArray(items)) {
    return { error: 'BadRequest', message: 'items 必須為陣列' };
  }
  if (items.length === 0) {
    return { error: 'BadRequest', message: '匯入清單為空' };
  }
  if (items.length > MAX_IMPORT_ROWS) {
    return { error: 'BadRequest', message: `匯入筆數超過上限（${MAX_IMPORT_ROWS}）` };
  }
  if (!VALID_MODES.includes(mode)) {
    return { error: 'BadRequest', message: `mode 必須為 ${VALID_MODES.join(' 或 ')}` };
  }

  // 解析目標公司（subsidiary/group）id
  const targetOrgUnitId = resolveCompanyOrgUnitId(tenantDB, companyId);
  if (!targetOrgUnitId) {
    return { error: 'BadRequest', message: '目標公司不存在或非有效的 group/subsidiary' };
  }

  // 取得該公司現有部門名稱集合
  // 重要：以 org_units（樹的真實狀態）為衝突檢查源，而非 departments 擴充表
  // 因為兩表可能不一致（D-16 之前的舊資料 / 過去刪除流程的孤立 row），只查 departments 會漏檢
  const existingRows = tenantDB.query(
    "SELECT id, name FROM org_units WHERE type = 'department' AND parent_id = ?",
    [companyId]
  );
  const existingByName = new Map(existingRows.map(r => [r.name.trim(), r]));

  // 逐筆驗證 + 衝突分類
  const validatedItems = [];
  const conflicts = [];
  const toInsert = [];
  let validRows = 0;
  let errorRows = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { valid, errors } = validateItem(item, i, items);

    if (!valid) {
      errorRows++;
      validatedItems.push({
        row: i + 1,
        status: 'error',
        data: item,
        errors
      });
      continue;
    }

    const trimmedName = item.name.trim();
    const trimmedCode = (item.code || '').trim() || null;
    const existing = existingByName.get(trimmedName);

    if (existing) {
      conflicts.push({
        row: i + 1,
        name: trimmedName,
        code: trimmedCode,
        existing_id: existing.id,
        value: item.value || []
      });
      validatedItems.push({
        row: i + 1,
        status: 'conflict',
        data: { name: trimmedName, code: trimmedCode, value: item.value || [] },
        existing_id: existing.id
      });
    } else {
      toInsert.push({
        row: i + 1,
        name: trimmedName,
        code: trimmedCode,
        value: item.value || []
      });
      validatedItems.push({
        row: i + 1,
        status: 'valid',
        data: { name: trimmedName, value: item.value || [] }
      });
    }
    validRows++;
  }

  return {
    totalRows: items.length,
    validRows,
    errorRows,
    targetOrgUnitId,
    items: validatedItems,
    conflicts,
    to_insert: toInsert,
    mode
  };
}

/**
 * 執行匯入：包 transaction 寫入 org_units + departments
 *
 * @param {object} tenantDB - SqliteAdapter 實例
 * @param {string} companyId - 目標公司 org_unit id
 * @param {Array} items - [{name, value?}]
 * @param {string} mode - 'overwrite' | 'merge'
 * @param {object} opts - { codeGenHook?: (item, ctx) => string|null }
 * @returns {object}
 */
function executeImport(tenantDB, companyId, items, mode, opts = {}) {
  // 重新跑一次預檢（防 TOCTOU：使用者按下執行時，DB 狀態可能已變）
  const preview = validateImport(tenantDB, companyId, items, mode);
  if (preview.error) return preview;
  if (preview.errorRows > 0) {
    return {
      error: 'BadRequest',
      message: `仍有 ${preview.errorRows} 筆格式錯誤，請先修正`,
      items: preview.items
    };
  }

  const { targetOrgUnitId, conflicts, to_insert: toInsert } = preview;
  const codeGenHook = opts.codeGenHook || (() => null);

  const created = [];
  const updated = [];
  const skipped = [];

  // 取得 company node 用於建立部門 org_units 時的 parent_id 與 level
  const companyNode = tenantDB.queryOne(
    'SELECT id, level FROM org_units WHERE id = ?',
    [companyId]
  );
  if (!companyNode) {
    return { error: 'BadRequest', message: '目標公司節點不存在' };
  }
  const deptLevel = (companyNode.level || 0) + 1;

  try {
    tenantDB.transaction(() => {
      // 1. 處理衝突項
      if (mode === 'overwrite') {
        for (const c of conflicts) {
          // 以 (name, targetOrgUnitId) 為 key 更新 departments.value；若 departments 表沒有對應 row（兩表不一致），補建一筆
          const result = tenantDB.run(
            'UPDATE departments SET value = ? WHERE name = ? AND org_unit_id = ?',
            [JSON.stringify(c.value), c.name, targetOrgUnitId]
          );
          if (!result || !result.changes) {
            tenantDB.run(
              'INSERT INTO departments (id, name, code, org_unit_id, value) VALUES (?, ?, ?, ?, ?)',
              [uuidv4(), c.name, c.code || null, targetOrgUnitId, JSON.stringify(c.value)]
            );
          }
          updated.push({ id: c.existing_id, name: c.name, row: c.row });
        }
      } else {
        // merge: 跳過所有衝突
        for (const c of conflicts) {
          skipped.push({ name: c.name, row: c.row, reason: 'name_exists' });
        }
      }

      // 2. 處理新增項
      for (const item of toInsert) {
        const orgUnitId = uuidv4();
        const code = item.code || codeGenHook(item, { tenantDB, targetOrgUnitId }) || null;

        // 建 org_units 部門節點（validate 已確認此處無同名 org_units 列）
        tenantDB.run(
          "INSERT INTO org_units (id, name, type, parent_id, level, code) VALUES (?, ?, 'department', ?, ?, ?)",
          [orgUnitId, item.name, companyId, deptLevel, code]
        );

        // departments 表可能存在孤兒列（org_units 沒對應但 departments 有；過去刪除流程留下）；
        // 直接 INSERT 會撞 UNIQUE(name, org_unit_id)。先試 UPDATE，0 rows 才 INSERT，順便修復孤兒。
        let deptId;
        const updateResult = tenantDB.run(
          'UPDATE departments SET code = ?, value = ? WHERE name = ? AND org_unit_id = ?',
          [code, JSON.stringify(item.value), item.name, targetOrgUnitId]
        );
        if (updateResult && updateResult.changes) {
          const existing = tenantDB.queryOne(
            'SELECT id FROM departments WHERE name = ? AND org_unit_id = ?',
            [item.name, targetOrgUnitId]
          );
          deptId = existing ? existing.id : uuidv4();
        } else {
          deptId = uuidv4();
          tenantDB.run(
            'INSERT INTO departments (id, name, code, org_unit_id, value) VALUES (?, ?, ?, ?, ?)',
            [deptId, item.name, code, targetOrgUnitId, JSON.stringify(item.value)]
          );
        }

        created.push({
          id: deptId,
          orgUnitId,
          name: item.name,
          code,
          row: item.row
        });
      }
    });
  } catch (err) {
    return {
      error: 'TransactionFailed',
      message: err.message,
      partial: { created: [], updated: [], skipped: [] }
    };
  }

  return {
    success: true,
    mode,
    targetOrgUnitId,
    created,
    updated,
    skipped,
    summary: {
      totalRows: items.length,
      created: created.length,
      updated: updated.length,
      skipped: skipped.length
    }
  };
}

module.exports = {
  validateImport,
  executeImport,
  MAX_IMPORT_ROWS,
  VALID_MODES
};
