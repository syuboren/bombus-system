/**
 * 職能評估系統 API Routes
 * 包含月度檢核、季度面談相關 API
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prepare, getDb } = require('../db');

// =====================================================
// Helper Functions
// =====================================================

/**
 * 取得員工資訊
 */
function getEmployeeInfo(employeeId) {
  return prepare(`
    SELECT id, name, email, department, position, manager_id
    FROM employees WHERE id = ?
  `).get(employeeId) || {};
}

/**
 * 計算加權總分
 * 公式: Σ(主管評分 × 點數/總點數) × 20
 */
function calculateTotalScore(items) {
  const totalPoints = items.reduce((sum, item) => sum + (item.points || 0), 0);
  if (totalPoints === 0) return 0;
  
  const weightedSum = items.reduce((sum, item) => {
    const score = item.manager_score || item.self_score || 0;
    return sum + (score * (item.points / totalPoints));
  }, 0);
  
  return Math.round(weightedSum * 20 * 10) / 10; // 保留一位小數
}

/**
 * 判斷是否逾期
 */
function isOverdue(year, month, status, deadlineDay) {
  if (status === 'completed') return false;
  const now = new Date();
  const deadlineDate = new Date(year, month - 1, deadlineDay);
  return now > deadlineDate;
}

// =====================================================
// 月度檢核 API
// =====================================================

/**
 * GET /api/monthly-checks
 * 取得月度檢核列表
 */
router.get('/monthly-checks', (req, res) => {
  try {
    const { year, month, status, departmentId, employeeId, page = 1, pageSize = 20 } = req.query;
    
    // 動態建構 SQL
    let conditions = [];
    let params = [];
    
    if (year) {
      conditions.push('mc.year = ?');
      params.push(parseInt(year));
    }
    if (month) {
      conditions.push('mc.month = ?');
      params.push(parseInt(month));
    }
    if (status) {
      conditions.push('mc.status = ?');
      params.push(status);
    }
    if (departmentId) {
      conditions.push('e.department = ?');
      params.push(departmentId);
    }
    if (employeeId) {
      conditions.push('mc.employee_id = ?');
      params.push(employeeId);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 計算總數
    const countResult = prepare(`
      SELECT COUNT(*) as total 
      FROM monthly_checks mc
      LEFT JOIN employees e ON mc.employee_id = e.id
      ${whereClause}
    `).get(...params);
    const totalItems = countResult?.total || 0;
    
    // 查詢資料
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const rows = prepare(`
      SELECT mc.*, e.name as employee_name, e.department, e.position,
             m.name as manager_name
      FROM monthly_checks mc
      LEFT JOIN employees e ON mc.employee_id = e.id
      LEFT JOIN employees m ON mc.manager_id = m.id
      ${whereClause}
      ORDER BY mc.year DESC, mc.month DESC, mc.created_at DESC
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
      month: row.month,
      status: row.status,
      selfAssessmentDate: row.self_assessment_date,
      managerReviewDate: row.manager_review_date,
      hrReviewDate: row.hr_review_date,
      totalScore: row.total_score,
      isOverdue: isOverdue(row.year, row.month, row.status, 5),
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
    console.error('Error fetching monthly checks:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/monthly-checks/:id
 * 取得單筆月度檢核詳情
 */
router.get('/monthly-checks/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const mc = prepare(`
      SELECT mc.*, e.name as employee_name, e.department, e.position,
             m.name as manager_name
      FROM monthly_checks mc
      LEFT JOIN employees e ON mc.employee_id = e.id
      LEFT JOIN employees m ON mc.manager_id = m.id
      WHERE mc.id = ?
    `).get(id);
    
    if (!mc) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此月度檢核表' } });
    }
    
    // Get items
    const itemRows = prepare(`
      SELECT * FROM monthly_check_items WHERE monthly_check_id = ? ORDER BY order_num
    `).all(id);
    
    const items = itemRows.map(row => ({
      id: row.id,
      templateId: row.template_id,
      name: row.name,
      points: row.points,
      description: row.description,
      measurement: row.measurement,
      orderNum: row.order_num,
      selfScore: row.self_score,
      managerScore: row.manager_score,
      weightedScore: row.weighted_score
    }));
    
    res.json({
      success: true,
      data: {
        id: mc.id,
        employeeId: mc.employee_id,
        employeeName: mc.employee_name,
        department: mc.department,
        position: mc.position,
        managerId: mc.manager_id,
        managerName: mc.manager_name,
        year: mc.year,
        month: mc.month,
        status: mc.status,
        selfAssessmentDate: mc.self_assessment_date,
        managerReviewDate: mc.manager_review_date,
        hrReviewDate: mc.hr_review_date,
        totalScore: mc.total_score,
        managerComment: mc.manager_comment,
        hrComment: mc.hr_comment,
        // 電子簽名資料
        employeeSignature: mc.employee_signature,
        employeeSignatureDate: mc.employee_signature_date,
        managerSignature: mc.manager_signature,
        managerSignatureDate: mc.manager_signature_date,
        hrSignature: mc.hr_signature,
        hrSignatureDate: mc.hr_signature_date,
        items,
        isOverdue: isOverdue(mc.year, mc.month, mc.status, 5),
        createdAt: mc.created_at,
        updatedAt: mc.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching monthly check:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/monthly-checks
 * 建立月度檢核表
 */
router.post('/monthly-checks', (req, res) => {
  try {
    const { employeeId, year, month, copyFromPreviousMonth = true } = req.body;
    
    if (!employeeId || !year || !month) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: '員工 ID、年份、月份為必填欄位' } 
      });
    }
    
    // Check duplicate
    const existing = prepare(`
      SELECT id FROM monthly_checks WHERE employee_id = ? AND year = ? AND month = ?
    `).get(employeeId, year, month);
    
    if (existing?.id) {
      return res.status(409).json({ 
        success: false, 
        error: { code: 'DUPLICATE_RECORD', message: '該員工本月已有檢核表' } 
      });
    }
    
    // Get employee info
    const employee = getEmployeeInfo(employeeId);
    if (!employee.id) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: '找不到此員工' } 
      });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    // Insert monthly check
    prepare(`
      INSERT INTO monthly_checks (id, employee_id, manager_id, year, month, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'self_assessment', ?)
    `).run(id, employeeId, employee.manager_id, year, month, now);
    
    // Get templates (from previous month or by position)
    let templates = [];
    
    if (copyFromPreviousMonth) {
      // Try to get from previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      
      templates = prepare(`
        SELECT mci.* FROM monthly_check_items mci
        JOIN monthly_checks mc ON mci.monthly_check_id = mc.id
        WHERE mc.employee_id = ? AND mc.year = ? AND mc.month = ?
        ORDER BY mci.order_num
      `).all(employeeId, prevYear, prevMonth);
    }
    
    // If no previous data, use templates
    if (templates.length === 0) {
      templates = prepare(`
        SELECT * FROM monthly_check_templates
        WHERE department = ? AND position = ? AND is_active = 1
        ORDER BY order_num
      `).all(employee.department, employee.position);
    }
    
    // Insert items
    templates.forEach((tpl, idx) => {
      const itemId = uuidv4();
      prepare(`
        INSERT INTO monthly_check_items (id, monthly_check_id, template_id, name, points, description, measurement, order_num)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        itemId, id, tpl.template_id || tpl.id, tpl.name, tpl.points,
        tpl.description, tpl.measurement, idx + 1
      );
    });
    
    res.status(201).json({
      success: true,
      data: { id, employeeId, year, month, status: 'self_assessment' }
    });
  } catch (error) {
    console.error('Error creating monthly check:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/monthly-checks/:id/self-assessment
 * 員工自評提交 (需要電子簽名)
 */
router.patch('/monthly-checks/:id/self-assessment', (req, res) => {
  try {
    const { id } = req.params;
    const { items, signature } = req.body;
    
    // Check status
    const mc = prepare(`SELECT * FROM monthly_checks WHERE id = ?`).get(id);
    if (!mc) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此月度檢核表' } });
    }
    if (mc.status !== 'self_assessment') {
      return res.status(409).json({ success: false, error: { code: 'STATUS_CONFLICT', message: '目前狀態不允許自評' } });
    }
    
    // 驗證簽名
    if (!signature) {
      return res.status(400).json({ success: false, error: { code: 'SIGNATURE_REQUIRED', message: '請完成電子簽名後再提交' } });
    }
    
    // Update items
    items.forEach(item => {
      prepare(`UPDATE monthly_check_items SET self_score = ? WHERE id = ?`).run(item.selfScore, item.itemId);
    });
    
    // Update status with signature
    const now = new Date().toISOString();
    prepare(`
      UPDATE monthly_checks 
      SET status = 'manager_review', self_assessment_date = ?, employee_signature = ?, employee_signature_date = ?, updated_at = ?
      WHERE id = ?
    `).run(now, signature, now, now, id);
    
    res.json({ success: true, data: { id, status: 'manager_review' } });
  } catch (error) {
    console.error('Error submitting self assessment:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/monthly-checks/:id/manager-review
 * 主管審核 (核准時需要電子簽名)
 */
router.patch('/monthly-checks/:id/manager-review', (req, res) => {
  try {
    const { id } = req.params;
    const { action, items, comment, signature } = req.body;
    
    // Check status
    const mc = prepare(`SELECT * FROM monthly_checks WHERE id = ?`).get(id);
    if (!mc) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此月度檢核表' } });
    }
    if (mc.status !== 'manager_review') {
      return res.status(409).json({ success: false, error: { code: 'STATUS_CONFLICT', message: '目前狀態不允許審核' } });
    }
    
    const now = new Date().toISOString();
    
    if (action === 'approve') {
      // 核准時驗證簽名
      if (!signature) {
        return res.status(400).json({ success: false, error: { code: 'SIGNATURE_REQUIRED', message: '請完成電子簽名後再核准' } });
      }
      
      // Update items with manager scores
      items.forEach(item => {
        prepare(`UPDATE monthly_check_items SET manager_score = ? WHERE id = ?`).run(item.managerScore, item.itemId);
      });
      
      // Calculate weighted scores (for display only, total_score will be calculated on HR close)
      const allItems = prepare(`SELECT * FROM monthly_check_items WHERE monthly_check_id = ?`).all(id);
      
      const totalPoints = allItems.reduce((sum, item) => sum + (item.points || 0), 0);
      allItems.forEach(item => {
        const weightedScore = (item.manager_score || 0) * (item.points / totalPoints);
        prepare(`UPDATE monthly_check_items SET weighted_score = ? WHERE id = ?`).run(weightedScore, item.id);
      });
      
      // Update status with manager signature (total_score will be calculated when HR closes)
      prepare(`
        UPDATE monthly_checks 
        SET status = 'hr_review', manager_review_date = ?, manager_comment = ?, manager_signature = ?, manager_signature_date = ?, updated_at = ?
        WHERE id = ?
      `).run(now, comment || null, signature, now, now, id);
      
    } else if (action === 'reject') {
      // Reject - back to self_assessment, clear employee signature (need to re-sign)
      prepare(`
        UPDATE monthly_checks 
        SET status = 'self_assessment', manager_comment = ?, employee_signature = NULL, employee_signature_date = NULL, updated_at = ?
        WHERE id = ?
      `).run(comment, now, id);
    }
    
    res.json({ success: true, data: { id, status: action === 'approve' ? 'hr_review' : 'self_assessment' } });
  } catch (error) {
    console.error('Error manager review:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/monthly-checks/:id/hr-close
 * HR 結案 (結案時需要電子簽名)
 */
router.patch('/monthly-checks/:id/hr-close', (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment, signature } = req.body;
    
    const mc = prepare(`SELECT * FROM monthly_checks WHERE id = ?`).get(id);
    if (!mc) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此月度檢核表' } });
    }
    
    const now = new Date().toISOString();
    
    if (action === 'close') {
      if (mc.status !== 'hr_review') {
        return res.status(409).json({ success: false, error: { code: 'STATUS_CONFLICT', message: '目前狀態不允許結案' } });
      }
      
      // 結案時驗證簽名
      if (!signature) {
        return res.status(400).json({ success: false, error: { code: 'SIGNATURE_REQUIRED', message: '請完成電子簽名後再結案' } });
      }
      
      // Calculate total score on HR close (final step)
      const allItems = prepare(`SELECT * FROM monthly_check_items WHERE monthly_check_id = ?`).all(id);
      const totalScore = calculateTotalScore(allItems);
      
      prepare(`
        UPDATE monthly_checks 
        SET status = 'completed', hr_review_date = ?, hr_comment = ?, total_score = ?, hr_signature = ?, hr_signature_date = ?, updated_at = ?
        WHERE id = ?
      `).run(now, comment || null, totalScore, signature, now, now, id);
    } else if (action === 'reopen') {
      // 退回主管 - 狀態改為 manager_review, 清除主管簽名 (需重新簽名)
      prepare(`
        UPDATE monthly_checks 
        SET status = 'manager_review', hr_comment = ?, manager_signature = NULL, manager_signature_date = NULL, updated_at = ?
        WHERE id = ?
      `).run(comment || null, now, id);
    }
    
    const newStatus = action === 'close' ? 'completed' : 'manager_review';
    res.json({ success: true, data: { id, status: newStatus } });
  } catch (error) {
    console.error('Error HR close:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// =====================================================
// 統計 API
// =====================================================

/**
 * GET /api/competency-stats/overview
 * 取得統計概覽
 */
router.get('/competency-stats/overview', (req, res) => {
  try {
    const { year, month, quarter } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    // Monthly check stats
    let mcRows;
    if (month) {
      mcRows = prepare(`SELECT status, COUNT(*) as count FROM monthly_checks WHERE year = ? AND month = ? GROUP BY status`).all(currentYear, parseInt(month));
    } else {
      mcRows = prepare(`SELECT status, COUNT(*) as count FROM monthly_checks WHERE year = ? GROUP BY status`).all(currentYear);
    }
    
    const mcStats = { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    mcRows.forEach(row => {
      mcStats.total += row.count;
      if (row.status === 'completed') mcStats.completed = row.count;
      else if (row.status === 'overdue') mcStats.overdue = row.count;
      else mcStats.inProgress += row.count;
    });
    mcStats.completionRate = mcStats.total > 0 ? Math.round((mcStats.completed / mcStats.total) * 100) : 0;
    
    // Quarterly review stats
    let qrRows;
    if (quarter) {
      qrRows = prepare(`SELECT status, COUNT(*) as count FROM quarterly_reviews WHERE year = ? AND quarter = ? GROUP BY status`).all(currentYear, parseInt(quarter));
    } else {
      qrRows = prepare(`SELECT status, COUNT(*) as count FROM quarterly_reviews WHERE year = ? GROUP BY status`).all(currentYear);
    }
    
    const qrStats = { total: 0, completed: 0, inProgress: 0 };
    qrRows.forEach(row => {
      qrStats.total += row.count;
      if (row.status === 'completed') qrStats.completed = row.count;
      else qrStats.inProgress += row.count;
    });
    qrStats.completionRate = qrStats.total > 0 ? Math.round((qrStats.completed / qrStats.total) * 100) : 0;
    
    // Weekly report stats
    const wrRows = prepare(`SELECT status, COUNT(*) as count FROM weekly_reports WHERE year = ? GROUP BY status`).all(currentYear);
    const wrStats = { total: 0, submitted: 0, approved: 0, submissionRate: 0 };
    wrRows.forEach(row => {
      wrStats.total += row.count;
      if (row.status === 'submitted' || row.status === 'approved') wrStats.submitted += row.count;
      if (row.status === 'approved') wrStats.approved = row.count;
    });
    wrStats.submissionRate = wrStats.total > 0 ? Math.round((wrStats.submitted / wrStats.total) * 100) : 0;
    
    res.json({
      success: true,
      data: {
        monthlyCheck: mcStats,
        quarterlyReview: qrStats,
        weeklyReport: wrStats
      }
    });
  } catch (error) {
    console.error('Error fetching overview:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/personal-trend
 * 取得個人績效趨勢
 */
router.get('/competency-stats/personal-trend', (req, res) => {
  try {
    const { year, employeeId } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    // Monthly scores
    const monthlyScores = prepare(`
      SELECT month, total_score as score
      FROM monthly_checks
      WHERE year = ? AND employee_id = ? AND status = 'completed'
      ORDER BY month
    `).all(currentYear, employeeId).map(row => ({ month: row.month, score: row.score }));
    
    // Quarterly scores
    const quarterlyScores = prepare(`
      SELECT quarter, total_score as score
      FROM quarterly_reviews
      WHERE year = ? AND employee_id = ? AND status = 'completed'
      ORDER BY quarter
    `).all(currentYear, employeeId).map(row => ({ quarter: row.quarter, score: row.score }));
    
    res.json({
      success: true,
      data: { monthlyScores, quarterlyScores }
    });
  } catch (error) {
    console.error('Error fetching personal trend:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/department
 * 取得部門平均分數統計
 */
router.get('/competency-stats/department', (req, res) => {
  try {
    const { year, month, departmentId } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    let conditions = ['mc.year = ?'];
    let params = [currentYear];
    
    if (month) {
      conditions.push('mc.month = ?');
      params.push(parseInt(month));
    }
    if (departmentId) {
      conditions.push('e.department = ?');
      params.push(departmentId);
    }
    
    const whereClause = 'WHERE ' + conditions.join(' AND ');
    
    const rows = prepare(`
      SELECT 
        e.department,
        COUNT(*) as total,
        COUNT(CASE WHEN mc.status = 'completed' THEN 1 END) as completed,
        AVG(CASE WHEN mc.status = 'completed' THEN mc.total_score END) as avg_score
      FROM monthly_checks mc
      LEFT JOIN employees e ON mc.employee_id = e.id
      ${whereClause}
      GROUP BY e.department
      ORDER BY e.department
    `).all(...params);
    
    const departments = rows.map(row => ({
      department: row.department,
      total: row.total,
      completed: row.completed,
      completionRate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
      avgScore: row.avg_score ? Math.round(row.avg_score * 10) / 10 : null
    }));
    
    res.json({
      success: true,
      data: { departments }
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/overdue-list
 * 取得逾期/未完成名單 (HR 專用)
 */
router.get('/competency-stats/overdue-list', (req, res) => {
  try {
    const { year, month, type = 'all' } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    
    // 取得所有在職員工
    const employees = prepare(`
      SELECT id, name, department, position, manager_id
      FROM employees WHERE status = 'active'
    `).all();
    
    // 取得當月已有檢核表的員工
    const existingChecks = prepare(`
      SELECT employee_id, status, self_assessment_date, manager_review_date
      FROM monthly_checks
      WHERE year = ? AND month = ?
    `).all(currentYear, currentMonth);
    
    const checkMap = new Map(existingChecks.map(c => [c.employee_id, c]));
    
    const overdueList = [];
    const now = new Date();
    const selfDeadline = 5;  // 每月 5 號
    const managerDeadline = 7;  // 每月 7 號
    
    employees.forEach(emp => {
      const check = checkMap.get(emp.id);
      
      if (!check) {
        // 尚未建立檢核表
        if (type === 'all' || type === 'not_started') {
          overdueList.push({
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            position: emp.position,
            status: 'not_started',
            statusLabel: '尚未建立',
            year: currentYear,
            month: currentMonth
          });
        }
      } else if (check.status === 'self_assessment') {
        // 自評中 - 檢查是否逾期
        const isOverdue = now.getDate() > selfDeadline;
        if (type === 'all' || type === 'self_assessment' || (type === 'overdue' && isOverdue)) {
          overdueList.push({
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            position: emp.position,
            status: check.status,
            statusLabel: isOverdue ? '自評逾期' : '自評中',
            isOverdue,
            year: currentYear,
            month: currentMonth
          });
        }
      } else if (check.status === 'manager_review') {
        // 主管審核中 - 檢查是否逾期
        const isOverdue = now.getDate() > managerDeadline;
        if (type === 'all' || type === 'manager_review' || (type === 'overdue' && isOverdue)) {
          overdueList.push({
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            position: emp.position,
            status: check.status,
            statusLabel: isOverdue ? '審核逾期' : '主管審核中',
            isOverdue,
            year: currentYear,
            month: currentMonth
          });
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        year: currentYear,
        month: currentMonth,
        total: overdueList.length,
        items: overdueList
      }
    });
  } catch (error) {
    console.error('Error fetching overdue list:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/monthly-incomplete
 * 取得月度未完成清單 (HR 儀表板)
 */
router.get('/competency-stats/monthly-incomplete', (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    
    // 取得所有未完成的月度檢核
    const incompleteList = prepare(`
      SELECT mc.id, mc.employee_id as employeeId, e.name as employeeName, 
             e.department, e.position, mc.status
      FROM monthly_checks mc
      JOIN employees e ON mc.employee_id = e.id
      WHERE mc.year = ? AND mc.month = ? AND mc.status != 'completed'
      ORDER BY 
        CASE mc.status 
          WHEN 'self_assessment' THEN 1 
          WHEN 'manager_review' THEN 2 
          WHEN 'hr_review' THEN 3 
        END
    `).all(currentYear, currentMonth);
    
    // 加上狀態標籤
    const statusLabels = {
      'self_assessment': '自評中',
      'manager_review': '主管審核中',
      'hr_review': 'HR審核中'
    };
    
    const result = incompleteList.map(item => ({
      ...item,
      statusLabel: statusLabels[item.status] || item.status
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching monthly incomplete list:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/quarterly-incomplete
 * 取得季度未完成清單 (HR 儀表板)
 */
router.get('/competency-stats/quarterly-incomplete', (req, res) => {
  try {
    const { year, quarter } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentQuarter = parseInt(quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
    
    // 取得所有未完成的季度面談
    const incompleteList = prepare(`
      SELECT qr.id, qr.employee_id as employeeId, e.name as employeeName, 
             e.department, e.position, qr.status
      FROM quarterly_reviews qr
      JOIN employees e ON qr.employee_id = e.id
      WHERE qr.year = ? AND qr.quarter = ? AND qr.status != 'completed'
      ORDER BY qr.status
    `).all(currentYear, currentQuarter);
    
    // 加上狀態標籤
    const statusLabels = {
      'employee_submitted': '員工已提交',
      'manager_reviewed': '主管已評核',
      'interview_scheduled': '已預約面談',
      'post_interview_edit': '面談後編輯',
      'interview_completed': '面談完成'
    };
    
    const result = incompleteList.map(item => ({
      ...item,
      statusLabel: statusLabels[item.status] || item.status
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching quarterly incomplete list:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/department-avg
 * 取得各部門平均分數 (HR 儀表板)
 */
router.get('/competency-stats/department-avg', (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = parseInt(month) || new Date().getMonth() + 1;
    
    // 取得各部門的平均分數
    const deptStats = prepare(`
      SELECT 
        e.department,
        COUNT(DISTINCT mc.employee_id) as employeeCount,
        COUNT(CASE WHEN mc.status = 'completed' THEN 1 END) as completedCount,
        AVG(CASE WHEN mc.status = 'completed' THEN mc.total_score END) as avgScore
      FROM monthly_checks mc
      JOIN employees e ON mc.employee_id = e.id
      WHERE mc.year = ? AND mc.month = ?
      GROUP BY e.department
      ORDER BY avgScore DESC
    `).all(currentYear, currentMonth);
    
    const result = deptStats.map(dept => ({
      department: dept.department,
      employeeCount: dept.employeeCount || 0,
      completedCount: dept.completedCount || 0,
      avgScore: dept.avgScore ? parseFloat(dept.avgScore.toFixed(2)) : 0
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching department avg scores:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/personal-history
 * 取得個人歷史績效曲線 (HR 儀表板)
 */
router.get('/competency-stats/personal-history', (req, res) => {
  try {
    const { employeeId, year } = req.query;
    
    if (!employeeId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'employeeId is required' } });
    }
    
    const currentYear = parseInt(year) || new Date().getFullYear();
    
    // 取得員工資訊
    const employee = prepare(`
      SELECT id, name, department, position FROM employees WHERE id = ?
    `).get(employeeId);
    
    if (!employee) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Employee not found' } });
    }
    
    // 取得月度分數歷史 (最近 12 個月)
    const monthlyScores = prepare(`
      SELECT year, month, total_score as score
      FROM monthly_checks
      WHERE employee_id = ? AND status = 'completed'
      ORDER BY year DESC, month DESC
      LIMIT 12
    `).all(employeeId);
    
    // 取得季度分數歷史 (最近 4 季)
    const quarterlyScores = prepare(`
      SELECT year, quarter, total_score as score
      FROM quarterly_reviews
      WHERE employee_id = ? AND status = 'completed'
      ORDER BY year DESC, quarter DESC
      LIMIT 4
    `).all(employeeId);
    
    // 格式化為 yearMonth 格式
    const formattedMonthly = monthlyScores.reverse().map(s => ({
      yearMonth: `${s.year}/${s.month}`,
      score: s.score || 0
    }));
    
    const formattedQuarterly = quarterlyScores.reverse().map(s => ({
      yearQuarter: `${s.year} Q${s.quarter}`,
      score: s.score || 0
    }));
    
    res.json({
      success: true,
      data: {
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        position: employee.position,
        monthlyScores: formattedMonthly,
        quarterlyScores: formattedQuarterly
      }
    });
  } catch (error) {
    console.error('Error fetching personal history:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/employees/list
 * 取得所有員工列表（用於下拉選單）
 */
router.get('/employees/list', (req, res) => {
  try {
    const employees = prepare(`
      SELECT id, name, department, position
      FROM employees
      WHERE status = 'active'
      ORDER BY department, name
    `).all();
    
    res.json({ success: true, data: employees });
  } catch (error) {
    console.error('Error fetching employee list:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/weekly-incomplete
 * 取得週報未完成清單 (HR 儀表板)
 * 包含 not_started、draft、rejected 狀態
 */
router.get('/competency-stats/weekly-incomplete', (req, res) => {
  try {
    const { year, week } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentWeek = parseInt(week) || getWeekNumber(new Date());
    
    // 取得所有未提交的週報 (包含 not_started, draft, rejected)
    const incompleteList = prepare(`
      SELECT wr.id, wr.employee_id as employeeId, e.name as employeeName, 
             e.department, e.position, wr.status
      FROM weekly_reports wr
      JOIN employees e ON wr.employee_id = e.id
      WHERE wr.year = ? AND wr.week = ? AND wr.status IN ('not_started', 'draft', 'rejected')
      ORDER BY e.department, e.name
    `).all(currentYear, currentWeek);
    
    // 加上狀態標籤
    const statusLabels = {
      'not_started': '尚未填寫',
      'draft': '草稿',
      'rejected': '已退回'
    };
    
    const result = incompleteList.map(item => ({
      ...item,
      statusLabel: statusLabels[item.status] || item.status
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching weekly incomplete list:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competency-stats/department-avg-quarterly
 * 取得各部門季度平均分數 (HR 儀表板)
 */
router.get('/competency-stats/department-avg-quarterly', (req, res) => {
  try {
    const { year, quarter } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentQuarter = parseInt(quarter) || Math.ceil((new Date().getMonth() + 1) / 3);
    
    // 取得各部門的季度平均分數（從季度面談）
    const deptStats = prepare(`
      SELECT 
        e.department,
        COUNT(DISTINCT qr.employee_id) as employeeCount,
        COUNT(CASE WHEN qr.status = 'completed' THEN 1 END) as completedCount,
        AVG(CASE WHEN qr.status = 'completed' THEN qr.total_score END) as avgScore
      FROM quarterly_reviews qr
      JOIN employees e ON qr.employee_id = e.id
      WHERE qr.year = ? AND qr.quarter = ?
      GROUP BY e.department
      ORDER BY avgScore DESC
    `).all(currentYear, currentQuarter);
    
    const result = deptStats.map(dept => ({
      department: dept.department,
      employeeCount: dept.employeeCount || 0,
      completedCount: dept.completedCount || 0,
      avgScore: dept.avgScore ? parseFloat(dept.avgScore.toFixed(2)) : 0
    }));
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching department quarterly avg scores:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// =====================================================
// 職能基準庫 API (Competency Framework)
// =====================================================

/**
 * GET /api/competencies
 * 取得職能列表
 * @query type - 職能類型篩選 (level-based, ksa)
 * @query category - 職能類別篩選 (core, management, professional, ksa)
 */
router.get('/competencies', (req, res) => {
  try {
    const { type, category } = req.query;
    
    // 建構查詢條件
    let conditions = [];
    let params = [];
    
    if (type) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 查詢職能主表
    const competencies = prepare(`
      SELECT id, code, name, type, category, description, created_at, updated_at
      FROM competencies
      ${whereClause}
      ORDER BY category, code
    `).all(...params);
    
    // 根據類型附加對應的詳細資訊
    const result = competencies.map(comp => {
      // 核心職能、管理職能、專業職能都有 L1-L6 等級
      if (comp.category === 'core' || comp.category === 'management' || comp.category === 'professional') {
        // 取得等級資料
        const levels = prepare(`
          SELECT id, level, indicators
          FROM competency_levels
          WHERE competency_id = ?
          ORDER BY level
        `).all(comp.id);
        
        return {
          ...comp,
          levels: levels.map(lvl => ({
            id: lvl.id,
            level: lvl.level,
            indicators: lvl.indicators
          }))
        };
      } else if (comp.category === 'ksa') {
        // 取得 KSA 詳細資訊
        const ksaDetail = prepare(`
          SELECT id, behavior_indicators, linked_courses
          FROM competency_ksa_details
          WHERE competency_id = ?
        `).get(comp.id);
        
        return {
          ...comp,
          ksaDetail: ksaDetail ? {
            id: ksaDetail.id,
            behaviorIndicators: ksaDetail.behavior_indicators,
            linkedCourses: ksaDetail.linked_courses
          } : null
        };
      }
      return comp;
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching competencies:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competencies/stats
 * 取得職能統計數據
 */
router.get('/competencies/stats', (req, res) => {
  try {
    // 計算各類別的職能數量
    const stats = {
      total: 0,
      byCategory: {},
      byType: {}
    };
    
    // 按類別統計
    const categoryStats = prepare(`
      SELECT category, COUNT(*) as count
      FROM competencies
      GROUP BY category
    `).all();
    
    categoryStats.forEach(row => {
      stats.byCategory[row.category] = row.count;
      stats.total += row.count;
    });
    
    // 按類型統計
    const typeStats = prepare(`
      SELECT type, COUNT(*) as count
      FROM competencies
      GROUP BY type
    `).all();
    
    typeStats.forEach(row => {
      stats.byType[row.type] = row.count;
    });
    
    // 額外統計
    const levelsCount = prepare('SELECT COUNT(*) as count FROM competency_levels').get().count;
    const ksaDetailsCount = prepare('SELECT COUNT(*) as count FROM competency_ksa_details').get().count;
    
    stats.levelsCount = levelsCount;
    stats.ksaDetailsCount = ksaDetailsCount;
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching competency stats:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/competencies/:id
 * 取得單一職能詳細資訊
 */
router.get('/competencies/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    // 查詢職能主表
    const competency = prepare(`
      SELECT id, code, name, type, category, description, created_at, updated_at
      FROM competencies
      WHERE id = ?
    `).get(id);
    
    if (!competency) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: '找不到此職能' } 
      });
    }
    
    let result = { ...competency };
    
    if (competency.type === 'level-based') {
      // 取得等級資料
      const levels = prepare(`
        SELECT id, level, indicators
        FROM competency_levels
        WHERE competency_id = ?
        ORDER BY level
      `).all(id);
      
      result.levels = levels.map(lvl => ({
        id: lvl.id,
        level: lvl.level,
        indicators: lvl.indicators
      }));
    } else if (competency.type === 'ksa') {
      // 取得 KSA 詳細資訊
      const ksaDetail = prepare(`
        SELECT id, behavior_indicators, linked_courses
        FROM competency_ksa_details
        WHERE competency_id = ?
      `).get(id);
      
      if (ksaDetail) {
        result.ksaDetail = {
          id: ksaDetail.id,
          behaviorIndicators: ksaDetail.behavior_indicators,
          linkedCourses: ksaDetail.linked_courses
        };
      }
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching competency:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

module.exports = router;
