export type JobStatus = 'published' | 'draft' | 'review' | 'closed';

/**
 * 候選人狀態（統一定義）
 * 
 * 流程狀態：
 * - new: 新進履歷
 * - invited: 已邀請
 * - reschedule: 待改期
 * - interview: 已安排面試
 * - pending_ai: 待 AI 分析
 * - pending_decision: 待決策
 * - offered: 待回覆 Offer
 * - offer_accepted: 已錄取同意
 * - onboarded: 已報到
 * 
 * 終止狀態（流程未繼續）：
 * - not_invited: 不邀請（履歷階段）
 * - not_hired: 未錄取（面試後）
 * 
 * 終止狀態（候選人婉拒）：
 * - invite_declined: 邀請婉拒
 * - interview_declined: 面試婉拒
 * - offer_declined: Offer 婉拒
 * 
 * 舊狀態（向下相容）：
 * - rejected: 已拒絕（舊）
 * - hired: 已錄用（舊）
 * - completed: 已完成（舊）
 * - pending: 待處理（舊）
 */
export type CandidateStatus = 
  // 流程狀態
  | 'new' | 'invited' | 'reschedule' | 'interview' 
  | 'pending_ai' | 'pending_decision' 
  | 'offered' | 'offer_accepted' | 'onboarded'
  // 終止狀態（流程未繼續）
  | 'not_invited' | 'not_hired'
  // 終止狀態（候選人婉拒）
  | 'invite_declined' | 'interview_declined' | 'offer_declined'
  // 舊狀態（向下相容）
  | 'rejected' | 'hired' | 'completed' | 'pending';

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

// 候選人階段
export type CandidateStage = 'Collected' | 'Invited' | 'Offered' | 'Rejected' | 'Hired' | 'OfferDeclined';

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
  stage?: CandidateStage;  // 新增：候選人階段
  avatarColor?: string;
  // Invitation Data
  invitationStatus?: string;
  candidateResponse?: string;
  selectedSlots?: string[];
  responseToken?: string;
  rescheduleNote?: string;
  interviewCount?: number;  // 面試記錄數量
  // 擴充欄位 (來自 104 Resume API)
  currentPosition?: string;    // 目前職位
  currentCompany?: string;     // 目前公司
  expectedSalary?: string;     // 期望薪資
  avatar?: string;             // 頭像 URL
  resume104Id?: string;        // 104 履歷 ID
  gender?: string;             // 性別
  birthday?: string;           // 生日
  employmentStatus?: string;   // 就業狀態
  seniority?: string;          // 總年資描述
}

// =====================================================
// 104 Resume API 完整資料結構
// =====================================================

/**
 * 候選人完整資料 (對應 104 Resume API 所有欄位)
 */
export interface CandidateFull extends JobCandidate {
  // 104 基本資料 (Basic Info)
  subPhone?: string;           // subCellPhone: 次要手機
  tel?: string;                // tel: 市內電話
  contactInfo?: string;        // contactInfo: 聯絡方式
  address?: string;            // address: 聯絡地址
  regSource?: string;          // regSource: 履歷來源
  militaryStatus?: string;     // militaryStatus: 兵役狀況
  militaryRetireDate?: string; // militaryRetireDate: 退伍日期
  introduction?: string;       // introduction: 個人簡介 (HTML)
  motto?: string;              // motto: 個人格言
  characteristic?: string;     // characteristic: 個人特色
  personalPage?: string[];     // personalPage: 個人作品頁面
  drivingLicenses?: string;    // drivingLicenses: 駕照
  transports?: string;         // transports: 交通工具
  specialIdentities?: string;  // specialIdentities: 特殊身份
  nationality?: string;        // nationality: 國籍
  disabledTypes?: string;      // disabledTypes: 身障類別與程度
  disabilityCard?: number;     // disabilityCard: 身障證明 (0:無, 1:有)
  assistiveDevices?: string;   // assistiveDevices: 身障輔具
  
  // 104 求職條件 (Job Requirement)
  jobCharacteristic?: string;     // jobCharacteristic: 希望性質
  workInterval?: string;          // workInterval: 上班時段
  otherWorkInterval?: string;     // otherWorkInterval: 其他時段
  shiftWork?: boolean;            // shiftWork: 輪班制度
  startDateOpt?: string;          // startDateOpt: 可上班日
  preferredLocation?: string;     // workPlace: 希望地點
  remoteWork?: string;            // remoteWork: 遠端工作
  preferredJobName?: string;      // jobName: 希望職稱
  preferredJobCategory?: string;  // jobCategory: 希望職類
  preferredIndustry?: string;     // industryCategory: 希望產業
  workDesc?: string;              // workDesc: 工作內容描述
  
  // 104 自傳 (Biography)
  biography?: string;          // bio: 中文自傳
  biographyEn?: string;        // engBio: 英文自傳
  
  // 104 證照 (Certificates)
  certificates?: string;       // certificates: 證照名稱
  otherCertificates?: string;  // otherCertificates: 其他證照
  
  // 關聯資料 (子表)
  educationList?: CandidateEducation[];       // 學歷列表
  experienceList?: CandidateExperience[];     // 工作經歷列表
  specialityList?: CandidateSpeciality[];     // 技能專長列表
  languageList?: CandidateLanguage[];         // 語言能力列表
  attachmentList?: CandidateAttachment[];     // 附件列表
  projectList?: CandidateProject[];           // 專案作品列表
  customContentList?: CandidateCustomContent[]; // 自訂內容列表
  recommenderList?: CandidateRecommender[];   // 推薦人列表
  applyRecordList?: CandidateApplyRecord[];   // 應徵紀錄列表
  applyQuestionList?: CandidateApplyQuestion[]; // 應徵問答列表
}

/**
 * 候選人學歷資料 (對應 104 education[])
 */
export interface CandidateEducation {
  id?: string;
  candidateId?: string;
  schoolName?: string;         // schoolName: 學校名稱
  degreeLevel?: string;        // degreeLevel: 學歷等級 (博士/碩士/大學/etc)
  major?: string;              // major: 科系名稱
  majorCategory?: string;      // majorCategory: 科系類別
  degreeStatus?: string;       // degreeStatus: 就學狀態 (畢業/肄業/就學中)
  schoolCountry?: string;      // schoolCountry: 學校地區
  startDate?: string;          // startDate: 就學期間起始
  endDate?: string;            // endDate: 就學期間結束
  sortOrder?: number;
}

/**
 * 候選人工作經歷 (對應 104 experiences[])
 */
export interface CandidateExperience {
  id?: string;
  candidateId?: string;
  firmName?: string;           // firmName: 公司名稱
  industryCategory?: string;   // industryCategory: 產業類別
  companySize?: string;        // companySize: 公司規模
  workPlace?: string;          // workPlace: 工作地點
  jobName?: string;            // jobName: 職務名稱
  jobRole?: string;            // jobRole: 職務類型 (全職/兼職)
  jobCategory?: string;        // jobCategory: 職務類別
  startDate?: string;          // startDate: 任職起始
  endDate?: string;            // endDate: 任職結束
  jobDesc?: string;            // jobDesc: 工作內容 (HTML)
  skills?: string;             // skills: 工作技能
  management?: string;         // management: 管理責任
  wageTypeDesc?: string;       // wageTypeDesc: 計薪方式
  wage?: number;               // wage: 薪資數字
  wageYear?: number;           // wageYear: 年薪數字
  sortOrder?: number;
}

/**
 * 候選人技能專長 (對應 104 speciality[])
 */
export interface CandidateSpeciality {
  id?: string;
  candidateId?: string;
  skill?: string;              // skill: 專長名稱
  description?: string;        // desc: 專長描述 (HTML)
  tags?: string;               // tag: 專長特色標籤
  sortOrder?: number;
}

/**
 * 候選人語言能力 (對應 104 foreignLanguage[] + localLanguage[])
 */
export interface CandidateLanguage {
  id?: string;
  candidateId?: string;
  langType?: string;           // langType: 語言類型
  languageCategory?: 'foreign' | 'local'; // 外語 or 方言
  listenDegree?: string;       // listenDegree: 聽力程度
  speakDegree?: string;        // speakDegree: 口說程度
  readDegree?: string;         // readDegree: 閱讀程度
  writeDegree?: string;        // writeDegree: 寫作程度
  degree?: string;             // degree: 精通程度 (for local language)
  certificates?: string;       // certificates: 語文證照
  sortOrder?: number;
}

/**
 * 候選人附件 (對應 104 attachFiles[])
 */
export interface CandidateAttachment {
  id?: string;
  candidateId?: string;
  type?: number;               // type: 類型 (1:檔案, 2:連結)
  title?: string;              // title: 附件名稱
  fileName?: string;           // fileName: 檔案名稱
  resourceLink?: string;       // resourceLink: 下載連結
  website?: string;            // website: 網站連結
  sortOrder?: number;
}

/**
 * 候選人專案作品 (對應 104 projectDatas[])
 */
export interface CandidateProject {
  id?: string;
  candidateId?: string;
  title?: string;              // title: 專案標題
  startDate?: string;          // startDate: 開始日期
  endDate?: string;            // endDate: 結束日期
  description?: string;        // description: 描述 (HTML)
  type?: number;               // type: 素材類型 (0:無, 1:檔, 2:影, 3:網)
  resourceLink?: string;       // resourceLink: 素材連結
  website?: string;            // website: 網站連結
  sortOrder?: number;
}

/**
 * 候選人自訂內容 (對應 104 customContentDatas[])
 */
export interface CandidateCustomContent {
  id?: string;
  candidateId?: string;
  title?: string;              // title: 標題
  content?: string;            // content: 內容 (JSON)
  sortOrder?: number;
}

/**
 * 候選人推薦人 (對應 104 recommenders[])
 */
export interface CandidateRecommender {
  id?: string;
  candidateId?: string;
  name?: string;               // name: 推薦人姓名
  corp?: string;               // corp: 單位
  jobTitle?: string;           // jobTitle: 職稱
  email?: string;              // email: 電子郵件
  tel?: string;                // tel: 電話
  sortOrder?: number;
}

/**
 * 候選人應徵紀錄 (對應 104 applyJob[])
 */
export interface CandidateApplyRecord {
  id?: string;
  candidateId?: string;
  applyDate?: string;          // applyDate: 應徵日期
  jobName?: string;            // name: 職務名稱
  jobNo?: string;              // jobNo: 職務代碼
  applySource?: string;        // applySource: 應徵來源
}

/**
 * 候選人應徵問答 (對應 104 applyQuestion[])
 */
export interface CandidateApplyQuestion {
  id?: string;
  candidateId?: string;
  type?: string;               // type: 類型 (1:是非, 2:選擇, 3:填充)
  question?: string;           // question: 題目
  answer?: string;             // answer: 答覆
  sortOrder?: number;
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

