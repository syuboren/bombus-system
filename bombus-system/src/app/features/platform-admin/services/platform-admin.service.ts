import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Tenant,
  TenantListResponse,
  CreateTenantRequest,
  TenantAdmin,
  SubscriptionPlan,
  AuditLogListResponse,
  Industry,
  CreateIndustryRequest,
  UpdateIndustryRequest,
  DepartmentTemplate,
  CreateDepartmentTemplateRequest,
  UpdateDepartmentTemplateRequest,
  IndustryDeptAssignment,
  CreateAssignmentRequest,
  UpdateAssignmentRequest
} from '../models/platform.model';

@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private http = inject(HttpClient);

  // ============================================================
  // 租戶管理
  // ============================================================

  getTenants(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Observable<TenantListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.status) httpParams = httpParams.set('status', params.status);

    return this.http.get<TenantListResponse>('/api/platform/tenants', { params: httpParams });
  }

  getTenantById(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(`/api/platform/tenants/${id}`);
  }

  createTenant(data: CreateTenantRequest): Observable<Tenant> {
    return this.http.post<Tenant>('/api/platform/tenants', data);
  }

  updateTenant(id: string, updates: Partial<Tenant>): Observable<Tenant> {
    return this.http.put<Tenant>(`/api/platform/tenants/${id}`, updates);
  }

  softDeleteTenant(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`/api/platform/tenants/${id}`);
  }

  purgeTenant(id: string, confirm: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(
      `/api/platform/tenants/${id}/purge`,
      { body: { confirm } }
    );
  }

  uploadTenantLogo(file: File): Observable<{ success: boolean; url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ success: boolean; url: string }>('/api/platform/upload-logo', formData);
  }

  getTenantAdmins(tenantId: string): Observable<TenantAdmin[]> {
    return this.http.get<TenantAdmin[]>(`/api/platform/tenants/${tenantId}/admins`);
  }

  updateTenantAdmin(tenantId: string, userId: string, updates: {
    name?: string;
    email?: string;
    password?: string;
  }): Observable<TenantAdmin> {
    return this.http.put<TenantAdmin>(`/api/platform/tenants/${tenantId}/admins/${userId}`, updates);
  }

  // ============================================================
  // 方案管理
  // ============================================================

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get<SubscriptionPlan[]>('/api/platform/plans');
  }

  createPlan(plan: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.http.post<SubscriptionPlan>('/api/platform/plans', plan);
  }

  updatePlan(id: string, updates: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    return this.http.put<SubscriptionPlan>(`/api/platform/plans/${id}`, updates);
  }

  // ============================================================
  // 審計日誌
  // ============================================================

  getAuditLogs(params?: {
    page?: number;
    limit?: number;
    tenant_id?: string;
    action?: string;
    start_date?: string;
    end_date?: string;
  }): Observable<AuditLogListResponse> {
    let httpParams = new HttpParams();
    if (params?.page) httpParams = httpParams.set('page', params.page.toString());
    if (params?.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params?.tenant_id) httpParams = httpParams.set('tenant_id', params.tenant_id);
    if (params?.action) httpParams = httpParams.set('action', params.action);
    if (params?.start_date) httpParams = httpParams.set('start_date', params.start_date);
    if (params?.end_date) httpParams = httpParams.set('end_date', params.end_date);

    return this.http.get<AuditLogListResponse>('/api/audit/logs', { params: httpParams });
  }

  // ============================================================
  // D-16 產業類別管理 (industry-classification)
  // ============================================================

  getIndustries(activeOnly = false): Observable<Industry[]> {
    const url = activeOnly ? '/api/platform/industries?active=true' : '/api/platform/industries';
    return this.http.get<Industry[]>(url);
  }

  createIndustry(data: CreateIndustryRequest): Observable<Industry> {
    return this.http.post<Industry>('/api/platform/industries', data);
  }

  updateIndustry(code: string, updates: UpdateIndustryRequest): Observable<Industry> {
    return this.http.put<Industry>(`/api/platform/industries/${code}`, updates);
  }

  deleteIndustry(code: string): Observable<{ code: string; deleted: boolean }> {
    return this.http.delete<{ code: string; deleted: boolean }>(`/api/platform/industries/${code}`);
  }

  moveIndustry(code: string, direction: 'up' | 'down'): Observable<{ swapped: [string, string]; direction: 'up' | 'down' }> {
    return this.http.post<{ swapped: [string, string]; direction: 'up' | 'down' }>(
      `/api/platform/industries/${code}/move`,
      { direction }
    );
  }

  // ============================================================
  // D-16 部門範本管理
  // ============================================================

  getDepartmentTemplates(params?: { industry?: string; is_common?: boolean }): Observable<DepartmentTemplate[]> {
    let httpParams = new HttpParams();
    if (params?.industry) httpParams = httpParams.set('industry', params.industry);
    if (params?.is_common !== undefined) httpParams = httpParams.set('is_common', String(params.is_common));
    return this.http.get<DepartmentTemplate[]>('/api/platform/department-templates', { params: httpParams });
  }

  createDepartmentTemplate(data: CreateDepartmentTemplateRequest): Observable<DepartmentTemplate> {
    return this.http.post<DepartmentTemplate>('/api/platform/department-templates', data);
  }

  updateDepartmentTemplate(id: string, updates: UpdateDepartmentTemplateRequest): Observable<DepartmentTemplate> {
    return this.http.put<DepartmentTemplate>(`/api/platform/department-templates/${id}`, updates);
  }

  deleteDepartmentTemplate(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(`/api/platform/department-templates/${id}`);
  }

  // ============================================================
  // D-16 產業 × 範本指派
  // ============================================================

  getIndustryDeptAssignments(industry: string): Observable<IndustryDeptAssignment[]> {
    return this.http.get<IndustryDeptAssignment[]>(`/api/platform/industry-dept-assignments?industry=${encodeURIComponent(industry)}`);
  }

  createAssignment(data: CreateAssignmentRequest): Observable<IndustryDeptAssignment> {
    return this.http.post<IndustryDeptAssignment>('/api/platform/industry-dept-assignments', data);
  }

  updateAssignment(id: string, updates: UpdateAssignmentRequest): Observable<IndustryDeptAssignment> {
    return this.http.put<IndustryDeptAssignment>(`/api/platform/industry-dept-assignments/${id}`, updates);
  }

  deleteAssignment(id: string): Observable<{ id: string; deleted: boolean }> {
    return this.http.delete<{ id: string; deleted: boolean }>(`/api/platform/industry-dept-assignments/${id}`);
  }
}
