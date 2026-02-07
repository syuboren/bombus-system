/**
 * 職務說明書 (Job Descriptions) API
 * CRUD + 代碼產生
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prepare, saveDatabase } = require('../db');

// 將 GET /generate-code 放在 /:id 之前，避免被當成 id
router.get('/generate-code', (req, res) => {
  try {
    const department = (req.query.department || '').trim().toUpperCase();
    const grade = parseInt(req.query.grade, 10);
    if (!department || isNaN(grade)) {
      return res.status(400).json({
        success: false,
        error: { message: '需要 department（部門代碼）與 grade（職等數字）' }
      });
    }
    const prefix = `JD-${department}-${grade}-`;
    const rows = prepare(`
      SELECT position_code FROM job_descriptions
      WHERE position_code LIKE ?
    `).all(prefix + '%');
    let maxSeq = 0;
    for (const row of rows) {
      const suffix = row.position_code.slice(prefix.length);
      const num = parseInt(suffix, 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
    const next = String(maxSeq + 1).padStart(3, '0');
    const code = prefix + next;
    res.json({ success: true, data: { positionCode: code } });
  } catch (error) {
    console.error('Generate JD code error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/', (req, res) => {
  try {
    const { status, department } = req.query;
    let sql = 'SELECT * FROM job_descriptions WHERE 1=1';
    const params = [];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (department) {
      sql += ' AND department = ?';
      params.push(department);
    }
    sql += ' ORDER BY created_at DESC';
    const list = prepare(sql).all(...params);
    const data = list.map(rowToJobDescription);
    res.json({ success: true, data });
  } catch (error) {
    console.error('List job descriptions error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    res.json({ success: true, data: rowToJobDescription(row) });
  } catch (error) {
    console.error('Get job description error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', (req, res) => {
  try {
    const body = req.body;
    const id = body.id || uuidv4();
    const positionCode = body.positionCode || body.position_code || '';
    const positionName = body.positionName || body.position_name || '';
    const department = body.department || '';
    const grade = body.grade != null ? body.grade : null;
    const gradeCode = body.gradeCode || body.grade_code || null;
    const positionTitle = body.positionTitle || body.position_title || null;
    const summary = body.summary || '';
    const version = body.version || '1.0';
    const status = body.status || 'draft';
    const createdBy = body.createdBy || body.created_by || 'system';

    const jsonColumns = [
      'responsibilities', 'jobPurpose', 'qualifications', 'vfp',
      'competencyStandards', 'requiredCompetencies',
      'coreCompetencyRequirements', 'managementCompetencyRequirements',
      'professionalCompetencyRequirements', 'ksaCompetencyRequirements',
      'ksaContent', 'workDescription', 'checklist', 'jobDuties',
      'dailyTasks', 'weeklyTasks', 'monthlyTasks'
    ];
    const dbCols = [
      'responsibilities', 'job_purpose', 'qualifications', 'vfp',
      'competency_standards', 'required_competencies',
      'core_competency_requirements', 'management_competency_requirements',
      'professional_competency_requirements', 'ksa_competency_requirements',
      'ksa_content', 'work_description', 'checklist', 'job_duties',
      'daily_tasks', 'weekly_tasks', 'monthly_tasks'
    ];

    const jsonValues = jsonColumns.map((key, i) => {
      const val = body[key] ?? body[toCamel(dbCols[i])] ?? [];
      return typeof val === 'string' ? val : JSON.stringify(val);
    });

    prepare(`
      INSERT INTO job_descriptions (
        id, position_code, position_name, department, grade, grade_code, position_title,
        summary, version, status,
        ${dbCols.join(', ')},
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${dbCols.map(() => '?').join(', ')}, ?, datetime('now'), datetime('now'))
    `).run(
      id, positionCode, positionName, department, grade, gradeCode, positionTitle,
      summary, version, status,
      ...jsonValues,
      createdBy
    );
    saveDatabase();

    const row = prepare('SELECT * FROM job_descriptions WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: rowToJobDescription(row) });
  } catch (error) {
    console.error('Create job description error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = prepare('SELECT id FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    const body = req.body;
    const jsonColumns = [
      'responsibilities', 'jobPurpose', 'qualifications', 'vfp',
      'competencyStandards', 'requiredCompetencies',
      'coreCompetencyRequirements', 'managementCompetencyRequirements',
      'professionalCompetencyRequirements', 'ksaCompetencyRequirements',
      'ksaContent', 'workDescription', 'checklist', 'jobDuties',
      'dailyTasks', 'weeklyTasks', 'monthlyTasks'
    ];
    const dbCols = [
      'responsibilities', 'job_purpose', 'qualifications', 'vfp',
      'competency_standards', 'required_competencies',
      'core_competency_requirements', 'management_competency_requirements',
      'professional_competency_requirements', 'ksa_competency_requirements',
      'ksa_content', 'work_description', 'checklist', 'job_duties',
      'daily_tasks', 'weekly_tasks', 'monthly_tasks'
    ];
    const updates = [
      'position_code = ?', 'position_name = ?', 'department = ?', 'grade = ?',
      'grade_code = ?', 'position_title = ?', 'summary = ?', 'version = ?', 'status = ?'
    ];
    const values = [
      body.positionCode ?? body.position_code,
      body.positionName ?? body.position_name,
      body.department,
      body.grade != null ? body.grade : null,
      body.gradeCode ?? body.grade_code ?? null,
      body.positionTitle ?? body.position_title ?? null,
      body.summary ?? '',
      body.version ?? '1.0',
      body.status ?? 'draft'
    ];
    jsonColumns.forEach((key, i) => {
      updates.push(`${dbCols[i]} = ?`);
      const val = body[key] ?? body[toCamel(dbCols[i])];
      values.push(typeof val === 'string' ? val : JSON.stringify(val || []));
    });
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    prepare(`UPDATE job_descriptions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    saveDatabase();
    const row = prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(row) });
  } catch (error) {
    console.error('Update job description error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = prepare('SELECT id FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    prepare('DELETE FROM job_descriptions WHERE id = ?').run(req.params.id);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('Delete job description error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function rowToJobDescription(row) {
  if (!row) return null;
  const parse = (v) => {
    if (v == null || v === '') return [];
    try {
      const a = JSON.parse(v);
      return Array.isArray(a) ? a : (typeof a === 'object' ? [a] : []);
    } catch {
      return [];
    }
  };
  const parseObj = (v) => {
    if (v == null || v === '') return null;
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  };
  return {
    id: row.id,
    positionCode: row.position_code,
    positionName: row.position_name,
    department: row.department,
    gradeLevel: row.grade != null ? String(row.grade) : (row.grade_code || ''),
    grade: row.grade,
    gradeCode: row.grade_code,
    positionTitle: row.position_title,
    summary: row.summary || '',
    version: row.version || '1.0',
    status: row.status || 'draft',
    responsibilities: parse(row.responsibilities),
    jobPurpose: parse(row.job_purpose),
    qualifications: parse(row.qualifications),
    vfp: parse(row.vfp),
    competencyStandards: parse(row.competency_standards),
    requiredCompetencies: parse(row.required_competencies),
    coreCompetencyRequirements: parse(row.core_competency_requirements),
    managementCompetencyRequirements: parse(row.management_competency_requirements),
    professionalCompetencyRequirements: parse(row.professional_competency_requirements),
    ksaCompetencyRequirements: parse(row.ksa_competency_requirements),
    ksaContent: parseObj(row.ksa_content),
    workDescription: parse(row.work_description),
    checklist: parse(row.checklist),
    jobDuties: parse(row.job_duties),
    dailyTasks: parse(row.daily_tasks),
    weeklyTasks: parse(row.weekly_tasks),
    monthlyTasks: parse(row.monthly_tasks),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = router;
