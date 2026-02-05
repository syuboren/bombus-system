// ===== 1.2 人才庫與再接觸管理 =====

export type TalentStatus = 'active' | 'contacted' | 'scheduled' | 'hired' | 'declined' | 'expired';
export type TalentSource = '104' | 'linkedin' | 'referral' | 'website' | 'headhunter' | 'other';
export type ContactPriority = 'high' | 'medium' | 'low';

/**
 * 進入人才庫的原因（婉拒階段）
 * - invite_declined: 邀請婉拒（候選人婉拒面試邀請）
 * - interview_declined: 面試婉拒（候選人面試後婉拒）
 * - offer_declined: Offer 婉拒（候選人婉拒錄取通知）
 * - not_hired: 未錄取（面試後未錄用）
 */
export type DeclineStage = 'invite_declined' | 'interview_declined' | 'offer_declined' | 'not_hired';

export interface TalentTag {
  id: string;
  name: string;
  color: string;
  category: 'skill' | 'experience' | 'education' | 'personality' | 'custom';
}

/**
 * 聯繫狀態 (動態計算)
 * - contacted: 近 1 個月有聯繫紀錄
 * - pending: 開啟待聯繫提醒但近 1 個月沒有聯繫
 * - null: 無狀態 (未開啟提醒且沒有近期聯繫)
 */
export type ContactStatus = 'contacted' | 'pending' | null;

export interface TalentCandidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  currentPosition: string;
  currentCompany: string;
  experience: number; // years
  education: string;
  expectedSalary?: string;
  source: TalentSource;
  status: TalentStatus;
  declineStage?: DeclineStage; // 進入人才庫的原因
  declineReason?: string;      // 婉拒原因說明
  tags: TalentTag[];
  skills: string[];
  matchScore: number; // AI 媒合分數 0-100
  addedDate: Date;
  lastContactDate?: Date;
  nextContactDate?: Date;
  contactPriority: ContactPriority;
  notes: string;
  resumeUrl?: string;
  
  // 聯繫追蹤欄位
  contactReminderEnabled?: boolean; // 是否開啟待聯繫提醒
  contactStatus?: ContactStatus;    // 聯繫狀態 (動態計算)
  latestContactDate?: Date;         // 最新聯繫日期
  recentContactCount?: number;      // 近 1 個月聯繫次數
}

export interface TalentContactHistory {
  id: string;
  candidateId: string;
  contactDate: Date;
  contactMethod: 'phone' | 'email' | 'interview' | 'meeting';
  contactBy: string;
  summary: string;
  outcome: 'positive' | 'neutral' | 'negative' | 'no-response';
  nextAction?: string;
  nextActionDate?: Date;
}

export interface TalentReminder {
  id: string;
  candidateId: string;
  candidateName: string;
  reminderDate: Date;
  reminderType: 'contact' | 'follow-up' | 'interview' | 'offer';
  message: string;
  isCompleted: boolean;
  assignedTo: string;
}

export interface TalentMatchResult {
  candidateId: string;
  jobId: string;
  jobTitle: string;
  matchScore: number;
  matchReasons: string[];
  gaps: string[];
  recommendation: 'highly-recommended' | 'recommended' | 'consider' | 'not-recommended';
}

/**
 * 職缺媒合度資料
 */
export interface JobMatch {
  jobId: string;
  title: string;
  department?: string;
  status: string;
  description?: string;
  matchScore: number | null;  // null 表示尚未分析
  matchDetails?: {
    talentSkills: string[];
    jobKeywords: string[];
    matchedSkills: string[];
  };
  analysisSummary?: string;
  analyzedAt?: Date;
}

/**
 * 加入職缺候選人的結果
 */
export interface ApplyToJobResult {
  candidateId: string;
  jobId: string;
  jobTitle: string;
  talentName: string;
  invitationSent: boolean;
  invitationToken?: string;
  isNewCandidate: boolean;
}

export interface TalentPoolStats {
  totalCandidates: number;
  activeCount: number;
  contactedThisMonth: number;
  hiredThisYear: number;
  avgMatchScore: number;
  sourceBreakdown: { source: TalentSource; count: number; percentage: number }[];
  statusBreakdown: { status: TalentStatus; count: number }[];
  upcomingReminders: number;
}

// ===== 1.3 員工檔案與歷程管理 =====

export type EmployeeStatus = 'active' | 'probation' | 'leave' | 'resigned' | 'terminated';
export type DocumentStatus = 'valid' | 'expiring' | 'expired' | 'pending';

export interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  department: string;
  position: string;
  level: string; // 職等
  grade: string; // 職級
  manager: string;
  managerId: string;
  hireDate?: Date;
  status: EmployeeStatus;
  contractType: 'full-time' | 'part-time' | 'contract' | 'intern';
  workLocation: string;
  salary?: number;
  skills: string[];
  certifications: string[];
}

export interface EmployeeDetail extends Employee {
  birthDate?: Date;
  address?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  education: {
    degree: string;
    school: string;
    major: string;
    graduationYear: number;
  }[];
  workHistory: JobChange[];
  documents: EmployeeDocument[];
  training: EmployeeTraining[];
  performance: EmployeePerformance[];
  roi: EmployeeROI;
  // 候選人追溯資訊
  candidateSource?: {
    candidate_id: string;
    name: string;
    email: string;
    position: string;
    status: string;
    stage: string;
  };
  // 入職進度（試用期員工）
  onboardingProgress?: {
    overall: number;
    templates: {
      total: number;
      signed: number;
      approved: number;
    };
    documents: {
      total: number;
      uploaded: number;
    };
    probation_end_date: string;
    probation_months: number;
  };
}

export interface JobChange {
  id: string;
  effectiveDate?: Date;
  changeType: 'promotion' | 'transfer' | 'demotion' | 'title-change' | 'salary-adjustment';
  fromPosition: string;
  toPosition: string;
  fromDepartment: string;
  toDepartment: string;
  fromLevel?: string;
  toLevel?: string;
  salaryChange?: number;
  reason: string;
  approvedBy: string;
}

export interface EmployeeDocument {
  id: string;
  name: string;
  type: 'contract' | 'certificate' | 'id' | 'insurance' | 'tax' | 'other';
  uploadDate: Date;
  expiryDate?: Date;
  status: DocumentStatus;
  version: string;
  filePath: string;
  uploadedBy: string;
}

export interface EmployeeTraining {
  id: string;
  courseName: string;
  courseType: 'internal' | 'external' | 'online';
  completionDate?: Date;
  score?: number;
  certificate?: string;
  hours: number;
  cost: number;
  status: 'enrolled' | 'in-progress' | 'completed' | 'cancelled';
  instructor?: string;
  notes?: string;
}

export interface EmployeePerformance {
  id: string;
  period: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  goals: { name: string; achievement: number }[];
  strengths: string[];
  improvements: string[];
  reviewedBy: string;
  reviewDate: Date;
}

export interface EmployeeROI {
  employeeId: string;
  period: string;
  salaryCost: number;
  trainingCost: number;
  benefitsCost: number;
  totalCost: number;
  revenue: number;
  projectValue: number;
  productivity: number;
  roi: number; // (revenue + projectValue) / totalCost * 100
  trend: 'up' | 'stable' | 'down';
  comparison: {
    departmentAvg: number;
    companyAvg: number;
  };
}

export interface EmployeeStats {
  totalEmployees: number;
  activeCount: number;
  probationCount: number;
  avgTenure: number; // months
  departmentBreakdown: { department: string; count: number; percentage: number }[];
  levelBreakdown: { level: string; count: number }[];
  expiringDocuments: number;
  upcomingAnniversaries: { employeeId: string; name: string; date: Date; years: number }[];
}

export interface AuditLog {
  id: string;
  employeeId: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'export';
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  performedAt: Date;
  ipAddress?: string;
}

