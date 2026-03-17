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
  GradeTrackEntry,
  ChangeRecord
} from '../../models/competency.model';
import { TrackEditModalComponent } from '../../components/track-edit-modal/track-edit-modal.component';
import { GradeEditPanelComponent } from '../../components/grade-edit-panel/grade-edit-panel.component';
import { PositionEditModalComponent } from '../../components/position-edit-modal/position-edit-modal.component';
import { PromotionCriteriaEditModalComponent } from '../../components/promotion-criteria-edit-modal/promotion-criteria-edit-modal.component';
import { TrackDetailEditPanelComponent } from '../../components/track-detail-edit-panel/track-detail-edit-panel.component';
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
  imports: [CommonModule, FormsModule, HeaderComponent, TrackEditModalComponent, GradeEditPanelComponent, PositionEditModalComponent, PromotionCriteriaEditModalComponent, TrackDetailEditPanelComponent],
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

  // 子公司→部門級聯篩選（Tab B/C 軌道明細表用）
  selectedSubsidiaryId = signal<string>('');
  subsidiaries = this.orgUnitService.subsidiaries;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Tab A 整體對照表獨立子公司篩選（W1 修正：與 Tab B/C 分離）
  overviewSubsidiaryId = signal<string>('');

  // Active tab（擴展含 pending / history）
  activeTab = signal<'matrix' | 'career' | 'ai-assistant' | 'pending' | 'history'>('matrix');

  // 矩陣子標籤頁：'overview' | 'track:<trackCode>'
  matrixSubTab = signal<string>('overview');
  // 從 matrixSubTab 解析當前軌道 code
  activeTrackCode = computed(() => {
    const tab = this.matrixSubTab();
    return tab.startsWith('track:') ? tab.substring(6) : null;
  });

  // 當前活躍軌道實體（用於取得 maxGrade 等屬性）
  activeTrack = computed(() => {
    const code = this.activeTrackCode();
    return code ? this.tracks().find(t => t.code === code) || null : null;
  });

  // 依軌道 maxGrade 篩選後的職等（Tab B/C 用）
  trackFilteredGradesDescending = computed(() => {
    const track = this.activeTrack();
    const grades = this.gradesDescending();
    if (!track) return grades;
    return grades.filter(g => g.grade <= track.maxGrade);
  });

  // 現有職等編號列表（用於新增時驗證重複）
  existingGradeNumbers = computed(() => this.gradesNew().map(g => g.grade));

  // 最高職等編號
  maxGradeNumber = computed(() => {
    const grades = this.existingGradeNumbers();
    return grades.length > 0 ? Math.max(...grades) : 7;
  });

  // 當前面板對應的職位（grade + track 篩選）
  editingTrackPositions = computed(() =>
    this.departmentPositions().filter(p =>
      p.grade === this.editingTrackGrade() && p.track === this.editingTrackCode()
    )
  );

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
  showTrackDetailPanel = signal(false);

  // 正在編輯的職等 grade number（用於卡片高亮）
  editingGradeNumber = signal<number | null>(null);

  // Track detail 面板資料
  editingTrackGrade = signal<number>(0);
  editingTrackCode = signal<string>('');
  editingTrackName = signal<string>('');
  editingTrackEntry = signal<GradeTrackEntry | null>(null);
  editingTrackPromotion = signal<PromotionCriteria | null>(null);

  // Modal 編輯資料（null = 新增模式）
  editingTrack = signal<GradeTrackEntity | null>(null);
  editingGrade = signal<GradeLevelNew | null>(null);
  editingPosition = signal<DepartmentPosition | null>(null);
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

  selectedEmployee = computed(() => {
    const id = this.selectedEmployeeId();
    return this.employees().find(e => e.id === id) || null;
  });

  /** 根據當前 tab 決定使用哪個子公司 ID 載入資料 */
  private activeOrgUnitId = computed(() => {
    const tab = this.matrixSubTab();
    return tab === 'overview' ? this.overviewSubsidiaryId() : this.selectedSubsidiaryId();
  });

  constructor() {
    // 切換 tab 或子公司下拉時自動重新載入資料
    effect(() => {
      const orgUnitId = this.activeOrgUnitId();
      this.loadDataNew();
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe(() => {
      // Tab B/C 預設選取第一間子公司
      const subs = this.subsidiaries();
      if (subs.length > 0 && !this.selectedSubsidiaryId()) {
        this.selectedSubsidiaryId.set(subs[0].id);
      }
    });
    this.loadData();
    this.loadEmployees();
    this.loadTracks();
    this.loadPendingChanges();
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

  // 載入新版資料 (從 API)（根據 activeOrgUnitId 載入對應子公司資料）
  loadDataNew(): void {
    const orgUnitId = this.activeOrgUnitId() || undefined;

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

  // Tab A 子公司篩選變更
  onOverviewSubsidiaryChange(id: string): void {
    this.overviewSubsidiaryId.set(id);
  }

  // 部門篩選變更
  onDepartmentFilterChange(value: string): void {
    this.selectedDepartmentFilter.set(value);
  }

  // 取得特定部門、職等、軌道的所有職位
  getPositionsFor(department: string, grade: number, track: string): DepartmentPosition[] {
    return this.departmentPositions().filter(p =>
      p.department === department && p.grade === grade && p.track === track
    );
  }

  // 取得職等由高到低排序的資料
  gradesDescending = computed(() => {
    return [...this.gradesNew()].sort((a, b) => b.grade - a.grade);
  });

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

  // 有待審核變更的職等集合（用於表格顯示 badge）
  pendingGrades = computed(() => {
    const set = new Set<number>();
    for (const change of this.pendingChanges()) {
      const data = change.newData || change.oldData;
      if (data?.grade) set.add(data.grade);
    }
    return set;
  });

  hasPendingForGrade(grade: number): boolean {
    return this.pendingGrades().has(grade);
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
    this.loadPendingChanges();
    this.closeGradeEditPanel();
  }

  // --- 部門職位 CRUD ---
  openEditPosition(position: DepartmentPosition | null = null): void {
    this.editingPosition.set(position);
    this.showPositionEditModal.set(true);
  }
  closePositionModal(): void { this.showPositionEditModal.set(false); this.editingPosition.set(null); }
  onPositionSaved(): void {
    this.loadDataNew();
    this.loadPendingChanges();
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

  // --- 軌道明細面板 ---
  openTrackDetailPanel(grade: GradeLevelNew, trackCode: string): void {
    // 點擊同一行 → 關閉面板
    if (this.showTrackDetailPanel() && this.editingTrackGrade() === grade.grade && this.editingTrackCode() === trackCode) {
      this.closeTrackDetailPanel();
      return;
    }

    const track = this.tracks().find(t => t.code === trackCode);
    const entry = this.getTrackEntry(grade, trackCode) || null;
    const promo = this.getPromotionFromGrade(grade.grade, trackCode);

    this.editingTrackGrade.set(grade.grade);
    this.editingTrackCode.set(trackCode);
    this.editingTrackName.set(track?.name || trackCode);
    this.editingTrackEntry.set(entry ?? null);
    this.editingTrackPromotion.set(promo);
    this.showTrackDetailPanel.set(true);
  }

  closeTrackDetailPanel(): void {
    this.showTrackDetailPanel.set(false);
    this.editingTrackGrade.set(0);
    this.editingTrackCode.set('');
    this.editingTrackName.set('');
    this.editingTrackEntry.set(null);
    this.editingTrackPromotion.set(null);
  }

  onTrackDetailSaved(): void {
    this.loadDataNew();
    this.loadPendingChanges();
    this.closeTrackDetailPanel();
  }

  onPositionInPanelSaved(): void {
    // 重新載入職位資料（不關閉面板）
    const orgUnitId = this.activeOrgUnitId() || undefined;
    this.competencyService.getDepartmentPositions(undefined, undefined, undefined, orgUnitId).subscribe(data => {
      this.departmentPositions.set(data);
    });
    this.loadPendingChanges();
  }

  // 取得從指定職等晉升的晉升條件（搜尋 fromGrade）
  getPromotionFromGrade(grade: number, track: string): PromotionCriteria | null {
    const criteria = this.promotionCriteria();
    return criteria.find(c =>
      c.fromGrade === grade &&
      (c.track === track || c.track === 'both')
    ) || null;
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
    const map: Record<string, string> = { track: '軌道', grade: '職等', salary: '薪資', position: '職位', promotion: '晉升條件', 'track-entry': '軌道條目', 'track-detail': '軌道明細' };
    return map[type] || type;
  }

  // 取得操作類型中文名稱
  getActionLabel(action: string): string {
    const map: Record<string, string> = { create: '新增', update: '更新', delete: '刪除' };
    return map[action] || action;
  }

  // 取得變更內容的可讀描述
  getChangeDescription(change: ChangeRecord): string {
    const data = change.newData || change.oldData;
    if (!data) return '—';

    const label = this.getEntityLabel(change);

    // track-detail 特殊處理（合併描述）
    if (change.entityType === 'track-detail') {
      const details = this.getTrackDetailDescription(change);
      if (details.length > 0) return `${label}：${details.join('、')}`;
      return label;
    }

    // update 操作：比較新舊資料，顯示具體差異
    if (change.action === 'update' && change.oldData && change.newData) {
      const diffs = this.getFieldDiffs(change);
      if (diffs.length > 0) return `${label}：${diffs.join('、')}`;
    }

    // create 操作：列出已設定的欄位
    if (change.action === 'create' && data) {
      const extras = this.getCreateDetails(change.entityType, data);
      if (extras.length > 0) return `${label}：${extras.join('、')}`;
    }

    return label;
  }

  // 取得 create 操作中已設定的欄位摘要
  private getCreateDetails(entityType: string, data: Record<string, unknown>): string[] {
    const details: string[] = [];
    switch (entityType) {
      case 'track-entry':
        if (data['educationRequirement']) details.push(`學歷要求「${data['educationRequirement']}」`);
        if (data['responsibilityDescription']) details.push('職責描述已設定');
        if (data['requiredSkillsAndTraining']) details.push('所需技能與培訓已設定');
        break;
      case 'promotion':
        if (data['performanceThreshold']) details.push(`績效門檻 ${data['performanceThreshold']}`);
        if (data['promotionProcedure']) details.push(`晉升程序「${data['promotionProcedure']}」`);
        if ((data['requiredSkills'] as string[])?.length) details.push(`必備技能 ${(data['requiredSkills'] as string[]).length} 項`);
        if ((data['requiredCourses'] as string[])?.length) details.push(`必修課程 ${(data['requiredCourses'] as string[]).length} 項`);
        if ((data['kpiFocus'] as string[])?.length) details.push(`KPI 指標 ${(data['kpiFocus'] as string[]).length} 項`);
        if ((data['additionalCriteria'] as string[])?.length) details.push(`附加條件 ${(data['additionalCriteria'] as string[]).length} 項`);
        break;
      case 'grade':
        if (data['salaryLevels'] && (data['salaryLevels'] as unknown[]).length > 0) {
          details.push(`薪資 ${(data['salaryLevels'] as unknown[]).length} 筆`);
        }
        if (data['managementTitle']) details.push(`管理職「${data['managementTitle']}」`);
        if (data['professionalTitle']) details.push(`專業職「${data['professionalTitle']}」`);
        break;
    }
    return details;
  }

  // 取得 track-detail 合併變更的描述
  private getTrackDetailDescription(change: ChangeRecord): string[] {
    const diffs: string[] = [];
    const o = change.oldData || {} as Record<string, unknown>;
    const n = change.newData || {} as Record<string, unknown>;
    const ote = (o['trackEntry'] || {}) as Record<string, string>;
    const nte = (n['trackEntry'] || {}) as Record<string, string>;
    const opromo = (o['promotion'] || null) as Record<string, unknown> | null;
    const npromo = (n['promotion'] || null) as Record<string, unknown> | null;

    // 軌道條目差異
    if (change.action === 'create' || !ote['title']) {
      // 新增模式：列出已設定欄位
      if (nte['educationRequirement']) diffs.push(`學歷要求「${nte['educationRequirement']}」`);
      if (nte['responsibilityDescription']) diffs.push('職責描述已設定');
      if (nte['requiredSkillsAndTraining']) diffs.push('所需技能與培訓已設定');
    } else {
      // 更新模式：比較差異
      if (ote['title'] !== nte['title']) diffs.push(`職稱 ${ote['title'] || '(空)'} → ${nte['title'] || '(空)'}`);
      if (ote['educationRequirement'] !== nte['educationRequirement']) diffs.push('學歷要求已變更');
      if (ote['responsibilityDescription'] !== nte['responsibilityDescription']) diffs.push('職責描述已變更');
      if (ote['requiredSkillsAndTraining'] !== nte['requiredSkillsAndTraining']) diffs.push('所需技能與培訓已變更');
    }

    // 晉升條件差異
    if (npromo) {
      if (!opromo) {
        diffs.push('晉升條件已設定');
      } else {
        if (opromo['performanceThreshold'] !== npromo['performanceThreshold']) diffs.push(`績效門檻 ${opromo['performanceThreshold']} → ${npromo['performanceThreshold']}`);
        if (opromo['promotionProcedure'] !== npromo['promotionProcedure']) diffs.push('晉升程序已變更');
        if (JSON.stringify(opromo['requiredSkills']) !== JSON.stringify(npromo['requiredSkills'])) diffs.push('必備技能已變更');
        if (JSON.stringify(opromo['requiredCourses']) !== JSON.stringify(npromo['requiredCourses'])) diffs.push('必修課程已變更');
        if (JSON.stringify(opromo['kpiFocus']) !== JSON.stringify(npromo['kpiFocus'])) diffs.push('KPI 指標已變更');
        if (JSON.stringify(opromo['additionalCriteria']) !== JSON.stringify(npromo['additionalCriteria'])) diffs.push('附加條件已變更');
      }
    }

    // 職位變更
    const posAdds = (n['positionAdds'] || []) as { department: string; title: string }[];
    const posDeletes = (n['positionDeletes'] || []) as string[];
    if (posAdds.length > 0) diffs.push(`新增職位 ${posAdds.map(p => `${p.department}「${p.title}」`).join('、')}`);
    if (posDeletes.length > 0) diffs.push(`刪除職位 ${posDeletes.length} 筆`);

    return diffs;
  }

  // 取得實體的基本標籤
  private getEntityLabel(change: ChangeRecord): string {
    const data = change.newData || change.oldData;
    const parts = (...items: (string | undefined | false)[]): string =>
      items.filter(Boolean).join(' ') || '—';

    switch (change.entityType) {
      case 'grade':
        return parts(`職等 ${data.grade}`, data.codeRange && `(${data.codeRange})`);
      case 'position':
        return parts(data.department, data.grade && `Grade ${data.grade}`, data.track && this.getTrackLabel(data.track), data.title && `「${data.title}」`);
      case 'track-entry':
        return parts(data.grade && `Grade ${data.grade}`, data.track && this.getTrackLabel(data.track), data.title && `「${data.title}」`);
      case 'promotion':
        return parts(data.fromGrade && data.toGrade && `Grade ${data.fromGrade} → ${data.toGrade}`, data.track && this.getTrackLabel(data.track));
      case 'salary':
        return parts(data.grade && `Grade ${data.grade}`, data.code);
      case 'track-detail': {
        const te = data['trackEntry'] as Record<string, unknown> | undefined;
        const teTitle = te?.['title'] as string | undefined;
        return parts(data['grade'] && `Grade ${data['grade']}`, data['track'] && this.getTrackLabel(data['track'] as string), teTitle && `「${teTitle}」`);
      }
      case 'track':
        return data.name || data.code || '—';
      default:
        return '—';
    }
  }

  // 比較新舊資料，回傳各欄位的差異描述
  private getFieldDiffs(change: ChangeRecord): string[] {
    const o = change.oldData;
    const n = change.newData;
    const diffs: string[] = [];
    const fmt = (v: number) => v?.toLocaleString('zh-TW') ?? '0';

    switch (change.entityType) {
      case 'grade':
        if (o.codeRange !== n.codeRange) diffs.push(`代碼 ${o.codeRange} → ${n.codeRange}`);
        if (o.managementTitle !== undefined && o.managementTitle !== n.managementTitle) {
          diffs.push(`管理職 ${o.managementTitle || '(空)'} → ${n.managementTitle || '(空)'}`);
        }
        if (o.professionalTitle !== undefined && o.professionalTitle !== n.professionalTitle) {
          diffs.push(`專業職 ${o.professionalTitle || '(空)'} → ${n.professionalTitle || '(空)'}`);
        }
        // 薪資級別比較（以位置比對，避免代碼前綴變更時誤判為全部新增/刪除）
        if (o.salaryLevels && n.salaryLevels) {
          const salaryDiffs: string[] = [];
          const maxLen = Math.max(o.salaryLevels.length, n.salaryLevels.length);
          for (let i = 0; i < maxLen; i++) {
            const oldSal = o.salaryLevels[i] as { code: string; salary: number } | undefined;
            const newSal = n.salaryLevels[i] as { code: string; salary: number } | undefined;
            if (!oldSal && newSal) {
              salaryDiffs.push(`${newSal.code} 新增 ${fmt(newSal.salary)}`);
            } else if (oldSal && !newSal) {
              salaryDiffs.push(`${oldSal.code} 已刪除`);
            } else if (oldSal && newSal && oldSal.salary !== newSal.salary) {
              salaryDiffs.push(`${newSal.code} ${fmt(oldSal.salary)} → ${fmt(newSal.salary)}`);
            }
          }
          if (salaryDiffs.length > 0) {
            diffs.push(`薪資 ${salaryDiffs.join('、')}`);
          }
        }
        break;
      case 'salary':
        if (o.code !== n.code) diffs.push(`代碼 ${o.code} → ${n.code}`);
        if (o.salary !== n.salary) diffs.push(`薪資 ${fmt(o.salary)} → ${fmt(n.salary)}`);
        break;
      case 'track':
        if (o.name !== n.name) diffs.push(`名稱 ${o.name} → ${n.name}`);
        if (o.maxGrade !== n.maxGrade) diffs.push(`最高職等 ${o.maxGrade} → ${n.maxGrade}`);
        if (o.color !== n.color) diffs.push(`顏色已變更`);
        break;
      case 'track-entry':
        if (o.title !== n.title) diffs.push(`職稱 ${o.title || '(空)'} → ${n.title || '(空)'}`);
        if (o.educationRequirement !== n.educationRequirement) diffs.push(`學歷要求已變更`);
        if (o.responsibilityDescription !== n.responsibilityDescription) diffs.push(`職責描述已變更`);
        if (o.requiredSkillsAndTraining !== n.requiredSkillsAndTraining) diffs.push(`所需技能與培訓已變更`);
        break;
      case 'position':
        if (o.title !== n.title) diffs.push(`職稱 ${o.title} → ${n.title}`);
        if (o.department !== n.department) diffs.push(`部門 ${o.department} → ${n.department}`);
        if (o.track !== n.track) diffs.push(`軌道 ${this.getTrackLabel(o.track)} → ${this.getTrackLabel(n.track)}`);
        if (o.grade !== n.grade) diffs.push(`職等 ${o.grade} → ${n.grade}`);
        break;
      case 'promotion':
        if (o.performanceThreshold !== n.performanceThreshold) diffs.push(`績效門檻 ${o.performanceThreshold} → ${n.performanceThreshold}`);
        if (o.track !== n.track) diffs.push(`軌道 ${this.getTrackLabel(o.track)} → ${this.getTrackLabel(n.track)}`);
        break;
    }
    return diffs;
  }

  // 取得狀態 CSS class
  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待審核',
      approved: '已核准',
      rejected: '已駁回'
    };
    return labels[status] || status;
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

  // 取得完整 trackEntry
  getTrackEntry(grade: GradeLevelNew, trackCode: string): GradeTrackEntry | undefined {
    return grade.trackEntries?.find(e => e.track === trackCode);
  }

  // 取得指定軌道的職稱（僅組織自有資料）
  getTrackTitle(grade: GradeLevelNew, trackCode: string): string {
    return this.getTrackEntry(grade, trackCode)?.title || '';
  }

  // 取得指定軌道的職稱（含集團預設 fallback，用於 Tab B/C）
  getTrackTitleWithFallback(grade: GradeLevelNew, trackCode: string): string {
    const own = this.getTrackTitle(grade, trackCode);
    if (own) return own;
    if (!grade.defaults) return '';
    return trackCode === 'management' ? grade.defaults.managementTitle : grade.defaults.professionalTitle;
  }

  getManagementTitle(grade: GradeLevelNew): string {
    return this.getTrackTitle(grade, 'management');
  }

  getProfessionalTitle(grade: GradeLevelNew): string {
    return this.getTrackTitle(grade, 'professional');
  }

  getTrackEducation(grade: GradeLevelNew, track: string): string {
    return this.getTrackEntry(grade, track)?.educationRequirement || '';
  }

  getTrackResponsibility(grade: GradeLevelNew, track: string): string {
    return this.getTrackEntry(grade, track)?.responsibilityDescription || '';
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

