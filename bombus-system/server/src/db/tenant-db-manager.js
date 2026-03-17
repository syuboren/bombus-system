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
const { EMPLOYEE_MIGRATIONS, USER_MIGRATIONS, INTERVIEW_MIGRATIONS } = require('./tenant-schema');

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
    const deptMigrations = [
      'ALTER TABLE departments ADD COLUMN manager_id TEXT REFERENCES employees(id)',
      'ALTER TABLE departments ADD COLUMN head_count INTEGER DEFAULT 0',
      "ALTER TABLE departments ADD COLUMN responsibilities TEXT DEFAULT '[]'",
      "ALTER TABLE departments ADD COLUMN kpi_items TEXT DEFAULT '[]'",
      "ALTER TABLE departments ADD COLUMN competency_focus TEXT DEFAULT '[]'"
    ];
    for (const sql of deptMigrations) {
      try { db.run(sql); changed = true; } catch (e) { /* 欄位已存在則忽略 */ }
    }

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
      db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_gsl_code_org ON grade_salary_levels(code, COALESCE(org_unit_id, '__NULL__'))");
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
