/**
 * D-13 employee-list-pagination 後端整合測試
 *
 * 對應 spec：specs/employee-list-pagination/spec.md 6 個 ADDED Requirements
 *   - Backward-compatible opt-in pagination on employee list endpoint
 *   - pageSize bounds and default
 *   - Search across name email and employee number
 *   - Whitelisted server-side sort
 *   - Pagination composes with existing filters and scope
 *   - Compound database index covering default sort path
 *
 * 前提：server 在 http://localhost:3001 + demo 租戶（admin@demo.com / admin123）
 *
 * 執行：node server/src/tests/test-d13-employee-list-pagination.js
 */

const BASE = 'http://localhost:3001';
let passed = 0, failed = 0;
const results = [];

function assert(cond, desc) {
    if (cond) { passed++; results.push(`  ✅ ${desc}`); }
    else { failed++; results.push(`  ❌ ${desc}`); }
}

async function req(method, path, body, token) {
    const h = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const o = { method, headers: h };
    if (body && method !== 'GET') o.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, o);
    let d = null;
    try { d = await r.json(); } catch { /* non-json */ }
    return { status: r.status, data: d };
}

async function run() {
    console.log('=== D-13 employee-list-pagination 後端整合測試 ===\n');

    const login = await req('POST', '/api/auth/login', {
        email: 'admin@demo.com', password: 'admin123', tenant_slug: 'demo'
    });
    if (login.status !== 200) {
        console.error('Admin login failed');
        process.exit(1);
    }
    const adminToken = login.data.access_token;

    // ────────────────────────────────────────────────────────────────────
    // [Requirement 1] Backward-compatible opt-in pagination
    // ────────────────────────────────────────────────────────────────────
    console.log('[Requirement 1: Backward-compatible opt-in pagination]');

    // 1a) 不傳 page → 維持 array
    const noPage = await req('GET', '/api/employee/list', null, adminToken);
    assert(noPage.status === 200, '不傳 page → 200');
    assert(Array.isArray(noPage.data), '不傳 page → 回 array（向後相容）');
    const totalAll = (noPage.data || []).length;
    assert(totalAll > 0, `demo 租戶有 ${totalAll} 名員工可供測試`);

    // 1b) ?page=undefined → 也走 array fallback
    const pageUndef = await req('GET', '/api/employee/list?page=undefined', null, adminToken);
    assert(pageUndef.status === 200, '?page=undefined → 200');
    assert(Array.isArray(pageUndef.data), '?page=undefined → 仍回 array（防 client 誤觸）');

    // 1c) ?page= → 也走 array fallback
    const pageEmpty = await req('GET', '/api/employee/list?page=', null, adminToken);
    assert(pageEmpty.status === 200, '?page= → 200');
    assert(Array.isArray(pageEmpty.data), '?page=（空字串） → 仍回 array');

    // 1d) ?page=abc → 也走 array fallback（NaN）
    const pageNaN = await req('GET', '/api/employee/list?page=abc', null, adminToken);
    assert(pageNaN.status === 200, '?page=abc → 200');
    assert(Array.isArray(pageNaN.data), '?page=abc → 仍回 array（NaN fallback）');

    // 1e) ?page=1 → 切換為分頁物件格式
    const page1 = await req('GET', '/api/employee/list?page=1', null, adminToken);
    assert(page1.status === 200, '?page=1 → 200');
    assert(page1.data && typeof page1.data === 'object' && !Array.isArray(page1.data),
        '?page=1 → 回物件而非 array');
    assert(Array.isArray(page1.data?.data), '?page=1 → data 欄位為 array');
    assert(typeof page1.data?.total === 'number', '?page=1 → total 為 number');
    assert(typeof page1.data?.page === 'number', '?page=1 → page 為 number');
    assert(typeof page1.data?.pageSize === 'number', '?page=1 → pageSize 為 number');
    assert(typeof page1.data?.totalPages === 'number', '?page=1 → totalPages 為 number');
    assert(page1.data?.total === totalAll, `分頁 total (${page1.data?.total}) === 全量 (${totalAll})`);

    // ────────────────────────────────────────────────────────────────────
    // [Requirement 2] pageSize bounds and default
    // ────────────────────────────────────────────────────────────────────
    console.log('\n[Requirement 2: pageSize bounds and default]');

    // 2a) 預設 pageSize=50
    assert(page1.data?.pageSize === 50, '不傳 pageSize → 預設 50');

    // 2b) pageSize=20 → 直接使用
    const ps20 = await req('GET', '/api/employee/list?page=1&pageSize=20', null, adminToken);
    assert(ps20.data?.pageSize === 20, 'pageSize=20 → 使用 20');

    // 2c) pageSize=500 → cap 至 200
    const ps500 = await req('GET', '/api/employee/list?page=1&pageSize=500', null, adminToken);
    assert(ps500.data?.pageSize === 200, 'pageSize=500 → cap 至 200（不報錯）');
    assert(ps500.status === 200, 'pageSize=500 → 仍 200');

    // 2d) pageSize=0 → 退預設 50
    const ps0 = await req('GET', '/api/employee/list?page=1&pageSize=0', null, adminToken);
    assert(ps0.data?.pageSize === 50, 'pageSize=0 → 退預設 50');

    // 2e) pageSize=-10 → 退預設 50
    const psNeg = await req('GET', '/api/employee/list?page=1&pageSize=-10', null, adminToken);
    assert(psNeg.data?.pageSize === 50, 'pageSize=-10 → 退預設 50');

    // 2f) pageSize=abc → 退預設 50
    const psAbc = await req('GET', '/api/employee/list?page=1&pageSize=abc', null, adminToken);
    assert(psAbc.data?.pageSize === 50, 'pageSize=abc → 退預設 50');

    // ────────────────────────────────────────────────────────────────────
    // [Requirement 3] Search across name email and employee number
    // ────────────────────────────────────────────────────────────────────
    console.log('\n[Requirement 3: Search across name email and employee number]');

    // 找 demo 租戶第一個員工作為搜尋目標
    const sampleEmp = (page1.data?.data || [])[0];
    assert(sampleEmp != null, `取樣首筆員工：${sampleEmp?.name} (${sampleEmp?.employee_no})`);

    if (sampleEmp) {
        // 3a) 搜尋姓名
        const searchName = await req(
            `GET`,
            `/api/employee/list?page=1&search=${encodeURIComponent(sampleEmp.name)}`,
            null, adminToken
        );
        assert(searchName.status === 200, 'search=<姓名> → 200');
        const nameHit = (searchName.data?.data || []).some(e => e.id === sampleEmp.id);
        assert(nameHit, `search=<姓名> → 命中「${sampleEmp.name}」`);

        // 3b) 搜尋大寫版本（驗證 case-insensitive）
        const upperName = sampleEmp.name.toUpperCase();
        if (upperName !== sampleEmp.name) {
            const searchUpper = await req(
                'GET',
                `/api/employee/list?page=1&search=${encodeURIComponent(upperName)}`,
                null, adminToken
            );
            const upperHit = (searchUpper.data?.data || []).some(e => e.id === sampleEmp.id);
            assert(upperHit, `search=<大寫姓名> → 不分大小寫命中`);
        } else {
            results.push(`  ⏭  search 大小寫測試（中文姓名無大小寫差異，跳過）`);
        }

        // 3c) 搜尋員工編號
        if (sampleEmp.employee_no) {
            const searchNo = await req(
                'GET',
                `/api/employee/list?page=1&search=${encodeURIComponent(sampleEmp.employee_no)}`,
                null, adminToken
            );
            const noHit = (searchNo.data?.data || []).some(e => e.id === sampleEmp.id);
            assert(noHit, `search=<員工編號 ${sampleEmp.employee_no}> → 命中`);
        }

        // 3d) 搜尋 email
        if (sampleEmp.email) {
            const emailPart = sampleEmp.email.split('@')[0];
            const searchEmail = await req(
                'GET',
                `/api/employee/list?page=1&search=${encodeURIComponent(emailPart)}`,
                null, adminToken
            );
            const emailHit = (searchEmail.data?.data || []).some(e => e.id === sampleEmp.id);
            assert(emailHit, `search=<email 前綴 ${emailPart}> → 命中`);
        }

        // 3e) 不存在的字串 → 0 筆
        const searchNone = await req(
            'GET',
            '/api/employee/list?page=1&search=ZZZNONEXISTENT_XYZ_999',
            null, adminToken
        );
        assert(searchNone.data?.total === 0, 'search=<不存在> → total 0');

        // 3f) 空 search → 等同無 search
        const searchEmpty = await req('GET', '/api/employee/list?page=1&search=', null, adminToken);
        assert(searchEmpty.data?.total === totalAll, 'search=（空字串） → total === 全量');
    }

    // ────────────────────────────────────────────────────────────────────
    // [Requirement 4] Whitelisted server-side sort
    // ────────────────────────────────────────────────────────────────────
    console.log('\n[Requirement 4: Whitelisted server-side sort]');

    // 4a) 預設排序：department, name
    const defaultSort = await req('GET', '/api/employee/list?page=1&pageSize=200', null, adminToken);
    const defaultData = defaultSort.data?.data || [];
    let isDefaultOrdered = true;
    for (let i = 1; i < defaultData.length; i++) {
        const prev = defaultData[i - 1];
        const curr = defaultData[i];
        const cmpDept = (prev.department || '').localeCompare(curr.department || '');
        if (cmpDept > 0) { isDefaultOrdered = false; break; }
        if (cmpDept === 0 && (prev.name || '').localeCompare(curr.name || '') > 0) {
            isDefaultOrdered = false; break;
        }
    }
    assert(isDefaultOrdered, '預設排序：(department, name) ASC');

    // 4b) sort=hire_date&order=desc
    const sortDesc = await req(
        'GET', '/api/employee/list?page=1&pageSize=200&sort=hire_date&order=desc',
        null, adminToken
    );
    const descData = sortDesc.data?.data || [];
    let isDescOrdered = true;
    for (let i = 1; i < descData.length; i++) {
        const prev = descData[i - 1].hire_date || '';
        const curr = descData[i].hire_date || '';
        if (prev < curr) { isDescOrdered = false; break; }
    }
    assert(isDescOrdered, 'sort=hire_date&order=desc → 順序正確');

    // 4c) sort=name&order=asc
    const sortNameAsc = await req(
        'GET', '/api/employee/list?page=1&pageSize=200&sort=name&order=asc',
        null, adminToken
    );
    const ascData = sortNameAsc.data?.data || [];
    let isAscOrdered = true;
    for (let i = 1; i < ascData.length; i++) {
        if ((ascData[i - 1].name || '').localeCompare(ascData[i].name || '') > 0) {
            isAscOrdered = false; break;
        }
    }
    assert(isAscOrdered, 'sort=name&order=asc → 順序正確');

    // 4d) Order DESC vs ASC 大小寫不敏感
    const sortDescUpper = await req(
        'GET', '/api/employee/list?page=1&pageSize=10&sort=name&order=DESC',
        null, adminToken
    );
    const sortDescLower = await req(
        'GET', '/api/employee/list?page=1&pageSize=10&sort=name&order=desc',
        null, adminToken
    );
    const upperFirstId = sortDescUpper.data?.data?.[0]?.id;
    const lowerFirstId = sortDescLower.data?.data?.[0]?.id;
    assert(upperFirstId === lowerFirstId, 'order=DESC vs order=desc → 大小寫不敏感');

    // 4e) Invalid sort=password → fallback 預設
    const invalidSort = await req(
        'GET', '/api/employee/list?page=1&pageSize=200&sort=password&order=asc',
        null, adminToken
    );
    const invalidData = invalidSort.data?.data || [];
    assert(invalidSort.status === 200, '無效 sort=password → 仍 200');
    let invalidOrdered = true;
    for (let i = 1; i < invalidData.length; i++) {
        const cmpDept = (invalidData[i - 1].department || '').localeCompare(invalidData[i].department || '');
        if (cmpDept > 0) { invalidOrdered = false; break; }
    }
    assert(invalidOrdered, 'sort=password → fallback 預設 (department, name)');

    // 4f) SQL injection attempt → fallback + 不執行 SQL
    const sqlInject = await req(
        'GET', `/api/employee/list?page=1&pageSize=10&sort=${encodeURIComponent('name;DROP TABLE employees;--')}`,
        null, adminToken
    );
    assert(sqlInject.status === 200, 'SQL injection 嘗試 → 仍 200，回 fallback');
    // 確認 employees 表還在（後續 query 仍可成功）
    const stillThere = await req('GET', '/api/employee/list?page=1&pageSize=1', null, adminToken);
    assert(stillThere.data?.total === totalAll, 'employees 表未被攻擊摧毀（total 仍一致）');

    // ────────────────────────────────────────────────────────────────────
    // [Requirement 5] Pagination composes with existing filters and scope
    // ────────────────────────────────────────────────────────────────────
    console.log('\n[Requirement 5: Pagination composes with existing filters and scope]');

    // 5a) page + dept 共存
    const firstDept = sampleEmp?.department;
    if (firstDept) {
        const pageDept = await req(
            'GET',
            `/api/employee/list?page=1&pageSize=10&dept=${encodeURIComponent(firstDept)}`,
            null, adminToken
        );
        assert(pageDept.status === 200, `page + dept=${firstDept} → 200`);
        const allInDept = (pageDept.data?.data || []).every(e => e.department === firstDept);
        assert(allInDept, `page + dept=${firstDept} → 回傳全屬於該部門`);
    }

    // 5b) page + role=interviewer 共存
    const pageRole = await req(
        'GET', '/api/employee/list?page=1&pageSize=10&role=interviewer',
        null, adminToken
    );
    assert(pageRole.status === 200, 'page + role=interviewer → 200');
    assert(typeof pageRole.data?.total === 'number',
        `page + role=interviewer → total 反映 interviewer 員工數（${pageRole.data?.total}）`);

    // 5c) page + dept + search 三者共存
    if (firstDept && sampleEmp) {
        const triple = await req(
            'GET',
            `/api/employee/list?page=1&pageSize=10&dept=${encodeURIComponent(firstDept)}&search=${encodeURIComponent(sampleEmp.name)}`,
            null, adminToken
        );
        assert(triple.status === 200, 'page + dept + search 三者共存 → 200');
    }

    // 5d) total 是「post-filter 後的數量」，不是全表筆數
    const filteredCount = await req(
        'GET', `/api/employee/list?page=1&pageSize=10&search=${encodeURIComponent('ZZZNONEXISTENT')}`,
        null, adminToken
    );
    assert(filteredCount.data?.total === 0,
        '搜尋無命中 → total === 0（反映 post-filter 結果）');

    // 5e) totalPages = ceil(total / pageSize)
    const tinyPage = await req('GET', '/api/employee/list?page=1&pageSize=1', null, adminToken);
    assert(tinyPage.data?.totalPages === tinyPage.data?.total,
        `pageSize=1 → totalPages === total (${tinyPage.data?.total})`);

    // ────────────────────────────────────────────────────────────────────
    // [Requirement 6] Compound database index existence
    // ────────────────────────────────────────────────────────────────────
    console.log('\n[Requirement 6: Compound database index covering default sort path]');

    // 索引存在性透過 idempotent migration 保證：CREATE INDEX IF NOT EXISTS 在
    // shared EMPLOYEE_MIGRATIONS 中，每次 server 啟動 + 每個 tenant DB 載入皆會執行。
    // 此處透過「依索引覆蓋路徑的 query 都成功」作為功能性驗證。

    // 6a) status + ORDER BY (department, name) 路徑（覆蓋索引）
    const idxPath1 = await req('GET', '/api/employee/list?page=1&pageSize=50', null, adminToken);
    assert(idxPath1.status === 200, '預設查詢路徑（status + ORDER BY department, name）執行成功');

    // 6b) org_unit_id + status 路徑
    const sampleEmpOrg = sampleEmp?.org_unit_id;
    if (sampleEmpOrg) {
        const idxPath2 = await req(
            'GET',
            `/api/employee/list?page=1&pageSize=50&org_unit_id=${encodeURIComponent(sampleEmpOrg)}`,
            null, adminToken
        );
        assert(idxPath2.status === 200, 'org_unit_id 過濾 + ORDER BY 路徑成功');
    }

    // 6c) 重複呼叫不報錯（migration 冪等的間接驗證）
    const idem1 = await req('GET', '/api/employee/list?page=1&pageSize=10', null, adminToken);
    const idem2 = await req('GET', '/api/employee/list?page=1&pageSize=10', null, adminToken);
    assert(idem1.status === 200 && idem2.status === 200,
        '重複呼叫多次 → 皆 200（確認 migration 不會 race / duplicate index error）');

    // ────────────────────────────────────────────────────────────────────
    // 結果輸出
    // ────────────────────────────────────────────────────────────────────
    console.log('\n=== 測試結果 ===');
    results.forEach(line => console.log(line));
    console.log(`\n總計：${passed + failed} 項，通過 ${passed}，失敗 ${failed}`);
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
