/**
 * Platform Database — platform.db 初始化與管理
 *
 * 儲存平台級資料：租戶清單、訂閱方案、平台管理員、審計日誌。
 * 此 DB 永遠常駐記憶體，伺服器啟動時自動載入。
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { SqliteAdapter } = require('./db-adapter');

const DATA_DIR = path.join(__dirname, '../../data');
const PLATFORM_DB_PATH = path.join(DATA_DIR, 'platform.db');

/** @type {SqliteAdapter|null} */
let platformDB = null;

/**
 * 初始化 platform.db（載入或建立）
 * @returns {Promise<SqliteAdapter>}
 */
async function initPlatformDB() {
  if (platformDB) return platformDB;

  // 確保 data 目錄存在
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 確保 tenants 子目錄存在
  const tenantsDir = path.join(DATA_DIR, 'tenants');
  if (!fs.existsSync(tenantsDir)) {
    fs.mkdirSync(tenantsDir, { recursive: true });
  }

  const SQL = await initSqlJs();

  let db;
  if (fs.existsSync(PLATFORM_DB_PATH)) {
    const buffer = fs.readFileSync(PLATFORM_DB_PATH);
    db = new SQL.Database(buffer);
    console.log('📂 Loaded platform.db from:', PLATFORM_DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new platform.db');
  }

  platformDB = new SqliteAdapter(db, PLATFORM_DB_PATH);

  // 建立表結構
  createPlatformTables(platformDB);

  return platformDB;
}

/**
 * 建立平台級資料表
 * @param {SqliteAdapter} adapter
 */
function createPlatformTables(adapter) {
  const db = adapter.raw;

  db.run(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','suspended','deleted')),
      plan_id TEXT REFERENCES subscription_plans(id),
      db_file TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_users INTEGER DEFAULT 50,
      max_subsidiaries INTEGER DEFAULT 5,
      features TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS platform_admins (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      details TEXT,
      ip TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  adapter.save();
}

/**
 * 取得 platform.db 的 DBAdapter 實例
 * @returns {SqliteAdapter}
 */
function getPlatformDB() {
  if (!platformDB) {
    throw new Error('Platform DB not initialized. Call initPlatformDB() first.');
  }
  return platformDB;
}

module.exports = { initPlatformDB, getPlatformDB, PLATFORM_DB_PATH, DATA_DIR };
