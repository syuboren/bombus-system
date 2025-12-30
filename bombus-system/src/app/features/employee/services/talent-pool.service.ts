import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  TalentCandidate,
  TalentContactHistory,
  TalentReminder,
  TalentMatchResult,
  TalentPoolStats,
  TalentTag
} from '../models/talent-pool.model';

@Injectable({
  providedIn: 'root'
})
export class TalentPoolService {

  // ===== Mock Data =====

  private mockTags: TalentTag[] = [
    { id: '1', name: 'React', color: '#61DAFB', category: 'skill' },
    { id: '2', name: 'Angular', color: '#DD0031', category: 'skill' },
    { id: '3', name: 'Python', color: '#3776AB', category: 'skill' },
    { id: '4', name: '5年以上經驗', color: '#8DA399', category: 'experience' },
    { id: '5', name: '碩士學歷', color: '#7F9CA0', category: 'education' },
    { id: '6', name: '領導力強', color: '#9A8C98', category: 'personality' },
    { id: '7', name: '高潛力', color: '#D6A28C', category: 'custom' },
    { id: '8', name: 'Java', color: '#007396', category: 'skill' },
    { id: '9', name: 'AWS', color: '#FF9900', category: 'skill' },
    { id: '10', name: '溝通能力佳', color: '#B87D7B', category: 'personality' }
  ];

  private mockCandidates: TalentCandidate[] = [
    { id: '1', name: '陳建宏', email: 'chen.jh@email.com', phone: '0912-345-678', currentPosition: '資深前端工程師', currentCompany: 'ABC科技', experience: 6, education: '國立台灣大學 資訊工程碩士', expectedSalary: '80,000-100,000', source: '104' as const, status: 'active' as const, tags: [this.mockTags[1], this.mockTags[3], this.mockTags[6]], skills: ['Angular', 'TypeScript', 'RxJS', 'SCSS'], matchScore: 92, addedDate: new Date('2024-11-15'), lastContactDate: new Date('2024-12-10'), nextContactDate: new Date('2025-01-05'), contactPriority: 'high' as const, notes: '對我們公司文化很感興趣，技術能力優秀' },
    { id: '2', name: '林雅婷', email: 'lin.yt@email.com', phone: '0923-456-789', currentPosition: '全端工程師', currentCompany: 'XYZ軟體', experience: 4, education: '國立清華大學 資訊工程學士', expectedSalary: '65,000-80,000', source: 'linkedin' as const, status: 'contacted' as const, tags: [this.mockTags[0], this.mockTags[7], this.mockTags[9]], skills: ['React', 'Node.js', 'Java', 'PostgreSQL'], matchScore: 85, addedDate: new Date('2024-10-20'), lastContactDate: new Date('2024-12-18'), nextContactDate: new Date('2025-01-10'), contactPriority: 'high' as const, notes: '已安排初步電話訪談' },
    { id: '3', name: '王志明', email: 'wang.zm@email.com', phone: '0934-567-890', currentPosition: '後端架構師', currentCompany: '雲端服務公司', experience: 8, education: '國立交通大學 資訊科學碩士', source: 'referral' as const, status: 'scheduled' as const, tags: [this.mockTags[2], this.mockTags[8], this.mockTags[3], this.mockTags[5]], skills: ['Python', 'AWS', 'Kubernetes', 'Microservices'], matchScore: 88, addedDate: new Date('2024-09-05'), lastContactDate: new Date('2024-12-20'), nextContactDate: new Date('2025-01-08'), contactPriority: 'medium' as const, notes: '已安排面試，1/8 下午 2:00' },
    { id: '4', name: '張美玲', email: 'zhang.ml@email.com', phone: '0945-678-901', currentPosition: 'UI/UX 設計師', currentCompany: '設計工作室', experience: 5, education: '實踐大學 工業設計碩士', source: 'website' as const, status: 'active' as const, tags: [this.mockTags[3], this.mockTags[9]], skills: ['Figma', 'Sketch', 'Adobe XD', 'Prototyping'], matchScore: 78, addedDate: new Date('2024-12-01'), contactPriority: 'medium' as const, notes: '作品集優秀，待確認薪資期望' },
    { id: '5', name: '李國華', email: 'li.gh@email.com', phone: '0956-789-012', currentPosition: '技術主管', currentCompany: '網路公司', experience: 10, education: '國立成功大學 資訊工程博士', source: 'headhunter' as const, status: 'contacted' as const, tags: [this.mockTags[3], this.mockTags[5], this.mockTags[6], this.mockTags[4]], skills: ['Team Management', 'System Architecture', 'Agile', 'DevOps'], matchScore: 95, addedDate: new Date('2024-11-28'), lastContactDate: new Date('2024-12-15'), contactPriority: 'high' as const, notes: '高階人才，需提供有競爭力的薪資方案' },
    { id: '6', name: '吳俊傑', email: 'wu.jj@email.com', phone: '0967-890-123', currentPosition: '資料工程師', currentCompany: '數據分析公司', experience: 3, education: '國立中央大學 資訊管理學士', source: '104' as const, status: 'declined' as const, tags: [this.mockTags[2]], skills: ['Python', 'SQL', 'Spark', 'Hadoop'], matchScore: 72, addedDate: new Date('2024-08-15'), lastContactDate: new Date('2024-10-20'), contactPriority: 'low' as const, notes: '已接受其他公司 offer' },
    { id: '7', name: '黃志豪', email: 'huang.zh@email.com', phone: '0911-111-001', currentPosition: 'iOS 工程師', currentCompany: '行動科技', experience: 5, education: '國立政治大學 資訊科學學士', source: '104' as const, status: 'active' as const, tags: [this.mockTags[3], this.mockTags[9]], skills: ['Swift', 'SwiftUI', 'Objective-C', 'Xcode'], matchScore: 82, addedDate: new Date('2024-11-20'), contactPriority: 'medium' as const, notes: '有豐富的 App Store 上架經驗' },
    { id: '8', name: '許雅琳', email: 'hsu.yl@email.com', phone: '0922-222-002', currentPosition: 'Android 工程師', currentCompany: '遊戲開發公司', experience: 4, education: '國立中興大學 資訊工程學士', source: 'linkedin' as const, status: 'active' as const, tags: [this.mockTags[7], this.mockTags[3]], skills: ['Kotlin', 'Java', 'Jetpack Compose', 'Firebase'], matchScore: 79, addedDate: new Date('2024-12-05'), contactPriority: 'medium' as const, notes: '遊戲開發背景，對互動設計有獨特見解' },
    { id: '9', name: '鄭文傑', email: 'cheng.wj@email.com', phone: '0933-333-003', currentPosition: 'DevOps 工程師', currentCompany: '雲端平台', experience: 6, education: '國立中山大學 資訊工程碩士', source: 'referral' as const, status: 'contacted' as const, tags: [this.mockTags[8], this.mockTags[3], this.mockTags[5]], skills: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform'], matchScore: 91, addedDate: new Date('2024-10-15'), lastContactDate: new Date('2024-12-22'), contactPriority: 'high' as const, notes: '自動化部署專家，有多家企業導入經驗' },
    { id: '10', name: '蔡宜君', email: 'tsai.yc@email.com', phone: '0944-444-004', currentPosition: '產品經理', currentCompany: '電商平台', experience: 7, education: '國立台北大學 企業管理碩士', source: 'headhunter' as const, status: 'scheduled' as const, tags: [this.mockTags[5], this.mockTags[9], this.mockTags[6]], skills: ['Product Strategy', 'Agile', 'User Research', 'Data Analysis'], matchScore: 87, addedDate: new Date('2024-11-10'), lastContactDate: new Date('2024-12-19'), nextContactDate: new Date('2025-01-12'), contactPriority: 'high' as const, notes: '有成功打造百萬用戶產品經驗' },
    { id: '11', name: '周俊宏', email: 'chou.jh@email.com', phone: '0955-555-005', currentPosition: 'QA 工程師', currentCompany: '軟體測試公司', experience: 4, education: '私立逢甲大學 資訊工程學士', source: '104' as const, status: 'active' as const, tags: [this.mockTags[3]], skills: ['Selenium', 'Cypress', 'JMeter', 'API Testing'], matchScore: 75, addedDate: new Date('2024-12-10'), contactPriority: 'low' as const, notes: '自動化測試經驗豐富' },
    { id: '12', name: '楊雅萍', email: 'yang.yp@email.com', phone: '0966-666-006', currentPosition: '資安工程師', currentCompany: '資安顧問公司', experience: 5, education: '國立交通大學 資訊安全碩士', source: 'linkedin' as const, status: 'active' as const, tags: [this.mockTags[3], this.mockTags[4]], skills: ['Penetration Testing', 'SOC', 'SIEM', 'ISO 27001'], matchScore: 88, addedDate: new Date('2024-11-25'), contactPriority: 'high' as const, notes: '持有 CISSP 證照，資安專業背景強' },
    { id: '13', name: '劉家豪', email: 'liu.jh@email.com', phone: '0977-777-007', currentPosition: '機器學習工程師', currentCompany: 'AI 新創', experience: 3, education: '國立台灣大學 人工智慧碩士', source: 'website' as const, status: 'contacted' as const, tags: [this.mockTags[2], this.mockTags[6]], skills: ['TensorFlow', 'PyTorch', 'NLP', 'Computer Vision'], matchScore: 90, addedDate: new Date('2024-12-08'), lastContactDate: new Date('2024-12-23'), contactPriority: 'high' as const, notes: 'AI 領域新星，發表過國際論文' },
    { id: '14', name: '謝佳蓉', email: 'hsieh.jr@email.com', phone: '0988-888-008', currentPosition: '前端工程師', currentCompany: '金融科技', experience: 2, education: '私立淡江大學 資訊工程學士', source: '104' as const, status: 'active' as const, tags: [this.mockTags[0], this.mockTags[1]], skills: ['React', 'Angular', 'Vue', 'TypeScript'], matchScore: 76, addedDate: new Date('2024-12-12'), contactPriority: 'low' as const, notes: '年輕有潛力，學習能力強' },
    { id: '15', name: '羅志成', email: 'lo.zc@email.com', phone: '0999-999-009', currentPosition: '後端工程師', currentCompany: '物流科技', experience: 4, education: '國立成功大學 資訊工程學士', source: 'referral' as const, status: 'hired' as const, tags: [this.mockTags[7], this.mockTags[3]], skills: ['Java', 'Spring Boot', 'MySQL', 'Redis'], matchScore: 84, addedDate: new Date('2024-09-20'), lastContactDate: new Date('2024-11-15'), contactPriority: 'low' as const, notes: '已成功錄用' },
    { id: '16', name: '曾雅文', email: 'tseng.yw@email.com', phone: '0911-000-010', currentPosition: '資料分析師', currentCompany: '市調公司', experience: 3, education: '國立政治大學 統計學碩士', source: 'linkedin' as const, status: 'active' as const, tags: [this.mockTags[2], this.mockTags[9]], skills: ['Python', 'R', 'Tableau', 'Power BI'], matchScore: 81, addedDate: new Date('2024-11-30'), contactPriority: 'medium' as const, notes: '數據視覺化能力出色' },
    { id: '17', name: '郭俊偉', email: 'kuo.jw@email.com', phone: '0922-111-011', currentPosition: 'SRE 工程師', currentCompany: '電信公司', experience: 6, education: '國立中央大學 資訊工程碩士', source: 'headhunter' as const, status: 'contacted' as const, tags: [this.mockTags[8], this.mockTags[3], this.mockTags[5]], skills: ['Prometheus', 'Grafana', 'Ansible', 'Linux'], matchScore: 89, addedDate: new Date('2024-10-25'), lastContactDate: new Date('2024-12-20'), contactPriority: 'high' as const, notes: '大型系統維運經驗豐富' },
    { id: '18', name: '葉怡君', email: 'yeh.yc@email.com', phone: '0933-222-012', currentPosition: '技術文件工程師', currentCompany: '軟體公司', experience: 4, education: '國立師範大學 英語教學碩士', source: 'website' as const, status: 'active' as const, tags: [this.mockTags[9]], skills: ['Technical Writing', 'API Documentation', 'Markdown', 'Git'], matchScore: 73, addedDate: new Date('2024-12-15'), contactPriority: 'low' as const, notes: '英文寫作能力佳，跨領域人才' },
    { id: '19', name: '廖家銘', email: 'liao.jm@email.com', phone: '0944-333-013', currentPosition: '區塊鏈工程師', currentCompany: '加密貨幣交易所', experience: 3, education: '國立清華大學 資訊工程碩士', source: '104' as const, status: 'declined' as const, tags: [this.mockTags[6], this.mockTags[3]], skills: ['Solidity', 'Ethereum', 'Web3.js', 'Smart Contracts'], matchScore: 85, addedDate: new Date('2024-08-10'), lastContactDate: new Date('2024-09-25'), contactPriority: 'low' as const, notes: '已接受海外 offer' },
    { id: '20', name: '傅雅琪', email: 'fu.yc@email.com', phone: '0955-444-014', currentPosition: '雲端架構師', currentCompany: '系統整合商', experience: 8, education: '國立交通大學 資訊科學博士', source: 'headhunter' as const, status: 'scheduled' as const, tags: [this.mockTags[8], this.mockTags[3], this.mockTags[4], this.mockTags[5]], skills: ['AWS', 'Azure', 'GCP', 'Multi-Cloud'], matchScore: 94, addedDate: new Date('2024-11-05'), lastContactDate: new Date('2024-12-18'), nextContactDate: new Date('2025-01-15'), contactPriority: 'high' as const, notes: '三大雲端平台認證齊全，架構設計專家' },
    { id: '21', name: '簡志豪', email: 'chien.zh@email.com', phone: '0966-555-015', currentPosition: '嵌入式工程師', currentCompany: 'IoT 公司', experience: 5, education: '國立成功大學 電機工程碩士', source: 'referral' as const, status: 'active' as const, tags: [this.mockTags[3]], skills: ['C', 'C++', 'RTOS', 'ARM'], matchScore: 77, addedDate: new Date('2024-12-02'), contactPriority: 'medium' as const, notes: '硬體軟體整合經驗豐富' },
    { id: '22', name: '蘇雅玲', email: 'su.yl@email.com', phone: '0977-666-016', currentPosition: 'Scrum Master', currentCompany: '敏捷顧問公司', experience: 6, education: '私立輔仁大學 企業管理碩士', source: 'linkedin' as const, status: 'contacted' as const, tags: [this.mockTags[5], this.mockTags[9]], skills: ['Scrum', 'Kanban', 'Jira', 'Confluence'], matchScore: 83, addedDate: new Date('2024-11-18'), lastContactDate: new Date('2024-12-21'), contactPriority: 'medium' as const, notes: '敏捷轉型教練，溝通協調能力強' },
    { id: '23', name: '魏建文', email: 'wei.jw@email.com', phone: '0988-777-017', currentPosition: '網路工程師', currentCompany: '電信設備商', experience: 7, education: '國立中山大學 資訊工程學士', source: '104' as const, status: 'active' as const, tags: [this.mockTags[3]], skills: ['Cisco', 'Juniper', 'SD-WAN', 'Network Security'], matchScore: 80, addedDate: new Date('2024-12-08'), contactPriority: 'medium' as const, notes: 'CCNP 認證，大型網路環境經驗' },
    { id: '24', name: '潘怡婷', email: 'pan.yt@email.com', phone: '0999-888-018', currentPosition: 'UI 設計師', currentCompany: '設計顧問公司', experience: 4, education: '私立實踐大學 媒體傳達設計學士', source: 'website' as const, status: 'active' as const, tags: [this.mockTags[9]], skills: ['Figma', 'Adobe CC', 'Protopie', 'Design Systems'], matchScore: 81, addedDate: new Date('2024-12-10'), contactPriority: 'medium' as const, notes: '視覺設計能力優秀，有設計系統建構經驗' },
    { id: '25', name: '范志偉', email: 'fan.zw@email.com', phone: '0911-999-019', currentPosition: '資料庫管理師', currentCompany: '金融機構', experience: 9, education: '國立台灣大學 資訊管理碩士', source: 'headhunter' as const, status: 'contacted' as const, tags: [this.mockTags[3], this.mockTags[4], this.mockTags[5]], skills: ['Oracle', 'PostgreSQL', 'MongoDB', 'Database Tuning'], matchScore: 86, addedDate: new Date('2024-10-30'), lastContactDate: new Date('2024-12-15'), contactPriority: 'high' as const, notes: '金融業核心系統經驗，資料庫效能調校專家' },
    { id: '26', name: '姚雅萱', email: 'yao.yx@email.com', phone: '0922-000-020', currentPosition: '遊戲工程師', currentCompany: '遊戲開發商', experience: 4, education: '國立交通大學 多媒體工程碩士', source: 'linkedin' as const, status: 'active' as const, tags: [this.mockTags[3], this.mockTags[6]], skills: ['Unity', 'Unreal', 'C#', 'Game Design'], matchScore: 79, addedDate: new Date('2024-11-28'), contactPriority: 'medium' as const, notes: '有上架遊戲作品，技術與創意兼具' },
    { id: '27', name: '紀俊豪', email: 'chi.jh@email.com', phone: '0933-111-021', currentPosition: 'SAP 顧問', currentCompany: '企業系統顧問', experience: 8, education: '國立政治大學 資訊管理碩士', source: 'referral' as const, status: 'scheduled' as const, tags: [this.mockTags[3], this.mockTags[4], this.mockTags[5]], skills: ['SAP ABAP', 'SAP S/4HANA', 'SAP Fiori', 'ERP'], matchScore: 84, addedDate: new Date('2024-10-20'), lastContactDate: new Date('2024-12-22'), nextContactDate: new Date('2025-01-18'), contactPriority: 'medium' as const, notes: 'SAP 認證顧問，導入專案經驗豐富' },
    { id: '28', name: '石怡君', email: 'shih.yc@email.com', phone: '0944-222-022', currentPosition: 'RPA 開發工程師', currentCompany: '流程自動化公司', experience: 3, education: '私立東海大學 資訊工程學士', source: '104' as const, status: 'active' as const, tags: [this.mockTags[3]], skills: ['UiPath', 'Automation Anywhere', 'Power Automate', 'VBA'], matchScore: 74, addedDate: new Date('2024-12-05'), contactPriority: 'low' as const, notes: 'RPA 專案執行經驗，熟悉企業流程優化' },
    { id: '29', name: '康志明', email: 'kang.zm@email.com', phone: '0955-333-023', currentPosition: '系統分析師', currentCompany: '軟體開發公司', experience: 7, education: '國立中央大學 資訊管理碩士', source: 'linkedin' as const, status: 'contacted' as const, tags: [this.mockTags[3], this.mockTags[5], this.mockTags[9]], skills: ['System Analysis', 'UML', 'Requirements Engineering', 'SQL'], matchScore: 82, addedDate: new Date('2024-11-12'), lastContactDate: new Date('2024-12-19'), contactPriority: 'medium' as const, notes: '需求分析能力強，跨部門溝通順暢' },
    { id: '30', name: '余雅芳', email: 'yu.yf@email.com', phone: '0966-444-024', currentPosition: '技術專案經理', currentCompany: '科技公司', experience: 9, education: '國立台灣科技大學 資訊管理碩士', source: 'headhunter' as const, status: 'active' as const, tags: [this.mockTags[3], this.mockTags[4], this.mockTags[5], this.mockTags[6]], skills: ['Project Management', 'Agile', 'Stakeholder Management', 'Risk Management'], matchScore: 93, addedDate: new Date('2024-11-08'), contactPriority: 'high' as const, notes: 'PMP 認證，大型專案管理經驗豐富，領導力強' }
  ];

  private mockContactHistory: TalentContactHistory[] = [
    {
      id: '1', candidateId: '1', contactDate: new Date('2024-12-10'),
      contactMethod: 'email' as const, contactBy: '人資部 王小姐',
      summary: '發送公司介紹與職缺說明信件', outcome: 'positive' as const,
      nextAction: '安排電話訪談', nextActionDate: new Date('2025-01-05')
    },
    {
      id: '2', candidateId: '2', contactDate: new Date('2024-12-18'),
      contactMethod: 'phone' as const, contactBy: '人資部 王小姐',
      summary: '電話初步溝通，確認求職意願與期望', outcome: 'positive' as const,
      nextAction: '安排主管面試', nextActionDate: new Date('2025-01-10')
    },
    {
      id: '3', candidateId: '3', contactDate: new Date('2024-12-20'),
      contactMethod: 'email' as const, contactBy: '人資部 李先生',
      summary: '發送面試邀請函', outcome: 'positive' as const,
      nextAction: '1/8 面試', nextActionDate: new Date('2025-01-08')
    },
    {
      id: '4', candidateId: '5', contactDate: new Date('2024-12-15'),
      contactMethod: 'meeting' as const, contactBy: '技術總監 張經理',
      summary: '午餐會面，討論職涯規劃與公司願景', outcome: 'positive' as const,
      nextAction: '準備正式 offer', nextActionDate: new Date('2025-01-03')
    }
  ];

  private mockReminders: TalentReminder[] = [
    {
      id: '1', candidateId: '1', candidateName: '陳建宏',
      reminderDate: new Date('2025-01-05'), reminderType: 'contact' as const,
      message: '安排電話訪談，確認技術細節與期望', isCompleted: false, assignedTo: '人資部 王小姐'
    },
    {
      id: '2', candidateId: '3', candidateName: '王志明',
      reminderDate: new Date('2025-01-08'), reminderType: 'interview' as const,
      message: '面試：1/8 下午 2:00，準備會議室與面試官', isCompleted: false, assignedTo: '人資部 李先生'
    },
    {
      id: '3', candidateId: '5', candidateName: '李國華',
      reminderDate: new Date('2025-01-03'), reminderType: 'offer' as const,
      message: '準備正式 offer，需與財務確認薪資方案', isCompleted: false, assignedTo: '人資部 陳經理'
    },
    {
      id: '4', candidateId: '2', candidateName: '林雅婷',
      reminderDate: new Date('2025-01-10'), reminderType: 'follow-up' as const,
      message: '主管面試後續追蹤', isCompleted: false, assignedTo: '人資部 王小姐'
    }
  ];

  // ===== API Methods =====

  getTalentPoolStats(): Observable<TalentPoolStats> {
    const stats: TalentPoolStats = {
      totalCandidates: this.mockCandidates.length,
      activeCount: this.mockCandidates.filter(c => c.status === 'active').length,
      contactedThisMonth: this.mockCandidates.filter(c => c.status === 'contacted').length,
      hiredThisYear: 3,
      avgMatchScore: Math.round(this.mockCandidates.reduce((sum, c) => sum + c.matchScore, 0) / this.mockCandidates.length),
      sourceBreakdown: [
        { source: '104' as const, count: 8, percentage: 27 },
        { source: 'linkedin' as const, count: 7, percentage: 23 },
        { source: 'referral' as const, count: 5, percentage: 17 },
        { source: 'website' as const, count: 4, percentage: 13 },
        { source: 'headhunter' as const, count: 6, percentage: 20 }
      ],
      statusBreakdown: [
        { status: 'active' as const, count: 15 },
        { status: 'contacted' as const, count: 7 },
        { status: 'scheduled' as const, count: 4 },
        { status: 'hired' as const, count: 1 },
        { status: 'declined' as const, count: 2 },
        { status: 'expired' as const, count: 1 }
      ],
      upcomingReminders: this.mockReminders.filter(r => !r.isCompleted).length
    };
    return of(stats).pipe(delay(300));
  }

  getCandidates(): Observable<TalentCandidate[]> {
    return of(this.mockCandidates).pipe(delay(300));
  }

  getCandidateById(id: string): Observable<TalentCandidate | undefined> {
    return of(this.mockCandidates.find(c => c.id === id)).pipe(delay(200));
  }

  getContactHistory(candidateId: string): Observable<TalentContactHistory[]> {
    return of(this.mockContactHistory.filter(h => h.candidateId === candidateId)).pipe(delay(200));
  }

  getReminders(): Observable<TalentReminder[]> {
    return of(this.mockReminders.sort((a, b) => a.reminderDate.getTime() - b.reminderDate.getTime())).pipe(delay(300));
  }

  getTags(): Observable<TalentTag[]> {
    return of(this.mockTags).pipe(delay(200));
  }

  getMatchResults(candidateId: string): Observable<TalentMatchResult[]> {
    const mockResults: TalentMatchResult[] = [
      {
        candidateId, jobId: '1', jobTitle: '資深前端工程師',
        matchScore: 92, matchReasons: ['Angular 專長符合', '5年以上經驗', '薪資範圍符合'],
        gaps: ['需加強 React 經驗'], recommendation: 'highly-recommended' as const
      },
      {
        candidateId, jobId: '2', jobTitle: '全端工程師',
        matchScore: 78, matchReasons: ['前端技術符合', '有團隊合作經驗'],
        gaps: ['後端經驗較少', '需學習 Node.js'], recommendation: 'recommended' as const
      }
    ];
    return of(mockResults).pipe(delay(300));
  }

  // Actions
  addContact(candidateId: string, contact: Partial<TalentContactHistory>): Observable<boolean> {
    return of(true).pipe(delay(300));
  }

  updateCandidateStatus(candidateId: string, status: TalentCandidate['status']): Observable<boolean> {
    return of(true).pipe(delay(300));
  }

  completeReminder(reminderId: string): Observable<boolean> {
    return of(true).pipe(delay(200));
  }
}

