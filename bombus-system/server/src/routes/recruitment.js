const express = require('express');
const router = express.Router();
// tenantDB is accessed via req.tenantDB (injected by middleware)
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { requireFeaturePerm, buildScopeFilter } = require('../middleware/permission');
const decisionService = require('../services/decision.service');
const { logAudit, getClientIP } = require('../utils/audit-logger');
const { getPlatformDB } = require('../db/platform-db');

/**
 * ------------------------------------------------------------------
 * Recruitment & Interview API
 * ------------------------------------------------------------------
 */

/**
 * 輔助函數: 自動標籤人才
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
        
        // 取得候選人基本資料
        const candidate = req.tenantDB.prepare(`
            SELECT experience_years, reg_source, skills as skills_json, education as main_education
            FROM candidates WHERE id = ?
        `).get(candidateId);
        
        // 取得候選人技能
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
                skills = candidate.skills_json.split(',').map(s => s.trim().toLowerCase());
            }
        }
        
        // 取得候選人學歷
        let education = req.tenantDB.prepare(`
            SELECT school_name, degree_level, major 
            FROM candidate_education WHERE candidate_id = ?
        `).all(candidateId);
        
        if (education.length === 0 && candidate && candidate.main_education) {
            const eduStr = candidate.main_education;
            const parts = eduStr.split(/\s+/);
            if (parts.length >= 2) {
                education = [{
                    school_name: parts[0],
                    degree_level: null,
                    major: parts.slice(1).join(' ')
                }];
            } else {
                education = [{ school_name: eduStr, degree_level: null, major: null }];
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
        
        if (/javascript|typescript|vue|react|angular|html|css|前端/.test(skillKeywords)) {
            if (tagMap['前端開發']) matchedTags.push('前端開發');
        }
        if (/node|java|python|go|c#|後端|spring|django|express/.test(skillKeywords)) {
            if (tagMap['後端開發']) matchedTags.push('後端開發');
        }
        if (matchedTags.includes('前端開發') && matchedTags.includes('後端開發')) {
            if (tagMap['全端開發']) matchedTags.push('全端開發');
        }
        if (/ai|ml|機器學習|深度學習|tensorflow|pytorch|nlp/.test(skillKeywords)) {
            if (tagMap['AI/ML']) matchedTags.push('AI/ML');
        }
        if (/aws|gcp|azure|docker|kubernetes|k8s|雲端/.test(skillKeywords)) {
            if (tagMap['雲端架構']) matchedTags.push('雲端架構');
        }
        if (/agile|scrum|jira|kanban|敏捷/.test(skillKeywords)) {
            if (tagMap['敏捷開發']) matchedTags.push('敏捷開發');
        }
        if (/財務|會計|稅務|成本|審計|報表|erp|sap/.test(skillKeywords)) {
            if (tagMap['財務會計']) matchedTags.push('財務會計');
        }
        if (/人資|hr|招募|薪酬|勞健保|訓練|績效/.test(skillKeywords)) {
            if (tagMap['人力資源']) matchedTags.push('人力資源');
        }
        if (/pmp|專案|pm|風險管理|project/.test(skillKeywords)) {
            if (tagMap['專案管理']) matchedTags.push('專案管理');
        }
        if (/業務|銷售|客戶|談判|crm/.test(skillKeywords)) {
            if (tagMap['業務銷售']) matchedTags.push('業務銷售');
        }
        
        // ===== 經驗匹配 =====
        if (candidate && candidate.experience_years >= 5) {
            if (tagMap['資深人員']) matchedTags.push('資深人員');
        }
        
        const hasManagement = experiences.some(exp => exp.management === '有');
        if (hasManagement) {
            if (tagMap['管理經驗']) matchedTags.push('管理經驗');
        }
        
        const isTechLead = experiences.some(exp => {
            const title = (exp.job_name || '').toLowerCase();
            return hasManagement && /主管|經理|lead|manager|director/.test(title);
        });
        if (isTechLead && (matchedTags.includes('前端開發') || matchedTags.includes('後端開發'))) {
            if (tagMap['技術主管']) matchedTags.push('技術主管');
        }
        
        const industries = experiences.map(exp => (exp.industry_category || '').toLowerCase()).join(' ');
        const companies = experiences.map(exp => (exp.firm_name || '').toLowerCase()).join(' ');
        
        if (/金融|銀行|保險|證券|投信|投顧/.test(industries) || /金控|銀行|保險|證券/.test(companies)) {
            if (tagMap['金融業背景']) matchedTags.push('金融業背景');
        }
        if (/科技|軟體|網路|資訊|半導體/.test(industries) || /google|microsoft|apple|meta|amazon|line|shopee|趨勢/.test(companies)) {
            if (tagMap['科技業背景']) matchedTags.push('科技業背景');
        }
        if (/製造|生產|工廠|品管/.test(industries)) {
            if (tagMap['製造業背景']) matchedTags.push('製造業背景');
        }
        
        const bigCompanies = /台積電|tsmc|鴻海|foxconn|聯發科|mediatek|google|microsoft|apple|meta|amazon|line|shopee/;
        if (bigCompanies.test(companies)) {
            if (tagMap['大廠經驗']) matchedTags.push('大廠經驗');
        }
        
        // ===== 學歷匹配 =====
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
        
        const hasMaster = education.some(edu => 
            (edu.degree_level || '').includes('碩士') || 
            (edu.degree_level || '').includes('博士')
        );
        if (hasMaster) {
            if (tagMap['碩士學歷']) matchedTags.push('碩士學歷');
        }
        
        const majors = education.map(edu => (edu.major || '').toLowerCase()).join(' ');
        if (/企管|財金|會計|國貿|行銷|經濟|mba|商學/.test(majors)) {
            if (tagMap['商管背景']) matchedTags.push('商管背景');
        }
        if (/資工|資管|電機|電子|軟體|資訊|computer|information/.test(majors)) {
            if (tagMap['資訊背景']) matchedTags.push('資訊背景');
        }
        
        // ===== 語言匹配 =====
        const hasEnglish = languages.some(lang => {
            if (lang.lang_type !== '英文') return false;
            const level = (lang.degree || lang.speak_degree || '').toLowerCase();
            return level === '精通' || level.includes('精通') || level.includes('fluent');
        });
        const hasEnglishMajor = education.some(edu => {
            const major = (edu.major || '').toLowerCase();
            return /英文|英語|外文|英國語文|english|應用外語/.test(major);
        });
        if (hasEnglish || hasEnglishMajor) {
            if (tagMap['英文精通']) matchedTags.push('英文精通');
        }
        
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

/**
 * 輔助函數: 自動將婉拒的候選人加入人才庫
 * @param {string} candidateId - 候選人 ID
 * @param {string} declineStage - 婉拒階段: 'invited', 'interview', 'offer'
 * @param {string} declineReason - 婉拒原因 (可選)
 */
function importToTalentPool(req, candidateId, declineStage, declineReason = null) {
    try {
        // 取得候選人資料
        const candidate = req.tenantDB.prepare(`
            SELECT c.*, j.title as job_title, j.org_unit_id as job_org_unit_id
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE c.id = ?
        `).get(candidateId);

        if (!candidate) {
            console.log(`[TalentPool] Candidate ${candidateId} not found, skipping import`);
            return;
        }

        // 檢查是否已在人才庫中
        const existing = req.tenantDB.prepare(`SELECT id FROM talent_pool WHERE candidate_id = ?`).get(candidateId);
        if (existing) {
            console.log(`[TalentPool] Candidate ${candidateId} already in talent pool`);
            return;
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

        // 判斷來源
        const source = candidate.reg_source?.includes('104') ? '104' : 'website';

        req.tenantDB.prepare(`
            INSERT INTO talent_pool (
                id, candidate_id, name, email, phone, avatar,
                current_position, current_company, experience_years, education,
                expected_salary, skills, resume_url, source, status,
                match_score, contact_priority, decline_stage, decline_reason,
                original_job_id, original_job_title, org_unit_id, added_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            source,
            'active',
            candidate.score || 0,
            'medium',
            declineStage,
            declineReason,
            candidate.job_id,
            candidate.job_title,
            candidate.job_org_unit_id || null,
            now,
            now
        );

        // 自動標籤匹配
        const matchedTags = autoTagTalent(req, candidateId, id);

        console.log(`[TalentPool] ✅ Imported candidate ${candidate.name} (${candidateId}) - decline stage: ${declineStage}, tags: ${matchedTags.length}`);
    } catch (error) {
        console.error(`[TalentPool] ❌ Error importing candidate ${candidateId}:`, error.message);
    }
}

// interview_evaluations 表已在 tenant-schema.js 中定義，無需模組層級初始化

// --- 面試評分完整 API ---

// 9. 儲存面試評分 (完整) - 新版面試官評分表
// POST /api/recruitment/candidates/:candidateId/evaluation
router.post('/candidates/:candidateId/evaluation', requireFeaturePerm('L1.recruitment', 'edit'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const {
            interviewId,
            evaluatorId,
            // 保留欄位
            performanceDescription,
            overallComment,
            totalScore,
            transcriptText,
            mediaUrl,
            mediaSize,
            aiAnalysisResult,
            // 新版欄位
            scoringItems,
            processChecklist,
            comprehensiveAssessment,
            prosComment,
            consComment,
            recommendation
        } = req.body;

        const now = new Date().toISOString();
        
        // JSON 序列化
        const aiResultJson = aiAnalysisResult ? 
            (typeof aiAnalysisResult === 'object' ? JSON.stringify(aiAnalysisResult) : aiAnalysisResult) : null;
        const scoringItemsJson = scoringItems ?
            (typeof scoringItems === 'object' ? JSON.stringify(scoringItems) : scoringItems) : null;
        const processChecklistJson = processChecklist ?
            (typeof processChecklist === 'object' ? JSON.stringify(processChecklist) : processChecklist) : null;
        const comprehensiveAssessmentJson = comprehensiveAssessment ?
            (typeof comprehensiveAssessment === 'object' ? JSON.stringify(comprehensiveAssessment) : comprehensiveAssessment) : null;

        // 檢查是否已存在評分記錄
        const existing = req.tenantDB.prepare(`
            SELECT id FROM interview_evaluations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1
        `).get(candidateId);

        let evaluationId;

        if (existing) {
            // 更新現有記錄
            evaluationId = existing.id;
            const stmt = req.tenantDB.prepare(`
                UPDATE interview_evaluations SET
                    interview_id = COALESCE(?, interview_id),
                    evaluator_id = COALESCE(?, evaluator_id),
                    performance_description = COALESCE(?, performance_description),
                    overall_comment = COALESCE(?, overall_comment),
                    total_score = COALESCE(?, total_score),
                    transcript_text = COALESCE(?, transcript_text),
                    media_url = COALESCE(?, media_url),
                    media_size = COALESCE(?, media_size),
                    ai_analysis_result = COALESCE(?, ai_analysis_result),
                    scoring_items = COALESCE(?, scoring_items),
                    process_checklist = COALESCE(?, process_checklist),
                    comprehensive_assessment = COALESCE(?, comprehensive_assessment),
                    pros_comment = COALESCE(?, pros_comment),
                    cons_comment = COALESCE(?, cons_comment),
                    recommendation = COALESCE(?, recommendation),
                    status = 'submitted',
                    updated_at = ?
                WHERE id = ?
            `);
            stmt.run(
                interviewId || null, evaluatorId || null,
                performanceDescription || null, overallComment || null,
                totalScore || null, transcriptText || null,
                mediaUrl || null, mediaSize || null,
                aiResultJson, scoringItemsJson,
                processChecklistJson, comprehensiveAssessmentJson,
                prosComment || null, consComment || null,
                recommendation || null, now, evaluationId
            );
        } else {
            // 創建新記錄
            evaluationId = uuidv4();
            const stmt = req.tenantDB.prepare(`
                INSERT INTO interview_evaluations (
                    id, candidate_id, interview_id, evaluator_id, 
                    performance_description, overall_comment, total_score,
                    transcript_text, media_url, media_size, ai_analysis_result,
                    scoring_items, process_checklist, comprehensive_assessment,
                    pros_comment, cons_comment, recommendation,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
            `);
            stmt.run(
                evaluationId, candidateId, interviewId || null, evaluatorId || null,
                performanceDescription || null, overallComment || null, totalScore || 0,
                transcriptText || null, mediaUrl || null, mediaSize || 0, aiResultJson,
                scoringItemsJson, processChecklistJson, comprehensiveAssessmentJson,
                prosComment || null, consComment || null, recommendation || null,
                now, now
            );
        }

        // 狀態推進：只有在「真正送出評分」或「保存 AI 分析」時才改變 candidates.status / scoring_status。
        // 純媒體上傳或逐字稿自動存檔（payload 只含 mediaUrl/mediaSize/transcriptText）不應推進狀態。
        const isScoringSubmit = !!(scoringItemsJson || comprehensiveAssessmentJson || prosComment || consComment || recommendation);
        const isAiSave = !!aiResultJson;
        if (isScoringSubmit || isAiSave) {
            const newStatus = isAiSave ? 'pending_decision' : 'pending_ai';
            req.tenantDB.prepare(
                `UPDATE candidates SET status = ?, scoring_status = 'Scored', updated_at = ? WHERE id = ?`
            ).run(newStatus, now, candidateId);
        } else {
            // 媒體/逐字稿部分更新：只 bump updated_at
            req.tenantDB.prepare(
                `UPDATE candidates SET updated_at = ? WHERE id = ?`
            ).run(now, candidateId);
        }

        res.status(201).json({
            success: true,
            evaluationId: evaluationId,
            message: existing ? '面試評分已更新' : '面試評分已儲存',
            isUpdate: !!existing
        });

    } catch (error) {
        console.error('Error saving evaluation:', error);
        res.status(500).json({ error: 'Failed to save evaluation' });
    }
});

// 10. 取得候選人面試評分
// GET /api/recruitment/candidates/:candidateId/evaluation
router.get('/candidates/:candidateId/evaluation', requireFeaturePerm('L1.recruitment', 'view'), (req, res) => {
    try {
        const { candidateId } = req.params;

        const evaluation = req.tenantDB.prepare(`
            SELECT * FROM interview_evaluations 
            WHERE candidate_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `).get(candidateId);

        if (!evaluation) {
            return res.status(404).json({ error: 'No evaluation found' });
        }

        // 解析 JSON 欄位
        res.json({
            ...evaluation,
            // 新版欄位
            scoring_items: evaluation.scoring_items ? JSON.parse(evaluation.scoring_items) : null,
            process_checklist: evaluation.process_checklist ? JSON.parse(evaluation.process_checklist) : null,
            comprehensive_assessment: evaluation.comprehensive_assessment ? JSON.parse(evaluation.comprehensive_assessment) : null,
            // 保留欄位
            ai_analysis_result: evaluation.ai_analysis_result ? JSON.parse(evaluation.ai_analysis_result) : null
        });

    } catch (error) {
        console.error('Error fetching evaluation:', error);
        res.status(500).json({ error: 'Failed to fetch evaluation' });
    }
});

// 11. 更新面試評分
// PATCH /api/recruitment/candidates/:candidateId/evaluation
router.patch('/candidates/:candidateId/evaluation', requireFeaturePerm('L1.recruitment', 'edit'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const {
            // 保留欄位
            performanceDescription,
            overallComment,
            totalScore,
            transcriptText,
            mediaUrl,
            mediaSize,
            aiAnalysisResult,
            // 新版欄位
            scoringItems,
            processChecklist,
            comprehensiveAssessment,
            prosComment,
            consComment,
            recommendation
        } = req.body;

        const now = new Date().toISOString();

        // 取得現有評分
        const existing = req.tenantDB.prepare(`
            SELECT id FROM interview_evaluations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1
        `).get(candidateId);

        if (!existing) {
            return res.status(404).json({ error: 'No evaluation found to update' });
        }

        // JSON 序列化
        const aiResultJson = aiAnalysisResult ?
            (typeof aiAnalysisResult === 'object' ? JSON.stringify(aiAnalysisResult) : aiAnalysisResult) : null;
        const scoringItemsJson = scoringItems ?
            (typeof scoringItems === 'object' ? JSON.stringify(scoringItems) : scoringItems) : null;
        const processChecklistJson = processChecklist ?
            (typeof processChecklist === 'object' ? JSON.stringify(processChecklist) : processChecklist) : null;
        const comprehensiveAssessmentJson = comprehensiveAssessment ?
            (typeof comprehensiveAssessment === 'object' ? JSON.stringify(comprehensiveAssessment) : comprehensiveAssessment) : null;

        const stmt = req.tenantDB.prepare(`
            UPDATE interview_evaluations SET
                performance_description = COALESCE(?, performance_description),
                overall_comment = COALESCE(?, overall_comment),
                total_score = COALESCE(?, total_score),
                transcript_text = COALESCE(?, transcript_text),
                media_url = COALESCE(?, media_url),
                media_size = COALESCE(?, media_size),
                ai_analysis_result = COALESCE(?, ai_analysis_result),
                scoring_items = COALESCE(?, scoring_items),
                process_checklist = COALESCE(?, process_checklist),
                comprehensive_assessment = COALESCE(?, comprehensive_assessment),
                pros_comment = COALESCE(?, pros_comment),
                cons_comment = COALESCE(?, cons_comment),
                recommendation = COALESCE(?, recommendation),
                updated_at = ?
            WHERE id = ?
        `);
        stmt.run(
            performanceDescription || null,
            overallComment || null,
            totalScore || null,
            transcriptText || null,
            mediaUrl || null,
            mediaSize || null,
            aiResultJson,
            scoringItemsJson,
            processChecklistJson,
            comprehensiveAssessmentJson,
            prosComment || null,
            consComment || null,
            recommendation || null,
            now,
            existing.id
        );

        // Update Candidate Status based on AI Analysis
        if (aiResultJson) {
            const updateCand = req.tenantDB.prepare(`
                UPDATE candidates SET status = 'pending_decision', scoring_status = 'Scored', updated_at = ? WHERE id = ?
            `);
            updateCand.run(now, candidateId);
        } else {
            const updateCand = req.tenantDB.prepare(`
                UPDATE candidates SET scoring_status = 'Scored', updated_at = ? WHERE id = ?
            `);
            updateCand.run(now, candidateId);
        }

        res.json({ success: true, message: '評分已更新' });

    } catch (error) {
        console.error('Error updating evaluation:', error);
        res.status(500).json({ error: 'Failed to update evaluation' });
    }
});

// 0. Get All Candidates (List)
// GET /api/recruitment/candidates
router.get('/candidates', requireFeaturePerm('L1.recruitment', 'view'), (req, res) => {
    try {
        const { org_unit_id } = req.query;

        // Build scope filter
        const scopeFilter = buildScopeFilter(req, { tableAlias: 'j', orgUnitColumn: 'org_unit_id' });

        let query = `
            SELECT c.*, j.title as job_title, j.grade as job_grade,
            (SELECT ie.ai_analysis_result FROM interview_evaluations ie WHERE ie.candidate_id = c.id LIMIT 1) as ai_analysis_result,
            (SELECT id.approval_status FROM invitation_decisions id WHERE id.candidate_id = c.id ORDER BY id.decided_at DESC LIMIT 1) as approval_status,
            (SELECT id.approver_id FROM invitation_decisions id WHERE id.candidate_id = c.id ORDER BY id.decided_at DESC LIMIT 1) as approver_id,
            (SELECT id.approved_at FROM invitation_decisions id WHERE id.candidate_id = c.id ORDER BY id.decided_at DESC LIMIT 1) as approved_at,
            (SELECT id.approval_note FROM invitation_decisions id WHERE id.candidate_id = c.id ORDER BY id.decided_at DESC LIMIT 1) as approval_note,
            (SELECT id.submitted_for_approval_at FROM invitation_decisions id WHERE id.candidate_id = c.id ORDER BY id.decided_at DESC LIMIT 1) as submitted_for_approval_at,
            (SELECT id.reason FROM invitation_decisions id WHERE id.candidate_id = c.id ORDER BY id.decided_at DESC LIMIT 1) as decision_reason,
            (SELECT id.decision FROM invitation_decisions id WHERE id.candidate_id = c.id ORDER BY id.decided_at DESC LIMIT 1) as decision_type,
            (SELECT u.name FROM users u WHERE u.id = (SELECT id2.approver_id FROM invitation_decisions id2 WHERE id2.candidate_id = c.id ORDER BY id2.decided_at DESC LIMIT 1)) as approver_name,
            (SELECT u.name FROM users u WHERE u.id = (SELECT id3.decided_by FROM invitation_decisions id3 WHERE id3.candidate_id = c.id ORDER BY id3.decided_at DESC LIMIT 1)) as decided_by_name,
            (SELECT iv.interview_at FROM interviews iv WHERE iv.candidate_id = c.id ORDER BY iv.interview_at DESC LIMIT 1) as latest_interview_at
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE EXISTS (SELECT 1 FROM interviews WHERE candidate_id = c.id)
        `;
        const params = [];

        // Add scope filtering
        if (scopeFilter.clause) {
            query += ` AND ${scopeFilter.clause}`;
            params.push(...scopeFilter.params);
        }

        if (org_unit_id) {
            query += ` AND j.org_unit_id = ?`;
            params.push(org_unit_id);
        }

        query += ` ORDER BY c.created_at DESC`;

        const candidates = req.tenantDB.prepare(query).all(...params);
        res.json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// 1. Send Interview Invitation
// POST /api/recruitment/candidates/:candidateId/invitations
router.post('/candidates/:candidateId/invitations', requireFeaturePerm('L1.recruitment', 'edit'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const { jobId, proposedSlots, message } = req.body;

        if (!candidateId || !jobId) {
            return res.status(400).json({ error: 'Candidate ID and Job ID are required' });
        }

        const invitationId = uuidv4();
        const responseToken = uuidv4(); // 專屬回覆連結 Token
        const now = new Date().toISOString();
        const slotsJson = JSON.stringify(proposedSlots || []);

        // 7 天後過期
        const replyDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        // 1. Create Invitation with response_token
        const stmt = req.tenantDB.prepare(`
            INSERT INTO interview_invitations (
                id, candidate_id, job_id, status, proposed_slots, message, reply_deadline, response_token, created_at, updated_at
            ) VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(invitationId, candidateId, jobId, slotsJson, message, replyDeadline, responseToken, now, now);

        // 2. Update Candidate Stage & Status
        const updateStmt = req.tenantDB.prepare(`
            UPDATE candidates 
            SET stage = 'Invited', status = 'invited', updated_at = ? 
            WHERE id = ?
        `);
        updateStmt.run(now, candidateId);

        res.status(201).json({
            success: true,
            invitationId,
            responseToken,
            responseLink: `/public/interview-response/${responseToken}`,
            replyDeadline,
            message: 'Invitation created. HR can share the response link with candidate.'
        });

    } catch (error) {
        console.error('Error sending invitation:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

// 2. Schedule Interview (Confirm)
// POST /api/recruitment/interviews
router.post('/interviews', requireFeaturePerm('L1.recruitment', 'edit'), (req, res) => {
    try {
        const { candidateId, jobId, interviewerId, interviewAt, location, meetingLink, address, round } = req.body;

        if (!candidateId || !jobId || !interviewAt) {
            return res.status(400).json({ error: 'Missing required fields for scheduling' });
        }

        const interviewId = uuidv4();
        const cancelToken = uuidv4(); // 產生取消連結 Token
        const now = new Date().toISOString();

        // 1. Create Interview Record with meeting_link, address and cancel_token
        const stmt = req.tenantDB.prepare(`
            INSERT INTO interviews (
                id, candidate_id, job_id, interviewer_id, round, interview_at, location, meeting_link, address, cancel_token, result, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        `);
        stmt.run(interviewId, candidateId, jobId, interviewerId, round || 1, interviewAt, location, meetingLink || null, address || null, cancelToken, now, now);

        // 2. Update Candidate Status to interview
        const updateCand = req.tenantDB.prepare(`
            UPDATE candidates 
            SET status = 'interview', updated_at = ?
            WHERE id = ?
        `);
        updateCand.run(now, candidateId);

        res.status(201).json({
            success: true,
            interviewId,
            cancelToken,
            cancelLink: `/public/interview-cancel/${cancelToken}`,
            message: 'Interview scheduled successfully'
        });

    } catch (error) {
        console.error('Error scheduling interview:', error);
        res.status(500).json({ error: 'Failed to schedule interview' });
    }
});

// 3. Submit Interview Evaluation (Score)
// PATCH /api/recruitment/interviews/:interviewId/evaluation
router.patch('/interviews/:interviewId/evaluation', requireFeaturePerm('L1.recruitment', 'edit'), (req, res) => {
    try {
        const { interviewId } = req.params;
        const { evaluationJson, result, remark } = req.body;

        if (!result) {
            return res.status(400).json({ error: 'Result is required (Pass/Hold/Fail)' });
        }

        const now = new Date().toISOString();
        const evalStr = typeof evaluationJson === 'object' ? JSON.stringify(evaluationJson) : evaluationJson;

        const stmt = req.tenantDB.prepare(`
            UPDATE interviews 
            SET evaluation_json = ?, result = ?, remark = ?, updated_at = ?
            WHERE id = ?
        `);
        const info = stmt.run(evalStr, result, remark, now, interviewId);

        if (info.changes === 0) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        // Also update Candidate Scoring Status if this is the final round
        // For now, we update scoring_status only if result is Pass or Fail
        const getInterview = req.tenantDB.prepare('SELECT candidate_id FROM interviews WHERE id = ?').get(interviewId);
        if (getInterview) {
            const updateCand = req.tenantDB.prepare(`
                UPDATE candidates SET scoring_status = 'Scored', updated_at = ? WHERE id = ?
            `);
            updateCand.run(now, getInterview.candidate_id);
        }

        res.json({ success: true, message: 'Evaluation submitted' });

    } catch (error) {
        console.error('Error submitting evaluation:', error);
        res.status(500).json({ error: 'Failed to submit evaluation' });
    }
});

// 4. Hiring Decision
// POST /api/recruitment/candidates/:candidateId/decision
router.post('/candidates/:candidateId/decision', requireFeaturePerm('L1.recruitment', 'edit'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const { decision, decidedBy, reason } = req.body; // Decision: Offered / Rejected

        if (!['Offered', 'Rejected'].includes(decision)) {
            return res.status(400).json({ error: 'Invalid decision. Must be Offered or Rejected' });
        }

        const id = uuidv4();
        const now = new Date().toISOString();

        // 當決策為 Offered 時，產生回覆連結 token
        let responseToken = null;
        let replyDeadline = null;
        let responseLink = null;

        if (decision === 'Offered') {
            responseToken = uuidv4();
            // 7 天後過期
            replyDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            responseLink = `/public/offer-response/${responseToken}`;
        }

        // 1. Record Decision (含 Offer 回覆相關欄位)
        const stmt = req.tenantDB.prepare(`
            INSERT INTO invitation_decisions (
                id, candidate_id, decision, decided_by, reason, decided_at,
                response_token, reply_deadline
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, candidateId, decision, decidedBy, reason, now, responseToken, replyDeadline);

        // 2. Update Candidate Stage & Status
        // Offered 狀態改為 'offered'（待候選人回覆），而非 'hired'
        let newStatus = 'new';
        if (decision === 'Offered') {
            newStatus = 'offered';
        } else if (decision === 'Rejected') {
            // 檢查是否有面試記錄來決定狀態
            const interviewCount = req.tenantDB.prepare('SELECT COUNT(*) as count FROM interviews WHERE candidate_id = ?').get(candidateId);
            // 有面試 → not_hired（未錄取），無面試 → not_invited（不邀請）
            newStatus = (interviewCount?.count > 0) ? 'not_hired' : 'not_invited';
        }

        const updateStmt = req.tenantDB.prepare(`
            UPDATE candidates 
            SET stage = ?, status = ?, updated_at = ? 
            WHERE id = ?
        `);
        updateStmt.run(decision, newStatus, now, candidateId);

        // 回傳結果（含回覆連結）
        const response = { 
            success: true, 
            message: `Candidate stage updated to ${decision}` 
        };

        if (decision === 'Offered') {
            response.responseToken = responseToken;
            response.responseLink = responseLink;
            response.replyDeadline = replyDeadline;
        }

        res.status(201).json(response);

    } catch (error) {
        console.error('Error making decision:', error);
        res.status(500).json({ error: 'Failed to make decision' });
    }
});

// ============================================================
// 面試決策簽核流程 API（L1.decision）
// ============================================================

/**
 * GET /api/recruitment/candidates/:candidateId/salary-range
 * 依候選人職缺的 grade 解析薪資範圍
 */
router.get('/candidates/:candidateId/salary-range', requireFeaturePerm('L1.decision', 'view'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const range = decisionService.resolveSalaryRange(req.tenantDB, candidateId);
        res.json(range);
    } catch (err) {
        console.error('Error resolving salary range:', err);
        res.status(500).json({ error: 'Failed to resolve salary range' });
    }
});

/**
 * POST /api/recruitment/candidates/:candidateId/submit-approval
 * HR 送簽：pending_decision → pending_approval
 */
router.post('/candidates/:candidateId/submit-approval', requireFeaturePerm('L1.decision', 'edit'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const { decision, decision_reason, approved_salary_type, approved_salary_amount } = req.body;

        const result = decisionService.submitForApproval(req.tenantDB, {
            candidateId,
            decision,
            decisionReason: decision_reason,
            approvedSalaryType: approved_salary_type,
            approvedSalaryAmount: approved_salary_amount,
            currentUserId: req.user && req.user.userId
        });

        try {
            logAudit(getPlatformDB(), {
                tenant_id: req.user && req.user.tenantId,
                user_id: req.user && req.user.userId,
                action: 'candidate.submit_approval',
                resource: 'candidate',
                details: { candidateId, decision, outOfRange: result.outOfRange, fromStatus: result.fromStatus, toStatus: result.toStatus },
                ip: getClientIP(req)
            });
        } catch (e) { /* audit failure non-fatal */ }

        res.status(201).json({ success: true, ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('Error submitting approval:', err);
        res.status(500).json({ error: 'Failed to submit approval' });
    }
});

/**
 * POST /api/recruitment/candidates/:candidateId/approve
 * 主管簽核通過：pending_approval → offered | not_hired
 * 角色限制：super_admin 或 subsidiary_admin
 */
router.post('/candidates/:candidateId/approve', requireFeaturePerm('L1.decision', 'edit'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const { approval_note } = req.body;

        const result = decisionService.approveDecision(req.tenantDB, {
            candidateId,
            approvalNote: approval_note,
            currentUserId: req.user && req.user.userId,
            currentUserRoles: (req.user && req.user.roles) || []
        });

        try {
            logAudit(getPlatformDB(), {
                tenant_id: req.user && req.user.tenantId,
                user_id: req.user && req.user.userId,
                action: 'candidate.approve',
                resource: 'candidate',
                details: { candidateId, newStatus: result.newStatus, decisionId: result.decisionId, approval_note: approval_note || null },
                ip: getClientIP(req)
            });
        } catch (e) { /* audit failure non-fatal */ }

        res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('Error approving decision:', err);
        res.status(500).json({ error: 'Failed to approve decision' });
    }
});

/**
 * POST /api/recruitment/candidates/:candidateId/reject-approval
 * 主管退回：pending_approval → pending_decision（可無限輪迴）
 */
router.post('/candidates/:candidateId/reject-approval', requireFeaturePerm('L1.decision', 'edit'), (req, res) => {
    try {
        const { candidateId } = req.params;
        const { approval_note } = req.body;

        const result = decisionService.rejectApproval(req.tenantDB, {
            candidateId,
            approvalNote: approval_note,
            currentUserId: req.user && req.user.userId,
            currentUserRoles: (req.user && req.user.roles) || []
        });

        try {
            logAudit(getPlatformDB(), {
                tenant_id: req.user && req.user.tenantId,
                user_id: req.user && req.user.userId,
                action: 'candidate.reject_approval',
                resource: 'candidate',
                details: { candidateId, decisionId: result.decisionId, approval_note },
                ip: getClientIP(req)
            });
        } catch (e) { /* audit failure non-fatal */ }

        res.status(200).json({ success: true, ...result });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        console.error('Error rejecting approval:', err);
        res.status(500).json({ error: 'Failed to reject approval' });
    }
});

// 5. Get Extended Candidate Details
// GET /api/recruitment/candidates/:candidateId
router.get('/candidates/:candidateId', requireFeaturePerm('L1.recruitment', 'view'), (req, res) => {
    try {
        const { candidateId } = req.params;

        // Get basic info with Job Title
        const candidate = req.tenantDB.prepare(`
            SELECT c.*, j.title as job_title,
            (SELECT ai_analysis_result FROM interview_evaluations WHERE candidate_id = c.id ORDER BY created_at DESC LIMIT 1) as ai_analysis_json
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE c.id = ?
        `).get(candidateId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // Get Interviews
        const interviews = req.tenantDB.prepare('SELECT * FROM interviews WHERE candidate_id = ? ORDER BY created_at DESC').all(candidateId);

        // Get Invitation
        const invitation = req.tenantDB.prepare('SELECT * FROM interview_invitations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1').get(candidateId);

        // Get Decision
        const decision = req.tenantDB.prepare('SELECT * FROM invitation_decisions WHERE candidate_id = ? ORDER BY decided_at DESC LIMIT 1').get(candidateId);

        // Get Evaluation
        // Get Evaluation (Latest)
        const evaluation = req.tenantDB.prepare('SELECT * FROM interview_evaluations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1').get(candidateId);

        res.json({
            ...candidate,
            interviews,
            invitation,
            decision,
            evaluation
        });

    } catch (error) {
        console.error('Error fetching candidate details:', error);
        res.status(500).json({ error: 'Failed to fetch candidate details' });
    }
});

// ============================================================
// PUBLIC CANDIDATE RESPONSE APIs (無需驗證)
// ============================================================

// 6. Get Invitation by Token (Public - 候選人用)
// GET /api/recruitment/invitations/:token
router.get('/invitations/:token', (req, res) => {
    try {
        const { token } = req.params;

        const invitation = req.tenantDB.prepare(`
            SELECT ii.*, c.name as candidate_name, j.title as job_title
            FROM interview_invitations ii
            JOIN candidates c ON ii.candidate_id = c.id
            JOIN jobs j ON ii.job_id = j.id
            WHERE ii.response_token = ?
        `).get(token);

        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found or expired' });
        }

        // Check if expired
        if (new Date(invitation.reply_deadline) < new Date()) {
            return res.status(410).json({ error: 'Invitation has expired' });
        }

        // Check if already responded
        if (invitation.candidate_response) {
            return res.status(400).json({
                error: 'Already responded',
                response: invitation.candidate_response,
                selectedSlots: invitation.selected_slots ? JSON.parse(invitation.selected_slots) : []
            });
        }

        res.json({
            invitationId: invitation.id,
            candidateName: invitation.candidate_name,
            jobTitle: invitation.job_title,
            message: invitation.message,
            proposedSlots: invitation.proposed_slots ? JSON.parse(invitation.proposed_slots) : [],
            replyDeadline: invitation.reply_deadline,
            status: invitation.status
        });

    } catch (error) {
        console.error('Error fetching invitation:', error);
        res.status(500).json({ error: 'Failed to fetch invitation' });
    }
});

// 7. Candidate Respond to Invitation (Public)
// POST /api/recruitment/invitations/:token/respond
router.post('/invitations/:token/respond', (req, res) => {
    try {
        const { token } = req.params;
        const { response, selectedSlots, rescheduleNote } = req.body; // response: 'accepted' | 'declined' | 'reschedule'

        if (!['accepted', 'declined', 'reschedule'].includes(response)) {
            return res.status(400).json({ error: 'Invalid response. Must be accepted, declined, or reschedule' });
        }

        // Validate reschedule has note
        if (response === 'reschedule' && !rescheduleNote) {
            return res.status(400).json({ error: 'Reschedule note is required' });
        }

        // Get invitation
        const invitation = req.tenantDB.prepare('SELECT * FROM interview_invitations WHERE response_token = ?').get(token);

        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }

        // Check if expired
        if (new Date(invitation.reply_deadline) < new Date()) {
            return res.status(410).json({ error: 'Invitation has expired' });
        }

        // Check if already responded
        if (invitation.candidate_response) {
            return res.status(400).json({ error: 'Already responded' });
        }

        const now = new Date().toISOString();
        const slotsJson = selectedSlots ? JSON.stringify(selectedSlots) : null;

        // Determine new status based on response
        let newStatus;
        let candidateStatus = null;
        if (response === 'accepted') {
            newStatus = 'Confirmed';
        } else if (response === 'declined') {
            newStatus = 'Declined';
            candidateStatus = 'invite_declined';  // 候選人婉拒邀請
        } else if (response === 'reschedule') {
            newStatus = 'Reschedule';
            candidateStatus = 'reschedule';
        }

        // Update invitation (include reschedule_note if applicable)
        const stmt = req.tenantDB.prepare(`
            UPDATE interview_invitations 
            SET candidate_response = ?, selected_slots = ?, responded_at = ?, status = ?, updated_at = ?,
                reschedule_note = COALESCE(?, reschedule_note)
            WHERE response_token = ?
        `);
        stmt.run(response, slotsJson, now, newStatus, now, rescheduleNote || null, token);

        // Update candidate status
        if (candidateStatus) {
            const updateCand = req.tenantDB.prepare(`
                UPDATE candidates 
                SET stage = ?, status = ?, updated_at = ?
                WHERE id = ?
            `);
            const stage = response === 'declined' ? 'Rejected' : 'Invited';
            updateCand.run(stage, candidateStatus, now, invitation.candidate_id);

            // 自動將婉拒的候選人加入人才庫
            if (response === 'declined') {
                importToTalentPool(req, invitation.candidate_id, 'invited', '面試邀請婉拒');
            }
        }

        // Response messages
        const messages = {
            accepted: 'Thank you for confirming! HR will finalize the interview schedule.',
            declined: 'We understand. Thank you for letting us know.',
            reschedule: 'Thank you for your response. HR will review your availability and get back to you.'
        };

        res.json({
            success: true,
            message: messages[response],
            response,
            selectedSlots: selectedSlots || [],
            rescheduleNote: rescheduleNote || null
        });

    } catch (error) {
        console.error('Error responding to invitation:', error);
        res.status(500).json({ error: 'Failed to submit response' });
    }
});

// ============================================================
// OFFER RESPONSE APIs (公開 - 候選人用)
// ============================================================

// 8. Get Offer by Token (Public - 候選人用)
// GET /api/recruitment/offers/:token
router.get('/offers/:token', (req, res) => {
    try {
        const { token } = req.params;

        // 從 invitation_decisions 查詢 Offer 資訊
        // 使用 LEFT JOIN 以允許 job_id 為空或無效的情況
        const offer = req.tenantDB.prepare(`
            SELECT 
                id.*, 
                c.name as candidate_name, 
                COALESCE(j.title, '未指定職位') as job_title
            FROM invitation_decisions id
            JOIN candidates c ON id.candidate_id = c.id
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE id.response_token = ?
        `).get(token);

        if (!offer) {
            return res.status(404).json({ error: 'Offer not found or invalid token' });
        }

        // 檢查是否過期
        if (offer.reply_deadline && new Date(offer.reply_deadline) < new Date()) {
            return res.status(410).json({ error: 'Offer has expired' });
        }

        // 檢查是否已回覆
        if (offer.candidate_response) {
            return res.status(400).json({
                error: 'Already responded',
                response: offer.candidate_response,
                respondedAt: offer.responded_at
            });
        }

        res.json({
            offerId: offer.id,
            candidateName: offer.candidate_name,
            jobTitle: offer.job_title,
            reason: offer.reason, // HR 提供的錄用原因/說明
            replyDeadline: offer.reply_deadline,
            decidedAt: offer.decided_at
        });

    } catch (error) {
        console.error('Error fetching offer:', error);
        res.status(500).json({ error: 'Failed to fetch offer' });
    }
});

// 9. Candidate Respond to Offer (Public)
// POST /api/recruitment/offers/:token/respond
router.post('/offers/:token/respond', (req, res) => {
    try {
        const { token } = req.params;
        const { response } = req.body; // response: 'accepted' | 'declined'

        if (!['accepted', 'declined'].includes(response)) {
            return res.status(400).json({ error: 'Invalid response. Must be accepted or declined' });
        }

        // 取得 Offer 資訊
        const offer = req.tenantDB.prepare('SELECT * FROM invitation_decisions WHERE response_token = ?').get(token);

        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // 檢查是否過期
        if (offer.reply_deadline && new Date(offer.reply_deadline) < new Date()) {
            return res.status(410).json({ error: 'Offer has expired' });
        }

        // 檢查是否已回覆
        if (offer.candidate_response) {
            return res.status(400).json({ error: 'Already responded' });
        }

        const now = new Date().toISOString();

        // 1. 更新 invitation_decisions
        const updateOffer = req.tenantDB.prepare(`
            UPDATE invitation_decisions 
            SET candidate_response = ?, responded_at = ?
            WHERE response_token = ?
        `);
        updateOffer.run(response, now, token);

        // 2. 更新候選人狀態
        // accepted -> offer_accepted (已錄取同意)
        // declined -> offer_declined (已錄取拒絕)
        const newStatus = response === 'accepted' ? 'offer_accepted' : 'offer_declined';
        const newStage = response === 'accepted' ? 'Hired' : 'OfferDeclined';

        const updateCandidate = req.tenantDB.prepare(`
            UPDATE candidates 
            SET status = ?, stage = ?, updated_at = ?
            WHERE id = ?
        `);
        updateCandidate.run(newStatus, newStage, now, offer.candidate_id);

        // 自動將婉拒 Offer 的候選人加入人才庫
        if (response === 'declined') {
            importToTalentPool(req, offer.candidate_id, 'offer', '錄取通知婉拒');
        }

        // 回覆訊息
        const messages = {
            accepted: '恭喜您！感謝您接受我們的錄用通知，HR 將會盡快與您聯繫後續入職事宜。',
            declined: '感謝您的回覆，我們尊重您的決定。祝您未來一切順利！'
        };

        res.json({
            success: true,
            message: messages[response],
            response,
            respondedAt: now
        });

    } catch (error) {
        console.error('Error responding to offer:', error);
        res.status(500).json({ error: 'Failed to submit response' });
    }
});

// ============================================================
// 面試取消 APIs (已安排面試但婉拒)
// ============================================================

// 10. Get Interview Info by Cancel Token (Public - 候選人用)
// GET /api/recruitment/interviews/cancel/:token
router.get('/interviews/cancel/:token', (req, res) => {
    try {
        const { token } = req.params;

        const interview = req.tenantDB.prepare(`
            SELECT i.*, c.name as candidate_name, j.title as job_title
            FROM interviews i
            JOIN candidates c ON i.candidate_id = c.id
            JOIN jobs j ON i.job_id = j.id
            WHERE i.cancel_token = ?
        `).get(token);

        if (!interview) {
            return res.status(404).json({ error: 'Interview not found or invalid token' });
        }

        // 檢查是否已取消
        if (interview.result === 'Cancelled') {
            return res.status(400).json({
                error: 'Interview already cancelled',
                cancelledAt: interview.cancelled_at
            });
        }

        // 檢查面試是否已過
        if (new Date(interview.interview_at) < new Date()) {
            return res.status(410).json({ error: 'Interview has already passed' });
        }

        res.json({
            interviewId: interview.id,
            candidateName: interview.candidate_name,
            jobTitle: interview.job_title,
            interviewAt: interview.interview_at,
            location: interview.location,
            address: interview.address,
            meetingLink: interview.meeting_link,
            round: interview.round
        });

    } catch (error) {
        console.error('Error fetching interview for cancel:', error);
        res.status(500).json({ error: 'Failed to fetch interview' });
    }
});

// 11. Candidate Cancel Interview (Public)
// POST /api/recruitment/interviews/cancel/:token
router.post('/interviews/cancel/:token', (req, res) => {
    try {
        const { token } = req.params;
        const { reason } = req.body; // 取消原因 (可選)

        // 取得面試資訊
        const interview = req.tenantDB.prepare(`
            SELECT i.*, c.name as candidate_name
            FROM interviews i
            JOIN candidates c ON i.candidate_id = c.id
            WHERE i.cancel_token = ?
        `).get(token);

        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        // 檢查是否已取消
        if (interview.result === 'Cancelled') {
            return res.status(400).json({ error: 'Interview already cancelled' });
        }

        const now = new Date().toISOString();

        // 1. 更新面試狀態為 Cancelled
        const updateInterview = req.tenantDB.prepare(`
            UPDATE interviews 
            SET result = 'Cancelled', cancelled_at = ?, cancel_reason = ?, updated_at = ?
            WHERE id = ?
        `);
        updateInterview.run(now, reason || '候選人婉拒', now, interview.id);

        // 2. 更新候選人狀態
        const updateCandidate = req.tenantDB.prepare(`
            UPDATE candidates 
            SET status = 'interview_declined', stage = 'Rejected', updated_at = ?
            WHERE id = ?
        `);
        updateCandidate.run(now, interview.candidate_id);

        // 3. 自動將婉拒的候選人加入人才庫
        importToTalentPool(req, interview.candidate_id, 'interview', reason || '已安排面試但婉拒');

        res.json({
            success: true,
            message: '感謝您的通知，我們已收到您的取消請求。祝您一切順利！',
            cancelledAt: now
        });

    } catch (error) {
        console.error('Error cancelling interview:', error);
        res.status(500).json({ error: 'Failed to cancel interview' });
    }
});

// 12. Get Response Link for HR (Interview)
// GET /api/recruitment/candidates/:candidateId/response-link
router.get('/candidates/:candidateId/response-link', requireFeaturePerm('L1.recruitment', 'view'), (req, res) => {
    try {
        const { candidateId } = req.params;

        const invitation = req.tenantDB.prepare(`
            SELECT response_token, reply_deadline, status, candidate_response, selected_slots
            FROM interview_invitations 
            WHERE candidate_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
        `).get(candidateId);

        if (!invitation || !invitation.response_token) {
            return res.status(404).json({ error: 'No invitation found for this candidate' });
        }

        res.json({
            responseToken: invitation.response_token,
            responseLink: `/public/interview-response/${invitation.response_token}`,
            replyDeadline: invitation.reply_deadline,
            status: invitation.status,
            candidateResponse: invitation.candidate_response,
            selectedSlots: invitation.selected_slots ? JSON.parse(invitation.selected_slots) : []
        });

    } catch (error) {
        console.error('Error fetching response link:', error);
        res.status(500).json({ error: 'Failed to fetch response link' });
    }
});

// 11. Get Offer Response Link for HR
// GET /api/recruitment/candidates/:candidateId/offer-response-link
router.get('/candidates/:candidateId/offer-response-link', requireFeaturePerm('L1.recruitment', 'view'), (req, res) => {
    try {
        const { candidateId } = req.params;

        const decision = req.tenantDB.prepare(`
            SELECT response_token, reply_deadline, candidate_response, responded_at
            FROM invitation_decisions 
            WHERE candidate_id = ? AND decision = 'Offered' AND response_token IS NOT NULL
            ORDER BY decided_at DESC 
            LIMIT 1
        `).get(candidateId);

        if (!decision || !decision.response_token) {
            return res.status(404).json({ error: 'No offer found for this candidate' });
        }

        res.json({
            responseToken: decision.response_token,
            responseLink: `/public/offer-response/${decision.response_token}`,
            replyDeadline: decision.reply_deadline,
            candidateResponse: decision.candidate_response,
            respondedAt: decision.responded_at
        });

    } catch (error) {
        console.error('Error fetching offer response link:', error);
        res.status(500).json({ error: 'Failed to fetch offer response link' });
    }
});

// ============================================================
// 候選人面試表單 APIs
// ============================================================

/**
 * 輔助函數: 產生 QR Code
 * @param {string} formToken - 表單 Token
 * @returns {Promise<{url: string, qrDataUrl: string}>}
 */
async function generateQRCodeForForm(formToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    const url = `${frontendUrl}/public/interview-form/${formToken}`;
    const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
    });
    return { url, qrDataUrl };
}

/**
 * 輔助函數: 檢查表單是否超時
 * @param {object} form - 表單記錄
 * @returns {boolean} - 是否已超時
 */
function isFormExpired(form) {
    if (!form.started_at) return false;
    const startTime = new Date(form.started_at).getTime();
    const limitMs = (form.time_limit_minutes || 60) * 60 * 1000;
    return Date.now() > startTime + limitMs;
}

// 13. Generate Interview Form Token & QR Code
// POST /api/recruitment/interviews/:id/generate-form
// 如果表單已存在且有 token，返回現有的；只有新表單才產生新 token
router.post('/interviews/:id/generate-form', requireFeaturePerm('L1.recruitment', 'edit'), async (req, res) => {
    try {
        const { id: interviewId } = req.params;
        const { timeLimitMinutes, forceRegenerate } = req.body; // forceRegenerate: 強制重新產生 token

        // 檢查面試是否存在
        const interview = req.tenantDB.prepare(`
            SELECT i.*, c.name as candidate_name, j.title as job_title, j.department
            FROM interviews i
            JOIN candidates c ON i.candidate_id = c.id
            JOIN jobs j ON i.job_id = j.id
            WHERE i.id = ?
        `).get(interviewId);

        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }

        // 檢查是否已有表單
        let existingForm = req.tenantDB.prepare(`
            SELECT * FROM candidate_interview_forms WHERE interview_id = ?
        `).get(interviewId);

        const now = new Date().toISOString();
        const timeLimit = timeLimitMinutes || 60;

        // 如果表單已存在且有 token，且不是強制重新產生，則返回現有 token
        if (existingForm && existingForm.form_token && !forceRegenerate) {
            // 產生 QR Code 圖片（使用現有 token）
            const { url, qrDataUrl } = await generateQRCodeForForm(existingForm.form_token);

            return res.status(200).json({
                success: true,
                formToken: existingForm.form_token,
                formUrl: url,
                qrCodeDataUrl: qrDataUrl,
                timeLimitMinutes: existingForm.time_limit_minutes,
                candidateName: interview.candidate_name,
                jobTitle: interview.job_title,
                department: interview.department,
                interviewAt: interview.interview_at,
                status: existingForm.status,
                isExisting: true,
                message: '返回現有表單 Token'
            });
        }

        // 產生新 Token（新表單或強制重新產生）
        const formToken = uuidv4();

        if (existingForm) {
            // 強制重新產生：更新現有表單的 Token，重置狀態
            req.tenantDB.prepare(`
                UPDATE candidate_interview_forms 
                SET form_token = ?, time_limit_minutes = ?, status = 'Pending', 
                    started_at = NULL, submitted_at = NULL, locked_at = NULL, 
                    current_step = 1, last_saved_at = NULL, form_data = NULL
                WHERE id = ?
            `).run(formToken, timeLimit, existingForm.id);
        } else {
            // 建立新表單
            const formId = uuidv4();
            req.tenantDB.prepare(`
                INSERT INTO candidate_interview_forms (
                    id, interview_id, form_token, status, time_limit_minutes, 
                    current_step, created_at
                ) VALUES (?, ?, ?, 'Pending', ?, 1, ?)
            `).run(formId, interviewId, formToken, timeLimit, now);
        }

        // 同時更新 interviews 表的 form_token 欄位
        req.tenantDB.prepare(`
            UPDATE interviews SET form_token = ?, updated_at = ? WHERE id = ?
        `).run(formToken, now, interviewId);

        // 產生 QR Code
        const { url, qrDataUrl } = await generateQRCodeForForm(formToken);

        res.status(201).json({
            success: true,
            formToken,
            formUrl: url,
            qrCodeDataUrl: qrDataUrl,
            timeLimitMinutes: timeLimit,
            candidateName: interview.candidate_name,
            jobTitle: interview.job_title,
            department: interview.department,
            interviewAt: interview.interview_at,
            isExisting: false,
            message: existingForm ? '表單 Token 已重新產生（舊資料已清除）' : '表單 Token 已建立'
        });

    } catch (error) {
        console.error('Error generating form token:', error);
        res.status(500).json({ error: 'Failed to generate form token' });
    }
});

// 14. Get Interview Form Status (Internal - for HR/Interviewer)
// GET /api/recruitment/interviews/:id/form-status
router.get('/interviews/:id/form-status', requireFeaturePerm('L1.recruitment', 'view'), (req, res) => {
    try {
        const { id: interviewId } = req.params;

        const form = req.tenantDB.prepare(`
            SELECT cif.*, i.interview_at, c.name as candidate_name
            FROM candidate_interview_forms cif
            JOIN interviews i ON cif.interview_id = i.id
            JOIN candidates c ON i.candidate_id = c.id
            WHERE cif.interview_id = ?
        `).get(interviewId);

        if (!form) {
            return res.status(404).json({ error: 'Form not found', hasForm: false });
        }

        // 計算剩餘時間
        let remainingSeconds = null;
        let isExpired = false;
        if (form.started_at) {
            const startTime = new Date(form.started_at).getTime();
            const limitMs = (form.time_limit_minutes || 60) * 60 * 1000;
            const elapsed = Date.now() - startTime;
            remainingSeconds = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
            isExpired = remainingSeconds === 0;
        }

        res.json({
            hasForm: true,
            formToken: form.form_token,
            status: form.status,
            timeLimitMinutes: form.time_limit_minutes,
            startedAt: form.started_at,
            submittedAt: form.submitted_at,
            lockedAt: form.locked_at,
            currentStep: form.current_step,
            lastSavedAt: form.last_saved_at,
            remainingSeconds,
            isExpired,
            candidateName: form.candidate_name,
            interviewAt: form.interview_at
        });

    } catch (error) {
        console.error('Error fetching form status:', error);
        res.status(500).json({ error: '取得表單狀態失敗' });
    }
});

// 15. Get Candidate Form Data (Internal - for Interviewer to review)
// GET /api/recruitment/interviews/:id/form-data
router.get('/interviews/:id/form-data', requireFeaturePerm('L1.recruitment', 'view'), (req, res) => {
    try {
        const { id: interviewId } = req.params;

        const form = req.tenantDB.prepare(`
            SELECT cif.*, i.interview_at, i.location, i.round,
                   c.name as candidate_name, c.email, c.phone,
                   j.title as job_title, j.department
            FROM candidate_interview_forms cif
            JOIN interviews i ON cif.interview_id = i.id
            JOIN candidates c ON i.candidate_id = c.id
            JOIN jobs j ON i.job_id = j.id
            WHERE cif.interview_id = ?
        `).get(interviewId);

        if (!form) {
            return res.status(404).json({ error: 'Form not found' });
        }

        // 只有已送出或鎖定的表單才能查看完整內容
        if (!['Submitted', 'Locked'].includes(form.status)) {
            return res.json({
                status: form.status,
                message: '候選人尚未完成表單填寫',
                currentStep: form.current_step,
                lastSavedAt: form.last_saved_at
            });
        }

        res.json({
            status: form.status,
            submittedAt: form.submitted_at,
            lockedAt: form.locked_at,
            candidateName: form.candidate_name,
            email: form.email,
            phone: form.phone,
            jobTitle: form.job_title,
            department: form.department,
            interviewAt: form.interview_at,
            location: form.location,
            round: form.round,
            formData: form.form_data ? JSON.parse(form.form_data) : null
        });

    } catch (error) {
        console.error('Error fetching form data:', error);
        res.status(500).json({ error: 'Failed to fetch form data' });
    }
});

// ============================================================
// 候選人面試表單 PUBLIC APIs (Token 驗證)
// ============================================================

// 16. Get Form by Token (Public - Candidate)
// GET /api/recruitment/interview-form/:token
router.get('/interview-form/:token', (req, res) => {
    try {
        const { token } = req.params;

        const form = req.tenantDB.prepare(`
            SELECT cif.*, i.interview_at, i.location, i.round,
                   c.id as candidate_id, c.name as candidate_name, c.email, c.phone,
                   c.education, c.expected_salary, c.experience_years,
                   j.title as job_title, j.department
            FROM candidate_interview_forms cif
            JOIN interviews i ON cif.interview_id = i.id
            JOIN candidates c ON i.candidate_id = c.id
            JOIN jobs j ON i.job_id = j.id
            WHERE cif.form_token = ?
        `).get(token);

        if (!form) {
            return res.status(404).json({ 
                error: '找不到表單或連結無效',
                errorType: 'NOT_FOUND'
            });
        }

        // 檢查面試日期（僅限面試當天可填寫，這裡放寬為面試前後 24 小時）
        const interviewDate = new Date(form.interview_at);
        const now = new Date();
        const dayBefore = new Date(interviewDate.getTime() - 24 * 60 * 60 * 1000);
        const dayAfter = new Date(interviewDate.getTime() + 24 * 60 * 60 * 1000);
        
        // 開發模式下跳過日期檢查
        const isDev = process.env.NODE_ENV !== 'production';
        if (!isDev && (now < dayBefore || now > dayAfter)) {
            return res.status(410).json({ 
                error: '此表單僅在面試當天開放填寫',
                errorType: 'NOT_AVAILABLE',
                interviewAt: form.interview_at
            });
        }

        // 檢查是否已送出
        if (form.status === 'Submitted') {
            return res.status(400).json({
                error: '此表單已經送出',
                errorType: 'ALREADY_SUBMITTED',
                submittedAt: form.submitted_at
            });
        }

        // 檢查是否已超時（僅在已開始填寫的情況下）
        if (form.status === 'InProgress' && isFormExpired(form)) {
            // 更新狀態為鎖定
            const now_ts = new Date().toISOString();
            req.tenantDB.prepare(`
                UPDATE candidate_interview_forms 
                SET status = 'Locked', locked_at = ?
                WHERE form_token = ?
            `).run(now_ts, token);

            return res.status(400).json({
                error: '表單填寫時間已截止',
                errorType: 'TIME_EXCEEDED',
                status: 'Locked',
                lockedAt: now_ts
            });
        }

        // 計算剩餘時間
        let remainingSeconds = form.time_limit_minutes * 60;
        if (form.started_at) {
            const startTime = new Date(form.started_at).getTime();
            const limitMs = form.time_limit_minutes * 60 * 1000;
            const elapsed = Date.now() - startTime;
            remainingSeconds = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
        }

        // 取得候選人完整資料（工作經歷、駕照等）
        const candidateFull = req.tenantDB.prepare(`
            SELECT c.*, c.driving_licenses, c.birthday
            FROM candidates c WHERE c.id = ?
        `).get(form.candidate_id);

        // 取得候選人工作經歷
        const experiences = req.tenantDB.prepare(`
            SELECT firm_name, job_name, start_date, end_date
            FROM candidate_experiences 
            WHERE candidate_id = ?
            ORDER BY start_date DESC
        `).all(form.candidate_id);

        // 計算工作年資
        const calculateYearsOfService = (startDate, endDate) => {
            if (!startDate) return '';
            const start = new Date(startDate);
            const end = endDate ? new Date(endDate) : new Date();
            const years = Math.floor((end - start) / (365.25 * 24 * 60 * 60 * 1000));
            const months = Math.floor(((end - start) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
            if (years > 0 && months > 0) return `${years}年${months}個月`;
            if (years > 0) return `${years}年`;
            if (months > 0) return `${months}個月`;
            return '';
        };

        // 轉換工作經歷格式
        const workExperiences = experiences.map(exp => ({
            companyName: exp.firm_name || '',
            jobTitle: exp.job_name || '',
            yearsOfService: calculateYearsOfService(exp.start_date, exp.end_date)
        }));

        // 解析駕照資料
        let drivingLicenses = [];
        if (candidateFull?.driving_licenses) {
            try {
                const licenses = candidateFull.driving_licenses;
                if (licenses.includes('普通小型車') || licenses.includes('汽車')) {
                    drivingLicenses.push('汽車');
                }
                if (licenses.includes('普通重型機車') || licenses.includes('輕型機車') || licenses.includes('機車')) {
                    drivingLicenses.push('機車');
                }
            } catch (e) {
                console.warn('Error parsing driving licenses:', e);
            }
        }

        res.json({
            formId: form.id,
            status: form.status,
            timeLimitMinutes: form.time_limit_minutes,
            remainingSeconds,
            currentStep: form.current_step,
            startedAt: form.started_at,
            lastSavedAt: form.last_saved_at,
            // 候選人基本資訊（用於預填表單）
            candidate: {
                id: form.candidate_id,
                name: form.candidate_name,
                email: form.email,
                phone: form.phone,
                education: form.education,
                expectedSalary: form.expected_salary,
                experienceYears: form.experience_years,
                birthday: candidateFull?.birthday,
                drivingLicenses: drivingLicenses
            },
            // 候選人工作經歷（用於預填表單）
            workExperiences: workExperiences.length > 0 ? workExperiences : null,
            // 面試資訊
            interview: {
                jobTitle: form.job_title,
                department: form.department,
                interviewAt: form.interview_at,
                location: form.location,
                round: form.round
            },
            // 已儲存的表單資料
            formData: form.form_data ? JSON.parse(form.form_data) : null
        });

    } catch (error) {
        console.error('Error fetching form:', error);
        res.status(500).json({ error: '載入表單失敗，請稍後再試' });
    }
});

// 17. Start Form (Public - Record start time)
// POST /api/recruitment/interview-form/:token/start
router.post('/interview-form/:token/start', (req, res) => {
    try {
        const { token } = req.params;

        const form = req.tenantDB.prepare(`
            SELECT * FROM candidate_interview_forms WHERE form_token = ?
        `).get(token);

        if (!form) {
            return res.status(404).json({ 
                error: '找不到表單',
                errorType: 'NOT_FOUND'
            });
        }

        // 檢查狀態
        if (form.status === 'Submitted') {
            return res.status(400).json({ 
                error: '此表單已經送出',
                errorType: 'ALREADY_SUBMITTED'
            });
        }

        if (form.status === 'Locked') {
            return res.status(400).json({ 
                error: '此表單已鎖定',
                errorType: 'LOCKED'
            });
        }

        // 如果已經開始，返回現有資訊
        if (form.started_at) {
            const startTime = new Date(form.started_at).getTime();
            const limitMs = form.time_limit_minutes * 60 * 1000;
            const elapsed = Date.now() - startTime;
            const remainingSeconds = Math.max(0, Math.floor((limitMs - elapsed) / 1000));

            return res.json({
                success: true,
                alreadyStarted: true,
                startedAt: form.started_at,
                remainingSeconds,
                currentStep: form.current_step
            });
        }

        // 記錄開始時間
        const now = new Date().toISOString();
        req.tenantDB.prepare(`
            UPDATE candidate_interview_forms 
            SET status = 'InProgress', started_at = ?
            WHERE form_token = ?
        `).run(now, token);

        res.json({
            success: true,
            alreadyStarted: false,
            startedAt: now,
            remainingSeconds: form.time_limit_minutes * 60,
            currentStep: form.current_step
        });

    } catch (error) {
        console.error('Error starting form:', error);
        res.status(500).json({ error: '開始表單失敗，請稍後再試' });
    }
});

// 18. Save Form Data (Public - Auto-save)
// PATCH /api/recruitment/interview-form/:token/save
router.patch('/interview-form/:token/save', (req, res) => {
    try {
        const { token } = req.params;
        const { formData, currentStep } = req.body;

        const form = req.tenantDB.prepare(`
            SELECT * FROM candidate_interview_forms WHERE form_token = ?
        `).get(token);

        if (!form) {
            return res.status(404).json({ 
                error: '找不到表單',
                errorType: 'NOT_FOUND'
            });
        }

        // 檢查狀態
        if (form.status === 'Submitted') {
            return res.status(400).json({ 
                error: '此表單已送出，無法儲存',
                errorType: 'ALREADY_SUBMITTED'
            });
        }

        if (form.status === 'Locked') {
            return res.status(400).json({ 
                error: '此表單已鎖定，無法儲存',
                errorType: 'LOCKED'
            });
        }

        // 檢查是否超時
        if (form.started_at && isFormExpired(form)) {
            const now_ts = new Date().toISOString();
            req.tenantDB.prepare(`
                UPDATE candidate_interview_forms 
                SET status = 'Locked', locked_at = ?
                WHERE form_token = ?
            `).run(now_ts, token);

            return res.status(400).json({
                error: '表單填寫時間已截止',
                errorType: 'TIME_EXCEEDED',
                status: 'Locked'
            });
        }

        const now = new Date().toISOString();
        const formDataJson = formData ? JSON.stringify(formData) : form.form_data;

        req.tenantDB.prepare(`
            UPDATE candidate_interview_forms 
            SET form_data = ?, current_step = COALESCE(?, current_step), 
                last_saved_at = ?, status = COALESCE(NULLIF(status, 'Pending'), 'InProgress')
            WHERE form_token = ?
        `).run(formDataJson, currentStep, now, token);

        res.json({
            success: true,
            savedAt: now,
            currentStep: currentStep || form.current_step
        });

    } catch (error) {
        console.error('Error saving form:', error);
        res.status(500).json({ error: '儲存表單失敗，請稍後再試' });
    }
});

// 19. Submit Form (Public - Final submit)
// POST /api/recruitment/interview-form/:token/submit
router.post('/interview-form/:token/submit', (req, res) => {
    try {
        const { token } = req.params;
        const { formData } = req.body;

        const form = req.tenantDB.prepare(`
            SELECT cif.*, i.candidate_id
            FROM candidate_interview_forms cif
            JOIN interviews i ON cif.interview_id = i.id
            WHERE cif.form_token = ?
        `).get(token);

        if (!form) {
            return res.status(404).json({ 
                error: '找不到表單',
                errorType: 'NOT_FOUND'
            });
        }

        // 檢查狀態
        if (form.status === 'Submitted') {
            return res.status(400).json({ 
                error: '此表單已經送出',
                errorType: 'ALREADY_SUBMITTED',
                submittedAt: form.submitted_at
            });
        }

        const now = new Date().toISOString();
        const formDataJson = formData ? JSON.stringify(formData) : form.form_data;

        // 即使超時也允許送出（只是記錄為鎖定狀態後送出）
        const isExpired = form.started_at && isFormExpired(form);
        const finalStatus = isExpired ? 'Locked' : 'Submitted';

        req.tenantDB.prepare(`
            UPDATE candidate_interview_forms 
            SET form_data = ?, status = ?, submitted_at = ?, 
                locked_at = CASE WHEN ? = 'Locked' THEN ? ELSE locked_at END,
                current_step = 5, last_saved_at = ?
            WHERE form_token = ?
        `).run(formDataJson, finalStatus, now, finalStatus, now, now, token);

        // 更新候選人評分狀態為 Scoring（待評分）
        req.tenantDB.prepare(`
            UPDATE candidates 
            SET scoring_status = 'Scoring', updated_at = ?
            WHERE id = ?
        `).run(now, form.candidate_id);

        res.json({
            success: true,
            status: finalStatus,
            submittedAt: now,
            message: isExpired 
                ? '表單已送出（超時後送出）' 
                : '感謝您完成表單填寫！'
        });

    } catch (error) {
        console.error('Error submitting form:', error);
        res.status(500).json({ error: '送出表單失敗，請稍後再試' });
    }
});

// 20. Get Form Status (Public - for countdown timer sync)
// GET /api/recruitment/interview-form/:token/status
router.get('/interview-form/:token/status', (req, res) => {
    try {
        const { token } = req.params;

        const form = req.tenantDB.prepare(`
            SELECT status, time_limit_minutes, started_at, submitted_at, locked_at, current_step
            FROM candidate_interview_forms
            WHERE form_token = ?
        `).get(token);

        if (!form) {
            return res.status(404).json({ 
                error: '找不到表單',
                errorType: 'NOT_FOUND'
            });
        }

        // 計算剩餘時間
        let remainingSeconds = form.time_limit_minutes * 60;
        let isExpired = false;

        if (form.started_at) {
            const startTime = new Date(form.started_at).getTime();
            const limitMs = form.time_limit_minutes * 60 * 1000;
            const elapsed = Date.now() - startTime;
            remainingSeconds = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
            isExpired = remainingSeconds === 0;
        }

        // 如果已超時但狀態尚未更新，自動更新為鎖定
        if (isExpired && form.status === 'InProgress') {
            const now = new Date().toISOString();
            req.tenantDB.prepare(`
                UPDATE candidate_interview_forms 
                SET status = 'Locked', locked_at = ?
                WHERE form_token = ?
            `).run(now, token);
            form.status = 'Locked';
            form.locked_at = now;
        }

        res.json({
            status: form.status,
            remainingSeconds,
            isExpired,
            startedAt: form.started_at,
            submittedAt: form.submitted_at,
            lockedAt: form.locked_at,
            currentStep: form.current_step
        });

    } catch (error) {
        console.error('Error fetching form status:', error);
        res.status(500).json({ error: '取得表單狀態失敗' });
    }
});

// 21. Regenerate QR Code (for existing form)
// POST /api/recruitment/interviews/:id/regenerate-qrcode
router.post('/interviews/:id/regenerate-qrcode', requireFeaturePerm('L1.recruitment', 'edit'), async (req, res) => {
    try {
        const { id: interviewId } = req.params;

        const form = req.tenantDB.prepare(`
            SELECT form_token FROM candidate_interview_forms WHERE interview_id = ?
        `).get(interviewId);

        if (!form || !form.form_token) {
            return res.status(404).json({ 
                error: '找不到表單，請先產生表單',
                errorType: 'NOT_FOUND'
            });
        }

        // 產生 QR Code
        const { url, qrDataUrl } = await generateQRCodeForForm(form.form_token);

        res.json({
            success: true,
            formToken: form.form_token,
            formUrl: url,
            qrCodeDataUrl: qrDataUrl
        });

    } catch (error) {
        console.error('Error regenerating QR code:', error);
        res.status(500).json({ error: '產生 QR Code 失敗' });
    }
});

// ============================================================
// DEV TOOLS
// ============================================================

// Reset Demo Data
// POST /api/recruitment/reset-demo
router.post('/reset-demo', requireFeaturePerm('L1.recruitment', 'edit'), (req, res) => {
    try {
        const now = new Date().toISOString();

        // 1. Clear related tables
        req.tenantDB.prepare('DELETE FROM interview_evaluations').run();
        req.tenantDB.prepare('DELETE FROM invitation_decisions').run();
        req.tenantDB.prepare('DELETE FROM interviews').run();
        req.tenantDB.prepare('DELETE FROM interview_invitations').run();

        // 2. Reset Candidates
        req.tenantDB.prepare(`
            UPDATE candidates 
            SET stage = 'Applied', status = 'new', scoring_status = 'Pending', 
                ai_summary = NULL, updated_at = ?
        `).run(now);

        res.json({ success: true, message: 'Demo data reset successfully' });

    } catch (error) {
        console.error('Error resetting demo data:', error);
        res.status(500).json({ error: 'Failed to reset demo data' });
    }
});

module.exports = router;
