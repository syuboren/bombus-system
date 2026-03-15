/**
 * Demo Tenant Data Migration — migrate-demo.js
 *
 * 從 onboarding.db 讀取既有資料，遷移至 tenant_demo.db。
 *
 * Phase A (Task 5.1a): 遷移框架 + 核心結構與員工表
 * Phase B (Task 5.1b): 進階業務表（待補充）
 * Phase C (Task 5.2):  RBAC 種子資料（待補充）
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { tenantDBManager } = require('./tenant-db-manager');
const { initTenantSchema } = require('./tenant-schema');
const { initPlatformDB, getPlatformDB } = require('./platform-db');
const { logAudit } = require('../utils/audit-logger');

const ONBOARDING_DB_PATH = path.join(__dirname, 'onboarding.db');
const DEMO_TENANT_ID = 'demo';
const DEMO_TENANT_SLUG = 'demo';
const DEMO_TENANT_NAME = 'Demo Company';

// ─── Phase A 表清單 (Task 5.1a)：核心結構 + 員工表 ───
const PHASE_A_TABLES = [
  // 部門與職等職級系統
  'departments',
  'grade_levels',
  'grade_salary_levels',
  'department_positions',
  'promotion_criteria',
  'career_paths',
  'grade_tracks',
  'grade_change_history',
  // 員工管理
  'employees',
  'employee_education',
  'employee_skills',
  'employee_certifications',
  'employee_job_changes',
  'employee_salaries',
  'employee_training',
  'employee_documents',
  // 系統設定
  'system_config',
];

// ─── Phase B 表清單 (Task 5.1b)：進階業務表 ───
const PHASE_B_TABLES = [
  // 表單模板系統
  'templates',
  'submissions',
  'template_versions',
  // 招募管理
  'jobs',
  'candidates',
  'candidate_education',
  'candidate_experiences',
  'candidate_specialities',
  'candidate_languages',
  'candidate_attachments',
  'candidate_projects',
  'candidate_custom_contents',
  'candidate_recommenders',
  'candidate_apply_records',
  'candidate_apply_questions',
  'candidate_resume_analysis',
  // 面試評分
  'interview_evaluations',
  // 人才庫
  'talent_pool',
  'talent_contact_history',
  'talent_reminders',
  'talent_tags',
  'talent_tag_mapping',
  'talent_job_matches',
  // 面試管理
  'interview_invitations',
  'interviews',
  'candidate_interview_forms',
  'invitation_decisions',
  // 會議管理
  'meetings',
  'meeting_reminders',
  'meeting_attendees',
  'meeting_agenda_items',
  'meeting_conclusions',
  'meeting_attachments',
  // 績效評估系統
  'monthly_check_templates',
  'monthly_checks',
  'monthly_check_items',
  'quarterly_reviews',
  'quarterly_review_sections',
  'satisfaction_surveys',
  'satisfaction_questions',
  'weekly_reports',
  'weekly_report_items',
  'weekly_todo_items',
  'weekly_problem_items',
  'weekly_training_items',
  'weekly_project_items',
  // 通知系統
  'competency_notifications',
  // 職能管理
  'competencies',
  'competency_levels',
  'competency_ksa_details',
  // 職務說明書
  'job_descriptions',
  'job_description_versions',
  'job_description_approvals',
];

// ═══════════════════════════════════════════
// 工具函數
// ═══════════════════════════════════════════

/**
 * 取得資料表的欄位名稱列表
 * @param {import('sql.js').Database} db
 * @param {string} tableName
 * @returns {string[]}
 */
function getTableColumns(db, tableName) {
  const columns = [];
  const stmt = db.prepare(`PRAGMA table_info("${tableName}")`);
  while (stmt.step()) {
    columns.push(stmt.getAsObject().name);
  }
  stmt.free();
  return columns;
}

/**
 * 檢查資料表是否存在
 * @param {import('sql.js').Database} db
 * @param {string} tableName
 * @returns {boolean}
 */
function tableExists(db, tableName) {
  const stmt = db.prepare(
    'SELECT COUNT(*) as c FROM sqlite_master WHERE type=\'table\' AND name=?'
  );
  stmt.bind([tableName]);
  stmt.step();
  const exists = stmt.getAsObject().c > 0;
  stmt.free();
  return exists;
}

/**
 * 取得資料表列數
 * @param {import('sql.js').Database} db
 * @param {string} tableName
 * @returns {number}
 */
function getRowCount(db, tableName) {
  const stmt = db.prepare(`SELECT COUNT(*) as c FROM "${tableName}"`);
  stmt.step();
  const count = stmt.getAsObject().c;
  stmt.free();
  return count;
}

// ═══════════════════════════════════════════
// 通用表遷移
// ═══════════════════════════════════════════

/**
 * 遷移單一資料表（自動偵測共同欄位）
 * @param {import('sql.js').Database} sourceDB - onboarding.db
 * @param {import('sql.js').Database} targetDB - tenant_demo.db raw
 * @param {string} tableName
 * @returns {{ table: string, source: number, migrated: number, skipped: boolean, reason?: string }}
 */
function migrateTable(sourceDB, targetDB, tableName) {
  // 驗證兩端都有此表
  if (!tableExists(sourceDB, tableName)) {
    return { table: tableName, source: 0, migrated: 0, skipped: true, reason: '來源表不存在' };
  }
  if (!tableExists(targetDB, tableName)) {
    return { table: tableName, source: 0, migrated: 0, skipped: true, reason: '目標表不存在' };
  }

  // 取得兩邊的欄位，取交集
  const sourceColumns = getTableColumns(sourceDB, tableName);
  const targetColumns = getTableColumns(targetDB, tableName);
  const targetSet = new Set(targetColumns);
  const commonColumns = sourceColumns.filter(c => targetSet.has(c));

  if (commonColumns.length === 0) {
    return { table: tableName, source: 0, migrated: 0, skipped: true, reason: '無共同欄位' };
  }

  // 讀取 source 所有資料
  const colList = commonColumns.map(c => `"${c}"`).join(', ');
  const readStmt = sourceDB.prepare(`SELECT ${colList} FROM "${tableName}"`);
  const rows = [];
  while (readStmt.step()) {
    rows.push(readStmt.getAsObject());
  }
  readStmt.free();

  const sourceCount = rows.length;
  if (sourceCount === 0) {
    return { table: tableName, source: 0, migrated: 0, skipped: false };
  }

  // 寫入 target（使用 INSERT OR IGNORE 避免重複）
  const placeholders = commonColumns.map(() => '?').join(', ');
  const insertSQL = `INSERT OR IGNORE INTO "${tableName}" (${colList}) VALUES (${placeholders})`;

  let migrated = 0;
  for (const row of rows) {
    const values = commonColumns.map(c => {
      const val = row[c];
      return val === undefined ? null : val;
    });
    try {
      const stmt = targetDB.prepare(insertSQL);
      stmt.bind(values);
      stmt.step();
      stmt.free();
      migrated++;
    } catch (e) {
      // INSERT OR IGNORE 應處理大部分衝突；記錄非預期錯誤
      console.warn(`  ⚠ ${tableName} 寫入失敗:`, e.message);
    }
  }

  return { table: tableName, source: sourceCount, migrated, skipped: false };
}

// ═══════════════════════════════════════════
// Phase C: RBAC 種子資料 (Task 5.2)
// ═══════════════════════════════════════════

// 部門名稱 → org_unit ID 對應
const DEPT_TO_ORG = {
  '執行長辦公室': 'org-dept-ceo',
  '行政部': 'org-dept-admin',
  '財務部': 'org-dept-fin',
  '專案部': 'org-dept-proj',
  '人資部': 'org-dept-hr',
  '業務部': 'org-dept-sales',
  '工程部': 'org-dept-eng',
};

// 權限資源定義（對應既有 L1~L6 路由）
const PERMISSION_RESOURCES = [
  { resource: 'employee', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'recruitment', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'talent_pool', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'meeting', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'competency', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'monthly_check', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'weekly_report', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'quarterly_review', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'template', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'submission', actions: ['read', 'create', 'update'] },
  { resource: 'approval', actions: ['read', 'approve', 'reject'] },
  { resource: 'job_description', actions: ['read', 'create', 'update', 'delete', 'approve'] },
  { resource: 'grade_matrix', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'organization', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'export', actions: ['read'] },
  { resource: 'job', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'onboarding', actions: ['read', 'create', 'update', 'manage'] },
  { resource: 'user', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'role', actions: ['read', 'create', 'update', 'delete', 'manage'] },
  { resource: 'audit', actions: ['read'] },
];

/**
 * 在 raw db 上執行 INSERT OR IGNORE（不觸發 auto-save）
 */
function rawInsert(db, sql, params) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params.map(p => p === undefined ? null : p));
    stmt.step();
    stmt.free();
  } catch (e) {
    // INSERT OR IGNORE — 靜默跳過重複
  }
}

/**
 * 建立 RBAC 種子資料（Task 5.2）
 * @param {import('./db-adapter').SqliteAdapter} demoAdapter
 */
async function seedRBACData(demoAdapter) {
  const bcrypt = require('bcryptjs');
  const db = demoAdapter.raw;

  console.log('\n─── Phase C: RBAC 種子資料 ───\n');

  db.run('PRAGMA foreign_keys = OFF');
  db.run('BEGIN TRANSACTION');

  // 1. 建立 org_units（母公司 + 7 部門）
  // 注意：DEMO子公司由使用者透過 UI 建立，不在此處硬編碼
  const orgUnits = [
    { id: 'org-root', name: 'Demo集團', type: 'group', parent_id: null, level: 0 },
    { id: 'org-dept-ceo', name: '執行長辦公室', type: 'department', parent_id: 'org-root', level: 1 },
    { id: 'org-dept-admin', name: '行政部', type: 'department', parent_id: 'org-root', level: 1 },
    { id: 'org-dept-fin', name: '財務部', type: 'department', parent_id: 'org-root', level: 1 },
    { id: 'org-dept-proj', name: '專案部', type: 'department', parent_id: 'org-root', level: 1 },
    { id: 'org-dept-hr', name: '人資部', type: 'department', parent_id: 'org-root', level: 1 },
    { id: 'org-dept-sales', name: '業務部', type: 'department', parent_id: 'org-root', level: 1 },
    { id: 'org-dept-eng', name: '工程部', type: 'department', parent_id: 'org-root', level: 1 },
  ];

  for (const ou of orgUnits) {
    rawInsert(db,
      'INSERT OR IGNORE INTO org_units (id, name, type, parent_id, level) VALUES (?, ?, ?, ?, ?)',
      [ou.id, ou.name, ou.type, ou.parent_id, ou.level]
    );
  }
  console.log(`  ✅ org_units: ${orgUnits.length} 筆`);

  // 2. 建立 5 個預設角色（is_system=1）
  const roles = [
    { id: 'role-super-admin', name: 'super_admin', description: '超級管理員（全權限）', scope_type: 'global', is_system: 1 },
    { id: 'role-subsidiary-admin', name: 'subsidiary_admin', description: '子公司管理員', scope_type: 'subsidiary', is_system: 1 },
    { id: 'role-hr-manager', name: 'hr_manager', description: '人資管理員', scope_type: 'global', is_system: 1 },
    { id: 'role-dept-manager', name: 'dept_manager', description: '部門主管', scope_type: 'department', is_system: 1 },
    { id: 'role-employee', name: 'employee', description: '一般員工', scope_type: 'department', is_system: 1 },
  ];

  for (const role of roles) {
    rawInsert(db,
      'INSERT OR IGNORE INTO roles (id, name, description, scope_type, is_system) VALUES (?, ?, ?, ?, ?)',
      [role.id, role.name, role.description, role.scope_type, role.is_system]
    );
  }
  console.log(`  ✅ roles: ${roles.length} 筆`);

  // 3. 建立全部權限定義
  const allPermissions = [];
  for (const r of PERMISSION_RESOURCES) {
    for (const action of r.actions) {
      allPermissions.push({
        id: `perm-${r.resource}-${action}`,
        resource: r.resource,
        action
      });
    }
  }

  for (const perm of allPermissions) {
    rawInsert(db,
      'INSERT OR IGNORE INTO permissions (id, resource, action, description) VALUES (?, ?, ?, ?)',
      [perm.id, perm.resource, perm.action, `${perm.resource}:${perm.action}`]
    );
  }
  console.log(`  ✅ permissions: ${allPermissions.length} 筆`);

  // 4. 建立角色-權限對應
  let rpCount = 0;

  // super_admin → 全部權限
  for (const p of allPermissions) {
    rawInsert(db, 'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
      ['role-super-admin', p.id]);
    rpCount++;
  }

  // subsidiary_admin → 大部分權限（排除 user/role 的寫入與 audit）
  for (const p of allPermissions) {
    const isAdminOnly = ['user', 'role'].includes(p.resource) && p.action !== 'read';
    if (!isAdminOnly) {
      rawInsert(db, 'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        ['role-subsidiary-admin', p.id]);
      rpCount++;
    }
  }

  // hr_manager → HR 相關全部權限
  const hrResources = [
    'employee', 'recruitment', 'talent_pool', 'meeting', 'competency',
    'monthly_check', 'weekly_report', 'quarterly_review', 'template',
    'submission', 'approval', 'job_description', 'grade_matrix',
    'organization', 'export', 'job', 'onboarding'
  ];
  for (const p of allPermissions) {
    if (hrResources.includes(p.resource)) {
      rawInsert(db, 'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        ['role-hr-manager', p.id]);
      rpCount++;
    }
  }

  // dept_manager → 部門級管理權限
  const deptResources = [
    'employee', 'meeting', 'monthly_check', 'weekly_report',
    'quarterly_review', 'submission', 'approval', 'export', 'onboarding'
  ];
  for (const p of allPermissions) {
    if (deptResources.includes(p.resource)) {
      rawInsert(db, 'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        ['role-dept-manager', p.id]);
      rpCount++;
    }
  }

  // employee → 唯讀 + 自身週報/提交
  const empReadResources = [
    'employee', 'meeting', 'monthly_check', 'weekly_report',
    'quarterly_review', 'submission', 'export', 'job_description',
    'grade_matrix', 'organization', 'competency'
  ];
  const empWriteResources = ['weekly_report', 'submission'];
  for (const p of allPermissions) {
    const canRead = p.action === 'read' && empReadResources.includes(p.resource);
    const canWrite = ['create', 'update'].includes(p.action) && empWriteResources.includes(p.resource);
    if (canRead || canWrite) {
      rawInsert(db, 'INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
        ['role-employee', p.id]);
      rpCount++;
    }
  }
  console.log(`  ✅ role_permissions: ${rpCount} 筆`);

  // 5. 建立使用者帳號
  const adminHash = await bcrypt.hash('admin123', 10);
  const defaultHash = await bcrypt.hash('pass123', 10);

  // Admin 帳號（無 employee_id）
  rawInsert(db,
    'INSERT OR IGNORE INTO users (id, email, password_hash, name, employee_id, status) VALUES (?, ?, ?, ?, ?, ?)',
    ['user-admin', 'admin@demo.com', adminHash, 'Demo Admin', null, 'active']
  );

  // 從 employees 表建立使用者帳號
  const empStmt = db.prepare('SELECT id, name, email, department, role FROM employees');
  const employees = [];
  while (empStmt.step()) {
    employees.push(empStmt.getAsObject());
  }
  empStmt.free();

  for (const emp of employees) {
    const userId = `user-emp-${emp.id}`;
    rawInsert(db,
      'INSERT OR IGNORE INTO users (id, email, password_hash, name, employee_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, emp.email, defaultHash, emp.name, emp.id, 'active']
    );
  }
  console.log(`  ✅ users: ${1 + employees.length} 筆（1 admin + ${employees.length} 員工）`);

  // 6. 建立使用者-角色對應
  let urCount = 0;

  // Admin → super_admin（global scope，指向集團根）
  rawInsert(db,
    'INSERT OR IGNORE INTO user_roles (user_id, role_id, org_unit_id) VALUES (?, ?, ?)',
    ['user-admin', 'role-super-admin', 'org-root']
  );
  urCount++;

  // 員工角色對應
  for (const emp of employees) {
    const userId = `user-emp-${emp.id}`;
    const orgUnitId = DEPT_TO_ORG[emp.department] || 'org-root';

    if (emp.role === 'manager') {
      // managers → hr_manager（global scope）
      rawInsert(db,
        'INSERT OR IGNORE INTO user_roles (user_id, role_id, org_unit_id) VALUES (?, ?, ?)',
        [userId, 'role-hr-manager', 'org-root']
      );
    } else {
      // employees → employee（department scope）
      rawInsert(db,
        'INSERT OR IGNORE INTO user_roles (user_id, role_id, org_unit_id) VALUES (?, ?, ?)',
        [userId, 'role-employee', orgUnitId]
      );
    }
    urCount++;
  }
  console.log(`  ✅ user_roles: ${urCount} 筆`);

  // 提交交易
  db.run('COMMIT');
  db.run('PRAGMA foreign_keys = ON');
  demoAdapter.save();

  console.log('\n  ✅ RBAC 種子資料建立完成');
  return { users: 1 + employees.length, roles: roles.length, permissions: allPermissions.length };
}

// ═══════════════════════════════════════════
// Phase D: 平台種子資料 (Task 5.3)
// ═══════════════════════════════════════════

/**
 * 建立預設訂閱方案 + 平台管理員帳號（Task 5.3）
 * @param {import('./db-adapter').SqliteAdapter} platformDB
 */
async function seedPlatformData(platformDB) {
  const bcrypt = require('bcryptjs');

  console.log('\n─── Phase D: 平台種子資料 ───\n');

  // 1. 建立 Free/Basic/Enterprise 訂閱方案
  const plans = [
    {
      id: 'plan-free',
      name: 'Free',
      max_users: 10,
      max_subsidiaries: 1,
      features: JSON.stringify({ modules: ['L1'], export: false, api: false })
    },
    {
      id: 'plan-basic',
      name: 'Basic',
      max_users: 50,
      max_subsidiaries: 3,
      features: JSON.stringify({ modules: ['L1', 'L2', 'L3'], export: true, api: false })
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise',
      max_users: 500,
      max_subsidiaries: 20,
      features: JSON.stringify({ modules: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'], export: true, api: true })
    },
  ];

  for (const plan of plans) {
    platformDB.run(
      'INSERT OR IGNORE INTO subscription_plans (id, name, max_users, max_subsidiaries, features) VALUES (?, ?, ?, ?, ?)',
      [plan.id, plan.name, plan.max_users, plan.max_subsidiaries, plan.features]
    );
  }
  console.log(`  ✅ subscription_plans: ${plans.length} 筆`);

  // 2. 將 demo 租戶綁定 Enterprise 方案
  platformDB.run(
    'UPDATE tenants SET plan_id = ? WHERE slug = ?',
    ['plan-enterprise', DEMO_TENANT_SLUG]
  );
  console.log('  ✅ Demo 租戶綁定 Enterprise 方案');

  // 3. 建立或更新預設平台管理員帳號（idempotent upsert）
  const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'platform@bombus.com';
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'platform123';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  // 先清除所有既有管理員，確保與 .env 一致
  const existingAdmins = platformDB.query('SELECT id, email FROM platform_admins');
  if (existingAdmins.length > 0) {
    platformDB.run('DELETE FROM platform_admins');
    console.log(`  ○ 清除 ${existingAdmins.length} 個既有平台管理員帳號`);
  }

  platformDB.run(
    'INSERT INTO platform_admins (id, email, password_hash, name) VALUES (?, ?, ?, ?)',
    [uuidv4(), adminEmail, adminHash, 'Platform Admin']
  );
  console.log(`  ✅ 平台管理員帳號: ${adminEmail}`);

  console.log('\n  ✅ 平台種子資料建立完成');
}

// ═══════════════════════════════════════════
// Grade Track Entries 遷移
// ═══════════════════════════════════════════

/**
 * 將 grade_levels 中的 title_management / title_professional / education_requirement / responsibility_description
 * 拆分至 grade_track_entries 表（idempotent）
 * @param {import('sql.js').Database} db - tenant DB raw
 */
function migrateGradeTrackEntries(db) {
  if (!tableExists(db, 'grade_levels') || !tableExists(db, 'grade_track_entries')) {
    console.log('  ⏭ grade_track_entries: 跳過（表不存在）');
    return;
  }

  // 檢查 grade_levels 是否有舊欄位可遷移
  const columns = getTableColumns(db, 'grade_levels');
  if (!columns.includes('title_management')) {
    console.log('  ⏭ grade_track_entries: 跳過（grade_levels 已無舊欄位）');
    return;
  }

  const readStmt = db.prepare(
    'SELECT id, grade, title_management, title_professional, education_requirement, responsibility_description FROM grade_levels'
  );
  const grades = [];
  while (readStmt.step()) {
    grades.push(readStmt.getAsObject());
  }
  readStmt.free();

  if (grades.length === 0) {
    console.log('  ○ grade_track_entries: grade_levels 無資料');
    return;
  }

  let migrated = 0;
  for (const g of grades) {
    // Management track entry
    if (g.title_management) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description)
         VALUES (?, ?, 'management', ?, ?, ?)`
      );
      stmt.bind([
        g.id + '-mgmt',
        g.grade,
        g.title_management,
        g.education_requirement || '',
        g.responsibility_description || ''
      ]);
      stmt.step();
      stmt.free();
      migrated++;
    }

    // Professional track entry
    if (g.title_professional) {
      const stmt = db.prepare(
        `INSERT OR IGNORE INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description)
         VALUES (?, ?, 'professional', ?, ?, ?)`
      );
      stmt.bind([
        g.id + '-prof',
        g.grade,
        g.title_professional,
        g.education_requirement || '',
        g.responsibility_description || ''
      ]);
      stmt.step();
      stmt.free();
      migrated++;
    }
  }

  console.log(`  ✅ grade_track_entries: ${migrated} 筆（從 ${grades.length} 個職等拆分）`);

  // 補填 required_skills_and_training 示範資料
  const skillsData = {
    1: { management: '基礎辦公軟體操作、時間管理、團隊溝通技巧', professional: '專業領域基礎知識、數據分析入門、文件撰寫能力' },
    2: { management: '專案管理基礎、跨部門協調、簡報技巧', professional: '專業技術深化、問題解決方法論、技術文件撰寫' },
    3: { management: '專案管理認證(PMP)、領導力培訓、預算管理', professional: '專業認證取得、研究方法論、技術架構設計' },
    4: { management: '策略規劃、變革管理、高階主管教練課程', professional: '產業前沿技術、技術團隊領導、創新方法論' },
    5: { management: '企業經營管理、組織發展、董事會治理', professional: '技術願景規劃、產學合作、專利與智財管理' },
    6: { management: '集團戰略、國際化管理、企業社會責任', professional: '產業標準制定、技術策略顧問、跨國技術合作' },
    7: { management: '全球領導力、企業轉型、永續經營策略', professional: '世界級技術領導、產業創新引領、技術生態系建構' }
  };

  for (const [grade, tracks] of Object.entries(skillsData)) {
    for (const [track, skills] of Object.entries(tracks)) {
      try {
        const stmt = db.prepare(
          `UPDATE grade_track_entries SET required_skills_and_training = ? WHERE grade = ? AND track = ? AND (required_skills_and_training IS NULL OR required_skills_and_training = '')`
        );
        stmt.bind([skills, parseInt(grade), track]);
        stmt.step();
        stmt.free();
      } catch (e) { /* 忽略更新失敗 */ }
    }
  }
  console.log('  ✅ grade_track_entries: required_skills_and_training 示範資料已補填');
}

/**
 * 為既有子公司新增差異化薪資資料（覆寫集團預設）
 * 動態查詢第一個 type=subsidiary 的組織單位，示範 Grade 3 和 Grade 5 的薪資覆寫
 */
function seedSubsidiarySalaryData(db) {
  console.log('\n─── 子公司差異化薪資種子資料 ───');

  // 動態查詢第一個子公司
  let subsidiaryId = null;
  let subsidiaryName = null;
  try {
    const result = db.exec("SELECT id, name FROM org_units WHERE type = 'subsidiary' LIMIT 1");
    if (result.length && result[0].values.length) {
      subsidiaryId = result[0].values[0][0];
      subsidiaryName = result[0].values[0][1];
    }
  } catch (e) { /* org_units 可能為空 */ }

  if (!subsidiaryId) {
    console.log('  ⏭ 無子公司，跳過差異化薪資種子');
    return;
  }

  console.log(`  目標子公司: ${subsidiaryName} (${subsidiaryId})`);

  // 查詢現有集團預設薪資（Grade 3 和 Grade 5）
  const grades = [3, 5];
  for (const grade of grades) {
    const existing = [];
    try {
      const result = db.exec(`SELECT code, salary, sort_order FROM grade_salary_levels WHERE grade = ${grade} AND org_unit_id IS NULL ORDER BY sort_order`);
      if (result.length && result[0].values.length) {
        for (const row of result[0].values) {
          existing.push({ code: row[0], salary: row[1], sort_order: row[2] });
        }
      }
    } catch (e) { /* 表可能為空 */ }

    if (existing.length === 0) {
      console.log(`  ⏭ Grade ${grade}: 無集團預設薪資，跳過`);
      continue;
    }

    // 為子公司建立差異化薪資（薪資打 85 折，模擬不同地區薪資水準）
    for (const sal of existing) {
      const adjustedSalary = Math.round(sal.salary * 0.85);
      const salId = `sal-sub-${sal.code}`;
      try {
        const stmt = db.prepare('INSERT OR IGNORE INTO grade_salary_levels (id, grade, code, salary, sort_order, org_unit_id) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run([salId, grade, sal.code, adjustedSalary, sal.sort_order, subsidiaryId]);
        stmt.free();
      } catch (e) { /* 已存在則跳過 */ }
    }
    console.log(`  ✅ Grade ${grade}: ${subsidiaryName} 薪資 ${existing.length} 筆（集團的 85%）`);
  }
}

// ═══════════════════════════════════════════
// 主遷移流程
// ═══════════════════════════════════════════

/**
 * 執行 Demo 租戶資料遷移
 * @returns {Promise<{ success: boolean, tables?: number, totalRows?: number, results?: object[], error?: string }>}
 */
async function migrateDemoData() {
  console.log('═══════════════════════════════════════');
  console.log('🔄 開始 Demo 租戶資料遷移');
  console.log('═══════════════════════════════════════');

  // 1. 確認 onboarding.db 存在
  if (!fs.existsSync(ONBOARDING_DB_PATH)) {
    console.error('❌ onboarding.db 不存在:', ONBOARDING_DB_PATH);
    return { success: false, error: 'onboarding.db not found' };
  }

  // 2. 初始化多租戶基礎設施
  const platformDB = await initPlatformDB();
  await tenantDBManager.init();

  // 3. 開啟 source DB
  const SQL = await initSqlJs();
  const sourceBuffer = fs.readFileSync(ONBOARDING_DB_PATH);
  const sourceDB = new SQL.Database(sourceBuffer);
  console.log('📂 已開啟 onboarding.db');

  // 4. 建立或取得 demo 租戶 DB
  let demoAdapter;
  if (tenantDBManager.exists(DEMO_TENANT_ID)) {
    console.log('📂 Demo 租戶 DB 已存在，載入中...');
    demoAdapter = tenantDBManager.getDB(DEMO_TENANT_ID);
  } else {
    console.log('🆕 建立 Demo 租戶 DB 並初始化 Schema...');
    demoAdapter = tenantDBManager.createTenantDB(DEMO_TENANT_ID, initTenantSchema);
  }
  const targetDB = demoAdapter.raw;

  // 5. 在 platform.db 註冊 demo 租戶（冪等）
  const existingTenant = platformDB.queryOne(
    'SELECT id FROM tenants WHERE slug = ?', [DEMO_TENANT_SLUG]
  );
  if (!existingTenant) {
    platformDB.run(
      `INSERT INTO tenants (id, name, slug, status, db_file)
       VALUES (?, ?, ?, 'active', ?)`,
      [DEMO_TENANT_ID, DEMO_TENANT_NAME, DEMO_TENANT_SLUG, `tenant_${DEMO_TENANT_ID}.db`]
    );
    console.log('✅ Demo 租戶已註冊至 platform.db');
  }

  // 6. 關閉外鍵約束，開始交易
  targetDB.run('PRAGMA foreign_keys = OFF');
  targetDB.run('BEGIN TRANSACTION');

  // 7. 逐表遷移
  const allTables = [...PHASE_A_TABLES, ...PHASE_B_TABLES];
  const results = [];

  console.log(`\n📋 準備遷移 ${allTables.length} 張表...\n`);

  for (const tableName of allTables) {
    const result = migrateTable(sourceDB, targetDB, tableName);
    results.push(result);

    if (result.skipped) {
      console.log(`  ⏭ ${tableName}: 跳過 (${result.reason})`);
    } else if (result.source === 0) {
      console.log(`  ○ ${tableName}: 空表`);
    } else {
      console.log(`  ✅ ${tableName}: ${result.migrated}/${result.source} 筆`);
    }
  }

  // 8. 提交交易，重新啟用外鍵
  targetDB.run('COMMIT');
  targetDB.run('PRAGMA foreign_keys = ON');
  demoAdapter.save();

  // 9. 驗證遷移結果
  console.log('\n─── 遷移驗證 ───');
  let allMatch = true;
  for (const result of results) {
    if (result.skipped || result.source === 0) continue;
    const actualCount = getRowCount(targetDB, result.table);
    if (actualCount < result.migrated) {
      console.log(`  ❌ ${result.table}: 預期 ${result.migrated}，實際 ${actualCount}`);
      allMatch = false;
    }
  }
  if (allMatch) {
    console.log('  ✅ 所有表遷移記錄數驗證通過');
  }

  // 9b. 遷移 grade_track_entries（從 grade_levels 拆分軌道資料）
  migrateGradeTrackEntries(targetDB);
  demoAdapter.save();

  // 9c. 子公司差異化薪資種子資料
  seedSubsidiarySalaryData(targetDB);
  demoAdapter.save();

  // 9d. 從 JSON 種子檔還原遺失的業務資料（fallback safety net）
  try {
    const { importSeeds } = require('./seed-import');
    const seedResult = await importSeeds(targetDB);
    if (seedResult.imported > 0) {
      console.log(`\n  ✅ 從 JSON 種子檔補回 ${seedResult.tables} 張表，${seedResult.imported} 筆資料`);
      demoAdapter.save();
    } else {
      console.log('\n  ○ JSON 種子檔：所有表已有資料，無需補回');
    }
  } catch (e) {
    console.log(`\n  ○ JSON 種子檔不可用，跳過 (${e.message})`);
  }

  // 10. 建立 RBAC 種子資料
  const rbacResult = await seedRBACData(demoAdapter);

  // 10b. 建立平台種子資料（方案 + 平台管理員）
  await seedPlatformData(platformDB);

  // 11. 記錄審計日誌
  const migrationDetails = results
    .filter(r => !r.skipped)
    .reduce((acc, r) => {
      acc[r.table] = { source: r.source, migrated: r.migrated };
      return acc;
    }, {});

  logAudit(platformDB, {
    tenant_id: DEMO_TENANT_ID,
    action: 'data_migration',
    resource: 'demo_tenant',
    details: {
      phase: 'A+B+C',
      tables_migrated: results.filter(r => !r.skipped && r.migrated > 0).length,
      tables_empty: results.filter(r => !r.skipped && r.source === 0).length,
      tables_skipped: results.filter(r => r.skipped).length,
      total_rows: results.reduce((sum, r) => sum + r.migrated, 0),
      details: migrationDetails
    }
  });

  // 11. 關閉 source DB
  sourceDB.close();

  // 12. 輸出最終報告
  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0);
  const totalTables = results.filter(r => !r.skipped && r.migrated > 0).length;

  console.log('\n═══════════════════════════════════════');
  console.log(`✅ Demo 遷移完成：${totalTables} 張表，共 ${totalMigrated} 筆資料`);
  console.log('═══════════════════════════════════════\n');

  return {
    success: true,
    tables: totalTables,
    totalRows: totalMigrated,
    results
  };
}

// ─── CLI 直接執行 ───
if (require.main === module) {
  migrateDemoData()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateDemoData, migrateTable, seedRBACData, seedPlatformData, PHASE_A_TABLES, PHASE_B_TABLES };
