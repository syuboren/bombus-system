import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateReferralInvitationRequest,
  CreateReferralInvitationResponse,
  ReferralInvitationListItem,
  ReferralInvitationStatus,
  RecommenderPreview,
  RenewReferralInvitationResponse
} from '../models/referral-invitation.model';

const API_BASE = '/api/recruitment/referrals';

@Injectable({ providedIn: 'root' })
export class ReferralInvitationService {
  private readonly http = inject(HttpClient);

  createInvitation(payload: CreateReferralInvitationRequest): Observable<CreateReferralInvitationResponse> {
    return this.http.post<CreateReferralInvitationResponse>(API_BASE, payload);
  }

  listInvitations(jobId: string, status?: ReferralInvitationStatus): Observable<{ invitations: ReferralInvitationListItem[] }> {
    let params = new HttpParams().set('job_id', jobId);
    if (status) params = params.set('status', status);
    return this.http.get<{ invitations: ReferralInvitationListItem[] }>(API_BASE, { params });
  }

  cancelInvitation(id: string): Observable<{ success: true }> {
    return this.http.post<{ success: true }>(`${API_BASE}/${id}/cancel`, {});
  }

  renewInvitation(id: string): Observable<RenewReferralInvitationResponse> {
    return this.http.post<RenewReferralInvitationResponse>(`${API_BASE}/${id}/renew`, {});
  }

  previewRecommender(employeeNo: string): Observable<RecommenderPreview> {
    const params = new HttpParams().set('employee_no', employeeNo);
    return this.http.get<RecommenderPreview>(`${API_BASE}/recommender-preview`, { params });
  }
}
