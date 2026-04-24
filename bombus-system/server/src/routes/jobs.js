/**
 * Jobs API Routes
 * 職缺管理 CRUD + 104 同步
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
// tenantDB is accessed via req.tenantDB (injected by middleware)
const job104Service = require('../services/104/job.service');
const {
    getPublisher,
    SUPPORTED_PLATFORMS,
    ENABLED_PLATFORMS
} = require('../services/platform-publisher');
const { requireFeaturePerm, buildScopeFilter } = require('../middleware/permission');

// 生成職缺 ID
function generateJobId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `JOB-${year}${random}`;
}

// ================================================================
// 多平台發布 helpers（job_publications 1:N 對 jobs）
// ================================================================

/**
 * 正規化 104 職缺資料（薪資 / role / jobCatSet 對齊規則）— 用於 publish（新增）路徑。
 * 原本散佈在 PATCH/:id/status 與 POST/:id/sync-104 的驗證邏輯抽出成 helper，
 * 本變更暫不搬進 104.adapter（另立 refactor-104-adapter-validation 處理）。
 */
function normalize104JobData(job104Data) {
    const data = { ...job104Data };
    // 規則 1: 高階主管 (role=3) 只能使用面議 (salaryType=10)
    if (data.role === 3 && data.salaryType !== 10) {
        data.salaryType = 10;
        data.salaryLow = 0;
        data.salaryHigh = 0;
    }
    // 規則 2: salaryType 驗證
    const salaryType = data.salaryType;
    if (salaryType === 10) {
        data.salaryLow = 0;
        data.salaryHigh = 0;
    } else if (salaryType === 50 || salaryType === 60) {
        if (!data.salaryLow || data.salaryLow <= 0) {
            data.salaryLow = salaryType === 50 ? 30000 : 500000;
        }
        if (!data.salaryHigh || data.salaryHigh <= 0) {
            data.salaryHigh = data.salaryLow;
        }
        if (data.salaryHigh < data.salaryLow) {
            data.salaryHigh = data.salaryLow;
        }
    }
    return data;
}

/**
 * 建構 104 UpdateJob payload — 用於 update（編輯既有職缺）路徑。
 * 注意：**不包含 role 欄位** — 104 API 規定職缺類型建立後不可變更（會回 validate 錯誤：
 * `jobUpdateRequest-cantModifiedColumnRole`）。
 * email 展平、role/jobCatSet 對齊等邏輯與 PUT /:id 既有行為一致。
 */
function build104UpdatePayload(job104Data, jobRow = {}) {
    const data = job104Data || {};

    // email 展平
    let emailList = data.email || ['hr@company.com'];
    while (Array.isArray(emailList) && emailList.length > 0 && Array.isArray(emailList[0])) {
        emailList = emailList.flat();
    }
    if (!Array.isArray(emailList) || emailList.length === 0) emailList = ['hr@company.com'];
    emailList = emailList.filter(e => typeof e === 'string');
    if (emailList.length === 0) emailList = ['hr@company.com'];

    // role / jobCatSet 對齊（但 role 不會放進 payload）
    const role = data.role || 1;
    let jobCatSet = data.jobCatSet || [2001002002];
    const isHighLevelCat = jobCatSet[0] && jobCatSet[0] >= 9000000000;
    if (isHighLevelCat && role !== 3) jobCatSet = [2001002002];
    else if (!isHighLevelCat && role === 3) jobCatSet = [9001001000];

    return {
        job: data.job || jobRow.title || '',
        description: data.description || jobRow.description || '',
        jobCatSet,
        salaryType: data.salaryType || 10,
        salaryLow: data.salaryLow || 0,
        salaryHigh: data.salaryHigh || 0,
        addrNo: data.addrNo || 6001001001,
        edu: data.edu || [8],
        contact: data.contact || 'HR',
        email: emailList,
        replyDay: data.replyDay || 7,
        applyType: data.applyType || { '104': [2] },
        workShifts: data.workShifts || []
    };
}

/**
 * 為指定職缺的每個 selectedPlatforms 建立或重置 pending 列（冪等）。
 * platformFieldsMap 可選，對應每個 platform 的 platform_fields JSON。
 */
function upsertPendingPublications(tenantDB, jobId, selectedPlatforms, platformFieldsMap = {}) {
    if (!Array.isArray(selectedPlatforms) || selectedPlatforms.length === 0) return;
    const now = new Date().toISOString();
    for (const platform of selectedPlatforms) {
        if (!SUPPORTED_PLATFORMS.includes(platform)) continue;
        const fields = platformFieldsMap[platform]
            ? JSON.stringify(platformFieldsMap[platform])
            : null;
        tenantDB.prepare(`
            INSERT INTO job_publications (
                id, job_id, platform, status, platform_fields, created_at, updated_at
            )
            VALUES (?, ?, ?, 'pending', ?, ?, ?)
            ON CONFLICT(job_id, platform) DO UPDATE SET
                status = 'pending',
                sync_error = NULL,
                platform_fields = COALESCE(excluded.platform_fields, job_publications.platform_fields),
                updated_at = excluded.updated_at
        `).run(uuidv4(), jobId, platform, fields, now, now);
    }
}

function listPublications(tenantDB, jobId, statuses) {
    const placeholders = statuses.map(() => '?').join(',');
    return tenantDB.prepare(`
        SELECT * FROM job_publications
        WHERE job_id = ? AND status IN (${placeholders})
    `).all(jobId, ...statuses);
}

function getPublicationsByJobId(tenantDB, jobId) {
    return tenantDB.prepare(`
        SELECT platform, status, platform_job_id, sync_error,
               last_sync_attempt_at, published_at
        FROM job_publications
        WHERE job_id = ?
        ORDER BY platform
    `).all(jobId);
}

function updatePublicationAfterSync(tenantDB, publicationId, outcome) {
    const now = new Date().toISOString();
    if (outcome.success) {
        tenantDB.prepare(`
            UPDATE job_publications
            SET status = ?,
                platform_job_id = COALESCE(?, platform_job_id),
                sync_error = NULL,
                last_sync_attempt_at = ?,
                published_at = COALESCE(published_at, ?),
                updated_at = ?
            WHERE id = ?
        `).run(outcome.status || 'synced', outcome.platformJobId || null, now, now, now, publicationId);
    } else {
        tenantDB.prepare(`
            UPDATE job_publications
            SET status = 'failed',
                sync_error = ?,
                last_sync_attempt_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(outcome.error || 'Unknown error', now, now, publicationId);
    }
}

/**
 * 將 job_publications 的 104 列狀態反寫回 jobs.sync_status / job104_no，
 * 保留向後相容（避免 recruitment.js / talent-pool.js / candidates-summary 讀到過時資料）。
 */
function derive104WritebackToJobs(tenantDB, jobId) {
    const pub104 = tenantDB.prepare(`
        SELECT status, platform_job_id, published_at
        FROM job_publications WHERE job_id = ? AND platform = '104'
    `).get(jobId);
    if (!pub104) return;
    const syncStatus = pub104.status === 'synced' ? '104_synced'
                    : pub104.status === 'closed' ? '104_closed'
                    : pub104.status === 'failed' ? '104_pending'
                    : '104_pending';
    tenantDB.prepare(`
        UPDATE jobs
        SET job104_no = COALESCE(?, job104_no),
            sync_status = ?,
            synced_at = COALESCE(?, synced_at)
        WHERE id = ?
    `).run(pub104.platform_job_id, syncStatus, pub104.published_at, jobId);
}

/**
 * 從 axios error 萃取「人看得懂的」平台錯誤訊息。
 * 104 API 會把真實錯誤放在 `error.response.data.error.details[]`，
 * 頂層 message 通常只有「validate 錯誤」這種無用訊息。
 */
function formatPlatformError(error) {
    const payload = error?.response?.data?.error;
    if (payload?.details && Array.isArray(payload.details) && payload.details.length > 0) {
        return payload.details.map(d => `${d.code || ''}: ${d.message || ''}`).join('; ');
    }
    if (payload?.message) return payload.message;
    return error?.message || String(error || 'Unknown error');
}

/**
 * 根據 publication 列當前狀態決定呼叫哪個 adapter 動作：
 * - 有 platform_job_id + status='closed' → reopen
 * - 有 platform_job_id + 其他狀態（failed 重試）→ update
 * - 無 platform_job_id → publish
 *
 * publishPayload / updatePayload 可能不同 —— 例如 104 update 不可帶 role 欄位；
 * 由呼叫端各自用 normalize104JobData / build104UpdatePayload 建構。
 */
async function dispatchPlatformPublish(row, { publishPayload, updatePayload }) {
    const publisher = getPublisher(row.platform);
    if (!publisher) {
        throw new Error(`Unknown platform: ${row.platform}`);
    }
    if (row.platform_job_id) {
        if (row.status === 'closed') {
            await publisher.reopen(row.platform_job_id);
            return { platformJobId: row.platform_job_id, status: 'synced' };
        }
        await publisher.update(row.platform_job_id, updatePayload);
        return { platformJobId: row.platform_job_id, status: 'synced' };
    }
    const result = await publisher.publish(publishPayload);
    return { platformJobId: result?.platformJobId || null, status: 'synced' };
}

/**
 * 為指定平台建構 publish / update 兩個 payload（同時適用於 dispatchPlatformPublish）。
 * 把平台特化邏輯集中在此，routes 各處只需要傳 raw + jobRow。
 */
function buildPlatformPayloads(platform, rawData, jobRow) {
    if (platform === '104') {
        return {
            publishPayload: normalize104JobData(rawData),
            updatePayload: build104UpdatePayload(rawData, jobRow)
        };
    }
    // 其他平台（518/1111 stub）直接傳 raw
    return { publishPayload: rawData, updatePayload: rawData };
}

// 候選人狀態分類（職缺刪除防護用）
// in-progress：流程進行中，刪除前必須先 HR 處理（婉拒/錄取/退回）
// terminal：流程已結束（含已入職、已婉拒、已拒絕）
// onboarded 另外處理（最嚴格 — 永不允許直接刪職缺）
const CANDIDATE_IN_PROGRESS_STATUSES = ['invited', 'interview', 'pending_decision', 'offered', 'accepted'];
const CANDIDATE_TERMINAL_STATUSES = ['onboarded', 'interview_declined', 'hired', 'rejected'];

/**
 * GET /api/jobs
 * 取得職缺列表
 */
router.get('/', requireFeaturePerm('L1.jobs', 'view'), (req, res) => {
    try {
        const { status, department, search, limit = 50, offset = 0, org_unit_id } = req.query;

        let sql = `
            SELECT j.*,
            (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id) as total_candidates,
            (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id AND c.status = 'new') as new_candidates
            FROM jobs j WHERE 1=1
        `;
        const params = [];

        // Apply scope filtering
        const scopeFilter = buildScopeFilter(req);
        if (scopeFilter.clause) {
            sql += ` AND ${scopeFilter.clause}`;
            params.push(...scopeFilter.params);
        }

        if (org_unit_id) {
            sql += ' AND j.org_unit_id = ?';
            params.push(org_unit_id);
        }

        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }

        if (department) {
            sql += ' AND department = ?';
            params.push(department);
        }

        if (search) {
            sql += ' AND (title LIKE ? OR department LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const jobs = req.tenantDB.prepare(sql).all(...params);

        // 為每個 job 附上 publications 陣列
        for (const j of jobs) {
            j.publications = getPublicationsByJobId(req.tenantDB, j.id);
        }

        res.json({
            status: 'success',
            data: jobs,
            total: jobs.length
        });
    } catch (error) {
        console.error('Failed to fetch jobs:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/jobs/stats/summary
 * 取得職缺統計 (必須在 /:id 之前)
 */
router.get('/stats/summary', requireFeaturePerm('L1.jobs', 'view'), (req, res) => {
    try {
        const { org_unit_id } = req.query;
        const stats = {
            activeJobs: 0,
            draftJobs: 0,
            syncedJobs: 0,
            totalJobs: 0,
            newResumes: 0,
            pendingReview: 0,
            scheduledInterviews: 0
        };

        // 職缺統計 — 套用 scope 過濾
        const scopeFilter = buildScopeFilter(req);
        let statsSql = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                SUM(CASE WHEN job104_no IS NOT NULL THEN 1 ELSE 0 END) as synced
            FROM jobs WHERE 1=1
        `;
        const statsParams = [];
        if (scopeFilter.clause) {
            statsSql += ` AND ${scopeFilter.clause}`;
            statsParams.push(...scopeFilter.params);
        }
        if (org_unit_id) {
            statsSql += ' AND org_unit_id = ?';
            statsParams.push(org_unit_id);
        }

        const result = req.tenantDB.prepare(statsSql).get(...statsParams);

        stats.totalJobs = result?.total || 0;
        stats.activeJobs = result?.active || 0;
        stats.draftJobs = result?.draft || 0;
        stats.syncedJobs = result?.synced || 0;

        // 新進履歷：status = 'new'（與列表 New 標籤一致）
        // 子查詢使用 tableAlias 'j' 對應 JOIN jobs j
        const joinScopeFilter = buildScopeFilter(req, { tableAlias: 'j' });
        const now = new Date();
        let resumeSql = `
            SELECT COUNT(*) as cnt FROM candidates c
            JOIN jobs j ON c.job_id = j.id
            WHERE c.status = 'new'
        `;
        const resumeParams = [];
        if (joinScopeFilter.clause !== '1=1') {
            resumeSql += ` AND ${joinScopeFilter.clause}`;
            resumeParams.push(...joinScopeFilter.params);
        }
        if (org_unit_id) {
            resumeSql += ' AND j.org_unit_id = ?';
            resumeParams.push(org_unit_id);
        }
        const resumeResult = req.tenantDB.prepare(resumeSql).get(...resumeParams);
        stats.newResumes = resumeResult?.cnt || 0;

        // 待審核履歷：scoring_status = 'Pending'
        let pendingSql = `
            SELECT COUNT(*) as cnt FROM candidates c
            JOIN jobs j ON c.job_id = j.id
            WHERE c.scoring_status = 'Pending'
        `;
        const pendingParams = [];
        if (joinScopeFilter.clause !== '1=1') {
            pendingSql += ` AND ${joinScopeFilter.clause}`;
            pendingParams.push(...joinScopeFilter.params);
        }
        if (org_unit_id) {
            pendingSql += ' AND j.org_unit_id = ?';
            pendingParams.push(org_unit_id);
        }
        const pendingResult = req.tenantDB.prepare(pendingSql).get(...pendingParams);
        stats.pendingReview = pendingResult?.cnt || 0;

        // 已安排面試：未取消 + 面試日期 >= 今天
        const todayStr = now.toISOString().split('T')[0];
        let interviewSql = `
            SELECT COUNT(*) as cnt FROM interviews i
            JOIN jobs j ON i.job_id = j.id
            WHERE i.cancelled_at IS NULL
              AND i.result = 'Pending'
              AND i.interview_at >= ?
        `;
        const interviewParams = [todayStr];
        if (joinScopeFilter.clause !== '1=1') {
            interviewSql += ` AND ${joinScopeFilter.clause}`;
            interviewParams.push(...joinScopeFilter.params);
        }
        if (org_unit_id) {
            interviewSql += ' AND j.org_unit_id = ?';
            interviewParams.push(org_unit_id);
        }
        const interviewResult = req.tenantDB.prepare(interviewSql).get(...interviewParams);
        stats.scheduledInterviews = interviewResult?.cnt || 0;

        res.json({ status: 'success', data: stats });
    } catch (error) {
        console.error('Failed to fetch job stats:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/jobs/104/jobs
 * 取得 104 職缺列表 (從 DB 撈取已同步職缺 Mock)
 */
router.get('/104/jobs', requireFeaturePerm('L1.jobs', 'view'), (req, res) => {
    try {
        const jobs = req.tenantDB.prepare(`
            SELECT * FROM jobs 
            WHERE job104_no IS NOT NULL 
            ORDER BY created_at DESC
        `).all();

        const data = jobs.map(job => {
            let job104 = {};
            try { job104 = JSON.parse(job.job104_data || '{}'); } catch (e) { }

            return {
                jobNo: String(job.job104_no),
                internalId: job.id, // 內部 ID (用於操作)
                internalStatus: job.status, // 內部狀態
                jobTitle: job.title,
                jobCategory: '2001002002',
                salary: { type: '50', min: 40000, max: 80000 },
                workPlace: { city: '台北市' },
                switch: 'on', // 確保狀態為 published

                // 保留額外資訊 (若前端有用到)
                description: job.description,
                appearDate: (job.publish_date || job.created_at || '').split(' ')[0],
                applyUrl: `https://www.104.com.tw/job/${job.job104_no}`,
                periodDesc: '09:00~18:00',
                employees: 100
            };
        });

        res.json({ status: 'success', data });
    } catch (error) {
        console.error('Failed to fetch 104 jobs:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/jobs/:id
 * 取得單一職缺
 */
router.get('/:id', requireFeaturePerm('L1.jobs', 'view'), (req, res) => {
    try {
        const { id } = req.params;
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        // 解析 job104_data JSON
        if (job.job104_data) {
            try {
                job.job104_data = JSON.parse(job.job104_data);
            } catch (e) {
                // Keep as string if parse fails
            }
        }

        // 附上 publications 陣列
        job.publications = getPublicationsByJobId(req.tenantDB, id);

        res.json({ status: 'success', data: job });
    } catch (error) {
        console.error('Failed to fetch job:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/jobs/:id/candidates
 * 取得特定職缺的應徵者列表
 */
router.get('/:id/candidates', requireFeaturePerm('L1.jobs', 'view'), (req, res) => {
    try {
        const { id } = req.params;

        const candidates = req.tenantDB.prepare(`
            SELECT c.*,
            j.title as job_title,
            ii.response_token,
            ii.candidate_response,
            ii.selected_slots,
            ii.status as invitation_status,
            ii.reschedule_note,
            ii.responded_at,
            ii.interviewer_id as invitation_interviewer_id,
            emp_int.name as invitation_interviewer_name,
            emp_int.department as invitation_interviewer_department,
            emp_int.position as invitation_interviewer_position,
            (SELECT COUNT(*) FROM interviews WHERE candidate_id = c.id) as interview_count,
            i.id as interview_id,
            i.interview_at,
            i.location as interview_location,
            i.meeting_link,
            i.address as interview_address,
            i.cancel_token as interview_cancel_token,
            i.result as interview_result,
            cra.overall_match_score as ai_overall_score,
            cra.analyzed_at as ai_analyzed_at
            FROM candidates c
            LEFT JOIN jobs j ON c.job_id = j.id
            LEFT JOIN interview_invitations ii ON ii.id = (
                SELECT id FROM interview_invitations
                WHERE candidate_id = c.id
                ORDER BY created_at DESC LIMIT 1
            )
            LEFT JOIN employees emp_int ON emp_int.id = ii.interviewer_id
            LEFT JOIN interviews i ON i.id = (
                SELECT id FROM interviews
                WHERE candidate_id = c.id AND result != 'Cancelled'
                ORDER BY created_at DESC LIMIT 1
            )
            LEFT JOIN candidate_resume_analysis cra ON cra.candidate_id = c.id AND cra.job_id = c.job_id
            WHERE c.job_id = ?
            ORDER BY c.apply_date DESC
        `).all(id);

        res.json({ status: 'success', data: candidates });
    } catch (error) {
        console.error('Failed to fetch candidates:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * PATCH /api/jobs/:id/status
 * 更新職缺狀態 (整合 104 同步)
 */
router.patch('/:id/status', requireFeaturePerm('L1.jobs', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, selectedPlatforms } = req.body;

        if (!status) {
            return res.status(400).json({ status: 'error', message: 'Status is required' });
        }

        const validStatuses = ['draft', 'review', 'published', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ status: 'error', message: 'Invalid status' });
        }

        // 取得完整職缺資料
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: 'Job not found' });
        }

        let sql = 'UPDATE jobs SET status = ?, updated_at = datetime("now")';
        const params = [status];

        let publicationOutcomes = [];

        // ============================================================
        // 多平台發布 — 對應 spec「Publishing a job dispatches to all
        // selected platforms in parallel」與 Decision「Promise.allSettled 並行」
        // ============================================================
        if (status === 'published') {
            sql += ', publish_date = date("now")';

            // 若 payload 有 selectedPlatforms（重新選擇發布平台），upsert pending
            if (Array.isArray(selectedPlatforms) && selectedPlatforms.length > 0) {
                const fieldsMap = {};
                if (job.job104_data) {
                    try { fieldsMap['104'] = JSON.parse(job.job104_data); } catch (e) { /* ignore */ }
                }
                upsertPendingPublications(req.tenantDB, id, selectedPlatforms, fieldsMap);
            }

            // 讀取所有需要 dispatch 的列（pending / failed / closed 皆會被推送）
            const rowsToDispatch = listPublications(req.tenantDB, id, ['pending', 'failed', 'closed']);

            if (rowsToDispatch.length > 0) {
                const dispatches = rowsToDispatch.map(async row => {
                    try {
                        let raw;
                        if (row.platform === '104') {
                            raw = job.job104_data
                                ? JSON.parse(job.job104_data)
                                : (row.platform_fields ? JSON.parse(row.platform_fields) : null);
                            if (!raw) throw new Error('104 job data missing');
                        } else {
                            raw = row.platform_fields ? JSON.parse(row.platform_fields) : {};
                        }
                        const payloads = buildPlatformPayloads(row.platform, raw, job);
                        const result = await dispatchPlatformPublish(row, payloads);
                        return { row, success: true, ...result };
                    } catch (error) {
                        const msg = formatPlatformError(error);
                        console.error(`❌ [${row.platform}] publish failed:`, msg);
                        return { row, success: false, error: msg };
                    }
                });
                const settled = await Promise.allSettled(dispatches);
                publicationOutcomes = settled.map(s =>
                    s.status === 'fulfilled'
                        ? s.value
                        : { row: null, success: false, error: s.reason?.message || 'Unknown error' }
                );
                for (const outcome of publicationOutcomes) {
                    if (!outcome.row) continue;
                    updatePublicationAfterSync(req.tenantDB, outcome.row.id, outcome);
                }
            }

            // 反寫 104 狀態至 jobs 欄位（向後相容：recruitment.js / talent-pool.js / candidates-summary）
            derive104WritebackToJobs(req.tenantDB, id);
        }

        // 關閉職缺 (status → closed)：對 synced 列呼叫 adapter.close
        if (status === 'closed') {
            const syncedRows = listPublications(req.tenantDB, id, ['synced']);
            if (syncedRows.length > 0) {
                const dispatches = syncedRows.map(async row => {
                    try {
                        const publisher = getPublisher(row.platform);
                        if (!publisher) throw new Error(`Unknown platform: ${row.platform}`);
                        await publisher.close(row.platform_job_id);
                        return { row, success: true, status: 'closed' };
                    } catch (error) {
                        const msg = formatPlatformError(error);
                        console.error(`❌ [${row.platform}] close failed:`, msg);
                        return { row, success: false, error: msg };
                    }
                });
                const settled = await Promise.allSettled(dispatches);
                publicationOutcomes = settled.map(s =>
                    s.status === 'fulfilled'
                        ? s.value
                        : { row: null, success: false, error: s.reason?.message || 'Unknown error' }
                );
                for (const outcome of publicationOutcomes) {
                    if (!outcome.row) continue;
                    updatePublicationAfterSync(req.tenantDB, outcome.row.id, outcome);
                }
            }
            derive104WritebackToJobs(req.tenantDB, id);
        }

        sql += ' WHERE id = ?';
        params.push(id);
        req.tenantDB.prepare(sql).run(...params);

        const publications = getPublicationsByJobId(req.tenantDB, id);
        res.json({
            status: 'success',
            publications,
            // 向後相容：舊前端讀 sync104 欄位
            sync104: publicationOutcomes.find(o => o.row?.platform === '104') || null
        });
    } catch (error) {
        console.error('Failed to update job status:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});


/**
 * POST /api/jobs
 * 新增職缺 (永遠建立為 draft，不立即同步 104)
 */
router.post('/', requireFeaturePerm('L1.jobs', 'edit'), (req, res) => {
    try {
        const {
            title,
            department,
            description,
            recruiter = 'HR Admin',
            jdId,
            org_unit_id,
            grade,
            job104Data,         // 保存 104 設定，但不立即同步（向後相容）
            selectedPlatforms   // 多平台：['104', '518', ...]；若未傳則由 job104Data 推導
        } = req.body;

        if (!title) {
            return res.status(400).json({ status: 'error', message: '職缺名稱為必填' });
        }

        const id = generateJobId();
        const now = new Date().toISOString();

        // 永遠以 draft 狀態建立，同步在核准發布時才觸發
        const syncStatus = job104Data ? '104_pending' : 'local_only';

        // 儲存到資料庫
        req.tenantDB.prepare(`
            INSERT INTO jobs (id, title, department, description, recruiter, status, jd_id, job104_no, sync_status, job104_data, synced_at, grade, created_at, updated_at, org_unit_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            title,
            department || null,
            description || null,
            recruiter,
            'draft',  // 永遠建立為 draft
            jdId || null,
            null,     // job104_no 在核准發布時才設定
            syncStatus,
            job104Data ? JSON.stringify(job104Data) : null,
            null,     // synced_at 在核准發布時才設定
            Number.isInteger(grade) ? grade : null,
            now,
            now,
            org_unit_id || null
        );

        // 多平台：upsert pending publications
        const platformsToUpsert = Array.isArray(selectedPlatforms) && selectedPlatforms.length > 0
            ? selectedPlatforms
            : (job104Data ? ['104'] : []);
        const platformFieldsMap = {};
        if (job104Data) platformFieldsMap['104'] = job104Data;
        upsertPendingPublications(req.tenantDB, id, platformsToUpsert, platformFieldsMap);

        console.log(`📝 Job created as draft: ${id} (platforms: ${platformsToUpsert.join(',') || 'none'})`);

        res.json({
            status: 'success',
            data: {
                id,
                title,
                department,
                status: 'draft',
                job104_no: null,
                sync_status: syncStatus,
                publications: getPublicationsByJobId(req.tenantDB, id)
            }
        });
    } catch (error) {
        console.error('Failed to create job:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * PUT /api/jobs/:id
 * 更新職缺 (若已同步 104 則同步更新)
 *
 * 審核流程防護：當職缺處於 published 狀態時，若修改任一「關鍵欄位」
 * (title/department/description/jd_id/grade/org_unit_id/job104_data)，
 * 系統會自動將狀態回退到 review，並關閉 104 上的職缺，
 * 必須重新核准才能再次上架。前端應顯示防呆提示再送出。
 */
router.put('/:id', requireFeaturePerm('L1.jobs', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            department,
            description,
            recruiter,
            status,
            jdId,
            org_unit_id,
            grade,
            job104Data  // 104 設定資料 (可選)
        } = req.body;

        // 先檢查職缺是否存在
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        // 偵測關鍵欄位是否變動（recruiter 非關鍵，不觸發回審）
        const incomingJob104DataStr = job104Data ? JSON.stringify(job104Data) : null;
        const changedFields = [];
        if (title !== undefined && title !== null && title !== job.title) changedFields.push('title');
        if (department !== undefined && department !== null && department !== job.department) changedFields.push('department');
        if (description !== undefined && description !== null && description !== job.description) changedFields.push('description');
        if (jdId !== undefined && jdId !== null && jdId !== job.jd_id) changedFields.push('jd_id');
        if (Number.isInteger(grade) && grade !== job.grade) changedFields.push('grade');
        if (org_unit_id !== undefined && org_unit_id !== null && org_unit_id !== job.org_unit_id) changedFields.push('org_unit_id');
        if (incomingJob104DataStr !== null && incomingJob104DataStr !== job.job104_data) changedFields.push('job104_data');

        // published 狀態下若關鍵欄位變動 → 自動回審
        const shouldRevertToReview = job.status === 'published' && changedFields.length > 0;
        const effectiveStatus = shouldRevertToReview ? 'review' : (status || null);

        // 若需自動回審，對所有 synced publications 呼叫 adapter.close
        let close104Result = null;
        let autoCloseOutcomes = [];
        if (shouldRevertToReview) {
            const syncedRows = listPublications(req.tenantDB, id, ['synced']);
            if (syncedRows.length > 0) {
                const dispatches = syncedRows.map(async row => {
                    try {
                        const publisher = getPublisher(row.platform);
                        if (!publisher) throw new Error(`Unknown platform: ${row.platform}`);
                        await publisher.close(row.platform_job_id);
                        return { row, success: true, status: 'closed' };
                    } catch (error) {
                        const msg = formatPlatformError(error);
                        console.error(`⚠️ [${row.platform}] auto-close failed:`, msg);
                        return { row, success: false, error: msg };
                    }
                });
                const settled = await Promise.allSettled(dispatches);
                autoCloseOutcomes = settled.map(s =>
                    s.status === 'fulfilled' ? s.value : { row: null, success: false, error: s.reason?.message }
                );
                for (const o of autoCloseOutcomes) {
                    if (!o.row) continue;
                    updatePublicationAfterSync(req.tenantDB, o.row.id, o);
                }
                derive104WritebackToJobs(req.tenantDB, id);
                const oc104 = autoCloseOutcomes.find(o => o.row?.platform === '104');
                if (oc104) {
                    close104Result = oc104.success
                        ? { success: true, action: 'auto_close', jobNo: oc104.row.platform_job_id }
                        : { success: false, action: 'auto_close', error: oc104.error };
                }
            }
        }

        const now = new Date().toISOString();

        // 更新本地資料庫（自動回審時清除 publish_date 並標記 sync_status 待重新同步）
        req.tenantDB.prepare(`
            UPDATE jobs
            SET title = COALESCE(?, title),
                department = COALESCE(?, department),
                description = COALESCE(?, description),
                recruiter = COALESCE(?, recruiter),
                status = COALESCE(?, status),
                jd_id = COALESCE(?, jd_id),
                job104_data = COALESCE(?, job104_data),
                org_unit_id = COALESCE(?, org_unit_id),
                grade = COALESCE(?, grade),
                publish_date = CASE WHEN ? = 1 THEN NULL ELSE publish_date END,
                sync_status = CASE WHEN ? = 1 AND job104_no IS NOT NULL THEN '104_pending' ELSE sync_status END,
                updated_at = ?
            WHERE id = ?
        `).run(
            title || null,
            department || null,
            description || null,
            recruiter || null,
            effectiveStatus,
            jdId || null,
            job104Data ? JSON.stringify(job104Data) : null,
            org_unit_id || null,
            Number.isInteger(grade) ? grade : null,
            shouldRevertToReview ? 1 : 0,
            shouldRevertToReview ? 1 : 0,
            now,
            id
        );

        // 若未自動回審且目前為 published，對 synced publications 呼叫 adapter.update
        let updateOutcomes = [];
        if (!shouldRevertToReview && job.status === 'published') {
            const syncedRows = listPublications(req.tenantDB, id, ['synced']);
            if (syncedRows.length > 0) {
                const updatedJob = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
                const dispatches = syncedRows.map(async row => {
                    try {
                        let payload;
                        if (row.platform === '104') {
                            const updateData = updatedJob.job104_data ? JSON.parse(updatedJob.job104_data) : {};
                            // 104 UpdateJob 規格 payload（email 展平、role/jobCatSet 對齊）
                            let emailList = updateData.email || ['hr@company.com'];
                            while (Array.isArray(emailList) && emailList.length > 0 && Array.isArray(emailList[0])) {
                                emailList = emailList.flat();
                            }
                            if (!Array.isArray(emailList) || emailList.length === 0) emailList = ['hr@company.com'];
                            emailList = emailList.filter(e => typeof e === 'string');
                            if (emailList.length === 0) emailList = ['hr@company.com'];
                            let role = updateData.role || 1;
                            let jobCatSet = updateData.jobCatSet || [2001002002];
                            const isHighLevelCat = jobCatSet[0] && jobCatSet[0] >= 9000000000;
                            if (isHighLevelCat && role !== 3) jobCatSet = [2001002002];
                            else if (!isHighLevelCat && role === 3) jobCatSet = [9001001000];
                            payload = {
                                job: title || updateData.job || updatedJob.title,
                                description: description || updateData.description || updatedJob.description || '',
                                jobCatSet: jobCatSet,
                                salaryType: updateData.salaryType || 10,
                                salaryLow: updateData.salaryLow || 0,
                                salaryHigh: updateData.salaryHigh || 0,
                                addrNo: updateData.addrNo || 6001001001,
                                edu: updateData.edu || [8],
                                contact: updateData.contact || 'HR',
                                email: emailList,
                                replyDay: updateData.replyDay || 7,
                                applyType: updateData.applyType || { '104': [2] },
                                workShifts: updateData.workShifts || []
                            };
                        } else {
                            payload = row.platform_fields ? JSON.parse(row.platform_fields) : {};
                        }
                        const publisher = getPublisher(row.platform);
                        if (!publisher) throw new Error(`Unknown platform: ${row.platform}`);
                        await publisher.update(row.platform_job_id, payload);
                        return { row, success: true, status: 'synced' };
                    } catch (error) {
                        const msg = formatPlatformError(error);
                        console.error(`⚠️ [${row.platform}] update sync failed:`, msg);
                        return { row, success: false, error: msg };
                    }
                });
                const settled = await Promise.allSettled(dispatches);
                updateOutcomes = settled.map(s =>
                    s.status === 'fulfilled' ? s.value : { row: null, success: false, error: s.reason?.message }
                );
                for (const o of updateOutcomes) {
                    if (!o.row) continue;
                    updatePublicationAfterSync(req.tenantDB, o.row.id, o);
                }
                derive104WritebackToJobs(req.tenantDB, id);
            }
        }


        res.json({
            status: 'success',
            message: shouldRevertToReview
                ? '職缺關鍵欄位已更新，已自動下架並回到審核中，需重新核准才會再次上架'
                : '職缺已更新',
            autoRevertedToReview: shouldRevertToReview,
            changedCriticalFields: shouldRevertToReview ? changedFields : [],
            close104: close104Result,
            publications: getPublicationsByJobId(req.tenantDB, id)
        });
    } catch (error) {
        console.error('Failed to update job:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * GET /api/jobs/:id/candidates-summary
 * 取得職缺候選人摘要 (供刪除前防呆提示用)
 *
 * 回傳：
 * - total: 總候選人數
 * - byStatus: 各狀態人數
 * - hasOnboarded: 是否已有候選人轉入職 (true 時禁止刪除職缺)
 * - inProgressCount: 進行中流程的候選人數 (邀約/面試/決策/offer)，禁止直接刪除
 * - inProgressByStatus: 進行中候選人按狀態分組 (供前端顯示具體卡點)
 * - unresolvedCount: 早期或未明候選人數 (尚未進人才庫，刪除時會被自動歸檔)
 */
router.get('/:id/candidates-summary', requireFeaturePerm('L1.jobs', 'view'), (req, res) => {
    try {
        const { id } = req.params;
        const job = req.tenantDB.prepare('SELECT id, title, status, job104_no FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        const rows = req.tenantDB.prepare(`
            SELECT c.status, COUNT(*) as cnt,
                SUM(CASE WHEN tp.id IS NOT NULL THEN 1 ELSE 0 END) as in_pool
            FROM candidates c
            LEFT JOIN talent_pool tp ON tp.candidate_id = c.id
            WHERE c.job_id = ?
            GROUP BY c.status
        `).all(id);

        const byStatus = {};
        const inProgressByStatus = {};
        let total = 0;
        let hasOnboarded = false;
        let inProgressCount = 0;
        let unresolvedCount = 0;
        for (const row of rows) {
            const status = row.status || 'unknown';
            byStatus[status] = row.cnt;
            total += row.cnt;

            if (status === 'onboarded') {
                hasOnboarded = true;
            } else if (CANDIDATE_IN_PROGRESS_STATUSES.includes(status)) {
                inProgressCount += row.cnt;
                inProgressByStatus[status] = row.cnt;
            } else if (!CANDIDATE_TERMINAL_STATUSES.includes(status)) {
                // 早期/未明狀態（new 等）且未進人才庫的，刪除時會被自動歸檔
                unresolvedCount += (row.cnt - row.in_pool);
            }
        }

        res.json({
            status: 'success',
            data: {
                jobId: job.id,
                jobTitle: job.title,
                jobStatus: job.status,
                synced104: !!job.job104_no,
                total,
                byStatus,
                hasOnboarded,
                inProgressCount,
                inProgressByStatus,
                unresolvedCount
            }
        });
    } catch (error) {
        console.error('Failed to fetch candidates summary:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * DELETE /api/jobs/:id
 * 刪除職缺 (若已同步 104 則同步刪除)
 *
 * 防護機制：
 * - 若有候選人已轉入職 (status='onboarded')，拒絕刪除，回 409
 * - 未結案候選人會自動匯入人才庫並標記「職缺已撤除」，再清除 candidates 紀錄
 * - 已上架 104 會同步刪除
 * 前端應先呼叫 GET /:id/candidates-summary 顯示防呆提示，再帶 ?force=true 送出刪除
 */
router.delete('/:id', requireFeaturePerm('L1.jobs', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const force = req.query.force === 'true' || req.query.force === '1';
        console.log('🗑️ Deleting job:', id, '(force:', force, ')');

        // 先檢查職缺是否存在並取得 104 編號
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        // 統計候選人狀況
        const candidates = req.tenantDB.prepare(`
            SELECT c.id, c.status,
                (SELECT 1 FROM talent_pool tp WHERE tp.candidate_id = c.id) as in_pool
            FROM candidates c
            WHERE c.job_id = ?
        `).all(id);

        const onboardedList = candidates.filter(c => c.status === 'onboarded');
        const inProgressList = candidates.filter(c => CANDIDATE_IN_PROGRESS_STATUSES.includes(c.status));
        // 早期/未明狀態（new 等）且未進人才庫的可自動歸檔；terminal 狀態不歸檔但會清除
        const unresolvedList = candidates.filter(c =>
            c.status !== 'onboarded' &&
            !CANDIDATE_IN_PROGRESS_STATUSES.includes(c.status) &&
            !CANDIDATE_TERMINAL_STATUSES.includes(c.status) &&
            !c.in_pool
        );

        // 防護 1：已有候選人轉入職 → 拒絕刪除
        if (onboardedList.length > 0) {
            return res.status(409).json({
                status: 'error',
                code: 'HAS_ONBOARDED_CANDIDATES',
                message: `此職缺已有 ${onboardedList.length} 位候選人轉入職，無法刪除。建議改為「關閉」職缺。`,
                onboardedCount: onboardedList.length
            });
        }

        // 防護 2：有候選人正在面試流程中 → 拒絕刪除，請 HR 先處理
        if (inProgressList.length > 0) {
            const byStatus = inProgressList.reduce((acc, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1;
                return acc;
            }, {});
            return res.status(409).json({
                status: 'error',
                code: 'HAS_IN_PROGRESS_CANDIDATES',
                message: `此職缺有 ${inProgressList.length} 位候選人正在面試流程中（邀約/面試/決策/Offer），請先完成或婉拒後再刪除職缺。`,
                inProgressCount: inProgressList.length,
                inProgressByStatus: byStatus
            });
        }

        // 防護 3：有候選人但未帶 force → 要求前端確認後重送
        if (candidates.length > 0 && !force) {
            return res.status(409).json({
                status: 'error',
                code: 'CANDIDATES_REQUIRE_CONFIRMATION',
                message: `此職缺有 ${candidates.length} 位候選人，刪除前需確認。`,
                totalCandidates: candidates.length,
                unresolvedCount: unresolvedList.length
            });
        }

        // 將早期/未明的候選人匯入人才庫（避免成為孤兒）
        let archivedCount = 0;
        if (unresolvedList.length > 0) {
            // 動態載入避免循環依賴
            const { importToTalentPool } = require('./recruitment');
            const declineReason = `職缺已撤除：${job.title || job.id}`;
            for (const cand of unresolvedList) {
                try {
                    importToTalentPool(req, cand.id, 'job_withdrawn', declineReason);
                    archivedCount += 1;
                } catch (error) {
                    console.error(`⚠️ Failed to archive candidate ${cand.id}:`, error.message);
                }
            }
            console.log(`📦 Archived ${archivedCount}/${unresolvedList.length} candidates to talent pool`);
        }

        // 對所有 synced publications 呼叫 adapter.close（不呼叫 deleteJob — 詳見 design.md
        // Decision「Delete flow：呼叫 `adapter.close()` 而非 `deleteJob()`」）
        // 單一平台 close 失敗以 log 記錄但不中斷本地刪除（ON DELETE CASCADE 會清掉 publications 列）
        let delete104Result = null;
        const closeWarnings = [];
        const syncedRows = listPublications(req.tenantDB, id, ['synced']);
        if (syncedRows.length > 0) {
            const dispatches = syncedRows.map(async row => {
                try {
                    const publisher = getPublisher(row.platform);
                    if (!publisher) throw new Error(`Unknown platform: ${row.platform}`);
                    await publisher.close(row.platform_job_id);
                    return { row, success: true };
                } catch (error) {
                    const msg = error.response?.data?.error?.message || error.message || String(error);
                    console.error(`⚠️ [${row.platform}] close-on-delete failed:`, msg);
                    return { row, success: false, error: msg };
                }
            });
            const settled = await Promise.allSettled(dispatches);
            for (const s of settled) {
                if (s.status === 'fulfilled' && !s.value.success) {
                    closeWarnings.push({
                        platform: s.value.row.platform,
                        jobNo: s.value.row.platform_job_id,
                        error: s.value.error
                    });
                }
            }
            const oc104 = settled.find(s =>
                s.status === 'fulfilled' && s.value.row?.platform === '104'
            );
            if (oc104) {
                delete104Result = oc104.value.success
                    ? { success: true, jobNo: oc104.value.row.platform_job_id }
                    : { success: false, jobNo: oc104.value.row.platform_job_id, error: oc104.value.error };
            }
        }

        // 清除本地候選人紀錄（避免 FK 孤兒）後刪除職缺
        if (candidates.length > 0) {
            req.tenantDB.prepare('DELETE FROM candidates WHERE job_id = ?').run(id);
        }
        const deleteResult = req.tenantDB.prepare('DELETE FROM jobs WHERE id = ?').run(id);
        console.log('🗑️ Delete result:', deleteResult);

        res.json({
            status: 'success',
            message: '職缺已刪除',
            archivedCandidates: archivedCount,
            removedCandidates: candidates.length,
            delete104: delete104Result,
            closeWarnings
        });
    } catch (error) {
        console.error('Failed to delete job:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/jobs/:jobId/publications/:platform/retry
 * 重試單一平台同步（失敗列、強制 re-sync 已同步列皆可；已 closed 回 409）
 * 完成需求「HR can retry a failed platform synchronization」
 */
router.post('/:jobId/publications/:platform/retry', requireFeaturePerm('L1.jobs', 'edit'), async (req, res) => {
    try {
        const { jobId, platform } = req.params;

        if (!SUPPORTED_PLATFORMS.includes(platform)) {
            return res.status(400).json({ status: 'error', message: `Unsupported platform: ${platform}` });
        }

        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
        if (!job) {
            return res.status(404).json({ status: 'error', message: 'Job not found' });
        }

        const pub = req.tenantDB.prepare(
            'SELECT * FROM job_publications WHERE job_id = ? AND platform = ?'
        ).get(jobId, platform);
        if (!pub) {
            return res.status(404).json({
                status: 'error',
                message: `No publication row for job ${jobId} on platform ${platform}`
            });
        }

        if (pub.status === 'closed') {
            return res.status(409).json({
                status: 'error',
                code: 'PUBLICATION_CLOSED',
                message: 'Publication is closed — reopen job before retrying'
            });
        }

        const publisher = getPublisher(platform);
        if (!publisher) {
            return res.status(500).json({ status: 'error', message: `Publisher not registered: ${platform}` });
        }

        let outcome;
        try {
            let raw;
            if (platform === '104') {
                raw = job.job104_data
                    ? JSON.parse(job.job104_data)
                    : (pub.platform_fields ? JSON.parse(pub.platform_fields) : null);
                if (!raw) throw new Error('104 job data missing');
            } else {
                raw = pub.platform_fields ? JSON.parse(pub.platform_fields) : {};
            }
            const payloads = buildPlatformPayloads(platform, raw, job);
            const result = await dispatchPlatformPublish(pub, payloads);
            outcome = { row: pub, success: true, ...result };
        } catch (error) {
            const msg = formatPlatformError(error);
            console.error(`❌ [${platform}] retry failed:`, msg);
            outcome = { row: pub, success: false, error: msg };
        }

        updatePublicationAfterSync(req.tenantDB, pub.id, outcome);
        if (platform === '104') derive104WritebackToJobs(req.tenantDB, jobId);

        const refreshed = req.tenantDB.prepare(
            'SELECT platform, status, platform_job_id, sync_error, last_sync_attempt_at, published_at FROM job_publications WHERE id = ?'
        ).get(pub.id);

        res.json({
            status: 'success',
            publication: refreshed,
            retryResult: { success: outcome.success, error: outcome.error || null }
        });
    } catch (error) {
        console.error('Failed to retry publication:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/jobs/:id/sync-104
 * 將現有職缺同步至 104
 */
router.post('/:id/sync-104', requireFeaturePerm('L1.jobs', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { job104Data } = req.body;

        // 取得現有職缺
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        if (!job104Data) {
            return res.status(400).json({ status: 'error', message: '缺少 104 職缺資料' });
        }

        // 【修正】驗證並正規化薪資資料，確保符合 104 API 規則
        // 規則 1: 高階主管 (role=3) 只能使用面議 (salaryType=10)
        if (job104Data.role === 3 && job104Data.salaryType !== 10) {
            console.log('⚠️ 高階主管職缺強制使用面議');
            job104Data.salaryType = 10;
            job104Data.salaryLow = 0;
            job104Data.salaryHigh = 0;
        }
        
        // 規則 2: salaryType 驗證
        const salaryType = job104Data.salaryType;
        if (salaryType === 10) {
            // 面議：薪資必須為 0
            job104Data.salaryLow = 0;
            job104Data.salaryHigh = 0;
        } else if (salaryType === 50 || salaryType === 60) {
            // 月薪/年薪：薪資必須大於 0
            if (!job104Data.salaryLow || job104Data.salaryLow <= 0) {
                job104Data.salaryLow = salaryType === 50 ? 30000 : 500000;
            }
            if (!job104Data.salaryHigh || job104Data.salaryHigh <= 0) {
                job104Data.salaryHigh = job104Data.salaryLow;
            }
            if (job104Data.salaryHigh < job104Data.salaryLow) {
                job104Data.salaryHigh = job104Data.salaryLow;
            }
        }
        console.log('📊 Validated job data for sync:', { role: job104Data.role, salaryType: job104Data.salaryType, salaryLow: job104Data.salaryLow, salaryHigh: job104Data.salaryHigh });

        // 同步至 104
        const result = await job104Service.postJob(job104Data);
        const job104No = result?.data?.jobNo?.toString() || null;
        const now = new Date().toISOString();

        if (!job104No) {
            return res.status(500).json({ status: 'error', message: '同步失敗，未取得 jobNo' });
        }

        // 更新本地資料
        req.tenantDB.prepare(`
            UPDATE jobs 
            SET job104_no = ?, sync_status = '104_synced', job104_data = ?, synced_at = ?, status = 'published', updated_at = ?
            WHERE id = ?
        `).run(job104No, JSON.stringify(job104Data), now, now, id);

        res.json({
            status: 'success',
            data: {
                id,
                job104_no: job104No,
                sync_status: '104_synced'
            }
        });
    } catch (error) {
        console.error('Failed to sync job to 104:', error.response?.data || error.message);
        res.status(500).json({
            status: 'error',
            message: error.response?.data?.error?.message || error.message
        });
    }
});

/**
 * POST /api/jobs/:id/sync-from-104
 * 從 104 同步職缺資料回本地
 */
router.post('/:id/sync-from-104', requireFeaturePerm('L1.jobs', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;

        // 取得現有職缺
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        if (!job.job104_no) {
            return res.status(400).json({ status: 'error', message: '此職缺尚未同步至 104' });
        }

        console.log(`🔄 Fetching job ${job.job104_no} from 104 API...`);

        // 從 104 API 取得最新資料
        const response = await job104Service.getJobDetail(job.job104_no);
        const job104Data = response?.data;

        if (!job104Data) {
            return res.status(500).json({ status: 'error', message: '無法從 104 取得職缺資料' });
        }

        console.log('✅ Received job data from 104:', JSON.stringify(job104Data, null, 2));

        // 將 104 API 回傳格式轉換為本地儲存格式
        const mappedData = {
            role: job104Data.role || 1,
            job: job104Data.job || job.title,
            jobCatSet: job104Data.jobCatSet || [2001002002],
            description: job104Data.description || job.description,
            salaryType: job104Data.salaryType || 10,
            salaryLow: job104Data.salaryLow || 0,
            salaryHigh: job104Data.salaryHigh || 0,
            addrNo: job104Data.addrNo || 6001001001,
            edu: job104Data.edu || [8],
            contact: job104Data.contact || 'HR',
            email: Array.isArray(job104Data.email) ? job104Data.email : [job104Data.email || 'hr@company.com'],
            replyDay: job104Data.replyDay || 7,
            workShifts: job104Data.workShifts || [{
                type: 1,
                periods: [{ startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 }]
            }]
        };

        const now = new Date().toISOString();

        // 更新本地資料庫
        req.tenantDB.prepare(`
            UPDATE jobs 
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                job104_data = ?,
                synced_at = ?,
                updated_at = ?
            WHERE id = ?
        `).run(
            mappedData.job || null,
            mappedData.description || null,
            JSON.stringify(mappedData),
            now,
            now,
            id
        );

        console.log(`✅ Job ${id} synced from 104 successfully`);

        res.json({
            status: 'success',
            message: '已從 104 同步最新資料',
            data: {
                id,
                job104_no: job.job104_no,
                job104_data: mappedData,
                synced_at: now
            }
        });
    } catch (error) {
        console.error('Failed to sync from 104:', error.response?.data || error.message);
        res.status(500).json({
            status: 'error',
            message: error.response?.data?.error?.message || error.message || '同步失敗'
        });
    }
});



/**
 * POST /api/jobs/debug/reset-candidates
 * 重置所有候選人狀態 (Debug 用)
 */
router.post('/debug/reset-candidates', (req, res) => {
    try {
        console.log('🔄 Resetting all candidates...');
        // Reset candidates to initial state
        req.tenantDB.prepare(`
            UPDATE candidates 
            SET status = 'new', 
                stage = 'Collected', 
                score = 0, 
                scoring_status = 'Pending',
                ai_summary = NULL
        `).run();

        // Clear related tables
        req.tenantDB.prepare("DELETE FROM interview_invitations").run();
        req.tenantDB.prepare("DELETE FROM invitation_decisions").run();
        req.tenantDB.prepare("DELETE FROM interviews").run();

        console.log('✅ Candidates reset.');
        res.json({ status: 'success', message: '所有候選人已重置為初始狀態' });
    } catch (error) {
        console.error('Reset failed:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});



/**
 * GET /api/jobs/:jobId/candidates/:candidateId/full
 * 取得候選人完整履歷資料與 AI 解析報告
 */
router.get('/:jobId/candidates/:candidateId/full', requireFeaturePerm('L1.jobs', 'view'), (req, res) => {
  try {
    const { jobId, candidateId } = req.params;

    // 1. 取得候選人主資料（含職缺標題、面試邀請資訊）
    const candidate = req.tenantDB.prepare(`
      SELECT 
        c.*,
        j.title as job_title,
        ii.response_token,
        ii.candidate_response,
        ii.selected_slots,
        ii.status as invitation_status,
        ii.reschedule_note,
        ii.responded_at,
        (SELECT COUNT(*) FROM interviews WHERE candidate_id = c.id) as interview_count,
        i.id as interview_id,
        i.interview_at,
        i.location as interview_location,
        i.address as interview_address,
        i.meeting_link,
        i.cancel_token as interview_cancel_token,
        i.result as interview_result
      FROM candidates c
      LEFT JOIN jobs j ON c.job_id = j.id
      LEFT JOIN interview_invitations ii ON ii.id = (
        SELECT id FROM interview_invitations 
        WHERE candidate_id = c.id 
        ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN interviews i ON i.id = (
        SELECT id FROM interviews 
        WHERE candidate_id = c.id AND result != 'Cancelled'
        ORDER BY created_at DESC LIMIT 1
      )
      WHERE c.id = ?
    `).get(candidateId);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // 2. 取得學歷資料
    const educationList = req.tenantDB.prepare(`
      SELECT * FROM candidate_education 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 3. 取得工作經歷
    const experienceList = req.tenantDB.prepare(`
      SELECT * FROM candidate_experiences 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 4. 取得技能專長
    const specialityList = req.tenantDB.prepare(`
      SELECT * FROM candidate_specialities 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 5. 取得語言能力
    const languageList = req.tenantDB.prepare(`
      SELECT * FROM candidate_languages 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 6. 取得專案作品
    const projectList = req.tenantDB.prepare(`
      SELECT * FROM candidate_projects 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 7. 取得附件
    const attachmentList = req.tenantDB.prepare(`
      SELECT * FROM candidate_attachments 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 8. 取得推薦人
    const recommenderList = req.tenantDB.prepare(`
      SELECT * FROM candidate_recommenders 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 9. 取得應徵紀錄
    const applyRecordList = req.tenantDB.prepare(`
      SELECT * FROM candidate_apply_records 
      WHERE candidate_id = ? 
      ORDER BY apply_date DESC
    `).all(candidateId);

    // 10. 取得應徵問答
    const applyQuestionList = req.tenantDB.prepare(`
      SELECT * FROM candidate_apply_questions 
      WHERE candidate_id = ? 
      ORDER BY sort_order ASC
    `).all(candidateId);

    // 11. 取得 AI 履歷解析報告
    const resumeAnalysis = req.tenantDB.prepare(`
      SELECT * FROM candidate_resume_analysis 
      WHERE candidate_id = ? AND job_id = ?
    `).get(candidateId, candidate.job_id);

    // Parse JSON fields in resume analysis
    let parsedAnalysis = null;
    if (resumeAnalysis) {
      parsedAnalysis = {
        ...resumeAnalysis,
        matchedRequirements: resumeAnalysis.matched_requirements ? JSON.parse(resumeAnalysis.matched_requirements) : [],
        unmatchedRequirements: resumeAnalysis.unmatched_requirements ? JSON.parse(resumeAnalysis.unmatched_requirements) : [],
        bonusSkills: resumeAnalysis.bonus_skills ? JSON.parse(resumeAnalysis.bonus_skills) : [],
        extractedTechSkills: resumeAnalysis.extracted_tech_skills ? JSON.parse(resumeAnalysis.extracted_tech_skills) : [],
        extractedSoftSkills: resumeAnalysis.extracted_soft_skills ? JSON.parse(resumeAnalysis.extracted_soft_skills) : [],
        experienceAnalysis: resumeAnalysis.experience_analysis ? JSON.parse(resumeAnalysis.experience_analysis) : [],
        contentFeatures: resumeAnalysis.content_features ? JSON.parse(resumeAnalysis.content_features) : [],
        areasToClarify: resumeAnalysis.areas_to_clarify ? JSON.parse(resumeAnalysis.areas_to_clarify) : [],
        techVerificationPoints: resumeAnalysis.tech_verification_points ? JSON.parse(resumeAnalysis.tech_verification_points) : [],
        experienceSupplementPoints: resumeAnalysis.experience_supplement_points ? JSON.parse(resumeAnalysis.experience_supplement_points) : []
      };
    }

    // 組合完整資料
    const fullData = {
      ...candidate,
      // 子資料
      educationList: educationList || [],
      experienceList: experienceList || [],
      specialityList: specialityList || [],
      languageList: languageList || [],
      projectList: projectList || [],
      attachmentList: attachmentList || [],
      recommenderList: recommenderList || [],
      applyRecordList: applyRecordList || [],
      applyQuestionList: applyQuestionList || [],
      // AI 解析報告
      resumeAnalysis: parsedAnalysis
    };

    res.json(fullData);
  } catch (error) {
    console.error('Error fetching candidate full data:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// Mock AI Resume Analysis Generator
// ============================================================

const MOCK_JD_REQUIREMENTS = {
  tech: [
    '5年以上前端開發經驗', '熟悉 Angular 框架', '熟悉 TypeScript',
    '具備 RxJS 使用經驗', '熟悉 RESTful API 設計', '了解 Git 版本控制', '具備 CI/CD 經驗'
  ],
  pm: [
    '3年以上產品管理經驗', '具備 Agile/Scrum 經驗', '熟悉數據分析工具',
    '良好的跨部門溝通能力', '具備技術背景佳'
  ],
  design: [
    '3年以上 UI/UX 設計經驗', '熟悉 Figma 或 Sketch', '具備用戶研究經驗',
    '了解前端技術佳', '具備視覺設計能力'
  ],
  hr: [
    '3年以上人力資源經驗', '熟悉勞基法規', '具備招募面試經驗',
    '良好的溝通協調能力', '具備員工關係處理經驗'
  ],
  finance: [
    '3年以上財會經驗', '具備會計師證照佳', '熟悉 ERP 系統',
    '了解稅務法規', '具備成本分析能力'
  ]
};

const MOCK_TECH_SKILLS = ['Angular', 'TypeScript', 'JavaScript', 'React', 'Vue.js', 'Node.js', 'Python', 'Java', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Git', 'CI/CD', 'PostgreSQL', 'MongoDB'];
const MOCK_SOFT_SKILLS = ['團隊協作', '溝通能力', '問題解決', '時間管理', '專案管理', '領導能力', '創新思維', '學習能力'];
const MOCK_WRITING_STYLES = ['專業、條理清晰', '簡潔扼要、重點明確', '詳細完整、資訊豐富', '具邏輯性、結構完整', '客觀中立、數據導向'];
const MOCK_CONTENT_FEATURES = [
  { type: '量化描述', description: '履歷中包含具體數字與成果量化，有助於評估實際貢獻程度' },
  { type: '描述完整度', description: '工作職責與專案成果描述詳細，易於了解實際工作內容' },
  { type: '技能標註', description: '明確標示所使用的技術與工具，便於技能匹配分析' },
  { type: '經歷連貫性', description: '工作經歷時間連續，無明顯空窗期' },
  { type: '專業術語', description: '使用正確的專業術語，顯示對領域的熟悉度' }
];
const MOCK_AREAS_TO_CLARIFY = [
  '團隊規模與管理範圍未明確說明', '跨部門協作經驗描述較簡略', '離職原因未說明',
  '專案成果的具體量化數據', '技術深度與廣度需進一步確認', '英文能力實際應用情境'
];
const MOCK_TECH_VERIFICATION = [
  '專案的具體架構設計經驗', '進階特性的使用經驗', '效能優化的具體實作方式',
  '複雜場景的應用經驗', '流程的設計與維護經驗', '測試策略與覆蓋率', '大型專案的技術決策過程'
];
const MOCK_EXP_SUPPLEMENT = [
  '團隊協作中的具體角色與貢獻', '跨部門合作的實際案例', '過往專案遇到的挑戰與解決方式',
  '技術選型的考量因素', '如何保持技術學習與成長', '對新技術的學習方法'
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomSlice(arr, min, max) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, randomInt(min, max));
}

function determineCandidateType(candidate) {
  const skills = (candidate.skills || '').toLowerCase();
  if (skills.includes('angular') || skills.includes('react') || skills.includes('javascript') || skills.includes('typescript')) return 'tech';
  if (skills.includes('design') || skills.includes('figma') || skills.includes('ui')) return 'design';
  if (skills.includes('product') || skills.includes('project') || skills.includes('agile')) return 'pm';
  if (skills.includes('招募') || skills.includes('人資') || skills.includes('人才') || skills.includes('面試') || skills.includes('勞基法')) return 'hr';
  if (skills.includes('會計') || skills.includes('財務') || skills.includes('審計') || skills.includes('稅務') || skills.includes('erp')) return 'finance';
  return 'hr';
}

function generateMockAnalysisData(candidate, job) {
  const type = determineCandidateType(candidate);
  const requirements = MOCK_JD_REQUIREMENTS[type] || MOCK_JD_REQUIREMENTS.hr;
  const baseScore = candidate.score || randomInt(60, 95);

  const requirementScore = Math.min(100, Math.max(30, baseScore + randomInt(-10, 10)));
  const keywordScore = Math.min(100, Math.max(30, baseScore + randomInt(-8, 12)));
  const experienceScore = Math.min(100, Math.max(30, baseScore + randomInt(-5, 15)));
  const overallScore = Math.round(requirementScore * 0.4 + keywordScore * 0.35 + experienceScore * 0.25);

  const matchedCount = Math.max(1, Math.floor(requirements.length * (requirementScore / 100)));
  const company = candidate.current_company || '前公司';
  const evidences = [
    '履歷中明確提及相關經驗',
    `從 ${company} 的工作描述可見`,
    '技能列表中包含相關技術',
    `工作經歷顯示 ${candidate.experience_years || 3} 年相關經驗`,
    '專案經驗中有相關實作'
  ];

  const matchedRequirements = requirements.slice(0, matchedCount).map(req => ({
    requirement: req,
    evidence: randomPick(evidences)
  }));
  const unmatchedRequirements = requirements.slice(matchedCount).map(req => ({
    requirement: req,
    note: '履歷中未見相關描述'
  }));

  let candidateSkills = [];
  try { candidateSkills = JSON.parse(candidate.skills || '[]'); } catch (e) { candidateSkills = []; }

  const extractedTechSkills = candidateSkills
    .filter(s => MOCK_TECH_SKILLS.some(ts => ts.toLowerCase() === s.toLowerCase()))
    .slice(0, randomInt(3, 6));
  if (extractedTechSkills.length === 0 && candidateSkills.length > 0) {
    extractedTechSkills.push(...candidateSkills.slice(0, Math.min(3, candidateSkills.length)));
  }

  const jdRequiredTotal = randomInt(7, 10);
  const jdRequiredMatch = Math.min(jdRequiredTotal, Math.floor(jdRequiredTotal * (keywordScore / 100)));
  const jdBonusTotal = randomInt(5, 8);
  const jdBonusMatch = Math.floor(jdBonusTotal * randomInt(40, 80) / 100);

  const relevanceLevel = experienceScore >= 85 ? 5 : experienceScore >= 75 ? 4 : experienceScore >= 65 ? 3 : 2;
  const experienceAnalysis = [{
    firm: company,
    job: candidate.current_position || '專員',
    duration: `${Math.min(candidate.experience_years || 2, 8)} 年`,
    relevance_level: relevanceLevel,
    relevance_reasons: randomSlice(['職務類型與職缺一致', '技術棧高度重疊', '產業經驗相關', '管理經驗匹配'], 2, 3)
  }];

  return {
    overall_match_score: overallScore,
    requirement_match_score: requirementScore,
    keyword_match_score: keywordScore,
    experience_relevance_score: experienceScore,
    matched_requirements: JSON.stringify(matchedRequirements),
    unmatched_requirements: JSON.stringify(unmatchedRequirements),
    bonus_skills: JSON.stringify(randomSlice(candidateSkills.length > 0 ? candidateSkills : ['團隊合作', '溝通能力'], 1, 3)),
    extracted_tech_skills: JSON.stringify(extractedTechSkills),
    extracted_soft_skills: JSON.stringify(randomSlice(MOCK_SOFT_SKILLS, 3, 5)),
    jd_required_match_count: jdRequiredMatch,
    jd_required_total_count: jdRequiredTotal,
    jd_bonus_match_count: jdBonusMatch,
    jd_bonus_total_count: jdBonusTotal,
    experience_analysis: JSON.stringify(experienceAnalysis),
    total_relevant_years: candidate.experience_years || randomInt(2, 8),
    jd_required_years: randomInt(3, 5),
    writing_style: randomPick(MOCK_WRITING_STYLES),
    analysis_confidence: randomInt(85, 98),
    content_features: JSON.stringify(randomSlice(MOCK_CONTENT_FEATURES, 2, 4)),
    areas_to_clarify: JSON.stringify(randomSlice(MOCK_AREAS_TO_CLARIFY, 2, 4)),
    tech_verification_points: JSON.stringify(randomSlice(MOCK_TECH_VERIFICATION, 3, 5)),
    experience_supplement_points: JSON.stringify(randomSlice(MOCK_EXP_SUPPLEMENT, 3, 5)),
    analyzed_at: new Date().toISOString(),
    analysis_engine_version: 'Bombus AI v2.1',
    resume_word_count: randomInt(800, 2500)
  };
}

/**
 * POST /api/jobs/:jobId/candidates/:candidateId/generate-mock-analysis
 * 產生模擬 AI 履歷解析報告
 */
router.post('/:jobId/candidates/:candidateId/generate-mock-analysis', requireFeaturePerm('L1.jobs', 'edit'), (req, res) => {
  try {
    const { jobId, candidateId } = req.params;

    const candidate = req.tenantDB.prepare(`
      SELECT id, job_id, name, score, skills, experience_years, current_company, current_position
      FROM candidates WHERE id = ? AND job_id = ?
    `).get(candidateId, jobId);

    if (!candidate) {
      return res.status(404).json({ error: '候選人不存在' });
    }

    const job = req.tenantDB.prepare('SELECT id, title FROM jobs WHERE id = ?').get(jobId);

    const data = generateMockAnalysisData(candidate, job);
    const id = uuidv4();

    // UPSERT: 刪除舊資料再插入
    req.tenantDB.prepare('DELETE FROM candidate_resume_analysis WHERE candidate_id = ? AND job_id = ?')
      .run(candidateId, jobId);

    req.tenantDB.prepare(`
      INSERT INTO candidate_resume_analysis (
        id, candidate_id, job_id,
        overall_match_score, requirement_match_score, keyword_match_score, experience_relevance_score,
        matched_requirements, unmatched_requirements, bonus_skills,
        extracted_tech_skills, extracted_soft_skills,
        jd_required_match_count, jd_required_total_count,
        jd_bonus_match_count, jd_bonus_total_count,
        experience_analysis, total_relevant_years, jd_required_years,
        writing_style, analysis_confidence, content_features, areas_to_clarify,
        tech_verification_points, experience_supplement_points,
        analyzed_at, analysis_engine_version, resume_word_count,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, candidateId, jobId,
      data.overall_match_score, data.requirement_match_score, data.keyword_match_score, data.experience_relevance_score,
      data.matched_requirements, data.unmatched_requirements, data.bonus_skills,
      data.extracted_tech_skills, data.extracted_soft_skills,
      data.jd_required_match_count, data.jd_required_total_count,
      data.jd_bonus_match_count, data.jd_bonus_total_count,
      data.experience_analysis, data.total_relevant_years, data.jd_required_years,
      data.writing_style, data.analysis_confidence, data.content_features, data.areas_to_clarify,
      data.tech_verification_points, data.experience_supplement_points,
      data.analyzed_at, data.analysis_engine_version, data.resume_word_count,
      new Date().toISOString()
    );

    res.json({ status: 'ok', overallScore: data.overall_match_score });
  } catch (error) {
    console.error('Error generating mock analysis:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

