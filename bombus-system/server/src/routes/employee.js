/**
 * Employee API Routes (員工入職文件)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireFeaturePerm, buildScopeFilter, checkEditScope, getUserDepartmentIds } = require('../middleware/permission');
// tenantDB is accessed via req.tenantDB (injected by middleware)

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
router.get('/templates', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const templates = req.tenantDB.prepare(`
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
router.get('/submissions', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { employee_id } = req.query;

        let query = `
            SELECT s.*, t.name as template_name, t.is_required
            FROM submissions s
            JOIN templates t ON s.template_id = t.id
        `;
        let params = [];

        if (employee_id) {
            // 同時匹配 employee_id 和對應的 user_id（歷史資料可能存 user ID）
            const linkedUser = req.tenantDB.queryOne(
                'SELECT id FROM users WHERE employee_id = ?', [employee_id]
            );
            if (linkedUser) {
                query += ` WHERE (s.employee_id = ? OR s.employee_id = ?)`;
                params.push(employee_id, linkedUser.id);
            } else {
                query += ` WHERE s.employee_id = ?`;
                params.push(employee_id);
            }
        }

        query += ` ORDER BY s.created_at DESC`;

        const submissions = req.tenantDB.prepare(query).all(...params);

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
router.get('/progress', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { employee_id } = req.query;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        // 1. 取得所有必填的公開模版
        const requiredTemplates = req.tenantDB.prepare(`
            SELECT id, name, version
            FROM templates
            WHERE is_public = 1 AND is_active = 1 AND is_required = 1
        `).all();

        // 2. 取得該員工所有的提交記錄（包括待簽署、已簽署、已完成）
        // 同時匹配 employee_id 和對應的 user_id（歷史資料可能存 user ID）
        const linkedUser = req.tenantDB.queryOne(
            'SELECT id FROM users WHERE employee_id = ?', [employee_id]
        );
        const empIdClause = linkedUser
            ? '(employee_id = ? OR employee_id = ?)'
            : 'employee_id = ?';
        const empIdParams = linkedUser
            ? [employee_id, linkedUser.id]
            : [employee_id];

        const allSubmissions = req.tenantDB.prepare(`
            SELECT template_id, status, approval_status, token
            FROM submissions
            WHERE ${empIdClause}
            ORDER BY created_at DESC
        `).all(...empIdParams);

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
                version: t.version,
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


// employee-list-pagination (D-13): 排序白名單與 paginator 上限
const LIST_ALLOWED_SORTS = {
    name: 'name',
    hire_date: 'hire_date',
    employee_no: 'employee_no',
    department: 'department'
};
const LIST_ALLOWED_ORDERS = { asc: 'ASC', desc: 'DESC' };
const LIST_PAGE_SIZE_DEFAULT = 50;
const LIST_PAGE_SIZE_MAX = 200;

/**
 * GET /api/employee/list
 * 取得員工列表（用於會議出席人員選擇 / 員工列表頁分頁瀏覽）
 *
 * Query params:
 *   - dept:        依部門過濾
 *   - status:      依狀態過濾 (active, probation, resigned)
 *   - all:         設為 true 時包含非在職員工
 *   - org_unit_id: 階層式子公司/部門過濾
 *   - role:        限定持有指定 role code 的員工（rbac-row-level-and-interview-scope）
 *
 * employee-list-pagination (D-13) — opt-in 分頁/搜尋/排序：
 *   - page:     1-based。提供時切換為分頁回傳格式（偵測規則：page !== undefined 且 parseInt 非 NaN）
 *   - pageSize: 預設 50、上限 200；非數值或 ≤0 回退預設
 *   - search:   對 name/email/employee_no 三欄做 LIKE COLLATE NOCASE
 *   - sort:     白名單 [name, hire_date, employee_no, department]
 *   - order:    白名單 [asc, desc]
 *
 * 回傳格式（向後相容）：
 *   - 不含 page → JSON 陣列（原行為，5 個既有 caller 不變）
 *   - 含 page  → { data: Employee[], total, page, pageSize, totalPages }
 */
router.get('/list', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { dept, status, all, org_unit_id, role, search, sort, order } = req.query;

        // 偵測 opt-in 分頁：page 必須存在且 parseInt 非 NaN
        // （防 ?page=undefined / ?page= 的 caller 誤觸分頁路徑）
        const pageParam = req.query.page;
        const pageNum = parseInt(pageParam, 10);
        const paginate = pageParam !== undefined && pageParam !== '' && !Number.isNaN(pageNum) && pageNum >= 1;

        let pageSize = LIST_PAGE_SIZE_DEFAULT;
        if (paginate) {
            const psNum = parseInt(req.query.pageSize, 10);
            if (Number.isFinite(psNum) && psNum > 0) {
                pageSize = Math.min(psNum, LIST_PAGE_SIZE_MAX);
            }
        }

        // 共用 WHERE clause builder（COUNT 與 SELECT 共用以確保 total 與 data 一致）
        let whereClause = ' WHERE 1=1';
        const whereParams = [];

        // 子公司/部門篩選（階層式：包含所有子組織）
        if (org_unit_id) {
            const childIds = getUserDepartmentIds(req.tenantDB, org_unit_id);
            if (childIds.length > 0) {
                whereClause += ` AND org_unit_id IN (${childIds.map(() => '?').join(',')})`;
                whereParams.push(...childIds);
            } else {
                whereClause += ` AND org_unit_id = ?`;
                whereParams.push(org_unit_id);
            }
        }

        // 預設只顯示在職員工
        if (all !== 'true') {
            whereClause += ` AND status IN ('active', 'probation')`;
        }

        if (dept) {
            whereClause += ` AND department = ?`;
            whereParams.push(dept);
        }

        if (status) {
            whereClause += ` AND status = ?`;
            whereParams.push(status);
        }

        // role 過濾（rbac-row-level-and-interview-scope）：限定持有指定 role code 的員工
        // SQL：JOIN users → user_roles → roles，僅納入 users.status='active' 的帳號
        if (role) {
            whereClause += ` AND id IN (
                SELECT u.employee_id
                FROM users u
                JOIN user_roles ur ON ur.user_id = u.id
                JOIN roles r ON r.id = ur.role_id
                WHERE r.name = ?
                  AND (u.status IS NULL OR u.status = 'active')
                  AND u.employee_id IS NOT NULL
            )`;
            whereParams.push(role);
        }

        // 搜尋（D-13）：name / email / employee_no 任一命中即納入；空字串 trim 後忽略
        if (typeof search === 'string' && search.trim() !== '') {
            const term = search.trim();
            whereClause += ` AND (
                name LIKE '%' || ? || '%' COLLATE NOCASE
                OR email LIKE '%' || ? || '%' COLLATE NOCASE
                OR employee_no LIKE '%' || ? || '%' COLLATE NOCASE
            )`;
            whereParams.push(term, term, term);
        }

        // Apply scope filter（D-02 row-level）
        const scope = buildScopeFilter(req, { employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id' });
        whereClause += ` AND ${scope.clause}`;
        whereParams.push(...scope.params);

        // 排序白名單（D-13）：未匹配回退預設
        const sortCol = (typeof sort === 'string' && Object.prototype.hasOwnProperty.call(LIST_ALLOWED_SORTS, sort))
            ? LIST_ALLOWED_SORTS[sort]
            : null;
        const orderDir = (typeof order === 'string' && Object.prototype.hasOwnProperty.call(LIST_ALLOWED_ORDERS, order.toLowerCase()))
            ? LIST_ALLOWED_ORDERS[order.toLowerCase()]
            : 'ASC';
        const orderClause = sortCol
            ? ` ORDER BY ${sortCol} ${orderDir}`
            : ` ORDER BY department, name`;

        const baseSelect = `
            SELECT id, employee_no, name, email, phone, department, position,
                   level, grade, manager_id, hire_date, contract_type,
                   work_location, avatar, status, org_unit_id
            FROM employees
        `;

        let total = null;
        let employees;

        if (paginate) {
            // 先算 total（套用相同 WHERE，但不含 ORDER/LIMIT — COUNT 與 ORDER 無關）
            const countRow = req.tenantDB.prepare(
                `SELECT COUNT(*) AS cnt FROM employees${whereClause}`
            ).get(...whereParams);
            total = countRow ? countRow.cnt : 0;

            // 取該頁資料
            const offset = (pageNum - 1) * pageSize;
            employees = req.tenantDB.prepare(
                `${baseSelect}${whereClause}${orderClause} LIMIT ? OFFSET ?`
            ).all(...whereParams, pageSize, offset);
        } else {
            employees = req.tenantDB.prepare(
                `${baseSelect}${whereClause}${orderClause}`
            ).all(...whereParams);
        }

        // 取得主管名稱
        const managerIds = employees.map(e => e.manager_id).filter(Boolean);
        const managersMap = new Map();
        if (managerIds.length > 0) {
            const managers = req.tenantDB.prepare(`
                SELECT id, name FROM employees WHERE id IN (${managerIds.map(() => '?').join(',')})
            `).all(...managerIds);
            managers.forEach(m => managersMap.set(m.id, m.name));
        }

        // 批次取得 User 帳號資訊（LEFT JOIN）
        const empIds = employees.map(e => e.id);
        const usersMap = new Map();
        if (empIds.length > 0) {
            const users = req.tenantDB.prepare(`
                SELECT id, employee_id, status, email FROM users
                WHERE employee_id IN (${empIds.map(() => '?').join(',')})
            `).all(...empIds);
            users.forEach(u => usersMap.set(u.employee_id, u));
        }

        // 預先載入所有 org_units 供查詢
        const allOrgUnits = new Map();
        req.tenantDB.prepare('SELECT id, name, type, parent_id FROM org_units').all()
            .forEach(u => allOrgUnits.set(u.id, u));

        // 往上遍歷找公司（subsidiary 或 group）
        function findCompany(orgUnitId) {
            let current = allOrgUnits.get(orgUnitId);
            while (current) {
                if (current.type === 'subsidiary' || current.type === 'group') {
                    return { id: current.id, name: current.name };
                }
                current = current.parent_id ? allOrgUnits.get(current.parent_id) : null;
            }
            return null;
        }

        // 組合資料（含 positions[]、userId、userStatus）
        const result = employees.map(emp => {
            const user = usersMap.get(emp.id);
            let companyName = null;
            let companyId = null;
            let departmentId = null;
            let departmentName = null;

            if (emp.org_unit_id) {
                const orgUnit = allOrgUnits.get(emp.org_unit_id);
                if (orgUnit) {
                    if (orgUnit.type === 'department') {
                        departmentId = orgUnit.id;
                        departmentName = orgUnit.name;
                        const company = findCompany(orgUnit.parent_id);
                        if (company) { companyId = company.id; companyName = company.name; }
                    } else {
                        // org_unit_id 指向 group/subsidiary，直接作為公司
                        companyId = orgUnit.id;
                        companyName = orgUnit.name;
                        // 用 department 文字欄位反查，但限定在此公司下的部門
                        if (emp.department) {
                            const depts = allOrgUnits;
                            for (const [, unit] of depts) {
                                if (unit.type === 'department' && unit.name === emp.department && unit.parent_id === orgUnit.id) {
                                    departmentId = unit.id;
                                    departmentName = unit.name;
                                    break;
                                }
                            }
                            if (!departmentName) departmentName = emp.department;
                        }
                    }
                }
            }

            return {
                ...emp,
                managerName: managersMap.get(emp.manager_id) || null,
                userId: user ? user.id : null,
                userStatus: user ? user.status : null,
                userEmail: user ? user.email : null,
                positions: [{
                    companyId,
                    companyName,
                    departmentId,
                    departmentName: departmentName || emp.department,
                    positionTitle: emp.position,
                    positionLevel: emp.level,
                    isPrimary: true,
                    startDate: emp.hire_date
                }]
            };
        });

        if (paginate) {
            res.json({
                data: result,
                total,
                page: pageNum,
                pageSize,
                totalPages: total === 0 ? 0 : Math.ceil(total / pageSize)
            });
        } else {
            res.json(result);
        }
    } catch (error) {
        console.error('Error fetching employee list:', error);
        res.status(500).json({ error: 'Failed to fetch employee list' });
    }
});

/**
 * GET /api/employee/departments
 * 取得所有部門清單（優先從 org_units 取，fallback 從 employees 取）
 */
router.get('/departments', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        // 優先從 org_units 取部門（統一資料來源）
        const fromOrgUnits = req.tenantDB.prepare(`
            SELECT ou.name
            FROM org_units ou
            WHERE ou.type = 'department'
            ORDER BY ou.name ASC
        `).all();

        if (fromOrgUnits.length > 0) {
            res.json(fromOrgUnits.map(d => d.name));
        } else {
            // Fallback：從 employees 取（向後相容）
            const fromEmployees = req.tenantDB.prepare(`
                SELECT DISTINCT department
                FROM employees
                WHERE department IS NOT NULL AND department != ''
                ORDER BY department
            `).all();
            res.json(fromEmployees.map(d => d.department));
        }
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
router.get('/documents', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { employee_id } = req.query;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        const documents = req.tenantDB.prepare(`
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
router.get('/documents/progress', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { employee_id } = req.query;

        if (!employee_id) {
            return res.status(400).json({ error: 'employee_id is required' });
        }

        // 固定文件類型（不含 other）
        const fixedTypes = ['id_card', 'bank_account', 'health_report', 'photo', 'education_cert'];
        const total = fixedTypes.length;

        // 取得已上傳的固定類型文件
        const uploadedDocs = req.tenantDB.prepare(`
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
router.post('/documents', requireFeaturePerm('L1.profile', 'edit'), upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { employee_id, type, custom_name } = req.body;

        if (!employee_id || !type) {
            return res.status(400).json({ error: 'employee_id and type are required' });
        }

        // 驗證 edit_scope 權限
        const targetEmployee = req.tenantDB.prepare(
            'SELECT id, org_unit_id FROM employees WHERE id = ?'
        ).get(employee_id);
        if (!targetEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        const editCheck = checkEditScope(req, targetEmployee, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
        if (!editCheck.allowed) {
            return res.status(403).json({ error: editCheck.message });
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
            const existing = req.tenantDB.prepare(`
                SELECT id FROM employee_documents
                WHERE employee_id = ? AND type = ?
            `).get(employee_id, type);

            if (existing) {
                // 更新現有記錄
                req.tenantDB.prepare(`
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

                const updatedDoc = req.tenantDB.prepare(`
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
        req.tenantDB.prepare(`
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

        const newDoc = req.tenantDB.prepare(`
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
router.put('/documents/:id', requireFeaturePerm('L1.profile', 'edit'), upload.single('file'), (req, res) => {
    try {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 檢查文件是否存在
        const existing = req.tenantDB.prepare(`
            SELECT * FROM employee_documents WHERE id = ?
        `).get(id);

        if (!existing) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // 驗證 edit_scope 權限（查出文件擁有者）
        const docOwner = req.tenantDB.prepare(
            'SELECT id, org_unit_id FROM employees WHERE id = ?'
        ).get(existing.employee_id);
        if (docOwner) {
            const editCheck = checkEditScope(req, docOwner, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
            if (!editCheck.allowed) {
                return res.status(403).json({ error: editCheck.message });
            }
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
        req.tenantDB.prepare(`
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

        const updatedDoc = req.tenantDB.prepare(`
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
router.delete('/documents/:id', requireFeaturePerm('L1.profile', 'edit'), (req, res) => {
    try {
        const { id } = req.params;

        // 檢查文件是否存在
        const existing = req.tenantDB.prepare(`
            SELECT * FROM employee_documents WHERE id = ?
        `).get(id);

        if (!existing) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // 驗證 edit_scope 權限（查出文件擁有者）
        const docOwner = req.tenantDB.prepare(
            'SELECT id, org_unit_id FROM employees WHERE id = ?'
        ).get(existing.employee_id);
        if (docOwner) {
            const editCheck = checkEditScope(req, docOwner, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
            if (!editCheck.allowed) {
                return res.status(403).json({ error: editCheck.message });
            }
        }

        // 刪除檔案（可選）
        if (existing.file_url) {
            const filePath = path.join(__dirname, '../..', existing.file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // 刪除資料庫記錄
        req.tenantDB.prepare(`DELETE FROM employee_documents WHERE id = ?`).run(id);

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
router.get('/documents/:id/download', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { id } = req.params;

        const doc = req.tenantDB.prepare(`
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
router.get('/stats', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { org_unit_id } = req.query;
        let orgFilter = '';
        let orgParams = [];
        if (org_unit_id) {
            const childIds = getUserDepartmentIds(req.tenantDB, org_unit_id);
            if (childIds.length > 0) {
                orgFilter = ` AND org_unit_id IN (${childIds.map(() => '?').join(',')})`;
                orgParams = childIds;
            } else {
                orgFilter = ' AND org_unit_id = ?';
                orgParams = [org_unit_id];
            }
        }

        // Scope 過濾
        const scope = buildScopeFilter(req, { employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id' });
        const scopeFilter = ` AND ${scope.clause}`;

        // 員工總數
        const totalEmployees = req.tenantDB.prepare(`
            SELECT COUNT(*) as count FROM employees WHERE 1=1${orgFilter}${scopeFilter}
        `).get(...orgParams, ...scope.params).count;

        // 在職人數
        const activeCount = req.tenantDB.prepare(`
            SELECT COUNT(*) as count FROM employees WHERE status = 'active'${orgFilter}${scopeFilter}
        `).get(...orgParams, ...scope.params).count;

        // 試用期人數
        const probationCount = req.tenantDB.prepare(`
            SELECT COUNT(*) as count FROM employees WHERE status = 'probation'${orgFilter}${scopeFilter}
        `).get(...orgParams, ...scope.params).count;

        // 平均年資（月）
        const avgTenureResult = req.tenantDB.prepare(`
            SELECT AVG(
                (julianday('now') - julianday(hire_date)) / 30.44
            ) as avgMonths
            FROM employees
            WHERE hire_date IS NOT NULL AND status IN ('active', 'probation')${orgFilter}${scopeFilter}
        `).get(...orgParams, ...scope.params);
        const avgTenure = avgTenureResult.avgMonths ? Math.round(avgTenureResult.avgMonths) : 0;

        // 30天內到期文件數（從 employee_certifications 表，需 JOIN employees 做 scope 過濾）
        const certScope = buildScopeFilter(req, { tableAlias: 'e', employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id' });
        const expiringDocuments = req.tenantDB.prepare(`
            SELECT COUNT(*) as count
            FROM employee_certifications ec
            JOIN employees e ON ec.employee_id = e.id
            WHERE ec.expiry_date IS NOT NULL
            AND date(ec.expiry_date) BETWEEN date('now') AND date('now', '+30 days')
            AND ${certScope.clause}
        `).get(...certScope.params).count;

        // 即將到職週年的員工（30天內）
        const upcomingAnniversaries = req.tenantDB.prepare(`
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
            AND status IN ('active', 'probation')${orgFilter}${scopeFilter}
            ORDER BY strftime('%m-%d', hire_date)
        `).all(...orgParams, ...scope.params);

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
router.get('/expiring-documents', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const scope = buildScopeFilter(req, { tableAlias: 'e', employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id' });
        const expiringCerts = req.tenantDB.prepare(`
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
            AND ${scope.clause}
            ORDER BY ec.expiry_date ASC
        `).all(...scope.params);

        res.json(expiringCerts);
    } catch (error) {
        console.error('Error fetching expiring documents:', error);
        res.status(500).json({ error: 'Failed to fetch expiring documents' });
    }
});

// GET /api/employee/department-roi - 部門 ROI 概覽（暫時回傳 mock）
router.get('/department-roi', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
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
router.get('/:id/audit-logs', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        // 未來功能，暫時回傳空陣列
        res.json([]);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

router.get('/:id', requireFeaturePerm('L1.profile', 'view'), (req, res) => {
    try {
        const { id } = req.params;

        // Scope 驗證：確認目標員工在使用者的 view_scope 範圍內
        const scope = buildScopeFilter(req, { employeeIdColumn: 'id', orgUnitColumn: 'org_unit_id' });
        const employee = req.tenantDB.prepare(`
            SELECT * FROM employees WHERE id = ? AND ${scope.clause}
        `).get(id, ...scope.params);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // 取得主管名稱
        if (employee.manager_id) {
            const manager = req.tenantDB.prepare(`
                SELECT name FROM employees WHERE id = ?
            `).get(employee.manager_id);
            employee.managerName = manager ? manager.name : null;
        }

        // 取得學歷
        const education = req.tenantDB.prepare(`
            SELECT id, degree, school, major, graduation_year
            FROM employee_education
            WHERE employee_id = ?
            ORDER BY graduation_year DESC
        `).all(id);

        // 取得技能
        const skills = req.tenantDB.prepare(`
            SELECT skill_name FROM employee_skills WHERE employee_id = ?
        `).all(id);

        // 取得證照
        const certifications = req.tenantDB.prepare(`
            SELECT id, cert_name, issued_date, expiry_date
            FROM employee_certifications
            WHERE employee_id = ?
            ORDER BY issued_date DESC
        `).all(id);

        // 取得職務異動記錄
        const workHistory = req.tenantDB.prepare(`
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
        const salaryRecord = req.tenantDB.prepare(`
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
        const training = req.tenantDB.prepare(`
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
        const documents = req.tenantDB.prepare(`
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
        const performanceRaw = req.tenantDB.prepare(`
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
        const roiRecords = req.tenantDB.prepare(`
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
            const candidate = req.tenantDB.prepare(`
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
            const templateProgress = req.tenantDB.prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'SIGNED' OR status = 'COMPLETED' THEN 1 ELSE 0 END) as signed,
                    SUM(CASE WHEN approval_status = 'APPROVED' THEN 1 ELSE 0 END) as approved
                FROM submissions
                WHERE employee_id = ?
            `).get(id);

            // 文件上傳進度
            const docProgress = req.tenantDB.prepare(`
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

        // 取得關聯 User 帳號和角色
        let userId = null;
        let userStatus = null;
        let userRoles = [];
        const linkedUser = req.tenantDB.prepare(
            'SELECT id, status FROM users WHERE employee_id = ?'
        ).get(id);
        if (linkedUser) {
            userId = linkedUser.id;
            userStatus = linkedUser.status;
            userRoles = req.tenantDB.prepare(`
                SELECT r.id, r.name, r.description, ur.org_unit_id
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = ?
            `).all(linkedUser.id);
        }

        // 建立 positions 陣列
        let companyName = null, companyId = null, departmentId = null, departmentName = null;
        if (employee.org_unit_id) {
            const orgUnit = req.tenantDB.prepare(
                'SELECT id, name, type, parent_id FROM org_units WHERE id = ?'
            ).get(employee.org_unit_id);
            if (orgUnit) {
                if (orgUnit.type === 'department') {
                    departmentId = orgUnit.id;
                    departmentName = orgUnit.name;
                    if (orgUnit.parent_id) {
                        const parent = req.tenantDB.prepare(
                            'SELECT id, name FROM org_units WHERE id = ?'
                        ).get(orgUnit.parent_id);
                        if (parent) { companyId = parent.id; companyName = parent.name; }
                    }
                } else {
                    companyId = orgUnit.id;
                    companyName = orgUnit.name;
                }
            }
        }
        const positions = [{
            companyId, companyName,
            departmentId, departmentName: departmentName || employee.department,
            positionTitle: employee.position,
            positionLevel: employee.level,
            isPrimary: true,
            startDate: employee.hire_date
        }];

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
            onboardingProgress,
            userId,
            userStatus,
            userRoles,
            positions
        });
    } catch (error) {
        console.error('Error fetching employee detail:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 3.3 POST /api/employee — 新增員工（含自動建帳號）
// ═══════════════════════════════════════════════════════════════

const { createEmployeeWithAccount } = require('../services/account-creation');

router.post('/', requireFeaturePerm('L1.profile', 'edit'), async (req, res) => {
    try {
        const {
            name, email, employee_no, department, position,
            level, grade, hire_date, contract_type, work_location,
            org_unit_id, english_name, mobile, gender, phone,
            manager_id, birth_date, address,
            emergency_contact_name, emergency_contact_relation, emergency_contact_phone,
            createUser: shouldCreateUser
        } = req.body;

        if (!name || !email || !employee_no) {
            return res.status(400).json({ error: '姓名、Email、工號為必填欄位' });
        }

        // 驗證 edit_scope 權限（self scope 不得建立新員工）
        const editCheck = checkEditScope(req, { id: null, org_unit_id: org_unit_id }, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
        if (!editCheck.allowed) {
            return res.status(403).json({ error: editCheck.message });
        }

        const result = await createEmployeeWithAccount(req.tenantDB, {
            employeeData: {
                name, email, employee_no, department, position,
                level, grade, hire_date,
                contract_type: contract_type || 'full-time',
                work_location, org_unit_id, english_name, mobile,
                gender: gender || 'other', phone, manager_id,
                birth_date, address,
                emergency_contact_name, emergency_contact_relation, emergency_contact_phone
            },
            createUser: shouldCreateUser !== false, // 預設 true
            defaultRole: 'employee',
            orgUnitId: org_unit_id
        });

        res.status(201).json(result);
    } catch (error) {
        if (error.message.includes('already exists')) {
            return res.status(409).json({ error: error.message });
        }
        console.error('Error creating employee:', error);
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

// ═══════════════════════════════════════════════════════════════
// 3.4 PUT /api/employee/:id — 更新員工基本資料
// ═══════════════════════════════════════════════════════════════

router.put('/:id', requireFeaturePerm('L1.profile', 'edit'), (req, res) => {
    try {
        const { id } = req.params;

        // 確認員工存在
        const existing = req.tenantDB.prepare(
            'SELECT id, org_unit_id FROM employees WHERE id = ?'
        ).get(id);

        if (!existing) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // 驗證 edit_scope 權限
        const editCheck = checkEditScope(req, existing, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
        if (!editCheck.allowed) {
            return res.status(403).json({ error: editCheck.message });
        }

        // 可更新欄位白名單
        const allowedFields = [
            'name', 'email', 'phone', 'department', 'position',
            'level', 'grade', 'manager_id', 'contract_type', 'work_location',
            'status', 'org_unit_id', 'english_name', 'mobile', 'gender',
            'birth_date', 'address', 'emergency_contact_name',
            'emergency_contact_relation', 'emergency_contact_phone'
        ];

        const updates = [];
        const params = [];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                params.push(req.body[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push('updated_at = ?');
        params.push(new Date().toISOString());
        params.push(id);

        const newEmail = req.body.email;
        const emailChanged = newEmail !== undefined;

        // 若 email 有變更，檢查是否需要同步 users.email
        if (emailChanged) {
            // users.employee_id → employees.id（關聯方向是 users 指向 employees）
            const linkedUser = req.tenantDB.prepare(
                'SELECT id FROM users WHERE employee_id = ?'
            ).get(id);

            if (linkedUser) {
                // 檢查新 email 是否已被其他 user 使用
                const conflict = req.tenantDB.prepare(
                    'SELECT id FROM users WHERE email = ? AND id != ?'
                ).get(newEmail, linkedUser.id);

                if (conflict) {
                    return res.status(409).json({ error: '此 email 已被其他帳號使用' });
                }

                // 使用 transaction 原子更新 employees + users
                req.tenantDB.transaction((db) => {
                    db.run(
                        `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
                        params
                    );
                    db.run(
                        'UPDATE users SET email = ? WHERE id = ?',
                        [newEmail, linkedUser.id]
                    );
                });

                const updated = req.tenantDB.prepare('SELECT * FROM employees WHERE id = ?').get(id);
                return res.json(updated);
            }
        }

        // 無 email 變更或員工無帳號：僅更新 employees
        req.tenantDB.run(
            `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        const updated = req.tenantDB.prepare('SELECT * FROM employees WHERE id = ?').get(id);
        res.json(updated);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/employee/:id/create-account — 為既有員工建立帳號
// ═══════════════════════════════════════════════════════════════
router.post('/:id/create-account', requireFeaturePerm('L1.profile', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;

        const employee = req.tenantDB.prepare(
            'SELECT id, name, email, department, position, level, grade, org_unit_id, hire_date FROM employees WHERE id = ?'
        ).get(id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // 驗證 edit_scope 權限
        const editCheck = checkEditScope(req, employee, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
        if (!editCheck.allowed) {
            return res.status(403).json({ error: editCheck.message });
        }

        const existingUser = req.tenantDB.prepare(
            'SELECT id FROM users WHERE employee_id = ?'
        ).get(id);
        if (existingUser) {
            return res.status(409).json({ error: '此員工已有系統帳號' });
        }

        const { generatePassword } = require('../services/account-creation');
        const bcrypt = require('bcryptjs');
        const { v4: uuidv4 } = require('uuid');

        const password = generatePassword();
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        req.tenantDB.run(
            `INSERT INTO users (id, email, name, password_hash, status, employee_id, must_change_password, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'active', ?, 1, datetime('now'), datetime('now'))`,
            [userId, employee.email, employee.name, passwordHash, id]
        );

        // 指派預設 employee 角色
        const defaultRole = req.tenantDB.prepare(
            "SELECT id FROM roles WHERE name = 'employee' LIMIT 1"
        ).get();
        if (defaultRole) {
            req.tenantDB.run(
                'INSERT OR IGNORE INTO user_roles (user_id, role_id, org_unit_id) VALUES (?, ?, ?)',
                [userId, defaultRole.id, employee.org_unit_id || null]
            );
        }

        res.status(201).json({
            userId,
            initialPassword: password,
            message: '帳號已建立'
        });
    } catch (error) {
        console.error('Error creating account for employee:', error);
        res.status(500).json({ error: error.message || 'Failed to create account' });
    }
});

module.exports = router;
