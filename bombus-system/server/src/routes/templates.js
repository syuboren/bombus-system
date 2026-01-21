/**
 * Templates API Routes
 */

const express = require('express');
const router = express.Router();
const { prepare, saveDatabase } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/onboarding/templates
 * 取得所有模板清單
 */
router.get('/', (req, res) => {
    try {
        const templates = prepare(`
      SELECT id, name, version, is_active, is_public, is_required, description, has_draft, created_at, updated_at
      FROM templates
      ORDER BY created_at DESC
    `).all();

        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

/**
 * GET /api/onboarding/templates/:id
 * 取得單一模板詳情
 */
router.get('/:id', (req, res) => {
    try {
        const template = prepare(`
      SELECT * FROM templates WHERE id = ?
    `).get(req.params.id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // Parse JSON fields
        if (template.mapping_config) {
            template.mapping_config = JSON.parse(template.mapping_config);
        }

        res.json(template);
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template' });
    }
});

/**
 * POST /api/onboarding/templates
 * 新增模板
 */
/**
 * POST /api/onboarding/templates
 * 新增模板
 */
router.post('/', (req, res) => {
    try {
        const { name, pdf_base64, mapping_config, is_public, is_required, description } = req.body;

        const id = uuidv4();
        const mappingJson = mapping_config ? JSON.stringify(mapping_config) : null;
        const initialVersion = 1;

        // 1. 建立模板 (Version 1)
        prepare(`
      INSERT INTO templates (id, name, pdf_base64, mapping_config, version, is_public, is_required, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, pdf_base64, mappingJson, initialVersion, is_public ? 1 : 0, is_required ? 1 : 0, description || null);

        // 2. 立即建立 V1 快照
        const versionId = uuidv4();
        prepare(`
      INSERT INTO template_versions (id, template_id, version, mapping_config, pdf_base64)
      VALUES (?, ?, ?, ?, ?)
    `).run(versionId, id, initialVersion, mappingJson, pdf_base64);

        const template = prepare('SELECT * FROM templates WHERE id = ?').get(id);

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

/**
 * PUT /api/onboarding/templates/:id
 * 更新模板
 */
router.put('/:id', (req, res) => {
    try {
        const { name, pdf_base64, mapping_config, is_active, is_public, is_required, description } = req.body;
        const { id } = req.params;

        const existing = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const mappingJson = mapping_config ? JSON.stringify(mapping_config) : existing.mapping_config;

        prepare(`
      UPDATE templates 
      SET name = ?, pdf_base64 = ?, mapping_config = ?, is_active = ?, is_public = ?, is_required = ?, description = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
            name ?? existing.name,
            pdf_base64 ?? existing.pdf_base64,
            mappingJson,
            is_active ?? existing.is_active,
            is_public !== undefined ? (is_public ? 1 : 0) : existing.is_public,
            is_required !== undefined ? (is_required ? 1 : 0) : existing.is_required,
            description !== undefined ? description : existing.description,
            id
        );

        const updated = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (updated && updated.mapping_config) {
            updated.mapping_config = JSON.parse(updated.mapping_config);
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

/**
 * DELETE /api/onboarding/templates/:id
 * 刪除模板
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        // 手動級聯刪除 (Manual Cascade Delete)
        prepare('DELETE FROM submissions WHERE template_id = ?').run(id);
        prepare('DELETE FROM template_versions WHERE template_id = ?').run(id);

        const result = prepare('DELETE FROM templates WHERE id = ?').run(id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

/**
 * POST /api/onboarding/templates/:id/new-version
 * 發布新版本 (上傳新 PDF + 可選繼承前版設定)
 */
router.post('/:id/new-version', (req, res) => {
    try {
        const { id } = req.params;
        const { pdf_base64, inherit_fields, mapping_config } = req.body;

        // 驗證必要參數
        if (!pdf_base64) {
            return res.status(400).json({ error: 'PDF file is required for new version' });
        }

        // 查詢原模板
        const template = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // 決定新版本號
        const nextVersion = (template.version || 1) + 1;

        // 決定欄位設定：繼承前版或使用新設定
        let newMappingConfig;
        if (inherit_fields) {
            newMappingConfig = template.mapping_config; // 繼承
        } else if (mapping_config) {
            newMappingConfig = JSON.stringify(mapping_config); // 使用傳入的新設定
        } else {
            newMappingConfig = JSON.stringify({ fields: [] }); // 空設定
        }

        // 1. 建立版本快照
        const versionId = uuidv4();
        prepare(`
            INSERT INTO template_versions (id, template_id, version, mapping_config, pdf_base64)
            VALUES (?, ?, ?, ?, ?)
        `).run(versionId, id, nextVersion, newMappingConfig, pdf_base64);

        // 2. 更新主表為新版本
        prepare(`
            UPDATE templates 
            SET version = ?, pdf_base64 = ?, mapping_config = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(nextVersion, pdf_base64, newMappingConfig, id);

        // 回傳新版本資訊
        const updated = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (updated && updated.mapping_config) {
            updated.mapping_config = JSON.parse(updated.mapping_config);
        }

        res.json({
            message: 'New version published successfully',
            version: nextVersion,
            template: updated
        });
    } catch (error) {
        console.error('Error creating new version:', error);
        res.status(500).json({ error: 'Failed to create new version' });
    }
});

// ==================== 草稿 API ====================

/**
 * POST /api/onboarding/templates/:id/draft
 * 建立或更新草稿
 */
router.post('/:id/draft', (req, res) => {
    try {
        const { id } = req.params;
        const { pdf_base64, mapping_config, inherit_fields } = req.body;

        const template = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // 決定欄位設定
        let draftMappingConfig;
        if (inherit_fields && !mapping_config) {
            draftMappingConfig = template.mapping_config; // 繼承現有設定
        } else if (mapping_config) {
            draftMappingConfig = typeof mapping_config === 'string'
                ? mapping_config
                : JSON.stringify(mapping_config);
        } else {
            draftMappingConfig = JSON.stringify({ fields: [] });
        }

        // 更新草稿欄位
        prepare(`
            UPDATE templates 
            SET draft_pdf_base64 = ?, draft_mapping_config = ?, has_draft = 1, updated_at = datetime('now')
            WHERE id = ?
        `).run(pdf_base64 || null, draftMappingConfig, id);

        res.json({ message: 'Draft saved successfully', has_draft: true });
    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ error: 'Failed to save draft' });
    }
});

/**
 * GET /api/onboarding/templates/:id/draft
 * 取得草稿內容
 */
router.get('/:id/draft', (req, res) => {
    try {
        const { id } = req.params;

        const template = prepare(`
            SELECT id, name, version, has_draft, draft_pdf_base64, draft_mapping_config
            FROM templates WHERE id = ?
        `).get(id);

        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (!template.has_draft) {
            return res.status(404).json({ error: 'No draft found' });
        }

        // 解析 mapping_config
        let mappingConfig = null;
        if (template.draft_mapping_config) {
            try {
                mappingConfig = JSON.parse(template.draft_mapping_config);
            } catch (e) {
                mappingConfig = { fields: [] };
            }
        }

        res.json({
            id: template.id,
            name: template.name,
            current_version: template.version,
            draft_pdf_base64: template.draft_pdf_base64,
            draft_mapping_config: mappingConfig
        });
    } catch (error) {
        console.error('Error fetching draft:', error);
        res.status(500).json({ error: 'Failed to fetch draft' });
    }
});

/**
 * POST /api/onboarding/templates/:id/publish-draft
 * 將草稿發布為正式版本
 */
router.post('/:id/publish-draft', (req, res) => {
    try {
        const { id } = req.params;

        const template = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        if (!template.has_draft) {
            return res.status(400).json({ error: 'No draft to publish' });
        }

        if (!template.draft_pdf_base64) {
            return res.status(400).json({ error: 'Draft must have a PDF file' });
        }

        // 新版本號
        const nextVersion = (template.version || 1) + 1;

        // 1. 建立版本快照
        const versionId = uuidv4();
        prepare(`
            INSERT INTO template_versions (id, template_id, version, mapping_config, pdf_base64)
            VALUES (?, ?, ?, ?, ?)
        `).run(versionId, id, nextVersion, template.draft_mapping_config, template.draft_pdf_base64);

        // 2. 更新主表為新版本並清除草稿
        prepare(`
            UPDATE templates 
            SET version = ?, pdf_base64 = ?, mapping_config = ?, 
                draft_pdf_base64 = NULL, draft_mapping_config = NULL, has_draft = 0,
                updated_at = datetime('now')
            WHERE id = ?
        `).run(nextVersion, template.draft_pdf_base64, template.draft_mapping_config, id);

        res.json({
            message: 'Draft published successfully',
            version: nextVersion
        });
    } catch (error) {
        console.error('Error publishing draft:', error);
        res.status(500).json({ error: 'Failed to publish draft' });
    }
});

/**
 * DELETE /api/onboarding/templates/:id/draft
 * 刪除草稿
 */
router.delete('/:id/draft', (req, res) => {
    try {
        const { id } = req.params;

        const template = prepare('SELECT id FROM templates WHERE id = ?').get(id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // 清除草稿欄位
        prepare(`
            UPDATE templates 
            SET draft_pdf_base64 = NULL, draft_mapping_config = NULL, has_draft = 0, updated_at = datetime('now')
            WHERE id = ?
        `).run(id);

        res.json({ message: 'Draft deleted successfully' });
    } catch (error) {
        console.error('Error deleting draft:', error);
        res.status(500).json({ error: 'Failed to delete draft' });
    }
});

module.exports = router;
