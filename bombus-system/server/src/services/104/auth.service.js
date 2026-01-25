const axios = require('axios');
require('dotenv').config();

class Auth104Service {
    constructor() {
        this.clientId = process.env.API_104_CLIENT_ID;
        this.clientSecret = process.env.API_104_CLIENT_SECRET;
        this.baseUrl = process.env.API_104_BASE_URL || 'https://apis.104api-dev.com.tw';
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        // 1. Check if valid token exists in cache
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            // 2. Prepare request payload for Sandbox
            const authString = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

            const payload = new URLSearchParams();
            payload.append('grant_type', 'client_credentials');
            payload.append('scope', 'job'); // Default scope for now

            // 3. Exchange for new token
            console.log(`Sending auth request to: ${this.baseUrl}/oauth2/token`);
            const response = await axios.post(`${this.baseUrl}/oauth2/token`, payload, {
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const { access_token, expires_in } = response.data;

            // 4. Cache the token (subtract 60s buffer)
            this.accessToken = access_token;
            this.tokenExpiry = new Date(new Date().getTime() + (expires_in - 60) * 1000);

            console.log('✅ Successfully obtained 104 API Access Token');
            return this.accessToken;

        } catch (error) {
            console.error('❌ Failed to authenticate with 104 API:', error.response?.data || error.message);
            throw new Error('Authentication failed');
        }
    }
}

module.exports = new Auth104Service();
