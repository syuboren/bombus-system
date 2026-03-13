import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  computed,
  OnInit,
  ElementRef,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { switchMap, forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmployeeService } from '../../services/employee.service';
import { OnboardingService } from '../../services/onboarding.service';
import { OrgUnitService } from '../../../../core/services/org-unit.service';
import {
  Employee,
  EmployeeDetail,
  EmployeeStats,
  EmployeeDocument,
  AuditLog
} from '../../models/talent-pool.model';
import { Submission, UploadDocument } from '../../models/onboarding.model';
import * as echarts from 'echarts';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  @ViewChild('roiChart') roiChartRef!: ElementRef<HTMLDivElement>;

  private employeeService = inject(EmployeeService);
  private onboardingService = inject(OnboardingService);
  private notificationService = inject(NotificationService);
  private orgUnitService = inject(OrgUnitService);
  private destroyRef = inject(DestroyRef);

  private roiChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.roiChart?.resize();

  // State
  stats = signal<EmployeeStats | null>(null);
  employees = signal<Employee[]>([]);
  selectedEmployee = signal<EmployeeDetail | null>(null);
  expiringDocuments = signal<EmployeeDocument[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  departmentROI = signal<{ department: string; avgROI: number; employeeCount: number }[]>([]);
  
  // Onboarding Documents
  signatureSubmissions = signal<Submission[]>([]);
  uploadedDocuments = signal<UploadDocument[]>([]);

  // Filters
  searchQuery = signal<string>('');
  selectedDepartment = signal<string>('all');
  selectedStatus = signal<string>('all');

  // UI State
  loading = signal<boolean>(false);
  activeTab = signal<'info' | 'history' | 'documents' | 'training' | 'performance' | 'roi'>('info');

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

  selectedSubsidiaryId = signal<string>('');
  subsidiaries = this.orgUnitService.subsidiaries;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  constructor() {
    // 監聽子公司切換，自動重新載入員工資料
    toObservable(this.selectedSubsidiaryId).pipe(
      switchMap(orgUnitId => {
        this.loading.set(true);
        this.selectedEmployee.set(null);
        const id = orgUnitId || undefined;
        return forkJoin({
          stats: this.employeeService.getEmployeeStats(id),
          employees: this.employeeService.getEmployees(id)
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
    window.addEventListener('resize', this.resizeHandler);

    // 載入不受子公司篩選影響的資料
    this.employeeService.getExpiringDocuments().subscribe(docs => {
      this.expiringDocuments.set(docs);
    });
    this.employeeService.getDepartmentROI().subscribe(roi => {
      this.departmentROI.set(roi);
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.roiChart?.dispose();
  }

  loadData(): void {
    // 透過 re-emit selectedSubsidiaryId 觸發 constructor 的 reactive subscription
    this.selectedSubsidiaryId.set(this.selectedSubsidiaryId());
  }

  selectEmployee(employee: Employee): void {
    this.loading.set(true);
    this.activeTab.set('info');

    this.employeeService.getEmployeeById(employee.id).subscribe(detail => {
      this.selectedEmployee.set(detail || null);
      this.loading.set(false);

      if (detail) {
        this.employeeService.getAuditLogs(employee.id).subscribe(logs => {
          this.auditLogs.set(logs);
        });

        // Load onboarding documents
        this.onboardingService.getEmployeeSubmissions(employee.id).subscribe({
          next: (submissions) => this.signatureSubmissions.set(submissions),
          error: () => this.signatureSubmissions.set([])
        });

        this.onboardingService.getUploadedDocuments(employee.id).subscribe({
          next: (documents) => this.uploadedDocuments.set(documents),
          error: () => this.uploadedDocuments.set([])
        });

        // Initialize ROI chart after a brief delay to ensure DOM is ready
        setTimeout(() => this.initROIChart(), 100);
      }
    });
  }

  closeDetail(): void {
    this.selectedEmployee.set(null);
  }

  setActiveTab(tab: 'info' | 'history' | 'documents' | 'training' | 'performance' | 'roi'): void {
    this.activeTab.set(tab);
    if (tab === 'roi') {
      setTimeout(() => this.initROIChart(), 100);
    }
  }

  initROIChart(): void {
    const employee = this.selectedEmployee();
    if (!employee || !this.roiChartRef?.nativeElement) return;

    const roi = employee.roi;
    if (!roi) return;

    // 確保 echarts 容器有正確的尺寸
    const container = this.roiChartRef.nativeElement;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      // 延遲重試
      setTimeout(() => this.initROIChart(), 200);
      return;
    }

    // 銷毀舊的圖表實例
    if (this.roiChart) {
      this.roiChart.dispose();
    }
    
    this.roiChart = echarts.init(container);

    const currentRoi = Math.round(roi.roi || 0);
    const deptAvg = roi.comparison?.departmentAvg || 150;
    const companyAvg = roi.comparison?.companyAvg || 140;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['個人 ROI', '部門平均', '公司平均'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: ['2024 Q1', '2024 Q2', '2024 Q3', '2024 Q4'],
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: {
        type: 'value',
        name: 'ROI %',
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280' },
        splitLine: { lineStyle: { color: '#F5F5F7' } }
      },
      series: [
        {
          name: '個人 ROI',
          type: 'bar',
          data: [Math.round(currentRoi * 0.7), Math.round(currentRoi * 0.85), Math.round(currentRoi * 0.95), currentRoi],
          itemStyle: { color: '#8DA399' }
        },
        {
          name: '部門平均',
          type: 'line',
          data: [Math.round(deptAvg * 0.9), Math.round(deptAvg * 0.95), Math.round(deptAvg * 0.98), deptAvg],
          lineStyle: { color: '#7F9CA0' },
          itemStyle: { color: '#7F9CA0' }
        },
        {
          name: '公司平均',
          type: 'line',
          data: [Math.round(companyAvg * 0.9), Math.round(companyAvg * 0.95), Math.round(companyAvg * 0.98), companyAvg],
          lineStyle: { color: '#9A8C98', type: 'dashed' },
          itemStyle: { color: '#9A8C98' }
        }
      ]
    };

    this.roiChart.setOption(option);
  }

  exportEmployeeData(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.employeeService.exportEmployeeData(employee.id).subscribe(() => {
      this.notificationService.success('員工資料已匯出');
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': '在職',
      'probation': '試用期',
      'leave': '留職停薪',
      'resigned': '已離職',
      'terminated': '資遣'
    };
    return labels[status] || status;
  }

  /**
   * 格式化職等顯示
   * grade 值為 1-7，顯示為 "Grade X"
   */
  getGradeDisplay(grade: string | number | undefined): string {
    if (!grade) return '-';
    const gradeNum = typeof grade === 'string' ? parseInt(grade, 10) : grade;
    if (isNaN(gradeNum)) return grade?.toString() || '-';
    return `Grade ${gradeNum}`;
  }

  getDocumentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'valid': '有效',
      'expiring': '即將到期',
      'expired': '已過期',
      'pending': '待審核'
    };
    return labels[status] || status;
  }

  getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'contract': '勞動契約',
      'certificate': '證照/證書',
      'id': '身分證明',
      'insurance': '保險文件',
      'tax': '稅務文件',
      'other': '其他'
    };
    return labels[type] || type;
  }

  getChangeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'promotion': '晉升',
      'transfer': '調動',
      'demotion': '降級',
      'title-change': '職稱變更',
      'salary-adjustment': '薪資調整'
    };
    return labels[type] || type;
  }

  getGradeLabel(grade: string): string {
    const labels: Record<string, string> = {
      'A': '優秀',
      'B': '良好',
      'C': '合格',
      'D': '待改善',
      'E': '不合格'
    };
    return labels[grade] || grade;
  }

  getAuditActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'create': '新增',
      'update': '更新',
      'delete': '刪除',
      'view': '查看',
      'export': '匯出'
    };
    return labels[action] || action;
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW');
  }

  formatDateTime(date: Date | string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleString('zh-TW');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      maximumFractionDigits: 0
    }).format(amount);
  }

  getSubmissionStatusLabel(submission: Submission): string {
    // 優先使用 approval_status（審核狀態）
    if (submission.approval_status) {
      const approvalLabels: Record<string, string> = {
        'PENDING': '審核中',
        'APPROVED': '已核准',
        'REJECTED': '已退回'
      };
      return approvalLabels[submission.approval_status] || submission.approval_status;
    }

    // 如果沒有 approval_status，使用簽署狀態
    const statusLabels: Record<string, string> = {
      'DRAFT': '待填寫',
      'SIGNED': '已簽署',
      'COMPLETED': '已完成'
    };
    return statusLabels[submission.status] || submission.status;
  }

  getSubmissionStatusClass(submission: Submission): string {
    // 優先使用 approval_status（審核狀態）
    if (submission.approval_status) {
      const approvalClasses: Record<string, string> = {
        'PENDING': 'status-pending',
        'APPROVED': 'status-approved',
        'REJECTED': 'status-rejected'
      };
      return approvalClasses[submission.approval_status] || '';
    }

    // 如果沒有 approval_status，使用簽署狀態
    const statusClasses: Record<string, string> = {
      'DRAFT': 'status-draft',
      'SIGNED': 'status-submitted',
      'COMPLETED': 'status-approved'
    };
    return statusClasses[submission.status] || '';
  }

  getUploadTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'id_card': '身分證件',
      'bank_account': '銀行帳戶',
      'health_report': '體檢報告',
      'photo': '大頭照',
      'education_cert': '學經歷證明',
      'other': '其他文件'
    };
    return labels[type] || type;
  }

  downloadSignedDocument(submission: Submission): void {
    if (submission.status !== 'SIGNED' && submission.status !== 'COMPLETED') {
      this.notificationService.error('文件尚未簽署完成');
      return;
    }
    // 使用 token 打開簽署頁面，用戶可以在該頁面使用瀏覽器列印功能存為 PDF
    const viewUrl = `/employee/onboarding/sign/${submission.token}`;
    window.open(viewUrl, '_blank');
    this.notificationService.info('請在開啟的頁面中使用瀏覽器列印功能（Ctrl+P / Cmd+P）存為 PDF');
  }

  viewSignedDocument(submission: Submission): void {
    if (submission.status !== 'SIGNED' && submission.status !== 'COMPLETED') {
      this.notificationService.error('文件尚未簽署完成');
      return;
    }
    // 使用 token 打開簽署頁面的閱覽模式
    const viewUrl = `/employee/onboarding/sign/${submission.token}`;
    window.open(viewUrl, '_blank');
  }

  downloadUploadedDocument(document: UploadDocument): void {
    if (!document.fileUrl) {
      this.notificationService.error('文件不存在');
      return;
    }
    window.open(document.fileUrl, '_blank');
  }

  viewUploadedDocument(document: UploadDocument): void {
    if (!document.fileUrl) {
      this.notificationService.error('文件不存在');
      return;
    }
    window.open(document.fileUrl, '_blank');
  }
}
