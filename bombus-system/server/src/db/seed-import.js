/**
 * seed-import.js — 從 JSON 種子檔還原 tenant_demo.db 的空表
 *
 * 只填補空表，不覆蓋既有資料。處理 schema 演進（取欄位交集）。
 * org_unit_id 為 NULL 時自動設為 'org-root'。
 *
 * 使用方式：cd bombus-system/server && npm run seed:import
 * 也可被 migrate-demo.js 當作 fallback 呼叫。
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const TENANT_DB_PATH = path.join(__dirname, '../../data/tenants/tenant_demo.db');
const SEEDS_DIR = path.join(__dirname, '../../data/seeds');

// 依外鍵依賴順序排列（Tier 0 → 4）
const IMPORT_ORDER = [
  // Tier 0: 無依賴
  'departments', 'grade_levels', 'system_config', 'templates', 'meetings',
  'talent_tags', 'satisfaction_questions', 'grade_tracks', 'competencies',
  'department_collaborations', 'competency_notifications', 'grade_change_history',
  // Tier 1: 依賴 Tier 0
  'employees', 'grade_salary_levels', 'grade_track_entries', 'department_positions',
  'promotion_criteria', 'career_paths', 'competency_levels', 'competency_ksa_details',
  'jobs', 'job_descriptions', 'submissions', 'template_versions',
  // Tier 2: 依賴 Tier 1
  'employee_education', 'employee_skills', 'employee_certifications',
  'employee_job_changes', 'employee_salaries', 'employee_training',
  'employee_documents', 'employee_performance', 'employee_roi',
  'candidates', 'meeting_reminders', 'meeting_attendees', 'meeting_agenda_items',
  'meeting_conclusions', 'meeting_attachments', 'monthly_check_templates',
  'monthly_checks', 'quarterly_reviews', 'weekly_reports',
  'job_description_versions', 'job_description_approvals', 'talent_pool',
  // Tier 3: 依賴 Tier 2
  'candidate_education', 'candidate_experiences', 'candidate_specialities',
  'candidate_languages', 'candidate_attachments', 'candidate_projects',
  'candidate_custom_contents', 'candidate_recommenders', 'candidate_apply_records',
  'candidate_apply_questions', 'candidate_resume_analysis',
  'interview_evaluations', 'interview_invitations', 'interviews', 'invitation_decisions',
  'monthly_check_items', 'quarterly_review_sections', 'satisfaction_surveys',
  'weekly_report_items', 'weekly_todo_items', 'weekly_problem_items',
  'weekly_training_items', 'weekly_project_items',
  'talent_contact_history', 'talent_reminders', 'talent_tag_mapping', 'talent_job_matches',
  // Tier 4
  'candidate_interview_forms',
];

/**
 * 從 JSON 種子檔匯入資料至 tenant_demo.db
 * @param {import('sql.js').Database} [externalDb] - 外部提供的 DB 實例（由 migrate-demo.js 呼叫時使用）
 * @param {string} [externalDbPath] - 外部提供的 DB 檔案路徑
 * @returns {Promise<{ imported: number, tables: number, skipped: string[] }>}
 */
async function importSeeds(externalDb, externalDbPath) {
  const manifestPath = path.join(SEEDS_DIR, '_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('_manifest.json 不存在，請先執行 npm run seed:export');
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const seedTables = Object.keys(manifest.tables);

  // 決定匯入順序：IMPORT_ORDER 中有的按順序來，其餘追加到尾部
  const orderedSet = new Set(IMPORT_ORDER);
  const ordered = IMPORT_ORDER.filter(t => seedTables.includes(t));
  const remaining = seedTables.filter(t => !orderedSet.has(t));
  const importList = [...ordered, ...remaining];

  // 開啟或使用既有 DB
  let db = externalDb;
  let SQL;
  const dbPath = externalDbPath || TENANT_DB_PATH;
  if (!db) {
    if (!fs.existsSync(dbPath)) {
      throw new Error('tenant_demo.db 不存在: ' + dbPath);
    }
    SQL = await initSqlJs();
    db = new SQL.Database(fs.readFileSync(dbPath));
  }

  db.run('PRAGMA foreign_keys = OFF');
  db.run('BEGIN TRANSACTION');

  let totalImported = 0;
  let tablesImported = 0;
  const skipped = [];
  const orgUnitTables = [];

  for (const table of importList) {
    const seedFile = path.join(SEEDS_DIR, `${table}.json`);
    if (!fs.existsSync(seedFile)) continue;

    // 檢查表是否存在
    const tableCheck = db.exec(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='${table}'`);
    if (tableCheck[0].values[0][0] === 0) {
      skipped.push(`${table} (表不存在)`);
      continue;
    }

    // 檢查是否已有資料
    const countResult = db.exec(`SELECT COUNT(*) FROM "${table}"`);
    if (countResult[0].values[0][0] > 0) {
      skipped.push(`${table} (已有資料)`);
      continue;
    }

    // 讀取種子檔
    const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
    if (seed.rows.length === 0) continue;

    // 取得 DB 欄位，計算交集
    const dbColInfo = db.exec(`PRAGMA table_info("${table}")`);
    const dbColumns = dbColInfo[0].values.map(r => r[1]);
    const dbColSet = new Set(dbColumns);
    const commonCols = seed.columns.filter(c => dbColSet.has(c));
    const seedColIndices = commonCols.map(c => seed.columns.indexOf(c));

    if (commonCols.length === 0) {
      skipped.push(`${table} (無共同欄位)`);
      continue;
    }

    // 插入資料
    const colList = commonCols.map(c => `"${c}"`).join(', ');
    const placeholders = commonCols.map(() => '?').join(', ');
    const insertSql = `INSERT OR IGNORE INTO "${table}" (${colList}) VALUES (${placeholders})`;

    let inserted = 0;
    for (const row of seed.rows) {
      const values = seedColIndices.map(idx => {
        const val = row[idx];
        // 還原 BLOB
        if (typeof val === 'string' && val.startsWith('__blob:')) {
          return Buffer.from(val.slice(7), 'base64');
        }
        return val;
      });
      try {
        db.run(insertSql, values);
        inserted++;
      } catch (e) {
        // INSERT OR IGNORE 應處理大部分衝突
      }
    }

    // 檢查是否需要回填 org_unit_id
    if (dbColumns.includes('org_unit_id') && !seed.columns.includes('org_unit_id')) {
      orgUnitTables.push(table);
    }

    totalImported += inserted;
    tablesImported++;
    console.log(`  ✅ ${table}: ${inserted}/${seed.rows.length} rows`);
  }

  // 回填 org_unit_id
  for (const table of orgUnitTables) {
    db.run(`UPDATE "${table}" SET org_unit_id = 'org-root' WHERE org_unit_id IS NULL`);
    console.log(`  🔧 ${table}: org_unit_id → org-root`);
  }

  db.run('COMMIT');
  db.run('PRAGMA foreign_keys = ON');

  // 如果是自己開的 DB，儲存並關閉
  if (!externalDb) {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();
  }

  return { imported: totalImported, tables: tablesImported, skipped };
}

// CLI 直接執行
if (require.main === module) {
  (async () => {
    console.log('═══ Demo Seed Import ═══\n');
    try {
      const result = await importSeeds();
      console.log(`\n═══ 完成：${result.tables} 張表，共 ${result.imported} 筆資料還原 ═══`);
      if (result.skipped.length > 0) {
        console.log(`\n跳過 ${result.skipped.length} 張表：`);
        result.skipped.forEach(s => console.log(`  ○ ${s}`));
      }
    } catch (err) {
      console.error('匯入失敗:', err.message);
      process.exit(1);
    }
  })();
}

module.exports = { importSeeds };
