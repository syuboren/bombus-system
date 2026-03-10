import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import {
  Employee,
  EmployeeDetail,
  JobChange,
  EmployeeDocument,
  EmployeeStats,
  AuditLog,
  EmployeeROI
} from '../models/talent-pool.model';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private http = inject(HttpClient);
  private apiUrl = '/api/employee';

  // ===== Helper Methods =====

  private transformEmployee(data: any): Employee {
    return {
      id: data.id,
      employeeNo: data.employee_no,
      name: data.name,
      email: data.email,
      phone: data.phone,
      department: data.department,
      position: data.position,
      level: data.level,
      grade: data.grade,
      manager: data.managerName || '',
      managerId: data.manager_id,
      hireDate: data.hire_date ? new Date(data.hire_date) : undefined,
      status: data.status,
      contractType: data.contract_type,
      workLocation: data.work_location,
      avatar: data.avatar,
      skills: Array.isArray(data.skills) ? data.skills : [],
      certifications: Array.isArray(data.certifications) 
        ? data.certifications.map((c: any) => c.cert_name || c) 
        : []
    };
  }

  private transformEmployeeDetail(data: any): EmployeeDetail {
    return {
      ...this.transformEmployee(data),
      birthDate: data.birth_date ? new Date(data.birth_date) : undefined,
      address: data.address,
      emergencyContact: {
        name: data.emergency_contact_name || '',
        relation: data.emergency_contact_relation || '',
        phone: data.emergency_contact_phone || ''
      },
      education: Array.isArray(data.education) ? data.education.map((e: any) => ({
        degree: e.degree,
        school: e.school,
        major: e.major,
        graduationYear: e.graduation_year
      })) : [],
      workHistory: Array.isArray(data.workHistory) ? data.workHistory.map((w: any) => ({
        id: w.id,
        effectiveDate: w.effectiveDate ? new Date(w.effectiveDate) : undefined,
        changeType: w.changeType,
        fromPosition: w.fromPosition,
        toPosition: w.toPosition,
        fromDepartment: w.fromDepartment,
        toDepartment: w.toDepartment,
        fromLevel: w.fromLevel,
        toLevel: w.toLevel,
        salaryChange: w.salaryChange,
        reason: w.reason,
        approvedBy: w.approvedBy
      })) : [],
      documents: Array.isArray(data.documents) ? data.documents.map((d: any) => ({
        id: d.id,
        name: d.label || d.fileName || 'Unknown',
        type: d.type as any,
        uploadDate: new Date(d.uploadedAt || d.uploaded_at),
        expiryDate: d.expiryDate ? new Date(d.expiryDate) : undefined,
        status: d.status as any,
        version: '1.0',
        filePath: d.fileUrl || d.file_url,
        uploadedBy: d.uploadedBy || 'System'
      })) : [],
      training: Array.isArray(data.training) ? data.training.map((t: any) => ({
        id: t.id,
        courseName: t.courseName,
        courseType: t.courseType,
        completionDate: t.completionDate ? new Date(t.completionDate) : undefined,
        score: t.score,
        certificate: t.certificate,
        hours: t.hours,
        cost: t.cost,
        status: t.status,
        instructor: t.instructor,
        notes: t.notes
      })) : [],
      performance: Array.isArray(data.performance) ? data.performance : [],
      roi: data.roi || {},
      candidateSource: data.candidateSource || undefined,
      onboardingProgress: data.onboardingProgress || undefined
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('EmployeeService Error:', error);
    return throwError(() => new Error(error.message || 'An error occurred'));
  }

  // ===== API Methods =====

  getEmployeeStats(): Observable<EmployeeStats> {
    return this.http.get<any>(`${this.apiUrl}/stats`).pipe(
      map(data => ({
        totalEmployees: data.totalEmployees,
        activeCount: data.activeCount,
        probationCount: data.probationCount,
        avgTenure: data.avgTenure,
        departmentBreakdown: data.departmentBreakdown || [],
        levelBreakdown: data.levelBreakdown || [],
        expiringDocuments: data.expiringDocuments,
        upcomingAnniversaries: Array.isArray(data.upcomingAnniversaries) 
          ? data.upcomingAnniversaries.map((a: any) => ({
              employeeId: a.employeeId,
              name: a.name,
              date: new Date(a.date),
              years: a.years
            }))
          : []
      })),
      catchError(this.handleError)
    );
  }

  // getDepartments 已移除，請使用 OrgUnitService.allDepartments

  getEmployees(): Observable<Employee[]> {
    return this.http.get<any[]>(`${this.apiUrl}/list`).pipe(
      map(data => data.map(e => this.transformEmployee(e))),
      catchError(this.handleError)
    );
  }

  getEmployeeById(id: string): Observable<EmployeeDetail | undefined> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(data => this.transformEmployeeDetail(data)),
      catchError(error => {
        if (error.status === 404) {
          return throwError(() => undefined);
        }
        return this.handleError(error);
      })
    );
  }

  getJobChanges(employeeId: string): Observable<JobChange[]> {
    // 這個方法可以透過 getEmployeeById 取得
    return this.getEmployeeById(employeeId).pipe(
      map(detail => detail?.workHistory || [])
    );
  }

  getDocuments(employeeId: string): Observable<EmployeeDocument[]> {
    // 這個方法可以透過 getEmployeeById 取得
    return this.getEmployeeById(employeeId).pipe(
      map(detail => detail?.documents || [])
    );
  }

  getExpiringDocuments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/expiring-documents`).pipe(
      map(data => data.map(d => ({
        id: d.id,
        employeeId: d.employeeId,
        employeeName: d.employeeName,
        documentType: d.documentType,
        documentName: d.documentName,
        expiryDate: new Date(d.expiryDate),
        daysUntilExpiry: d.daysUntilExpiry
      }))),
      catchError(this.handleError)
    );
  }

  getAuditLogs(employeeId: string): Observable<AuditLog[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${employeeId}/audit-logs`).pipe(
      catchError(this.handleError)
    );
  }

  getEmployeeROI(employeeId: string): Observable<EmployeeROI> {
    // ROI 資料包含在 EmployeeDetail 中
    return this.getEmployeeById(employeeId).pipe(
      map(detail => detail?.roi || {} as EmployeeROI)
    );
  }

  getDepartmentROI(): Observable<{ department: string; avgROI: number; employeeCount: number }[]> {
    return this.http.get<any[]>(`${this.apiUrl}/department-roi`).pipe(
      catchError(this.handleError)
    );
  }

  // Actions
  updateEmployee(id: string, data: Partial<Employee>): Observable<boolean> {
    // 未來實作
    return throwError(() => new Error('Not implemented'));
  }

  uploadDocument(employeeId: string, document: Partial<EmployeeDocument>): Observable<boolean> {
    // 未來實作
    return throwError(() => new Error('Not implemented'));
  }

  exportEmployeeData(employeeId: string): Observable<Blob> {
    // 未來實作
    return throwError(() => new Error('Not implemented'));
  }
}


