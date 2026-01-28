export interface Candidate {
  id: string;
  jobId?: string; // Added
  name: string;
  position: string; // This maps to job title usually
  interviewDate?: string; // Optional now
  status: 'completed' | 'pending' | 'new' | string; // Relaxed type
  stage?: 'Collected' | 'Invited' | 'Offered' | 'Rejected'; // Added
  scoringStatus?: 'Pending' | 'Scoring' | 'Scored'; // Added

  // Legacy/Demo fields
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
