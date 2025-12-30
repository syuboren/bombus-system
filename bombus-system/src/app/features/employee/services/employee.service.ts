import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
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

  // ===== Mock Data =====

  private mockEmployees: Employee[] = [
    {
      id: '1', employeeNo: 'E2020001', name: '張志明', email: 'zhang.zm@company.com', phone: '0912-111-111',
      department: '研發部', position: '資深工程師', level: 'L4', grade: '技術職',
      manager: '李經理', managerId: 'm1', hireDate: new Date('2020-03-15'),
      status: 'active' as const, contractType: 'full-time' as const, workLocation: '台北總部',
      skills: ['Angular', 'TypeScript', 'Node.js'], certifications: ['AWS Certified', 'PMP']
    },
    {
      id: '2', employeeNo: 'E2021015', name: '林雅文', email: 'lin.yw@company.com', phone: '0923-222-222',
      department: '研發部', position: '前端工程師', level: 'L3', grade: '技術職',
      manager: '李經理', managerId: 'm1', hireDate: new Date('2021-06-01'),
      status: 'active' as const, contractType: 'full-time' as const, workLocation: '台北總部',
      skills: ['React', 'Vue', 'CSS'], certifications: []
    },
    {
      id: '3', employeeNo: 'E2022030', name: '王建國', email: 'wang.jg@company.com', phone: '0934-333-333',
      department: '業務部', position: '業務專員', level: 'L2', grade: '業務職',
      manager: '陳經理', managerId: 'm2', hireDate: new Date('2022-09-10'),
      status: 'active' as const, contractType: 'full-time' as const, workLocation: '台中辦公室',
      skills: ['Sales', 'Negotiation', 'CRM'], certifications: ['業務專業證照']
    },
    {
      id: '4', employeeNo: 'E2024050', name: '陳美玲', email: 'chen.ml@company.com', phone: '0945-444-444',
      department: '人資部', position: 'HR 專員', level: 'L2', grade: '管理職',
      manager: '張經理', managerId: 'm3', hireDate: new Date('2024-08-01'),
      status: 'probation' as const, contractType: 'full-time' as const, workLocation: '台北總部',
      skills: ['Recruitment', 'Training', 'HRIS'], certifications: []
    },
    {
      id: '5', employeeNo: 'E2019008', name: '李志偉', email: 'li.zw@company.com', phone: '0956-555-555',
      department: '研發部', position: '技術主管', level: 'L5', grade: '管理職',
      manager: '王總監', managerId: 'm4', hireDate: new Date('2019-01-15'),
      status: 'active' as const, contractType: 'full-time' as const, workLocation: '台北總部',
      skills: ['Team Management', 'Architecture', 'DevOps'], certifications: ['PMP', 'TOGAF']
    },
    {
      id: '6', employeeNo: 'E2023025', name: '黃雅琪', email: 'huang.yq@company.com', phone: '0967-666-666',
      department: '財務部', position: '會計師', level: 'L3', grade: '專業職',
      manager: '林經理', managerId: 'm5', hireDate: new Date('2023-03-20'),
      status: 'active' as const, contractType: 'full-time' as const, workLocation: '台北總部',
      skills: ['Accounting', 'Tax', 'Financial Analysis'], certifications: ['CPA']
    }
  ];

  private mockJobChanges: JobChange[] = [
    {
      id: '1', effectiveDate: new Date('2023-01-01'), changeType: 'promotion' as const,
      fromPosition: '工程師', toPosition: '資深工程師',
      fromDepartment: '研發部', toDepartment: '研發部',
      fromLevel: 'L3', toLevel: 'L4', salaryChange: 15000,
      reason: '年度晉升，績效表現優異', approvedBy: '李經理'
    },
    {
      id: '2', effectiveDate: new Date('2022-07-01'), changeType: 'transfer' as const,
      fromPosition: '前端工程師', toPosition: '前端工程師',
      fromDepartment: '產品部', toDepartment: '研發部',
      reason: '組織調整，統一技術團隊', approvedBy: '王總監'
    },
    {
      id: '3', effectiveDate: new Date('2024-04-01'), changeType: 'salary-adjustment' as const,
      fromPosition: '技術主管', toPosition: '技術主管',
      fromDepartment: '研發部', toDepartment: '研發部',
      salaryChange: 8000, reason: '年度調薪', approvedBy: '王總監'
    }
  ];

  private mockDocuments: EmployeeDocument[] = [
    {
      id: '1', name: '勞動契約書', type: 'contract' as const,
      uploadDate: new Date('2020-03-15'), expiryDate: new Date('2025-03-14'),
      status: 'valid' as const, version: '1.0', filePath: '/docs/contract.pdf', uploadedBy: 'HR'
    },
    {
      id: '2', name: '身分證影本', type: 'id' as const,
      uploadDate: new Date('2020-03-15'), status: 'valid' as const,
      version: '1.0', filePath: '/docs/id.pdf', uploadedBy: 'HR'
    },
    {
      id: '3', name: 'AWS 認證證書', type: 'certificate' as const,
      uploadDate: new Date('2023-06-20'), expiryDate: new Date('2025-02-15'),
      status: 'expiring' as const, version: '1.0', filePath: '/docs/aws-cert.pdf', uploadedBy: '張志明'
    },
    {
      id: '4', name: '勞保投保證明', type: 'insurance' as const,
      uploadDate: new Date('2024-01-05'), status: 'valid' as const,
      version: '2.0', filePath: '/docs/insurance.pdf', uploadedBy: 'HR'
    }
  ];

  private mockAuditLogs: AuditLog[] = [
    {
      id: '1', employeeId: '1', action: 'update' as const, field: 'position',
      oldValue: '工程師', newValue: '資深工程師', performedBy: 'HR 王小姐',
      performedAt: new Date('2023-01-01 09:30:00')
    },
    {
      id: '2', employeeId: '1', action: 'update' as const, field: 'salary',
      oldValue: '65000', newValue: '80000', performedBy: 'HR 王小姐',
      performedAt: new Date('2023-01-01 09:31:00')
    },
    {
      id: '3', employeeId: '1', action: 'view' as const,
      performedBy: '李經理', performedAt: new Date('2024-12-20 14:22:00')
    },
    {
      id: '4', employeeId: '1', action: 'export' as const,
      performedBy: 'HR 李先生', performedAt: new Date('2024-12-18 16:45:00')
    }
  ];

  // ===== API Methods =====

  getEmployeeStats(): Observable<EmployeeStats> {
    const stats: EmployeeStats = {
      totalEmployees: this.mockEmployees.length,
      activeCount: this.mockEmployees.filter(e => e.status === 'active').length,
      probationCount: this.mockEmployees.filter(e => e.status === 'probation').length,
      avgTenure: 28,
      departmentBreakdown: [
        { department: '研發部', count: 3, percentage: 50 },
        { department: '業務部', count: 1, percentage: 17 },
        { department: '人資部', count: 1, percentage: 17 },
        { department: '財務部', count: 1, percentage: 16 }
      ],
      levelBreakdown: [
        { level: 'L2', count: 2 },
        { level: 'L3', count: 2 },
        { level: 'L4', count: 1 },
        { level: 'L5', count: 1 }
      ],
      expiringDocuments: 3,
      upcomingAnniversaries: [
        { employeeId: '5', name: '李志偉', date: new Date('2025-01-15'), years: 6 },
        { employeeId: '1', name: '張志明', date: new Date('2025-03-15'), years: 5 }
      ]
    };
    return of(stats).pipe(delay(300));
  }

  getEmployees(): Observable<Employee[]> {
    return of(this.mockEmployees).pipe(delay(300));
  }

  getEmployeeById(id: string): Observable<EmployeeDetail | undefined> {
    const employee = this.mockEmployees.find(e => e.id === id);
    if (!employee) return of(undefined).pipe(delay(200));

    const detail: EmployeeDetail = {
      ...employee,
      birthDate: new Date('1990-05-15'),
      address: '台北市信義區信義路五段 100 號',
      emergencyContact: { name: '張媽媽', relation: '母親', phone: '0911-000-000' },
      education: [
        { degree: '碩士', school: '國立台灣大學', major: '資訊工程', graduationYear: 2018 },
        { degree: '學士', school: '國立清華大學', major: '資訊工程', graduationYear: 2016 }
      ],
      workHistory: this.mockJobChanges.filter(j => j.fromDepartment === employee.department || j.toDepartment === employee.department),
      documents: this.mockDocuments,
      training: [
        { id: '1', courseName: 'Angular 進階開發', courseType: 'external' as const, completionDate: new Date('2023-08-15'), score: 92, hours: 24, cost: 15000 },
        { id: '2', courseName: '敏捷開發實務', courseType: 'internal' as const, completionDate: new Date('2024-03-20'), score: 88, hours: 8, cost: 0 },
        { id: '3', courseName: 'AWS 雲端架構', courseType: 'online' as const, completionDate: new Date('2023-05-10'), score: 95, certificate: 'AWS Certified', hours: 40, cost: 8000 }
      ],
      performance: [
        {
          id: '1', period: '2024 H1', overallScore: 4.2, grade: 'A' as const,
          goals: [{ name: '完成系統重構', achievement: 100 }, { name: '培訓新人', achievement: 85 }],
          strengths: ['技術能力強', '問題解決能力優秀'], improvements: ['跨部門溝通可加強'],
          reviewedBy: '李經理', reviewDate: new Date('2024-07-15')
        },
        {
          id: '2', period: '2023 H2', overallScore: 4.0, grade: 'B' as const,
          goals: [{ name: '專案交付', achievement: 90 }, { name: '技術文件', achievement: 80 }],
          strengths: ['專業知識', '團隊合作'], improvements: ['時間管理'],
          reviewedBy: '李經理', reviewDate: new Date('2024-01-20')
        }
      ],
      roi: {
        employeeId: id, period: '2024', salaryCost: 1200000, trainingCost: 50000,
        benefitsCost: 180000, totalCost: 1430000, revenue: 0, projectValue: 3500000,
        productivity: 125, roi: 245, trend: 'up' as const,
        comparison: { departmentAvg: 180, companyAvg: 165 }
      }
    };
    return of(detail).pipe(delay(300));
  }

  getJobChanges(employeeId: string): Observable<JobChange[]> {
    return of(this.mockJobChanges).pipe(delay(200));
  }

  getDocuments(employeeId: string): Observable<EmployeeDocument[]> {
    return of(this.mockDocuments).pipe(delay(200));
  }

  getExpiringDocuments(): Observable<EmployeeDocument[]> {
    return of(this.mockDocuments.filter(d => d.status === 'expiring' || d.status === 'expired')).pipe(delay(200));
  }

  getAuditLogs(employeeId: string): Observable<AuditLog[]> {
    return of(this.mockAuditLogs.filter(l => l.employeeId === employeeId)).pipe(delay(200));
  }

  getEmployeeROI(employeeId: string): Observable<EmployeeROI> {
    return of({
      employeeId, period: '2024', salaryCost: 1200000, trainingCost: 50000,
      benefitsCost: 180000, totalCost: 1430000, revenue: 0, projectValue: 3500000,
      productivity: 125, roi: 245, trend: 'up' as const,
      comparison: { departmentAvg: 180, companyAvg: 165 }
    }).pipe(delay(300));
  }

  getDepartmentROI(): Observable<{ department: string; avgROI: number; employeeCount: number }[]> {
    return of([
      { department: '研發部', avgROI: 210, employeeCount: 3 },
      { department: '業務部', avgROI: 320, employeeCount: 1 },
      { department: '人資部', avgROI: 85, employeeCount: 1 },
      { department: '財務部', avgROI: 95, employeeCount: 1 }
    ]).pipe(delay(300));
  }

  // Actions
  updateEmployee(id: string, data: Partial<Employee>): Observable<boolean> {
    return of(true).pipe(delay(300));
  }

  uploadDocument(employeeId: string, document: Partial<EmployeeDocument>): Observable<boolean> {
    return of(true).pipe(delay(300));
  }

  exportEmployeeData(employeeId: string): Observable<Blob> {
    return of(new Blob(['export data'], { type: 'application/pdf' })).pipe(delay(500));
  }
}

