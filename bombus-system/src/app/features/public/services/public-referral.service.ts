import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CandidateFullForm } from '../../../shared/components/candidate-full-form/candidate-full-form.model';

export interface ReferralIntakeContext {
  job: { id: string; title: string; department: string | null; company: string | null } | null;
  recommender: { name: string; department: string | null; company: string | null };
  company: string | null;
  custom_message: string | null;
  candidate_email: string;
  expires_at: string;
}

/** 已改為使用共用 CandidateFullForm 型別，見 shared/components/candidate-full-form */
export type ReferralIntakeForm = CandidateFullForm;

export interface ReferralIntakeSubmitResponse {
  success: true;
  candidateId: string;
}

const API_BASE = '/api/public/referrals';

@Injectable({ providedIn: 'root' })
export class PublicReferralService {
  private readonly http = inject(HttpClient);

  fetchInvitationByToken(token: string): Observable<ReferralIntakeContext> {
    return this.http.get<ReferralIntakeContext>(`${API_BASE}/${token}`);
  }

  submitIntake(token: string, form: ReferralIntakeForm): Observable<ReferralIntakeSubmitResponse> {
    return this.http.post<ReferralIntakeSubmitResponse>(`${API_BASE}/${token}/submit`, form);
  }
}
