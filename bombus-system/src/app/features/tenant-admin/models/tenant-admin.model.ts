/**
 * 租戶管理設定模組 - 資料模型
 */

// ============================================================
// 組織架構
// ============================================================
export type OrgUnitType = 'group' | 'subsidiary' | 'department';

export interface OrgUnit {
  id: string;
  name: string;
  type: OrgUnitType;
  parent_id: string | null;
  level: number;
  created_at: string;
  children?: OrgUnit[];
}

// ============================================================
// 角色與權限
// ============================================================
export type ScopeType = 'global' | 'subsidiary' | 'department';

export interface Role {
  id: string;
  name: string;
  description: string;
  scope_type: ScopeType;
  is_system: number;
  created_at: string;
  permissions?: RolePermission[];
  user_count?: number;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

export interface RolePermission {
  permission_id: string;
  resource: string;
  action: string;
}

// ============================================================
// 使用者
// ============================================================
export interface TenantUser {
  id: string;
  email: string;
  name: string;
  employee_id: string | null;
  is_active: number;
  created_at: string;
  roles?: UserRole[];
}

export interface UserRole {
  id: string;
  role_id: string;
  role_name: string;
  scope_type: ScopeType;
  scope_id: string | null;
  scope_name?: string;
}

export interface AssignRoleRequest {
  user_id: string;
  role_id: string;
  scope_type: ScopeType;
  scope_id?: string;
}

// ============================================================
// Feature-Based Permission（功能權限模型）
// ============================================================
export type ActionLevel = 'none' | 'view' | 'edit';
export type PermScope = 'self' | 'department' | 'company';
export type FeatureModule = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'SYS';

export interface Feature {
  id: string;
  module: FeatureModule;
  name: string;
  sort_order: number;
}

export interface RoleFeaturePerm {
  feature_id: string;
  feature_name: string;
  module: FeatureModule;
  sort_order: number;
  action_level: ActionLevel;
  edit_scope: PermScope | null;
  view_scope: PermScope | null;
}

export interface FeaturePermPayload {
  feature_id: string;
  action_level: ActionLevel;
  edit_scope: PermScope | null;
  view_scope: PermScope | null;
}

export interface UserFeaturePerm {
  feature_id: string;
  action_level: ActionLevel;
  edit_scope: PermScope | null;
  view_scope: PermScope | null;
}

export interface RoleUser {
  id: string;
  name: string;
  email: string;
  scope_name?: string;
}
