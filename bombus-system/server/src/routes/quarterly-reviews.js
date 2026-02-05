/**
 * 季度績效面談 API Routes
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db');

/**
 * GET /api/quarterly-reviews
 * 取得季度面談列表
 */
router.get('/', (req, res) => {
  try {
    const { year, quarter, status, departmentId, employeeId, page = 1, pageSize = 20 } = req.query;
    
    // 動態建構條件
    let conditions = [];
    let params = [];
    
    if (year) {
      conditions.push('qr.year = ?');
      params.push(parseInt(year));
    }
    if (quarter) {
      conditions.push('qr.quarter = ?');
      params.push(parseInt(quarter));
    }
    if (status) {
      conditions.push('qr.status = ?');
      params.push(status);
    }
    if (departmentId) {
      conditions.push('e.department = ?');
      params.push(departmentId);
    }
    if (employeeId) {
      conditions.push('qr.employee_id = ?');
      params.push(employeeId);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 計算總數
    const countResult = prepare(`
      SELECT COUNT(*) as total 
      FROM quarterly_reviews qr
      LEFT JOIN employees e ON qr.employee_id = e.id
      ${whereClause}
    `).get(...params);
    const totalItems = countResult?.total || 0;
    
    // 查詢資料
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const rows = prepare(`
      SELECT qr.*, e.name as employee_name, e.department, e.position,
             m.name as manager_name
      FROM quarterly_reviews qr
      LEFT JOIN employees e ON qr.employee_id = e.id
      LEFT JOIN employees m ON qr.manager_id = m.id
      ${whereClause}
      ORDER BY qr.year DESC, qr.quarter DESC, qr.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    const items = rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      position: row.position,
      managerId: row.manager_id,
      managerName: row.manager_name,
      year: row.year,
      quarter: row.quarter,
      formType: row.form_type,
      status: row.status,
      monthlyAvgScore: row.monthly_avg_score,
      interviewDate: row.interview_date,
      interviewLocation: row.interview_location,
      totalScore: row.total_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      success: true,
      data: {
        items,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalItems,
          totalPages: Math.ceil(totalItems / parseInt(pageSize))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching quarterly reviews:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/quarterly-reviews/satisfaction-questions
 * 取得滿意度調查題目
 * (放在 /:id 之前以避免路由衝突)
 */
router.get('/satisfaction-questions', (req, res) => {
  try {
    const rows = prepare(`SELECT * FROM satisfaction_questions WHERE is_active = 1 ORDER BY order_num`).all();
    
    const questions = rows.map(row => ({
      id: row.id,
      questionText: row.question_text,
      orderNum: row.order_num,
      isActive: row.is_active === 1
    }));
    
    res.json({ success: true, data: questions });
  } catch (error) {
    console.error('Error fetching satisfaction questions:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/quarterly-reviews/:id
 * 取得單筆季度面談詳情
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const qr = prepare(`
      SELECT qr.*, e.name as employee_name, e.department, e.position,
             m.name as manager_name
      FROM quarterly_reviews qr
      LEFT JOIN employees e ON qr.employee_id = e.id
      LEFT JOIN employees m ON qr.manager_id = m.id
      WHERE qr.id = ?
    `).get(id);
    
    if (!qr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此季度面談' } });
    }
    
    // Get sections
    const sectionRows = prepare(`
      SELECT * FROM quarterly_review_sections WHERE review_id = ? ORDER BY order_num
    `).all(id);
    
    const sections = sectionRows.map(row => {
      let content = row.content;
      try {
        content = JSON.parse(row.content);
      } catch (e) {
        // Keep as string
      }
      return {
        id: row.id,
        sectionType: row.section_type,
        content,
        orderNum: row.order_num
      };
    });
    
    // Get satisfaction survey answers
    const surveyRows = prepare(`
      SELECT * FROM satisfaction_surveys WHERE review_id = ? ORDER BY question_id
    `).all(id);
    
    const satisfactionSurvey = surveyRows.map(row => ({
      questionId: row.question_id,
      score: row.score
    }));

    // 取得該季度月度檢核分數（用於 JD 指標季檢核）
    // 使用 total_score（100分制）而非項目平均分（1-5分）
    const startMonth = (qr.quarter - 1) * 3 + 1;
    const endMonth = qr.quarter * 3;
    const monthlyScores = [];
    
    for (let month = startMonth; month <= endMonth; month++) {
      const monthlyCheck = prepare(`
        SELECT id, total_score FROM monthly_checks 
        WHERE employee_id = ? AND year = ? AND month = ? AND status = 'completed'
      `).get(qr.employee_id, qr.year, month);
      
      if (monthlyCheck && monthlyCheck.total_score !== null) {
        // 直接使用月度檢核的總分（100分制）
        // selfScore 和 managerScore 都使用同一個 total_score（因為月度檢核已完成代表雙方已確認分數）
        monthlyScores.push({ 
          month, 
          selfScore: monthlyCheck.total_score, 
          managerScore: monthlyCheck.total_score 
        });
      } else {
        monthlyScores.push({ month, selfScore: null, managerScore: null });
      }
    }
    
    res.json({
      success: true,
      data: {
        id: qr.id,
        employeeId: qr.employee_id,
        employeeName: qr.employee_name,
        department: qr.department,
        position: qr.position,
        managerId: qr.manager_id,
        managerName: qr.manager_name,
        year: qr.year,
        quarter: qr.quarter,
        formType: qr.form_type,
        status: qr.status,
        monthlyAvgScore: qr.monthly_avg_score,
        interviewDate: qr.interview_date,
        interviewLocation: qr.interview_location,
        totalScore: qr.total_score,
        managerComment: qr.manager_comment,
        developmentPlan: qr.development_plan,
        hrComment: qr.hr_comment,
        sections,
        satisfactionSurvey,
        monthlyScores, // 月度檢核分數
        createdAt: qr.created_at,
        updatedAt: qr.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching quarterly review:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/quarterly-reviews/initialize
 * 批次初始化季度面談清單 (為所有員工建立該季面談記錄)
 */
router.post('/initialize', (req, res) => {
  try {
    const { year, quarter } = req.body;
    
    if (!year || !quarter) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '年份和季度為必填欄位' }
      });
    }
    
    // 取得所有 active 員工 (包含 role 欄位)
    const employees = prepare(`
      SELECT id, name, department, position, manager_id, role 
      FROM employees 
      WHERE status = 'active'
    `).all();
    
    if (!employees || employees.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NO_EMPLOYEES', message: '沒有找到任何在職員工' }
      });
    }
    
    // 刪除該季度現有的所有記錄及關聯資料
    const existingReviews = prepare(`
      SELECT id FROM quarterly_reviews WHERE year = ? AND quarter = ?
    `).all(year, quarter);
    
    let deletedCount = 0;
    for (const review of existingReviews) {
      prepare(`DELETE FROM quarterly_review_sections WHERE review_id = ?`).run(review.id);
      prepare(`DELETE FROM satisfaction_surveys WHERE review_id = ?`).run(review.id);
      deletedCount++;
    }
    
    prepare(`DELETE FROM quarterly_reviews WHERE year = ? AND quarter = ?`).run(year, quarter);
    
    const now = new Date().toISOString();
    let createdCount = 0;
    const createdRecords = [];
    
    // 計算該季度的月份範圍
    const startMonth = (parseInt(quarter) - 1) * 3 + 1;
    const endMonth = parseInt(quarter) * 3;
    
    for (const emp of employees) {
      // 依據員工角色決定表單類型 (主管用主管表單，員工用員工表單)
      const formType = emp.role === 'manager' ? 'manager' : 'employee';
      
      // 計算該員工該季度的月度檢核平均分
      const avgResult = prepare(`
        SELECT AVG(total_score) as avg_score
        FROM monthly_checks
        WHERE employee_id = ? AND year = ? AND month BETWEEN ? AND ? AND status = 'completed'
      `).get(emp.id, year, startMonth, endMonth);
      
      const monthlyAvgScore = avgResult?.avg_score ? Math.round(avgResult.avg_score * 10) / 10 : null;
      
      const id = uuidv4();
      
      // 建立季度面談記錄，初始狀態為 pending (尚未填寫)
      prepare(`
        INSERT INTO quarterly_reviews (
          id, employee_id, manager_id, year, quarter, 
          form_type, status, monthly_avg_score, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
      `).run(id, emp.id, emp.manager_id, year, quarter, formType, monthlyAvgScore, now, now);
      
      createdRecords.push({
        id,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        position: emp.position,
        formType,
        monthlyAvgScore
      });
      
      createdCount++;
    }
    
    res.status(201).json({
      success: true,
      message: `成功初始化 ${year} 年 Q${quarter} 季度面談清單`,
      data: {
        totalEmployees: employees.length,
        deleted: deletedCount,
        created: createdCount,
        records: createdRecords
      }
    });
  } catch (error) {
    console.error('Error initializing quarterly reviews:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/quarterly-reviews
 * 建立季度面談
 */
router.post('/', (req, res) => {
  try {
    const { employeeId, year, quarter, formType = 'employee' } = req.body;
    
    if (!employeeId || !year || !quarter) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '員工 ID、年份、季度為必填欄位' }
      });
    }
    
    // Check duplicate
    const existing = prepare(`
      SELECT id FROM quarterly_reviews WHERE employee_id = ? AND year = ? AND quarter = ? AND form_type = ?
    `).get(employeeId, year, quarter, formType);
    
    if (existing?.id) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_RECORD', message: '該員工本季已有面談記錄' }
      });
    }
    
    // Get employee info
    const employee = prepare(`SELECT id, manager_id FROM employees WHERE id = ?`).get(employeeId);
    if (!employee?.id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此員工' } });
    }
    
    // Calculate monthly average score
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    
    const avgResult = prepare(`
      SELECT AVG(total_score) as avg_score
      FROM monthly_checks
      WHERE employee_id = ? AND year = ? AND month BETWEEN ? AND ? AND status = 'completed'
    `).get(employeeId, year, startMonth, endMonth);
    
    const monthlyAvgScore = avgResult?.avg_score ? Math.round(avgResult.avg_score * 10) / 10 : null;
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    prepare(`
      INSERT INTO quarterly_reviews (id, employee_id, manager_id, year, quarter, form_type, status, monthly_avg_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(id, employeeId, employee.manager_id, year, quarter, formType, monthlyAvgScore, now);
    
    res.status(201).json({
      success: true,
      data: { id, employeeId, year, quarter, formType, status: 'pending', monthlyAvgScore }
    });
  } catch (error) {
    console.error('Error creating quarterly review:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/quarterly-reviews/:id/employee-submit
 * 員工提交季度表單
 */
router.patch('/:id/employee-submit', (req, res) => {
  try {
    const { id } = req.params;
    const { sections, satisfactionSurvey } = req.body;
    
    const qr = prepare(`SELECT * FROM quarterly_reviews WHERE id = ?`).get(id);
    if (!qr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此季度面談' } });
    }
    
    // 檢查狀態必須是 pending 才能提交
    if (qr.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_STATUS', message: '只有「尚未填寫」狀態的表單才能提交' } 
      });
    }
    
    const now = new Date().toISOString();
    
    // Delete existing sections
    prepare(`DELETE FROM quarterly_review_sections WHERE review_id = ?`).run(id);
    
    // Insert sections
    if (sections && sections.length > 0) {
      sections.forEach((section, idx) => {
        const sectionId = uuidv4();
        const content = typeof section.content === 'object' ? JSON.stringify(section.content) : section.content;
        prepare(`
          INSERT INTO quarterly_review_sections (id, review_id, section_type, content, order_num)
          VALUES (?, ?, ?, ?, ?)
        `).run(sectionId, id, section.sectionType, content, idx + 1);
      });
    }
    
    // Delete existing survey answers
    prepare(`DELETE FROM satisfaction_surveys WHERE review_id = ?`).run(id);
    
    // Insert satisfaction survey
    if (satisfactionSurvey && satisfactionSurvey.length > 0) {
      satisfactionSurvey.forEach(answer => {
        const answerId = uuidv4();
        prepare(`
          INSERT INTO satisfaction_surveys (id, review_id, question_id, score)
          VALUES (?, ?, ?, ?)
        `).run(answerId, id, answer.questionId, answer.score);
      });
    }
    
    // Update status to employee_submitted
    prepare(`
      UPDATE quarterly_reviews SET status = 'employee_submitted', updated_at = ?
      WHERE id = ?
    `).run(now, id);
    
    res.json({ success: true, data: { id, status: 'employee_submitted' } });
  } catch (error) {
    console.error('Error employee submit:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/quarterly-reviews/:id/manager-review
 * 主管評核季度面談
 */
router.patch('/:id/manager-review', (req, res) => {
  try {
    const { id } = req.params;
    const { managerComment, developmentPlan, sections } = req.body;
    
    const qr = prepare(`SELECT * FROM quarterly_reviews WHERE id = ?`).get(id);
    if (!qr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此季度面談' } });
    }
    
    // 檢查狀態必須是 employee_submitted 才能評核
    if (qr.status !== 'employee_submitted') {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_STATUS', message: '只有「員工已提交」狀態的表單才能進行主管評核' } 
      });
    }
    
    const now = new Date().toISOString();
    
    // 更新或新增主管評分區塊
    if (sections && sections.length > 0) {
      sections.forEach((section) => {
        // 檢查是否已存在該區塊
        const existing = prepare(`
          SELECT id FROM quarterly_review_sections 
          WHERE review_id = ? AND section_type = ?
        `).get(id, section.sectionType);
        
        const content = typeof section.content === 'object' ? JSON.stringify(section.content) : section.content;
        
        if (existing) {
          // 更新現有區塊
          prepare(`
            UPDATE quarterly_review_sections 
            SET content = ?
            WHERE id = ?
          `).run(content, existing.id);
        } else {
          // 新增區塊
          const sectionId = uuidv4();
          prepare(`
            INSERT INTO quarterly_review_sections (id, review_id, section_type, content, order_num)
            VALUES (?, ?, ?, ?, ?)
          `).run(sectionId, id, section.sectionType, content, 99);
        }
      });
    }
    
    // 更新主管評語和發展建議
    prepare(`
      UPDATE quarterly_reviews 
      SET status = 'manager_reviewed', 
          manager_comment = ?, 
          development_plan = ?,
          updated_at = ?
      WHERE id = ?
    `).run(managerComment || null, developmentPlan || null, now, id);
    
    res.json({ success: true, data: { id, status: 'manager_reviewed' } });
  } catch (error) {
    console.error('Error manager review:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/quarterly-reviews/:id/schedule-interview
 * 預約面談時間
 */
router.patch('/:id/schedule-interview', (req, res) => {
  try {
    const { id } = req.params;
    const { interviewDate, location } = req.body;
    
    const qr = prepare(`SELECT * FROM quarterly_reviews WHERE id = ?`).get(id);
    if (!qr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此季度面談' } });
    }
    
    // 檢查狀態必須是 manager_reviewed 才能預約面談
    if (qr.status !== 'manager_reviewed') {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_STATUS', message: '只有「主管已評核」狀態的表單才能預約面談' } 
      });
    }
    
    const now = new Date().toISOString();
    
    prepare(`
      UPDATE quarterly_reviews 
      SET status = 'interview_scheduled', interview_date = ?, interview_location = ?, updated_at = ?
      WHERE id = ?
    `).run(interviewDate, location || null, now, id);
    
    res.json({ success: true, data: { id, status: 'interview_scheduled', interviewDate } });
  } catch (error) {
    console.error('Error scheduling interview:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/quarterly-reviews/:id/complete-interview
 * 完成面談
 */
router.patch('/:id/complete-interview', (req, res) => {
  try {
    const { id } = req.params;
    const { totalScore, managerComment, developmentPlan } = req.body;
    
    const qr = prepare(`SELECT * FROM quarterly_reviews WHERE id = ?`).get(id);
    if (!qr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此季度面談' } });
    }
    
    // 檢查狀態必須是 interview_scheduled 才能完成面談
    if (qr.status !== 'interview_scheduled') {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_STATUS', message: '只有「已預約面談」狀態的表單才能完成面談' } 
      });
    }
    
    const now = new Date().toISOString();
    
    prepare(`
      UPDATE quarterly_reviews 
      SET status = 'interview_completed', total_score = ?, manager_comment = ?, development_plan = ?, updated_at = ?
      WHERE id = ?
    `).run(totalScore, managerComment, developmentPlan, now, id);
    
    res.json({ success: true, data: { id, status: 'interview_completed' } });
  } catch (error) {
    console.error('Error completing interview:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/quarterly-reviews/:id/hr-close
 * HR 結案
 */
router.patch('/:id/hr-close', (req, res) => {
  try {
    const { id } = req.params;
    const { hrComment } = req.body;
    
    const qr = prepare(`SELECT * FROM quarterly_reviews WHERE id = ?`).get(id);
    if (!qr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此季度面談' } });
    }
    
    // 檢查狀態必須是 interview_completed 才能結案
    if (qr.status !== 'interview_completed') {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_STATUS', message: '只有「面談完成」狀態的表單才能結案' } 
      });
    }
    
    const now = new Date().toISOString();
    
    prepare(`
      UPDATE quarterly_reviews 
      SET status = 'completed', hr_comment = ?, updated_at = ?
      WHERE id = ?
    `).run(hrComment || null, now, id);
    
    res.json({ success: true, data: { id, status: 'completed' } });
  } catch (error) {
    console.error('Error HR close:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

module.exports = router;
