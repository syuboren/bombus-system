/**
 * SQLite Database Initialization
 * Creates tables for the Onboarding Signing System
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'onboarding.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- 模板表
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    pdf_base64 TEXT,
    mapping_config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
  );

  -- 提交記錄表
  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    token TEXT UNIQUE,
    employee_name TEXT,
    employee_email TEXT,
    status TEXT DEFAULT 'DRAFT',
    form_data TEXT,
    signature_base64 TEXT,
    signed_at DATETIME,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id)
  );

  -- 版本歷史表
  CREATE TABLE IF NOT EXISTS template_versions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    mapping_config TEXT,
    pdf_base64 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (template_id) REFERENCES templates(id)
  );

  -- 建立索引
  CREATE INDEX IF NOT EXISTS idx_submissions_template ON submissions(template_id);
  CREATE INDEX IF NOT EXISTS idx_submissions_token ON submissions(token);
  CREATE INDEX IF NOT EXISTS idx_template_versions_template ON template_versions(template_id);
`);

console.log('✅ Database initialized successfully at:', dbPath);

module.exports = db;
