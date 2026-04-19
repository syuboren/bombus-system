import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Candidate, SalaryRangeResult } from '../models/candidate.model';

/**
 * 簽核/決策 API 回應
 */
export interface SubmitApprovalResponse {
  success: boolean;
  decisionId: string;
  outOfRange: 0 | 1;
  fromStatus: string;
  toStatus: string;
}

export interface ApproveResponse {
  success: boolean;
  decisionId: string;
  newStatus: 'offered' | 'not_hired';
  responseToken: string | null;
  replyDeadline: string | null;
  responseLink: string | null;
}

export interface RejectApprovalResponse {
  success: boolean;
  decisionId: string;
  newStatus: 'pending_decision';
}

export interface SubmitApprovalRequest {
  decision: 'Offered' | 'Rejected';
  decision_reason: string;
  approved_salary_type?: number;
  approved_salary_amount?: number;
}

@Injectable({ providedIn: 'root' })
export class DecisionService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/recruitment';

  /**
   * 取得決策頁候選人清單（僅 pending_decision 之後狀態）
   * 後端回傳 snake_case；此處 map 為前端需要的欄位
   */
  listDecisionCandidates(): Observable<Candidate[]> {
    return this.http.get<any[]>(`${this.apiUrl}/candidates`).pipe(
      map(list => (list ?? []).map(c => ({
        id: c.id,
        jobId: c.job_id,
        name: c.name,
        position: c.job_title || c.position || '',
        // 候選人列表日期欄位：優先顯示最新面試時間，退而求其次顯示投遞日
        interviewDate: c.latest_interview_at || c.apply_date || undefined,
        status: c.status,
        stage: c.stage,
        scoringStatus: c.scoring_status,
        avatar: c.avatar?.startsWith('/') || c.avatar?.startsWith('http') ? c.avatar : undefined,
        // 薪資核定
        approved_salary_type: c.approved_salary_type,
        approved_salary_amount: c.approved_salary_amount,
        approved_salary_out_of_range: c.approved_salary_out_of_range,
        // 簽核
        approval_status: c.approval_status,
        approver_id: c.approver_id,
        approved_at: c.approved_at,
        approval_note: c.approval_note,
        submitted_for_approval_at: c.submitted_for_approval_at,
        job_grade: c.job_grade,
        decision_reason: c.decision_reason,
        decision_type: c.decision_type,
        approver_name: c.approver_name,
        decided_by_name: c.decided_by_name
      }) as Candidate))
    );
  }

  /**
   * 查詢候選人職缺的薪資範圍（依 job.grade 關聯 grade_salary_levels）
   */
  getSalaryRange(candidateId: string): Observable<SalaryRangeResult> {
    return this.http.get<SalaryRangeResult>(`${this.apiUrl}/candidates/${candidateId}/salary-range`);
  }

  /**
   * HR 送簽：pending_decision → pending_approval
   */
  submitForApproval(candidateId: string, payload: SubmitApprovalRequest): Observable<SubmitApprovalResponse> {
    return this.http.post<SubmitApprovalResponse>(
      `${this.apiUrl}/candidates/${candidateId}/submit-approval`,
      payload
    );
  }

  /**
   * 主管簽核通過：pending_approval → offered | not_hired
   */
  approve(candidateId: string, approvalNote?: string): Observable<ApproveResponse> {
    return this.http.post<ApproveResponse>(
      `${this.apiUrl}/candidates/${candidateId}/approve`,
      { approval_note: approvalNote }
    );
  }

  /**
   * 主管退回：pending_approval → pending_decision
   */
  rejectApproval(candidateId: string, approvalNote: string): Observable<RejectApprovalResponse> {
    return this.http.post<RejectApprovalResponse>(
      `${this.apiUrl}/candidates/${candidateId}/reject-approval`,
      { approval_note: approvalNote }
    );
  }
}
