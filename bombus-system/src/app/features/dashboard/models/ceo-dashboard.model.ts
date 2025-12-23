/**
 * CEO Dashboard 資料模型
 */

// 三主軸健康度
export interface HealthAxis {
  name: string;
  label: string;
  score: number;
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
  totalRevenue: number;
  avgProfitRate: number;
  profitRateChange: number;
  aiConfidence: number;
  erosionWarning: number;
}

// 專案獲利排行
export interface ProjectRanking {
  rank: number;
  name: string;
  profitRate: number;
  revenue: number;
  pm: string;
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

