import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, AfterViewInit, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CompetencyService } from '../../services/competency.service';
import {
  GradeLevel,
  GradeMatrix,
  CareerPath,
  GradeType,
  GRADE_TYPE_OPTIONS,
  GradeLevelNew,
  GradeLevelDetail,
  PromotionCriteria,
  CareerPathNew,
  GradeTrack,
  GRADE_TRACK_OPTIONS,
  GradeTrackEntity,
  ChangeRecord
} from '../../models/competency.model';
import { TrackEditModalComponent } from '../../components/track-edit-modal/track-edit-modal.component';
import { GradeEditPanelComponent } from '../../components/grade-edit-panel/grade-edit-panel.component';
import { PositionEditModalComponent } from '../../components/position-edit-modal/position-edit-modal.component';
import { PromotionCriteriaEditModalComponent } from '../../components/promotion-criteria-edit-modal/promotion-criteria-edit-modal.component';
import { OrgUnitService } from '../../../../core/services/org-unit.service';
import * as echarts from 'echarts';

// Employee interface for AI assistant
interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  currentGrade: string;
  hireDate: Date;
}

// AI Analysis Result interface
interface AICareerAnalysis {
  employee: Employee;
  currentStatus: {
    grade: string;
    gradeName: string;
    yearsInGrade: number;
    overallScore: number;
    competencyScores: { name: string; score: number; required: number }[];
  };
  pathRecommendations: {
    vertical: PathRecommendation;
    horizontal: PathRecommendation;
    crossDepartment: PathRecommendation;
  };
  trainingPlan: {
    courses: { name: string; type: string; duration: string; priority: 'high' | 'medium' | 'low' }[];
    estimatedCompletion: string;
  };
  progressTracking: {
    milestones: { title: string; status: 'completed' | 'in_progress' | 'pending'; date: string }[];
    promotionReadiness: number;
    nextReviewDate: string;
  };
  simulation: CareerSimulation[];
}

interface PathRecommendation {
  targetPosition: string;
  targetGrade: string;
  estimatedTime: string;
  requiredCompetencies: { name: string; currentLevel: number; requiredLevel: number; gap: number }[];
  feasibility: number;
  recommendation: string;
}

interface CareerSimulation {
  path: string;
  pathType: 'vertical' | 'horizontal' | 'cross-department';
  steps: { year: number; position: string; grade: string; salary: string }[];
  totalTime: string;
  finalSalary: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// 部門職位介面
interface DepartmentPosition {
  id: string;
  department: string;
  grade: number;
  title: string;
  track: string;
  gradeTitleManagement: string;
  gradeTitleProfessional: string;
  supervisedDepartments: string[] | null; // 管轄的部門列表（跨部門職位）
}

@Component({
  selector: 'app-grade-matrix-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TrackEditModalComponent, GradeEditPanelComponent, PositionEditModalComponent, PromotionCriteriaEditModalComponent],
  templateUrl: './grade-matrix-page.component.html',
  styleUrl: './grade-matrix-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradeMatrixPageComponent implements OnInit, AfterViewInit {
  @ViewChild('radarChart') radarChartRef!: ElementRef;
  private radarChart: echarts.ECharts | null = null;
  private competencyService = inject(CompetencyService);
  private orgUnitService = inject(OrgUnitService);

  // Page Info
  readonly pageTitle = '職等職級管理';
  readonly breadcrumbs = ['首頁', '職能管理'];

  // Data signals (舊版 - 保留相容性)
  gradeMatrix = signal<GradeMatrix | null>(null);
  careerPaths = signal<CareerPath[]>([]);
  loading = signal(true);

  // Data signals (新版 - 使用 API)
  gradesNew = signal<GradeLevelNew[]>([]);
  careerPathsNew = signal<CareerPathNew[]>([]);
  selectedGradeNew = signal<GradeLevelNew | null>(null);
  selectedGradeDetail = signal<GradeLevelDetail | null>(null);
  selectedCareerPathNew = signal<CareerPathNew | null>(null);
  promotionCriteria = signal<PromotionCriteria[]>([]);

  // 部門職位資料
  departments = signal<{ id: string; name: string; code: string }[]>([]);
  departmentPositions = signal<DepartmentPosition[]>([]);
  selectedDepartmentFilter = signal<string>('');

  // 子公司→部門級聯篩選
  selectedSubsidiaryId = signal<string>('');
  subsidiaries = this.orgUnitService.subsidiaries;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Active tab（擴展含 pending / history）
  activeTab = signal<'matrix' | 'career' | 'ai-assistant' | 'pending' | 'history'>('matrix');

  // --- Phase 5: 編輯模式 & CRUD ---
  editMode = signal(false);
  tracks = signal<GradeTrackEntity[]>([]);
  pendingChanges = signal<ChangeRecord[]>([]);
  changeHistory = signal<ChangeRecord[]>([]);

  // Modal / Panel 顯示狀態
  showTrackEditModal = signal(false);
  showGradeEditPanel = signal(false);
  showPositionEditModal = signal(false);
  showPromotionEditModal = signal(false);

  // 正在編輯的職等 grade number（用於卡片高亮）
  editingGradeNumber = signal<number | null>(null);

  // Modal 編輯資料（null = 新增模式）
  editingTrack = signal<GradeTrackEntity | null>(null);
  editingGrade = signal<GradeLevelNew | null>(null);
  editingPosition = signal<any>(null);
  editingPromotion = signal<PromotionCriteria | null>(null);

  // Selected items (舊版)
  selectedGrade = signal<GradeLevel | null>(null);
  selectedCareerPath = signal<CareerPath | null>(null);

  // Modal states
  showGradeDetailModal = signal(false);
  showCareerPathModal = signal(false);
  showAIAssistantModal = signal(false);

  // Filter
  selectedType = signal<string>('');
  selectedTrack = signal<GradeTrack | ''>('');
  readonly typeOptions = GRADE_TYPE_OPTIONS;
  readonly trackOptions = GRADE_TRACK_OPTIONS;

  // AI Assistant state - Enhanced
  employees = signal<Employee[]>([]);
  selectedEmployeeId = signal<string>('');
  aiActiveSection = signal<'overview' | 'paths' | 'training' | 'progress' | 'simulation'>('overview');
  aiAnalyzing = signal(false);
  aiAnalysisResult = signal<AICareerAnalysis | null>(null);

  // Computed (舊版)
  filteredGrades = computed(() => {
    const matrix = this.gradeMatrix();
    if (!matrix) return [];

    let grades = matrix.rows;
    if (this.selectedType()) {
      grades = grades.filter(g => g.type === this.selectedType());
    }
    return grades;
  });

  // Computed (新版)
  filteredGradesNew = computed(() => {
    return this.gradesNew();
  });

  // 按部門分組的職位資料
  positionsByDepartment = computed(() => {
    const positions = this.departmentPositions();
    const deptFilter = this.selectedDepartmentFilter();

    // 先按部門篩選
    const filtered = deptFilter
      ? positions.filter(p => p.department === deptFilter)
      : positions;

    // 按部門分組
    const grouped: Record<string, DepartmentPosition[]> = {};
    for (const pos of filtered) {
      if (!grouped[pos.department]) {
        grouped[pos.department] = [];
      }
      grouped[pos.department].push(pos);
    }

    // 每個部門內按職等排序
    for (const dept of Object.keys(grouped)) {
      grouped[dept].sort((a, b) => b.grade - a.grade);
    }

    return grouped;
  });

  // 按職等分組的職位資料 (用於矩陣表格)
  positionsByGrade = computed(() => {
    const positions = this.departmentPositions();
    const grouped: Record<number, DepartmentPosition[]> = {};

    for (const pos of positions) {
      if (!grouped[pos.grade]) {
        grouped[pos.grade] = [];
      }
      grouped[pos.grade].push(pos);
    }

    return grouped;
  });

  // 跨部門高階主管（有管轄部門的職位）
  crossDepartmentExecutives = computed(() => {
    return this.departmentPositions().filter(p =>
      p.supervisedDepartments && p.supervisedDepartments.length > 0
    );
  });

  // 一般部門職位（不包含跨部門高階主管）
  regularDepartmentPositions = computed(() => {
    return this.departmentPositions().filter(p =>
      !p.supervisedDepartments || p.supervisedDepartments.length === 0
    );
  });

  selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    return this.employees().find(e => e.id === id) || null;
  });

  constructor() {
    // 子公司切換時自動重新載入職等職級資料
    effect(() => {
      const orgUnitId = this.selectedSubsidiaryId();
      this.loadDataNew();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe();
    this.loadData();
    this.loadEmployees();
    this.loadTracks();
  }

  ngAfterViewInit(): void {
    // Radar chart will be initialized when AI analysis is complete
  }

  // 載入舊版資料 (保留相容性)
  loadData(): void {
    this.loading.set(true);

    this.competencyService.getGradeMatrix().subscribe(data => {
      this.gradeMatrix.set(data);
    });

    this.competencyService.getCareerPaths().subscribe(data => {
      this.careerPaths.set(data);
      this.loading.set(false);
    });
  }

  // 載入新版資料 (從 API)
  loadDataNew(): void {
    const orgUnitId = this.selectedSubsidiaryId() || undefined;

    this.competencyService.getGradeMatrixFromAPI(orgUnitId).subscribe(data => {
      this.gradesNew.set(data);
    });

    this.competencyService.getCareerPathsFromAPI(undefined, orgUnitId).subscribe(data => {
      this.careerPathsNew.set(data);
    });

    this.competencyService.getPromotionCriteria(undefined, undefined, undefined, orgUnitId).subscribe(data => {
      this.promotionCriteria.set(data);
    });

    // 載入部門和職位資料
    this.competencyService.getDepartments().subscribe(data => {
      this.departments.set(data);
    });

    this.competencyService.getDepartmentPositions(undefined, undefined, undefined, orgUnitId).subscribe(data => {
      this.departmentPositions.set(data);
    });
  }

  // 部門篩選變更
  onDepartmentFilterChange(value: string): void {
    this.selectedDepartmentFilter.set(value);
  }

  // 取得部門的職位 (按職等)
  getPositionsForDepartment(department: string, grade: number): DepartmentPosition[] {
    return this.departmentPositions().filter(p =>
      p.department === department && p.grade === grade
    );
  }

  // 取得職等的所有職位
  getPositionsForGrade(grade: number): DepartmentPosition[] {
    return this.departmentPositions().filter(p => p.grade === grade);
  }

  // 取得特定部門、職等、軌道的職位名稱
  getPositionTitle(department: string, grade: number, track: string): string {
    const pos = this.departmentPositions().find(p =>
      p.department === department && p.grade === grade && p.track === track
    );
    return pos?.title || '';
  }

  // 取得部門在該職等的管理職職位
  getManagementPosition(department: string, grade: number): string {
    return this.getPositionTitle(department, grade, 'management');
  }

  // 取得部門在該職等的專業職職位
  getProfessionalPosition(department: string, grade: number): string {
    return this.getPositionTitle(department, grade, 'professional');
  }

  // 檢查部門在該職等是否有職位
  hasPositions(department: string, grade: number): boolean {
    return this.departmentPositions().some(p =>
      p.department === department && p.grade === grade
    );
  }

  // 取得職等由高到低排序的資料
  gradesDescending = computed(() => {
    return [...this.gradesNew()].sort((a, b) => b.grade - a.grade);
  });

  // 取得特定職等的跨部門職位（返回所有跨部門職位，按管轄範圍排序）
  getCrossDeptPositionsForGrade(grade: number): DepartmentPosition[] {
    return this.departmentPositions()
      .filter(p => p.grade === grade && p.supervisedDepartments && p.supervisedDepartments.length > 0)
      .sort((a, b) => (b.supervisedDepartments?.length || 0) - (a.supervisedDepartments?.length || 0));
  }

  // 取得特定職等的主要跨部門職位（管轄範圍最大的）
  getCrossDeptPositionForGrade(grade: number): DepartmentPosition | null {
    const positions = this.getCrossDeptPositionsForGrade(grade);
    return positions.length > 0 ? positions[0] : null;
  }

  // 取得特定職等的次要跨部門職位（除了主要的以外）
  getSecondaryCrossDeptPositionsForGrade(grade: number): DepartmentPosition[] {
    const positions = this.getCrossDeptPositionsForGrade(grade);
    return positions.slice(1);
  }

  // 檢查部門是否被跨部門職位覆蓋（用於決定是否跳過渲染）
  isDeptCoveredByCrossDept(department: string, grade: number): boolean {
    const crossDeptPos = this.getCrossDeptPositionForGrade(grade);
    if (!crossDeptPos || !crossDeptPos.supervisedDepartments) return false;
    return crossDeptPos.supervisedDepartments.includes(department);
  }

  // 取得跨部門職位的 colspan（管轄部門數量）
  getCrossDeptColspan(grade: number): number {
    const crossDeptPos = this.getCrossDeptPositionForGrade(grade);
    if (!crossDeptPos || !crossDeptPos.supervisedDepartments) return 1;

    // 計算在顯示的部門中有多少被管轄
    const deptFilter = this.selectedDepartmentFilter();
    if (deptFilter) {
      // 如果有篩選，檢查篩選的部門是否在管轄範圍內
      return crossDeptPos.supervisedDepartments.includes(deptFilter) ? 1 : 0;
    }
    return crossDeptPos.supervisedDepartments.length;
  }

  // 檢查是否應該顯示跨部門合併格（只在第一個被管轄的部門顯示）
  shouldShowCrossDeptCell(department: string, grade: number): boolean {
    const crossDeptPos = this.getCrossDeptPositionForGrade(grade);
    if (!crossDeptPos || !crossDeptPos.supervisedDepartments) return false;

    const deptFilter = this.selectedDepartmentFilter();
    if (deptFilter) {
      // 如果有篩選，只有篩選的部門等於第一個管轄部門時才顯示
      return crossDeptPos.supervisedDepartments.includes(deptFilter);
    }

    // 取得第一個被管轄的部門
    const firstSupervisedDept = crossDeptPos.supervisedDepartments[0];
    return department === firstSupervisedDept;
  }

  loadEmployees(): void {
    // Mock employee data
    this.employees.set([
      { id: 'emp-001', name: '王小明', department: '研發部', position: '資深工程師', currentGrade: 'P3', hireDate: new Date('2020-03-15') },
      { id: 'emp-002', name: '李小華', department: '研發部', position: '工程師', currentGrade: 'P2', hireDate: new Date('2022-06-01') },
      { id: 'emp-003', name: '陳大文', department: '業務部', position: '業務專員', currentGrade: 'P2', hireDate: new Date('2021-09-10') },
      { id: 'emp-004', name: '林美玲', department: '行銷部', position: '行銷企劃', currentGrade: 'P2', hireDate: new Date('2022-01-05') },
      { id: 'emp-005', name: '張志偉', department: '研發部', position: '副理', currentGrade: 'M1', hireDate: new Date('2018-07-20') }
    ]);
  }

  setActiveTab(tab: 'matrix' | 'career' | 'ai-assistant' | 'pending' | 'history'): void {
    this.activeTab.set(tab);
    // 切換到對應 tab 時載入資料
    if (tab === 'pending') this.loadPendingChanges();
    if (tab === 'history') this.loadChangeHistory();
  }

  // --- 軌道載入 ---
  loadTracks(): void {
    this.competencyService.getTracks().subscribe(data => this.tracks.set(data));
  }

  // --- 待審核載入 ---
  loadPendingChanges(): void {
    this.competencyService.getPendingChanges().subscribe(data => this.pendingChanges.set(data));
  }

  // --- 變更歷史載入 ---
  loadChangeHistory(): void {
    this.competencyService.getChangeHistory().subscribe(data => this.changeHistory.set(data));
  }

  // --- 編輯模式切換 ---
  toggleEditMode(): void {
    this.editMode.update(v => !v);
  }

  // --- 軌道 CRUD ---
  openEditTrack(track: GradeTrackEntity | null = null): void {
    this.editingTrack.set(track);
    this.showTrackEditModal.set(true);
  }
  closeTrackModal(): void { this.showTrackEditModal.set(false); this.editingTrack.set(null); }
  onTrackSaved(): void {
    this.loadTracks();
    this.loadDataNew();
    this.closeTrackModal();
  }

  // --- 職等 CRUD（側邊面板） ---
  openEditGrade(grade: GradeLevelNew | null = null): void {
    this.editingGrade.set(grade);
    this.editingGradeNumber.set(grade?.grade ?? null);
    this.showGradeEditPanel.set(true);
  }
  closeGradeEditPanel(): void {
    this.showGradeEditPanel.set(false);
    this.editingGrade.set(null);
    this.editingGradeNumber.set(null);
  }
  onGradeSaved(): void {
    this.loadDataNew();
    this.closeGradeEditPanel();
  }

  // --- 部門職位 CRUD ---
  openEditPosition(position: any = null): void {
    this.editingPosition.set(position);
    this.showPositionEditModal.set(true);
  }
  closePositionModal(): void { this.showPositionEditModal.set(false); this.editingPosition.set(null); }
  onPositionSaved(): void {
    this.loadDataNew();
    this.closePositionModal();
  }

  // --- 晉升條件 CRUD ---
  openEditPromotionCriteria(criteria: PromotionCriteria | null = null): void {
    this.editingPromotion.set(criteria);
    this.showPromotionEditModal.set(true);
  }
  closePromotionModal(): void { this.showPromotionEditModal.set(false); this.editingPromotion.set(null); }
  onPromotionCriteriaSaved(): void {
    this.loadDataNew();
    this.closePromotionModal();
  }

  // --- 審核操作 ---
  approveChange(changeId: string): void {
    this.competencyService.approveChange(changeId, 'admin').subscribe({
      next: () => {
        this.loadPendingChanges();
        this.loadDataNew();
        this.loadTracks();
      },
      error: (err) => console.error('Approve failed:', err)
    });
  }

  rejectChange(changeId: string): void {
    const reason = prompt('請輸入駁回原因：');
    if (reason === null) return;
    this.competencyService.rejectChange(changeId, reason).subscribe({
      next: () => this.loadPendingChanges(),
      error: (err) => console.error('Reject failed:', err)
    });
  }

  // 取得變更類型中文名稱
  getEntityTypeLabel(type: string): string {
    const map: Record<string, string> = { track: '軌道', grade: '職等', salary: '薪資', position: '職位', promotion: '晉升條件', 'track-entry': '軌道條目' };
    return map[type] || type;
  }

  // 取得操作類型中文名稱
  getActionLabel(action: string): string {
    const map: Record<string, string> = { create: '新增', update: '更新', delete: '刪除' };
    return map[action] || action;
  }

  // 取得狀態 CSS class
  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  onTypeChange(value: string): void {
    this.selectedType.set(value);
  }

  onTrackChange(value: string): void {
    this.selectedTrack.set(value as GradeTrack | '');
  }

  // Grade Detail Modal (舊版)
  openGradeDetail(grade: GradeLevel): void {
    this.selectedGrade.set(grade);
    this.showGradeDetailModal.set(true);
  }

  // Grade Detail Modal (新版)
  openGradeDetailNew(grade: GradeLevelNew): void {
    this.selectedGradeNew.set(grade);
    // 載入該職等的詳細資料（含晉升條件）
    this.competencyService.getGradeDetail(grade.grade).subscribe(detail => {
      this.selectedGradeDetail.set(detail);
    });
    this.showGradeDetailModal.set(true);
  }

  closeGradeDetailModal(): void {
    this.showGradeDetailModal.set(false);
    this.selectedGrade.set(null);
    this.selectedGradeNew.set(null);
    this.selectedGradeDetail.set(null);
  }

  // Career Path Modal (舊版)
  openCareerPathDetail(path: CareerPath): void {
    this.selectedCareerPath.set(path);
    this.showCareerPathModal.set(true);
  }

  // Career Path Modal (新版)
  openCareerPathDetailNew(path: CareerPathNew): void {
    this.selectedCareerPathNew.set(path);
    this.showCareerPathModal.set(true);
  }

  closeCareerPathModal(): void {
    this.showCareerPathModal.set(false);
    this.selectedCareerPath.set(null);
    this.selectedCareerPathNew.set(null);
  }

  // 取得特定職等的晉升條件
  getPromotionToGrade(grade: number, track?: string): PromotionCriteria | null {
    const criteria = this.promotionCriteria();
    return criteria.find(c =>
      c.toGrade === grade &&
      (!track || c.track === track || c.track === 'both')
    ) || null;
  }

  // 從 trackEntries 取得管理職職稱
  getManagementTitle(grade: GradeLevelNew): string {
    return grade.trackEntries?.find(e => e.track === 'management')?.title || '';
  }

  // 從 trackEntries 取得專業職職稱
  getProfessionalTitle(grade: GradeLevelNew): string {
    return grade.trackEntries?.find(e => e.track === 'professional')?.title || '';
  }

  // 從 trackEntries 取得學歷要求（指定軌道）
  getTrackEducation(grade: GradeLevelNew, track: string): string {
    return grade.trackEntries?.find(e => e.track === track)?.educationRequirement || '';
  }

  // 從 trackEntries 取得職責描述（指定軌道）
  getTrackResponsibility(grade: GradeLevelNew, track: string): string {
    return grade.trackEntries?.find(e => e.track === track)?.responsibilityDescription || '';
  }

  // 取得職等的薪資範圍字串
  getSalaryRangeText(grade: GradeLevelNew): string {
    if (grade.salaryLevels.length === 0) return 'N/A';
    return `NT$ ${this.formatSalary(grade.minSalary)} - ${this.formatSalary(grade.maxSalary)}`;
  }

  // AI Assistant Methods
  onEmployeeChange(employeeId: string): void {
    this.selectedEmployeeId.set(employeeId);
    this.aiAnalysisResult.set(null);
    this.aiActiveSection.set('overview');
  }

  setAISection(section: 'overview' | 'paths' | 'training' | 'progress' | 'simulation'): void {
    this.aiActiveSection.set(section);

    // Initialize radar chart when viewing overview with analysis result
    if (section === 'overview' && this.aiAnalysisResult()) {
      setTimeout(() => this.initRadarChart(), 100);
    }
  }

  runAIAnalysis(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.aiAnalyzing.set(true);

    // Simulate AI analysis
    setTimeout(() => {
      const analysis: AICareerAnalysis = this.generateMockAnalysis(employee);
      this.aiAnalysisResult.set(analysis);
      this.aiAnalyzing.set(false);

      // Initialize radar chart after analysis
      setTimeout(() => this.initRadarChart(), 100);
    }, 2000);
  }

  private generateMockAnalysis(employee: Employee): AICareerAnalysis {
    const yearsInCompany = new Date().getFullYear() - employee.hireDate.getFullYear();

    return {
      employee,
      currentStatus: {
        grade: employee.currentGrade,
        gradeName: this.getGradeName(employee.currentGrade),
        yearsInGrade: Math.min(yearsInCompany, 2),
        overallScore: 78,
        competencyScores: [
          { name: '程式設計', score: 4.2, required: 4 },
          { name: '系統分析', score: 3.8, required: 4 },
          { name: '專案管理', score: 3.0, required: 3.5 },
          { name: '溝通表達', score: 4.0, required: 4 },
          { name: '團隊合作', score: 4.5, required: 4 },
          { name: '問題解決', score: 3.5, required: 4 }
        ]
      },
      pathRecommendations: {
        vertical: {
          targetPosition: '主任工程師',
          targetGrade: 'P4',
          estimatedTime: '2-3 年',
          requiredCompetencies: [
            { name: '系統架構設計', currentLevel: 3, requiredLevel: 5, gap: 2 },
            { name: '技術決策', currentLevel: 3, requiredLevel: 4, gap: 1 },
            { name: '團隊指導', currentLevel: 2, requiredLevel: 4, gap: 2 }
          ],
          feasibility: 75,
          recommendation: '建議優先加強系統架構設計能力，參加進階技術培訓課程'
        },
        horizontal: {
          targetPosition: '技術專家',
          targetGrade: 'S1',
          estimatedTime: '3-4 年',
          requiredCompetencies: [
            { name: '領域專精', currentLevel: 3, requiredLevel: 5, gap: 2 },
            { name: '技術創新', currentLevel: 3, requiredLevel: 5, gap: 2 },
            { name: '知識傳承', currentLevel: 2, requiredLevel: 4, gap: 2 }
          ],
          feasibility: 60,
          recommendation: '需要深耕特定技術領域，建議取得專業認證並發表技術文章'
        },
        crossDepartment: {
          targetPosition: '產品經理',
          targetGrade: 'P3',
          estimatedTime: '1.5-2 年',
          requiredCompetencies: [
            { name: '產品規劃', currentLevel: 2, requiredLevel: 4, gap: 2 },
            { name: '市場分析', currentLevel: 1, requiredLevel: 3, gap: 2 },
            { name: '跨部門協調', currentLevel: 3, requiredLevel: 4, gap: 1 }
          ],
          feasibility: 55,
          recommendation: '技術背景是優勢，需補強產品管理與市場分析能力'
        }
      },
      trainingPlan: {
        courses: [
          { name: '進階系統架構設計', type: '專業技能', duration: '24小時', priority: 'high' },
          { name: 'PMP 專案管理認證', type: '管理能力', duration: '40小時', priority: 'high' },
          { name: '技術團隊領導力', type: '領導能力', duration: '16小時', priority: 'medium' },
          { name: '簡報技巧工作坊', type: '溝通技巧', duration: '8小時', priority: 'medium' },
          { name: '敏捷開發實戰', type: '專業技能', duration: '16小時', priority: 'low' }
        ],
        estimatedCompletion: '約 8-10 個月'
      },
      progressTracking: {
        milestones: [
          { title: '完成年度職能評估', status: 'completed', date: '2024-03' },
          { title: '取得進階技術認證', status: 'in_progress', date: '2024-06' },
          { title: '主導專案開發', status: 'in_progress', date: '2024-09' },
          { title: '完成管理培訓', status: 'pending', date: '2025-01' },
          { title: '晉升評審', status: 'pending', date: '2025-06' }
        ],
        promotionReadiness: 65,
        nextReviewDate: '2025-06-30'
      },
      simulation: [
        {
          path: '技術職垂直晉升',
          pathType: 'vertical',
          steps: [
            { year: 0, position: '資深工程師', grade: 'P3', salary: 'NT$ 70,000' },
            { year: 2, position: '主任工程師', grade: 'P4', salary: 'NT$ 90,000' },
            { year: 5, position: '首席工程師', grade: 'P5', salary: 'NT$ 120,000' }
          ],
          totalTime: '5 年',
          finalSalary: 'NT$ 120,000',
          riskLevel: 'low'
        },
        {
          path: '轉型管理職',
          pathType: 'vertical',
          steps: [
            { year: 0, position: '資深工程師', grade: 'P3', salary: 'NT$ 70,000' },
            { year: 1, position: '副理', grade: 'M1', salary: 'NT$ 80,000' },
            { year: 3, position: '經理', grade: 'M2', salary: 'NT$ 100,000' },
            { year: 6, position: '協理', grade: 'M3', salary: 'NT$ 130,000' }
          ],
          totalTime: '6 年',
          finalSalary: 'NT$ 130,000',
          riskLevel: 'medium'
        },
        {
          path: '成為技術專家',
          pathType: 'horizontal',
          steps: [
            { year: 0, position: '資深工程師', grade: 'P3', salary: 'NT$ 70,000' },
            { year: 3, position: '技術專家', grade: 'S1', salary: 'NT$ 110,000' },
            { year: 6, position: '首席技術專家', grade: 'S2', salary: 'NT$ 140,000' }
          ],
          totalTime: '6 年',
          finalSalary: 'NT$ 140,000',
          riskLevel: 'medium'
        }
      ]
    };
  }

  private getGradeName(grade: string): string {
    const gradeNames: Record<string, string> = {
      'P1': '初級工程師',
      'P2': '工程師',
      'P3': '資深工程師',
      'P4': '主任工程師',
      'M1': '副理',
      'M2': '經理',
      'M3': '協理',
      'S1': '技術專家'
    };
    return gradeNames[grade] || grade;
  }

  private initRadarChart(): void {
    const result = this.aiAnalysisResult();
    if (!result || !this.radarChartRef?.nativeElement) return;

    if (this.radarChart) {
      this.radarChart.dispose();
    }

    this.radarChart = echarts.init(this.radarChartRef.nativeElement);

    const indicators = result.currentStatus.competencyScores.map(c => ({
      name: c.name,
      max: 5
    }));

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        data: ['目前能力', '職位要求'],
        bottom: 0
      },
      radar: {
        indicator: indicators,
        shape: 'polygon',
        splitNumber: 5,
        axisName: {
          color: '#666'
        },
        splitLine: {
          lineStyle: {
            color: '#ddd'
          }
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(200, 200, 200, 0.1)', 'rgba(200, 200, 200, 0.2)']
          }
        }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: result.currentStatus.competencyScores.map(c => c.score),
              name: '目前能力',
              areaStyle: {
                color: 'rgba(193, 131, 104, 0.3)'
              },
              lineStyle: {
                color: '#C18368'
              },
              itemStyle: {
                color: '#C18368'
              }
            },
            {
              value: result.currentStatus.competencyScores.map(c => c.required),
              name: '職位要求',
              areaStyle: {
                color: 'rgba(139, 157, 130, 0.3)'
              },
              lineStyle: {
                color: '#8B9D82'
              },
              itemStyle: {
                color: '#8B9D82'
              }
            }
          ]
        }
      ]
    };

    this.radarChart.setOption(option);
  }

  getScoreClass(score: number, required: number): string {
    const diff = score - required;
    if (diff >= 0) return 'score-good';
    if (diff >= -0.5) return 'score-warning';
    return 'score-danger';
  }

  getFeasibilityClass(value: number): string {
    if (value >= 70) return 'feasibility-high';
    if (value >= 50) return 'feasibility-medium';
    return 'feasibility-low';
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  getRiskClass(risk: string): string {
    return `risk-${risk}`;
  }

  getMilestoneStatusClass(status: string): string {
    return `milestone-${status}`;
  }

  getMilestoneIcon(status: string): string {
    const icons: Record<string, string> = {
      'completed': 'ri-checkbox-circle-fill',
      'in_progress': 'ri-loader-4-line',
      'pending': 'ri-checkbox-blank-circle-line'
    };
    return icons[status] || 'ri-checkbox-blank-circle-line';
  }

  // Helper methods
  getTypeLabel(type: GradeType): string {
    const map: Record<GradeType, string> = {
      professional: '專業職',
      management: '管理職',
      specialist: '專家職'
    };
    return map[type];
  }

  getTypeClass(type: GradeType): string {
    return `type-${type}`;
  }

  getTypeIcon(type: GradeType): string {
    const map: Record<GradeType, string> = {
      professional: 'ri-code-box-line',
      management: 'ri-team-line',
      specialist: 'ri-award-line'
    };
    return map[type];
  }

  getCareerPathTypeLabel(type: string): string {
    const map: Record<string, string> = {
      vertical: '垂直晉升',
      horizontal: '橫向發展',
      'cross-department': '跨部門發展'
    };
    return map[type] || type;
  }

  getCareerPathTypeIcon(type: string): string {
    const map: Record<string, string> = {
      vertical: 'ri-arrow-up-line',
      horizontal: 'ri-arrow-left-right-line',
      'cross-department': 'ri-swap-box-line'
    };
    return map[type] || 'ri-route-line';
  }

  getCareerPathTypeClass(type: string): string {
    return `path-${type}`;
  }

  getStepStatusClass(status: string): string {
    return `step-${status}`;
  }

  getStepStatusIcon(status: string): string {
    const map: Record<string, string> = {
      completed: 'ri-checkbox-circle-fill',
      current: 'ri-focus-3-line',
      pending: 'ri-checkbox-blank-circle-line'
    };
    return map[status] || 'ri-checkbox-blank-circle-line';
  }

  formatSalary(amount: number): string {
    return new Intl.NumberFormat('zh-TW').format(amount);
  }

  getGradesByType(type: GradeType): GradeLevel[] {
    return this.filteredGrades().filter(g => g.type === type);
  }

  // 取得軌道標籤
  getTrackLabel(track: GradeTrack | string): string {
    const map: Record<string, string> = {
      professional: '專業職',
      management: '管理職',
      both: '通用'
    };
    return map[track] || track;
  }

  // 取得職涯路徑類型標籤
  getPathTypeLabel(type: string): string {
    const map: Record<string, string> = {
      vertical: '垂直晉升',
      horizontal: '橫向發展',
      'cross-department': '跨部門發展'
    };
    return map[type] || type;
  }

  // 取得職涯路徑類型 CSS class
  getPathTypeClass(type: string): string {
    const map: Record<string, string> = {
      vertical: 'type-vertical',
      horizontal: 'type-horizontal',
      'cross-department': 'type-cross'
    };
    return map[type] || '';
  }

  // 取得職涯路徑類型圖標
  getPathTypeIcon(type: string): string {
    const map: Record<string, string> = {
      vertical: 'ri-arrow-up-double-line',
      horizontal: 'ri-arrow-left-right-line',
      'cross-department': 'ri-git-branch-line'
    };
    return map[type] || 'ri-route-line';
  }

  // 績效門檻顯示
  getPerformanceThresholdClass(threshold: number): string {
    if (threshold >= 110) return 'threshold-high';
    if (threshold >= 100) return 'threshold-medium';
    return 'threshold-normal';
  }
}

