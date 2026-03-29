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

  // Computed
  filteredEmployees = computed(() => {
    let result = this.employees();
    const query = this.searchQuery().toLowerCase();
    const department = this.selectedDepartment();
    const status = this.selectedStatus();

    if (query) {
      result = result.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.employeeNo.toLowerCase().includes(query) ||
        e.position.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query)
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

  constructor() {
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

  getDocumentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'valid': '有效', 'expiring': '即將到期', 'expired': '已過期', 'pending': '待審核'
    };
    return labels[status] || status;
  }
}
