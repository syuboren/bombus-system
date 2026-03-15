/**
 * seed-verify.js — 驗證 tenant_demo.db 資料完整性
 *
 * 比對 _manifest.json 預期筆數與實際 DB 筆數。
 * 有資料遺失時 exit code = 1（可用於 CI）。
 *
 * 使用方式：cd bombus-system/server && npm run seed:verify
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const TENANT_DB_PATH = path.join(__dirname, '../../data/tenants/tenant_demo.db');
const MANIFEST_PATH = path.join(__dirname, '../../data/seeds/_manifest.json');

(async () => {
  console.log('═══ Demo Data Verification ═══\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('_manifest.json 不存在，請先執行 npm run seed:export');
    process.exit(1);
  }

  if (!fs.existsSync(TENANT_DB_PATH)) {
    console.error('tenant_demo.db 不存在:', TENANT_DB_PATH);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(TENANT_DB_PATH));

  let okCount = 0;
  let warnCount = 0;
  let totalExpected = 0;
  let totalActual = 0;
  const issues = [];

  const tables = Object.entries(manifest.tables).sort((a, b) => a[0].localeCompare(b[0]));

  for (const [table, info] of tables) {
    const expected = info.rowCount;
    totalExpected += expected;

    // 檢查表是否存在
    const tableCheck = db.exec(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='${table}'`);
    if (tableCheck[0].values[0][0] === 0) {
      console.log(`  ⚠️  ${table.padEnd(35)} 表不存在`);
      warnCount++;
      issues.push({ table, expected, actual: 0, reason: '表不存在' });
      continue;
    }

    const countResult = db.exec(`SELECT COUNT(*) FROM "${table}"`);
    const actual = countResult[0].values[0][0];
    totalActual += actual;

    if (actual >= expected) {
      console.log(`  ✅ ${table.padEnd(35)} ${String(actual).padStart(6)}/${expected} rows`);
      okCount++;
    } else if (actual === 0) {
      console.log(`  ⚠️  ${table.padEnd(35)} ${String(actual).padStart(6)}/${expected} rows  ← DATA LOSS`);
      warnCount++;
      issues.push({ table, expected, actual, reason: '資料遺失' });
    } else {
      console.log(`  ⚠️  ${table.padEnd(35)} ${String(actual).padStart(6)}/${expected} rows  ← 部分遺失`);
      warnCount++;
      issues.push({ table, expected, actual, reason: '部分遺失' });
    }
  }

  db.close();

  // 摘要
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Manifest: ${manifest.exportedAt}`);
  console.log(`Tables:   ${okCount}/${tables.length} OK` + (warnCount > 0 ? `, ${warnCount} 有問題` : ''));
  console.log(`Rows:     ${totalActual}/${totalExpected}` + (totalActual < totalExpected ? ` (缺少 ${totalExpected - totalActual} 筆)` : ' ✅'));

  if (issues.length > 0) {
    console.log(`\n⚠️  偵測到資料問題，建議執行：npm run seed:import`);
    process.exit(1);
  } else {
    console.log('\n✅ 所有 demo 資料完整');
  }
})();
