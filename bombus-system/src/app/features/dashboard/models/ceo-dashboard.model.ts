/**
 * CEO Dashboard 資料模型
 */

// 三主軸健康度
export interface HealthAxis {
  name: string;
  label: string;
  score: number;
  trend: number; // 近6個月趨勢變化（正負值）
  description: string;
  icon: string;
  color: string;
  metrics: HealthMetric[];
  sparklineData?: number[]; // 近6個月趨勢數據
}

export interface HealthMetric {
  label: string;
  value: string;
  status: 'positive' | 'warning' | 'danger';
}

// 預警事項
export interface RiskAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'people' | 'project' | 'culture';
  alertType: 'key-position' | 'capability-gap' | 'project-risk';
  icon?: string; // 新增圖示欄位
  timestamp?: Date;
}

// 決策事項
export interface DecisionItem {
  id: string;
  title: string;
  description: string;
  priority: 'urgent' | 'important' | 'opportunity';
  icon: string;
  actionLabel: string;
}

// 經營趨勢數據
export interface TrendData {
  month: string;
  revenue: number;
  profitRate: number;
}

// 能力地圖 KPI
export interface CapabilityKPI {
  coverageRate: number;
  coverageChange: number;
  achievementRate: number;
  achievementTarget: number;
  avgOnboardingDays: number;
  gapCount: number;
}

// 能力缺口
export interface CapabilityGap {
  department: string;
  competency: string;
  gap: number;
  impact: string;
  suggestion: string;
}

// 人才風險 KPI
export interface TalentRiskKPI {
  highRiskCount: number;
  successionCoverage: number;
  successionTarget: number;
  keyPositionCount: number;
  riskCost: number;
}

// 高風險人才
export interface HighRiskTalent {
  id: string;
  name: string;
  position: string;
  department: string;
  riskScore: number;
  performanceGrade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C';
  leaveReason: string;
  criticality: 'extreme' | 'high' | 'medium';
  signals: string;
  action: string;
  zone: 'danger' | 'warning' | 'protected' | 'stable';  // 危險區(紅) / 觀察區(黃) / 保護區(綠) / 穩定區(灰)
}

// 風險象限圖人員
export interface RiskQuadrantPerson {
  id: string;
  name: string;
  position: string;
  department: string;
  turnoverRisk: number;  // X 軸：離職風險 (0-100)
  criticality: number;   // Y 軸：關鍵性 (0-100)
  avatar: string;
  riskSignals: string[];
  suggestedActions: string[];
}

// 接班覆蓋
export interface SuccessionCoverage {
  position: string;
  coverage: 'full' | 'partial' | 'none' | 'training';
  successorCount: number;
  label: string;
}

// 專案交付 KPI
export interface ProjectDeliveryKPI {
  activeProjects: number;
  onTrackCount: number;
  atRiskCount: number;
  avgProgress: number;
  progressTarget: number;
  utilizationRate: number;
  manpowerGap: number;
}

// 專案狀態
export interface ProjectStatus {
  id: string;
  name: string;
  status: 'normal' | 'risk' | 'planning' | 'warning';
  progress: number;
  pm: number;
  dev: number;
  design: number;
  test: number;
  issue?: string;
}

// 毛利預測 KPI
export interface ProfitKPI {
  confirmedRevenue: number;      // 已確認營收 (%)
  confirmedProjects: number;     // 已簽約專案數
  avgProfitRate: number;         // 平均毛利率 (%)
  profitRateTarget: number;      // 毛利率目標 (%)
  costControlRate: number;       // 成本控制率 (%)
  anomalyWarnings: number;       // 異常預警數
  totalRevenue?: number;
  profitRateChange?: number;
  aiConfidence?: number;
  erosionWarning?: number;
}

// 專案獲利排行
export interface ProjectRanking {
  rank: number;
  name: string;
  profitRate: number;
  revenue: number;
  pm: string;
  contractValue: number;  // 合約金額 (M)
  costStatus: 'pending' | 'better' | 'normal';  // 成本控制狀態
}

// 毛利侵蝕原因
export interface ErosionCause {
  cause: string;
  amount: number;
  percentage: number;
}

// 績效獎酬 KPI
export interface RewardKPI {
  alignmentRate: number;
  alignmentTarget: number;
  highPerfLowReward: number;
  lowPerfHighReward: number;
  fairnessRate: number;
}

// 績效獎酬風險人員
export interface RewardRiskEmployee {
  id: string;
  name: string;
  position: string;
  performance: string;
  rewardLevel: string;
  marketLevel: string;
  riskType: 'retention' | 'culture';
}

// 九宮格數據
export interface NineBoxData {
  category: string;
  count: number;
  label: string;
  color: string;
}

// 職能熱力圖人員詳情
export interface CompetencyEmployee {
  id: string;
  name: string;
  position: string;
  avatar: string;
  currentScore: number;
  requiredScore: number;
  gap: number;
  status: 'achieved' | 'slight' | 'severe';
  suggestion: string;
  courses: string[];
}

// 毛利預測趨勢資料
export interface ProfitTrendPoint {
  month: string;
  actual: number | null;
  predicted: number | null;
}

// 專案 Portfolio 泡泡圖資料
export interface ProjectBubble {
  id: string;
  name: string;
  progressDeviation: number;  // X 軸：進度偏差 (%)
  qualityRisk: number;        // Y 軸：品質風險 (0-100)
  budgetScale: number;        // 泡泡大小：預算規模 (百萬)
  needsAttention: boolean;    // 是否需要立即關注（紅色）
  pm: string;
  status: 'normal' | 'warning' | 'critical';
}

// CEO Dashboard Tab
export type CEODashboardTab = 'overview' | 'capability' | 'talent-risk' | 'project' | 'profit' | 'reward';

// 專案甘特圖項目
export interface ProjectGanttItem {
  id: string;
  title: string;
  type: 'integration' | 'procurement' | 'service' | 'software';
  pm: {
    name: string;
    avatar: string | null;
  };
  progress: number;
  stage: string;
  status: 'normal' | 'risk' | 'delay';
  startDate: string;
  endDate: string;
  budget: number;                    // 預算金額 (萬元)
  nextMilestone: {                   // 下一里程碑
    percentage: number;              // e.g. 60
    label: string;                   // e.g. "合約談判"
    expectedDate: string;            // e.g. "2025/07"
  };
  salesLead: string;                 // 業務負責
  engineeringLead: string;           // 工程負責
}

// 專案狀態統計
export interface ProjectStatusStats {
  status: 'normal' | 'risk' | 'delay';
  count: number;
  label: string;
  color: string;
}

// 專案類型統計
export interface ProjectTypeStats {
  type: 'integration' | 'procurement' | 'service' | 'software';
  count: number;
  label: string;
  color: string;
}

// 成本結構分析
export interface CostStructureItem {
  id: string;
  label: string;
  estimated: number;       // 估算成本比例 (%)
  actual: number;          // 實際成本比例 (%)
  difference: number;      // 差異百分比 (actual - estimated)
  estimatedAmount: number; // 估算金額 (萬)
  actualAmount: number;    // 實際金額 (萬)
}

// 成本預警項目
export interface CostWarningItem {
  id: string;
  projectName: string;
  category: string;
  overBudget: number;  // 超支金額 (萬)
  severity: 'high' | 'medium';
}

// 願景使命摘要 (Dashboard 用)
export interface VisionMissionSummary {
  vision: string;
  mission: string;
  coreValues: { name: string; icon: string; description: string }[];
  version: string;
}

// 員工關懷福利項目
export interface EAPBenefit {
  id: string;
  name: string;
  icon: string;
  quota: string;        // e.g. "4天/年"
  description: string;  // e.g. "免費・匿名"
  status: 'active' | 'coming-soon';
  launchDate?: string;  // For coming-soon items
}

// EAP 摘要 (Dashboard 用)
export interface EAPSummary {
  benefits: EAPBenefit[];
  impact: {
    productivityImprovement: number;  // 生產力提升 %
    turnoverReduction: number;        // 離職率降低 %
    roi: number;                      // 投資報酬率 %
  };
}

// 員工故事摘要 (Dashboard 便利貼風格)
export type StoryCategory = 'training' | 'interaction' | 'customer' | 'collaboration';

export interface EmployeeStoryItem {
  id: string;
  title: string;
  excerpt: string;           // 簡短摘要
  author: string;
  department: string;
  category: StoryCategory;
  likes: number;
  date: string;
  moodColor: string;        // 便利貼顏色
}

export interface StoryCategoryStats {
  category: StoryCategory;
  label: string;
  icon: string;
  count: number;
  color: string;
}

export interface EmployeeStorySummary {
  kpi: {
    newThisMonth: number;    // 本月新增
    totalStories: number;    // 總故事數
  };
  categoryStats: StoryCategoryStats[];
  featuredStories: EmployeeStoryItem[];   // 精選故事（便利貼）
}

// 儀表板獲獎記錄
export interface DashboardAward {
  id: string;
  name: string;
  year: number;
  status: 'won' | 'applying' | 'submitted';
  category?: 'hr' | 'employer' | 'innovation' | 'industry' | 'government';
  icon?: string;
}

// 獎金卡片
export interface BonusCard {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  year: number;
  formula: string;
  settlement: string;
  hasExample?: boolean;
  icon: string;
  color: string;
}

// 獎金排行榜
export interface BonusRanking {
  rank: number;
  name: string;
  department: string;
  multiplier: number;
  estimatedBonus: number;
}

// 專案進度階段定義
export const PROJECT_STAGES: Record<number, { label: string; description: string }> = {
  10: { label: '初步接觸', description: '客戶首次接觸專案，處於探索需求階段' },
  20: { label: '需求確認', description: '建立初步需求，雙方尚未確立具體合作方向' },
  30: { label: '解決方案建議', description: '提出初步解決方案，獲得客戶對方案方向的基本認可' },
  40: { label: '提案與預算討論', description: '遞交正式提案與初步預算，進入詳細商議階段' },
  50: { label: '初步承諾', description: '客戶對提案方向及預算表達認可，尚未簽訂合約' },
  60: { label: '合約談判', description: '就合約條款、付款計劃、交付時間進行最終確認' },
  70: { label: '專案啟動', description: '專案正式啟動，執行計劃開始推進' },
  80: { label: '合約簽訂', description: '正式簽署合約，進入執行準備階段' },
  90: { label: '成果交付', description: '根據合約交付產品或服務，完成驗收' },
  100: { label: '結案', description: '專案完成，進入營後支援或維護階段' },
};

// Forecast Pipeline 階段
export interface ForecastStage {
  percentage: number;      // 10, 20, 30... 100
  label: string;           // 接觸、需求、提案...
  count: number;           // 該階段專案數
  color: string;           // 方塊顏色
}

// Forecast Pipeline 群組金額統計
export interface ForecastGroup {
  id: string;              // 'exploration', 'proposal', 'execution', 'closing'
  label: string;           // 探索期、提案期、執行期、結案期
  range: string;           // (10-30%), (40-50%)...
  amount: number;          // 金額 (萬元)
  color: string;           // 卡片底色
}

// Forecast Pipeline 完整資料
export interface ForecastPipeline {
  stages: ForecastStage[];
  groups: ForecastGroup[];
  totalAmount: number;     // 總金額
  totalProjects: number;   // 總專案數
}

