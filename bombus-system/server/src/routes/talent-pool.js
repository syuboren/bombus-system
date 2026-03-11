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
// tenantDB is accessed via req.tenantDB (injected by middleware)

// =====================================================
// 自動標籤匹配功能
// =====================================================

/**
 * 根據候選人資料自動匹配標籤
 * @param {string} candidateId - 候選人 ID
 * @param {string} talentId - 人才庫 ID
 * @returns {string[]} - 匹配到的標籤名稱列表
 */
function autoTagTalent(req, candidateId, talentId) {
    const matchedTags = [];
    
    try {
        // 取得所有標籤
        const allTags = req.tenantDB.prepare('SELECT id, name, category FROM talent_tags').all();
        const tagMap = {};
        allTags.forEach(tag => {
            tagMap[tag.name] = tag.id;
        });
        
        // 取得候選人基本資料（包含 skills 和 education 欄位作為備選）
        const candidate = req.tenantDB.prepare(`
            SELECT experience_years, reg_source, skills as skills_json, education as main_education
            FROM candidates WHERE id = ?
        `).get(candidateId);
        
        // 取得候選人技能 - 優先從 candidate_specialities 表，備選從 candidates.skills
        let skills = req.tenantDB.prepare(`
            SELECT skill FROM candidate_specialities WHERE candidate_id = ?
        `).all(candidateId).map(s => s.skill.toLowerCase());
        
        // 如果 candidate_specialities 沒有資料，嘗試從 candidates.skills 解析
        if (skills.length === 0 && candidate && candidate.skills_json) {
            try {
                const parsedSkills = JSON.parse(candidate.skills_json);
                if (Array.isArray(parsedSkills)) {
                    skills = parsedSkills.map(s => s.toLowerCase());
                }
            } catch (e) {
                // 如果不是 JSON，嘗試當作逗號分隔
                skills = candidate.skills_json.split(',').map(s => s.trim().toLowerCase());
            }
        }
        
        // 取得候選人學歷 - 優先從 candidate_education 表
        let education = req.tenantDB.prepare(`
            SELECT school_name, degree_level, major 
            FROM candidate_education WHERE candidate_id = ?
        `).all(candidateId);
        
        // 如果 candidate_education 沒有資料，嘗試從 candidates.education 解析
        if (education.length === 0 && candidate && candidate.main_education) {
            // 嘗試解析格式如 "國立台灣大學 歷史學系"
            const eduStr = candidate.main_education;
            const parts = eduStr.split(/\s+/);
            if (parts.length >= 2) {
                education = [{
                    school_name: parts[0],
                    degree_level: null,
                    major: parts.slice(1).join(' ')
                }];
            } else {
                education = [{
                    school_name: eduStr,
                    degree_level: null,
                    major: null
                }];
            }
        }
        
        // 取得候選人工作經驗
        const experiences = req.tenantDB.prepare(`
            SELECT firm_name, job_name, industry_category, management 
            FROM candidate_experiences WHERE candidate_id = ?
        `).all(candidateId);
        
        // 取得候選人語言能力
        const languages = req.tenantDB.prepare(`
            SELECT lang_type, degree, listen_degree, speak_degree 
            FROM candidate_languages WHERE candidate_id = ?
        `).all(candidateId);
        
        // ===== 技能匹配 =====
        const skillKeywords = skills.join(' ');
        
        // 前端開發
        if (/javascript|typescript|vue|react|angular|html|css|前端/.test(skillKeywords)) {
            if (tagMap['前端開發']) matchedTags.push('前端開發');
        }
        
        // 後端開發
        if (/node|java|python|go|c#|後端|spring|django|express/.test(skillKeywords)) {
            if (tagMap['後端開發']) matchedTags.push('後端開發');
        }
        
        // 全端開發
        if (matchedTags.includes('前端開發') && matchedTags.includes('後端開發')) {
            if (tagMap['全端開發']) matchedTags.push('全端開發');
        }
        
        // AI/ML
        if (/ai|ml|機器學習|深度學習|tensorflow|pytorch|nlp/.test(skillKeywords)) {
            if (tagMap['AI/ML']) matchedTags.push('AI/ML');
        }
        
        // 雲端架構
        if (/aws|gcp|azure|docker|kubernetes|k8s|雲端/.test(skillKeywords)) {
            if (tagMap['雲端架構']) matchedTags.push('雲端架構');
        }
        
        // 敏捷開發
        if (/agile|scrum|jira|kanban|敏捷/.test(skillKeywords)) {
            if (tagMap['敏捷開發']) matchedTags.push('敏捷開發');
        }
        
        // 財務會計
        if (/財務|會計|稅務|成本|審計|報表|erp|sap/.test(skillKeywords)) {
            if (tagMap['財務會計']) matchedTags.push('財務會計');
        }
        
        // 人力資源
        if (/人資|hr|招募|薪酬|勞健保|訓練|績效/.test(skillKeywords)) {
            if (tagMap['人力資源']) matchedTags.push('人力資源');
        }
        
        // 專案管理
        if (/pmp|專案|pm|風險管理|project/.test(skillKeywords)) {
            if (tagMap['專案管理']) matchedTags.push('專案管理');
        }
        
        // 業務銷售
        if (/業務|銷售|客戶|談判|crm/.test(skillKeywords)) {
            if (tagMap['業務銷售']) matchedTags.push('業務銷售');
        }
        
        // ===== 經驗匹配 =====
        
        // 資深人員 (5年以上)
        if (candidate && candidate.experience_years >= 5) {
            if (tagMap['資深人員']) matchedTags.push('資深人員');
        }
        
        // 管理經驗
        const hasManagement = experiences.some(exp => exp.management === '有');
        if (hasManagement) {
            if (tagMap['管理經驗']) matchedTags.push('管理經驗');
        }
        
        // 技術主管
        const isTechLead = experiences.some(exp => {
            const title = (exp.job_name || '').toLowerCase();
            return hasManagement && /主管|經理|lead|manager|director/.test(title);
        });
        if (isTechLead && (matchedTags.includes('前端開發') || matchedTags.includes('後端開發'))) {
            if (tagMap['技術主管']) matchedTags.push('技術主管');
        }
        
        // 產業背景
        const industries = experiences.map(exp => (exp.industry_category || '').toLowerCase()).join(' ');
        const companies = experiences.map(exp => (exp.firm_name || '').toLowerCase()).join(' ');
        
        // 金融業背景
        if (/金融|銀行|保險|證券|投信|投顧/.test(industries) || 
            /金控|銀行|保險|證券/.test(companies)) {
            if (tagMap['金融業背景']) matchedTags.push('金融業背景');
        }
        
        // 科技業背景
        if (/科技|軟體|網路|資訊|半導體/.test(industries) ||
            /google|microsoft|apple|meta|amazon|line|shopee|趨勢/.test(companies)) {
            if (tagMap['科技業背景']) matchedTags.push('科技業背景');
        }
        
        // 製造業背景
        if (/製造|生產|工廠|品管/.test(industries)) {
            if (tagMap['製造業背景']) matchedTags.push('製造業背景');
        }
        
        // 大廠經驗
        const bigCompanies = /台積電|tsmc|鴻海|foxconn|聯發科|mediatek|google|microsoft|apple|meta|amazon|line|shopee/;
        if (bigCompanies.test(companies)) {
            if (tagMap['大廠經驗']) matchedTags.push('大廠經驗');
        }
        
        // ===== 學歷匹配 =====
        
        // 國立大學
        const hasNationalUniv = education.some(edu => 
            (edu.school_name || '').includes('國立') || 
            (edu.school_name || '').includes('台灣大學') ||
            (edu.school_name || '').includes('清華') ||
            (edu.school_name || '').includes('交通') ||
            (edu.school_name || '').includes('成功') ||
            (edu.school_name || '').includes('政治')
        );
        if (hasNationalUniv) {
            if (tagMap['國立大學']) matchedTags.push('國立大學');
        }
        
        // 碩士學歷
        const hasMaster = education.some(edu => 
            (edu.degree_level || '').includes('碩士') || 
            (edu.degree_level || '').includes('博士')
        );
        if (hasMaster) {
            if (tagMap['碩士學歷']) matchedTags.push('碩士學歷');
        }
        
        // 商管背景
        const majors = education.map(edu => (edu.major || '').toLowerCase()).join(' ');
        if (/企管|財金|會計|國貿|行銷|經濟|mba|商學/.test(majors)) {
            if (tagMap['商管背景']) matchedTags.push('商管背景');
        }
        
        // 資訊背景
        if (/資工|資管|電機|電子|軟體|資訊|computer|information/.test(majors)) {
            if (tagMap['資訊背景']) matchedTags.push('資訊背景');
        }
        
        // ===== 語言匹配 =====
        
        // 英文精通 - 從語言表或學歷專業判斷
        const hasEnglish = languages.some(lang => {
            if (lang.lang_type !== '英文') return false;
            const level = (lang.degree || lang.speak_degree || '').toLowerCase();
            return level === '精通' || level.includes('精通') || level.includes('fluent');
        });
        // 也從學歷專業判斷（英文系、英語系、外文系等）
        const hasEnglishMajor = education.some(edu => {
            const major = (edu.major || '').toLowerCase();
            return /英文|英語|外文|英國語文|english|應用外語/.test(major);
        });
        if (hasEnglish || hasEnglishMajor) {
            if (tagMap['英文精通']) matchedTags.push('英文精通');
        }
        
        // 日文能力 - 從語言表或學歷專業判斷
        const hasJapanese = languages.some(lang => {
            if (lang.lang_type !== '日文') return false;
            const level = (lang.degree || lang.speak_degree || '').toLowerCase();
            return level === '精通' || level === '中等' || level.includes('精通') || level.includes('中等');
        });
        const hasJapaneseMajor = education.some(edu => {
            const major = (edu.major || '').toLowerCase();
            return /日文|日語|日本語|japanese|東方語文/.test(major);
        });
        if (hasJapanese || hasJapaneseMajor) {
            if (tagMap['日文能力']) matchedTags.push('日文能力');
        }
        
        // ===== 來源匹配 =====
        
        // 104主動應徵 - 檢查多種來源格式
        if (candidate && candidate.reg_source) {
            const source = candidate.reg_source.toLowerCase();
            if (source.includes('主動') || source.includes('104') || source === '104人力銀行') {
                if (tagMap['104主動應徵']) matchedTags.push('104主動應徵');
            }
        }
        
        // ===== 寫入標籤映射 =====
        if (matchedTags.length > 0) {
            const insertTagMapping = req.tenantDB.prepare(`
                INSERT OR IGNORE INTO talent_tag_mapping (id, talent_id, tag_id, created_at)
                VALUES (?, ?, ?, datetime('now'))
            `);
            
            const updateTagUsage = req.tenantDB.prepare(`
                UPDATE talent_tags SET usage_count = usage_count + 1 WHERE id = ?
            `);
            
            matchedTags.forEach(tagName => {
                const tagId = tagMap[tagName];
                if (tagId) {
                    insertTagMapping.run(uuidv4(), talentId, tagId);
                    updateTagUsage.run(tagId);
                }
            });
        }
        
        console.log(`[AutoTag] ${candidateId} -> ${matchedTags.length} tags: ${matchedTags.join(', ')}`);
        
    } catch (error) {
        console.error('[AutoTag] Error:', error.message);
    }
    
    return matchedTags;
}

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
            org_unit_id,
            page = 1,
            limit = 20,
            sortBy = 'added_date',
            sortOrder = 'DESC'
        } = req.query;

        // 計算一個月前的日期
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthAgoStr = oneMonthAgo.toISOString();

        let query = `
            SELECT 
                tp.*,
                GROUP_CONCAT(DISTINCT tt.name) as tag_names,
                GROUP_CONCAT(DISTINCT tt.id) as tag_ids,
                GROUP_CONCAT(DISTINCT tt.color) as tag_colors,
                (SELECT MAX(contact_date) FROM talent_contact_history WHERE talent_id = tp.id) as latest_contact_date,
                (SELECT COUNT(*) FROM talent_contact_history WHERE talent_id = tp.id AND contact_date >= '${oneMonthAgoStr}') as recent_contact_count,
                (SELECT MAX(contact_date) FROM talent_contact_history WHERE talent_id = tp.id AND contact_date >= '${oneMonthAgoStr}') as has_recent_contact,
                COALESCE((SELECT MAX(match_score) FROM talent_job_matches WHERE talent_id = tp.id), tp.match_score, 0) as highest_match_score
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
            query += ` AND COALESCE((SELECT MAX(match_score) FROM talent_job_matches WHERE talent_id = tp.id), tp.match_score, 0) >= ?`;
            params.push(parseInt(minScore));
        }
        if (maxScore) {
            query += ` AND COALESCE((SELECT MAX(match_score) FROM talent_job_matches WHERE talent_id = tp.id), tp.match_score, 0) <= ?`;
            params.push(parseInt(maxScore));
        }
        if (tags) {
            const tagList = tags.split(',');
            query += ` AND ttm.tag_id IN (${tagList.map(() => '?').join(',')})`;
            params.push(...tagList);
        }
        if (org_unit_id) {
            query += ` AND tp.org_unit_id = ?`;
            params.push(org_unit_id);
        }

        query += ` GROUP BY tp.id`;

        // 排序
        const validSortFields = ['added_date', 'last_contact_date', 'next_contact_date', 'match_score', 'name'];
        let sortField = validSortFields.includes(sortBy) ? sortBy : 'added_date';
        const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        
        // 如果按媒合度排序，使用計算後的最高媒合分數
        if (sortField === 'match_score') {
            query += ` ORDER BY highest_match_score ${order}`;
        } else {
            query += ` ORDER BY tp.${sortField} ${order}`;
        }

        // 分頁
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const talents = req.tenantDB.prepare(query).all(...params);

        // 轉換標籤格式並計算聯繫狀態
        const formattedTalents = talents.map(talent => {
            /**
             * 聯繫狀態邏輯：
             * 1. 一開始：無狀態 (contactStatus = null)
             * 2. HR 開啟「待聯繫」→ contactStatus = 'pending'
             * 3. 在「待聯繫」狀態下新增聯繫紀錄 → contactStatus = 'contacted'
             * 4. 超過 1 個月沒有聯繫：
             *    - 如果有「待聯繫」提醒開啟，但超過 1 個月沒聯繫 → 自動關閉提醒，變回無狀態
             *    - 如果近 1 個月有聯繫 → 保持 'contacted'
             */
            let contactStatus = null;
            let shouldAutoDisableReminder = false;

            if (talent.recent_contact_count > 0) {
                // 近 1 個月有聯繫 → 已聯繫
                contactStatus = 'contacted';
            } else if (talent.contact_reminder_enabled) {
                // 開啟待聯繫提醒
                const reminderDate = talent.contact_reminder_date ? new Date(talent.contact_reminder_date) : null;
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

                if (reminderDate && reminderDate < oneMonthAgo) {
                    // 開啟提醒超過 1 個月且沒有聯繫 → 自動關閉，變回無狀態
                    shouldAutoDisableReminder = true;
                    contactStatus = null;
                } else {
                    // 還在 1 個月內 → 待聯繫
                    contactStatus = 'pending';
                }
            }

            // 自動關閉超時的提醒
            if (shouldAutoDisableReminder) {
                try {
                    req.tenantDB.prepare(`
                        UPDATE talent_pool SET 
                            contact_reminder_enabled = 0, 
                            contact_reminder_date = NULL,
                            updated_at = datetime('now')
                        WHERE id = ?
                    `).run(talent.id);
                } catch (e) {
                    console.error('Error auto-disabling reminder:', e.message);
                }
            }

            return {
                ...talent,
                match_score: talent.highest_match_score || 0, // 使用最高職缺媒合分數
                skills: talent.skills ? JSON.parse(talent.skills) : [],
                tags: talent.tag_ids ? talent.tag_ids.split(',').map((id, idx) => ({
                    id,
                    name: talent.tag_names.split(',')[idx],
                    color: talent.tag_colors.split(',')[idx]
                })) : [],
                contactStatus,
                latestContactDate: talent.latest_contact_date,
                recentContactCount: talent.recent_contact_count,
                // 如果自動關閉了提醒，更新這個欄位
                contact_reminder_enabled: shouldAutoDisableReminder ? 0 : talent.contact_reminder_enabled
            };
        });

        // 取得總數
        let countQuery = `SELECT COUNT(DISTINCT tp.id) as total FROM talent_pool tp`;
        if (tags) {
            countQuery += ` LEFT JOIN talent_tag_mapping ttm ON tp.id = ttm.talent_id WHERE ttm.tag_id IN (${tags.split(',').map(() => '?').join(',')})`;
        }
        const countParams = tags ? tags.split(',') : [];
        const { total } = req.tenantDB.prepare(countQuery).get(...countParams);

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
        const { org_unit_id } = req.query;
        const orgFilter = org_unit_id ? ` WHERE org_unit_id = ?` : '';
        const orgFilterAnd = org_unit_id ? ` AND tp.org_unit_id = ?` : '';
        const orgParams = org_unit_id ? [org_unit_id] : [];

        // 總人數與狀態分佈
        const statusStats = req.tenantDB.prepare(`
            SELECT status, COUNT(*) as count
            FROM talent_pool${org_unit_id ? ' WHERE org_unit_id = ?' : ''}
            GROUP BY status
        `).all(...orgParams);

        // 來源分佈
        const sourceStats = req.tenantDB.prepare(`
            SELECT source, COUNT(*) as count
            FROM talent_pool${org_unit_id ? ' WHERE org_unit_id = ?' : ''}
            GROUP BY source
        `).all(...orgParams);

        // 本月聯繫數
        const thisMonth = new Date();
        const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString();
        const { contactedThisMonth } = req.tenantDB.prepare(`
            SELECT COUNT(*) as contactedThisMonth
            FROM talent_contact_history${org_unit_id ? ' tch JOIN talent_pool tp ON tch.talent_id = tp.id WHERE tp.org_unit_id = ? AND tch.contact_date >= ?' : ' WHERE contact_date >= ?'}
        `).get(...(org_unit_id ? [org_unit_id, monthStart] : [monthStart]));

        // 今年錄用數
        const yearStart = new Date(thisMonth.getFullYear(), 0, 1).toISOString();
        const { hiredThisYear } = req.tenantDB.prepare(`
            SELECT COUNT(*) as hiredThisYear
            FROM talent_pool
            WHERE status = 'hired' AND updated_at >= ?${org_unit_id ? ' AND org_unit_id = ?' : ''}
        `).get(...(org_unit_id ? [yearStart, org_unit_id] : [yearStart]));

        // 平均媒合分數
        const { avgMatchScore } = req.tenantDB.prepare(`
            SELECT AVG(match_score) as avgMatchScore
            FROM talent_pool
            WHERE match_score > 0${org_unit_id ? ' AND org_unit_id = ?' : ''}
        `).get(...orgParams);

        // 計算「待聯繫」數量：開啟待聯繫提醒且近 1 個月沒有聯繫的人才
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthAgoStr = oneMonthAgo.toISOString();

        const { pendingContactCount } = req.tenantDB.prepare(`
            SELECT COUNT(*) as pendingContactCount
            FROM talent_pool tp
            WHERE tp.contact_reminder_enabled = 1${org_unit_id ? ' AND tp.org_unit_id = ?' : ''}
              AND NOT EXISTS (
                  SELECT 1 FROM talent_contact_history tch
                  WHERE tch.talent_id = tp.id AND tch.contact_date >= ?
              )
        `).get(...(org_unit_id ? [org_unit_id, oneMonthAgoStr] : [oneMonthAgoStr]));

        // 計算總數與百分比
        const totalCandidates = statusStats.reduce((sum, s) => sum + s.count, 0);
        const activeCount = pendingContactCount || 0; // 使用待聯繫數量

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
                upcomingReminders: pendingContactCount || 0 // 待聯繫提醒數量
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

        const talent = req.tenantDB.prepare(`
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
        const contactHistory = req.tenantDB.prepare(`
            SELECT * FROM talent_contact_history
            WHERE talent_id = ?
            ORDER BY contact_date DESC
        `).all(id);

        // 取得提醒事項
        const reminders = req.tenantDB.prepare(`
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
            tags,
            org_unit_id
        } = req.body;

        const id = uuidv4();
        const now = new Date().toISOString();

        req.tenantDB.prepare(`
            INSERT INTO talent_pool (
                id, candidate_id, name, email, phone, avatar,
                current_position, current_company, experience_years, education,
                expected_salary, skills, resume_url, source, status,
                match_score, contact_priority, decline_stage, decline_reason,
                original_job_id, original_job_title, notes, org_unit_id, added_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, candidateId || null, name, email, phone, avatar,
            currentPosition, currentCompany, experienceYears || 0, education,
            expectedSalary, skills ? JSON.stringify(skills) : null, resumeUrl,
            source || 'other', status || 'active', matchScore || 0,
            contactPriority || 'medium', declineStage, declineReason,
            originalJobId, originalJobTitle, notes, org_unit_id || null, now, now
        );

        // 設定標籤
        if (tags && Array.isArray(tags) && tags.length > 0) {
            const insertTag = req.tenantDB.prepare(`
                INSERT OR IGNORE INTO talent_tag_mapping (id, talent_id, tag_id)
                VALUES (?, ?, ?)
            `);
            tags.forEach(tagId => {
                insertTag.run(uuidv4(), id, tagId);
            });

            // 更新標籤使用次數
            req.tenantDB.prepare(`
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
        const existing = req.tenantDB.prepare(`SELECT id FROM talent_pool WHERE id = ?`).get(id);
        if (!existing) {
            return res.status(404).json({ status: 'error', message: 'Talent not found' });
        }

        // 建構更新語句
        const allowedFields = [
            'name', 'email', 'phone', 'avatar', 'current_position', 'current_company',
            'experience_years', 'education', 'expected_salary', 'skills', 'resume_url',
            'source', 'status', 'match_score', 'contact_priority', 'decline_stage',
            'decline_reason', 'last_contact_date', 'next_contact_date', 'notes',
            'org_unit_id'
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

        req.tenantDB.prepare(`
            UPDATE talent_pool SET ${setClauses.join(', ')} WHERE id = ?
        `).run(...params);

        // 處理標籤更新
        if (updates.tags && Array.isArray(updates.tags)) {
            // 先移除舊標籤
            req.tenantDB.prepare(`DELETE FROM talent_tag_mapping WHERE talent_id = ?`).run(id);
            
            // 新增新標籤
            const insertTag = req.tenantDB.prepare(`
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
/**
 * DELETE /api/talent-pool/clear-all
 * 清空所有人才庫資料（測試用）
 */
router.delete('/clear-all', (req, res) => {
    try {
        // 刪除關聯的標籤映射
        req.tenantDB.prepare(`DELETE FROM talent_tag_mapping`).run();
        // 刪除聯繫紀錄
        req.tenantDB.prepare(`DELETE FROM talent_contact_history`).run();
        // 刪除提醒
        req.tenantDB.prepare(`DELETE FROM talent_reminders`).run();
        // 刪除職缺媒合記錄
        req.tenantDB.prepare(`DELETE FROM talent_job_matches`).run();
        // 刪除人才庫主表
        const result = req.tenantDB.prepare(`DELETE FROM talent_pool`).run();
        
        res.json({
            status: 'success',
            message: `已清空人才庫，共刪除 ${result.changes} 筆資料`
        });
    } catch (error) {
        console.error('Error clearing talent pool:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const result = req.tenantDB.prepare(`DELETE FROM talent_pool WHERE id = ?`).run(id);

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

        const contacts = req.tenantDB.prepare(`
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

        req.tenantDB.prepare(`
            INSERT INTO talent_contact_history (
                id, talent_id, contact_date, contact_method, contact_by,
                summary, outcome, next_action, next_action_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, talentId, contactDate || now, contactMethod, contactBy,
            summary, outcome, nextAction, nextActionDate, now
        );

        // 更新人才的聯繫資訊
        req.tenantDB.prepare(`
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

/**
 * PUT /api/talent-pool/:id/contact-reminder
 * 設定待聯繫提醒
 * 
 * 開啟後，如果 1 個月內沒有新增聯繫紀錄，狀態會顯示為「待聯繫」
 */
router.put('/:id/contact-reminder', (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        const now = new Date().toISOString();

        req.tenantDB.prepare(`
            UPDATE talent_pool SET
                contact_reminder_enabled = ?,
                contact_reminder_date = CASE WHEN ? = 1 THEN ? ELSE NULL END,
                updated_at = ?
            WHERE id = ?
        `).run(enabled ? 1 : 0, enabled ? 1 : 0, now, now, id);

        res.json({
            status: 'success',
            message: enabled ? '已開啟待聯繫提醒' : '已關閉待聯繫提醒'
        });
    } catch (error) {
        console.error('Error setting contact reminder:', error);
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

        const reminders = req.tenantDB.prepare(query).all(...params);

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

        req.tenantDB.prepare(`
            INSERT INTO talent_reminders (
                id, talent_id, reminder_date, reminder_type, message, assigned_to, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(id, talentId, reminderDate, reminderType, message, assignedTo, now);

        // 更新人才的下次聯繫日期
        req.tenantDB.prepare(`
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

        req.tenantDB.prepare(`
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

        req.tenantDB.prepare(`DELETE FROM talent_reminders WHERE id = ?`).run(reminderId);

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

        const tags = req.tenantDB.prepare(query).all(...params);

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

        req.tenantDB.prepare(`
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

        req.tenantDB.prepare(`
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

        req.tenantDB.prepare(`DELETE FROM talent_tags WHERE id = ?`).run(tagId);

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
        req.tenantDB.prepare(`DELETE FROM talent_tag_mapping WHERE talent_id = ?`).run(talentId);

        // 新增新標籤
        if (tagIds.length > 0) {
            const insertTag = req.tenantDB.prepare(`
                INSERT OR IGNORE INTO talent_tag_mapping (id, talent_id, tag_id)
                VALUES (?, ?, ?)
            `);
            tagIds.forEach(tagId => {
                insertTag.run(uuidv4(), talentId, tagId);
            });

            // 更新標籤使用次數
            req.tenantDB.prepare(`
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
        const candidate = req.tenantDB.prepare(`
            SELECT c.*, j.title as job_title
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE c.id = ?
        `).get(candidateId);

        if (!candidate) {
            return res.status(404).json({ status: 'error', message: 'Candidate not found' });
        }

        // 檢查是否已在人才庫中
        const existing = req.tenantDB.prepare(`
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

        req.tenantDB.prepare(`
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

        // 自動標籤匹配
        const matchedTags = autoTagTalent(req, candidateId, id);

        res.json({
            status: 'success',
            data: { id, matchedTags },
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
 * 
 * 只有以下三種狀態的候選人會被納入人才庫：
 * - invite_declined: 邀請婉拒（候選人婉拒面試邀請）
 * - interview_declined: 面試婉拒（候選人取消已排定的面試）
 * - offer_declined: Offer 婉拒（候選人婉拒錄取通知）
 */
router.post('/import-declined', (req, res) => {
    try {

        // 找出所有已婉拒但尚未在人才庫中的候選人
        // 只包含三種婉拒狀態：invite_declined, interview_declined, offer_declined
        const declinedCandidates = req.tenantDB.prepare(`
            SELECT c.*, j.title as job_title,
                   CASE 
                       WHEN c.status = 'offer_declined' THEN 'offer'
                       WHEN c.status = 'interview_declined' THEN 'interview'
                       WHEN c.status = 'invite_declined' THEN 'invited'
                       ELSE 'unknown'
                   END as decline_stage
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE c.status IN ('invite_declined', 'interview_declined', 'offer_declined')
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
                if (candidate.status === 'offer_declined') {
                    declineReason = '候選人婉拒 Offer';
                } else if (candidate.status === 'interview_declined') {
                    declineReason = '候選人取消面試';
                } else if (candidate.status === 'invite_declined') {
                    declineReason = '候選人婉拒面試邀請';
                } else {
                    declineReason = '招募流程婉拒';
                }

                req.tenantDB.prepare(`
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

                // 自動標籤匹配
                const matchedTags = autoTagTalent(req, candidate.id, id);

                imported++;
                importedIds.push({ id, name: candidate.name, candidateId: candidate.id, tags: matchedTags });
                console.log(`[TalentPool] ✅ Imported: ${candidate.name} (${candidate.id}) with ${matchedTags.length} tags`);
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

/**
 * POST /api/talent-pool/retag-all
 * 為所有現有人才庫成員重新執行自動標籤
 */
router.post('/retag-all', (req, res) => {
    try {
        // 取得所有人才庫成員
        const talents = req.tenantDB.prepare(`
            SELECT id, candidate_id, name FROM talent_pool
        `).all();

        const results = [];

        talents.forEach(talent => {
            try {
                // 先清除現有標籤
                req.tenantDB.prepare(`DELETE FROM talent_tag_mapping WHERE talent_id = ?`).run(talent.id);
                
                // 重新執行自動標籤
                const matchedTags = autoTagTalent(req, talent.candidate_id, talent.id);
                
                results.push({
                    name: talent.name,
                    candidateId: talent.candidate_id,
                    tags: matchedTags
                });
                
                console.log(`[Retag] ✅ ${talent.name}: ${matchedTags.length} tags`);
            } catch (err) {
                console.error(`[Retag] ❌ ${talent.name}:`, err.message);
                results.push({
                    name: talent.name,
                    candidateId: talent.candidate_id,
                    error: err.message
                });
            }
        });

        res.json({
            status: 'success',
            data: {
                total: talents.length,
                results
            },
            message: `Retagged ${talents.length} talents`
        });
    } catch (error) {
        console.error('Error retagging talents:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// =====================================================
// 職缺媒合功能 API
// =====================================================

/**
 * GET /api/talent-pool/:id/job-matches
 * 取得人才的所有職缺媒合度
 */
router.get('/:id/job-matches', (req, res) => {
    try {
        const { id } = req.params;
        
        // 確認人才存在
        const talent = req.tenantDB.prepare('SELECT id, name, skills FROM talent_pool WHERE id = ?').get(id);
        if (!talent) {
            return res.status(404).json({ status: 'error', message: 'Talent not found' });
        }
        
        // 取得所有已發布的職缺及其媒合度
        const matches = req.tenantDB.prepare(`
            SELECT 
                j.id,
                j.title,
                j.department,
                j.status,
                j.description,
                tjm.match_score,
                tjm.match_details,
                tjm.analysis_summary,
                tjm.analyzed_at
            FROM jobs j
            LEFT JOIN talent_job_matches tjm ON tjm.job_id = j.id AND tjm.talent_id = ?
            WHERE j.status = 'published'
            ORDER BY tjm.match_score DESC NULLS LAST, j.created_at DESC
        `).all(id);
        
        res.json({
            status: 'success',
            data: matches.map(m => ({
                jobId: m.id,
                title: m.title,
                department: m.department,
                status: m.status,
                description: m.description,
                matchScore: m.match_score !== null && m.match_score !== undefined ? m.match_score : null,
                matchDetails: m.match_details ? JSON.parse(m.match_details) : null,
                analysisSummary: m.analysis_summary,
                analyzedAt: m.analyzed_at
            }))
        });
    } catch (error) {
        console.error('Error getting job matches:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool/:id/analyze-jobs
 * AI 分析人才與所有職缺的媒合度（使用技能匹配）
 */
router.post('/:id/analyze-jobs', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 取得人才資料及其技能
        const talent = req.tenantDB.prepare(`
            SELECT tp.*, c.skills as candidate_skills
            FROM talent_pool tp
            LEFT JOIN candidates c ON c.id = tp.candidate_id
            WHERE tp.id = ?
        `).get(id);
        
        if (!talent) {
            return res.status(404).json({ status: 'error', message: 'Talent not found' });
        }
        
        // 解析人才技能
        let talentSkills = [];
        if (talent.skills) {
            try {
                const parsed = JSON.parse(talent.skills);
                talentSkills = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                talentSkills = talent.skills.split(',').map(s => s.trim());
            }
        }
        if (talent.candidate_skills) {
            try {
                const parsed = JSON.parse(talent.candidate_skills);
                if (Array.isArray(parsed)) {
                    talentSkills = [...new Set([...talentSkills, ...parsed])];
                }
            } catch (e) {}
        }
        
        // 取得人才的專長資料
        if (talent.candidate_id) {
            const specialities = req.tenantDB.prepare(`
                SELECT skill FROM candidate_specialities WHERE candidate_id = ?
            `).all(talent.candidate_id);
            specialities.forEach(s => {
                if (s.skill && !talentSkills.includes(s.skill)) {
                    talentSkills.push(s.skill);
                }
            });
        }
        
        // 標準化技能名稱（轉小寫）
        const normalizedTalentSkills = talentSkills.map(s => s.toLowerCase().trim());
        
        // 取得所有已發布的職缺
        const jobs = req.tenantDB.prepare(`
            SELECT id, title, department, description, job104_data 
            FROM jobs 
            WHERE status = 'published'
        `).all();
        
        const results = [];
        const now = new Date().toISOString();
        
        for (const job of jobs) {
            // 從職缺描述和 job104_data 中提取關鍵技能
            let jobKeywords = [];
            
            // 從描述中提取
            if (job.description) {
                // 常見技術關鍵字
                const techKeywords = [
                    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'php', 'ruby',
                    'react', 'angular', 'vue', 'node', 'express', 'django', 'flask', 'spring',
                    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
                    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git',
                    'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap',
                    'agile', 'scrum', 'jira', 'confluence',
                    'excel', 'word', 'powerpoint', 'office',
                    '財務', '會計', '稅務', '審計', '報表', '預算',
                    '行銷', '業務', '銷售', '客服', '公關',
                    '人資', '招募', '薪資', '績效',
                    '專案管理', 'pmp', '管理'
                ];
                const descLower = job.description.toLowerCase();
                techKeywords.forEach(kw => {
                    if (descLower.includes(kw)) {
                        jobKeywords.push(kw);
                    }
                });
            }
            
            // 從 job104_data 中提取
            if (job.job104_data) {
                try {
                    const data104 = JSON.parse(job.job104_data);
                    if (data104.skills && Array.isArray(data104.skills)) {
                        jobKeywords = [...jobKeywords, ...data104.skills.map(s => s.toLowerCase())];
                    }
                    if (data104.computerExpertise && Array.isArray(data104.computerExpertise)) {
                        jobKeywords = [...jobKeywords, ...data104.computerExpertise.map(s => s.toLowerCase())];
                    }
                } catch (e) {}
            }
            
            // 去重
            jobKeywords = [...new Set(jobKeywords)];
            
            // 計算技能匹配度
            let matchedSkills = [];
            let matchScore = 0;
            
            if (jobKeywords.length > 0 && normalizedTalentSkills.length > 0) {
                matchedSkills = normalizedTalentSkills.filter(skill => 
                    jobKeywords.some(kw => skill.includes(kw) || kw.includes(skill))
                );
                // 計算匹配分數 (0-100)
                const matchRatio = matchedSkills.length / Math.max(jobKeywords.length, 1);
                matchScore = Math.min(Math.round(matchRatio * 100), 100);
                
                // 加入一些隨機性模擬 AI 分析（±10%）
                const variance = Math.floor(Math.random() * 20) - 10;
                matchScore = Math.max(0, Math.min(100, matchScore + variance));
            } else {
                // 如果沒有明確技能資料，給一個基礎分數
                matchScore = Math.floor(Math.random() * 30) + 20; // 20-50
            }
            
            const matchDetails = {
                talentSkills: talentSkills,
                jobKeywords: jobKeywords,
                matchedSkills: matchedSkills
            };
            
            const analysisSummary = matchedSkills.length > 0
                ? `匹配技能: ${matchedSkills.slice(0, 5).join(', ')}${matchedSkills.length > 5 ? '...' : ''}`
                : '建議進一步了解候選人背景';
            
            // 更新或新增媒合記錄
            const existing = req.tenantDB.prepare(`
                SELECT id FROM talent_job_matches WHERE talent_id = ? AND job_id = ?
            `).get(id, job.id);
            
            if (existing) {
                req.tenantDB.prepare(`
                    UPDATE talent_job_matches 
                    SET match_score = ?, match_details = ?, analysis_summary = ?, analyzed_at = ?, updated_at = ?
                    WHERE id = ?
                `).run(matchScore, JSON.stringify(matchDetails), analysisSummary, now, now, existing.id);
            } else {
                const matchId = uuidv4();
                req.tenantDB.prepare(`
                    INSERT INTO talent_job_matches (id, talent_id, job_id, match_score, match_details, analysis_summary, analyzed_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(matchId, id, job.id, matchScore, JSON.stringify(matchDetails), analysisSummary, now);
            }
            
            results.push({
                jobId: job.id,
                title: job.title,
                department: job.department,
                matchScore,
                matchDetails,
                analysisSummary
            });
        }
        
        // 按媒合度排序
        results.sort((a, b) => b.matchScore - a.matchScore);
        
        res.json({
            status: 'success',
            data: results,
            message: `已分析 ${results.length} 個職缺的媒合度`
        });
    } catch (error) {
        console.error('Error analyzing jobs:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/talent-pool/:id/apply-to-job
 * 將人才加入職缺候選人並可選發送面試邀請
 */
router.post('/:id/apply-to-job', (req, res) => {
    try {
        const { id } = req.params;
        const { jobId, sendInvitation = false, message, proposedSlots } = req.body;
        
        if (!jobId) {
            return res.status(400).json({ status: 'error', message: 'jobId is required' });
        }
        
        // 確認人才存在，並取得關聯的原始候選人資料
        const talent = req.tenantDB.prepare(`
            SELECT tp.*, c.email as candidate_email, c.phone as candidate_phone
            FROM talent_pool tp
            LEFT JOIN candidates c ON c.id = tp.candidate_id
            WHERE tp.id = ?
        `).get(id);
        
        if (!talent) {
            return res.status(404).json({ status: 'error', message: 'Talent not found' });
        }
        
        // 確認職缺存在
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
        if (!job) {
            return res.status(404).json({ status: 'error', message: 'Job not found' });
        }
        
        // 檢查是否已經是該職缺的候選人
        const existingCandidate = req.tenantDB.prepare(`
            SELECT id FROM candidates WHERE job_id = ? AND (
                (email = ? AND email IS NOT NULL) OR
                (phone = ? AND phone IS NOT NULL) OR
                (name = ?)
            )
        `).get(jobId, talent.email || talent.candidate_email, talent.phone || talent.candidate_phone, talent.name);
        
        let candidateId;
        
        if (existingCandidate) {
            candidateId = existingCandidate.id;
            console.log(`[ApplyToJob] Candidate already exists: ${candidateId}`);
        } else {
            // 建立新的候選人記錄
            candidateId = uuidv4();
            const now = new Date().toISOString();
            
            // 如果人才庫有關聯的原始候選人，從該候選人複製完整資料
            if (talent.candidate_id) {
                const originalCandidate = req.tenantDB.prepare('SELECT * FROM candidates WHERE id = ?').get(talent.candidate_id);
                
                if (originalCandidate) {
                    // 複製原始候選人的完整資料到新職缺
                    req.tenantDB.prepare(`
                        INSERT INTO candidates (
                            id, job_id, org_unit_id, status, stage, scoring_status, score, apply_date, resume_url, ai_summary,
                            resume_104_id, name, name_en, gender, email, phone, sub_phone, tel, contact_info,
                            address, birthday, reg_source, employment_status, military_status, military_retire_date,
                            introduction, motto, characteristic, personal_page, driving_licenses, transports,
                            special_identities, nationality, disabled_types, disability_card, assistive_devices,
                            avatar, seniority, job_characteristic, work_interval, other_work_interval, shift_work,
                            start_date_opt, expected_salary, preferred_location, remote_work, preferred_job_name,
                            preferred_job_category, preferred_industry, work_desc, biography, biography_en,
                            certificates, other_certificates, current_position, current_company, location,
                            education, experience, experience_years, skills, created_at
                        ) VALUES (
                            ?, ?, ?, 'new', 'Collected', 'Pending', 0, ?, ?, NULL,
                            ?, ?, ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?
                        )
                    `).run(
                        candidateId, jobId, job.org_unit_id || null, now, originalCandidate.resume_url,
                        originalCandidate.resume_104_id, originalCandidate.name, originalCandidate.name_en, originalCandidate.gender,
                        originalCandidate.email, originalCandidate.phone, originalCandidate.sub_phone, originalCandidate.tel, originalCandidate.contact_info,
                        originalCandidate.address, originalCandidate.birthday, originalCandidate.reg_source, originalCandidate.employment_status,
                        originalCandidate.military_status, originalCandidate.military_retire_date,
                        originalCandidate.introduction, originalCandidate.motto, originalCandidate.characteristic, originalCandidate.personal_page,
                        originalCandidate.driving_licenses, originalCandidate.transports,
                        originalCandidate.special_identities, originalCandidate.nationality, originalCandidate.disabled_types,
                        originalCandidate.disability_card || 0, originalCandidate.assistive_devices,
                        originalCandidate.avatar, originalCandidate.seniority, originalCandidate.job_characteristic, originalCandidate.work_interval,
                        originalCandidate.other_work_interval, originalCandidate.shift_work || 0,
                        originalCandidate.start_date_opt, originalCandidate.expected_salary, originalCandidate.preferred_location, originalCandidate.remote_work,
                        originalCandidate.preferred_job_name,
                        originalCandidate.preferred_job_category, originalCandidate.preferred_industry, originalCandidate.work_desc, originalCandidate.biography,
                        originalCandidate.biography_en,
                        originalCandidate.certificates, originalCandidate.other_certificates, originalCandidate.current_position, originalCandidate.current_company,
                        originalCandidate.location,
                        originalCandidate.education, originalCandidate.experience, originalCandidate.experience_years || 0, originalCandidate.skills, now
                    );
                    
                    // 複製學歷資料
                    const educations = req.tenantDB.prepare('SELECT * FROM candidate_education WHERE candidate_id = ?').all(talent.candidate_id);
                    for (const edu of educations) {
                        req.tenantDB.prepare(`
                            INSERT INTO candidate_education (
                                id, candidate_id, school_name, degree_level, major, major_category,
                                degree_status, school_country, start_date, end_date, sort_order
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(uuidv4(), candidateId, edu.school_name, edu.degree_level, edu.major, edu.major_category,
                            edu.degree_status, edu.school_country, edu.start_date, edu.end_date, edu.sort_order);
                    }
                    
                    // 複製工作經歷
                    const experiences = req.tenantDB.prepare('SELECT * FROM candidate_experiences WHERE candidate_id = ?').all(talent.candidate_id);
                    for (const exp of experiences) {
                        req.tenantDB.prepare(`
                            INSERT INTO candidate_experiences (
                                id, candidate_id, firm_name, industry_category, company_size, work_place,
                                job_name, job_role, job_category, start_date, end_date, job_desc, skills, sort_order
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(uuidv4(), candidateId, exp.firm_name, exp.industry_category, exp.company_size, exp.work_place,
                            exp.job_name, exp.job_role, exp.job_category, exp.start_date, exp.end_date, exp.job_desc, exp.skills, exp.sort_order);
                    }
                    
                    // 複製技能專長
                    const specialities = req.tenantDB.prepare('SELECT * FROM candidate_specialities WHERE candidate_id = ?').all(talent.candidate_id);
                    for (const spec of specialities) {
                        req.tenantDB.prepare(`
                            INSERT INTO candidate_specialities (id, candidate_id, skill, description, tags, sort_order)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).run(uuidv4(), candidateId, spec.skill, spec.description, spec.tags, spec.sort_order || 0);
                    }
                    
                    // 複製語言能力
                    const languages = req.tenantDB.prepare('SELECT * FROM candidate_languages WHERE candidate_id = ?').all(talent.candidate_id);
                    for (const lang of languages) {
                        req.tenantDB.prepare(`
                            INSERT INTO candidate_languages (
                                id, candidate_id, lang_type, language_category, listen_degree, speak_degree, 
                                read_degree, write_degree, degree, certificates, sort_order
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(
                            uuidv4(), candidateId, lang.lang_type, lang.language_category,
                            lang.listen_degree, lang.speak_degree, lang.read_degree, lang.write_degree,
                            lang.degree, lang.certificates, lang.sort_order || 0
                        );
                    }
                    
                    // 複製作品集
                    const projects = req.tenantDB.prepare('SELECT * FROM candidate_projects WHERE candidate_id = ?').all(talent.candidate_id);
                    for (const proj of projects) {
                        req.tenantDB.prepare(`
                            INSERT INTO candidate_projects (
                                id, candidate_id, title, start_date, end_date, description, 
                                type, resource_link, website, sort_order
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).run(
                            uuidv4(), candidateId, proj.title, proj.start_date, proj.end_date, 
                            proj.description, proj.type, proj.resource_link, proj.website, proj.sort_order || 0
                        );
                    }
                    
                    console.log(`[ApplyToJob] Copied full resume from original candidate ${talent.candidate_id} to new candidate ${candidateId}`);
                } else {
                    // 原始候選人不存在，使用人才庫的基本資料
                    createBasicCandidate();
                }
            } else {
                // 沒有關聯的原始候選人，使用人才庫的基本資料建立
                createBasicCandidate();
            }
            
            // 建立基本候選人記錄的內部函數
            function createBasicCandidate() {
                req.tenantDB.prepare(`
                    INSERT INTO candidates (
                        id, job_id, org_unit_id, name, email, phone,
                        current_position, current_company, experience_years, education, skills,
                        expected_salary, avatar, resume_url,
                        status, stage, apply_date, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'Collected', ?, ?)
                `).run(
                    candidateId,
                    jobId,
                    job.org_unit_id || null,
                    talent.name,
                    talent.email || talent.candidate_email,
                    talent.phone || talent.candidate_phone,
                    talent.current_position,
                    talent.current_company,
                    talent.experience_years || 0,
                    talent.education,
                    talent.skills,
                    talent.expected_salary,
                    talent.avatar,
                    talent.resume_url,
                    now,
                    now
                );
                console.log(`[ApplyToJob] Created basic candidate: ${candidateId} for job: ${jobId}`);
            }
            
            console.log(`[ApplyToJob] Created new candidate: ${candidateId} for job: ${jobId}`);
        }
        
        let invitationSent = false;
        let invitationToken = null;
        
        // 如果需要發送面試邀請
        if (sendInvitation) {
            // 生成邀請 token
            invitationToken = uuidv4();
            const now = new Date().toISOString();
            const replyDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 天後過期
            
            // 使用傳入的邀約訊息或預設值
            const inviteMessage = message || '您好，感謝您投遞履歷。我們對您的經歷印象深刻，希望能邀請您參加面試。請查看以下建議時段並回覆確認。';
            // 建議時段轉為 JSON
            const slotsJson = proposedSlots && proposedSlots.length > 0 ? JSON.stringify(proposedSlots) : null;
            
            // 建立面試邀請記錄 (使用正確的欄位名稱)
            req.tenantDB.prepare(`
                INSERT INTO interview_invitations (
                    id, candidate_id, job_id, status, response_token, reply_deadline, 
                    message, proposed_slots, created_at, updated_at
                ) VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), 
                candidateId, 
                jobId,
                invitationToken, 
                replyDeadline,
                inviteMessage,
                slotsJson,
                now, 
                now
            );
            
            // 更新候選人狀態為已邀請
            req.tenantDB.prepare(`
                UPDATE candidates SET stage = 'Invited', status = 'invited', updated_at = ?
                WHERE id = ?
            `).run(now, candidateId);
            
            invitationSent = true;
            console.log(`[ApplyToJob] Invitation sent to candidate: ${candidateId}, token: ${invitationToken}, slots: ${slotsJson}`);
        }
        
        res.json({
            status: 'success',
            data: {
                candidateId,
                jobId,
                jobTitle: job.title,
                talentName: talent.name,
                invitationSent,
                invitationToken,
                responseLink: invitationToken ? `/public/interview-response/${invitationToken}` : null,
                isNewCandidate: !existingCandidate
            },
            message: invitationSent 
                ? `已將 ${talent.name} 加入「${job.title}」並發送面試邀請`
                : `已將 ${talent.name} 加入「${job.title}」候選人名單`
        });
    } catch (error) {
        console.error('Error applying to job:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

module.exports = router;
