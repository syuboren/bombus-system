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

module.exports = router;
