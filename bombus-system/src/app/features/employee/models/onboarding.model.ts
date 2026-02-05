/**
 * Onboarding Models
 * 入職簽署系統資料模型
 */

export interface FieldPlacement {
    page_number: number;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface TemplateField {
    id: string;
    key: string;
    label: string;
    type: 'text' | 'date' | 'signature' | 'checkbox';
    is_required: boolean;
    font_size: number;
    placements: FieldPlacement[];
}

export interface MappingConfig {
    fields: TemplateField[];
}

export interface Template {
    id: string;
    name: string;
    version: number;
    is_active: boolean;
    is_public: boolean;
    is_required: boolean;
    description?: string;
    pdf_base64?: string;
    mapping_config?: MappingConfig;
    created_at: string;
    updated_at?: string;
}

export interface TemplateListItem {
    id: string;
    name: string;
    version: number;
    is_active: boolean;
    is_public?: boolean;
    is_required?: boolean;
    description?: string;
    has_draft?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface Submission {
    id: string;
    template_id: string;
    token: string;
    employee_name?: string;
    employee_email?: string;
    status: 'DRAFT' | 'SIGNED' | 'COMPLETED';
    template_version?: number;
    form_data?: Record<string, any>;
    signature_base64?: string;
    signed_at?: string;
    ip_address?: string;
    // Expanded fields
    template_name?: string;
    approval_status?: string;
    approver_id?: string;
    approval_note?: string;
    approved_at?: string;
    created_at: string;
}

export interface SignSchema {
    template_name: string;
    status: string;
    approval_status?: string;
    approval_note?: string;
    steps: SignStep[];
}

export interface SignStep {
    title: string;
    fields: SignField[];
}

export interface SignField {
    key: string;
    label: string;
    type: 'text' | 'date' | 'signature' | 'checkbox';
    required: boolean;
}

export interface FormField {
    key: string;
    label: string;
    type: 'text' | 'date' | 'signature' | 'checkbox' | string;
    required: boolean;
    font_size?: number;
    group?: string;
    placements: FieldPlacement[];
}

export interface CreateSignLinkResponse {
    id: string;
    token: string;
    sign_url: string;
}

// ==================== 員工入職資料上傳 ====================

/**
 * 上傳文件類型
 */
export type UploadDocumentType =
    | 'id_card'           // 身分證件
    | 'bank_account'      // 銀行帳戶
    | 'health_report'     // 體檢報告
    | 'photo'             // 大頭照
    | 'education_cert'    // 學經歷證明
    | 'other';            // 其他文件

/**
 * 上傳文件狀態
 */
export type UploadDocumentStatus = 'pending' | 'uploaded' | 'approved' | 'rejected';

/**
 * 上傳文件項目
 */
export interface UploadDocument {
    id: string;
    employee_id: string;
    type: UploadDocumentType;
    label: string;              // 文件類型標籤
    description?: string;       // 文件說明
    customName?: string;        // 其他文件的自訂名稱
    fileName?: string;          // 已上傳的檔案名稱
    fileUrl?: string;           // 檔案存取路徑
    fileSize?: number;          // 檔案大小 (bytes)
    mimeType?: string;          // 檔案類型
    uploadedAt?: string;        // 上傳時間
    status: UploadDocumentStatus;
    rejectReason?: string;      // 退回原因
    created_at?: string;
    updated_at?: string;
}

/**
 * 固定文件類型定義
 */
export interface FixedDocumentDefinition {
    type: UploadDocumentType;
    label: string;
    description: string;
    acceptTypes: string;        // 接受的檔案類型，如 'image/*,.pdf'
    maxSize: number;            // 最大檔案大小 (bytes)
    required: boolean;
}

/**
 * 預設的固定文件類型列表
 */
export const FIXED_DOCUMENT_TYPES: FixedDocumentDefinition[] = [
    {
        type: 'id_card',
        label: '身分證件',
        description: '繳驗有關證件及國民身分證',
        acceptTypes: 'image/*,.pdf',
        maxSize: 5 * 1024 * 1024, // 5MB
        required: true
    },
    {
        type: 'bank_account',
        label: '銀行帳戶',
        description: '薪資轉帳指定銀行存摺帳戶封面影本',
        acceptTypes: 'image/*,.pdf',
        maxSize: 5 * 1024 * 1024,
        required: true
    },
    {
        type: 'health_report',
        label: '體檢報告',
        description: '因業務所需之體格檢查報告',
        acceptTypes: 'image/*,.pdf',
        maxSize: 10 * 1024 * 1024, // 10MB
        required: true
    },
    {
        type: 'photo',
        label: '大頭照',
        description: '本人最近一吋半身正面脫帽照片',
        acceptTypes: 'image/*',
        maxSize: 2 * 1024 * 1024, // 2MB
        required: true
    },
    {
        type: 'education_cert',
        label: '學經歷證明',
        description: '最高學歷及經歷之證明文件',
        acceptTypes: 'image/*,.pdf',
        maxSize: 10 * 1024 * 1024,
        required: true
    }
];

/**
 * 上傳進度
 */
export interface UploadProgress {
    total: number;
    uploaded: number;
    pending: number;
    approved: number;
    rejected: number;
    percentage: number;
}
