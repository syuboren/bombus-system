import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, catchError, forkJoin } from 'rxjs';
import { Candidate, CandidateDetail, Interview, InterviewInvitation, InvitationDecision } from '../models/candidate.model';

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
    // ... Simplified for other mocks to save space, but logically they would exist
  };

  // --- API METHODS ---

  /**
   * Get all candidates (Mix of API and Mock for filtering)
   */
  getCandidates(): Observable<Candidate[]> {
    return this.http.get<any[]>('/api/recruitment/candidates').pipe(
      map(apiCandidates => {
        // Map API format to frontend model
        const mapped = apiCandidates.map(c => ({
          id: c.id,
          name: c.name,
          position: c.job_title || 'Unknown Position', // Ensure backend sends job_title or we map it
          interviewDate: c.apply_date,
          status: c.scoring_status === 'Scored' ? 'completed' : 'pending',
          stage: c.stage,
          scoringStatus: c.scoring_status
        }));
        // Merge with mock
        const mockIds = new Set(this.mockCandidates.map(m => m.id));
        const nonDuplicateApi = mapped.filter(c => !mockIds.has(c.id));
        return [...this.mockCandidates, ...nonDuplicateApi];
      }),
      catchError(err => {
        console.warn('Failed to fetch API candidates, returning mocks', err);
        return of(this.mockCandidates);
      })
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
          position: 'Candidate', // Data might not have joined job title
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
          }
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

  makeDecision(candidateId: string, decision: 'Offered' | 'Rejected', reason?: string): Observable<any> {
    // We assume the user is "HR Admin" for now
    return this.http.post(`${this.apiUrl}/candidates/${candidateId}/decision`, {
      decision,
      decidedBy: 'USER-CURRENT',
      reason
    });
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
