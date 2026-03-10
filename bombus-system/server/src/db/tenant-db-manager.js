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
