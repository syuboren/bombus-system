/**
 * 從 git 中的 competency.service.ts 擷取 9 筆完整 Mock JD，
 * 轉成 seed 用 JSON（DB 欄位格式），寫入同目錄 job_descriptions_seed.json
 *
 * 執行：從 Bombus 專案根目錄
 *   node bombus-system/server/scripts/extract-jds-from-mock.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BOMBUS_ROOT = path.resolve(__dirname, '../../..');
const SERVICE_PATH = 'bombus-system/src/app/features/competency/services/competency.service.ts';

function extractArray(content) {
  const marker = 'const jds: JobDescription[] = [';
  const start = content.indexOf(marker);
  if (start === -1) return null;
  // 陣列開頭是 "= [" 的 [，不是型別註解裡的 []
  const arrayStart = start + marker.length - 1;
  const returnOf = content.indexOf('return of(jds)', arrayStart);
  if (returnOf === -1) return null;
  // 從 arrayStart 的 '[' 到「return of(jds)」前的最外層 ']'，用括號深度追蹤（跳過字串與註解內）
  let depth = 1;
  let pos = arrayStart + 1;
  let i = arrayStart + 1;
  while (i < returnOf && depth > 0) {
    const c = content[i];
    const next = content[i + 1];
    // 跳過 // 行註解
    if (c === '/' && next === '/') {
      const lineEnd = content.indexOf('\n', i);
      i = lineEnd === -1 ? content.length : lineEnd + 1;
      continue;
    }
    // 跳過 /* */ 區塊註解
    if (c === '/' && next === '*') {
      const blockEnd = content.indexOf('*/', i + 2);
      i = blockEnd === -1 ? content.length : blockEnd + 2;
      continue;
    }
    // 字串：跳過至結尾（考慮 \' \" \\）
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      i++;
      while (i < content.length) {
        const x = content[i];
        if (x === '\\') { i += 2; continue; }
        if (x === q) { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return content.substring(arrayStart, i);
}

function gradeLevelToGrade(gl) {
  if (!gl) return null;
  const g = String(gl).toUpperCase();
  if (g === 'C-LEVEL' || g === 'C-Level') return 7;
  if (g === 'P1' || g === 'M0') return 1;
  if (g === 'P2') return 2;
  if (g === 'P3') return 3;
  if (g === 'M1') return 4;
  if (g === 'M2') return 5;
  if (g === 'M3' || g === 'VP') return 6;
  const num = parseInt(gl, 10);
  return isNaN(num) ? null : num;
}

function departmentMap(name) {
  const m = { '技術部': '工程部', '管理部': '行政部' };
  return m[name] || name;
}

function toDbRow(jd) {
  return {
    id: jd.id,
    position_code: jd.positionCode || '',
    position_name: jd.positionName || '',
    department: departmentMap(jd.department || ''),
    grade: gradeLevelToGrade(jd.gradeLevel),
    grade_code: jd.gradeCode || null,
    position_title: jd.positionTitle || jd.positionName || null,
    summary: jd.summary || '',
    version: jd.version || '1.0',
    status: jd.status || 'draft',
    responsibilities: JSON.stringify(Array.isArray(jd.responsibilities) ? jd.responsibilities : []),
    job_purpose: JSON.stringify(Array.isArray(jd.jobPurpose) ? jd.jobPurpose : []),
    qualifications: JSON.stringify(Array.isArray(jd.qualifications) ? jd.qualifications : []),
    vfp: JSON.stringify(Array.isArray(jd.vfp) ? jd.vfp : []),
    competency_standards: JSON.stringify(Array.isArray(jd.competencyStandards) ? jd.competencyStandards : []),
    required_competencies: JSON.stringify(Array.isArray(jd.requiredCompetencies) ? jd.requiredCompetencies : []),
    core_competency_requirements: JSON.stringify(Array.isArray(jd.coreCompetencyRequirements) ? jd.coreCompetencyRequirements : []),
    management_competency_requirements: JSON.stringify(Array.isArray(jd.managementCompetencyRequirements) ? jd.managementCompetencyRequirements : []),
    professional_competency_requirements: JSON.stringify(Array.isArray(jd.professionalCompetencyRequirements) ? jd.professionalCompetencyRequirements : []),
    ksa_competency_requirements: JSON.stringify(Array.isArray(jd.ksaCompetencyRequirements) ? jd.ksaCompetencyRequirements : []),
    ksa_content: jd.ksaContent ? JSON.stringify(jd.ksaContent) : null,
    work_description: JSON.stringify(Array.isArray(jd.workDescription) ? jd.workDescription : []),
    checklist: JSON.stringify(Array.isArray(jd.checklist) ? jd.checklist : []),
    job_duties: JSON.stringify(Array.isArray(jd.jobDuties) ? jd.jobDuties : []),
    daily_tasks: JSON.stringify(Array.isArray(jd.dailyTasks) ? jd.dailyTasks : []),
    weekly_tasks: JSON.stringify(Array.isArray(jd.weeklyTasks) ? jd.weeklyTasks : []),
    monthly_tasks: JSON.stringify(Array.isArray(jd.monthlyTasks) ? jd.monthlyTasks : []),
    created_by: jd.createdBy || 'system'
  };
}

function main() {
  console.log('從 git 讀取 competency.service.ts...');
  let content;
  try {
    content = execSync('git show HEAD:' + SERVICE_PATH, { cwd: BOMBUS_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch (e) {
    console.error('無法從 git 讀取檔案，請在 Bombus 專案根目錄執行。', e.message);
    process.exit(1);
  }

  const arrayStr = extractArray(content);
  if (!arrayStr) {
    console.error('找不到 const jds 陣列');
    process.exit(1);
  }

  const cleaned = arrayStr
    .replace(/new Date\(['"]([^'"]+)['"]\)/g, '"$1"')
    .replace(/ as const/g, '')
    .replace(/:\s*(\d)\s*as Level/g, ': $1');
  let arr;
  try {
    arr = eval('(' + cleaned + ')');
  } catch (e) {
    console.error('解析陣列失敗', e.message);
    process.exit(1);
  }

  if (!Array.isArray(arr) || arr.length === 0) {
    console.error('解析結果不是陣列或為空');
    process.exit(1);
  }

  const rows = arr.map(toDbRow);
  const outPath = path.join(__dirname, 'job_descriptions_seed.json');
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2), 'utf8');
  console.log('已寫入', rows.length, '筆 JD 至', outPath);
}

main();
