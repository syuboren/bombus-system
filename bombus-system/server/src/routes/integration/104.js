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
// Proxy to fetch resume list (IDs) from 104 Sandbox
router.get('/resumes', async (req, res) => {
    try {
        const resumeService = require('../../services/104/resume.service');
        // Default to today if no date provided
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const data = await resumeService.queryResumeList(date);
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch resume list from 104 API',
            error: error.message
        });
    }
});

// POST /api/integration/104/resumes/batch
// Proxy to fetch batch resume details
router.post('/resumes/batch', async (req, res) => {
    try {
        const resumeService = require('../../services/104/resume.service');
        const { idList, date } = req.body;

        // Default to today if no date provided
        const queryDate = date || new Date().toISOString().split('T')[0];

        if (!idList || !Array.isArray(idList) || idList.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'idList array is required'
            });
        }

        const data = await resumeService.getResumeDetails(idList, queryDate);
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch batch resume details from 104 API',
            error: error.message
        });
    }
});

// GET /api/integration/104/resumes/:id
// Proxy to fetch single resume detail
router.get('/resumes/:id', async (req, res) => {
    try {
        const resumeService = require('../../services/104/resume.service');
        const { id } = req.params;
        // Default to today if no date provided
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const data = await resumeService.getResumeDetails([id], date);
        res.json({
            status: 'success',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: `Failed to fetch resume detail (${req.params.id}) from 104 API`,
            error: error.message
        });
    }
});

module.exports = router;


