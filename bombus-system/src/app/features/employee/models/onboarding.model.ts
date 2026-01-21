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
