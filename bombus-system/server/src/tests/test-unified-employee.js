/**
 * 統一員工管理 — 後端 TDD 整合測試
 *
 * 涵蓋：
 *   Group 1: 資料庫 Schema 變更（employees 新欄位 + import_jobs/import_results 表）
 *   Group 4: 統一帳號建立服務（createEmployeeWithAccount, resetUserPassword, linkUserToEmployee）
 *   Group 3: 統一 Employee API（GET list, GET detail, POST, PUT）
 *   Group 5: 批次匯入（validate, execute, status, report）
 *
 * 使用方式：
 *   cd bombus-system/server && node src/tests/test-unified-employee.js
 *
 * 前置：伺服器需在 http://localhost:3001 運行（Group 3, 5 API 測試用）
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const BASE = 'http://localhost:3001';
const PLATFORM_EMAIL = process.env.PLATFORM_ADMIN_EMAIL || 'platform@bombus.com';
const PLATFORM_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'platform123';

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

// ═══════════════════════════════════════════════════════════════
// Group 1: 資料庫 Schema 變更（直接 DB 測試，不需啟動 server）
// ═══════════════════════════════════════════════════════════════

async function testGroup1_Schema() {
  console.log('\n[Group 1] 資料庫 Schema 變更\n');

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const rawDb = new SQL.Database();
  const { SqliteAdapter } = require('../db/db-adapter');
  const adapter = new SqliteAdapter(rawDb, null);
  const { initTenantSchema } = require('../db/tenant-schema');

  // 執行完整 Schema 初始化
  initTenantSchema(adapter);

  // ── 1.1 employees 表新增欄位 ──
  console.log('  [1.1] Employees 表新增欄位');

  const employeeCols = rawDb.exec("PRAGMA table_info(employees)");
  const colNames = employeeCols[0].values.map(row => row[1]);

  const newEmployeeCols = [
    'english_name', 'mobile', 'gender', 'birth_date', 'address',
    'emergency_contact_name', 'emergency_contact_relation',
    'emergency_contact_phone', 'import_job_id'
  ];
  for (const col of newEmployeeCols) {
    assert(colNames.includes(col), `1.1 employees 表包含 ${col} 欄位`);
  }

  // 驗證 gender 預設值
  const genderCol = employeeCols[0].values.find(row => row[1] === 'gender');
  if (genderCol) {
    assert(genderCol[4] === "'other'", '1.1 gender 欄位預設值為 other');
  }

  // 驗證 import_job_id 可以 INSERT
  try {
    rawDb.run("INSERT INTO employees (id, name, email, import_job_id) VALUES ('test-imp', 'Test', 'test@imp.com', 'job-123')");
    const result = rawDb.exec("SELECT import_job_id FROM employees WHERE id = 'test-imp'");
    assert(result[0].values[0][0] === 'job-123', '1.1 import_job_id 可正確寫入和讀取');
    rawDb.run("DELETE FROM employees WHERE id = 'test-imp'");
  } catch (e) {
    assert(false, `1.1 import_job_id 可正確寫入和讀取 (${e.message})`);
  }

  // ── 1.2 import_jobs 表 ──
  console.log('  [1.2] Import 表結構');

  const importJobsCols = rawDb.exec("PRAGMA table_info(import_jobs)");
  assert(importJobsCols.length > 0, '1.2 import_jobs 表存在');

  if (importJobsCols.length > 0) {
    const jobColNames = importJobsCols[0].values.map(row => row[1]);
    const expectedJobCols = [
      'id', 'status', 'total_rows', 'processed_rows', 'success_count',
      'error_count', 'file_name', 'created_by', 'created_at', 'completed_at'
    ];
    for (const col of expectedJobCols) {
      assert(jobColNames.includes(col), `1.2 import_jobs 表包含 ${col} 欄位`);
    }

    // 驗證預設值
    const statusCol = importJobsCols[0].values.find(row => row[1] === 'status');
    assert(statusCol && statusCol[4] === "'pending'", '1.2 import_jobs.status 預設值為 pending');

    const processedCol = importJobsCols[0].values.find(row => row[1] === 'processed_rows');
    assert(processedCol && String(processedCol[4]) === '0', '1.2 import_jobs.processed_rows 預設值為 0');
  }

  // import_results 表
  const importResultsCols = rawDb.exec("PRAGMA table_info(import_results)");
  assert(importResultsCols.length > 0, '1.2 import_results 表存在');

  if (importResultsCols.length > 0) {
    const resultColNames = importResultsCols[0].values.map(row => row[1]);
    const expectedResultCols = [
      'id', 'job_id', 'row_number', 'status', 'employee_id',
      'user_id', 'initial_password', 'error_message', 'created_at'
    ];
    for (const col of expectedResultCols) {
      assert(resultColNames.includes(col), `1.2 import_results 表包含 ${col} 欄位`);
    }
  }

  // ── 1.2b _runMigrations 也包含相同遷移 ──
  console.log('  [1.2b] _runMigrations 遷移同步');

  // 建立一個「舊版」DB（只有基礎 schema 但無新欄位/表），模擬既有租戶
  const rawDb2 = new SQL.Database();
  const adapter2 = new SqliteAdapter(rawDb2, null);

  // 只建立基礎表（模擬舊版——不含統一員工管理新遷移）
  const { BUSINESS_TABLES_SQL, RBAC_TABLES_SQL, FEATURE_TABLES_SQL,
    USER_MIGRATIONS, seedFeatureData } = require('../db/tenant-schema');
  rawDb2.exec(BUSINESS_TABLES_SQL);
  rawDb2.exec(RBAC_TABLES_SQL);
  rawDb2.exec(FEATURE_TABLES_SQL);
  seedFeatureData(rawDb2);
  // 舊版 employee 遷移（只有前 7 筆，不含新增的 9 個欄位）
  const OLD_EMPLOYEE_MIGRATIONS = [
    'ALTER TABLE employees ADD COLUMN job_title TEXT',
    'ALTER TABLE employees ADD COLUMN candidate_id TEXT',
    'ALTER TABLE employees ADD COLUMN probation_end_date TEXT',
    'ALTER TABLE employees ADD COLUMN probation_months INTEGER',
    'ALTER TABLE employees ADD COLUMN onboarding_status TEXT',
    'ALTER TABLE employees ADD COLUMN converted_at TEXT',
    'ALTER TABLE employees ADD COLUMN org_unit_id TEXT REFERENCES org_units(id)'
  ];
  for (const sql of OLD_EMPLOYEE_MIGRATIONS) {
    try { rawDb2.run(sql); } catch (e) { /* 忽略 */ }
  }
  for (const sql of USER_MIGRATIONS) {
    try { rawDb2.run(sql); } catch (e) { /* 忽略 */ }
  }
  adapter2.save();

  // 驗證新欄位「不存在」（模擬舊版狀態）
  const oldCols = rawDb2.exec("PRAGMA table_info(employees)");
  const oldColNames = oldCols[0].values.map(row => row[1]);
  assert(!oldColNames.includes('english_name'), '1.2b 舊版 DB 無 english_name（確認前置條件）');

  // 執行 _runMigrations
  const { TenantDBManager } = require('../db/tenant-db-manager');
  const manager = new TenantDBManager();
  manager._runMigrations(rawDb2, adapter2);

  // 驗證新欄位「已存在」
  const migratedCols = rawDb2.exec("PRAGMA table_info(employees)");
  const migratedColNames = migratedCols[0].values.map(row => row[1]);
  assert(migratedColNames.includes('english_name'), '1.2b _runMigrations 補上 english_name 欄位');
  assert(migratedColNames.includes('import_job_id'), '1.2b _runMigrations 補上 import_job_id 欄位');

  // 驗證 import_jobs 表也被建立
  const migratedImportJobs = rawDb2.exec("PRAGMA table_info(import_jobs)");
  assert(migratedImportJobs.length > 0, '1.2b _runMigrations 建立 import_jobs 表');

  const migratedImportResults = rawDb2.exec("PRAGMA table_info(import_results)");
  assert(migratedImportResults.length > 0, '1.2b _runMigrations 建立 import_results 表');

  // 清理
  rawDb.close();
  rawDb2.close();
}

// ═══════════════════════════════════════════════════════════════
// Group 4: 統一帳號建立服務（直接 DB 測試）
// ═══════════════════════════════════════════════════════════════

async function testGroup4_AccountCreation() {
  console.log('\n[Group 4] 統一帳號建立服務\n');

  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const rawDb = new SQL.Database();
  const { SqliteAdapter } = require('../db/db-adapter');
  const adapter = new SqliteAdapter(rawDb, null);
  const { initTenantSchema } = require('../db/tenant-schema');
  initTenantSchema(adapter);

  // 需要先有 roles 表中的 employee 角色
  rawDb.run("INSERT INTO roles (id, name, description, scope_type, is_system) VALUES ('role-emp', 'employee', '員工', 'global', 1)");

  // 建立組織單位
  rawDb.run("INSERT INTO org_units (id, name, type) VALUES ('org-root', 'Demo集團', 'group')");
  rawDb.run("INSERT INTO org_units (id, name, type, parent_id) VALUES ('org-sub', 'A子公司', 'subsidiary', 'org-root')");

  const {
    createEmployeeWithAccount,
    resetUserPassword,
    linkUserToEmployee
  } = require('../services/account-creation');

  // ── 4.1a createEmployeeWithAccount — 建立員工 + 帳號 ──
  console.log('  [4.1a] createEmployeeWithAccount — 建立員工 + 帳號');

  const result1 = await createEmployeeWithAccount(adapter, {
    employeeData: {
      name: '張三',
      email: 'zhangsan@test.com',
      employee_no: 'E2026001',
      department: '研發部',
      position: '工程師',
      level: '3',
      grade: 'P3',
      hire_date: '2026-01-01',
      org_unit_id: 'org-sub'
    },
    createUser: true,
    defaultRole: 'employee',
    orgUnitId: 'org-sub'
  });

  assert(result1.employee && result1.employee.id, '4.1a 回傳 employee 物件含 id');
  assert(result1.user && result1.user.id, '4.1a 回傳 user 物件含 id');
  assert(typeof result1.initialPassword === 'string' && result1.initialPassword.length >= 16,
    '4.1a 回傳 initialPassword（至少 16 字元）');

  // 驗證 DB
  const empRow = adapter.queryOne('SELECT * FROM employees WHERE email = ?', ['zhangsan@test.com']);
  assert(empRow && empRow.name === '張三', '4.1a DB 中員工記錄存在');

  const userRow = adapter.queryOne('SELECT * FROM users WHERE email = ?', ['zhangsan@test.com']);
  assert(userRow && userRow.employee_id === result1.employee.id, '4.1a DB 中 User 記錄關聯 employee_id');
  assert(userRow && userRow.must_change_password === 1, '4.1a must_change_password = 1');

  // 驗證角色指派
  const roleAssignment = adapter.queryOne(
    'SELECT * FROM user_roles WHERE user_id = ?',
    [result1.user.id]
  );
  assert(roleAssignment && roleAssignment.role_id === 'role-emp', '4.1a 預設 employee 角色已指派');
  assert(roleAssignment && roleAssignment.org_unit_id === 'org-sub', '4.1a 角色 org_unit_id 正確');

  // ── 4.1b createEmployeeWithAccount — 不建帳號 ──
  console.log('  [4.1b] createEmployeeWithAccount — 不建帳號');

  const result2 = await createEmployeeWithAccount(adapter, {
    employeeData: {
      name: '李四',
      email: 'lisi@test.com',
      employee_no: 'E2026002',
      department: '行政部',
      position: '行政專員',
      level: '2',
      grade: 'P2',
      hire_date: '2026-02-01',
      org_unit_id: 'org-sub'
    },
    createUser: false
  });

  assert(result2.employee && result2.employee.id, '4.1b 回傳 employee 物件含 id');
  assert(result2.user === null, '4.1b user 為 null');
  assert(result2.initialPassword === null, '4.1b initialPassword 為 null');

  // ── 4.1c createEmployeeWithAccount — Email 已存在於 employees ──
  console.log('  [4.1c] createEmployeeWithAccount — Employee Email 重複');

  try {
    await createEmployeeWithAccount(adapter, {
      employeeData: {
        name: '王五',
        email: 'zhangsan@test.com', // 與張三同 email
        employee_no: 'E2026003',
        department: '研發部',
        position: '資深工程師',
        level: '4',
        grade: 'P4',
        hire_date: '2026-03-01',
        org_unit_id: 'org-sub'
      },
      createUser: true
    });
    assert(false, '4.1c 應拋出 Email 重複錯誤');
  } catch (e) {
    assert(e.message.includes('email') || e.message.includes('Email'),
      '4.1c 拋出 Email 重複錯誤');
  }

  // ── 4.1d createEmployeeWithAccount — 工號已存在 ──
  console.log('  [4.1d] createEmployeeWithAccount — 工號重複');

  try {
    await createEmployeeWithAccount(adapter, {
      employeeData: {
        name: '趙六',
        email: 'zhaoliu@test.com',
        employee_no: 'E2026001', // 與張三同工號
        department: '研發部',
        position: '資深工程師',
        level: '4',
        grade: 'P4',
        hire_date: '2026-03-01',
        org_unit_id: 'org-sub'
      },
      createUser: true
    });
    assert(false, '4.1d 應拋出工號重複錯誤');
  } catch (e) {
    assert(e.message.includes('employee_no') || e.message.includes('工號'),
      '4.1d 拋出工號重複錯誤');
  }

  // ── 4.1e createEmployeeWithAccount — email 通知模式（未實作） ──
  console.log('  [4.1e] createEmployeeWithAccount — notifyMethod=email 拋錯');

  try {
    await createEmployeeWithAccount(adapter, {
      employeeData: {
        name: '陳七',
        email: 'chenqi@test.com',
        employee_no: 'E2026007',
        department: '研發部',
        position: '工程師',
        level: '3',
        grade: 'P3',
        hire_date: '2026-03-01',
        org_unit_id: 'org-sub'
      },
      createUser: true,
      notifyMethod: 'email'
    });
    assert(false, '4.1e 應拋出未實作錯誤');
  } catch (e) {
    assert(e.message.includes('not yet implemented') || e.message.includes('未實作'),
      '4.1e 拋出 email 通知未實作錯誤');
  }

  // ── 4.1f createEmployeeWithAccount — Email 存在於 users 但非 employees（孤立帳號連結） ──
  console.log('  [4.1f] createEmployeeWithAccount — Email 已存在於 users 表（連結既有帳號）');

  // 預先建立一個孤立 user（無 employee_id）
  const bcryptPre = require('bcryptjs');
  const preHash = await bcryptPre.hash('temp123', 10);
  rawDb.run(
    "INSERT INTO users (id, email, password_hash, name, status) VALUES ('user-pre-exist', 'pre-exist@test.com', ?, 'Pre User', 'active')",
    [preHash]
  );

  const result3 = await createEmployeeWithAccount(adapter, {
    employeeData: {
      name: '錢八',
      email: 'pre-exist@test.com', // 此 email 已在 users 表
      employee_no: 'E2026008',
      department: '研發部',
      position: '工程師',
      level: '3',
      grade: 'P3',
      hire_date: '2026-03-01',
      org_unit_id: 'org-sub'
    },
    createUser: true
  });
  assert(result3.employee && result3.employee.id, '4.1f 員工仍成功建立');
  assert(result3.alreadyExisted === true, '4.1f alreadyExisted = true');
  assert(result3.initialPassword === null, '4.1f 不產生新密碼');

  // ── 4.2a resetUserPassword ──
  console.log('  [4.2a] resetUserPassword');

  const resetResult = await resetUserPassword(adapter, result1.user.id);
  assert(resetResult.userId === result1.user.id, '4.2a 回傳正確 userId');
  assert(typeof resetResult.newPassword === 'string' && resetResult.newPassword.length >= 16,
    '4.2a 回傳新密碼（至少 16 字元）');

  // 驗證 DB 密碼已更新
  const updatedUser = adapter.queryOne('SELECT * FROM users WHERE id = ?', [result1.user.id]);
  assert(updatedUser.must_change_password === 1, '4.2a must_change_password = 1');
  assert(updatedUser.password_hash !== userRow.password_hash, '4.2a password_hash 已變更');

  // ── 4.2b resetUserPassword — 不存在的 userId ──
  console.log('  [4.2b] resetUserPassword — 不存在的 userId');

  try {
    await resetUserPassword(adapter, 'non-existent-id');
    assert(false, '4.2b 應拋出錯誤');
  } catch (e) {
    assert(e.message.includes('not found') || e.message.includes('不存在'),
      '4.2b 拋出帳號不存在錯誤');
  }

  // ── 4.3a linkUserToEmployee — 連結既有使用者到既有員工 ──
  console.log('  [4.3a] linkUserToEmployee — 連結既有帳號到既有員工');

  // 建立一個沒有 employee_id 的孤立 User
  const bcrypt = require('bcryptjs');
  const orphanHash = await bcrypt.hash('temp123', 10);
  rawDb.run(
    "INSERT INTO users (id, email, password_hash, name, status) VALUES ('user-orphan', 'orphan@test.com', ?, 'Orphan User', 'active')",
    [orphanHash]
  );

  const linkResult = await linkUserToEmployee(adapter, 'user-orphan', result2.employee.id);
  assert(linkResult.userId === 'user-orphan', '4.3a 回傳正確 userId');
  assert(linkResult.employeeId === result2.employee.id, '4.3a 回傳正確 employeeId');
  assert(linkResult.linked === true, '4.3a linked = true');

  // 驗證 DB
  const linkedUser = adapter.queryOne('SELECT employee_id FROM users WHERE id = ?', ['user-orphan']);
  assert(linkedUser.employee_id === result2.employee.id, '4.3a DB 中 employee_id 已更新');

  // ── 4.3b linkUserToEmployee — 為使用者建立新員工 ──
  console.log('  [4.3b] linkUserToEmployee — 為使用者建立新員工');

  rawDb.run(
    "INSERT INTO users (id, email, password_hash, name, status) VALUES ('user-orphan2', 'orphan2@test.com', ?, 'Orphan 2', 'active')",
    [orphanHash]
  );

  const linkResult2 = await linkUserToEmployee(adapter, 'user-orphan2', null, {
    name: 'Orphan 2',
    email: 'orphan2@test.com',
    employee_no: 'E2026099',
    department: '總管處',
    position: '總務',
    level: '1',
    grade: 'P1',
    hire_date: '2026-03-01',
    org_unit_id: 'org-sub'
  });
  assert(linkResult2.userId === 'user-orphan2', '4.3b 回傳正確 userId');
  assert(linkResult2.employeeId, '4.3b 回傳新建 employeeId');
  assert(linkResult2.created === true, '4.3b created = true');

  // ── 4.3c linkUserToEmployee — 已連結的帳號拋錯 ──
  console.log('  [4.3c] linkUserToEmployee — 已連結的帳號拋錯');

  try {
    await linkUserToEmployee(adapter, 'user-orphan', 'some-emp-id');
    assert(false, '4.3c 應拋出錯誤');
  } catch (e) {
    assert(e.message.includes('already linked') || e.message.includes('已連結'),
      '4.3c 拋出已連結錯誤');
  }

  rawDb.close();
}

// ═══════════════════════════════════════════════════════════════
// Group 3: 統一後端 Employee API（需啟動 server）
// ═══════════════════════════════════════════════════════════════

async function testGroup3_EmployeeAPI() {
  console.log('\n[Group 3] 統一後端 Employee API\n');

  // 登入取得 Token
  const login = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  if (login.status !== 200) {
    console.log('  ⚠️ 無法登入，跳過 Group 3 API 測試');
    return;
  }
  const token = login.data.access_token;

  // ── 3.1 GET /api/employee/list 回傳 positions + userId ──
  console.log('  [3.1] GET /api/employee/list 回傳 positions + userId');

  const listRes = await req('GET', '/api/employee/list?all=true', null, token);
  assert(listRes.status === 200, '3.1 員工列表回傳 200');
  assert(Array.isArray(listRes.data), '3.1 回傳陣列');

  if (Array.isArray(listRes.data) && listRes.data.length > 0) {
    const emp = listRes.data[0];
    assert(Array.isArray(emp.positions), '3.1 每筆員工含 positions 陣列');
    assert('userId' in emp, '3.1 每筆員工含 userId 欄位');
    assert('userStatus' in emp, '3.1 每筆員工含 userStatus 欄位');

    if (emp.positions && emp.positions.length > 0) {
      const pos = emp.positions[0];
      assert('companyName' in pos, '3.1 position 包含 companyName');
      assert('departmentName' in pos, '3.1 position 包含 departmentName');
      assert('isPrimary' in pos, '3.1 position 包含 isPrimary');
    }
  }

  // ── 3.2 GET /api/employee/:id 回傳完整歷程 ──
  console.log('  [3.2] GET /api/employee/:id 回傳完整歷程');

  if (Array.isArray(listRes.data) && listRes.data.length > 0) {
    const empId = listRes.data[0].id;
    const detailRes = await req('GET', `/api/employee/${empId}`, null, token);
    assert(detailRes.status === 200, '3.2 員工詳情回傳 200');

    if (detailRes.status === 200) {
      const detail = detailRes.data;
      assert('workHistory' in detail, '3.2 回傳 workHistory');
      assert('documents' in detail, '3.2 回傳 documents');
      assert('training' in detail, '3.2 回傳 training');
      assert('performance' in detail, '3.2 回傳 performance');
      assert('roi' in detail, '3.2 回傳 roi');
      assert('userRoles' in detail, '3.2 回傳 userRoles');
      assert(Array.isArray(detail.positions), '3.2 回傳 positions 陣列');
    }
  }

  // ── 3.3 POST /api/employee — 新增員工 + 自動建帳號 ──
  console.log('  [3.3] POST /api/employee — 新增員工');

  // 先取得 org_unit 資訊
  const orgRes = await req('GET', '/api/tenant-admin/org-units', null, token);
  const orgUnits = orgRes.data || [];
  const subsidiary = orgUnits.find(o => o.type === 'subsidiary') || orgUnits[0];
  const orgUnitId = subsidiary ? subsidiary.id : null;

  const createRes = await req('POST', '/api/employee', {
    name: 'TDD 測試員工',
    email: `tdd-test-${Date.now()}@test.com`,
    employee_no: `TDD${Date.now()}`,
    department: '測試部',
    position: '測試工程師',
    level: '3',
    grade: 'P3',
    hire_date: '2026-03-01',
    org_unit_id: orgUnitId,
    english_name: 'TDD Tester',
    mobile: '0912345678',
    gender: 'other'
  }, token);

  assert(createRes.status === 201 || createRes.status === 200, '3.3 新增員工回傳 200/201');

  if (createRes.status === 201 || createRes.status === 200) {
    assert(createRes.data.employee && createRes.data.employee.id, '3.3 回傳 employee 物件');
    assert(createRes.data.user && createRes.data.user.id, '3.3 回傳 user 物件（自動建帳號）');
    assert(typeof createRes.data.initialPassword === 'string', '3.3 回傳 initialPassword');

    // 清理：記錄 ID 用於後續測試
    var createdEmployeeId = createRes.data.employee.id;
  }

  // ── 3.4 PUT /api/employee/:id — 更新員工基本資料 ──
  console.log('  [3.4] PUT /api/employee/:id — 更新員工');

  if (createdEmployeeId) {
    const updateRes = await req('PUT', `/api/employee/${createdEmployeeId}`, {
      name: 'TDD 更新員工',
      english_name: 'TDD Updated'
    }, token);
    assert(updateRes.status === 200, '3.4 更新員工回傳 200');
    assert(updateRes.data && updateRes.data.name === 'TDD 更新員工', '3.4 名稱更新成功');
  }
}

// ═══════════════════════════════════════════════════════════════
// Group 4 API: 密碼重設端點
// ═══════════════════════════════════════════════════════════════

async function testGroup4_API() {
  console.log('\n[Group 4 API] 密碼重設端點\n');

  const login = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  if (login.status !== 200) {
    console.log('  ⚠️ 無法登入，跳過 Group 4 API 測試');
    return;
  }
  const token = login.data.access_token;

  // 取得一個 user ID（例如當前登入的 admin）
  const usersRes = await req('GET', '/api/tenant-admin/users', null, token);
  const users = usersRes.data?.data || [];
  if (users.length < 2) {
    console.log('  ⚠️ 使用者數不足，跳過密碼重設測試');
    return;
  }

  // 找一個非 admin 的使用者來重設密碼
  const targetUser = users.find(u => u.email !== 'admin@demo.com') || users[1];

  // ── 4.4 POST /api/tenant-admin/users/:id/reset-password ──
  console.log('  [4.4] POST /api/tenant-admin/users/:id/reset-password');

  const resetRes = await req('POST', `/api/tenant-admin/users/${targetUser.id}/reset-password`, {}, token);
  assert(resetRes.status === 200, '4.4 密碼重設回傳 200');
  assert(typeof resetRes.data?.newPassword === 'string', '4.4 回傳 newPassword');
  assert(resetRes.data?.newPassword?.length >= 16, '4.4 newPassword 至少 16 字元');
}

// ═══════════════════════════════════════════════════════════════
// Group 5: 批次匯入（需啟動 server）
// ═══════════════════════════════════════════════════════════════

async function testGroup5_BatchImport() {
  console.log('\n[Group 5] 批次匯入\n');

  const login = await req('POST', '/api/auth/login', {
    email: 'admin@demo.com',
    password: 'admin123',
    tenant_slug: 'demo'
  });
  if (login.status !== 200) {
    console.log('  ⚠️ 無法登入，跳過 Group 5 測試');
    return;
  }
  const token = login.data.access_token;

  // 取得組織架構
  const orgRes = await req('GET', '/api/tenant-admin/org-units', null, token);
  const orgUnits = orgRes.data || [];
  const subsidiary = orgUnits.find(o => o.type === 'subsidiary');
  const subName = subsidiary ? subsidiary.name : 'A子公司';

  // ── 5.1 POST /api/employee/batch-import/validate ──
  console.log('  [5.1] CSV 驗證 — 正確資料');

  const validCsvRows = [
    {
      name: '匯入員工A',
      email: `import-a-${Date.now()}@test.com`,
      employee_no: `IMP-A-${Date.now()}`,
      subsidiary: subName,
      department: '研發部',
      hire_date: '2026-04-01',
      level: '3',
      grade: 'P3',
      position: '工程師'
    },
    {
      name: '匯入員工B',
      email: `import-b-${Date.now()}@test.com`,
      employee_no: `IMP-B-${Date.now()}`,
      subsidiary: subName,
      department: '行政部',
      hire_date: '2026-04-01',
      level: '2',
      grade: 'P2',
      position: '行政專員'
    }
  ];

  const validateRes = await req('POST', '/api/employee/batch-import/validate', {
    rows: validCsvRows
  }, token);
  assert(validateRes.status === 200, '5.1 驗證端點回傳 200');
  assert(validateRes.data?.totalRows === 2, '5.1 totalRows = 2');
  assert(typeof validateRes.data?.errorRows === 'number' && typeof validateRes.data?.validRows === 'number',
    '5.1 回傳 errorRows 和 validRows 數值');
  assert(Array.isArray(validateRes.data?.rows) && validateRes.data.rows.length === 2,
    '5.1 rows 陣列長度等於資料筆數');

  // ── 5.1b CSV 驗證 — 錯誤資料 ──
  console.log('  [5.1b] CSV 驗證 — 錯誤資料');

  const invalidCsvRows = [
    { name: '', email: 'bad-email', employee_no: '', subsidiary: '不存在公司', department: '不存在部門', hire_date: '2026/13/40', level: '99', grade: 'X', position: '' }
  ];

  const validateRes2 = await req('POST', '/api/employee/batch-import/validate', {
    rows: invalidCsvRows
  }, token);
  assert(validateRes2.status === 200, '5.1b 驗證端點回傳 200（含錯誤行）');
  assert(validateRes2.data?.errorRows > 0, '5.1b errorRows > 0');

  // ── 5.2 POST /api/employee/batch-import/execute ──
  console.log('  [5.2] 批次匯入執行');

  const executeRes = await req('POST', '/api/employee/batch-import/execute', {
    rows: validCsvRows,
    fileName: 'test-import.csv'
  }, token);
  assert(executeRes.status === 200 || executeRes.status === 201, '5.2 執行端點回傳 200/201');
  assert(executeRes.data?.jobId, '5.2 回傳 jobId');

  const jobId = executeRes.data?.jobId;

  // ── 5.3 GET /api/employee/batch-import/:jobId/status ──
  if (jobId) {
    console.log('  [5.3] 匯入進度輪詢');

    // 等待處理完成（最多 10 秒）
    let statusData = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const statusRes = await req('GET', `/api/employee/batch-import/${jobId}/status`, null, token);
      statusData = statusRes.data;
      if (statusData?.status === 'completed') break;
    }

    assert(statusData?.status === 'completed', '5.3 匯入完成 (status=completed)');
    assert(statusData?.processedRows === 2, '5.3 processedRows = 2');
    assert(statusData?.successCount === 2, '5.3 successCount = 2');

    // ── 5.4 GET /api/employee/batch-import/:jobId/report ──
    console.log('  [5.4] 匯入結果報告');

    const reportRes = await req('GET', `/api/employee/batch-import/${jobId}/report`, null, token);
    assert(reportRes.status === 200, '5.4 報告端點回傳 200');
    assert(Array.isArray(reportRes.data), '5.4 回傳陣列');

    if (Array.isArray(reportRes.data) && reportRes.data.length > 0) {
      const firstResult = reportRes.data[0];
      assert(firstResult.status === 'success', '5.4 第一筆 status = success');
      assert(typeof firstResult.initialPassword === 'string', '5.4 含 initialPassword');
      assert(firstResult.employeeNo, '5.4 含 employeeNo');
    }
  }

  // ── 5.5 權限檢查（無 Token 呼叫應 401）──
  console.log('  [5.5] 批次匯入路由權限');

  const noAuthRes = await req('POST', '/api/employee/batch-import/validate', { rows: [] });
  assert(noAuthRes.status === 401, '5.5 無認證呼叫返回 401');
}

// ═══════════════════════════════════════════════════════════════
// 主程式
// ═══════════════════════════════════════════════════════════════

async function run() {
  console.log('=== 統一員工管理 — 後端 TDD 整合測試 ===\n');

  // Group 1: 直接 DB 測試（不需 server）
  try {
    await testGroup1_Schema();
  } catch (e) {
    console.error('  Group 1 ERROR:', e.message);
    assert(false, `Group 1 未處理錯誤: ${e.message}`);
  }

  // Group 4: 直接 DB 測試（不需 server）
  try {
    await testGroup4_AccountCreation();
  } catch (e) {
    console.error('  Group 4 ERROR:', e.message);
    assert(false, `Group 4 未處理錯誤: ${e.message}`);
  }

  // Group 3, 4 API, 5: 需要 server 運行
  let serverAvailable = false;
  try {
    const health = await fetch(`${BASE}/api/auth/login`, { method: 'OPTIONS' }).catch(() => null);
    serverAvailable = !!health;
  } catch { /* server not running */ }

  if (serverAvailable) {
    try { await testGroup3_EmployeeAPI(); } catch (e) {
      console.error('  Group 3 ERROR:', e.message);
      assert(false, `Group 3 未處理錯誤: ${e.message}`);
    }

    try { await testGroup4_API(); } catch (e) {
      console.error('  Group 4 API ERROR:', e.message);
      assert(false, `Group 4 API 未處理錯誤: ${e.message}`);
    }

    try { await testGroup5_BatchImport(); } catch (e) {
      console.error('  Group 5 ERROR:', e.message);
      assert(false, `Group 5 未處理錯誤: ${e.message}`);
    }
  } else {
    console.log('\n  ⚠️ Server 未啟動 (localhost:3001)，跳過 Group 3, 4 API, 5 API 測試');
    console.log('  ℹ️ 請啟動 server 後重新執行以測試 API 端點');
  }

  // 輸出結果
  console.log('\n─── 測試結果 ───\n');
  for (const r of results) console.log(r);
  console.log(`\n  合計: ${passed + failed} | 通過: ${passed} | 失敗: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
