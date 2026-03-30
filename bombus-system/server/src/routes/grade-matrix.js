/**
 * 職等職級矩陣 API Routes
 * 提供職等職級、晉升條件、職涯路徑相關 API
 */

const express = require('express');
const router = express.Router();
const { requireFeaturePerm } = require('../middleware/permission');
// tenantDB is accessed via req.tenantDB (injected by middleware)

// =====================================================
// 職等職級矩陣 API
// =====================================================

/**
 * GET /api/grade-matrix
 * 取得完整職等職級矩陣（含薪資）
 */
router.get('/', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    // 取得所有職等
    const grades = req.tenantDB.prepare(`
      SELECT 
        id,
        grade,
        code_range,
        title_management,
        title_professional,
        education_requirement,
        responsibility_description
      FROM grade_levels
      ORDER BY grade
    `).all();

    // 取得指定組織的職級薪資（每個組織獨立，不 fallback）
    const orgUnitId = req.query.org_unit_id;

    // 查詢指定 org_unit_id 的薪資
    const salaryLevels = orgUnitId
      ? req.tenantDB.prepare(`
          SELECT id, grade, code, salary, sort_order, org_unit_id
          FROM grade_salary_levels
          WHERE org_unit_id = ?
          ORDER BY grade, sort_order
        `).all(orgUnitId)
      : [];

    // 查詢指定 org_unit_id 的軌道條目
    const trackEntries = orgUnitId
      ? req.tenantDB.prepare(`
          SELECT * FROM grade_track_entries
          WHERE org_unit_id = ?
          ORDER BY grade, track
        `).all(orgUnitId)
      : [];

    const result = grades.map(g => {
      const gradeSalaries = salaryLevels.filter(s => s.grade === g.grade);
      const salaries = gradeSalaries.map(s => s.salary);
      const gradeTrackEntries = trackEntries.filter(t => t.grade === g.grade);

      // codeRange 從實際薪資碼動態計算
      let codeRange = '';
      if (gradeSalaries.length > 0) {
        const codes = gradeSalaries.map(s => s.code).filter(Boolean);
        if (codes.length === 1) {
          codeRange = codes[0];
        } else if (codes.length > 1) {
          codeRange = `${codes[0]}-${codes[codes.length - 1]}`;
        }
      }

      return {
        id: g.id,
        grade: g.grade,
        codeRange,
        salaryLevels: gradeSalaries.map(s => ({
          code: s.code,
          salary: s.salary,
          order: s.sort_order
        })),
        minSalary: salaries.length > 0 ? Math.min(...salaries) : 0,
        maxSalary: salaries.length > 0 ? Math.max(...salaries) : 0,
        trackEntries: gradeTrackEntries.map(mapTrackEntry)
      };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching grade matrix:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});


// =====================================================
// 晉升條件 API
// =====================================================

/**
 * GET /api/grade-matrix/promotion-criteria
 * 取得所有晉升條件
 */
router.get('/promotion/criteria', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const { fromGrade, toGrade, track, org_unit_id } = req.query;

    let query = `SELECT * FROM promotion_criteria WHERE 1=1`;
    const params = [];

    if (org_unit_id) {
      query += ` AND org_unit_id = ?`;
      params.push(org_unit_id);
    }
    if (fromGrade) {
      query += ` AND from_grade = ?`;
      params.push(parseInt(fromGrade));
    }
    if (toGrade) {
      query += ` AND to_grade = ?`;
      params.push(parseInt(toGrade));
    }
    if (track) {
      query += ` AND (track = ? OR track = 'both')`;
      params.push(track);
    }

    query += ` ORDER BY from_grade, to_grade`;

    const criteria = req.tenantDB.prepare(query).all(...params);

    const result = criteria.map(p => ({
      id: p.id,
      fromGrade: p.from_grade,
      toGrade: p.to_grade,
      track: p.track,
      requiredSkills: JSON.parse(p.required_skills || '[]'),
      requiredCourses: JSON.parse(p.required_courses || '[]'),
      performanceThreshold: p.performance_threshold,
      kpiFocus: JSON.parse(p.kpi_focus || '[]'),
      additionalCriteria: JSON.parse(p.additional_criteria || '[]'),
      promotionProcedure: p.promotion_procedure
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching promotion criteria:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 職涯路徑 API
// =====================================================

/**
 * GET /api/grade-matrix/career-paths
 * 取得所有職涯路徑
 */
router.get('/career/paths', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const { type, org_unit_id } = req.query;

    let query = `SELECT * FROM career_paths WHERE 1=1`;
    const params = [];

    if (org_unit_id) {
      query += ` AND org_unit_id = ?`;
      params.push(org_unit_id);
    }
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY id`;

    const paths = req.tenantDB.prepare(query).all(...params);

    const result = paths.map(p => ({
      id: p.id,
      type: p.type,
      name: p.name,
      description: p.description,
      fromPosition: p.from_position,
      toPosition: p.to_position,
      estimatedTime: p.estimated_time,
      steps: JSON.parse(p.steps || '[]')
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching career paths:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/grade-matrix/career-paths/:id
 * 取得單一職涯路徑詳情
 */
router.get('/career/paths/:id', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const { id } = req.params;

    const path = req.tenantDB.prepare(`
      SELECT * FROM career_paths WHERE id = ?
    `).get(id);

    if (!path) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職涯路徑' } });
    }

    const result = {
      id: path.id,
      type: path.type,
      name: path.name,
      description: path.description,
      fromPosition: path.from_position,
      toPosition: path.to_position,
      estimatedTime: path.estimated_time,
      steps: JSON.parse(path.steps || '[]')
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching career path detail:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/grade-matrix/career/paths
 * 新增職涯路徑（進入審核流程）
 */
router.post('/career/paths', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { fromGrade, toGrade, track, requiredExperience, requiredCertifications, changedBy, org_unit_id } = req.body;

    if (!fromGrade || !toGrade || !track) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'fromGrade、toGrade、track 為必填' } });
    }

    const entityId = `career-${generateId()}`;
    const newData = { id: entityId, fromGrade, toGrade, track, requiredExperience: requiredExperience || '', requiredCertifications: requiredCertifications || '', org_unit_id: org_unit_id || null };

    const { changeId, status } = createChangeRecord(req, 'career', entityId, 'create', null, newData, changedBy || 'system');

    res.status(201).json({ success: true, data: { changeId, status, message: '職涯路徑新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating career path:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/career/paths/:id
 * 更新職涯路徑（進入審核流程）
 */
router.put('/career/paths/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { fromGrade, toGrade, track, requiredExperience, requiredCertifications, changedBy, org_unit_id } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM career_paths WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職涯路徑' } });
    }

    const oldData = { id: existing.id, fromGrade: existing.from_grade, toGrade: existing.to_grade, track: existing.track, requiredExperience: existing.required_experience || '', requiredCertifications: existing.required_certifications || '', org_unit_id: existing.org_unit_id || null };
    const newData = { ...oldData, fromGrade: fromGrade !== undefined ? fromGrade : existing.from_grade, toGrade: toGrade !== undefined ? toGrade : existing.to_grade, track: track || existing.track, requiredExperience: requiredExperience !== undefined ? requiredExperience : (existing.required_experience || ''), requiredCertifications: requiredCertifications !== undefined ? requiredCertifications : (existing.required_certifications || ''), org_unit_id: org_unit_id !== undefined ? (org_unit_id || null) : (existing.org_unit_id || null) };

    const { changeId, status } = createChangeRecord(req, 'career', id, 'update', oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '職涯路徑更新申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating career path:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/career/paths/:id
 * 刪除職涯路徑（進入審核流程）
 */
router.delete('/career/paths/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM career_paths WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職涯路徑' } });
    }

    const oldData = { id: existing.id, fromGrade: existing.from_grade, toGrade: existing.to_grade, track: existing.track, requiredExperience: existing.required_experience || '', requiredCertifications: existing.required_certifications || '' };

    const { changeId, status } = createChangeRecord(req, 'career', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '職涯路徑刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting career path:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 部門職位 API
// =====================================================

/**
 * GET /api/grade-matrix/departments
 * 取得所有部門
 */
router.get('/departments/list', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    // 統一從 org_units 取部門，LEFT JOIN departments 取 code/sort_order
    const departments = req.tenantDB.prepare(`
      SELECT ou.id, ou.name, d.code, d.sort_order
      FROM org_units ou
      LEFT JOIN departments d ON TRIM(d.name) = TRIM(ou.name) COLLATE NOCASE AND d.org_unit_id = ou.parent_id
      WHERE ou.type = 'department'
      ORDER BY d.sort_order ASC, ou.name ASC
    `).all();

    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/grade-matrix/positions
 * 取得部門職位對照表
 */
router.get('/positions/list', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const { department, grade, track, org_unit_id } = req.query;

    let query = `
      SELECT
        dp.id,
        dp.department,
        dp.grade,
        dp.title,
        dp.track,
        dp.supervised_departments,
        gl.title_management as gradeTitleManagement,
        gl.title_professional as gradeTitleProfessional
      FROM department_positions dp
      JOIN grade_levels gl ON dp.grade = gl.grade
      WHERE dp.org_unit_id = ?
    `;
    const params = [org_unit_id || ''];
    if (department) {
      query += ` AND dp.department = ?`;
      params.push(department);
    }
    if (grade) {
      query += ` AND dp.grade = ?`;
      params.push(parseInt(grade));
    }
    if (track) {
      query += ` AND (dp.track = ? OR dp.track = 'both')`;
      params.push(track);
    }

    query += ` ORDER BY dp.grade DESC, dp.department, dp.track`;

    const positions = req.tenantDB.prepare(query).all(...params);

    // 解析 JSON 欄位
    const result = positions.map(p => ({
      ...p,
      supervisedDepartments: p.supervised_departments ? JSON.parse(p.supervised_departments) : null
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 工具函式
// =====================================================

/**
 * 將 DB row 映射為 trackEntry JSON（共用於 GET /、GET /:grade/tracks、GET /:grade）
 */
function mapTrackEntry(t) {
  return {
    id: t.id,
    grade: t.grade,
    track: t.track,
    title: t.title,
    educationRequirement: t.education_requirement,
    responsibilityDescription: t.responsibility_description,
    requiredSkillsAndTraining: t.required_skills_and_training || '',
    orgUnitId: t.org_unit_id
  };
}

/**
 * 將 DB row 映射為 trackEntry 變更快照（共用於 PUT/DELETE track-entries）
 */
function snapshotTrackEntry(existing) {
  return {
    id: existing.id,
    grade: existing.grade,
    track: existing.track,
    title: existing.title,
    educationRequirement: existing.education_requirement,
    responsibilityDescription: existing.responsibility_description,
    requiredSkillsAndTraining: existing.required_skills_and_training || '',
    org_unit_id: existing.org_unit_id || null
  };
}

/**
 * 產生 UUID（簡易版）
 */
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * 建立變更記錄（所有 CUD 操作共用）
 * @param {string} entityType - 'track' | 'grade' | 'salary' | 'position' | 'promotion' | 'career'
 * @param {string} entityId - 實體 ID
 * @param {string} action - 'create' | 'update' | 'delete'
 * @param {object|null} oldData - 變更前快照（create 時為 null）
 * @param {object|null} newData - 變更後快照（delete 時為 null）
 * @param {string} changedBy - 操作者
 * @returns {{ changeId: string, status: string }}
 */
function createChangeRecord(req, entityType, entityId, action, oldData, newData, changedBy) {
  const changeId = `chg-${generateId()}`;
  // 自動從 payload 提取 org_unit_id（camelCase 或 snake_case 都處理）
  const orgUnitId = newData?.orgUnitId ?? newData?.org_unit_id
                 ?? oldData?.orgUnitId ?? oldData?.org_unit_id
                 ?? null;
  const result = req.tenantDB.prepare(`
    INSERT INTO grade_change_history (id, entity_type, entity_id, action, old_data, new_data, changed_by, status, org_unit_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    changeId,
    entityType,
    entityId,
    action,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null,
    changedBy,
    orgUnitId
  );
  if (result.changes === 0) {
    throw new Error('變更記錄寫入失敗（INSERT 未生效）');
  }
  return { changeId, status: 'pending' };
}

/**
 * 解析薪資代碼為前綴 + 數字（如 "BS17" → { prefix: "BS", num: 17, padLen: 2 }）
 */
function parseSalaryCode(code) {
  if (!code) return null;
  const match = code.match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], num: parseInt(match[2]), padLen: match[2].length };
}

function formatSalaryCode(prefix, num, padLen) {
  return prefix + String(num).padStart(padLen, '0');
}

/**
 * 重新編碼整個 org 的薪資代碼（連續無間隙）
 * 用於刪除薪資碼後收攏間隙
 */
function resequenceAllSalaryCodes(db, orgUnitId) {
  if (!orgUnitId) return;

  const allSalaries = db.prepare(
    'SELECT id, grade, code, salary, sort_order FROM grade_salary_levels WHERE org_unit_id = ? ORDER BY grade, sort_order'
  ).all(orgUnitId);

  if (allSalaries.length === 0) return;

  let prefix = 'BS', padLen = 2;
  for (const s of allSalaries) {
    const parsed = parseSalaryCode(s.code);
    if (parsed) { prefix = parsed.prefix; padLen = parsed.padLen; break; }
  }

  // 檢查是否需要重新編碼
  let needsReseq = false;
  for (let i = 0; i < allSalaries.length; i++) {
    const expected = formatSalaryCode(prefix, i + 1, padLen);
    if (allSalaries[i].code !== expected) { needsReseq = true; break; }
  }
  if (!needsReseq) return;

  // 刪除全部並以連續碼重新插入
  db.prepare('DELETE FROM grade_salary_levels WHERE org_unit_id = ?').run(orgUnitId);
  let seq = 1;
  for (const s of allSalaries) {
    const newCode = formatSalaryCode(prefix, seq, padLen);
    const newId = `sal-${s.grade}-${s.sort_order}-${generateId().substring(0, 8)}`;
    db.prepare('INSERT INTO grade_salary_levels (id, grade, code, salary, sort_order, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(newId, s.grade, newCode, s.salary, s.sort_order, orgUnitId);
    seq++;
  }
}

/**
 * 批量寫入薪資級別（刪除目標+較高職等 → 重新插入 → 自動連續編碼）
 * 同時處理遞增（新增碼）和遞減（刪除碼）場景
 */
function upsertSalaryLevels(db, grade, salaryLevels, orgUnitId) {
  if (!salaryLevels || !Array.isArray(salaryLevels) || !orgUnitId) return;

  // 取得代碼前綴和位數（從低職等或現有資料推導）
  let prefix = 'BS', padLen = 2;
  const anyExisting = db.prepare('SELECT code FROM grade_salary_levels WHERE org_unit_id = ? LIMIT 1').get(orgUnitId);
  if (anyExisting) {
    const parsed = parseSalaryCode(anyExisting.code);
    if (parsed) { prefix = parsed.prefix; padLen = parsed.padLen; }
  } else if (salaryLevels.length > 0) {
    const parsed = parseSalaryCode(salaryLevels[0].code);
    if (parsed) { prefix = parsed.prefix; padLen = parsed.padLen; }
  }

  // 暫存較高職等的薪資資料（grade, salary, sort_order）
  const higherSalaries = db.prepare(
    'SELECT grade, salary, sort_order FROM grade_salary_levels WHERE org_unit_id = ? AND grade > ? ORDER BY grade, sort_order'
  ).all(orgUnitId, grade);

  // 刪除目標職等及所有較高職等的薪資碼
  db.prepare('DELETE FROM grade_salary_levels WHERE org_unit_id = ? AND grade >= ?').run(orgUnitId, grade);

  // 找到低職等的最大代碼數字（作為起始點）
  const lowerMax = db.prepare(
    'SELECT code FROM grade_salary_levels WHERE org_unit_id = ? ORDER BY code DESC LIMIT 1'
  ).get(orgUnitId);
  let seq = 1;
  if (lowerMax) {
    const parsed = parseSalaryCode(lowerMax.code);
    if (parsed) seq = parsed.num + 1;
  }

  // 插入目標職等（使用連續編碼）
  for (let i = 0; i < salaryLevels.length; i++) {
    const sl = salaryLevels[i];
    const newCode = formatSalaryCode(prefix, seq, padLen);
    const slId = `sal-${grade}-${i + 1}-${generateId().substring(0, 8)}`;
    db.prepare('INSERT INTO grade_salary_levels (id, grade, code, salary, sort_order, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(slId, grade, newCode, sl.salary, i + 1, orgUnitId);
    seq++;
  }

  // 重新插入較高職等（接續編碼）
  for (const s of higherSalaries) {
    const newCode = formatSalaryCode(prefix, seq, padLen);
    const newId = `sal-${s.grade}-${s.sort_order}-${generateId().substring(0, 8)}`;
    db.prepare('INSERT INTO grade_salary_levels (id, grade, code, salary, sort_order, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(newId, s.grade, newCode, s.salary, s.sort_order, orgUnitId);
    seq++;
  }
}

/**
 * 同步更新軌道條目（upsert by grade + track + org_unit_id）
 */
function upsertTrackEntries(db, grade, trackUpdates, orgUnitId) {
  if (!orgUnitId) return;
  for (const tu of trackUpdates) {
    if (tu.title === undefined) continue;
    const existing = db.prepare('SELECT id FROM grade_track_entries WHERE grade = ? AND track = ? AND org_unit_id = ?').get(grade, tu.track, orgUnitId);
    if (existing) {
      db.prepare("UPDATE grade_track_entries SET title = ?, education_requirement = ?, responsibility_description = ?, updated_at = datetime('now') WHERE id = ?").run(tu.title || '', tu.education || '', tu.responsibility || '', existing.id);
    } else if (tu.title) {
      const teId = `gte-${generateId()}`;
      db.prepare('INSERT INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(teId, grade, tu.track, tu.title, tu.education || '', tu.responsibility || '', orgUnitId);
    }
  }
}

// =====================================================
// 軌道管理 API（CRUD）
// =====================================================

/**
 * GET /api/grade-matrix/tracks
 * 取得所有軌道
 */
router.get('/tracks', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const tracks = req.tenantDB.prepare(`
      SELECT id, code, name, icon, color, max_grade, sort_order, is_active, created_at
      FROM grade_tracks
      ORDER BY sort_order
    `).all();

    // 轉換欄位命名為 camelCase
    const result = tracks.map(t => ({
      id: t.id,
      code: t.code,
      name: t.name,
      icon: t.icon,
      color: t.color,
      maxGrade: t.max_grade,
      sortOrder: t.sort_order,
      isActive: !!t.is_active,
      createdAt: t.created_at
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/grade-matrix/tracks
 * 新增軌道（進入審核流程）
 */
router.post('/tracks', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { code, name, icon, color, maxGrade, sortOrder, changedBy } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'code 與 name 為必填' } });
    }

    // 檢查 code 唯一性
    const existing = req.tenantDB.prepare('SELECT id FROM grade_tracks WHERE code = ?').get(code);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `軌道代碼 '${code}' 已存在` } });
    }

    const entityId = `track-${generateId()}`;
    const newData = { id: entityId, code, name, icon: icon || null, color: color || null, maxGrade: maxGrade || 7, sortOrder: sortOrder || 0, isActive: true };

    const { changeId, status } = createChangeRecord(req, 'track', entityId, 'create', null, newData, changedBy || 'system');

    res.status(201).json({ success: true, data: { changeId, status, message: '軌道新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating track:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/tracks/:id
 * 更新軌道（進入審核流程）
 */
router.put('/tracks/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, icon, color, maxGrade, sortOrder, isActive, changedBy } = req.body;

    // 取得現有資料作為 oldData 快照
    const existing = req.tenantDB.prepare('SELECT * FROM grade_tracks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此軌道' } });
    }

    const oldData = { id: existing.id, code: existing.code, name: existing.name, icon: existing.icon, color: existing.color, maxGrade: existing.max_grade, sortOrder: existing.sort_order, isActive: !!existing.is_active };
    const newData = { id, code: code || existing.code, name: name || existing.name, icon: icon !== undefined ? icon : existing.icon, color: color !== undefined ? color : existing.color, maxGrade: maxGrade !== undefined ? maxGrade : existing.max_grade, sortOrder: sortOrder !== undefined ? sortOrder : existing.sort_order, isActive: isActive !== undefined ? isActive : !!existing.is_active };

    const { changeId, status } = createChangeRecord(req, 'track', id, 'update', oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '軌道更新申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating track:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/tracks/:id
 * 刪除軌道（含關聯檢查，進入審核流程）
 */
router.delete('/tracks/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM grade_tracks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此軌道' } });
    }

    // 刪除前保護：檢查關聯資料
    const posCount = req.tenantDB.prepare('SELECT COUNT(*) as count FROM department_positions WHERE track = ?').get(existing.code);
    const promoCount = req.tenantDB.prepare('SELECT COUNT(*) as count FROM promotion_criteria WHERE track = ?').get(existing.code);

    if (posCount.count > 0 || promoCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DEPENDENCY_EXISTS',
          message: '此軌道仍有關聯資料，無法刪除',
          dependencies: { positionCount: posCount.count, promotionCount: promoCount.count }
        }
      });
    }

    const oldData = { id: existing.id, code: existing.code, name: existing.name, icon: existing.icon, color: existing.color, maxGrade: existing.max_grade, sortOrder: existing.sort_order, isActive: !!existing.is_active };

    const { changeId, status } = createChangeRecord(req, 'track', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '軌道刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting track:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 軌道實體管理 API（Grade Track Entries CRUD）
// =====================================================

/**
 * GET /api/grade-matrix/grades/:grade/tracks
 * 取得單一職等的所有軌道項目
 */
router.get('/grades/:grade/tracks', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { org_unit_id } = req.query;

    let query = `SELECT * FROM grade_track_entries WHERE grade = ?`;
    const params = [gradeNum];

    query += ` AND org_unit_id = ?`;
    params.push(org_unit_id || '');

    query += ` ORDER BY track`;

    const entries = req.tenantDB.prepare(query).all(...params);

    res.json({ success: true, data: entries.map(mapTrackEntry) });
  } catch (error) {
    console.error('Error fetching grade track entries:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/grade-matrix/grades/:grade/tracks
 * 新增軌道項目（進入審核流程）
 */
router.post('/grades/:grade/tracks', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { track, title, educationRequirement, responsibilityDescription, requiredSkillsAndTraining, changedBy, org_unit_id } = req.body;

    if (!track || !title) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'track 與 title 為必填' } });
    }

    const gradeExists = req.tenantDB.prepare('SELECT id FROM grade_levels WHERE grade = ?').get(gradeNum);
    if (!gradeExists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    const entityId = `gte-${generateId()}`;
    const newData = { id: entityId, grade: gradeNum, track, title, educationRequirement: educationRequirement || '', responsibilityDescription: responsibilityDescription || '', requiredSkillsAndTraining: requiredSkillsAndTraining || '', org_unit_id: org_unit_id || null };

    const { changeId, status } = createChangeRecord(req, 'track-entry', entityId, 'create', null, newData, changedBy || 'system');

    res.status(201).json({ success: true, data: { changeId, status, message: '軌道項目新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating track entry:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/track-entries/:id
 * 更新軌道項目（進入審核流程）
 */
router.put('/track-entries/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { title, educationRequirement, responsibilityDescription, requiredSkillsAndTraining, changedBy, org_unit_id } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM grade_track_entries WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此軌道項目' } });
    }

    const oldData = snapshotTrackEntry(existing);
    const newData = {
      ...oldData,
      title: title !== undefined ? title : existing.title,
      educationRequirement: educationRequirement !== undefined ? educationRequirement : existing.education_requirement,
      responsibilityDescription: responsibilityDescription !== undefined ? responsibilityDescription : existing.responsibility_description,
      requiredSkillsAndTraining: requiredSkillsAndTraining !== undefined ? requiredSkillsAndTraining : (existing.required_skills_and_training || ''),
      org_unit_id: org_unit_id !== undefined ? (org_unit_id || null) : (existing.org_unit_id || null)
    };

    const { changeId, status } = createChangeRecord(req, 'track-entry', id, 'update', oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '軌道項目更新申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating track entry:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/track-entries/:id
 * 刪除軌道項目（進入審核流程）
 */
router.delete('/track-entries/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM grade_track_entries WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此軌道項目' } });
    }

    const oldData = snapshotTrackEntry(existing);

    const { changeId, status } = createChangeRecord(req, 'track-entry', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '軌道項目刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting track entry:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 職等管理 API（CUD）
// =====================================================

/**
 * POST /api/grade-matrix/grades
 * 新增職等（進入審核流程）
 */
router.post('/grades', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { grade, codeRange, managementTitle, managementEducation, managementResponsibility, professionalTitle, professionalEducation, professionalResponsibility, salaryLevels, orgUnitId, changedBy } = req.body;

    if (!grade || !codeRange) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'grade、codeRange 為必填' } });
    }

    // 檢查 grade 唯一性
    const existing = req.tenantDB.prepare('SELECT id FROM grade_levels WHERE grade = ?').get(grade);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `職等 ${grade} 已存在` } });
    }

    const entityId = `grade-${grade}`;
    const org = orgUnitId || null;
    const trackEntries = [];
    if (managementTitle) {
      trackEntries.push({ id: entityId + '-mgmt', grade, track: 'management', title: managementTitle, educationRequirement: managementEducation || '', responsibilityDescription: managementResponsibility || '', org_unit_id: org });
    }
    if (professionalTitle) {
      trackEntries.push({ id: entityId + '-prof', grade, track: 'professional', title: professionalTitle, educationRequirement: professionalEducation || '', responsibilityDescription: professionalResponsibility || '', org_unit_id: org });
    }

    const newData = {
      id: entityId,
      grade,
      codeRange,
      trackEntries,
      salaryLevels: salaryLevels ? salaryLevels.map(s => ({ ...s })) : [],
      orgUnitId: org
    };

    const { changeId, status } = createChangeRecord(req, 'grade', entityId, 'create', null, newData, changedBy || 'system');
    // 資料不立即寫入 — 等待審核通過後由 applyCreate() 套用

    res.status(201).json({ success: true, data: { changeId, status, message: '新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating grade:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/grades/:grade
 * 更新職等（進入審核流程）
 */
router.put('/grades/:grade', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { codeRange, managementTitle, professionalTitle, managementEducation, managementResponsibility, professionalEducation, professionalResponsibility, salaryLevels, orgUnitId, changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM grade_levels WHERE grade = ?').get(gradeNum);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    // 查詢既有薪資與軌道資料作為變更前快照
    const org = orgUnitId || null;
    const oldSalaries = org
      ? req.tenantDB.prepare('SELECT code, salary FROM grade_salary_levels WHERE grade = ? AND org_unit_id = ? ORDER BY sort_order').all(gradeNum, org)
      : [];
    const oldTracks = org
      ? req.tenantDB.prepare('SELECT track, title, education_requirement, responsibility_description FROM grade_track_entries WHERE grade = ? AND org_unit_id = ?').all(gradeNum, org)
      : [];

    const oldMgmt = oldTracks.find(t => t.track === 'management');
    const oldProf = oldTracks.find(t => t.track === 'professional');

    const oldData = {
      id: existing.id, grade: existing.grade, codeRange: existing.code_range,
      salaryLevels: oldSalaries.map(s => ({ code: s.code, salary: s.salary })),
      managementTitle: oldMgmt?.title || '',
      professionalTitle: oldProf?.title || '',
      managementEducation: oldMgmt?.education_requirement || '',
      managementResponsibility: oldMgmt?.responsibility_description || '',
      professionalEducation: oldProf?.education_requirement || '',
      professionalResponsibility: oldProf?.responsibility_description || '',
      orgUnitId: org
    };
    const newData = {
      ...oldData,
      codeRange: codeRange || existing.code_range,
      salaryLevels: salaryLevels ? salaryLevels.map(s => ({ code: s.code, salary: s.salary })) : oldData.salaryLevels,
      managementTitle: managementTitle !== undefined ? (managementTitle || '') : oldData.managementTitle,
      professionalTitle: professionalTitle !== undefined ? (professionalTitle || '') : oldData.professionalTitle,
      managementEducation: managementEducation !== undefined ? (managementEducation || '') : oldData.managementEducation,
      managementResponsibility: managementResponsibility !== undefined ? (managementResponsibility || '') : oldData.managementResponsibility,
      professionalEducation: professionalEducation !== undefined ? (professionalEducation || '') : oldData.professionalEducation,
      professionalResponsibility: professionalResponsibility !== undefined ? (professionalResponsibility || '') : oldData.professionalResponsibility
    };

    // 無實際變更時不建立審核記錄
    if (JSON.stringify(oldData) === JSON.stringify(newData)) {
      return res.json({ success: true, data: { changeId: null, status: 'no_change', message: '無任何變更' } });
    }

    const { changeId, status } = createChangeRecord(req, 'grade', existing.id, 'update', oldData, newData, changedBy || 'system');
    // 資料不立即寫入 — 等待審核通過後由 applyUpdate() 套用

    res.json({ success: true, data: { changeId, status, message: '變更已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/grades/:grade
 * 刪除職等（含關聯檢查，進入審核流程）
 */
router.delete('/grades/:grade', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM grade_levels WHERE grade = ?').get(gradeNum);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    // 刪除前保護：檢查所有關聯表
    const salaryCount = req.tenantDB.prepare('SELECT COUNT(*) as count FROM grade_salary_levels WHERE grade = ?').get(gradeNum);
    const posCount = req.tenantDB.prepare('SELECT COUNT(*) as count FROM department_positions WHERE grade = ?').get(gradeNum);
    const promoCount = req.tenantDB.prepare('SELECT COUNT(*) as count FROM promotion_criteria WHERE from_grade = ? OR to_grade = ?').get(gradeNum, gradeNum);
    const jdCount = req.tenantDB.prepare('SELECT COUNT(*) as count FROM job_descriptions WHERE grade = ?').get(gradeNum);

    if (salaryCount.count > 0 || posCount.count > 0 || promoCount.count > 0 || jdCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DEPENDENCY_EXISTS',
          message: '此職等仍有關聯資料，無法刪除',
          dependencies: { salaryCount: salaryCount.count, positionCount: posCount.count, promotionCount: promoCount.count, jobDescriptionCount: jdCount.count }
        }
      });
    }

    const oldData = { id: existing.id, grade: existing.grade, codeRange: existing.code_range, titleManagement: existing.title_management, titleProfessional: existing.title_professional, educationRequirement: existing.education_requirement, responsibilityDescription: existing.responsibility_description };

    const { changeId, status } = createChangeRecord(req, 'grade', existing.id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '職等刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 職級薪資管理 API（CUD）
// =====================================================

/**
 * POST /api/grade-matrix/grades/:grade/salaries
 * 新增職級薪資（進入審核流程）
 */
router.post('/grades/:grade/salaries', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { code, salary, sortOrder, changedBy, org_unit_id } = req.body;

    if (!code || salary === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'code 與 salary 為必填' } });
    }

    // 檢查職等是否存在
    const gradeExists = req.tenantDB.prepare('SELECT id FROM grade_levels WHERE grade = ?').get(gradeNum);
    if (!gradeExists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    // 檢查 code 唯一性（同一 org_unit_id 內不可重複）
    if (!org_unit_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'org_unit_id 為必填' } });
    }
    const existingCheck = req.tenantDB.prepare('SELECT id FROM grade_salary_levels WHERE code = ? AND org_unit_id = ?').get(code, org_unit_id);
    if (existingCheck) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `薪資代碼 '${code}' 已存在` } });
    }

    const entityId = `sal-${generateId()}`;
    const newData = { id: entityId, grade: gradeNum, code, salary, sortOrder: sortOrder || 0, org_unit_id: org_unit_id || null };

    const { changeId, status } = createChangeRecord(req, 'salary', entityId, 'create', null, newData, changedBy || 'system');

    res.status(201).json({ success: true, data: { changeId, status, message: '薪資新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating salary level:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/salaries/:id
 * 更新職級薪資（進入審核流程）
 */
router.put('/salaries/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { code, salary, sortOrder, changedBy, org_unit_id } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM grade_salary_levels WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此薪資記錄' } });
    }

    const oldData = { id: existing.id, grade: existing.grade, code: existing.code, salary: existing.salary, sortOrder: existing.sort_order, org_unit_id: existing.org_unit_id || null };
    const newData = { ...oldData, code: code || existing.code, salary: salary !== undefined ? salary : existing.salary, sortOrder: sortOrder !== undefined ? sortOrder : existing.sort_order, org_unit_id: org_unit_id !== undefined ? (org_unit_id || null) : (existing.org_unit_id || null) };

    const { changeId, status } = createChangeRecord(req, 'salary', id, 'update', oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '薪資更新申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating salary level:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/salaries/:id
 * 刪除職級薪資（進入審核流程）
 */
router.delete('/salaries/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM grade_salary_levels WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此薪資記錄' } });
    }

    const oldData = { id: existing.id, grade: existing.grade, code: existing.code, salary: existing.salary, sortOrder: existing.sort_order, org_unit_id: existing.org_unit_id };

    const { changeId, status } = createChangeRecord(req, 'salary', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '薪資刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting salary level:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 軌道明細合併儲存 API（軌道條目 + 晉升條件 + 職位 → 單一變更記錄）
// =====================================================

/**
 * POST /api/grade-matrix/track-detail-save
 * 將軌道條目、晉升條件、職位新增/刪除合併為單一變更記錄
 */
router.post('/track-detail-save', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { grade, track, orgUnitId, trackEntry, promotion, positionAdds, positionDeletes, changedBy } = req.body;

    if (!grade || !track) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'grade 和 track 為必填' } });
    }
    if (!trackEntry) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'trackEntry 為必填' } });
    }

    const org = orgUnitId || null;
    const gradeNum = parseInt(grade);

    // --- 建立 oldData 快照 ---
    // 軌道條目：優先以前端傳入的 ID 查找（避免 org_unit_id 不一致找不到）
    let oldTrackEntryRow = null;
    if (trackEntry.id) {
      oldTrackEntryRow = req.tenantDB.prepare('SELECT * FROM grade_track_entries WHERE id = ?').get(trackEntry.id);
    }
    if (!oldTrackEntryRow && org) {
      oldTrackEntryRow = req.tenantDB.prepare('SELECT * FROM grade_track_entries WHERE grade = ? AND track = ? AND org_unit_id = ?').get(gradeNum, track, org);
    }
    const oldTrackEntry = oldTrackEntryRow ? snapshotTrackEntry(oldTrackEntryRow) : null;

    // 晉升條件：優先以前端傳入的 ID 查找
    let oldPromotion = null;
    if (promotion) {
      let oldPromoRow = null;
      if (promotion.id) {
        oldPromoRow = req.tenantDB.prepare('SELECT * FROM promotion_criteria WHERE id = ?').get(promotion.id);
      }
      if (!oldPromoRow && org) {
        oldPromoRow = req.tenantDB.prepare('SELECT * FROM promotion_criteria WHERE from_grade = ? AND track = ? AND org_unit_id = ?').get(gradeNum, track, org);
      }
      if (oldPromoRow) {
        oldPromotion = {
          id: oldPromoRow.id,
          fromGrade: oldPromoRow.from_grade,
          toGrade: oldPromoRow.to_grade,
          track: oldPromoRow.track,
          performanceThreshold: oldPromoRow.performance_threshold,
          promotionProcedure: oldPromoRow.promotion_procedure,
          requiredSkills: JSON.parse(oldPromoRow.required_skills || '[]'),
          requiredCourses: JSON.parse(oldPromoRow.required_courses || '[]'),
          kpiFocus: JSON.parse(oldPromoRow.kpi_focus || '[]'),
          additionalCriteria: JSON.parse(oldPromoRow.additional_criteria || '[]')
        };
      }
    }

    // 現有職位
    const existingPositions = org
      ? req.tenantDB.prepare('SELECT id, department, title FROM department_positions WHERE grade = ? AND track = ? AND org_unit_id = ?').all(gradeNum, track, org)
      : [];

    const oldData = {
      grade: gradeNum,
      track,
      orgUnitId: org,
      trackEntry: oldTrackEntry,
      promotion: oldPromotion,
      positions: existingPositions.map(p => ({ id: p.id, department: p.department, title: p.title }))
    };

    // --- 建立 newData ---
    const trackEntryId = trackEntry.id || oldTrackEntry?.id || `gte-${generateId()}`;
    const newTrackEntry = {
      id: trackEntryId,
      title: trackEntry.title,
      educationRequirement: trackEntry.educationRequirement || '',
      responsibilityDescription: trackEntry.responsibilityDescription || '',
      requiredSkillsAndTraining: trackEntry.requiredSkillsAndTraining || ''
    };

    let newPromotion = null;
    if (promotion) {
      const promoId = promotion.id || oldPromotion?.id || `promo-${generateId()}`;
      newPromotion = {
        id: promoId,
        fromGrade: promotion.fromGrade,
        toGrade: promotion.toGrade,
        track: promotion.track || track,
        performanceThreshold: promotion.performanceThreshold || 'A',
        promotionProcedure: promotion.promotionProcedure || '',
        requiredSkills: promotion.requiredSkills || [],
        requiredCourses: promotion.requiredCourses || [],
        kpiFocus: promotion.kpiFocus || [],
        additionalCriteria: promotion.additionalCriteria || []
      };
    }

    // 為每個新增職位產生 ID
    const newPositionAdds = (positionAdds || []).map(p => ({
      id: `pos-${generateId()}`,
      department: p.department,
      title: p.title
    }));

    const newData = {
      grade: gradeNum,
      track,
      orgUnitId: org,
      trackEntry: newTrackEntry,
      promotion: newPromotion,
      positionAdds: newPositionAdds,
      positionDeletes: positionDeletes || []
    };

    // --- 檢查是否有實際變更 ---
    const hasTrackChange = JSON.stringify(oldTrackEntry ? {
      title: oldTrackEntry.title,
      educationRequirement: oldTrackEntry.educationRequirement,
      responsibilityDescription: oldTrackEntry.responsibilityDescription,
      requiredSkillsAndTraining: oldTrackEntry.requiredSkillsAndTraining
    } : null) !== JSON.stringify({
      title: newTrackEntry.title,
      educationRequirement: newTrackEntry.educationRequirement,
      responsibilityDescription: newTrackEntry.responsibilityDescription,
      requiredSkillsAndTraining: newTrackEntry.requiredSkillsAndTraining
    });
    const hasPromoChange = promotion && (JSON.stringify(oldPromotion) !== JSON.stringify(newPromotion));
    const hasPositionChange = newPositionAdds.length > 0 || (positionDeletes && positionDeletes.length > 0);

    if (!hasTrackChange && !hasPromoChange && !hasPositionChange) {
      return res.json({ success: true, data: { status: 'no_change', message: '未偵測到任何變更' } });
    }

    const action = oldTrackEntry ? 'update' : 'create';
    const { changeId, status } = createChangeRecord(req, 'track-detail', trackEntryId, action, oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '變更已送出，等待審核' } });
  } catch (error) {
    console.error('Error saving track detail:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 部門職位管理 API（CUD）
// =====================================================

/**
 * POST /api/grade-matrix/positions
 * 新增部門職位（進入審核流程）
 */
router.post('/positions', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { department, grade, title, track, supervisedDepartments, changedBy, org_unit_id } = req.body;

    if (!department || !grade || !title || !track) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'department、grade、title、track 為必填' } });
    }

    const entityId = `pos-${generateId()}`;
    const newData = { id: entityId, department, grade, title, track, supervisedDepartments: supervisedDepartments || null, org_unit_id: org_unit_id || null };

    const { changeId, status } = createChangeRecord(req, 'position', entityId, 'create', null, newData, changedBy || 'system');

    res.status(201).json({ success: true, data: { changeId, status, message: '部門職位新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating position:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/positions/:id
 * 更新部門職位（進入審核流程）
 */
router.put('/positions/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { department, grade, title, track, supervisedDepartments, changedBy, org_unit_id } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM department_positions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職位' } });
    }

    const oldData = { id: existing.id, department: existing.department, grade: existing.grade, title: existing.title, track: existing.track, supervisedDepartments: existing.supervised_departments ? JSON.parse(existing.supervised_departments) : null, org_unit_id: existing.org_unit_id || null };
    const newData = { ...oldData, department: department || existing.department, grade: grade !== undefined ? grade : existing.grade, title: title || existing.title, track: track || existing.track, supervisedDepartments: supervisedDepartments !== undefined ? supervisedDepartments : oldData.supervisedDepartments, org_unit_id: org_unit_id !== undefined ? (org_unit_id || null) : (existing.org_unit_id || null) };

    const { changeId, status } = createChangeRecord(req, 'position', id, 'update', oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '部門職位更新申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/positions/:id
 * 刪除部門職位（進入審核流程）
 */
router.delete('/positions/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM department_positions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職位' } });
    }

    const oldData = { id: existing.id, department: existing.department, grade: existing.grade, title: existing.title, track: existing.track, supervisedDepartments: existing.supervised_departments ? JSON.parse(existing.supervised_departments) : null };

    const { changeId, status } = createChangeRecord(req, 'position', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '部門職位刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting position:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 晉升條件管理 API（CUD）
// =====================================================

/**
 * POST /api/grade-matrix/promotion/criteria (POST)
 * 新增晉升條件（進入審核流程）
 */
router.post('/promotion/criteria', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { fromGrade, toGrade, track, requiredSkills, requiredCourses, performanceThreshold, kpiFocus, additionalCriteria, promotionProcedure, changedBy, org_unit_id } = req.body;

    if (!fromGrade || !toGrade || !track || performanceThreshold === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'fromGrade、toGrade、track、performanceThreshold 為必填' } });
    }

    const entityId = `promo-${generateId()}`;
    const newData = { id: entityId, fromGrade, toGrade, track, requiredSkills: requiredSkills || [], requiredCourses: requiredCourses || [], performanceThreshold, kpiFocus: kpiFocus || [], additionalCriteria: additionalCriteria || [], promotionProcedure: promotionProcedure || '', org_unit_id: org_unit_id || null };

    const { changeId, status } = createChangeRecord(req, 'promotion', entityId, 'create', null, newData, changedBy || 'system');

    res.status(201).json({ success: true, data: { changeId, status, message: '晉升條件新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating promotion criteria:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/promotion/criteria/:id
 * 更新晉升條件（進入審核流程）
 */
router.put('/promotion/criteria/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { fromGrade, toGrade, track, requiredSkills, requiredCourses, performanceThreshold, kpiFocus, additionalCriteria, promotionProcedure, changedBy, org_unit_id } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM promotion_criteria WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此晉升條件' } });
    }

    const oldData = { id: existing.id, fromGrade: existing.from_grade, toGrade: existing.to_grade, track: existing.track, requiredSkills: JSON.parse(existing.required_skills || '[]'), requiredCourses: JSON.parse(existing.required_courses || '[]'), performanceThreshold: existing.performance_threshold, kpiFocus: JSON.parse(existing.kpi_focus || '[]'), additionalCriteria: JSON.parse(existing.additional_criteria || '[]'), promotionProcedure: existing.promotion_procedure, org_unit_id: existing.org_unit_id || null };
    const newData = { ...oldData, fromGrade: fromGrade !== undefined ? fromGrade : existing.from_grade, toGrade: toGrade !== undefined ? toGrade : existing.to_grade, track: track || existing.track, requiredSkills: requiredSkills !== undefined ? requiredSkills : oldData.requiredSkills, requiredCourses: requiredCourses !== undefined ? requiredCourses : oldData.requiredCourses, performanceThreshold: performanceThreshold !== undefined ? performanceThreshold : existing.performance_threshold, kpiFocus: kpiFocus !== undefined ? kpiFocus : oldData.kpiFocus, additionalCriteria: additionalCriteria !== undefined ? additionalCriteria : oldData.additionalCriteria, promotionProcedure: promotionProcedure !== undefined ? promotionProcedure : existing.promotion_procedure, org_unit_id: org_unit_id !== undefined ? (org_unit_id || null) : (existing.org_unit_id || null) };

    const { changeId, status } = createChangeRecord(req, 'promotion', id, 'update', oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '晉升條件更新申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating promotion criteria:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/promotion/criteria/:id
 * 刪除晉升條件（進入審核流程）
 */
router.delete('/promotion/criteria/:id', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = req.tenantDB.prepare('SELECT * FROM promotion_criteria WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此晉升條件' } });
    }

    const oldData = { id: existing.id, fromGrade: existing.from_grade, toGrade: existing.to_grade, track: existing.track, requiredSkills: JSON.parse(existing.required_skills || '[]'), requiredCourses: JSON.parse(existing.required_courses || '[]'), performanceThreshold: existing.performance_threshold, kpiFocus: JSON.parse(existing.kpi_focus || '[]'), additionalCriteria: JSON.parse(existing.additional_criteria || '[]'), promotionProcedure: existing.promotion_procedure };

    const { changeId, status } = createChangeRecord(req, 'promotion', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '晉升條件刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting promotion criteria:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 審核流程 API
// =====================================================

/**
 * GET /api/grade-matrix/changes/pending
 * 取得待審核清單
 */
router.get('/changes/pending', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const records = req.tenantDB.prepare(`
      SELECT gch.*, ou.name AS org_unit_name
      FROM grade_change_history gch
      LEFT JOIN org_units ou ON gch.org_unit_id = ou.id
      WHERE gch.status = 'pending'
      ORDER BY gch.created_at DESC
    `).all();

    const result = records.map(r => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      oldData: r.old_data ? JSON.parse(r.old_data) : null,
      newData: r.new_data ? JSON.parse(r.new_data) : null,
      changedBy: r.changed_by,
      status: r.status,
      createdAt: r.created_at,
      orgUnitId: r.org_unit_id || null,
      orgUnitName: r.org_unit_name || null
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching pending changes:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/grade-matrix/changes/:id/approve
 * 核准變更（套用到原資料表）
 */
router.post('/changes/:id/approve', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const record = req.tenantDB.prepare('SELECT * FROM grade_change_history WHERE id = ?').get(id);
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此變更記錄' } });
    }
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `此記錄狀態為 ${record.status}，無法審核` } });
    }

    // 套用變更到原資料表（Log-Then-Apply，在 transaction 中確保原子性）
    const newData = record.new_data ? JSON.parse(record.new_data) : null;
    const entityType = record.entity_type;
    const action = record.action;

    req.tenantDB.transaction(() => {
      // 刪除薪資碼前先記錄 org_unit_id（刪除後就查不到了）
      let resequenceOrg = null;
      if (action === 'delete' && entityType === 'salary') {
        const entity = req.tenantDB.prepare('SELECT org_unit_id FROM grade_salary_levels WHERE id = ?').get(record.entity_id);
        if (entity) resequenceOrg = entity.org_unit_id;
      }

      switch (action) {
        case 'create':
          applyCreate(req, entityType, newData);
          break;
        case 'update':
          applyUpdate(req, entityType, record.entity_id, newData);
          break;
        case 'delete':
          applyDelete(req, entityType, record.entity_id);
          break;
      }

      // 刪除薪資碼後重新編碼（收攏間隙）
      if (resequenceOrg) {
        resequenceAllSalaryCodes(req.tenantDB, resequenceOrg);
      }

      // 更新變更記錄狀態
      req.tenantDB.prepare(`UPDATE grade_change_history SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ?`).run(approvedBy || 'system', id);
    });

    res.json({ success: true, data: { message: '變更已核准並套用' } });
  } catch (error) {
    console.error('Error approving change:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/grade-matrix/changes/:id/reject
 * 駁回變更
 */
router.post('/changes/:id/reject', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason, approvedBy } = req.body;

    const record = req.tenantDB.prepare('SELECT * FROM grade_change_history WHERE id = ?').get(id);
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此變更記錄' } });
    }
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `此記錄狀態為 ${record.status}，無法審核` } });
    }

    req.tenantDB.prepare(`UPDATE grade_change_history SET status = 'rejected', reject_reason = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`).run(rejectReason || '', approvedBy || 'system', id);

    res.json({ success: true, data: { message: '變更已駁回' } });
  } catch (error) {
    console.error('Error rejecting change:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 變更歷史 API
// =====================================================

/**
 * GET /api/grade-matrix/changes/history
 * 取得變更歷史（支援篩選）
 */
router.get('/changes/history', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const { entityType, dateFrom, dateTo } = req.query;

    let query = `
      SELECT gch.*, ou.name AS org_unit_name
      FROM grade_change_history gch
      LEFT JOIN org_units ou ON gch.org_unit_id = ou.id
      WHERE 1=1`;
    const params = [];

    if (entityType) {
      query += ` AND gch.entity_type = ?`;
      params.push(entityType);
    }
    if (dateFrom) {
      query += ` AND gch.created_at >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND gch.created_at <= ?`;
      params.push(dateTo);
    }

    query += ` ORDER BY gch.created_at DESC LIMIT 100`;

    const records = req.tenantDB.prepare(query).all(...params);

    const result = records.map(r => ({
      id: r.id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      action: r.action,
      oldData: r.old_data ? JSON.parse(r.old_data) : null,
      newData: r.new_data ? JSON.parse(r.new_data) : null,
      changedBy: r.changed_by,
      approvedBy: r.approved_by,
      status: r.status,
      rejectReason: r.reject_reason,
      createdAt: r.created_at,
      approvedAt: r.approved_at,
      orgUnitId: r.org_unit_id || null,
      orgUnitName: r.org_unit_name || null
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching change history:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 套用變更的工具函式（核准後執行）
// =====================================================

/**
 * 套用 CREATE 操作：將 newData 插入對應原資料表
 */
function applyCreate(req, entityType, data) {
  switch (entityType) {
    case 'track':
      req.tenantDB.prepare(`INSERT INTO grade_tracks (id, code, name, icon, color, max_grade, sort_order, is_active, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.code, data.name, data.icon, data.color, data.maxGrade, data.sortOrder, data.isActive ? 1 : 0, data.org_unit_id || null);
      break;
    case 'grade':
      req.tenantDB.prepare(`INSERT INTO grade_levels (id, grade, code_range) VALUES (?, ?, ?)`).run(data.id, data.grade, data.codeRange);
      // 軌道職稱統一寫入 grade_track_entries（單一真理來源）
      if (data.trackEntries && Array.isArray(data.trackEntries)) {
        for (const te of data.trackEntries) {
          req.tenantDB.prepare(`INSERT OR IGNORE INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description, required_skills_and_training, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(te.id, te.grade, te.track, te.title, te.educationRequirement || '', te.responsibilityDescription || '', te.requiredSkillsAndTraining || '', te.org_unit_id || null);
        }
      }
      // 套用薪資級距
      if (data.salaryLevels && data.salaryLevels.length > 0) {
        upsertSalaryLevels(req.tenantDB, data.grade, data.salaryLevels, data.orgUnitId || null);
      }
      break;
    case 'track-entry':
      req.tenantDB.prepare(`INSERT INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description, required_skills_and_training, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.grade, data.track, data.title, data.educationRequirement || '', data.responsibilityDescription || '', data.requiredSkillsAndTraining || '', data.org_unit_id || null);
      break;
    case 'salary':
      req.tenantDB.prepare(`INSERT INTO grade_salary_levels (id, grade, code, salary, sort_order, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)`).run(data.id, data.grade, data.code, data.salary, data.sortOrder, data.org_unit_id || null);
      break;
    case 'position':
      req.tenantDB.prepare(`INSERT INTO department_positions (id, department, grade, title, track, supervised_departments, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.department, data.grade, data.title, data.track, data.supervisedDepartments ? JSON.stringify(data.supervisedDepartments) : null, data.org_unit_id || null);
      break;
    case 'promotion':
      req.tenantDB.prepare(`INSERT INTO promotion_criteria (id, from_grade, to_grade, track, required_skills, required_courses, performance_threshold, kpi_focus, additional_criteria, promotion_procedure, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.fromGrade, data.toGrade, data.track, JSON.stringify(data.requiredSkills), JSON.stringify(data.requiredCourses), data.performanceThreshold, JSON.stringify(data.kpiFocus), JSON.stringify(data.additionalCriteria), data.promotionProcedure, data.org_unit_id || null);
      break;
    case 'career':
      req.tenantDB.prepare(`INSERT INTO career_paths (id, from_grade, to_grade, track, required_experience, required_certifications, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.fromGrade, data.toGrade, data.track, data.requiredExperience || '', data.requiredCertifications || '', data.org_unit_id || null);
      break;
    case 'track-detail':
      applyTrackDetailChange(req, data);
      break;
    case 'template-import':
      applyTemplateImport(req, data);
      break;
  }
}

/**
 * 套用範本匯入（一次性寫入全部資料）
 */
function applyTemplateImport(req, data) {
  const targetOrg = data.target_org_unit_id;

  // 覆蓋模式：先清除目標既有資料
  if (data.overwrite) {
    req.tenantDB.prepare('DELETE FROM grade_salary_levels WHERE org_unit_id = ?').run(targetOrg);
    req.tenantDB.prepare('DELETE FROM grade_track_entries WHERE org_unit_id = ?').run(targetOrg);
    req.tenantDB.prepare('DELETE FROM promotion_criteria WHERE org_unit_id = ?').run(targetOrg);
    req.tenantDB.prepare('DELETE FROM department_positions WHERE org_unit_id = ?').run(targetOrg);
  }

  for (const s of (data.salary_levels || [])) {
    req.tenantDB.prepare('INSERT INTO grade_salary_levels (id, grade, code, salary, sort_order, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)').run(s.id, s.grade, s.code, s.salary, s.sortOrder, targetOrg);
  }
  for (const t of (data.track_entries || [])) {
    req.tenantDB.prepare('INSERT INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description, required_skills_and_training, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(t.id, t.grade, t.track, t.title, t.educationRequirement || '', t.responsibilityDescription || '', t.requiredSkillsAndTraining || '', targetOrg);
  }
  for (const p of (data.promotion_criteria || [])) {
    req.tenantDB.prepare('INSERT INTO promotion_criteria (id, from_grade, to_grade, track, required_skills, required_courses, performance_threshold, kpi_focus, additional_criteria, promotion_procedure, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(p.id, p.fromGrade, p.toGrade, p.track, JSON.stringify(p.requiredSkills), JSON.stringify(p.requiredCourses), p.performanceThreshold, JSON.stringify(p.kpiFocus), JSON.stringify(p.additionalCriteria), p.promotionProcedure, targetOrg);
  }
  for (const d of (data.department_positions || [])) {
    req.tenantDB.prepare('INSERT INTO department_positions (id, department, grade, title, track, supervised_departments, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(d.id, d.department, d.grade, d.title, d.track, d.supervisedDepartments ? JSON.stringify(d.supervisedDepartments) : null, targetOrg);
  }
}

/**
 * 套用軌道明細合併變更（軌道條目 + 晉升條件 + 職位）
 */
function applyTrackDetailChange(req, data) {
  const org = data.orgUnitId || null;

  // 1. 軌道條目（UPDATE 時保留原有 org_unit_id，避免 org 篩選不一致導致資料消失）
  if (data.trackEntry) {
    const te = data.trackEntry;
    const existing = req.tenantDB.prepare('SELECT id FROM grade_track_entries WHERE id = ?').get(te.id);
    if (existing) {
      req.tenantDB.prepare(`UPDATE grade_track_entries SET title = ?, education_requirement = ?, responsibility_description = ?, required_skills_and_training = ?, updated_at = datetime('now') WHERE id = ?`).run(te.title, te.educationRequirement || '', te.responsibilityDescription || '', te.requiredSkillsAndTraining || '', te.id);
    } else {
      req.tenantDB.prepare(`INSERT INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description, required_skills_and_training, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(te.id, data.grade, data.track, te.title, te.educationRequirement || '', te.responsibilityDescription || '', te.requiredSkillsAndTraining || '', org);
    }
  }

  // 2. 晉升條件（UPDATE 時保留原有 org_unit_id）
  if (data.promotion && data.promotion.id) {
    const promo = data.promotion;
    const existing = req.tenantDB.prepare('SELECT id FROM promotion_criteria WHERE id = ?').get(promo.id);
    if (existing) {
      req.tenantDB.prepare(`UPDATE promotion_criteria SET from_grade = ?, to_grade = ?, track = ?, required_skills = ?, required_courses = ?, performance_threshold = ?, kpi_focus = ?, additional_criteria = ?, promotion_procedure = ? WHERE id = ?`).run(promo.fromGrade, promo.toGrade, promo.track, JSON.stringify(promo.requiredSkills), JSON.stringify(promo.requiredCourses), promo.performanceThreshold, JSON.stringify(promo.kpiFocus), JSON.stringify(promo.additionalCriteria), promo.promotionProcedure, promo.id);
    } else {
      req.tenantDB.prepare(`INSERT INTO promotion_criteria (id, from_grade, to_grade, track, required_skills, required_courses, performance_threshold, kpi_focus, additional_criteria, promotion_procedure, org_unit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(promo.id, promo.fromGrade, promo.toGrade, promo.track, JSON.stringify(promo.requiredSkills), JSON.stringify(promo.requiredCourses), promo.performanceThreshold, JSON.stringify(promo.kpiFocus), JSON.stringify(promo.additionalCriteria), promo.promotionProcedure, org);
    }
  }

  // 3. 職位新增
  if (data.positionAdds && data.positionAdds.length > 0) {
    for (const pos of data.positionAdds) {
      req.tenantDB.prepare(`INSERT INTO department_positions (id, department, grade, title, track, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)`).run(pos.id, pos.department, data.grade, pos.title, data.track, org);
    }
  }

  // 4. 職位刪除
  if (data.positionDeletes && data.positionDeletes.length > 0) {
    for (const id of data.positionDeletes) {
      req.tenantDB.prepare(`DELETE FROM department_positions WHERE id = ?`).run(id);
    }
  }
}

/**
 * 套用 UPDATE 操作：用 newData 更新對應原資料表
 */
function applyUpdate(req, entityType, entityId, data) {
  switch (entityType) {
    case 'track':
      req.tenantDB.prepare(`UPDATE grade_tracks SET code = ?, name = ?, icon = ?, color = ?, max_grade = ?, sort_order = ?, is_active = ? WHERE id = ?`).run(data.code, data.name, data.icon, data.color, data.maxGrade, data.sortOrder, data.isActive ? 1 : 0, entityId);
      break;
    case 'grade':
      // 僅集團預設（orgUnitId 為空）才更新 grade_levels.code_range
      if (!data.orgUnitId) {
        req.tenantDB.prepare(`UPDATE grade_levels SET code_range = ? WHERE id = ?`).run(data.codeRange, entityId);
      }
      // 套用薪資級距
      if (data.salaryLevels) {
        upsertSalaryLevels(req.tenantDB, data.grade, data.salaryLevels, data.orgUnitId || null);
      }
      // 套用軌道資訊
      const gradeTrackUpdates = [];
      if (data.managementTitle !== undefined) {
        gradeTrackUpdates.push({ track: 'management', title: data.managementTitle, education: data.managementEducation || '', responsibility: data.managementResponsibility || '' });
      }
      if (data.professionalTitle !== undefined) {
        gradeTrackUpdates.push({ track: 'professional', title: data.professionalTitle, education: data.professionalEducation || '', responsibility: data.professionalResponsibility || '' });
      }
      if (gradeTrackUpdates.length > 0) {
        upsertTrackEntries(req.tenantDB, data.grade, gradeTrackUpdates, data.orgUnitId || null);
      }
      break;
    case 'track-entry':
      req.tenantDB.prepare(`UPDATE grade_track_entries SET title = ?, education_requirement = ?, responsibility_description = ?, required_skills_and_training = ?, org_unit_id = ?, updated_at = datetime('now') WHERE id = ?`).run(data.title, data.educationRequirement || '', data.responsibilityDescription || '', data.requiredSkillsAndTraining || '', data.org_unit_id || null, entityId);
      break;
    case 'salary':
      req.tenantDB.prepare(`UPDATE grade_salary_levels SET code = ?, salary = ?, sort_order = ?, org_unit_id = ? WHERE id = ?`).run(data.code, data.salary, data.sortOrder, data.org_unit_id || null, entityId);
      break;
    case 'position':
      req.tenantDB.prepare(`UPDATE department_positions SET department = ?, grade = ?, title = ?, track = ?, supervised_departments = ?, org_unit_id = ? WHERE id = ?`).run(data.department, data.grade, data.title, data.track, data.supervisedDepartments ? JSON.stringify(data.supervisedDepartments) : null, data.org_unit_id || null, entityId);
      break;
    case 'promotion':
      req.tenantDB.prepare(`UPDATE promotion_criteria SET from_grade = ?, to_grade = ?, track = ?, required_skills = ?, required_courses = ?, performance_threshold = ?, kpi_focus = ?, additional_criteria = ?, promotion_procedure = ?, org_unit_id = ? WHERE id = ?`).run(data.fromGrade, data.toGrade, data.track, JSON.stringify(data.requiredSkills), JSON.stringify(data.requiredCourses), data.performanceThreshold, JSON.stringify(data.kpiFocus), JSON.stringify(data.additionalCriteria), data.promotionProcedure, data.org_unit_id || null, entityId);
      break;
    case 'career':
      req.tenantDB.prepare(`UPDATE career_paths SET from_grade = ?, to_grade = ?, track = ?, required_experience = ?, required_certifications = ?, org_unit_id = ? WHERE id = ?`).run(data.fromGrade, data.toGrade, data.track, data.requiredExperience || '', data.requiredCertifications || '', data.org_unit_id || null, entityId);
      break;
    case 'track-detail':
      applyTrackDetailChange(req, data);
      break;
  }
}

/**
 * 套用 DELETE 操作：從對應原資料表刪除
 */
function applyDelete(req, entityType, entityId) {
  const tableMap = {
    track: 'grade_tracks',
    grade: 'grade_levels',
    salary: 'grade_salary_levels',
    position: 'department_positions',
    promotion: 'promotion_criteria',
    career: 'career_paths',
    'track-entry': 'grade_track_entries'
  };
  const table = tableMap[entityType];
  if (table) {
    req.tenantDB.prepare(`DELETE FROM ${table} WHERE id = ?`).run(entityId);
  }
}

// =====================================================
// GET /:grade（必須放在所有靜態路由之後，避免攔截 /tracks 等路徑）
// =====================================================

/**
 * GET /api/grade-matrix/:grade
 * 取得單一職等詳情（含晉升條件）
 */
router.get('/:grade', requireFeaturePerm('L2.grade-matrix', 'view'), (req, res) => {
  try {
    const { grade } = req.params;
    const gradeNum = parseInt(grade);

    // 取得職等基本資料
    const gradeInfo = req.tenantDB.prepare(`
      SELECT 
        id,
        grade,
        code_range,
        title_management,
        title_professional,
        education_requirement,
        responsibility_description
      FROM grade_levels
      WHERE grade = ?
    `).get(gradeNum);

    if (!gradeInfo) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    // 取得該職等的薪資資料
    const salaryLevels = req.tenantDB.prepare(`
      SELECT code, salary, sort_order
      FROM grade_salary_levels
      WHERE grade = ?
      ORDER BY sort_order
    `).all(gradeNum);

    // 取得該職等的軌道項目
    const trackEntries = req.tenantDB.prepare(`
      SELECT * FROM grade_track_entries WHERE grade = ? ORDER BY track
    `).all(gradeNum);

    // 取得晉升到此職等的條件
    const promotionTo = req.tenantDB.prepare(`
      SELECT * FROM promotion_criteria WHERE to_grade = ?
    `).all(gradeNum);

    // 取得從此職等晉升的條件
    const promotionFrom = req.tenantDB.prepare(`
      SELECT * FROM promotion_criteria WHERE from_grade = ?
    `).all(gradeNum);

    const salaries = salaryLevels.map(s => s.salary);

    const result = {
      id: gradeInfo.id,
      grade: gradeInfo.grade,
      codeRange: gradeInfo.code_range,
      salaryLevels: salaryLevels.map(s => ({ code: s.code, salary: s.salary, order: s.sort_order })),
      minSalary: salaries.length > 0 ? Math.min(...salaries) : 0,
      maxSalary: salaries.length > 0 ? Math.max(...salaries) : 0,
      trackEntries: trackEntries.map(mapTrackEntry),
      promotionTo: promotionTo.map(p => ({
        id: p.id, fromGrade: p.from_grade, toGrade: p.to_grade, track: p.track,
        requiredSkills: JSON.parse(p.required_skills || '[]'),
        requiredCourses: JSON.parse(p.required_courses || '[]'),
        performanceThreshold: p.performance_threshold,
        kpiFocus: JSON.parse(p.kpi_focus || '[]'),
        additionalCriteria: JSON.parse(p.additional_criteria || '[]'),
        promotionProcedure: p.promotion_procedure
      })),
      promotionFrom: promotionFrom.map(p => ({
        id: p.id, fromGrade: p.from_grade, toGrade: p.to_grade, track: p.track,
        requiredSkills: JSON.parse(p.required_skills || '[]'),
        requiredCourses: JSON.parse(p.required_courses || '[]'),
        performanceThreshold: p.performance_threshold,
        kpiFocus: JSON.parse(p.kpi_focus || '[]'),
        additionalCriteria: JSON.parse(p.additional_criteria || '[]'),
        promotionProcedure: p.promotion_procedure
      }))
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching grade detail:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 範本匯入 API
// =====================================================

/**
 * POST /api/grade-matrix/import-template
 * 從來源組織複製完整職等薪資資料到目標組織
 */
router.post('/import-template', requireFeaturePerm('L2.grade-matrix', 'edit'), (req, res) => {
  try {
    const { source_org_unit_id, target_org_unit_id, overwrite } = req.body;

    if (!source_org_unit_id || !target_org_unit_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'source_org_unit_id 和 target_org_unit_id 為必填' } });
    }

    if (source_org_unit_id === target_org_unit_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '來源與目標不能相同' } });
    }

    // 檢查來源是否有資料
    const sourceCount = req.tenantDB.prepare(
      'SELECT COUNT(*) as count FROM grade_salary_levels WHERE org_unit_id = ?'
    ).get(source_org_unit_id);
    if (!sourceCount || sourceCount.count === 0) {
      return res.status(400).json({ success: false, error: { code: 'NO_SOURCE_DATA', message: '來源組織尚未設定職等薪資資料' } });
    }

    // 檢查目標是否已有資料
    const targetCount = req.tenantDB.prepare(
      'SELECT COUNT(*) as count FROM grade_salary_levels WHERE org_unit_id = ?'
    ).get(target_org_unit_id);
    if (targetCount && targetCount.count > 0 && !overwrite) {
      return res.status(400).json({ success: false, error: { code: 'TARGET_HAS_DATA', message: '目標組織已有職等薪資資料，請先清除後再匯入' } });
    }

    const changedBy = req.user?.userId || 'system';

    // 收集要匯入的完整資料
    const importData = {
      overwrite: !!overwrite,
      source_org_unit_id,
      target_org_unit_id,
      salary_levels: [],
      track_entries: [],
      promotion_criteria: [],
      department_positions: []
    };

    // 1. 薪資級距
    const salaryRows = req.tenantDB.prepare(
      'SELECT grade, code, salary, sort_order FROM grade_salary_levels WHERE org_unit_id = ? ORDER BY grade, sort_order'
    ).all(source_org_unit_id);
    let salaryIdx = 0;
    for (const row of salaryRows) {
      importData.salary_levels.push({
        id: `sal-${row.grade}-${++salaryIdx}-${generateId().substring(0, 8)}`,
        grade: row.grade, code: row.code, salary: row.salary, sortOrder: row.sort_order, org_unit_id: target_org_unit_id
      });
    }

    // 2. 軌道條目
    const trackRows = req.tenantDB.prepare(
      'SELECT grade, track, title, education_requirement, responsibility_description, required_skills_and_training FROM grade_track_entries WHERE org_unit_id = ?'
    ).all(source_org_unit_id);
    for (const row of trackRows) {
      importData.track_entries.push({
        id: `gte-${generateId()}`,
        grade: row.grade, track: row.track, title: row.title || '',
        educationRequirement: row.education_requirement || '',
        responsibilityDescription: row.responsibility_description || '',
        requiredSkillsAndTraining: row.required_skills_and_training || '',
        org_unit_id: target_org_unit_id
      });
    }

    // 3. 晉升條件
    const promoRows = req.tenantDB.prepare(
      'SELECT from_grade, to_grade, track, required_skills, required_courses, performance_threshold, kpi_focus, additional_criteria, promotion_procedure FROM promotion_criteria WHERE org_unit_id = ?'
    ).all(source_org_unit_id);
    for (const row of promoRows) {
      importData.promotion_criteria.push({
        id: `promo-${generateId()}`,
        fromGrade: row.from_grade, toGrade: row.to_grade, track: row.track,
        requiredSkills: JSON.parse(row.required_skills || '[]'),
        requiredCourses: JSON.parse(row.required_courses || '[]'),
        performanceThreshold: row.performance_threshold,
        kpiFocus: JSON.parse(row.kpi_focus || '[]'),
        additionalCriteria: JSON.parse(row.additional_criteria || '[]'),
        promotionProcedure: row.promotion_procedure,
        org_unit_id: target_org_unit_id
      });
    }

    // 4. 部門職位（只帶匹配的部門）
    const targetDepts = req.tenantDB.prepare(
      "SELECT name FROM org_units WHERE type = 'department' AND parent_id = ?"
    ).all(target_org_unit_id);
    const targetDeptNames = new Set(targetDepts.map(d => d.name));
    const posRows = req.tenantDB.prepare(
      'SELECT department, grade, title, track, supervised_departments FROM department_positions WHERE org_unit_id = ?'
    ).all(source_org_unit_id);
    for (const row of posRows) {
      if (!targetDeptNames.has(row.department) && row.department !== '全部門') continue;
      importData.department_positions.push({
        id: `dp-${generateId()}`,
        department: row.department, grade: row.grade, title: row.title, track: row.track,
        supervisedDepartments: row.supervised_departments ? JSON.parse(row.supervised_departments) : null,
        org_unit_id: target_org_unit_id
      });
    }

    // 建立單筆整合 change record
    const entityId = `tmpl-import-${generateId().substring(0, 8)}`;
    const { changeId } = createChangeRecord(req, 'template-import', entityId, 'create', null, importData, changedBy);

    const total = importData.salary_levels.length + importData.track_entries.length + importData.promotion_criteria.length + importData.department_positions.length;
    res.json({
      success: true,
      status: 'pending',
      change_id: changeId,
      message: `已建立範本匯入待審核（共 ${total} 筆資料）`,
      imported: {
        salary_levels: importData.salary_levels.length,
        track_entries: importData.track_entries.length,
        promotion_criteria: importData.promotion_criteria.length,
        department_positions: importData.department_positions.length,
        change_ids: [changeId]
      }
    });
  } catch (error) {
    console.error('Error importing template:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

module.exports = router;
