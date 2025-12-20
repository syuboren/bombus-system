import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Company,
  Department,
  Employee,
  DepartmentCollaboration,
  Workflow,
  WorkflowNode,
  OrganizationStats,
  CompanyStats
} from '../models/organization.model';

@Injectable({ providedIn: 'root' })
export class OrganizationService {

  // ============================================================
  // Mock 資料
  // ============================================================

  private mockCompanies: Company[] = [
    {
      id: 'comp-001',
      name: 'Bombus 集團總部',
      code: 'BOMBUS-HQ',
      type: 'headquarters',
      logo: 'assets/images/logo.svg',
      address: '台北市信義區信義路五段7號',
      phone: '02-2345-6789',
      email: 'info@bombus.com',
      taxId: '12345678',
      employeeCount: 55,
      departmentCount: 7,
      establishedDate: new Date('2010-03-15'),
      status: 'active',
      description: 'Bombus 集團總部，負責集團策略規劃與資源整合'
    },
    {
      id: 'comp-002',
      name: 'Bombus 科技股份有限公司',
      code: 'BOMBUS-TECH',
      type: 'subsidiary',
      parentCompanyId: 'comp-001',
      address: '台北市內湖區瑞光路588號',
      phone: '02-8765-4321',
      email: 'tech@bombus.com',
      taxId: '23456789',
      employeeCount: 45,
      departmentCount: 4,
      establishedDate: new Date('2015-06-01'),
      status: 'active',
      description: '專注於軟體開發與技術服務'
    },
    {
      id: 'comp-003',
      name: 'Bombus 顧問有限公司',
      code: 'BOMBUS-CONSULT',
      type: 'subsidiary',
      parentCompanyId: 'comp-001',
      address: '台北市中山區南京東路三段168號',
      phone: '02-2567-8901',
      email: 'consult@bombus.com',
      taxId: '34567890',
      employeeCount: 28,
      departmentCount: 3,
      establishedDate: new Date('2018-01-10'),
      status: 'active',
      description: '提供企業管理諮詢與數位轉型服務'
    },
    {
      id: 'comp-004',
      name: 'Bombus 國際有限公司',
      code: 'BOMBUS-INTL',
      type: 'subsidiary',
      parentCompanyId: 'comp-001',
      address: '高雄市前鎮區成功二路88號',
      phone: '07-3456-7890',
      email: 'intl@bombus.com',
      taxId: '45678901',
      employeeCount: 22,
      departmentCount: 4,
      establishedDate: new Date('2020-09-01'),
      status: 'active',
      description: '負責海外市場拓展與國際業務'
    }
  ];

  private mockDepartments: Department[] = [
    // ============================================================
    // 總部部門 (55人)
    // ============================================================
    {
      id: 'dept-001',
      companyId: 'comp-001',
      name: '董事會',
      code: 'BOD',
      level: 1,
      employeeCount: 5,
      managerId: 'emp-001',
      managerName: '王建國',
      responsibilities: ['企業策略制定', '重大決策審議', '監督經營團隊'],
      color: '#8B7355',
      icon: 'ri-building-4-line'
    },
    {
      id: 'dept-002',
      companyId: 'comp-001',
      name: '執行長辦公室',
      code: 'CEO',
      parentDepartmentId: 'dept-001',
      managerId: 'emp-006',
      managerName: '王大明',
      level: 2,
      employeeCount: 8,
      responsibilities: ['集團營運管理', '策略執行', '跨公司協調'],
      color: '#A0522D',
      icon: 'ri-user-star-line'
    },
    {
      id: 'dept-003',
      companyId: 'comp-001',
      name: '人力資源部',
      code: 'HR',
      parentDepartmentId: 'dept-002',
      managerId: 'emp-014',
      managerName: '李小華',
      level: 3,
      employeeCount: 12,
      responsibilities: ['人才招募', '薪酬福利', '員工發展', '績效管理'],
      color: '#CD853F',
      icon: 'ri-team-line'
    },
    {
      id: 'dept-004',
      companyId: 'comp-001',
      name: '財務部',
      code: 'FIN',
      parentDepartmentId: 'dept-002',
      managerId: 'emp-026',
      managerName: '張財務',
      level: 3,
      employeeCount: 12,
      responsibilities: ['財務規劃', '預算管理', '會計作業', '稅務申報'],
      color: '#B8860B',
      icon: 'ri-money-dollar-circle-line'
    },
    {
      id: 'dept-005',
      companyId: 'comp-001',
      name: '服務顧問辦公室',
      code: 'SCO',
      parentDepartmentId: 'dept-001',
      managerId: 'emp-038',
      managerName: '林顧問',
      level: 2,
      employeeCount: 6,
      responsibilities: ['內部顧問服務', '專案管理', '流程優化'],
      color: '#9370DB',
      icon: 'ri-customer-service-line'
    },
    {
      id: 'dept-006',
      companyId: 'comp-001',
      name: '資訊部',
      code: 'IT',
      parentDepartmentId: 'dept-005',
      managerId: 'emp-044',
      managerName: '陳資訊',
      level: 3,
      employeeCount: 8,
      responsibilities: ['系統維運', '資安管理', 'IT 基礎設施', '數位轉型'],
      color: '#6B8E23',
      icon: 'ri-computer-line'
    },
    {
      id: 'dept-007',
      companyId: 'comp-001',
      name: '專案顧問部',
      code: 'PMO',
      parentDepartmentId: 'dept-005',
      managerId: 'emp-052',
      managerName: '吳專案',
      level: 3,
      employeeCount: 4,
      responsibilities: ['專案規劃', '專案執行監控', '顧問諮詢'],
      color: '#4682B4',
      icon: 'ri-folder-chart-line'
    },
    // ============================================================
    // 科技公司部門 (45人)
    // ============================================================
    {
      id: 'dept-101',
      companyId: 'comp-002',
      name: '研發中心',
      code: 'RD',
      level: 1,
      employeeCount: 5,
      managerId: 'emp-056',
      managerName: '林研發',
      responsibilities: ['產品研發', '技術創新', '專利申請'],
      color: '#4682B4',
      icon: 'ri-code-box-line'
    },
    {
      id: 'dept-102',
      companyId: 'comp-002',
      name: '前端開發組',
      code: 'FE',
      parentDepartmentId: 'dept-101',
      level: 2,
      employeeCount: 15,
      managerId: 'emp-061',
      managerName: '吳前端',
      responsibilities: ['Web 前端開發', 'UI/UX 實現', '效能優化'],
      color: '#5F9EA0',
      icon: 'ri-layout-line'
    },
    {
      id: 'dept-103',
      companyId: 'comp-002',
      name: '後端開發組',
      code: 'BE',
      parentDepartmentId: 'dept-101',
      level: 2,
      employeeCount: 15,
      managerId: 'emp-076',
      managerName: '鄭後端',
      responsibilities: ['API 開發', '資料庫設計', '系統架構'],
      color: '#708090',
      icon: 'ri-server-line'
    },
    {
      id: 'dept-104',
      companyId: 'comp-002',
      name: '品質保證部',
      code: 'QA',
      parentDepartmentId: 'dept-101',
      level: 2,
      employeeCount: 10,
      managerId: 'emp-091',
      managerName: '周品管',
      responsibilities: ['測試規劃', '自動化測試', '品質稽核'],
      color: '#9370DB',
      icon: 'ri-bug-line'
    },
    // ============================================================
    // 顧問公司部門 (28人)
    // ============================================================
    {
      id: 'dept-201',
      companyId: 'comp-003',
      name: '管理顧問部',
      code: 'MC',
      level: 1,
      employeeCount: 12,
      managerId: 'emp-101',
      managerName: '黃顧問',
      responsibilities: ['企業診斷', '策略規劃', '組織變革'],
      color: '#DEB887',
      icon: 'ri-lightbulb-line'
    },
    {
      id: 'dept-202',
      companyId: 'comp-003',
      name: '數位轉型部',
      code: 'DT',
      level: 1,
      employeeCount: 10,
      managerId: 'emp-113',
      managerName: '蔡數位',
      responsibilities: ['數位策略', '流程優化', '系統導入'],
      color: '#D2691E',
      icon: 'ri-rocket-line'
    },
    {
      id: 'dept-203',
      companyId: 'comp-003',
      name: '客戶成功部',
      code: 'CS',
      level: 1,
      employeeCount: 6,
      managerId: 'emp-123',
      managerName: '許客服',
      responsibilities: ['客戶關係維護', '專案追蹤', '滿意度調查'],
      color: '#BC8F8F',
      icon: 'ri-customer-service-2-line'
    },
    // ============================================================
    // 國際公司部門 (22人)
    // ============================================================
    {
      id: 'dept-301',
      companyId: 'comp-004',
      name: '國際業務部',
      code: 'IBD',
      level: 1,
      employeeCount: 6,
      managerId: 'emp-129',
      managerName: '張國際',
      responsibilities: ['海外市場開發', '國際客戶關係', '跨境合作'],
      color: '#2E8B57',
      icon: 'ri-global-line'
    },
    {
      id: 'dept-302',
      companyId: 'comp-004',
      name: '貿易部',
      code: 'TRD',
      parentDepartmentId: 'dept-301',
      level: 2,
      employeeCount: 6,
      managerId: 'emp-135',
      managerName: '李貿易',
      responsibilities: ['進出口業務', '報關作業', '物流管理'],
      color: '#4169E1',
      icon: 'ri-ship-line'
    },
    {
      id: 'dept-303',
      companyId: 'comp-004',
      name: '海外行銷部',
      code: 'OMK',
      parentDepartmentId: 'dept-301',
      level: 2,
      employeeCount: 6,
      managerId: 'emp-141',
      managerName: '王行銷',
      responsibilities: ['海外品牌推廣', '數位行銷', '展會策劃'],
      color: '#FF6347',
      icon: 'ri-advertisement-line'
    },
    {
      id: 'dept-304',
      companyId: 'comp-004',
      name: '行政支援部',
      code: 'ADM',
      level: 1,
      employeeCount: 4,
      managerId: 'emp-147',
      managerName: '陳行政',
      responsibilities: ['行政事務', '總務管理', '文書處理'],
      color: '#808080',
      icon: 'ri-file-text-line'
    }
  ];

  private mockEmployees: Employee[] = this.generateMockEmployees();

  private generateMockEmployees(): Employee[] {
    const employees: Employee[] = [];

    // ============================================================
    // 集團總部員工 (55人)
    // ============================================================

    // 董事會 (5人)
    employees.push(
      this.createEmployee('emp-001', 'HQ-001', '王建國', 'James Wang', 'male', '1958-03-15', '2010-03-15', 'active',
        '國立台灣大學商學博士', ['企業治理', '策略規劃', '投資管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-001', departmentName: '董事會', positionTitle: '董事長', positionLevel: 'Chairman', isPrimary: true }]),
      this.createEmployee('emp-002', 'HQ-002', '陳美玲', 'May Chen', 'female', '1962-07-20', '2010-03-15', 'active',
        '美國史丹佛大學 MBA', ['財務管理', '企業併購', '風險控管'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-001', departmentName: '董事會', positionTitle: '副董事長', positionLevel: 'Vice Chairman', isPrimary: true }]),
      this.createEmployee('emp-003', 'HQ-003', '林志明', 'Tommy Lin', 'male', '1965-11-08', '2012-06-01', 'active',
        '國立政治大學法律碩士', ['公司治理', '法律事務', '風險評估'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-001', departmentName: '董事會', positionTitle: '獨立董事', positionLevel: 'Director', isPrimary: true }]),
      this.createEmployee('emp-004', 'HQ-004', '張雅琪', 'Grace Chang', 'female', '1968-04-25', '2014-01-15', 'active',
        '英國劍橋大學經濟學碩士', ['經濟分析', '產業研究', '投資策略'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-001', departmentName: '董事會', positionTitle: '獨立董事', positionLevel: 'Director', isPrimary: true }]),
      this.createEmployee('emp-005', 'HQ-005', '黃文彬', 'Peter Huang', 'male', '1960-09-12', '2015-03-01', 'active',
        '國立清華大學電機博士', ['科技創新', '研發管理', '專利策略'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-001', departmentName: '董事會', positionTitle: '獨立董事', positionLevel: 'Director', isPrimary: true }])
    );

    // 執行長辦公室 (8人)
    employees.push(
      this.createEmployee('emp-006', 'HQ-006', '王大明', 'David Wang', 'male', '1975-05-15', '2010-03-15', 'active',
        '國立台灣大學 EMBA', ['企業管理', '策略執行', '領導力'],
        [
          { companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '執行長', positionLevel: 'C-Level', isPrimary: true },
          { companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '董事', positionLevel: 'Director', isPrimary: false }
        ]),
      this.createEmployee('emp-007', 'HQ-007', '李明哲', 'Michael Lee', 'male', '1978-08-22', '2011-06-01', 'active',
        '國立交通大學管理學碩士', ['營運管理', '流程優化', '績效管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '營運長', positionLevel: 'C-Level', isPrimary: true }]),
      this.createEmployee('emp-008', 'HQ-008', '周怡君', 'Jessica Chou', 'female', '1980-12-05', '2013-03-01', 'active',
        '國立政治大學企管碩士', ['策略規劃', '商業發展', '市場分析'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '策略長', positionLevel: 'C-Level', isPrimary: true }]),
      this.createEmployee('emp-009', 'HQ-009', '蔡宜臻', 'Christine Tsai', 'female', '1985-06-18', '2015-09-01', 'active',
        '輔仁大學企管系', ['行政管理', '會議安排', '文書處理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '執行秘書', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-010', 'HQ-010', '許志偉', 'William Hsu', 'male', '1988-03-25', '2017-01-15', 'active',
        '東吳大學法律系', ['法務支援', '合約審查', '法規遵循'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '法務專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-011', 'HQ-011', '林雅雯', 'Wendy Lin', 'female', '1990-09-10', '2018-06-01', 'active',
        '淡江大學傳播碩士', ['公關溝通', '媒體關係', '品牌管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '公關專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-012', 'HQ-012', '吳建志', 'Ken Wu', 'male', '1992-01-28', '2019-03-01', 'active',
        '銘傳大學財金系', ['資料分析', '報表製作', '簡報設計'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '幕僚專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-013', 'HQ-013', '劉佳琪', 'Kiki Liu', 'female', '1994-05-15', '2020-07-01', 'active',
        '世新大學行管系', ['行程管理', '專案支援', '客戶接待'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '行政助理', positionLevel: 'Staff', isPrimary: true }])
    );

    // 人力資源部 (12人)
    employees.push(
      this.createEmployee('emp-014', 'HQ-014', '李小華', 'Sarah Lee', 'female', '1982-08-20', '2012-06-01', 'active',
        '國立政治大學人力資源管理碩士', ['人才發展', '組織設計', '勞動法規'],
        [
          { companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '人資長', positionLevel: 'Director', isPrimary: true },
          { companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-201', departmentName: '管理顧問部', positionTitle: '人資顧問', positionLevel: 'Advisor', isPrimary: false }
        ]),
      this.createEmployee('emp-015', 'HQ-015', '陳怡萱', 'Vivian Chen', 'female', '1987-03-12', '2015-09-01', 'active',
        '中央大學人資所', ['招募策略', '面試技巧', '人才評估'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '招募主管', positionLevel: 'Manager', isPrimary: true }]),
      this.createEmployee('emp-016', 'HQ-016', '楊雅婷', 'Tina Yang', 'female', '1990-07-25', '2017-03-01', 'active',
        '文化大學勞工關係系', ['薪酬制度', '福利規劃', '勞資關係'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '薪酬專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-017', 'HQ-017', '黃俊豪', 'Howard Huang', 'male', '1991-11-08', '2018-01-15', 'active',
        '中山大學人管所', ['績效管理', 'KPI設計', '人才盤點'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '績效專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-018', 'HQ-018', '張雅芬', 'Fanny Chang', 'female', '1993-04-18', '2019-06-01', 'active',
        '逢甲大學企管系', ['教育訓練', '課程設計', '講師管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '訓練專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-019', 'HQ-019', '林志豪', 'Jack Lin', 'male', '1989-08-30', '2016-10-01', 'active',
        '東海大學企管碩士', ['HRBP', '員工關係', '組織發展'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: 'HRBP', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-020', 'HQ-020', '王雅琳', 'Linda Wang', 'female', '1992-02-14', '2018-08-01', 'active',
        '靜宜大學企管系', ['員工關懷', '活動規劃', '福委會'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: 'HRBP', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-021', 'HQ-021', '蘇俊宏', 'John Su', 'male', '1994-06-22', '2020-03-01', 'active',
        '義守大學企管系', ['招募執行', '校園招募', '人才庫管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '招募專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-022', 'HQ-022', '周美玲', 'Mei Chou', 'female', '1995-10-05', '2021-01-15', 'active',
        '真理大學人資系', ['人事資料', '出勤管理', '報表製作'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '人事專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-023', 'HQ-023', '陳建宏', 'Tony Chen', 'male', '1996-03-18', '2021-07-01', 'active',
        '實踐大學人資系', ['薪資計算', '勞健保', '所得稅務'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '薪資專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-024', 'HQ-024', '李雅惠', 'Amy Lee', 'female', '1997-08-12', '2022-02-01', 'active',
        '景文科大人資系', ['訓練行政', '課程執行', '學習平台'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '訓練專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-025', 'HQ-025', '吳雅琳', 'Elaine Wu', 'female', '1998-12-28', '2022-08-01', 'active',
        '德明科大企管系', ['行政支援', '文書處理', '檔案管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-003', departmentName: '人力資源部', positionTitle: '人資助理', positionLevel: 'Staff', isPrimary: true }])
    );

    // 財務部 (12人)
    employees.push(
      this.createEmployee('emp-026', 'HQ-026', '張財務', 'Kevin Chang', 'male', '1978-12-10', '2011-09-01', 'active',
        '國立台灣大學會計學碩士', ['財務分析', '預算規劃', '稅務策略'],
        [
          { companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '財務長', positionLevel: 'C-Level', isPrimary: true },
          { companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '財務顧問', positionLevel: 'Advisor', isPrimary: false },
          { companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-201', departmentName: '管理顧問部', positionTitle: '財務顧問', positionLevel: 'Advisor', isPrimary: false }
        ]),
      this.createEmployee('emp-027', 'HQ-027', '劉雅玲', 'Grace Liu', 'female', '1983-05-20', '2014-03-01', 'active',
        '國立政治大學會計碩士', ['會計準則', '財報編製', '內部控制'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '會計主管', positionLevel: 'Manager', isPrimary: true }]),
      this.createEmployee('emp-028', 'HQ-028', '陳志明', 'Simon Chen', 'male', '1986-09-15', '2016-06-01', 'active',
        '中興大學會計系', ['成本會計', '管理會計', '預算編制'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '資深會計', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-029', 'HQ-029', '王淑芬', 'Susan Wang', 'female', '1988-01-28', '2017-09-01', 'active',
        '東吳大學會計系', ['應收帳款', '帳務處理', '銀行調節'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '會計專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-030', 'HQ-030', '李政道', 'Daniel Lee', 'male', '1990-04-12', '2018-11-01', 'active',
        '輔仁大學會計系', ['應付帳款', '費用報銷', '供應商管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '會計專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-031', 'HQ-031', '黃淑娟', 'Judy Huang', 'female', '1991-07-08', '2019-04-01', 'active',
        '淡江大學會計系', ['固定資產', '折舊攤銷', '盤點作業'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '會計專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-032', 'HQ-032', '林俊傑', 'JJ Lin', 'male', '1989-03-22', '2017-01-15', 'active',
        '成功大學會計系', ['稅務申報', '營業稅', '所得稅'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '稅務專員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-033', 'HQ-033', '周雅芳', 'Fang Chou', 'female', '1992-11-18', '2020-02-01', 'active',
        '中央大學會計系', ['稅務規劃', '移轉訂價', '租稅優惠'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '稅務專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-034', 'HQ-034', '張明輝', 'Ray Chang', 'male', '1987-06-25', '2016-08-01', 'active',
        '清華大學財金系', ['財務分析', '投資評估', '資金調度'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '財務分析師', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-035', 'HQ-035', '陳雅琪', 'Kiki Chen', 'female', '1993-08-05', '2020-09-01', 'active',
        '中山大學財管系', ['預算分析', '差異分析', '財務報表'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '財務分析師', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-036', 'HQ-036', '吳佳穎', 'Iris Wu', 'female', '1994-02-14', '2021-03-01', 'active',
        '東海大學會計系', ['出納作業', '銀行往來', '現金管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '出納專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-037', 'HQ-037', '林家豪', 'Kevin Lin', 'male', '1996-05-30', '2022-01-15', 'active',
        '銘傳大學會計系', ['請款作業', '費用核銷', '憑證管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-004', departmentName: '財務部', positionTitle: '出納專員', positionLevel: 'Staff', isPrimary: true }])
    );

    // 服務顧問辦公室 (6人)
    employees.push(
      this.createEmployee('emp-038', 'HQ-038', '林顧問', 'Steven Lin', 'male', '1976-10-15', '2013-06-01', 'active',
        '國立台灣大學商學碩士', ['企業顧問', '流程優化', '專案管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-005', departmentName: '服務顧問辦公室', positionTitle: '顧問長', positionLevel: 'Director', isPrimary: true }]),
      this.createEmployee('emp-039', 'HQ-039', '黃俊豪', 'Howard Huang', 'male', '1982-04-20', '2015-09-01', 'active',
        '交通大學管理碩士', ['策略顧問', '組織診斷', '變革管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-005', departmentName: '服務顧問辦公室', positionTitle: '資深顧問', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-040', 'HQ-040', '陳雅芬', 'Fen Chen', 'female', '1985-08-12', '2017-03-01', 'active',
        '政治大學企管碩士', ['流程改善', '效率提升', '品質管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-005', departmentName: '服務顧問辦公室', positionTitle: '資深顧問', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-041', 'HQ-041', '王志強', 'Strong Wang', 'male', '1988-12-05', '2019-01-15', 'active',
        '中山大學企管系', ['專案規劃', '進度追蹤', '風險管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-005', departmentName: '服務顧問辦公室', positionTitle: '顧問', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-042', 'HQ-042', '李雅雯', 'Winnie Lee', 'female', '1991-03-28', '2020-06-01', 'active',
        '東海大學企管系', ['資料分析', '報告撰寫', '簡報製作'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-005', departmentName: '服務顧問辦公室', positionTitle: '顧問', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-043', 'HQ-043', '張雅琪', 'Kiki Chang', 'female', '1994-07-18', '2021-09-01', 'active',
        '輔仁大學企管系', ['行政支援', '會議紀錄', '文件管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-005', departmentName: '服務顧問辦公室', positionTitle: '助理顧問', positionLevel: 'Staff', isPrimary: true }])
    );

    // 資訊部 (8人)
    employees.push(
      this.createEmployee('emp-044', 'HQ-044', '陳資訊', 'Eric Chen', 'male', '1980-06-22', '2012-10-01', 'active',
        '國立交通大學資工碩士', ['IT策略', '系統架構', '資安管理'],
        [
          { companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: '資訊長', positionLevel: 'Director', isPrimary: true },
          { companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '技術顧問', positionLevel: 'Advisor', isPrimary: false }
        ]),
      this.createEmployee('emp-045', 'HQ-045', '林志偉', 'William Lin', 'male', '1985-02-15', '2015-04-01', 'active',
        '成功大學資工系', ['系統管理', 'Linux', 'Windows Server'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: '系統管理員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-046', 'HQ-046', '黃志明', 'Simon Huang', 'male', '1987-09-08', '2017-01-15', 'active',
        '中興大學資工系', ['網路管理', '防火牆', 'VPN'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: '網路管理員', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-047', 'HQ-047', '張雅玲', 'Ling Chang', 'female', '1989-04-25', '2018-08-01', 'active',
        '淡江大學資工系', ['資安監控', '弱點掃描', '事件處理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: '資安工程師', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-048', 'HQ-048', '李俊宏', 'John Lee', 'male', '1991-11-12', '2019-11-01', 'active',
        '元智大學資工系', ['資安政策', '合規檢查', 'ISO27001'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: '資安工程師', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-049', 'HQ-049', '王志豪', 'Jack Wang', 'male', '1993-06-30', '2020-05-01', 'active',
        '銘傳大學資工系', ['硬體維護', '網路佈線', '設備採購'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: '網路工程師', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-050', 'HQ-050', '陳雅婷', 'Tina Chen', 'female', '1995-01-18', '2021-02-15', 'active',
        '實踐大學資管系', ['IT支援', '問題排解', '教育訓練'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: 'IT支援專員', positionLevel: 'Staff', isPrimary: true }]),
      this.createEmployee('emp-051', 'HQ-051', '林雅琪', 'Kiki Lin', 'female', '1997-08-22', '2022-06-01', 'active',
        '景文科大資管系', ['系統監控', '備份管理', '報表製作'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: '系統管理員', positionLevel: 'Staff', isPrimary: true }])
    );

    // 專案顧問部 (4人)
    employees.push(
      this.createEmployee('emp-052', 'HQ-052', '吳專案', 'Paul Wu', 'male', '1979-08-15', '2014-02-01', 'active',
        '國立政治大學企管碩士', ['專案管理', 'PMP', '敏捷開發'],
        [
          { companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-007', departmentName: '專案顧問部', positionTitle: 'PMO主管', positionLevel: 'Manager', isPrimary: true },
          { companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-202', departmentName: '數位轉型部', positionTitle: '專案顧問', positionLevel: 'Advisor', isPrimary: false }
        ]),
      this.createEmployee('emp-053', 'HQ-053', '張明華', 'Michael Chang', 'male', '1984-05-28', '2016-09-01', 'active',
        '中央大學企管碩士', ['專案規劃', '資源管理', '風險評估'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-007', departmentName: '專案顧問部', positionTitle: '資深專案經理', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-054', 'HQ-054', '李雅芬', 'Fanny Lee', 'female', '1988-12-10', '2018-04-01', 'active',
        '東吳大學企管系', ['專案執行', '進度追蹤', '變更管理'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-007', departmentName: '專案顧問部', positionTitle: '專案經理', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-055', 'HQ-055', '陳志豪', 'Howard Chen', 'male', '1992-03-22', '2020-08-01', 'active',
        '淡江大學企管系', ['專案協調', '會議管理', '文件控管'],
        [{ companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-007', departmentName: '專案顧問部', positionTitle: '專案經理', positionLevel: 'Staff', isPrimary: true }])
    );

    // ============================================================
    // 科技公司員工 (45人)
    // ============================================================

    // 研發中心 (5人 - 管理層)
    employees.push(
      this.createEmployee('emp-056', 'TECH-001', '林研發', 'Richard Lin', 'male', '1978-03-25', '2015-06-01', 'active',
        '國立交通大學資訊工程博士', ['軟體架構', '機器學習', '技術策略'],
        [
          { companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '技術長', positionLevel: 'C-Level', isPrimary: true },
          { companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-006', departmentName: '資訊部', positionTitle: 'IT顧問', positionLevel: 'Advisor', isPrimary: false }
        ]),
      this.createEmployee('emp-057', 'TECH-002', '王建志', 'Ken Wang', 'male', '1982-07-18', '2016-03-01', 'active',
        '清華大學資工碩士', ['系統架構', '微服務', '雲端技術'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '首席架構師', positionLevel: 'Senior', isPrimary: true }]),
      this.createEmployee('emp-058', 'TECH-003', '陳雅玲', 'Lynn Chen', 'female', '1984-11-05', '2017-01-15', 'active',
        '成功大學資工碩士', ['技術規劃', '研發管理', '專利申請'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '技術主管', positionLevel: 'Manager', isPrimary: true }]),
      this.createEmployee('emp-059', 'TECH-004', '黃志偉', 'William Huang', 'male', '1986-04-20', '2018-06-01', 'active',
        '中央大學資工碩士', ['DevOps', 'CI/CD', '自動化'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '技術主管', positionLevel: 'Manager', isPrimary: true }]),
      this.createEmployee('emp-060', 'TECH-005', '李雅婷', 'Tina Lee', 'female', '1989-08-12', '2019-09-01', 'active',
        '台灣大學資管碩士', ['產品規劃', '需求分析', '專案管理'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-101', departmentName: '研發中心', positionTitle: '產品經理', positionLevel: 'Senior', isPrimary: true }])
    );

    // 前端開發組 (15人)
    employees.push(
      this.createEmployee('emp-061', 'TECH-006', '吳前端', 'Frank Wu', 'male', '1987-07-18', '2017-03-01', 'active',
        '國立成功大學資訊工程碩士', ['Angular', 'React', 'TypeScript', 'UI/UX'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-102', departmentName: '前端開發組', positionTitle: '前端技術主管', positionLevel: 'Manager', isPrimary: true }])
    );
    // 前端資深工程師 (4人)
    for (let i = 0; i < 4; i++) {
      const names = [
        { id: 'emp-062', no: 'TECH-007', name: '張志豪', ename: 'Jack Chang', gender: 'male' as const },
        { id: 'emp-063', no: 'TECH-008', name: '李雅琳', ename: 'Linda Lee', gender: 'female' as const },
        { id: 'emp-064', no: 'TECH-009', name: '陳俊宏', ename: 'John Chen', gender: 'male' as const },
        { id: 'emp-065', no: 'TECH-010', name: '王雅芬', ename: 'Fanny Wang', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `198${5 + i}-0${i + 3}-${10 + i}`, `201${8 + Math.floor(i / 2)}-0${(i % 6) + 1}-01`, 'active',
        '國立大學資工碩士', ['Angular', 'Vue.js', 'CSS3', 'JavaScript'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-102', departmentName: '前端開發組', positionTitle: '資深前端工程師', positionLevel: 'Senior', isPrimary: true }]));
    }
    // 前端工程師 (10人)
    for (let i = 0; i < 10; i++) {
      const names = [
        { id: 'emp-066', no: 'TECH-011', name: '周志明', ename: 'Simon Chou', gender: 'male' as const },
        { id: 'emp-067', no: 'TECH-012', name: '林雅雯', ename: 'Wendy Lin', gender: 'female' as const },
        { id: 'emp-068', no: 'TECH-013', name: '黃建志', ename: 'Ken Huang', gender: 'male' as const },
        { id: 'emp-069', no: 'TECH-014', name: '吳雅琪', ename: 'Kiki Wu', gender: 'female' as const },
        { id: 'emp-070', no: 'TECH-015', name: '蔡俊豪', ename: 'Howard Tsai', gender: 'male' as const },
        { id: 'emp-071', no: 'TECH-016', name: '許雅婷', ename: 'Tina Hsu', gender: 'female' as const },
        { id: 'emp-072', no: 'TECH-017', name: '劉志偉', ename: 'William Liu', gender: 'male' as const },
        { id: 'emp-073', no: 'TECH-018', name: '郭雅芬', ename: 'Fanny Kuo', gender: 'female' as const },
        { id: 'emp-074', no: 'TECH-019', name: '曾建宏', ename: 'Tony Tseng', gender: 'male' as const },
        { id: 'emp-075', no: 'TECH-020', name: '謝雅琳', ename: 'Linda Hsieh', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${i % 5}-0${(i % 9) + 1}-${10 + i}`, `202${i % 3}-0${(i % 6) + 1}-15`, 'active',
        '私立大學資工系', ['HTML5', 'CSS3', 'JavaScript', 'React'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-102', departmentName: '前端開發組', positionTitle: '前端工程師', positionLevel: 'Staff', isPrimary: true }]));
    }

    // 後端開發組 (15人)
    employees.push(
      this.createEmployee('emp-076', 'TECH-021', '鄭後端', 'Jeff Cheng', 'male', '1985-09-22', '2016-08-01', 'active',
        '國立清華大學資工碩士', ['Java', 'Spring Boot', 'Microservices'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-103', departmentName: '後端開發組', positionTitle: '後端技術主管', positionLevel: 'Manager', isPrimary: true }])
    );
    // 後端資深工程師 (4人)
    for (let i = 0; i < 4; i++) {
      const names = [
        { id: 'emp-077', no: 'TECH-022', name: '何志明', ename: 'Simon Ho', gender: 'male' as const },
        { id: 'emp-078', no: 'TECH-023', name: '趙雅玲', ename: 'Ling Chao', gender: 'female' as const },
        { id: 'emp-079', no: 'TECH-024', name: '馬建志', ename: 'Ken Ma', gender: 'male' as const },
        { id: 'emp-080', no: 'TECH-025', name: '孫雅婷', ename: 'Tina Sun', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `198${6 + i}-0${i + 4}-${15 + i}`, `201${7 + Math.floor(i / 2)}-0${(i % 6) + 3}-01`, 'active',
        '國立大學資工碩士', ['Node.js', 'Python', 'PostgreSQL', 'Redis'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-103', departmentName: '後端開發組', positionTitle: '資深後端工程師', positionLevel: 'Senior', isPrimary: true }]));
    }
    // 後端工程師 (10人)
    for (let i = 0; i < 10; i++) {
      const names = [
        { id: 'emp-081', no: 'TECH-026', name: '錢志豪', ename: 'Jack Chien', gender: 'male' as const },
        { id: 'emp-082', no: 'TECH-027', name: '朱雅芬', ename: 'Fanny Chu', gender: 'female' as const },
        { id: 'emp-083', no: 'TECH-028', name: '潘俊宏', ename: 'Tony Pan', gender: 'male' as const },
        { id: 'emp-084', no: 'TECH-029', name: '葉雅琳', ename: 'Linda Yeh', gender: 'female' as const },
        { id: 'emp-085', no: 'TECH-030', name: '董建志', ename: 'Ken Tung', gender: 'male' as const },
        { id: 'emp-086', no: 'TECH-031', name: '梁雅雯', ename: 'Wendy Liang', gender: 'female' as const },
        { id: 'emp-087', no: 'TECH-032', name: '韓志偉', ename: 'William Han', gender: 'male' as const },
        { id: 'emp-088', no: 'TECH-033', name: '姚雅琪', ename: 'Kiki Yao', gender: 'female' as const },
        { id: 'emp-089', no: 'TECH-034', name: '蕭俊豪', ename: 'Howard Hsiao', gender: 'male' as const },
        { id: 'emp-090', no: 'TECH-035', name: '嚴雅婷', ename: 'Tina Yen', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${1 + i % 5}-0${(i % 9) + 1}-${5 + i}`, `202${i % 3}-0${(i % 6) + 4}-01`, 'active',
        '私立大學資工系', ['Java', 'MySQL', 'Docker', 'AWS'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-103', departmentName: '後端開發組', positionTitle: '後端工程師', positionLevel: 'Staff', isPrimary: true }]));
    }

    // 品質保證部 (10人)
    employees.push(
      this.createEmployee('emp-091', 'TECH-036', '周品管', 'Peter Chou', 'male', '1984-02-28', '2016-05-01', 'active',
        '國立中央大學資工碩士', ['測試策略', '自動化測試', 'Selenium'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-104', departmentName: '品質保證部', positionTitle: 'QA主管', positionLevel: 'Manager', isPrimary: true }])
    );
    // QA 資深工程師 (3人)
    for (let i = 0; i < 3; i++) {
      const names = [
        { id: 'emp-092', no: 'TECH-037', name: '蔡雅玲', ename: 'Ling Tsai', gender: 'female' as const },
        { id: 'emp-093', no: 'TECH-038', name: '范志明', ename: 'Simon Fan', gender: 'male' as const },
        { id: 'emp-094', no: 'TECH-039', name: '龔雅婷', ename: 'Tina Kung', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `198${7 + i}-0${i + 5}-${12 + i}`, `201${8 + i}-0${(i % 6) + 2}-01`, 'active',
        '國立大學資工系', ['TestNG', 'JUnit', 'API Testing', 'Performance Testing'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-104', departmentName: '品質保證部', positionTitle: '資深QA工程師', positionLevel: 'Senior', isPrimary: true }]));
    }
    // QA 工程師 (6人)
    for (let i = 0; i < 6; i++) {
      const names = [
        { id: 'emp-095', no: 'TECH-040', name: '簡志豪', ename: 'Jack Chien', gender: 'male' as const },
        { id: 'emp-096', no: 'TECH-041', name: '魏雅芬', ename: 'Fanny Wei', gender: 'female' as const },
        { id: 'emp-097', no: 'TECH-042', name: '崔俊宏', ename: 'Tony Tsui', gender: 'male' as const },
        { id: 'emp-098', no: 'TECH-043', name: '盧雅琳', ename: 'Linda Lu', gender: 'female' as const },
        { id: 'emp-099', no: 'TECH-044', name: '施建志', ename: 'Ken Shih', gender: 'male' as const },
        { id: 'emp-100', no: 'TECH-045', name: '鍾雅雯', ename: 'Wendy Chung', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${2 + i % 4}-0${(i % 9) + 1}-${8 + i}`, `202${i % 3}-0${(i % 6) + 5}-15`, 'active',
        '私立大學資工系', ['Manual Testing', 'Bug Tracking', 'Test Cases', 'Regression Testing'],
        [{ companyId: 'comp-002', companyName: 'Bombus 科技股份有限公司', departmentId: 'dept-104', departmentName: '品質保證部', positionTitle: 'QA工程師', positionLevel: 'Staff', isPrimary: true }]));
    }

    // ============================================================
    // 顧問公司員工 (28人)
    // ============================================================

    // 管理顧問部 (12人)
    employees.push(
      this.createEmployee('emp-101', 'CONSULT-001', '黃顧問', 'Helen Huang', 'female', '1980-11-05', '2018-01-10', 'active',
        '美國哈佛大學 MBA', ['策略顧問', '組織發展', '變革管理'],
        [
          { companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-201', departmentName: '管理顧問部', positionTitle: '資深合夥人', positionLevel: 'Partner', isPrimary: true },
          { companyId: 'comp-001', companyName: 'Bombus 集團總部', departmentId: 'dept-002', departmentName: '執行長辦公室', positionTitle: '策略顧問', positionLevel: 'Advisor', isPrimary: false }
        ])
    );
    // 資深顧問 (4人)
    for (let i = 0; i < 4; i++) {
      const names = [
        { id: 'emp-102', no: 'CONSULT-002', name: '陳策略', ename: 'Steven Chen', gender: 'male' as const },
        { id: 'emp-103', no: 'CONSULT-003', name: '林組織', ename: 'Linda Lin', gender: 'female' as const },
        { id: 'emp-104', no: 'CONSULT-004', name: '王變革', ename: 'Kevin Wang', gender: 'male' as const },
        { id: 'emp-105', no: 'CONSULT-005', name: '張診斷', ename: 'Grace Chang', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `198${2 + i}-0${i + 2}-${8 + i}`, `201${9 + Math.floor(i / 2)}-0${(i % 6) + 1}-01`, 'active',
        '國立大學企管碩士', ['策略規劃', '組織診斷', '流程優化'],
        [{ companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-201', departmentName: '管理顧問部', positionTitle: '資深顧問', positionLevel: 'Senior', isPrimary: true }]));
    }
    // 顧問 (7人)
    for (let i = 0; i < 7; i++) {
      const names = [
        { id: 'emp-106', no: 'CONSULT-006', name: '李志明', ename: 'Simon Lee', gender: 'male' as const },
        { id: 'emp-107', no: 'CONSULT-007', name: '吳雅玲', ename: 'Ling Wu', gender: 'female' as const },
        { id: 'emp-108', no: 'CONSULT-008', name: '劉建志', ename: 'Ken Liu', gender: 'male' as const },
        { id: 'emp-109', no: 'CONSULT-009', name: '周雅婷', ename: 'Tina Chou', gender: 'female' as const },
        { id: 'emp-110', no: 'CONSULT-010', name: '鄭俊豪', ename: 'Howard Cheng', gender: 'male' as const },
        { id: 'emp-111', no: 'CONSULT-011', name: '蔡雅芬', ename: 'Fanny Tsai', gender: 'female' as const },
        { id: 'emp-112', no: 'CONSULT-012', name: '許志偉', ename: 'William Hsu', gender: 'male' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${i % 5}-0${(i % 9) + 1}-${10 + i}`, `202${i % 3}-0${(i % 6) + 2}-15`, 'active',
        '私立大學企管系', ['問題分析', '方案設計', '報告撰寫'],
        [{ companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-201', departmentName: '管理顧問部', positionTitle: '顧問', positionLevel: 'Staff', isPrimary: true }]));
    }

    // 數位轉型部 (10人)
    employees.push(
      this.createEmployee('emp-113', 'CONSULT-013', '蔡數位', 'Digital Tsai', 'male', '1981-06-15', '2018-06-01', 'active',
        '國立交通大學資管碩士', ['數位策略', 'AI應用', '數據分析'],
        [{ companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-202', departmentName: '數位轉型部', positionTitle: '數位長', positionLevel: 'Director', isPrimary: true }])
    );
    // 資深顧問 (3人)
    for (let i = 0; i < 3; i++) {
      const names = [
        { id: 'emp-114', no: 'CONSULT-014', name: '陳數據', ename: 'Data Chen', gender: 'male' as const },
        { id: 'emp-115', no: 'CONSULT-015', name: '林雲端', ename: 'Cloud Lin', gender: 'female' as const },
        { id: 'emp-116', no: 'CONSULT-016', name: '王智能', ename: 'AI Wang', gender: 'male' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `198${5 + i}-0${i + 3}-${5 + i}`, `201${9 + i}-0${(i % 6) + 3}-01`, 'active',
        '國立大學資管碩士', ['數據分析', '雲端架構', 'AI/ML'],
        [{ companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-202', departmentName: '數位轉型部', positionTitle: '資深顧問', positionLevel: 'Senior', isPrimary: true }]));
    }
    // 顧問 (6人)
    for (let i = 0; i < 6; i++) {
      const names = [
        { id: 'emp-117', no: 'CONSULT-017', name: '張雅玲', ename: 'Ling Chang', gender: 'female' as const },
        { id: 'emp-118', no: 'CONSULT-018', name: '李志豪', ename: 'Jack Lee', gender: 'male' as const },
        { id: 'emp-119', no: 'CONSULT-019', name: '吳雅婷', ename: 'Tina Wu', gender: 'female' as const },
        { id: 'emp-120', no: 'CONSULT-020', name: '劉建宏', ename: 'Tony Liu', gender: 'male' as const },
        { id: 'emp-121', no: 'CONSULT-021', name: '周雅芬', ename: 'Fanny Chou', gender: 'female' as const },
        { id: 'emp-122', no: 'CONSULT-022', name: '鄭志明', ename: 'Simon Cheng', gender: 'male' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${1 + i % 5}-0${(i % 9) + 1}-${12 + i}`, `202${i % 3}-0${(i % 6) + 4}-01`, 'active',
        '私立大學資管系', ['系統導入', '流程自動化', 'RPA'],
        [{ companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-202', departmentName: '數位轉型部', positionTitle: '顧問', positionLevel: 'Staff', isPrimary: true }]));
    }

    // 客戶成功部 (6人)
    employees.push(
      this.createEmployee('emp-123', 'CONSULT-023', '許客服', 'Service Hsu', 'female', '1983-09-20', '2018-03-01', 'active',
        '國立政治大學企管碩士', ['客戶關係', '專案追蹤', '滿意度管理'],
        [{ companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-203', departmentName: '客戶成功部', positionTitle: 'CS主管', positionLevel: 'Manager', isPrimary: true }])
    );
    // 客戶經理 (5人)
    for (let i = 0; i < 5; i++) {
      const names = [
        { id: 'emp-124', no: 'CONSULT-024', name: '陳雅琳', ename: 'Linda Chen', gender: 'female' as const },
        { id: 'emp-125', no: 'CONSULT-025', name: '林志偉', ename: 'William Lin', gender: 'male' as const },
        { id: 'emp-126', no: 'CONSULT-026', name: '王雅婷', ename: 'Tina Wang', gender: 'female' as const },
        { id: 'emp-127', no: 'CONSULT-027', name: '張建志', ename: 'Ken Chang', gender: 'male' as const },
        { id: 'emp-128', no: 'CONSULT-028', name: '李雅芬', ename: 'Fanny Lee', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${i % 5}-0${(i % 9) + 1}-${8 + i}`, `202${i % 3}-0${(i % 6) + 1}-15`, 'active',
        '私立大學企管系', ['客戶溝通', '問題解決', '專案管理'],
        [{ companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-203', departmentName: '客戶成功部', positionTitle: '客戶經理', positionLevel: 'Staff', isPrimary: true }]));
    }

    // ============================================================
    // 國際公司員工 (22人)
    // ============================================================

    // 國際業務部 (6人)
    employees.push(
      this.createEmployee('emp-129', 'INTL-001', '張國際', 'Global Chang', 'male', '1979-04-15', '2020-09-01', 'active',
        '美國NYU國際商務碩士', ['國際貿易', '市場開發', '跨文化溝通'],
        [
          { companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-301', departmentName: '國際業務部', positionTitle: '業務總監', positionLevel: 'Director', isPrimary: true },
          { companyId: 'comp-003', companyName: 'Bombus 顧問有限公司', departmentId: 'dept-201', departmentName: '管理顧問部', positionTitle: '國際顧問', positionLevel: 'Advisor', isPrimary: false }
        ])
    );
    // 業務經理 (2人)
    for (let i = 0; i < 2; i++) {
      const names = [
        { id: 'emp-130', no: 'INTL-002', name: '陳東南亞', ename: 'SEA Chen', gender: 'male' as const },
        { id: 'emp-131', no: 'INTL-003', name: '林歐美', ename: 'West Lin', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `198${5 + i}-0${i + 6}-${10 + i}`, `202${1 + i}-0${(i % 6) + 1}-01`, 'active',
        '國立大學國貿系', ['市場分析', '客戶開發', '合約談判'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-301', departmentName: '國際業務部', positionTitle: '業務經理', positionLevel: 'Manager', isPrimary: true }]));
    }
    // 業務專員 (3人)
    for (let i = 0; i < 3; i++) {
      const names = [
        { id: 'emp-132', no: 'INTL-004', name: '王雅玲', ename: 'Ling Wang', gender: 'female' as const },
        { id: 'emp-133', no: 'INTL-005', name: '李志豪', ename: 'Jack Lee', gender: 'male' as const },
        { id: 'emp-134', no: 'INTL-006', name: '張雅婷', ename: 'Tina Chang', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${2 + i}-0${(i % 9) + 1}-${15 + i}`, `202${1 + i % 2}-0${(i % 6) + 3}-15`, 'active',
        '私立大學國貿系', ['客戶服務', '訂單處理', '報價作業'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-301', departmentName: '國際業務部', positionTitle: '業務專員', positionLevel: 'Staff', isPrimary: true }]));
    }

    // 貿易部 (6人)
    employees.push(
      this.createEmployee('emp-135', 'INTL-007', '李貿易', 'Trade Lee', 'male', '1982-08-25', '2020-10-01', 'active',
        '國立政治大學國貿碩士', ['進出口', '報關', '物流'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-302', departmentName: '貿易部', positionTitle: '貿易主管', positionLevel: 'Manager', isPrimary: true }])
    );
    // 貿易專員 (5人)
    for (let i = 0; i < 5; i++) {
      const names = [
        { id: 'emp-136', no: 'INTL-008', name: '陳報關', ename: 'Customs Chen', gender: 'male' as const },
        { id: 'emp-137', no: 'INTL-009', name: '林物流', ename: 'Logistics Lin', gender: 'female' as const },
        { id: 'emp-138', no: 'INTL-010', name: '王船運', ename: 'Shipping Wang', gender: 'male' as const },
        { id: 'emp-139', no: 'INTL-011', name: '張空運', ename: 'Air Chang', gender: 'female' as const },
        { id: 'emp-140', no: 'INTL-012', name: '李倉儲', ename: 'Warehouse Lee', gender: 'male' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${i % 5}-0${(i % 9) + 1}-${10 + i}`, `202${1 + i % 2}-0${(i % 6) + 2}-01`, 'active',
        '私立大學國貿系', ['報關作業', '物流協調', '文件處理'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-302', departmentName: '貿易部', positionTitle: '貿易專員', positionLevel: 'Staff', isPrimary: true }]));
    }

    // 海外行銷部 (6人)
    employees.push(
      this.createEmployee('emp-141', 'INTL-013', '王行銷', 'Marketing Wang', 'female', '1984-05-18', '2020-11-01', 'active',
        '國立台灣大學行銷碩士', ['品牌行銷', '數位行銷', '展會規劃'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-303', departmentName: '海外行銷部', positionTitle: '行銷主管', positionLevel: 'Manager', isPrimary: true }])
    );
    // 行銷專員 (5人)
    for (let i = 0; i < 5; i++) {
      const names = [
        { id: 'emp-142', no: 'INTL-014', name: '陳社群', ename: 'Social Chen', gender: 'female' as const },
        { id: 'emp-143', no: 'INTL-015', name: '林內容', ename: 'Content Lin', gender: 'male' as const },
        { id: 'emp-144', no: 'INTL-016', name: '王設計', ename: 'Design Wang', gender: 'female' as const },
        { id: 'emp-145', no: 'INTL-017', name: '張廣告', ename: 'Ads Chang', gender: 'male' as const },
        { id: 'emp-146', no: 'INTL-018', name: '李活動', ename: 'Event Lee', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${1 + i % 5}-0${(i % 9) + 1}-${8 + i}`, `202${1 + i % 2}-0${(i % 6) + 4}-15`, 'active',
        '私立大學行銷系', ['社群經營', '內容製作', '廣告投放'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-303', departmentName: '海外行銷部', positionTitle: '行銷專員', positionLevel: 'Staff', isPrimary: true }]));
    }

    // 行政支援部 (4人)
    employees.push(
      this.createEmployee('emp-147', 'INTL-019', '陳行政', 'Admin Chen', 'female', '1985-12-10', '2020-09-15', 'active',
        '私立大學企管系', ['行政管理', '總務規劃', '庶務處理'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-304', departmentName: '行政支援部', positionTitle: '行政主管', positionLevel: 'Manager', isPrimary: true }])
    );
    // 行政人員 (3人)
    for (let i = 0; i < 3; i++) {
      const names = [
        { id: 'emp-148', no: 'INTL-020', name: '林總務', ename: 'General Lin', gender: 'male' as const },
        { id: 'emp-149', no: 'INTL-021', name: '王文書', ename: 'Doc Wang', gender: 'female' as const },
        { id: 'emp-150', no: 'INTL-022', name: '張櫃台', ename: 'Front Chang', gender: 'female' as const }
      ];
      employees.push(this.createEmployee(names[i].id, names[i].no, names[i].name, names[i].ename, names[i].gender,
        `199${3 + i}-0${(i % 9) + 1}-${12 + i}`, `202${1 + i % 2}-0${(i % 6) + 5}-01`, 'active',
        '私立大學企管系', ['文書處理', '檔案管理', '接待服務'],
        [{ companyId: 'comp-004', companyName: 'Bombus 國際有限公司', departmentId: 'dept-304', departmentName: '行政支援部', positionTitle: '行政專員', positionLevel: 'Staff', isPrimary: true }]));
    }

    return employees;
  }

  // 輔助方法：創建員工
  private createEmployee(
    id: string, employeeNo: string, name: string, englishName: string,
    gender: 'male' | 'female', birthDate: string, hireDate: string,
    status: 'active' | 'on_leave' | 'resigned' | 'probation',
    education: string, skills: string[],
    positions: Array<{
      companyId: string; companyName: string; departmentId: string;
      departmentName: string; positionTitle: string; positionLevel: string; isPrimary: boolean;
    }>
  ): Employee {
    return {
      id,
      employeeNo,
      name,
      englishName,
      email: `${englishName.toLowerCase().replace(' ', '.')}@bombus.com`,
      phone: '02-2345-6789',
      mobile: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      gender,
      birthDate: new Date(birthDate),
      hireDate: new Date(hireDate),
      status,
      education,
      skills,
      positions: positions.map((p, idx) => ({
        id: `${id}-pos-${idx + 1}`,
        ...p,
        startDate: new Date(hireDate)
      }))
    };
  }

  private mockCollaborations: DepartmentCollaboration[] = [
    {
      id: 'collab-001',
      sourceDepartmentId: 'dept-003',
      targetDepartmentId: 'dept-004',
      relationType: 'parallel',
      workflowDescription: '薪資計算與發放流程',
      communicationChannel: '每月薪資會議',
      frequency: 'monthly'
    },
    {
      id: 'collab-002',
      sourceDepartmentId: 'dept-003',
      targetDepartmentId: 'dept-005',
      relationType: 'downstream',
      workflowDescription: '新進人員帳號開通',
      communicationChannel: 'IT 服務單系統',
      frequency: 'as_needed'
    },
    {
      id: 'collab-003',
      sourceDepartmentId: 'dept-102',
      targetDepartmentId: 'dept-103',
      relationType: 'parallel',
      workflowDescription: 'API 介接與前後端整合',
      communicationChannel: '每日站立會議',
      frequency: 'daily'
    },
    {
      id: 'collab-004',
      sourceDepartmentId: 'dept-103',
      targetDepartmentId: 'dept-104',
      relationType: 'downstream',
      workflowDescription: '功能開發完成後送測',
      communicationChannel: 'JIRA 工單系統',
      frequency: 'daily'
    },
    {
      id: 'collab-005',
      sourceDepartmentId: 'dept-201',
      targetDepartmentId: 'dept-202',
      relationType: 'parallel',
      workflowDescription: '顧問專案協作',
      communicationChannel: '專案週會',
      frequency: 'weekly'
    }
  ];

  // ============================================================
  // 公司相關 API
  // ============================================================

  getCompanies(): Observable<Company[]> {
    return of(this.mockCompanies).pipe(delay(300));
  }

  getCompanyById(id: string): Observable<Company | undefined> {
    return of(this.mockCompanies.find(c => c.id === id)).pipe(delay(200));
  }

  getSubsidiaries(parentId: string): Observable<Company[]> {
    return of(this.mockCompanies.filter(c => c.parentCompanyId === parentId)).pipe(delay(200));
  }

  getHeadquarters(): Observable<Company | undefined> {
    return of(this.mockCompanies.find(c => c.type === 'headquarters')).pipe(delay(200));
  }

  // ============================================================
  // 部門相關 API
  // ============================================================

  getDepartments(): Observable<Department[]> {
    return of(this.mockDepartments).pipe(delay(300));
  }

  getDepartmentsByCompany(companyId: string): Observable<Department[]> {
    return of(this.mockDepartments.filter(d => d.companyId === companyId)).pipe(delay(200));
  }

  getDepartmentById(id: string): Observable<Department | undefined> {
    return of(this.mockDepartments.find(d => d.id === id)).pipe(delay(200));
  }

  getDepartmentCollaborations(companyId?: string): Observable<DepartmentCollaboration[]> {
    if (companyId) {
      const deptIds = this.mockDepartments
        .filter(d => d.companyId === companyId)
        .map(d => d.id);
      return of(this.mockCollaborations.filter(
        c => deptIds.includes(c.sourceDepartmentId) || deptIds.includes(c.targetDepartmentId)
      )).pipe(delay(200));
    }
    return of(this.mockCollaborations).pipe(delay(200));
  }

  // ============================================================
  // 員工相關 API
  // ============================================================

  getEmployees(): Observable<Employee[]> {
    return of(this.mockEmployees).pipe(delay(300));
  }

  getEmployeesByCompany(companyId: string): Observable<Employee[]> {
    return of(this.mockEmployees.filter(
      e => e.positions.some(p => p.companyId === companyId)
    )).pipe(delay(200));
  }

  getEmployeesByDepartment(departmentId: string): Observable<Employee[]> {
    return of(this.mockEmployees.filter(
      e => e.positions.some(p => p.departmentId === departmentId)
    )).pipe(delay(200));
  }

  getEmployeeById(id: string): Observable<Employee | undefined> {
    return of(this.mockEmployees.find(e => e.id === id)).pipe(delay(200));
  }

  getCrossCompanyEmployees(): Observable<Employee[]> {
    return of(this.mockEmployees.filter(e => {
      const uniqueCompanies = new Set(e.positions.map(p => p.companyId));
      return uniqueCompanies.size > 1;
    })).pipe(delay(200));
  }

  // ============================================================
  // 統計相關 API
  // ============================================================

  getOrganizationStats(): Observable<OrganizationStats> {
    const crossCompanyCount = this.mockEmployees.filter(e => {
      const uniqueCompanies = new Set(e.positions.map(p => p.companyId));
      return uniqueCompanies.size > 1;
    }).length;

    // 計算各公司員工總數（使用 company.employeeCount）
    const totalEmployeeCount = this.mockCompanies.reduce(
      (sum, company) => sum + company.employeeCount, 0
    );

    return of({
      totalCompanies: this.mockCompanies.length,
      totalDepartments: this.mockDepartments.length,
      totalEmployees: totalEmployeeCount,
      activeEmployees: totalEmployeeCount, // 假設所有員工都是在職狀態
      crossCompanyEmployees: crossCompanyCount,
      departmentCollaborations: this.mockCollaborations.length
    }).pipe(delay(200));
  }

  getCompanyStats(companyId: string): Observable<CompanyStats> {
    const departments = this.mockDepartments.filter(d => d.companyId === companyId);
    const employees = this.mockEmployees.filter(
      e => e.positions.some(p => p.companyId === companyId)
    );

    return of({
      companyId,
      departmentCount: departments.length,
      employeeCount: employees.length,
      managerCount: departments.filter(d => d.managerId).length,
      avgTenure: 3.5 // Mock value
    }).pipe(delay(200));
  }

  // ============================================================
  // 公司 CRUD API
  // ============================================================

  createCompany(company: Omit<Company, 'id'>): Observable<Company> {
    const newCompany: Company = {
      ...company,
      id: `comp-${Date.now()}`
    };
    this.mockCompanies.push(newCompany);
    return of(newCompany).pipe(delay(300));
  }

  updateCompany(id: string, updates: Partial<Company>): Observable<Company | null> {
    const index = this.mockCompanies.findIndex(c => c.id === id);
    if (index === -1) return of(null).pipe(delay(300));

    this.mockCompanies[index] = { ...this.mockCompanies[index], ...updates };
    return of(this.mockCompanies[index]).pipe(delay(300));
  }

  deleteCompany(id: string): Observable<{ success: boolean; message: string }> {
    // Check if has subsidiaries
    const hasSubsidiaries = this.mockCompanies.some(c => c.parentCompanyId === id);
    if (hasSubsidiaries) {
      return of({ success: false, message: '無法刪除：請先刪除所有子公司' }).pipe(delay(300));
    }

    // Check if has departments
    const hasDepartments = this.mockDepartments.some(d => d.companyId === id);
    if (hasDepartments) {
      return of({ success: false, message: '無法刪除：請先刪除該公司所有部門' }).pipe(delay(300));
    }

    const index = this.mockCompanies.findIndex(c => c.id === id);
    if (index === -1) {
      return of({ success: false, message: '找不到該公司' }).pipe(delay(300));
    }

    this.mockCompanies.splice(index, 1);
    return of({ success: true, message: '公司已成功刪除' }).pipe(delay(300));
  }

  // ============================================================
  // 部門 CRUD API
  // ============================================================

  createDepartment(department: Omit<Department, 'id'>): Observable<Department> {
    const newDepartment: Department = {
      ...department,
      id: `dept-${Date.now()}`
    };
    this.mockDepartments.push(newDepartment);

    // Update company department count
    const company = this.mockCompanies.find(c => c.id === department.companyId);
    if (company) {
      company.departmentCount++;
    }

    return of(newDepartment).pipe(delay(300));
  }

  updateDepartment(id: string, updates: Partial<Department>): Observable<Department | null> {
    const index = this.mockDepartments.findIndex(d => d.id === id);
    if (index === -1) return of(null).pipe(delay(300));

    this.mockDepartments[index] = { ...this.mockDepartments[index], ...updates };
    return of(this.mockDepartments[index]).pipe(delay(300));
  }

  deleteDepartment(id: string): Observable<{ success: boolean; message: string }> {
    // Check if has child departments
    const hasChildren = this.mockDepartments.some(d => d.parentDepartmentId === id);
    if (hasChildren) {
      return of({ success: false, message: '無法刪除：請先刪除所有下屬部門' }).pipe(delay(300));
    }

    const department = this.mockDepartments.find(d => d.id === id);
    if (!department) {
      return of({ success: false, message: '找不到該部門' }).pipe(delay(300));
    }

    // Check if has employees
    if (department.employeeCount > 0) {
      return of({ success: false, message: '無法刪除：該部門仍有員工，請先調動或刪除員工' }).pipe(delay(300));
    }

    const index = this.mockDepartments.findIndex(d => d.id === id);
    this.mockDepartments.splice(index, 1);

    // Update company department count
    const company = this.mockCompanies.find(c => c.id === department.companyId);
    if (company) {
      company.departmentCount--;
    }

    return of({ success: true, message: '部門已成功刪除' }).pipe(delay(300));
  }
}

