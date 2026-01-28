/**
 * 人才庫與再接觸管理 API 路由
 * 
 * 端點列表:
 * - GET    /api/talent-pool              - 取得人才列表 (支援篩選、分頁)
 * - GET    /api/talent-pool/stats        - 取得統計資料
 * - GET    /api/talent-pool/:id          - 取得單一人才詳情
 * - POST   /api/talent-pool              - 新增人才到人才庫
 * - PUT    /api/talent-pool/:id          - 更新人才資料
 * - DELETE /api/talent-pool/:id          - 從人才庫移除人才
 * 
 * - GET    /api/talent-pool/:id/contacts - 取得聯繫紀錄
 * - POST   /api/talent-pool/:id/contacts - 新增聯繫紀錄
 * 
 * - GET    /api/talent-pool/reminders    - 取得提醒列表
 * - POST   /api/talent-pool/:id/reminders - 新增提醒
 * - PUT    /api/talent-pool/reminders/:reminderId - 更新提醒
 * - DELETE /api/talent-pool/reminders/:reminderId - 刪除提醒
 * 
 * - GET    /api/talent-pool/tags         - 取得所有標籤
 * - POST   /api/talent-pool/tags         - 新增標籤
 * - PUT    /api/talent-pool/tags/:tagId  - 更新標籤
 * - DELETE /api/talent-pool/tags/:tagId  - 刪除標籤
 * - POST   /api/talent-pool/:id/tags     - 為人才設定標籤
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prepare } = require('../db');

// =====================================================
// 人才庫 CRUD
// =====================================================

/**
 * GET /api/talent-pool
 * 取得人才列表 (支援篩選、分頁、搜尋)
 */
router.get('/', (req, res) => {
    try {
        const {
            status,
            source,
            priority,
            search,
            tags,
            minScore,
            maxScore,
            page = 1,
            limit = 20,
            sortBy = 'added_date',
            sortOrder = 'DESC'
        } = req.query;

        let query = `
            SELECT 
                tp.*,
                GROUP_CONCAT(DISTINCT tt.name) as tag_names,
                GROUP_CONCAT(DISTINCT tt.id) as tag_ids,
                GROUP_CONCAT(DISTINCT tt.color) as tag_colors
            FROM talent_pool tp
            LEFT JOIN talent_tag_mapping ttm ON tp.id = ttm.talent_id
            LEFT JOIN talent_tags tt ON ttm.tag_id = tt.id
            WHERE 1=1
        `;
        const params = [];

        // 篩選條件
        if (status) {
            query += ` AND tp.status = ?`;
            params.push(status);
        }
        if (source) {
            query += ` AND tp.source = ?`;
            params.push(source);
        }
        if (priority) {
            query += ` AND tp.contact_priority = ?`;
            params.push(priority);
        }
        if (search) {
            query += ` AND (tp.name LIKE ? OR tp.email LIKE ? OR tp.current_position LIKE ? OR tp.current_company LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern, searchPattern);
        }
        if (minScore) {
            query += ` AND tp.match_score >= ?`;
            params.push(parseInt(minScore));
        }
        if (maxScore) {
            query += ` AND tp.match_score <= ?`;
            params.push(parseInt(maxScore));
        }
        if (tags) {
            const tagList = tags.split(',');
            query += ` AND ttm.tag_id IN (${tagList.map(() => '?').join(',')})`;
            params.push(...tagList);
        }

        query += ` GROUP BY tp.id`;

        // 排序
        const validSortFields = ['added_date', 'last_contact_date', 'next_contact_date', 'match_score', 'name'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'added_date';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY tp.${sortField} ${order}`;

        // 分頁
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const talents = prepare(query).all(...params);

        // 轉換標籤格式
        const formattedTalents = talents.map(talent => ({
            ...talent,
            skills: talent.skills ? JSON.parse(talent.skills) : [],
            tags: talent.tag_ids ? talent.tag_ids.split(',').map((id, idx) => ({
                id,
                name: talent.tag_names.split(',')[idx],
                color: talent.tag_colors.split(',')[idx]
            })) : []
        }));

        // 取得總數
        let countQuery = `SELECT COUNT(DISTINCT tp.id) as total FROM talent_pool tp`;
        if (tags) {
            countQuery += ` LEFT JOIN talent_tag_mapping ttm ON tp.id = ttm.talent_id WHERE ttm.tag_id IN (${tags.split(',').map(() => '?').join(',')})`;
        }
        const countParams = tags ? tags.split(',') : [];
        const { total } = prepare(countQuery).get(...countParams);

        res.json({
            status: 'success',
            data: {
                talents: formattedTalents,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Error fetching talent pool:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/talent-pool/stats
 * 取得人才庫統計資料
 */
router.get('/stats', (req, res) => {
    try {

        // 總人數與狀態分佈
        const statusStats = prepare(`
            SELECT status, COUNT(*) as count
            FROM talent_pool
            GROUP BY status
        `).all();

        // 來源分佈
        const sourceStats = prepare(`
            SELECT source, COUNT(*) as count
            FROM talent_pool
            GROUP BY source
        `).all();

        // 本月聯繫數
        const thisMonth = new Date();
        const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
        const { contactedThisMonth } = prepare(`
            SELECT COUNT(*) as contactedThisMonth
            FROM talent_contact_history
            WHERE contact_date >= ?
        `).get(monthStart);

        // 今年錄用數
        const yearStart = new Date(thisMonth.getFullYear(), 0, 1).toISOString();
        const { hiredThisYear } = prepare(`
            SELECT COUNT(*) as hiredThisYear
            FROM talent_pool
            WHERE status = 'hired' AND updated_at >= ?
        `).get(yearStart);

        // 平均媒合分數
        const { avgMatchScore } = prepare(`
            SELECT AVG(match_score) as avgMatchScore
            FROM talent_pool
            WHERE match_score > 0
        `).get();

        // 即將到期的提醒
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 7);
        const { upcomingReminders } = prepare(`
            SELECT COUNT(*) as upcomingReminders
            FROM talent_reminders
            WHERE is_completed = 0 AND reminder_date <= ?
        `).get(tomorrow.toISOString());

        // 計算總數與百分比
        const totalCandidates = statusStats.reduce((sum, s) => sum + s.count, 0);
        const activeCount = statusStats.find(s => s.status === 'active')?.count || 0;

        const sourceBreakdown = sourceStats.map(s => ({
            source: s.source,
            count: s.count,
            percentage: totalCandidates > 0 ? Math.round((s.count / totalCandidates) * 100) : 0
        }));

        res.json({
            status: 'success',
            data: {
                totalCandidates,
                activeCount,
                contactedThisMonth: contactedThisMonth || 0,
                hiredThisYear: hiredThisYear || 0,
                avgMatchScore: Math.round(avgMatchScore || 0),
                sourceBreakdown,
                statusBreakdown: statusStats,
                upcomingReminders: upcomingReminders || 0
            }
        });
    } catch (error) {
        console.error('Error fetching talent pool stats:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/talent-pool/:id
 * 取得單一人才詳情
 */
router.get('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const talent = prepare(`
            SELECT tp.*,
                   GROUP_CONCAT(DISTINCT tt.id) as tag_ids,
                   GROUP_CONCAT(DISTINCT tt.name) as tag_names,
                   GROUP_CONCAT(DISTINCT tt.color) as tag_colors,
                   GROUP_CONCAT(DISTINCT tt.category) as tag_categories
            FROM talent_pool tp
            LEFT JOIN talent_tag_mapping ttm ON tp.id = ttm.talent_id
            LEFT JOIN talent_tags tt ON ttm.tag_id = tt.id
            WHERE tp.id = ?
            GROUP BY tp.id
        `).get(id);

        if (!talent) {
            return res.status(404).json({ status: 'error', message: 'Talent not found' });
        }

        // 取得聯繫紀錄
        const contactHistory = prepare(`
            SELECT * FROM talent_contact_history
            WHERE talent_id = ?
            ORDER BY contact_date DESC
        `).all(id);

        // 取得提醒事項
        const reminders = prepare(`
            SELECT * FROM talent_reminders
            WHERE talent_id = ?
            ORDER BY reminder_date ASC
        `).all(id);

        // 格式化標籤
        const tags = talent.tag_ids ? talent.tag_ids.split(',').map((tagId, idx) => ({
            id: tagId,
            name: talent.tag_names.split(',')[idx],
            color: talent.tag_colors.split(',')[idx],
            category: talent.tag_categories.split(',')[idx]
        })) : [];

        res.json({
            status: 'success',
            data: {
                ...talent,
                skills: talent.skills ? JSON.parse(talent.skills) : [],
                tags,
                contactHistory,
                reminders
            }
        });
    } catch (error) {
        console.error('Error fetching talent detail:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool
 * 新增人才到人才庫
 */
router.post('/', (req, res) => {
    try {
        const {
            candidateId,
            name,
            email,
            phone,
            avatar,
            currentPosition,
            currentCompany,
            experienceYears,
            education,
            expectedSalary,
            skills,
            resumeUrl,
            source,
            status,
            matchScore,
            contactPriority,
            declineStage,
            declineReason,
            originalJobId,
            originalJobTitle,
            notes,
            tags
        } = req.body;

        const id = uuidv4();
        const now = new Date().toISOString();

        prepare(`
            INSERT INTO talent_pool (
                id, candidate_id, name, email, phone, avatar,
                current_position, current_company, experience_years, education,
                expected_salary, skills, resume_url, source, status,
                match_score, contact_priority, decline_stage, decline_reason,
                original_job_id, original_job_title, notes, added_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, candidateId || null, name, email, phone, avatar,
            currentPosition, currentCompany, experienceYears || 0, education,
            expectedSalary, skills ? JSON.stringify(skills) : null, resumeUrl,
            source || 'other', status || 'active', matchScore || 0,
            contactPriority || 'medium', declineStage, declineReason,
            originalJobId, originalJobTitle, notes, now, now
        );

        // 設定標籤
        if (tags && Array.isArray(tags) && tags.length > 0) {
            const insertTag = prepare(`
                INSERT OR IGNORE INTO talent_tag_mapping (id, talent_id, tag_id)
                VALUES (?, ?, ?)
            `);
            tags.forEach(tagId => {
                insertTag.run(uuidv4(), id, tagId);
            });

            // 更新標籤使用次數
            prepare(`
                UPDATE talent_tags SET usage_count = usage_count + 1
                WHERE id IN (${tags.map(() => '?').join(',')})
            `).run(...tags);
        }

        res.json({
            status: 'success',
            data: { id },
            message: 'Talent added to pool successfully'
        });
    } catch (error) {
        console.error('Error adding talent:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * PUT /api/talent-pool/:id
 * 更新人才資料
 */
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const now = new Date().toISOString();

        // 檢查人才是否存在
        const existing = prepare(`SELECT id FROM talent_pool WHERE id = ?`).get(id);
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Talent not found' });
        }

        // 建構更新語句
        const allowedFields = [
            'name', 'email', 'phone', 'avatar', 'current_position', 'current_company',
            'experience_years', 'education', 'expected_salary', 'skills', 'resume_url',
            'source', 'status', 'match_score', 'contact_priority', 'decline_stage',
            'decline_reason', 'last_contact_date', 'next_contact_date', 'notes'
        ];

        const setClauses = [];
        const params = [];

        Object.entries(updates).forEach(([key, value]) => {
            // 轉換 camelCase 為 snake_case
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(snakeKey)) {
                setClauses.push(`${snakeKey} = ?`);
                params.push(snakeKey === 'skills' && Array.isArray(value) ? JSON.stringify(value) : value);
            }
        });

        if (setClauses.length === 0) {
            return res.status(400).json({ status: 'error', message: 'No valid fields to update' });
        }

        setClauses.push('updated_at = ?');
        params.push(now);
        params.push(id);

        prepare(`
            UPDATE talent_pool SET ${setClauses.join(', ')} WHERE id = ?
        `).run(...params);

        // 處理標籤更新
        if (updates.tags && Array.isArray(updates.tags)) {
            // 先移除舊標籤
            prepare(`DELETE FROM talent_tag_mapping WHERE talent_id = ?`).run(id);
            
            // 新增新標籤
            const insertTag = prepare(`
                INSERT OR IGNORE INTO talent_tag_mapping (id, talent_id, tag_id)
                VALUES (?, ?, ?)
            `);
            updates.tags.forEach(tagId => {
                insertTag.run(uuidv4(), id, tagId);
            });
        }

        res.json({
            status: 'success',
            message: 'Talent updated successfully'
        });
    } catch (error) {
        console.error('Error updating talent:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * DELETE /api/talent-pool/:id
 * 從人才庫移除人才
 */
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = prepare(`DELETE FROM talent_pool WHERE id = ?`).run(id);

        if (result.changes === 0) {
            return res.status(404).json({ status: 'error', message: 'Talent not found' });
        }

        res.json({
            status: 'success',
            message: 'Talent removed from pool'
        });
    } catch (error) {
        console.error('Error deleting talent:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// =====================================================
// 聯繫紀錄
// =====================================================

/**
 * GET /api/talent-pool/:id/contacts
 * 取得人才的聯繫紀錄
 */
router.get('/:id/contacts', (req, res) => {
    try {
        const { id } = req.params;

        const contacts = prepare(`
            SELECT * FROM talent_contact_history
            WHERE talent_id = ?
            ORDER BY contact_date DESC
        `).all(id);

        res.json({
            status: 'success',
            data: contacts
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool/:id/contacts
 * 新增聯繫紀錄
 */
router.post('/:id/contacts', (req, res) => {
    try {
        const { id: talentId } = req.params;
        const {
            contactDate,
            contactMethod,
            contactBy,
            summary,
            outcome,
            nextAction,
            nextActionDate
        } = req.body;

        const id = uuidv4();
        const now = new Date().toISOString();

        prepare(`
            INSERT INTO talent_contact_history (
                id, talent_id, contact_date, contact_method, contact_by,
                summary, outcome, next_action, next_action_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, talentId, contactDate || now, contactMethod, contactBy,
            summary, outcome, nextAction, nextActionDate, now
        );

        // 更新人才的聯繫資訊
        prepare(`
            UPDATE talent_pool SET
                last_contact_date = ?,
                next_contact_date = ?,
                contact_count = contact_count + 1,
                status = CASE WHEN status = 'active' THEN 'contacted' ELSE status END,
                updated_at = ?
            WHERE id = ?
        `).run(contactDate || now, nextActionDate, now, talentId);

        res.json({
            status: 'success',
            data: { id },
            message: 'Contact record added'
        });
    } catch (error) {
        console.error('Error adding contact:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// =====================================================
// 提醒事項
// =====================================================

/**
 * GET /api/talent-pool/reminders
 * 取得提醒列表 (支援篩選)
 */
router.get('/reminders/list', (req, res) => {
    try {
        const { completed, upcoming, assignedTo } = req.query;

        let query = `
            SELECT tr.*, tp.name as candidate_name
            FROM talent_reminders tr
            JOIN talent_pool tp ON tr.talent_id = tp.id
            WHERE 1=1
        `;
        const params = [];

        if (completed !== undefined) {
            query += ` AND tr.is_completed = ?`;
            params.push(completed === 'true' ? 1 : 0);
        }
        if (upcoming === 'true') {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            query += ` AND tr.reminder_date <= ? AND tr.is_completed = 0`;
            params.push(nextWeek.toISOString());
        }
        if (assignedTo) {
            query += ` AND tr.assigned_to = ?`;
            params.push(assignedTo);
        }

        query += ` ORDER BY tr.reminder_date ASC`;

        const reminders = prepare(query).all(...params);

        res.json({
            status: 'success',
            data: reminders
        });
    } catch (error) {
        console.error('Error fetching reminders:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool/:id/reminders
 * 新增提醒
 */
router.post('/:id/reminders', (req, res) => {
    try {
        const { id: talentId } = req.params;
        const {
            reminderDate,
            reminderType,
            message,
            assignedTo
        } = req.body;

        const id = uuidv4();
        const now = new Date().toISOString();

        prepare(`
            INSERT INTO talent_reminders (
                id, talent_id, reminder_date, reminder_type, message, assigned_to, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, talentId, reminderDate, reminderType, message, assignedTo, now);

        // 更新人才的下次聯繫日期
        prepare(`
            UPDATE talent_pool SET next_contact_date = ?, updated_at = ?
            WHERE id = ? AND (next_contact_date IS NULL OR next_contact_date > ?)
        `).run(reminderDate, now, talentId, reminderDate);

        res.json({
            status: 'success',
            data: { id },
            message: 'Reminder created'
        });
    } catch (error) {
        console.error('Error creating reminder:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * PUT /api/talent-pool/reminders/:reminderId
 * 更新提醒 (包含完成)
 */
router.put('/reminders/:reminderId', (req, res) => {
    try {
        const { reminderId } = req.params;
        const { isCompleted, reminderDate, reminderType, message, assignedTo } = req.body;
        const now = new Date().toISOString();

        const setClauses = ['updated_at = ?'];
        const params = [now];

        if (isCompleted !== undefined) {
            setClauses.push('is_completed = ?');
            params.push(isCompleted ? 1 : 0);
            if (isCompleted) {
                setClauses.push('completed_at = ?');
                params.push(now);
            }
        }
        if (reminderDate) {
            setClauses.push('reminder_date = ?');
            params.push(reminderDate);
        }
        if (reminderType) {
            setClauses.push('reminder_type = ?');
            params.push(reminderType);
        }
        if (message) {
            setClauses.push('message = ?');
            params.push(message);
        }
        if (assignedTo) {
            setClauses.push('assigned_to = ?');
            params.push(assignedTo);
        }

        params.push(reminderId);

        prepare(`
            UPDATE talent_reminders SET ${setClauses.join(', ')} WHERE id = ?
        `).run(...params);

        res.json({
            status: 'success',
            message: 'Reminder updated'
        });
    } catch (error) {
        console.error('Error updating reminder:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * DELETE /api/talent-pool/reminders/:reminderId
 * 刪除提醒
 */
router.delete('/reminders/:reminderId', (req, res) => {
    try {
        const { reminderId } = req.params;

        prepare(`DELETE FROM talent_reminders WHERE id = ?`).run(reminderId);

        res.json({
            status: 'success',
            message: 'Reminder deleted'
        });
    } catch (error) {
        console.error('Error deleting reminder:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// =====================================================
// 標籤管理
// =====================================================

/**
 * GET /api/talent-pool/tags
 * 取得所有標籤
 */
router.get('/tags/list', (req, res) => {
    try {
        const { category } = req.query;

        let query = `SELECT * FROM talent_tags`;
        const params = [];

        if (category) {
            query += ` WHERE category = ?`;
            params.push(category);
        }

        query += ` ORDER BY usage_count DESC, name ASC`;

        const tags = prepare(query).all(...params);

        res.json({
            status: 'success',
            data: tags
        });
    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool/tags
 * 新增標籤
 */
router.post('/tags', (req, res) => {
    try {
        const { name, color, category, description } = req.body;

        if (!name) {
            return res.status(400).json({ status: 'error', message: 'Tag name is required' });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        prepare(`
            INSERT INTO talent_tags (id, name, color, category, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(id, name, color || '#3B82F6', category || 'custom', description, now);

        res.json({
            status: 'success',
            data: { id, name, color: color || '#3B82F6', category: category || 'custom' },
            message: 'Tag created'
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ status: 'error', message: 'Tag name already exists' });
        }
        console.error('Error creating tag:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * PUT /api/talent-pool/tags/:tagId
 * 更新標籤
 */
router.put('/tags/:tagId', (req, res) => {
    try {
        const { tagId } = req.params;
        const { name, color, category, description } = req.body;
        const now = new Date().toISOString();

        prepare(`
            UPDATE talent_tags
            SET name = COALESCE(?, name),
                color = COALESCE(?, color),
                category = COALESCE(?, category),
                description = COALESCE(?, description),
                updated_at = ?
            WHERE id = ?
        `).run(name, color, category, description, now, tagId);

        res.json({
            status: 'success',
            message: 'Tag updated'
        });
    } catch (error) {
        console.error('Error updating tag:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * DELETE /api/talent-pool/tags/:tagId
 * 刪除標籤
 */
router.delete('/tags/:tagId', (req, res) => {
    try {
        const { tagId } = req.params;

        prepare(`DELETE FROM talent_tags WHERE id = ?`).run(tagId);

        res.json({
            status: 'success',
            message: 'Tag deleted'
        });
    } catch (error) {
        console.error('Error deleting tag:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool/:id/tags
 * 為人才設定標籤 (取代現有標籤)
 */
router.post('/:id/tags', (req, res) => {
    try {
        const { id: talentId } = req.params;
        const { tagIds } = req.body;

        if (!Array.isArray(tagIds)) {
            return res.status(400).json({ status: 'error', message: 'tagIds must be an array' });
        }

        // 移除舊標籤
        prepare(`DELETE FROM talent_tag_mapping WHERE talent_id = ?`).run(talentId);

        // 新增新標籤
        if (tagIds.length > 0) {
            const insertTag = prepare(`
                INSERT OR IGNORE INTO talent_tag_mapping (id, talent_id, tag_id)
                VALUES (?, ?, ?)
            `);
            tagIds.forEach(tagId => {
                insertTag.run(uuidv4(), talentId, tagId);
            });

            // 更新標籤使用次數
            prepare(`
                UPDATE talent_tags SET usage_count = usage_count + 1
                WHERE id IN (${tagIds.map(() => '?').join(',')})
            `).run(...tagIds);
        }

        res.json({
            status: 'success',
            message: 'Tags updated for talent'
        });
    } catch (error) {
        console.error('Error setting tags:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// =====================================================
// 從招募流程自動匯入
// =====================================================

/**
 * POST /api/talent-pool/import-from-candidate
 * 從候選人匯入到人才庫
 */
router.post('/import-from-candidate', (req, res) => {
    try {
        const {
            candidateId,
            declineStage,
            declineReason
        } = req.body;

        // 取得候選人資料
        const candidate = prepare(`
            SELECT c.*, j.title as job_title
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE c.id = ?
        `).get(candidateId);

        if (!candidate) {
            return res.status(404).json({ status: 'error', message: 'Candidate not found' });
        }

        // 檢查是否已在人才庫中
        const existing = prepare(`
            SELECT id FROM talent_pool WHERE candidate_id = ?
        `).get(candidateId);

        if (existing) {
            return res.status(400).json({
                status: 'error',
                message: 'Candidate already in talent pool',
                data: { talentId: existing.id }
            });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // 解析技能
        let skills = [];
        if (candidate.skills) {
            try {
                skills = JSON.parse(candidate.skills);
            } catch {
                skills = candidate.skills.split(',').map(s => s.trim());
            }
        }

        prepare(`
            INSERT INTO talent_pool (
                id, candidate_id, name, email, phone, avatar,
                current_position, current_company, experience_years, education,
                expected_salary, skills, resume_url, source, status,
                match_score, contact_priority, decline_stage, decline_reason,
                original_job_id, original_job_title, added_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            candidateId,
            candidate.name,
            candidate.email,
            candidate.phone,
            candidate.avatar,
            candidate.current_position,
            candidate.current_company,
            candidate.experience_years || 0,
            candidate.education,
            candidate.expected_salary,
            JSON.stringify(skills),
            candidate.resume_url,
            candidate.reg_source?.includes('104') ? '104' : 'website',
            'active',
            candidate.score || 0,
            'medium',
            declineStage,
            declineReason,
            candidate.job_id,
            candidate.job_title,
            now,
            now
        );

        res.json({
            status: 'success',
            data: { id },
            message: 'Candidate imported to talent pool'
        });
    } catch (error) {
        console.error('Error importing candidate:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool/import-declined
 * 批量匯入所有已婉拒的候選人到人才庫
 */
router.post('/import-declined', (req, res) => {
    try {

        // 找出所有已婉拒但尚未在人才庫中的候選人
        // offer_declined: 錄取後婉拒
        // rejected (stage='Rejected' 且有 invitation declined): 面試邀請婉拒
        const declinedCandidates = prepare(`
            SELECT c.*, j.title as job_title,
                   CASE 
                       WHEN c.status = 'offer_declined' THEN 'offer'
                       WHEN c.stage = 'Rejected' THEN 'invited'
                       ELSE 'interview'
                   END as decline_stage
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE (c.status = 'offer_declined' OR c.status = 'rejected' OR c.stage = 'Rejected' OR c.stage = 'OfferDeclined')
              AND c.id NOT IN (SELECT candidate_id FROM talent_pool WHERE candidate_id IS NOT NULL)
        `).all();

        if (declinedCandidates.length === 0) {
            return res.json({
                status: 'success',
                data: { imported: 0 },
                message: 'No declined candidates to import'
            });
        }

        const now = new Date().toISOString();
        let imported = 0;
        const importedIds = [];

        declinedCandidates.forEach(candidate => {
            try {
                const id = uuidv4();
                
                // 解析技能
                let skills = [];
                if (candidate.skills) {
                    try {
                        skills = JSON.parse(candidate.skills);
                    } catch {
                        skills = candidate.skills.split(',').map(s => s.trim()).filter(s => s);
                    }
                }

                // 判斷來源
                const source = candidate.reg_source?.includes('104') ? '104' : 'website';

                // 判斷婉拒原因
                let declineReason = '';
                if (candidate.status === 'offer_declined' || candidate.stage === 'OfferDeclined') {
                    declineReason = '錄取通知婉拒';
                } else if (candidate.stage === 'Rejected') {
                    declineReason = '面試邀請婉拒';
                } else {
                    declineReason = '招募流程婉拒';
                }

                prepare(`
                    INSERT INTO talent_pool (
                        id, candidate_id, name, email, phone, avatar,
                        current_position, current_company, experience_years, education,
                        expected_salary, skills, resume_url, source, status,
                        match_score, contact_priority, decline_stage, decline_reason,
                        original_job_id, original_job_title, added_date, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    id,
                    candidate.id,
                    candidate.name,
                    candidate.email,
                    candidate.phone,
                    candidate.avatar,
                    candidate.current_position,
                    candidate.current_company,
                    candidate.experience_years || 0,
                    candidate.education,
                    candidate.expected_salary,
                    JSON.stringify(skills),
                    candidate.resume_url,
                    source,
                    'active',
                    candidate.score || 0,
                    'medium',
                    candidate.decline_stage,
                    declineReason,
                    candidate.job_id,
                    candidate.job_title,
                    now,
                    now
                );

                imported++;
                importedIds.push({ id, name: candidate.name, candidateId: candidate.id });
                console.log(`[TalentPool] ✅ Imported: ${candidate.name} (${candidate.id})`);
            } catch (err) {
                console.error(`[TalentPool] ❌ Failed to import ${candidate.name}:`, err.message);
            }
        });

        res.json({
            status: 'success',
            data: { 
                imported,
                total: declinedCandidates.length,
                candidates: importedIds
            },
            message: `Successfully imported ${imported} declined candidates to talent pool`
        });
    } catch (error) {
        console.error('Error importing declined candidates:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
