import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import {
  Company,
  Department,
  DepartmentCollaboration,
  OrganizationStats,
  CompanyStats,
  OrgTreeNode,
  DepartmentEmployee,
  DepartmentPositionInfo,
  SimpleCollaboration,
  AnchorSide
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private http = inject(HttpClient);

  // ============================================================
  // 公司相關 API
  // ============================================================

  getCompanies(): Observable<Company[]> {
    return this.http.get<any[]>('/api/organization/companies').pipe(
      map(items => items.map(c => this.mapCompany(c))),
      catchError(() => of([]))
    );
  }

  getCompanyById(id: string): Observable<Company | undefined> {
    return this.http.get<any>(`/api/organization/companies/${id}`).pipe(
      map(c => this.mapCompany(c)),
      catchError(() => of(undefined))
    );
  }

  /** 取得公司完整詳情（含 subsidiaries / departments 陣列） */
  getCompanyDetail(id: string): Observable<{
    company: Company;
    subsidiaries: { id: string; name: string; employeeCount: number }[];
    departments: { id: string; name: string; employeeCount: number }[];
  } | null> {
    return this.http.get<any>(`/api/organization/companies/${id}`).pipe(
      map(c => ({
        company: this.mapCompany(c),
        subsidiaries: c.subsidiaries || [],
        departments: c.departments || []
      })),
      catchError(() => of(null))
    );
  }

  getSubsidiaries(parentId: string): Observable<Company[]> {
    return this.http.get<any[]>(`/api/organization/companies/${parentId}/subsidiaries`).pipe(
      map(items => items.map(c => this.mapCompany(c))),
      catchError(() => of([]))
    );
  }

  getHeadquarters(): Observable<Company | undefined> {
    return this.http.get<any>('/api/organization/companies/headquarters').pipe(
      map(c => this.mapCompany(c)),
      catchError(() => of(undefined))
    );
  }

  // ============================================================
  // 部門相關 API
  // ============================================================

  getDepartments(): Observable<Department[]> {
    return this.http.get<any[]>('/api/organization/departments').pipe(
      map(items => items.map(d => this.mapDepartment(d))),
      catchError(() => of([]))
    );
  }

  getDepartmentsByCompany(companyId: string): Observable<Department[]> {
    return this.http.get<any[]>('/api/organization/departments', {
      params: { companyId }
    }).pipe(
      map(items => items.map(d => this.mapDepartment(d))),
      catchError(() => of([]))
    );
  }

  getDepartmentById(id: string): Observable<Department | undefined> {
    return this.http.get<any>(`/api/organization/departments/${id}`).pipe(
      map(d => this.mapDepartment(d)),
      catchError(() => of(undefined))
    );
  }

  /** @deprecated 使用 getCollaborations() */
  getDepartmentCollaborations(companyId?: string): Observable<DepartmentCollaboration[]> {
    return of([]);
  }

  // ============================================================
  // 統一組織樹 API
  // ============================================================

  getOrgTree(): Observable<OrgTreeNode[]> {
    return this.http.get<OrgTreeNode[]>('/api/organization/tree').pipe(
      catchError(() => of([]))
    );
  }

  getDepartmentEmployees(deptId: string): Observable<DepartmentEmployee[]> {
    return this.http.get<DepartmentEmployee[]>(`/api/organization/departments/${deptId}/employees`).pipe(
      catchError(() => of([]))
    );
  }

  getDepartmentPositions(deptId: string): Observable<DepartmentPositionInfo[]> {
    return this.http.get<DepartmentPositionInfo[]>(`/api/organization/departments/${deptId}/positions`).pipe(
      catchError(() => of([]))
    );
  }

  getCollaborations(): Observable<SimpleCollaboration[]> {
    return this.http.get<SimpleCollaboration[]>('/api/organization/collaborations').pipe(
      catchError(() => of([]))
    );
  }

  createCollaboration(data: {
    sourceDeptId: string; targetDeptId: string; relationType: string;
    description?: string; sourceAnchor?: AnchorSide | null; targetAnchor?: AnchorSide | null;
  }): Observable<SimpleCollaboration> {
    return this.http.post<SimpleCollaboration>('/api/organization/collaborations', data);
  }

  updateCollaboration(id: string, updates: {
    relationType?: string; description?: string;
    sourceAnchor?: AnchorSide | null; targetAnchor?: AnchorSide | null;
  }): Observable<SimpleCollaboration> {
    return this.http.put<SimpleCollaboration>(`/api/organization/collaborations/${id}`, updates);
  }

  deleteCollaboration(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`/api/organization/collaborations/${id}`);
  }

  updateDepartmentExtended(id: string, updates: {
    name?: string;
    code?: string;
    managerId?: string;
    responsibilities?: string[];
    kpiItems?: string[];
    competencyFocus?: { name: string; jobs: { name: string; description: string }[] }[];
  }): Observable<any> {
    return this.http.put(`/api/organization/departments/${id}`, updates);
  }

  // ============================================================
  // 統計相關 API
  // ============================================================

  getOrganizationStats(): Observable<OrganizationStats> {
    return this.http.get<any>('/api/organization/stats').pipe(
      map(s => ({
        totalCompanies: s.totalCompanies || 0,
        totalDepartments: s.totalDepartments || 0,
        totalEmployees: s.totalEmployees || 0,
        activeEmployees: s.activeEmployees || 0,
        crossCompanyEmployees: 0,
        departmentCollaborations: 0
      })),
      catchError(() => of({
        totalCompanies: 0,
        totalDepartments: 0,
        totalEmployees: 0,
        activeEmployees: 0,
        crossCompanyEmployees: 0,
        departmentCollaborations: 0
      }))
    );
  }

  getCompanyStats(companyId: string): Observable<CompanyStats> {
    return this.getDepartmentsByCompany(companyId).pipe(
      map(depts => ({
        companyId,
        departmentCount: depts.length,
        employeeCount: depts.reduce((sum, d) => sum + d.employeeCount, 0),
        managerCount: depts.filter(d => d.managerId).length,
        avgTenure: 0
      }))
    );
  }

  // ============================================================
  // 公司 CRUD API
  // ============================================================

  createCompany(company: Omit<Company, 'id'> & Record<string, any>): Observable<Company> {
    return this.http.post<any>('/api/organization/companies', {
      name: company.name,
      type: company.type,
      parentCompanyId: company.parentCompanyId,
      code: company.code,
      address: company.address,
      phone: company.phone,
      email: company.email,
      description: company.description,
      taxId: company.taxId,
      status: company.status,
      establishedDate: company.establishedDate
    }).pipe(
      map(c => this.mapCompany(c))
    );
  }

  updateCompany(id: string, updates: Partial<Company> & Record<string, any>): Observable<Company | null> {
    return this.http.put<any>(`/api/organization/companies/${id}`, {
      name: updates.name,
      code: updates.code,
      address: updates.address,
      phone: updates.phone,
      email: updates.email,
      description: updates.description,
      taxId: updates.taxId,
      status: updates.status,
      establishedDate: updates.establishedDate
    }).pipe(
      map(c => this.mapCompany(c)),
      catchError(() => of(null))
    );
  }

  deleteCompany(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`/api/organization/companies/${id}`).pipe(
      map(res => ({ success: res.success ?? true, message: res.message || '公司已刪除' })),
      catchError(err => of({
        success: false,
        message: err.error?.message || '刪除失敗'
      }))
    );
  }

  // ============================================================
  // 部門 CRUD API
  // ============================================================

  createDepartment(department: Omit<Department, 'id'>): Observable<Department> {
    return this.http.post<any>('/api/organization/departments', {
      name: department.name,
      companyId: department.companyId
    }).pipe(
      map(d => this.mapDepartment(d))
    );
  }

  updateDepartment(id: string, updates: Partial<Department>): Observable<Department | null> {
    return this.http.put<any>(`/api/organization/departments/${id}`, {
      name: updates.name,
      managerId: updates.managerId
    }).pipe(
      map(d => this.mapDepartment(d)),
      catchError(() => of(null))
    );
  }

  deleteDepartment(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<any>(`/api/organization/departments/${id}`).pipe(
      map(res => ({ success: res.success ?? true, message: res.message || '部門已刪除' })),
      catchError(err => of({
        success: false,
        message: err.error?.message || '刪除失敗'
      }))
    );
  }

  // ============================================================
  // 後端 → 前端模型映射
  // ============================================================

  private mapCompany(c: any): Company {
    return {
      id: c.id,
      name: c.name,
      code: c.code || c.name,
      type: c.type || 'subsidiary',
      parentCompanyId: c.parentCompanyId,
      employeeCount: c.employeeCount || 0,
      departmentCount: c.departmentCount || 0,
      status: c.status || 'active',
      address: c.address || '',
      phone: c.phone || '',
      email: c.email || '',
      taxId: c.taxId || c.tax_id || '',
      description: c.description || '',
      establishedDate: c.establishedDate ? new Date(c.establishedDate) : (c.createdAt ? new Date(c.createdAt) : new Date())
    };
  }

  private mapDepartment(d: any): Department {
    return {
      id: d.id,
      companyId: d.companyId,
      name: d.name,
      code: d.code || d.name,
      managerId: d.managerId,
      managerName: d.managerName,
      level: d.level || 1,
      employeeCount: d.employeeCount || 0,
      responsibilities: d.responsibilities || []
    };
  }

}
