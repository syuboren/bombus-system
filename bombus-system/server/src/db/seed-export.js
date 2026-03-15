/**
 * seed-export.js — 匯出 tenant_demo.db 業務資料為 JSON 種子檔
 *
 * 用途：將 demo 資料快照為 git 可追蹤的 JSON 檔案，防止架構調整時資料遺失。
 * 跳過 RBAC 表（由 migrate-demo.js seedRBACData() 產生）。
 *
 * 使用方式：cd bombus-system/server && npm run seed:export
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const TENANT_DB_PATH = path.join(__dirname, '../../data/tenants/tenant_demo.db');
const SEEDS_DIR = path.join(__dirname, '../../data/seeds');

// RBAC 表由程式碼產生，不需匯出
const SKIP_TABLES = new Set([
  'users', 'roles', 'permissions', 'role_permissions',
  'user_roles', 'org_units', 'refresh_tokens'
]);

(async () => {
  console.log('═══ Demo Seed Export ═══\n');

  if (!fs.existsSync(TENANT_DB_PATH)) {
    console.error('tenant_demo.db 不存在:', TENANT_DB_PATH);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(TENANT_DB_PATH));

  // 確保輸出目錄存在
  if (!fs.existsSync(SEEDS_DIR)) {
    fs.mkdirSync(SEEDS_DIR, { recursive: true });
  }

  // 取得所有表名
  const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  if (!tablesResult.length) {
    console.log('資料庫無表');
    db.close();
    return;
  }

  const allTables = tablesResult[0].values.map(r => r[0]);
  const manifest = { version: 1, exportedAt: new Date().toISOString(), tables: {}, totalTables: 0, totalRows: 0 };
  let exportedCount = 0;

  for (const table of allTables) {
    // 跳過 RBAC 表
    if (SKIP_TABLES.has(table)) continue;

    // 取得筆數
    const countResult = db.exec(`SELECT COUNT(*) FROM "${table}"`);
    const rowCount = countResult[0].values[0][0];
    if (rowCount === 0) continue;

    // 取得欄位資訊
    const colInfo = db.exec(`PRAGMA table_info("${table}")`);
    const columns = colInfo[0].values.map(r => r[1]);

    // 取得全部資料
    const colList = columns.map(c => `"${c}"`).join(', ');
    const dataResult = db.exec(`SELECT ${colList} FROM "${table}"`);
    const rows = dataResult.length > 0 ? dataResult[0].values : [];

    // 處理 BLOB 值：轉為 base64 字串
    const processedRows = rows.map(row =>
      row.map(val => {
        if (val instanceof Uint8Array) {
          return '__blob:' + Buffer.from(val).toString('base64');
        }
        return val;
      })
    );

    // 寫入 JSON 檔
    const seedData = {
      tableName: table,
      columns,
      rows: processedRows,
      rowCount: processedRows.length,
      exportedAt: manifest.exportedAt
    };

    const filePath = path.join(SEEDS_DIR, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(seedData, null, 2), 'utf8');

    manifest.tables[table] = { rowCount: processedRows.length, columns: columns.length };
    manifest.totalRows += processedRows.length;
    exportedCount++;

    console.log(`  ${String(processedRows.length).padStart(6)}  ${table}`);
  }

  manifest.totalTables = exportedCount;

  // 寫入 manifest
  const manifestPath = path.join(SEEDS_DIR, '_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  db.close();

  console.log(`\n═══ 完成：${exportedCount} 張表，共 ${manifest.totalRows} 筆資料 ═══`);
  console.log(`種子檔目錄：${SEEDS_DIR}`);
})();
