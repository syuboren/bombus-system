export type JobStatus = 'published' | 'draft' | 'review' | 'closed';
export type CandidateStatus = 'new' | 'interview' | 'rejected' | 'hired' | 'completed' | 'pending' | 'invited' | 'reschedule' | 'offered' | 'offer_accepted' | 'offer_declined';
export type ScoreLevel = 'high' | 'medium' | 'low';

export interface Job {
  id: string;
  title: string;
  department: string;
  description?: string;
  publishDate: string | null;
  newCandidates: number;
  totalCandidates: number;
  status: JobStatus;
  recruiter: string;
  // 104 整合欄位
  source?: 'internal' | '104';
  job104No?: string;
  syncStatus?: '104_synced' | '104_pending' | 'local_only';
}

// 104 職缺原始資料介面
export interface Job104 {
  jobNo: string;
  jobTitle: string;
  jobCategory?: string;
  salary?: {
    type: string;
    min?: number;
    max?: number;
  };
  workPlace?: {
    city: string;
    district?: string;
  };
  switch?: 'on' | 'off';
  // 內部整合欄位
  internalId?: string;
  internalStatus?: JobStatus;
}

// 104 API 回應
export interface Job104Response {
  status: string;
  data: Job104[] | Job104;
}

// 104 職缺新增請求 (符合 104 API 必填欄位)
export interface Job104CreateRequest {
  role: number;           // 1=全職, 2=兼職, 3=高階
  job: string;            // 職缺名稱 (max 120 chars)
  jobCatSet: number[];    // 職務類別代碼 (API 需為數字陣列)
  description: string;    // 職務說明 (max 4000 chars)
  salaryType: number;     // 10=面議, 50=月薪, 60=年薪
  salaryLow: number;      // 最低薪資
  salaryHigh: number;     // 最高薪資
  addrNo: number;         // 工作地區代碼
  edu: number[];          // 學歷要求 7=大學
  contact: string;        // 聯絡人 (max 40 chars)
  email: string[];        // 聯絡 email
  applyType: {            // 應徵方式
    '104': number[];      // [2] = 接受 104 履歷
  };
  replyDay: number;       // 回覆天數 0-30
  workShifts?: {          // 上班時段 (選填)
    type: number;         // 1:日班 2:夜班 4:大夜班 8:假日班 16:中班
    periods: {
      startHour: number;
      startMinute: number;
      endHour: number;
      endMinute: number;
    }[];
  }[];
}

export interface JobCandidate {
  id: string;
  name: string;
  nameEn: string;
  email: string;
  phone?: string;
  location?: string;
  applyDate: string;
  education: string;
  experience: string;
  experienceYears: number;
  skills: string[];
  matchScore: number;
  scoreLevel: ScoreLevel;
  status: CandidateStatus;
  avatarColor?: string;
  // Invitation Data
  invitationStatus?: string;
  candidateResponse?: string;
  selectedSlots?: string[];
  responseToken?: string;
  rescheduleNote?: string;
}

export interface CandidateDetail extends JobCandidate {
  resumeUrl?: string;
  aiAnalysis: AIAnalysis;
}

export interface AIAnalysis {
  matchScore: number;
  skills: SkillTag[];
  experiences: ExperienceItem[];
  education: EducationItem;
  // 新增: 職能匹配分析
  competencyMatches?: CompetencyMatch[];
  overallCompetencyScore?: number;
}

// 職能匹配結果
export interface CompetencyMatch {
  competencyId: string;
  competencyName: string;
  type: 'knowledge' | 'skill' | 'attitude';
  requiredLevel: number;    // JD 要求等級 1-5
  assessedLevel: number;    // AI 評估等級 1-5
  score: number;            // 匹配分數 0-100
  weight: number;           // 權重
  evidence: string;         // 佐證說明
}

export interface SkillTag {
  name: string;
  level: 'high' | 'medium' | 'low';
  matched: boolean;
}

export interface ExperienceItem {
  company: string;
  position: string;
  duration: string;
  highlights: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  major: string;
  verified: boolean;
}

export interface JobStats {
  activeJobs: number;
  newResumes: number;
  pendingReview: number;
  scheduledInterviews: number;
}

export interface CandidateStats {
  total: number;
  pending: number;
  aiRecommended: number;
  scheduled: number;
}

