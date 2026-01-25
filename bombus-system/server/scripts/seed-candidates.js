const { initDatabase, prepare, saveDatabase } = require('../src/db');
const fs = require('fs');
const path = require('path');

// 刪除資料庫以確保 Schema 更新 (開發環境方便作法)
// 若不刪除，新的欄位不會自動添加 (因為 CREATE TABLE IF NOT EXISTS)
// 但刪除會丟失 jobs 表... 所以更好的方式是 DROP TABLE candidates
// 或者在此腳本執行 migration。
// 為了簡單起見，我們在此腳本 Drop candidates table。

const mockCandidates = [
    // JOB-2025001: 人員招募專員
    {
        id: 'C001', job_id: 'JOB-2025001', name: '林小美', name_en: 'Amy Lin',
        status: 'new', apply_date: '2025-11-23', score: 92,
        education: '國立臺灣大學 心理學系',
        experience: '知名科技公司 人資專員',
        experience_years: 3,
        skills: JSON.stringify(['人才招募', '面試技巧', '薪酬計算', '勞基法']),
        email: 'amy.lin@example.com'
    },
    {
        id: 'C002', job_id: 'JOB-2025001', name: '張志明', name_en: 'Jimmy Chang',
        status: 'new', apply_date: '2025-11-22', score: 85,
        education: '國立政治大學 企業管理系',
        experience: '獵頭顧問',
        experience_years: 2,
        skills: JSON.stringify(['主動開發', '客戶關係', '英文流利']),
        email: 'jimmy.chang@example.com'
    },
    {
        id: 'C003', job_id: 'JOB-2025001', name: '陳建國', name_en: 'Ken Chen',
        status: 'interview', apply_date: '2025-11-10', score: 78,
        education: '輔仁大學 心理系',
        experience: '行政助理',
        experience_years: 1,
        skills: JSON.stringify(['行政文書', '活動舉辦']),
        email: 'ken.chen@example.com'
    },

    // JOB-2025002: 主辦會計 (補齊一般候選人)
    {
        id: 'C020', job_id: 'JOB-2025002', name: '王淑芬', name_en: 'Sophia Wang',
        status: 'new', apply_date: '2025-11-20', score: 88,
        education: '東吳大學 會計系',
        experience: '四大會計師事務所 審計員',
        experience_years: 4,
        skills: JSON.stringify(['審計', '稅務申報', 'Excel VBA']),
        email: 'sophia@example.com'
    },
    {
        id: 'C021', job_id: 'JOB-2025002', name: '李國華', name_en: 'George Lee',
        status: 'interview', apply_date: '2025-11-15', score: 82,
        education: '淡江大學 會計系',
        experience: '傳產公司 會計',
        experience_years: 6,
        skills: JSON.stringify(['成本會計', 'ERP系統']),
        email: 'george@example.com'
    },

    // JOB-2025003: 人資專員 (補齊一般候選人)
    {
        id: 'C022', job_id: 'JOB-2025003', name: '陳怡君', name_en: 'Jessica Chen',
        status: 'new', apply_date: '2025-11-18', score: 85,
        education: '世新大學 口語傳播系',
        experience: '活動公關',
        experience_years: 2,
        skills: JSON.stringify(['員工關係', '活動策劃', '簡報製作']),
        email: 'jessica@example.com'
    },

    // JOB-2025006: 出納會計 (Star Candidates!)
    {
        id: 'C010', job_id: 'JOB-2025006', name: '蔡依林', name_en: 'Jolin Tsai',
        status: 'new', apply_date: '2025-11-22', score: 95,
        education: '輔仁大學 英文系 (輔修會計)',
        experience: '跨國演藝公司 財務長',
        experience_years: 10,
        skills: JSON.stringify(['預算管理', '財務報表', '成本控制', 'SAP ERP']),
        email: 'jolin@sony.com'
    },
    {
        id: 'C011', job_id: 'JOB-2025006', name: '五月天 (阿信)', name_en: 'Ashin',
        status: 'new', apply_date: '2025-11-21', score: 88,
        education: '實踐大學 室內設計系',
        experience: '相信音樂 營運總監',
        experience_years: 8,
        skills: JSON.stringify(['團隊領導', '創意發想', '跨部門溝通']),
        email: 'ashin@bin-music.com'
    },
    {
        id: 'C012', job_id: 'JOB-2025006', name: '張惠妹', name_en: 'A-Mei',
        status: 'new', apply_date: '2025-11-20', score: 90,
        education: '台東農工',
        experience: '聲動娛樂 負責人',
        experience_years: 15,
        skills: JSON.stringify(['專案管理', '公關交涉', '品牌經營']),
        email: 'amei@meirecords.com'
    },
    {
        id: 'C013', job_id: 'JOB-2025006', name: '林俊傑', name_en: 'JJ Lin',
        status: 'new', apply_date: '2025-11-19', score: 92,
        education: '新加坡實龍崗初級學院',
        experience: 'JFJ Productions 執行長',
        experience_years: 12,
        skills: JSON.stringify(['音訊工程', '投資理財', '電競產業']),
        email: 'jj@jfj.com'
    },
    {
        id: 'C014', job_id: 'JOB-2025006', name: '田馥甄', name_en: 'Hebe tien',
        status: 'new', apply_date: '2025-11-18', score: 85,
        education: '新竹女中',
        experience: '樂來樂好 總監',
        experience_years: 6,
        skills: JSON.stringify(['細心專注', '獨立作業', '攝影美學']),
        email: 'hebe@icloud.com'
    },
    {
        id: 'C015', job_id: 'JOB-2025006', name: '蕭敬騰', name_en: 'Jam Hsiao',
        status: 'new', apply_date: '2025-11-17', score: 82,
        education: '亞太創意技術學院',
        experience: '喜鵲娛樂 合夥人',
        experience_years: 5,
        skills: JSON.stringify(['餐飲管理', '危機處理']),
        email: 'jam@lion.com'
    },
    {
        id: 'C016', job_id: 'JOB-2025006', name: '鄧紫棋', name_en: 'G.E.M.',
        status: 'new', apply_date: '2025-11-16', score: 96,
        education: '香港演藝學院',
        experience: 'G Nation Ltd 創辦人',
        experience_years: 9,
        skills: JSON.stringify(['國際市場', '數據分析', 'Python']),
        email: 'gem@google.com'
    },
    {
        id: 'C017', job_id: 'JOB-2025006', name: '王力宏', name_en: 'Leehom Wang',
        status: 'interview', apply_date: '2025-11-10', score: 89,
        education: '威廉士學院 (Williams College)',
        experience: '宏聲音樂 總監',
        experience_years: 20,
        skills: JSON.stringify(['多語言', '音樂製作', 'App開發']),
        email: 'leehom@wang.com'
    },
    {
        id: 'C018', job_id: 'JOB-2025006', name: '陶喆', name_en: 'David Tao',
        status: 'offer', apply_date: '2025-11-05', score: 91,
        education: 'UCLA 心理學系',
        experience: '偉大文化 營運長',
        experience_years: 18,
        skills: JSON.stringify(['心理諮商', '人才培育', 'R&B']),
        email: 'david@tao.com'
    },
    {
        id: 'C019', job_id: 'JOB-2025006', name: '陳奕迅', name_en: 'Eason Chan',
        status: 'rejected', apply_date: '2025-11-01', score: 80,
        education: '金斯頓大學 (Kingston University)',
        experience: 'EAS Music 負責人',
        experience_years: 12,
        skills: JSON.stringify(['溝通協調', '演講技巧']),
        email: 'eason@chan.com'
    }
];

async function seed() {
    console.log('Initializing database...');
    await initDatabase();
    const db = require('../src/db').getDatabase();

    console.log('Dropping candidates table to force validation update...');
    // 為了確保新欄位被加入，我們Drop表重建 (開發環境)
    // 強制使用 prepare 執行 SQL，確保生效
    prepare('DROP TABLE IF EXISTS candidates').run();

    // 手動創建表，確保 Schema 正確
    prepare(`
    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'new',
      score INTEGER DEFAULT 0,
      apply_date TEXT,
      
      -- 詳細履歷欄位
      education TEXT,
      experience TEXT,
      experience_years INTEGER DEFAULT 0,
      skills TEXT,
      resume_url TEXT,
      ai_summary TEXT,
      
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `).run();

    // 重新初始化 (雖然可能不需要，但為了讓 initDatabase 狀態同步)
    // await initDatabase(); 

    console.log('Seeding rich candidates...');
    let count = 0;

    const stmt = prepare(`
    INSERT INTO candidates (
      id, job_id, name, name_en, status, apply_date, score,
      education, experience, experience_years, skills, email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    for (const c of mockCandidates) {
        try {
            stmt.run(
                c.id, c.job_id, c.name, c.name_en, c.status, c.apply_date, c.score,
                c.education, c.experience, c.experience_years, c.skills, c.email
            );
            console.log(`Inserted rich candidate: ${c.name} (${c.name_en})`);
            count++;
        } catch (err) {
            console.error(`Error inserting ${c.name}:`, err.message);
        }
    }

    saveDatabase();
    console.log(`Seed completed. Added ${count} rich candidates.`);
}

seed().catch(console.error);
