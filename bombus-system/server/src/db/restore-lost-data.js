/**
 * 從根目錄 onboarding.db 還原遺失的 demo 資料到 tenant_demo.db
 * 只補回空表，不覆蓋既有資料
 * 有 org_unit_id 欄位的表會自動設為 'org-root'
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const oldDbPath = path.resolve(__dirname, '../../../../onboarding.db');
  const tenantDbPath = path.join(__dirname, '../../data/tenants/tenant_demo.db');

  console.log('Source:', oldDbPath);
  console.log('Target:', tenantDbPath);

  const oldDb = new SQL.Database(fs.readFileSync(oldDbPath));
  const newDb = new SQL.Database(fs.readFileSync(tenantDbPath));

  // 取得舊 DB 所有有資料的表
  const oldTables = oldDb.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const newTables = newDb.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  const newTableNames = newTables[0].values.map(r => r[0]);

  let totalInserted = 0;
  const orgUnitTables = [];

  for (const row of oldTables[0].values) {
    const table = row[0];

    // 跳過不在新 DB 中的表
    if (!newTableNames.includes(table)) continue;

    // 取得新舊 DB 欄位
    const newColsInfo = newDb.exec(`PRAGMA table_info("${table}")`);
    const oldColsInfo = oldDb.exec(`PRAGMA table_info("${table}")`);
    if (newColsInfo.length === 0 || oldColsInfo.length === 0) continue;

    const newCols = newColsInfo[0].values.map(r => r[1]);
    const oldCols = oldColsInfo[0].values.map(r => r[1]);
    const commonCols = newCols.filter(c => oldCols.includes(c));

    // 跳過已有資料的表
    const existingCount = newDb.exec(`SELECT COUNT(*) FROM "${table}"`)[0].values[0][0];
    if (existingCount > 0) continue;

    // 跳過舊 DB 沒資料的表
    const oldCount = oldDb.exec(`SELECT COUNT(*) FROM "${table}"`)[0].values[0][0];
    if (oldCount === 0) continue;

    // 取得舊資料
    const oldData = oldDb.exec(`SELECT ${commonCols.map(c => '"' + c + '"').join(', ')} FROM "${table}"`);
    if (oldData.length === 0 || oldData[0].values.length === 0) continue;

    const rows = oldData[0].values;
    const placeholders = commonCols.map(() => '?').join(', ');
    const insertSql = `INSERT OR IGNORE INTO "${table}" (${commonCols.map(c => '"' + c + '"').join(', ')}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const r of rows) {
      try {
        newDb.run(insertSql, r);
        inserted++;
      } catch (e) {
        console.log(`  ERR ${table}: ${e.message}`);
      }
    }

    const newOnlyCols = newCols.filter(c => !oldCols.includes(c));
    const hasOrgUnit = newCols.includes('org_unit_id') && !oldCols.includes('org_unit_id');
    console.log(`OK ${table}: ${inserted}/${rows.length} rows (${commonCols.length} cols, ${newOnlyCols.length} new→NULL)${hasOrgUnit ? ' [will set org_unit_id]' : ''}`);
    totalInserted += inserted;

    if (hasOrgUnit) {
      orgUnitTables.push(table);
    }
  }

  // 設定 org_unit_id = 'org-root'
  if (orgUnitTables.length > 0) {
    console.log('\n--- Setting org_unit_id = org-root ---');
    for (const table of orgUnitTables) {
      newDb.run(`UPDATE "${table}" SET org_unit_id = 'org-root' WHERE org_unit_id IS NULL`);
      const affected = newDb.getRowsModified();
      console.log(`  ${table}: ${affected} rows updated`);
    }
  }

  // 儲存（先取 changes 再 export）
  const data = newDb.export();
  fs.writeFileSync(tenantDbPath, Buffer.from(data));
  console.log(`\nDone. Total ${totalInserted} rows restored to tenant_demo.db`);

  oldDb.close();
  newDb.close();
})();
