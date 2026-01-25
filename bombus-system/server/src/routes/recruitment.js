const express = require('express');
const router = express.Router();
const { prepare } = require('../db');
const { v4: uuidv4 } = require('uuid');

/**
 * ------------------------------------------------------------------
 * Recruitment & Interview API
 * ------------------------------------------------------------------
 */

// 0. Get All Candidates (List)
// GET /api/recruitment/candidates
router.get('/candidates', (req, res) => {
    try {
        const candidates = prepare('SELECT * FROM candidates ORDER BY created_at DESC').all();
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

        // 1. Record Decision
        const stmt = prepare(`
            INSERT INTO invitation_decisions (
                id, candidate_id, decision, decided_by, reason, decided_at
            ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, candidateId, decision, decidedBy, reason, now);

        // 2. Update Candidate Stage & Status
        const statusMap = { 'Offered': 'hired', 'Rejected': 'rejected' };
        const newStatus = statusMap[decision] || 'new';

        const updateStmt = prepare(`
            UPDATE candidates 
            SET stage = ?, status = ?, updated_at = ? 
            WHERE id = ?
        `);
        updateStmt.run(decision, newStatus, now, candidateId);

        res.status(201).json({ success: true, message: `Candidate stage updated to ${decision}` });

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

        // Get basic info
        const candidate = prepare('SELECT * FROM candidates WHERE id = ?').get(candidateId);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }

        // Get Interviews
        const interviews = prepare('SELECT * FROM interviews WHERE candidate_id = ? ORDER BY created_at DESC').all(candidateId);

        // Get Invitation
        const invitation = prepare('SELECT * FROM interview_invitations WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1').get(candidateId);

        // Get Decision
        const decision = prepare('SELECT * FROM invitation_decisions WHERE candidate_id = ? ORDER BY decided_at DESC LIMIT 1').get(candidateId);

        res.json({
            ...candidate,
            interviews,
            invitation,
            decision
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

// 8. Get Response Link for HR
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

module.exports = router;
