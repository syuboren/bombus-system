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
const { seedDepartmentTemplates } = require('./seeds/dept-template-seed');

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

  // ─── 產業類別 lookup（D-16 industry-classification） ───
  db.run(`
    CREATE TABLE IF NOT EXISTS industries (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed 12 個預設產業（INSERT OR IGNORE 冪等）
  const DEFAULT_INDUSTRIES = [
    ['it-services', '資訊服務業', 10],
    ['tech', '科技業', 20],
    ['manufacturing', '製造業', 30],
    ['retail', '零售業', 40],
    ['food-service', '餐飲業', 50],
    ['healthcare', '醫療機構', 60],
    ['finance', '金融業', 70],
    ['nonprofit', '非營利組織', 80],
    ['education', '教育業', 90],
    ['construction', '建築業', 100],
    ['logistics', '物流業', 110],
    ['other', '其他', 999]
  ];
  for (const [code, name, order] of DEFAULT_INDUSTRIES) {
    db.run('INSERT OR IGNORE INTO industries (code, name, display_order) VALUES (?, ?, ?)', [code, name, order]);
  }

  // ─── 部門範本字典（D-16 department-template-import） ───
  db.run(`
    CREATE TABLE IF NOT EXISTS department_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      value TEXT DEFAULT '[]',
      is_common INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── 產業 × 範本指派 junction ───
  db.run(`
    CREATE TABLE IF NOT EXISTS industry_dept_assignments (
      id TEXT PRIMARY KEY,
      industry_code TEXT NOT NULL REFERENCES industries(code),
      dept_template_id TEXT NOT NULL REFERENCES department_templates(id) ON DELETE CASCADE,
      sizes_json TEXT NOT NULL DEFAULT '[]',
      display_order INTEGER DEFAULT 0,
      UNIQUE(industry_code, dept_template_id)
    )
  `);
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_assignments_industry ON industry_dept_assignments(industry_code)');
    db.run('CREATE INDEX IF NOT EXISTS idx_assignments_template ON industry_dept_assignments(dept_template_id)');
  } catch (e) { /* 索引已存在 */ }

  // tenants.industry 字串對映遷移（free-form → industries.code）
  // 冪等：已是有效 code 不動；不在對映表的字串改寫為 'other' 並警告
  const INDUSTRY_MIGRATION_MAP = {
    '製造業': 'manufacturing', '製造': 'manufacturing', 'Manufacturing': 'manufacturing',
    '科技業': 'tech', '科技': 'tech', 'Tech': 'tech', 'Technology': 'tech',
    '資訊服務業': 'it-services', 'IT Services': 'it-services', 'it services': 'it-services',
    '零售業': 'retail', '零售': 'retail', 'Retail': 'retail',
    '餐飲業': 'food-service', '餐飲': 'food-service', 'F&B': 'food-service',
    '醫療': 'healthcare', '醫療機構': 'healthcare', '醫療業': 'healthcare', 'Healthcare': 'healthcare',
    '金融業': 'finance', '金融': 'finance', 'Finance': 'finance',
    '非營利': 'nonprofit', '非營利組織': 'nonprofit', 'NPO': 'nonprofit',
    '教育': 'education', '教育業': 'education', 'Education': 'education',
    '建築': 'construction', '建築業': 'construction', 'Construction': 'construction',
    '物流': 'logistics', '物流業': 'logistics', 'Logistics': 'logistics'
  };
  try {
    const validCodes = new Set(DEFAULT_INDUSTRIES.map(([c]) => c));
    const tenantsResult = db.exec("SELECT id, industry FROM tenants WHERE industry IS NOT NULL AND industry != ''");
    if (tenantsResult.length && tenantsResult[0].values.length) {
      for (const [tenantId, industryStr] of tenantsResult[0].values) {
        if (validCodes.has(industryStr)) continue; // already migrated
        const mapped = INDUSTRY_MIGRATION_MAP[industryStr];
        if (mapped) {
          db.run('UPDATE tenants SET industry = ? WHERE id = ?', [mapped, tenantId]);
        } else {
          db.run('UPDATE tenants SET industry = ? WHERE id = ?', ['other', tenantId]);
          console.warn(`⚠️ Tenant ${tenantId}: industry '${industryStr}' 不在對映表，已歸入 'other'，請平台管理員手動修正`);
        }
      }
    }
  } catch (e) { /* tenants 表尚未建立或查詢失敗 */ }

  // Seed 部門範本（共通池 + 各產業專屬）
  try {
    seedDepartmentTemplates(db);
  } catch (e) {
    console.error('⚠️ 部門範本 seed 失敗:', e.message);
  }

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
