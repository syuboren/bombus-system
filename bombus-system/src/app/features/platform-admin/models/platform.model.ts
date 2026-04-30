/**
 * 平台管理模組 - 資料模型
 */

export type TenantStatus = 'active' | 'suspended' | 'deleted';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan_id: string;
  plan_name?: string;
  logo_url?: string;
  industry?: string;
  feature_overrides?: string;
  feature_overrides_note?: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export interface TenantListResponse {
  data: Tenant[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  plan_id: string;
  logo_url?: string;
  industry?: string;
  admin_email: string;
  admin_name: string;
  admin_password: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  max_users: number;
  max_storage_gb: number;
  features: string;
  price_monthly: number;
  price_yearly: number;
  is_active: number;
  created_at: string;
}

export interface TenantAdmin {
  id: string;
  email: string;
  name: string;
  status: string;
  role_names?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  user_id: string;
  action: string;
  resource: string;
  details: Record<string, unknown> | string | null;
  ip_address: string;
  created_at: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// D-16 產業分類與部門範本（industry-classification + department-template-import）
// ============================================================

export type CompanySize = 'micro' | 'small' | 'medium' | 'large';

export interface Industry {
  code: string;
  name: string;
  display_order: number;
  is_active: number;
  created_at?: string;
  tenant_count?: number;
  assignment_count?: number;
}

export interface CreateIndustryRequest {
  code: string;
  name: string;
  display_order?: number;
}

export interface UpdateIndustryRequest {
  name?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface DepartmentTemplate {
  id: string;
  name: string;
  value: string[];
  is_common: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateDepartmentTemplateRequest {
  name: string;
  value?: string[];
  is_common?: boolean;
}

export interface UpdateDepartmentTemplateRequest {
  name?: string;
  value?: string[];
  is_common?: boolean;
}

export interface IndustryDeptAssignment {
  id: string;
  industry_code: string;
  dept_template_id: string;
  sizes_json: CompanySize[];
  display_order: number;
  template_name?: string;
  template_value?: string[];
  is_common?: number | boolean;
}

export interface CreateAssignmentRequest {
  industry_code: string;
  dept_template_id: string;
  sizes_json: CompanySize[];
  display_order?: number;
}

export interface UpdateAssignmentRequest {
  sizes_json?: CompanySize[];
  display_order?: number;
}
