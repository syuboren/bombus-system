import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Tenant,
  TenantListResponse,
  CreateTenantRequest,
  SubscriptionPlan,
  AuditLogListResponse
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
}
