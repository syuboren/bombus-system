import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  OrgUnit,
  Role,
  Permission,
  TenantUser,
  UserRole,
  AssignRoleRequest
} from '../models/tenant-admin.model';
import { AuditLogListResponse } from '../../platform-admin/models/platform.model';

@Injectable({ providedIn: 'root' })
export class TenantAdminService {
  private http = inject(HttpClient);

  // ============================================================
  // 組織架構
  // ============================================================

  getOrgUnits(): Observable<OrgUnit[]> {
    return this.http.get<OrgUnit[]>('/api/tenant-admin/org-units');
  }

  createOrgUnit(data: Partial<OrgUnit>): Observable<OrgUnit> {
    return this.http.post<OrgUnit>('/api/tenant-admin/org-units', data);
  }

  updateOrgUnit(id: string, data: Partial<OrgUnit>): Observable<OrgUnit> {
    return this.http.put<OrgUnit>(`/api/tenant-admin/org-units/${id}`, data);
  }

  deleteOrgUnit(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`/api/tenant-admin/org-units/${id}`);
  }

  // ============================================================
  // 角色管理
  // ============================================================

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>('/api/tenant-admin/roles');
  }

  createRole(data: Partial<Role>): Observable<Role> {
    return this.http.post<Role>('/api/tenant-admin/roles', data);
  }

  updateRole(id: string, data: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(`/api/tenant-admin/roles/${id}`, data);
  }

  deleteRole(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`/api/tenant-admin/roles/${id}`);
  }

  // ============================================================
  // 權限定義
  // ============================================================

  getPermissions(): Observable<Permission[]> {
    return this.http.get<{ permissions: Permission[]; grouped: Record<string, Permission[]> }>('/api/tenant-admin/permissions').pipe(
      map(res => res.permissions)
    );
  }

  // ============================================================
  // 使用者管理
  // ============================================================

  getUsers(): Observable<TenantUser[]> {
    return this.http.get<{ data: TenantUser[]; pagination: unknown }>('/api/tenant-admin/users').pipe(
      map(res => res.data)
    );
  }

  createUser(data: { email: string; name: string; password: string; employee_id?: string }): Observable<TenantUser> {
    return this.http.post<TenantUser>('/api/tenant-admin/users', data);
  }

  updateUser(id: string, data: Partial<TenantUser>): Observable<TenantUser> {
    return this.http.put<TenantUser>(`/api/tenant-admin/users/${id}`, data);
  }

  // ============================================================
  // 角色指派
  // ============================================================

  getUserRoles(userId: string): Observable<UserRole[]> {
    return this.http.get<UserRole[]>(`/api/tenant-admin/user-roles/${userId}`);
  }

  assignRole(data: AssignRoleRequest): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>('/api/tenant-admin/user-roles', data);
  }

  revokeRole(data: { user_id: string; role_id: string; scope_type?: string; scope_id?: string }): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>('/api/tenant-admin/user-roles', { body: data });
  }

  // ============================================================
  // 審計日誌
  // ============================================================

  getAuditLogs(params?: {
    page?: number;
    limit?: number;
    action?: string;
    start_date?: string;
    end_date?: string;
  }): Observable<AuditLogListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.action) httpParams = httpParams.set('action', params.action);
    if (params?.start_date) httpParams = httpParams.set('start_date', params.start_date);
    if (params?.end_date) httpParams = httpParams.set('end_date', params.end_date);

    return this.http.get<AuditLogListResponse>('/api/audit/logs', { params: httpParams });
  }
}
