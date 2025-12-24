// 課程類型
export type CourseCategory = 'general' | 'professional' | 'management';
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

