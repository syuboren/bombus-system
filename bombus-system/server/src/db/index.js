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
