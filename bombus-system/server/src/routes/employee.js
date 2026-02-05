/**
 * Employee API Routes (員工入職文件)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db');

// 確保上傳目錄存在
const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 Multer 儲存
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'doc-' + uniqueSuffix + ext);
    }
});

// 檔案過濾器 - 允許圖片和 PDF
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('只允許上傳圖片或 PDF 檔案'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB 限制
    },
    fileFilter: fileFilter
});

// 文件類型標籤對應
const TYPE_LABELS = {
    'id_card': '身分證件',
    'bank_account': '銀行帳戶',
    'health_report': '體檢報告',
    'photo': '大頭照',
    'education_cert': '學經歷證明',
    'other': '其他文件'
};

/**
 * GET /api/employee/templates
 * 取得員工可見的公開模版列表 (is_public = 1 且 is_active = 1)
 */
router.get('/templates', (req, res) => {
    try {
        const templates = prepare(`
            SELECT id, name, version, is_required, description, created_at
            FROM templates
            WHERE is_public = 1 AND is_active = 1
            ORDER BY is_required DESC, created_at DESC
        `).all();

        res.json(templates);
    } catch (error) {
        console.error('Error fetching employee templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * GET /api/employee/submissions
 * 取得當前員工的提交記錄 (需要 employee_id 參數)
 */
router.get('/submissions', (req, res) => {
    try {
        const { employee_id } = req.query;

        let query = `
            SELECT s.*, t.name as template_name, t.is_required
            FROM submissions s
            JOIN templates t ON s.template_id = t.id
        `;
        let params = [];

        if (employee_id) {
            query += ` WHERE s.employee_id = ?`;
            params.push(employee_id);
        }

        query += ` ORDER BY s.created_at DESC`;

        const submissions = prepare(query).all(...params);

        // Parse form_data JSON
        submissions.forEach(s => {
            if (s.form_data) {
                try {
                    s.form_data = JSON.parse(s.form_data);
                } catch (e) { }
            }
        });

        res.json(submissions);
    } catch (error) {
        console.error('Error fetching employee submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

/**
 * GET /api/employee/progress
 * 取得員工入職進度摘要
 */
router.get('/progress', (req, res) => {
    try {
        const { employee_id } = req.query;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        // 1. 取得所有必填的公開模版
        const requiredTemplates = prepare(`
            SELECT id, name, version
            FROM templates
            WHERE is_public = 1 AND is_active = 1 AND is_required = 1
        `).all();

        // 2. 取得該員工所有的提交記錄（包括待簽署、已簽署、已完成）
        // 為每個模板取得最新的記錄
        const allSubmissions = prepare(`
            SELECT template_id, status, approval_status, token
            FROM submissions
            WHERE employee_id = ?
            ORDER BY created_at DESC
        `).all(employee_id);

        // 建立 map，每個模板只保留最新的記錄
        const submissionMap = new Map();
        allSubmissions.forEach(s => {
            if (!submissionMap.has(s.template_id)) {
                submissionMap.set(s.template_id, s);
            }
        });

        // 3. 計算進度
        const total = requiredTemplates.length;
        let completed = 0;
        let approved = 0;
        let pending = 0;
        let rejected = 0;
        let notStarted = 0;

        const progress = requiredTemplates.map(t => {
            const submission = submissionMap.get(t.id);
            let status = 'NOT_STARTED';

            if (submission) {
                if (submission.approval_status === 'APPROVED') {
                    status = 'APPROVED';
                    completed++;
                    approved++;
                } else if (submission.approval_status === 'REJECTED') {
                    status = 'REJECTED';
                    rejected++;
                } else if (submission.status === 'SIGNED' || submission.status === 'COMPLETED') {
                    status = 'PENDING_APPROVAL';
                    pending++;
                } else if (submission.status === 'DRAFT' || submission.status === 'PENDING_APPROVAL') {
                    // 待簽署狀態
                    status = 'DRAFT';
                    notStarted++;
                }
            } else {
                notStarted++;
            }

            return {
                template_id: t.id,
                template_name: t.name,
                status,
                token: submission ? submission.token : null
            };
        });

        res.json({
            total,
            completed: approved,
            pending_approval: pending,
            rejected,
            not_started: total - approved - pending - rejected,
            progress_percentage: total > 0 ? Math.round((approved / total) * 100) : 0,
            items: progress
        });
    } catch (error) {
        console.error('Error fetching employee progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});


/**
 * GET /api/employee/list
 * 取得所有員工列表 (用於會議出席人員選擇)
 * Query params:
 *   - dept: 依部門過濾
 *   - status: 依狀態過濾 (active, probation, resigned)
 *   - all: 設為 true 時包含非在職員工
 */
router.get('/list', (req, res) => {
    try {
        const { dept, status, all } = req.query;

        let query = `
            SELECT id, employee_no, name, email, phone, department, position,
                   level, grade, manager_id, hire_date, contract_type,
                   work_location, avatar, status
            FROM employees
            WHERE 1=1
        `;
        let params = [];

        // 預設只顯示在職員工
        if (all !== 'true') {
            query += ` AND status IN ('active', 'probation')`;
        }

        if (dept) {
            query += ` AND department = ?`;
            params.push(dept);
        }

        if (status) {
            query += ` AND status = ?`;
            params.push(status);
        }

        query += ` ORDER BY department, name`;

        const employees = prepare(query).all(...params);

        // 取得主管名稱
        const managerIds = employees.map(e => e.manager_id).filter(Boolean);
        const managersMap = new Map();
        if (managerIds.length > 0) {
            const managers = prepare(`
                SELECT id, name FROM employees WHERE id IN (${managerIds.map(() => '?').join(',')})
            `).all(...managerIds);
            managers.forEach(m => managersMap.set(m.id, m.name));
        }

        // 組合資料
        const result = employees.map(emp => ({
            ...emp,
            managerName: managersMap.get(emp.manager_id) || null
        }));

        res.json(result);
    } catch (error) {
        console.error('Error fetching employee list:', error);
        res.status(500).json({ error: 'Failed to fetch employee list' });
    }
});

/**
 * GET /api/employee/departments
 * 取得所有部門清單
 */
router.get('/departments', (req, res) => {
    try {
        const departments = prepare(`
            SELECT DISTINCT department
            FROM employees
            WHERE department IS NOT NULL
            ORDER BY department
        `).all();
        res.json(departments.map(d => d.department));
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// ==================== 員工入職資料上傳 API ====================
// 注意：這些路由必須定義在 /:id 路由之前，否則會被誤解析

/**
 * GET /api/employee/documents
 * 取得員工已上傳的文件列表
 */
router.get('/documents', (req, res) => {
    try {
        const { employee_id } = req.query;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        const documents = prepare(`
            SELECT id, employee_id, type, label, custom_name as customName,
                   file_name as fileName, file_url as fileUrl, file_size as fileSize,
                   mime_type as mimeType, status, reject_reason as rejectReason,
                   uploaded_at as uploadedAt, created_at, updated_at
            FROM employee_documents
            WHERE employee_id = ?
            ORDER BY created_at DESC
        `).all(employee_id);

        res.json(documents);
    } catch (error) {
        console.error('Error fetching employee documents:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

/**
 * GET /api/employee/documents/progress
 * 取得員工文件上傳進度
 */
router.get('/documents/progress', (req, res) => {
    try {
        const { employee_id } = req.query;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        // 固定文件類型（不含 other）
        const fixedTypes = ['id_card', 'bank_account', 'health_report', 'photo', 'education_cert'];
        const total = fixedTypes.length;

        // 取得已上傳的固定類型文件
        const uploadedDocs = prepare(`
            SELECT type, status
            FROM employee_documents
            WHERE employee_id = ? AND type != 'other'
        `).all(employee_id);

        let uploaded = 0;
        let approved = 0;
        let rejected = 0;

        uploadedDocs.forEach(doc => {
            uploaded++;
            if (doc.status === 'approved') approved++;
            if (doc.status === 'rejected') rejected++;
        });

        res.json({
            total,
            uploaded,
            pending: uploaded - approved - rejected,
            approved,
            rejected,
            percentage: total > 0 ? Math.round((uploaded / total) * 100) : 0
        });
    } catch (error) {
        console.error('Error fetching document progress:', error);
        res.status(500).json({ error: 'Failed to fetch progress' });
    }
});

/**
 * POST /api/employee/documents
 * 上傳員工入職文件
 */
router.post('/documents', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { employee_id, type, custom_name } = req.body;

        if (!employee_id || !type) {
            return res.status(400).json({ error: 'employee_id and type are required' });
        }

        const id = uuidv4();
        const label = TYPE_LABELS[type] || '其他文件';
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        
        // 正確處理中文檔名：如果 originalname 是 Buffer，先轉成 latin1 再轉 utf8
        let fileName = req.file.originalname;
        if (typeof fileName === 'string') {
            try {
                // 嘗試修復可能的編碼問題
                fileName = Buffer.from(fileName, 'latin1').toString('utf8');
            } catch (e) {
                // 如果轉換失敗，保持原樣
                console.warn('Filename encoding conversion failed:', e);
            }
        }

        // 如果不是 'other' 類型，檢查是否已存在，若存在則更新
        if (type !== 'other') {
            const existing = prepare(`
                SELECT id FROM employee_documents
                WHERE employee_id = ? AND type = ?
            `).get(employee_id, type);

            if (existing) {
                // 更新現有記錄
                prepare(`
                    UPDATE employee_documents
                    SET file_name = ?, file_url = ?, file_size = ?, mime_type = ?,
                        status = 'uploaded', reject_reason = NULL, uploaded_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `).run(
                    fileName,
                    fileUrl,
                    req.file.size,
                    req.file.mimetype,
                    existing.id
                );

                const updatedDoc = prepare(`
                    SELECT id, employee_id, type, label, custom_name as customName,
                           file_name as fileName, file_url as fileUrl, file_size as fileSize,
                           mime_type as mimeType, status, reject_reason as rejectReason,
                           uploaded_at as uploadedAt, created_at, updated_at
                    FROM employee_documents WHERE id = ?
                `).get(existing.id);

                return res.json(updatedDoc);
            }
        }

        // 新增記錄
        prepare(`
            INSERT INTO employee_documents (id, employee_id, type, label, custom_name, file_name, file_url, file_size, mime_type, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')
        `).run(
            id,
            employee_id,
            type,
            label,
            custom_name || null,
            fileName,
            fileUrl,
            req.file.size,
            req.file.mimetype
        );

        const newDoc = prepare(`
            SELECT id, employee_id, type, label, custom_name as customName,
                   file_name as fileName, file_url as fileUrl, file_size as fileSize,
                   mime_type as mimeType, status, reject_reason as rejectReason,
                   uploaded_at as uploadedAt, created_at, updated_at
            FROM employee_documents WHERE id = ?
        `).get(id);

        res.status(201).json(newDoc);
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

/**
 * PUT /api/employee/documents/:id
 * 重新上傳文件（覆蓋原有檔案）
 */
router.put('/documents/:id', upload.single('file'), (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 檢查文件是否存在
        const existing = prepare(`
            SELECT * FROM employee_documents WHERE id = ?
        `).get(id);

        if (!existing) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const fileUrl = `/uploads/documents/${req.file.filename}`;
        
        // 正確處理中文檔名
        let fileName = req.file.originalname;
        if (typeof fileName === 'string') {
            try {
                fileName = Buffer.from(fileName, 'latin1').toString('utf8');
            } catch (e) {
                console.warn('Filename encoding conversion failed:', e);
            }
        }

        // 更新記錄
        prepare(`
            UPDATE employee_documents
            SET file_name = ?, file_url = ?, file_size = ?, mime_type = ?,
                status = 'uploaded', reject_reason = NULL, uploaded_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(
            fileName,
            fileUrl,
            req.file.size,
            req.file.mimetype,
            id
        );

        const updatedDoc = prepare(`
            SELECT id, employee_id, type, label, custom_name as customName,
                   file_name as fileName, file_url as fileUrl, file_size as fileSize,
                   mime_type as mimeType, status, reject_reason as rejectReason,
                   uploaded_at as uploadedAt, created_at, updated_at
            FROM employee_documents WHERE id = ?
        `).get(id);

        res.json(updatedDoc);
    } catch (error) {
        console.error('Error reuploading document:', error);
        res.status(500).json({ error: 'Failed to reupload document' });
    }
});

/**
 * DELETE /api/employee/documents/:id
 * 刪除員工上傳的文件
 */
router.delete('/documents/:id', (req, res) => {
    try {
        const { id } = req.params;

        // 檢查文件是否存在
        const existing = prepare(`
            SELECT * FROM employee_documents WHERE id = ?
        `).get(id);

        if (!existing) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // 刪除檔案（可選）
        if (existing.file_url) {
            const filePath = path.join(__dirname, '../..', existing.file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // 刪除資料庫記錄
        prepare(`DELETE FROM employee_documents WHERE id = ?`).run(id);

        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        console.error('Error deleting document:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

/**
 * GET /api/employee/documents/:id/download
 * 下載員工上傳的文件
 */
router.get('/documents/:id/download', (req, res) => {
    try {
        const { id } = req.params;

        const doc = prepare(`
            SELECT file_name, file_url FROM employee_documents WHERE id = ?
        `).get(id);

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const filePath = path.join(__dirname, '../..', doc.file_url);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(filePath, doc.file_name);
    } catch (error) {
        console.error('Error downloading document:', error);
        res.status(500).json({ error: 'Failed to download document' });
    }
});

// ==================== 員工詳情 API ====================

/**
 * GET /api/employee/:id
 * 取得單一員工完整資料 (含學歷、技能、證照)
 */
// GET /api/employee/stats - 員工統計
router.get('/stats', (req, res) => {
    try {
        // 員工總數
        const totalEmployees = prepare(`
            SELECT COUNT(*) as count FROM employees
        `).get().count;

        // 在職人數
        const activeCount = prepare(`
            SELECT COUNT(*) as count FROM employees WHERE status = 'active'
        `).get().count;

        // 試用期人數
        const probationCount = prepare(`
            SELECT COUNT(*) as count FROM employees WHERE status = 'probation'
        `).get().count;

        // 平均年資（月）
        const avgTenureResult = prepare(`
            SELECT AVG(
                (julianday('now') - julianday(hire_date)) / 30.44
            ) as avgMonths
            FROM employees
            WHERE hire_date IS NOT NULL AND status IN ('active', 'probation')
        `).get();
        const avgTenure = avgTenureResult.avgMonths ? Math.round(avgTenureResult.avgMonths) : 0;

        // 30天內到期文件數（從 employee_documents 表或 employee_certifications 表）
        // 這裡先查證照到期數
        const expiringDocuments = prepare(`
            SELECT COUNT(*) as count
            FROM employee_certifications
            WHERE expiry_date IS NOT NULL
            AND date(expiry_date) BETWEEN date('now') AND date('now', '+30 days')
        `).get().count;

        // 即將到職週年的員工（30天內）
        const upcomingAnniversaries = prepare(`
            SELECT 
                id as employeeId,
                name,
                hire_date as date,
                CAST((julianday('now') - julianday(hire_date)) / 365.25 AS INTEGER) + 1 as years
            FROM employees
            WHERE hire_date IS NOT NULL
            AND (
                (strftime('%m-%d', hire_date) BETWEEN strftime('%m-%d', 'now') AND strftime('%m-%d', 'now', '+30 days'))
                OR 
                (strftime('%m-%d', 'now') > strftime('%m-%d', 'now', '+30 days') 
                 AND (strftime('%m-%d', hire_date) >= strftime('%m-%d', 'now') 
                      OR strftime('%m-%d', hire_date) <= strftime('%m-%d', 'now', '+30 days')))
            )
            AND status IN ('active', 'probation')
            ORDER BY strftime('%m-%d', hire_date)
        `).all();

        res.json({
            totalEmployees,
            activeCount,
            probationCount,
            avgTenure,
            expiringDocuments,
            upcomingAnniversaries
        });
    } catch (error) {
        console.error('Error fetching employee stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/employee/expiring-documents - 30天內到期文件列表
router.get('/expiring-documents', (req, res) => {
    try {
        const expiringCerts = prepare(`
            SELECT 
                ec.id,
                ec.employee_id as employeeId,
                e.name as employeeName,
                'certification' as documentType,
                ec.cert_name as documentName,
                ec.expiry_date as expiryDate,
                CAST((julianday(ec.expiry_date) - julianday('now')) AS INTEGER) as daysUntilExpiry
            FROM employee_certifications ec
            JOIN employees e ON ec.employee_id = e.id
            WHERE ec.expiry_date IS NOT NULL
            AND date(ec.expiry_date) BETWEEN date('now') AND date('now', '+30 days')
            ORDER BY ec.expiry_date ASC
        `).all();

        res.json(expiringCerts);
    } catch (error) {
        console.error('Error fetching expiring documents:', error);
        res.status(500).json({ error: 'Failed to fetch expiring documents' });
    }
});

// GET /api/employee/department-roi - 部門 ROI 概覽（暫時回傳 mock）
router.get('/department-roi', (req, res) => {
    try {
        // Mock 資料，未來功能
        const mockData = [
            { department: '研發部', roi: 150, trend: 'up' },
            { department: '業務部', roi: 180, trend: 'up' },
            { department: '人資部', roi: 120, trend: 'stable' },
            { department: '財務部', roi: 135, trend: 'down' }
        ];

        res.json(mockData);
    } catch (error) {
        console.error('Error fetching department ROI:', error);
        res.status(500).json({ error: 'Failed to fetch department ROI' });
    }
});

// GET /api/employee/:id/audit-logs - 員工操作記錄（暫時回傳空陣列）
router.get('/:id/audit-logs', (req, res) => {
    try {
        // 未來功能，暫時回傳空陣列
        res.json([]);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        // 取得員工主資料
        const employee = prepare(`
            SELECT * FROM employees WHERE id = ?
        `).get(id);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // 取得主管名稱
        if (employee.manager_id) {
            const manager = prepare(`
                SELECT name FROM employees WHERE id = ?
            `).get(employee.manager_id);
            employee.managerName = manager ? manager.name : null;
        }

        // 取得學歷
        const education = prepare(`
            SELECT id, degree, school, major, graduation_year
            FROM employee_education
            WHERE employee_id = ?
            ORDER BY graduation_year DESC
        `).all(id);

        // 取得技能
        const skills = prepare(`
            SELECT skill_name FROM employee_skills WHERE employee_id = ?
        `).all(id);

        // 取得證照
        const certifications = prepare(`
            SELECT id, cert_name, issued_date, expiry_date
            FROM employee_certifications
            WHERE employee_id = ?
            ORDER BY issued_date DESC
        `).all(id);

        // 取得職務異動記錄
        const workHistory = prepare(`
            SELECT 
                id,
                effective_date as effectiveDate,
                change_type as changeType,
                from_position as fromPosition,
                to_position as toPosition,
                from_department as fromDepartment,
                to_department as toDepartment,
                from_level as fromLevel,
                to_level as toLevel,
                salary_change as salaryChange,
                reason,
                approved_by as approvedBy,
                approved_at as approvedAt
            FROM employee_job_changes
            WHERE employee_id = ?
            ORDER BY effective_date DESC
        `).all(id);

        // 取得當前薪資（最新一筆且 end_date 為 NULL 或未來日期）
        const salaryRecord = prepare(`
            SELECT base_salary, allowances, bonus
            FROM employee_salaries
            WHERE employee_id = ?
            AND (end_date IS NULL OR end_date > date('now'))
            ORDER BY effective_date DESC
            LIMIT 1
        `).get(id);

        const salary = salaryRecord 
            ? (salaryRecord.base_salary || 0) + (salaryRecord.allowances || 0) + (salaryRecord.bonus || 0)
            : null;

        // 取得培訓記錄
        const training = prepare(`
            SELECT 
                id,
                course_name as courseName,
                course_type as courseType,
                completion_date as completionDate,
                score,
                certificate,
                hours,
                cost,
                status,
                instructor,
                notes
            FROM employee_training
            WHERE employee_id = ?
            ORDER BY completion_date DESC
        `).all(id);

        // 取得文件列表
        const documents = prepare(`
            SELECT 
                id,
                employee_id as employeeId,
                type,
                label,
                custom_name as customName,
                file_name as fileName,
                file_url as fileUrl,
                file_size as fileSize,
                mime_type as mimeType,
                status,
                reject_reason as rejectReason,
                uploaded_at as uploadedAt
            FROM employee_documents
            WHERE employee_id = ?
            ORDER BY uploaded_at DESC
        `).all(id);

        // 取得績效記錄
        const performanceRaw = prepare(`
            SELECT 
                id,
                employee_id as employeeId,
                year,
                quarter,
                review_type as reviewType,
                overall_score as overallScore,
                goals_achieved as goalsAchieved,
                goals_total as goalsTotal,
                strengths,
                improvements,
                reviewer_name as reviewerName,
                review_date as reviewDate,
                comments
            FROM employee_performance
            WHERE employee_id = ?
            ORDER BY year DESC, quarter DESC
        `).all(id);
        
        // 轉換績效資料格式為前端期望的結構
        const performance = performanceRaw.map(p => {
            // 計算等級
            let grade = 'C';
            if (p.overallScore >= 95) grade = 'A';
            else if (p.overallScore >= 85) grade = 'B';
            else if (p.overallScore >= 75) grade = 'C';
            else if (p.overallScore >= 60) grade = 'D';
            else grade = 'E';
            
            // 將 strengths 和 improvements 字串轉為陣列
            const strengthsArr = p.strengths ? p.strengths.split('，').map(s => s.trim()) : [];
            const improvementsArr = p.improvements ? p.improvements.split('，').map(i => i.trim()) : [];
            
            // 建立目標陣列
            const goals = [];
            if (p.goalsTotal > 0) {
                const achievement = Math.round((p.goalsAchieved / p.goalsTotal) * 100);
                goals.push({ name: '年度目標達成', achievement });
                // 如果有多個目標，可以細分
                if (p.goalsTotal >= 5) {
                    goals.push({ name: '專案交付', achievement: Math.min(100, achievement + 5) });
                    goals.push({ name: '團隊協作', achievement: Math.max(60, achievement - 5) });
                }
            }
            
            return {
                id: p.id,
                period: p.year + (p.quarter ? ' Q' + p.quarter : ''),
                overallScore: p.overallScore,
                grade: grade,
                goals: goals,
                strengths: strengthsArr,
                improvements: improvementsArr,
                reviewedBy: p.reviewerName || '主管',
                reviewDate: p.reviewDate
            };
        });

        // 取得 ROI 數據
        const roiRecords = prepare(`
            SELECT 
                id,
                employee_id as employeeId,
                year,
                month,
                revenue_generated as revenueGenerated,
                cost_saved as costSaved,
                projects_completed as projectsCompleted,
                training_cost as trainingCost,
                salary_cost as salaryCost,
                calculated_roi as calculatedRoi,
                notes
            FROM employee_roi
            WHERE employee_id = ?
            ORDER BY year DESC
        `).all(id);

        // 計算 ROI 總覽數據
        let roi = {
            employeeId: id,
            period: '2024',
            salaryCost: 0,
            trainingCost: 0,
            benefitsCost: 0,
            totalCost: 0,
            revenue: 0,
            projectValue: 0,
            productivity: 100,
            roi: 0,
            trend: 'stable',
            comparison: {
                departmentAvg: 150,
                companyAvg: 140
            },
            records: []
        };
        
        if (roiRecords.length > 0) {
            const latestYear = roiRecords[0];
            const totalSalaryCost = roiRecords.reduce((sum, r) => sum + (r.salaryCost || 0), 0);
            const totalTrainingCost = roiRecords.reduce((sum, r) => sum + (r.trainingCost || 0), 0);
            const totalRevenue = roiRecords.reduce((sum, r) => sum + (r.revenueGenerated || 0), 0);
            const totalCostSaved = roiRecords.reduce((sum, r) => sum + (r.costSaved || 0), 0);
            
            const totalCost = totalSalaryCost + totalTrainingCost;
            const totalValue = totalRevenue + totalCostSaved;
            const calculatedRoi = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0;
            
            // 計算趨勢 (比較最近兩年)
            let trend = 'stable';
            if (roiRecords.length >= 2) {
                const diff = (latestYear.calculatedRoi || 0) - (roiRecords[1].calculatedRoi || 0);
                if (diff > 5) trend = 'up';
                else if (diff < -5) trend = 'down';
            }
            
            roi = {
                employeeId: id,
                period: latestYear.year?.toString() || '2024',
                salaryCost: latestYear.salaryCost || 0,
                trainingCost: latestYear.trainingCost || 0,
                benefitsCost: 0,
                totalCost: (latestYear.salaryCost || 0) + (latestYear.trainingCost || 0),
                revenue: latestYear.revenueGenerated || 0,
                projectValue: (latestYear.revenueGenerated || 0) + (latestYear.costSaved || 0),
                productivity: latestYear.calculatedRoi ? Math.round((latestYear.calculatedRoi / 100 + 1) * 100) : 100,
                roi: latestYear.calculatedRoi || parseFloat(calculatedRoi.toFixed(2)),
                trend: trend,
                comparison: {
                    departmentAvg: 150,
                    companyAvg: 140
                },
                records: roiRecords
            };
        }

        // 取得候選人追溯資訊（如果有 candidate_id）
        let candidateSource = null;
        if (employee.candidate_id) {
            const candidate = prepare(`
                SELECT id, name, email, current_position, status, stage
                FROM candidates
                WHERE id = ?
            `).get(employee.candidate_id);
            
            if (candidate) {
                candidateSource = {
                    candidate_id: candidate.id,
                    name: candidate.name,
                    email: candidate.email,
                    position: candidate.current_position,
                    status: candidate.status,
                    stage: candidate.stage
                };
            }
        }

        // 取得入職進度（如果是試用期員工且有 onboarding_status）
        let onboardingProgress = null;
        if (employee.onboarding_status && employee.status === 'probation') {
            // 模板簽署進度
            const templateProgress = prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'SIGNED' OR status = 'COMPLETED' THEN 1 ELSE 0 END) as signed,
                    SUM(CASE WHEN approval_status = 'APPROVED' THEN 1 ELSE 0 END) as approved
                FROM submissions
                WHERE employee_id = ?
            `).get(id);

            // 文件上傳進度
            const docProgress = prepare(`
                SELECT COUNT(DISTINCT type) as uploaded
                FROM employee_documents
                WHERE employee_id = ? AND type != 'other'
            `).get(id);

            const templateTotal = templateProgress?.total || 0;
            const templateApproved = templateProgress?.approved || 0;
            const docTotal = 5; // 固定5種必填文件
            const docUploaded = docProgress?.uploaded || 0;

            const totalItems = templateTotal + docTotal;
            const completedItems = templateApproved + docUploaded;
            const overall = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

            onboardingProgress = {
                overall,
                templates: {
                    total: templateTotal,
                    signed: templateProgress?.signed || 0,
                    approved: templateApproved
                },
                documents: {
                    total: docTotal,
                    uploaded: docUploaded
                },
                probation_end_date: employee.probation_end_date,
                probation_months: employee.probation_months
            };
        }

        res.json({
            ...employee,
            education,
            skills: skills.map(s => s.skill_name),
            certifications,
            workHistory,
            salary,
            training,
            documents,
            performance,
            roi,
            candidateSource,
            onboardingProgress
        });
    } catch (error) {
        console.error('Error fetching employee detail:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

module.exports = router;
