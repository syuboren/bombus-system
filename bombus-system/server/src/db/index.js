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

  // =====================================================
  // 應徵者資料表 (對應 104 Resume API 所有欄位)
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      
      -- 系統欄位
      status TEXT DEFAULT 'new',
      stage TEXT DEFAULT 'Collected', -- Collected, Invited, Offered, Rejected
      scoring_status TEXT DEFAULT 'Pending', -- Pending, Scoring, Scored
      score INTEGER DEFAULT 0,
      apply_date TEXT,
      resume_url TEXT,
      ai_summary TEXT,
      thank_you_sent_at TEXT,
      
      -- 104 基本資料 (Basic Info)
      resume_104_id TEXT,           -- resumeId: 會員編號 (Max: 40)
      name TEXT NOT NULL,           -- fullName: 求職者姓名 (Max: 60)
      name_en TEXT,                 -- englishName: 英文名字 (Max: 40)
      gender TEXT,                  -- gender: 性別 (Max: 4)
      email TEXT,                   -- email: E-mail (Max: 400)
      phone TEXT,                   -- cellPhone: 手機號碼 (Max: 15)
      sub_phone TEXT,               -- subCellPhone: 次要手機 (Max: 15)
      tel TEXT,                     -- tel: 市內電話 (Max: 20)
      contact_info TEXT,            -- contactInfo: 聯絡方式 (Max: 50)
      address TEXT,                 -- address: 聯絡地址 (Max: 110)
      birthday TEXT,                -- birthday: 生日 (yyyy-MM-dd HH:mm:ss)
      reg_source TEXT,              -- regSource: 履歷來源 (Max: 10)
      employment_status TEXT,       -- employmentStatus: 就業狀態 (Max: 10)
      military_status TEXT,         -- militaryStatus: 兵役狀況 (Max: 5)
      military_retire_date TEXT,    -- militaryRetireDate: 退伍日期 (yyyy-mm)
      introduction TEXT,            -- introduction: 個人簡介 (Max: 1000)
      motto TEXT,                   -- motto: 個人格言 (Max: 100)
      characteristic TEXT,          -- characteristic: 個人特色 (Max: 120)
      personal_page TEXT,           -- personalPage: 個人作品頁面 (JSON array)
      driving_licenses TEXT,        -- drivingLicenses: 駕照 (Max: 40)
      transports TEXT,              -- transports: 交通工具 (Max: 40)
      special_identities TEXT,      -- specialIdentities: 特殊身份 (Max: 30)
      nationality TEXT,             -- nationality: 國籍 (Max: 20)
      disabled_types TEXT,          -- disabledTypes: 身障類別與程度 (Max: 30)
      disability_card INTEGER DEFAULT 0, -- disabilityCard: 身障證明 (0:無, 1:有)
      assistive_devices TEXT,       -- assistiveDevices: 身障輔具 (Max: 20)
      avatar TEXT,                  -- headshotUrl: 大頭照連結 (Max: 200)
      seniority TEXT,               -- seniority: 總年資 (e.g., "3年以上")
      
      -- 104 求職條件 (Job Requirement)
      job_characteristic TEXT,      -- jobCharacteristic: 希望性質 (Max: 30)
      work_interval TEXT,           -- workInterval: 上班時段 (Max: 30)
      other_work_interval TEXT,     -- otherWorkInterval: 其他時段 (Max: 60)
      shift_work INTEGER DEFAULT 0, -- shiftWork: 輪班制度 (boolean)
      start_date_opt TEXT,          -- startDateOpt: 可上班日 (Max: 40)
      expected_salary TEXT,         -- wage: 希望待遇 (Max: 20)
      preferred_location TEXT,      -- workPlace: 希望地點 (Max: 20)
      remote_work TEXT,             -- remoteWork: 遠端工作 (Max: 10)
      preferred_job_name TEXT,      -- jobName: 希望職稱 (Max: 120)
      preferred_job_category TEXT,  -- jobCategory: 希望職類 (Max: 120)
      preferred_industry TEXT,      -- industryCategory: 希望產業 (Max: 120)
      work_desc TEXT,               -- workDesc: 工作內容描述 (Max: 2000)
      
      -- 104 自傳 (Biography)
      biography TEXT,               -- bio: 中文自傳 (Max: 4000)
      biography_en TEXT,            -- engBio: 英文自傳 (Max: 8000)
      
      -- 104 證照 (Certificates)
      certificates TEXT,            -- certificates: 證照名稱 (Max: 2000)
      other_certificates TEXT,      -- otherCertificates: 其他證照 (Max: 500)
      
      -- 系統計算欄位 (從關聯表彙總)
      current_position TEXT,        -- 最近工作職位 (from experiences[0])
      current_company TEXT,         -- 最近工作公司 (from experiences[0])
      location TEXT,                -- 所在地區 (優先用 address)
      education TEXT,               -- 最高學歷摘要 (from education[0])
      experience TEXT,              -- 最近工作經歷摘要
      experience_years INTEGER DEFAULT 0, -- 年資數字
      skills TEXT,                  -- 技能摘要 (JSON)
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `);
  
  // =====================================================
  // 候選人學歷資料表 (對應 104 education[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_education (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      school_name TEXT,             -- schoolName: 學校名稱 (Max: 40)
      degree_level TEXT,            -- degreeLevel: 學歷等級 (博士/碩士/大學/etc)
      major TEXT,                   -- major: 科系名稱 (Max: 100)
      major_category TEXT,          -- majorCategory: 科系類別 (Max: 50)
      degree_status TEXT,           -- degreeStatus: 就學狀態 (畢業/肄業/就學中)
      school_country TEXT,          -- schoolCountry: 學校地區 (Max: 20)
      start_date TEXT,              -- startDate: 就學期間起始
      end_date TEXT,                -- endDate: 就學期間結束
      sort_order INTEGER DEFAULT 0, -- 排序 (0=最高學歷)
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人工作經歷資料表 (對應 104 experiences[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_experiences (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      firm_name TEXT,               -- firmName: 公司名稱 (Max: 120)
      industry_category TEXT,       -- industryCategory: 產業類別 (Max: 20)
      company_size TEXT,            -- companySize: 公司規模 (Max: 10)
      work_place TEXT,              -- workPlace: 工作地點 (Max: 10)
      job_name TEXT,                -- jobName: 職務名稱 (Max: 120)
      job_role TEXT,                -- jobRole: 職務類型 (全職/兼職)
      job_category TEXT,            -- jobCategory: 職務類別 (Max: 50)
      start_date TEXT,              -- startDate: 任職起始
      end_date TEXT,                -- endDate: 任職結束
      job_desc TEXT,                -- jobDesc: 工作內容 (Max: 2000)
      skills TEXT,                  -- skills: 工作技能 (Max: 50)
      management TEXT,              -- management: 管理責任 (Max: 20)
      wage_type_desc TEXT,          -- wageTypeDesc: 計薪方式 (Max: 10)
      wage INTEGER,                 -- wage: 薪資數字
      wage_year INTEGER,            -- wageYear: 年薪數字
      sort_order INTEGER DEFAULT 0, -- 排序 (0=最近工作)
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人技能專長資料表 (對應 104 speciality[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_specialities (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      skill TEXT,                   -- skill: 專長名稱 (Max: 120)
      description TEXT,             -- desc: 專長描述 (Max: 1000)
      tags TEXT,                    -- tag: 專長特色標籤 (Max: 200)
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人語言能力資料表 (對應 104 foreignLanguage[] + localLanguage[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_languages (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      lang_type TEXT,               -- langType: 語言類型
      language_category TEXT,       -- 'foreign' or 'local'
      listen_degree TEXT,           -- listenDegree: 聽力程度
      speak_degree TEXT,            -- speakDegree: 口說程度
      read_degree TEXT,             -- readDegree: 閱讀程度
      write_degree TEXT,            -- writeDegree: 寫作程度
      degree TEXT,                  -- degree: 精通程度 (for local language)
      certificates TEXT,            -- certificates: 語文證照
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人附件資料表 (對應 104 attachFiles[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_attachments (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      type INTEGER,                 -- type: 類型 (1:檔案, 2:連結)
      title TEXT,                   -- title: 附件名稱 (Max: 120)
      file_name TEXT,               -- fileName: 檔案名稱 (Max: 120)
      resource_link TEXT,           -- resourceLink: 下載連結 (Max: 300)
      website TEXT,                 -- website: 網站連結 (Max: 200)
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人專案作品資料表 (對應 104 projectDatas[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_projects (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      title TEXT,                   -- title: 專案標題 (Max: 120)
      start_date TEXT,              -- startDate: 開始日期
      end_date TEXT,                -- endDate: 結束日期
      description TEXT,             -- description: 描述 (Max: 2000)
      type INTEGER,                 -- type: 素材類型 (0:無, 1:檔, 2:影, 3:網)
      resource_link TEXT,           -- resourceLink: 素材連結 (Max: 300)
      website TEXT,                 -- website: 網站連結 (Max: 200)
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人自訂內容資料表 (對應 104 customContentDatas[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_custom_contents (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      title TEXT,                   -- title: 標題 (Max: 120)
      content TEXT,                 -- content: 內容 (JSON array)
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人推薦人資料表 (對應 104 recommenders[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_recommenders (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      name TEXT,                    -- name: 推薦人姓名 (Max: 30)
      corp TEXT,                    -- corp: 單位 (Max: 35)
      job_title TEXT,               -- jobTitle: 職稱 (Max: 20)
      email TEXT,                   -- email: 電子郵件
      tel TEXT,                     -- tel: 電話
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人應徵紀錄資料表 (對應 104 applyJob[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_apply_records (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      apply_date TEXT,              -- applyDate: 應徵日期 (Max: 10)
      job_name TEXT,                -- name: 職務名稱 (Max: 120)
      job_no TEXT,                  -- jobNo: 職務代碼 (Max: 40)
      apply_source TEXT,            -- applySource: 應徵來源 (Max: 10)
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人應徵問答資料表 (對應 104 applyQuestion[])
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_apply_questions (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      type TEXT,                    -- type: 類型 (1:是非, 2:選擇, 3:填充)
      question TEXT,                -- question: 題目 (Max: 100)
      answer TEXT,                  -- answer: 答覆 (Max: 250)
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    )
  `);
  
  // =====================================================
  // 候選人履歷 AI 解析結果資料表
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_resume_analysis (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      
      -- 整體吻合度
      overall_match_score INTEGER DEFAULT 0,  -- 0-100
      
      -- 三維分析分數
      requirement_match_score INTEGER DEFAULT 0,  -- 需求條件匹配 (40%)
      keyword_match_score INTEGER DEFAULT 0,      -- 技能關鍵字 (35%)
      experience_relevance_score INTEGER DEFAULT 0, -- 經歷相關性 (25%)
      
      -- JD 需求條件對照 (JSON)
      matched_requirements TEXT,    -- 符合的條件 [{requirement, evidence}]
      unmatched_requirements TEXT,  -- 未提及的條件 [{requirement, note}]
      bonus_skills TEXT,            -- 額外具備的技能 [skill1, skill2]
      
      -- 技能關鍵字提取 (JSON)
      extracted_tech_skills TEXT,   -- 技術技能 [skill1, skill2]
      extracted_soft_skills TEXT,   -- 軟性技能 [skill1, skill2]
      jd_required_match_count INTEGER DEFAULT 0,  -- 必備技能匹配數
      jd_required_total_count INTEGER DEFAULT 0,  -- 必備技能總數
      jd_bonus_match_count INTEGER DEFAULT 0,     -- 加分技能匹配數
      jd_bonus_total_count INTEGER DEFAULT 0,     -- 加分技能總數
      
      -- 經歷相關性分析 (JSON)
      experience_analysis TEXT,     -- [{firm, job, duration, relevance_level, relevance_reasons}]
      total_relevant_years REAL DEFAULT 0,  -- 總相關年資
      jd_required_years REAL DEFAULT 0,     -- JD 要求年資
      
      -- 履歷內容品質評估
      writing_style TEXT,           -- 書寫風格描述
      analysis_confidence INTEGER DEFAULT 0,  -- 分析信心度 0-100
      content_features TEXT,        -- 內容特點 (JSON) [{type, description}]
      areas_to_clarify TEXT,        -- 需進一步了解的部分 (JSON) [item1, item2]
      
      -- 面試關注點建議 (JSON)
      tech_verification_points TEXT,  -- 技術驗證 [point1, point2]
      experience_supplement_points TEXT, -- 經歷補充 [point1, point2]
      
      -- 分析元資料
      analyzed_at TEXT,             -- 分析時間
      analysis_engine_version TEXT, -- 分析引擎版本
      resume_word_count INTEGER DEFAULT 0,  -- 履歷字數
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(candidate_id, job_id)  -- 每個候選人對每個職缺只有一筆分析
    )
  `);
  
  // =====================================================
  // 擴充既有資料表的欄位 (用於現有資料庫的 migration)
  // =====================================================
  const candidateColumns = [
    // 基本資料欄位
    { name: 'resume_104_id', type: 'TEXT' },
    { name: 'sub_phone', type: 'TEXT' },
    { name: 'tel', type: 'TEXT' },
    { name: 'contact_info', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'birthday', type: 'TEXT' },
    { name: 'reg_source', type: 'TEXT' },
    { name: 'employment_status', type: 'TEXT' },
    { name: 'military_status', type: 'TEXT' },
    { name: 'military_retire_date', type: 'TEXT' },
    { name: 'introduction', type: 'TEXT' },
    { name: 'motto', type: 'TEXT' },
    { name: 'characteristic', type: 'TEXT' },
    { name: 'personal_page', type: 'TEXT' },
    { name: 'driving_licenses', type: 'TEXT' },
    { name: 'transports', type: 'TEXT' },
    { name: 'special_identities', type: 'TEXT' },
    { name: 'nationality', type: 'TEXT' },
    { name: 'disabled_types', type: 'TEXT' },
    { name: 'disability_card', type: 'INTEGER' },
    { name: 'assistive_devices', type: 'TEXT' },
    { name: 'avatar', type: 'TEXT' },
    { name: 'seniority', type: 'TEXT' },
    { name: 'gender', type: 'TEXT' },
    // 求職條件欄位
    { name: 'job_characteristic', type: 'TEXT' },
    { name: 'work_interval', type: 'TEXT' },
    { name: 'other_work_interval', type: 'TEXT' },
    { name: 'shift_work', type: 'INTEGER' },
    { name: 'start_date_opt', type: 'TEXT' },
    { name: 'expected_salary', type: 'TEXT' },
    { name: 'preferred_location', type: 'TEXT' },
    { name: 'remote_work', type: 'TEXT' },
    { name: 'preferred_job_name', type: 'TEXT' },
    { name: 'preferred_job_category', type: 'TEXT' },
    { name: 'preferred_industry', type: 'TEXT' },
    { name: 'work_desc', type: 'TEXT' },
    // 自傳欄位
    { name: 'biography', type: 'TEXT' },
    { name: 'biography_en', type: 'TEXT' },
    // 證照欄位
    { name: 'certificates', type: 'TEXT' },
    { name: 'other_certificates', type: 'TEXT' },
    // 計算欄位
    { name: 'current_position', type: 'TEXT' },
    { name: 'current_company', type: 'TEXT' },
    { name: 'location', type: 'TEXT' }
  ];
  
  candidateColumns.forEach(col => {
    try {
      db.run(`ALTER TABLE candidates ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // 欄位已存在，忽略錯誤
    }
  });

  // =====================================================
  // 人才庫與再接觸管理 (Talent Pool)
  // =====================================================

  // 人才庫主表 - 關聯到 candidates 表
  db.run(`
    CREATE TABLE IF NOT EXISTS talent_pool (
      id TEXT PRIMARY KEY,
      candidate_id TEXT,                -- 關聯到 candidates 表 (可為空，支援手動新增)
      
      -- 基本資料 (若無關聯候選人則直接儲存)
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      current_position TEXT,            -- 目前職位
      current_company TEXT,             -- 目前公司
      experience_years INTEGER DEFAULT 0, -- 年資
      education TEXT,                   -- 學歷摘要
      expected_salary TEXT,             -- 期望薪資
      skills TEXT,                      -- 技能 (JSON array)
      resume_url TEXT,                  -- 履歷連結
      
      -- 人才庫專屬欄位
      source TEXT DEFAULT 'other',      -- 來源: '104', 'linkedin', 'referral', 'website', 'headhunter', 'other'
      status TEXT DEFAULT 'active',     -- 狀態: 'active', 'contacted', 'scheduled', 'hired', 'declined', 'expired'
      match_score INTEGER DEFAULT 0,    -- AI 媒合分數 0-100
      contact_priority TEXT DEFAULT 'medium', -- 聯繫優先級: 'high', 'medium', 'low'
      
      -- 加入人才庫的原因/來源追蹤
      decline_stage TEXT,               -- 婉拒階段: 'invited', 'interview', 'offer'
      decline_reason TEXT,              -- 婉拒原因
      original_job_id TEXT,             -- 原始應徵職缺 ID
      original_job_title TEXT,          -- 原始應徵職缺名稱
      
      -- 聯繫追蹤
      added_date TEXT DEFAULT (datetime('now')), -- 加入日期
      last_contact_date TEXT,           -- 最後聯繫日期
      next_contact_date TEXT,           -- 下次預計聯繫日期
      contact_count INTEGER DEFAULT 0,  -- 聯繫次數
      
      -- 待聯繫提醒設定
      contact_reminder_enabled INTEGER DEFAULT 0, -- 是否開啟待聯繫提醒 (0: 關閉, 1: 開啟)
      contact_reminder_date TEXT,       -- 開啟提醒的日期 (用於計算 1 個月期限)
      
      -- 備註
      notes TEXT,
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
      FOREIGN KEY (original_job_id) REFERENCES jobs(id) ON DELETE SET NULL
    )
  `);

  // 人才庫聯繫紀錄表
  db.run(`
    CREATE TABLE IF NOT EXISTS talent_contact_history (
      id TEXT PRIMARY KEY,
      talent_id TEXT NOT NULL,          -- 關聯到 talent_pool
      
      contact_date TEXT NOT NULL,       -- 聯繫日期
      contact_method TEXT,              -- 聯繫方式: 'phone', 'email', 'interview', 'meeting'
      contact_by TEXT,                  -- 聯繫人
      summary TEXT,                     -- 聯繫摘要
      outcome TEXT,                     -- 結果: 'positive', 'neutral', 'negative', 'no-response'
      
      next_action TEXT,                 -- 下一步行動
      next_action_date TEXT,            -- 下一步行動日期
      
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE
    )
  `);

  // 人才庫提醒事項表
  db.run(`
    CREATE TABLE IF NOT EXISTS talent_reminders (
      id TEXT PRIMARY KEY,
      talent_id TEXT NOT NULL,          -- 關聯到 talent_pool
      
      reminder_date TEXT NOT NULL,      -- 提醒日期
      reminder_type TEXT,               -- 提醒類型: 'contact', 'follow-up', 'interview', 'offer'
      message TEXT,                     -- 提醒內容
      
      is_completed INTEGER DEFAULT 0,   -- 是否已完成
      completed_at TEXT,                -- 完成時間
      assigned_to TEXT,                 -- 指派給
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE
    )
  `);

  // 人才標籤定義表
  db.run(`
    CREATE TABLE IF NOT EXISTS talent_tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,        -- 標籤名稱
      color TEXT DEFAULT '#3B82F6',     -- 標籤顏色
      category TEXT DEFAULT 'custom',   -- 類別: 'skill', 'experience', 'education', 'personality', 'custom'
      description TEXT,                 -- 標籤說明
      usage_count INTEGER DEFAULT 0,    -- 使用次數
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);

  // 人才與標籤多對多關聯表
  db.run(`
    CREATE TABLE IF NOT EXISTS talent_tag_mapping (
      id TEXT PRIMARY KEY,
      talent_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES talent_tags(id) ON DELETE CASCADE,
      UNIQUE(talent_id, tag_id)
    )
  `);

  // 人才與職缺媒合度關聯表
  db.run(`
    CREATE TABLE IF NOT EXISTS talent_job_matches (
      id TEXT PRIMARY KEY,
      talent_id TEXT NOT NULL,            -- 關聯到 talent_pool
      job_id TEXT NOT NULL,               -- 關聯到 jobs
      match_score INTEGER DEFAULT 0,      -- 媒合度分數 0-100
      match_details TEXT,                 -- 媒合分析細節 (JSON)
      analysis_summary TEXT,              -- AI 分析摘要
      analyzed_at TEXT,                   -- 分析時間
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (talent_id) REFERENCES talent_pool(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(talent_id, job_id)           -- 每個人才對每個職缺只有一筆
    )
  `);

  // 為 talent_pool 表添加新欄位 (migration)
  try {
    db.run(`ALTER TABLE talent_pool ADD COLUMN contact_reminder_enabled INTEGER DEFAULT 0`);
    db.run(`ALTER TABLE talent_pool ADD COLUMN contact_reminder_date TEXT`);
    console.log('📝 Added contact_reminder columns to talent_pool table');
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }

  // 建立人才庫相關索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_pool_status ON talent_pool(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_pool_source ON talent_pool(source)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_pool_candidate ON talent_pool(candidate_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_contact_talent ON talent_contact_history(talent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_reminders_talent ON talent_reminders(talent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_reminders_date ON talent_reminders(reminder_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_tag_mapping_talent ON talent_tag_mapping(talent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_tag_mapping_tag ON talent_tag_mapping(tag_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_job_matches_talent ON talent_job_matches(talent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_job_matches_job ON talent_job_matches(job_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_talent_job_matches_score ON talent_job_matches(match_score DESC)`);

  // 插入預設標籤
  const defaultTags = [
    { id: 'tag-tech-lead', name: '技術主管', color: '#EF4444', category: 'experience' },
    { id: 'tag-senior', name: '資深工程師', color: '#F97316', category: 'experience' },
    { id: 'tag-full-stack', name: '全端開發', color: '#8B5CF6', category: 'skill' },
    { id: 'tag-frontend', name: '前端專長', color: '#3B82F6', category: 'skill' },
    { id: 'tag-backend', name: '後端專長', color: '#10B981', category: 'skill' },
    { id: 'tag-ai-ml', name: 'AI/ML', color: '#EC4899', category: 'skill' },
    { id: 'tag-cloud', name: '雲端架構', color: '#06B6D4', category: 'skill' },
    { id: 'tag-management', name: '管理經驗', color: '#F59E0B', category: 'experience' },
    { id: 'tag-high-potential', name: '高潛力', color: '#84CC16', category: 'personality' },
    { id: 'tag-referred', name: '內部推薦', color: '#6366F1', category: 'custom' }
  ];
  
  defaultTags.forEach(tag => {
    db.run(`
      INSERT OR IGNORE INTO talent_tags (id, name, color, category)
      VALUES (?, ?, ?, ?)
    `, [tag.id, tag.name, tag.color, tag.category]);
  });

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
      result TEXT DEFAULT 'Pending', -- Pending, Pass, Hold, Fail, Cancelled
      remark TEXT,
      cancel_token TEXT UNIQUE, -- 候選人取消面試連結 Token
      cancelled_at TEXT, -- 取消時間
      cancel_reason TEXT, -- 取消原因
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `);

  // 為既有 interviews 表格添加 cancel_token 欄位 (migration)
  try {
    db.run(`ALTER TABLE interviews ADD COLUMN cancel_token TEXT UNIQUE`);
    db.run(`ALTER TABLE interviews ADD COLUMN cancelled_at TEXT`);
    db.run(`ALTER TABLE interviews ADD COLUMN cancel_reason TEXT`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }

  // 為既有 interviews 表格添加 form_token 欄位 (migration)
  try {
    db.run(`ALTER TABLE interviews ADD COLUMN form_token TEXT UNIQUE`);
  } catch (e) {
    // 欄位已存在，忽略錯誤
  }

  // =====================================================
  // 候選人面試記錄表單資料表
  // =====================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS candidate_interview_forms (
      id TEXT PRIMARY KEY,
      interview_id TEXT NOT NULL,
      form_token TEXT UNIQUE NOT NULL,
      form_data TEXT,                    -- JSON 格式儲存表單內容
      status TEXT DEFAULT 'Pending',     -- Pending | InProgress | Submitted | Locked
      time_limit_minutes INTEGER DEFAULT 60,
      started_at TEXT,                   -- 開始填寫時間
      submitted_at TEXT,                 -- 送出時間
      locked_at TEXT,                    -- 鎖定時間
      current_step INTEGER DEFAULT 1,    -- 當前步驟 (1-5)
      last_saved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (interview_id) REFERENCES interviews(id) ON DELETE CASCADE
    )
  `);
  
  // 建立 candidate_interview_forms 索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_interview_forms_token ON candidate_interview_forms(form_token)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_interview_forms_interview ON candidate_interview_forms(interview_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_interview_forms_status ON candidate_interview_forms(status)`);

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
  // 員工入職資料上傳表 (Employee Document Upload)
  // ============================================================
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      custom_name TEXT,
      file_name TEXT,
      file_url TEXT,
      file_size INTEGER,
      mime_type TEXT,
      status TEXT DEFAULT 'uploaded',
      reject_reason TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);

  // 員工入職資料上傳索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_employee_documents_employee ON employee_documents(employee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_employee_documents_type ON employee_documents(type)`);

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
      role TEXT DEFAULT 'employee',  -- 角色: manager=主管, employee=員工
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

  // 候選人轉員工追溯欄位（遷移）
  try {
    db.run(`ALTER TABLE employees ADD COLUMN candidate_id TEXT`);
  } catch (e) { /* 欄位已存在 */ }
  
  try {
    db.run(`ALTER TABLE employees ADD COLUMN probation_end_date TEXT`);
  } catch (e) { /* 欄位已存在 */ }
  
  try {
    db.run(`ALTER TABLE employees ADD COLUMN probation_months INTEGER DEFAULT 3`);
  } catch (e) { /* 欄位已存在 */ }
  
  try {
    db.run(`ALTER TABLE employees ADD COLUMN onboarding_status TEXT DEFAULT 'pending'`);
  } catch (e) { /* 欄位已存在 */ }
  
  try {
    db.run(`ALTER TABLE employees ADD COLUMN converted_at TEXT`);
  } catch (e) { /* 欄位已存在 */ }

  // 職務欄位（區分職務和職位）
  try {
    db.run(`ALTER TABLE employees ADD COLUMN job_title TEXT`);
    console.log('✅ Added job_title column to employees table');
  } catch (e) { /* 欄位已存在 */ }

  // 候選人轉員工追溯索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_employees_candidate ON employees(candidate_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_employees_onboarding_status ON employees(onboarding_status)`);

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

  // 5. 員工職務異動資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_job_changes (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      effective_date TEXT NOT NULL,
      change_type TEXT NOT NULL,
      from_position TEXT,
      to_position TEXT,
      from_department TEXT,
      to_department TEXT,
      from_level TEXT,
      to_level TEXT,
      salary_change REAL,
      reason TEXT,
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // 員工職務異動索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_job_changes_employee ON employee_job_changes(employee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_job_changes_date ON employee_job_changes(effective_date)`);

  // 6. 員工薪資資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_salaries (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      base_salary REAL NOT NULL,
      allowances REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      effective_date TEXT NOT NULL,
      end_date TEXT,
      adjustment_reason TEXT,
      approved_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // 員工薪資索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_salaries_employee ON employee_salaries(employee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_salaries_effective ON employee_salaries(effective_date)`);

  // 7. 員工培訓記錄資料表
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_training (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      course_name TEXT NOT NULL,
      course_type TEXT DEFAULT 'internal',
      completion_date TEXT,
      score REAL,
      certificate TEXT,
      hours REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      status TEXT DEFAULT 'completed',
      instructor TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    )
  `);

  // 員工培訓索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_training_employee ON employee_training(employee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_training_status ON employee_training(status)`);

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
  // 職能評估系統資料表 (Competency Assessment)
  // ============================================================

  // 1. 系統參數表
  db.run(`
    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 初始化系統參數
  const systemConfigDefaults = [
    ['monthly_check_self_deadline', '5', '員工自評截止日(每月幾號)'],
    ['monthly_check_manager_deadline', '7', '主管審核截止日(每月幾號)'],
    ['monthly_check_hr_deadline', '10', 'HR結案截止日(每月幾號)'],
    ['monthly_reminder_day', '25', '月度提醒日(每月幾號)'],
    ['weekly_report_deadline', 'friday', '週報截止日(星期幾)']
  ];
  systemConfigDefaults.forEach(([key, value, desc]) => {
    db.run(`INSERT OR IGNORE INTO system_config (key, value, description) VALUES (?, ?, ?)`, [key, value, desc]);
  });

  // 2. 月度指標模板表
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_check_templates (
      id TEXT PRIMARY KEY,
      department TEXT NOT NULL,
      position TEXT NOT NULL,
      name TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      measurement TEXT,
      order_num INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mct_dept_pos ON monthly_check_templates(department, position)`);

  // 3. 月度檢核表
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_checks (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      manager_id TEXT,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      status TEXT DEFAULT 'self_assessment',
      self_assessment_date TEXT,
      manager_review_date TEXT,
      hr_review_date TEXT,
      total_score REAL,
      manager_comment TEXT,
      hr_comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(employee_id, year, month)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mc_employee ON monthly_checks(employee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mc_year_month ON monthly_checks(year, month)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mc_status ON monthly_checks(status)`);

  // 4. 月度檢核項目表
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_check_items (
      id TEXT PRIMARY KEY,
      monthly_check_id TEXT NOT NULL,
      template_id TEXT,
      name TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      measurement TEXT,
      order_num INTEGER DEFAULT 0,
      self_score INTEGER,
      manager_score INTEGER,
      weighted_score REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (monthly_check_id) REFERENCES monthly_checks(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_mci_check ON monthly_check_items(monthly_check_id)`);

  // 5. 季度績效面談表
  db.run(`
    CREATE TABLE IF NOT EXISTS quarterly_reviews (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      manager_id TEXT,
      year INTEGER NOT NULL,
      quarter INTEGER NOT NULL,
      form_type TEXT DEFAULT 'employee',
      status TEXT DEFAULT 'employee_submitted',
      monthly_avg_score REAL,
      interview_date TEXT,
      interview_location TEXT,
      total_score REAL,
      manager_comment TEXT,
      development_plan TEXT,
      hr_comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(employee_id, year, quarter, form_type)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_qr_employee ON quarterly_reviews(employee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_qr_year_quarter ON quarterly_reviews(year, quarter)`);

  // 6. 季度面談區塊表
  db.run(`
    CREATE TABLE IF NOT EXISTS quarterly_review_sections (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      section_type TEXT NOT NULL,
      content TEXT,
      order_num INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (review_id) REFERENCES quarterly_reviews(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_qrs_review ON quarterly_review_sections(review_id)`);

  // 7. 員工滿意度調查表
  db.run(`
    CREATE TABLE IF NOT EXISTS satisfaction_surveys (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      question_id INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (review_id) REFERENCES quarterly_reviews(id) ON DELETE CASCADE,
      UNIQUE(review_id, question_id)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ss_review ON satisfaction_surveys(review_id)`);

  // 8. 工作週報表 (擴充版)
  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      reviewer_id TEXT,
      year INTEGER NOT NULL,
      week INTEGER NOT NULL,
      week_start TEXT,
      week_end TEXT,
      status TEXT DEFAULT 'draft',
      submit_date TEXT,
      review_date TEXT,
      reviewer_comment TEXT,
      next_week_plan TEXT,
      weekly_summary TEXT,
      routine_total_minutes INTEGER DEFAULT 0,
      non_routine_total_minutes INTEGER DEFAULT 0,
      employee_signature TEXT,
      employee_signature_date TEXT,
      manager_signature TEXT,
      manager_signature_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      UNIQUE(employee_id, year, week)
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wr_employee ON weekly_reports(employee_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wr_year_week ON weekly_reports(year, week)`);

  // 9. 週報工作項目表 (擴充版 - 含時間欄位)
  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_report_items (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      content TEXT,
      estimated_time INTEGER DEFAULT 0,
      actual_time INTEGER DEFAULT 0,
      completed_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wri_report ON weekly_report_items(report_id)`);

  // 10. 週報代辦事項表
  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_todo_items (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      task TEXT NOT NULL,
      start_date TEXT,
      due_date TEXT,
      priority TEXT DEFAULT 'normal',
      status TEXT DEFAULT 'not_started',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wti_report ON weekly_todo_items(report_id)`);

  // 11. 週報問題與解決方案表
  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_problem_items (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      problem TEXT NOT NULL,
      solution TEXT,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wpi_report ON weekly_problem_items(report_id)`);

  // 12. 週報教育訓練進度表
  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_training_items (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      course_name TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      total_hours REAL DEFAULT 0,
      completed_hours REAL DEFAULT 0,
      completed_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wtri_report ON weekly_training_items(report_id)`);

  // 13. 週報階段性任務進度表
  db.run(`
    CREATE TABLE IF NOT EXISTS weekly_project_items (
      id TEXT PRIMARY KEY,
      report_id TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      task TEXT NOT NULL,
      progress_rate INTEGER DEFAULT 0,
      collaboration TEXT,
      challenges TEXT,
      expected_date TEXT,
      actual_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (report_id) REFERENCES weekly_reports(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_wpri_report ON weekly_project_items(report_id)`);

  // 10. 通知記錄表
  db.run(`
    CREATE TABLE IF NOT EXISTS competency_notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      recipient_id TEXT NOT NULL,
      recipient_email TEXT,
      subject TEXT,
      content TEXT,
      reference_type TEXT,
      reference_id TEXT,
      status TEXT DEFAULT 'pending',
      sent_at TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notif_recipient ON competency_notifications(recipient_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notif_status ON competency_notifications(status)`);

  // 11. 滿意度調查題目設定 (靜態資料)
  db.run(`
    CREATE TABLE IF NOT EXISTS satisfaction_questions (
      id INTEGER PRIMARY KEY,
      question_text TEXT NOT NULL,
      order_num INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `);

  // 插入滿意度調查預設題目
  const satisfactionQuestions = [
    [1, '員工清楚自己的工作要求', 1],
    [2, '員工明確有做好自己工作所需要的內容', 2],
    [3, '在工作中，每天都有機會做員工自己最擅長做的事情', 3],
    [4, '在一週工作中，有因為工作出色而受到鼓勵', 4],
    [5, '員工覺得自己的主管或同事有關心個人的情況', 5],
    [6, '在工作中有人鼓勵員工自己的發展', 6],
    [7, '在工作中，自己感覺意見有受到重視', 7],
    [8, '公司的使命與目標，讓員工感覺到自己的工作職務是重要的', 8],
    [9, '同事有致力於高質量的工作', 9],
    [10, '在公司有要好的同事', 10],
    [11, '在過去三個月中，公司有人會與我談及我的進步', 11],
    [12, '在過去三個月中，員工認為自己的工作有機會學習與成長', 12]
  ];
  satisfactionQuestions.forEach(([id, text, order]) => {
    db.run(`INSERT OR IGNORE INTO satisfaction_questions (id, question_text, order_num, is_active) VALUES (?, ?, ?, 1)`, [id, text, order]);
  });

  console.log('✅ 職能評估系統資料表已建立');

  // ============================================================
  // 職能基準庫資料表 (Competency Framework)
  // ============================================================

  // 1. 職能主表 - 儲存所有職能的基本資訊 (Core, Management, Professional, KSA)
  db.run(`
    CREATE TABLE IF NOT EXISTS competencies (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_competencies_type ON competencies(type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_competencies_category ON competencies(category)`);

  // 2. 職能等級表 - 僅適用於 Core/Management/Professional 職能，儲存 L1-L6 的行為指標
  db.run(`
    CREATE TABLE IF NOT EXISTS competency_levels (
      id TEXT PRIMARY KEY,
      competency_id TEXT NOT NULL,
      level TEXT NOT NULL,
      indicators TEXT NOT NULL,
      FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_competency_levels_competency ON competency_levels(competency_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_competency_levels_level ON competency_levels(level)`);

  // 3. KSA 詳細資訊表 - 僅適用於 KSA 職能，儲存無等級區分的詳細資訊
  db.run(`
    CREATE TABLE IF NOT EXISTS competency_ksa_details (
      id TEXT PRIMARY KEY,
      competency_id TEXT NOT NULL,
      behavior_indicators TEXT NOT NULL,
      linked_courses TEXT DEFAULT '[]',
      FOREIGN KEY (competency_id) REFERENCES competencies(id) ON DELETE CASCADE
    )
  `);
  db.run(`CREATE INDEX IF NOT EXISTS idx_competency_ksa_details_competency ON competency_ksa_details(competency_id)`);

  console.log('✅ 職能基準庫資料表已建立');

  // ============================================================
  // 資料庫遷移與初始化
  // ============================================================
  migrateInvitationDecisionsTable();
  migrateEmployeesTable();
  migrateMonthlyChecksSignature();  // 新增電子簽名欄位
  migrateWeeklyReportsTable();      // 新增週報擴充欄位
  initGradeMatrixTables();          // 新增職等職級資料表
  initJobDescriptionsTable();       // 新增職務說明書資料表
  migrateEmployeeGradeLevels();     // 遷移員工職等職級資料
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
      { name: 'role', type: 'TEXT DEFAULT \'employee\'' },  // 角色: manager=主管, employee=員工
      { name: 'level', type: 'TEXT' },
      { name: 'grade', type: 'TEXT' },
      { name: 'manager_id', type: 'TEXT' },
      { name: 'hire_date', type: 'TEXT' },
      { name: 'contract_type', type: 'TEXT DEFAULT \'full-time\'' },
      { name: 'work_location', type: 'TEXT' },
      { name: 'birth_date', type: 'TEXT' },
      { name: 'address', type: 'TEXT' },
      { name: 'emergency_contact_name', type: 'TEXT' },
      { name: 'emergency_contact_relation', type: 'TEXT' },
      { name: 'emergency_contact_phone', type: 'TEXT' }
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

    // 完整員工資料 (依據職等職級制度 PDF 更新)
    // role: 'manager' = 主管, 'employee' = 員工
    // grade: 職等 (1-7), level: 職級 (BS01-BS20)
    const employees = [
      // 行政部 - 高階管理
      {
        id: '8', employee_no: 'E2015001', name: '趙大偉', email: 'zhao.dw@company.com',
        phone: '0989-888-888', department: '行政部', position: '行政長', role: 'manager',
        level: 'BS16', grade: '6', manager_id: null, hire_date: '2015-01-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '趙', status: 'active',
        education: [
          { degree: '博士', school: '美國史丹佛大學', major: '企業管理', graduation_year: 2010 },
          { degree: '碩士', school: '國立台灣大學', major: 'EMBA', graduation_year: 2005 }
        ],
        skills: ['Strategic Leadership', 'Corporate Governance', 'M&A'],
        certifications: []
      },
      // 財務部 - 高階管理
      {
        id: '10', employee_no: 'E2016005', name: '蘇明德', email: 'su.md@company.com',
        phone: '0922-000-000', department: '財務部', position: '財務長', role: 'manager',
        level: 'BS15', grade: '6', manager_id: '8', hire_date: '2016-06-15',
        contract_type: 'full-time', work_location: '台北總部', avatar: '蘇', status: 'active',
        education: [
          { degree: '碩士', school: '國立政治大學', major: '財務金融', graduation_year: 2012 }
        ],
        skills: ['Financial Planning', 'Risk Management', 'Investment'],
        certifications: [
          { cert_name: 'CFA', issued_date: '2015-01-01', expiry_date: null }
        ]
      },
      // 工程部 - 高階管理
      {
        id: '5', employee_no: 'E2019008', name: '李志偉', email: 'li.zw@company.com',
        phone: '0956-555-555', department: '工程部', position: '技術長', role: 'manager',
        level: 'BS14', grade: '6', manager_id: '8', hire_date: '2019-01-15',
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
      // 業務部 - 高階管理
      {
        id: '6', employee_no: 'E2018003', name: '黃雅琪', email: 'huang.yq@company.com',
        phone: '0967-666-666', department: '業務部', position: '業務長', role: 'manager',
        level: 'BS14', grade: '6', manager_id: '8', hire_date: '2018-07-20',
        contract_type: 'full-time', work_location: '台北總部', avatar: '黃', status: 'active',
        education: [
          { degree: '碩士', school: '國立台北大學', major: '企業管理', graduation_year: 2016 }
        ],
        skills: ['Sales Management', 'Strategic Planning', 'Client Relations'],
        certifications: []
      },
      // 專案部 - 中階管理
      {
        id: '11', employee_no: 'E2021020', name: '許志豪', email: 'hsu.zh@company.com',
        phone: '0933-111-222', department: '專案部', position: '經理', role: 'manager',
        level: 'BS11', grade: '5', manager_id: '8', hire_date: '2021-02-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '許', status: 'active',
        education: [
          { degree: '碩士', school: '國立台灣科技大學', major: '工業管理', graduation_year: 2019 }
        ],
        skills: ['Project Management', 'Agile', 'Scrum'],
        certifications: [
          { cert_name: 'PMP', issued_date: '2021-06-01', expiry_date: '2027-06-01' }
        ]
      },
      // 人資部 - 中階等級 (專業職)
      {
        id: '7', employee_no: 'E2017001', name: '吳俊賢', email: 'wu.jx@company.com',
        phone: '0978-777-777', department: '人資部', position: '管理師', role: 'employee',
        level: 'BS10', grade: '4', manager_id: '8', hire_date: '2017-03-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '吳', status: 'active',
        education: [
          { degree: '碩士', school: '國立中山大學', major: '人力資源管理', graduation_year: 2015 }
        ],
        skills: ['HR Strategy', 'Labor Law', 'Compensation Design'],
        certifications: [
          { cert_name: '勞動法規師', issued_date: '2019-02-01', expiry_date: null }
        ]
      },
      // 工程部 - 中階等級 (專業職)
      {
        id: '1', employee_no: 'E2020001', name: '張志明', email: 'zhang.zm@company.com',
        phone: '0912-111-111', department: '工程部', position: '資深工程師', role: 'employee',
        level: 'BS09', grade: '4', manager_id: '5', hire_date: '2020-03-15',
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
      // 財務部 - 資深等級 (專業職)
      {
        id: '9', employee_no: 'E2023040', name: '周小芳', email: 'zhou.xf@company.com',
        phone: '0911-999-999', department: '財務部', position: '會計', role: 'employee',
        level: 'BS06', grade: '3', manager_id: '10', hire_date: '2023-03-20',
        contract_type: 'full-time', work_location: '台北總部', avatar: '周', status: 'active',
        education: [
          { degree: '學士', school: '國立台北商業大學', major: '會計', graduation_year: 2022 }
        ],
        skills: ['Accounting', 'Tax', 'Financial Analysis'],
        certifications: [
          { cert_name: 'CPA', issued_date: '2023-09-01', expiry_date: null }
        ]
      },
      // 工程部 - 資深等級 (專業職)
      {
        id: '2', employee_no: 'E2021015', name: '林雅文', email: 'lin.yw@company.com',
        phone: '0923-222-222', department: '工程部', position: '工程師', role: 'employee',
        level: 'BS06', grade: '3', manager_id: '5', hire_date: '2021-06-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '林', status: 'active',
        education: [
          { degree: '學士', school: '國立交通大學', major: '資訊管理', graduation_year: 2020 }
        ],
        skills: ['React', 'Vue', 'CSS', 'JavaScript'],
        certifications: []
      },
      // 業務部 - 專員級
      {
        id: '3', employee_no: 'E2022030', name: '王建國', email: 'wang.jg@company.com',
        phone: '0934-333-333', department: '業務部', position: '業務', role: 'employee',
        level: 'BS03', grade: '2', manager_id: '6', hire_date: '2022-09-10',
        contract_type: 'full-time', work_location: '台中辦公室', avatar: '王', status: 'active',
        education: [
          { degree: '學士', school: '東海大學', major: '企業管理', graduation_year: 2021 }
        ],
        skills: ['Sales', 'Negotiation', 'CRM'],
        certifications: [
          { cert_name: '業務專業證照', issued_date: '2023-03-01', expiry_date: null }
        ]
      },
      // 專案部 - 專員級
      {
        id: '12', employee_no: 'E2023055', name: '劉佳玲', email: 'liu.jl@company.com',
        phone: '0955-333-444', department: '專案部', position: '專員', role: 'employee',
        level: 'BS03', grade: '2', manager_id: '11', hire_date: '2023-05-15',
        contract_type: 'full-time', work_location: '台北總部', avatar: '劉', status: 'active',
        education: [
          { degree: '學士', school: '國立中興大學', major: '企業管理', graduation_year: 2022 }
        ],
        skills: ['Documentation', 'Scheduling', 'Communication'],
        certifications: []
      },
      // 人資部 - 專員級 (新進)
      {
        id: '4', employee_no: 'E2024050', name: '陳美玲', email: 'chen.ml@company.com',
        phone: '0945-444-444', department: '人資部', position: '專員', role: 'employee',
        level: 'BS02', grade: '2', manager_id: '7', hire_date: '2024-08-01',
        contract_type: 'full-time', work_location: '台北總部', avatar: '陳', status: 'active',
        education: [
          { degree: '碩士', school: '國立政治大學', major: '人力資源管理', graduation_year: 2024 }
        ],
        skills: ['Recruitment', 'Training', 'HRIS'],
        certifications: []
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
        id, employee_no, name, email, phone, department, position, role,
        level, grade, manager_id, hire_date, contract_type, work_location,
        avatar, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        emp.department, emp.position, emp.role || 'employee', emp.level, emp.grade, emp.manager_id,
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

/**
 * 遷移 monthly_checks 資料表
 * 為月度檢核表新增電子簽名欄位
 */
function migrateMonthlyChecksSignature() {
  try {
    // 取得現有欄位清單
    const columnsResult = db.exec(`PRAGMA table_info(monthly_checks)`);
    const existingColumns = columnsResult.length > 0
      ? columnsResult[0].values.map(row => row[1])
      : [];

    // 需要新增的簽名欄位
    const columnsToAdd = [
      { name: 'employee_signature', type: 'TEXT' },         // 員工自評簽名 (base64)
      { name: 'employee_signature_date', type: 'TEXT' },    // 員工簽名日期
      { name: 'manager_signature', type: 'TEXT' },          // 主管審核簽名 (base64)
      { name: 'manager_signature_date', type: 'TEXT' },     // 主管簽名日期
      { name: 'hr_signature', type: 'TEXT' },               // HR結案簽名 (base64)
      { name: 'hr_signature_date', type: 'TEXT' }           // HR簽名日期
    ];

    // 新增缺少的欄位
    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        db.run(`ALTER TABLE monthly_checks ADD COLUMN ${col.name} ${col.type}`);
        console.log(`📝 Added column '${col.name}' to monthly_checks table`);
      }
    }
  } catch (error) {
    console.error('Migration error (monthly_checks signature):', error.message);
  }
}

/**
 * 遷移 weekly_reports 資料表
 * 為週報表新增擴充欄位
 */
function migrateWeeklyReportsTable() {
  try {
    // 取得 weekly_reports 現有欄位
    const wrColumnsResult = db.exec(`PRAGMA table_info(weekly_reports)`);
    const wrExistingColumns = wrColumnsResult.length > 0
      ? wrColumnsResult[0].values.map(row => row[1])
      : [];

    // 週報主表需要新增的欄位
    const wrColumnsToAdd = [
      { name: 'weekly_summary', type: 'TEXT' },
      { name: 'routine_total_minutes', type: 'INTEGER DEFAULT 0' },
      { name: 'non_routine_total_minutes', type: 'INTEGER DEFAULT 0' },
      { name: 'employee_signature', type: 'TEXT' },
      { name: 'employee_signature_date', type: 'TEXT' },
      { name: 'manager_signature', type: 'TEXT' },
      { name: 'manager_signature_date', type: 'TEXT' }
    ];

    for (const col of wrColumnsToAdd) {
      if (!wrExistingColumns.includes(col.name)) {
        db.run(`ALTER TABLE weekly_reports ADD COLUMN ${col.name} ${col.type}`);
        console.log(`📝 Added column '${col.name}' to weekly_reports table`);
      }
    }

    // 取得 weekly_report_items 現有欄位
    const wriColumnsResult = db.exec(`PRAGMA table_info(weekly_report_items)`);
    const wriExistingColumns = wriColumnsResult.length > 0
      ? wriColumnsResult[0].values.map(row => row[1])
      : [];

    // 週報項目表需要新增的欄位
    const wriColumnsToAdd = [
      { name: 'estimated_time', type: 'INTEGER DEFAULT 0' },
      { name: 'actual_time', type: 'INTEGER DEFAULT 0' },
      { name: 'completed_date', type: 'TEXT' }
    ];

    for (const col of wriColumnsToAdd) {
      if (!wriExistingColumns.includes(col.name)) {
        db.run(`ALTER TABLE weekly_report_items ADD COLUMN ${col.name} ${col.type}`);
        console.log(`📝 Added column '${col.name}' to weekly_report_items table`);
      }
    }

    console.log('✅ 週報表格遷移完成');
  } catch (error) {
    console.error('Migration error (weekly_reports):', error.message);
  }
}

/**
 * 建立職等職級相關資料表並填入 seed data
 */
function initGradeMatrixTables() {
  try {
    // 1. 建立部門資料表
    db.run(`
      CREATE TABLE IF NOT EXISTS departments (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 2. 建立職等資料表
    db.run(`
      CREATE TABLE IF NOT EXISTS grade_levels (
        id TEXT PRIMARY KEY,
        grade INTEGER UNIQUE NOT NULL,
        code_range TEXT,
        title_management TEXT,
        title_professional TEXT,
        education_requirement TEXT,
        responsibility_description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 3. 建立職級薪資資料表
    db.run(`
      CREATE TABLE IF NOT EXISTS grade_salary_levels (
        id TEXT PRIMARY KEY,
        grade INTEGER NOT NULL,
        code TEXT UNIQUE NOT NULL,
        salary INTEGER NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (grade) REFERENCES grade_levels(grade)
      )
    `);

    // 4. 建立部門職位對照資料表
    db.run(`
      CREATE TABLE IF NOT EXISTS department_positions (
        id TEXT PRIMARY KEY,
        department TEXT NOT NULL,
        grade INTEGER NOT NULL,
        title TEXT NOT NULL,
        track TEXT NOT NULL,
        supervised_departments TEXT DEFAULT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (department) REFERENCES departments(name),
        FOREIGN KEY (grade) REFERENCES grade_levels(grade)
      )
    `);

    // 5. 建立晉升條件資料表
    db.run(`
      CREATE TABLE IF NOT EXISTS promotion_criteria (
        id TEXT PRIMARY KEY,
        from_grade INTEGER NOT NULL,
        to_grade INTEGER NOT NULL,
        track TEXT NOT NULL,
        required_skills TEXT,
        required_courses TEXT,
        performance_threshold INTEGER,
        kpi_focus TEXT,
        additional_criteria TEXT,
        promotion_procedure TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (from_grade) REFERENCES grade_levels(grade),
        FOREIGN KEY (to_grade) REFERENCES grade_levels(grade)
      )
    `);

    // 6. 建立職涯路徑資料表
    db.run(`
      CREATE TABLE IF NOT EXISTS career_paths (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        from_position TEXT,
        to_position TEXT,
        estimated_time TEXT,
        steps TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // 檢查是否需要 seed data
    const deptCount = prepare('SELECT COUNT(*) as count FROM departments').get();
    if (deptCount.count === 0) {
      seedGradeMatrixData();
    }

    // 檢查是否需要 seed promotion_criteria 和 career_paths
    const promoCount = prepare('SELECT COUNT(*) as count FROM promotion_criteria').get();
    if (promoCount.count === 0) {
      seedPromotionAndCareerData();
    }

    console.log('✅ 職等職級資料表已建立');
  } catch (error) {
    console.error('Error initializing grade matrix tables:', error.message);
  }
}

/**
 * 職務說明書 (Job Descriptions) 資料表
 * 須在 initGradeMatrixTables 之後執行（依賴 departments, grade_levels）
 */
function initJobDescriptionsTable() {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS job_descriptions (
        id TEXT PRIMARY KEY,
        position_code TEXT UNIQUE NOT NULL,
        position_name TEXT NOT NULL,
        department TEXT NOT NULL,
        grade INTEGER,
        grade_code TEXT,
        position_title TEXT,
        summary TEXT,
        version TEXT DEFAULT '1.0',
        status TEXT DEFAULT 'draft',
        responsibilities TEXT DEFAULT '[]',
        job_purpose TEXT DEFAULT '[]',
        qualifications TEXT DEFAULT '[]',
        vfp TEXT DEFAULT '[]',
        competency_standards TEXT DEFAULT '[]',
        required_competencies TEXT DEFAULT '[]',
        core_competency_requirements TEXT DEFAULT '[]',
        management_competency_requirements TEXT DEFAULT '[]',
        professional_competency_requirements TEXT DEFAULT '[]',
        ksa_competency_requirements TEXT DEFAULT '[]',
        ksa_content TEXT,
        work_description TEXT DEFAULT '[]',
        checklist TEXT DEFAULT '[]',
        job_duties TEXT DEFAULT '[]',
        daily_tasks TEXT DEFAULT '[]',
        weekly_tasks TEXT DEFAULT '[]',
        monthly_tasks TEXT DEFAULT '[]',
        created_by TEXT DEFAULT 'system',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (department) REFERENCES departments(name),
        FOREIGN KEY (grade) REFERENCES grade_levels(grade)
      )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_job_descriptions_department ON job_descriptions(department)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_job_descriptions_grade ON job_descriptions(grade)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_job_descriptions_status ON job_descriptions(status)`);
    console.log('✅ 職務說明書資料表已建立');
  } catch (error) {
    console.error('Error initializing job_descriptions table:', error.message);
  }
}

/**
 * 填入職等職級 seed data
 */
function seedGradeMatrixData() {
  console.log('🌱 Seeding grade matrix data...');

  // 1. 插入部門資料
  const departments = [
    { id: 'dept-ceo', name: '執行長辦公室', code: 'CEO', sort_order: 1 },
    { id: 'dept-admin', name: '行政部', code: 'ADM', sort_order: 2 },
    { id: 'dept-fin', name: '財務部', code: 'FIN', sort_order: 3 },
    { id: 'dept-proj', name: '專案部', code: 'PRJ', sort_order: 4 },
    { id: 'dept-hr', name: '人資部', code: 'HR', sort_order: 5 },
    { id: 'dept-sales', name: '業務部', code: 'SAL', sort_order: 6 },
    { id: 'dept-eng', name: '工程部', code: 'ENG', sort_order: 7 }
  ];

  const deptStmt = prepare(`
    INSERT OR IGNORE INTO departments (id, name, code, sort_order) VALUES (?, ?, ?, ?)
  `);
  for (const dept of departments) {
    deptStmt.run(dept.id, dept.name, dept.code, dept.sort_order);
  }

  // 2. 插入職等資料
  const gradeLevels = [
    { id: 'grade-1', grade: 1, code_range: 'BS01', title_management: '新人級', title_professional: '新人級', education_requirement: '符合職位學歷與經歷條件，應屆畢業生或新進人員', responsibility_description: '新進人員學習與適應：培養工作技能、技術支援、基礎執行' },
    { id: 'grade-2', grade: 2, code_range: 'BS02-BS04', title_management: '專員級', title_professional: '專員級', education_requirement: '符合職位學歷條件，1-2 年經驗或初級專員', responsibility_description: '基礎行政與專案執行：針對指派之工作職務，能在主管的協助下產出職務成果' },
    { id: 'grade-3', grade: 3, code_range: 'BS05-BS07', title_management: '儲備幹部 (MA)', title_professional: '資深等級', education_requirement: '大學或專科，1-4 年專業或管理經驗', responsibility_description: '儲備管理與執行日常業務與任務：學習管理技能，準備晉升' },
    { id: 'grade-4', grade: 4, code_range: 'BS08-BS10', title_management: '基層管理 (副理)', title_professional: '中階等級', education_requirement: '大學以上，3-6 年專業技術或基層管理經驗', responsibility_description: '基層管理與專案執行：負責日常管理、員工培訓' },
    { id: 'grade-5', grade: 5, code_range: 'BS11-BS13', title_management: '中階管理 (經理)', title_professional: '高階等級', education_requirement: '大學以上，5-8 年管理經驗或專業技術', responsibility_description: '團隊管理與營運推動：帶領團隊完成部門目標，提升績效' },
    { id: 'grade-6', grade: 6, code_range: 'BS14-BS16', title_management: '高階管理 VP', title_professional: '專家等級', education_requirement: '大學以上，5-8 年管理經驗或專業技術', responsibility_description: '部門經營與策略管理：領導中階主管，確保業務策略執行' },
    { id: 'grade-7', grade: 7, code_range: 'BS17-BS20', title_management: '營運管理 (執行長/營運長)', title_professional: '-', education_requirement: '碩士以上，10-15 年以上高階管理經驗', responsibility_description: '高階決策與策略管理：企業決策與經營戰略、制定公司政策、跨部門協調、資源分配' }
  ];

  const gradeStmt = prepare(`
    INSERT OR IGNORE INTO grade_levels (id, grade, code_range, title_management, title_professional, education_requirement, responsibility_description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const g of gradeLevels) {
    gradeStmt.run(g.id, g.grade, g.code_range, g.title_management, g.title_professional, g.education_requirement, g.responsibility_description);
  }

  // 3. 插入職級薪資資料
  const salaryLevels = [
    { id: 'sal-01', grade: 1, code: 'BS01', salary: 35000, order: 1 },
    { id: 'sal-02', grade: 2, code: 'BS02', salary: 35000, order: 1 },
    { id: 'sal-03', grade: 2, code: 'BS03', salary: 38000, order: 2 },
    { id: 'sal-04', grade: 2, code: 'BS04', salary: 41000, order: 3 },
    { id: 'sal-05', grade: 3, code: 'BS05', salary: 42000, order: 1 },
    { id: 'sal-06', grade: 3, code: 'BS06', salary: 45000, order: 2 },
    { id: 'sal-07', grade: 3, code: 'BS07', salary: 48000, order: 3 },
    { id: 'sal-08', grade: 4, code: 'BS08', salary: 49000, order: 1 },
    { id: 'sal-09', grade: 4, code: 'BS09', salary: 53000, order: 2 },
    { id: 'sal-10', grade: 4, code: 'BS10', salary: 57000, order: 3 },
    { id: 'sal-11', grade: 5, code: 'BS11', salary: 58000, order: 1 },
    { id: 'sal-12', grade: 5, code: 'BS12', salary: 61000, order: 2 },
    { id: 'sal-13', grade: 5, code: 'BS13', salary: 64000, order: 3 },
    { id: 'sal-14', grade: 6, code: 'BS14', salary: 65000, order: 1 },
    { id: 'sal-15', grade: 6, code: 'BS15', salary: 77000, order: 2 },
    { id: 'sal-16', grade: 6, code: 'BS16', salary: 89000, order: 3 },
    { id: 'sal-17', grade: 7, code: 'BS17', salary: 90000, order: 1 },
    { id: 'sal-18', grade: 7, code: 'BS18', salary: 100000, order: 2 },
    { id: 'sal-19', grade: 7, code: 'BS19', salary: 110000, order: 3 },
    { id: 'sal-20', grade: 7, code: 'BS20', salary: 120000, order: 4 }
  ];

  const salaryStmt = prepare(`
    INSERT OR IGNORE INTO grade_salary_levels (id, grade, code, salary, sort_order) VALUES (?, ?, ?, ?, ?)
  `);
  for (const s of salaryLevels) {
    salaryStmt.run(s.id, s.grade, s.code, s.salary, s.order);
  }

  // 4. 插入部門職位對照資料
  const positions = [
    // Grade 7 - 營運管理（跨部門高階主管）
    { id: 'pos-ceo-7-m', department: '執行長辦公室', grade: 7, title: '執行長', track: 'management', supervisedDepartments: null },
    { id: 'pos-coo-7-m', department: '執行長辦公室', grade: 7, title: '營運長', track: 'management', supervisedDepartments: JSON.stringify(['行政部', '財務部', '專案部', '人資部', '業務部', '工程部']) },
    // Grade 6 - 高階管理/專家
    { id: 'pos-admin-6-m', department: '行政部', grade: 6, title: '行政長', track: 'management' },
    { id: 'pos-fin-6-m', department: '財務部', grade: 6, title: '財務長', track: 'management' },
    { id: 'pos-hr-6-m', department: '人資部', grade: 6, title: '人資長', track: 'management' },
    { id: 'pos-sales-6-m', department: '業務部', grade: 6, title: '業務長', track: 'management' },
    { id: 'pos-eng-6-m', department: '工程部', grade: 6, title: '技術長', track: 'management' },
    { id: 'pos-fin-6-p', department: '財務部', grade: 6, title: '高級主辦會計', track: 'professional' },
    { id: 'pos-proj-6-p', department: '專案部', grade: 6, title: '高級專案經理', track: 'professional' },
    { id: 'pos-hr-6-p', department: '人資部', grade: 6, title: '高階管理師', track: 'professional' },
    { id: 'pos-sales-6-p', department: '業務部', grade: 6, title: '銷售專家', track: 'professional' },
    { id: 'pos-eng-6-p', department: '工程部', grade: 6, title: '產品經理', track: 'professional' },
    // Grade 5 - 中階管理/高階等級
    { id: 'pos-admin-5-m', department: '行政部', grade: 5, title: '經理', track: 'management' },
    { id: 'pos-fin-5-m', department: '財務部', grade: 5, title: '經理', track: 'management' },
    { id: 'pos-proj-5-m', department: '專案部', grade: 5, title: '經理', track: 'management' },
    { id: 'pos-hr-5-m', department: '人資部', grade: 5, title: '經理', track: 'management' },
    { id: 'pos-sales-5-m', department: '業務部', grade: 5, title: '經理', track: 'management' },
    { id: 'pos-eng-5-m', department: '工程部', grade: 5, title: '經理', track: 'management' },
    { id: 'pos-ceo-5-p', department: '執行長辦公室', grade: 5, title: '高階特別助理', track: 'professional' },
    { id: 'pos-admin-5-p', department: '行政部', grade: 5, title: '高級專員', track: 'professional' },
    { id: 'pos-fin-5-p', department: '財務部', grade: 5, title: '主辦會計', track: 'professional' },
    { id: 'pos-proj-5-p', department: '專案部', grade: 5, title: '專案經理', track: 'professional' },
    { id: 'pos-hr-5-p', department: '人資部', grade: 5, title: '專案管理師', track: 'professional' },
    { id: 'pos-sales-5-p', department: '業務部', grade: 5, title: '銷售經理', track: 'professional' },
    { id: 'pos-eng-5-p', department: '工程部', grade: 5, title: '高階工程師', track: 'professional' },
    // Grade 4 - 基層管理/中階等級
    { id: 'pos-admin-4-m', department: '行政部', grade: 4, title: '副理', track: 'management' },
    { id: 'pos-fin-4-m', department: '財務部', grade: 4, title: '副理', track: 'management' },
    { id: 'pos-proj-4-m', department: '專案部', grade: 4, title: '副理', track: 'management' },
    { id: 'pos-hr-4-m', department: '人資部', grade: 4, title: '副理', track: 'management' },
    { id: 'pos-sales-4-m', department: '業務部', grade: 4, title: '副理', track: 'management' },
    { id: 'pos-eng-4-m', department: '工程部', grade: 4, title: '副理', track: 'management' },
    { id: 'pos-ceo-4-p', department: '執行長辦公室', grade: 4, title: '執行長秘書', track: 'professional' },
    { id: 'pos-admin-4-p', department: '行政部', grade: 4, title: '資深專員', track: 'professional' },
    { id: 'pos-fin-4-p', department: '財務部', grade: 4, title: '成本會計', track: 'professional' },
    { id: 'pos-proj-4-p', department: '專案部', grade: 4, title: '專案管理師', track: 'professional' },
    { id: 'pos-hr-4-p', department: '人資部', grade: 4, title: '管理師', track: 'professional' },
    { id: 'pos-sales-4-p', department: '業務部', grade: 4, title: '資深業務', track: 'professional' },
    { id: 'pos-eng-4-p', department: '工程部', grade: 4, title: '資深工程師', track: 'professional' },
    // Grade 3 - 儲備幹部/資深等級
    { id: 'pos-admin-3-m', department: '行政部', grade: 3, title: 'MA', track: 'management' },
    { id: 'pos-fin-3-m', department: '財務部', grade: 3, title: 'MA', track: 'management' },
    { id: 'pos-proj-3-m', department: '專案部', grade: 3, title: 'MA', track: 'management' },
    { id: 'pos-hr-3-m', department: '人資部', grade: 3, title: 'MA', track: 'management' },
    { id: 'pos-sales-3-m', department: '業務部', grade: 3, title: 'MA', track: 'management' },
    { id: 'pos-eng-3-m', department: '工程部', grade: 3, title: 'MA', track: 'management' },
    { id: 'pos-ceo-3-p', department: '執行長辦公室', grade: 3, title: '主管秘書', track: 'professional' },
    { id: 'pos-admin-3-p', department: '行政部', grade: 3, title: '專員', track: 'professional' },
    { id: 'pos-fin-3-p', department: '財務部', grade: 3, title: '會計', track: 'professional' },
    { id: 'pos-proj-3-p', department: '專案部', grade: 3, title: '專員', track: 'professional' },
    { id: 'pos-hr-3-p', department: '人資部', grade: 3, title: '專員', track: 'professional' },
    { id: 'pos-sales-3-p', department: '業務部', grade: 3, title: '業務', track: 'professional' },
    { id: 'pos-eng-3-p', department: '工程部', grade: 3, title: '工程師', track: 'professional' },
    // Grade 2 - 專員級
    { id: 'pos-ceo-2-p', department: '執行長辦公室', grade: 2, title: '執行秘書', track: 'professional' },
    { id: 'pos-admin-2-p', department: '行政部', grade: 2, title: '專員', track: 'professional' },
    { id: 'pos-fin-2-p', department: '財務部', grade: 2, title: '會計', track: 'professional' },
    { id: 'pos-proj-2-p', department: '專案部', grade: 2, title: '專員', track: 'professional' },
    { id: 'pos-hr-2-p', department: '人資部', grade: 2, title: '專員', track: 'professional' },
    { id: 'pos-sales-2-p', department: '業務部', grade: 2, title: '業務', track: 'professional' },
    { id: 'pos-eng-2-p', department: '工程部', grade: 2, title: '工程師', track: 'professional' },
    // Grade 1 - 新人級
    { id: 'pos-all-1', department: '全部門', grade: 1, title: '新人', track: 'both' }
  ];

  const posStmt = prepare(`
    INSERT OR IGNORE INTO department_positions (id, department, grade, title, track, supervised_departments) VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const p of positions) {
    posStmt.run(p.id, p.department, p.grade, p.title, p.track, p.supervisedDepartments || null);
  }

  console.log('✅ Seeded grade matrix data: 7 departments, 7 grades, 20 salary levels, 58 positions');
}

/**
 * 填入晉升條件與職涯路徑 seed data
 */
function seedPromotionAndCareerData() {
  console.log('🌱 Seeding promotion criteria and career paths data...');

  // 1. 晉升條件資料
  const promotionCriteria = [
    {
      id: 'promo-1-2',
      from_grade: 1,
      to_grade: 2,
      track: 'both',
      required_skills: JSON.stringify(['基礎技術與執行力']),
      required_courses: JSON.stringify(['通識必修課程']),
      performance_threshold: 85,
      kpi_focus: JSON.stringify(['職場適應度', '基本技能學習', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify([]),
      promotion_procedure: '完成「通識必修課程」是晉升專員的必要條件之一'
    },
    {
      id: 'promo-2-3-mgmt',
      from_grade: 2,
      to_grade: 3,
      track: 'management',
      required_skills: JSON.stringify(['基礎技術與執行力', '獨立作業能力']),
      required_courses: JSON.stringify(['專員必修課程']),
      performance_threshold: 90,
      kpi_focus: JSON.stringify(['任務達成', '工作態度', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify(['學習管理技能，準備晉升']),
      promotion_procedure: '完成「專員必修課程」是晉升儲備幹部的必要條件之一'
    },
    {
      id: 'promo-2-3-prof',
      from_grade: 2,
      to_grade: 3,
      track: 'professional',
      required_skills: JSON.stringify(['基礎技術與執行力', '獨立作業能力']),
      required_courses: JSON.stringify(['專員必修課程']),
      performance_threshold: 90,
      kpi_focus: JSON.stringify(['任務達成', '工作態度', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify([]),
      promotion_procedure: '完成「專員必修課程」是晉升資深等級的必要條件之一'
    },
    {
      id: 'promo-3-4-mgmt',
      from_grade: 3,
      to_grade: 4,
      track: 'management',
      required_skills: JSON.stringify(['2 年以上技術或業務經驗', '問題解決', '獨立作業能力', '內部專案主導經驗']),
      required_courses: JSON.stringify(['儲備幹部必修課程']),
      performance_threshold: 100,
      kpi_focus: JSON.stringify(['任務執行力', '技術測試', '學習發展', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify(['轄下職務有效運作', '培訓出至少一名接班人']),
      promotion_procedure: '直屬主管確認該員工在任職到「適用職位」時，檢附職責內容與訓練記錄，送交「晉升評核委員會」審議通過，次月起晉升為基層管理職'
    },
    {
      id: 'promo-3-4-prof',
      from_grade: 3,
      to_grade: 4,
      track: 'professional',
      required_skills: JSON.stringify(['2 年以上技術或業務經驗', '問題解決', '獨立作業能力', '內部專案主導經驗']),
      required_courses: JSON.stringify(['資深等級必修課程']),
      performance_threshold: 100,
      kpi_focus: JSON.stringify(['任務執行力', '技術測試', '學習發展', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify([]),
      promotion_procedure: '直屬主管確認該員工在任職到「適用職位」時，檢附職責內容與訓練記錄，送交「晉升評核委員會」審議通過'
    },
    {
      id: 'promo-4-5-mgmt',
      from_grade: 4,
      to_grade: 5,
      track: 'management',
      required_skills: JSON.stringify(['2 年以上績效達標', '內部專案主導經驗']),
      required_courses: JSON.stringify(['基層管理必修課程']),
      performance_threshold: 100,
      kpi_focus: JSON.stringify(['工作效率', '人才培育', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify(['轄下職務均能有效運作', '培訓出至少一名職位接班候選人', '連續維持轄下職務均能有效運作滿一年以上', '成功培訓出一名職位接班人選']),
      promotion_procedure: '直屬主管確認該員工在任職到「適用職位」時，檢附職責內容與訓練記錄，送交「晉升評核委員會」審議通過，次月起晉升為中階管理職'
    },
    {
      id: 'promo-4-5-prof',
      from_grade: 4,
      to_grade: 5,
      track: 'professional',
      required_skills: JSON.stringify(['2 年以上績效達標', '內部專案主導經驗']),
      required_courses: JSON.stringify(['中階等級必修課程']),
      performance_threshold: 100,
      kpi_focus: JSON.stringify(['產品開發與改進', '數據分析', '專案交付品質', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify([]),
      promotion_procedure: '直屬主管確認該員工在任職到「適用職位」時，檢附職責內容與訓練記錄，送交「晉升評核委員會」審議通過'
    },
    {
      id: 'promo-5-6-mgmt',
      from_grade: 5,
      to_grade: 6,
      track: 'management',
      required_skills: JSON.stringify(['3 年以上管理經驗', '團隊管理', '目標導向']),
      required_courses: JSON.stringify(['中階管理必修課程']),
      performance_threshold: 110,
      kpi_focus: JSON.stringify(['團隊管理績效', '專案計畫達成率', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify(['年度員工滿意度達 75%', '轄下 2/3 以上的單位有正式副理，且 2/3 以上的功能有效運作', '年度員工滿意度達 80%', '年度員工留任率達 80%']),
      promotion_procedure: '由執行長檢附相關資料，提出綜評報告送交企業主進行面談，核可後晉升高階管理 VP-BS14'
    },
    {
      id: 'promo-5-6-prof',
      from_grade: 5,
      to_grade: 6,
      track: 'professional',
      required_skills: JSON.stringify(['3 年以上專案主導經驗', '目標導向']),
      required_courses: JSON.stringify(['高階等級必修課程']),
      performance_threshold: 110,
      kpi_focus: JSON.stringify(['技術標準制定', '專案交付品質', '專案計畫達成率', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify([]),
      promotion_procedure: '由執行長檢附相關資料，提出綜評報告送交企業主進行面談，核可後晉升專家等級 BS14'
    },
    {
      id: 'promo-6-7-mgmt',
      from_grade: 6,
      to_grade: 7,
      track: 'management',
      required_skills: JSON.stringify(['連續 2 年達標，貢獻策略發展', '領導決策', '策略思維']),
      required_courses: JSON.stringify(['高階管理必修課程']),
      performance_threshold: 120,
      kpi_focus: JSON.stringify(['部門績效', '策略執行', '人才培育', '對照 JD 職能匹配結果']),
      additional_criteria: JSON.stringify(['轄下 2/3 以上的單位有正式的經理，且 2/3 以上的功能有效運作', '年度員工滿意度達 75%', '年度員工滿意度達 80%', '年度員工留任率達 80%']),
      promotion_procedure: '由執行長檢附相關資料，提出綜評報告送交企業主進行面談，核可後晉升經營管理-BS17'
    }
  ];

  const promoStmt = prepare(`
    INSERT OR IGNORE INTO promotion_criteria (id, from_grade, to_grade, track, required_skills, required_courses, performance_threshold, kpi_focus, additional_criteria, promotion_procedure)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of promotionCriteria) {
    promoStmt.run(p.id, p.from_grade, p.to_grade, p.track, p.required_skills, p.required_courses, p.performance_threshold, p.kpi_focus, p.additional_criteria, p.promotion_procedure);
  }

  // 2. 職涯路徑資料
  const careerPaths = [
    {
      id: 'path-vertical-mgmt',
      type: 'vertical',
      name: '管理職垂直晉升',
      description: '從新人級一路晉升至營運管理級，走管理職發展路線',
      from_position: '新人級 (Grade 1)',
      to_position: '營運管理 (Grade 7)',
      estimated_time: '10-15年',
      steps: JSON.stringify([
        { order: 1, title: '新人級 (BS01)', grade: 1, description: '培養工作技能、技術支援、基礎執行', duration: '1年', required_courses: ['通識必修課程'], performance_threshold: 85 },
        { order: 2, title: '專員級 (BS02-BS04)', grade: 2, description: '基礎行政與專案執行', duration: '1-2年', required_courses: ['專員必修課程'], performance_threshold: 90 },
        { order: 3, title: '儲備幹部 (BS05-BS07)', grade: 3, description: '學習管理技能，準備晉升', duration: '2-3年', required_courses: ['儲備幹部必修課程'], performance_threshold: 100 },
        { order: 4, title: '基層管理 - 副理 (BS08-BS10)', grade: 4, description: '負責日常管理、員工培訓', duration: '2-3年', required_courses: ['基層管理必修課程'], performance_threshold: 100 },
        { order: 5, title: '中階管理 - 經理 (BS11-BS13)', grade: 5, description: '帶領團隊完成部門目標，提升績效', duration: '2-3年', required_courses: ['中階管理必修課程'], performance_threshold: 110 },
        { order: 6, title: '高階管理 VP (BS14-BS16)', grade: 6, description: '領導中階主管，確保業務策略執行', duration: '3-5年', required_courses: ['高階管理必修課程'], performance_threshold: 120 },
        { order: 7, title: '營運管理 (BS17-BS20)', grade: 7, description: '企業決策與經營戰略', duration: '持續', required_courses: ['經營管理必修課程'], performance_threshold: 120 }
      ])
    },
    {
      id: 'path-vertical-prof',
      type: 'vertical',
      name: '專業職垂直晉升',
      description: '從新人級一路晉升至專家等級，走專業職發展路線',
      from_position: '新人級 (Grade 1)',
      to_position: '專家等級 (Grade 6)',
      estimated_time: '8-12年',
      steps: JSON.stringify([
        { order: 1, title: '新人級 (BS01)', grade: 1, description: '培養工作技能、技術支援、基礎執行', duration: '1年', required_courses: ['通識必修課程'], performance_threshold: 85 },
        { order: 2, title: '專員級 (BS02-BS04)', grade: 2, description: '基礎行政與專案執行', duration: '1-2年', required_courses: ['專員必修課程'], performance_threshold: 90 },
        { order: 3, title: '資深等級 (BS05-BS07)', grade: 3, description: '專員、會計、工程師等專業角色', duration: '2-3年', required_courses: ['資深等級必修課程'], performance_threshold: 100 },
        { order: 4, title: '中階等級 (BS08-BS10)', grade: 4, description: '資深專員、成本會計、資深工程師', duration: '2-3年', required_courses: ['中階等級必修課程'], performance_threshold: 100 },
        { order: 5, title: '高階等級 (BS11-BS13)', grade: 5, description: '主辦會計、專案經理、高階工程師', duration: '2-3年', required_courses: ['高階等級必修課程'], performance_threshold: 110 },
        { order: 6, title: '專家等級 (BS14-BS16)', grade: 6, description: '高級主辦會計、高級專案經理、產品經理', duration: '持續', required_courses: [], performance_threshold: 120 }
      ])
    },
    {
      id: 'path-horizontal',
      type: 'horizontal',
      name: '橫向專業深化',
      description: '在專業職軌道持續深化，從資深等級發展為技術專家',
      from_position: '資深等級 (Grade 3)',
      to_position: '專家等級 (Grade 6)',
      estimated_time: '5-8年',
      steps: JSON.stringify([
        { order: 1, title: '專業認證取得', grade: 3, description: '取得相關專業證照與認證', duration: '1年', required_courses: [], performance_threshold: 100 },
        { order: 2, title: '專業技術提升', grade: 4, description: '深化專業領域技能，成為團隊技術指導', duration: '2-3年', required_courses: ['中階等級必修課程'], performance_threshold: 100 },
        { order: 3, title: '技術專家', grade: 6, description: '成為領域專家，負責技術標準制定', duration: '持續', required_courses: ['高階等級必修課程'], performance_threshold: 110 }
      ])
    },
    {
      id: 'path-cross-dept',
      type: 'cross-department',
      name: '跨部門發展',
      description: '從業務專員轉型為專案管理師，跨部門發展職涯',
      from_position: '業務專員 (Grade 3)',
      to_position: '專案經理 (Grade 5)',
      estimated_time: '3-5年',
      steps: JSON.stringify([
        { order: 1, title: '輪調學習', grade: 3, description: '了解目標部門的業務流程與專案開發流程', duration: '6個月', required_courses: [], performance_threshold: 90 },
        { order: 2, title: '跨部門專案參與', grade: 4, description: '參與跨部門專案，累積專案管理經驗', duration: '1-2年', required_courses: ['中階等級必修課程'], performance_threshold: 100 },
        { order: 3, title: '專案經理', grade: 5, description: '主導專案執行，技術標準制定', duration: '持續', required_courses: ['高階等級必修課程'], performance_threshold: 110 }
      ])
    },
    {
      id: 'path-mgmt-switch',
      type: 'cross-department',
      name: '專業職轉管理職',
      description: '從專業職軌道轉為管理職軌道發展',
      from_position: '資深工程師 (Grade 4 專業職)',
      to_position: '經理 (Grade 5 管理職)',
      estimated_time: '2-4年',
      steps: JSON.stringify([
        { order: 1, title: '儲備幹部培訓', grade: 4, description: '參加管理職儲備幹部培訓計畫', duration: '6個月-1年', required_courses: ['儲備幹部必修課程'], performance_threshold: 100 },
        { order: 2, title: '副理職務代理', grade: 4, description: '代理副理職務，累積管理經驗', duration: '1年', required_courses: ['基層管理必修課程'], performance_threshold: 100 },
        { order: 3, title: '經理', grade: 5, description: '正式晉升為管理職經理', duration: '持續', required_courses: ['中階管理必修課程'], performance_threshold: 110 }
      ])
    }
  ];

  const pathStmt = prepare(`
    INSERT OR IGNORE INTO career_paths (id, type, name, description, from_position, to_position, estimated_time, steps)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const cp of careerPaths) {
    pathStmt.run(cp.id, cp.type, cp.name, cp.description, cp.from_position, cp.to_position, cp.estimated_time, cp.steps);
  }

  console.log('✅ Seeded promotion criteria (10) and career paths (5)');
}

/**
 * 遷移現有員工的職等職級資料
 * 將舊格式 (L1-L6, 技術職/管理職) 轉換為新格式 (Grade 1-7, BS01-BS20)
 */
function migrateEmployeeGradeLevels() {
  try {
    // 檢查是否需要遷移 (檢查是否有使用舊格式的員工)
    const needsMigration = prepare(`
      SELECT COUNT(*) as c FROM employees 
      WHERE (level LIKE 'L%' OR grade NOT IN ('1','2','3','4','5','6','7'))
        AND employee_no IS NOT NULL
    `).get().c;

    if (needsMigration === 0) {
      console.log('📋 Employee grade levels already migrated, skipping...');
      return;
    }

    console.log(`🔄 Migrating ${needsMigration} employee grade levels...`);

    // 職位對應到新的職等職級
    const positionMapping = {
      // Grade 6 - 高階管理 VP
      '行政長': { grade: '6', level: 'BS16', position: '行政長' },
      '財務長': { grade: '6', level: 'BS15', position: '財務長' },
      '技術長': { grade: '6', level: 'BS14', position: '技術長' },
      '業務長': { grade: '6', level: 'BS14', position: '業務長' },
      '人資長': { grade: '6', level: 'BS14', position: '人資長' },
      // Grade 5 - 中階管理
      '經理': { grade: '5', level: 'BS12', position: '經理' },
      '專案主管': { grade: '5', level: 'BS11', position: '經理' },
      // Grade 4 - 基層管理/中階等級
      '副理': { grade: '4', level: 'BS09', position: '副理' },
      '資深工程師': { grade: '4', level: 'BS09', position: '資深工程師' },
      '管理師': { grade: '4', level: 'BS10', position: '管理師' },
      '產品工程師': { grade: '4', level: 'BS09', position: '資深工程師' },  // 產品工程師 L4 升級為資深工程師
      // Grade 3 - 資深等級
      '工程師': { grade: '3', level: 'BS06', position: '工程師' },
      '會計': { grade: '3', level: 'BS06', position: '會計' },
      '財務會計': { grade: '3', level: 'BS06', position: '會計' },
      // Grade 2 - 專員級
      '專員': { grade: '2', level: 'BS03', position: '專員' },
      '業務': { grade: '2', level: 'BS03', position: '業務' },
      '業務專員': { grade: '2', level: 'BS03', position: '業務' },
      '專案專員': { grade: '2', level: 'BS03', position: '專員' },
      '人資專員': { grade: '2', level: 'BS03', position: '專員' }
    };

    // 取得所有需要遷移的員工
    const employees = prepare(`
      SELECT id, employee_no, name, position, level, grade, role, hire_date
      FROM employees 
      WHERE (level LIKE 'L%' OR grade NOT IN ('1','2','3','4','5','6','7'))
        AND employee_no IS NOT NULL
    `).all();

    const updateStmt = prepare(`
      UPDATE employees SET grade = ?, level = ?, position = ? WHERE id = ?
    `);

    employees.forEach(emp => {
      // 嘗試從職位對應表找到對應
      let mapping = positionMapping[emp.position];

      // 如果找不到直接對應，根據舊的 level 和 role 推斷
      if (!mapping) {
        const oldLevel = emp.level || '';
        const oldRole = emp.role || 'employee';

        // 根據舊 level 推斷新的職等職級
        if (oldLevel === 'L6' || oldLevel === 'L5') {
          mapping = oldRole === 'manager' 
            ? { grade: '6', level: 'BS14', position: emp.position }
            : { grade: '5', level: 'BS12', position: emp.position };
        } else if (oldLevel === 'L4') {
          mapping = oldRole === 'manager'
            ? { grade: '5', level: 'BS11', position: '經理' }
            : { grade: '4', level: 'BS09', position: emp.position };
        } else if (oldLevel === 'L3') {
          mapping = { grade: '3', level: 'BS06', position: emp.position };
        } else if (oldLevel === 'L2') {
          mapping = { grade: '2', level: 'BS03', position: emp.position };
        } else {
          mapping = { grade: '2', level: 'BS02', position: emp.position };
        }
      }

      updateStmt.run(mapping.grade, mapping.level, mapping.position, emp.id);
      console.log(`   Updated ${emp.name}: ${emp.position} → Grade ${mapping.grade} / ${mapping.level}`);
    });

    console.log(`✅ Migrated ${employees.length} employee grade levels`);
  } catch (error) {
    console.error('Error migrating employee grade levels:', error.message);
  }
}

module.exports = { initDatabase, getDatabase, prepare, saveDatabase, clearAllMeetingData };
