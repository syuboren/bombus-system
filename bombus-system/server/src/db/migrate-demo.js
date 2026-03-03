/**
 * Demo Tenant Data Migration — migrate-demo.js
 *
 * 從 onboarding.db 讀取既有資料，遷移至 tenant_demo.db。
 *
 * Phase A (Task 5.1a): 遷移框架 + 核心結構與員工表
 * Phase B (Task 5.1b): 進階業務表（待補充）
 * Phase C (Task 5.2):  RBAC 種子資料（待補充）
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { tenantDBManager } = require('./tenant-db-manager');
const { initTenantSchema } = require('./tenant-schema');
const { initPlatformDB, getPlatformDB } = require('./platform-db');
const { logAudit } = require('../utils/audit-logger');

const ONBOARDING_DB_PATH = path.join(__dirname, 'onboarding.db');
const DEMO_TENANT_ID = 'demo';
const DEMO_TENANT_SLUG = 'demo';
const DEMO_TENANT_NAME = 'Demo Company';

// ─── Phase A 表清單 (Task 5.1a)：核心結構 + 員工表 ───
const PHASE_A_TABLES = [
  // 部門與職等職級系統
  'departments',
  'grade_levels',
  'grade_salary_levels',
  'department_positions',
  'promotion_criteria',
  'career_paths',
  'grade_tracks',
  'grade_change_history',
  // 員工管理
  'employees',
  'employee_education',
  'employee_skills',
  'employee_certifications',
  'employee_job_changes',
  'employee_salaries',
  'employee_training',
  'employee_documents',
  // 系統設定
  'system_config',
];

// ─── Phase B 表清單 (Task 5.1b)：進階業務表（待補充）───
const PHASE_B_TABLES = [];

// ═══════════════════════════════════════════
// 工具函數
// ═══════════════════════════════════════════

/**
 * 取得資料表的欄位名稱列表
 * @param {import('sql.js').Database} db
 * @param {string} tableName
 * @returns {string[]}
 */
function getTableColumns(db, tableName) {
  const columns = [];
  const stmt = db.prepare(`PRAGMA table_info("${tableName}")`);
  while (stmt.step()) {
    columns.push(stmt.getAsObject().name);
  }
  stmt.free();
  return columns;
}

/**
 * 檢查資料表是否存在
 * @param {import('sql.js').Database} db
 * @param {string} tableName
 * @returns {boolean}
 */
function tableExists(db, tableName) {
  const stmt = db.prepare(
    'SELECT COUNT(*) as c FROM sqlite_master WHERE type=\'table\' AND name=?'
  );
  stmt.bind([tableName]);
  stmt.step();
  const exists = stmt.getAsObject().c > 0;
  stmt.free();
  return exists;
}

/**
 * 取得資料表列數
 * @param {import('sql.js').Database} db
 * @param {string} tableName
 * @returns {number}
 */
function getRowCount(db, tableName) {
  const stmt = db.prepare(`SELECT COUNT(*) as c FROM "${tableName}"`);
  stmt.step();
  const count = stmt.getAsObject().c;
  stmt.free();
  return count;
}

// ═══════════════════════════════════════════
// 通用表遷移
// ═══════════════════════════════════════════

/**
 * 遷移單一資料表（自動偵測共同欄位）
 * @param {import('sql.js').Database} sourceDB - onboarding.db
 * @param {import('sql.js').Database} targetDB - tenant_demo.db raw
 * @param {string} tableName
 * @returns {{ table: string, source: number, migrated: number, skipped: boolean, reason?: string }}
 */
function migrateTable(sourceDB, targetDB, tableName) {
  // 驗證兩端都有此表
  if (!tableExists(sourceDB, tableName)) {
    return { table: tableName, source: 0, migrated: 0, skipped: true, reason: '來源表不存在' };
  }
  if (!tableExists(targetDB, tableName)) {
    return { table: tableName, source: 0, migrated: 0, skipped: true, reason: '目標表不存在' };
  }

  // 取得兩邊的欄位，取交集
  const sourceColumns = getTableColumns(sourceDB, tableName);
  const targetColumns = getTableColumns(targetDB, tableName);
  const targetSet = new Set(targetColumns);
  const commonColumns = sourceColumns.filter(c => targetSet.has(c));

  if (commonColumns.length === 0) {
    return { table: tableName, source: 0, migrated: 0, skipped: true, reason: '無共同欄位' };
  }

  // 讀取 source 所有資料
  const colList = commonColumns.map(c => `"${c}"`).join(', ');
  const readStmt = sourceDB.prepare(`SELECT ${colList} FROM "${tableName}"`);
  const rows = [];
  while (readStmt.step()) {
    rows.push(readStmt.getAsObject());
  }
  readStmt.free();

  const sourceCount = rows.length;
  if (sourceCount === 0) {
    return { table: tableName, source: 0, migrated: 0, skipped: false };
  }

  // 寫入 target（使用 INSERT OR IGNORE 避免重複）
  const placeholders = commonColumns.map(() => '?').join(', ');
  const insertSQL = `INSERT OR IGNORE INTO "${tableName}" (${colList}) VALUES (${placeholders})`;

  let migrated = 0;
  for (const row of rows) {
    const values = commonColumns.map(c => {
      const val = row[c];
      return val === undefined ? null : val;
    });
    try {
      const stmt = targetDB.prepare(insertSQL);
      stmt.bind(values);
      stmt.step();
      stmt.free();
      migrated++;
    } catch (e) {
      // INSERT OR IGNORE 應處理大部分衝突；記錄非預期錯誤
      console.warn(`  ⚠ ${tableName} 寫入失敗:`, e.message);
    }
  }

  return { table: tableName, source: sourceCount, migrated, skipped: false };
}

// ═══════════════════════════════════════════
// 主遷移流程
// ═══════════════════════════════════════════

/**
 * 執行 Demo 租戶資料遷移
 * @returns {Promise<{ success: boolean, tables?: number, totalRows?: number, results?: object[], error?: string }>}
 */
async function migrateDemoData() {
  console.log('═══════════════════════════════════════');
  console.log('🔄 開始 Demo 租戶資料遷移');
  console.log('═══════════════════════════════════════');

  // 1. 確認 onboarding.db 存在
  if (!fs.existsSync(ONBOARDING_DB_PATH)) {
    console.error('❌ onboarding.db 不存在:', ONBOARDING_DB_PATH);
    return { success: false, error: 'onboarding.db not found' };
  }

  // 2. 初始化多租戶基礎設施
  const platformDB = await initPlatformDB();
  await tenantDBManager.init();

  // 3. 開啟 source DB
  const SQL = await initSqlJs();
  const sourceBuffer = fs.readFileSync(ONBOARDING_DB_PATH);
  const sourceDB = new SQL.Database(sourceBuffer);
  console.log('📂 已開啟 onboarding.db');

  // 4. 建立或取得 demo 租戶 DB
  let demoAdapter;
  if (tenantDBManager.exists(DEMO_TENANT_ID)) {
    console.log('📂 Demo 租戶 DB 已存在，載入中...');
    demoAdapter = tenantDBManager.getDB(DEMO_TENANT_ID);
  } else {
    console.log('🆕 建立 Demo 租戶 DB 並初始化 Schema...');
    demoAdapter = tenantDBManager.createTenantDB(DEMO_TENANT_ID, initTenantSchema);
  }
  const targetDB = demoAdapter.raw;

  // 5. 在 platform.db 註冊 demo 租戶（冪等）
  const existingTenant = platformDB.queryOne(
    'SELECT id FROM tenants WHERE slug = ?', [DEMO_TENANT_SLUG]
  );
  if (!existingTenant) {
    platformDB.run(
      `INSERT INTO tenants (id, name, slug, status, db_file)
       VALUES (?, ?, ?, 'active', ?)`,
      [DEMO_TENANT_ID, DEMO_TENANT_NAME, DEMO_TENANT_SLUG, `tenant_${DEMO_TENANT_ID}.db`]
    );
    console.log('✅ Demo 租戶已註冊至 platform.db');
  }

  // 6. 關閉外鍵約束，開始交易
  targetDB.run('PRAGMA foreign_keys = OFF');
  targetDB.run('BEGIN TRANSACTION');

  // 7. 逐表遷移
  const allTables = [...PHASE_A_TABLES, ...PHASE_B_TABLES];
  const results = [];

  console.log(`\n📋 準備遷移 ${allTables.length} 張表...\n`);

  for (const tableName of allTables) {
    const result = migrateTable(sourceDB, targetDB, tableName);
    results.push(result);

    if (result.skipped) {
      console.log(`  ⏭ ${tableName}: 跳過 (${result.reason})`);
    } else if (result.source === 0) {
      console.log(`  ○ ${tableName}: 空表`);
    } else {
      console.log(`  ✅ ${tableName}: ${result.migrated}/${result.source} 筆`);
    }
  }

  // 8. 提交交易，重新啟用外鍵
  targetDB.run('COMMIT');
  targetDB.run('PRAGMA foreign_keys = ON');
  demoAdapter.save();

  // 9. 驗證遷移結果
  console.log('\n─── 遷移驗證 ───');
  let allMatch = true;
  for (const result of results) {
    if (result.skipped || result.source === 0) continue;
    const actualCount = getRowCount(targetDB, result.table);
    if (actualCount < result.migrated) {
      console.log(`  ❌ ${result.table}: 預期 ${result.migrated}，實際 ${actualCount}`);
      allMatch = false;
    }
  }
  if (allMatch) {
    console.log('  ✅ 所有表遷移記錄數驗證通過');
  }

  // 10. 記錄審計日誌
  const migrationDetails = results
    .filter(r => !r.skipped)
    .reduce((acc, r) => {
      acc[r.table] = { source: r.source, migrated: r.migrated };
      return acc;
    }, {});

  logAudit(platformDB, {
    tenant_id: DEMO_TENANT_ID,
    action: 'data_migration',
    resource: 'demo_tenant',
    details: {
      phase: 'A',
      tables_migrated: results.filter(r => !r.skipped && r.migrated > 0).length,
      tables_empty: results.filter(r => !r.skipped && r.source === 0).length,
      tables_skipped: results.filter(r => r.skipped).length,
      total_rows: results.reduce((sum, r) => sum + r.migrated, 0),
      details: migrationDetails
    }
  });

  // 11. 關閉 source DB
  sourceDB.close();

  // 12. 輸出最終報告
  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
  const totalTables = results.filter(r => !r.skipped && r.migrated > 0).length;

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Demo 遷移完成：${totalTables} 張表，共 ${totalMigrated} 筆資料`);
  console.log('═══════════════════════════════════════\n');

  return {
    success: true,
    tables: totalTables,
    totalRows: totalMigrated,
    results
  };
}

// ─── CLI 直接執行 ───
if (require.main === module) {
  migrateDemoData()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateDemoData, migrateTable, PHASE_A_TABLES, PHASE_B_TABLES };
