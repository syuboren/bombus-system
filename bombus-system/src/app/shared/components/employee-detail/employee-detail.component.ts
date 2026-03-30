import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  input,
  output,
  effect,
  ElementRef,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { EmployeeService } from '../../../features/employee/services/employee.service';
import { OnboardingService } from '../../../features/employee/services/onboarding.service';
import { OrgUnitService } from '../../../core/services/org-unit.service';
import { CompetencyService } from '../../../features/competency/services/competency.service';
import {
  UnifiedEmployeeDetail,
  AuditLog
} from '../../models/employee.model';
import { Submission, UploadDocument } from '../../../features/employee/models/onboarding.model';
import * as echarts from 'echarts';

export type EmployeeDetailTab = 'info' | 'history' | 'documents' | 'training' | 'performance' | 'roi';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './employee-detail.component.html',
  styleUrl: './employee-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeDetailComponent implements OnDestroy {
  @ViewChild('roiChart') roiChartRef!: ElementRef<HTMLDivElement>;

  // ===== Inputs / Outputs =====
  readonly employeeId = input.required<string>();
  readonly readonly = input<boolean>(true);
  readonly moduleColor = input<string>('#8DA399');

  readonly employeeUpdated = output<void>();

  // ===== Services =====
  private employeeService = inject(EmployeeService);
  private onboardingService = inject(OnboardingService);
  private notificationService = inject(NotificationService);
  private orgUnitService = inject(OrgUnitService);
  private competencyService = inject(CompetencyService);
  private destroyRef = inject(DestroyRef);

  // ===== State =====
  employee = signal<UnifiedEmployeeDetail | null>(null);
  auditLogs = signal<AuditLog[]>([]);
  signatureSubmissions = signal<Submission[]>([]);
  uploadedDocuments = signal<UploadDocument[]>([]);
  loading = signal<boolean>(false);
  activeTab = signal<EmployeeDetailTab>('info');

  // Edit mode state
  editing = signal(false);
  editForm = signal<Record<string, any>>({});
  saving = signal(false);

  // Dropdown options for edit mode
  departmentOptions = signal<{ id: string; name: string }[]>([]);
  gradeOptions = signal<{ grade: number; title: string }[]>([]);
  levelOptions = signal<{ code: string }[]>([]);
  positionOptions = signal<{ title: string }[]>([]);
  managerOptions = signal<{ id: string; name: string; position: string }[]>([]);
  employeeSubsidiary = signal<string>('');

  // ROI chart
  private roiChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.roiChart?.resize();

  constructor() {
    effect(() => {
      const id = this.employeeId();
      if (id) {
        this.loadEmployeeData(id);
      }
    }, { allowSignalWrites: true });

    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.roiChart?.dispose();
  }

  // ===== Data Loading =====

  private loadEmployeeData(id: string): void {
    this.loading.set(true);
    this.activeTab.set('info');

    this.employeeService.getUnifiedEmployeeById(id).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (detail) => {
        this.employee.set(detail);
        this.loading.set(false);

        this.employeeService.getAuditLogs(id).subscribe(logs => {
          this.auditLogs.set(logs);
        });

        this.onboardingService.getEmployeeSubmissions(id).subscribe({
          next: (submissions) => this.signatureSubmissions.set(submissions),
          error: () => this.signatureSubmissions.set([])
        });

        this.onboardingService.getUploadedDocuments(id).subscribe({
          next: (documents) => this.uploadedDocuments.set(documents),
          error: () => this.uploadedDocuments.set([])
        });

        setTimeout(() => this.initROIChart(), 100);
      },
      error: () => {
        this.employee.set(null);
        this.loading.set(false);
        this.notificationService.error('無法載入員工資料');
      }
    });
  }

  // ===== Tab Management =====

  setActiveTab(tab: EmployeeDetailTab): void {
    this.activeTab.set(tab);
    if (tab === 'roi') {
      setTimeout(() => this.initROIChart(), 100);
    }
  }

  // ===== Edit Mode =====

  startEdit(): void {
    const emp = this.employee();
    if (!emp) return;
    this.editForm.set({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      mobile: emp.mobile || '',
      position: emp.position,
      department: emp.department,
      level: emp.level,
      grade: emp.grade,
      contract_type: emp.contractType,
      work_location: emp.workLocation || '',
      status: emp.status,
      english_name: emp.englishName || '',
      gender: emp.gender || 'other',
      manager_id: emp.managerId || '',
      emergency_contact_name: emp.emergencyContact?.name || '',
      emergency_contact_relation: emp.emergencyContact?.relation || '',
      emergency_contact_phone: emp.emergencyContact?.phone || ''
    });
    this.editing.set(true);
    this.loadEditOptions();
  }

  private loadEditOptions(): void {
    // 部門（依員工所屬子公司篩選）
    this.orgUnitService.loadOrgUnits().subscribe(() => {
      const emp = this.employee();
      let subsidiaryId = '';
      if (emp?.orgUnitId) {
        // orgUnitId 可能是部門 → 找 parent（子公司）
        const unit = this.orgUnitService.orgUnits().find(u => u.id === emp.orgUnitId);
        if (unit?.type === 'department' && unit.parent_id) {
          subsidiaryId = unit.parent_id;
        } else if (unit?.type === 'subsidiary' || unit?.type === 'group') {
          subsidiaryId = unit.id;
        }
      }
      // 設定子公司名稱
      if (subsidiaryId) {
        const sub = this.orgUnitService.orgUnits().find(u => u.id === subsidiaryId);
        this.employeeSubsidiary.set(sub?.name || '');
      }
      const depts = this.orgUnitService.filterDepartments(subsidiaryId);
      this.departmentOptions.set(depts.map(d => ({ id: d.id, name: d.name })));
    });

    // 職等與職級
    this.competencyService.getGradeMatrixFromAPI().subscribe(grades => {
      this.gradeOptions.set(grades.map(g => ({
        grade: g.grade,
        title: `Grade ${g.grade}`
      })));
      // 根據當前選擇的職等載入職級
      this.loadLevelOptions(this.editForm()['grade']);
    });

    // 載入員工清單作為主管選項（排除自己，依部門篩選）
    this.loadManagerOptions();

    // 載入職位（依當前部門+職等）
    this.loadPositionOptions();
  }

  private loadLevelOptions(grade: string): void {
    if (!grade) { this.levelOptions.set([]); return; }
    const g = parseInt(grade, 10);
    if (isNaN(g)) { this.levelOptions.set([]); return; }
    this.competencyService.getGradeDetail(g).subscribe({
      next: (detail: any) => {
        const codes = (detail?.salaryLevels || []).map((s: any) => ({ code: s.code }));
        this.levelOptions.set(codes);
      },
      error: () => this.levelOptions.set([])
    });
  }

  private loadPositionOptions(): void {
    const form = this.editForm();
    const dept = form['department'] || undefined;
    const grade = form['grade'] ? parseInt(form['grade'], 10) : undefined;
    const orgId = this.employee()?.orgUnitId || 'org-root';
    this.competencyService.getPositions(dept, grade, orgId).subscribe(positions => {
      const unique = [...new Set(positions.map((p: any) => p.title as string))];
      this.positionOptions.set(unique.map(t => ({ title: t })));
    });
  }

  onGradeChange(grade: string): void {
    this.updateField('grade', grade);
    this.updateField('level', '');
    this.updateField('position', '');
    this.loadLevelOptions(grade);
    this.loadPositionOptions();
  }

  onDepartmentEditChange(dept: string): void {
    this.updateField('department', dept);
    this.updateField('position', '');
    this.updateField('manager_id', '');
    this.loadPositionOptions();
    this.loadManagerOptions();
  }

  private loadManagerOptions(): void {
    const currentId = this.employee()?.id;
    const dept = this.editForm()['department'] || undefined;
    this.employeeService.getUnifiedEmployees().subscribe(emps => {
      let filtered = emps.filter(e => e.id !== currentId);
      if (dept) {
        filtered = filtered.filter(e => e.department === dept);
      }
      this.managerOptions.set(
        filtered.map(e => ({ id: e.id, name: e.name, position: e.position }))
      );
    });
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.editForm.set({});
  }

  updateField(field: string, value: string): void {
    this.editForm.set({ ...this.editForm(), [field]: value });
  }

  saveEmployee(): void {
    const emp = this.employee();
    if (!emp) return;

    this.saving.set(true);
    this.employeeService.updateEmployee(emp.id, this.editForm()).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.notificationService.success('員工資料已更新');
        this.loadEmployeeData(emp.id);
        this.employeeUpdated.emit();
      },
      error: () => {
        this.saving.set(false);
        this.notificationService.error('更新失敗');
      }
    });
  }

  // ===== ROI Chart =====

  initROIChart(): void {
    const employee = this.employee();
    if (!employee || !this.roiChartRef?.nativeElement) return;

    const roi = employee.roi;
    if (!roi) return;

    const container = this.roiChartRef.nativeElement;
    if (container.offsetWidth === 0 || container.offsetHeight === 0) {
      setTimeout(() => this.initROIChart(), 200);
      return;
    }

    if (this.roiChart) {
      this.roiChart.dispose();
    }

    this.roiChart = echarts.init(container);
    const color = this.moduleColor();

    const currentRoi = Math.round(roi.roi || 0);
    const deptAvg = roi.comparison?.departmentAvg || 150;
    const companyAvg = roi.comparison?.companyAvg || 140;

    const option: echarts.EChartsOption = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['個人 ROI', '部門平均', '公司平均'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '15%', top: '10%', containLabel: true },
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
          itemStyle: { color }
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

  // ===== Export =====

  exportEmployeeData(): void {
    const employee = this.employee();
    if (!employee) return;

    this.employeeService.exportEmployeeData(employee.id).subscribe(() => {
      this.notificationService.success('員工資料已匯出');
    });
  }

  // ===== Format Helpers =====

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': '在職', 'probation': '試用期', 'leave': '留職停薪',
      'resigned': '已離職', 'terminated': '資遣'
    };
    return labels[status] || status;
  }

  getGradeDisplay(grade: string | number | undefined): string {
    if (!grade) return '-';
    const n = typeof grade === 'string' ? parseInt(grade, 10) : grade;
    if (isNaN(n)) return grade?.toString() || '-';
    return `Grade ${n}`;
  }

  getChangeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'hire': '到職', 'promotion': '晉升', 'transfer': '調動',
      'demotion': '降級', 'title-change': '職稱變更', 'salary-adjustment': '薪資調整'
    };
    return labels[type] || type;
  }

  getGradeLabel(grade: string): string {
    const labels: Record<string, string> = {
      'A': '優秀', 'B': '良好', 'C': '合格', 'D': '待改善', 'E': '不合格'
    };
    return labels[grade] || grade;
  }

  getAuditActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'create': '新增', 'update': '更新', 'delete': '刪除',
      'view': '查看', 'export': '匯出'
    };
    return labels[action] || action;
  }

  getGenderLabel(val: string | undefined): string {
    const map: Record<string, string> = { 'male': '男', 'female': '女', 'other': '其他' };
    return val ? (map[val] || val) : '-';
  }

  getContractTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'full-time': '正職', 'part-time': '兼職', 'contract': '約聘', 'intern': '實習'
    };
    return labels[type] || type;
  }

  getSubmissionStatusLabel(submission: Submission): string {
    if (submission.approval_status) {
      const labels: Record<string, string> = {
        'PENDING': '審核中', 'APPROVED': '已核准', 'REJECTED': '已退回'
      };
      return labels[submission.approval_status] || submission.approval_status;
    }
    const labels: Record<string, string> = {
      'DRAFT': '待填寫', 'SIGNED': '已簽署', 'COMPLETED': '已完成'
    };
    return labels[submission.status] || submission.status;
  }

  getSubmissionStatusClass(submission: Submission): string {
    if (submission.approval_status) {
      const classes: Record<string, string> = {
        'PENDING': 'status-pending', 'APPROVED': 'status-approved', 'REJECTED': 'status-rejected'
      };
      return classes[submission.approval_status] || '';
    }
    const classes: Record<string, string> = {
      'DRAFT': 'status-draft', 'SIGNED': 'status-submitted', 'COMPLETED': 'status-approved'
    };
    return classes[submission.status] || '';
  }

  getUploadTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'id_card': '身分證件', 'bank_account': '銀行帳戶', 'health_report': '體檢報告',
      'photo': '大頭照', 'education_cert': '學經歷證明', 'other': '其他文件'
    };
    return labels[type] || type;
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
      style: 'currency', currency: 'TWD', maximumFractionDigits: 0
    }).format(amount);
  }

  // ===== Document Actions =====

  downloadSignedDocument(submission: Submission): void {
    if (submission.status !== 'SIGNED' && submission.status !== 'COMPLETED') {
      this.notificationService.error('文件尚未簽署完成');
      return;
    }
    window.open(`/employee/onboarding/sign/${submission.token}`, '_blank');
    this.notificationService.info('請使用瀏覽器列印功能（Ctrl+P / Cmd+P）存為 PDF');
  }

  viewSignedDocument(submission: Submission): void {
    if (submission.status !== 'SIGNED' && submission.status !== 'COMPLETED') {
      this.notificationService.error('文件尚未簽署完成');
      return;
    }
    window.open(`/employee/onboarding/sign/${submission.token}`, '_blank');
  }

  downloadUploadedDocument(doc: UploadDocument): void {
    if (!doc.fileUrl) {
      this.notificationService.error('文件不存在');
      return;
    }
    window.open(doc.fileUrl, '_blank');
  }

  viewUploadedDocument(doc: UploadDocument): void {
    if (!doc.fileUrl) {
      this.notificationService.error('文件不存在');
      return;
    }
    window.open(doc.fileUrl, '_blank');
  }
}
