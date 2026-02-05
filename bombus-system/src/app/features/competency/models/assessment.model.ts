// =====================================================
// 職能評估系統 - 資料模型 (Assessment Models)
// =====================================================

// ---------------------------------------------------------------
// 狀態類型定義
// ---------------------------------------------------------------

/** 月度檢核狀態 */
export type MonthlyCheckStatus =
  | 'self_assessment'    // 自評中
  | 'manager_review'     // 主管審核中
  | 'hr_review'          // HR 審核中
  | 'completed'          // 已完成
  | 'overdue';           // 逾期

/** 季度面談狀態 */
export type QuarterlyReviewStatus =
  | 'pending'            // 尚未填寫 (初始化)
  | 'employee_submitted' // 員工已提交
  | 'manager_reviewed'   // 主管已評核
  | 'interview_scheduled'// 已預約面談
  | 'interview_completed'// 面談完成
  | 'completed';         // HR 結案

/** 週報狀態 */
export type WeeklyReportStatus =
  | 'not_started' // 尚未填寫 (自動生成)
  | 'draft'       // 草稿 (已開始填寫)
  | 'submitted'   // 已提交 (待審核)
  | 'approved'    // 已通過
  | 'rejected';   // 已退回

// ---------------------------------------------------------------
// 月度檢核相關介面
// ---------------------------------------------------------------

/** 月度檢核表 */
export interface MonthlyCheck {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  managerId: string;
  managerName: string;
  year: number;
  month: number;
  status: MonthlyCheckStatus;
  selfAssessmentDate?: string;
  managerReviewDate?: string;
  hrReviewDate?: string;
  totalScore?: number;
  managerComment?: string;
  hrComment?: string;
  // 電子簽名欄位
  employeeSignature?: string;
  employeeSignatureDate?: string;
  managerSignature?: string;
  managerSignatureDate?: string;
  hrSignature?: string;
  hrSignatureDate?: string;
  items: MonthlyCheckItem[];
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 月度檢核項目 */
export interface MonthlyCheckItem {
  id: string;
  templateId?: string;
  name: string;
  points: number;
  description: string;
  measurement: string;
  orderNum: number;
  selfScore?: number;
  managerScore?: number;
  weightedScore?: number;
}

/** 月度指標模板 */
export interface MonthlyCheckTemplate {
  id: string;
  department: string;
  position: string;
  name: string;
  points: number;
  description: string;
  measurement: string;
  orderNum: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------
// 季度面談相關介面
// ---------------------------------------------------------------

/** 季度績效面談 */
export interface QuarterlyReview {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  managerId: string;
  managerName: string;
  year: number;
  quarter: number;
  formType: 'manager' | 'employee';
  status: QuarterlyReviewStatus;
  monthlyAvgScore?: number;
  interviewDate?: string;
  interviewLocation?: string;
  totalScore?: number;
  managerComment?: string;
  developmentPlan?: string;
  hrComment?: string;
  sections: QuarterlyReviewSection[];
  satisfactionSurvey?: SatisfactionSurveyAnswer[];
  monthlyScores?: { month: number; selfScore: number | null; managerScore: number | null }[];
  createdAt: string;
  updatedAt: string;
}

/** 季度面談區塊類型 */
export type QuarterlyReviewSectionType =
  | 'self_assessment'        // 員工自評
  | 'contribution'           // 貢獻價值
  | 'learning'               // 學習成長
  | 'goals'                  // 目標檢核
  | 'jd_review'              // JD指標季檢核
  | 'okr_review'             // OKR目標季檢核
  | 'core_competency'        // 核心職能
  | 'management_competency'  // 管理職能 (僅主管)
  | 'supervisor_evaluation'  // 直屬主管評價
  | 'improvement_plan'       // 改善計劃
  | 'next_period_plan'       // 下期計劃
  | 'support_plan'           // 所需支持
  | 'personal_growth'        // 個人成長
  | 'other_content'          // 其他內容
  | 'next_goals'             // 下階段目標
  | 'signatures'             // 簽名確認
  | 'manager_comment'        // 主管評語 (相容舊資料)
  | 'development_plan';      // 發展計劃 (相容舊資料)

/** 季度面談區塊 */
export interface QuarterlyReviewSection {
  id: string;
  sectionType: QuarterlyReviewSectionType;
  content: string
    | ContributionItem[]
    | LearningItem[]
    | GoalItem[]
    | CompetencyItem[]
    | JdReviewItem[]
    | OkrReviewItem[]
    | CoreCompetencyItem[]
    | ManagementCompetencyItem[]
    | SupervisorEvaluationCategory[]
    | ImprovementPlanItem[]
    | NextGoalItem[];
  orderNum: number;
}

/** 貢獻價值項目 */
export interface ContributionItem {
  order: number;
  description: string;
  result: string;
  value: string;
}

/** 學習成長項目 */
export interface LearningItem {
  order: number;
  content: string;
  insights: string;
  implementation: string;
}

/** 目標檢核項目 */
export interface GoalItem {
  order: number;
  goal: string;
  status: 'achieved' | 'partial' | 'not_achieved';
  completionRate: number;
  notes: string;
}

/** 職能評估項目 (用於核心/管理職能自評) */
export interface CompetencyItem {
  id: number;
  name: string;
  description: string;
  selfScore: number;
  managerScore?: number;
}

/** JD指標季檢核項目 */
export interface JdReviewItem {
  order: number;
  month: number;
  description: string;
  selfScore?: number;
  managerScore?: number;
}

/** OKR目標季檢核項目 */
export interface OkrReviewItem {
  order: number;
  objective: string;
  description: string;
  selfScore?: number;
  managerScore?: number;
}

/** 核心職能項目 */
export interface CoreCompetencyItem {
  order: number;
  name: string;
  behavior: string;
  event: string;
  selfScore?: number;
  managerScore?: number;
}

/** 管理職能項目 (僅主管表單) */
export interface ManagementCompetencyItem {
  order: number;
  name: string;
  behavior: string;
  event: string;
  selfScore?: number;
  managerScore?: number;
}

/** 直屬主管評價類別 */
export interface SupervisorEvaluationCategory {
  category: string;
  items: SupervisorEvaluationItem[];
}

/** 直屬主管評價項目 */
export interface SupervisorEvaluationItem {
  order: number;
  description: string;
  selfScore?: number;
  managerScore?: number;
}

/** 主管評語區塊 */
export interface SupervisorComment {
  bestEvaluation: string;
  worstEvaluation: string;
  supplement: string;
}

/** 改善計劃項目 */
export interface ImprovementPlanItem {
  order: number;
  indicator: string;
  measure: string;
  deadline: string;
  resource: string;
}

/** 下階段目標項目 */
export interface NextGoalItem {
  order: number;
  task: string;
  support: string;
  deadline: string;
}

/** 滿意度調查題目 */
export interface SatisfactionQuestion {
  id: number;
  questionText: string;
  orderNum: number;
  isActive: boolean;
}

/** 滿意度調查答案 */
export interface SatisfactionSurveyAnswer {
  questionId: number;
  score: number;
}

// ---------------------------------------------------------------
// 工作週報相關介面 (擴充版)
// ---------------------------------------------------------------

/** 週報工作項目 (含時間追蹤) */
export interface WeeklyReportWorkItem {
  id: string;
  orderNum: number;
  content: string;              // 工作內容
  estimatedTime: number;        // 預計時間 (分鐘)
  actualTime: number;           // 實際時間 (分鐘)
  completedDate?: string;       // 完成日期
}

/** 週報代辦事項 */
export interface WeeklyTodoItem {
  id: string;
  orderNum: number;
  task: string;                 // 工作任務
  startDate?: string;           // 開始日期
  dueDate?: string;             // 到期日
  priority: 'high' | 'medium' | 'normal';     // 優先順序
  status: 'not_started' | 'in_progress' | 'completed';  // 狀態
}

/** 週報問題與解決方案 */
export interface WeeklyProblemItem {
  id: string;
  orderNum: number;
  problem: string;              // 存在問題
  solution: string;             // 提議解決辦法
  resolved: boolean;            // 是否解決
}

/** 週報教育訓練進度 */
export interface WeeklyTrainingItem {
  id: string;
  orderNum: number;
  courseName: string;           // 課程名稱/標的
  status: 'not_started' | 'in_progress' | 'completed';
  totalHours: number;           // 總時數
  completedHours: number;       // 已完成時數
  completionRate: number;       // 完成百分比 (自動計算)
  completedDate?: string;       // 實際完成日
}

/** 週報階段性任務進度 */
export interface WeeklyProjectItem {
  id: string;
  orderNum: number;
  task: string;                 // 工作任務
  progressRate: number;         // 已完成進度 (%)
  collaboration: string;        // 部門任務/跨部門協作
  challenges: string;           // 進度、困難與挑戰
  expectedDate?: string;        // 預計完成日
  actualDate?: string;          // 實際完成日
}

/** 工作週報 (擴充版) */
export interface WeeklyReport {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  managerName?: string;
  reviewerId?: string;
  reviewerName?: string;
  year: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  status: WeeklyReportStatus;
  submitDate?: string;
  reviewDate?: string;
  reviewerComment?: string;
  // 工作項目
  routineItems: WeeklyReportWorkItem[];
  nonRoutineItems: WeeklyReportWorkItem[];
  // 代辦事項
  todoItems: WeeklyTodoItem[];
  // 問題與解決方案
  problemItems: WeeklyProblemItem[];
  // 教育訓練進度
  trainingItems: WeeklyTrainingItem[];
  // 階段性任務進度
  projectItems: WeeklyProjectItem[];
  // 下週計畫 (舊)
  nextWeekPlan: string;
  // 本周工作總結
  weeklySummary: string;
  // 時數統計
  routineTotalMinutes: number;
  nonRoutineTotalMinutes: number;
  // 簽章
  employeeSignature?: string;
  employeeSignatureDate?: string;
  managerSignature?: string;
  managerSignatureDate?: string;
  // 時間戳
  createdAt: string;
  updatedAt: string;
}

/** 週報項目 (舊版相容) */
export interface WeeklyReportItem {
  id: string;
  orderNum: number;
  content: string;
}

/** 週報更新資料 */
export interface WeeklyReportUpdateData {
  routineItems?: Partial<WeeklyReportWorkItem>[];
  nonRoutineItems?: Partial<WeeklyReportWorkItem>[];
  todoItems?: Partial<WeeklyTodoItem>[];
  problemItems?: Partial<WeeklyProblemItem>[];
  trainingItems?: Partial<WeeklyTrainingItem>[];
  projectItems?: Partial<WeeklyProjectItem>[];
  nextWeekPlan?: string;
  weeklySummary?: string;
}

/** 週報提交資料 */
export interface WeeklyReportSubmitData extends WeeklyReportUpdateData {
  employeeSignature?: string;
}

// ---------------------------------------------------------------
// 統計與概覽相關介面
// ---------------------------------------------------------------

/** 統計概覽 */
export interface CompetencyOverview {
  monthlyCheck: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
    completionRate: number;
  };
  quarterlyReview: {
    total: number;
    completed: number;
    inProgress: number;
    completionRate: number;
  };
  weeklyReport: {
    total: number;
    submitted: number;
    approved: number;
    submissionRate: number;
  };
}

/** 個人績效趨勢 */
export interface PersonalTrend {
  monthlyScores: { month: number; score: number }[];
  quarterlyScores: { quarter: number; score: number }[];
}

/** 待處理事項 */
export interface PendingTask {
  id: string;
  type: 'monthly_check' | 'quarterly_review' | 'weekly_report';
  title: string;
  description: string;
  deadline?: string;
  status: string;
  referenceId: string;
}

/** 截止日提醒 */
export interface DeadlineReminder {
  type: 'monthly_check' | 'quarterly_review' | 'weekly_report';
  title: string;
  deadline: string;
  daysRemaining: number;
}

/** 未完成清單項目 */
export interface IncompleteItem {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  status: string;
  statusLabel: string;
  dueDate?: string;
  daysOverdue?: number;
}

/** 部門平均分數 */
export interface DepartmentAvgScore {
  department: string;
  avgScore: number;
  employeeCount: number;
  completedCount: number;
}

/** 個人歷史績效 */
export interface PersonalHistory {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  monthlyScores: { yearMonth: string; score: number }[];
  quarterlyScores: { yearQuarter: string; score: number }[];
}

// ---------------------------------------------------------------
// 篩選與分頁相關介面
// ---------------------------------------------------------------

/** 篩選參數 */
export interface AssessmentFilter {
  year?: number;
  month?: number;
  quarter?: number;
  week?: number;
  status?: string;
  departmentId?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 分頁資訊 */
export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** 分頁結果 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}

/** 週報統計 (根據篩選條件計算) */
export interface WeeklyReportStats {
  total: number;           // 總數
  notStarted: number;      // 尚未填寫
  draft: number;           // 草稿
  submitted: number;       // 已提交
  approved: number;        // 已通過
  rejected: number;        // 已退回
  submissionRate: number;  // 提交率 ((submitted + approved) / total * 100)
}

// ---------------------------------------------------------------
// API 回應相關介面
// ---------------------------------------------------------------

/** API 錯誤 */
export interface ApiError {
  code: string;
  message: string;
}

/** API 回應 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ---------------------------------------------------------------
// 系統設定相關介面
// ---------------------------------------------------------------

/** 系統設定 */
export interface SystemConfig {
  monthlyCheckSelfDeadline: number;
  monthlyCheckManagerDeadline: number;
  monthlyCheckHrDeadline: number;
  monthlyReminderDay: number;
  weeklyReportDeadline: string;
}

// ---------------------------------------------------------------
// 常數與選項定義
// ---------------------------------------------------------------

/** 狀態中文標籤對應 */
export const STATUS_LABELS: Record<string, string> = {
  // 月度檢核
  self_assessment: '自評中',
  manager_review: '主管審核中',
  hr_review: 'HR 審核中',
  completed: '已完成',
  overdue: '逾期',
  // 季度面談
  pending: '尚未填寫',
  employee_submitted: '員工已提交',
  manager_reviewed: '主管已評核',
  interview_scheduled: '已預約面談',
  interview_completed: '面談完成',
  // 週報
  not_started: '尚未填寫',
  draft: '草稿',
  submitted: '已提交',
  approved: '已通過',
  rejected: '已退回'
};

/** 狀態顏色對應 */
export const STATUS_COLORS: Record<string, string> = {
  // 月度檢核
  self_assessment: '#7F9CA0',
  manager_review: '#D6A28C',
  hr_review: '#9A8C98',
  completed: '#8DA399',
  overdue: '#C75B5B',
  // 季度面談
  pending: '#858E96',
  employee_submitted: '#7F9CA0',
  manager_reviewed: '#D6A28C',
  interview_scheduled: '#9A8C98',
  interview_completed: '#8DA399',
  // 週報
  not_started: '#B8C4CE',
  draft: '#858E96',
  submitted: '#7F9CA0',
  approved: '#8DA399',
  rejected: '#C75B5B'
};

/** 評分等級選項 */
export const SCORE_OPTIONS = [
  { value: 5, label: '優秀', description: '遠超預期目標' },
  { value: 4, label: '良好', description: '達到預期目標' },
  { value: 3, label: '普通', description: '接近目標' },
  { value: 2, label: '待改善', description: '未達目標' },
  { value: 1, label: '極待改善', description: '完全未達成' }
];

/** 季度選項 */
export const QUARTER_OPTIONS = [
  { value: 1, label: 'Q1', months: '1-3月', deadline: '4/30' },
  { value: 2, label: 'Q2', months: '4-6月', deadline: '6/30' },
  { value: 3, label: 'Q3', months: '7-9月', deadline: '9/30' },
  { value: 4, label: 'Q4', months: '10-12月', deadline: '12/31' }
];

/** 月份選項 */
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}月`
}));

/** 年份選項 (當前年份前後 2 年) */
export const getYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ({
    value: currentYear - 2 + i,
    label: `${currentYear - 2 + i}年`
  }));
};

// ---------------------------------------------------------------
// 季度面談預設職能定義
// ---------------------------------------------------------------

/** 預設核心職能 (5項，員工與主管共用) */
export const CORE_COMPETENCIES = [
  { name: '問題解決', behavior: '面對問題時，迅速分析情況，找出問題根源，制定有效解決方案，並在實施過程中靈活調整，最終成功解決問題，達成預期目標。' },
  { name: '溝通表達', behavior: '能清晰準確的傳達資訊，不同情境下靈活運用溝通技巧進團隊合作與組織目標之達成，並有效解決衝突與誤解。' },
  { name: '專案思維', behavior: '能運用專案管理的方法與工具，有效規劃、執行與管理專案，確保資源運用得當，進度按時推進，並達成專案目標。' },
  { name: '客戶導向', behavior: '能站在客戶角度思考，主動理解其需求，提供具體協助與解決方案，建立信任關係，持續提升客戶滿意度與合作意願。' },
  { name: '成長思維', behavior: '展現持續學習與自我成長意願，勇於挑戰與突破現狀，善於從經驗中反思與優化行動，並將所學應用於工作實務，不斷提升專業能力與組織貢獻。' }
];

/** 預設管理職能 (3項，僅主管表單) */
export const MANAGEMENT_COMPETENCIES = [
  { name: '人才發展', behavior: '能透過系統化的培訓、指導與成長機會，培養員工的專業技能和潛力，建立持續學習與發展的企業文化，最終促進組織的長期成功。' },
  { name: '決策能力', behavior: '能夠在複雜或不確定的情境下，通過全面分析資訊、評估風險與機會，制定有效的決策，並推動決策落實以達成組織目標。' },
  { name: '團隊領導', behavior: '能建立信任、凝聚共識，明確傳達願景與目標，善用團隊成員特長進行任務分工與協作，促進開放溝通與持續成長，帶領團隊高效達成任務並實現組織價值。' }
];

/** 預設直屬主管評價類別 (4大類，各5項) */
export const SUPERVISOR_EVALUATION_CATEGORIES = [
  {
    category: '工作成果',
    items: [
      '行政決策執行是否準確落地（1=完全偏離，5=全面達成）',
      '資源分配是否高效且具成本效益（1=浪費嚴重，5=最佳分配）',
      '年度計畫推動的完成度（1=嚴重延遲，5=按時完成）',
      '內部運營效率的提升幅度（1=無改善，5=顯著改善）',
      '對突發事件的快速反應與處理（1=嚴重延誤，5=高效解決）'
    ]
  },
  {
    category: '專業能力',
    items: [
      '行政規劃是否清晰可行（1=完全無效，5=具體且有前瞻性）',
      '風險應對策略的有效性（1=無法預警，5=全面應對）',
      '資料與報告的準確性與邏輯性（1=錯漏頻出，5=準確且全面）',
      '政策創新與實施效果（1=無創新，5=明顯提升運營）',
      '外部資源的協調能力（1=未能獲得支持，5=高效整合）'
    ]
  },
  {
    category: '團隊貢獻',
    items: [
      '與團隊的溝通是否有效（1=經常誤解，5=溝通順暢）',
      '培訓與發展支持（1=無培訓支持，5=提供完善的培訓機會）',
      '員工建議的支持、回應與落實（1=忽視建議，5=積極接納並推動）',
      '部門問題解決支持、部門間協作推動效果（1=多次無效，5=跨部門無縫合作）',
      '團隊士氣與凝聚力提升的貢獻（1=士氣低落，5=高度提升）'
    ]
  },
  {
    category: '工作態度與責任',
    items: [
      '面對挑戰的態度（1=逃避責任，5=主動承擔）',
      '工作安排的計劃性與條理性（1=混亂無序，5=高度條理化）',
      '決策時的果斷性與準確性（1=優柔寡斷，5=果斷且正確）',
      '對細節的關注與精益求精（1=多次遺漏，5=高度精準）',
      '對團隊與組織的承諾與責任心（1=推諉責任，5=完全負責）'
    ]
  }
];

/** 預設滿意度調查題目 (12題) */
export const SATISFACTION_QUESTIONS = [
  '員工清楚自己的工作要求',
  '員工明確有做好自己工作所需要的內容',
  '在工作中，每天都有機會做員工自己最擅長做的事情',
  '在一週工作中，有因為工作出色而受到鼓勵',
  '員工覺得自己的主管或同事有關心個人的情況',
  '在工作中有人鼓勵員工自己的發展',
  '在工作中，自己感覺意見有受到重視',
  '公司的使命與目標，讓員工感覺到自己的工作職務是重要的',
  '同事有致力於高質量的工作',
  '在公司有要好的同事',
  '在過去三個月中，公司有人會與我談及我的進步',
  '在過去三個月中，員工認為自己的工作有機會學習與成長'
];
