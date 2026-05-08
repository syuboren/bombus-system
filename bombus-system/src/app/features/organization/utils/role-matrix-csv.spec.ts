import { TenantUser } from '../../tenant-admin/models/tenant-admin.model';
import { buildCsvFileName, buildEmployeeRoleCsv } from './role-matrix-csv';

describe('buildEmployeeRoleCsv', () => {
  const fixedTs = new Date('2026-05-07T10:30:00Z');

  function makeUser(overrides: Partial<TenantUser> = {}): TenantUser {
    return {
      id: 'u1',
      email: 'u1@demo.com',
      name: '王小明',
      employee_id: 'e1',
      employee_no: 'EMP-001',
      org_unit_id: null,
      status: 'active',
      created_at: '2026-01-01',
      department: '業務部',
      roles: [],
      ...overrides
    };
  }

  it('begins with a UTF-8 BOM', () => {
    const csv = buildEmployeeRoleCsv([makeUser()], { exportTimestamp: fixedTs });
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
  });

  it('emits header row with 9 columns', () => {
    const csv = buildEmployeeRoleCsv([makeUser()], { exportTimestamp: fixedTs });
    const headerLine = csv.replace(/^﻿/, '').split('\r\n')[0];
    expect(headerLine.split(',').length).toBe(9);
    expect(headerLine).toContain('employee_number');
    expect(headerLine).toContain('exported_at');
  });

  it('emits one row per role-assignment for users with multiple roles', () => {
    const user = makeUser({
      roles: [
        { id: 'a1', role_id: 'r1', role_name: 'hr_manager', scope_type: 'global', scope_id: null },
        { id: 'a2', role_id: 'r2', role_name: 'employee', scope_type: 'department', scope_id: 'd1', scope_name: '業務部' }
      ]
    });
    const csv = buildEmployeeRoleCsv([user], { exportTimestamp: fixedTs });
    const lines = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('hr_manager');
    expect(lines[2]).toContain('employee');
    expect(lines[2]).toContain('業務部');
  });

  it('localizes scope_type values to Chinese labels', () => {
    const user = makeUser({
      roles: [
        { id: 'a1', role_id: 'r1', role_name: 'hr_manager', scope_type: 'global', scope_id: null },
        { id: 'a2', role_id: 'r2', role_name: 'sub_admin', scope_type: 'subsidiary', scope_id: 's1', scope_name: '台北分公司' },
        { id: 'a3', role_id: 'r3', role_name: 'dept_manager', scope_type: 'department', scope_id: 'd1', scope_name: '業務部' }
      ]
    });
    const csv = buildEmployeeRoleCsv([user], { exportTimestamp: fixedTs });
    const lines = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
    expect(lines[1].split(',')[5]).toBe('全集團');
    expect(lines[2].split(',')[5]).toBe('子公司');
    expect(lines[3].split(',')[5]).toBe('部門');
  });

  it('merges global and group scope_type into 全集團 with empty scope_name', () => {
    const user = makeUser({
      roles: [
        { id: 'a1', role_id: 'r1', role_name: 'hr_manager', scope_type: 'group', scope_id: 'org-root', scope_name: 'Demo集團' }
      ]
    });
    const csv = buildEmployeeRoleCsv([user], { exportTimestamp: fixedTs });
    const lines = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
    const cols = lines[1].split(',');
    expect(cols[5]).toBe('全集團');
    expect(cols[6]).toBe('');
  });

  it('localizes account_status values to Chinese', () => {
    const userActive = makeUser({ status: 'active' });
    const userInactive = makeUser({ id: 'u2', status: 'inactive' });
    const userLocked = makeUser({ id: 'u3', status: 'locked' });
    const csv = buildEmployeeRoleCsv([userActive, userInactive, userLocked], { exportTimestamp: fixedTs });
    const lines = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
    expect(lines[1].split(',')[7]).toBe('啟用');
    expect(lines[2].split(',')[7]).toBe('停用');
    expect(lines[3].split(',')[7]).toBe('鎖定');
  });

  it('emits one empty-role row for users with no role assignments', () => {
    const user = makeUser({ roles: [] });
    const csv = buildEmployeeRoleCsv([user], { exportTimestamp: fixedTs });
    const lines = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
    expect(lines.length).toBe(2);
    const cols = lines[1].split(',');
    expect(cols[0]).toBe('EMP-001');
    expect(cols[4]).toBe('');
    expect(cols[5]).toBe('');
    expect(cols[6]).toBe('');
  });

  it('leaves scope_name blank for global scope', () => {
    const user = makeUser({
      roles: [{ id: 'a1', role_id: 'r1', role_name: 'hr_manager', scope_type: 'global', scope_id: null }]
    });
    const csv = buildEmployeeRoleCsv([user], { exportTimestamp: fixedTs });
    const lines = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
    const cols = lines[1].split(',');
    expect(cols[5]).toBe('全集團');
    expect(cols[6]).toBe('');
  });

  it('escapes commas and quotes', () => {
    const user = makeUser({
      name: 'O\'Brien, "Bob"',
      department: 'R&D, 一部'
    });
    const csv = buildEmployeeRoleCsv([user], { exportTimestamp: fixedTs });
    expect(csv).toContain('"O\'Brien, ""Bob"""');
    expect(csv).toContain('"R&D, 一部"');
  });

  it('uses CRLF line endings', () => {
    const user = makeUser();
    const csv = buildEmployeeRoleCsv([user], { exportTimestamp: fixedTs });
    expect(csv).toMatch(/\r\n/);
  });
});

describe('buildCsvFileName', () => {
  it('produces YYYYMMDD-HHmm format', () => {
    const name = buildCsvFileName(new Date(2026, 4, 7, 10, 30));
    expect(name).toBe('員工權限總覽_20260507-1030.csv');
  });
});
