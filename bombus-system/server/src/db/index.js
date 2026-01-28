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
      decision TEXT NOT NULL, -- Offered, Rejected
      decided_by TEXT,
      reason TEXT,
      decided_at TEXT DEFAULT (datetime('now')),
      
      -- Offer 回覆相關欄位（當 decision = 'Offered' 時使用）
      response_token TEXT UNIQUE,        -- 專屬回覆連結 Token
      reply_deadline TEXT,               -- 回覆截止時間
      candidate_response TEXT,           -- 候選人回覆: accepted / declined
      responded_at TEXT,                 -- 回覆時間
      
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    )
  `);

  // ============================================================
  // 員工資料表 (Employee Management)
  // ============================================================
  
  // 1. 員工主表 (擴充版)
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_no TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      department TEXT,
      position TEXT,
      level TEXT,
      grade TEXT,
      manager_id TEXT,
      hire_date TEXT,
      contract_type TEXT DEFAULT 'full-time',
      work_location TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (manager_id) REFERENCES employees(id)
    )
  `);

  // 2. 員工學歷表
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_education (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      degree TEXT NOT NULL,
      school TEXT NOT NULL,
      major TEXT,
      graduation_year INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // 3. 員工技能表
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_skills (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      skill_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // 4. 員工證照表
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_certifications (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      cert_name TEXT NOT NULL,
      issued_date TEXT,
      expiry_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // ============================================================
  // 會議管理模組資料表 (Meeting Management)
  // ============================================================

  // 1. 會議主表
  db.run(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL, -- regular, project, cross-department, training, review
      status TEXT DEFAULT 'scheduled', -- scheduled, in-progress, completed, cancelled
      location TEXT,
      is_online INTEGER DEFAULT 0,
      meeting_link TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      duration INTEGER,
      recurrence TEXT DEFAULT 'none', -- none, daily, weekly, monthly
      recurrence_end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);

  // 2. 會議提醒設定
  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_reminders (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      timing TEXT NOT NULL, -- 1day, 1hour, 15min
      enabled INTEGER DEFAULT 1,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    )
  `);

  // 3. 會議出席人員
  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_attendees (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      employee_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      position TEXT,
      avatar TEXT,
      is_organizer INTEGER DEFAULT 0,
      is_required INTEGER DEFAULT 1,
      attendance_status TEXT DEFAULT 'pending', -- pending, accepted, declined, tentative
      signed_in INTEGER DEFAULT 0,
      signed_in_time TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    )
  `);

  // 添加 avatar 欄位（如果不存在）
  try {
    db.run(`ALTER TABLE meeting_attendees ADD COLUMN avatar TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // 4. 會議議程
  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_agenda_items (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      discussion_points TEXT, -- JSON array of discussion points
      presenter TEXT,
      duration INTEGER,
      status TEXT DEFAULT 'pending', -- pending, in-progress, discussed, skipped
      order_index INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    )
  `);

  // 確保 discussion_points 欄位存在（遷移）
  try {
    db.run(`ALTER TABLE meeting_agenda_items ADD COLUMN discussion_points TEXT`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }

  // 5. 會議結論與待辦事項
  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_conclusions (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      agenda_item_id TEXT,
      content TEXT NOT NULL,
      responsible_id TEXT,
      responsible_name TEXT,
      department TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'pending', -- pending, in-progress, completed, overdue
      progress INTEGER DEFAULT 0,
      progress_notes TEXT, -- JSON array
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    )
  `);

  // 6. 會議附件
  db.run(`
    CREATE TABLE IF NOT EXISTS meeting_attachments (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      size INTEGER,
      url TEXT NOT NULL,
      uploaded_by TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE
    )
  `);


  // ============================================================
  // 資料庫遷移與初始化
  // ============================================================
  migrateInvitationDecisionsTable();
  migrateEmployeesTable();
  initFullEmployeeData();

  // 清空會議資料（一次性執行，執行後請註解掉此行）
  // clearAllMeetingData();

  // Save to file
  saveDatabase();
  console.log('✅ Database initialized successfully');

  return db;
}

/**
 * 遷移 employees 資料表
 * 為現有資料表新增擴充欄位
 */
function migrateEmployeesTable() {
  try {
    // 取得現有欄位清單
    const columnsResult = db.exec(`PRAGMA table_info(employees)`);
    const existingColumns = columnsResult.length > 0
      ? columnsResult[0].values.map(row => row[1])
      : [];

    // 需要新增的欄位
    const columnsToAdd = [
      { name: 'employee_no', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'level', type: 'TEXT' },
      { name: 'grade', type: 'TEXT' },
      { name: 'manager_id', type: 'TEXT' },
      { name: 'hire_date', type: 'TEXT' },
      { name: 'contract_type', type: 'TEXT DEFAULT \'full-time\'' },
      { name: 'work_location', type: 'TEXT' }
    ];

    // 新增缺少的欄位
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        db.run(`ALTER TABLE employees ADD COLUMN ${col.name} ${col.type}`);
        console.log(`📝 Added column '${col.name}' to employees table`);
      }
    }
  } catch (error) {
    console.error('Migration error (employees):', error.message);
  }
}

/**
 * 初始化完整員工資料 (基本資料 + 學歷 + 技能 + 證照)
 */
function initFullEmployeeData() {
  try {
    // 檢查是否已有完整資料 (透過檢查 employee_no 是否有值)
    const hasFullData = db.prepare(`
      SELECT COUNT(*) as c FROM employees WHERE employee_no IS NOT NULL
    `).get().c;
    
    if (hasFullData > 0) {
      console.log('📋 Employee data already initialized, skipping...');
      return;
    }

    console.log('🌱 Seeding full employee data...');

    // 完整員工資料
    const employees = [
      {
        id: '1', employee_no: 'E2020001', name: '張志明', email: 'zhang.zm@company.com',
        phone: '0912-111-111', department: '研發部', position: '資深工程師',
        level: 'L4', grade: '技術職', manager_id: '5', hire_date: '2020-03-15',
        contract_type: 'full-time', work_location: '台北總部', avatar: '張', status: 'active',
        education: [
          { degree: '碩士', school: '國立台灣大學', major: '資訊工程', graduation_year: 2018 },
          { degree: '學士', school: '國立清華大學', major: '資訊工程', graduation_year: 2016 }
        ],
        skills: ['Angular', 'TypeScript', 'Node.js'],
        certifications: [
          { cert_name: 'AWS Certified', issued_date: '2023-06-01', expiry_date: '2026-06-01' },
          { cert_name: 'PMP', issued_date: '2022-01-15', expiry_date: null }
        ]
      },
      {
        id: '2', employee_no: 'E2021015', name: '林雅文', email: 'lin.yw@company.com',
        phone: '0923-222-222', department: '研發部', position: '前端工程師',
        level: 'L3', grade: '技術職', manager_id: '5', hire_date: '2021-06-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '林', status: 'active',
        education: [
          { degree: '學士', school: '國立交通大學', major: '資訊管理', graduation_year: 2020 }
        ],
        skills: ['React', 'Vue', 'CSS', 'JavaScript'],
        certifications: []
      },
      {
        id: '3', employee_no: 'E2022030', name: '王建國', email: 'wang.jg@company.com',
        phone: '0934-333-333', department: '業務部', position: '業務專員',
        level: 'L2', grade: '業務職', manager_id: '6', hire_date: '2022-09-10',
        contract_type: 'full-time', work_location: '台中辦公室', avatar: '王', status: 'active',
        education: [
          { degree: '學士', school: '東海大學', major: '企業管理', graduation_year: 2021 }
        ],
        skills: ['Sales', 'Negotiation', 'CRM'],
        certifications: [
          { cert_name: '業務專業證照', issued_date: '2023-03-01', expiry_date: null }
        ]
      },
      {
        id: '4', employee_no: 'E2024050', name: '陳美玲', email: 'chen.ml@company.com',
        phone: '0945-444-444', department: '人資部', position: 'HR 專員',
        level: 'L2', grade: '管理職', manager_id: '7', hire_date: '2024-08-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '陳', status: 'probation',
        education: [
          { degree: '碩士', school: '國立政治大學', major: '人力資源管理', graduation_year: 2024 }
        ],
        skills: ['Recruitment', 'Training', 'HRIS'],
        certifications: []
      },
      {
        id: '5', employee_no: 'E2019008', name: '李志偉', email: 'li.zw@company.com',
        phone: '0956-555-555', department: '研發部', position: '技術主管',
        level: 'L5', grade: '管理職', manager_id: '8', hire_date: '2019-01-15',
        contract_type: 'full-time', work_location: '台北總部', avatar: '李', status: 'active',
        education: [
          { degree: '碩士', school: '國立成功大學', major: '電機工程', graduation_year: 2015 },
          { degree: '學士', school: '國立中央大學', major: '資訊工程', graduation_year: 2013 }
        ],
        skills: ['Team Management', 'Architecture', 'DevOps', 'Java', 'Python'],
        certifications: [
          { cert_name: 'PMP', issued_date: '2020-05-01', expiry_date: '2026-05-01' },
          { cert_name: 'TOGAF', issued_date: '2021-08-01', expiry_date: null }
        ]
      },
      {
        id: '6', employee_no: 'E2018003', name: '黃雅琪', email: 'huang.yq@company.com',
        phone: '0967-666-666', department: '業務部', position: '業務經理',
        level: 'L4', grade: '管理職', manager_id: '8', hire_date: '2018-07-20',
        contract_type: 'full-time', work_location: '台北總部', avatar: '黃', status: 'active',
        education: [
          { degree: '碩士', school: '國立台北大學', major: '企業管理', graduation_year: 2016 }
        ],
        skills: ['Sales Management', 'Strategic Planning', 'Client Relations'],
        certifications: []
      },
      {
        id: '7', employee_no: 'E2017001', name: '吳俊賢', email: 'wu.jx@company.com',
        phone: '0978-777-777', department: '人資部', position: '人資經理',
        level: 'L4', grade: '管理職', manager_id: '8', hire_date: '2017-03-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '吳', status: 'active',
        education: [
          { degree: '碩士', school: '國立中山大學', major: '人力資源管理', graduation_year: 2015 }
        ],
        skills: ['HR Strategy', 'Labor Law', 'Compensation Design'],
        certifications: [
          { cert_name: '勞動法規師', issued_date: '2019-02-01', expiry_date: null }
        ]
      },
      {
        id: '8', employee_no: 'E2015001', name: '趙大偉', email: 'zhao.dw@company.com',
        phone: '0989-888-888', department: '管理部', position: '總經理',
        level: 'L6', grade: '高階管理', manager_id: null, hire_date: '2015-01-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '趙', status: 'active',
        education: [
          { degree: '博士', school: '美國史丹佛大學', major: '企業管理', graduation_year: 2010 },
          { degree: '碩士', school: '國立台灣大學', major: 'EMBA', graduation_year: 2005 }
        ],
        skills: ['Strategic Leadership', 'Corporate Governance', 'M&A'],
        certifications: []
      },
      {
        id: '9', employee_no: 'E2023040', name: '周小芳', email: 'zhou.xf@company.com',
        phone: '0911-999-999', department: '財務部', position: '會計師',
        level: 'L3', grade: '專業職', manager_id: '10', hire_date: '2023-03-20',
        contract_type: 'full-time', work_location: '台北總部', avatar: '周', status: 'active',
        education: [
          { degree: '學士', school: '國立台北商業大學', major: '會計', graduation_year: 2022 }
        ],
        skills: ['Accounting', 'Tax', 'Financial Analysis'],
        certifications: [
          { cert_name: 'CPA', issued_date: '2023-09-01', expiry_date: null }
        ]
      },
      {
        id: '10', employee_no: 'E2016005', name: '蘇明德', email: 'su.md@company.com',
        phone: '0922-000-000', department: '財務部', position: '財務長',
        level: 'L5', grade: '高階管理', manager_id: '8', hire_date: '2016-06-15',
        contract_type: 'full-time', work_location: '台北總部', avatar: '蘇', status: 'active',
        education: [
          { degree: '碩士', school: '國立政治大學', major: '財務金融', graduation_year: 2012 }
        ],
        skills: ['Financial Planning', 'Risk Management', 'Investment'],
        certifications: [
          { cert_name: 'CFA', issued_date: '2015-01-01', expiry_date: null }
        ]
      }
    ];

    // 清空現有資料（重新建立完整資料）
    db.run('DELETE FROM employee_certifications');
    db.run('DELETE FROM employee_skills');
    db.run('DELETE FROM employee_education');
    db.run('DELETE FROM employees');

    // 插入員工主資料
    const empStmt = db.prepare(`
      INSERT INTO employees (
        id, employee_no, name, email, phone, department, position,
        level, grade, manager_id, hire_date, contract_type, work_location,
        avatar, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const eduStmt = db.prepare(`
      INSERT INTO employee_education (id, employee_id, degree, school, major, graduation_year)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const skillStmt = db.prepare(`
      INSERT INTO employee_skills (id, employee_id, skill_name)
      VALUES (?, ?, ?)
    `);

    const certStmt = db.prepare(`
      INSERT INTO employee_certifications (id, employee_id, cert_name, issued_date, expiry_date)
      VALUES (?, ?, ?, ?, ?)
    `);

    let eduCount = 0, skillCount = 0, certCount = 0;

    employees.forEach(emp => {
      // 插入員工主資料
      empStmt.bind([
        emp.id, emp.employee_no, emp.name, emp.email, emp.phone,
        emp.department, emp.position, emp.level, emp.grade, emp.manager_id,
        emp.hire_date, emp.contract_type, emp.work_location, emp.avatar, emp.status
      ]);
      empStmt.step();
      empStmt.reset();

      // 插入學歷
      emp.education.forEach((edu, idx) => {
        const eduId = `edu_${emp.id}_${idx}`;
        eduStmt.bind([eduId, emp.id, edu.degree, edu.school, edu.major, edu.graduation_year]);
        eduStmt.step();
        eduStmt.reset();
        eduCount++;
      });

      // 插入技能
      emp.skills.forEach((skill, idx) => {
        const skillId = `skill_${emp.id}_${idx}`;
        skillStmt.bind([skillId, emp.id, skill]);
        skillStmt.step();
        skillStmt.reset();
        skillCount++;
      });

      // 插入證照
      emp.certifications.forEach((cert, idx) => {
        const certId = `cert_${emp.id}_${idx}`;
        certStmt.bind([certId, emp.id, cert.cert_name, cert.issued_date, cert.expiry_date]);
        certStmt.step();
        certStmt.reset();
        certCount++;
      });
    });

    empStmt.free();
    eduStmt.free();
    skillStmt.free();
    certStmt.free();

    console.log(`✅ Seeded ${employees.length} employees with:`);
    console.log(`   - ${eduCount} education records`);
    console.log(`   - ${skillCount} skill records`);
    console.log(`   - ${certCount} certification records`);

  } catch (error) {
    console.error('Error seeding full employee data:', error.message);
  }
}



/**
 * 遷移 invitation_decisions 資料表
 * 為現有資料表新增 Offer 回覆相關欄位
 */
function migrateInvitationDecisionsTable() {
  try {
    // 檢查資料表是否存在
    const tableExists = db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' AND name = 'invitation_decisions'
    `);

    if (tableExists.length === 0 || tableExists[0].values.length === 0) {
      return; // 資料表不存在，跳過遷移
    }

    // 取得現有欄位清單
    const columnsResult = db.exec(`PRAGMA table_info(invitation_decisions)`);
    const existingColumns = columnsResult.length > 0
      ? columnsResult[0].values.map(row => row[1]) // row[1] 是欄位名稱
      : [];

    // 需要新增的欄位
    const columnsToAdd = [
      { name: 'response_token', type: 'TEXT' },
      { name: 'reply_deadline', type: 'TEXT' },
      { name: 'candidate_response', type: 'TEXT' },
      { name: 'responded_at', type: 'TEXT' }
    ];

    // 新增缺少的欄位
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        db.run(`ALTER TABLE invitation_decisions ADD COLUMN ${col.name} ${col.type} `);
        console.log(`📝 Added column '${col.name}' to invitation_decisions table`);
      }
    }
  } catch (error) {
    console.error('Migration error:', error.message);
  }
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
          const safeParams = params.map(p => p === undefined ? null : p);
          stmt.bind(safeParams);
        }
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      } catch (e) {
        console.error('SQL Error (all):', e.message, 'SQL:', sql, 'Params:', params);
        return [];
      }
    },
    get: (...params) => {
      try {
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          const safeParams = params.map(p => p === undefined ? null : p);
          stmt.bind(safeParams);
        }
        let result = null;
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
        stmt.free();
        return result;
      } catch (e) {
        console.error('SQL Error (get):', e.message, 'SQL:', sql, 'Params:', params);
        return null;
      }
    },
    run: (...params) => {
      try {
        // sql.js 使用 stmt.bind 和 stmt.step 執行
        const stmt = db.prepare(sql);
        if (params.length > 0) {
          const safeParams = params.map(p => p === undefined ? null : p);
          stmt.bind(safeParams);
        }
        stmt.step();
        stmt.free();
        saveDatabase();
        return { changes: db.getRowsModified() };
      } catch (e) {
        console.error('SQL Error (run):', e?.message || e, 'SQL:', sql, 'Params:', params);
        return { changes: 0 };
      }
    }
  };
}

/**
 * 清空所有會議資料（用於測試）
 * 注意：此函數需要在資料庫初始化後調用
 */
function clearAllMeetingData() {
  try {
    console.log('🗑️ Clearing all meeting data...');
    
    // 按照外鍵依賴順序刪除
    db.run('DELETE FROM meeting_conclusions');
    db.run('DELETE FROM meeting_attachments');
    db.run('DELETE FROM meeting_agenda_items');
    db.run('DELETE FROM meeting_attendees');
    db.run('DELETE FROM meeting_reminders');
    db.run('DELETE FROM meetings');
    
    console.log('✅ All meeting data cleared successfully');
  } catch (error) {
    console.error('Error clearing meeting data:', error.message);
  }
}

module.exports = { initDatabase, getDatabase, prepare, saveDatabase, clearAllMeetingData };
