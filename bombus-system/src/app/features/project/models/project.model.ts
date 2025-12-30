// Project Management Models

export interface Project {
  id: string;
  code: string;
  name: string;
  pm: string;
  pmAvatar: string;
  status: 'active' | 'risk' | 'planning' | 'completed';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  estimatedProfit: number | null;
  team: TeamMember[];
  department: string;
  description?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  role?: string;
}

export interface ProjectStats {
  activeProjects: number;
  totalProjects: number;
  budgetConsumption: number;
  totalBudget: number;
  avgProfitRate: number;
  riskProjects: number;
}

export interface ProjectFilter {
  search: string;
  department: string;
  status: string;
}

// Project Detail Models
export interface ProjectDetail extends Project {
  objective: string;
  acceptanceCriteria: string[];
  directCost: number;
  indirectCost: number;
  totalSpent: number;
  remainingDays: number;
  okrContributions: OKRContribution[];
  teamContributions: TeamContribution[];
  varianceAlerts: VarianceAlert[];
  tasks: Task[];
  costBreakdown: CostItem[];
}

export interface OKRContribution {
  id: string;
  objective: string;
  keyResult: string;
  weight: 'high' | 'medium' | 'low';
  progress: number;
}

export interface TeamContribution {
  id: string;
  member: TeamMember;
  role: string;
  keyResult: string;
  taskCompletion: number;
  score: number;
}

export interface VarianceAlert {
  id: string;
  type: 'error' | 'warning';
  title: string;
  description: string;
}

export interface Task {
  id: string;
  name: string;
  assignee: TeamMember;
  status: 'completed' | 'in-progress' | 'delayed' | 'pending';
  dueDate: string;
  okrTag: string;
  indent: number;
  isParent: boolean;
  parentId?: string;
}

export interface CostItem {
  id: string;
  name: string;
  category: 'direct' | 'indirect';
  budget: number;
  actual: number;
  variance: number;
}

export interface TaskDetail {
  id: string;
  name: string;
  description: string;
  assigneeId: string;
  hourlyRate: number;
  estimatedHours: number;
  laborCost: number;
  overheadCost: number;
  totalCost: number;
}

// Profit Prediction Models
export interface ProfitPrediction {
  month: string;
  actual: number | null;
  predicted: number | null;
  optimistic: number | null;
  pessimistic: number | null;
}

export interface ProjectRanking {
  rank: number;
  projectId: string;
  projectName: string;
  pm: string;
  revenue: number;
  profitRate: number;
}

export interface PerformanceAlert {
  id: string;
  projectName: string;
  variance: string;
  severity: 'high' | 'medium';
  description: string;
}

export interface OKRAnalysis {
  objective: string;
  contributions: {
    projectName: string;
    percentage: number;
  }[];
}

// Chart Data Models
export interface TimeSeriesData {
  name: string;
  data: (number | null)[];
  color: string;
  lineType?: 'solid' | 'dashed' | 'dotted';
  showArea?: boolean;
}

export interface WaterfallData {
  category: string;
  value: number;
  color: string;
}

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
}

// Form Models
export interface CreateProjectForm {
  name: string;
  code: string;
  pmId: string;
  startDate: string;
  endDate: string;
  objective: string;
  budget: number;
  department: string;
}

// ===============================================================
// Forecast 預測系統 Models (4.3)
// ===============================================================

export type ForecastStage = 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

export interface ForecastStageDefinition {
  stage: ForecastStage;
  name: string;
  nameEn: string;
  description: string;
}

export interface ForecastProject {
  id: string;
  clientName: string;
  projectName: string;
  budgetAmount: number;
  projectManager: string;
  salesManager: string;
  engineerManager: string;
  currentStage: ForecastStage;
  stageHistory: ForecastStageHistory[];
  progressNote: string;
  forecastStatus: 'on-track' | 'at-risk' | 'delayed' | 'completed';
  expectedBiddingDate: string | null;
  expectedCloseDate: string | null;
  opportunityAccount: string;
  opportunityName: string;
  caseNumber: string;
}

export interface ForecastStageHistory {
  stage: ForecastStage;
  date: string;
  updatedBy: string;
}

export interface ForecastSummary {
  totalProjects: number;
  totalBudget: number;
  byStage: { stage: ForecastStage; count: number; budget: number }[];
  onTrack: number;
  atRisk: number;
  delayed: number;
}

// ===============================================================
// 專案報表與分析 Models (4.4)
// ===============================================================

export interface ProjectReport {
  projectId: string;
  projectName: string;
  projectCode: string;
  pm: string;
  department: string;
  // 目標與範疇
  objective: string;
  scope: string;
  acceptanceCriteria: string[];
  // 進度
  overallProgress: number;
  taskCompletion: { completed: number; total: number };
  milestoneCompletion: { completed: number; total: number };
  // 成本
  budgetAmount: number;
  actualCost: number;
  costVariance: number;
  costVariancePercent: number;
  // 毛利
  revenue: number;
  grossProfit: number;
  grossMarginRate: number;
  // 時程
  startDate: string;
  endDate: string;
  remainingDays: number;
  isDelayed: boolean;
  // 風險摘要
  riskCount: number;
  issueCount: number;
}

export interface ProjectHeatmapData {
  projectId: string;
  projectName: string;
  pm: string;
  department: string;
  progressScore: number;  // 0-100
  costScore: number;      // 0-100
  profitScore: number;    // 0-100
  overallScore: number;   // 0-100
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface ProjectPortfolioStats {
  totalProjects: number;
  totalBudget: number;
  totalSpent: number;
  avgProgress: number;
  avgProfitRate: number;
  onTimeProjects: number;
  delayedProjects: number;
  excellentProjects: number;
  atRiskProjects: number;
}

