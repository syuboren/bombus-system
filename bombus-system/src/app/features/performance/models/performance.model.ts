/**
 * L5 績效管理模組 - 資料模型
 * 過程管理與毛利計算
 */

// ============================================
// 計算週期
// ============================================
export type CalculationPeriod = 'month' | 'quarter' | 'year';

export interface PeriodOption {
  value: CalculationPeriod;
  label: string;
}

// ============================================
// 毛利監控儀表板
// ============================================

/** 毛利 KPI 總覽 */
export interface ProfitKPISummary {
  currentProfit: number;           // 當期毛利 (萬)
  profitMargin: number;            // 毛利率 (%)
  targetAchievement: number;       // 目標達成率 (%)
  profitTrend: 'up' | 'down' | 'flat';  // 趨勢
  trendValue: number;              // 較上期變化 (%)
  estimatedBonusPool: number;      // 預估獎金池 (萬)
}

/** 部門毛利資料 */
export interface DepartmentProfit {
  departmentId: string;
  departmentName: string;
  revenue: number;                 // 營收 (萬)
  directCost: number;              // 直接成本 (萬)
  indirectCost: number;            // 間接成本 (萬)
  grossProfit: number;             // 毛利 (萬)
  profitMargin: number;            // 毛利率 (%)
  targetAchievement: number;       // 目標達成率 (%)
  bonusPool: number;               // 獎金池 (萬)
  employeeCount: number;           // 員工人數
  color: string;                   // 識別色
}

/** 成本結構項目 */
export interface CostStructureItem {
  category: 'labor' | 'material' | 'outsource' | 'indirect';
  label: string;
  amount: number;                  // 金額 (萬)
  percentage: number;              // 佔比 (%)
  color: string;
}

/** 毛利趨勢資料 */
export interface ProfitTrendData {
  period: string;                  // 時間標籤
  revenue: number;                 // 營收 (萬)
  cost: number;                    // 成本 (萬)
  grossProfit: number;             // 毛利 (萬)
  profitMargin: number;            // 毛利率 (%)
  target: number;                  // 目標毛利率 (%)
}

/** 異常警示 */
export interface ProfitAlert {
  id: string;
  type: 'cost_overrun' | 'low_margin' | 'target_risk';
  severity: 'high' | 'medium' | 'low';
  department: string;
  message: string;
  value: string;
  createdAt: Date;
}

// ============================================
// 獎金分配
// ============================================

/** 獎金計算參數設定 */
export interface BonusSettings {
  // 獎金池提撥規則
  bonusTiers: BonusTier[];
  
  // 個人貢獻度權重
  contributionWeights: ContributionWeight;
  
  // 分配比例
  distributionRatio: DistributionRatio;
}

/** 獎金池提撥階梯 */
export interface BonusTier {
  minAchievement: number;          // 最低達成率 (%)
  maxAchievement: number;          // 最高達成率 (%)
  bonusRatio: number;              // 提撥毛利比例 (%)
}

/** 個人貢獻度權重 */
export interface ContributionWeight {
  taskCompletion: number;          // 任務完成度 (%)
  projectParticipation: number;    // 專案參與度 (%)
  performanceScore: number;        // 績效考核分數 (%)
  competencyLevel: number;         // 職能等級加權 (%)
}

/** 分配比例 */
export interface DistributionRatio {
  departmentRatio: number;         // 部門獎金比例 (%)
  personalRatio: number;           // 個人獎金比例 (%)
  managerBonus: number;            // 主管加給比例 (%)
}

/** 部門獎金計算結果 */
export interface DepartmentBonus {
  departmentId: string;
  departmentName: string;
  revenue: number;                 // 營收 (萬)
  grossProfit: number;             // 毛利 (萬)
  profitMargin: number;            // 毛利率 (%)
  targetAchievement: number;       // 目標達成率 (%)
  bonusTierApplied: number;        // 適用的提撥比例 (%)
  bonusPool: number;               // 獎金池總額 (萬)
  departmentBonus: number;         // 部門獎金 (萬)
  personalBonusPool: number;       // 個人獎金池 (萬)
  employeeCount: number;
  avgBonusPerPerson: number;       // 人均獎金 (萬)
}

/** 個人獎金計算結果 */
export interface PersonalBonus {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  isManager: boolean;
  baseSalary: number;              // 基本薪資 (萬)
  
  // 貢獻度分數
  taskCompletionScore: number;     // 任務完成度分數
  projectParticipationScore: number; // 專案參與度分數
  performanceScore: number;        // 績效考核分數
  competencyLevel: number;         // 職能等級
  
  totalContributionScore: number;  // 總貢獻度分數
  contributionWeight: number;      // 貢獻度權重 (%)
  
  // 獎金計算
  baseBonus: number;               // 基本獎金 (萬)
  managerBonus: number;            // 主管加給 (萬)
  totalBonus: number;              // 總獎金 (萬)
  bonusRatio: number;              // 獎金佔薪資比例 (%)
}

/** 獎金計算摘要 */
export interface BonusSummary {
  period: string;                  // 計算期間
  totalRevenue: number;            // 總營收 (萬)
  totalGrossProfit: number;        // 總毛利 (萬)
  avgProfitMargin: number;         // 平均毛利率 (%)
  totalBonusPool: number;          // 總獎金池 (萬)
  totalDepartmentBonus: number;    // 部門獎金總額 (萬)
  totalPersonalBonus: number;      // 個人獎金總額 (萬)
  employeeCount: number;           // 員工總數
  avgBonusPerPerson: number;       // 人均獎金 (萬)
}

// ============================================
// OKR / SMART 目標管理 (簡化版)
// ============================================

/** OKR 目標 */
export interface OKRObjective {
  id: string;
  title: string;
  description: string;
  owner: string;
  department: string;
  progress: number;                // 進度 (%)
  status: 'on_track' | 'at_risk' | 'behind';
  keyResults: KeyResult[];
}

/** 關鍵結果 */
export interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  weight: number;                  // 權重 (%)
  progress: number;                // 進度 (%)
}

// ============================================
// 任務進度
// ============================================

/** 任務狀態 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

/** 任務項目 */
export interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  department: string;
  status: TaskStatus;
  progress: number;
  dueDate: Date;
  priority: 'high' | 'medium' | 'low';
}

/** 部門任務統計 */
export interface DepartmentTaskStats {
  department: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

