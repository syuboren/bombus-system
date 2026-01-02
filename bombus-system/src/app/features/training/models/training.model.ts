// 課程類型
export type CourseCategory = 'core' | 'general' | 'professional' | 'management';
export type CourseType = 'OJT' | 'Off-JT' | 'SD';
export type CourseStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

// 培訓優先級
export type TrainingPriority = 'high' | 'medium' | 'low';

// 課程介面
export interface Course {
  id: string;
  name: string;
  category: CourseCategory;
  type: CourseType;
  status: CourseStatus;
  instructor: string;
  duration: number; // 小時
  startDate: Date;
  endDate: Date;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  satisfactionScore?: number; // 1-5
  description: string;
  targetCompetencies: string[];
}

// 培訓 KPI
export interface TrainingKPI {
  completionRate: number; // 培訓完成率 %
  budgetUtilization: number; // 預算執行率 %
  trainingROI: number; // 培訓 ROI %
  avgSatisfaction: number; // 平均滿意度 1-5
  totalTrainees: number; // 總培訓人次
  totalCourses: number; // 總課程數
  plannedBudget: number; // 計畫預算
  usedBudget: number; // 已使用預算
}

// 課程類型統計
export interface CourseTypeStats {
  category: CourseCategory;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

// 培訓成效等級
export interface TrainingEffectiveness {
  level: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  score: number; // 百分比
  status: 'excellent' | 'good' | 'warning' | 'danger';
}

// 待培訓推薦
export interface TrainingRecommendation {
  id: string;
  competency: string;
  department: string;
  gapPercentage: number;
  priority: TrainingPriority;
  recommendedCourse: string;
  affectedEmployees: number;
}

// 近期課程
export interface UpcomingCourse {
  id: string;
  name: string;
  date: Date;
  instructor: string;
  participants: number;
  category: CourseCategory;
}

// 熱門課程
export interface PopularCourse {
  id: string;
  name: string;
  enrollmentCount: number;
  satisfactionScore: number;
  category: CourseCategory;
}

// 培訓待辦事項
export interface TrainingPendingItem {
  type: 'approval' | 'overdue' | 'feedback';
  count: number;
  description: string;
  urgency: 'high' | 'medium' | 'low';
}

// ===== 3.5 培訓成效追蹤與回饋循環 =====

// TTQS 品質管理指標
export interface TTQSIndicator {
  phase: 'plan' | 'design' | 'do' | 'review' | 'outcome';
  name: string;
  score: number; // 0-100
  maxScore: number;
  status: 'excellent' | 'good' | 'warning' | 'danger';
  items: string[];
}

// 三個月反饋會
export interface FeedbackSession {
  id: string;
  courseId: string;
  courseName: string;
  scheduledDate: Date;
  status: 'pending' | 'scheduled' | 'completed' | 'overdue';
  attendees: number;
  behaviorConversionRate?: number; // 行為轉化率
  performanceImprovement?: number; // 績效提升度
  knowledgeRetention?: number; // 知識留存率
  managerSatisfaction?: number; // 主管滿意度 1-5
}

// 課程 ROI 排行
export interface CourseROI {
  id: string;
  courseName: string;
  category: CourseCategory;
  investmentCost: number; // 投資成本
  benefit: number; // 效益
  roi: number; // ROI %
  behaviorConversionRate: number;
  recommendation: 'keep' | 'optimize' | 'review' | 'discontinue';
}

// 持續改善項目
export interface ImprovementItem {
  id: string;
  courseId: string;
  courseName: string;
  issue: string;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: Date;
}

// ===== 3.3 課程與報名管理 =====

// 講師資訊
export interface Instructor {
  id: string;
  name: string;
  specialty: string[];
  rating: number; // 1-5
  totalCourses: number;
  avatar?: string;
}

// 報名記錄
export interface Enrollment {
  id: string;
  courseId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  appliedDate: Date;
  approvedDate?: Date;
  attendanceStatus?: 'present' | 'absent' | 'late';
}

// 簽到記錄
export interface AttendanceRecord {
  id: string;
  courseId: string;
  employeeId: string;
  employeeName: string;
  checkInTime: Date;
  checkInMethod: 'qrcode' | 'manual';
}

// ===== 3.2 學習地圖與課程推薦 =====

// 職能落差資訊
export interface CompetencyGap {
  id: string;
  competencyName: string;
  category: CourseCategory;
  currentLevel: number; // 0-100
  requiredLevel: number; // 0-100
  gapPercentage: number; // 落差百分比
  priority: 'high' | 'medium' | 'low'; // 紅燈/黃燈/綠燈
}

// 學習路徑節點
export interface LearningPathNode {
  id: string;
  courseId: string;
  courseName: string;
  category: CourseCategory;
  duration: number; // 小時
  status: 'locked' | 'available' | 'in-progress' | 'completed';
  progress: number; // 0-100
  priority: 'high' | 'medium' | 'low';
  targetCompetencies: string[];
  expectedGrowth: number; // 預期職能提升 %
  prerequisites: string[]; // 前置課程 ID
  position: { x: number; y: number }; // 節點位置
}

// 學習分支 (三大類別)
export interface LearningBranch {
  id: string;
  category: CourseCategory;
  label: string;
  icon: string;
  color: string;
  totalCourses: number;
  completedCourses: number;
  overallProgress: number;
  nodes: LearningPathNode[];
}

// 員工學習概況
export interface LearnerProfile {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  avatar?: string;
  overallProgress: number; // 整體學習進度
  totalGaps: number; // 職能落差數
  highPriorityGaps: number; // 高優先落差數
  completedCourses: number;
  inProgressCourses: number;
  totalLearningHours: number;
  competencyGaps: CompetencyGap[];
}

// 課程推薦
export interface CourseRecommendation {
  id: string;
  courseId: string;
  courseName: string;
  category: CourseCategory;
  type: CourseType;
  duration: number;
  instructor: string;
  targetCompetency: string;
  expectedGrowth: number; // 預期提升 %
  priority: 'high' | 'medium' | 'low';
  matchScore: number; // 匹配度 0-100
  nextSessionDate?: Date;
  certifications?: string[];
}

// 學習里程碑
export interface LearningMilestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  status: 'pending' | 'achieved' | 'overdue';
  relatedCourses: string[];
  reward?: string;
}

