/**
 * SQLite Database Connection using sql.js (Pure JS)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'onboarding.db');

let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
    console.log('📂 Loaded existing database from:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      is_public INTEGER DEFAULT 0,
      is_required INTEGER DEFAULT 0,
      description TEXT,
      pdf_base64 TEXT,
      mapping_config TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      template_version INTEGER DEFAULT 1,
      token TEXT UNIQUE,
      employee_id TEXT,
      employee_name TEXT,
      employee_email TEXT,
      status TEXT DEFAULT 'DRAFT',
      form_data TEXT,
      signature_base64 TEXT,
      signed_at TEXT,
      ip_address TEXT,
      approval_status TEXT DEFAULT 'NONE',
      approver_id TEXT,
      approval_note TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (template_id) REFERENCES templates(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS template_versions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      mapping_config TEXT,
      pdf_base64 TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (template_id) REFERENCES templates(id)
    )
  `);

  // 職缺資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT,
      description TEXT,
      recruiter TEXT,
      status TEXT DEFAULT 'draft',
      publish_date TEXT,
      jd_id TEXT,
      
      -- 104 整合欄位
      job104_no TEXT,
      sync_status TEXT DEFAULT 'local_only',
      job104_data TEXT,
      synced_at TEXT,
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);

  // 應徵者資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'new',
      stage TEXT DEFAULT 'Collected', -- Collected, Invited, Offered, Rejected
      scoring_status TEXT DEFAULT 'Pending', -- Pending, Scoring, Scored
      score INTEGER DEFAULT 0,
      apply_date TEXT,
      
      -- 詳細履歷欄位
      education TEXT,
      experience TEXT,
      experience_years INTEGER DEFAULT 0,
      skills TEXT,           -- JSON string or comma-separated
      resume_url TEXT,
      ai_summary TEXT,
      thank_you_sent_at TEXT,
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `);

  // 面試邀約資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS interview_invitations (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      status TEXT DEFAULT 'Pending', -- Pending, Confirmed, Cancelled, Declined
      proposed_slots TEXT, -- JSON array of strings (HR 建議的時段)
      selected_slots TEXT, -- JSON array of strings (候選人勾選的時段)
      message TEXT,
      reply_deadline TEXT,
      confirmed_at TEXT,
      
      -- 候選人回覆相關
      response_token TEXT UNIQUE, -- 專屬回覆連結 Token
      candidate_response TEXT, -- null / 'accepted' / 'declined'
      reschedule_note TEXT, -- 改期備註
      responded_at TEXT,
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `);

  // 面試記錄資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      interviewer_id TEXT,
      round INTEGER DEFAULT 1,
      interview_at TEXT,
      location TEXT,
      meeting_link TEXT, -- 線上會議連結 (僅線上面試需要)
      evaluation_json TEXT, -- detailed scores and comments
      result TEXT DEFAULT 'Pending', -- Pending, Pass, Hold, Fail
      remark TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `);

  // 錄取/邀約決策資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS invitation_decisions (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      decision TEXT NOT NULL, -- Invited, Rejected
      decided_by TEXT,
      reason TEXT,
      decided_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    )
  `);

  // Save to file
  saveDatabase();
  console.log('✅ Database initialized successfully');

  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

function getDatabase() {
  return db;
}

// Helper functions that mimic better-sqlite3 API
function prepare(sql) {
  return {
    all: (...params) => {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (e) {
        console.error('SQL Error:', e.message, 'SQL:', sql);
        return [];
      }
    },
    get: (...params) => {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      } catch (e) {
        console.error('SQL Error:', e.message, 'SQL:', sql);
        return null;
      }
    },
    run: (...params) => {
      try {
        // sql.js 使用 stmt.bind 和 stmt.step 執行
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          stmt.bind(params);
        }
        stmt.step();
        stmt.free();
        saveDatabase();
        return { changes: db.getRowsModified() };
      } catch (e) {
        console.error('SQL Error:', e?.message || e, 'SQL:', sql);
        return { changes: 0 };
      }
    }
  };
}

module.exports = { initDatabase, getDatabase, prepare, saveDatabase };
