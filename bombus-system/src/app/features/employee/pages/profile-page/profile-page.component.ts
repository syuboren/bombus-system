import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  ElementRef,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmployeeService } from '../../services/employee.service';
import {
  Employee,
  EmployeeDetail,
  EmployeeStats,
  EmployeeDocument,
  AuditLog
} from '../../models/talent-pool.model';
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
  private notificationService = inject(NotificationService);

  private roiChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.roiChart?.resize();

  // State
  stats = signal<EmployeeStats | null>(null);
  employees = signal<Employee[]>([]);
  selectedEmployee = signal<EmployeeDetail | null>(null);
  expiringDocuments = signal<EmployeeDocument[]>([]);
  auditLogs = signal<AuditLog[]>([]);
  departmentROI = signal<{ department: string; avgROI: number; employeeCount: number }[]>([]);

  // Filters
  searchQuery = signal<string>('');
  selectedDepartment = signal<string>('all');
  selectedStatus = signal<string>('all');

  // UI State
  loading = signal<boolean>(false);
  activeTab = signal<'info' | 'history' | 'documents' | 'performance' | 'roi'>('info');

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

  departments = computed(() => {
    const depts = new Set(this.employees().map(e => e.department));
    return Array.from(depts);
  });

  ngOnInit(): void {
    this.loadData();
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.roiChart?.dispose();
  }

  loadData(): void {
    this.loading.set(true);

    this.employeeService.getEmployeeStats().subscribe(stats => {
      this.stats.set(stats);
    });

    this.employeeService.getEmployees().subscribe(employees => {
      this.employees.set(employees);
      this.loading.set(false);
    });

    this.employeeService.getExpiringDocuments().subscribe(docs => {
      this.expiringDocuments.set(docs);
    });

    this.employeeService.getDepartmentROI().subscribe(roi => {
      this.departmentROI.set(roi);
    });
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

        // Initialize ROI chart after a brief delay to ensure DOM is ready
        setTimeout(() => this.initROIChart(), 100);
      }
    });
  }

  closeDetail(): void {
    this.selectedEmployee.set(null);
  }

  setActiveTab(tab: 'info' | 'history' | 'documents' | 'performance' | 'roi'): void {
    this.activeTab.set(tab);
    if (tab === 'roi') {
      setTimeout(() => this.initROIChart(), 100);
    }
  }

  initROIChart(): void {
    const employee = this.selectedEmployee();
    if (!employee || !this.roiChartRef?.nativeElement) return;

    if (!this.roiChart) {
      this.roiChart = echarts.init(this.roiChartRef.nativeElement);
    }

    const roi = employee.roi;
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
          data: [180, 210, 235, roi.roi],
          itemStyle: { color: '#8DA399' }
        },
        {
          name: '部門平均',
          type: 'line',
          data: [165, 170, 175, roi.comparison.departmentAvg],
          lineStyle: { color: '#7F9CA0' },
          itemStyle: { color: '#7F9CA0' }
        },
        {
          name: '公司平均',
          type: 'line',
          data: [150, 155, 160, roi.comparison.companyAvg],
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

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW');
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('zh-TW');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      maximumFractionDigits: 0
    }).format(amount);
  }
}
