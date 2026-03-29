import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  computed,
  OnInit
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
  CreateEmployeeRequest
} from '../../../../shared/models/employee.model';

type ViewMode = 'card' | 'list';

@Component({
  selector: 'app-employee-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, EmployeeDetailComponent, AccountPermissionComponent],
  templateUrl: './employee-management-page.component.html',
  styleUrl: './employee-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeManagementPageComponent implements OnInit {
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
    this.showBatchModal.set(true);
  }

  closeBatchModal(): void {
    this.showBatchModal.set(false);
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
