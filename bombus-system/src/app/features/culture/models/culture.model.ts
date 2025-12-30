// ===== 6.1 企業文化手冊管理 =====

// 企業文化核心價值
export interface CoreValue {
  id: string;
  name: string;
  description: string;
  icon: string;
  behaviors: string[]; // 行為準則
  order: number;
}

// 企業願景使命
export interface VisionMission {
  vision: string;
  mission: string;
  coreValues: CoreValue[];
  lastUpdated: Date;
  version: string;
}

// 文化故事
export interface CultureStory {
  id: string;
  title: string;
  content: string;
  author: string;
  authorDepartment: string;
  authorAvatar?: string;
  category: 'founder' | 'success' | 'teamwork' | 'innovation' | 'customer';
  publishDate: Date;
  likes: number;
  views: number;
  featured: boolean;
}

// 文化認同度調查
export interface CultureSurvey {
  id: string;
  title: string;
  period: string;
  status: 'draft' | 'active' | 'completed';
  responseRate: number;
  overallScore: number; // 1-5
  dimensions: CultureDimension[];
  startDate: Date;
  endDate: Date;
}

export interface CultureDimension {
  name: string;
  score: number;
  benchmark: number;
  trend: 'up' | 'down' | 'stable';
  items: { question: string; score: number }[];
}

// 文化指標
export interface CultureMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  category: 'engagement' | 'retention' | 'satisfaction' | 'behavior';
}

// ===== 6.1 EAP 員工協助方案 =====

export type EAPServiceType = 'counseling' | 'health' | 'legal' | 'financial' | 'family';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

// EAP 服務項目
export interface EAPService {
  id: string;
  type: EAPServiceType;
  name: string;
  description: string;
  icon: string;
  provider: string;
  annualQuota: number; // 年度免費額度
  usedQuota: number;
  available: boolean;
}

// EAP 預約記錄 (匿名)
export interface EAPBooking {
  id: string;
  anonymousCode: string; // 匿名代碼
  serviceType: EAPServiceType;
  scheduledDate: Date;
  status: BookingStatus;
  isAnonymous: boolean;
}

// EAP 使用統計 (去識別化)
export interface EAPUsageStats {
  period: string;
  totalUsage: number;
  serviceBreakdown: { type: EAPServiceType; count: number; percentage: number }[];
  departmentUsage: { department: string; rate: number }[]; // 使用率，非個人資料
  satisfactionScore: number;
  yearOverYearChange: number;
}

// 健康促進計畫
export interface HealthProgram {
  id: string;
  name: string;
  type: 'workshop' | 'checkup' | 'fitness' | 'nutrition';
  description: string;
  schedule: Date;
  capacity: number;
  enrolled: number;
  instructor?: string;
}

// 危機支援案例 (去識別化)
export interface CrisisSupport {
  id: string;
  type: 'illness' | 'accident' | 'bereavement' | 'other';
  status: 'active' | 'resolved' | 'followup';
  supportProvided: string[];
  resolutionDate?: Date;
}

// ===== 6.2 獎項資料庫管理 =====

export type AwardCategory = 'hr' | 'sustainability' | 'innovation' | 'employer' | 'industry' | 'government';
export type AwardStatus = 'upcoming' | 'applying' | 'submitted' | 'won' | 'not-won' | 'missed';

// 獎項
export interface Award {
  id: string;
  name: string;
  organizer: string;
  category: AwardCategory;
  description: string;
  eligibility: string[];
  applicationDeadline: Date;
  announcementDate?: Date;
  applicationFee?: number;
  website: string;
  status: AwardStatus;
  priority: 'high' | 'medium' | 'low';
  matchScore?: number; // AI 推薦匹配度
  tags: string[];
}

// 獎項申請記錄
export interface AwardApplication {
  id: string;
  awardId: string;
  awardName: string;
  year: number;
  status: AwardStatus;
  submittedDate?: Date;
  result?: 'won' | 'finalist' | 'not-won';
  notes: string;
  documents: string[];
  assignee: string;
}

// ===== 6.3 文件儲存庫 =====

export type DocumentType = 'policy' | 'certificate' | 'report' | 'award' | 'training' | 'hr' | 'other';
export type DocumentStatus = 'draft' | 'active' | 'expired' | 'archived';

// 文件
export interface CultureDocument {
  id: string;
  name: string;
  type: DocumentType;
  category: string;
  description: string;
  filePath: string;
  fileSize: number;
  fileFormat: string;
  version: string;
  status: DocumentStatus;
  tags: string[];
  uploadedBy: string;
  uploadedDate: Date;
  expiryDate?: Date;
  lastModified: Date;
  accessLevel: 'public' | 'internal' | 'confidential';
}

// 文件版本
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  changes: string;
  modifiedBy: string;
  modifiedDate: Date;
  filePath: string;
}

// ===== 6.4 AI 申請助理 =====

// AI 申請檢核表
export interface ApplicationChecklist {
  id: string;
  awardId: string;
  awardName: string;
  items: ChecklistItem[];
  completionRate: number;
  generatedDate: Date;
}

export interface ChecklistItem {
  id: string;
  category: string;
  requirement: string;
  status: 'pending' | 'in-progress' | 'completed' | 'not-applicable';
  sourceModule?: string; // 資料來源模組 (L1-L6)
  autoFilled: boolean;
  value?: string;
  documents: string[];
  notes: string;
}

// AI 生成內容
export interface AIGeneratedContent {
  id: string;
  type: 'highlight' | 'summary' | 'case-study' | 'achievement';
  title: string;
  content: string;
  sourceData: string[]; // 引用的資料來源
  generatedDate: Date;
  status: 'draft' | 'reviewed' | 'approved';
  editedContent?: string;
}

// 簡報輸出
export interface PresentationExport {
  id: string;
  title: string;
  format: 'ppt' | 'pdf' | 'keynote';
  sections: string[];
  generatedDate: Date;
  downloadUrl: string;
}

// ===== 6.5 智慧文件分析 =====

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// 文件缺漏
export interface DocumentGap {
  id: string;
  category: string;
  requiredDocument: string;
  status: 'missing' | 'expired' | 'outdated' | 'incomplete';
  severity: RiskLevel;
  responsiblePerson: string;
  dueDate: Date;
  recommendation: string;
}

// 合規風險
export interface ComplianceRisk {
  id: string;
  area: string;
  description: string;
  riskLevel: RiskLevel;
  relatedDocuments: string[];
  actionRequired: string;
  deadline: Date;
  status: 'open' | 'in-progress' | 'resolved';
}

// 文件品質評估
export interface DocumentQuality {
  documentId: string;
  documentName: string;
  completenessScore: number; // 0-100
  accuracyScore: number;
  freshnessScore: number;
  overallScore: number;
  issues: { type: string; description: string; severity: RiskLevel }[];
  lastAssessed: Date;
}

// ===== 6.6 影響力評估引擎 =====

// 影響力指標
export interface ImpactMetric {
  id: string;
  name: string;
  category: 'performance' | 'talent' | 'culture' | 'business';
  value: number;
  previousValue: number;
  target: number;
  unit: string;
  sourceModules: string[];
  trend: 'up' | 'down' | 'stable';
}

// 報獎潛力評估
export interface AwardPotential {
  awardId: string;
  awardName: string;
  potentialScore: number; // 0-100
  strengths: string[];
  gaps: string[];
  recommendedActions: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  successProbability: number;
}

// 文化影響力報告
export interface CultureImpactReport {
  period: string;
  overallImpactScore: number;
  dimensions: {
    name: string;
    score: number;
    impact: string;
    metrics: ImpactMetric[];
  }[];
  eapImpact: {
    usageRate: number;
    productivityImprovement: number;
    turnoverReduction: number;
    roi: number;
  };
  recommendations: string[];
  generatedDate: Date;
}

// 成果摘要
export interface HighlightSummary {
  id: string;
  title: string;
  period: string;
  highlights: {
    category: string;
    title: string;
    description: string;
    metrics: { label: string; value: string }[];
    sourceModule: string;
  }[];
  generatedDate: Date;
  exportFormats: string[];
}

