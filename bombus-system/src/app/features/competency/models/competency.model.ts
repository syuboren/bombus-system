// =====================================================
// L2 職能管理模組 - 資料模型
// =====================================================

// ---------------------------------------------------------------
// 職等職級相關
// ---------------------------------------------------------------
export type GradeType = 'professional' | 'management' | 'specialist';

export interface GradeLevel {
  id: string;
  code: string;                // 職等代碼 (如：P1, M2)
  name: string;                // 職等名稱
  type: GradeType;
  level: number;               // 等級數字
  minSalary: number;
  maxSalary: number;
  requirements: string[];
  competencies: string[];      // 職能 ID 列表
}

export interface GradeMatrix {
  rows: GradeLevel[];
  columns: string[];           // 職系列表
}

// ---------------------------------------------------------------
// 職涯路徑相關
// ---------------------------------------------------------------
export type CareerPathType = 'vertical' | 'horizontal' | 'cross-department';

export interface CareerStep {
  order: number;
  title: string;
  description: string;
  duration: string;
  requiredCompetencies: string[];
  status: 'completed' | 'current' | 'pending';
}

export interface CareerPath {
  id: string;
  type: CareerPathType;
  name: string;
  description: string;
  currentPosition: string;
  targetPosition: string;
  estimatedTime: string;
  steps: CareerStep[];
  requiredCompetencies: CompetencyItem[];
}

// ---------------------------------------------------------------
// 職能要素 (KSA) 相關
// ---------------------------------------------------------------
export type CompetencyType = 'knowledge' | 'skill' | 'attitude';
export type CompetencyCategory = 'core' | 'management' | 'ksa';
export type CompetencyLevel = 'basic' | 'intermediate' | 'advanced' | 'expert';

// 核心職能/管理職能等級 (L1-L6)
export type CompetencyGradeLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6';

// 核心職能/管理職能的等級指標
export interface CompetencyLevelIndicator {
  level: CompetencyGradeLevel;
  indicators: string[];
}

// =====================================================
// 核心職能 / 管理職能 - 有 L1-L6 等級
// =====================================================
export interface CoreManagementCompetency {
  id: string;
  code: string;
  name: string;
  type: 'core' | 'management';    // 核心職能 or 管理職能
  definition: string;             // 職能定義
  levels: CompetencyLevelIndicator[];  // L1-L6 等級指標
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// KSA職能 - 無等級區分，只需勾選
// =====================================================
export interface KSACompetencyItem {
  id: string;
  code: string;
  name: string;
  ksaType: CompetencyType;        // knowledge/skill/attitude
  description: string;
  behaviorIndicators: string[];
  linkedCourses: string[];
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// 舊版 CompetencyItem (保留相容性)
// =====================================================
export interface CompetencyItem {
  id: string;
  code: string;                // 職能代碼
  name: string;
  type: CompetencyType;        // K/S/A
  category: CompetencyCategory;
  level: CompetencyLevel;
  description: string;
  behaviorIndicators: string[];
  linkedCourses: string[];
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// 職能框架
// =====================================================
export interface CompetencyFramework {
  id: string;
  name: string;
  description: string;
  category: CompetencyCategory;
  competencies?: CompetencyItem[];              // 舊版 KSA 項目
  coreCompetencies?: CoreManagementCompetency[];  // 核心職能 (L1-L6)
  managementCompetencies?: CoreManagementCompetency[];  // 管理職能 (L1-L6)
  ksaCompetencies?: KSACompetencyItem[];        // KSA職能 (無等級)
  totalCount: number;
}

// =====================================================
// JD 中的職能需求設定
// =====================================================
// 核心/管理職能需求 - 指定等級
export interface CoreMgmtCompetencyRequirement {
  competencyId: string;
  competencyName: string;
  type: 'core' | 'management';
  requiredLevel: CompetencyGradeLevel;  // L1-L6
}

// KSA職能需求 - 僅勾選
export interface KSACompetencyRequirement {
  competencyId: string;
  competencyName: string;
  ksaType: CompetencyType;  // knowledge/skill/attitude
}

// ---------------------------------------------------------------
// 職務說明書 (JD) 相關 - 包含 11 個區塊
// ---------------------------------------------------------------
export interface JobDescription {
  id: string;
  positionCode: string;
  positionName: string;
  department: string;
  gradeLevel: string;

  // ====== 11 個區塊 ======
  // 1. 主要職責
  responsibilities: string[];

  // 2. 職務目的
  jobPurpose: string[];

  // 3. 職務要求
  qualifications: string[];

  // 4. 最終有價值產品 VFP
  vfp: string[];

  // 5. 職能基準 (包含 KSA)
  competencyStandards: CompetencyStandard[];
  requiredCompetencies: CompetencyRequirement[];

  // 5.1 職能內涵 (K/S/A 詳細內容)
  ksaContent?: KSAContent;

  // 6. 工作描述
  workDescription: string[];

  // 7. 檢查清單
  checklist: ChecklistItem[];

  // 8. 職務責任
  jobDuties: string[];

  // 9. 每日工作
  dailyTasks: string[];

  // 10. 每週工作
  weeklyTasks: string[];

  // 11. 每月工作
  monthlyTasks: string[];

  // ====== 元資料 ======
  summary: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 職能基準 (工作任務、產出、行為指標)
export interface CompetencyStandard {
  mainDuty: string;             // 主要職責
  tasks: TaskItem[];            // 工作任務與產出
}

export interface TaskItem {
  taskName: string;             // 工作任務
  outputs: string[];            // 工作產出
  indicators: string[];         // 行為指標
}

// 檢查清單項目
export interface ChecklistItem {
  item: string;
  points: number;
}

// KSA 職能內涵 - 詳細定義
export interface KSACompetency {
  code: string;
  name: string;
  description?: string;
}

// 職能內涵區塊 (對應文件中的職能內涵-K, 職能內涵-S, 職能內涵-A)
export interface KSAContent {
  knowledge: KSAItem[];   // 職能內涵-K
  skills: KSAItem[];      // 職能內涵-S
  attitudes: KSAItem[];   // 職能內涵-A
}

export interface KSAItem {
  code: string;           // 如 K01, S01, A01
  name: string;           // 職能名稱
  description?: string;   // 詳細說明
}

export interface CompetencyRequirement {
  competencyId: string;
  competencyName: string;
  type: CompetencyType;
  requiredLevel: number;       // 1-5
  weight: number;              // 權重百分比
}

export interface JDVersion {
  version: string;
  updatedAt: Date;
  updatedBy: string;
  changeLog: string;
}

// ---------------------------------------------------------------
// 職能評估相關
// ---------------------------------------------------------------
export type AssessmentStatus = 'not_started' | 'self_assessment' | 'manager_review' | 'completed';

export interface CompetencyAssessment {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  assessmentPeriod: string;    // 評估期間
  competencyScores: CompetencyScore[];
  selfAssessmentDate?: Date;
  managerReviewDate?: Date;
  status: AssessmentStatus;
  overallScore: number;
  managerComments?: string;
}

export interface CompetencyScore {
  competencyId: string;
  competencyName: string;
  type: CompetencyType;
  selfScore: number;           // 1-5
  managerScore?: number;       // 1-5
  finalScore?: number;
  evidence?: string;           // 佐證說明
}

export interface AssessmentSchedule {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed';
  targetDepartments: string[];
  completionRate: number;
}

// ---------------------------------------------------------------
// 職能落差分析相關
// ---------------------------------------------------------------
export type GapSeverity = 'critical' | 'moderate' | 'minor' | 'none';

export interface CompetencyGap {
  competencyId: string;
  competencyName: string;
  type: CompetencyType;
  required: number;            // JD 要求分數
  actual: number;              // 實際評估分數
  gap: number;                 // 落差值 (required - actual)
  severity: GapSeverity;
  recommendedCourses: RecommendedCourse[];
}

export interface RecommendedCourse {
  id: string;
  name: string;
  duration: string;
  provider: string;
  type: 'online' | 'classroom' | 'ojt';
}

export interface GapAnalysisReport {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  analysisDate: Date;
  overallGapScore: number;
  gaps: CompetencyGap[];
  radarData: RadarDataPoint[];
  recommendations: string[];
}

export interface RadarDataPoint {
  competencyName: string;
  required: number;
  actual: number;
}

// ---------------------------------------------------------------
// AI 職能生成相關
// ---------------------------------------------------------------
export interface AIGenerationRequest {
  inputType: 'jd_text' | 'jd_file' | 'position_name';
  content: string;
  targetCategory?: CompetencyCategory;
}

export interface AIGeneratedCompetency {
  name: string;
  type: CompetencyType;
  category: CompetencyCategory;
  level: CompetencyLevel;
  description: string;
  behaviorIndicators: string[];
  confidence: number;          // AI 信心度 0-100
}

export interface AIGenerationResult {
  requestId: string;
  generatedAt: Date;
  competencies: AIGeneratedCompetency[];
  suggestions: string[];
}

// ---------------------------------------------------------------
// 統計與儀表板相關
// ---------------------------------------------------------------
export interface CompetencyStats {
  totalCompetencies: number;
  byType: {
    knowledge: number;
    skill: number;
    attitude: number;
  };
  byCategory: {
    core: number;        // 核心職能
    management: number;  // 管理職能
    ksa: number;         // KSA職能 (K/S/A)
  };
  recentlyUpdated: number;
}

export interface DepartmentCompetencyStats {
  department: string;
  avgScore: number;
  assessmentCompletion: number;
  topGaps: string[];
}

// ---------------------------------------------------------------
// 篩選器與選項
// ---------------------------------------------------------------
export interface CompetencyFilter {
  type?: CompetencyType;
  category?: CompetencyCategory;
  level?: CompetencyLevel;
  searchKeyword?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export const COMPETENCY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'knowledge', label: '知識 (Knowledge)' },
  { value: 'skill', label: '技能 (Skill)' },
  { value: 'attitude', label: '態度 (Attitude)' }
];

export const COMPETENCY_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'core', label: '核心職能' },
  { value: 'management', label: '管理職能' },
  { value: 'ksa', label: 'KSA職能' }
];

export const COMPETENCY_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'basic', label: '初階' },
  { value: 'intermediate', label: '中階' },
  { value: 'advanced', label: '進階' },
  { value: 'expert', label: '專家' }
];

// 核心職能/管理職能等級選項 (L1-L6)
export const COMPETENCY_GRADE_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'L1', label: 'L1 - 基礎執行' },
  { value: 'L2', label: 'L2 - 獨立作業' },
  { value: 'L3', label: 'L3 - 帶領團隊' },
  { value: 'L4', label: 'L4 - 策略規劃' },
  { value: 'L5', label: 'L5 - 高階領導' },
  { value: 'L6', label: 'L6 - 戰略引領' }
];

export const GRADE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'professional', label: '專業職' },
  { value: 'management', label: '管理職' },
  { value: 'specialist', label: '專家職' }
];

