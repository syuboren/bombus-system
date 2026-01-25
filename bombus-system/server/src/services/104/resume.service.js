const axios = require('axios');
const authService = require('./auth.service');
require('dotenv').config();

class Resume104Service {
    constructor() {
        this.baseUrl = process.env.API_104_BASE_URL || 'https://apis.104api-dev.com.tw';
    }

    // Get Resume IDs for a specific date
    async queryResumeList(date) {
        try {
            if (!date) {
                throw new Error('Date parameter (yyyy-mm-dd) is required');
            }

            const token = await authService.getAccessToken();

            const response = await axios.get(`${this.baseUrl}/ehrweb_resume/1.0/resumes/queryList`, {
                params: { date },
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            return response.data;

        } catch (error) {
            console.error('❌ Failed to fetch resume list from 104 API:', error.response?.data || error.message);

            if (error.response?.status === 401) {
                authService.accessToken = null;
                return this.queryResumeList(date);
            }

            throw error;
        }
    }

    // Get Resume Details by IDs
    async getResumeDetails(idList, date) {
        try {
            const token = await authService.getAccessToken();

            const response = await axios.post(`${this.baseUrl}/ehrweb_resume/1.0/resumes/queryBatch`,
                {
                    idList: Array.isArray(idList) ? idList : [idList],
                    date: date
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;

        } catch (error) {
            console.error('❌ Failed to fetch batch resumes:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new Resume104Service();
