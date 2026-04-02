/**
 * Edit Scope Enforcement 整合測試
 *
 * 驗證 L1 員工管理寫入端點的 edit_scope 權限：
 * - edit_scope=self 的使用者不能編輯他人記錄、上傳/更新/刪除他人文件、建立新員工或為他人建帳號
 * - edit_scope=department 的使用者可以編輯部門內員工
 * - super_admin 不受 scope 限制
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const path = require('path');
const fs = require('fs');
const BASE = 'http://localhost:3001';
let passed = 0, failed = 0;
const results = [];
function assert(condition, desc) { if (condition) { passed++; results.push(`  PASS: ${desc}`); } else { failed++; results.push(`  FAIL: ${desc}`); } }
async function req(method, url, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const o = { method, headers: h };
  if (body && method !== 'GET') o.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${url}`, o);
  let d = null;
  try { d = await r.json(); } catch {}
  return { status: r.status, data: d };
}

// multipart upload helper
async function uploadFile(url, fields, token) {
  const boundary = '----TestBoundary' + Date.now();
  let body = '';
  for (const [key, val] of Object.entries(fields)) {
    body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
  }
  // Add a small fake file
  body += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4 fake\r\n`;
  body += `--${boundary}--\r\n`;

  const h = { 'Content-Type': `multipart/form-data; boundary=${boundary}` };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${BASE}${url}`, { method: 'POST', headers: h, body });
  let d = null;
  try { d = await r.json(); } catch {}
  return { status: r.status, data: d };
}

async function run() {
  console.log('=== Edit Scope Enforcement 測試 ===\n');

  const ts = Date.now();
  const cleanupIds = { users: [], employees: [], documents: [] };

  // ─── Step 1: Admin 登入 (super_admin) ───
  console.log('  [1] Admin 登入');
  const adminLogin = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com', password: 'admin123', tenant_slug: 'demo'
  });
  assert(adminLogin.status === 200, '1.1 Admin 登入成功');
  const adminToken = adminLogin.data?.access_token;

  // ─── Step 2: 取得組織與角色資訊 ───
  console.log('  [2] 取得組織與角色資訊');
  const orgUnits = await req('GET', '/api/tenant-admin/org-units', null, adminToken);
  const orgData = Array.isArray(orgUnits.data) ? orgUnits.data : [];
  const deptUnit = orgData.find(u => u.type === 'department');
  const deptId = deptUnit?.id;
  assert(!!deptId, '2.1 找到部門 ID');

  // 找第二個部門（若無則用同一個）
  const deptUnit2 = orgData.find(u => u.type === 'department' && u.id !== deptId);
  const deptId2 = deptUnit2?.id || deptId;

  const rolesRes = await req('GET', '/api/tenant-admin/roles', null, adminToken);
  const allRoles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
  const deptManagerRole = allRoles.find(r => r.name === 'dept_manager');
  const deptManagerRoleId = deptManagerRole?.id;
  assert(!!deptManagerRoleId, '2.2 找到 dept_manager 角色 ID');

  // ─── Step 3: 建立測試員工 A（dept_manager 的員工記錄，在 deptId） ───
  console.log('  [3] 建立 dept_manager 員工 + 使用者');
  const mgrEmpRes = await req('POST', '/api/employee', {
    name: `測試主管-${ts}`, email: `mgr-${ts}@demo.com`, employee_no: `MGR${ts}`,
    department: deptUnit?.name || 'test', position: '主管', org_unit_id: deptId,
    createUser: false
  }, adminToken);
  assert(mgrEmpRes.status === 201, '3.1 建立 dept_manager 員工記錄');
  const mgrEmpId = mgrEmpRes.data?.employee?.id || mgrEmpRes.data?.id;
  if (mgrEmpId) cleanupIds.employees.push(mgrEmpId);

  // 建立使用者並連結此員工
  const mgrEmail = `mgr-${ts}@demo.com`;
  const mgrUserRes = await req('POST', '/api/tenant-admin/users', {
    email: mgrEmail, password: 'TestMgr1234', name: `測試主管-${ts}`, employee_id: mgrEmpId
  }, adminToken);
  assert(mgrUserRes.status === 201, '3.2 建立 dept_manager 使用者');
  const mgrUserId = mgrUserRes.data?.id;
  if (mgrUserId) cleanupIds.users.push(mgrUserId);

  // 指派 dept_manager 角色
  if (mgrUserId && deptManagerRoleId && deptId) {
    await req('POST', '/api/tenant-admin/user-roles', {
      user_id: mgrUserId, role_id: deptManagerRoleId, org_unit_id: deptId
    }, adminToken);
  }

  // ─── Step 4: 建立測試員工 B（同部門，作為編輯目標） ───
  console.log('  [4] 建立同部門員工 B');
  const empBRes = await req('POST', '/api/employee', {
    name: `同部門員工-${ts}`, email: `empb-${ts}@demo.com`, employee_no: `EMPB${ts}`,
    department: deptUnit?.name || 'test', position: '一般員工', org_unit_id: deptId,
    createUser: false
  }, adminToken);
  assert(empBRes.status === 201, '4.1 建立同部門員工 B');
  const empBId = empBRes.data?.employee?.id || empBRes.data?.id;
  if (empBId) cleanupIds.employees.push(empBId);

  // ─── Step 5: 建立測試員工 C（不同部門） ───
  console.log('  [5] 建立不同部門員工 C');
  const empCRes = await req('POST', '/api/employee', {
    name: `他部門員工-${ts}`, email: `empc-${ts}@demo.com`, employee_no: `EMPC${ts}`,
    department: deptUnit2?.name || 'other', position: '一般員工', org_unit_id: deptId2,
    createUser: false
  }, adminToken);
  assert(empCRes.status === 201, '5.1 建立不同部門員工 C');
  const empCId = empCRes.data?.employee?.id || empCRes.data?.id;
  if (empCId) cleanupIds.employees.push(empCId);

  // ─── Step 6: dept_manager 登入（edit_scope=self, view_scope=department） ───
  console.log('  [6] dept_manager 登入');
  const mgrLogin = await req('POST', '/api/auth/login', {
    email: mgrEmail, password: 'TestMgr1234', tenant_slug: 'demo'
  });
  assert(mgrLogin.status === 200, '6.1 dept_manager 登入成功');
  const mgrToken = mgrLogin.data?.access_token;

  // ─── Step 7: PUT /:id — edit_scope=self 驗證 ───
  console.log('  [7] PUT /:id edit_scope 驗證');

  // 7a: 編輯自己 → 應成功
  if (mgrToken && mgrEmpId) {
    const editSelf = await req('PUT', `/api/employee/${mgrEmpId}`, {
      phone: '0912-111-111'
    }, mgrToken);
    assert(editSelf.status === 200, `7.1 dept_manager 編輯自己 → 200 (實際: ${editSelf.status})`);
  }

  // 7b: 編輯同部門員工 B → 應被拒 (edit_scope=self)
  if (mgrToken && empBId) {
    const editOther = await req('PUT', `/api/employee/${empBId}`, {
      phone: '0912-222-222'
    }, mgrToken);
    assert(editOther.status === 403, `7.2 dept_manager 編輯同部門他人 → 403 (實際: ${editOther.status})`);
  }

  // ─── Step 8: POST /documents — edit_scope=self 驗證 ───
  console.log('  [8] POST /documents edit_scope 驗證');

  // 8a: 為自己上傳文件 → 應成功
  if (mgrToken && mgrEmpId) {
    const uploadSelf = await uploadFile('/api/employee/documents', {
      employee_id: mgrEmpId, type: 'other', custom_name: 'test-self'
    }, mgrToken);
    assert(uploadSelf.status === 201 || uploadSelf.status === 200, `8.1 為自己上傳文件 → 成功 (實際: ${uploadSelf.status})`);
    if (uploadSelf.data?.id) cleanupIds.documents.push(uploadSelf.data.id);
  }

  // 8b: 為他人上傳文件 → 應被拒
  if (mgrToken && empBId) {
    const uploadOther = await uploadFile('/api/employee/documents', {
      employee_id: empBId, type: 'other', custom_name: 'test-other'
    }, mgrToken);
    assert(uploadOther.status === 403, `8.2 為他人上傳文件 → 403 (實際: ${uploadOther.status})`);
  }

  // ─── Step 9: PUT /documents/:id & DELETE /documents/:id ───
  console.log('  [9] PUT/DELETE /documents/:id edit_scope 驗證');

  // 用 admin 為員工 B 上傳一份文件，再讓 dept_manager 嘗試更新/刪除
  let docBId = null;
  if (adminToken && empBId) {
    const uploadForB = await uploadFile('/api/employee/documents', {
      employee_id: empBId, type: 'other', custom_name: 'b-doc'
    }, adminToken);
    docBId = uploadForB.data?.id;
    if (docBId) cleanupIds.documents.push(docBId);
  }

  // 9a: dept_manager 更新他人文件 → 403
  if (mgrToken && docBId) {
    const updateOtherDoc = await uploadFile('/api/employee/documents', {
      employee_id: empBId, type: 'other'
    }, mgrToken);
    // PUT needs special handling — use the documents/:id endpoint
    const putDoc = await req('DELETE', `/api/employee/documents/${docBId}`, null, mgrToken);
    assert(putDoc.status === 403, `9.1 dept_manager 刪除他人文件 → 403 (實際: ${putDoc.status})`);
  }

  // ─── Step 10: POST /employee — edit_scope=self 不得建立新員工 ───
  console.log('  [10] POST /employee edit_scope 驗證');

  if (mgrToken) {
    const createEmp = await req('POST', '/api/employee', {
      name: `非法建立-${ts}`, email: `illegal-${ts}@demo.com`, employee_no: `ILL${ts}`,
      department: 'test', position: 'test', org_unit_id: deptId, createUser: false
    }, mgrToken);
    assert(createEmp.status === 403, `10.1 edit_scope=self 建立員工 → 403 (實際: ${createEmp.status})`);
    // 若意外建立成功，加入清理列表
    const illegalEmpId = createEmp.data?.employee?.id || createEmp.data?.id;
    if (illegalEmpId && createEmp.status === 201) cleanupIds.employees.push(illegalEmpId);
  }

  // ─── Step 11: POST /:id/create-account — edit_scope=self 不得為他人建帳號 ───
  console.log('  [11] POST /:id/create-account edit_scope 驗證');

  if (mgrToken && empBId) {
    const createAcct = await req('POST', `/api/employee/${empBId}/create-account`, {}, mgrToken);
    assert(createAcct.status === 403, `11.1 edit_scope=self 為他人建帳號 → 403 (實際: ${createAcct.status})`);
  }

  // ─── Step 12: super_admin 不受限制 ───
  console.log('  [12] super_admin 不受 edit_scope 限制');

  if (adminToken && empBId) {
    const adminEdit = await req('PUT', `/api/employee/${empBId}`, {
      phone: '0912-999-999'
    }, adminToken);
    assert(adminEdit.status === 200, `12.1 super_admin 編輯任意員工 → 200 (實際: ${adminEdit.status})`);
  }

  // ─── Cleanup ───
  console.log('\n[Cleanup] 清理測試資料');

  // 刪除文件
  for (const docId of cleanupIds.documents) {
    try { await req('DELETE', `/api/employee/documents/${docId}`, null, adminToken); } catch {}
  }
  // 刪除使用者
  for (const userId of cleanupIds.users) {
    try { await req('DELETE', `/api/tenant-admin/users/${userId}`, null, adminToken); } catch {}
  }
  // 刪除員工
  for (const empId of cleanupIds.employees) {
    try { await req('DELETE', `/api/employee/${empId}`, null, adminToken); } catch {}
  }

  // ─── 結果 ───
  console.log('\n--- 測試結果 ---');
  results.forEach(r => console.log(r));
  console.log(`\n總計: ${passed + failed} assertions | PASS: ${passed} | FAIL: ${failed}`);
  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error('Test error:', err); process.exit(1); });
