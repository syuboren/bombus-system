/**
 * Resume API Sandbox 功能完整性測試腳本
 * 
 * 測試參數（根據用戶提供）：
 * 1. 主動應徵履歷 (flag=1): date=2025/4/25, startTime=12, endTime=13
 * 2. 配對履歷 (flag=0): date=2025/8/22, startTime=0, endTime=24
 * 3. 儲存履歷 (flag=2): date=2025/11/5, startTime=16, endTime=17
 */

const path = require('path');
const fs = require('fs');

// 載入環境變數
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Resume104Service = require('../src/services/104/resume.service');

// 測試案例定義
const testCases = [
    {
        name: '主動應徵履歷',
        flag: 1, // 主動應徵履歷
        date: '2025-04-25',
        startTime: 12,
        endTime: 13
    },
    {
        name: '配對履歷',
        flag: 0, // 配對履歷
        date: '2025-08-22',
        startTime: 0,
        endTime: 24
    },
    {
        name: '儲存履歷',
        flag: 2, // 儲存履歷
        date: '2025-11-05',
        startTime: 16,
        endTime: 17
    }
];

// 測試結果收集
const testResults = {
    testDate: new Date().toISOString(),
    summary: {
        totalTests: 0,
        passed: 0,
        failed: 0
    },
    testCases: []
};

/**
 * 執行單一測試案例
 */
async function runTestCase(testCase) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 測試案例: ${testCase.name}`);
    console.log(`   參數: date=${testCase.date}, startTime=${testCase.startTime}, endTime=${testCase.endTime}, flag=${testCase.flag}`);
    console.log(`${'='.repeat(60)}`);

    const caseResult = {
        name: testCase.name,
        flag: testCase.flag,
        params: {
            date: testCase.date,
            startTime: testCase.startTime,
            endTime: testCase.endTime
        },
        queryListResult: null,
        queryResult: null,
        queryBatchResult: null,
        errors: []
    };

    try {
        // =====================================================
        // 1. 測試 queryList 端點
        // =====================================================
        console.log('\n🔍 1. 測試 /queryList 端點...');
        const queryListResponse = await Resume104Service.queryResumeList({
            date: testCase.date,
            startTime: testCase.startTime,
            endTime: testCase.endTime,
            flag: testCase.flag
        });

        caseResult.queryListResult = {
            success: true,
            response: queryListResponse
        };

        const idList = queryListResponse?.data?.idList || [];
        const total = queryListResponse?.data?.total || 0;
        console.log(`   ✅ 成功! 共取得 ${total} 筆履歷 ID`);
        testResults.summary.passed++;
        testResults.summary.totalTests++;

        // =====================================================
        // 2. 測試 query 端點 (單筆查詢)
        // =====================================================
        if (idList.length > 0) {
            console.log('\n🔍 2. 測試 /query 端點 (單筆查詢)...');
            const firstId = idList[0];
            console.log(`   使用 ID: ${firstId}`);

            const queryResponse = await Resume104Service.queryResume({
                date: testCase.date,
                startTime: testCase.startTime,
                endTime: testCase.endTime,
                idno: firstId,
                flag: testCase.flag
            });

            caseResult.queryResult = {
                success: true,
                testedId: firstId,
                response: queryResponse
            };

            const candidateName = queryResponse?.data?.list?.[0]?.fullName || 'N/A';
            console.log(`   ✅ 成功! 取得求職者: ${candidateName}`);
            testResults.summary.passed++;
            testResults.summary.totalTests++;

            // =====================================================
            // 3. 測試 queryBatch 端點 (批量查詢)
            // =====================================================
            console.log('\n🔍 3. 測試 /queryBatch 端點 (批量查詢)...');
            // 取前 5 筆 ID 進行批量查詢
            const batchIds = idList.slice(0, Math.min(5, idList.length));
            console.log(`   使用 ${batchIds.length} 個 ID 進行批量查詢`);

            const batchResponse = await Resume104Service.queryBatch({
                date: testCase.date,
                startTime: testCase.startTime,
                endTime: testCase.endTime,
                idnos: batchIds.join(','),
                flag: testCase.flag
            });

            caseResult.queryBatchResult = {
                success: true,
                testedIds: batchIds,
                response: batchResponse
            };

            const batchList = batchResponse?.data?.list || [];
            console.log(`   ✅ 成功! 批量取得 ${batchList.length} 筆履歷詳情`);
            testResults.summary.passed++;
            testResults.summary.totalTests++;

        } else {
            console.log('\n⚠️ 無法測試 /query 和 /queryBatch，因為 queryList 未返回任何 ID');
            caseResult.queryResult = { success: false, error: 'No IDs returned from queryList' };
            caseResult.queryBatchResult = { success: false, error: 'No IDs returned from queryList' };
            testResults.summary.failed += 2;
            testResults.summary.totalTests += 2;
        }

    } catch (error) {
        console.error(`\n❌ 測試失敗: ${error.message}`);
        caseResult.errors.push({
            message: error.message,
            stack: error.stack
        });
        testResults.summary.failed++;
        testResults.summary.totalTests++;
    }

    return caseResult;
}

/**
 * 主測試函數
 */
async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║        Resume API Sandbox 功能完整性測試                       ║');
    console.log('║        測試日期: ' + new Date().toISOString().split('T')[0].padEnd(47) + '║');
    console.log('╚════════════════════════════════════════════════════════════════╝');

    for (const testCase of testCases) {
        const result = await runTestCase(testCase);
        testResults.testCases.push(result);

        // 在測試之間加入延遲，避免觸發 API 速率限制
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // =====================================================
    // 輸出測試摘要
    // =====================================================
    console.log('\n\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                         測試摘要                               ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  總測試數: ${testResults.summary.totalTests.toString().padEnd(52)}║`);
    console.log(`║  通過: ${testResults.summary.passed.toString().padEnd(56)}║`);
    console.log(`║  失敗: ${testResults.summary.failed.toString().padEnd(56)}║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

    // =====================================================
    // 儲存測試結果為 JSON 檔案
    // =====================================================
    const outputDir = path.join(__dirname, '..', '..', 'docs');
    const outputPath = path.join(outputDir, 'resume_api_test_results.json');

    // 確保目錄存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 寫入 JSON 檔案
    fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2), 'utf8');
    console.log(`\n📄 測試結果已儲存至: ${outputPath}`);

    return testResults;
}

// 執行測試
runAllTests()
    .then(results => {
        console.log('\n✅ 測試完成!');
        process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
        console.error('\n❌ 測試執行失敗:', error);
        process.exit(1);
    });
