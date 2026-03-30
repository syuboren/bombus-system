import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, forkJoin } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { EmployeeDetailComponent } from '../../../../shared/components/employee-detail/employee-detail.component';
import { AccountPermissionComponent } from '../../../../shared/components/account-permission/account-permission.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { CompetencyService } from '../../../competency/services/competency.service';
import { OrgUnitService } from '../../../../core/services/org-unit.service';
import { FeatureGateService } from '../../../../core/services/feature-gate.service';
import {
  UnifiedEmployee,
  EmployeeStats,
  CreateEmployeeRequest,
  BatchImportRow,
  BatchValidationResult,
  BatchImportJob,
  BatchImportResult
} from '../../../../shared/models/employee.model';

type ViewMode = 'card' | 'list';
type BatchStep = 'upload' | 'validating' | 'preview' | 'importing' | 'complete';

// 中文欄位名 → 內部欄位名（自動處理 (*) 必填標記）
const CSV_HEADER_BASE: Record<string, keyof BatchImportRow> = {
  '姓名': 'name', '電子郵件': 'email', 'Email': 'email',
  '工號': 'employee_no', '子公司': 'subsidiary', '部門': 'department',
  '到職日期': 'hire_date', '職等': 'grade', '職級': 'level', '職稱': 'position',
  '英文姓名': 'english_name', '電話': 'phone', '手機': 'mobile',
  '性別': 'gender', '出生日期': 'birth_date',
  '合約類型': 'contract_type', '工作地點': 'work_location',
  '地址': 'address', '緊急聯絡人': 'emergency_contact_name',
  '緊急聯絡人關係': 'emergency_contact_relation', '緊急聯絡人電話': 'emergency_contact_phone',
  '主管工號': 'manager_no'
};

function resolveHeader(raw: string): keyof BatchImportRow | undefined {
  const clean = raw.replace(/\(\*\)$/, '').trim();
  return CSV_HEADER_BASE[clean] || CSV_HEADER_BASE[raw];
}

@Component({
  selector: 'app-employee-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, EmployeeDetailComponent, AccountPermissionComponent],
  templateUrl: './employee-management-page.component.html',
  styleUrl: './employee-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeManagementPageComponent implements OnInit, OnDestroy {
  private employeeService = inject(EmployeeService);
  private orgUnitService = inject(OrgUnitService);
  private featureGateService = inject(FeatureGateService);
  private notificationService = inject(NotificationService);
  private competencyService = inject(CompetencyService);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);

  // Module color for shared component
  readonly moduleColor = '#8DA399'; // L1 sage

  // Permission
  readonly canEdit = computed(() => this.featureGateService.canEdit('L1.profile'));

  // Data
  stats = signal<EmployeeStats | null>(null);
  employees = signal<UnifiedEmployee[]>([]);
  loading = signal(true);

  // Org filters
  selectedSubsidiaryId = signal<string>(
    this.featureGateService.getFeaturePerm('L1.profile')?.view_scope === 'self'
      ? ''
      : (this.orgUnitService.lockedSubsidiaryId() || '')
  );
  subsidiaries = this.orgUnitService.visibleSubsidiaries;
  isSubsidiaryLocked = this.orgUnitService.isSubsidiaryLocked;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Filters
  searchKeyword = signal<string>('');
  selectedDepartment = signal<string>('all');
  statusFilter = signal<string>('all');

  // View mode
  viewMode = signal<ViewMode>('list');

  // Employee detail modal
  selectedEmployeeId = signal<string | null>(null);
  showDetailModal = signal(false);

  // Account permission modal
  showAccountModal = signal(false);
  accountEmployee = signal<UnifiedEmployee | null>(null);

  // Create account result
  createAccountResult = signal<{ employeeName: string; password: string } | null>(null);

  // Add employee modal
  showAddModal = signal(false);
  addForm = signal<Partial<CreateEmployeeRequest>>({});
  addLoading = signal(false);
  addResult = signal<{ initialPassword: string | null } | null>(null);

  // Add form dropdown options
  addSubsidiaries = this.orgUnitService.subsidiaries;
  addSelectedSubsidiary = signal('');
  addDepartments = signal<{ id: string; name: string }[]>([]);
  addGrades = signal<{ grade: number; title: string }[]>([]);
  addLevels = signal<{ code: string }[]>([]);
  addPositions = signal<{ title: string }[]>([]);

  // Refresh trigger to force reload (signal same-value won't re-emit)
  private refreshTrigger = signal(0);

  // Batch import
  showBatchModal = signal(false);
  batchStep = signal<BatchStep>('upload');
  parsedRows = signal<BatchImportRow[]>([]);
  validationResult = signal<BatchValidationResult | null>(null);
  importJobId = signal<string | null>(null);
  importJob = signal<BatchImportJob | null>(null);
  importResults = signal<BatchImportResult[]>([]);
  selectedFile = signal<string>('');
  batchFileError = signal<string>('');
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  // Pagination
  currentPage = signal(1);
  pageSize = signal(12);

  // Filtered employees
  filteredEmployees = computed(() => {
    let result = this.employees();
    const keyword = this.searchKeyword().toLowerCase();
    const department = this.selectedDepartment();
    const status = this.statusFilter();

    if (keyword) {
      result = result.filter(e =>
        e.name.toLowerCase().includes(keyword) ||
        e.employeeNo.toLowerCase().includes(keyword) ||
        e.email.toLowerCase().includes(keyword) ||
        (e.englishName && e.englishName.toLowerCase().includes(keyword))
      );
    }

    if (department !== 'all') {
      result = result.filter(e => e.department === department);
    }

    if (status !== 'all') {
      result = result.filter(e => e.status === status);
    }

    return result;
  });

  // Paginated
  paginatedEmployees = computed(() => {
    const all = this.filteredEmployees();
    const start = (this.currentPage() - 1) * this.pageSize();
    return all.slice(start, start + this.pageSize());
  });

  totalPages = computed(() => Math.ceil(this.filteredEmployees().length / this.pageSize()));

  constructor() {
    // Reload employees when subsidiary changes or refresh triggered
    toObservable(computed(() => ({
      orgUnitId: this.selectedSubsidiaryId(),
      _refresh: this.refreshTrigger()
    }))).pipe(
      switchMap(({ orgUnitId }) => {
        this.loading.set(true);
        const id = orgUnitId || undefined;
        return forkJoin({
          stats: this.employeeService.getEmployeeStats(id),
          employees: this.employeeService.getUnifiedEmployees(id)
        });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ stats, employees }) => {
      this.stats.set(stats);
      this.employees.set(employees);
      this.loading.set(false);
    });
  }

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe();

    // Handle ?userId deep link
    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      if (params['userId']) {
        this.openDetailByUserId(params['userId']);
      }
    });
  }

  // ===== Employee Detail =====

  selectEmployee(employee: UnifiedEmployee): void {
    this.selectedEmployeeId.set(employee.id);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedEmployeeId.set(null);
  }

  openAccountModal(employee: UnifiedEmployee): void {
    if (!employee.userId) {
      this.notificationService.error('此員工尚未建立系統帳號');
      return;
    }
    this.accountEmployee.set(employee);
    this.showAccountModal.set(true);
  }

  closeAccountModal(): void {
    this.showAccountModal.set(false);
    this.accountEmployee.set(null);
  }

  createAccountForEmployee(employee: UnifiedEmployee): void {
    this.employeeService.createAccountForEmployee(employee.id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.createAccountResult.set({ employeeName: employee.name, password: result.initialPassword });
        this.notificationService.success(`已為 ${employee.name} 建立帳號`);
        this.onEmployeeUpdated();
      },
      error: (err) => {
        this.notificationService.error(err.message || '建立帳號失敗');
      }
    });
  }

  dismissAccountResult(): void {
    this.createAccountResult.set(null);
  }

  onEmployeeUpdated(): void {
    this.refreshTrigger.update(v => v + 1);
  }

  private openDetailByUserId(userId: string): void {
    // Find employee by userId
    const emp = this.employees().find(e => e.userId === userId);
    if (emp) {
      this.selectedEmployeeId.set(emp.id);
      this.showDetailModal.set(true);
    }
  }

  // ===== Add Employee =====

  openAddModal(): void {
    this.addForm.set({});
    this.addResult.set(null);
    this.addSelectedSubsidiary.set('');
    this.addDepartments.set([]);
    this.addLevels.set([]);
    this.showAddModal.set(true);

    // 載入職等和職位
    this.competencyService.getGradeMatrixFromAPI().subscribe(grades => {
      this.addGrades.set(grades.map(g => ({ grade: g.grade, title: `Grade ${g.grade}` })));
    });
    // 職位會在選擇部門+職等後載入
    this.addPositions.set([]);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.addForm.set({});
    this.addResult.set(null);
  }

  onAddSubsidiaryChange(subId: string): void {
    this.addSelectedSubsidiary.set(subId);
    this.updateAddForm('org_unit_id', subId);
    this.updateAddForm('department', '');
    this.updateAddForm('position', '');
    const depts = this.orgUnitService.filterDepartments(subId);
    this.addDepartments.set(depts.map(d => ({ id: d.id, name: d.name })));
    this.addPositions.set([]);
  }

  onAddDepartmentChange(dept: string): void {
    this.updateAddForm('department', dept);
    this.updateAddForm('position', '');
    this.loadAddPositions();
  }

  onAddGradeChange(grade: string): void {
    this.updateAddForm('grade', grade);
    this.updateAddForm('level', '');
    this.updateAddForm('position', '');
    this.addLevels.set([]);
    if (grade) {
      const g = parseInt(grade, 10);
      if (!isNaN(g)) {
        this.competencyService.getGradeDetail(g).subscribe({
          next: (detail: any) => {
            const codes = (detail?.salaryLevels || []).map((s: any) => ({ code: s.code }));
            this.addLevels.set(codes);
          },
          error: () => this.addLevels.set([])
        });
      }
    }
    this.loadAddPositions();
  }

  private loadAddPositions(): void {
    const form = this.addForm();
    const dept = form.department || undefined;
    const grade = form.grade ? parseInt(form.grade, 10) : undefined;
    const orgId = this.addSelectedSubsidiary() || 'org-root';
    this.competencyService.getPositions(dept, grade, orgId).subscribe(positions => {
      const unique = [...new Set(positions.map((p: any) => p.title as string))];
      this.addPositions.set(unique.map(t => ({ title: t })));
    });
  }

  submitAddEmployee(): void {
    const form = this.addForm();
    if (!form.name || !form.email || !form.employee_no || !form.department ||
        !form.position || !form.level || !form.grade || !form.hire_date) {
      this.notificationService.error('請填寫所有必填欄位');
      return;
    }

    this.addLoading.set(true);
    this.employeeService.createEmployee(form as CreateEmployeeRequest).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.addLoading.set(false);
        this.addResult.set({ initialPassword: result.initialPassword });
        this.notificationService.success(`員工 ${form.name} 已建立`);
        this.onEmployeeUpdated();
      },
      error: (err) => {
        this.addLoading.set(false);
        this.notificationService.error(err.message || '建立員工失敗');
      }
    });
  }

  updateAddForm(field: string, value: string): void {
    this.addForm.set({ ...this.addForm(), [field]: value });
  }

  // ===== Batch Import =====

  openBatchModal(): void {
    this.batchStep.set('upload');
    this.parsedRows.set([]);
    this.validationResult.set(null);
    this.importJobId.set(null);
    this.importJob.set(null);
    this.importResults.set([]);
    this.selectedFile.set('');
    this.batchFileError.set('');
    this.showBatchModal.set(true);
  }

  closeBatchModal(): void {
    this.clearPolling();
    this.showBatchModal.set(false);
  }

  ngOnDestroy(): void {
    this.clearPolling();
  }

  private clearPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.processFile(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files?.[0]) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  private processFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.batchFileError.set('僅支援 CSV 格式');
      this.parsedRows.set([]);
      this.selectedFile.set('');
      return;
    }
    this.batchFileError.set('');
    this.selectedFile.set(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = this.parseCsv(text);
      this.parsedRows.set(rows);
    };
    reader.readAsText(file, 'UTF-8');
  }

  private parseCsv(text: string): BatchImportRow[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^\uFEFF/, ''));
    const fieldNames = headers.map(h => resolveHeader(h) || h as keyof BatchImportRow);

    const rows: BatchImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      // 跳過說明行（以「必填:」或「選填」開頭的行）
      if (values[0]?.startsWith('必填') || values[0]?.startsWith('選填')) continue;
      const row: Record<string, string> = {};
      fieldNames.forEach((field, idx) => {
        row[field] = values[idx] || '';
      });
      // 手機前導零修復（Excel 會將 0912345678 存為 912345678）
      if (row['mobile'] && /^\d{9}$/.test(row['mobile'])) row['mobile'] = '0' + row['mobile'];
      if (row['phone'] && /^\d{9}$/.test(row['phone'])) row['phone'] = '0' + row['phone'];
      rows.push(row as unknown as BatchImportRow);
    }
    return rows;
  }

  downloadTemplate(): void {
    const headers = [
      '姓名(*)', '電子郵件(*)', '工號(*)', '子公司(*)', '部門(*)',
      '到職日期(*)', '職等(*)', '職級(*)', '職稱(*)',
      '英文姓名', '電話', '手機', '性別', '出生日期', '合約類型', '工作地點',
      '地址', '緊急聯絡人', '緊急聯絡人關係', '緊急聯絡人電話', '主管工號'
    ];
    const instructions = [
      '必填:中文全名', '必填:Email格式', '必填:唯一工號', '必填:需與組織架構一致', '必填:需存在於該子公司下',
      '必填:YYYY-MM-DD或YYYY/MM/DD', '必填:數字如2(Grade 2)', '必填:薪資代碼如BS02(需在該職等內)', '必填:如工程師',
      '選填', '選填:如02-12345678', '選填:如0912345678', '選填:男/女/其他', '選填:YYYY-MM-DD或YYYY/MM/DD',
      '選填:全職/兼職/約聘/實習', '選填', '選填:通訊地址', '選填:姓名', '選填:如配偶/父母', '選填:電話', '選填:主管工號'
    ];
    const example = [
      '王小明', 'ming@company.com', 'EMP001', 'Demo集團', '工程部',
      '2026-01-15', '2', 'BS02', '工程師',
      'Ming Wang', '02-12345678', '0912345678', '男', '1990-05-20', '全職', '台北',
      '台北市信義區信義路100號', '王大明', '配偶', '0922333444', ''
    ];
    const csv = '\uFEFF' + headers.join(',') + '\n' + instructions.join(',') + '\n' + example.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '員工批次匯入範本.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  startValidation(): void {
    this.batchStep.set('validating');
    this.employeeService.batchImportValidate(this.parsedRows()).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.validationResult.set(result);
        this.batchStep.set('preview');
      },
      error: (err) => {
        this.notificationService.error(err.message || '驗證失敗');
        this.batchStep.set('upload');
      }
    });
  }

  confirmImport(): void {
    this.batchStep.set('importing');
    this.employeeService.batchImportExecute(this.parsedRows(), this.selectedFile()).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.importJobId.set(result.jobId);
        this.startPolling(result.jobId);
      },
      error: (err) => {
        this.notificationService.error(err.message || '匯入啟動失敗');
        this.batchStep.set('preview');
      }
    });
  }

  private startPolling(jobId: string): void {
    this.clearPolling();
    this.pollingInterval = setInterval(() => {
      this.employeeService.batchImportStatus(jobId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: (job) => {
          this.importJob.set(job);
          if (job.status === 'completed' || job.status === 'failed') {
            this.clearPolling();
            this.loadImportReport(jobId);
          }
        },
        error: () => this.clearPolling()
      });
    }, 2000);
  }

  private loadImportReport(jobId: string): void {
    this.employeeService.batchImportReport(jobId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (results) => {
        this.importResults.set(results);
        this.batchStep.set('complete');
        this.onEmployeeUpdated();
      },
      error: () => {
        this.batchStep.set('complete');
      }
    });
  }

  resetBatchUpload(): void {
    this.batchStep.set('upload');
    this.parsedRows.set([]);
    this.validationResult.set(null);
    this.selectedFile.set('');
    this.batchFileError.set('');
  }

  downloadReport(): void {
    const results = this.importResults();
    if (results.length === 0) return;

    const headers = ['行號', '姓名', 'Email', '工號', '狀態', '初始密碼', '錯誤訊息'];
    const lines = results.map(r =>
      [r.rowNumber, r.employeeName || '', r.email || '', r.employeeNo || '', r.status === 'success' ? '成功' : '失敗', r.initialPassword || '', r.errorMessage || ''].join(',')
    );
    const csv = '\uFEFF' + headers.join(',') + '\n' + lines.join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `匯入報告_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== Filters =====

  onSearch(keyword: string): void {
    this.searchKeyword.set(keyword);
    this.currentPage.set(1);
  }

  onDepartmentChange(dept: string): void {
    this.selectedDepartment.set(dept);
    this.currentPage.set(1);
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // ===== Helpers =====

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': '在職', 'probation': '試用期', 'leave': '留職停薪',
      'on_leave': '留職停薪', 'resigned': '已離職', 'terminated': '資遣'
    };
    return labels[status] || status;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW');
  }

  getGenderLabel(val: string | undefined): string {
    const map: Record<string, string> = { 'male': '男', 'female': '女', 'other': '其他' };
    return val ? (map[val] || val) : '-';
  }

  getContractLabel(val: string | undefined): string {
    const map: Record<string, string> = { 'full-time': '全職', 'part-time': '兼職', 'contract': '約聘', 'intern': '實習' };
    return val ? (map[val] || val) : '-';
  }

  getDocumentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'valid': '有效', 'expiring': '即將到期', 'expired': '已過期', 'pending': '待審核'
    };
    return labels[status] || status;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }
    return pages;
  }
}
