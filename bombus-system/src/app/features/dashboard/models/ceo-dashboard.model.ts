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
  status: 'normal' | 'risk' | 'planning';
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

