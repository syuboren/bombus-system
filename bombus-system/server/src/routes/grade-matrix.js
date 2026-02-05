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

    // 取得晉升到此職等的條件（from_grade = grade - 1）
    const promotionTo = prepare(`
      SELECT *
      FROM promotion_criteria
      WHERE to_grade = ?
    `).all(gradeNum);

    // 取得從此職等晉升的條件（from_grade = grade）
    const promotionFrom = prepare(`
      SELECT *
      FROM promotion_criteria
      WHERE from_grade = ?
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
      salaryLevels: salaryLevels.map(s => ({
        code: s.code,
        salary: s.salary,
        order: s.sort_order
      })),
      minSalary: salaries.length > 0 ? Math.min(...salaries) : 0,
      maxSalary: salaries.length > 0 ? Math.max(...salaries) : 0,
      promotionTo: promotionTo.map(p => ({
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
      })),
      promotionFrom: promotionFrom.map(p => ({
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
      }))
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching grade detail:', error);
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

module.exports = router;
