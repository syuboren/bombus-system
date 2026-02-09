/**
 * 職能基準管理 API Routes
 * 提供核心職能、管理職能、專業職能、KSA 職能的 CRUD 操作
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prepare, getDb } = require('../db');

// =====================================================
// Helper Functions
// =====================================================

/**
 * 取得職能等級列表
 * @param {string} competencyId 職能 ID
 * @returns {Array} 等級列表
 */
function getCompetencyLevels(competencyId) {
    const rows = prepare(`
    SELECT level, indicators
    FROM competency_levels
    WHERE competency_id = ?
    ORDER BY level
  `).all(competencyId);

    return rows.map(row => ({
        level: row.level,
        indicators: JSON.parse(row.indicators || '[]')
    }));
}

/**
 * 取得 KSA 詳細資訊
 * @param {string} competencyId 職能 ID
 * @returns {Object} KSA 詳情
 */
function getKSADetails(competencyId) {
    const row = prepare(`
    SELECT behavior_indicators, linked_courses
    FROM competency_ksa_details
    WHERE competency_id = ?
  `).get(competencyId);

    if (!row) return null;

    return {
        behaviorIndicators: JSON.parse(row.behavior_indicators || '[]'),
        linkedCourses: JSON.parse(row.linked_courses || '[]')
    };
}

// =====================================================
// 職能 CRUD API
// =====================================================

/**
 * GET /api/competency-mgmt/:category
 * 取得職能列表
 * category: core | management | professional | ksa
 */
router.get('/:category', (req, res) => {
    try {
        const { category } = req.params;

        // 驗證 category
        const validCategories = ['core', 'management', 'professional', 'ksa'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: { code: 'INVALID_CATEGORY', message: '無效的職能類別' }
            });
        }

        // 取得職能列表
        const rows = prepare(`
      SELECT id, code, name, type, category, description, created_at, updated_at
      FROM competencies
      WHERE category = ?
      ORDER BY code
    `).all(category);

        // 根據類別轉換資料格式
        const competencies = rows.map(row => {
            const base = {
                id: row.id,
                code: row.code,
                name: row.name,
                type: row.type,
                category: row.category,
                description: row.description,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };

            if (category === 'ksa') {
                // KSA 職能：取得行為指標
                const details = getKSADetails(row.id);
                return {
                    ...base,
                    ksaType: row.type,
                    behaviorIndicators: details?.behaviorIndicators || [],
                    linkedCourses: details?.linkedCourses || []
                };
            } else {
                // 核心/管理/專業職能：取得等級指標
                const levels = getCompetencyLevels(row.id);
                return {
                    ...base,
                    definition: row.description,
                    levels
                };
            }
        });

        res.json({ success: true, data: competencies });
    } catch (error) {
        console.error('Error fetching competencies:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * GET /api/competency-mgmt/:category/:id
 * 取得單項職能詳情
 */
router.get('/:category/:id', (req, res) => {
    try {
        const { category, id } = req.params;

        const row = prepare(`
      SELECT id, code, name, type, category, description, created_at, updated_at
      FROM competencies
      WHERE id = ? AND category = ?
    `).get(id, category);

        if (!row) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '找不到此職能' }
            });
        }

        let competency = {
            id: row.id,
            code: row.code,
            name: row.name,
            type: row.type,
            category: row.category,
            description: row.description,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };

        if (category === 'ksa') {
            const details = getKSADetails(row.id);
            competency = {
                ...competency,
                ksaType: row.type,
                behaviorIndicators: details?.behaviorIndicators || [],
                linkedCourses: details?.linkedCourses || []
            };
        } else {
            const levels = getCompetencyLevels(row.id);
            competency = {
                ...competency,
                definition: row.description,
                levels
            };
        }

        res.json({ success: true, data: competency });
    } catch (error) {
        console.error('Error fetching competency:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * POST /api/competency-mgmt/:category
 * 新增職能
 */
router.post('/:category', (req, res) => {
    try {
        const { category } = req.params;
        const { code, name, type, description, levels, behaviorIndicators, linkedCourses } = req.body;

        // 驗證必填欄位
        if (!code || !name) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: '代碼和名稱為必填欄位' }
            });
        }

        // 檢查代碼是否重複
        const existing = prepare(`SELECT id FROM competencies WHERE code = ?`).get(code);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: { code: 'DUPLICATE_CODE', message: '職能代碼已存在' }
            });
        }

        const id = uuidv4();
        const now = new Date().toISOString();
        const competencyType = category === 'ksa' ? (type || 'knowledge') : category;

        // 新增職能主資料
        prepare(`
      INSERT INTO competencies (id, code, name, type, category, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, code, name, competencyType, category, description || '', now, now);

        if (category === 'ksa') {
            // 新增 KSA 詳細資訊
            const ksaId = uuidv4();
            prepare(`
        INSERT INTO competency_ksa_details (id, competency_id, behavior_indicators, linked_courses)
        VALUES (?, ?, ?, ?)
      `).run(
                ksaId,
                id,
                JSON.stringify(behaviorIndicators || []),
                JSON.stringify(linkedCourses || [])
            );
        } else {
            // 新增等級指標 (L1-L6)
            if (levels && Array.isArray(levels)) {
                levels.forEach(levelData => {
                    const levelId = uuidv4();
                    prepare(`
            INSERT INTO competency_levels (id, competency_id, level, indicators)
            VALUES (?, ?, ?, ?)
          `).run(levelId, id, levelData.level, JSON.stringify(levelData.indicators || []));
                });
            }
        }

        res.status(201).json({
            success: true,
            data: { id, code, name, category }
        });
    } catch (error) {
        console.error('Error creating competency:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * PUT /api/competency-mgmt/:category/:id
 * 更新職能
 */
router.put('/:category/:id', (req, res) => {
    try {
        const { category, id } = req.params;
        const { code, name, type, description, levels, behaviorIndicators, linkedCourses } = req.body;

        // 檢查職能是否存在
        const existing = prepare(`SELECT id, code FROM competencies WHERE id = ? AND category = ?`).get(id, category);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '找不到此職能' }
            });
        }

        // 檢查代碼是否與其他職能重複
        if (code && code !== existing.code) {
            const duplicate = prepare(`SELECT id FROM competencies WHERE code = ? AND id != ?`).get(code, id);
            if (duplicate) {
                return res.status(409).json({
                    success: false,
                    error: { code: 'DUPLICATE_CODE', message: '職能代碼已存在' }
                });
            }
        }

        const now = new Date().toISOString();
        const competencyType = category === 'ksa' ? (type || 'knowledge') : category;

        // 更新職能主資料
        prepare(`
      UPDATE competencies
      SET code = ?, name = ?, type = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(code || existing.code, name, competencyType, description || '', now, id);

        if (category === 'ksa') {
            // 更新 KSA 詳細資訊
            const ksaExists = prepare(`SELECT id FROM competency_ksa_details WHERE competency_id = ?`).get(id);
            if (ksaExists) {
                prepare(`
          UPDATE competency_ksa_details
          SET behavior_indicators = ?, linked_courses = ?
          WHERE competency_id = ?
        `).run(
                    JSON.stringify(behaviorIndicators || []),
                    JSON.stringify(linkedCourses || []),
                    id
                );
            } else {
                const ksaId = uuidv4();
                prepare(`
          INSERT INTO competency_ksa_details (id, competency_id, behavior_indicators, linked_courses)
          VALUES (?, ?, ?, ?)
        `).run(
                    ksaId,
                    id,
                    JSON.stringify(behaviorIndicators || []),
                    JSON.stringify(linkedCourses || [])
                );
            }
        } else {
            // 更新等級指標：先刪除再新增
            prepare(`DELETE FROM competency_levels WHERE competency_id = ?`).run(id);

            if (levels && Array.isArray(levels)) {
                levels.forEach(levelData => {
                    const levelId = uuidv4();
                    prepare(`
            INSERT INTO competency_levels (id, competency_id, level, indicators)
            VALUES (?, ?, ?, ?)
          `).run(levelId, id, levelData.level, JSON.stringify(levelData.indicators || []));
                });
            }
        }

        res.json({
            success: true,
            data: { id, code: code || existing.code, name, category }
        });
    } catch (error) {
        console.error('Error updating competency:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

/**
 * DELETE /api/competency-mgmt/:category/:id
 * 刪除職能 (硬刪除，含關聯資料)
 */
router.delete('/:category/:id', (req, res) => {
    try {
        const { category, id } = req.params;

        // 檢查職能是否存在
        const existing = prepare(`SELECT id FROM competencies WHERE id = ? AND category = ?`).get(id, category);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: '找不到此職能' }
            });
        }

        // 刪除關聯資料 (ON DELETE CASCADE 應自動處理，但確保安全)
        if (category === 'ksa') {
            prepare(`DELETE FROM competency_ksa_details WHERE competency_id = ?`).run(id);
        } else {
            prepare(`DELETE FROM competency_levels WHERE competency_id = ?`).run(id);
        }

        // 刪除職能主資料
        prepare(`DELETE FROM competencies WHERE id = ?`).run(id);

        res.json({ success: true, data: { deleted: true, id } });
    } catch (error) {
        console.error('Error deleting competency:', error);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: error.message }
        });
    }
});

module.exports = router;
