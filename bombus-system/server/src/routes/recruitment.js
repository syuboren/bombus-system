const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * ------------------------------------------------------------------
 * Recruitment & Interview API
 * ------------------------------------------------------------------
 */

// --- 初始化面試評分表格 (如果不存在) ---
try {
    prepare(`
        CREATE TABLE IF NOT EXISTS interview_evaluations (
            id TEXT PRIMARY KEY,
            candidate_id TEXT NOT NULL,
            interview_id TEXT,
            evaluator_id TEXT,
            performance_description TEXT,
            dimension_scores TEXT,
            overall_comment TEXT,
            total_score INTEGER DEFAULT 0,
            transcript_text TEXT,
            media_url TEXT,
            ai_analysis_result TEXT,
            status TEXT DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME,
            FOREIGN KEY (candidate_id) REFERENCES candidates(id)
        )
    `).run();
    console.log('✅ interview_evaluations table ready');
} catch (err) {
    console.log('interview_evaluations table already exists or error:', err.message);
}

// --- 面試評分完整 API ---

// 9. 儲存面試評分 (完整) - 使用 Upsert 邏輯
// POST /api/recruitment/candidates/:candidateId/evaluation
router.post('/candidates/:candidateId/evaluation', (req, res) => {
    try {
        const { candidateId } = req.params;
        const {
            interviewId,
            evaluatorId,
            performanceDescription,
            dimensionScores,
            overallComment,
            totalScore,
            transcriptText,
            mediaUrl,
            mediaSize, // 新增：檔案大小
            aiAnalysisResult
        } = req.body;

        const now = new Date().toISOString();
        const dimensionScoresJson = typeof dimensionScores === 'object' ? JSON.stringify(dimensionScores) : dimensionScores;
        const aiResultJson = typeof aiAnalysisResult === 'object' ? JSON.stringify(aiAnalysisResult) : aiAnalysisResult;

        // 檢查是否已存在評分記錄
        const existing = prepare(`
            SELECT id FROM interview_evaluations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1
        `).get(candidateId);

        let evaluationId;

        if (existing) {
            // 更新現有記錄
            evaluationId = existing.id;
            const stmt = prepare(`
                UPDATE interview_evaluations SET
                    interview_id = COALESCE(?, interview_id),
                    evaluator_id = COALESCE(?, evaluator_id),
                    performance_description = COALESCE(?, performance_description),
                    dimension_scores = COALESCE(?, dimension_scores),
                    overall_comment = COALESCE(?, overall_comment),
                    total_score = COALESCE(?, total_score),
                    transcript_text = COALESCE(?, transcript_text),
                    media_url = COALESCE(?, media_url),
                    media_size = COALESCE(?, media_size),
                    ai_analysis_result = COALESCE(?, ai_analysis_result),
                    status = 'submitted',
                    updated_at = ?
                WHERE id = ?
            `);
            stmt.run(
                interviewId || null, evaluatorId || null,
                performanceDescription || null, dimensionScoresJson || null,
                overallComment || null, totalScore || null,
                transcriptText || null, mediaUrl || null,
                mediaSize || null, aiResultJson || null, now, evaluationId
            );
        } else {
            // 創建新記錄
            evaluationId = uuidv4();
            const stmt = prepare(`
                INSERT INTO interview_evaluations (
                    id, candidate_id, interview_id, evaluator_id, 
                    performance_description, dimension_scores, overall_comment, total_score,
                    transcript_text, media_url, media_size, ai_analysis_result, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?)
            `);
            stmt.run(
                evaluationId, candidateId, interviewId || null, evaluatorId || null,
                performanceDescription, dimensionScoresJson, overallComment, totalScore || 0,
                transcriptText || null, mediaUrl || null, mediaSize || 0, aiResultJson || null, now, now
            );
        }

        // 更新候選人狀態
        // 根據是否有 AI 分析結果來決定狀態
        let newStatus = 'pending_ai'; // 預設：待 AI 分析
        if (aiResultJson) {
            newStatus = 'pending_decision'; // 有 AI 結果：待決策
        }

        const updateCand = prepare(`
            UPDATE candidates SET status = ?, scoring_status = 'Scored', updated_at = ? WHERE id = ?
        `);
        updateCand.run(newStatus, now, candidateId);

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
router.get('/candidates/:candidateId/evaluation', (req, res) => {
    try {
        const { candidateId } = req.params;

        const evaluation = prepare(`
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
            dimension_scores: evaluation.dimension_scores ? JSON.parse(evaluation.dimension_scores) : [],
            ai_analysis_result: evaluation.ai_analysis_result ? JSON.parse(evaluation.ai_analysis_result) : null
        });

    } catch (error) {
        console.error('Error fetching evaluation:', error);
        res.status(500).json({ error: 'Failed to fetch evaluation' });
    }
});

// 11. 更新面試評分
// PATCH /api/recruitment/candidates/:candidateId/evaluation
router.patch('/candidates/:candidateId/evaluation', (req, res) => {
    try {
        const { candidateId } = req.params;
        const {
            performanceDescription,
            dimensionScores,
            overallComment,
            totalScore,
            transcriptText,
            mediaUrl,
            aiAnalysisResult
        } = req.body;

        const now = new Date().toISOString();

        // 取得現有評分
        const existing = prepare(`
            SELECT id FROM interview_evaluations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1
        `).get(candidateId);

        if (!existing) {
            return res.status(404).json({ error: 'No evaluation found to update' });
        }

        const dimensionScoresJson = dimensionScores ?
            (typeof dimensionScores === 'object' ? JSON.stringify(dimensionScores) : dimensionScores) : null;
        const aiResultJson = aiAnalysisResult ?
            (typeof aiAnalysisResult === 'object' ? JSON.stringify(aiAnalysisResult) : aiAnalysisResult) : null;

        const stmt = prepare(`
            UPDATE interview_evaluations SET
                performance_description = COALESCE(?, performance_description),
                dimension_scores = COALESCE(?, dimension_scores),
                overall_comment = COALESCE(?, overall_comment),
                total_score = COALESCE(?, total_score),
                transcript_text = COALESCE(?, transcript_text),
                media_url = COALESCE(?, media_url),
                ai_analysis_result = COALESCE(?, ai_analysis_result),
                updated_at = ?
            WHERE id = ?
        `);
        stmt.run(
            performanceDescription || null,
            dimensionScoresJson,
            overallComment || null,
            totalScore || null,
            transcriptText || null,
            mediaUrl || null,
            aiResultJson,
            now,
            existing.id
        );

        // Update Candidate Status based on AI Analysis
        // If AI Analysis is provided, move to 'pending_decision'
        if (aiResultJson) {
            const updateCand = prepare(`
                UPDATE candidates SET status = 'pending_decision', scoring_status = 'Scored', updated_at = ? WHERE id = ?
            `);
            updateCand.run(now, candidateId);
        } else {
            // Ensure it's marked as Scored at least
            const updateCand = prepare(`
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
router.get('/candidates', (req, res) => {
    try {
        const candidates = prepare(`
            SELECT c.*, j.title as job_title,
            (SELECT ie.ai_analysis_result FROM interview_evaluations ie WHERE ie.candidate_id = c.id LIMIT 1) as ai_analysis_result
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            WHERE EXISTS (SELECT 1 FROM interviews WHERE candidate_id = c.id)
            ORDER BY c.created_at DESC
        `).all();
        res.json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

// 1. Send Interview Invitation
// POST /api/recruitment/candidates/:candidateId/invitations
router.post('/candidates/:candidateId/invitations', (req, res) => {
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
        const stmt = prepare(`
            INSERT INTO interview_invitations (
                id, candidate_id, job_id, status, proposed_slots, message, reply_deadline, response_token, created_at, updated_at
            ) VALUES (?, ?, ?, 'Pending', ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(invitationId, candidateId, jobId, slotsJson, message, replyDeadline, responseToken, now, now);

        // 2. Update Candidate Stage & Status
        const updateStmt = prepare(`
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
router.post('/interviews', (req, res) => {
    try {
        const { candidateId, jobId, interviewerId, interviewAt, location, meetingLink, round } = req.body;

        if (!candidateId || !jobId || !interviewAt) {
            return res.status(400).json({ error: 'Missing required fields for scheduling' });
        }

        const interviewId = uuidv4();
        const now = new Date().toISOString();

        // 1. Create Interview Record with meeting_link
        const stmt = prepare(`
            INSERT INTO interviews (
                id, candidate_id, job_id, interviewer_id, round, interview_at, location, meeting_link, result, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        `);
        stmt.run(interviewId, candidateId, jobId, interviewerId, round || 1, interviewAt, location, meetingLink || null, now, now);

        // 2. Update Candidate Status to interview
        const updateCand = prepare(`
            UPDATE candidates 
            SET status = 'interview', updated_at = ?
            WHERE id = ?
        `);
        updateCand.run(now, candidateId);

        res.status(201).json({
            success: true,
            interviewId,
            message: 'Interview scheduled successfully'
        });

    } catch (error) {
        console.error('Error scheduling interview:', error);
        res.status(500).json({ error: 'Failed to schedule interview' });
    }
});

// 3. Submit Interview Evaluation (Score)
// PATCH /api/recruitment/interviews/:interviewId/evaluation
router.patch('/interviews/:interviewId/evaluation', (req, res) => {
    try {
        const { interviewId } = req.params;
        const { evaluationJson, result, remark } = req.body;

        if (!result) {
            return res.status(400).json({ error: 'Result is required (Pass/Hold/Fail)' });
        }

        const now = new Date().toISOString();
        const evalStr = typeof evaluationJson === 'object' ? JSON.stringify(evaluationJson) : evaluationJson;

        const stmt = prepare(`
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
        const getInterview = prepare('SELECT candidate_id FROM interviews WHERE id = ?').get(interviewId);
        if (getInterview) {
            const updateCand = prepare(`
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
router.post('/candidates/:candidateId/decision', (req, res) => {
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
        const stmt = prepare(`
            INSERT INTO invitation_decisions (
                id, candidate_id, decision, decided_by, reason, decided_at,
                response_token, reply_deadline
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, candidateId, decision, decidedBy, reason, now, responseToken, replyDeadline);

        // 2. Update Candidate Stage & Status
        // Offered 狀態改為 'offered'（待候選人回覆），而非 'hired'
        const statusMap = { 'Offered': 'offered', 'Rejected': 'rejected' };
        const newStatus = statusMap[decision] || 'new';

        const updateStmt = prepare(`
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

// 5. Get Extended Candidate Details
// GET /api/recruitment/candidates/:candidateId
router.get('/candidates/:candidateId', (req, res) => {
    try {
        const { candidateId } = req.params;

        // Get basic info with Job Title
        const candidate = prepare(`
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
        const interviews = prepare('SELECT * FROM interviews WHERE candidate_id = ? ORDER BY created_at DESC').all(candidateId);

        // Get Invitation
        const invitation = prepare('SELECT * FROM interview_invitations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1').get(candidateId);

        // Get Decision
        const decision = prepare('SELECT * FROM invitation_decisions WHERE candidate_id = ? ORDER BY decided_at DESC LIMIT 1').get(candidateId);

        // Get Evaluation
        // Get Evaluation (Latest)
        const evaluation = prepare('SELECT * FROM interview_evaluations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1').get(candidateId);

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

        const invitation = prepare(`
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
        const invitation = prepare('SELECT * FROM interview_invitations WHERE response_token = ?').get(token);

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
            candidateStatus = 'rejected';
        } else if (response === 'reschedule') {
            newStatus = 'Reschedule';
            candidateStatus = 'reschedule';
        }

        // Update invitation (include reschedule_note if applicable)
        const stmt = prepare(`
            UPDATE interview_invitations 
            SET candidate_response = ?, selected_slots = ?, responded_at = ?, status = ?, updated_at = ?,
                reschedule_note = COALESCE(?, reschedule_note)
            WHERE response_token = ?
        `);
        stmt.run(response, slotsJson, now, newStatus, now, rescheduleNote || null, token);

        // Update candidate status
        if (candidateStatus) {
            const updateCand = prepare(`
                UPDATE candidates 
                SET stage = ?, status = ?, updated_at = ?
                WHERE id = ?
            `);
            const stage = response === 'declined' ? 'Rejected' : 'Invited';
            updateCand.run(stage, candidateStatus, now, invitation.candidate_id);
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
        const offer = prepare(`
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
        const offer = prepare('SELECT * FROM invitation_decisions WHERE response_token = ?').get(token);

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
        const updateOffer = prepare(`
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

        const updateCandidate = prepare(`
            UPDATE candidates 
            SET status = ?, stage = ?, updated_at = ?
            WHERE id = ?
        `);
        updateCandidate.run(newStatus, newStage, now, offer.candidate_id);

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

// 10. Get Response Link for HR (Interview)
// GET /api/recruitment/candidates/:candidateId/response-link
router.get('/candidates/:candidateId/response-link', (req, res) => {
    try {
        const { candidateId } = req.params;

        const invitation = prepare(`
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
router.get('/candidates/:candidateId/offer-response-link', (req, res) => {
    try {
        const { candidateId } = req.params;

        const decision = prepare(`
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
// DEV TOOLS
// ============================================================

// Reset Demo Data
// POST /api/recruitment/reset-demo
router.post('/reset-demo', (req, res) => {
    try {
        const now = new Date().toISOString();

        // 1. Clear related tables
        prepare('DELETE FROM interview_evaluations').run();
        prepare('DELETE FROM invitation_decisions').run();
        prepare('DELETE FROM interviews').run();
        prepare('DELETE FROM interview_invitations').run();

        // 2. Reset Candidates
        prepare(`
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
