/**
 * Submissions API Routes (Employee Signing)
 */

const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/onboarding/sign/:token
 * 取得填寫 Schema (員工端)
 */
router.get('/:token', (req, res) => {
    try {
        const { token } = req.params;

        // 查找 submission
        const submission = prepare(`
      SELECT s.*, t.name as template_name, t.mapping_config
      FROM submissions s
      JOIN templates t ON s.template_id = t.id
      WHERE s.token = ?
    `).get(token);

        if (!submission) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }

        if (submission.status === 'COMPLETED') {
            return res.status(400).json({ error: 'This document has already been signed' });
        }

        // Parse mapping config to build form schema
        const mappingConfig = JSON.parse(submission.mapping_config || '{"fields":[]}');

        // Group fields into steps
        const textFields = mappingConfig.fields?.filter(f => f.type === 'text' || f.type === 'date') || [];
        const signatureFields = mappingConfig.fields?.filter(f => f.type === 'signature') || [];

        const steps = [];
        if (textFields.length > 0) {
            steps.push({
                title: '基本資料',
                fields: textFields.map(f => ({
                    key: f.key,
                    label: f.label,
                    type: f.type,
                    required: f.is_required
                }))
            });
        }
        if (signatureFields.length > 0) {
            steps.push({
                title: '條款簽署',
                fields: signatureFields.map(f => ({
                    key: f.key,
                    label: f.label,
                    type: f.type,
                    required: f.is_required
                }))
            });
        }

        res.json({
            template_name: submission.template_name,
            status: submission.status,
            steps
        });
    } catch (error) {
        console.error('Error fetching sign schema:', error);
        res.status(500).json({ error: 'Failed to fetch sign schema' });
    }
});

/**
 * POST /api/onboarding/sign/:token/submit
 * 提交簽署資料
 */
router.post('/:token/submit', (req, res) => {
    try {
        const { token } = req.params;
        const { form_data, signature_base64 } = req.body;
        const ip_address = req.ip || req.connection?.remoteAddress || 'unknown';

        // 查找 submission
        const submission = prepare('SELECT * FROM submissions WHERE token = ?').get(token);

        if (!submission) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }

        if (submission.status === 'COMPLETED') {
            return res.status(400).json({ error: 'This document has already been signed' });
        }

        // 更新 submission
        prepare(`
      UPDATE submissions 
      SET form_data = ?, signature_base64 = ?, status = 'SIGNED', signed_at = datetime('now'), ip_address = ?
      WHERE token = ?
    `).run(JSON.stringify(form_data), signature_base64, ip_address, token);

        res.json({
            message: 'Document signed successfully',
            status: 'SIGNED'
        });
    } catch (error) {
        console.error('Error submitting signature:', error);
        res.status(500).json({ error: 'Failed to submit signature' });
    }
});

/**
 * POST /api/onboarding/sign/create
 * 建立新的簽署連結 (HR 端)
 */
router.post('/create', (req, res) => {
    try {
        const { template_id, employee_name, employee_email } = req.body;

        // 驗證模板存在
        const template = prepare('SELECT id FROM templates WHERE id = ?').get(template_id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const id = uuidv4();
        const token = uuidv4().replace(/-/g, '').substring(0, 16);

        prepare(`
      INSERT INTO submissions (id, template_id, token, employee_name, employee_email, status)
      VALUES (?, ?, ?, ?, ?, 'DRAFT')
    `).run(id, template_id, token, employee_name, employee_email);

        res.status(201).json({
            id,
            token,
            sign_url: `/employee/onboarding/sign/${token}`
        });
    } catch (error) {
        console.error('Error creating sign link:', error);
        res.status(500).json({ error: 'Failed to create sign link' });
    }
});

/**
 * GET /api/onboarding/sign/submissions/:templateId
 * 取得模板的所有提交記錄 (HR 端)
 */
router.get('/submissions/:templateId', (req, res) => {
    try {
        const submissions = prepare(`
      SELECT id, token, employee_name, employee_email, status, signed_at, created_at
      FROM submissions
      WHERE template_id = ?
      ORDER BY created_at DESC
    `).all(req.params.templateId);

        res.json(submissions);
    } catch (error) {
        console.error('Error fetching submissions:', error);
        res.status(500).json({ error: 'Failed to fetch submissions' });
    }
});

module.exports = router;
