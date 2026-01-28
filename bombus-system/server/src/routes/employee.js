/**
 * Employee API Routes (員工入職文件)
 */

const express = require('express');
const router = express.Router();
const { prepare } = require('../db');

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

        // 2. 取得該員工已完成的提交
        const completedSubmissions = prepare(`
            SELECT template_id, status, approval_status, token
            FROM submissions
            WHERE employee_id = ? AND (status = 'SIGNED' OR status = 'COMPLETED')
        `).all(employee_id);

        const completedMap = new Map();
        completedSubmissions.forEach(s => {
            completedMap.set(s.template_id, s);
        });

        // 3. 計算進度
        const total = requiredTemplates.length;
        let completed = 0;
        let approved = 0;
        let pending = 0;
        let rejected = 0;

        const progress = requiredTemplates.map(t => {
            const submission = completedMap.get(t.id);
            let status = 'NOT_STARTED';

            if (submission) {
                if (submission.approval_status === 'APPROVED') {
                    status = 'APPROVED';
                    completed++;
                    approved++;
                } else if (submission.approval_status === 'REJECTED') {
                    status = 'REJECTED';
                    rejected++;
                } else if (submission.status === 'SIGNED') {
                    status = 'PENDING_APPROVAL';
                    pending++;
                }
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

/**
 * GET /api/employee/:id
 * 取得單一員工完整資料 (含學歷、技能、證照)
 */
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

        res.json({
            ...employee,
            education,
            skills: skills.map(s => s.skill_name),
            certifications
        });
    } catch (error) {
        console.error('Error fetching employee detail:', error);
        res.status(500).json({ error: 'Failed to fetch employee' });
    }
});

module.exports = router;
