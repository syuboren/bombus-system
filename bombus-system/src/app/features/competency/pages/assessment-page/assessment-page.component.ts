import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { StatsCardComponent } from '../../../../shared/components/stats-card/stats-card.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { MonthlyCheckModalComponent } from '../../components/monthly-check-modal/monthly-check-modal.component';
import { WeeklyReportModalComponent } from '../../components/weekly-report-modal/weekly-report-modal.component';
import { QuarterlyReviewModalComponent } from '../../components/quarterly-review-modal/quarterly-review-modal.component';
import { AssessmentService } from '../../services/assessment.service';
import { OrgUnitService } from '../../../../core/services/org-unit.service';
import { FeatureGateService } from '../../../../core/services/feature-gate.service';
import {
  MonthlyCheck,
  QuarterlyReview,
  WeeklyReport,
  WeeklyReportStats,
  CompetencyOverview,
  PersonalTrend,
  PendingTask,
  DeadlineReminder,
  IncompleteItem,
  DepartmentAvgScore,
  PersonalHistory,
  AssessmentFilter,
  MonthlyCheckStatus,
  QuarterlyReviewStatus,
  WeeklyReportStatus,
  STATUS_LABELS,
  MONTH_OPTIONS,
  QUARTER_OPTIONS,
  getYearOptions
} from '../../models/assessment.model';
import { CurrentWeekInfo } from '../../services/assessment.service';

type TabType = 'overview' | 'monthly' | 'quarterly' | 'weekly';

@Component({
  selector: 'app-assessment-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    StatsCardComponent,
    StatusBadgeComponent,
    PaginationComponent,
    MonthlyCheckModalComponent,
    WeeklyReportModalComponent,
    QuarterlyReviewModalComponent
  ],
  templateUrl: './assessment-page.component.html',
  styleUrl: './assessment-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssessmentPageComponent implements OnInit {
  private assessmentService = inject(AssessmentService);
  private orgUnitService = inject(OrgUnitService);
  private featureGateService = inject(FeatureGateService);

  // Permission check
  readonly canEdit = computed(() => this.featureGateService.canEdit('L2.assessment'));
  readonly viewScope = computed(() => this.featureGateService.getFeaturePerm('L2.assessment')?.view_scope || 'company');

  // Page Info
  readonly pageTitle = '職能評估';
  readonly breadcrumbs = ['首頁', '職能管理'];

  // Tab control
  activeTab = signal<TabType>('overview');

  // Loading states
  loading = signal(false);
  loadingMonthly = signal(false);
  loadingQuarterly = signal(false);
  loadingWeekly = signal(false);
  initializingQuarterly = signal(false);

  // Data signals
  overview = signal<CompetencyOverview | null>(null);
  personalTrend = signal<PersonalTrend | null>(null);
  monthlyChecks = signal<MonthlyCheck[]>([]);
  quarterlyReviews = signal<QuarterlyReview[]>([]);
  weeklyReports = signal<WeeklyReport[]>([]);
  
  // 總覽儀表板 - HR 後台專用
  monthlyIncompleteList = signal<IncompleteItem[]>([]);
  quarterlyIncompleteList = signal<IncompleteItem[]>([]);
  weeklyIncompleteList = signal<IncompleteItem[]>([]);
  departmentAvgScores = signal<DepartmentAvgScore[]>([]);
  deptScoreSource = signal<'monthly' | 'quarterly'>('monthly');
  selectedEmployeeHistory = signal<PersonalHistory | null>(null);
  historyEmployeeId = signal<string>('');
  
  // 績效分析儀表板
  performanceViewMode = signal<'monthly' | 'quarterly'>('monthly');
  compareMode = signal<'individual' | 'yoy' | 'department'>('individual');
  allEmployeesList = signal<{ id: string; name: string; department: string; position: string }[]>([]);
  lastYearHistory = signal<PersonalHistory | null>(null);
  departmentAvgHistory = signal<{ monthlyScores: { yearMonth: string; score: number }[]; quarterlyScores: { yearQuarter: string; score: number }[] } | null>(null);

  // Pagination
  monthlyPagination = signal({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  quarterlyPagination = signal({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  weeklyPagination = signal({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });

  // Filters
  currentYear = signal(new Date().getFullYear());
  currentMonth = signal(new Date().getMonth() + 1);
  currentQuarter = signal(Math.ceil((new Date().getMonth() + 1) / 3));
  currentWeek = signal(this.getWeekNumber(new Date()));

  selectedSubsidiaryId = signal<string>(this.orgUnitService.lockedSubsidiaryId() || '');
  selectedDepartment = signal('');
  selectedStatus = signal('');

  // 組織架構篩選
  subsidiaries = this.orgUnitService.visibleSubsidiaries;
  isSubsidiaryLocked = this.orgUnitService.isSubsidiaryLocked;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Modal control
  showMonthlyModal = signal(false);
  showQuarterlyModal = signal(false);
  showWeeklyModal = signal(false);
  selectedItemId = signal<string>('');

  // Options
  readonly yearOptions = getYearOptions();
  readonly monthOptions = MONTH_OPTIONS;
  readonly quarterOptions = QUARTER_OPTIONS;
  // 週別篩選相關
  selectedWeeklyMonth = signal(0); // 0 = 全部月份
  selectedWeek = signal(0); // 0 = 全部週別
  weekOptions = signal<{ value: number; label: string; dateRange: string }[]>([]);
  
  // 週報統計（根據篩選條件計算）
  weeklyStats = signal<WeeklyReportStats>({
    total: 0,
    notStarted: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    submissionRate: 0
  });
  
  // 當前週資訊
  currentWeekInfo = signal<CurrentWeekInfo | null>(null);
  generatingWeekly = signal(false);
  
  // 總覽頁面週別篩選
  overviewWeek = signal(this.getISOWeekNumber(new Date())); // 預設當前週
  overviewWeekOptions = signal<{ value: number; label: string; dateRange: string }[]>([]);
  overviewWeeklyStats = signal<WeeklyReportStats>({
    total: 0,
    notStarted: 0,
    draft: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
    submissionRate: 0
  });

  // 判斷選擇的時間是否為未來
  isMonthInFuture = computed(() => {
    const now = new Date();
    const selectedYear = this.currentYear();
    const selectedMonth = this.currentMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return selectedYear > currentYear || (selectedYear === currentYear && selectedMonth > currentMonth);
  });

  isQuarterInFuture = computed(() => {
    const now = new Date();
    const selectedYear = this.currentYear();
    const selectedQuarter = this.currentQuarter();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    return selectedYear > currentYear || (selectedYear === currentYear && selectedQuarter > currentQuarter);
  });

  isWeekInFuture = computed(() => {
    const now = new Date();
    const selectedYear = this.currentYear();
    const selectedWeek = this.overviewWeek();
    const currentYear = now.getFullYear();
    const currentWeek = this.getISOWeekNumber(now);
    return selectedYear > currentYear || (selectedYear === currentYear && selectedWeek > currentWeek);
  });

  readonly monthlyStatusOptions = [
    { value: '', label: '全部狀態' },
    { value: 'self_assessment', label: '自評中' },
    { value: 'manager_review', label: '主管審核中' },
    { value: 'hr_review', label: 'HR 審核中' },
    { value: 'completed', label: '已完成' },
    { value: 'overdue', label: '逾期' }
  ];

  readonly quarterlyStatusOptions = [
    { value: '', label: '全部狀態' },
    { value: 'employee_submitted', label: '員工已提交' },
    { value: 'manager_reviewed', label: '主管已評核' },
    { value: 'interview_scheduled', label: '已預約面談' },
    { value: 'completed', label: '已完成' }
  ];

  readonly weeklyStatusOptions = [
    { value: '', label: '全部狀態' },
    { value: 'not_started', label: '尚未填寫' },
    { value: 'draft', label: '草稿' },
    { value: 'submitted', label: '已提交' },
    { value: 'approved', label: '已通過' },
    { value: 'rejected', label: '已退回' }
  ];

  // Computed
  tabs = computed(() => [
    { id: 'overview' as TabType, label: '總覽', icon: 'ri-dashboard-line' },
    { id: 'monthly' as TabType, label: '月度檢核', icon: 'ri-calendar-check-line' },
    { id: 'quarterly' as TabType, label: '季度面談', icon: 'ri-discuss-line' },
    { id: 'weekly' as TabType, label: '工作週報', icon: 'ri-file-list-3-line' }
  ]);

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe();
    this.loadOverview();
    this.loadMonthlyChecks();
  }

  // =====================================================
  // Tab Navigation
  // =====================================================
  setActiveTab(tab: TabType): void {
    this.activeTab.set(tab);
    this.selectedDepartment.set('');
    this.selectedStatus.set('');

    switch (tab) {
      case 'overview':
        this.loadOverview();
        break;
      case 'monthly':
        this.loadMonthlyChecks();
        break;
      case 'quarterly':
        this.loadQuarterlyReviews();
        break;
      case 'weekly':
        // 載入當前週資訊並初始化
        this.initWeeklyTab();
        break;
    }
  }

  // =====================================================
  // Data Loading
  // =====================================================
  loadOverview(): void {
    this.loading.set(true);
    // 初始化總覽頁面的週別選項
    this.updateOverviewWeekOptions();
    
    this.assessmentService.getOverview(this.currentYear(), this.currentMonth(), this.currentQuarter())
      .subscribe(data => {
        this.overview.set(data);
        this.loading.set(false);
        // 同時載入 HR 儀表板數據
        this.loadHrDashboardData();
      });
  }

  /**
   * 載入 HR 儀表板數據
   */
  private loadHrDashboardData(): void {
    const year = this.currentYear();
    const month = this.currentMonth();
    const quarter = this.currentQuarter();
    const week = this.overviewWeek();
    
    // 載入月度未完成清單
    this.assessmentService.getIncompleteMonthlyChecks(year, month).subscribe(list => {
      this.monthlyIncompleteList.set(list);
    });
    
    // 載入季度未完成清單
    this.assessmentService.getIncompleteQuarterlyReviews(year, quarter).subscribe(list => {
      this.quarterlyIncompleteList.set(list);
    });
    
    // 載入週報未完成清單（使用選擇的週別）
    this.assessmentService.getIncompleteWeeklyReports(year, week).subscribe(list => {
      this.weeklyIncompleteList.set(list);
    });
    
    // 載入週報統計（使用選擇的週別）
    this.loadOverviewWeeklyStats();
    
    // 載入各部門平均分數
    this.loadDepartmentAvgScores();
    
    // 載入所有員工列表（用於績效分析選擇）
    this.assessmentService.getEmployeeList().subscribe(employees => {
      this.allEmployeesList.set(employees);
    });
  }

  /**
   * 設置部門分數資料來源
   */
  setDeptScoreSource(source: 'monthly' | 'quarterly'): void {
    this.deptScoreSource.set(source);
    this.loadDepartmentAvgScores();
  }

  /**
   * 載入部門平均分數
   */
  private loadDepartmentAvgScores(): void {
    const year = this.currentYear();
    const source = this.deptScoreSource();
    
    if (source === 'monthly') {
      this.assessmentService.getDepartmentAvgScores(year, this.currentMonth()).subscribe(scores => {
        this.departmentAvgScores.set(scores);
      });
    } else {
      this.assessmentService.getDepartmentAvgScoresQuarterly(year, this.currentQuarter()).subscribe(scores => {
        this.departmentAvgScores.set(scores);
      });
    }
  }

  /**
   * 更新總覽頁面的週別選項
   */
  private updateOverviewWeekOptions(): void {
    const year = this.currentYear();
    const month = this.currentMonth();
    const weeksInMonth = this.getWeeksInMonth(year, month);
    
    const options: { value: number; label: string; dateRange: string }[] = [];
    weeksInMonth.forEach(w => {
      const { start, end } = this.getWeekDateRange(year, w);
      options.push({
        value: w,
        label: `第 ${w} 週`,
        dateRange: `${start} ~ ${end}`
      });
    });
    
    this.overviewWeekOptions.set(options);
    
    // 如果當前選擇的週別不在選項中，設為第一個
    if (options.length > 0 && !options.find(o => o.value === this.overviewWeek())) {
      // 嘗試找當前週，否則用最新的週
      const currentWeek = this.getISOWeekNumber(new Date());
      const matchedWeek = options.find(o => o.value === currentWeek);
      this.overviewWeek.set(matchedWeek ? matchedWeek.value : options[options.length - 1].value);
    }
  }

  /**
   * 載入總覽頁面的週報統計
   */
  private loadOverviewWeeklyStats(): void {
    const year = this.currentYear();
    const week = this.overviewWeek();
    
    // 呼叫週報 API 取得統計
    this.assessmentService.getWeeklyReports({ year, week }).subscribe(result => {
      this.overviewWeeklyStats.set(result.stats);
    });
  }

  /**
   * 總覽頁面 - 年度變更
   */
  onOverviewYearChange(year: number): void {
    this.currentYear.set(year);
    this.updateOverviewWeekOptions();
    this.loadOverview();
  }

  /**
   * 總覽頁面 - 月份變更
   */
  onOverviewMonthChange(month: number): void {
    this.currentMonth.set(month);
    this.currentQuarter.set(Math.ceil(month / 3));
    this.updateOverviewWeekOptions();
    this.loadOverview();
  }

  /**
   * 總覽頁面 - 週別變更
   */
  onOverviewWeekChange(week: number): void {
    this.overviewWeek.set(week);
    // 只重新載入週報相關數據
    this.assessmentService.getIncompleteWeeklyReports(this.currentYear(), week).subscribe(list => {
      this.weeklyIncompleteList.set(list);
    });
    this.loadOverviewWeeklyStats();
  }

  /**
   * 載入個人歷史績效曲線
   */
  loadPersonalHistory(employeeId: string): void {
    if (!employeeId) {
      this.selectedEmployeeHistory.set(null);
      return;
    }
    this.historyEmployeeId.set(employeeId);
    this.assessmentService.getPersonalHistory(employeeId, this.currentYear()).subscribe(history => {
      this.selectedEmployeeHistory.set(history);
    });
  }

  /**
   * 點擊未完成項目跳轉到詳細
   */
  goToIncompleteItem(item: IncompleteItem, type: 'monthly' | 'quarterly' | 'weekly'): void {
    this.setActiveTab(type);
    // 可以進一步展開詳細 modal
  }

  /**
   * 獲取部門分數顏色等級
   */
  getScoreLevel(score: number): string {
    if (score >= 4.5) return 'excellent';
    if (score >= 4.0) return 'good';
    if (score >= 3.5) return 'average';
    if (score >= 3.0) return 'below';
    return 'poor';
  }

  // =====================================================
  // 績效分析儀表板方法
  // =====================================================

  /**
   * 設置績效視圖模式
   */
  setPerformanceViewMode(mode: 'monthly' | 'quarterly'): void {
    this.performanceViewMode.set(mode);
  }

  /**
   * 設置比較模式
   */
  setCompareMode(mode: 'individual' | 'yoy' | 'department'): void {
    this.compareMode.set(mode);
    // 如果切換到同期比較或部門比較，載入對應數據
    if (mode === 'yoy' && this.historyEmployeeId()) {
      this.loadLastYearHistory();
    } else if (mode === 'department' && this.selectedEmployeeHistory()) {
      this.loadDepartmentAvgHistory();
    }
  }

  /**
   * 載入去年同期數據
   */
  private loadLastYearHistory(): void {
    const employeeId = this.historyEmployeeId();
    if (!employeeId) return;
    
    this.assessmentService.getPersonalHistory(employeeId, this.currentYear() - 1).subscribe(history => {
      this.lastYearHistory.set(history);
    });
  }

  /**
   * 載入部門平均數據
   */
  private loadDepartmentAvgHistory(): void {
    const employee = this.selectedEmployeeHistory();
    if (!employee) return;
    
    // 模擬部門平均數據（實際應該有後端 API）
    const deptScores = this.departmentAvgScores().find(d => d.department === employee.department);
    if (deptScores) {
      // 為每月生成部門平均分數
      const monthlyAvg = Array.from({ length: 12 }, (_, i) => ({
        yearMonth: `${this.currentYear()}/${i + 1}`,
        score: deptScores.avgScore * 20 // 轉換為百分制
      }));
      const quarterlyAvg = Array.from({ length: 4 }, (_, i) => ({
        yearQuarter: `${this.currentYear()} Q${i + 1}`,
        score: deptScores.avgScore * 20
      }));
      this.departmentAvgHistory.set({ monthlyScores: monthlyAvg, quarterlyScores: quarterlyAvg });
    }
  }

  /**
   * 取得指定月份的分數
   */
  getMonthlyScore(month: number): number {
    const history = this.selectedEmployeeHistory();
    if (!history?.monthlyScores) return 0;
    const score = history.monthlyScores.find(s => {
      const monthPart = parseInt(s.yearMonth.split('/')[1]);
      return monthPart === month;
    });
    return score?.score || 0;
  }

  /**
   * 取得比較分數（同期或部門）
   */
  getCompareScore(month: number): number {
    if (this.compareMode() === 'yoy') {
      const lastYear = this.lastYearHistory();
      if (!lastYear?.monthlyScores) return 0;
      const score = lastYear.monthlyScores.find(s => {
        const monthPart = parseInt(s.yearMonth.split('/')[1]);
        return monthPart === month;
      });
      return score?.score || 0;
    } else if (this.compareMode() === 'department') {
      const deptHistory = this.departmentAvgHistory();
      if (!deptHistory?.monthlyScores) return 0;
      const score = deptHistory.monthlyScores.find(s => {
        const monthPart = parseInt(s.yearMonth.split('/')[1]);
        return monthPart === month;
      });
      return score?.score || 0;
    }
    return 0;
  }

  /**
   * 取得指定季度的分數
   */
  getQuarterlyScore(quarter: number): number {
    const history = this.selectedEmployeeHistory();
    if (!history?.quarterlyScores) return 0;
    const score = history.quarterlyScores.find(s => {
      const qPart = parseInt(s.yearQuarter.split('Q')[1]);
      return qPart === quarter;
    });
    return score?.score || 0;
  }

  /**
   * 取得季度比較分數
   */
  getQuarterlyCompareScore(quarter: number): number {
    if (this.compareMode() === 'yoy') {
      const lastYear = this.lastYearHistory();
      if (!lastYear?.quarterlyScores) return 0;
      const score = lastYear.quarterlyScores.find(s => {
        const qPart = parseInt(s.yearQuarter.split('Q')[1]);
        return qPart === quarter;
      });
      return score?.score || 0;
    } else if (this.compareMode() === 'department') {
      const deptHistory = this.departmentAvgHistory();
      if (!deptHistory?.quarterlyScores) return 0;
      const score = deptHistory.quarterlyScores.find(s => {
        const qPart = parseInt(s.yearQuarter.split('Q')[1]);
        return qPart === quarter;
      });
      return score?.score || 0;
    }
    return 0;
  }

  /**
   * 取得季度對應月份
   */
  getQuarterMonths(quarter: number): string {
    const months = ['1-3月', '4-6月', '7-9月', '10-12月'];
    return months[quarter - 1] || '';
  }

  /**
   * 計算平均分數
   */
  getAvgScore(): string {
    const history = this.selectedEmployeeHistory();
    const scores = this.performanceViewMode() === 'monthly' 
      ? history?.monthlyScores 
      : history?.quarterlyScores;
    if (!scores || scores.length === 0) return '-';
    const validScores = scores.filter(s => s.score > 0);
    if (validScores.length === 0) return '-';
    const avg = validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length;
    return avg.toFixed(1);
  }

  /**
   * 取得最高分數
   */
  getMaxScore(): string {
    const history = this.selectedEmployeeHistory();
    const scores = this.performanceViewMode() === 'monthly' 
      ? history?.monthlyScores 
      : history?.quarterlyScores;
    if (!scores || scores.length === 0) return '-';
    const validScores = scores.filter(s => s.score > 0);
    if (validScores.length === 0) return '-';
    const max = Math.max(...validScores.map(s => s.score));
    return max.toFixed(1);
  }

  /**
   * 取得最低分數
   */
  getMinScore(): string {
    const history = this.selectedEmployeeHistory();
    const scores = this.performanceViewMode() === 'monthly' 
      ? history?.monthlyScores 
      : history?.quarterlyScores;
    if (!scores || scores.length === 0) return '-';
    const validScores = scores.filter(s => s.score > 0);
    if (validScores.length === 0) return '-';
    const min = Math.min(...validScores.map(s => s.score));
    return min.toFixed(1);
  }

  loadMonthlyChecks(): void {
    this.loadingMonthly.set(true);
    const filter: AssessmentFilter = {
      year: this.currentYear(),
      month: this.currentMonth(),
      status: this.selectedStatus() || undefined,
      departmentId: this.selectedDepartment() || undefined,
      page: this.monthlyPagination().page,
      pageSize: this.monthlyPagination().pageSize
    };

    this.assessmentService.getMonthlyChecks(filter).subscribe(result => {
      this.monthlyChecks.set(result.items);
      this.monthlyPagination.set(result.pagination);
      this.loadingMonthly.set(false);
    });
  }

  loadQuarterlyReviews(): void {
    this.loadingQuarterly.set(true);
    const filter: AssessmentFilter = {
      year: this.currentYear(),
      quarter: this.currentQuarter(),
      status: this.selectedStatus() || undefined,
      departmentId: this.selectedDepartment() || undefined,
      page: this.quarterlyPagination().page,
      pageSize: this.quarterlyPagination().pageSize
    };

    this.assessmentService.getQuarterlyReviews(filter).subscribe(result => {
      this.quarterlyReviews.set(result.items);
      this.quarterlyPagination.set(result.pagination);
      this.loadingQuarterly.set(false);
    });
  }

  /**
   * 初始化週報 Tab
   * 預設顯示當前週
   */
  private initWeeklyTab(): void {
    // 先取得當前週資訊
    this.assessmentService.getCurrentWeekInfo().subscribe(info => {
      if (info) {
        this.currentWeekInfo.set(info);
        this.currentYear.set(info.year);
        this.selectedWeeklyMonth.set(0); // 顯示全部月份
        this.selectedWeek.set(info.week); // 預設當前週
      } else {
        // fallback: 使用前端計算
        const now = new Date();
        this.currentYear.set(now.getFullYear());
        this.selectedWeeklyMonth.set(0);
        this.selectedWeek.set(this.getISOWeekNumber(now));
      }
      this.updateWeekOptions();
      this.loadWeeklyReports();
    });
  }

  loadWeeklyReports(): void {
    this.loadingWeekly.set(true);
    const filter: AssessmentFilter = {
      year: this.currentYear(),
      // 如果選擇「全部」，則不傳遞 week 和 month 參數
      week: this.selectedWeek() > 0 ? this.selectedWeek() : undefined,
      month: this.selectedWeeklyMonth() > 0 ? this.selectedWeeklyMonth() : undefined,
      status: this.selectedStatus() || undefined,
      page: this.weeklyPagination().page,
      pageSize: this.weeklyPagination().pageSize
    };

    this.assessmentService.getWeeklyReports(filter).subscribe(result => {
      this.weeklyReports.set(result.items);
      this.weeklyPagination.set(result.pagination);
      // 更新統計數據（根據篩選條件）
      this.weeklyStats.set(result.stats);
      this.loadingWeekly.set(false);
    });
  }

  /**
   * 生成本週週報
   */
  generateCurrentWeekReports(): void {
    const info = this.currentWeekInfo();
    if (!info) {
      alert('無法取得當前週資訊');
      return;
    }
    
    if (!confirm(`確定要為第 ${info.week} 週 (${info.weekStart} ~ ${info.weekEnd}) 生成週報嗎？\n系統將為所有在職員工建立週報表單。`)) {
      return;
    }
    
    this.generatingWeekly.set(true);
    this.assessmentService.generateWeeklyReports(info.year, info.week).subscribe({
      next: (result) => {
        this.generatingWeekly.set(false);
        if (result) {
          alert(`生成完成！\n已建立 ${result.created} 筆週報\n略過 ${result.skipped} 筆已存在的記錄`);
          this.loadWeeklyReports();
        } else {
          alert('生成失敗，請稍後再試');
        }
      },
      error: () => {
        this.generatingWeekly.set(false);
        alert('生成失敗，請稍後再試');
      }
    });
  }

  /**
   * 計算指定年份和月份的週別選項
   */
  updateWeekOptions(): void {
    const year = this.currentYear();
    const month = this.selectedWeeklyMonth();
    
    if (month === 0) {
      // 全部月份：列出整年的所有週
      const weeks: { value: number; label: string; dateRange: string }[] = [
        { value: 0, label: '全部週別', dateRange: '' }
      ];
      const totalWeeks = this.getWeeksInYear(year);
      for (let w = 1; w <= totalWeeks; w++) {
        const { start, end } = this.getWeekDateRange(year, w);
        weeks.push({
          value: w,
          label: `第 ${w} 週`,
          dateRange: `${start} ~ ${end}`
        });
      }
      this.weekOptions.set(weeks);
    } else {
      // 特定月份：只列出該月的週別
      const weeks: { value: number; label: string; dateRange: string }[] = [
        { value: 0, label: '全部週別', dateRange: '' }
      ];
      const monthWeeks = this.getWeeksInMonth(year, month);
      monthWeeks.forEach(w => {
        const { start, end } = this.getWeekDateRange(year, w);
        weeks.push({
          value: w,
          label: `第 ${w} 週`,
          dateRange: `${start} ~ ${end}`
        });
      });
      this.weekOptions.set(weeks);
    }
  }

  /**
   * 取得指定年份的總週數
   */
  private getWeeksInYear(year: number): number {
    // ISO 8601: 每年最少 52 週，最多 53 週
    const dec31 = new Date(year, 11, 31);
    const weekNum = this.getISOWeekNumber(dec31);
    // 如果 12/31 是第 1 週（屬於下一年），則該年有 52 週
    return weekNum === 1 ? 52 : weekNum;
  }

  /**
   * 取得指定月份包含的週別
   */
  private getWeeksInMonth(year: number, month: number): number[] {
    const weeks = new Set<number>();
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const weekNum = this.getISOWeekNumber(d);
      // 只加入屬於該年的週別
      if (weekNum < 53 || d.getFullYear() === year) {
        weeks.add(weekNum);
      }
    }
    return Array.from(weeks).sort((a, b) => a - b);
  }

  /**
   * 取得 ISO 週別號碼
   */
  private getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * 取得指定週的日期範圍（週一到週五）
   */
  private getWeekDateRange(year: number, week: number): { start: string; end: string } {
    // ISO week: Week 1 contains the first Thursday
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
    
    const weekStart = new Date(firstMonday);
    weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 4); // Friday
    
    const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      start: formatDate(weekStart),
      end: formatDate(weekEnd)
    };
  }

  /**
   * 週報月份篩選變更
   */
  onWeeklyMonthChange(month: number): void {
    this.selectedWeeklyMonth.set(month);
    this.selectedWeek.set(0); // 重置週別選擇
    this.updateWeekOptions();
    this.weeklyPagination.update(p => ({ ...p, page: 1 }));
    this.loadWeeklyReports();
  }

  /**
   * 週報週別篩選變更
   */
  onWeeklyWeekChange(week: number): void {
    this.selectedWeek.set(week);
    this.weeklyPagination.update(p => ({ ...p, page: 1 }));
    this.loadWeeklyReports();
  }

  // =====================================================
  // Filter Handlers
  // =====================================================
  onYearChange(year: number): void {
    this.currentYear.set(year);
    this.refreshCurrentTab();
  }

  onMonthChange(month: number): void {
    this.currentMonth.set(month);
    this.refreshCurrentTab();
  }

  onQuarterChange(quarter: number): void {
    this.currentQuarter.set(quarter);
    this.refreshCurrentTab();
  }

  onSubsidiaryChange(value: string): void {
    this.selectedSubsidiaryId.set(value);
    this.selectedDepartment.set('');
    this.refreshCurrentTab();
  }

  onDepartmentChange(dept: string): void {
    this.selectedDepartment.set(dept);
    this.refreshCurrentTab();
  }

  onStatusChange(status: string): void {
    this.selectedStatus.set(status);
    this.refreshCurrentTab();
  }

  onPageChange(page: number): void {
    const tab = this.activeTab();
    if (tab === 'monthly') {
      this.monthlyPagination.update(p => ({ ...p, page }));
      this.loadMonthlyChecks();
    } else if (tab === 'quarterly') {
      this.quarterlyPagination.update(p => ({ ...p, page }));
      this.loadQuarterlyReviews();
    } else if (tab === 'weekly') {
      this.weeklyPagination.update(p => ({ ...p, page }));
      this.loadWeeklyReports();
    }
  }

  private refreshCurrentTab(): void {
    switch (this.activeTab()) {
      case 'overview':
        this.loadOverview();
        break;
      case 'monthly':
        this.monthlyPagination.update(p => ({ ...p, page: 1 }));
        this.loadMonthlyChecks();
        break;
      case 'quarterly':
        this.quarterlyPagination.update(p => ({ ...p, page: 1 }));
        this.loadQuarterlyReviews();
        break;
      case 'weekly':
        // 年度變更時重新計算週別選項
        this.updateWeekOptions();
        this.weeklyPagination.update(p => ({ ...p, page: 1 }));
        this.loadWeeklyReports();
        break;
    }
  }

  // =====================================================
  // Modal Handlers
  // =====================================================
  openMonthlyDetail(item: MonthlyCheck): void {
    this.selectedItemId.set(item.id);
    this.showMonthlyModal.set(true);
  }

  openQuarterlyDetail(item: QuarterlyReview): void {
    this.selectedItemId.set(item.id);
    this.showQuarterlyModal.set(true);
  }

  openWeeklyDetail(item: WeeklyReport): void {
    this.selectedItemId.set(item.id);
    this.showWeeklyModal.set(true);
  }

  closeMonthlyModal(): void {
    this.showMonthlyModal.set(false);
    this.selectedItemId.set('');
  }

  closeQuarterlyModal(): void {
    this.showQuarterlyModal.set(false);
    this.selectedItemId.set('');
  }

  closeWeeklyModal(): void {
    this.showWeeklyModal.set(false);
    this.selectedItemId.set('');
  }

  onMonthlyModalSaved(): void {
    this.loadMonthlyChecks();
  }

  onQuarterlyModalSaved(): void {
    this.loadQuarterlyReviews();
  }

  onWeeklyModalSaved(): void {
    this.loadWeeklyReports();
  }

  // =====================================================
  // Export Handlers
  // =====================================================
  exportMonthlyChecks(): void {
    this.assessmentService.exportMonthlyChecks(
      this.currentYear(),
      this.currentMonth(),
      this.selectedDepartment() || undefined
    ).subscribe(blob => {
      this.downloadFile(blob, `月度檢核_${this.currentYear()}年${this.currentMonth()}月.xlsx`);
    });
  }

  /**
   * 初始化季度面談清單
   */
  initializeQuarterlyReviews(): void {
    const year = this.currentYear();
    const quarter = this.currentQuarter();
    
    if (!confirm(`確定要為 ${year} 年 Q${quarter} 初始化季度面談清單嗎？\n系統將為所有在職員工建立面談記錄。`)) {
      return;
    }
    
    this.initializingQuarterly.set(true);
    
    this.assessmentService.initializeQuarterlyReviews(year, quarter).subscribe({
      next: (result) => {
        this.initializingQuarterly.set(false);
        if (result) {
          alert(`初始化完成！\n已建立 ${result.created} 筆面談記錄\n略過 ${result.skipped} 筆已存在的記錄`);
          // 重新載入數據
          this.loadQuarterlyReviews();
          this.loadOverview();
        } else {
          alert('初始化失敗，請稍後再試');
        }
      },
      error: () => {
        this.initializingQuarterly.set(false);
        alert('初始化失敗，請稍後再試');
      }
    });
  }

  exportQuarterlyReviews(): void {
    this.assessmentService.exportQuarterlyReviews(
      this.currentYear(),
      this.currentQuarter()
    ).subscribe(blob => {
      this.downloadFile(blob, `季度面談_${this.currentYear()}年Q${this.currentQuarter()}.xlsx`);
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // =====================================================
  // Utility Methods
  // =====================================================
  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  getAvatarInitial(name: string): string {
    return name ? name.charAt(0) : 'U';
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatScore(score: number | undefined): string {
    if (score === undefined || score === null) return '-';
    return score.toFixed(1);
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Track by functions
  trackByMonthly(index: number, item: MonthlyCheck): string {
    return item.id;
  }

  trackByQuarterly(index: number, item: QuarterlyReview): string {
    return item.id;
  }

  trackByWeekly(index: number, item: WeeklyReport): string {
    return item.id;
  }
}
