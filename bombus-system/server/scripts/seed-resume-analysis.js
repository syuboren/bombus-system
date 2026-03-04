/**
 * Seed Candidate Resume Analysis Data
 * 
 * This script generates mock AI resume analysis results for all candidates in the database.
 * 
 * Usage: node scripts/seed-resume-analysis.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../src/db/onboarding.db');

// ============================================================
// Helper Functions
// ============================================================

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================
// Mock Data Generators
// ============================================================

const JD_REQUIREMENTS = {
  tech: [
    '5年以上前端開發經驗',
    '熟悉 Angular 框架',
    '熟悉 TypeScript',
    '具備 RxJS 使用經驗',
    '熟悉 RESTful API 設計',
    '了解 Git 版本控制',
    '具備 CI/CD 經驗'
  ],
  pm: [
    '3年以上產品管理經驗',
    '具備 Agile/Scrum 經驗',
    '熟悉數據分析工具',
    '良好的跨部門溝通能力',
    '具備技術背景佳'
  ],
  design: [
    '3年以上 UI/UX 設計經驗',
    '熟悉 Figma 或 Sketch',
    '具備用戶研究經驗',
    '了解前端技術佳',
    '具備視覺設計能力'
  ],
  music: [
    '5年以上音樂產業經驗',
    '具備音樂製作能力',
    '熟悉音樂軟體操作',
    '具備現場演出經驗',
    '良好的團隊協作能力'
  ]
};

const TECH_SKILLS = ['Angular', 'TypeScript', 'JavaScript', 'React', 'Vue.js', 'Node.js', 'Python', 'Java', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Git', 'CI/CD', 'PostgreSQL', 'MongoDB'];
const SOFT_SKILLS = ['團隊協作', '溝通能力', '問題解決', '時間管理', '專案管理', '領導能力', '創新思維', '學習能力'];

const WRITING_STYLES = [
  '專業、條理清晰',
  '簡潔扼要、重點明確',
  '詳細完整、資訊豐富',
  '具邏輯性、結構完整',
  '客觀中立、數據導向'
];

const CONTENT_FEATURES = [
  { type: '量化描述', description: '履歷中包含具體數字與成果量化，有助於評估實際貢獻程度' },
  { type: '描述完整度', description: '工作職責與專案成果描述詳細，易於了解實際工作內容' },
  { type: '技能標註', description: '明確標示所使用的技術與工具，便於技能匹配分析' },
  { type: '經歷連貫性', description: '工作經歷時間連續，無明顯空窗期' },
  { type: '專業術語', description: '使用正確的專業術語，顯示對領域的熟悉度' }
];

const AREAS_TO_CLARIFY = [
  '團隊規模與管理範圍未明確說明',
  '跨部門協作經驗描述較簡略',
  '離職原因未說明',
  '專案成果的具體量化數據',
  '技術深度與廣度需進一步確認',
  '英文能力實際應用情境',
  '遠端工作經驗與習慣'
];

const TECH_VERIFICATION_POINTS = [
  'Angular 專案的具體架構設計經驗',
  'TypeScript 進階特性的使用經驗',
  '效能優化的具體實作方式',
  'RxJS 在複雜場景的應用經驗',
  'CI/CD 流程的設計與維護經驗',
  '測試策略與覆蓋率',
  '大型專案的技術決策過程'
];

const EXPERIENCE_SUPPLEMENT_POINTS = [
  '團隊協作中的具體角色與貢獻',
  '跨部門合作的實際案例',
  '過往專案遇到的挑戰與解決方式',
  '技術選型的考量因素',
  '如何保持技術學習與成長',
  '對新技術的學習方法',
  '工作與生活的平衡方式'
];

// ============================================================
// Generate Analysis Data
// ============================================================

function generateAnalysisData(candidate, job) {
  const candidateType = determineCandidateType(candidate);
  const requirements = JD_REQUIREMENTS[candidateType] || JD_REQUIREMENTS.tech;
  
  // 基礎分數：根據候選人的 score 欄位
  const baseScore = candidate.score || randomInt(60, 95);
  
  // 三維分數
  const requirementScore = Math.min(100, baseScore + randomInt(-10, 10));
  const keywordScore = Math.min(100, baseScore + randomInt(-8, 12));
  const experienceScore = Math.min(100, baseScore + randomInt(-5, 15));
  
  // 整體分數（加權平均）
  const overallScore = Math.round(
    requirementScore * 0.4 + 
    keywordScore * 0.35 + 
    experienceScore * 0.25
  );
  
  // 匹配的需求條件
  const matchedCount = Math.floor(requirements.length * (requirementScore / 100));
  const matchedRequirements = requirements.slice(0, matchedCount).map(req => ({
    requirement: req,
    evidence: generateEvidence(req, candidate)
  }));
  
  // 未提及的需求條件
  const unmatchedRequirements = requirements.slice(matchedCount).map(req => ({
    requirement: req,
    note: '履歷中未見相關描述'
  }));
  
  // 技能提取
  let candidateSkills = [];
  try {
    if (candidate.skills) {
      candidateSkills = JSON.parse(candidate.skills);
    }
  } catch (e) {
    candidateSkills = [];
  }
  
  const extractedTechSkills = candidateSkills
    .filter(skill => TECH_SKILLS.some(ts => ts.toLowerCase() === skill.toLowerCase()))
    .slice(0, randomInt(4, 8));
  
  const extractedSoftSkills = SOFT_SKILLS.slice(0, randomInt(3, 5));
  
  // JD 匹配統計
  const jdRequiredTotal = randomInt(7, 10);
  const jdRequiredMatch = Math.min(jdRequiredTotal, Math.floor(jdRequiredTotal * (keywordScore / 100)));
  const jdBonusTotal = randomInt(5, 8);
  const jdBonusMatch = Math.floor(jdBonusTotal * randomInt(40, 80) / 100);
  
  // 經歷相關性分析
  const experienceAnalysis = generateExperienceAnalysis(candidate, experienceScore);
  
  // 履歷內容品質評估
  const writingStyle = randomPick(WRITING_STYLES);
  const analysisConfidence = randomInt(85, 98);
  const contentFeatures = CONTENT_FEATURES.slice(0, randomInt(2, 4));
  const areasToClarify = AREAS_TO_CLARIFY.slice(0, randomInt(2, 4));
  
  // 面試關注點
  const techPoints = TECH_VERIFICATION_POINTS.slice(0, randomInt(3, 5));
  const expPoints = EXPERIENCE_SUPPLEMENT_POINTS.slice(0, randomInt(3, 5));
  
  return {
    overall_match_score: overallScore,
    requirement_match_score: requirementScore,
    keyword_match_score: keywordScore,
    experience_relevance_score: experienceScore,
    matched_requirements: JSON.stringify(matchedRequirements),
    unmatched_requirements: JSON.stringify(unmatchedRequirements),
    bonus_skills: JSON.stringify(['TypeScript', 'RxJS', 'NgRx', 'Jest'].slice(0, randomInt(2, 4))),
    extracted_tech_skills: JSON.stringify(extractedTechSkills),
    extracted_soft_skills: JSON.stringify(extractedSoftSkills),
    jd_required_match_count: jdRequiredMatch,
    jd_required_total_count: jdRequiredTotal,
    jd_bonus_match_count: jdBonusMatch,
    jd_bonus_total_count: jdBonusTotal,
    experience_analysis: JSON.stringify(experienceAnalysis),
    total_relevant_years: candidate.experience_years || randomInt(2, 10),
    jd_required_years: randomInt(3, 5),
    writing_style: writingStyle,
    analysis_confidence: analysisConfidence,
    content_features: JSON.stringify(contentFeatures),
    areas_to_clarify: JSON.stringify(areasToClarify),
    tech_verification_points: JSON.stringify(techPoints),
    experience_supplement_points: JSON.stringify(expPoints),
    analyzed_at: new Date().toISOString(),
    analysis_engine_version: 'Bombus AI v2.1',
    resume_word_count: randomInt(800, 2500)
  };
}

function determineCandidateType(candidate) {
  if (!candidate.skills) return 'tech';
  
  const skills = candidate.skills.toLowerCase();
  if (skills.includes('angular') || skills.includes('react') || skills.includes('javascript')) {
    return 'tech';
  } else if (skills.includes('design') || skills.includes('figma') || skills.includes('ui')) {
    return 'design';
  } else if (skills.includes('product') || skills.includes('project')) {
    return 'pm';
  } else if (skills.includes('music') || skills.includes('音樂')) {
    return 'music';
  }
  return 'tech';
}

function generateEvidence(requirement, candidate) {
  const evidences = [
    `履歷中明確提及相關經驗`,
    `從 ${candidate.current_company || '前公司'} 的工作描述可見`,
    `技能列表中包含相關技術`,
    `工作經歷顯示 ${candidate.experience_years || 3} 年相關經驗`,
    `專案經驗中有相關實作`,
    `證照與認證可佐證`
  ];
  return randomPick(evidences);
}

function generateExperienceAnalysis(candidate, experienceScore) {
  const relevanceLevel = experienceScore >= 85 ? 5 : 
                         experienceScore >= 75 ? 4 : 
                         experienceScore >= 65 ? 3 : 2;
  
  return [
    {
      firm: candidate.current_company || '前公司',
      job: candidate.current_position || '工程師',
      duration: `${Math.min(candidate.experience_years || 2, 5)} 年`,
      relevance_level: relevanceLevel,
      relevance_reasons: [
        '職務類型與職缺一致',
        '技術棧高度重疊',
        '產業經驗相關'
      ].slice(0, randomInt(2, 3))
    }
  ];
}

// ============================================================
// Main Seeding Logic
// ============================================================

async function seedResumeAnalysis() {
  console.log('🚀 Starting resume analysis data seeding...\n');
  
  // Initialize database first to ensure tables exist
  console.log('📦 Initializing database...');
  const { initDatabase } = require('../src/db');
  await initDatabase();
  console.log('✅ Database initialized\n');

  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  // Get all candidates with their jobs
  const stmt = db.prepare(`
    SELECT c.id, c.job_id, c.name, c.score, c.skills, c.experience_years, 
           c.current_company, c.current_position
    FROM candidates c
  `);
  
  const candidates = [];
  while (stmt.step()) {
    candidates.push(stmt.getAsObject());
  }
  stmt.free();

  console.log(`📋 Found ${candidates.length} candidates\n`);

  // Clear existing analysis data
  console.log('🗑️  Clearing existing analysis data...');
  db.run('DELETE FROM candidate_resume_analysis');

  let successCount = 0;

  for (const candidate of candidates) {
    try {
      const analysisData = generateAnalysisData(candidate, null);
      
      db.run(`
        INSERT INTO candidate_resume_analysis (
          id, candidate_id, job_id,
          overall_match_score, requirement_match_score, keyword_match_score, experience_relevance_score,
          matched_requirements, unmatched_requirements, bonus_skills,
          extracted_tech_skills, extracted_soft_skills,
          jd_required_match_count, jd_required_total_count,
          jd_bonus_match_count, jd_bonus_total_count,
          experience_analysis, total_relevant_years, jd_required_years,
          writing_style, analysis_confidence, content_features, areas_to_clarify,
          tech_verification_points, experience_supplement_points,
          analyzed_at, analysis_engine_version, resume_word_count,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuid(),
        candidate.id,
        candidate.job_id,
        analysisData.overall_match_score,
        analysisData.requirement_match_score,
        analysisData.keyword_match_score,
        analysisData.experience_relevance_score,
        analysisData.matched_requirements,
        analysisData.unmatched_requirements,
        analysisData.bonus_skills,
        analysisData.extracted_tech_skills,
        analysisData.extracted_soft_skills,
        analysisData.jd_required_match_count,
        analysisData.jd_required_total_count,
        analysisData.jd_bonus_match_count,
        analysisData.jd_bonus_total_count,
        analysisData.experience_analysis,
        analysisData.total_relevant_years,
        analysisData.jd_required_years,
        analysisData.writing_style,
        analysisData.analysis_confidence,
        analysisData.content_features,
        analysisData.areas_to_clarify,
        analysisData.tech_verification_points,
        analysisData.experience_supplement_points,
        analysisData.analyzed_at,
        analysisData.analysis_engine_version,
        analysisData.resume_word_count,
        new Date().toISOString()
      ]);

      console.log(`✅ ${candidate.name} (${candidate.id}) - 吻合度: ${analysisData.overall_match_score}分`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error processing ${candidate.name}:`, error.message);
    }
  }

  // Save database
  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(DB_PATH, bufferOut);

  console.log('\n✅ Seeding completed!');
  console.log('─'.repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   - Total candidates: ${candidates.length}`);
  console.log(`   - Successfully analyzed: ${successCount}`);
  console.log(`   - Failed: ${candidates.length - successCount}`);
  console.log('─'.repeat(50));
}

// Run
seedResumeAnalysis().catch(console.error);
