/**
 * 職等職級矩陣 API Routes
 * 提供職等職級、晉升條件、職涯路徑相關 API
 */

const express = require('express');
const router = express.Router();
const { prepare } = require('../db');

// =====================================================
// 職等職級矩陣 API
// =====================================================

/**
 * GET /api/grade-matrix
 * 取得完整職等職級矩陣（含薪資）
 */
router.get('/', (req, res) => {
  try {
    // 取得所有職等
    const grades = prepare(`
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

    // 取得所有職級薪資
    const salaryLevels = prepare(`
      SELECT 
        id,
        grade,
        code,
        salary,
        sort_order
      FROM grade_salary_levels
      ORDER BY grade, sort_order
    `).all();

    // 將薪資資料合併到對應的職等
    const result = grades.map(g => {
      const gradeSalaries = salaryLevels.filter(s => s.grade === g.grade);
      const salaries = gradeSalaries.map(s => s.salary);

      return {
        id: g.id,
        grade: g.grade,
        codeRange: g.code_range,
        titleManagement: g.title_management,
        titleProfessional: g.title_professional,
        educationRequirement: g.education_requirement,
        responsibilityDescription: g.responsibility_description,
        salaryLevels: gradeSalaries.map(s => ({
          code: s.code,
          salary: s.salary,
          order: s.sort_order
        })),
        minSalary: salaries.length > 0 ? Math.min(...salaries) : 0,
        maxSalary: salaries.length > 0 ? Math.max(...salaries) : 0
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
router.get('/promotion/criteria', (req, res) => {
  try {
    const { fromGrade, toGrade, track } = req.query;

    let query = `SELECT * FROM promotion_criteria WHERE 1=1`;
    const params = [];

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

    const criteria = prepare(query).all(...params);

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
router.get('/career/paths', (req, res) => {
  try {
    const { type } = req.query;

    let query = `SELECT * FROM career_paths WHERE 1=1`;
    const params = [];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY id`;

    const paths = prepare(query).all(...params);

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
router.get('/career/paths/:id', (req, res) => {
  try {
    const { id } = req.params;

    const path = prepare(`
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

// =====================================================
// 部門職位 API
// =====================================================

/**
 * GET /api/grade-matrix/departments
 * 取得所有部門
 */
router.get('/departments/list', (req, res) => {
  try {
    const departments = prepare(`
      SELECT id, name, code, sort_order
      FROM departments
      ORDER BY sort_order
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
router.get('/positions/list', (req, res) => {
  try {
    const { department, grade, track } = req.query;

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
      WHERE 1=1
    `;
    const params = [];

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

    const positions = prepare(query).all(...params);

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
 * @param {string} entityType - 'track' | 'grade' | 'salary' | 'position' | 'promotion'
 * @param {string} entityId - 實體 ID
 * @param {string} action - 'create' | 'update' | 'delete'
 * @param {object|null} oldData - 變更前快照（create 時為 null）
 * @param {object|null} newData - 變更後快照（delete 時為 null）
 * @param {string} changedBy - 操作者
 * @returns {{ changeId: string, status: string }}
 */
function createChangeRecord(entityType, entityId, action, oldData, newData, changedBy) {
  const changeId = `chg-${generateId()}`;
  prepare(`
    INSERT INTO grade_change_history (id, entity_type, entity_id, action, old_data, new_data, changed_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    changeId,
    entityType,
    entityId,
    action,
    oldData ? JSON.stringify(oldData) : null,
    newData ? JSON.stringify(newData) : null,
    changedBy
  );
  return { changeId, status: 'pending' };
}

// =====================================================
// 軌道管理 API（CRUD）
// =====================================================

/**
 * GET /api/grade-matrix/tracks
 * 取得所有軌道
 */
router.get('/tracks', (req, res) => {
  try {
    const tracks = prepare(`
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
router.post('/tracks', (req, res) => {
  try {
    const { code, name, icon, color, maxGrade, sortOrder, changedBy } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'code 與 name 為必填' } });
    }

    // 檢查 code 唯一性
    const existing = prepare('SELECT id FROM grade_tracks WHERE code = ?').get(code);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `軌道代碼 '${code}' 已存在` } });
    }

    const entityId = `track-${generateId()}`;
    const newData = { id: entityId, code, name, icon: icon || null, color: color || null, maxGrade: maxGrade || 7, sortOrder: sortOrder || 0, isActive: true };

    const { changeId, status } = createChangeRecord('track', entityId, 'create', null, newData, changedBy || 'system');

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
router.put('/tracks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, icon, color, maxGrade, sortOrder, isActive, changedBy } = req.body;

    // 取得現有資料作為 oldData 快照
    const existing = prepare('SELECT * FROM grade_tracks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此軌道' } });
    }

    const oldData = { id: existing.id, code: existing.code, name: existing.name, icon: existing.icon, color: existing.color, maxGrade: existing.max_grade, sortOrder: existing.sort_order, isActive: !!existing.is_active };
    const newData = { id, code: code || existing.code, name: name || existing.name, icon: icon !== undefined ? icon : existing.icon, color: color !== undefined ? color : existing.color, maxGrade: maxGrade !== undefined ? maxGrade : existing.max_grade, sortOrder: sortOrder !== undefined ? sortOrder : existing.sort_order, isActive: isActive !== undefined ? isActive : !!existing.is_active };

    const { changeId, status } = createChangeRecord('track', id, 'update', oldData, newData, changedBy || 'system');

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
router.delete('/tracks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = prepare('SELECT * FROM grade_tracks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此軌道' } });
    }

    // 刪除前保護：檢查關聯資料
    const posCount = prepare('SELECT COUNT(*) as count FROM department_positions WHERE track = ?').get(existing.code);
    const promoCount = prepare('SELECT COUNT(*) as count FROM promotion_criteria WHERE track = ?').get(existing.code);

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

    const { changeId, status } = createChangeRecord('track', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '軌道刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting track:', error);
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
router.post('/grades', (req, res) => {
  try {
    const { grade, codeRange, titleManagement, titleProfessional, educationRequirement, responsibilityDescription, changedBy } = req.body;

    if (!grade || !codeRange || !titleManagement || !titleProfessional) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'grade、codeRange、titleManagement、titleProfessional 為必填' } });
    }

    // 檢查 grade 唯一性
    const existing = prepare('SELECT id FROM grade_levels WHERE grade = ?').get(grade);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `職等 ${grade} 已存在` } });
    }

    const entityId = `grade-${grade}`;
    const newData = { id: entityId, grade, codeRange, titleManagement, titleProfessional, educationRequirement: educationRequirement || '', responsibilityDescription: responsibilityDescription || '' };

    const { changeId, status } = createChangeRecord('grade', entityId, 'create', null, newData, changedBy || 'system');

    res.status(201).json({ success: true, data: { changeId, status, message: '職等新增申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error creating grade:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/grade-matrix/grades/:grade
 * 更新職等（進入審核流程）
 */
router.put('/grades/:grade', (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { codeRange, titleManagement, titleProfessional, educationRequirement, responsibilityDescription, changedBy } = req.body;

    const existing = prepare('SELECT * FROM grade_levels WHERE grade = ?').get(gradeNum);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    const oldData = { id: existing.id, grade: existing.grade, codeRange: existing.code_range, titleManagement: existing.title_management, titleProfessional: existing.title_professional, educationRequirement: existing.education_requirement, responsibilityDescription: existing.responsibility_description };
    const newData = { ...oldData, codeRange: codeRange || existing.code_range, titleManagement: titleManagement || existing.title_management, titleProfessional: titleProfessional || existing.title_professional, educationRequirement: educationRequirement !== undefined ? educationRequirement : existing.education_requirement, responsibilityDescription: responsibilityDescription !== undefined ? responsibilityDescription : existing.responsibility_description };

    const { changeId, status } = createChangeRecord('grade', existing.id, 'update', oldData, newData, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '職等更新申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error updating grade:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/grade-matrix/grades/:grade
 * 刪除職等（含關聯檢查，進入審核流程）
 */
router.delete('/grades/:grade', (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { changedBy } = req.body;

    const existing = prepare('SELECT * FROM grade_levels WHERE grade = ?').get(gradeNum);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    // 刪除前保護：檢查所有關聯表
    const salaryCount = prepare('SELECT COUNT(*) as count FROM grade_salary_levels WHERE grade = ?').get(gradeNum);
    const posCount = prepare('SELECT COUNT(*) as count FROM department_positions WHERE grade = ?').get(gradeNum);
    const promoCount = prepare('SELECT COUNT(*) as count FROM promotion_criteria WHERE from_grade = ? OR to_grade = ?').get(gradeNum, gradeNum);
    const jdCount = prepare('SELECT COUNT(*) as count FROM job_descriptions WHERE grade = ?').get(gradeNum);

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

    const { changeId, status } = createChangeRecord('grade', existing.id, 'delete', oldData, null, changedBy || 'system');

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
router.post('/grades/:grade/salaries', (req, res) => {
  try {
    const gradeNum = parseInt(req.params.grade);
    const { code, salary, sortOrder, changedBy } = req.body;

    if (!code || salary === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'code 與 salary 為必填' } });
    }

    // 檢查職等是否存在
    const gradeExists = prepare('SELECT id FROM grade_levels WHERE grade = ?').get(gradeNum);
    if (!gradeExists) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職等' } });
    }

    // 檢查 code 唯一性
    const existing = prepare('SELECT id FROM grade_salary_levels WHERE code = ?').get(code);
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: `薪資代碼 '${code}' 已存在` } });
    }

    const entityId = `sal-${generateId()}`;
    const newData = { id: entityId, grade: gradeNum, code, salary, sortOrder: sortOrder || 0 };

    const { changeId, status } = createChangeRecord('salary', entityId, 'create', null, newData, changedBy || 'system');

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
router.put('/salaries/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { code, salary, sortOrder, changedBy } = req.body;

    const existing = prepare('SELECT * FROM grade_salary_levels WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此薪資記錄' } });
    }

    const oldData = { id: existing.id, grade: existing.grade, code: existing.code, salary: existing.salary, sortOrder: existing.sort_order };
    const newData = { ...oldData, code: code || existing.code, salary: salary !== undefined ? salary : existing.salary, sortOrder: sortOrder !== undefined ? sortOrder : existing.sort_order };

    const { changeId, status } = createChangeRecord('salary', id, 'update', oldData, newData, changedBy || 'system');

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
router.delete('/salaries/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = prepare('SELECT * FROM grade_salary_levels WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此薪資記錄' } });
    }

    const oldData = { id: existing.id, grade: existing.grade, code: existing.code, salary: existing.salary, sortOrder: existing.sort_order };

    const { changeId, status } = createChangeRecord('salary', id, 'delete', oldData, null, changedBy || 'system');

    res.json({ success: true, data: { changeId, status, message: '薪資刪除申請已送出，等待審核' } });
  } catch (error) {
    console.error('Error deleting salary level:', error);
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
router.post('/positions', (req, res) => {
  try {
    const { department, grade, title, track, supervisedDepartments, changedBy } = req.body;

    if (!department || !grade || !title || !track) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'department、grade、title、track 為必填' } });
    }

    const entityId = `pos-${generateId()}`;
    const newData = { id: entityId, department, grade, title, track, supervisedDepartments: supervisedDepartments || null };

    const { changeId, status } = createChangeRecord('position', entityId, 'create', null, newData, changedBy || 'system');

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
router.put('/positions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { department, grade, title, track, supervisedDepartments, changedBy } = req.body;

    const existing = prepare('SELECT * FROM department_positions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職位' } });
    }

    const oldData = { id: existing.id, department: existing.department, grade: existing.grade, title: existing.title, track: existing.track, supervisedDepartments: existing.supervised_departments ? JSON.parse(existing.supervised_departments) : null };
    const newData = { ...oldData, department: department || existing.department, grade: grade !== undefined ? grade : existing.grade, title: title || existing.title, track: track || existing.track, supervisedDepartments: supervisedDepartments !== undefined ? supervisedDepartments : oldData.supervisedDepartments };

    const { changeId, status } = createChangeRecord('position', id, 'update', oldData, newData, changedBy || 'system');

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
router.delete('/positions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = prepare('SELECT * FROM department_positions WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此職位' } });
    }

    const oldData = { id: existing.id, department: existing.department, grade: existing.grade, title: existing.title, track: existing.track, supervisedDepartments: existing.supervised_departments ? JSON.parse(existing.supervised_departments) : null };

    const { changeId, status } = createChangeRecord('position', id, 'delete', oldData, null, changedBy || 'system');

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
router.post('/promotion/criteria', (req, res) => {
  try {
    const { fromGrade, toGrade, track, requiredSkills, requiredCourses, performanceThreshold, kpiFocus, additionalCriteria, promotionProcedure, changedBy } = req.body;

    if (!fromGrade || !toGrade || !track || performanceThreshold === undefined) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'fromGrade、toGrade、track、performanceThreshold 為必填' } });
    }

    const entityId = `promo-${generateId()}`;
    const newData = { id: entityId, fromGrade, toGrade, track, requiredSkills: requiredSkills || [], requiredCourses: requiredCourses || [], performanceThreshold, kpiFocus: kpiFocus || [], additionalCriteria: additionalCriteria || [], promotionProcedure: promotionProcedure || '' };

    const { changeId, status } = createChangeRecord('promotion', entityId, 'create', null, newData, changedBy || 'system');

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
router.put('/promotion/criteria/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { fromGrade, toGrade, track, requiredSkills, requiredCourses, performanceThreshold, kpiFocus, additionalCriteria, promotionProcedure, changedBy } = req.body;

    const existing = prepare('SELECT * FROM promotion_criteria WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此晉升條件' } });
    }

    const oldData = { id: existing.id, fromGrade: existing.from_grade, toGrade: existing.to_grade, track: existing.track, requiredSkills: JSON.parse(existing.required_skills || '[]'), requiredCourses: JSON.parse(existing.required_courses || '[]'), performanceThreshold: existing.performance_threshold, kpiFocus: JSON.parse(existing.kpi_focus || '[]'), additionalCriteria: JSON.parse(existing.additional_criteria || '[]'), promotionProcedure: existing.promotion_procedure };
    const newData = { ...oldData, fromGrade: fromGrade !== undefined ? fromGrade : existing.from_grade, toGrade: toGrade !== undefined ? toGrade : existing.to_grade, track: track || existing.track, requiredSkills: requiredSkills !== undefined ? requiredSkills : oldData.requiredSkills, requiredCourses: requiredCourses !== undefined ? requiredCourses : oldData.requiredCourses, performanceThreshold: performanceThreshold !== undefined ? performanceThreshold : existing.performance_threshold, kpiFocus: kpiFocus !== undefined ? kpiFocus : oldData.kpiFocus, additionalCriteria: additionalCriteria !== undefined ? additionalCriteria : oldData.additionalCriteria, promotionProcedure: promotionProcedure !== undefined ? promotionProcedure : existing.promotion_procedure };

    const { changeId, status } = createChangeRecord('promotion', id, 'update', oldData, newData, changedBy || 'system');

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
router.delete('/promotion/criteria/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { changedBy } = req.body;

    const existing = prepare('SELECT * FROM promotion_criteria WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此晉升條件' } });
    }

    const oldData = { id: existing.id, fromGrade: existing.from_grade, toGrade: existing.to_grade, track: existing.track, requiredSkills: JSON.parse(existing.required_skills || '[]'), requiredCourses: JSON.parse(existing.required_courses || '[]'), performanceThreshold: existing.performance_threshold, kpiFocus: JSON.parse(existing.kpi_focus || '[]'), additionalCriteria: JSON.parse(existing.additional_criteria || '[]'), promotionProcedure: existing.promotion_procedure };

    const { changeId, status } = createChangeRecord('promotion', id, 'delete', oldData, null, changedBy || 'system');

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
router.get('/changes/pending', (req, res) => {
  try {
    const records = prepare(`
      SELECT * FROM grade_change_history
      WHERE status = 'pending'
      ORDER BY created_at DESC
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
      createdAt: r.created_at
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
router.post('/changes/:id/approve', (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const record = prepare('SELECT * FROM grade_change_history WHERE id = ?').get(id);
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此變更記錄' } });
    }
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `此記錄狀態為 ${record.status}，無法審核` } });
    }

    // 套用變更到原資料表（Log-Then-Apply）
    const newData = record.new_data ? JSON.parse(record.new_data) : null;
    const entityType = record.entity_type;
    const action = record.action;

    switch (action) {
      case 'create':
        applyCreate(entityType, newData);
        break;
      case 'update':
        applyUpdate(entityType, record.entity_id, newData);
        break;
      case 'delete':
        applyDelete(entityType, record.entity_id);
        break;
    }

    // 更新變更記錄狀態
    prepare(`UPDATE grade_change_history SET status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ?`).run(approvedBy || 'system', id);

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
router.post('/changes/:id/reject', (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason, approvedBy } = req.body;

    const record = prepare('SELECT * FROM grade_change_history WHERE id = ?').get(id);
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此變更記錄' } });
    }
    if (record.status !== 'pending') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `此記錄狀態為 ${record.status}，無法審核` } });
    }

    prepare(`UPDATE grade_change_history SET status = 'rejected', reject_reason = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?`).run(rejectReason || '', approvedBy || 'system', id);

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
router.get('/changes/history', (req, res) => {
  try {
    const { entityType, dateFrom, dateTo } = req.query;

    let query = `SELECT * FROM grade_change_history WHERE 1=1`;
    const params = [];

    if (entityType) {
      query += ` AND entity_type = ?`;
      params.push(entityType);
    }
    if (dateFrom) {
      query += ` AND created_at >= ?`;
      params.push(dateFrom);
    }
    if (dateTo) {
      query += ` AND created_at <= ?`;
      params.push(dateTo);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const records = prepare(query).all(...params);

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
      approvedAt: r.approved_at
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
function applyCreate(entityType, data) {
  switch (entityType) {
    case 'track':
      prepare(`INSERT INTO grade_tracks (id, code, name, icon, color, max_grade, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.code, data.name, data.icon, data.color, data.maxGrade, data.sortOrder, data.isActive ? 1 : 0);
      break;
    case 'grade':
      prepare(`INSERT INTO grade_levels (id, grade, code_range, title_management, title_professional, education_requirement, responsibility_description) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.grade, data.codeRange, data.titleManagement, data.titleProfessional, data.educationRequirement, data.responsibilityDescription);
      break;
    case 'salary':
      prepare(`INSERT INTO grade_salary_levels (id, grade, code, salary, sort_order) VALUES (?, ?, ?, ?, ?)`).run(data.id, data.grade, data.code, data.salary, data.sortOrder);
      break;
    case 'position':
      prepare(`INSERT INTO department_positions (id, department, grade, title, track, supervised_departments) VALUES (?, ?, ?, ?, ?, ?)`).run(data.id, data.department, data.grade, data.title, data.track, data.supervisedDepartments ? JSON.stringify(data.supervisedDepartments) : null);
      break;
    case 'promotion':
      prepare(`INSERT INTO promotion_criteria (id, from_grade, to_grade, track, required_skills, required_courses, performance_threshold, kpi_focus, additional_criteria, promotion_procedure) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(data.id, data.fromGrade, data.toGrade, data.track, JSON.stringify(data.requiredSkills), JSON.stringify(data.requiredCourses), data.performanceThreshold, JSON.stringify(data.kpiFocus), JSON.stringify(data.additionalCriteria), data.promotionProcedure);
      break;
  }
}

/**
 * 套用 UPDATE 操作：用 newData 更新對應原資料表
 */
function applyUpdate(entityType, entityId, data) {
  switch (entityType) {
    case 'track':
      prepare(`UPDATE grade_tracks SET code = ?, name = ?, icon = ?, color = ?, max_grade = ?, sort_order = ?, is_active = ? WHERE id = ?`).run(data.code, data.name, data.icon, data.color, data.maxGrade, data.sortOrder, data.isActive ? 1 : 0, entityId);
      break;
    case 'grade':
      prepare(`UPDATE grade_levels SET code_range = ?, title_management = ?, title_professional = ?, education_requirement = ?, responsibility_description = ? WHERE id = ?`).run(data.codeRange, data.titleManagement, data.titleProfessional, data.educationRequirement, data.responsibilityDescription, entityId);
      break;
    case 'salary':
      prepare(`UPDATE grade_salary_levels SET code = ?, salary = ?, sort_order = ? WHERE id = ?`).run(data.code, data.salary, data.sortOrder, entityId);
      break;
    case 'position':
      prepare(`UPDATE department_positions SET department = ?, grade = ?, title = ?, track = ?, supervised_departments = ? WHERE id = ?`).run(data.department, data.grade, data.title, data.track, data.supervisedDepartments ? JSON.stringify(data.supervisedDepartments) : null, entityId);
      break;
    case 'promotion':
      prepare(`UPDATE promotion_criteria SET from_grade = ?, to_grade = ?, track = ?, required_skills = ?, required_courses = ?, performance_threshold = ?, kpi_focus = ?, additional_criteria = ?, promotion_procedure = ? WHERE id = ?`).run(data.fromGrade, data.toGrade, data.track, JSON.stringify(data.requiredSkills), JSON.stringify(data.requiredCourses), data.performanceThreshold, JSON.stringify(data.kpiFocus), JSON.stringify(data.additionalCriteria), data.promotionProcedure, entityId);
      break;
  }
}

/**
 * 套用 DELETE 操作：從對應原資料表刪除
 */
function applyDelete(entityType, entityId) {
  const tableMap = {
    track: 'grade_tracks',
    grade: 'grade_levels',
    salary: 'grade_salary_levels',
    position: 'department_positions',
    promotion: 'promotion_criteria'
  };
  const table = tableMap[entityType];
  if (table) {
    prepare(`DELETE FROM ${table} WHERE id = ?`).run(entityId);
  }
}

// =====================================================
// GET /:grade（必須放在所有靜態路由之後，避免攔截 /tracks 等路徑）
// =====================================================

/**
 * GET /api/grade-matrix/:grade
 * 取得單一職等詳情（含晉升條件）
 */
router.get('/:grade', (req, res) => {
  try {
    const { grade } = req.params;
    const gradeNum = parseInt(grade);

    // 取得職等基本資料
    const gradeInfo = prepare(`
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
    const salaryLevels = prepare(`
      SELECT code, salary, sort_order
      FROM grade_salary_levels
      WHERE grade = ?
      ORDER BY sort_order
    `).all(gradeNum);

    // 取得晉升到此職等的條件
    const promotionTo = prepare(`
      SELECT * FROM promotion_criteria WHERE to_grade = ?
    `).all(gradeNum);

    // 取得從此職等晉升的條件
    const promotionFrom = prepare(`
      SELECT * FROM promotion_criteria WHERE from_grade = ?
    `).all(gradeNum);

    const salaries = salaryLevels.map(s => s.salary);

    const result = {
      id: gradeInfo.id,
      grade: gradeInfo.grade,
      codeRange: gradeInfo.code_range,
      titleManagement: gradeInfo.title_management,
      titleProfessional: gradeInfo.title_professional,
      educationRequirement: gradeInfo.education_requirement,
      responsibilityDescription: gradeInfo.responsibility_description,
      salaryLevels: salaryLevels.map(s => ({ code: s.code, salary: s.salary, order: s.sort_order })),
      minSalary: salaries.length > 0 ? Math.min(...salaries) : 0,
      maxSalary: salaries.length > 0 ? Math.max(...salaries) : 0,
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

module.exports = router;
