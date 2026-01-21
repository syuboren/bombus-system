/**
 * Manager Approval API Routes (主管簽核)
 */

const express = require('express');
const router = express.Router();
const { prepare, saveDatabase } = require('../db');

/**
 * GET /api/manager/approvals
 * 取得待審核的提交列表
 */
router.get('/', (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT s.*, t.name as template_name, t.version as template_version
            FROM submissions s
            JOIN templates t ON s.template_id = t.id
            WHERE s.status IN ('SIGNED', 'COMPLETED')
        `;

        if (status === 'PENDING') {
            query += ` AND s.approval_status = 'PENDING'`;
        } else if (status === 'APPROVED') {
            query += ` AND s.approval_status = 'APPROVED'`;
        } else if (status === 'REJECTED') {
            query += ` AND s.approval_status = 'REJECTED'`;
        } else {
            // 預設顯示待審核
            query += ` AND s.approval_status = 'PENDING'`;
        }

        query += ` ORDER BY s.signed_at DESC`;

        const submissions = prepare(query).all();

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
        console.error('Error fetching approvals:', error);
        res.status(500).json({ error: 'Failed to fetch approvals' });
    }
});

/**
 * GET /api/manager/approvals/:id
 * 取得單一提交的詳細資訊 (用於預覽)
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const submission = prepare(`
            SELECT s.*, t.name as template_name, t.pdf_base64 as template_pdf,
                   t.mapping_config as template_mapping
            FROM submissions s
            JOIN templates t ON s.template_id = t.id
            WHERE s.id = ?
        `).get(id);

        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        // Parse JSON fields
        if (submission.form_data) {
            try {
                submission.form_data = JSON.parse(submission.form_data);
            } catch (e) { }
        }
        if (submission.template_mapping) {
            try {
                submission.template_mapping = JSON.parse(submission.template_mapping);
            } catch (e) { }
        }

        res.json(submission);
    } catch (error) {
        console.error('Error fetching submission:', error);
        res.status(500).json({ error: 'Failed to fetch submission' });
    }
});

/**
 * POST /api/manager/approvals/:id/approve
 * 核准提交
 */
router.post('/:id/approve', (req, res) => {
    try {
        const { id } = req.params;
        const { approver_id, approval_note } = req.body;

        const submission = prepare('SELECT id, approval_status FROM submissions WHERE id = ?').get(id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        if (submission.approval_status === 'APPROVED') {
            return res.status(400).json({ error: 'Already approved' });
        }

        prepare(`
            UPDATE submissions
            SET approval_status = 'APPROVED', approver_id = ?, approval_note = ?, approved_at = datetime('now'), status = 'COMPLETED'
            WHERE id = ?
        `).run(approver_id || null, approval_note || null, id);

        saveDatabase();

        res.json({ message: 'Submission approved successfully' });
    } catch (error) {
        console.error('Error approving submission:', error);
        res.status(500).json({ error: 'Failed to approve submission' });
    }
});

/**
 * POST /api/manager/approvals/:id/reject
 * 退回提交
 */
router.post('/:id/reject', (req, res) => {
    try {
        const { id } = req.params;
        const { approver_id, approval_note } = req.body;

        if (!approval_note) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const submission = prepare('SELECT id, approval_status FROM submissions WHERE id = ?').get(id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        if (submission.approval_status === 'APPROVED') {
            return res.status(400).json({ error: 'Cannot reject an approved submission' });
        }

        prepare(`
            UPDATE submissions
            SET approval_status = 'REJECTED', approver_id = ?, approval_note = ?, approved_at = datetime('now')
            WHERE id = ?
        `).run(approver_id || null, approval_note, id);

        saveDatabase();

        res.json({ message: 'Submission rejected successfully' });
    } catch (error) {
        console.error('Error rejecting submission:', error);
        res.status(500).json({ error: 'Failed to reject submission' });
    }
});

/**
 * GET /api/manager/stats
 * 取得簽核統計摘要
 */
router.get('/stats/summary', (req, res) => {
    try {
        const pending = prepare(`
            SELECT COUNT(*) as count FROM submissions
            WHERE status = 'SIGNED' AND approval_status = 'PENDING'
        `).get();

        const approved = prepare(`
            SELECT COUNT(*) as count FROM submissions
            WHERE approval_status = 'APPROVED'
        `).get();

        const rejected = prepare(`
            SELECT COUNT(*) as count FROM submissions
            WHERE approval_status = 'REJECTED'
        `).get();

        res.json({
            pending: pending?.count || 0,
            approved: approved?.count || 0,
            rejected: rejected?.count || 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
