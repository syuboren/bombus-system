/**
 * 職務說明書 (Job Descriptions) API
 * CRUD + 代碼產生
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireFeaturePerm } = require('../middleware/permission');
// tenantDB is accessed via req.tenantDB (injected by middleware)

// 將 GET /generate-code 放在 /:id 之前，避免被當成 id
router.get('/generate-code', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
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
    const rows = req.tenantDB.prepare(`
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

router.get('/', requireFeaturePerm('L2.job-description', 'view'), (req, res) => {
  try {
    const { status, department, org_unit_id } = req.query;
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
    if (org_unit_id) {
      sql += ' AND org_unit_id = ?';
      params.push(org_unit_id);
    }
    sql += ' ORDER BY created_at DESC';
    const list = req.tenantDB.prepare(sql).all(...params);
    const data = list.map(rowToJobDescription);
    res.json({ success: true, data });
  } catch (error) {
    console.error('List job descriptions error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.get('/:id', requireFeaturePerm('L2.job-description', 'view'), (req, res) => {
  try {
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    res.json({ success: true, data: rowToJobDescription(row) });
  } catch (error) {
    console.error('Get job description error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.post('/', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
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
    const orgUnitId = body.orgUnitId || body.org_unit_id || null;

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

    req.tenantDB.prepare(`
      INSERT INTO job_descriptions (
        id, position_code, position_name, department, grade, grade_code, position_title,
        summary, version, status, org_unit_id,
        ${dbCols.join(', ')},
        created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${dbCols.map(() => '?').join(', ')}, ?, datetime('now'), datetime('now'))
    `).run(
      id, positionCode, positionName, department, grade, gradeCode, positionTitle,
      summary, version, status, orgUnitId,
      ...jsonValues,
      createdBy
    );
    req.tenantDB.save();

    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: rowToJobDescription(row) });
  } catch (error) {
    console.error('Create job description error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.put('/:id', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const existing = req.tenantDB.prepare('SELECT id FROM job_descriptions WHERE id = ?').get(req.params.id);
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
      'grade_code = ?', 'position_title = ?', 'summary = ?', 'version = ?', 'status = ?',
      'org_unit_id = ?'
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
      body.status ?? 'draft',
      body.orgUnitId ?? body.org_unit_id ?? null
    ];
    jsonColumns.forEach((key, i) => {
      updates.push(`${dbCols[i]} = ?`);
      const val = body[key] ?? body[toCamel(dbCols[i])];
      values.push(typeof val === 'string' ? val : JSON.stringify(val || []));
    });
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    req.tenantDB.prepare(`UPDATE job_descriptions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    req.tenantDB.save();
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(row) });
  } catch (error) {
    console.error('Update job description error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

router.delete('/:id', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const existing = req.tenantDB.prepare('SELECT id FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    req.tenantDB.prepare('DELETE FROM job_descriptions WHERE id = ?').run(req.params.id);
    req.tenantDB.save();
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
    orgUnitId: row.org_unit_id || null,
    currentVersion: row.current_version || row.version || '1.0',
    rejectedReason: row.rejected_reason || null,
    approvedBy: row.approved_by || null,
    approvedAt: row.approved_at || null,
    submittedBy: row.submitted_by || null,
    submittedAt: row.submitted_at || null,
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

// ========================================
// 狀態轉換 API
// ========================================

/**
 * 送出審核：draft/rejected → pending_review
 */
router.post('/:id/submit-review', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const { actorId, actorName } = req.body;
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    if (row.status !== 'draft' && row.status !== 'rejected') {
      return res.status(400).json({ success: false, error: { message: `無法從 ${row.status} 狀態送出審核` } });
    }

    const now = new Date().toISOString();
    req.tenantDB.prepare(`
      UPDATE job_descriptions 
      SET status = 'pending_review', submitted_by = ?, submitted_at = ?, rejected_reason = NULL, updated_at = ?
      WHERE id = ?
    `).run(actorName || 'HR', now, now, req.params.id);

    // 記錄審核動作
    logApprovalAction(req, req.params.id, row.version, 'submit', actorId, actorName, 'hr', null);
    req.tenantDB.save();

    const updated = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(updated) });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 審核通過：pending_review → published
 */
router.post('/:id/approve', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const { actorId, actorName, comment } = req.body;
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    if (row.status !== 'pending_review') {
      return res.status(400).json({ success: false, error: { message: `只能審核狀態為「審核中」的職務說明書` } });
    }

    const now = new Date().toISOString();
    req.tenantDB.prepare(`
      UPDATE job_descriptions 
      SET status = 'published', approved_by = ?, approved_at = ?, updated_at = ?
      WHERE id = ?
    `).run(actorName || 'Manager', now, now, req.params.id);

    // 記錄審核動作
    logApprovalAction(req, req.params.id, row.version, 'approve', actorId, actorName, 'manager', comment);

    // 建立版本快照
    createVersionSnapshot(req, req.params.id, row.version, 'published', now, null, actorName);
    req.tenantDB.save();

    const updated = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(updated) });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 退回：pending_review → rejected
 */
router.post('/:id/reject', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const { actorId, actorName, reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: { message: '請填寫退回原因' } });
    }
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    if (row.status !== 'pending_review') {
      return res.status(400).json({ success: false, error: { message: `只能退回狀態為「審核中」的職務說明書` } });
    }

    const now = new Date().toISOString();
    req.tenantDB.prepare(`
      UPDATE job_descriptions 
      SET status = 'rejected', rejected_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(reason, now, req.params.id);

    // 記錄審核動作
    logApprovalAction(req, req.params.id, row.version, 'reject', actorId, actorName, 'manager', reason);
    req.tenantDB.save();

    const updated = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(updated) });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 封存：published → archived
 */
router.post('/:id/archive', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const { actorId, actorName } = req.body;
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    if (row.status !== 'published') {
      return res.status(400).json({ success: false, error: { message: `只能封存狀態為「已發佈」的職務說明書` } });
    }

    const now = new Date().toISOString();
    req.tenantDB.prepare(`
      UPDATE job_descriptions 
      SET status = 'archived', updated_at = ?
      WHERE id = ?
    `).run(now, req.params.id);

    // 更新版本歷史的 effective_until
    req.tenantDB.prepare(`
      UPDATE job_description_versions 
      SET effective_until = ?, archived_at = ?
      WHERE job_description_id = ? AND version = ? AND effective_until IS NULL
    `).run(now, now, req.params.id, row.version);

    // 記錄審核動作
    logApprovalAction(req, req.params.id, row.version, 'archive', actorId, actorName, 'hr', null);
    req.tenantDB.save();

    const updated = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(updated) });
  } catch (error) {
    console.error('Archive error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 取消封存：archived → published
 */
router.post('/:id/unarchive', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const { actorId, actorName } = req.body;
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    if (row.status !== 'archived') {
      return res.status(400).json({ success: false, error: { message: '只能取消封存狀態為「已封存」的職務說明書' } });
    }

    const now = new Date().toISOString();
    req.tenantDB.prepare(`
      UPDATE job_descriptions
      SET status = 'published', updated_at = ?
      WHERE id = ?
    `).run(now, req.params.id);

    // 清除版本歷史的 effective_until 和 archived_at
    req.tenantDB.prepare(`
      UPDATE job_description_versions
      SET effective_until = NULL, archived_at = NULL
      WHERE job_description_id = ? AND version = ? AND archived_at IS NOT NULL
    `).run(req.params.id, row.version);

    logApprovalAction(req, req.params.id, row.version, 'unarchive', actorId, actorName, 'hr', null);
    req.tenantDB.save();

    const updated = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(updated) });
  } catch (error) {
    console.error('Unarchive error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 建立新版本：published → 新草稿 (原版本歸檔)
 */
router.post('/:id/create-new-version', requireFeaturePerm('L2.job-description', 'edit'), (req, res) => {
  try {
    const { actorId, actorName } = req.body;
    const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    if (!row) {
      return res.status(404).json({ success: false, error: { message: '找不到職務說明書' } });
    }
    if (row.status !== 'published') {
      return res.status(400).json({ success: false, error: { message: `只能從「已發佈」狀態建立新版本` } });
    }

    const now = new Date().toISOString();
    const oldVersion = row.version || '1.0';
    const newVersionNum = parseFloat(oldVersion) + 1;
    const newVersion = newVersionNum.toFixed(1);

    // 更新舊版本的 effective_until
    req.tenantDB.prepare(`
      UPDATE job_description_versions 
      SET effective_until = ?
      WHERE job_description_id = ? AND version = ? AND effective_until IS NULL
    `).run(now, req.params.id, oldVersion);

    // 更新主記錄為新草稿
    req.tenantDB.prepare(`
      UPDATE job_descriptions 
      SET status = 'draft', version = ?, current_version = ?, 
          approved_by = NULL, approved_at = NULL, 
          submitted_by = NULL, submitted_at = NULL,
          rejected_reason = NULL, updated_at = ?
      WHERE id = ?
    `).run(newVersion, newVersion, now, req.params.id);

    // 記錄審核動作
    logApprovalAction(req, req.params.id, newVersion, 'create_new_version', actorId, actorName, 'hr', `從 v${oldVersion} 建立新版本`);
    req.tenantDB.save();

    const updated = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: rowToJobDescription(updated) });
  } catch (error) {
    console.error('Create new version error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================================
// 版本與審核歷史 API
// ========================================

/**
 * 取得版本歷史
 */
router.get('/:id/versions', requireFeaturePerm('L2.job-description', 'view'), (req, res) => {
  try {
    const versions = req.tenantDB.prepare(`
      SELECT * FROM job_description_versions 
      WHERE job_description_id = ? 
      ORDER BY created_at DESC
    `).all(req.params.id);

    const data = versions.map(v => ({
      id: v.id,
      version: v.version,
      status: v.status,
      effectiveFrom: v.effective_from,
      effectiveUntil: v.effective_until,
      createdBy: v.created_by,
      createdAt: v.created_at,
      publishedAt: v.published_at,
      archivedAt: v.archived_at
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 取得特定版本快照
 */
router.get('/:id/versions/:versionId', requireFeaturePerm('L2.job-description', 'view'), (req, res) => {
  try {
    const version = req.tenantDB.prepare(`
      SELECT * FROM job_description_versions WHERE id = ?
    `).get(req.params.versionId);

    if (!version) {
      return res.status(404).json({ success: false, error: { message: '找不到版本' } });
    }

    const snapshot = JSON.parse(version.snapshot);
    res.json({ success: true, data: { ...snapshot, versionInfo: { id: version.id, version: version.version, status: version.status, effectiveFrom: version.effective_from, effectiveUntil: version.effective_until } } });
  } catch (error) {
    console.error('Get version snapshot error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * 取得審核記錄
 */
router.get('/:id/approvals', requireFeaturePerm('L2.job-description', 'view'), (req, res) => {
  try {
    const approvals = req.tenantDB.prepare(`
      SELECT * FROM job_description_approvals 
      WHERE job_description_id = ? 
      ORDER BY created_at DESC
    `).all(req.params.id);

    const data = approvals.map(a => ({
      id: a.id,
      version: a.version,
      action: a.action,
      actorId: a.actor_id,
      actorName: a.actor_name,
      actorRole: a.actor_role,
      comment: a.comment,
      createdAt: a.created_at
    }));

    res.json({ success: true, data });
  } catch (error) {
    console.error('Get approvals error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ========================================
// Helper Functions
// ========================================

function logApprovalAction(req, jdId, version, action, actorId, actorName, actorRole, comment) {
  const id = uuidv4();
  req.tenantDB.prepare(`
    INSERT INTO job_description_approvals (id, job_description_id, version, action, actor_id, actor_name, actor_role, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, jdId, version, action, actorId || null, actorName || 'System', actorRole || 'system', comment || null);
}

function createVersionSnapshot(req, jdId, version, status, effectiveFrom, effectiveUntil, createdBy) {
  const row = req.tenantDB.prepare('SELECT * FROM job_descriptions WHERE id = ?').get(jdId);
  if (!row) return;

  const snapshot = JSON.stringify(rowToJobDescription(row));
  const id = uuidv4();
  const now = new Date().toISOString();

  req.tenantDB.prepare(`
    INSERT INTO job_description_versions (id, job_description_id, version, snapshot, status, effective_from, effective_until, created_by, created_at, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, jdId, version, snapshot, status, effectiveFrom, effectiveUntil || null, createdBy || 'System', now, status === 'published' ? now : null);
}

module.exports = router;
