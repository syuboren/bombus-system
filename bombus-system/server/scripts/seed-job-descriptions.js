/**
 * 職務說明書 Seed 腳本
 * 若有 job_descriptions_seed.json（由 extract-jds-from-mock.js 產生）則寫入該 9 筆完整 JD，
 * 否則寫入內建 2 筆精簡範例。
 *
 * 執行方式: node scripts/seed-job-descriptions.js
 */

const fs = require('fs');
const path = require('path');
const { initDatabase, prepare, saveDatabase } = require('../src/db');

const seedPath = path.join(__dirname, 'job_descriptions_seed.json');
const seedFromFile = fs.existsSync(seedPath)
  ? JSON.parse(fs.readFileSync(seedPath, 'utf8'))
  : null;

const sampleJDs = [
  {
    id: 'jd-seed-001',
    position_code: 'JD-FIN-6-001',
    position_name: '財務長',
    department: '財務部',
    grade: 6,
    grade_code: 'BS14',
    position_title: '財務長',
    summary: '負責全面管理公司財務部，確保部門的高效運營和協作。',
    version: '1.0',
    status: 'published',
    responsibilities: JSON.stringify(['經營目標設定、經營決策團隊養成', '負責全面管理公司財務部']),
    job_purpose: JSON.stringify(['制定和執行公司的財務策略']),
    qualifications: JSON.stringify(['財務相關碩士或同等學歷', '10年以上財務管理經驗']),
    vfp: JSON.stringify(['財務報表', '預算報告']),
    competency_standards: JSON.stringify([]),
    required_competencies: JSON.stringify([]),
    core_competency_requirements: JSON.stringify([]),
    management_competency_requirements: JSON.stringify([]),
    professional_competency_requirements: JSON.stringify([]),
    ksa_competency_requirements: JSON.stringify([]),
    ksa_content: null,
    work_description: JSON.stringify(['審核財務報表', '管理專案財務']),
    checklist: JSON.stringify([{ item: '報表準確性', points: 1 }]),
    job_duties: JSON.stringify(['編列年度預算']),
    daily_tasks: JSON.stringify(['審核日常單據']),
    weekly_tasks: JSON.stringify(['召開部門週會']),
    monthly_tasks: JSON.stringify(['編製月度報表']),
    created_by: 'system'
  },
  {
    id: 'jd-seed-002',
    position_code: 'JD-HR-5-001',
    position_name: '經理',
    department: '人資部',
    grade: 5,
    grade_code: 'BS11',
    position_title: '經理',
    summary: '負責人資部門營運與團隊管理。',
    version: '1.0',
    status: 'draft',
    responsibilities: JSON.stringify(['部門目標設定', '團隊管理']),
    job_purpose: JSON.stringify(['達成組織人資目標']),
    qualifications: JSON.stringify(['人力資源相關學歷', '5年以上人資經驗']),
    vfp: JSON.stringify(['招募報告', '培訓計畫']),
    competency_standards: JSON.stringify([]),
    required_competencies: JSON.stringify([]),
    core_competency_requirements: JSON.stringify([]),
    management_competency_requirements: JSON.stringify([]),
    professional_competency_requirements: JSON.stringify([]),
    ksa_competency_requirements: JSON.stringify([]),
    ksa_content: null,
    work_description: JSON.stringify(['招募與績效管理']),
    checklist: JSON.stringify([]),
    job_duties: JSON.stringify(['督導人資專員']),
    daily_tasks: JSON.stringify(['處理人事異動']),
    weekly_tasks: JSON.stringify(['週報']),
    monthly_tasks: JSON.stringify(['月報']),
    created_by: 'system'
  }
];

async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║     職務說明書 Seed Script                         ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  await initDatabase();

  const existing = prepare('SELECT COUNT(*) as c FROM job_descriptions').get();
  if (existing.c > 0) {
    console.log('⚠️  job_descriptions 已有資料，跳過 seed（若要重灌請先手動清空）。\n');
    return;
  }

  const toInsert = seedFromFile && seedFromFile.length > 0 ? seedFromFile : sampleJDs;
  console.log('📋 填入職務說明書...', seedFromFile ? `(使用 ${toInsert.length} 筆完整 JD)` : '');
  const stmt = prepare(`
    INSERT INTO job_descriptions (
      id, position_code, position_name, department, grade, grade_code, position_title,
      summary, version, status,
      responsibilities, job_purpose, qualifications, vfp,
      competency_standards, required_competencies,
      core_competency_requirements, management_competency_requirements,
      professional_competency_requirements, ksa_competency_requirements,
      ksa_content, work_description, checklist, job_duties,
      daily_tasks, weekly_tasks, monthly_tasks,
      created_by, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, datetime('now'), datetime('now')
    )
  `);

  for (const jd of toInsert) {
    stmt.run(
      jd.id, jd.position_code, jd.position_name, jd.department, jd.grade, jd.grade_code ?? null, jd.position_title,
      jd.summary, jd.version, jd.status,
      jd.responsibilities, jd.job_purpose, jd.qualifications, jd.vfp,
      jd.competency_standards, jd.required_competencies,
      jd.core_competency_requirements, jd.management_competency_requirements,
      jd.professional_competency_requirements, jd.ksa_competency_requirements,
      jd.ksa_content, jd.work_description, jd.checklist, jd.job_duties,
      jd.daily_tasks, jd.weekly_tasks, jd.monthly_tasks,
      jd.created_by
    );
  }

  saveDatabase();
  console.log(`   ✅ 已填入 ${toInsert.length} 筆職務說明書\n`);
  console.log('✨ Seed 完成！\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
