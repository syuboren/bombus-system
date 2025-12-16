// ===============================================================
// Auth Models - 認證相關介面定義
// ===============================================================

/**
 * 登入請求
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe: boolean;
}

/**
 * 登入回應
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
}

/**
 * 使用者資訊
 */
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  department: string;
  lastLogin?: Date;
}

/**
 * 使用者角色
 */
export type UserRole = 'admin' | 'manager' | 'employee';

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
  username: string;
  rememberMe: boolean;
}

