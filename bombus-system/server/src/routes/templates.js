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
      SELECT id, name, version, is_active, created_at, updated_at
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
router.post('/', (req, res) => {
    try {
        const { name, pdf_base64, mapping_config } = req.body;

        const id = uuidv4();
        const mappingJson = mapping_config ? JSON.stringify(mapping_config) : null;

        prepare(`
      INSERT INTO templates (id, name, pdf_base64, mapping_config)
      VALUES (?, ?, ?, ?)
    `).run(id, name, pdf_base64, mappingJson);

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
        const { name, pdf_base64, mapping_config, is_active } = req.body;
        const { id } = req.params;

        const existing = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Template not found' });
        }

        const mappingJson = mapping_config ? JSON.stringify(mapping_config) : existing.mapping_config;

        prepare(`
      UPDATE templates 
      SET name = ?, pdf_base64 = ?, mapping_config = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
            name ?? existing.name,
            pdf_base64 ?? existing.pdf_base64,
            mappingJson,
            is_active ?? existing.is_active,
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
 * POST /api/onboarding/templates/:id/publish
 * 發布新版本
 */
router.post('/:id/publish', (req, res) => {
    try {
        const { id } = req.params;

        const template = prepare('SELECT * FROM templates WHERE id = ?').get(id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found' });
        }

        // 儲存當前版本到版本歷史
        const versionId = uuidv4();
        prepare(`
      INSERT INTO template_versions (id, template_id, version, mapping_config, pdf_base64)
      VALUES (?, ?, ?, ?, ?)
    `).run(versionId, id, template.version, template.mapping_config, template.pdf_base64);

        // 更新模板版本號
        prepare(`
      UPDATE templates SET version = version + 1, updated_at = datetime('now') WHERE id = ?
    `).run(id);

        const updated = prepare('SELECT * FROM templates WHERE id = ?').get(id);

        res.json({
            message: 'Template published successfully',
            version: updated ? updated.version : template.version + 1
        });
    } catch (error) {
        console.error('Error publishing template:', error);
        res.status(500).json({ error: 'Failed to publish template' });
    }
});

module.exports = router;
