import { ScopeType, TenantUser, UserRole, UserStatus } from '../../tenant-admin/models/tenant-admin.model';

const CSV_HEADERS = [
  'employee_number',
  'name',
  'email',
  'department_name',
  'role_name',
  'scope_type',
  'scope_name',
  'account_status',
  'exported_at'
] as const;

const BOM = '﻿';

// 與矩陣 cell 顯示一致：global / group 視覺合併為「全集團」
// （避免與功能權限編輯範圍 company='全公司' 混淆）
const SCOPE_TYPE_CSV_LABEL: Record<ScopeType, string> = {
  global: '全集團',
  group: '全集團',
  subsidiary: '子公司',
  department: '部門'
};

const ACCOUNT_STATUS_CSV_LABEL: Record<UserStatus, string> = {
  active: '啟用',
  inactive: '停用',
  locked: '鎖定'
};

interface BuildOptions {
  exportTimestamp: Date;
}

export function buildEmployeeRoleCsv(
  employees: readonly TenantUser[],
  options: BuildOptions
): string {
  const ts = formatIsoTimestamp(options.exportTimestamp);
  const rows: string[] = [CSV_HEADERS.join(',')];

  for (const user of employees) {
    const baseFields = {
      employee_number: user.employee_no ?? '',
      name: user.name,
      email: user.email,
      department_name: user.department ?? '',
      account_status: user.status as UserStatus,
      exported_at: ts
    };

    if (!user.roles || user.roles.length === 0) {
      rows.push(buildRow(baseFields, null));
      continue;
    }

    for (const assignment of user.roles) {
      rows.push(buildRow(baseFields, assignment));
    }
  }

  return BOM + rows.join('\r\n') + '\r\n';
}

interface BaseFields {
  employee_number: string;
  name: string;
  email: string;
  department_name: string;
  account_status: UserStatus | string;
  exported_at: string;
}

function buildRow(base: BaseFields, assignment: UserRole | null): string {
  const cols = [
    escapeCsv(base.employee_number),
    escapeCsv(base.name),
    escapeCsv(base.email),
    escapeCsv(base.department_name),
    escapeCsv(assignment?.role_name ?? ''),
    escapeCsv(scopeTypeForCsv(assignment)),
    escapeCsv(scopeNameForCsv(assignment)),
    escapeCsv(accountStatusForCsv(base.account_status)),
    escapeCsv(base.exported_at)
  ];
  return cols.join(',');
}

function scopeTypeForCsv(assignment: UserRole | null): string {
  if (!assignment) return '';
  return SCOPE_TYPE_CSV_LABEL[assignment.scope_type] ?? assignment.scope_type;
}

function scopeNameForCsv(assignment: UserRole | null): string {
  if (!assignment) return '';
  // global / group 視為「全公司」一類，不再顯示具體錨點名稱（與矩陣 UI 一致）
  if (assignment.scope_type === 'global' || assignment.scope_type === 'group') return '';
  return assignment.scope_name ?? '';
}

function accountStatusForCsv(status: UserStatus | string): string {
  return ACCOUNT_STATUS_CSV_LABEL[status as UserStatus] ?? String(status);
}

function escapeCsv(value: string): string {
  if (value === null || value === undefined) return '';
  const needsQuoting = /[",\r\n]/.test(value);
  if (!needsQuoting) return value;
  return '"' + value.replace(/"/g, '""') + '"';
}

function formatIsoTimestamp(date: Date): string {
  return date.toISOString();
}

export function buildCsvFileName(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  return `員工權限總覽_${yyyy}${mm}${dd}-${hh}${mi}.csv`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function triggerCsvDownload(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
