import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, delay, map, catchError, forkJoin } from 'rxjs';
import {
  Candidate,
  CandidateDetail,
  Interview,
  InterviewInvitation,
  InvitationDecision,
  GenerateFormResponse,
  FormStatusResponse,
  CandidateFormData
} from '../models/candidate.model';

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
      status: 'pending_decision',
      duration: '25:30'
    },
    {
      id: '2',
      name: '李小華',
      position: '後端工程師',
      interviewDate: '2025-11-21',
      status: 'pending_decision',
      duration: '32:15'
    },
    {
      id: '3',
      name: '張大同',
      position: 'UI/UX 設計師',
      interviewDate: '2025-11-22',
      status: 'pending_decision',
      duration: '28:45'
    },
    {
      id: '4',
      name: '陳美玲',
      position: '專案經理',
      interviewDate: '2025-11-25',
      status: 'interview'
    },
    {
      id: '5',
      name: '林志明',
      position: '資料分析師',
      interviewDate: '2025-11-19',
      status: 'pending_decision',
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
  getCandidates(orgUnitId?: string): Observable<Candidate[]> {
    let params = new HttpParams();
    if (orgUnitId) params = params.set('org_unit_id', orgUnitId);

    return this.http.get<any[]>('/api/recruitment/candidates', { params }).pipe(
      map(apiCandidates => {
        // Map API format to frontend model
        return apiCandidates.map(c => {
          // 狀態判斷邏輯（優先級：資料庫狀態 > stage > 待決策 > 待AI分析 > 待面試）
          let statusDisplay = 'pending'; // 待面試
          
          // 檢查是否有有效的 AI 分析結果（排除 "null" 字串和空值）
          const hasValidAiResult = c.ai_analysis_result && 
            c.ai_analysis_result !== 'null' && 
            c.ai_analysis_result.length > 10; // 有效的 JSON 結果至少會超過 10 字元

          // 優先使用資料庫中的 status 欄位（包含所有明確狀態，涵蓋新的決策簽核流程）
          const validDbStatuses = [
            'interview', 'pending_ai', 'pending_decision', 'pending_approval',
            'offered', 'offer_accepted', 'offer_declined', 'onboarded',
            'not_invited', 'not_hired', 'invite_declined', 'interview_declined'
          ];
          if (c.status && validDbStatuses.includes(c.status)) {
            statusDisplay = c.status;
          } else if (c.stage === 'Hired' || c.stage === 'Offered') {
            statusDisplay = c.stage.toLowerCase(); // 舊流程相容
          } else if (hasValidAiResult) {
            statusDisplay = 'pending_decision';
          } else if (c.scoring_status === 'Scored') {
            statusDisplay = 'pending_ai';
          }

          return {
            id: c.id,
            name: c.name,
            avatar: c.avatar?.startsWith('/') || c.avatar?.startsWith('http') ? c.avatar : undefined,
            position: c.job_title || 'Unknown Position',
            // 候選人列表日期欄位：優先顯示最新面試時間，退而求其次顯示投遞日
            interviewDate: c.latest_interview_at || c.apply_date || '',
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
   * Exclude: interview_declined (面試婉拒不應出現在面試列表)
   */
  getScheduledCandidates(orgUnitId?: string): Observable<Candidate[]> {
    return this.getCandidates(orgUnitId).pipe(
      map(candidates => candidates.filter(c => {
        // 排除「面試婉拒」的候選人 - 他們不應該出現在面試列表
        if (c.status === 'interview_declined') {
          return false;
        }
        
        // 從招募管理過來的候選人，狀態應該是 'Interview'(已安排) 或 'Invited'(已邀請)
        // 或是已經評分完成 ('Scored')
        // 寬鬆過濾：只要有進入面試階段的都顯示
        const validStages = ['Invited', 'Interview', 'Hired', 'Offer', 'Rejected'];
        return validStages.includes(c.stage || '') ||
          c.scoringStatus === 'Scored';
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
        // 狀態推導：優先用後端 candidates.status（若為已知值），其次依 scoring_status + ai_analysis_result 推導。
        // 此邏輯必須與 getCandidates() 的列表推導保持一致，否則切換到右側詳情時狀態會跳動
        const validDbStatuses = [
          'interview', 'pending_ai', 'pending_decision', 'pending_approval',
          'offered', 'offer_accepted', 'offer_declined', 'onboarded',
          'not_invited', 'not_hired', 'invite_declined', 'interview_declined'
        ];
        const evalAiResult = data.evaluation?.ai_analysis_result;
        const hasValidAiResult = !!evalAiResult && evalAiResult !== 'null' && String(evalAiResult).length > 10;
        let derivedStatus: string;
        if (data.status && validDbStatuses.includes(data.status)) {
          derivedStatus = data.status;
        } else if (hasValidAiResult) {
          derivedStatus = 'pending_decision';
        } else if (data.scoring_status === 'Scored') {
          derivedStatus = 'pending_ai';
        } else {
          derivedStatus = 'interview';
        }

        return {
          id: data.id,
          name: data.name,
          avatar: data.avatar?.startsWith('/') || data.avatar?.startsWith('http') ? data.avatar : undefined,
          position: data.job_title || 'Unknown Position',
          jobId: data.job_id,
          status: derivedStatus,
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
          // Map Evaluation Data (新版 + 舊版相容)
          evaluation: data.evaluation ? {
            // 新版欄位
            scoringItems: data.evaluation.scoring_items ? 
              (typeof data.evaluation.scoring_items === 'string' ? JSON.parse(data.evaluation.scoring_items) : data.evaluation.scoring_items) : undefined,
            processChecklist: data.evaluation.process_checklist ?
              (typeof data.evaluation.process_checklist === 'string' ? JSON.parse(data.evaluation.process_checklist) : data.evaluation.process_checklist) : undefined,
            comprehensiveAssessment: data.evaluation.comprehensive_assessment ?
              (typeof data.evaluation.comprehensive_assessment === 'string' ? JSON.parse(data.evaluation.comprehensive_assessment) : data.evaluation.comprehensive_assessment) : undefined,
            prosComment: data.evaluation.pros_comment,
            consComment: data.evaluation.cons_comment,
            recommendation: data.evaluation.recommendation,
            // 保留欄位
            performanceDescription: data.evaluation.performance_description,
            overallComment: data.evaluation.overall_comment,
            totalScore: data.evaluation.total_score,
            evaluatedAt: data.evaluation.updated_at,
            transcriptText: data.evaluation.transcript_text,
            mediaUrl: data.evaluation.media_url,
            mediaSize: data.evaluation.media_size,
            attachments: []
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
    address?: string,  // 現場面試地址
    round: number
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/interviews`, data);
  }

  submitEvaluation(interviewId: string, data: { evaluationJson: any, result: string, remark: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/interviews/${interviewId}/evaluation`, data);
  }

  /**
   * 儲存完整面試評分 (新版 - 17 題倒扣制)
   */
  saveEvaluation(candidateId: string, data: {
    interviewId?: string;
    // 新版欄位
    scoringItems?: any[];
    processChecklist?: any;
    comprehensiveAssessment?: any;
    prosComment?: string;
    consComment?: string;
    recommendation?: string;
    // 保留欄位（全部 optional，後端以 COALESCE 更新 → 可做部分欄位寫入）
    performanceDescription?: string;
    overallComment?: string;
    totalScore?: number;
    transcriptText?: string;
    mediaUrl?: string;
    mediaSize?: number;
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

  // ============================================================
  // 候選人面試表單相關 API
  // ============================================================

  /**
   * 產生面試表單 Token 與 QR Code
   * 如果表單已存在且有 token，會返回現有的（除非 forceRegenerate = true）
   * @param interviewId 面試 ID
   * @param timeLimitMinutes 時間限制（分鐘）
   * @param forceRegenerate 是否強制重新產生 token（舊連結將失效）
   */
  generateFormToken(interviewId: string, timeLimitMinutes?: number, forceRegenerate?: boolean): Observable<GenerateFormResponse> {
    return this.http.post<GenerateFormResponse>(
      `${this.apiUrl}/interviews/${interviewId}/generate-form`,
      { timeLimitMinutes, forceRegenerate }
    );
  }

  /**
   * 取得面試表單狀態
   */
  getFormStatus(interviewId: string): Observable<FormStatusResponse> {
    return this.http.get<FormStatusResponse>(
      `${this.apiUrl}/interviews/${interviewId}/form-status`
    );
  }

  /**
   * 取得候選人已填寫的表單內容（供面試官查閱）
   */
  getCandidateFormData(interviewId: string): Observable<{
    status: string;
    submittedAt?: string;
    lockedAt?: string;
    candidateName: string;
    email?: string;
    phone?: string;
    jobTitle: string;
    department: string;
    interviewAt: string;
    location?: string;
    round: number;
    formData?: CandidateFormData;
    message?: string;
    currentStep?: number;
    lastSavedAt?: string;
  }> {
    return this.http.get<any>(`${this.apiUrl}/interviews/${interviewId}/form-data`);
  }

  /**
   * 重新產生 QR Code（不會重新產生 Token）
   */
  regenerateQrCode(interviewId: string): Observable<{
    success: boolean;
    formToken: string;
    formUrl: string;
    qrCodeDataUrl: string;
  }> {
    return this.http.post<any>(`${this.apiUrl}/interviews/${interviewId}/regenerate-qrcode`, {});
  }
}
