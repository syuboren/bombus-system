/**
 * 工作週報 API Routes (擴充版)
 * 支援完整週報表單結構
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');


/**
 * 取得週別的起訖日期
 */
function getWeekDates(year, week) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
  
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  
  return {
    start: weekStart.toISOString().split('T')[0],
    end: weekEnd.toISOString().split('T')[0]
  };
}

/**
 * 取得 ISO 週別號碼
 */
function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * 取得指定月份包含的週別
 */
function getWeeksInMonth(year, month) {
  const weeks = new Set();
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const weekNum = getISOWeekNumber(d);
    if (weekNum >= 1 && weekNum <= 53) {
      weeks.add(weekNum);
    }
  }
  return Array.from(weeks).sort((a, b) => a - b);
}

/**
 * 載入週報所有關聯項目
 */
function loadReportItems(db, reportId) {
  // 工作項目 (例行/非例行)
  const workItems = db.prepare(`
    SELECT * FROM weekly_report_items WHERE report_id = ? ORDER BY item_type, order_num
  `).all(reportId);

  const routineItems = [];
  const nonRoutineItems = [];

  workItems.forEach(row => {
    const item = {
      id: row.id,
      orderNum: row.order_num,
      content: row.content,
      estimatedTime: row.estimated_time || 0,
      actualTime: row.actual_time || 0,
      completedDate: row.completed_date
    };
    if (row.item_type === 'routine') {
      routineItems.push(item);
    } else if (row.item_type === 'non_routine') {
      nonRoutineItems.push(item);
    }
  });

  // 代辦事項
  const todoItems = db.prepare(`
    SELECT * FROM weekly_todo_items WHERE report_id = ? ORDER BY order_num
  `).all(reportId).map(row => ({
    id: row.id,
    orderNum: row.order_num,
    task: row.task,
    startDate: row.start_date,
    dueDate: row.due_date,
    priority: row.priority,
    status: row.status
  }));

  // 問題與解決方案
  const problemItems = db.prepare(`
    SELECT * FROM weekly_problem_items WHERE report_id = ? ORDER BY order_num
  `).all(reportId).map(row => ({
    id: row.id,
    orderNum: row.order_num,
    problem: row.problem,
    solution: row.solution,
    resolved: row.resolved === 1
  }));

  // 教育訓練進度
  const trainingItems = db.prepare(`
    SELECT * FROM weekly_training_items WHERE report_id = ? ORDER BY order_num
  `).all(reportId).map(row => ({
    id: row.id,
    orderNum: row.order_num,
    courseName: row.course_name,
    status: row.status,
    totalHours: row.total_hours,
    completedHours: row.completed_hours,
    completionRate: row.total_hours > 0 ? Math.round((row.completed_hours / row.total_hours) * 100) : 0,
    completedDate: row.completed_date
  }));

  // 階段性任務進度
  const projectItems = db.prepare(`
    SELECT * FROM weekly_project_items WHERE report_id = ? ORDER BY order_num
  `).all(reportId).map(row => ({
    id: row.id,
    orderNum: row.order_num,
    task: row.task,
    progressRate: row.progress_rate,
    collaboration: row.collaboration,
    challenges: row.challenges,
    expectedDate: row.expected_date,
    actualDate: row.actual_date
  }));

  return { routineItems, nonRoutineItems, todoItems, problemItems, trainingItems, projectItems };
}

/**
 * 儲存週報所有項目
 */
function saveReportItems(db, reportId, data) {
  const { routineItems, nonRoutineItems, todoItems, problemItems, trainingItems, projectItems } = data;

  // 清除現有項目
  db.prepare(`DELETE FROM weekly_report_items WHERE report_id = ?`).run(reportId);
  db.prepare(`DELETE FROM weekly_todo_items WHERE report_id = ?`).run(reportId);
  db.prepare(`DELETE FROM weekly_problem_items WHERE report_id = ?`).run(reportId);
  db.prepare(`DELETE FROM weekly_training_items WHERE report_id = ?`).run(reportId);
  db.prepare(`DELETE FROM weekly_project_items WHERE report_id = ?`).run(reportId);

  // 計算總時數
  let routineTotalMinutes = 0;
  let nonRoutineTotalMinutes = 0;

  // 儲存例行工作
  if (routineItems && routineItems.length > 0) {
    routineItems.forEach((item, idx) => {
      const itemId = item.id || uuidv4();
      const actualTime = item.actualTime || 0;
      routineTotalMinutes += actualTime;
      db.prepare(`
        INSERT INTO weekly_report_items (id, report_id, item_type, order_num, content, estimated_time, actual_time, completed_date)
        VALUES (?, ?, 'routine', ?, ?, ?, ?, ?)
      `).run(itemId, reportId, idx + 1, item.content, item.estimatedTime || 0, actualTime, item.completedDate || null);
    });
  }

  // 儲存非例行工作
  if (nonRoutineItems && nonRoutineItems.length > 0) {
    nonRoutineItems.forEach((item, idx) => {
      const itemId = item.id || uuidv4();
      const actualTime = item.actualTime || 0;
      nonRoutineTotalMinutes += actualTime;
      db.prepare(`
        INSERT INTO weekly_report_items (id, report_id, item_type, order_num, content, estimated_time, actual_time, completed_date)
        VALUES (?, ?, 'non_routine', ?, ?, ?, ?, ?)
      `).run(itemId, reportId, idx + 1, item.content, item.estimatedTime || 0, actualTime, item.completedDate || null);
    });
  }

  // 儲存代辦事項
  if (todoItems && todoItems.length > 0) {
    todoItems.forEach((item, idx) => {
      const itemId = item.id || uuidv4();
      db.prepare(`
        INSERT INTO weekly_todo_items (id, report_id, order_num, task, start_date, due_date, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, reportId, idx + 1, item.task, item.startDate || null, item.dueDate || null, item.priority || 'normal', item.status || 'not_started');
    });
  }

  // 儲存問題與解決方案
  if (problemItems && problemItems.length > 0) {
    problemItems.forEach((item, idx) => {
      const itemId = item.id || uuidv4();
      db.prepare(`
        INSERT INTO weekly_problem_items (id, report_id, order_num, problem, solution, resolved)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(itemId, reportId, idx + 1, item.problem, item.solution || '', item.resolved ? 1 : 0);
    });
  }

  // 儲存教育訓練進度
  if (trainingItems && trainingItems.length > 0) {
    trainingItems.forEach((item, idx) => {
      const itemId = item.id || uuidv4();
      db.prepare(`
        INSERT INTO weekly_training_items (id, report_id, order_num, course_name, status, total_hours, completed_hours, completed_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, reportId, idx + 1, item.courseName, item.status || 'not_started', item.totalHours || 0, item.completedHours || 0, item.completedDate || null);
    });
  }

  // 儲存階段性任務進度
  if (projectItems && projectItems.length > 0) {
    projectItems.forEach((item, idx) => {
      const itemId = item.id || uuidv4();
      db.prepare(`
        INSERT INTO weekly_project_items (id, report_id, order_num, task, progress_rate, collaboration, challenges, expected_date, actual_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(itemId, reportId, idx + 1, item.task, item.progressRate || 0, item.collaboration || '', item.challenges || '', item.expectedDate || null, item.actualDate || null);
    });
  }

  return { routineTotalMinutes, nonRoutineTotalMinutes };
}

/**
 * GET /api/weekly-reports
 * 取得週報列表 (含統計數據)
 */
router.get('/', (req, res) => {
  try {
    const { year, month, week, status, employeeId, page = 1, pageSize = 20 } = req.query;
    
    let conditions = [];
    let params = [];
    
    if (year) {
      conditions.push('wr.year = ?');
      params.push(parseInt(year));
    }
    
    if (week) {
      conditions.push('wr.week = ?');
      params.push(parseInt(week));
    } else if (month && year) {
      const weeksInMonth = getWeeksInMonth(parseInt(year), parseInt(month));
      if (weeksInMonth.length > 0) {
        const placeholders = weeksInMonth.map(() => '?').join(',');
        conditions.push(`wr.week IN (${placeholders})`);
        params.push(...weeksInMonth);
      }
    }
    
    // 用於統計的條件（不含 status 篩選）
    const statsWhereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    const statsParams = [...params];
    
    if (status) {
      conditions.push('wr.status = ?');
      params.push(status);
    }
    if (employeeId) {
      conditions.push('wr.employee_id = ?');
      params.push(employeeId);
    }
    
    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    
    // 計算統計數據（不受 status 篩選影響）
    const statsResult = req.tenantDB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN wr.status = 'not_started' THEN 1 ELSE 0 END) as not_started,
        SUM(CASE WHEN wr.status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN wr.status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN wr.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN wr.status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM weekly_reports wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      ${statsWhereClause}
    `).get(...statsParams);
    
    const stats = {
      total: statsResult?.total || 0,
      notStarted: statsResult?.not_started || 0,
      draft: statsResult?.draft || 0,
      submitted: statsResult?.submitted || 0,
      approved: statsResult?.approved || 0,
      rejected: statsResult?.rejected || 0,
      submissionRate: statsResult?.total > 0 
        ? Math.round(((statsResult?.submitted || 0) + (statsResult?.approved || 0)) / statsResult.total * 100) 
        : 0
    };
    
    const countResult = req.tenantDB.prepare(`
      SELECT COUNT(*) as total 
      FROM weekly_reports wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      ${whereClause}
    `).get(...params);
    const totalItems = countResult?.total || 0;
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const rows = req.tenantDB.prepare(`
      SELECT wr.*, e.name as employee_name, e.department, e.position,
             r.name as reviewer_name, m.name as manager_name
      FROM weekly_reports wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN employees r ON wr.reviewer_id = r.id
      LEFT JOIN employees m ON e.manager_id = m.id
      ${whereClause}
      ORDER BY wr.year DESC, wr.week DESC, e.name ASC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(pageSize), offset);
    
    const items = rows.map(row => ({
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      position: row.position,
      managerName: row.manager_name,
      reviewerId: row.reviewer_id,
      reviewerName: row.reviewer_name,
      year: row.year,
      week: row.week,
      weekStart: row.week_start,
      weekEnd: row.week_end,
      status: row.status,
      submitDate: row.submit_date,
      reviewDate: row.review_date,
      reviewerComment: row.reviewer_comment,
      routineTotalMinutes: row.routine_total_minutes || 0,
      nonRoutineTotalMinutes: row.non_routine_total_minutes || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json({
      success: true,
      data: {
        items,
        stats,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalItems,
          totalPages: Math.ceil(totalItems / parseInt(pageSize))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching weekly reports:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/weekly-reports/current-week
 * 取得當前週資訊
 */
router.get('/current-week', (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const week = getISOWeekNumber(now);
    const weekDates = getWeekDates(year, week);
    
    // 計算截止日期（本週五 18:00）
    const friday = new Date(weekDates.end);
    friday.setHours(18, 0, 0, 0);
    
    // 計算主管檢核日期（下週一）
    const nextMonday = new Date(weekDates.end);
    nextMonday.setDate(nextMonday.getDate() + 3);
    
    res.json({
      success: true,
      data: {
        year,
        week,
        weekStart: weekDates.start,
        weekEnd: weekDates.end,
        submitDeadline: friday.toISOString(),
        reviewDeadline: nextMonday.toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting current week:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * GET /api/weekly-reports/:id
 * 取得單筆週報詳情 (完整資料)
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const wr = req.tenantDB.prepare(`
      SELECT wr.*, e.name as employee_name, e.department, e.position,
             r.name as reviewer_name, m.name as manager_name
      FROM weekly_reports wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN employees r ON wr.reviewer_id = r.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE wr.id = ?
    `).get(id);
    
    if (!wr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此週報' } });
    }
    
    // 載入所有關聯項目
    const items = loadReportItems(req.tenantDB, id);
    
    res.json({
      success: true,
      data: {
        id: wr.id,
        employeeId: wr.employee_id,
        employeeName: wr.employee_name,
        department: wr.department,
        position: wr.position,
        managerName: wr.manager_name,
        reviewerId: wr.reviewer_id,
        reviewerName: wr.reviewer_name,
        year: wr.year,
        week: wr.week,
        weekStart: wr.week_start,
        weekEnd: wr.week_end,
        status: wr.status,
        submitDate: wr.submit_date,
        reviewDate: wr.review_date,
        reviewerComment: wr.reviewer_comment,
        nextWeekPlan: wr.next_week_plan,
        weeklySummary: wr.weekly_summary,
        routineTotalMinutes: wr.routine_total_minutes || 0,
        nonRoutineTotalMinutes: wr.non_routine_total_minutes || 0,
        employeeSignature: wr.employee_signature,
        employeeSignatureDate: wr.employee_signature_date,
        managerSignature: wr.manager_signature,
        managerSignatureDate: wr.manager_signature_date,
        ...items,
        createdAt: wr.created_at,
        updatedAt: wr.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching weekly report:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/weekly-reports
 * 建立週報
 */
router.post('/', (req, res) => {
  try {
    const { employeeId, year, week } = req.body;
    
    if (!employeeId || !year || !week) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '員工 ID、年份、週別為必填欄位' }
      });
    }
    
    const existing = req.tenantDB.prepare(`
      SELECT id FROM weekly_reports WHERE employee_id = ? AND year = ? AND week = ?
    `).get(employeeId, year, week);
    
    if (existing?.id) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_RECORD', message: '該員工本週已有週報' }
      });
    }
    
    const employee = req.tenantDB.prepare(`SELECT id, manager_id FROM employees WHERE id = ?`).get(employeeId);
    if (!employee?.id) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此員工' } });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    const weekDates = getWeekDates(year, week);
    
    req.tenantDB.prepare(`
      INSERT INTO weekly_reports (id, employee_id, reviewer_id, year, week, week_start, week_end, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started', ?)
    `).run(id, employeeId, employee.manager_id, year, week, weekDates.start, weekDates.end, now);
    
    res.status(201).json({
      success: true,
      data: { id, employeeId, year, week, weekStart: weekDates.start, weekEnd: weekDates.end, status: 'not_started' }
    });
  } catch (error) {
    console.error('Error creating weekly report:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * POST /api/weekly-reports/generate
 * 批量生成指定週的週報（為所有在職員工）
 * 用於每週一 00:00 自動生成或手動觸發
 */
router.post('/generate', (req, res) => {
  try {
    const { year, week } = req.body;
    
    if (!year || !week) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: '年份和週別為必填' }
      });
    }
    
    // 取得所有在職員工
    const employees = req.tenantDB.prepare(`
      SELECT id, manager_id FROM employees WHERE status = 'active' OR status IS NULL
    `).all();
    
    const weekDates = getWeekDates(parseInt(year), parseInt(week));
    const now = new Date().toISOString();
    
    let created = 0;
    let skipped = 0;
    
    employees.forEach(emp => {
      // 檢查是否已存在
      const existing = req.tenantDB.prepare(`
        SELECT id FROM weekly_reports WHERE employee_id = ? AND year = ? AND week = ?
      `).get(emp.id, parseInt(year), parseInt(week));
      
      if (existing?.id) {
        skipped++;
        return;
      }
      
      const id = uuidv4();
      req.tenantDB.prepare(`
        INSERT INTO weekly_reports (id, employee_id, reviewer_id, year, week, week_start, week_end, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'not_started', ?)
      `).run(id, emp.id, emp.manager_id, parseInt(year), parseInt(week), weekDates.start, weekDates.end, now);
      created++;
    });
    
    res.json({
      success: true,
      data: {
        year: parseInt(year),
        week: parseInt(week),
        weekStart: weekDates.start,
        weekEnd: weekDates.end,
        created,
        skipped,
        total: employees.length
      }
    });
  } catch (error) {
    console.error('Error generating weekly reports:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/weekly-reports/:id
 * 更新週報草稿 (完整資料)
 * 允許 not_started / draft / rejected 狀態編輯
 * not_started 開始編輯後會自動轉為 draft
 */
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { 
      routineItems, nonRoutineItems, todoItems, problemItems, trainingItems, projectItems,
      nextWeekPlan, weeklySummary 
    } = req.body;
    
    const wr = req.tenantDB.prepare(`SELECT * FROM weekly_reports WHERE id = ?`).get(id);
    if (!wr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此週報' } });
    }
    if (wr.status !== 'not_started' && wr.status !== 'draft' && wr.status !== 'rejected') {
      return res.status(409).json({ success: false, error: { code: 'STATUS_CONFLICT', message: '目前狀態不允許編輯' } });
    }
    
    const now = new Date().toISOString();
    // not_started 開始編輯後轉為 draft
    const newStatus = wr.status === 'not_started' ? 'draft' : wr.status;

    // 儲存所有項目
    const totals = saveReportItems(req.tenantDB, id, { routineItems, nonRoutineItems, todoItems, problemItems, trainingItems, projectItems });
    
    // 更新主表
    req.tenantDB.prepare(`
      UPDATE weekly_reports 
      SET status = ?, next_week_plan = ?, weekly_summary = ?, routine_total_minutes = ?, non_routine_total_minutes = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, nextWeekPlan || wr.next_week_plan, weeklySummary || wr.weekly_summary, totals.routineTotalMinutes, totals.nonRoutineTotalMinutes, now, id);
    
    res.json({ success: true, data: { id, status: newStatus } });
  } catch (error) {
    console.error('Error updating weekly report:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/weekly-reports/:id/submit
 * 提交週報 (含簽章)
 */
router.patch('/:id/submit', (req, res) => {
  try {
    const { id } = req.params;
    const { 
      routineItems, nonRoutineItems, todoItems, problemItems, trainingItems, projectItems,
      nextWeekPlan, weeklySummary, employeeSignature 
    } = req.body;
    
    const wr = req.tenantDB.prepare(`SELECT * FROM weekly_reports WHERE id = ?`).get(id);
    if (!wr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此週報' } });
    }
    if (wr.status !== 'not_started' && wr.status !== 'draft' && wr.status !== 'rejected') {
      return res.status(409).json({ success: false, error: { code: 'STATUS_CONFLICT', message: '目前狀態不允許提交' } });
    }
    
    // 驗證必填欄位
    if (!routineItems || routineItems.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '至少需要填寫一項例行工作' } });
    }
    if (!weeklySummary || weeklySummary.trim() === '') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '本周工作總結為必填' } });
    }
    
    const now = new Date().toISOString();

    // 儲存所有項目
    const totals = saveReportItems(req.tenantDB, id, { routineItems, nonRoutineItems, todoItems, problemItems, trainingItems, projectItems });

    // 更新主表並提交
    req.tenantDB.prepare(`
      UPDATE weekly_reports 
      SET status = 'submitted', 
          next_week_plan = ?, 
          weekly_summary = ?, 
          routine_total_minutes = ?, 
          non_routine_total_minutes = ?,
          employee_signature = ?,
          employee_signature_date = ?,
          submit_date = ?, 
          updated_at = ?
      WHERE id = ?
    `).run(
      nextWeekPlan || wr.next_week_plan, 
      weeklySummary, 
      totals.routineTotalMinutes, 
      totals.nonRoutineTotalMinutes,
      employeeSignature || null,
      employeeSignature ? now : null,
      now, 
      now, 
      id
    );
    
    res.json({ success: true, data: { id, status: 'submitted' } });
  } catch (error) {
    console.error('Error submitting weekly report:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/weekly-reports/:id/review
 * 主管審核週報 (含簽章)
 */
router.patch('/:id/review', (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment, managerSignature } = req.body;
    
    const wr = req.tenantDB.prepare(`SELECT * FROM weekly_reports WHERE id = ?`).get(id);
    if (!wr) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '找不到此週報' } });
    }
    if (wr.status !== 'submitted') {
      return res.status(409).json({ success: false, error: { code: 'STATUS_CONFLICT', message: '目前狀態不允許審核' } });
    }
    
    const now = new Date().toISOString();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    req.tenantDB.prepare(`
      UPDATE weekly_reports 
      SET status = ?, 
          review_date = ?, 
          reviewer_comment = ?,
          manager_signature = ?,
          manager_signature_date = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      newStatus, 
      now, 
      comment || null,
      action === 'approve' ? (managerSignature || null) : null,
      action === 'approve' && managerSignature ? now : null,
      now, 
      id
    );
    
    res.json({ success: true, data: { id, status: newStatus } });
  } catch (error) {
    console.error('Error reviewing weekly report:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

module.exports = router;
