// =====================================================
// Talent Map Models
// =====================================================

// Heatmap Models
export interface HeatmapCell {
  department: string;
  competency: string;
  score: number;
  required: number;
  gap: number;
}

export interface HeatmapStats {
  avgScore: number;
  excellentCount: number;
  needTrainingCount: number;
}

export interface HeatmapFilter {
  viewLevel: 'org' | 'dept' | 'emp';
  department: string;
  competencyType: string;
}

// Nine Box Models
export type NineBoxCategory = 
  | 'star' | 'potential' | 'develop'
  | 'specialist' | 'stable' | 'risk'
  | 'expert' | 'need-improve' | 'exit';

export interface NineBoxEmployee {
  id: string;
  name: string;
  department: string;
  position: string;
  level: 'staff' | 'middle' | 'senior';
  performance: number;
  potential: number;
  category: NineBoxCategory;
}

export interface NineBoxFilter {
  department: string;
  level: string;
}

export interface NineBoxCategoryInfo {
  key: NineBoxCategory;
  title: string;
  subtitle: string;
  color: string;
  bgGradient: string;
}

// Learning Path Models
export interface LearningProgress {
  title: string;
  value: number;
  color: string;
}

export interface Course {
  id: string;
  title: string;
  level: 'basic' | 'advanced' | 'expert';
  duration: string;
  participants: number;
  description: string;
  progress: number;
}

export interface PathStep {
  name: string;
  status: 'completed' | 'current' | 'pending';
}

export interface SkillTreeNode {
  name: string;
  value?: number;
  children?: SkillTreeNode[];
}

export interface TimelineItem {
  month: string;
  courses: number;
  hours: number;
  completion: number;
}

// Key Talent Models
export interface KeyTalentMetric {
  title: string;
  value: string;
  color: string;
  description: string;
  actionLabel?: string;
}

export interface RiskAlert {
  id: string;
  name: string;
  department: string;
  position: string;
  riskScore: number;
  riskLevel: 'high' | 'medium';
  factors: string[];
}

export interface Successor {
  rank: number;
  name: string;
  readiness: number;
}

export interface SuccessionPlan {
  position: string;
  coverage: 'high' | 'medium' | 'low';
  coverageText: string;
  successors: Successor[];
}

// Tab Type
export type TalentMapTab = 'heatmap' | 'nine-box' | 'learning-path' | 'key-talent';

// Department & Competency Options
export interface SelectOption {
  value: string;
  label: string;
}
