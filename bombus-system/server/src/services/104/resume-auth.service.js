/**
 * 104 Resume API 認證服務
 * 使用獨立的 Client ID/Secret 進行 ehrweb_resume scope 認證
 */
const axios = require('axios');
require('dotenv').config();

class ResumeAuth104Service {
    constructor() {
        // Resume API 專用認證 (與 Job API 不同)
        this.clientId = process.env.API_104_RESUME_CLIENT_ID || 'C073zsr2m7oy4ocosw0k80ggs0s';
        this.clientSecret = process.env.API_104_RESUME_CLIENT_SECRET || 'F5poOR9vZVctj9R9DCwVZleIJmwIj0oT';
        this.baseUrl = process.env.API_104_BASE_URL || 'https://apis.104api-dev.com.tw';
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    /**
     * 取得 Resume API 的 Access Token
     * @returns {Promise<string>} Access Token
     */
    async getAccessToken() {
        // 1. 檢查是否有有效的 token 快取
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            // 2. 準備認證請求
            const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

            const payload = new URLSearchParams();
            payload.append('grant_type', 'client_credentials');
            payload.append('scope', 'ehrweb_resume'); // Resume API 專用 scope

            // 3. 取得新 token
            console.log(`🔐 Requesting Resume API token from: ${this.baseUrl}/oauth2/token`);
            const response = await axios.post(`${this.baseUrl}/oauth2/token`, payload, {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }
            });

            const { access_token, expires_in } = response.data;

            // 4. 快取 token (提前 60 秒過期)
            this.accessToken = access_token;
            this.tokenExpiry = new Date(new Date().getTime() + (expires_in - 60) * 1000);

            console.log('✅ Successfully obtained 104 Resume API Access Token');
            return this.accessToken;

        } catch (error) {
            console.error('❌ Failed to authenticate with 104 Resume API:', error.response?.data || error.message);
            throw new Error('Resume API authentication failed');
        }
    }

    /**
     * 清除 token 快取 (用於重新認證)
     */
    clearToken() {
        this.accessToken = null;
        this.tokenExpiry = null;
    }
}

module.exports = new ResumeAuth104Service();
