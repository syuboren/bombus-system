// ===============================================================
// Auth Models - 認證相關介面定義（Multi-Tenant SaaS）
// ===============================================================

/**
 * 登入請求（multi-tenant: email + password + tenant_slug）
 */
export interface LoginRequest {
  email: string;
  password: string;
  tenant_slug: string;
  rememberMe?: boolean;
  /** @deprecated 向後相容，6.2 移除 */
  username?: string;
}

/**
 * 後端 Token 回應
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: string;
  user: User;
  must_change_password?: boolean;
}

/**
 * Token 刷新回應
 */
export interface RefreshTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  user?: User;
}

/**
 * 登入回應（前端包裝）
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

/**
 * 使用者資訊（含多租戶 + RBAC 欄位）
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: string[];
  scope: UserScope | null;
  permissions?: string[];
  tenant_id?: string;
  isPlatformAdmin?: boolean;
  enabled_features?: string[];
  /** @deprecated 向後相容，6.2 移除 */
  username?: string;
  /** @deprecated 向後相容，6.2 移除 */
  role?: string;
  /** @deprecated 向後相容，6.2 移除 */
  department?: string;
  /** @deprecated 向後相容，6.2 移除 */
  lastLogin?: Date;
  must_change_password?: boolean;
  tenant_slug?: string;
  subsidiary_id?: string | null;
  employee_id?: string | null;
}

/**
 * 使用者功能權限（合併後）
 * feature_id 在 API 回應中存在，存入 Map 後以 key 取代
 */
export interface UserFeaturePerm {
  feature_id?: string;
  action_level: 'none' | 'view' | 'edit';
  edit_scope: 'self' | 'department' | 'company' | null;
  view_scope: 'self' | 'department' | 'company' | null;
}

/**
 * 使用者角色作用範圍
 */
export interface UserScope {
  type: 'global' | 'subsidiary' | 'department';
  id: string | null;
}

/**
 * JWT Token Payload（解碼後）
 */
export interface JwtPayload {
  sub: string;
  tid?: string;
  roles?: string[];
  scope?: UserScope;
  isPlatformAdmin?: boolean;
  exp: number;
  iat: number;
}

/**
 * 忘記密碼請求
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * 忘記密碼回應
 */
export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

/**
 * 記住登入資訊
 */
export interface RememberedCredentials {
  email: string;
  tenant_slug?: string;
  rememberMe: boolean;
  /** @deprecated 向後相容，6.2 移除 */
  username?: string;
}

/**
 * 平台管理員登入請求
 */
export interface PlatformLoginRequest {
  email: string;
  password: string;
}

/**
 * 變更密碼請求
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  tenant_slug: string;
}

/**
 * 變更密碼回應
 */
export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}
