/**
 * Excel 匯出 API Routes
 * 使用 ExcelJS 產生 .xlsx 檔案
 */

const express = require('express');
const router = express.Router();
const { prepare } = require('../db');

// 嘗試載入 ExcelJS (若未安裝則提示)
let ExcelJS;
try {
  ExcelJS = require('exceljs');
} catch (e) {
  console.warn('⚠️ ExcelJS 未安裝，請執行: npm install exceljs');
}

/**
 * GET /api/export/monthly-checks
 * 匯出月度檢核報表
 */
router.get('/monthly-checks', async (req, res) => {
  if (!ExcelJS) {
    return res.status(500).json({ success: false, error: { code: 'DEPENDENCY_MISSING', message: '請先安裝 exceljs' } });
  }

  try {
    const { year, month, departmentId } = req.query;
    
    let sql = `
      SELECT 
        mc.id, mc.year, mc.month, mc.status, mc.total_score,
        mc.self_assessment_date, mc.manager_review_date, mc.hr_review_date,
        mc.manager_comment,
        e.employee_no, e.name as employee_name, e.department, e.position,
        m.name as manager_name
      FROM monthly_checks mc
      LEFT JOIN employees e ON mc.employee_id = e.id
      LEFT JOIN employees m ON mc.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];
    
    if (year) {
      sql += ` AND mc.year = ?`;
      params.push(parseInt(year));
    }
    if (month) {
      sql += ` AND mc.month = ?`;
      params.push(parseInt(month));
    }
    if (departmentId) {
      sql += ` AND e.department = ?`;
      params.push(departmentId);
    }
    
    sql += ` ORDER BY e.department, e.name`;
    
    const stmt = prepare(sql);
    stmt.bind(params);
    
    const records = [];
    while (stmt.step()) {
      records.push(stmt.getAsObject());
    }
    stmt.free();

    // 建立 Excel 工作簿
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bombus HR System';
    workbook.created = new Date();
    
    const worksheet = workbook.addWorksheet('月度檢核報表', {
      properties: { tabColor: { argb: 'D6A28C' } }
    });

    // 設定標題行
    worksheet.columns = [
      { header: '員工編號', key: 'employee_no', width: 12 },
      { header: '姓名', key: 'employee_name', width: 12 },
      { header: '部門', key: 'department', width: 15 },
      { header: '職位', key: 'position', width: 15 },
      { header: '年', key: 'year', width: 8 },
      { header: '月', key: 'month', width: 8 },
      { header: '狀態', key: 'status', width: 12 },
      { header: '總分', key: 'total_score', width: 10 },
      { header: '自評日期', key: 'self_assessment_date', width: 15 },
      { header: '主管審核日期', key: 'manager_review_date', width: 15 },
      { header: 'HR結案日期', key: 'hr_review_date', width: 15 },
      { header: '主管', key: 'manager_name', width: 12 },
      { header: '主管評語', key: 'manager_comment', width: 30 }
    ];

    // 標題行樣式
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D6A28C' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // 狀態對照
    const statusMap = {
      'self_assessment': '自評中',
      'manager_review': '主管審核中',
      'hr_review': 'HR審核中',
      'completed': '已完成',
      'overdue': '逾期'
    };

    // 加入資料
    records.forEach(record => {
      worksheet.addRow({
        ...record,
        status: statusMap[record.status] || record.status,
        total_score: record.total_score ? parseFloat(record.total_score).toFixed(1) : '-'
      });
    });

    // 設定邊框
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 輸出
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_checks_${year || 'all'}_${month || 'all'}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export monthly checks error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

/**
 * GET /api/export/quarterly-reviews
 * 匯出季度面談報表
 */
router.get('/quarterly-reviews', async (req, res) => {
  if (!ExcelJS) {
    return res.status(500).json({ success: false, error: { code: 'DEPENDENCY_MISSING', message: '請先安裝 exceljs' } });
  }

  try {
    const { year, quarter, departmentId } = req.query;
    
    let sql = `
      SELECT 
        qr.id, qr.year, qr.quarter, qr.status, qr.monthly_avg_score, qr.total_score,
        qr.interview_date, qr.interview_location,
        qr.manager_comment, qr.development_plan,
        e.employee_no, e.name as employee_name, e.department, e.position,
        m.name as manager_name
      FROM quarterly_reviews qr
      LEFT JOIN employees e ON qr.employee_id = e.id
      LEFT JOIN employees m ON qr.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];
    
    if (year) {
      sql += ` AND qr.year = ?`;
      params.push(parseInt(year));
    }
    if (quarter) {
      sql += ` AND qr.quarter = ?`;
      params.push(parseInt(quarter));
    }
    if (departmentId) {
      sql += ` AND e.department = ?`;
      params.push(departmentId);
    }
    
    sql += ` ORDER BY e.department, e.name`;
    
    const stmt = prepare(sql);
    stmt.bind(params);
    
    const records = [];
    while (stmt.step()) {
      records.push(stmt.getAsObject());
    }
    stmt.free();

    // 建立 Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Bombus HR System';
    
    const worksheet = workbook.addWorksheet('季度面談報表', {
      properties: { tabColor: { argb: 'D6A28C' } }
    });

    worksheet.columns = [
      { header: '員工編號', key: 'employee_no', width: 12 },
      { header: '姓名', key: 'employee_name', width: 12 },
      { header: '部門', key: 'department', width: 15 },
      { header: '職位', key: 'position', width: 15 },
      { header: '年', key: 'year', width: 8 },
      { header: '季度', key: 'quarter', width: 8 },
      { header: '狀態', key: 'status', width: 12 },
      { header: '月度均分', key: 'monthly_avg_score', width: 12 },
      { header: '總分', key: 'total_score', width: 10 },
      { header: '面談日期', key: 'interview_date', width: 15 },
      { header: '面談地點', key: 'interview_location', width: 20 },
      { header: '主管', key: 'manager_name', width: 12 },
      { header: '主管評語', key: 'manager_comment', width: 30 },
      { header: '發展建議', key: 'development_plan', width: 30 }
    ];

    // 標題樣式
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D6A28C' }
    };

    const statusMap = {
      'employee_submitted': '員工已提交',
      'manager_reviewed': '主管已評核',
      'interview_scheduled': '已預約面談',
      'interview_completed': '面談完成',
      'completed': '已結案'
    };

    records.forEach(record => {
      worksheet.addRow({
        ...record,
        quarter: `Q${record.quarter}`,
        status: statusMap[record.status] || record.status,
        monthly_avg_score: record.monthly_avg_score ? parseFloat(record.monthly_avg_score).toFixed(1) : '-',
        total_score: record.total_score ? parseFloat(record.total_score).toFixed(1) : '-'
      });
    });

    // 邊框
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=quarterly_reviews_${year || 'all'}_Q${quarter || 'all'}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export quarterly reviews error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

/**
 * GET /api/export/weekly-reports
 * 匯出週報報表
 */
router.get('/weekly-reports', async (req, res) => {
  if (!ExcelJS) {
    return res.status(500).json({ success: false, error: { code: 'DEPENDENCY_MISSING', message: '請先安裝 exceljs' } });
  }

  try {
    const { year, week, departmentId } = req.query;
    
    let sql = `
      SELECT 
        wr.id, wr.year, wr.week, wr.week_start, wr.week_end,
        wr.status, wr.submit_date, wr.review_date, wr.reviewer_comment,
        wr.next_week_plan,
        e.employee_no, e.name as employee_name, e.department, e.position,
        r.name as reviewer_name
      FROM weekly_reports wr
      LEFT JOIN employees e ON wr.employee_id = e.id
      LEFT JOIN employees r ON wr.reviewer_id = r.id
      WHERE 1=1
    `;
    const params = [];
    
    if (year) {
      sql += ` AND wr.year = ?`;
      params.push(parseInt(year));
    }
    if (week) {
      sql += ` AND wr.week = ?`;
      params.push(parseInt(week));
    }
    if (departmentId) {
      sql += ` AND e.department = ?`;
      params.push(departmentId);
    }
    
    sql += ` ORDER BY wr.year DESC, wr.week DESC, e.department, e.name`;
    
    const stmt = prepare(sql);
    stmt.bind(params);
    
    const records = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      
      // 取得週報項目
      const itemsStmt = prepare(`SELECT item_type, content FROM weekly_report_items WHERE report_id = ? ORDER BY item_type, order_num`);
      itemsStmt.bind([row.id]);
      
      const routineItems = [];
      const nonRoutineItems = [];
      
      while (itemsStmt.step()) {
        const item = itemsStmt.getAsObject();
        if (item.item_type === 'routine') {
          routineItems.push(item.content);
        } else {
          nonRoutineItems.push(item.content);
        }
      }
      itemsStmt.free();
      
      row.routine_work = routineItems.join('\n');
      row.non_routine_work = nonRoutineItems.join('\n');
      records.push(row);
    }
    stmt.free();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('週報報表', {
      properties: { tabColor: { argb: 'D6A28C' } }
    });

    worksheet.columns = [
      { header: '員工編號', key: 'employee_no', width: 12 },
      { header: '姓名', key: 'employee_name', width: 12 },
      { header: '部門', key: 'department', width: 15 },
      { header: '年', key: 'year', width: 8 },
      { header: '週', key: 'week', width: 8 },
      { header: '週期', key: 'period', width: 22 },
      { header: '狀態', key: 'status', width: 10 },
      { header: '例行性工作', key: 'routine_work', width: 40 },
      { header: '非例行性工作', key: 'non_routine_work', width: 40 },
      { header: '下週計畫', key: 'next_week_plan', width: 40 },
      { header: '審核人', key: 'reviewer_name', width: 12 },
      { header: '審核評語', key: 'reviewer_comment', width: 30 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D6A28C' }
    };

    const statusMap = {
      'draft': '草稿',
      'submitted': '已提交',
      'approved': '已通過',
      'rejected': '已退回'
    };

    records.forEach(record => {
      const row = worksheet.addRow({
        ...record,
        period: `${record.week_start} ~ ${record.week_end}`,
        status: statusMap[record.status] || record.status
      });
      row.alignment = { wrapText: true, vertical: 'top' };
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=weekly_reports_${year || 'all'}_week${week || 'all'}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export weekly reports error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

/**
 * GET /api/export/performance-summary
 * 匯出績效彙總報表 (含月度+季度)
 */
router.get('/performance-summary', async (req, res) => {
  if (!ExcelJS) {
    return res.status(500).json({ success: false, error: { code: 'DEPENDENCY_MISSING', message: '請先安裝 exceljs' } });
  }

  try {
    const { year, departmentId } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    // 取得員工績效彙總
    let sql = `
      SELECT 
        e.id, e.employee_no, e.name, e.department, e.position,
        m.name as manager_name
      FROM employees e
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE e.status = 'active'
    `;
    const params = [];
    
    if (departmentId) {
      sql += ` AND e.department = ?`;
      params.push(departmentId);
    }
    
    sql += ` ORDER BY e.department, e.name`;
    
    const stmt = prepare(sql);
    stmt.bind(params);
    
    const employees = [];
    while (stmt.step()) {
      employees.push(stmt.getAsObject());
    }
    stmt.free();

    // 取得每位員工的月度分數
    const employeeData = employees.map(emp => {
      const monthlyScores = {};
      const quarterlyScores = {};
      
      // 月度分數
      for (let m = 1; m <= 12; m++) {
        const mcResult = prepare(`
          SELECT total_score FROM monthly_checks 
          WHERE employee_id = ? AND year = ? AND month = ? AND status = 'completed'
        `).getAsObject([emp.id, targetYear, m]);
        monthlyScores[`m${m}`] = mcResult.total_score || null;
      }
      
      // 季度分數
      for (let q = 1; q <= 4; q++) {
        const qrResult = prepare(`
          SELECT total_score FROM quarterly_reviews 
          WHERE employee_id = ? AND year = ? AND quarter = ? AND status = 'completed'
        `).getAsObject([emp.id, targetYear, q]);
        quarterlyScores[`q${q}`] = qrResult.total_score || null;
      }
      
      // 計算年度平均
      const monthlyValues = Object.values(monthlyScores).filter(v => v !== null);
      const yearAvg = monthlyValues.length > 0 
        ? monthlyValues.reduce((a, b) => a + b, 0) / monthlyValues.length 
        : null;
      
      return {
        ...emp,
        ...monthlyScores,
        ...quarterlyScores,
        year_avg: yearAvg
      };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${targetYear}年績效彙總`, {
      properties: { tabColor: { argb: 'D6A28C' } }
    });

    // 建立欄位
    const columns = [
      { header: '員工編號', key: 'employee_no', width: 12 },
      { header: '姓名', key: 'name', width: 12 },
      { header: '部門', key: 'department', width: 15 },
      { header: '職位', key: 'position', width: 15 },
      { header: '主管', key: 'manager_name', width: 12 }
    ];
    
    // 月度欄位
    for (let m = 1; m <= 12; m++) {
      columns.push({ header: `${m}月`, key: `m${m}`, width: 8 });
    }
    
    // 季度欄位
    for (let q = 1; q <= 4; q++) {
      columns.push({ header: `Q${q}`, key: `q${q}`, width: 8 });
    }
    
    columns.push({ header: '年度平均', key: 'year_avg', width: 10 });
    
    worksheet.columns = columns;

    // 標題樣式
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D6A28C' }
    };

    // 加入資料
    employeeData.forEach(data => {
      const rowData = { ...data };
      // 格式化分數
      for (let m = 1; m <= 12; m++) {
        rowData[`m${m}`] = data[`m${m}`] ? parseFloat(data[`m${m}`]).toFixed(1) : '-';
      }
      for (let q = 1; q <= 4; q++) {
        rowData[`q${q}`] = data[`q${q}`] ? parseFloat(data[`q${q}`]).toFixed(1) : '-';
      }
      rowData.year_avg = data.year_avg ? parseFloat(data.year_avg).toFixed(1) : '-';
      worksheet.addRow(rowData);
    });

    // 邊框
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=performance_summary_${targetYear}.xlsx`);
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Export performance summary error:', error);
    res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
  }
});

module.exports = router;
