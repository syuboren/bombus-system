/**
 * 統一帳號建立服務
 *
 * 提供三個核心函數，供入職轉正、HR 手動新增、批次匯入共用：
 * - createEmployeeWithAccount(): 原子建立 Employee + User + 角色指派
 * - resetUserPassword(): 重設使用者密碼
 * - linkUserToEmployee(): 連結孤立帳號到員工記錄
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * 產生 16 字元 URL-safe 隨機密碼
 * @returns {string}
 */
function generatePassword() {
  return crypto.randomBytes(12).toString('base64url');
}

/**
 * 原子建立員工記錄 + 使用者帳號
 *
 * @param {import('../db/db-adapter').SqliteAdapter} tenantDB
 * @param {Object} options
 * @param {Object} options.employeeData - 員工基本資料
 * @param {boolean} [options.createUser=true] - 是否同時建立 User 帳號
 * @param {string} [options.defaultRole='employee'] - 預設角色名稱
 * @param {string|null} [options.orgUnitId=null] - 組織單位 ID
 * @param {string} [options.notifyMethod='display'] - 密碼通知方式
 * @returns {Promise<{employee: Object, user: Object|null, initialPassword: string|null, alreadyExisted?: boolean}>}
 */
async function createEmployeeWithAccount(tenantDB, {
  employeeData,
  createUser = true,
  defaultRole = 'employee',
  orgUnitId = null,
  notifyMethod = 'display'
}) {
  // 驗證 notifyMethod
  if (notifyMethod === 'email') {
    throw new Error('Email notification not yet implemented');
  }

  // 檢查員工 email 唯一性
  if (employeeData.email) {
    const existingEmployee = tenantDB.queryOne(
      'SELECT id FROM employees WHERE email = ?',
      [employeeData.email]
    );
    if (existingEmployee) {
      throw new Error(`Employee email already exists: ${employeeData.email}`);
    }
  }

  // 檢查工號唯一性
  if (employeeData.employee_no) {
    const existingNo = tenantDB.queryOne(
      'SELECT id FROM employees WHERE employee_no = ?',
      [employeeData.employee_no]
    );
    if (existingNo) {
      throw new Error(`Employee employee_no already exists: ${employeeData.employee_no}`);
    }
  }

  // 預先檢查 users 表是否已有此 email（孤立帳號場景）
  let existingUser = null;
  if (createUser && employeeData.email) {
    existingUser = tenantDB.queryOne(
      'SELECT id, email, name, status FROM users WHERE email = ?',
      [employeeData.email]
    );
  }

  // bcrypt hash 在 transaction 外執行（async 操作）
  let initialPassword = null;
  let passwordHash = null;
  if (createUser && !existingUser) {
    initialPassword = generatePassword();
    passwordHash = await bcrypt.hash(initialPassword, 10);
  }

  const employeeId = uuidv4();
  const userId = existingUser ? null : (createUser ? uuidv4() : null);
  const now = new Date().toISOString();

  // Transaction 內執行所有寫入
  tenantDB.transaction(() => {
    // 1. 建立員工記錄
    tenantDB.run(
      `INSERT INTO employees (
        id, employee_no, name, email, phone, department, position,
        level, grade, manager_id, hire_date, contract_type, work_location,
        status, org_unit_id, english_name, mobile, gender, birth_date,
        address, emergency_contact_name, emergency_contact_relation,
        emergency_contact_phone, import_job_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        employeeData.employee_no || null,
        employeeData.name,
        employeeData.email || null,
        employeeData.phone || null,
        employeeData.department || null,
        employeeData.position || null,
        employeeData.level || null,
        employeeData.grade || null,
        employeeData.manager_id || null,
        employeeData.hire_date || null,
        employeeData.contract_type || 'full-time',
        employeeData.work_location || null,
        employeeData.status || 'active',
        employeeData.org_unit_id || orgUnitId || null,
        employeeData.english_name || null,
        employeeData.mobile || null,
        employeeData.gender || 'other',
        employeeData.birth_date || null,
        employeeData.address || null,
        employeeData.emergency_contact_name || null,
        employeeData.emergency_contact_relation || null,
        employeeData.emergency_contact_phone || null,
        employeeData.import_job_id || null,
        now
      ]
    );

    if (createUser) {
      if (existingUser) {
        // 連結既有帳號
        tenantDB.run(
          'UPDATE users SET employee_id = ? WHERE id = ? AND employee_id IS NULL',
          [employeeId, existingUser.id]
        );
      } else {
        // 建立新帳號
        tenantDB.run(
          `INSERT INTO users (id, email, password_hash, name, employee_id, status, must_change_password, created_at)
           VALUES (?, ?, ?, ?, ?, 'active', 1, ?)`,
          [userId, employeeData.email, passwordHash, employeeData.name, employeeId, now]
        );

        // 指派預設角色
        const role = tenantDB.queryOne(
          'SELECT id FROM roles WHERE name = ? AND is_system = 1',
          [defaultRole]
        );
        if (role) {
          tenantDB.run(
            'INSERT INTO user_roles (user_id, role_id, org_unit_id) VALUES (?, ?, ?)',
            [userId, role.id, employeeData.org_unit_id || orgUnitId || null]
          );
        }
      }
    }
  });

  // 組裝回傳結果
  const employee = tenantDB.queryOne('SELECT * FROM employees WHERE id = ?', [employeeId]);

  if (existingUser) {
    return {
      employee,
      user: existingUser,
      initialPassword: null,
      alreadyExisted: true
    };
  }

  if (createUser && userId) {
    const user = tenantDB.queryOne('SELECT id, email, name, status FROM users WHERE id = ?', [userId]);
    return { employee, user, initialPassword };
  }

  return { employee, user: null, initialPassword: null };
}

/**
 * 重設使用者密碼
 *
 * @param {import('../db/db-adapter').SqliteAdapter} tenantDB
 * @param {string} userId
 * @returns {Promise<{userId: string, newPassword: string}>}
 */
async function resetUserPassword(tenantDB, userId) {
  const user = tenantDB.queryOne('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error(`User account not found: ${userId}`);
  }

  const newPassword = generatePassword();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  tenantDB.run(
    'UPDATE users SET password_hash = ?, must_change_password = 1, updated_at = ? WHERE id = ?',
    [passwordHash, new Date().toISOString(), userId]
  );

  return { userId, newPassword };
}

/**
 * 連結使用者帳號到員工記錄
 *
 * @param {import('../db/db-adapter').SqliteAdapter} tenantDB
 * @param {string} userId
 * @param {string|null} employeeId - 既有員工 ID（null 則建立新員工）
 * @param {Object|null} [employeeData] - 建立新員工時的資料
 * @returns {Promise<{userId: string, employeeId: string, linked?: boolean, created?: boolean}>}
 */
async function linkUserToEmployee(tenantDB, userId, employeeId, employeeData = null) {
  // 檢查使用者存在
  const user = tenantDB.queryOne('SELECT id, employee_id FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new Error(`User account not found: ${userId}`);
  }

  // 檢查是否已連結
  if (user.employee_id) {
    throw new Error(`User ${userId} is already linked to employee ${user.employee_id}`);
  }

  if (employeeId) {
    // 連結既有員工
    const employee = tenantDB.queryOne('SELECT id FROM employees WHERE id = ?', [employeeId]);
    if (!employee) {
      throw new Error(`Employee not found: ${employeeId}`);
    }

    tenantDB.run(
      'UPDATE users SET employee_id = ?, updated_at = ? WHERE id = ?',
      [employeeId, new Date().toISOString(), userId]
    );

    return { userId, employeeId, linked: true };
  }

  if (employeeData) {
    // 為使用者建立新員工記錄
    const newEmployeeId = uuidv4();
    const now = new Date().toISOString();

    tenantDB.run(
      `INSERT INTO employees (
        id, employee_no, name, email, phone, department, position,
        level, grade, hire_date, contract_type, work_location,
        status, org_unit_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newEmployeeId,
        employeeData.employee_no || null,
        employeeData.name,
        employeeData.email || null,
        employeeData.phone || null,
        employeeData.department || null,
        employeeData.position || null,
        employeeData.level || null,
        employeeData.grade || null,
        employeeData.hire_date || null,
        employeeData.contract_type || 'full-time',
        employeeData.work_location || null,
        employeeData.status || 'active',
        employeeData.org_unit_id || null,
        now
      ]
    );

    tenantDB.run(
      'UPDATE users SET employee_id = ?, updated_at = ? WHERE id = ?',
      [newEmployeeId, now, userId]
    );

    return { userId, employeeId: newEmployeeId, created: true };
  }

  throw new Error('Either employeeId or employeeData must be provided');
}

module.exports = {
  createEmployeeWithAccount,
  resetUserPassword,
  linkUserToEmployee,
  generatePassword
};
