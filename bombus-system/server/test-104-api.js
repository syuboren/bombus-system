/**
 * 104 API 測試腳本
 * 直接測試 POST /job 端點
 */
const axios = require('axios');
require('dotenv').config();

const API_104_BASE_URL = process.env.API_104_BASE_URL || 'https://apis.104api-dev.com.tw';
const CLIENT_ID = process.env.API_104_CLIENT_ID;
const CLIENT_SECRET = process.env.API_104_CLIENT_SECRET;

async function getToken() {
    const response = await axios.post('https://apis.104api-dev.com.tw/oauth2/token',
        new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            scope: 'job'
        }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );
    return response.data.access_token;
}

async function testPostJob() {
    try {
        console.log('🔑 Getting access token...');
        const token = await getToken();
        console.log('✅ Token obtained');

        // 使用 104 API 文檔中的範例值測試
        const testJobData = {
            role: 1,                          // 全職 (非高階)
            job: '測試職缺 API Test',          // 職缺名稱
            jobCatSet: [2001002002],          // 人力資源人員 (從類目表確認)
            description: '這是一個測試職缺，用於驗證 104 API 整合。\n\n工作內容：測試系統功能',
            salaryType: 10,                   // 面議
            salaryLow: 0,
            salaryHigh: 0,
            addrNo: 6001001001,               // 台北市中正區
            edu: [8],                         // 大學 (1, 2, 4, 8, 16, 32)
            contact: 'HR 測試',
            email: ['test@example.com'],
            applyType: { '104': [2] },        // 接受 104 履歷
            replyDay: 7,
            workShifts: [{                    // 上班時段 (必填!)
                type: 1,                      // 日班
                periods: [{
                    startHour: 9,
                    startMinute: 0,
                    endHour: 18,
                    endMinute: 0
                }]
            }]
        };

        console.log('\n📤 Sending job data to 104 API:');
        console.log(JSON.stringify(testJobData, null, 2));

        const response = await axios.post(`${API_104_BASE_URL}/job/1.1/job`, testJobData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ SUCCESS! Job created:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('\n❌ FAILED:');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', JSON.stringify(error.response?.data, null, 2));

        if (error.response?.data?.error?.details) {
            console.error('\n📋 Error Details:');
            error.response.data.error.details.forEach((d, i) => {
                console.error(`   [${i}] ${d.code}: ${d.message}`);
            });
        }
    }
}

// 測試高階主管職缺
async function testExecutiveJob() {
    try {
        console.log('\n🔑 Getting access token...');
        const token = await getToken();
        console.log('✅ Token obtained');

        // 高階主管需要使用 9xxx 系列的 jobCatSet
        const testJobData = {
            role: 3,                          // 高階主管
            job: '財務長 CFO',                 // 職缺名稱
            jobCatSet: [9001001000],          // 總經理/副總類別 (高階)
            description: '負責公司財務策略規劃與執行。\n\n主要職責：財務管理、風險控管',
            salaryType: 10,                   // 面議
            salaryLow: 0,
            salaryHigh: 0,
            addrNo: 6001001001,               // 台北市中正區
            edu: [16],                        // 碩士
            contact: 'HR 測試',
            email: ['test@example.com'],
            applyType: { '104': [2] },        // 接受 104 履歷
            replyDay: 7,
            workShifts: [{
                type: 1,
                periods: [{
                    startHour: 9,
                    startMinute: 0,
                    endHour: 18,
                    endMinute: 0
                }]
            }]
        };

        console.log('\n📤 Sending EXECUTIVE job data to 104 API:');
        console.log(JSON.stringify(testJobData, null, 2));

        const response = await axios.post(`${API_104_BASE_URL}/job/1.1/job`, testJobData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('\n✅ SUCCESS! Executive Job created:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error('\n❌ FAILED:');
        console.error('   Status:', error.response?.status);
        console.error('   Error:', JSON.stringify(error.response?.data, null, 2));
    }
}

// 測試不同的 jobCatSet 值
async function testJobCategories() {
    try {
        console.log('🔑 Getting access token...');
        const token = await getToken();
        console.log('✅ Token obtained\n');

        const testCodes = [
            { code: 2001001001, name: '經營管理主管' },
            { code: 2001002001, name: '人力資源主管' },
            { code: 2001002002, name: '人力資源人員' },
            { code: 2001002003, name: '教育訓練人員' }
        ];

        for (const { code, name } of testCodes) {
            console.log(`\n📤 Testing jobCatSet: ${code} (${name})`);

            const testJobData = {
                role: 1,
                job: `API 測試 - ${name}`,
                jobCatSet: [code],
                description: `測試職缺 - ${name}`,
                salaryType: 10,
                salaryLow: 0,
                salaryHigh: 0,
                addrNo: 6001001001,
                edu: [8],
                contact: 'HR',
                email: ['test@example.com'],
                applyType: { '104': [2] },
                replyDay: 7
            };

            try {
                const response = await axios.post(`${API_104_BASE_URL}/job/1.1/job`, testJobData, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log(`   ✅ SUCCESS: jobNo = ${response.data?.data?.jobNo}`);
                return; // 成功一個就停止
            } catch (err) {
                console.log(`   ❌ FAILED: ${err.response?.data?.error?.details?.[0]?.message || err.message}`);
            }
        }

    } catch (error) {
        console.error('Token error:', error.message);
    }
}

// 執行測試
console.log('====================================');
console.log('104 API Integration Test');
console.log('====================================\n');

// 測試全職職缺
testPostJob()
    .then(() => {
        console.log('\n\n====================================');
        console.log('Testing EXECUTIVE Job (role=3)');
        console.log('====================================');
        return testExecutiveJob();
    })
    .then(() => {
        console.log('\n\n✅ All tests completed');
    });

