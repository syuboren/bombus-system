import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import {
  Company,
  Department,
  Employee,
  DepartmentCollaboration,
  OrganizationStats,
  CompanyStats
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

  getDepartmentCollaborations(companyId?: string): Observable<DepartmentCollaboration[]> {
    // 後端尚無此 API，回傳空陣列
    return of([]);
  }

  // ============================================================
  // 員工相關 API
  // ============================================================

  getEmployees(): Observable<Employee[]> {
    return this.http.get<any[]>('/api/employee').pipe(
      map(items => items.map(e => this.mapEmployee(e))),
      catchError(() => of([]))
    );
  }

  getEmployeesByCompany(companyId: string): Observable<Employee[]> {
    // 透過部門關聯篩選（後端無直接 companyId 篩選 API）
    return this.http.get<any[]>('/api/employee').pipe(
      map(items => items.map(e => this.mapEmployee(e))),
      catchError(() => of([]))
    );
  }

  getEmployeesByDepartment(departmentId: string): Observable<Employee[]> {
    return this.http.get<any[]>('/api/employee').pipe(
      map(items => items
        .filter(e => e.department_id === departmentId || e.departmentId === departmentId)
        .map(e => this.mapEmployee(e))
      ),
      catchError(() => of([]))
    );
  }

  getEmployeeById(id: string): Observable<Employee | undefined> {
    return this.http.get<any>(`/api/employee/${id}`).pipe(
      map(e => this.mapEmployee(e)),
      catchError(() => of(undefined))
    );
  }

  getCrossCompanyEmployees(): Observable<Employee[]> {
    // 後端尚無跨公司查詢 API
    return of([]);
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

  createCompany(company: Omit<Company, 'id'>): Observable<Company> {
    return this.http.post<any>('/api/organization/companies', {
      name: company.name,
      type: company.type,
      parentCompanyId: company.parentCompanyId
    }).pipe(
      map(c => this.mapCompany(c))
    );
  }

  updateCompany(id: string, updates: Partial<Company>): Observable<Company | null> {
    return this.http.put<any>(`/api/organization/companies/${id}`, {
      name: updates.name
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
      establishedDate: c.createdAt ? new Date(c.createdAt) : new Date()
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

  private mapEmployee(e: any): Employee {
    return {
      id: e.id,
      employeeNo: e.employee_no || e.employeeNo || '',
      name: e.name,
      email: e.email || '',
      phone: e.phone || '',
      gender: e.gender || 'other',
      hireDate: e.hire_date ? new Date(e.hire_date) : new Date(),
      status: e.status || 'active',
      positions: [{
        id: `pos-${e.id}`,
        companyId: '',
        companyName: '',
        departmentId: e.department_id || '',
        departmentName: e.department || '',
        positionTitle: e.position || e.job_title || '',
        positionLevel: e.grade || '',
        isPrimary: true,
        startDate: e.hire_date ? new Date(e.hire_date) : new Date()
      }]
    };
  }
}
