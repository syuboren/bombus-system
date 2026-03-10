/**
 * Onboarding Service
 * 入職簽署系統 API 服務
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrgUnit } from '../../../core/models/org-unit.model';
import {
    Template,
    TemplateListItem,
    MappingConfig,
    Submission,
    SignSchema,
    CreateSignLinkResponse,
    UploadDocument,
    UploadDocumentType,
    UploadProgress
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
        employee_id?: string;
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

    // ==================== Employee API ====================

    /**
     * 取得員工可見的模版
     */
    getEmployeeTemplates(): Observable<any[]> {
        return this.http.get<any[]>(`http://localhost:3001/api/employee/templates`);
    }

    /**
     * 取得員工進度摘要
     */
    getEmployeeProgress(employeeId: string): Observable<any> {
        return this.http.get<any>(`http://localhost:3001/api/employee/progress`, {
            params: { employee_id: employeeId }
        });
    }

    /**
     * 取得員工提交歷史
     */
    getEmployeeSubmissions(employeeId: string): Observable<Submission[]> {
        return this.http.get<Submission[]>(`http://localhost:3001/api/employee/submissions`, {
            params: { employee_id: employeeId }
        });
    }

    // ==================== Manager API ====================

    /**
     * 取得待審核列表
     */
    getPendingApprovals(status?: string): Observable<Submission[]> {
        const params: any = {};
        if (status) params.status = status;
        return this.http.get<Submission[]>(`http://localhost:3001/api/manager/approvals`, { params });
    }

    /**
     * 取得單一提交詳情 (含 PDF 與 Mapping 用於預覽)
     */
    getSubmissionDetail(id: string): Observable<any> {
        return this.http.get<any>(`http://localhost:3001/api/manager/approvals/${id}`);
    }

    /**
     * 核准提交
     */
    approveSubmission(id: string, data: { approver_id: string; approval_note?: string }): Observable<any> {
        return this.http.post(`http://localhost:3001/api/manager/approvals/${id}/approve`, data);
    }

    /**
     * 退回提交
     */
    rejectSubmission(id: string, data: { approver_id: string; approval_note: string }): Observable<any> {
        return this.http.post(`http://localhost:3001/api/manager/approvals/${id}/reject`, data);
    }

    /**
     * 取得簽核統計
     */
    getApprovalStats(): Observable<any> {
        return this.http.get<any>(`http://localhost:3001/api/manager/approvals/stats/summary`);
    }

    // ==================== Employee Document Upload API ====================

    /**
     * 取得員工已上傳的文件列表
     */
    getUploadedDocuments(employeeId: string): Observable<UploadDocument[]> {
        return this.http.get<UploadDocument[]>(`http://localhost:3001/api/employee/documents`, {
            params: { employee_id: employeeId }
        });
    }

    /**
     * 取得員工文件上傳進度
     */
    getUploadProgress(employeeId: string): Observable<UploadProgress> {
        return this.http.get<UploadProgress>(`http://localhost:3001/api/employee/documents/progress`, {
            params: { employee_id: employeeId }
        });
    }

    /**
     * 上傳文件
     * @param employeeId 員工 ID
     * @param type 文件類型
     * @param file 檔案
     * @param customName 自訂文件名稱（僅用於 'other' 類型）
     */
    uploadDocument(
        employeeId: string,
        type: UploadDocumentType,
        file: File,
        customName?: string
    ): Observable<UploadDocument> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('employee_id', employeeId);
        formData.append('type', type);
        if (customName) {
            formData.append('custom_name', customName);
        }

        return this.http.post<UploadDocument>(
            `http://localhost:3001/api/employee/documents`,
            formData
        );
    }

    /**
     * 刪除文件
     */
    deleteUploadedDocument(documentId: string): Observable<{ message: string }> {
        return this.http.delete<{ message: string }>(
            `http://localhost:3001/api/employee/documents/${documentId}`
        );
    }

    /**
     * 重新上傳文件（覆蓋原有檔案）
     */
    reuploadDocument(
        documentId: string,
        file: File
    ): Observable<UploadDocument> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.put<UploadDocument>(
            `http://localhost:3001/api/employee/documents/${documentId}`,
            formData
        );
    }

    /**
     * 取得文件下載連結
     */
    getDocumentDownloadUrl(documentId: string): string {
        return `http://localhost:3001/api/employee/documents/${documentId}/download`;
    }

    // ==================== HR Onboarding API (候選人轉員工) ====================

    private hrOnboardingUrl = 'http://localhost:3001/api/hr/onboarding';

    /**
     * 取得待入職候選人列表
     */
    getPendingConversions(): Observable<PendingCandidate[]> {
        return this.http.get<PendingCandidate[]>(`${this.hrOnboardingUrl}/pending-conversions`);
    }

    /**
     * 轉換候選人為員工
     */
    convertCandidate(data: ConvertCandidateRequest): Observable<ConvertCandidateResponse> {
        return this.http.post<ConvertCandidateResponse>(
            `${this.hrOnboardingUrl}/convert-candidate`,
            data
        );
    }

    /**
     * 取得入職中員工列表
     */
    getInProgressEmployees(): Observable<InProgressEmployee[]> {
        return this.http.get<InProgressEmployee[]>(`${this.hrOnboardingUrl}/in-progress`);
    }

    /**
     * 取得單一員工入職進度詳情
     */
    getOnboardingProgress(employeeId: string): Observable<OnboardingProgressDetail> {
        return this.http.get<OnboardingProgressDetail>(
            `${this.hrOnboardingUrl}/progress/${employeeId}`
        );
    }

    /**
     * 預覽下一個員工編號
     */
    getNextEmployeeNo(): Observable<{ employee_no: string }> {
        return this.http.get<{ employee_no: string }>(`${this.hrOnboardingUrl}/next-employee-no`);
    }

    /**
     * 取得部門列表
     */
    getDepartments(): Observable<DepartmentOption[]> {
        return this.http.get<DepartmentOption[]>(`${this.hrOnboardingUrl}/departments`);
    }

    /**
     * 取得職等列表
     */
    getGrades(): Observable<GradeLevel[]> {
        return this.http.get<GradeLevel[]>(`${this.hrOnboardingUrl}/grades`);
    }

    /**
     * 取得職級薪資列表
     */
    getSalaryLevels(grade?: number): Observable<SalaryLevel[]> {
        const params = grade ? `?grade=${grade}` : '';
        return this.http.get<SalaryLevel[]>(`${this.hrOnboardingUrl}/salary-levels${params}`);
    }

    /**
     * 取得職位列表
     */
    getPositions(department?: string, grade?: number, track?: string): Observable<PositionOption[]> {
        const params = new URLSearchParams();
        if (department) params.append('department', department);
        if (grade) params.append('grade', grade.toString());
        if (track) params.append('track', track);
        const queryString = params.toString();
        return this.http.get<PositionOption[]>(`${this.hrOnboardingUrl}/positions${queryString ? '?' + queryString : ''}`);
    }

    /**
     * 取得可選主管列表
     */
    getManagers(): Observable<ManagerOption[]> {
        return this.http.get<ManagerOption[]>(`${this.hrOnboardingUrl}/managers`);
    }

    // getOrgUnits 已移除，請使用 OrgUnitService.loadOrgUnits()
}

// ==================== HR Onboarding Interfaces ====================

export interface PendingCandidate {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    position: string;
    original_department?: string;
    original_grade?: number;
    original_position_name?: string;
    status: string;
    stage: string;
    offer_response: string;
    offer_accepted_at: string;
    days_since_accepted: number;
}

export interface ConvertCandidateRequest {
    candidate_id: string;
    department: string;
    job_title?: string;  // 職務（具體工作名稱，如「財務出納」）
    position: string;    // 職位（標準職位，如「會計」）
    level?: string;
    grade?: string;
    role?: 'manager' | 'employee';  // 角色：主管或員工
    manager_id?: string;
    hire_date: string;
    probation_months?: number;
    contract_type?: string;
    work_location?: string;
    org_unit_id?: string;
}

export interface ConvertCandidateResponse {
    success: boolean;
    data: {
        employee_id: string;
        employee_no: string;
        name: string;
        email: string;
        department: string;
        position: string;
        hire_date: string;
        probation_end_date: string;
        onboarding_status: string;
        org_unit_id?: string;
        user_account?: {
            user_id: string;
            email: string;
            must_change_password?: boolean;
            default_role?: string | null;
            already_existed?: boolean;
            error?: string;
        };
        onboarding_links: OnboardingLink[];
    };
}

/** @deprecated 請改用 core/models/org-unit.model.ts 的 OrgUnit */
export type OrgUnitOption = OrgUnit;

export interface OnboardingLink {
    template_id: string;
    template_name: string;
    token: string;
    url: string;
}

export interface InProgressEmployee {
    id: string;
    employee_no: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    department: string;
    position: string;
    hire_date: string;
    probation_end_date: string;
    probation_months: number;
    onboarding_status: string;
    converted_at: string;
    candidate_id: string;
    progress: {
        overall: number;
        templates: {
            total: number;
            signed: number;
            approved: number;
        };
        documents: {
            total: number;
            uploaded: number;
        };
    };
}

export interface OnboardingProgressDetail {
    employee: {
        id: string;
        employee_no: string;
        name: string;
        email: string;
        department: string;
        position: string;
        hire_date: string;
        probation_end_date: string;
        onboarding_status: string;
        candidate_id: string;
    };
    progress: {
        overall: number;
        templates: {
            total: number;
            signed: number;
            approved: number;
            items: TemplateProgressItem[];
        };
        documents: {
            total: number;
            uploaded: number;
            items: DocumentProgressItem[];
            other: any[];
        };
    };
}

export interface TemplateProgressItem {
    template_id: string;
    template_name: string;
    is_required: boolean;
    token: string;
    status: string;
    approval_status: string;
    signed_at?: string;
    approved_at?: string;
    url: string;
}

export interface DocumentProgressItem {
    type: string;
    label: string;
    required: boolean;
    status: string;
    file_name?: string;
    uploaded_at?: string;
}

export interface ManagerOption {
    id: string;
    name: string;
    department: string;
    position: string;
}

export interface DepartmentOption {
    id?: string;
    name: string;
    code?: string;
    sort_order?: number;
}

export interface GradeLevel {
    id: string;
    grade: number;
    code_range: string;
    title_management: string;
    title_professional: string;
    education_requirement: string;
    responsibility_description: string;
}

export interface SalaryLevel {
    id: string;
    grade: number;
    code: string;
    salary: number;
    sort_order: number;
    title_management?: string;
    title_professional?: string;
}

export interface PositionOption {
    id: string;
    department: string;
    grade: number;
    title: string;
    track: 'management' | 'professional' | 'both';
    grade_title_management?: string;
    grade_title_professional?: string;
}
