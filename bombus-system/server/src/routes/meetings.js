/**
 * Meeting Management API Routes
 */

const express = require('express');
const router = express.Router();
// tenantDB is accessed via req.tenantDB (injected by middleware)
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload for meeting attachments
const uploadDir = path.join(__dirname, '../../uploads/meetings');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'meeting-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Helper: Get full meeting details
function getMeetingDetails(req, meetingId) {
    const meeting = req.tenantDB.prepare(`
        SELECT * FROM meetings WHERE id = ?
    `).get(meetingId);

    if (!meeting) return null;

    // Get related data with employee_no from employees table
    const attendees = req.tenantDB.prepare(`
        SELECT 
            ma.*,
            e.employee_no
        FROM meeting_attendees ma
        LEFT JOIN employees e ON ma.employee_id = e.id
        WHERE ma.meeting_id = ?
    `).all(meetingId);
    const agenda = req.tenantDB.prepare(`SELECT * FROM meeting_agenda_items WHERE meeting_id = ? ORDER BY order_index ASC`).all(meetingId);
    const conclusions = req.tenantDB.prepare(`SELECT * FROM meeting_conclusions WHERE meeting_id = ?`).all(meetingId);
    const attachments = req.tenantDB.prepare(`SELECT * FROM meeting_attachments WHERE meeting_id = ?`).all(meetingId);
    const reminders = req.tenantDB.prepare(`SELECT * FROM meeting_reminders WHERE meeting_id = ?`).all(meetingId);

    // Parse JSON fields
    agenda.forEach(a => {
        try { a.discussion_points = JSON.parse(a.discussion_points || '[]'); } catch (e) { a.discussion_points = []; }
    });
    conclusions.forEach(c => {
        try { c.progress_notes = JSON.parse(c.progress_notes || '[]'); } catch (e) { c.progress_notes = []; }
    });

    return {
        ...meeting,
        isOnline: Boolean(meeting.is_online),
        attendees,
        agenda,
        conclusions,
        attachments,
        reminders
    };
}

/**
 * GET /api/meetings/conclusions
 * Get all conclusions with source meeting info
 * Query params:
 *   - status: 狀態過濾 (pending | in-progress | completed | overdue)
 *   - department: 部門過濾
 */
router.get('/conclusions', (req, res) => {
    try {
        const { status, department, org_unit_id } = req.query;

        let query = `
            SELECT
                c.*,
                m.title as meeting_title,
                m.start_time as meeting_date,
                m.type as meeting_type
            FROM meeting_conclusions c
            JOIN meetings m ON c.meeting_id = m.id
            WHERE 1=1
        `;
        let params = [];

        if (org_unit_id) {
            query += ` AND m.org_unit_id = ?`;
            params.push(org_unit_id);
        }

        if (status) {
            // 處理逾期狀態
            if (status === 'overdue') {
                query += ` AND c.status != 'completed' AND c.due_date < date('now')`;
            } else {
                query += ` AND c.status = ?`;
                params.push(status);
            }
        }

        if (department) {
            query += ` AND c.department = ?`;
            params.push(department);
        }

        query += ` ORDER BY c.due_date ASC`;

        const conclusions = req.tenantDB.prepare(query).all(...params);

        // 檢查並標記逾期狀態
        const now = new Date();
        const result = conclusions.map(c => {
            const dueDate = new Date(c.due_date);
            const isOverdue = c.status !== 'completed' && dueDate < now;
            return {
                ...c,
                meetingTitle: c.meeting_title,
                meetingDate: c.meeting_date,
                meetingType: c.meeting_type,
                meetingId: c.meeting_id,
                responsibleId: c.responsible_id,
                responsibleName: c.responsible_name,
                dueDate: c.due_date,
                createdAt: c.created_at,
                completedAt: c.completed_at,
                isOverdue
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching conclusions:', error);
        res.status(500).json({ error: 'Failed to fetch conclusions' });
    }
});

/**
 * GET /api/meetings
 * List meetings with filters
 * Query params:
 *   - start: 開始時間過濾
 *   - end: 結束時間過濾
 *   - type: 會議類型過濾
 *   - scope: 瀏覽層級 (company | department | personal)
 *   - employeeId: 員工 ID (personal scope 需要)
 *   - department: 部門名稱 (department scope 需要)
 */
router.get('/', (req, res) => {
    try {
        const { start, end, type, scope, employeeId, department, org_unit_id } = req.query;

        // 根據 scope 決定查詢方式
        let meetingIds = null;

        if (scope === 'personal' && employeeId) {
            // 個人層級：只顯示該員工參與的會議
            const attendedMeetings = req.tenantDB.prepare(`
                SELECT DISTINCT meeting_id FROM meeting_attendees WHERE employee_id = ?
            `).all(employeeId);
            meetingIds = attendedMeetings.map(m => m.meeting_id);
        } else if (scope === 'department' && department) {
            // 部門層級：只顯示該部門成員參與的會議
            // 1. 先取得該部門所有員工的 ID
            const deptEmployees = req.tenantDB.prepare(`
                SELECT id FROM employees WHERE department = ?
            `).all(department);
            const employeeIds = deptEmployees.map(e => e.id);

            if (employeeIds.length > 0) {
                // 2. 取得這些員工參與的會議
                const placeholders = employeeIds.map(() => '?').join(',');
                const attendedMeetings = req.tenantDB.prepare(`
                    SELECT DISTINCT meeting_id FROM meeting_attendees 
                    WHERE employee_id IN (${placeholders})
                `).all(...employeeIds);
                meetingIds = attendedMeetings.map(m => m.meeting_id);
            } else {
                meetingIds = [];
            }
        }
        // scope === 'company' 或未指定時，顯示所有會議

        let query = `SELECT * FROM meetings WHERE 1=1`;
        let params = [];

        // 如果有 scope 過濾，限制會議 ID
        if (meetingIds !== null) {
            if (meetingIds.length === 0) {
                // 沒有任何會議，直接返回空陣列
                return res.json([]);
            }
            const placeholders = meetingIds.map(() => '?').join(',');
            query += ` AND id IN (${placeholders})`;
            params.push(...meetingIds);
        }

        if (start) {
            query += ` AND start_time >= ?`;
            params.push(start);
        }
        if (end) {
            query += ` AND end_time <= ?`;
            params.push(end);
        }
        if (type) {
            query += ` AND type = ?`;
            params.push(type);
        }
        if (org_unit_id) {
            query += ` AND org_unit_id = ?`;
            params.push(org_unit_id);
        }

        query += ` ORDER BY start_time ASC`;

        const meetings = req.tenantDB.prepare(query).all(...params);

        // For list view, we might not need all details, but let's include attendees count
        const result = meetings.map(m => {
            const attendeeCount = req.tenantDB.prepare(`SELECT COUNT(*) as count FROM meeting_attendees WHERE meeting_id = ?`).get(m.id).count;
            return {
                ...m,
                isOnline: Boolean(m.is_online),
                attendeeCount
            };
        });

        res.json(result);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ error: 'Failed to fetch meetings' });
    }
});

/**
 * POST /api/meetings
 * Create a new meeting
 */
router.post('/', (req, res) => {
    try {
        const {
            title, type, status, location, isOnline, meetingLink,
            startTime, endTime, duration, recurrence, recurrenceEndDate, notes,
            org_unit_id,
            attendees = [], agenda = [], reminders = [], attachments = []
        } = req.body;

        const id = uuidv4();
        const now = new Date().toISOString();

        // 計算 duration（如果未提供）
        let calculatedDuration = duration;
        if (!calculatedDuration && startTime && endTime) {
            const start = new Date(startTime).getTime();
            const end = new Date(endTime).getTime();
            calculatedDuration = Math.round((end - start) / (1000 * 60));
        }

        // 1. Create Meeting
        req.tenantDB.prepare(`
            INSERT INTO meetings (
                id, title, type, status, location, is_online, meeting_link,
                start_time, end_time, duration, recurrence, recurrence_end_date, notes,
                org_unit_id, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, title, type, status || 'scheduled', location, isOnline ? 1 : 0, meetingLink,
            startTime, endTime, calculatedDuration, recurrence, recurrenceEndDate, notes,
            org_unit_id || null, now, now
        );

        // 2. Add Attendees
        attendees.forEach(a => {
            req.tenantDB.prepare(`
                INSERT INTO meeting_attendees (
                    id, meeting_id, employee_id, name, email, department, position, avatar,
                    is_organizer, is_required, attendance_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), id, a.employeeId || a.id, a.name, a.email, a.department, a.position, a.avatar,
                a.isOrganizer ? 1 : 0, a.isRequired !== false ? 1 : 0, a.attendanceStatus || 'pending'
            );
        });

        // 3. Add Agenda
        agenda.forEach((item, index) => {
            const discussionPointsJson = item.discussionPoints ? JSON.stringify(item.discussionPoints) : null;
            req.tenantDB.prepare(`
                INSERT INTO meeting_agenda_items (
                    id, meeting_id, title, description, discussion_points, presenter, duration,
                    status, order_index, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), id, item.title, item.description, discussionPointsJson, item.presenter, item.duration,
                item.status || 'pending', index, 'system', now
            );
        });

        // 4. Add Reminders
        reminders.forEach(r => {
            req.tenantDB.prepare(`
                INSERT INTO meeting_reminders (id, meeting_id, timing, enabled)
                VALUES (?, ?, ?, ?)
            `).run(uuidv4(), id, r.timing, r.enabled ? 1 : 0);
        });

        // 5. Add Attachments (only if they have a URL - already uploaded)
        // Attachments without URL will be uploaded separately via /upload endpoint
        attachments.forEach(att => {
            if (att.name && att.size && att.url) {
                req.tenantDB.prepare(`
                    INSERT INTO meeting_attachments (
                        id, meeting_id, name, type, size, url, uploaded_by, uploaded_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    att.id || uuidv4(), id, att.name, att.type || 'application/octet-stream', 
                    att.size, att.url, att.uploadedBy || 'system', now
                );
            }
        });

        res.status(201).json(getMeetingDetails(req, id));
    } catch (error) {
        console.error('Error creating meeting:', error);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
});

/**
 * GET /api/meetings/:id
 * Get meeting details
 */
router.get('/:id', (req, res) => {
    try {
        const meeting = getMeetingDetails(req, req.params.id);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }
        res.json(meeting);
    } catch (error) {
        console.error('Error fetching meeting details:', error);
        res.status(500).json({ error: 'Failed to fetch meeting' });
    }
});

/**
 * PUT /api/meetings/:id
 * Update meeting
 */
router.put('/:id', (req, res) => {
    try {
        const meetingId = req.params.id;
        const {
            title, type, status, location, isOnline, meetingLink,
            startTime, endTime, duration, recurrence, recurrenceEndDate, notes,
            org_unit_id,
            attendees, agenda, reminders
        } = req.body;

        // 確認會議存在
        const existing = req.tenantDB.prepare(`SELECT id FROM meetings WHERE id = ?`).get(meetingId);
        if (!existing) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        const now = new Date().toISOString();

        // 更新會議主資料
        req.tenantDB.prepare(`
            UPDATE meetings SET
                title = COALESCE(?, title),
                type = COALESCE(?, type),
                status = COALESCE(?, status),
                location = COALESCE(?, location),
                is_online = COALESCE(?, is_online),
                meeting_link = COALESCE(?, meeting_link),
                start_time = COALESCE(?, start_time),
                end_time = COALESCE(?, end_time),
                duration = COALESCE(?, duration),
                recurrence = COALESCE(?, recurrence),
                recurrence_end_date = COALESCE(?, recurrence_end_date),
                notes = COALESCE(?, notes),
                org_unit_id = COALESCE(?, org_unit_id),
                updated_at = ?
            WHERE id = ?
        `).run(
            title, type, status, location, isOnline ? 1 : 0, meetingLink,
            startTime, endTime, duration, recurrence, recurrenceEndDate, notes,
            org_unit_id || null, now, meetingId
        );

        // 更新出席者 (若有提供)
        if (attendees && Array.isArray(attendees)) {
            // 刪除現有出席者
            req.tenantDB.prepare(`DELETE FROM meeting_attendees WHERE meeting_id = ?`).run(meetingId);
            
            // 新增更新後的出席者
            attendees.forEach(a => {
                req.tenantDB.prepare(`
                    INSERT INTO meeting_attendees (
                        id, meeting_id, employee_id, name, email, department, position, avatar,
                        is_organizer, is_required, attendance_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    uuidv4(), meetingId, a.employeeId || a.id, a.name, a.email, a.department, a.position, a.avatar,
                    a.isOrganizer ? 1 : 0, a.isRequired !== false ? 1 : 0, a.attendanceStatus || 'pending'
                );
            });
        }

        // 更新議程 (若有提供)
        if (agenda && Array.isArray(agenda)) {
            // 刪除現有議程
            req.tenantDB.prepare(`DELETE FROM meeting_agenda_items WHERE meeting_id = ?`).run(meetingId);
            
            // 新增更新後的議程
            agenda.forEach((item, index) => {
                const discussionPointsJson = item.discussionPoints ? JSON.stringify(item.discussionPoints) : null;
                req.tenantDB.prepare(`
                    INSERT INTO meeting_agenda_items (
                        id, meeting_id, title, description, discussion_points, presenter, duration,
                        status, order_index, created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(
                    uuidv4(), meetingId, item.title, item.description, discussionPointsJson, item.presenter, item.duration,
                    item.status || 'pending', index, 'system', now
                );
            });
        }

        // 更新提醒 (若有提供)
        if (reminders && Array.isArray(reminders)) {
            // 刪除現有提醒
            req.tenantDB.prepare(`DELETE FROM meeting_reminders WHERE meeting_id = ?`).run(meetingId);
            
            // 新增更新後的提醒
            reminders.forEach(r => {
                req.tenantDB.prepare(`
                    INSERT INTO meeting_reminders (id, meeting_id, timing, enabled)
                    VALUES (?, ?, ?, ?)
                `).run(uuidv4(), meetingId, r.timing, r.enabled ? 1 : 0);
            });
        }

        // 更新附件 (若有提供) - 只保留前端傳來的附件，刪除不在列表中的
        if (req.body.attachments && Array.isArray(req.body.attachments)) {
            const attachmentIds = req.body.attachments.map(a => a.id).filter(Boolean);
            if (attachmentIds.length > 0) {
                // 刪除不在列表中的附件
                const placeholders = attachmentIds.map(() => '?').join(',');
                req.tenantDB.prepare(`DELETE FROM meeting_attachments WHERE meeting_id = ? AND id NOT IN (${placeholders})`).run(meetingId, ...attachmentIds);
            } else {
                // 如果附件列表為空，刪除所有附件
                req.tenantDB.prepare(`DELETE FROM meeting_attachments WHERE meeting_id = ?`).run(meetingId);
            }
        }

        res.json(getMeetingDetails(req, meetingId));
    } catch (error) {
        console.error('Error updating meeting:', error);
        res.status(500).json({ error: 'Failed to update meeting' });
    }
});

/**
 * DELETE /api/meetings/:id
 * Delete/Cancel meeting
 */
router.delete('/:id', (req, res) => {
    try {
        const meetingId = req.params.id;
        const { softDelete } = req.query; // 若 softDelete=true，只更新狀態為 cancelled

        // 確認會議存在
        const existing = req.tenantDB.prepare(`SELECT id, status FROM meetings WHERE id = ?`).get(meetingId);
        if (!existing) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        if (softDelete === 'true') {
            // 軟刪除：將狀態改為 cancelled
            req.tenantDB.prepare(`
                UPDATE meetings SET status = 'cancelled', updated_at = ?
                WHERE id = ?
            `).run(new Date().toISOString(), meetingId);

            res.json({ success: true, message: 'Meeting cancelled', id: meetingId });
        } else {
            // 硬刪除：刪除會議及相關資料 (CASCADE 會自動刪除關聯資料)
            req.tenantDB.prepare(`DELETE FROM meeting_reminders WHERE meeting_id = ?`).run(meetingId);
            req.tenantDB.prepare(`DELETE FROM meeting_attendees WHERE meeting_id = ?`).run(meetingId);
            req.tenantDB.prepare(`DELETE FROM meeting_agenda_items WHERE meeting_id = ?`).run(meetingId);
            req.tenantDB.prepare(`DELETE FROM meeting_conclusions WHERE meeting_id = ?`).run(meetingId);
            req.tenantDB.prepare(`DELETE FROM meeting_attachments WHERE meeting_id = ?`).run(meetingId);
            req.tenantDB.prepare(`DELETE FROM meetings WHERE id = ?`).run(meetingId);

            res.json({ success: true, message: 'Meeting deleted', id: meetingId });
        }
    } catch (error) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({ error: 'Failed to delete meeting' });
    }
});

/**
 * POST /api/meetings/:id/check-in
 * Attendee Check-in
 */
router.post('/:id/check-in', (req, res) => {
    try {
        const { employeeId, name } = req.body; // Check-in by ID or Name
        const meetingId = req.params.id;
        const now = new Date().toISOString();

        let attendee;
        if (employeeId) {
            attendee = req.tenantDB.prepare(`SELECT * FROM meeting_attendees WHERE meeting_id = ? AND employee_id = ?`).get(meetingId, employeeId);
        } else if (name) {
            attendee = req.tenantDB.prepare(`SELECT * FROM meeting_attendees WHERE meeting_id = ? AND name = ?`).get(meetingId, name);
        }

        if (!attendee) {
            return res.status(404).json({ error: 'Attendee not found in this meeting' });
        }

        req.tenantDB.prepare(`
            UPDATE meeting_attendees 
            SET signed_in = 1, signed_in_time = ?, attendance_status = 'accepted'
            WHERE id = ?
        `).run(now, attendee.id);

        res.json({ success: true, signedInTime: now });
    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({ error: 'Check-in failed' });
    }
});

/**
 * PATCH /api/meetings/:id/complete
 * Complete a meeting with notes and conclusions
 */
router.patch('/:id/complete', (req, res) => {
    try {
        const meetingId = req.params.id;
        const { notes, conclusions = [] } = req.body;
        const now = new Date().toISOString();

        // 檢查會議是否存在
        const meeting = req.tenantDB.prepare(`SELECT * FROM meetings WHERE id = ?`).get(meetingId);
        if (!meeting) {
            return res.status(404).json({ error: 'Meeting not found' });
        }

        // 更新會議狀態為完成，並儲存會議記錄
        req.tenantDB.prepare(`
            UPDATE meetings 
            SET status = 'completed', notes = ?, updated_at = ?
            WHERE id = ?
        `).run(notes || '', now, meetingId);

        // 新增結論/待辦事項
        conclusions.forEach(c => {
            req.tenantDB.prepare(`
                INSERT INTO meeting_conclusions (
                    id, meeting_id, content, responsible_id, responsible_name, department,
                    due_date, status, progress, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                uuidv4(), meetingId, c.content, c.responsibleId, c.responsibleName, c.department,
                c.dueDate, 'pending', 0, now
            );
        });

        // 回傳更新後的會議詳情
        res.json(getMeetingDetails(req, meetingId));
    } catch (error) {
        console.error('Error completing meeting:', error);
        res.status(500).json({ error: 'Failed to complete meeting' });
    }
});

/**
 * POST /api/meetings/:id/upload
 * Upload attachment
 */
router.post('/:id/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const meetingId = req.params.id;
        const { uploadedBy, originalName } = req.body;
        const id = uuidv4();
        const now = new Date().toISOString();
        const fileUrl = `/uploads/meetings/${req.file.filename}`;
        
        // 使用前端傳遞的原始檔名（已正確編碼），若無則使用 multer 提供的
        const fileName = originalName || req.file.originalname;

        req.tenantDB.prepare(`
            INSERT INTO meeting_attachments (
                id, meeting_id, name, type, size, url, uploaded_by, uploaded_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, meetingId, fileName, req.file.mimetype, req.file.size,
            fileUrl, uploadedBy || 'system', now
        );

        res.json({
            id,
            name: req.file.originalname,
            url: fileUrl,
            type: req.file.mimetype,
            size: req.file.size
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

/**
 * POST /api/meetings/:id/conclusions
 * Add Conclusion / Action Item
 */
router.post('/:id/conclusions', (req, res) => {
    try {
        const meetingId = req.params.id;
        const { content, responsibleId, responsibleName, department, dueDate, agendaItemId } = req.body;
        const id = uuidv4();
        const now = new Date().toISOString();

        req.tenantDB.prepare(`
            INSERT INTO meeting_conclusions (
                id, meeting_id, agenda_item_id, content, responsible_id, responsible_name,
                department, due_date, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
        `).run(
            id, meetingId, agendaItemId, content, responsibleId, responsibleName,
            department, dueDate, now
        );

        res.status(201).json({ id, content, status: 'pending' });
    } catch (error) {
        console.error('Error adding conclusion:', error);
        res.status(500).json({ error: 'Failed to add conclusion' });
    }
});

/**
 * PATCH /api/meetings/conclusions/:id
 * Update Conclusion Progress
 */
router.patch('/conclusions/:id', (req, res) => {
    try {
        const { status, progress, note } = req.body;
        const id = req.params.id;
        const now = new Date().toISOString();

        // Get current conclusion
        const conclusion = req.tenantDB.prepare(`SELECT * FROM meeting_conclusions WHERE id = ?`).get(id);
        if (!conclusion) return res.status(404).json({ error: 'Conclusion not found' });

        let progressNotes = [];
        try { progressNotes = JSON.parse(conclusion.progress_notes || '[]'); } catch (e) { }

        if (note) {
            progressNotes.push({
                content: note,
                createdAt: now,
                progress: progress
            });
        }

        let updates = [];
        let params = [];

        if (status) { updates.push('status = ?'); params.push(status); }
        if (progress !== undefined) { updates.push('progress = ?'); params.push(progress); }
        if (status === 'completed') { updates.push('completed_at = ?'); params.push(now); }

        updates.push('progress_notes = ?');
        params.push(JSON.stringify(progressNotes));

        params.push(id);

        req.tenantDB.prepare(`UPDATE meeting_conclusions SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating conclusion:', error);
        res.status(500).json({ error: 'Failed to update conclusion' });
    }
});

/**
 * GET /api/meetings/dashboard/stats
 * Dashboard Statistics
 */
router.get('/dashboard/stats', (req, res) => {
    try {
        const { org_unit_id } = req.query;
        const orgFilter = org_unit_id ? ` WHERE org_unit_id = ?` : '';
        const orgFilterAnd = org_unit_id ? ` AND m.org_unit_id = ?` : '';
        const orgParams = org_unit_id ? [org_unit_id] : [];

        const totalMeetings = req.tenantDB.prepare(`SELECT COUNT(*) as c FROM meetings${orgFilter}`).get(...orgParams).c;
        const completedMeetings = req.tenantDB.prepare(`SELECT COUNT(*) as c FROM meetings WHERE status = 'completed'${org_unit_id ? ' AND org_unit_id = ?' : ''}`).get(...orgParams).c;
        const totalDuration = req.tenantDB.prepare(`SELECT SUM(duration) as s FROM meetings${orgFilter}`).get(...orgParams).s || 0;

        const conclusions = req.tenantDB.prepare(`SELECT mc.status, mc.due_date FROM meeting_conclusions mc${org_unit_id ? ' JOIN meetings m ON mc.meeting_id = m.id WHERE m.org_unit_id = ?' : ''}`).all(...orgParams);
        const totalConclusions = conclusions.length;
        const completedConclusions = conclusions.filter(c => c.status === 'completed').length;
        const overdueConclusions = conclusions.filter(c => {
            return c.status !== 'completed' && new Date(c.due_date) < new Date();
        }).length;

        res.json({
            totalMeetings,
            completedMeetings,
            totalHours: Math.round(totalDuration / 60),
            avgDuration: totalMeetings ? Math.round(totalDuration / totalMeetings) : 0,
            conclusionCount: totalConclusions,
            completedConclusions,
            overdueConclusions,
            executionRate: totalConclusions ? Math.round((completedConclusions / totalConclusions) * 100) : 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
