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

