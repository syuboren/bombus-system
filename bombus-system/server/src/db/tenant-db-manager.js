/**
 * TenantDBManager — 多租戶資料庫實例管理
 *
 * 單例服務，管理多個租戶的 SqliteAdapter 實例。
 * - getDB(tenantId)：取得租戶 DB（自動載入/快取）
 * - createTenantDB(tenantId)：建立新租戶 DB 並初始化 schema
 * - deleteTenantDB(tenantId)：卸載並刪除租戶 DB 檔案
 * - LRU Cache：閒置 30 分鐘自動卸載
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { SqliteAdapter } = require('./db-adapter');
const {
  EMPLOYEE_MIGRATIONS, USER_MIGRATIONS, INTERVIEW_MIGRATIONS,
  ROLE_FEATURE_PERMS_MIGRATIONS, CROSS_COMPANY_NAMING_MIGRATIONS,
  FEATURE_TABLES_SQL, IMPORT_TABLES_SQL, FEATURE_SEED_DATA, DEFAULT_ROLE_FEATURE_PERMS,
  seedFeatureData, seedDefaultRoleFeaturePerms
} = require('./tenant-schema');

const TENANTS_DIR = path.join(__dirname, '../../data/tenants');
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 分鐘

/** @type {import('sql.js').SqlJsStatic|null} */
let SQL = null;

class TenantDBManager {
  constructor() {
    /** @type {Map<string, { adapter: SqliteAdapter, lastAccess: number, timer: NodeJS.Timeout }>} */
    this._cache = new Map();
  }

  /**
   * 初始化 sql.js（只需一次）
   */
  async init() {
    if (!SQL) {
      SQL = await initSqlJs();
    }
    // 確保 tenants 目錄存在
    if (!fs.existsSync(TENANTS_DIR)) {
      fs.mkdirSync(TENANTS_DIR, { recursive: true });
    }
  }

  /**
   * 取得租戶的 DB 檔案路徑
   * @param {string} tenantId
   * @returns {string}
   */
  _getDBPath(tenantId) {
    return path.join(TENANTS_DIR, `tenant_${tenantId}.db`);
  }

  /**
   * 取得租戶 DBAdapter（自動載入/快取）
   * @param {string} tenantId
   * @returns {SqliteAdapter}
   */
  getDB(tenantId) {
    const entry = this._cache.get(tenantId);
    if (entry) {
      // 更新最後存取時間，重設閒置計時器
      entry.lastAccess = Date.now();
      this._resetTimer(tenantId, entry);
      return entry.adapter;
    }

    // 從檔案載入
    const dbPath = this._getDBPath(tenantId);
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Tenant database not found: ${tenantId}`);
    }

    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);
    // 啟用外鍵約束
    db.run('PRAGMA foreign_keys = ON');

    const adapter = new SqliteAdapter(db, dbPath);

    // 執行冪等遷移（ALTER TABLE 對既有租戶 DB 補欄位）
    this._runMigrations(db, adapter);

    const cacheEntry = {
      adapter,
      lastAccess: Date.now(),
      timer: null
    };
    this._cache.set(tenantId, cacheEntry);
    this._resetTimer(tenantId, cacheEntry);

    console.log(`📂 Loaded tenant DB: ${tenantId}`);
    return adapter;
  }

  /**
   * 建立新租戶資料庫
   * @param {string} tenantId
   * @param {function(SqliteAdapter): void} [initSchema] - schema 初始化函數
   * @returns {SqliteAdapter}
   */
  createTenantDB(tenantId, initSchema) {
    const dbPath = this._getDBPath(tenantId);
    if (fs.existsSync(dbPath)) {
      throw new Error(`Tenant database already exists: ${tenantId}`);
    }

    const db = new SQL.Database();
    db.run('PRAGMA foreign_keys = ON');

    const adapter = new SqliteAdapter(db, dbPath);

    // 初始化 schema
    if (initSchema) {
      initSchema(adapter);
    }

    adapter.save();

    // 快取
    const cacheEntry = {
      adapter,
      lastAccess: Date.now(),
      timer: null
    };
    this._cache.set(tenantId, cacheEntry);
    this._resetTimer(tenantId, cacheEntry);

    console.log(`🆕 Created tenant DB: ${tenantId}`);
    return adapter;
  }

  /**
   * 卸載租戶 DB 實例（持久化後從記憶體移除）
   * @param {string} tenantId
   */
  unloadDB(tenantId) {
    const entry = this._cache.get(tenantId);
    if (!entry) return;

    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.adapter.close();
    this._cache.delete(tenantId);
    console.log(`💤 Unloaded tenant DB: ${tenantId}`);
  }

  /**
   * 刪除租戶資料庫（硬刪除：卸載 + 刪檔）
   * @param {string} tenantId
   */
  deleteTenantDB(tenantId) {
    // 先卸載
    this.unloadDB(tenantId);

    // 刪除檔案
    const dbPath = this._getDBPath(tenantId);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`🗑️ Deleted tenant DB file: ${dbPath}`);
    }
  }

  /**
   * 檢查租戶 DB 檔案是否存在
   * @param {string} tenantId
   * @returns {boolean}
   */
  exists(tenantId) {
    return fs.existsSync(this._getDBPath(tenantId));
  }

  /**
   * 重設閒置卸載計時器
   * @param {string} tenantId
   * @param {{ timer: NodeJS.Timeout|null }} entry
   */
  _resetTimer(tenantId, entry) {
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.timer = setTimeout(() => {
      console.log(`⏰ Idle timeout for tenant: ${tenantId}`);
      this.unloadDB(tenantId);
    }, IDLE_TIMEOUT_MS);
    // 避免 timer 阻止 Node 進程退出
    if (entry.timer.unref) {
      entry.timer.unref();
    }
  }

  /**
   * 冪等遷移 — 在載入既有租戶 DB 時補欄位和新表
   * @param {import('sql.js').Database} db
   * @param {import('./db-adapter').SqliteAdapter} adapter
   */
  _runMigrations(db, adapter) {
    let changed = false;

    // departments 表新增欄位
    // 註：D-16 變更後，responsibilities 已重新命名為 value（限 departments；JD 不受影響）。
    //     responsibilities → value 的 RENAME 由下方獨立冪等區塊處理。
    const deptMigrations = [
      'ALTER TABLE departments ADD COLUMN manager_id TEXT REFERENCES employees(id)',
      'ALTER TABLE departments ADD COLUMN head_count INTEGER DEFAULT 0',
      "ALTER TABLE departments ADD COLUMN kpi_items TEXT DEFAULT '[]'",
      "ALTER TABLE departments ADD COLUMN competency_focus TEXT DEFAULT '[]'",
      'ALTER TABLE departments ADD COLUMN org_unit_id TEXT REFERENCES org_units(id)'
    ];
    for (const sql of deptMigrations) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // D-16：departments.responsibilities → value（rename 而非新增；冪等）
    // - 既有租戶有 responsibilities 但無 value：執行 RENAME COLUMN
    // - 兩者皆無（極早期租戶）：直接 ADD COLUMN value
    // - 已是 value：no-op
    try {
      const cols = db.exec("PRAGMA table_info(departments)")[0]?.values?.map(r => r[1]) || [];
      if (cols.includes('responsibilities') && !cols.includes('value')) {
        db.run('ALTER TABLE departments RENAME COLUMN responsibilities TO value');
        console.log('🔄 departments.responsibilities → value (D-16)');
        changed = true;
      } else if (!cols.includes('responsibilities') && !cols.includes('value')) {
        db.run("ALTER TABLE departments ADD COLUMN value TEXT DEFAULT '[]'");
        changed = true;
      }
    } catch (e) { console.warn('departments.value migration:', e.message); }

    // departments.org_unit_id 回填：遞迴向上找到 subsidiary/group 祖先
    try {
      const nullDepts = db.exec("SELECT ROWID, name FROM departments WHERE org_unit_id IS NULL");
      if (nullDepts.length && nullDepts[0].values.length) {
        for (const [rowid, deptName] of nullDepts[0].values) {
          // 找到同名 org_unit (type=department)
          const ouResult = db.exec(
            "SELECT parent_id FROM org_units WHERE name = ? AND type = 'department' LIMIT 1",
            [deptName]
          );
          let companyId = null;
          if (ouResult.length && ouResult[0].values.length) {
            // 遞迴向上找 subsidiary/group
            let currentId = ouResult[0].values[0][0];
            for (let i = 0; i < 10; i++) {
              if (!currentId) break;
              const unit = db.exec("SELECT id, type, parent_id FROM org_units WHERE id = ?", [currentId]);
              if (!unit.length || !unit[0].values.length) break;
              const [uid, utype, parentId] = unit[0].values[0];
              if (utype === 'subsidiary' || utype === 'group') { companyId = uid; break; }
              currentId = parentId;
            }
          }
          if (!companyId) {
            // 孤兒部門：歸入集團
            const groupResult = db.exec("SELECT id FROM org_units WHERE type = 'group' LIMIT 1");
            companyId = groupResult.length && groupResult[0].values.length ? groupResult[0].values[0][0] : null;
            if (companyId) console.warn(`  ⚠️ departments「${deptName}」無對應 org_unit，歸入集團`);
          }
          if (companyId) {
            db.run("UPDATE departments SET org_unit_id = ? WHERE ROWID = ?", [companyId, rowid]);
          }
        }
        changed = true;
      }
    } catch (e) { /* departments 表可能尚未建立 */ }

    // 暫時關閉 FK 以允許表重建
    try { db.run('PRAGMA foreign_keys = OFF'); } catch (e) { /* ignore */ }

    // departments 表重建：移除 name UNIQUE，改為 UNIQUE(name, org_unit_id)
    try {
      const deptTableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='departments'");
      if (deptTableInfo.length && deptTableInfo[0].values.length) {
        const createSql = deptTableInfo[0].values[0][0];
        if (createSql && /name\s+TEXT\s+UNIQUE/i.test(createSql)) {
          console.log('🔄 Rebuilding departments: removing name UNIQUE, adding UNIQUE(name, org_unit_id)...');
          const oldCount = db.exec('SELECT COUNT(*) FROM departments')[0].values[0][0];
          try { db.run('DROP TABLE IF EXISTS departments_new'); } catch (e) { /* ignore */ }
          db.run(`CREATE TABLE departments_new (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            code TEXT,
            sort_order INTEGER DEFAULT 0,
            manager_id TEXT REFERENCES employees(id),
            head_count INTEGER DEFAULT 0,
            value TEXT DEFAULT '[]',
            kpi_items TEXT DEFAULT '[]',
            competency_focus TEXT DEFAULT '[]',
            org_unit_id TEXT REFERENCES org_units(id),
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(name, org_unit_id)
          )`);
          // 此時 responsibilities 已被先前的 D-16 rename 區塊改為 value
          db.run('INSERT INTO departments_new (id, name, code, sort_order, manager_id, head_count, value, kpi_items, competency_focus, org_unit_id, created_at) SELECT id, name, code, sort_order, manager_id, head_count, value, kpi_items, competency_focus, org_unit_id, created_at FROM departments');
          const newCount = db.exec('SELECT COUNT(*) FROM departments_new')[0].values[0][0];
          if (newCount !== oldCount) {
            db.run('DROP TABLE departments_new');
            throw new Error(`Row count mismatch: old=${oldCount}, new=${newCount}`);
          }
          db.run('DROP TABLE departments');
          db.run('ALTER TABLE departments_new RENAME TO departments');
          console.log(`✅ departments rebuilt: ${newCount} rows, UNIQUE(name, org_unit_id)`);
          changed = true;
        }
      }
    } catch (e) {
      console.error('⚠️ departments rebuild failed:', e.message);
    }

    // department_positions 表重建：移除 FOREIGN KEY (department) REFERENCES departments(name)
    try {
      const dpTableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='department_positions'");
      if (dpTableInfo.length && dpTableInfo[0].values.length) {
        const dpSql = dpTableInfo[0].values[0][0];
        if (dpSql && /REFERENCES departments\(name\)/i.test(dpSql)) {
          console.log('🔄 Rebuilding department_positions: removing departments(name) FK...');
          const oldCount = db.exec('SELECT COUNT(*) FROM department_positions')[0].values[0][0];
          try { db.run('DROP TABLE IF EXISTS department_positions_new'); } catch (e) { /* ignore */ }
          db.run(`CREATE TABLE department_positions_new (
            id TEXT PRIMARY KEY,
            department TEXT NOT NULL,
            grade INTEGER NOT NULL,
            title TEXT NOT NULL,
            track TEXT NOT NULL,
            supervised_departments TEXT DEFAULT NULL,
            org_unit_id TEXT REFERENCES org_units(id),
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (grade) REFERENCES grade_levels(grade)
          )`);
          db.run('INSERT INTO department_positions_new SELECT id, department, grade, title, track, supervised_departments, org_unit_id, created_at FROM department_positions');
          const newCount = db.exec('SELECT COUNT(*) FROM department_positions_new')[0].values[0][0];
          if (newCount !== oldCount) {
            db.run('DROP TABLE department_positions_new');
            throw new Error(`Row count mismatch: old=${oldCount}, new=${newCount}`);
          }
          db.run('DROP TABLE department_positions');
          db.run('ALTER TABLE department_positions_new RENAME TO department_positions');
          db.run('CREATE INDEX IF NOT EXISTS idx_dp_org_unit ON department_positions(org_unit_id)');
          console.log(`✅ department_positions rebuilt: ${newCount} rows`);
          changed = true;
        }
      }
    } catch (e) {
      console.error('⚠️ department_positions rebuild failed:', e.message);
    }

    // job_descriptions 表：移除 FOREIGN KEY (department) REFERENCES departments(name)
    try {
      const jdTableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='job_descriptions'");
      if (jdTableInfo.length && jdTableInfo[0].values.length) {
        const jdSql = jdTableInfo[0].values[0][0];
        if (jdSql && /REFERENCES departments\(name\)/i.test(jdSql)) {
          console.log('🔄 Rebuilding job_descriptions: removing departments(name) FK...');
          const colInfo = db.exec("PRAGMA table_info(job_descriptions)")[0].values;
          const cols = colInfo.map(r => r[1]).join(', ');
          const oldCount = db.exec('SELECT COUNT(*) FROM job_descriptions')[0].values[0][0];
          try { db.run('DROP TABLE IF EXISTS job_descriptions_new'); } catch (e) { /* ignore */ }
          // 從原始 SQL 逐行過濾掉包含 departments(name) FK 的行
          const lines = jdSql.split('\n');
          const filtered = [];
          for (const line of lines) {
            if (/FOREIGN\s+KEY\s*\(department\)/i.test(line) && /departments\s*\(name\)/i.test(line)) continue;
            filtered.push(line);
          }
          // 修正尾隨逗號：找到最後一個 ) 前的逗號
          let joined = filtered.join('\n');
          joined = joined.replace(/,\s*(\n\s*\))/g, '$1');
          const newCreateSql = joined.replace(/CREATE TABLE[^(]*job_descriptions/i, 'CREATE TABLE job_descriptions_new');
          db.run(newCreateSql);
          db.run(`INSERT INTO job_descriptions_new SELECT ${cols} FROM job_descriptions`);
          const newCount = db.exec('SELECT COUNT(*) FROM job_descriptions_new')[0].values[0][0];
          if (newCount !== oldCount) {
            db.run('DROP TABLE job_descriptions_new');
            throw new Error(`Row count mismatch: old=${oldCount}, new=${newCount}`);
          }
          db.run('DROP TABLE job_descriptions');
          db.run('ALTER TABLE job_descriptions_new RENAME TO job_descriptions');
          console.log(`✅ job_descriptions rebuilt: ${newCount} rows`);
          changed = true;
        }
      }
    } catch (e) {
      console.error('⚠️ job_descriptions rebuild failed:', e.message);
    }

    // 重新啟用 FK
    try { db.run('PRAGMA foreign_keys = ON'); } catch (e) { /* ignore */ }

    // department_collaborations 新表
    try {
      db.run(`CREATE TABLE IF NOT EXISTS department_collaborations (
        id TEXT PRIMARY KEY,
        source_dept_id TEXT NOT NULL,
        target_dept_id TEXT NOT NULL,
        relation_type TEXT NOT NULL CHECK(relation_type IN ('parallel','downstream')),
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )`);
      changed = true;
    } catch (e) { /* 表已存在 */ }

    // employees 表新增欄位（候選人→員工串連）
    for (const sql of EMPLOYEE_MIGRATIONS) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // users 表新增欄位（首次登入強制改密碼）
    for (const sql of USER_MIGRATIONS) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // interviews 表新增欄位
    for (const sql of INTERVIEW_MIGRATIONS) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // role_feature_perms 表擴 3 欄（rbac-row-level-and-interview-scope）
    for (const sql of ROLE_FEATURE_PERMS_MIGRATIONS) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // cross-company-employment-and-naming-rules (D-10 + D-14 + D-15)
    // 跨公司任職表 + 代碼命名規則表 + 既有員工 backfill；雙清單共用
    for (const sql of CROSS_COMPANY_NAMING_MIGRATIONS) {
      try { db.run(sql); changed = true; } catch (e) { /* 表 / 索引已存在，或 backfill 為空時忽略 */ }
    }

    // templates 表新增草稿欄位（has_draft, draft_pdf_base64, draft_mapping_config）
    const templateMigrations = [
      'ALTER TABLE templates ADD COLUMN has_draft INTEGER DEFAULT 0',
      'ALTER TABLE templates ADD COLUMN draft_pdf_base64 TEXT',
      'ALTER TABLE templates ADD COLUMN draft_mapping_config TEXT'
    ];
    for (const sql of templateMigrations) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // 子公司資料關聯遷移：10 張表加入 org_unit_id，預設歸屬到根組織
    const subsidiaryMigrations = [
      { table: 'job_descriptions', index: 'idx_jd_org_unit' },
      { table: 'competencies', index: 'idx_comp_org_unit' },
      { table: 'grade_salary_levels', index: 'idx_gsl_org_unit' },
      { table: 'department_positions', index: 'idx_dp_org_unit' },
      { table: 'promotion_criteria', index: 'idx_pc_org_unit' },
      { table: 'career_paths', index: 'idx_cp_org_unit' },
      { table: 'jobs', index: 'idx_jobs_org_unit' },
      { table: 'candidates', index: 'idx_cand_org_unit' },
      { table: 'talent_pool', index: 'idx_tp_org_unit' },
      { table: 'meetings', index: 'idx_meet_org_unit' },
      { table: 'grade_tracks', index: 'idx_gt_org_unit' },
      { table: 'grade_change_history', index: 'idx_gch_org_unit' }
    ];
    for (const { table, index } of subsidiaryMigrations) {
      try {
        db.run(`ALTER TABLE ${table} ADD COLUMN org_unit_id TEXT REFERENCES org_units(id)`);
        changed = true;
      } catch (e) { /* 欄位已存在則忽略 */ }
      try {
        db.run(`CREATE INDEX IF NOT EXISTS ${index} ON ${table}(org_unit_id)`);
      } catch (e) { /* 索引已存在 */ }
    }

    // grade_track_entries 新表（軌道獨立實體）
    try {
      db.run(`CREATE TABLE IF NOT EXISTS grade_track_entries (
        id TEXT PRIMARY KEY,
        grade INTEGER NOT NULL,
        track TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        education_requirement TEXT DEFAULT '',
        responsibility_description TEXT DEFAULT '',
        required_skills_and_training TEXT DEFAULT '',
        org_unit_id TEXT REFERENCES org_units(id),
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE(grade, track, org_unit_id),
        FOREIGN KEY (grade) REFERENCES grade_levels(grade)
      )`);
      changed = true;
    } catch (e) { /* 表已存在 */ }

    // grade_track_entries 新增 required_skills_and_training 欄位（既有表遷移）
    try {
      db.run("ALTER TABLE grade_track_entries ADD COLUMN required_skills_and_training TEXT DEFAULT ''");
      changed = true;
    } catch (e) { /* 欄位已存在則忽略 */ }

    // grade_salary_levels 移除 code UNIQUE 約束，改為複合唯一索引 (code, org_unit_id)
    // SQLite 不支援 ALTER TABLE DROP CONSTRAINT，需透過 recreate table 方式
    try {
      const tableInfo = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='grade_salary_levels'");
      if (tableInfo.length && tableInfo[0].values.length) {
        const createSql = tableInfo[0].values[0][0];
        // 檢查是否仍有 `code TEXT UNIQUE` 約束
        if (createSql && /code\s+TEXT\s+UNIQUE/i.test(createSql)) {
          console.log('🔄 Migrating grade_salary_levels: removing code UNIQUE constraint...');
          // 1. 建立新表（無 UNIQUE 在 code 上）
          db.run(`CREATE TABLE grade_salary_levels_new (
            id TEXT PRIMARY KEY,
            grade INTEGER NOT NULL,
            code TEXT NOT NULL,
            salary INTEGER NOT NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            org_unit_id TEXT REFERENCES org_units(id),
            FOREIGN KEY (grade) REFERENCES grade_levels(grade)
          )`);
          // 2. 複製資料
          db.run(`INSERT INTO grade_salary_levels_new SELECT id, grade, code, salary, sort_order, created_at, org_unit_id FROM grade_salary_levels`);
          // 3. 刪除舊表
          db.run('DROP TABLE grade_salary_levels');
          // 4. 重新命名
          db.run('ALTER TABLE grade_salary_levels_new RENAME TO grade_salary_levels');
          // 5. 重建索引
          db.run('CREATE INDEX IF NOT EXISTS idx_gsl_org_unit ON grade_salary_levels(org_unit_id)');
          console.log('✅ grade_salary_levels migration complete');
          changed = true;
        }
      }
    } catch (e) {
      console.error('⚠️ grade_salary_levels migration failed:', e.message);
    }

    // 建立複合唯一索引（冪等）
    try {
      // 移除舊索引，修復重複代碼後建立 UNIQUE(code, org_unit_id)
      try { db.run('DROP INDEX IF EXISTS idx_gsl_code_org'); } catch (e) { /* 不存在 */ }

      // 修復同一 org 內跨職等重複代碼（遞延較高職等代碼）
      try {
        const dupeResult = db.exec("SELECT code, org_unit_id FROM grade_salary_levels WHERE org_unit_id IS NOT NULL GROUP BY code, org_unit_id HAVING COUNT(*) > 1");
        if (dupeResult.length > 0 && dupeResult[0].values.length > 0) {
          const orgIds = [...new Set(dupeResult[0].values.map(r => r[1]))];
          for (const orgId of orgIds) {
            const gradesResult = db.exec(`SELECT DISTINCT grade FROM grade_salary_levels WHERE org_unit_id = ? ORDER BY grade`, [orgId]);
            if (gradesResult.length === 0) continue;
            const grades = gradesResult[0].values.map(r => r[0]);
            let prevMaxNum = 0;
            for (const grade of grades) {
              const stmt = db.prepare('SELECT id, code, salary, sort_order FROM grade_salary_levels WHERE grade = ? AND org_unit_id = ? ORDER BY sort_order');
              stmt.bind([grade, orgId]);
              const salaries = [];
              while (stmt.step()) salaries.push(stmt.getAsObject());
              stmt.free();
              let minNum = Infinity, maxNum = 0;
              for (const s of salaries) {
                const match = s.code.match(/^([A-Za-z]+)(\d+)$/);
                if (match) { const n = parseInt(match[2]); minNum = Math.min(minNum, n); maxNum = Math.max(maxNum, n); }
              }
              if (prevMaxNum > 0 && minNum <= prevMaxNum) {
                const shift = prevMaxNum - minNum + 1;
                db.run('DELETE FROM grade_salary_levels WHERE grade = ? AND org_unit_id = ?', [grade, orgId]);
                let newMax = 0;
                for (const s of salaries) {
                  const match = s.code.match(/^([A-Za-z]+)(\d+)$/);
                  if (match) {
                    const newNum = parseInt(match[2]) + shift;
                    const newCode = match[1] + String(newNum).padStart(match[2].length, '0');
                    const newId = `sal-${grade}-${s.sort_order}-${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
                    db.run('INSERT INTO grade_salary_levels (id, grade, code, salary, sort_order, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)', [newId, grade, newCode, s.salary, s.sort_order, orgId]);
                    newMax = Math.max(newMax, newNum);
                  }
                }
                prevMaxNum = newMax;
              } else {
                prevMaxNum = maxNum;
              }
            }
          }
          console.log('🔄 Fixed duplicate salary codes across grades');
        }
      } catch (e) { console.warn('⚠️ Salary code dedup:', e.message); }

      db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_gsl_code_org ON grade_salary_levels(code, org_unit_id)');

      // 禁止 org_unit_id = NULL（SQLite UNIQUE 不擋 NULL，用 trigger 強制）
      const nullGuardTables = ['grade_salary_levels', 'grade_track_entries', 'promotion_criteria', 'department_positions'];
      for (const tbl of nullGuardTables) {
        try {
          db.run(`CREATE TRIGGER IF NOT EXISTS trg_${tbl}_no_null_org BEFORE INSERT ON ${tbl} WHEN NEW.org_unit_id IS NULL BEGIN SELECT RAISE(ABORT, '${tbl}: org_unit_id cannot be NULL'); END`);
          db.run(`CREATE TRIGGER IF NOT EXISTS trg_${tbl}_no_null_org_upd BEFORE UPDATE ON ${tbl} WHEN NEW.org_unit_id IS NULL BEGIN SELECT RAISE(ABORT, '${tbl}: org_unit_id cannot be NULL'); END`);
        } catch (e) { /* trigger 已存在 */ }
      }
    } catch (e) { /* 索引已存在或 org_unit_id 尚未加入 */ }

    // 將 org_unit_id 為 NULL 的既有資料歸屬到根組織（type=group 的頂層節點）
    // 注意：grade_salary_levels 排除在外，因為 NULL 代表「集團預設」薪資
    try {
      const rootOrg = db.exec("SELECT id FROM org_units WHERE type = 'group' AND (parent_id IS NULL OR parent_id = '') LIMIT 1");
      if (rootOrg.length && rootOrg[0].values.length) {
        const rootId = rootOrg[0].values[0][0];
        for (const { table } of subsidiaryMigrations) {
          if (table === 'grade_salary_levels') continue; // NULL = 集團預設，不歸屬到根組織
          db.run(`UPDATE ${table} SET org_unit_id = ? WHERE org_unit_id IS NULL`, [rootId]);
        }
        // employees 表已有 org_unit_id 欄位（在 initTenantSchema 中建立），但既有資料可能為 NULL
        db.run(`UPDATE employees SET org_unit_id = ? WHERE org_unit_id IS NULL`, [rootId]);
        // 注意：不再重設 grade_salary_levels 的 org_unit_id，因為使用者可能透過 Demo集團視圖
        // 儲存了特定公司的薪資碼（如 DE 系列），強制 reset 會導致資料混入集團預設

        // 一次性修正：將被錯誤歸入集團預設 (NULL) 的非 BS 前綴薪資碼歸還給根組織
        try {
          const misplacedCount = db.exec(
            "SELECT COUNT(*) FROM grade_salary_levels WHERE org_unit_id IS NULL AND code NOT LIKE 'BS%'"
          );
          if (misplacedCount.length && misplacedCount[0].values[0][0] > 0) {
            db.run(
              `UPDATE grade_salary_levels SET org_unit_id = ? WHERE org_unit_id IS NULL AND code NOT LIKE 'BS%'`,
              [rootId]
            );
            console.log(`  ✅ 已修正 ${misplacedCount[0].values[0][0]} 筆非 BS 薪資碼歸屬（NULL → ${rootId}）`);
          }
        } catch (e) { /* 忽略 */ }

        changed = true;
      }
    } catch (e) { /* org_units 表可能不存在 */ }

    // ── 批次匯入表遷移（import_jobs + import_results） ──
    try {
      db.exec(IMPORT_TABLES_SQL);
      changed = true;
    } catch (e) { /* 表已存在 */ }

    // ── job_descriptions 審核流程欄位遷移 ──
    // 補齊 create-new-version / submit-review / approve / reject / unarchive 需要的欄位
    const jdApprovalMigrations = [
      "ALTER TABLE job_descriptions ADD COLUMN current_version TEXT DEFAULT '1.0'",
      'ALTER TABLE job_descriptions ADD COLUMN rejected_reason TEXT',
      'ALTER TABLE job_descriptions ADD COLUMN approved_by TEXT',
      'ALTER TABLE job_descriptions ADD COLUMN approved_at TEXT',
      'ALTER TABLE job_descriptions ADD COLUMN submitted_by TEXT',
      'ALTER TABLE job_descriptions ADD COLUMN submitted_at TEXT'
    ];
    for (const sql of jdApprovalMigrations) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // ── 面試決策欄位遷移（0003_add_decision_fields） ──
    // candidates +3 欄（薪資核定）、invitation_decisions +5 欄（簽核）、jobs +1 欄（grade）
    const decisionMigrations = [
      'ALTER TABLE candidates ADD COLUMN approved_salary_type INTEGER',
      'ALTER TABLE candidates ADD COLUMN approved_salary_amount INTEGER',
      'ALTER TABLE candidates ADD COLUMN approved_salary_out_of_range INTEGER DEFAULT 0',
      "ALTER TABLE invitation_decisions ADD COLUMN approval_status TEXT DEFAULT 'NONE'",
      'ALTER TABLE invitation_decisions ADD COLUMN approver_id TEXT',
      'ALTER TABLE invitation_decisions ADD COLUMN approved_at TEXT',
      'ALTER TABLE invitation_decisions ADD COLUMN approval_note TEXT',
      'ALTER TABLE invitation_decisions ADD COLUMN submitted_for_approval_at TEXT',
      'ALTER TABLE jobs ADD COLUMN grade INTEGER REFERENCES grade_levels(grade)'
    ];
    for (const sql of decisionMigrations) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

    // ── 內部推薦邀請（HR 代發起） ──
    try {
      db.run(`CREATE TABLE IF NOT EXISTS referral_invitations (
        id TEXT PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        job_id TEXT NOT NULL,
        recommender_employee_id TEXT NOT NULL,
        candidate_email TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        custom_message TEXT,
        expires_at TEXT NOT NULL,
        submitted_at TEXT,
        submitted_candidate_id TEXT,
        cancel_reason TEXT,
        created_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT,
        FOREIGN KEY (job_id) REFERENCES jobs(id),
        FOREIGN KEY (recommender_employee_id) REFERENCES employees(id),
        FOREIGN KEY (submitted_candidate_id) REFERENCES candidates(id),
        FOREIGN KEY (created_by) REFERENCES employees(id)
      )`);
      changed = true;
    } catch (e) { /* 表已存在 */ }

    try { db.run('ALTER TABLE candidates ADD COLUMN source_detail TEXT'); changed = true; } catch (e) { /* 欄位已存在 */ }

    try {
      db.run('CREATE INDEX IF NOT EXISTS idx_referral_invitations_job_status ON referral_invitations(job_id, status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_referral_invitations_token ON referral_invitations(token)');
      db.run(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_invitations_pending_unique " +
        "ON referral_invitations(job_id, candidate_email) WHERE status = 'pending'"
      );
      changed = true;
    } catch (e) { /* 索引已存在 */ }

    // ── 職缺多平台發布（job_publications 1:N 對 jobs） ──
    try {
      db.run(`CREATE TABLE IF NOT EXISTS job_publications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        platform_job_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK(status IN ('pending', 'syncing', 'synced', 'failed', 'closed')),
        platform_fields TEXT,
        sync_error TEXT,
        last_sync_attempt_at TEXT,
        published_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT
      )`);
      changed = true;
    } catch (e) { /* 表已存在 */ }

    try {
      db.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_job_publications_job_platform ' +
        'ON job_publications(job_id, platform)'
      );
      db.run(
        'CREATE INDEX IF NOT EXISTS idx_job_publications_status ' +
        'ON job_publications(status)'
      );
      changed = true;
    } catch (e) { /* 索引已存在 */ }

    // 冪等遷移：既有 jobs.job104_no 塞入一筆 platform='104' 紀錄
    try {
      const migrationResult = db.exec(`
        INSERT INTO job_publications (
          id, job_id, platform, platform_job_id, status,
          platform_fields, published_at, created_at
        )
        SELECT
          lower(hex(randomblob(16))),
          j.id, '104', j.job104_no,
          CASE j.sync_status
            WHEN '104_synced' THEN 'synced'
            ELSE 'pending'
          END,
          j.job104_data,
          j.synced_at,
          COALESCE(j.created_at, datetime('now'))
        FROM jobs j
        WHERE j.job104_no IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM job_publications p
            WHERE p.job_id = j.id AND p.platform = '104'
          )
      `);
      const inserted = db.getRowsModified();
      if (inserted > 0) {
        console.log(`  ✅ job_publications: 遷移 ${inserted} 筆歷史 104 紀錄`);
        changed = true;
      }
    } catch (e) {
      console.warn('  ⚠️ job_publications 歷史資料遷移失敗：', e.message);
    }

    // ── Feature-based Permission 遷移（新舊並存） ──

    // 建立 features / role_feature_perms 表（冪等）
    try {
      db.exec(FEATURE_TABLES_SQL);
      changed = true;
    } catch (e) { /* 表已存在 */ }

    // ── Feature ID 格式遷移 v2（recruitment_jobs → L1.jobs） ──
    // 清除所有舊格式 ID（無論新 ID 是否已存在）；seedFeatureData 會重新插入正確資料
    const OLD_IDS_TO_REMOVE = [
      'recruitment_jobs', 'ai_interview', 'employee_profile', 'talent_pool',
      'meeting', 'grade_matrix', 'competency_library', 'job_description',
      'competency_assessment', 'competency_gap', 'organization',
      'user_management', 'export', 'audit_log', 'career_path', 'ai_career',
      'SYS.export'
    ];
    for (const oldId of OLD_IDS_TO_REMOVE) {
      try {
        db.run('DELETE FROM role_feature_perms WHERE feature_id = ?', [oldId]);
        db.run('DELETE FROM features WHERE id = ?', [oldId]);
      } catch (e) { /* 不存在則忽略 */ }
    }
    changed = true;

    // 插入 feature 種子資料（40 個預定義業務功能，L1-L6 + SYS）
    seedFeatureData(db);

    // 更新既有 feature 名稱以對齊側邊欄（INSERT OR IGNORE 不更新已存在記錄）
    for (const f of FEATURE_SEED_DATA) {
      try {
        db.run('UPDATE features SET name = ?, module = ?, sort_order = ? WHERE id = ?',
          [f.name, f.module, f.sort_order, f.id]);
      } catch (e) { /* 忽略 */ }
    }

    // 為既有租戶補入 interviewer 系統角色（rbac-row-level-and-interview-scope）
    // 新建租戶由 platform.js seedTenantRBAC 直接 seed；此處僅針對已存在但無此角色的租戶
    try {
      const existing = db.exec("SELECT id FROM roles WHERE name = 'interviewer' AND is_system = 1");
      if (!existing.length || !existing[0].values.length) {
        const { randomUUID } = require('crypto');
        db.run(
          'INSERT OR IGNORE INTO roles (id, name, description, scope_type, is_system) VALUES (?, ?, ?, ?, 1)',
          [randomUUID(), 'interviewer', '面試官（僅見被指派候選人）', 'global']
        );
        changed = true;
      }
    } catch (e) {
      console.error('⚠️ interviewer role backfill failed:', e.message);
    }

    // 為系統預設角色插入 feature 權限（冪等：INSERT OR IGNORE）
    try {
      const systemRoles = db.exec(
        "SELECT id, name FROM roles WHERE is_system = 1 AND name IN ('super_admin','subsidiary_admin','hr_manager','dept_manager','employee','interviewer')"
      );
      if (systemRoles.length && systemRoles[0].values.length) {
        const roleMap = {};
        for (const row of systemRoles[0].values) {
          roleMap[row[1]] = row[0]; // name → id
        }
        seedDefaultRoleFeaturePerms(db, roleMap);
        changed = true;
      }
    } catch (e) {
      console.error('⚠️ Feature perm seed failed:', e.message);
    }

    // 為既有自訂角色（is_system=0）插入預設 feature perms（全部 none）
    try {
      const customRoles = db.exec(
        'SELECT r.id FROM roles r WHERE r.is_system = 0 AND r.id NOT IN (SELECT DISTINCT role_id FROM role_feature_perms)'
      );
      if (customRoles.length && customRoles[0].values.length) {
        for (const row of customRoles[0].values) {
          const roleId = row[0];
          for (const f of FEATURE_SEED_DATA) {
            try {
              const stmt = db.prepare(
                'INSERT OR IGNORE INTO role_feature_perms (role_id, feature_id, action_level, edit_scope, view_scope, can_approve, approve_scope, row_filter_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
              );
              stmt.bind([roleId, f.id, 'none', null, null, 0, null, null]);
              stmt.step();
              stmt.free();
            } catch (e) { /* 已存在則忽略 */ }
          }
        }
        changed = true;
      }
    } catch (e) {
      console.error('⚠️ Custom role feature perm migration failed:', e.message);
    }

    // ── 職等薪資資料歸屬遷移：消滅所有 org_unit_id = NULL ──
    // 每個組織單位（集團/子公司）各自擁有獨立的職等薪資資料
    try {
      const rootOrg2 = db.exec("SELECT id FROM org_units WHERE type = 'group' AND (parent_id IS NULL OR parent_id = '') LIMIT 1");
      if (rootOrg2.length && rootOrg2[0].values.length) {
        const groupId = rootOrg2[0].values[0][0];
        const gradeTables = ['grade_salary_levels', 'grade_track_entries', 'promotion_criteria', 'department_positions'];
        for (const table of gradeTables) {
          try {
            const countResult = db.exec(`SELECT COUNT(*) FROM ${table} WHERE org_unit_id IS NULL`);
            const nullCount = countResult.length ? countResult[0].values[0][0] : 0;
            if (nullCount > 0) {
              // 先嘗試 UPDATE；如因 UNIQUE constraint 失敗（目標已有同 key 資料），改為 DELETE 重複的 NULL 記錄
              try {
                db.run(`UPDATE ${table} SET org_unit_id = ? WHERE org_unit_id IS NULL`, [groupId]);
                console.log(`  ✅ ${table}: ${nullCount} 筆 NULL → ${groupId}`);
              } catch (updateErr) {
                db.run(`DELETE FROM ${table} WHERE org_unit_id IS NULL`);
                console.log(`  ✅ ${table}: ${nullCount} 筆 NULL 記錄已刪除（集團已有覆寫資料）`);
              }
              changed = true;
            }
          } catch (e) { /* 表可能不存在 */ }
        }
      }
    } catch (e) { /* org_units 表可能不存在 */ }

    if (changed) {
      adapter.save();
    }
  }

  /**
   * 取得已載入的租戶數量
   * @returns {number}
   */
  get loadedCount() {
    return this._cache.size;
  }

  /**
   * 關閉所有租戶 DB
   */
  closeAll() {
    for (const [tenantId] of this._cache) {
      this.unloadDB(tenantId);
    }
  }
}

// 單例
const tenantDBManager = new TenantDBManager();

module.exports = { tenantDBManager, TenantDBManager };
