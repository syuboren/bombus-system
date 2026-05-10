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
import { switchMap, forkJoin, of, debounceTime, distinctUntilChanged } from 'rxjs';
import type { EmployeeListResult } from '../../services/employee.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { EmployeeDetailComponent } from '../../../../shared/components/employee-detail/employee-detail.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmployeeService } from '../../services/employee.service';
import { OrgUnitService } from '../../../../core/services/org-unit.service';
import { FeatureGateService } from '../../../../core/services/feature-gate.service';
import {
  UnifiedEmployee,
  EmployeeStats
} from '../../../../shared/models/employee.model';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, EmployeeDetailComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private notificationService = inject(NotificationService);
  private orgUnitService = inject(OrgUnitService);
  private destroyRef = inject(DestroyRef);
  private featureGateService = inject(FeatureGateService);

  // Module color for shared component
  readonly moduleColor = '#8DA399'; // L1 sage

  // Permission check
  readonly canEdit = computed(() => this.featureGateService.canEdit('L1.profile'));
  readonly viewScope = computed(() => this.featureGateService.getFeaturePerm('L1.profile')?.view_scope || 'company');

  // Data
  stats = signal<EmployeeStats | null>(null);
  employees = signal<UnifiedEmployee[]>([]);
  expiringDocuments = signal<any[]>([]);
  departmentROI = signal<{ department: string; avgROI: number; employeeCount: number }[]>([]);
  loading = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  selectedDepartment = signal<string>('all');
  selectedStatus = signal<string>('all');

  // Org filters
  selectedSubsidiaryId = signal<string>(
    this.featureGateService.getFeaturePerm('L1.profile')?.view_scope === 'self'
      ? ''
      : (this.orgUnitService.lockedSubsidiaryId() || '')
  );
  subsidiaries = this.orgUnitService.visibleSubsidiaries;
  isSubsidiaryLocked = this.orgUnitService.isSubsidiaryLocked;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Employee detail modal
  selectedEmployeeId = signal<string | null>(null);
  showDetailModal = signal(false);

  // employee-list-pagination (D-13): 伺服端分頁/搜尋/排序
  listPage = signal(1);
  listPageSize = signal(20);
  listSort = signal<'name' | 'hire_date' | 'employee_no' | 'department' | null>(null);
  listOrder = signal<'asc' | 'desc'>('asc');
  listResult = signal<EmployeeListResult | null>(null);
  listLoading = signal(false);
  readonly listPageSizeOptions = [20, 50, 100, 200] as const;

  constructor() {
    // 既有 stats + employees full load（給側欄/dashboard 用）
    toObservable(this.selectedSubsidiaryId).pipe(
      switchMap(orgUnitId => {
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

    // employee-list-pagination (D-13): 員工列表伺服端分頁，debounce 300ms 合併連續打字
    toObservable(computed(() => ({
      page: this.listPage(),
      pageSize: this.listPageSize(),
      sort: this.listSort(),
      order: this.listOrder(),
      search: this.searchQuery(),
      dept: this.selectedDepartment(),
      status: this.selectedStatus(),
      orgUnitId: this.selectedSubsidiaryId()
    }))).pipe(
      debounceTime(300),
      distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
      switchMap(state => {
        this.listLoading.set(true);
        return this.employeeService.getEmployeesPaginated({
          page: state.page,
          pageSize: state.pageSize,
          sort: state.sort ?? undefined,
          order: state.order,
          search: state.search || undefined,
          dept: state.dept !== 'all' ? state.dept : undefined,
          status: state.status !== 'all' ? state.status : undefined,
          orgUnitId: state.orgUnitId || undefined
        });
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(result => {
      this.listResult.set(result);
      this.listLoading.set(false);
    });
  }

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe();

    this.employeeService.getExpiringDocuments().subscribe(docs => {
      this.expiringDocuments.set(docs);
    });
    this.employeeService.getDepartmentROI().subscribe(roi => {
      this.departmentROI.set(roi);
    });
  }

  // ===== Employee Detail =====

  selectEmployee(employee: UnifiedEmployee): void {
    this.selectedEmployeeId.set(employee.id);
    this.showDetailModal.set(true);
  }

  closeDetail(): void {
    this.showDetailModal.set(false);
    this.selectedEmployeeId.set(null);
  }

  onEmployeeUpdated(): void {
    this.selectedSubsidiaryId.set(this.selectedSubsidiaryId());
  }

  // ===== employee-list-pagination (D-13) =====

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.listPage.set(1);
  }

  onDeptChange(value: string): void {
    this.selectedDepartment.set(value);
    this.listPage.set(1);
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value);
    this.listPage.set(1);
  }

  toggleListSort(column: 'name' | 'hire_date' | 'employee_no' | 'department'): void {
    if (this.listSort() === column) {
      this.listOrder.set(this.listOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.listSort.set(column);
      this.listOrder.set('asc');
    }
    this.listPage.set(1);
  }

  onListPageSizeChange(size: number): void {
    this.listPageSize.set(size);
    this.listPage.set(1);
  }

  goToListPage(page: number): void {
    const total = this.listResult()?.totalPages ?? 0;
    if (page >= 1 && page <= total) {
      this.listPage.set(page);
    }
  }

  getListPageNumbers(): number[] {
    const total = this.listResult()?.totalPages ?? 0;
    const current = this.listPage();
    const pages: number[] = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else if (current <= 4) {
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
    return pages;
  }

  // ===== Helpers (for list view only) =====

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': '在職', 'probation': '試用期', 'leave': '留職停薪',
      'on_leave': '留職停薪', 'resigned': '已離職', 'terminated': '資遣'
    };
    return labels[status] || status;
  }

  getGradeDisplay(grade: string | number | undefined): string {
    if (!grade) return '-';
    const n = typeof grade === 'string' ? parseInt(grade, 10) : grade;
    if (isNaN(n)) return grade?.toString() || '-';
    return `Grade ${n}`;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW');
  }

  getTenure(hireDate: Date | string | undefined): string {
    if (!hireDate) return '—';
    const start = new Date(hireDate);
    const now = new Date();
    const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years > 0 && months > 0) return `${years}年${months}個月`;
    if (years > 0) return `${years}年`;
    if (months > 0) return `${months}個月`;
    return '不到1個月';
  }

  getDocumentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'valid': '有效', 'expiring': '即將到期', 'expired': '已過期', 'pending': '待審核'
    };
    return labels[status] || status;
  }
}
