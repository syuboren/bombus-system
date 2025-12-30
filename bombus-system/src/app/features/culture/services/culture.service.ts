import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  VisionMission,
  CultureStory,
  CultureSurvey,
  CultureMetric,
  EAPService,
  EAPUsageStats,
  HealthProgram,
  Award,
  AwardApplication,
  CultureDocument,
  DocumentGap,
  ComplianceRisk,
  AwardPotential,
  CultureImpactReport,
  HighlightSummary,
  ApplicationChecklist
} from '../models/culture.model';

@Injectable({
  providedIn: 'root'
})
export class CultureService {

  // ===== 6.1 企業文化手冊 =====

  getVisionMission(): Observable<VisionMission> {
    return of({
      vision: '成為亞太區最具創新力的人資科技領導者，引領企業邁向智慧人才管理新時代',
      mission: '透過科技創新與人性化設計，協助企業建立高效能、高幸福感的工作環境，實現人才與組織的共同成長',
      coreValues: [
        { id: '1', name: '創新', description: '勇於突破，持續創新', icon: 'ri-lightbulb-flash-line', behaviors: ['主動提出改善方案', '擁抱變化與新技術', '鼓勵實驗與試錯'], order: 1 },
        { id: '2', name: '誠信', description: '誠實正直，言行一致', icon: 'ri-shield-check-line', behaviors: ['信守承諾', '透明溝通', '勇於承擔責任'], order: 2 },
        { id: '3', name: '協作', description: '團隊合作，共創價值', icon: 'ri-team-line', behaviors: ['跨部門協作', '分享知識與經驗', '尊重多元觀點'], order: 3 },
        { id: '4', name: '卓越', description: '追求卓越，超越期待', icon: 'ri-trophy-line', behaviors: ['設定高標準', '持續學習成長', '交付高品質成果'], order: 4 },
        { id: '5', name: '關懷', description: '以人為本，關懷員工', icon: 'ri-heart-line', behaviors: ['傾聽員工聲音', '支持工作生活平衡', '營造包容環境'], order: 5 }
      ],
      lastUpdated: new Date('2024-01-15'),
      version: '3.0'
    }).pipe(delay(300));
  }

  getCultureStories(): Observable<CultureStory[]> {
    return of([
      { id: '1', title: '從挫折到成功：我們的創業故事', content: '十年前，三位創辦人在一間小公寓開始了這段旅程...', author: '創辦人 張志明', authorDepartment: '董事會', category: 'founder' as const, publishDate: new Date('2024-01-10'), likes: 256, views: 1520, featured: true },
      { id: '2', title: '跨部門協作的力量', content: '當研發、業務與客服攜手合作，我們完成了看似不可能的任務...', author: '王小華', authorDepartment: '研發部', category: 'teamwork' as const, publishDate: new Date('2024-03-15'), likes: 89, views: 456, featured: false },
      { id: '3', title: '客戶成功就是我們的成功', content: '那天客戶打來的感謝電話，讓我深刻體會到工作的意義...', author: '李美玲', authorDepartment: '客戶成功部', category: 'customer' as const, publishDate: new Date('2024-05-20'), likes: 124, views: 678, featured: true },
      { id: '4', title: '一個大膽的想法如何改變產品方向', content: '在一次腦力激盪會議中，新人提出的點子徹底改變了我們的產品策略...', author: '陳大文', authorDepartment: '產品部', category: 'innovation' as const, publishDate: new Date('2024-06-08'), likes: 156, views: 890, featured: false },
    ]).pipe(delay(300));
  }

  getCultureSurveys(): Observable<CultureSurvey[]> {
    return of([
      {
        id: '1', title: '2024 Q4 文化認同度調查', period: '2024 Q4', status: 'completed' as const, responseRate: 87,
        overallScore: 4.2,
        dimensions: [
          { name: '核心價值認同', score: 4.5, benchmark: 4.0, trend: 'up' as const, items: [] },
          { name: '管理信任度', score: 4.1, benchmark: 3.8, trend: 'stable' as const, items: [] },
          { name: '團隊協作', score: 4.3, benchmark: 4.0, trend: 'up' as const, items: [] },
          { name: '創新氛圍', score: 3.9, benchmark: 3.7, trend: 'up' as const, items: [] },
          { name: '職涯發展', score: 4.0, benchmark: 3.9, trend: 'stable' as const, items: [] }
        ],
        startDate: new Date('2024-12-01'), endDate: new Date('2024-12-15')
      }
    ]).pipe(delay(300));
  }

  getCultureMetrics(): Observable<CultureMetric[]> {
    return of([
      { id: '1', name: '員工淨推薦值 (eNPS)', value: 42, target: 40, unit: '', trend: 'up' as const, category: 'engagement' as const },
      { id: '2', name: '員工留任率', value: 92, target: 90, unit: '%', trend: 'stable' as const, category: 'retention' as const },
      { id: '3', name: '員工滿意度', value: 4.2, target: 4.0, unit: '/5', trend: 'up' as const, category: 'satisfaction' as const },
      { id: '4', name: '文化行為實踐率', value: 78, target: 80, unit: '%', trend: 'up' as const, category: 'behavior' as const },
      { id: '5', name: '內部轉調成功率', value: 85, target: 80, unit: '%', trend: 'up' as const, category: 'engagement' as const },
      { id: '6', name: '新人文化融入率', value: 88, target: 85, unit: '%', trend: 'stable' as const, category: 'behavior' as const }
    ]).pipe(delay(300));
  }

  // ===== 6.1 EAP =====

  getEAPServices(): Observable<EAPService[]> {
    return of([
      { id: '1', type: 'counseling' as const, name: '心理諮商', description: '專業心理師一對一諮商服務', icon: 'ri-mental-health-line', provider: '張心理諮商所', annualQuota: 6, usedQuota: 2, available: true },
      { id: '2', type: 'health' as const, name: '健康諮詢', description: '營養師、健身教練諮詢服務', icon: 'ri-heart-pulse-line', provider: '康健中心', annualQuota: 12, usedQuota: 4, available: true },
      { id: '3', type: 'legal' as const, name: '法律諮詢', description: '專業律師提供法律問題諮詢', icon: 'ri-scales-3-line', provider: '誠信法律事務所', annualQuota: 3, usedQuota: 0, available: true },
      { id: '4', type: 'financial' as const, name: '財務規劃', description: '理財顧問提供財務規劃建議', icon: 'ri-money-dollar-circle-line', provider: '富達財務顧問', annualQuota: 4, usedQuota: 1, available: true },
      { id: '5', type: 'family' as const, name: '家庭諮詢', description: '親子關係、婚姻諮詢服務', icon: 'ri-home-heart-line', provider: '家庭支持中心', annualQuota: 4, usedQuota: 0, available: true }
    ]).pipe(delay(300));
  }

  getEAPUsageStats(): Observable<EAPUsageStats> {
    return of({
      period: '2024',
      totalUsage: 342,
      serviceBreakdown: [
        { type: 'counseling' as const, count: 156, percentage: 45.6 },
        { type: 'health' as const, count: 98, percentage: 28.7 },
        { type: 'financial' as const, count: 45, percentage: 13.2 },
        { type: 'legal' as const, count: 28, percentage: 8.2 },
        { type: 'family' as const, count: 15, percentage: 4.3 }
      ],
      departmentUsage: [
        { department: '研發部', rate: 32 },
        { department: '業務部', rate: 28 },
        { department: '客服部', rate: 35 },
        { department: '行銷部', rate: 22 },
        { department: '人資部', rate: 18 }
      ],
      satisfactionScore: 4.6,
      yearOverYearChange: 15
    }).pipe(delay(300));
  }

  getHealthPrograms(): Observable<HealthProgram[]> {
    return of([
      { id: '1', name: '正念冥想工作坊', type: 'workshop' as const, description: '學習正念技巧，減輕工作壓力', schedule: new Date('2026-01-20'), capacity: 30, enrolled: 25, instructor: '李靜心老師' },
      { id: '2', name: '年度健康檢查', type: 'checkup' as const, description: '完整健康檢查套組', schedule: new Date('2026-02-15'), capacity: 100, enrolled: 78 },
      { id: '3', name: '辦公室瑜珈', type: 'fitness' as const, description: '午休時間伸展放鬆', schedule: new Date('2026-01-15'), capacity: 20, enrolled: 18, instructor: '張瑜珈教練' },
      { id: '4', name: '營養講座', type: 'nutrition' as const, description: '健康飲食與體重管理', schedule: new Date('2026-01-25'), capacity: 50, enrolled: 35, instructor: '王營養師' }
    ]).pipe(delay(300));
  }

  // ===== 6.2 獎項資料庫 =====

  getAwards(): Observable<Award[]> {
    return of([
      { id: '1', name: '亞洲最佳雇主獎', organizer: 'HR Asia', category: 'employer' as const, description: '表彰亞洲區最佳職場環境的企業', eligibility: ['員工人數50人以上', '營運滿3年'], applicationDeadline: new Date('2026-03-31'), website: 'https://hrasia.com', status: 'upcoming' as const, priority: 'high' as const, matchScore: 92, tags: ['雇主品牌', '職場環境'] },
      { id: '2', name: '國家人才發展獎', organizer: '勞動部', category: 'government' as const, description: '表彰優秀人才發展實踐企業', eligibility: ['依法投保勞保', '無重大勞資爭議'], applicationDeadline: new Date('2026-04-15'), website: 'https://ttqs.wda.gov.tw', status: 'upcoming' as const, priority: 'high' as const, matchScore: 88, tags: ['人才發展', '政府獎項'] },
      { id: '3', name: 'ESG 永續企業獎', organizer: '台灣永續能源研究基金會', category: 'sustainability' as const, description: '表彰落實 ESG 的優秀企業', eligibility: ['發布 CSR 報告書'], applicationDeadline: new Date('2026-05-01'), website: 'https://taise.org.tw', status: 'upcoming' as const, priority: 'medium' as const, matchScore: 75, tags: ['ESG', '永續發展'] },
      { id: '4', name: '幸福企業獎', organizer: '1111人力銀行', category: 'employer' as const, description: '由員工票選的幸福企業', eligibility: ['員工人數30人以上'], applicationDeadline: new Date('2026-02-28'), announcementDate: new Date('2026-05-01'), website: 'https://1111.com.tw', status: 'applying' as const, priority: 'high' as const, matchScore: 85, tags: ['員工票選', '幸福職場'] }
    ]).pipe(delay(300));
  }

  getAwardApplications(): Observable<AwardApplication[]> {
    return of([
      { id: '1', awardId: '4', awardName: '幸福企業獎', year: 2025, status: 'applying' as const, notes: '已完成初審資料', documents: ['company-profile.pdf', 'employee-survey.pdf'], assignee: '人資部 陳經理' },
      { id: '2', awardId: '1', awardName: '亞洲最佳雇主獎', year: 2024, status: 'won' as const, submittedDate: new Date('2024-03-15'), result: 'won' as const, notes: '連續第三年獲獎', documents: ['application.pdf'], assignee: '人資部 陳經理' },
      { id: '3', awardId: '2', awardName: '國家人才發展獎', year: 2024, status: 'won' as const, submittedDate: new Date('2024-04-10'), result: 'finalist' as const, notes: '進入決選', documents: ['ttqs-report.pdf'], assignee: '人資部 李專員' }
    ]).pipe(delay(300));
  }

  // ===== 6.3 文件儲存庫 =====

  getDocuments(): Observable<CultureDocument[]> {
    return of([
      { id: '1', name: '員工手冊 2024', type: 'policy' as const, category: '人事規章', description: '完整員工手冊含所有規定', filePath: '/docs/handbook.pdf', fileSize: 2500000, fileFormat: 'pdf', version: '3.2', status: 'active' as const, tags: ['人事', '規章'], uploadedBy: '人資部', uploadedDate: new Date('2024-01-05'), lastModified: new Date('2024-06-15'), accessLevel: 'internal' as const },
      { id: '2', name: 'TTQS 認證證書', type: 'certificate' as const, category: '認證', description: '2024年度 TTQS 金牌認證', filePath: '/docs/ttqs-cert.pdf', fileSize: 500000, fileFormat: 'pdf', version: '1.0', status: 'active' as const, tags: ['TTQS', '認證'], uploadedBy: '人資部', uploadedDate: new Date('2024-08-20'), expiryDate: new Date('2027-08-19'), lastModified: new Date('2024-08-20'), accessLevel: 'public' as const },
      { id: '3', name: '年度培訓計畫', type: 'training' as const, category: '培訓', description: '2025年度完整培訓計畫', filePath: '/docs/training-plan.xlsx', fileSize: 1200000, fileFormat: 'xlsx', version: '1.0', status: 'active' as const, tags: ['培訓', '年度計畫'], uploadedBy: '培訓組', uploadedDate: new Date('2024-12-01'), lastModified: new Date('2024-12-15'), accessLevel: 'internal' as const },
      { id: '4', name: 'ISO 27001 證書', type: 'certificate' as const, category: '認證', description: '資訊安全管理系統認證', filePath: '/docs/iso27001.pdf', fileSize: 450000, fileFormat: 'pdf', version: '1.0', status: 'active' as const, tags: ['ISO', '資安'], uploadedBy: '資訊部', uploadedDate: new Date('2024-03-10'), expiryDate: new Date('2027-03-09'), lastModified: new Date('2024-03-10'), accessLevel: 'public' as const }
    ]).pipe(delay(300));
  }

  // ===== 6.5 智慧文件分析 =====

  getDocumentGaps(): Observable<DocumentGap[]> {
    return of([
      { id: '1', category: '法規遵循', requiredDocument: '性騷擾防治辦法', status: 'missing' as const, severity: 'high' as const, responsiblePerson: '人資部 王經理', dueDate: new Date('2026-01-31'), recommendation: '依性別工作平等法第13條，應訂定性騷擾防治措施並公開揭示' },
      { id: '2', category: '認證文件', requiredDocument: 'ISO 14001 環境管理', status: 'expired' as const, severity: 'medium' as const, responsiblePerson: '品管部 李主任', dueDate: new Date('2026-02-15'), recommendation: '證書已過期3個月，建議盡速安排續證審核' },
      { id: '3', category: '培訓紀錄', requiredDocument: '新人訓練簽到表 (2024 Q3)', status: 'incomplete' as const, severity: 'medium' as const, responsiblePerson: '培訓組 陳專員', dueDate: new Date('2026-01-20'), recommendation: '部分員工簽名遺漏，需補齊' }
    ]).pipe(delay(300));
  }

  getComplianceRisks(): Observable<ComplianceRisk[]> {
    return of([
      { id: '1', area: '勞動法規', description: '加班時數超標預警 - 研發部3位同仁', riskLevel: 'high' as const, relatedDocuments: ['出勤紀錄'], actionRequired: '立即與主管討論工作分配', deadline: new Date('2026-01-15'), status: 'open' as const },
      { id: '2', area: '個資保護', description: '員工個資同意書即將到期', riskLevel: 'medium' as const, relatedDocuments: ['個資同意書'], actionRequired: '發送續簽通知給相關員工', deadline: new Date('2026-02-01'), status: 'in-progress' as const },
      { id: '3', area: '職安衛生', description: '年度消防演練尚未執行', riskLevel: 'medium' as const, relatedDocuments: ['消防演練計畫'], actionRequired: '安排消防演練並留存紀錄', deadline: new Date('2026-01-31'), status: 'open' as const }
    ]).pipe(delay(300));
  }

  // ===== 6.6 影響力評估 =====

  getAwardPotentials(): Observable<AwardPotential[]> {
    return of([
      { awardId: '1', awardName: '亞洲最佳雇主獎', potentialScore: 92, strengths: ['員工滿意度高', '完善培訓體系', '優秀留任率'], gaps: ['國際化程度待加強'], recommendedActions: ['加強英文培訓', '參與國際交流'], estimatedEffort: 'low' as const, successProbability: 85 },
      { awardId: '2', awardName: '國家人才發展獎', potentialScore: 88, strengths: ['TTQS 金牌認證', '完整培訓紀錄', '量化成效數據'], gaps: ['需更多創新案例'], recommendedActions: ['整理創新培訓案例', '準備量化成效報告'], estimatedEffort: 'medium' as const, successProbability: 75 },
      { awardId: '3', awardName: 'ESG 永續企業獎', potentialScore: 75, strengths: ['員工關懷措施', 'EAP 計畫'], gaps: ['缺少正式 CSR 報告', '環境面資料不足'], recommendedActions: ['編製 CSR 報告書', '導入碳排放計算'], estimatedEffort: 'high' as const, successProbability: 60 }
    ]).pipe(delay(300));
  }

  getCultureImpactReport(): Observable<CultureImpactReport> {
    return of({
      period: '2024',
      overallImpactScore: 82,
      dimensions: [
        { name: '績效提升', score: 85, impact: '培訓後平均績效提升 15%', metrics: [] },
        { name: '人才留任', score: 88, impact: '關鍵人才留任率達 95%', metrics: [] },
        { name: '文化認同', score: 78, impact: '員工 eNPS 提升 8 分', metrics: [] },
        { name: '營運效益', score: 80, impact: '人均產值提升 12%', metrics: [] }
      ],
      eapImpact: {
        usageRate: 28,
        productivityImprovement: 8,
        turnoverReduction: 15,
        roi: 320
      },
      recommendations: [
        '持續投資 EAP 計畫，擴大心理諮商服務',
        '加強主管管理培訓，提升管理信任度',
        '推動創新文化活動，提升創新氛圍分數'
      ],
      generatedDate: new Date()
    }).pipe(delay(300));
  }

  getHighlightSummary(): Observable<HighlightSummary> {
    return of({
      id: '1',
      title: '2024 年度人資成果亮點',
      period: '2024',
      highlights: [
        { category: '人才發展', title: 'TTQS 金牌認證', description: '連續三年獲得金牌認證，培訓體系獲國家肯定', metrics: [{ label: '培訓時數', value: '32,000 小時' }, { label: '培訓滿意度', value: '4.6/5' }], sourceModule: 'L3' },
        { category: '員工關懷', title: 'EAP 服務擴展', description: '新增財務與法律諮詢服務，服務使用率提升 25%', metrics: [{ label: '使用人次', value: '342 人次' }, { label: '滿意度', value: '4.6/5' }], sourceModule: 'L6' },
        { category: '績效管理', title: 'OKR 導入成功', description: '全公司導入 OKR 制度，目標達成率提升 18%', metrics: [{ label: '目標達成率', value: '87%' }, { label: '員工認同度', value: '82%' }], sourceModule: 'L5' }
      ],
      generatedDate: new Date(),
      exportFormats: ['ppt', 'pdf', 'word']
    }).pipe(delay(300));
  }

  // ===== 6.4 AI 申請助理 =====

  getApplicationChecklist(awardId: string): Observable<ApplicationChecklist> {
    return of({
      id: '1',
      awardId: awardId,
      awardName: '亞洲最佳雇主獎',
      items: [
        { id: '1', category: '基本資料', requirement: '公司簡介 (英文)', status: 'completed' as const, sourceModule: 'L1', autoFilled: true, value: '已自動帶入', documents: ['company-profile-en.pdf'], notes: '' },
        { id: '2', category: '基本資料', requirement: '組織架構圖', status: 'completed' as const, sourceModule: 'L1', autoFilled: true, value: '已自動帶入', documents: ['org-chart.pdf'], notes: '' },
        { id: '3', category: '人才發展', requirement: '培訓計畫與成效', status: 'in-progress' as const, sourceModule: 'L3', autoFilled: true, value: '培訓時數 32,000 hr', documents: [], notes: '需補充培訓ROI數據' },
        { id: '4', category: '人才發展', requirement: '職涯發展制度', status: 'pending' as const, sourceModule: 'L2', autoFilled: false, documents: [], notes: '' },
        { id: '5', category: '員工關懷', requirement: 'EAP 計畫說明', status: 'completed' as const, sourceModule: 'L6', autoFilled: true, value: '完整 EAP 服務', documents: ['eap-intro.pdf'], notes: '' },
        { id: '6', category: '績效管理', requirement: '績效制度說明', status: 'pending' as const, sourceModule: 'L5', autoFilled: false, documents: [], notes: '' }
      ],
      completionRate: 50,
      generatedDate: new Date()
    }).pipe(delay(300));
  }
}

