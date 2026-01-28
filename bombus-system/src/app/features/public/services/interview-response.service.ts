import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Public Interview Response Service
 * 無需驗證的 API 服務，供候選人透過專屬連結回覆面試邀約
 */
@Injectable({
    providedIn: 'root'
})
export class InterviewResponseService {
    private http = inject(HttpClient);
    private apiUrl = '/api/recruitment';

    /**
     * 取得邀約詳情（公開 API）
     * @param token 專屬回覆連結 Token
     */
    getInvitation(token: string): Observable<{
        invitationId: string;
        candidateName: string;
        jobTitle: string;
        message: string;
        proposedSlots: string[];
        replyDeadline: string;
        status: string;
    }> {
        return this.http.get<any>(`${this.apiUrl}/invitations/${token}`);
    }

    /**
     * 候選人回覆邀約（公開 API）
     * @param token 專屬回覆連結 Token
     * @param response 回覆結果 'accepted' | 'declined' | 'reschedule'
     * @param selectedSlots 候選人勾選的時段
     * @param rescheduleNote 改期備註（候選人方便的時間）
     */
    respond(token: string, response: 'accepted' | 'declined' | 'reschedule', selectedSlots?: string[], rescheduleNote?: string): Observable<{
        success: boolean;
        message: string;
        response: string;
        selectedSlots: string[];
        rescheduleNote?: string;
    }> {
        return this.http.post<any>(`${this.apiUrl}/invitations/${token}/respond`, {
            response,
            selectedSlots,
            rescheduleNote
        });
    }

    // ============================================================
    // Offer Response APIs (錄用通知回覆)
    // ============================================================

    /**
     * 取得錄用通知詳情（公開 API）
     * @param token 專屬回覆連結 Token
     */
    getOffer(token: string): Observable<{
        offerId: string;
        candidateName: string;
        jobTitle: string;
        reason: string;
        replyDeadline: string;
        decidedAt: string;
    }> {
        return this.http.get<any>(`${this.apiUrl}/offers/${token}`);
    }

    /**
     * 候選人回覆錄用通知（公開 API）
     * @param token 專屬回覆連結 Token
     * @param response 回覆結果 'accepted' | 'declined'
     */
    respondToOffer(token: string, response: 'accepted' | 'declined'): Observable<{
        success: boolean;
        message: string;
        response: string;
        respondedAt: string;
    }> {
        return this.http.post<any>(`${this.apiUrl}/offers/${token}/respond`, {
            response
        });
    }
}
