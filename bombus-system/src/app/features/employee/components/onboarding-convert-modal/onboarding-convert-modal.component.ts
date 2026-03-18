import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  OnInit,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OnboardingService,
  PendingCandidate,
  ConvertCandidateResponse,
  ManagerOption,
  GradeLevel,
  SalaryLevel,
  PositionOption
} from '../../services/onboarding.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { OrgUnitService } from '../../../../core/services/org-unit.service';

@Component({
  selector: 'app-onboarding-convert-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding-convert-modal.component.html',
  styleUrl: './onboarding-convert-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingConvertModalComponent implements OnInit {
  // Inputs
  candidate = input.required<PendingCandidate>();
  isVisible = input.required<boolean>();

  // Outputs
  close = output<void>();
  converted = output<ConvertCandidateResponse>();

  // Services
  private onboardingService = inject(OnboardingService);
  private notificationService = inject(NotificationService);
  private orgUnitService = inject(OrgUnitService);

  // Form State
  department = signal<string>('');
  jobTitle = signal<string>('');               // 職務（具體工作名稱，如「財務出納」）
  position = signal<string>('');               // 職位（標準職位，如「會計」）
  gradeNumber = signal<number | null>(null);   // 職等 (1-7)
  salaryLevelCode = signal<string>('');         // 職級 (BS01-BS20)
  role = signal<'manager' | 'employee'>('employee');  // 角色：主管或員工
  managerId = signal<string>('');
  hireDate = signal<string>('');
  probationMonths = signal<number>(3);
  contractType = signal<string>('full-time');
  workLocation = signal<string>('');
  orgUnitId = signal<string>('');
  selectedSubsidiaryId = signal<string>(this.orgUnitService.lockedSubsidiaryId() || '');

  // 角色選項
  roleOptions = [
    { value: 'employee', label: '員工', description: '一般員工，無管理下屬責任' },
    { value: 'manager', label: '主管', description: '有管理下屬責任，使用主管表單' }
  ];

  // Options
  grades = signal<GradeLevel[]>([]);
  salaryLevels = signal<SalaryLevel[]>([]);
  positions = signal<PositionOption[]>([]);
  managers = signal<ManagerOption[]>([]);
  nextEmployeeNo = signal<string>('');

  // UI State
  loading = signal<boolean>(false);
  showSuccess = signal<boolean>(false);
  convertResult = signal<ConvertCandidateResponse | null>(null);

  // Computed
  probationEndDate = computed(() => {
    const hire = this.hireDate();
    const months = this.probationMonths();
    if (!hire) return '';
    const date = new Date(hire);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  });

  filteredManagers = computed(() => {
    const dept = this.department();
    if (!dept) return this.managers();
    return this.managers().filter(m => m.department === dept);
  });

  filteredSalaryLevels = computed(() => {
    const grade = this.gradeNumber();
    if (!grade) return this.salaryLevels();
    return this.salaryLevels().filter(s => s.grade === grade);
  });

  filteredPositions = computed(() => {
    const dept = this.department();
    const grade = this.gradeNumber();
    return this.positions().filter(p => {
      const matchDept = !dept || p.department === dept;
      const matchGrade = !grade || p.grade === grade;
      return matchDept && matchGrade;
    });
  });

  subsidiaryOrgUnits = this.orgUnitService.visibleSubsidiaries;
  isSubsidiaryLocked = this.orgUnitService.isSubsidiaryLocked;

  departmentOrgUnits = computed(() =>
    this.orgUnitService.filterDepartments(this.selectedSubsidiaryId())
  );

  selectedGradeInfo = computed(() => {
    const grade = this.gradeNumber();
    if (!grade) return null;
    return this.grades().find(g => g.grade === grade);
  });

  selectedSalaryInfo = computed(() => {
    const code = this.salaryLevelCode();
    if (!code) return null;
    return this.salaryLevels().find(s => s.code === code);
  });

  canSubmit = computed(() => {
    return this.department() && this.gradeNumber() && this.position() && this.hireDate() && !this.loading();
  });

  // 合約類型選項
  contractTypeOptions = [
    { value: 'full-time', label: '正職' },
    { value: 'part-time', label: '兼職' },
    { value: 'contract', label: '約聘' },
    { value: 'intern', label: '實習' }
  ];

  constructor() {
    // 當 candidate 輸入變化時，預填職務（從應徵職位帶入）
    effect(() => {
      const cand = this.candidate();
      if (cand?.position) {
        this.jobTitle.set(cand.position);
      }
      if (cand?.original_grade) {
        this.gradeNumber.set(Number(cand.original_grade));
      }
    }, { allowSignalWrites: true });

    // 當 orgUnits 載入完成後，根據候選人原始部門自動匹配 orgUnit + 預填 position
    effect(() => {
      const units = this.orgUnitService.orgUnits();
      const cand = this.candidate();
      if (!units.length || !cand) return;

      // 自動匹配部門 → orgUnit（僅在尚未選擇時）
      if (cand.original_department && !this.orgUnitId()) {
        const match = units.find(
          u => u.type === 'department' && u.name === cand.original_department
        );
        if (match) {
          this.orgUnitId.set(match.id);
          this.department.set(match.name);
        }
      }

      // 預填職位（需要 department 和 positions 都載入後）
      if (cand.original_position_name && !this.position()) {
        this.position.set(cand.original_position_name);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadOptions();
  }

  loadOptions(): void {
    // 載入職等列表
    this.onboardingService.getGrades().subscribe({
      next: (grades) => this.grades.set(grades),
      error: () => this.grades.set([])
    });

    // 載入主管列表
    this.onboardingService.getManagers().subscribe({
      next: (mgrs) => this.managers.set(mgrs),
      error: () => this.managers.set([])
    });

    // 預覽員工編號
    this.onboardingService.getNextEmployeeNo().subscribe({
      next: (res) => this.nextEmployeeNo.set(res.employee_no),
      error: () => this.nextEmployeeNo.set('')
    });

    // 載入組織單位，然後根據候選人職缺或使用者 scope 設定子公司
    this.orgUnitService.loadOrgUnits().subscribe({
      next: () => {
        // 優先從候選人職缺帶入子公司
        const jobOrgId = this.candidate().job_org_unit_id;
        const locked = this.orgUnitService.lockedSubsidiaryId();
        const subId = jobOrgId || locked || '';
        if (subId) {
          this.selectedSubsidiaryId.set(subId);
        }
        // 子公司確定後，載入對應的職級和職位
        this._loadSalaryLevelsAndPositions(subId);
      },
      error: () => {
        // 組織單位載入失敗時，仍載入不篩選組織的職級和職位
        this._loadSalaryLevelsAndPositions('');
      }
    });

    // 預設報到日期為今天 + 7 天
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    this.hireDate.set(defaultDate.toISOString().split('T')[0]);
  }

  /** 根據 org_unit_id 載入職級薪資和職位 */
  private _loadSalaryLevelsAndPositions(orgUnitId: string): void {
    // 載入職級薪資（依子公司篩選，無則退回集團預設）
    this.onboardingService.getSalaryLevels(undefined, orgUnitId || undefined).subscribe({
      next: (levels) => this.salaryLevels.set(levels),
      error: () => this.salaryLevels.set([])
    });

    // 載入職位（依子公司篩選）
    this.onboardingService.getPositions(undefined, undefined, undefined, orgUnitId || undefined).subscribe({
      next: (positions) => this.positions.set(positions),
      error: () => this.positions.set([])
    });
  }

  onOrgUnitDepartmentChange(orgUnitId: string): void {
    this.orgUnitId.set(orgUnitId);
    // 從 org_units 反查部門名稱
    const unit = this.orgUnitService.orgUnits().find(u => u.id === orgUnitId);
    this.department.set(unit?.name || '');
    // 重置依賴部門的欄位
    this.position.set('');
  }

  onSubsidiaryChange(subId: string): void {
    this.selectedSubsidiaryId.set(subId);
    // 重置組織單位選擇（子公司變更後 org_unit 可能不再匹配）
    this.orgUnitId.set('');
    this.department.set('');
    this.salaryLevelCode.set('');
    this.position.set('');
    // 重新載入該子公司的職級薪資和職位
    this._loadSalaryLevelsAndPositions(subId);
  }

  onGradeChange(grade: number | null): void {
    this.gradeNumber.set(grade);
    // 當職等變化時，重置職級選擇
    this.salaryLevelCode.set('');
    // 當職等變化時，重置職位選擇
    this.position.set('');
  }

  onPositionSelect(title: string): void {
    this.position.set(title);
    // 根據選擇的職位自動設定角色
    const selectedPos = this.filteredPositions().find(p => p.title === title);
    if (selectedPos) {
      // 如果是管理職，自動設定為主管角色
      if (selectedPos.track === 'management') {
        this.role.set('manager');
      } else {
        this.role.set('employee');
      }
    }
  }

  submit(): void {
    if (!this.canSubmit()) {
      this.notificationService.warning('請填寫必填欄位');
      return;
    }

    this.loading.set(true);

    this.onboardingService.convertCandidate({
      candidate_id: this.candidate().id,
      department: this.department(),
      job_title: this.jobTitle(),  // 職務（具體工作名稱）
      position: this.position(),   // 職位（標準職位）
      level: this.salaryLevelCode() || undefined, // 職級 (BS01-BS20)
      grade: this.gradeNumber()?.toString() || undefined, // 職等 (1-7)
      role: this.role(),  // 角色：manager 或 employee
      manager_id: this.managerId() || undefined,
      hire_date: this.hireDate(),
      probation_months: this.probationMonths(),
      contract_type: this.contractType(),
      work_location: this.workLocation() || undefined,
      org_unit_id: this.orgUnitId() || undefined
    }).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.convertResult.set(result);
        this.showSuccess.set(true);
        this.notificationService.success('候選人已成功轉為員工');
        this.converted.emit(result);
      },
      error: (err) => {
        this.loading.set(false);
        this.notificationService.error(err.error?.error || '轉換失敗，請稍後再試');
      }
    });
  }

  copyLink(url: string): void {
    const fullUrl = window.location.origin + url;
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.notificationService.success('連結已複製');
    });
  }

  copyText(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success('已複製到剪貼簿');
    });
  }

  closeModal(): void {
    if (this.showSuccess()) {
      this.showSuccess.set(false);
      this.convertResult.set(null);
      this.close.emit();
      return;
    }
    const hasUserChanges = !!(this.salaryLevelCode() || this.managerId() ||
      this.workLocation() || this.contractType() !== 'full-time' || this.probationMonths() !== 3);
    if (hasUserChanges && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
    this.showSuccess.set(false);
    this.convertResult.set(null);
    this.close.emit();
  }
}
