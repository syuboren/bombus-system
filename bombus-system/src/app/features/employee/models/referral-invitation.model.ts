export type ReferralInvitationStatus = 'pending' | 'submitted' | 'expired' | 'cancelled';

export interface ReferralInvitationListItem {
  id: string;
  job_id: string;
  candidate_email: string;
  status: ReferralInvitationStatus;
  custom_message: string | null;
  expires_at: string;
  submitted_at: string | null;
  created_at: string;
  submitted_candidate_id: string | null;
  cancel_reason: string | null;
  recommender_id: string;
  recommender_employee_no: string;
  recommender_name: string;
  recommender_department: string | null;
  /** 僅 pending / expired 會帶 */
  referralLink?: string;
}

export interface CreateReferralInvitationRequest {
  jobId: string;
  recommenderEmployeeNo: string;
  candidateEmail: string;
  customMessage?: string;
}

export interface CreateReferralInvitationResponse {
  invitationId: string;
  referralLink: string;
  expiresAt: string;
}

export interface RenewReferralInvitationResponse {
  success: true;
  expiresAt: string;
  referralLink: string;
}

export interface RecommenderPreview {
  id: string;
  name: string;
  department: string | null;
  position: string | null;
  company: string | null;
}
