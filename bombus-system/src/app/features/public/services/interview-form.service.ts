import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  InterviewFormResponse,
  CandidateFormData,
  InterviewFormStatus
} from '../../employee/models/candidate.model';

/**
 * 候選人面試表單服務（Public 模組）
 * 處理無需驗證的公開 API
 */
@Injectable({
  providedIn: 'root'
})
export class InterviewFormService {
  private http = inject(HttpClient);
  private baseUrl = '/api/recruitment';

  /**
   * 取得表單資訊（透過 Token）
   */
  getFormByToken(token: string): Observable<InterviewFormResponse> {
    return this.http.get<InterviewFormResponse>(`${this.baseUrl}/interview-form/${token}`);
  }

  /**
   * 開始填寫表單（記錄開始時間）
   */
  startForm(token: string): Observable<StartFormResponse> {
    return this.http.post<StartFormResponse>(`${this.baseUrl}/interview-form/${token}/start`, {});
  }

  /**
   * 暫存表單資料
   */
  saveFormData(token: string, formData: Partial<CandidateFormData>, currentStep?: number): Observable<SaveFormResponse> {
    return this.http.patch<SaveFormResponse>(`${this.baseUrl}/interview-form/${token}/save`, {
      formData,
      currentStep
    });
  }

  /**
   * 送出表單
   */
  submitForm(token: string, formData?: CandidateFormData): Observable<SubmitFormResponse> {
    return this.http.post<SubmitFormResponse>(`${this.baseUrl}/interview-form/${token}/submit`, {
      formData
    });
  }

  /**
   * 取得表單狀態（用於倒數計時同步）
   */
  getFormStatus(token: string): Observable<FormStatusCheckResponse> {
    return this.http.get<FormStatusCheckResponse>(`${this.baseUrl}/interview-form/${token}/status`);
  }
}

/**
 * 開始填寫回應
 */
export interface StartFormResponse {
  success: boolean;
  alreadyStarted: boolean;
  startedAt: string;
  remainingSeconds: number;
  currentStep: number;
}

/**
 * 暫存回應
 */
export interface SaveFormResponse {
  success: boolean;
  savedAt: string;
  currentStep: number;
}

/**
 * 送出回應
 */
export interface SubmitFormResponse {
  success: boolean;
  status: InterviewFormStatus;
  submittedAt: string;
  message: string;
}

/**
 * 狀態檢查回應
 */
export interface FormStatusCheckResponse {
  status: InterviewFormStatus;
  remainingSeconds: number;
  isExpired: boolean;
  startedAt?: string;
  submittedAt?: string;
  lockedAt?: string;
  currentStep: number;
}
