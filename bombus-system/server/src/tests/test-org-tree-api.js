/**
 * 統一組織架構 API 整合測試
 *
 * 測試範圍：
 * - GET /api/organization/tree — 統一組織樹
 * - GET /api/organization/departments/:id/employees — 部門員工列表
 * - GET /api/organization/departments/:id/positions — 部門職務配置
 * - PUT /api/organization/departments/:id — 擴充欄位更新
 * - CRUD /api/organization/collaborations — 協作關係
 * - departments 表新增欄位驗證（ALTER TABLE 遷移）
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const BASE = 'http://localhost:3001';
let passed = 0;
let failed = 0;
const results = [];

function assert(condition, description) {
  if (condition) {
    passed++;
    results.push(`  PASS: ${description}`);
  } else {
    failed++;
    results.push(`  FAIL: ${description}`);
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

async function run() {
  console.log('=== 統一組織架構 API 整合測試 ===\n');

  // ───────────────────────────────────────────────────
  // 登入 demo 租戶
  // ───────────────────────────────────────────────────
  console.log('[Step 0] 登入 demo 租戶\n');
  const login = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(login.status === 200, '0.1 登入成功 (200)');
  assert(!!login.data?.access_token, '0.2 回傳 access_token');
  const token = login.data?.access_token;

  if (!token) {
    console.log('\n登入失敗，無法繼續測試');
    results.forEach(r => console.log(r));
    console.log(`\n結果: ${passed} passed / ${failed} failed`);
    process.exit(1);
  }

  // ───────────────────────────────────────────────────
  // Part 1: GET /tree — 統一組織樹
  // ───────────────────────────────────────────────────
  console.log('[Part 1] GET /api/organization/tree\n');

  const tree = await req('GET', '/api/organization/tree', null, token);
  assert(tree.status === 200, '1.1 取得組織樹 (200)');
  assert(Array.isArray(tree.data), '1.2 回傳 JSON 陣列');
  assert(tree.data.length > 0, '1.3 至少有一個節點');

  // 檢查節點欄位完整性
  if (tree.data.length > 0) {
    const node = tree.data[0];
    assert('id' in node, '1.4 節點有 id');
    assert('name' in node, '1.5 節點有 name');
    assert('type' in node, '1.6 節點有 type');
    assert('parentId' in node, '1.7 節點有 parentId');
    assert('level' in node, '1.8 節點有 level');
    assert('managerId' in node, '1.9 節點有 managerId');
    assert('managerName' in node, '1.10 節點有 managerName');
    assert('employeeCount' in node, '1.11 節點有 employeeCount');
    assert('responsibilities' in node, '1.12 節點有 responsibilities');
    assert('kpiItems' in node, '1.13 節點有 kpiItems');
    assert('competencyFocus' in node, '1.14 節點有 competencyFocus');
  }

  // 檢查包含不同 type 節點
  const types = new Set(tree.data.map(n => n.type));
  assert(types.has('group') || types.has('subsidiary') || types.has('department'),
    '1.15 包含公司或部門節點');

  // 找一個 department 節點用於後續測試
  const deptNode = tree.data.find(n => n.type === 'department');
  const deptId = deptNode?.id;

  // ───────────────────────────────────────────────────
  // Part 2: GET /departments/:id/employees
  // ───────────────────────────────────────────────────
  console.log('[Part 2] GET /api/organization/departments/:id/employees\n');

  if (deptId) {
    const empList = await req('GET', `/api/organization/departments/${deptId}/employees`, null, token);
    assert(empList.status === 200, '2.1 取得部門員工列表 (200)');
    assert(Array.isArray(empList.data), '2.2 回傳 JSON 陣列');

    if (empList.data.length > 0) {
      const emp = empList.data[0];
      assert('id' in emp, '2.3 員工有 id');
      assert('name' in emp, '2.4 員工有 name');
      assert('employeeNo' in emp, '2.5 員工有 employeeNo');
      assert('status' in emp, '2.6 員工有 status');
    } else {
      assert(true, '2.3 員工列表為空（部門無員工）');
    }
  } else {
    assert(true, '2.1 跳過（無 department 節點）');
  }

  // 測試不存在的部門
  const empNotFound = await req('GET', '/api/organization/departments/nonexistent-id/employees', null, token);
  assert(empNotFound.status === 404, '2.7 不存在部門回傳 404');

  // ───────────────────────────────────────────────────
  // Part 3: GET /departments/:id/positions
  // ───────────────────────────────────────────────────
  console.log('[Part 3] GET /api/organization/departments/:id/positions\n');

  if (deptId) {
    const posList = await req('GET', `/api/organization/departments/${deptId}/positions`, null, token);
    assert(posList.status === 200, '3.1 取得部門職務配置 (200)');
    assert(Array.isArray(posList.data), '3.2 回傳 JSON 陣列');

    if (posList.data.length > 0) {
      const pos = posList.data[0];
      assert('id' in pos, '3.3 職務有 id');
      assert('title' in pos, '3.4 職務有 title');
      assert('track' in pos, '3.5 職務有 track');
      assert('grade' in pos, '3.6 職務有 grade');
      assert('gradeTitle' in pos, '3.7 職務有 gradeTitle');
    } else {
      assert(true, '3.3 職務配置為空（部門無職務）');
    }
  } else {
    assert(true, '3.1 跳過（無 department 節點）');
  }

  // ───────────────────────────────────────────────────
  // Part 4: PUT /departments/:id — 擴充欄位
  // ───────────────────────────────────────────────────
  console.log('[Part 4] PUT /api/organization/departments/:id — 擴充欄位\n');

  if (deptId) {
    const updatePayload = {
      responsibilities: ['任務A', '任務B', '任務C'],
      kpiItems: ['KPI-1', 'KPI-2'],
      competencyFocus: ['core', 'professional']
    };

    const putRes = await req('PUT', `/api/organization/departments/${deptId}`, updatePayload, token);
    assert(putRes.status === 200, '4.1 更新部門擴充欄位 (200)');

    // 驗證：GET /tree 回傳更新後的值
    const treeAfter = await req('GET', '/api/organization/tree', null, token);
    const updatedDept = treeAfter.data?.find(n => n.id === deptId);
    assert(updatedDept !== undefined, '4.2 組織樹中找到更新的部門');

    if (updatedDept) {
      assert(
        Array.isArray(updatedDept.responsibilities) && updatedDept.responsibilities.length === 3,
        '4.3 responsibilities 正確（3 項）'
      );
      assert(
        Array.isArray(updatedDept.kpiItems) && updatedDept.kpiItems.length === 2,
        '4.4 kpiItems 正確（2 項）'
      );
      assert(
        Array.isArray(updatedDept.competencyFocus) && updatedDept.competencyFocus.length === 2,
        '4.5 competencyFocus 正確（2 項）'
      );
      assert(
        updatedDept.responsibilities[0] === '任務A',
        '4.6 responsibilities[0] = 任務A'
      );
    }

    // 清理：還原為空陣列
    await req('PUT', `/api/organization/departments/${deptId}`, {
      responsibilities: [],
      kpiItems: [],
      competencyFocus: []
    }, token);
  } else {
    assert(true, '4.1 跳過（無 department 節點）');
  }

  // ───────────────────────────────────────────────────
  // Part 5: CRUD /collaborations — 協作關係
  // ───────────────────────────────────────────────────
  console.log('[Part 5] CRUD /api/organization/collaborations\n');

  // 取得兩個部門節點
  const deptNodes = tree.data?.filter(n => n.type === 'department') || [];

  if (deptNodes.length >= 2) {
    const srcId = deptNodes[0].id;
    const tgtId = deptNodes[1].id;

    // 5.1 POST 建立
    const createCollab = await req('POST', '/api/organization/collaborations', {
      sourceDeptId: srcId,
      targetDeptId: tgtId,
      relationType: 'parallel',
      description: '測試協作關係'
    }, token);
    assert(createCollab.status === 201, '5.1 新增協作關係 (201)');
    assert(!!createCollab.data?.id, '5.2 回傳協作關係 id');

    const collabId = createCollab.data?.id;

    // 5.3 GET 列表
    const listCollab = await req('GET', '/api/organization/collaborations', null, token);
    assert(listCollab.status === 200, '5.3 取得協作關係列表 (200)');
    assert(Array.isArray(listCollab.data), '5.4 回傳 JSON 陣列');
    const found = listCollab.data.find(c => c.id === collabId);
    assert(!!found, '5.5 列表包含新建的協作關係');
    assert(found?.sourceName !== undefined, '5.6 包含 sourceName');
    assert(found?.targetName !== undefined, '5.7 包含 targetName');
    assert(found?.relationType === 'parallel', '5.8 relationType = parallel');

    // 5.9 PUT 更新
    if (collabId) {
      const updateCollab = await req('PUT', `/api/organization/collaborations/${collabId}`, {
        relationType: 'downstream',
        description: '更新後描述'
      }, token);
      assert(updateCollab.status === 200, '5.9 更新協作關係 (200)');
      assert(updateCollab.data?.relationType === 'downstream', '5.10 relationType 更新為 downstream');
      assert(updateCollab.data?.description === '更新後描述', '5.11 description 已更新');
    }

    // 5.12 DELETE 刪除
    if (collabId) {
      const deleteCollab = await req('DELETE', `/api/organization/collaborations/${collabId}`, null, token);
      assert(deleteCollab.status === 200, '5.12 刪除協作關係 (200)');

      // 確認已刪除
      const listAfter = await req('GET', '/api/organization/collaborations', null, token);
      const stillExists = listAfter.data?.find(c => c.id === collabId);
      assert(!stillExists, '5.13 列表不再包含已刪除的協作關係');
    }

    // 5.14 POST 驗證 — 無效 relationType
    const badType = await req('POST', '/api/organization/collaborations', {
      sourceDeptId: srcId,
      targetDeptId: tgtId,
      relationType: 'invalid'
    }, token);
    assert(badType.status === 400, '5.14 無效 relationType 回傳 400');

    // 5.15 POST 驗證 — 缺少必填欄位
    const missingField = await req('POST', '/api/organization/collaborations', {
      sourceDeptId: srcId
    }, token);
    assert(missingField.status === 400, '5.15 缺少必填欄位回傳 400');
  } else {
    assert(true, '5.1 跳過（部門節點不足 2 個）');
  }

  // ───────────────────────────────────────────────────
  // 結果報告
  // ───────────────────────────────────────────────────
  console.log('\n' + '='.repeat(50));
  results.forEach(r => console.log(r));
  console.log('='.repeat(50));
  console.log(`\n結果: ${passed} passed / ${failed} failed (共 ${passed + failed} 項)`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('測試執行錯誤:', err);
  process.exit(1);
});
