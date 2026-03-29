/**
 * Batch Import API Routes (批次匯入)
 *
 * POST   /api/employee/batch-import/validate      — CSV 驗證
 * POST   /api/employee/batch-import/execute        — 批次匯入執行
 * GET    /api/employee/batch-import/:jobId/status  — 匯入進度
 * GET    /api/employee/batch-import/:jobId/report  — 匯入結果報告
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { createEmployeeWithAccount } = require('../services/account-creation');

// Email 格式驗證（簡化版 RFC 5322）
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 日期格式：YYYY-MM-DD 或 YYYY/MM/DD
const DATE_REGEX = /^\d{4}[-/]\d{2}[-/]\d{2}$/;

// CSV 中英文欄位名對應
const FIELD_MAP = {
  '姓名': 'name', 'name': 'name',
  'Email': 'email', 'email': 'email',
  '工號': 'employee_no', 'employee_no': 'employee_no',
  '英文名': 'english_name', 'english_name': 'english_name',
  '電話': 'phone', 'phone': 'phone',
  '手機': 'mobile', 'mobile': 'mobile',
  '性別': 'gender', 'gender': 'gender',
  '生日': 'birth_date', 'birth_date': 'birth_date',
  '子公司': 'subsidiary', 'subsidiary': 'subsidiary',
  '部門': 'department', 'department': 'department',
  '職稱': 'position', 'position': 'position',
  '職等': 'level', 'level': 'level',
  '職級': 'grade', 'grade': 'grade',
  '到職日期': 'hire_date', 'hire_date': 'hire_date',
  '合約類型': 'contract_type', 'contract_type': 'contract_type',
  '工作地點': 'work_location', 'work_location': 'work_location',
  '主管工號': 'manager_no', 'manager_no': 'manager_no'
};

const REQUIRED_FIELDS = ['name', 'email', 'employee_no', 'subsidiary', 'department', 'hire_date', 'level', 'grade', 'position'];

/**
 * 驗證單筆資料
 */
function validateRow(row, rowIndex, allRows, db) {
  const errors = [];
  const warnings = [];

  // 必填欄位檢查
  for (const field of REQUIRED_FIELDS) {
    if (!row[field] || !String(row[field]).trim()) {
      const fieldNames = { name: '姓名', email: 'Email', employee_no: '工號', subsidiary: '子公司', department: '部門', hire_date: '到職日期', level: '職等', grade: '職級', position: '職稱' };
      errors.push(`必填欄位「${fieldNames[field] || field}」缺失`);
    }
  }

  if (errors.length > 0) {
    return { errors, warnings }; // 必填不過就不繼續驗證格式
  }

  // Email 格式
  if (!EMAIL_REGEX.test(row.email)) {
    errors.push('Email 格式不正確');
  }

  // Email 重複（CSV 內部）
  const dupEmailIdx = allRows.findIndex((r, i) => i < rowIndex && r.email === row.email);
  if (dupEmailIdx >= 0) {
    errors.push(`Email 在匯入檔案中重複（第 ${dupEmailIdx + 1} 行）`);
  }

  // Email 重複（DB）
  if (row.email) {
    const existingEmp = db.prepare('SELECT id FROM employees WHERE email = ?').get(row.email);
    if (existingEmp) errors.push('Email 已存在於系統中');
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(row.email);
    if (existingUser) errors.push('Email 已存在於系統中');
  }

  // 工號重複（CSV 內部）
  const dupNoIdx = allRows.findIndex((r, i) => i < rowIndex && r.employee_no === row.employee_no);
  if (dupNoIdx >= 0) {
    errors.push(`工號在匯入檔案中重複（第 ${dupNoIdx + 1} 行）`);
  }

  // 工號重複（DB）
  if (row.employee_no) {
    const existingNo = db.prepare('SELECT id FROM employees WHERE employee_no = ?').get(row.employee_no);
    if (existingNo) errors.push('工號已存在於系統中');
  }

  // 子公司驗證
  if (row.subsidiary) {
    const sub = db.prepare(
      "SELECT id, name FROM org_units WHERE (name = ? OR code = ?) AND type = 'subsidiary'"
    ).get(row.subsidiary, row.subsidiary);
    if (!sub) {
      errors.push(`子公司「${row.subsidiary}」不存在於組織架構中`);
    } else {
      row._org_unit_id = sub.id;

      // 部門驗證（在子公司下）
      if (row.department) {
        const dept = db.prepare(
          "SELECT id, name FROM org_units WHERE name = ? AND type = 'department' AND parent_id = ?"
        ).get(row.department, sub.id);
        if (!dept) {
          errors.push(`部門「${row.department}」不存在於子公司「${row.subsidiary}」下`);
        }
      }
    }
  }

  // 日期格式
  if (row.hire_date && !DATE_REGEX.test(row.hire_date)) {
    errors.push('到職日期格式不正確，請使用 YYYY-MM-DD 或 YYYY/MM/DD');
  }

  // 主管（非阻塞）
  if (row.manager_no) {
    const mgr = db.prepare('SELECT id FROM employees WHERE employee_no = ?').get(row.manager_no);
    if (!mgr) {
      const mgrInCsv = allRows.find((r, i) => i < rowIndex && r.employee_no === row.manager_no);
      if (!mgrInCsv) {
        warnings.push(`主管「${row.manager_no}」目前不存在，將在匯入後手動補填`);
      }
    }
  }

  return { errors, warnings };
}

// ═══════════════════════════════════════════════════════════════
// 5.1 POST /validate — CSV 驗證
// ═══════════════════════════════════════════════════════════════

router.post('/validate', (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: '匯入檔案無資料' });
    }

    const results = rows.map((row, idx) => {
      const { errors, warnings } = validateRow(row, idx, rows, req.tenantDB);
      return {
        row: idx + 1,
        status: errors.length > 0 ? 'error' : 'valid',
        data: row,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    });

    const errorRows = results.filter(r => r.status === 'error').length;
    const validRows = results.filter(r => r.status === 'valid').length;

    res.json({
      totalRows: rows.length,
      validRows,
      errorRows,
      rows: results
    });
  } catch (error) {
    console.error('Error validating batch import:', error);
    res.status(500).json({ error: 'Failed to validate import data' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5.2 POST /execute — 批次匯入執行
// ═══════════════════════════════════════════════════════════════

// 記憶體中的進行中任務（sql.js 無持久化問題）
const activeJobs = new Map();

router.post('/execute', async (req, res) => {
  try {
    const { rows, fileName } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: '匯入資料為空' });
    }

    // 檢查是否有錯誤行
    const hasErrors = rows.some(row => {
      const { errors } = validateRow(row, 0, [], req.tenantDB);
      return errors.length > 0;
    });
    // 注意：這裡不阻擋，因為前端應該已經確認過 validation

    const jobId = uuidv4();
    const userId = req.user?.id || null;
    const now = new Date().toISOString();

    // 建立 import_jobs 記錄
    req.tenantDB.run(
      `INSERT INTO import_jobs (id, status, total_rows, file_name, created_by, created_at)
       VALUES (?, 'processing', ?, ?, ?, ?)`,
      [jobId, rows.length, fileName || 'upload.csv', userId, now]
    );

    // 立即回傳 jobId
    res.status(200).json({ jobId });

    // 背景處理（使用 setImmediate 避免阻塞）
    const tenantDB = req.tenantDB;
    const processRows = async () => {
      let processedRows = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          // 解析 org_unit_id
          let orgUnitId = row._org_unit_id || null;
          if (!orgUnitId && row.subsidiary) {
            const sub = tenantDB.prepare(
              "SELECT id FROM org_units WHERE (name = ? OR code = ?) AND type = 'subsidiary'"
            ).get(row.subsidiary, row.subsidiary);
            if (sub) orgUnitId = sub.id;
          }

          // 日期格式統一
          const hireDate = row.hire_date ? row.hire_date.replace(/\//g, '-') : null;

          const result = await createEmployeeWithAccount(tenantDB, {
            employeeData: {
              name: row.name,
              email: row.email,
              employee_no: row.employee_no,
              department: row.department,
              position: row.position,
              level: row.level,
              grade: row.grade,
              hire_date: hireDate,
              contract_type: row.contract_type || 'full-time',
              work_location: row.work_location || null,
              org_unit_id: orgUnitId,
              english_name: row.english_name || null,
              mobile: row.mobile || null,
              gender: row.gender || 'other',
              phone: row.phone || null,
              import_job_id: jobId
            },
            createUser: true,
            defaultRole: 'employee',
            orgUnitId
          });

          successCount++;

          // 記錄結果
          tenantDB.run(
            `INSERT INTO import_results (id, job_id, row_number, status, employee_id, user_id, initial_password, created_at)
             VALUES (?, ?, ?, 'success', ?, ?, ?, ?)`,
            [uuidv4(), jobId, processedRows + 1, result.employee.id, result.user?.id || null, result.initialPassword || null, now]
          );
        } catch (err) {
          errorCount++;
          tenantDB.run(
            `INSERT INTO import_results (id, job_id, row_number, status, error_message, created_at)
             VALUES (?, ?, ?, 'error', ?, ?)`,
            [uuidv4(), jobId, processedRows + 1, err.message, now]
          );
        }

        processedRows++;

        // 更新進度
        tenantDB.run(
          'UPDATE import_jobs SET processed_rows = ?, success_count = ?, error_count = ? WHERE id = ?',
          [processedRows, successCount, errorCount, jobId]
        );

        // 讓出 event loop
        await new Promise(resolve => setImmediate(resolve));
      }

      // 完成
      const completedAt = new Date().toISOString();
      tenantDB.run(
        "UPDATE import_jobs SET status = 'completed', completed_at = ? WHERE id = ?",
        [completedAt, jobId]
      );

      // 寫入 audit_log
      try {
        tenantDB.run(
          `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, details, created_at)
           VALUES (?, ?, 'batch_import_completed', 'import_job', ?, ?, ?)`,
          [uuidv4(), userId, jobId, JSON.stringify({ totalRows: rows.length, successCount, errorCount, fileName: fileName || 'upload.csv' }), completedAt]
        );
      } catch (e) { /* audit_logs 可能不存在 */ }
    };

    processRows().catch(err => {
      console.error('Batch import processing error:', err);
      tenantDB.run(
        "UPDATE import_jobs SET status = 'failed', completed_at = ? WHERE id = ?",
        [new Date().toISOString(), jobId]
      );
    });
  } catch (error) {
    console.error('Error starting batch import:', error);
    res.status(500).json({ error: 'Failed to start batch import' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5.3 GET /:jobId/status — 匯入進度
// ═══════════════════════════════════════════════════════════════

router.get('/:jobId/status', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = req.tenantDB.prepare(
      'SELECT id, status, total_rows, processed_rows, success_count, error_count, completed_at FROM import_jobs WHERE id = ?'
    ).get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    res.json({
      jobId: job.id,
      status: job.status,
      totalRows: job.total_rows,
      processedRows: job.processed_rows,
      successCount: job.success_count,
      errorCount: job.error_count,
      completedAt: job.completed_at
    });
  } catch (error) {
    console.error('Error fetching import status:', error);
    res.status(500).json({ error: 'Failed to fetch import status' });
  }
});

// ═══════════════════════════════════════════════════════════════
// 5.4 GET /:jobId/report — 匯入結果報告
// ═══════════════════════════════════════════════════════════════

router.get('/:jobId/report', (req, res) => {
  try {
    const { jobId } = req.params;

    const job = req.tenantDB.prepare('SELECT id FROM import_jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Import job not found' });
    }

    const results = req.tenantDB.prepare(`
      SELECT
        ir.row_number as rowNumber,
        ir.status,
        ir.employee_id as employeeId,
        ir.initial_password as initialPassword,
        ir.error_message as errorMessage,
        e.name as employeeName,
        e.email,
        e.employee_no as employeeNo
      FROM import_results ir
      LEFT JOIN employees e ON ir.employee_id = e.id
      WHERE ir.job_id = ?
      ORDER BY ir.row_number
    `).all(jobId);

    res.json(results);
  } catch (error) {
    console.error('Error fetching import report:', error);
    res.status(500).json({ error: 'Failed to fetch import report' });
  }
});

module.exports = router;
