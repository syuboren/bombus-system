/**
 * Jobs API Routes
 * 職缺管理 CRUD + 104 同步
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
// tenantDB is accessed via req.tenantDB (injected by middleware)
const job104Service = require('../services/104/job.service');

// 生成職缺 ID
function generateJobId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `JOB-${year}${random}`;
}

/**
 * GET /api/jobs
 * 取得職缺列表
 */
router.get('/', (req, res) => {
    try {
        const { status, department, search, limit = 50, offset = 0, org_unit_id } = req.query;

        let sql = `
            SELECT j.*,
            (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id) as total_candidates,
            (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id AND c.status = 'new') as new_candidates
            FROM jobs j WHERE 1=1
        `;
        const params = [];

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
router.get('/stats/summary', (req, res) => {
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

        // 職缺統計
        let statsSql = `
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
                SUM(CASE WHEN job104_no IS NOT NULL THEN 1 ELSE 0 END) as synced
            FROM jobs WHERE 1=1
        `;
        const statsParams = [];
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
        const now = new Date();
        let resumeSql = `
            SELECT COUNT(*) as cnt FROM candidates c
            JOIN jobs j ON c.job_id = j.id
            WHERE c.status = 'new'
        `;
        const resumeParams = [];
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
router.get('/104/jobs', (req, res) => {
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
router.get('/:id', (req, res) => {
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
router.get('/:id/candidates', (req, res) => {
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
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

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

        const previousStatus = job.status;
        let sql = 'UPDATE jobs SET status = ?, updated_at = datetime("now")';
        const params = [status];

        // 追蹤 104 同步結果
        let sync104Result = null;

        // ============================================================
        // 104 同步邏輯
        // ============================================================

        // 核准發布 (review → published 或 closed → published)
        if (status === 'published') {
            sql += ', publish_date = date("now")';

            // 情況 1: 有 104 設定但尚未同步 → 新增至 104
            if (job.job104_data && !job.job104_no) {
                try {
                    console.log('📤 Syncing new job to 104...');
                    const job104Data = JSON.parse(job.job104_data);
                    
                    // 【修正】驗證並正規化薪資資料，確保符合 104 API 規則
                    // 規則 1: 高階主管 (role=3) 只能使用面議 (salaryType=10)
                    if (job104Data.role === 3 && job104Data.salaryType !== 10) {
                        console.log('⚠️ 高階主管職缺強制使用面議');
                        job104Data.salaryType = 10;
                        job104Data.salaryLow = 0;
                        job104Data.salaryHigh = 0;
                    }
                    
                    // 規則 2: salaryType 驗證
                    // salaryType: 10=面議(薪資需為0), 50=月薪, 60=年薪(薪資需>0)
                    const salaryType = job104Data.salaryType;
                    if (salaryType === 10) {
                        // 面議：薪資必須為 0
                        job104Data.salaryLow = 0;
                        job104Data.salaryHigh = 0;
                    } else if (salaryType === 50 || salaryType === 60) {
                        // 月薪/年薪：薪資必須大於 0
                        if (!job104Data.salaryLow || job104Data.salaryLow <= 0) {
                            job104Data.salaryLow = salaryType === 50 ? 30000 : 500000; // 預設月薪 3 萬或年薪 50 萬
                        }
                        if (!job104Data.salaryHigh || job104Data.salaryHigh <= 0) {
                            job104Data.salaryHigh = job104Data.salaryLow;
                        }
                        // 確保 salaryHigh >= salaryLow
                        if (job104Data.salaryHigh < job104Data.salaryLow) {
                            job104Data.salaryHigh = job104Data.salaryLow;
                        }
                    }
                    console.log('📊 Validated job data:', { role: job104Data.role, salaryType: job104Data.salaryType, salaryLow: job104Data.salaryLow, salaryHigh: job104Data.salaryHigh });
                    
                    const result = await job104Service.postJob(job104Data);

                    if (result?.data?.jobNo) {
                        sql += ', job104_no = ?, sync_status = ?, synced_at = datetime("now")';
                        params.push(String(result.data.jobNo), '104_synced');
                        console.log('✅ Job synced to 104, jobNo:', result.data.jobNo);
                        sync104Result = { success: true, action: 'create', jobNo: result.data.jobNo };
                    }
                } catch (error) {
                    // 【修正】同步 104 失敗時，停止並返回錯誤，不繼續建立內部職缺
                    const errorDetails = error.response?.data?.error?.details || [];
                    const errorMessage = errorDetails.map(d => `${d.code}: ${d.message}`).join('; ') || error.message;
                    console.error('❌ Failed to sync to 104:', errorMessage);
                    
                    return res.status(400).json({
                        status: 'error',
                        message: '同步 104 失敗，職缺未發布',
                        sync104Error: {
                            message: errorMessage,
                            details: errorDetails
                        }
                    });
                }
            }

            // 情況 2: 已同步過且有 job104_no → 確保 104 上是開啟狀態
            // 不再檢查 previousStatus，因為用戶可能從 closed→draft→review→published 流程
            if (job.job104_no) {
                try {
                    console.log('🔄 Ensuring job is open on 104...');
                    await job104Service.patchJobStatus(job.job104_no, { switch: 'on' });
                    console.log('✅ Job opened on 104');
                    sync104Result = { success: true, action: 'open', jobNo: job.job104_no };
                } catch (error) {
                    // 如果職缺已經是開啟狀態，104 API 可能返回錯誤，這是預期行為
                    console.log('ℹ️ Job may already be open on 104:', error.message);
                    sync104Result = { success: true, action: 'open_skipped', jobNo: job.job104_no, note: 'Already open or API error' };
                }
            }
        }

        // 關閉職缺 (published → closed)
        if (status === 'closed' && job.job104_no) {
            try {
                console.log('🔒 Closing job on 104...');
                await job104Service.patchJobStatus(job.job104_no, { switch: 'off' });
                console.log('✅ Job closed on 104');
                sync104Result = { success: true, action: 'close', jobNo: job.job104_no };
            } catch (error) {
                console.error('⚠️ Failed to close on 104:', error.message);
                sync104Result = { success: false, action: 'close', error: error.message };
            }
        }

        sql += ' WHERE id = ?';
        params.push(id);

        req.tenantDB.prepare(sql).run(...params);

        // 返回結果，包含 104 同步狀態
        res.json({
            status: 'success',
            sync104: sync104Result
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
router.post('/', (req, res) => {
    try {
        const {
            title,
            department,
            description,
            recruiter = 'HR Admin',
            jdId,
            org_unit_id,
            job104Data  // 保存 104 設定，但不立即同步
        } = req.body;

        if (!title) {
            return res.status(400).json({ status: 'error', message: '職缺名稱為必填' });
        }

        const id = generateJobId();
        const now = new Date().toISOString();

        // 永遠以 draft 狀態建立，104 同步在核准發布時才觸發
        const syncStatus = job104Data ? '104_pending' : 'local_only';

        // 儲存到資料庫
        req.tenantDB.prepare(`
            INSERT INTO jobs (id, title, department, description, recruiter, status, jd_id, job104_no, sync_status, job104_data, synced_at, created_at, updated_at, org_unit_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            now,
            now,
            org_unit_id || null
        );

        console.log(`📝 Job created as draft: ${id}${job104Data ? ' (with 104 config)' : ''}`);

        res.json({
            status: 'success',
            data: {
                id,
                title,
                department,
                status: 'draft',
                job104_no: null,
                sync_status: syncStatus
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
 */
router.put('/:id', async (req, res) => {
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
            job104Data  // 104 設定資料 (可選)
        } = req.body;

        // 先檢查職缺是否存在
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        const now = new Date().toISOString();

        // 更新本地資料庫
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
                updated_at = ?
            WHERE id = ?
        `).run(
            title || null,
            department || null,
            description || null,
            recruiter || null,
            status || null,
            jdId || null,
            job104Data ? JSON.stringify(job104Data) : null,
            org_unit_id || null,
            now,
            id
        );

        // 若已同步至 104 且狀態為 published，同步更新至 104
        if (job.job104_no && job.status === 'published') {
            try {
                // 取得更新後的資料
                const updatedJob = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
                const updateData = updatedJob.job104_data ? JSON.parse(updatedJob.job104_data) : {};

                // 構建符合 104 API UpdateJob 規格的 payload
                // 必填欄位: addrNo, applyType, contact, edu, email, job, jobCatSet, replyDay, salaryHigh, salaryLow, salaryType, description

                // 確保 email 是單層字串陣列
                let emailList = updateData.email || ['hr@company.com'];
                // 如果 email 是巢狀陣列，展平它
                while (Array.isArray(emailList) && emailList.length > 0 && Array.isArray(emailList[0])) {
                    emailList = emailList.flat();
                }
                // 如果最終是空陣列或非陣列，設為預設值
                if (!Array.isArray(emailList) || emailList.length === 0) {
                    emailList = ['hr@company.com'];
                }
                // 確保所有元素都是字串
                emailList = emailList.filter(e => typeof e === 'string');
                if (emailList.length === 0) {
                    emailList = ['hr@company.com'];
                }

                // 取得 role 並確保 jobCatSet 匹配
                let role = updateData.role || 1;
                let jobCatSet = updateData.jobCatSet || [2001002002];

                // 檢查 jobCatSet 是否為高階類別 (9xxxxxxxx)
                const isHighLevelCat = jobCatSet[0] && jobCatSet[0] >= 9000000000;

                // 確保 role 與 jobCatSet 匹配
                if (isHighLevelCat && role !== 3) {
                    // 高階類別但 role 不是高階 → 改用一般類別
                    console.log('⚠️ jobCatSet is high-level but role is not 3. Switching to general category.');
                    jobCatSet = [2001002002];
                } else if (!isHighLevelCat && role === 3) {
                    // 一般類別但 role 是高階 → 改用高階類別
                    console.log('⚠️ role is 3 but jobCatSet is not high-level. Switching to high-level category.');
                    jobCatSet = [9001001000];
                }

                const payload = {
                    // 注意：role 欄位無法透過 PUT 修改，104 API 規定職缺類型建立後不可變更

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


                console.log('📤 Syncing update to 104...', JSON.stringify(payload, null, 2));
                await job104Service.updateJob(job.job104_no, payload);
                console.log('✅ Job updated on 104');
            } catch (error) {
                console.error('⚠️ Failed to sync update to 104:', error.response?.data || error.message);
                // 不阻止本地更新成功
            }
        }


        res.json({ status: 'success', message: '職缺已更新' });
    } catch (error) {
        console.error('Failed to update job:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * DELETE /api/jobs/:id
 * 刪除職缺 (若已同步 104 則同步刪除)
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Deleting job:', id);

        // 先檢查職缺是否存在並取得 104 編號
        const job = req.tenantDB.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
        if (!job) {
            return res.status(404).json({ status: 'error', message: '職缺不存在' });
        }

        // 若已同步至 104，先刪除 104 端
        if (job.job104_no) {
            try {
                console.log('🗑️ Deleting job from 104...');
                await job104Service.deleteJob(job.job104_no);
                console.log('✅ Job deleted from 104');
            } catch (error) {
                console.error('⚠️ Failed to delete from 104:', error.message);
                // 繼續刪除本地資料
            }
        }

        // 刪除本地資料
        const deleteResult = req.tenantDB.prepare('DELETE FROM jobs WHERE id = ?').run(id);
        console.log('🗑️ Delete result:', deleteResult);

        res.json({ status: 'success', message: '職缺已刪除' });
    } catch (error) {
        console.error('Failed to delete job:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

/**
 * POST /api/jobs/:id/sync-104
 * 將現有職缺同步至 104
 */
router.post('/:id/sync-104', async (req, res) => {
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
router.post('/:id/sync-from-104', async (req, res) => {
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
router.get('/:jobId/candidates/:candidateId/full', (req, res) => {
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
router.post('/:jobId/candidates/:candidateId/generate-mock-analysis', (req, res) => {
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

