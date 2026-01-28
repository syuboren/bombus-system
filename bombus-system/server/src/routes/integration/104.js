const express = require('express');
const router = express.Router();
const authService = require('../../services/104/auth.service');

// GET /api/integration/104/auth/status
// Check if we can successfully authenticate with 104 API
router.get('/auth/status', async (req, res) => {
    try {
        const token = await authService.getAccessToken();
        res.json({
            status: 'connected',
            message: 'Successfully authenticated with 104 API (Sandbox)',
            token_preview: `${token.substring(0, 10)}...`
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to authenticate with 104 API',
            error: error.message
        });
    }
});

// GET /api/integration/104/jobs
// Proxy to fetch jobs from 104 Sandbox
router.get('/jobs', async (req, res) => {
    try {
        const jobService = require('../../services/104/job.service');
        const { limit, offset } = req.query;
        const data = await jobService.getJobs(limit, offset);
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch jobs from 104 API',
            error: error.message
        });
    }
});

// POST /api/integration/104/jobs
// Proxy to create a new job on 104 Sandbox
router.post('/jobs', async (req, res) => {
    try {
        const jobService = require('../../services/104/job.service');
        const jobData = req.body;

        if (!jobData || Object.keys(jobData).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Job data is required'
            });
        }

        const data = await jobService.postJob(jobData);
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: 'error',
            message: 'Failed to create job on 104 API',
            error: error.response?.data || error.message
        });
    }
});

// GET /api/integration/104/jobs/:id
// Proxy to fetch a single job detail from 104 Sandbox
router.get('/jobs/:id', async (req, res) => {
    try {
        const jobService = require('../../services/104/job.service');
        const { id } = req.params;
        const data = await jobService.getJobDetail(id);
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to fetch job detail (${req.params.id}) from 104 API`,
            error: error.response?.data || error.message
        });
    }
});

// PUT /api/integration/104/jobs/:id
// Proxy to update a job on 104 Sandbox
router.put('/jobs/:id', async (req, res) => {
    try {
        const jobService = require('../../services/104/job.service');
        const { id } = req.params;
        const jobData = req.body;

        if (!jobData || Object.keys(jobData).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Job data is required'
            });
        }

        const data = await jobService.updateJob(id, jobData);
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to update job (${req.params.id}) on 104 API`,
            error: error.response?.data || error.message
        });
    }
});

// DELETE /api/integration/104/jobs/:id
// Proxy to delete/close a job on 104 Sandbox
router.delete('/jobs/:id', async (req, res) => {
    try {
        const jobService = require('../../services/104/job.service');
        const { id } = req.params;
        const data = await jobService.deleteJob(id);
        res.json({
            status: 'success',
            data: data,
            message: `Job ${id} deleted successfully`
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to delete job (${req.params.id}) on 104 API`,
            error: error.response?.data || error.message
        });
    }
});

// PATCH /api/integration/104/jobs/:id
// Proxy to patch job status (on/off) on 104 Sandbox
router.patch('/jobs/:id', async (req, res) => {
    try {
        const jobService = require('../../services/104/job.service');
        const { id } = req.params;
        const patchData = req.body;

        if (!patchData || Object.keys(patchData).length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Patch data is required'
            });
        }

        const data = await jobService.patchJobStatus(id, patchData);
        res.json({
            status: 'success',
            data: data,
            message: `Job ${id} status patched successfully`
        });
    } catch (error) {
        res.status(error.response?.status || 500).json({
            status: 'error',
            message: `Failed to patch job (${req.params.id}) status on 104 API`,
            error: error.response?.data || error.message
        });
    }
});

// GET /api/integration/104/resumes
// 取得履歷數量與 ID 清單 (queryList)
// Query params: date (yyyy-mm-dd), startTime (0-24), endTime (0-24), flag?, jobNo?
router.get('/resumes', async (req, res) => {
    try {
        const resumeService = require('../../services/104/resume.service');
        const { date, startTime = 0, endTime = 24, flag, jobNo } = req.query;
        
        // 預設為今天
        const queryDate = date || new Date().toISOString().split('T')[0];

        const data = await resumeService.queryResumeList({
            date: queryDate,
            startTime: parseInt(startTime, 10),
            endTime: parseInt(endTime, 10),
            flag: flag !== undefined ? parseInt(flag, 10) : undefined,
            jobNo: jobNo !== undefined ? parseInt(jobNo, 10) : undefined
        });
        
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch resume list from 104 API',
            error: error.response?.data || error.message
        });
    }
});

// GET /api/integration/104/resumes/batch
// 批量取得履歷內容 (queryBatch)
// Query params: date, startTime, endTime, idnos (逗號分隔, 最多10個), flag?, jobNo?
router.get('/resumes/batch', async (req, res) => {
    try {
        const resumeService = require('../../services/104/resume.service');
        const { date, startTime = 0, endTime = 24, idnos, flag, jobNo, mapped } = req.query;
        
        if (!idnos) {
            return res.status(400).json({
                status: 'error',
                message: 'idnos parameter is required (comma-separated, max 10)'
            });
        }

        const queryDate = date || new Date().toISOString().split('T')[0];

        const data = await resumeService.queryBatch({
            date: queryDate,
            startTime: parseInt(startTime, 10),
            endTime: parseInt(endTime, 10),
            idnos,
            flag: flag !== undefined ? parseInt(flag, 10) : undefined,
            jobNo: jobNo !== undefined ? parseInt(jobNo, 10) : undefined
        });
        
        // 如果 mapped=true，則將資料映射為系統候選人格式
        if (mapped === 'true' && data?.data?.list) {
            const mappedCandidates = resumeService.mapResumesToCandidates(data.data.list);
            return res.json({
                status: 'success',
                data: {
                    raw: data.data,
                    candidates: mappedCandidates
                }
            });
        }
        
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch batch resume details from 104 API',
            error: error.response?.data || error.message
        });
    }
});

// GET /api/integration/104/resumes/:idno
// 取得單筆履歷內容 (query)
// Query params: date, startTime, endTime, flag?, jobNo?, mapped?
router.get('/resumes/:idno', async (req, res) => {
    try {
        const resumeService = require('../../services/104/resume.service');
        const { idno } = req.params;
        const { date, startTime = 0, endTime = 24, flag, jobNo, mapped } = req.query;
        
        const queryDate = date || new Date().toISOString().split('T')[0];

        const data = await resumeService.queryResume({
            date: queryDate,
            startTime: parseInt(startTime, 10),
            endTime: parseInt(endTime, 10),
            idno,
            flag: flag !== undefined ? parseInt(flag, 10) : undefined,
            jobNo: jobNo !== undefined ? parseInt(jobNo, 10) : undefined
        });
        
        // 如果 mapped=true，則將資料映射為系統候選人格式
        if (mapped === 'true' && data?.data?.list?.[0]) {
            const mappedCandidate = resumeService.mapResumeToCandidate(data.data.list[0]);
            return res.json({
                status: 'success',
                data: {
                    raw: data.data.list[0],
                    candidate: mappedCandidate
                }
            });
        }
        
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: `Failed to fetch resume detail (${req.params.idno}) from 104 API`,
            error: error.response?.data || error.message
        });
    }
});

module.exports = router;


