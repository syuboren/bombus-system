/**
 * 11.4 權限繼承測試
 *
 * 驗證 global / subsidiary / department 範圍角色的權限控制：
 * - super_admin (global) 擁有完整存取權
 * - employee (department) 只有業務讀取權，無管理權限
 * - dept_manager (department) 有員工管理權限
 *
 * 假設：伺服器在 http://localhost:3001，demo 租戶已初始化
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const BASE = 'http://localhost:3001';
const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'platform@bombus.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'platform123';
let passed = 0, failed = 0;
const results = [];
function assert(condition, desc) { if (condition) { passed++; results.push(`  PASS: ${desc}`); } else { failed++; results.push(`  FAIL: ${desc}`); } }
async function req(method, path, body, token) { const h = { 'Content-Type': 'application/json' }; if (token) h['Authorization'] = `Bearer ${token}`; const o = { method, headers: h }; if (body && method !== 'GET') o.body = JSON.stringify(body); const r = await fetch(`${BASE}${path}`, o); let d = null; try { d = await r.json(); } catch {} return { status: r.status, data: d }; }

async function run() {
  console.log('=== 11.4 權限繼承測試 ===\n');

  const ts = Date.now();
  const cleanupItems = { users: [], roles: [], depts: [] };

  // ─── Step 1: Admin 登入 (super_admin, global scope) ───
  console.log('  [1] Admin 登入 (super_admin)');
  const adminLogin = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  assert(adminLogin.status === 200, '1.1 Admin 登入成功 (200)');
  const adminToken = adminLogin.data?.access_token;

  // ─── Step 2: super_admin 存取角色管理 ───
  console.log('  [2] super_admin 存取角色管理');
  const adminRoles = await req('GET', '/api/tenant-admin/roles', null, adminToken);
  assert(adminRoles.status === 200, '2.1 super_admin 可存取角色管理 (200)');

  // ─── Step 3: super_admin 存取員工列表 ───
  console.log('  [3] super_admin 存取員工列表');
  const adminEmps = await req('GET', '/api/employee/list', null, adminToken);
  assert(adminEmps.status === 200, '3.1 super_admin 可存取員工列表 (200)');

  // ─── 取得組織架構資訊 ───
  const orgUnits = await req('GET', '/api/tenant-admin/org-units', null, adminToken);
  const orgData = Array.isArray(orgUnits.data) ? orgUnits.data : [];
  const deptUnit = orgData.find(u => u.type === 'department');
  const deptId = deptUnit?.id;

  // 取得 employee 角色 ID
  const allRoles = Array.isArray(adminRoles.data) ? adminRoles.data : [];
  const employeeRole = allRoles.find(r => r.name === 'employee');
  const employeeRoleId = employeeRole?.id;

  // 取得 dept_manager 角色 ID
  const deptManagerRole = allRoles.find(r => r.name === 'dept_manager');
  const deptManagerRoleId = deptManagerRole?.id;

  assert(!!employeeRoleId, '3.2 找到 employee 角色 ID');
  assert(!!deptManagerRoleId, '3.3 找到 dept_manager 角色 ID');
  assert(!!deptId, `3.4 找到部門 ID 供角色指派 (orgUnits status: ${orgUnits.status})`);

  // ─── Step 4: 建立 employee 角色使用者 ───
  console.log('  [4] 建立 employee 角色使用者');
  const empEmail = `test-emp-${ts}@demo.com`;
  const createEmpUser = await req('POST', '/api/tenant-admin/users', {
    email: empEmail,
    password: 'TestEmp1234',
    name: '測試員工'
  }, adminToken);
  assert(createEmpUser.status === 201, '4.1 建立 employee 使用者 (201)');
  const empUserId = createEmpUser.data?.id;
  if (empUserId) cleanupItems.users.push(empUserId);

  // 指派 employee 角色（department scope 需要 org_unit_id）
  if (empUserId && employeeRoleId && deptId) {
    const assignEmp = await req('POST', '/api/tenant-admin/user-roles', {
      user_id: empUserId,
      role_id: employeeRoleId,
      org_unit_id: deptId
    }, adminToken);
    assert(assignEmp.status === 201, '4.2 指派 employee 角色 (201)');
  }

  // ─── Step 5: Employee 使用者登入並測試存取 ───
  console.log('  [5] Employee 使用者登入');
  const empLogin = await req('POST', '/api/auth/login', {
    email: empEmail,
    password: 'TestEmp1234',
    tenant_slug: 'demo'
  });
  assert(empLogin.status === 200, '5.1 Employee 使用者登入成功 (200)');
  assert(empLogin.data?.user?.roles?.includes('employee'), '5.2 使用者角色包含 employee');
  const empToken = empLogin.data?.access_token;

  // Employee 可存取員工列表（employee 角色有 employee:read 權限）
  console.log('  [5a] Employee 存取員工列表');
  const empEmpList = await req('GET', '/api/employee/list', null, empToken);
  assert(empEmpList.status === 200, '5.3 Employee 可存取員工列表 (200)');

  // ─── Step 6: Employee 無法存取角色管理 ───
  console.log('  [6] Employee 存取限制');
  const empRolesAccess = await req('GET', '/api/tenant-admin/roles', null, empToken);
  assert(empRolesAccess.status === 403, `6.1 Employee 無法存取角色管理 (403, 實際: ${empRolesAccess.status})`);

  // Employee 無法存取使用者管理
  const empUsersAccess = await req('GET', '/api/tenant-admin/users', null, empToken);
  assert(empUsersAccess.status === 403, `6.2 Employee 無法存取使用者管理 (403, 實際: ${empUsersAccess.status})`);

  // Employee 無法存取組織架構管理
  const empOrgAccess = await req('GET', '/api/tenant-admin/org-units', null, empToken);
  assert(empOrgAccess.status === 403, `6.3 Employee 無法存取組織架構 (403, 實際: ${empOrgAccess.status})`);

  // Employee 無法建立角色
  const empCreateRole = await req('POST', '/api/tenant-admin/roles', {
    name: 'hacker-role',
    scope_type: 'global'
  }, empToken);
  assert(empCreateRole.status === 403, `6.4 Employee 無法建立角色 (403, 實際: ${empCreateRole.status})`);

  // ─── Step 7: 建立 dept_manager 角色使用者 ───
  console.log('  [7] 建立 dept_manager 角色使用者');
  const mgrEmail = `test-mgr-${ts}@demo.com`;
  const createMgrUser = await req('POST', '/api/tenant-admin/users', {
    email: mgrEmail,
    password: 'TestMgr1234',
    name: '測試部門主管'
  }, adminToken);
  assert(createMgrUser.status === 201, '7.1 建立 dept_manager 使用者 (201)');
  const mgrUserId = createMgrUser.data?.id;
  if (mgrUserId) cleanupItems.users.push(mgrUserId);

  // 指派 dept_manager 角色
  if (mgrUserId && deptManagerRoleId && deptId) {
    const assignMgr = await req('POST', '/api/tenant-admin/user-roles', {
      user_id: mgrUserId,
      role_id: deptManagerRoleId,
      org_unit_id: deptId
    }, adminToken);
    assert(assignMgr.status === 201, '7.2 指派 dept_manager 角色 (201)');
  }

  // ─── Step 8: dept_manager 使用者登入並測試存取 ───
  console.log('  [8] dept_manager 使用者登入');
  const mgrLogin = await req('POST', '/api/auth/login', {
    email: mgrEmail,
    password: 'TestMgr1234',
    tenant_slug: 'demo'
  });
  assert(mgrLogin.status === 200, '8.1 dept_manager 使用者登入成功 (200)');
  assert(mgrLogin.data?.user?.roles?.includes('dept_manager'), '8.2 使用者角色包含 dept_manager');
  const mgrToken = mgrLogin.data?.access_token;

  // dept_manager 可存取員工列表
  const mgrEmpList = await req('GET', '/api/employee/list', null, mgrToken);
  assert(mgrEmpList.status === 200, '8.3 dept_manager 可存取員工列表 (200)');

  // dept_manager 不是 super_admin / subsidiary_admin，無法存取 tenant-admin
  const mgrAdminAccess = await req('GET', '/api/tenant-admin/roles', null, mgrToken);
  assert(mgrAdminAccess.status === 403, `8.4 dept_manager 無法存取租戶管理 (403, 實際: ${mgrAdminAccess.status})`);

  // ─── Step 9: 多角色使用者測試 ───
  console.log('  [9] 多角色使用者測試');
  // 為 dept_manager 使用者額外指派 employee 角色（測試多角色聯集）
  if (mgrUserId && employeeRoleId && deptId) {
    const assignMulti = await req('POST', '/api/tenant-admin/user-roles', {
      user_id: mgrUserId,
      role_id: employeeRoleId,
      org_unit_id: deptId
    }, adminToken);
    // 可能成功(201)或因為已有 dept_manager 具備類似權限
    assert(
      assignMulti.status === 201 || assignMulti.status === 409,
      `9.1 指派多角色 (201/409, 實際: ${assignMulti.status})`
    );
  }

  // 重新登入取得新 token（包含多角色）
  const mgrLogin2 = await req('POST', '/api/auth/login', {
    email: mgrEmail,
    password: 'TestMgr1234',
    tenant_slug: 'demo'
  });
  if (mgrLogin2.status === 200) {
    const mgrRoles = mgrLogin2.data?.user?.roles || [];
    assert(mgrRoles.includes('dept_manager'), '9.2 多角色使用者包含 dept_manager');
    // 員工列表仍可存取
    const mgrToken2 = mgrLogin2.data?.access_token;
    const mgrEmpList2 = await req('GET', '/api/employee/list', null, mgrToken2);
    assert(mgrEmpList2.status === 200, '9.3 多角色使用者可存取員工列表 (200)');
  }

  // ─── Cleanup: 刪除測試使用者 ───
  console.log('\n[Cleanup] 清理測試資料');

  // 撤銷角色指派 (先撤銷才能刪除使用者相關的角色綁定)
  if (empUserId && employeeRoleId) {
    await req('DELETE', '/api/tenant-admin/user-roles', {
      user_id: empUserId,
      role_id: employeeRoleId,
      org_unit_id: deptId
    }, adminToken);
  }
  if (mgrUserId && deptManagerRoleId) {
    await req('DELETE', '/api/tenant-admin/user-roles', {
      user_id: mgrUserId,
      role_id: deptManagerRoleId,
      org_unit_id: deptId
    }, adminToken);
  }
  if (mgrUserId && employeeRoleId) {
    await req('DELETE', '/api/tenant-admin/user-roles', {
      user_id: mgrUserId,
      role_id: employeeRoleId,
      org_unit_id: deptId
    }, adminToken);
  }

  // 注意：users 表沒有 DELETE API，所以只撤銷角色即可
  // 使用者留在 DB 中不影響後續測試（email 使用 timestamp 確保唯一）

  console.log('  清理完成（已撤銷角色指派）');

  // ─── 結果摘要 ───
  console.log('\n' + results.join('\n'));
  console.log(`\n=== 結果：${passed}/${passed + failed} passed ===`);

  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error('測試執行錯誤:', err.message); process.exit(1); });
