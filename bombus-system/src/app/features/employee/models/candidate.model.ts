export interface Candidate {
  id: string;
  jobId?: string;
  name: string;
  position: string;
  interviewDate?: string;
  status: 'interview' | 'pending_ai' | 'pending_decision' | 'offered' | 'offer_accepted' | 'onboarded' | 'not_hired' | 'not_invited' | 'invite_declined' | 'interview_declined' | 'offer_declined' | string;
  stage?: 'Collected' | 'Invited' | 'Offered' | 'Rejected';
  scoringStatus?: 'Pending' | 'Scoring' | 'Scored';

  // Media fields
  audioUrl?: string;
  duration?: string;
  rescheduleNote?: string;
}

export interface InterviewInvitation {
  id: string;
  candidateId: string;
  jobId: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  proposedSlots: string[];
  message?: string;
  replyDeadline?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  interviewerId?: string;
  round: number;
  interviewAt: string;
  location?: string;
  evaluationJson?: string; // Detailed scores
  result: 'Pending' | 'Pass' | 'Hold' | 'Fail';
  remark?: string;
  createdAt: string;
}

export interface InvitationDecision {
  id: string;
  candidateId: string;
  decision: 'Invited' | 'Rejected' | 'Offered';
  decidedBy?: string;
  reason?: string;
  decidedAt: string;
  
  // Offer 回覆相關欄位（當 decision = 'Offered' 時使用）
  responseToken?: string;              // 回覆連結 Token
  replyDeadline?: string;              // 回覆截止時間
  candidateResponse?: 'accepted' | 'declined';  // 候選人回覆
  respondedAt?: string;                // 回覆時間
}

export interface TranscriptSegment {
  time: string;
  text: string;
  speaker: 'interviewer' | 'candidate';
}

export interface EmotionData {
  time: string;
  confidence: number;
  anxiety: number;
  enthusiasm: number;
}

export interface SkillScore {
  name: string;
  score: number;
}

export interface AIScores {
  keywordMatch: number;
  semanticAnalysis: number;
  jdMatch: number;
  overall: number;
}

export interface CandidateDetail extends Candidate {
  // Demo fields
  transcript?: TranscriptSegment[];
  emotions?: EmotionData[];
  skills?: SkillScore[];
  aiScores?: AIScores;

  // New Workflow fields
  invitation?: InterviewInvitation;
  interviews?: Interview[];
  decision?: InvitationDecision;

  // Interview Evaluation fields (Phase 2~3)
  evaluation?: InterviewEvaluation;
  aiAnalysisResult?: FullAIAnalysisResult;
}

// ============================================================
// 面試評估 (Interview Evaluation)
// ============================================================

/**
 * 面試評估資料
 * 記錄 HR 對候選人的面試評分與描述
 */
export interface InterviewEvaluation {
  performanceDescription: string;     // 候選人表現描述 (自由文字)
  scores: EvaluationScore[];          // 各維度評分
  attachments: MediaAttachment[];     // 錄音/錄影附件
  keywordsFound: string[];            // 偵測到的關鍵字
  totalScore: number;                 // 維度平均分數
  evaluatedBy?: string;               // 評分者 ID
  evaluatedAt?: string;               // 評分時間
  overallComment?: string;            // 整體評語
  transcriptText?: string;            // 當下評分使用的逐字稿
  mediaUrl?: string;                  // 錄音/錄影完整 URL (Persistence)
  mediaSize?: number;                 // 錄音/錄影檔案大小 (bytes)
}

/**
 * 維度評分
 */
export interface EvaluationScore {
  dimensionId: string;                // 維度 ID
  dimensionName: string;              // 維度名稱
  score: number;                      // 分數 0-100
  remark?: string;                    // 備註說明
}

/**
 * 媒體附件
 */
export interface MediaAttachment {
  id: string;
  type: 'audio' | 'video';            // 類型
  filename: string;                   // 檔案名稱
  url: string;                        // 檔案 URL
  size?: number;                      // 檔案大小 (bytes)
  duration?: number;                  // 時長 (秒)
  transcriptText?: string;            // 逐字稿內容
  uploadedAt: string;                 // 上傳時間
}

// ============================================================
// 完整 AI 分析結果 (Full AI Analysis Result)
// ============================================================

/**
 * 完整 AI 分析結果
 * 整合關鍵字匹配、語意分析、JD 適配度的完整分析結果
 */
export interface FullAIAnalysisResult {
  candidateId: string;
  jobId: string;
  analyzedAt: string;

  // 完整分析結構 (Matching AIAnalysisService)
  keywordAnalysis: any;
  semanticAnalysis: any;
  jdMatchResult: any;

  // 綜合評分
  overallScore: number;             // 加權總分 0-100
  recommendation: any;

  // 分數明細 (Legacy compatible)
  scoreBreakdown: {
    keywordScore: number;
    keywordWeight: number;
    semanticScore: number;
    semanticWeight: number;
    jdMatchScore: number;
    jdMatchWeight: number;
  };
}

/**
 * 錄用建議類型
 */
export type HireRecommendationType =
  | 'strongly_recommended'    // ≥85 強烈推薦
  | 'recommended'             // ≥70 推薦
  | 'on_hold'                 // ≥55 待觀察
  | 'not_recommended';        // <55 不推薦

/**
 * 關鍵字匹配摘要
 */
export interface KeywordMatchSummary {
  keyword: string;
  type: 'positive' | 'negative';
  dimensionName: string;
  weight: number;
  matchCount: number;
}

// ============================================================
// 候選人面試表單 (Candidate Interview Form)
// ============================================================

/**
 * 候選人面試表單狀態
 */
export type InterviewFormStatus = 'Pending' | 'InProgress' | 'Submitted' | 'Locked';

/**
 * 候選人面試表單
 */
export interface CandidateInterviewForm {
  id: string;
  interviewId: string;
  formToken: string;
  status: InterviewFormStatus;
  timeLimitMinutes: number;
  startedAt?: string;
  submittedAt?: string;
  lockedAt?: string;
  currentStep: number;
  lastSavedAt?: string;
  formData?: CandidateFormData;
  createdAt: string;
}

/**
 * 候選人表單填寫內容
 */
export interface CandidateFormData {
  // Section 1: 基本資料
  basicInfo: CandidateBasicInfo;
  // Section 2: 工作經歷
  workExperiences: WorkExperienceEntry[];
  // Section 3-7: 面試評核問答
  interviewQuestions: Record<string, string>;
}

/**
 * 基本資料區塊
 */
export interface CandidateBasicInfo {
  fillDate: string;
  candidateName: string;
  applyDept: string;
  applyJob: string;
  contactInfo: string;
  birthDate: string;
  educationLevel: 'high_school' | 'college' | 'university' | 'master' | 'phd';
  currentSalaryMonth?: number;
  currentSalaryYear?: number;
  expectedSalaryMonth: number;
  expectedSalaryYear: number;
  licenses: string[];
  otherLicense?: string;
}

/**
 * 工作經歷項目
 */
export interface WorkExperienceEntry {
  companyName: string;
  jobTitle: string;
  yearsOfService: string;
}

/**
 * 表單狀態回應
 */
export interface FormStatusResponse {
  hasForm: boolean;
  formToken?: string;
  status?: InterviewFormStatus;
  timeLimitMinutes?: number;
  startedAt?: string;
  submittedAt?: string;
  lockedAt?: string;
  currentStep?: number;
  lastSavedAt?: string;
  remainingSeconds?: number;
  isExpired?: boolean;
  candidateName?: string;
  interviewAt?: string;
}

/**
 * 表單資訊回應（公開 API）
 */
export interface InterviewFormResponse {
  formId: string;
  status: InterviewFormStatus;
  timeLimitMinutes: number;
  remainingSeconds: number;
  currentStep: number;
  startedAt?: string;
  lastSavedAt?: string;
  candidate: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    education?: string;
    expectedSalary?: string;
    experienceYears?: number;
  };
  interview: {
    jobTitle: string;
    department: string;
    interviewAt: string;
    location?: string;
    round: number;
  };
  formData?: CandidateFormData;
}

/**
 * 產生表單 Token 回應
 */
export interface GenerateFormResponse {
  success: boolean;
  formToken: string;
  formUrl: string;
  qrCodeDataUrl: string;
  timeLimitMinutes: number;
  candidateName: string;
  jobTitle: string;
  department: string;
  interviewAt: string;
  message: string;
}

/**
 * 面試評核題目定義
 */
export interface InterviewQuestion {
  code: string;
  question: string;
  category: string;
  required: boolean;
}

/**
 * 面試評核題目分類
 */
export const INTERVIEW_QUESTION_CATEGORIES = {
  GENERAL_IMPRESSION: '一般印象',
  EXPERIENCE_POTENTIAL: '經驗與潛能',
  RESIGNATION_ANALYSIS: '離職分析與期望',
  WORK_ATTITUDE: '工作態度',
  INTERPERSONAL: '人際互動',
  CONFLICT_RESOLUTION: '衝突解決',
  WORK_HABITS: '協作、專業與挑戰',
  CAREER_VISION: '職涯規劃與願景'
} as const;

/**
 * 面試評核題目清單（對應規格文件）
 */
export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // 3-1. 一般印象
  { code: 'motivation', question: '您為什麼想要應徵本公司的職缺？', category: 'GENERAL_IMPRESSION', required: true },
  { code: 'companyUnderstanding', question: '您對我們公司有多少瞭解程度？', category: 'GENERAL_IMPRESSION', required: true },
  { code: 'contribution', question: '可以為公司帶來哪些幫助？', category: 'GENERAL_IMPRESSION', required: true },
  { code: 'reasonToHire', question: '依照對我們公司的瞭解，為什麼應該錄取您？', category: 'GENERAL_IMPRESSION', required: true },
  { code: 'passion', question: '請問您對公司職缺的熱忱', category: 'GENERAL_IMPRESSION', required: true },
  { code: 'environmentExpectation', question: '您對工作環境的期望是甚麼？(實質環境或工作氣氛)', category: 'GENERAL_IMPRESSION', required: true },
  { code: 'swotAnalysis', question: '請描述一下您認為您在職場上的優勢與弱勢？', category: 'GENERAL_IMPRESSION', required: true },

  // 3-2. 經驗與潛能
  { code: 'pastExperienceSummary', question: '請填寫您過去的工作經歷 (簡述)', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'responsibilities', question: '在過去工作經歷中，您負責的各項工作性質及權責？', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'coreCompetencies', question: '請舉例說明，您最擅長的專業與所累積的經驗有哪些？', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'favoriteTask', question: '過去工作經歷中，您最感興趣的工作是哪一項？原因是？', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'leastFavoriteTask', question: '最不喜歡的工作是？原因是？', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'achievement', question: '過去工作經歷中，覺得最有成就的是？', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'failureExperience', question: '請描述一下遭受挫折感最重的是甚麼？如何發生的？可否舉實例說明', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'projectProblemSolving', question: '請您說明一件執行過的專案曾經發生的問題與解決方式', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'projectValueAdd', question: '請您說明過去執行專案中，因為有您而帶來的加分事項', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'lessonsLearned', question: '在過去工作經驗中，您覺得學到甚麼？', category: 'EXPERIENCE_POTENTIAL', required: true },
  { code: 'improvementActions', question: '您如何改善您的工作或工作環境？', category: 'EXPERIENCE_POTENTIAL', required: true },

  // 3-3. 離職分析與期望
  { code: 'pastResignationReasons', question: '您離開前幾家公司的原因是甚麼？', category: 'RESIGNATION_ANALYSIS', required: true },
  { code: 'currentResignationReason', question: '您為什麼想離開現在的公司？', category: 'RESIGNATION_ANALYSIS', required: true },
  { code: 'problemSolvingAttempts', question: '您有試圖將想離開的原因或問題解決嗎？', category: 'RESIGNATION_ANALYSIS', required: true },
  { code: 'desiredEnvironment', question: '您希望換甚麼樣的工作環境？', category: 'RESIGNATION_ANALYSIS', required: true },

  // 3-4. 工作態度
  { code: 'mostInfluentialCompany', question: '過往的公司哪一間對您影響最大？具體工作內容是甚麼？', category: 'WORK_ATTITUDE', required: true },
  { code: 'admiredSupervisor', question: '您最欣賞哪位主管？他有甚麼作風或特質讓您欽佩尊敬？', category: 'WORK_ATTITUDE', required: true },
  { code: 'dislikedSupervisorStyle', question: '最不喜歡的主管是哪些作風或管理方式？', category: 'WORK_ATTITUDE', required: true },
  { code: 'idealSupervisor', question: '您心目中的理想主管具有哪些特質？', category: 'WORK_ATTITUDE', required: true },
  { code: 'missedCompanyCulture', question: '公司或部門有哪些制度、作風或氣氛讓您懷念？', category: 'WORK_ATTITUDE', required: true },
  { code: 'dislikedCompanyCulture', question: '又有哪些您認為是不理想的地方？', category: 'WORK_ATTITUDE', required: true },
  { code: 'retentionFactors', question: '您希望未來加入的公司應有哪些制度或措施，才使您覺得這家公司值得您留任？', category: 'WORK_ATTITUDE', required: true },

  // 3-5. 人際互動
  { code: 'relationshipEmphasis', question: '您與同事或朋友相處，比較強調些甚麼？', category: 'INTERPERSONAL', required: true },
  { code: 'goodColleagueTraits', question: '您的好同事或好朋友，您認為他們具有甚麼樣的特質？', category: 'INTERPERSONAL', required: true },
  { code: 'dislikedColleagueTraits', question: '甚麼樣的同事或朋友，您不太喜歡與他們打交道，為什麼？', category: 'INTERPERSONAL', required: true },
  { code: 'responseToHighDemands', question: '如果主管對您要求太高，您會如何回應？', category: 'INTERPERSONAL', required: true },

  // 3-6. 衝突解決
  { code: 'crossDeptConflict', question: '在工作職位上，過往有遇到甚麼部門/跨部門的衝突嗎？您如何解決？', category: 'CONFLICT_RESOLUTION', required: true },
  { code: 'supervisorConflict', question: '如果工作衝突來自於主管，您認為如何解決？', category: 'CONFLICT_RESOLUTION', required: true },
  { code: 'otherDeptConflict', question: '如果工作衝突來自於其他部門，您認為如何解決？', category: 'CONFLICT_RESOLUTION', required: true },
  { code: 'teamConflict', question: '如果工作衝突來自於自已部門團隊，您認為如何解決？', category: 'CONFLICT_RESOLUTION', required: true },

  // 3-7. 協作、專業與挑戰
  { code: 'efficiencySuggestions', question: '請提出如何增加工作效率的建議', category: 'WORK_HABITS', required: true },
  { code: 'unacceptableEnvironment', question: '您無法接受哪些工作環境與主管或管理方式？', category: 'WORK_HABITS', required: true },
  { code: 'emergencyHandling', question: '請說明您在緊急情況下完成任務的事件與處理過程', category: 'WORK_HABITS', required: true },
  { code: 'multiTasking', question: '您會如何面對相同時間、各種工作任務的挑戰 (多工處理)', category: 'WORK_HABITS', required: true },
  { code: 'usefulKnowledge', question: '敘述您所學習的知識與專業中，覺得最受用的', category: 'WORK_HABITS', required: true },
  { code: 'knowledgeApplication', question: '承上題，您會如何運用在工作上？', category: 'WORK_HABITS', required: true },
  { code: 'professionalTraining', question: '您是否受過專業訓練？', category: 'WORK_HABITS', required: true },
  { code: 'learningPlan', question: '您會選擇如何繼續增加專業與學習？', category: 'WORK_HABITS', required: true },
  { code: 'workStylePreference', question: '您通常喜歡獨自一人完成任務或是經由團隊協作完成？', category: 'WORK_HABITS', required: true },
  { code: 'industryChoice', question: '在不同產業領域中都有這個職務需求，您為什麼會選擇這個領域產業的職務呢？', category: 'WORK_HABITS', required: true },

  // 4. 職涯規劃與願景
  { code: 'shortTermGoal', question: '職涯規劃 - 短期規劃', category: 'CAREER_VISION', required: true },
  { code: 'longTermGoal', question: '職涯規劃 - 長期規劃', category: 'CAREER_VISION', required: true },
  { code: 'careerPathElaboration', question: '談談您填寫的職涯規劃，請針對三、五年說明', category: 'CAREER_VISION', required: true },
  { code: 'visionAndValues', question: '請訴說對任職的願景與價值觀', category: 'CAREER_VISION', required: true },
  { code: 'cultureFit', question: '針對企業的價值契合認同度', category: 'CAREER_VISION', required: true },
  { code: 'top3JoinFactors', question: '請列舉任職最重要的三個面向會是您的入職意願？', category: 'CAREER_VISION', required: true },
  { code: 'top3LeaveFactors', question: '請列舉三個要素會讓您產生離職動機', category: 'CAREER_VISION', required: true }
];

/**
 * 教育程度選項
 */
export const EDUCATION_LEVELS = [
  { value: 'high_school', label: '高中' },
  { value: 'college', label: '專科' },
  { value: 'university', label: '大學' },
  { value: 'master', label: '碩士' },
  { value: 'phd', label: '博士' }
] as const;
