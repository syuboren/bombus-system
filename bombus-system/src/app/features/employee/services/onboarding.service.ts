/**
 * Onboarding Service
 * 入職簽署系統 API 服務
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
    Template,
    TemplateListItem,
    MappingConfig,
    Submission,
    SignSchema,
    CreateSignLinkResponse
} from '../models/onboarding.model';

@Injectable({
    providedIn: 'root'
})
export class OnboardingService {
    private http = inject(HttpClient);
    private baseUrl = 'http://localhost:3001/api/onboarding';

    // ==================== Templates API ====================

    /**
     * 取得所有模板清單
     */
    getTemplates(): Observable<TemplateListItem[]> {
        return this.http.get<TemplateListItem[]>(`${this.baseUrl}/templates`);
    }

    /**
     * 取得單一模板詳情
     */
    getTemplate(id: string): Observable<Template> {
        return this.http.get<Template>(`${this.baseUrl}/templates/${id}`);
    }

    /**
     * 新增模板
     */
    createTemplate(data: {
        name: string;
        pdf_base64?: string;
        mapping_config?: MappingConfig;
    }): Observable<Template> {
        return this.http.post<Template>(`${this.baseUrl}/templates`, data);
    }

    /**
     * 更新模板
     */
    updateTemplate(id: string, data: {
        name?: string;
        pdf_base64?: string;
        mapping_config?: MappingConfig;
        is_active?: boolean;
    }): Observable<Template> {
        return this.http.put<Template>(`${this.baseUrl}/templates/${id}`, data);
    }

    /**
     * 刪除模板
     */
    deleteTemplate(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(`${this.baseUrl}/templates/${id}`);
    }

    /**
     * 發布新版本 (上傳新 PDF + 可選繼承設定)
     */
    createNewVersion(id: string, data: {
        pdf_base64: string;
        inherit_fields: boolean;
        mapping_config?: any;
    }): Observable<{ message: string; version: number; template: Template }> {
        return this.http.post<{ message: string; version: number; template: Template }>(
            `${this.baseUrl}/templates/${id}/new-version`,
            data
        );
    }

    // ==================== Submissions API ====================

    /**
     * 取得填寫 Schema (員工端)
     */
    getSignSchema(token: string): Observable<SignSchema> {
        return this.http.get<SignSchema>(`${this.baseUrl}/sign/${token}`);
    }

    /**
     * 提交簽署資料 (員工端)
     */
    submitSignature(token: string, data: {
        form_data: Record<string, any>;
        signature_base64?: string;
    }): Observable<{ message: string; status: string }> {
        return this.http.post<{ message: string; status: string }>(
            `${this.baseUrl}/sign/${token}/submit`,
            data
        );
    }

    /**
     * 建立簽署連結 (HR 端)
     */
    createSignLink(data: {
        template_id: string;
        employee_name?: string;
        employee_email?: string;
    }): Observable<CreateSignLinkResponse> {
        return this.http.post<CreateSignLinkResponse>(
            `${this.baseUrl}/sign/create`,
            data
        );
    }

    /**
     * 取得模板的所有提交記錄 (HR 端)
     */
    getSubmissions(templateId: string): Observable<Submission[]> {
        return this.http.get<Submission[]>(
            `${this.baseUrl}/sign/submissions/${templateId}`
        );
    }

    // ==================== Draft API ====================

    /**
     * 建立或更新草稿
     */
    saveDraft(id: string, data: {
        pdf_base64?: string;
        mapping_config?: any;
        inherit_fields?: boolean;
    }): Observable<{ message: string; has_draft: boolean }> {
        return this.http.post<{ message: string; has_draft: boolean }>(
            `${this.baseUrl}/templates/${id}/draft`,
            data
        );
    }

    /**
     * 取得草稿內容
     */
    getDraft(id: string): Observable<{
        id: string;
        name: string;
        current_version: number;
        draft_pdf_base64: string | null;
        draft_mapping_config: any;
    }> {
        return this.http.get<any>(`${this.baseUrl}/templates/${id}/draft`);
    }

    /**
     * 發布草稿為正式版本
     */
    publishDraft(id: string): Observable<{ message: string; version: number }> {
        return this.http.post<{ message: string; version: number }>(
            `${this.baseUrl}/templates/${id}/publish-draft`,
            {}
        );
    }

    /**
     * 刪除草稿
     */
    deleteDraft(id: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(
            `${this.baseUrl}/templates/${id}/draft`
        );
    }
}
