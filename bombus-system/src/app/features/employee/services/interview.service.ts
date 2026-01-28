import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, catchError, forkJoin } from 'rxjs';
import { Candidate, CandidateDetail, Interview, InterviewInvitation, InvitationDecision } from '../models/candidate.model';
import { DEFAULT_DIMENSIONS } from '../models/job-keywords.model';

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private http = inject(HttpClient);
  private apiUrl = '/api/recruitment';

  // --- MOCK DATA (Preserved for Demo) ---
  private readonly mockCandidates: Candidate[] = [
    {
      id: '1',
      name: '王小明',
      position: '前端工程師',
      interviewDate: '2025-11-20',
      status: 'completed',
      duration: '25:30'
    },
    {
      id: '2',
      name: '李小華',
      position: '後端工程師',
      interviewDate: '2025-11-21',
      status: 'completed',
      duration: '32:15'
    },
    {
      id: '3',
      name: '張大同',
      position: 'UI/UX 設計師',
      interviewDate: '2025-11-22',
      status: 'completed',
      duration: '28:45'
    },
    {
      id: '4',
      name: '陳美玲',
      position: '專案經理',
      interviewDate: '2025-11-25',
      status: 'pending'
    },
    {
      id: '5',
      name: '林志明',
      position: '資料分析師',
      interviewDate: '2025-11-19',
      status: 'completed',
      duration: '30:00'
    }
  ];

  private readonly mockCandidateDetails: Record<string, CandidateDetail> = {
    '1': {
      ...this.mockCandidates[0],
      transcript: [
        { time: '00:30', text: '您好，請先做個簡單的自我介紹。', speaker: 'interviewer' },
        { time: '00:45', text: '您好！我是王小明，畢業於台灣大學資訊工程系，有三年的前端開發經驗。我擅長 React 和 Vue 框架，對於使用者體驗有很大的熱情。在前公司，我主導了多個電商平台的前端重構專案，成功提升了 40% 的頁面載入速度。', speaker: 'candidate' },
        { time: '02:15', text: '可以分享一下您在團隊協作方面的經驗嗎？', speaker: 'interviewer' },
        { time: '02:30', text: '當然！我非常重視團隊協作。在之前的專案中，我經常與後端工程師和設計師緊密合作，使用 Git Flow 進行版本控制，並且定期進行 Code Review。我相信良好的溝通能力是團隊成功的關鍵。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 75, anxiety: 25, enthusiasm: 80 },
        { time: '2', confidence: 80, anxiety: 20, enthusiasm: 85 },
        { time: '3', confidence: 85, anxiety: 15, enthusiasm: 88 }
      ],
      skills: [
        { name: '邏輯思考', score: 85 },
        { name: '溝通能力', score: 88 },
        { name: '技術能力', score: 82 }
      ],
      aiScores: {
        keywordMatch: 85,
        semanticAnalysis: 80,
        jdMatch: 82,
        overall: 82
      }
    },
    '2': {
      ...this.mockCandidates[1],
      transcript: [
        { time: '00:30', text: '請介紹一下您的後端開發經驗。', speaker: 'interviewer' },
        { time: '00:50', text: '我是李小華，有四年的後端開發經驗，主要使用 Java 和 Node.js。我在團隊合作和系統架構設計方面有豐富的經驗，曾經帶領團隊完成多個高並發系統的優化。', speaker: 'candidate' },
        { time: '02:00', text: '您如何處理系統效能問題？', speaker: 'interviewer' },
        { time: '02:20', text: '我會先透過監控工具定位瓶頸，然後針對性地優化。例如使用快取策略、資料庫索引優化、或是進行程式碼層面的改進。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 82, anxiety: 18, enthusiasm: 75 },
        { time: '2', confidence: 85, anxiety: 15, enthusiasm: 78 },
        { time: '3', confidence: 88, anxiety: 12, enthusiasm: 80 }
      ],
      skills: [
        { name: '邏輯思考', score: 90 },
        { name: '溝通能力', score: 78 },
        { name: '技術能力', score: 92 }
      ],
      aiScores: {
        keywordMatch: 88,
        semanticAnalysis: 82,
        jdMatch: 85,
        overall: 85
      }
    },
    '3': {
      ...this.mockCandidates[2],
      transcript: [
        { time: '00:30', text: '可以分享您的設計理念嗎？', speaker: 'interviewer' },
        { time: '00:45', text: '我是張大同，我相信好的設計應該以使用者為中心。我會進行使用者研究，了解他們的痛點，然後透過原型測試來驗證設計方案。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 78, anxiety: 22, enthusiasm: 85 },
        { time: '2', confidence: 82, anxiety: 18, enthusiasm: 88 }
      ],
      skills: [
        { name: '邏輯思考', score: 80 },
        { name: '溝通能力', score: 85 },
        { name: '技術能力', score: 75 }
      ],
      aiScores: {
        keywordMatch: 78,
        semanticAnalysis: 82,
        jdMatch: 80,
        overall: 80
      }
    },
    '4': {
      ...this.mockCandidates[3],
      transcript: [],
      emotions: [],
      skills: [
        { name: '邏輯思考', score: 0 },
        { name: '溝通能力', score: 0 },
        { name: '技術能力', score: 0 }
      ],
      aiScores: {
        keywordMatch: 0,
        semanticAnalysis: 0,
        jdMatch: 0,
        overall: 0
      }
    },
    '5': {
      ...this.mockCandidates[4],
      transcript: [
        { time: '00:30', text: '請談談您的資料分析經驗。', speaker: 'interviewer' },
        { time: '00:50', text: '我是林志明，擅長使用 Python 和 SQL 進行資料分析。我能夠從大量數據中發現洞察，並用視覺化方式呈現給團隊。', speaker: 'candidate' }
      ],
      emotions: [
        { time: '1', confidence: 72, anxiety: 28, enthusiasm: 70 },
        { time: '2', confidence: 78, anxiety: 22, enthusiasm: 75 }
      ],
      skills: [
        { name: '邏輯思考', score: 88 },
        { name: '溝通能力', score: 72 },
        { name: '技術能力', score: 85 }
      ],
      aiScores: {
        keywordMatch: 80,
        semanticAnalysis: 75,
        jdMatch: 78,
        overall: 78
      }
    }
  };

  // --- API METHODS ---

  /**
   * Get all candidates (Mix of API and Mock for filtering)
   */
  /**
   * Get all candidates (API only)
   */
  getCandidates(): Observable<Candidate[]> {
    return this.http.get<any[]>('/api/recruitment/candidates').pipe(
      map(apiCandidates => {
        // Map API format to frontend model
        return apiCandidates.map(c => {
          // 狀態判斷邏輯（優先級：資料庫狀態 > stage > 待決策 > 待AI分析 > 待面試）
          let statusDisplay = 'pending'; // 待面試
          
          // 檢查是否有有效的 AI 分析結果（排除 "null" 字串和空值）
          const hasValidAiResult = c.ai_analysis_result && 
            c.ai_analysis_result !== 'null' && 
            c.ai_analysis_result.length > 10; // 有效的 JSON 結果至少會超過 10 字元

          // 優先使用資料庫中的 status 欄位（包含 offer_accepted, offer_declined, offered, rejected 等）
          const validDbStatuses = ['offered', 'offer_accepted', 'offer_declined', 'rejected', 'hired'];
          if (c.status && validDbStatuses.includes(c.status)) {
            statusDisplay = c.status; // 使用資料庫的狀態
          } else if (c.stage === 'Rejected' || c.stage === 'Hired' || c.stage === 'Offered') {
            statusDisplay = c.stage.toLowerCase(); // 已決策（舊邏輯兼容）
          } else if (hasValidAiResult) {
            // 必須有有效的 AI 分析結果才顯示「待決策」
            statusDisplay = 'pending_decision'; // 待決策
          } else if (c.scoring_status === 'Scored') {
            // 已評分但沒有 AI 分析結果 → 待 AI 分析
            statusDisplay = 'pending_ai'; // 待 AI 分析
          }

          return {
            id: c.id,
            name: c.name,
            position: c.job_title || 'Unknown Position',
            interviewDate: c.apply_date ? c.apply_date.split('T')[0] : '', // 暫時使用申請日期
            status: statusDisplay,
            stage: c.stage,
            scoringStatus: c.scoring_status
          };
        });
      }),
      catchError(err => {
        console.warn('Failed to fetch API candidates', err);
        return of([]);
      })
    );
  }

  /**
   * Get only candidates who have scheduled interviews
   * Filter: stage is 'Interview'/'Invited' or scoring_status is 'Scored'
   */
  getScheduledCandidates(): Observable<Candidate[]> {
    return this.getCandidates().pipe(
      map(candidates => candidates.filter(c => {
        // 從招募管理過來的候選人，狀態應該是 'Interview'(已安排) 或 'Invited'(已邀請)
        // 或是已經評分完成 ('Scored')
        // 寬鬆過濾：只要有進入面試階段的都顯示
        const validStages = ['Invited', 'Interview', 'Hired', 'Offer', 'Rejected'];
        return validStages.includes(c.stage || '') ||
          c.scoringStatus === 'Scored' ||
          c.status === 'completed';
      }))
    );
  }

  /**
   * Get Candidate Detail
   */
  getCandidateDetail(id: string): Observable<CandidateDetail | null> {
    // Check mock first
    if (this.mockCandidateDetails[id]) {
      return of(this.mockCandidateDetails[id]).pipe(delay(200));
    }

    // Call API
    return this.http.get<any>(`/api/recruitment/candidates/${id}`).pipe(
      map(data => {
        if (!data) return null;
        return {
          id: data.id,
          name: data.name,
          position: data.job_title || 'Unknown Position', // Correctly map from joined title
          jobId: data.job_id,
          status: data.scoring_status === 'Scored' ? 'completed' : 'pending',
          stage: data.stage,
          scoringStatus: data.scoring_status,

          // Extended info
          invitation: data.invitation,
          interviews: data.interviews,
          decision: data.decision,

          // Defaults for demo fields
          transcript: [],
          emotions: [],
          skills: data.skills ? JSON.parse(data.skills) : [],
          aiScores: {
            keywordMatch: 0,
            semanticAnalysis: 0,
            jdMatch: 0,
            overall: data.score || 0
          },
          // Map Evaluation Data
          evaluation: data.evaluation ? {
            performanceDescription: data.evaluation.performance_description,
            scores: (() => {
              const rawScores = data.evaluation.dimension_scores ? JSON.parse(data.evaluation.dimension_scores) : [];
              // Repair logic for missing dimensionId (from legacy/buggy saves)
              return rawScores.map((s: any) => {
                if (!s.dimensionId && s.name) {
                  // Try to find ID by name from default dimensions
                  const found = DEFAULT_DIMENSIONS.find(d => d.name === s.name);
                  return {
                    dimensionId: found?.id || 'unknown',
                    dimensionName: s.name,
                    score: s.score,
                    remark: s.comment || s.remark
                  };
                }
                return s;
              });
            })(),
            overallComment: data.evaluation.overall_comment,
            keywordsFound: [], // backend data table might not have this column detached yet
            totalScore: data.evaluation.total_score,
            evaluatedAt: data.evaluation.updated_at,
            transcriptText: data.evaluation.transcript_text,
            mediaUrl: data.evaluation.media_url,   // 媒體 URL
            mediaSize: data.evaluation.media_size, // 媒體檔案大小
            attachments: [] // attachments are separate if any
          } : undefined,
          // Map AI Analysis Result if exists in evaluation
          aiAnalysisResult: data.evaluation?.ai_analysis_result ? (typeof data.evaluation.ai_analysis_result === 'string' ? JSON.parse(data.evaluation.ai_analysis_result) : data.evaluation.ai_analysis_result) : undefined
        } as CandidateDetail;
      }),
      catchError(() => of(null))
    );
  }

  // --- NEW RECRUITMENT ACTIONS ---

  inviteCandidate(candidateId: string, jobId: string, message: string, slots: string[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/candidates/${candidateId}/invitations`, {
      jobId,
      message,
      proposedSlots: slots
      // Backend now handles replyDeadline (7 days) and generates responseToken
    });
  }

  getResponseLink(candidateId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidates/${candidateId}/response-link`);
  }

  getOfferResponseLink(candidateId: string): Observable<{
    responseToken: string;
    responseLink: string;
    replyDeadline: string;
    candidateResponse: string | null;
  }> {
    return this.http.get<{
      responseToken: string;
      responseLink: string;
      replyDeadline: string;
      candidateResponse: string | null;
    }>(`${this.apiUrl}/candidates/${candidateId}/offer-response-link`);
  }

  scheduleInterview(data: {
    candidateId: string,
    jobId: string,
    interviewerId: string,
    interviewAt: string,
    location: string,
    meetingLink?: string,
    round: number
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/interviews`, data);
  }

  submitEvaluation(interviewId: string, data: { evaluationJson: any, result: string, remark: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/interviews/${interviewId}/evaluation`, data);
  }

  /**
   * 儲存完整面試評分 (新 API)
   */
  saveEvaluation(candidateId: string, data: {
    performanceDescription: string;
    dimensionScores: any[];
    overallComment: string;
    totalScore: number;
    transcriptText?: string;
    aiAnalysisResult?: any;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/candidates/${candidateId}/evaluation`, data);
  }

  /**
   * 取得候選人面試評分
   */
  getEvaluation(candidateId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/candidates/${candidateId}/evaluation`);
  }

  makeDecision(candidateId: string, decision: 'Offered' | 'Rejected', reason?: string): Observable<{
    success: boolean;
    message: string;
    responseToken?: string;
    responseLink?: string;
    replyDeadline?: string;
  }> {
    // We assume the user is "HR Admin" for now
    return this.http.post<{
      success: boolean;
      message: string;
      responseToken?: string;
      responseLink?: string;
      replyDeadline?: string;
    }>(`${this.apiUrl}/candidates/${candidateId}/decision`, {
      decision,
      decidedBy: 'USER-CURRENT',
      reason
    });
  }

  uploadMedia(file: File): Observable<{ success: boolean; url: string; filename: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: boolean; url: string; filename: string }>('/api/upload', formData);
  }

  // --- HELPER ---

  getHireRecommendation(score: number): { level: string; text: string; icon: string } {
    if (score >= 85) {
      return { level: 'excellent', text: '強烈推薦錄用', icon: 'ri-checkbox-circle-fill' };
    } else if (score >= 75) {
      return { level: 'good', text: '建議錄用', icon: 'ri-thumb-up-fill' };
    } else if (score >= 65) {
      return { level: 'neutral', text: '可考慮錄用', icon: 'ri-question-fill' };
    } else {
      return { level: 'poor', text: '不建議錄用', icon: 'ri-close-circle-fill' };
    }
  }
}
