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
