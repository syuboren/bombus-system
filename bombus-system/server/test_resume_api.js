const https = require('https');
const querystring = require('querystring');

// Configuration
const CLIENT_ID = 'C073zsr2m7oy4ocosw0k80ggs0s';
const CLIENT_SECRET = 'F5poOR9vZVctj9R9DCwVZleIJmwIj0oT';
const SCOPE = 'ehrweb_resume';
const AUTH_URL = 'https://apis.104api-dev.com.tw/oauth2/token';
const API_BASE_URL = 'https://apis.104api-dev.com.tw/ehrweb_resume/1.0';

// Helper for making HTTPS requests
function makeRequest(url, method, headers, data = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: headers
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, data: json });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, data: body });
                }
            });
        });

        req.on('error', (e) => reject(e));

        if (data) {
            req.write(data);
        }
        req.end();
    });
}

async function getAccessToken() {
    console.log('--- 1. Authenticating ---');
    const postData = querystring.stringify({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: SCOPE
    });

    try {
        const response = await makeRequest(AUTH_URL, 'POST', {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        }, postData);

        if (response.statusCode === 200 && response.data.access_token) {
            console.log('Success: Access Token obtained.');
            return response.data.access_token;
        } else {
            console.error('Authentication Failed:', response);
            process.exit(1);
        }
    } catch (error) {
        console.error('Authentication Error:', error);
        process.exit(1);
    }
}

async function queryList(token, label, params) {
    console.log(`\n--- [queryList] Testing Case: ${label} ---`);
    console.log(`Params: ${JSON.stringify(params)}`);

    const queryParams = querystring.stringify(params);
    const url = `${API_BASE_URL}/resumes/queryList?${queryParams}`;

    try {
        const response = await makeRequest(url, 'GET', {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        if (response.statusCode === 200) {
            console.log('Result Summary:', {
                total: response.data?.data?.total,
                idListCount: response.data?.data?.idList?.length
            });
            console.log('Result:', JSON.stringify(response.data, null, 2));
            return response.data?.data?.idList || [];
        } else {
            console.error('Request Failed:', response.statusCode, response.data);
            return [];
        }
    } catch (error) {
        console.error('Request Error:', error);
        return [];
    }
}

async function queryResume(token, idno, params) {
    console.log(`\n--- [query] Testing Single Resume: ${idno} ---`);
    const queryParams = querystring.stringify({ ...params, idno });
    const url = `${API_BASE_URL}/resumes/query?${queryParams}`;

    try {
        const response = await makeRequest(url, 'GET', {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        if (response.statusCode === 200) {
            const name = response.data?.data?.list?.[0]?.fullName || 'Unknown';
            console.log('Success: Retrieved resume for', name);
            console.log(JSON.stringify(response.data, null, 2));
            return true;
        } else {
            console.error('Request Failed:', response.statusCode, response.data);
            return false;
        }
    } catch (error) {
        console.error('Request Error:', error);
        return false;
    }
}

async function queryBatch(token, idnos, params) {
    console.log(`\n--- [queryBatch] Testing Batch Resumes: ${idnos} ---`);
    const queryParams = querystring.stringify({ ...params, idnos: idnos.join(',') });
    const url = `${API_BASE_URL}/resumes/queryBatch?${queryParams}`;

    try {
        const response = await makeRequest(url, 'GET', {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });

        if (response.statusCode === 200) {
            const count = response.data?.data?.list?.length || 0;
            console.log(`Success: Retrieved ${count} resumes`);
            console.log(JSON.stringify(response.data, null, 2));
            return true;
        } else {
            console.error('Request Failed:', response.statusCode, response.data);
            return false;
        }
    } catch (error) {
        console.error('Request Error:', error);
        return false;
    }
}


// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    const token = await getAccessToken();

    // 1. Test Active Application
    const activeParams = { date: '2025-04-25', startTime: 12, endTime: 13 };
    const activeIds = await queryList(token, '主動應徵履歷 (2025/4/25)', activeParams);

    if (activeIds.length > 0) {
        // Test query (Single)
        await delay(2000); // Wait 2s
        await queryResume(token, activeIds[0], activeParams);

        // Test queryBatch (Batch - max 10)
        await delay(2000); // Wait 2s
        await queryBatch(token, activeIds.slice(0, 5), activeParams);
    }

    // 2. Test Matched Resume
    await delay(2000); // Wait 2s before next case
    const matchedParams = { date: '2025-08-22', startTime: 0, endTime: 24 };
    const matchedIds = await queryList(token, '配對履歷 (2025/8/22)', matchedParams);

    if (matchedIds.length > 0) {
        await delay(2000); // Wait 2s
        await queryResume(token, matchedIds[0], matchedParams);
    }

    // 3. Test Saved Resume
    await delay(2000); // Wait 2s before next case
    const savedParams = { date: '2025-11-05', startTime: 16, endTime: 17 };
    await queryList(token, '儲存履歷 (2025/11/5)', savedParams);
}

runTests();
