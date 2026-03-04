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
  details: string;
  ip_address: string;
  created_at: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}
