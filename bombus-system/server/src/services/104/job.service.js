const axios = require('axios');
const authService = require('./auth.service');
require('dotenv').config();

class Job104Service {
    constructor() {
        this.baseUrl = process.env.API_104_BASE_URL || 'https://apis.104api-dev.com.tw';
    }

    async getJobs(limit = 10, offset = 0) {
        try {
            const token = await authService.getAccessToken();

            const response = await axios.get(`${this.baseUrl}/job/1.1/job`, {
                params: { limit, offset },
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to fetch jobs from 104 API:', error.response?.data || error.message);

            // Retry once on 401 Unauthorized (Token might be expired despite cache check)
            if (error.response?.status === 401) {
                console.log('🔄 Token expired during request, refreshing...');
                authService.accessToken = null; // Clear cache
                return this.getJobs(limit, offset); // Retry
            }

            throw error;
        }
    }

    async getJobDetail(jobNo) {
        try {
            const token = await authService.getAccessToken();

            const response = await axios.get(`${this.baseUrl}/job/1.1/job/${jobNo}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;
        } catch (error) {
            console.error(`❌ Failed to fetch job detail (${jobNo}):`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * 新增職缺至 104
     * @param {Object} jobData - 職缺資料 (需符合 104 API 規範)
     */
    async postJob(jobData) {
        try {
            const token = await authService.getAccessToken();

            console.log('📤 Sending job data to 104:', JSON.stringify(jobData, null, 2));

            const response = await axios.post(`${this.baseUrl}/job/1.1/job`, jobData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('✅ Job created on 104:', response.data);
            return response.data;
        } catch (error) {
            const errorData = error.response?.data;
            console.error('❌ Failed to create job on 104:');
            console.error('   Status:', error.response?.status);
            console.error('   Error:', JSON.stringify(errorData, null, 2));
            if (errorData?.error?.details) {
                console.error('   Details:');
                errorData.error.details.forEach((d, i) => {
                    console.error(`     [${i}]`, JSON.stringify(d));
                });
            }
            throw error;
        }
    }

    /**
     * 更新 104 職缺
     * @param {string} jobNo - 職缺編號
     * @param {Object} jobData - 更新的職缺資料
     */
    async updateJob(jobNo, jobData) {
        try {
            const token = await authService.getAccessToken();

            const response = await axios.put(`${this.baseUrl}/job/1.1/job/${jobNo}`, jobData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Job ${jobNo} updated on 104`);
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to update job ${jobNo}:`, error.response?.data || error.message);
            // 印出詳細的驗證錯誤
            if (error.response?.data?.error?.details) {
                console.error('   Validation details:');
                error.response.data.error.details.forEach((d, i) => {
                    console.error(`     [${i}]`, JSON.stringify(d));
                });
            }
            throw error;
        }
    }

    /**
     * 刪除/下架 104 職缺
     * @param {string} jobNo - 職缺編號
     */
    async deleteJob(jobNo) {
        try {
            const token = await authService.getAccessToken();

            const response = await axios.delete(`${this.baseUrl}/job/1.1/job/${jobNo}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log(`✅ Job ${jobNo} deleted from 104`);
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to delete job ${jobNo}:`, error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * 部分更新職缺狀態 (開啟/關閉)
     * @param {string} jobNo - 職缺編號
     * @param {Object} patchData - 部分更新資料 (例如: { switch: 'on' | 'off' })
     */
    async patchJobStatus(jobNo, patchData) {
        try {
            const token = await authService.getAccessToken();

            const response = await axios.patch(`${this.baseUrl}/job/1.1/job/${jobNo}`, patchData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Job ${jobNo} status patched on 104`);
            return response.data;
        } catch (error) {
            console.error(`❌ Failed to patch job ${jobNo}:`, error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new Job104Service();

