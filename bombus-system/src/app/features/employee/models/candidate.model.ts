export interface Candidate {
  id: string;
  jobId?: string;
  name: string;
  position: string;
  interviewDate?: string;
  status: 'interview' | 'pending_ai' | 'pending_decision' | 'offered' | 'offer_accepted' | 'onboarded' | 'not_hired' | 'not_invited' | 'invite_declined' | 'interview_declined' | 'offer_declined' | string;
  stage?: 'Collected' | 'Invited' | 'Offered' | 'Rejected';
  scoringStatus?: 'Pending' | 'Scoring' | 'Scored';

  // Avatar
  avatar?: string;

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
// 面試官評分表 (Interviewer Scoring) - 新版
// ============================================================

/**
 * 評分等級（5 等級倒扣制）
 * 優異(不扣分)、良好(-1分)、佳(-2分)、尚可(-3分)、差(-4分)
 */
export type ScoringLevel = 'excellent' | 'good' | 'fair' | 'acceptable' | 'poor';

/**
 * 評分對照表
 */
export const SCORING_LEVEL_MAP: Record<ScoringLevel, { label: string; deduction: number }> = {
  excellent: { label: '優異', deduction: 0 },
  good: { label: '良好', deduction: -1 },
  fair: { label: '佳', deduction: -2 },
  acceptable: { label: '尚可', deduction: -3 },
  poor: { label: '差', deduction: -4 }
};

/**
 * 評核項目分類
 */
export const SCORING_CATEGORIES = {
  PERSONAL_CULTIVATION: '個人修養',
  JOB_WILLINGNESS: '求職意願',
  COMPREHENSIVE_QUALITY: '綜合素質',
  PERSONALITY_TRAITS: '性格特質',
  PROFESSIONAL_SKILLS: '專業技能'
} as const;

export type ScoringCategory = keyof typeof SCORING_CATEGORIES;

/**
 * 評核項目定義
 */
export interface ScoringItemDef {
  code: string;
  name: string;
  category: ScoringCategory;
  weight: number;
}

/**
 * 17 題評核項目清單（對應規格文件）
 */
export const SCORING_ITEMS_DEF: ScoringItemDef[] = [
  // 2-1. 個人修養 (3 題)
  { code: 's1_punctuality', name: '是否守時', category: 'PERSONAL_CULTIVATION', weight: 1 },
  { code: 's2_politeness', name: '禮貌禮節', category: 'PERSONAL_CULTIVATION', weight: 1 },
  { code: 's3_appearance', name: '儀容儀表', category: 'PERSONAL_CULTIVATION', weight: 1 },
  // 2-2. 求職意願 (3 題)
  { code: 's4_careerGoal', name: '職業目標是否明確', category: 'JOB_WILLINGNESS', weight: 1 },
  { code: 's5_jobUnderstanding', name: '對職位的瞭解程度', category: 'JOB_WILLINGNESS', weight: 1 },
  { code: 's6_attitude', name: '求職態度是否積極', category: 'JOB_WILLINGNESS', weight: 1 },
  // 2-3. 綜合素質 (6 題)
  { code: 's7_execution', name: '執行力', category: 'COMPREHENSIVE_QUALITY', weight: 1 },
  { code: 's8_responsibility', name: '責任感', category: 'COMPREHENSIVE_QUALITY', weight: 1 },
  { code: 's9_reactivity', name: '快速反應能力', category: 'COMPREHENSIVE_QUALITY', weight: 1 },
  { code: 's10_teamwork', name: '團隊意識', category: 'COMPREHENSIVE_QUALITY', weight: 1 },
  { code: 's11_planning', name: '計畫性、條理性', category: 'COMPREHENSIVE_QUALITY', weight: 1 },
  { code: 's12_communication', name: '表達、溝通能力', category: 'COMPREHENSIVE_QUALITY', weight: 1 },
  // 2-4. 性格特質 (2 題)
  { code: 's13_affinity', name: '外向、親和', category: 'PERSONALITY_TRAITS', weight: 1 },
  { code: 's14_confidence', name: '自信心', category: 'PERSONALITY_TRAITS', weight: 1 },
  // 2-5. 專業技能 (3 題)
  { code: 's15_knowledge', name: '專業背景與知識水平', category: 'PROFESSIONAL_SKILLS', weight: 1 },
  { code: 's16_experience', name: '相關工作經驗', category: 'PROFESSIONAL_SKILLS', weight: 1 },
  { code: 's17_problemSolving', name: '解決問題能力', category: 'PROFESSIONAL_SKILLS', weight: 1 }
];

/**
 * 評核項目（含分數）
 */
export interface ScoringItem {
  code: string;
  name: string;
  category: ScoringCategory;
  weight: number;
  score: ScoringLevel | null;
}

/**
 * 面試流程檢核
 */
export interface ProcessChecklist {
  flow_introCompany: boolean;    // 介紹公司 (文化/願景/環境)
  flow_introBusiness: boolean;   // 商業模式與品牌簡介
  flow_introOrg: boolean;        // 組織架構與工作環境
  flow_introJob: boolean;        // 職務內容與 JD 說明
  flow_introSalary: boolean;     // 薪酬制度與福利
  flow_introTools: boolean;      // 管理工具 (OKR/專案報表)
}

/**
 * 面試流程檢核項目定義
 */
export const PROCESS_CHECKLIST_ITEMS = [
  { code: 'flow_introCompany', label: '介紹公司 (文化/願景/環境)' },
  { code: 'flow_introBusiness', label: '商業模式與品牌簡介' },
  { code: 'flow_introOrg', label: '組織架構與工作環境' },
  { code: 'flow_introJob', label: '職務內容與 JD 說明' },
  { code: 'flow_introSalary', label: '薪酬制度與福利' },
  { code: 'flow_introTools', label: '管理工具 (OKR/專案報表)' }
] as const;

/**
 * 綜合評估選項定義
 */
export interface AssessmentOptionDef {
  code: string;
  label: string;
  options: { value: string; label: string }[];
  hasOther: boolean;
}

/**
 * 10 題綜合評估選項（對應規格文件）
 */
export const ASSESSMENT_OPTIONS: AssessmentOptionDef[] = [
  {
    code: 'assess_appearance',
    label: '整體儀態形象',
    options: [
      { value: 'neat', label: '乾淨整齊、儀態端正且談吐大方' },
      { value: 'casual', label: '不修邊幅、坐姿及態度隨性' },
      { value: 'nervous', label: '情緒緊張，態度表現羞澀' }
    ],
    hasOther: true
  },
  {
    code: 'assess_understanding',
    label: '對公司/職務了解程度',
    options: [
      { value: 'thorough', label: '充分閱讀公司網站及應徵職務之工作內容' },
      { value: 'partial', label: '略為了解公司及應徵職務之相關資訊' },
      { value: 'none', label: '被動接受面試通知對公司不了解' }
    ],
    hasOther: true
  },
  {
    code: 'assess_passion',
    label: '對應徵工作之熱誠',
    options: [
      { value: 'proactive', label: '積極詢問未來工作上之問題' },
      { value: 'occasional', label: '偶爾提出工作上之問題' },
      { value: 'passive', label: '被動接受主管所敘述之工作內容' }
    ],
    hasOther: true
  },
  {
    code: 'assess_alignment',
    label: '個人期望與公司發展方向',
    options: [
      { value: 'fully', label: '完全相符' },
      { value: 'partial', label: '略為相符' },
      { value: 'none', label: '應徵者毫無想法' }
    ],
    hasOther: true
  },
  {
    code: 'assess_expectation',
    label: '選擇新工作期望',
    options: [
      { value: 'development', label: '想要在目前的專業領域上繼續發展' },
      { value: 'promotion', label: '希望晉升更高的職位及更多的收入' },
      { value: 'none', label: '從來沒有想過' }
    ],
    hasOther: true
  },
  {
    code: 'assess_personality',
    label: '人格特質與性格',
    options: [
      { value: 'positive', label: '積極樂觀' },
      { value: 'passive', label: '被動消極' },
      { value: 'none', label: '沒有自己的想法' }
    ],
    hasOther: true
  },
  {
    code: 'assess_comprehension',
    label: '對問題的理解力 (EQ)',
    options: [
      { value: 'precise', label: '針對所問的問題精確的回答' },
      { value: 'thoughtful', label: '需要思索之後才能回答' },
      { value: 'repeated', label: '需要反覆的詢問且講解後始能回答' }
    ],
    hasOther: true
  },
  {
    code: 'assess_expression',
    label: '表達能力',
    options: [
      { value: 'clear', label: '表達清晰且很有見解' },
      { value: 'average', label: '表達能力平平' },
      { value: 'poor', label: '未能針對問題回答' }
    ],
    hasOther: true
  },
  {
    code: 'assess_affinity',
    label: '親和度',
    options: [
      { value: 'friendly', label: '非常熱誠友善' },
      { value: 'approachable', label: '可以接近，尚稱友善' },
      { value: 'distant', label: '表現很有距離及疏離感' }
    ],
    hasOther: true
  },
  {
    code: 'assess_skillLevel',
    label: '專業技能評價',
    options: [
      { value: 'expert', label: '相當豐富且具實力' },
      { value: 'trainable', label: '需主管帶領，適用期後應可進入狀況' },
      { value: 'fresher', label: '職場新鮮人，態度積極，可培訓' }
    ],
    hasOther: true
  }
];

/**
 * 綜合評估（10 題單選 + 其他）
 */
export interface ComprehensiveAssessment {
  assess_appearance: string;
  assess_appearance_other?: string;
  assess_understanding: string;
  assess_understanding_other?: string;
  assess_passion: string;
  assess_passion_other?: string;
  assess_alignment: string;
  assess_alignment_other?: string;
  assess_expectation: string;
  assess_expectation_other?: string;
  assess_personality: string;
  assess_personality_other?: string;
  assess_comprehension: string;
  assess_comprehension_other?: string;
  assess_expression: string;
  assess_expression_other?: string;
  assess_affinity: string;
  assess_affinity_other?: string;
  assess_skillLevel: string;
  assess_skillLevel_other?: string;
}

/**
 * 錄取建議類型
 */
export type RecommendationType = 'Pass' | 'Hold' | 'Reject';

/**
 * 錄取建議選項
 */
export const RECOMMENDATION_OPTIONS: { value: RecommendationType; label: string }[] = [
  { value: 'Pass', label: '建議錄取' },
  { value: 'Hold', label: '考慮中 / 列入人才庫' },
  { value: 'Reject', label: '不予錄取' }
];

/**
 * 面試結果總評
 */
export interface FinalResult {
  prosComment: string;              // 面試者優點總評 (必填)
  consComment: string;              // 面試者缺點總評 (必填)
  recommendation: RecommendationType; // 錄取建議 (必填)
  remark?: string;                  // 備註 (選填)
}

/**
 * 完整面試官評分
 */
export interface InterviewerScoring {
  // 基本資訊（系統自動帶入）
  basicInfo: {
    fillDate: string;
    interviewerName: string;
    candidateName: string;
    jobTitle: string;
  };
  // 17 題評核項目
  scoringItems: ScoringItem[];
  // 面試流程檢核
  processChecklist: ProcessChecklist;
  // 綜合評估（10 題）
  comprehensiveAssessment: ComprehensiveAssessment;
  // 面試結果總評
  finalResult: FinalResult;
  // 系統計算總分
  totalScore: number;
}

// ============================================================
// 面試評估 (Interview Evaluation) - 整合新舊格式
// ============================================================

/**
 * 面試評估資料
 * 記錄面試官對候選人的面試評分與描述
 */
export interface InterviewEvaluation {
  // ===== 新版欄位 =====
  scoringItems?: ScoringItem[];               // 17 題評核項目
  processChecklist?: ProcessChecklist;        // 面試流程檢核
  comprehensiveAssessment?: ComprehensiveAssessment; // 綜合評估
  prosComment?: string;                       // 優點總評
  consComment?: string;                       // 缺點總評
  recommendation?: RecommendationType;        // 錄取建議

  // ===== 保留欄位 =====
  performanceDescription?: string;            // 候選人表現描述 (自由文字)
  overallComment?: string;                    // 整體評語
  totalScore: number;                         // 總分（100 + Σ扣分）
  evaluatedBy?: string;                       // 評分者 ID
  evaluatedAt?: string;                       // 評分時間
  transcriptText?: string;                    // 逐字稿
  mediaUrl?: string;                          // 錄音/錄影 URL
  mediaSize?: number;                         // 錄音/錄影檔案大小 (bytes)
  attachments?: MediaAttachment[];            // 錄音/錄影附件
}

/**
 * 初始化空的評核項目
 */
export function createEmptyScoringItems(): ScoringItem[] {
  return SCORING_ITEMS_DEF.map(def => ({
    code: def.code,
    name: def.name,
    category: def.category,
    weight: def.weight,
    score: null
  }));
}

/**
 * 初始化空的流程檢核
 */
export function createEmptyProcessChecklist(): ProcessChecklist {
  return {
    flow_introCompany: false,
    flow_introBusiness: false,
    flow_introOrg: false,
    flow_introJob: false,
    flow_introSalary: false,
    flow_introTools: false
  };
}

/**
 * 初始化空的綜合評估
 */
export function createEmptyComprehensiveAssessment(): ComprehensiveAssessment {
  return {
    assess_appearance: '',
    assess_understanding: '',
    assess_passion: '',
    assess_alignment: '',
    assess_expectation: '',
    assess_personality: '',
    assess_comprehension: '',
    assess_expression: '',
    assess_affinity: '',
    assess_skillLevel: ''
  };
}

/**
 * 計算總分（100 + Σ扣分）
 */
export function calculateTotalScore(scoringItems: ScoringItem[]): number {
  let deduction = 0;
  scoringItems.forEach(item => {
    if (item.score) {
      deduction += SCORING_LEVEL_MAP[item.score].deduction * item.weight;
    }
  });
  return 100 + deduction;
}

// ============================================================
// 媒體附件 (Media Attachment)
// ============================================================

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
    birthday?: string;
    drivingLicenses?: string[];
  };
  interview: {
    jobTitle: string;
    department: string;
    interviewAt: string;
    location?: string;
    round: number;
  };
  // 從履歷帶入的工作經歷
  workExperiences?: {
    companyName: string;
    jobTitle: string;
    yearsOfService: string;
  }[];
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
