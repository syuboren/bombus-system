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
      logo_url TEXT,
      industry TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 遷移：為既有 tenants 表補齊新欄位
  const tenantCols = db.exec('PRAGMA table_info(tenants)')[0]?.values?.map(r => r[1]) || [];
  if (!tenantCols.includes('logo_url')) {
    db.run('ALTER TABLE tenants ADD COLUMN logo_url TEXT');
  }
  if (!tenantCols.includes('industry')) {
    db.run('ALTER TABLE tenants ADD COLUMN industry TEXT');
  }
  if (!tenantCols.includes('feature_overrides')) {
    db.run('ALTER TABLE tenants ADD COLUMN feature_overrides TEXT');
  }
  if (!tenantCols.includes('feature_overrides_note')) {
    db.run('ALTER TABLE tenants ADD COLUMN feature_overrides_note TEXT');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      max_users INTEGER DEFAULT 50,
      max_subsidiaries INTEGER DEFAULT 5,
      max_storage_gb INTEGER DEFAULT 5,
      features TEXT DEFAULT '{}',
      price_monthly REAL DEFAULT 0,
      price_yearly REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 遷移：為既有 subscription_plans 表補齊新欄位
  const planCols = db.exec('PRAGMA table_info(subscription_plans)')[0]?.values?.map(r => r[1]) || [];
  if (!planCols.includes('max_storage_gb')) {
    db.run('ALTER TABLE subscription_plans ADD COLUMN max_storage_gb INTEGER DEFAULT 5');
  }
  if (!planCols.includes('price_monthly')) {
    db.run('ALTER TABLE subscription_plans ADD COLUMN price_monthly REAL DEFAULT 0');
  }
  if (!planCols.includes('price_yearly')) {
    db.run('ALTER TABLE subscription_plans ADD COLUMN price_yearly REAL DEFAULT 0');
  }
  if (!planCols.includes('is_active')) {
    db.run('ALTER TABLE subscription_plans ADD COLUMN is_active INTEGER DEFAULT 1');
  }

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

  // 公開 token 索引（候選人未登入訪問公開端點時解析 tenant）
  db.run(`
    CREATE TABLE IF NOT EXISTS public_tokens (
      token TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_public_tokens_tenant ON public_tokens(tenant_id)');
  } catch (e) { /* 索引已存在 */ }

  // 遷移：已啟用 L1.recruitment 的方案自動納入 L1.decision（面試決策）
  // 先用 LIKE 過濾，跳過已含 L1.decision 的方案；遷移完成後此段會是 no-op
  try {
    const plans = db.exec(
      "SELECT id, features FROM subscription_plans WHERE features LIKE '%L1.recruitment%' AND features NOT LIKE '%L1.decision%'"
    )[0];
    if (plans && plans.values.length) {
      for (const [planId, featuresJson] of plans.values) {
        if (!featuresJson) continue;
        let features;
        try { features = JSON.parse(featuresJson); } catch (e) { continue; }
        if (Array.isArray(features) && features.includes('L1.recruitment') && !features.includes('L1.decision')) {
          const idx = features.indexOf('L1.recruitment');
          features.splice(idx + 1, 0, 'L1.decision');
          db.run('UPDATE subscription_plans SET features = ? WHERE id = ?', [JSON.stringify(features), planId]);
        }
      }
    }
  } catch (e) { /* 方案表尚未建立或結構不符則忽略 */ }

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
