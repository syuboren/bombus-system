/**
 * Submissions API Routes (Employee Signing)
 */

const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { v4: uuidv4 } = require('uuid');

// ==================== 特定路由（必須放在通用路由之前） ====================

/**
 * POST /api/onboarding/sign/create
 * 建立新的簽署連結 (HR 端)
 */
/**
 * POST /api/onboarding/sign/create
 * 建立新的簽署連結 (HR 端)
 */
router.post('/create', (req, res) => {
    try {
        const { template_id, employee_name, employee_email } = req.body;

        // 驗證模板存在並取得當前版本
        const template = prepare('SELECT id, version FROM templates WHERE id = ?').get(template_id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const id = uuidv4();
        const token = uuidv4().replace(/-/g, '').substring(0, 16);

        // sql.js 無法處理 undefined，需轉為 null
        const safeName = employee_name || null;
        const safeEmail = employee_email || null;
        const version = template.version;

        prepare(`
            INSERT INTO submissions (id, template_id, token, employee_name, employee_email, status, template_version) 
            VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)
        `).run(id, template_id, token, safeName, safeEmail, version);

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
      SELECT id, token, employee_name, employee_email, status, template_version, signed_at, created_at
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

// ==================== 通用路由（:token 參數會匹配任何值） ====================

/**
 * GET /api/onboarding/sign/:token
 * 取得填寫 Schema (員工端)
 */
router.get('/:token', (req, res) => {
    try {
        const { token } = req.params;

        // 1. 先查找 submission 基本資料
        const submission = prepare(`
            SELECT s.*, t.name as template_name
            FROM submissions s
            JOIN templates t ON s.template_id = t.id
            WHERE s.token = ?
        `).get(token);

        if (!submission) {
            return res.status(404).json({ error: 'Invalid or expired token' });
        }

        let mappingConfigRaw = null;
        let pdfBase64 = null;

        // 2. 決定要從哪裡讀取模板內容 (Snapshot or Live)
        if (submission.template_version) {
            // 從歷史版本讀取
            const versionData = prepare(`
                SELECT mapping_config, pdf_base64
                FROM template_versions
                WHERE template_id = ? AND version = ?
            `).get(submission.template_id, submission.template_version);

            if (versionData) {
                mappingConfigRaw = versionData.mapping_config;
                pdfBase64 = versionData.pdf_base64;
            } else {
                // 若找不到對應版本 (可能被刪除?)，Fallback 到最新版
                console.warn(`Version ${submission.template_version} not found for template ${submission.template_id}, falling back to latest.`);
                const latest = prepare('SELECT mapping_config, pdf_base64 FROM templates WHERE id = ?').get(submission.template_id);
                if (latest) {
                    mappingConfigRaw = latest.mapping_config;
                    pdfBase64 = latest.pdf_base64;
                }
            }
        } else {
            // 舊資料 (無 version)，讀取最新版
            const latest = prepare('SELECT mapping_config, pdf_base64 FROM templates WHERE id = ?').get(submission.template_id);
            if (latest) {
                mappingConfigRaw = latest.mapping_config;
                pdfBase64 = latest.pdf_base64;
            }
        }

        // Parse mapping config to build form schema
        const mappingConfig = JSON.parse(mappingConfigRaw || '{"fields":[]}');

        // Parse saved form data if exists
        let formData = {};
        try {
            if (submission.form_data) {
                formData = JSON.parse(submission.form_data);
            }
        } catch (e) {
            console.error('Failed to parse form_data', e);
        }

        // 分類欄位
        const textFields = mappingConfig.fields?.filter(f => f.type === 'text' || f.type === 'date' || f.type === 'checkbox') || [];
        const signatureFields = mappingConfig.fields?.filter(f => f.type === 'signature') || [];

        // 回傳完整資料（包含欄位位置資訊用於預覽）
        res.json({
            template_name: submission.template_name,
            status: submission.status,
            template_version: submission.template_version, // 回傳版本號
            pdf_base64: pdfBase64 || null,
            form_data: formData, // 回傳已填寫資料
            signature_base64: submission.signature_base64 || null, // 回傳簽名
            form_fields: textFields.map(f => ({
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.is_required,
                font_size: f.font_size, // 補上字體大小
                group: f.group, // 補上群組名稱
                placements: f.placements || []
            })),
            signature_fields: signatureFields.map(f => ({
                key: f.key,
                label: f.label,
                type: f.type,
                required: f.is_required,
                placements: f.placements || []
            }))
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

module.exports = router;
