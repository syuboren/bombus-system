import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Project,
  ProjectStats,
  ProjectDetail,
  ProjectFilter,
  Task,
  TaskDetail,
  ProjectRanking,
  PerformanceAlert,
  OKRAnalysis,
  ProfitPrediction,
  CreateProjectForm,
  TeamMember,
  CostItem,
  OKRContribution,
  TeamContribution,
  VarianceAlert,
  ForecastProject,
  ForecastStageDefinition,
  ForecastSummary,
  ForecastStage,
  ProjectReport,
  ProjectHeatmapData,
  ProjectPortfolioStats
} from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class ProjectService {

  private readonly teamMembers: TeamMember[] = [
    { id: 'tm1', name: 'Alex Chen', initials: 'AC', color: '#64748B', role: 'Project Manager' },
    { id: 'tm2', name: 'Jessica Lin', initials: 'JL', color: '#D6A28C', role: 'Frontend Lead' },
    { id: 'tm3', name: 'David Wu', initials: 'DW', color: '#7F9CA0', role: 'Backend Engineer' },
    { id: 'tm4', name: 'Sarah Lin', initials: 'SL', color: '#C4A4A1', role: 'Marketing Manager' },
    { id: 'tm5', name: 'Mike Wang', initials: 'MW', color: '#9A8C98', role: 'AI Engineer' },
    { id: 'tm6', name: 'Kevin Wu', initials: 'KW', color: '#8DA399', role: 'DevOps Engineer' },
    { id: 'tm7', name: 'Mary Yang', initials: 'MY', color: '#B87D7B', role: 'QA Engineer' }
  ];

  private readonly mockProjects: Project[] = [
    {
      id: 'P2025001',
      code: 'PROJ-2025001',
      name: '企業級 CRM 系統重構',
      pm: 'Alex Chen',
      pmAvatar: 'AC',
      status: 'active',
      progress: 65,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      budget: 4000000,
      spent: 2400000,
      estimatedProfit: 32,
      team: [this.teamMembers[1], this.teamMembers[2], { id: 'extra', name: '+5', initials: '+5', color: '#7F9CA0' }],
      department: 'RD',
      description: '重構現有 CRM 系統，提升數據處理效能'
    },
    {
      id: 'P2025002',
      code: 'PROJ-2025002',
      name: 'Q4 行銷自動化平台導入',
      pm: 'Sarah Lin',
      pmAvatar: 'SL',
      status: 'risk',
      progress: 40,
      startDate: '2025-02-01',
      endDate: '2025-05-31',
      budget: 2000000,
      spent: 1800000,
      estimatedProfit: 15,
      team: [this.teamMembers[3], this.teamMembers[6]],
      department: 'Marketing',
      description: '導入行銷自動化平台，提升行銷效率'
    },
    {
      id: 'P2025003',
      code: 'PROJ-2025003',
      name: 'AI 客服機器人開發 v2.0',
      pm: 'Mike Wang',
      pmAvatar: 'MW',
      status: 'planning',
      progress: 10,
      startDate: '2025-03-01',
      endDate: '2025-08-31',
      budget: 1500000,
      spent: 100000,
      estimatedProfit: null,
      team: [this.teamMembers[4]],
      department: 'RD',
      description: '開發 AI 客服機器人第二版'
    },
    {
      id: 'P2025004',
      code: 'PROJ-2025004',
      name: '金融區塊鏈交易模組',
      pm: 'David Wu',
      pmAvatar: 'DW',
      status: 'active',
      progress: 82,
      startDate: '2024-10-01',
      endDate: '2025-04-30',
      budget: 3500000,
      spent: 3200000,
      estimatedProfit: 45,
      team: [this.teamMembers[2], this.teamMembers[6], { id: 'extra2', name: '+2', initials: '+2', color: '#9A8C98' }],
      department: 'RD',
      description: '開發金融區塊鏈交易模組'
    },
    {
      id: 'P2025005',
      code: 'PROJ-2025005',
      name: '雲端資料倉儲遷移',
      pm: 'Jessica Lin',
      pmAvatar: 'JL',
      status: 'active',
      progress: 55,
      startDate: '2025-01-15',
      endDate: '2025-07-15',
      budget: 2800000,
      spent: 1400000,
      estimatedProfit: 28,
      team: [this.teamMembers[1], this.teamMembers[5]],
      department: 'RD',
      description: '將現有資料倉儲遷移至雲端'
    }
  ];

  getProjects(filter?: ProjectFilter): Observable<Project[]> {
    let projects = [...this.mockProjects];

    if (filter) {
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        projects = projects.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.code.toLowerCase().includes(searchLower) ||
          p.pm.toLowerCase().includes(searchLower)
        );
      }
      if (filter.department && filter.department !== 'all') {
        projects = projects.filter(p => p.department === filter.department);
      }
      if (filter.status && filter.status !== 'all') {
        projects = projects.filter(p => p.status === filter.status);
      }
    }

    return of(projects).pipe(delay(300));
  }

  getProjectStats(): Observable<ProjectStats> {
    const activeCount = this.mockProjects.filter(p => p.status === 'active').length;
    const totalBudget = this.mockProjects.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = this.mockProjects.reduce((sum, p) => sum + p.spent, 0);
    const profitRates = this.mockProjects.filter(p => p.estimatedProfit !== null).map(p => p.estimatedProfit as number);
    const avgProfit = profitRates.length > 0 ? profitRates.reduce((a, b) => a + b, 0) / profitRates.length : 0;
    const riskCount = this.mockProjects.filter(p => p.status === 'risk').length;

    return of({
      activeProjects: activeCount,
      totalProjects: this.mockProjects.length,
      budgetConsumption: Math.round((totalSpent / totalBudget) * 100),
      totalBudget: totalBudget,
      avgProfitRate: Math.round(avgProfit * 10) / 10,
      riskProjects: riskCount
    }).pipe(delay(200));
  }

  getProjectDetail(id: string): Observable<ProjectDetail | null> {
    const project = this.mockProjects.find(p => p.id === id);
    if (!project) {
      return of(null);
    }

    const detail: ProjectDetail = {
      ...project,
      objective: '本專案旨在重構現有 CRM 系統，提升數據處理效能 50%，並導入 AI 智能客服模組。主要交付項目包含：使用者介面更新、後端 API 優化、AI 模型整合。',
      acceptanceCriteria: [
        'API 回應時間 < 200ms',
        '系統可用性達 99.9%',
        '用戶滿意度提升 20%'
      ],
      directCost: 1800000,
      indirectCost: 600000,
      totalSpent: 2400000,
      remainingDays: 120,
      okrContributions: this.getMockOKRContributions(),
      teamContributions: this.getMockTeamContributions(),
      varianceAlerts: this.getMockVarianceAlerts(),
      tasks: this.getMockTasks(),
      costBreakdown: this.getMockCostBreakdown()
    };

    return of(detail).pipe(delay(300));
  }

  private getMockOKRContributions(): OKRContribution[] {
    return [
      {
        id: 'okr1',
        objective: 'O1: 提升年度營收達 20%',
        keyResult: 'KR1: 完成新版 CRM 上線以支援高併發交易',
        weight: 'high',
        progress: 75
      },
      {
        id: 'okr2',
        objective: 'O2: 優化客戶滿意度 (NPS)',
        keyResult: 'KR3: 客服回應時間縮短至 30 秒內',
        weight: 'medium',
        progress: 40
      }
    ];
  }

  private getMockTeamContributions(): TeamContribution[] {
    return [
      {
        id: 'tc1',
        member: this.teamMembers[0],
        role: 'Project Manager',
        keyResult: 'O1-KR1: 系統上線',
        taskCompletion: 100,
        score: 9.5
      },
      {
        id: 'tc2',
        member: this.teamMembers[1],
        role: 'Frontend Lead',
        keyResult: 'O2-KR3: 回應時間優化',
        taskCompletion: 85,
        score: 8.8
      },
      {
        id: 'tc3',
        member: this.teamMembers[2],
        role: 'Backend Engineer',
        keyResult: 'O1-KR1: 資料庫架構',
        taskCompletion: 100,
        score: 9.2
      }
    ];
  }

  private getMockVarianceAlerts(): VarianceAlert[] {
    return [
      {
        id: 'va1',
        type: 'error',
        title: '前端開發進度延遲 -15%',
        description: '主要開發人員請假導致 Sprint 3 落後。AI 預測若不補救，專案將延期 2 週。'
      },
      {
        id: 'va2',
        type: 'warning',
        title: '雲端成本超支 +8%',
        description: '測試環境 GPU 實例未關閉。建議設定自動關機排程。'
      }
    ];
  }

  private getMockTasks(): Task[] {
    return [
      {
        id: 'T001',
        name: '1. 系統架構設計',
        assignee: this.teamMembers[0],
        status: 'completed',
        dueDate: '2025-01-30',
        okrTag: 'O1-KR1',
        indent: 0,
        isParent: true
      },
      {
        id: 'T002',
        name: '1.1 資料庫正規化',
        assignee: this.teamMembers[2],
        status: 'completed',
        dueDate: '2025-01-15',
        okrTag: 'O1-KR1',
        indent: 1,
        isParent: false,
        parentId: 'T001'
      },
      {
        id: 'T003',
        name: '2. 前端介面開發',
        assignee: this.teamMembers[1],
        status: 'delayed',
        dueDate: '2025-03-15',
        okrTag: 'O2-KR3',
        indent: 0,
        isParent: true
      },
      {
        id: 'T004',
        name: '2.1 使用者儀表板 UI',
        assignee: this.teamMembers[1],
        status: 'in-progress',
        dueDate: '2025-02-28',
        okrTag: 'O2-KR3',
        indent: 1,
        isParent: false,
        parentId: 'T003'
      },
      {
        id: 'T005',
        name: '3. 後端 API 開發',
        assignee: this.teamMembers[2],
        status: 'in-progress',
        dueDate: '2025-04-15',
        okrTag: 'O1-KR1',
        indent: 0,
        isParent: true
      }
    ];
  }

  private getMockCostBreakdown(): CostItem[] {
    return [
      { id: 'c1', name: '人力成本 (RD Team)', category: 'direct', budget: 1200000, actual: 1200000, variance: 0 },
      { id: 'c2', name: '外包開發 (Outsourcing)', category: 'direct', budget: 500000, actual: 600000, variance: -100000 },
      { id: 'c3', name: '設備與雲端資源 (Infrastructure)', category: 'direct', budget: 100000, actual: 100000, variance: 0 },
      { id: 'c4', name: '專案管理 (PM Management)', category: 'indirect', budget: 400000, actual: 400000, variance: 0 },
      { id: 'c5', name: '行政支援分攤 (Admin Support)', category: 'indirect', budget: 200000, actual: 200000, variance: 0 }
    ];
  }

  getTaskDetail(taskId: string): Observable<TaskDetail> {
    return of({
      id: taskId,
      name: '2.1 使用者儀表板 UI',
      description: '根據 Figma 設計稿實作使用者登入後的儀表板首頁。',
      assigneeId: 'tm2',
      hourlyRate: 800,
      estimatedHours: 40,
      laborCost: 32000,
      overheadCost: 1600,
      totalCost: 33600
    }).pipe(delay(200));
  }

  // Profit Prediction Page Data
  getProfitPredictions(): Observable<ProfitPrediction[]> {
    return of([
      { month: 'Jan', actual: 1.2, predicted: null, optimistic: null, pessimistic: null },
      { month: 'Feb', actual: 1.5, predicted: null, optimistic: null, pessimistic: null },
      { month: 'Mar', actual: 1.4, predicted: null, optimistic: null, pessimistic: null },
      { month: 'Apr', actual: 1.8, predicted: null, optimistic: null, pessimistic: null },
      { month: 'May', actual: 2.1, predicted: null, optimistic: null, pessimistic: null },
      { month: 'Jun', actual: 2.3, predicted: 2.3, optimistic: 2.3, pessimistic: 2.3 },
      { month: 'Jul', actual: null, predicted: 2.5, optimistic: 2.7, pessimistic: 2.2 },
      { month: 'Aug', actual: null, predicted: 2.8, optimistic: 3.2, pessimistic: 2.0 },
      { month: 'Sep', actual: null, predicted: 3.1, optimistic: 3.6, pessimistic: 1.8 },
      { month: 'Oct', actual: null, predicted: 3.4, optimistic: 4.1, pessimistic: 1.5 },
      { month: 'Nov', actual: null, predicted: 3.8, optimistic: 4.6, pessimistic: 1.2 },
      { month: 'Dec', actual: null, predicted: 4.2, optimistic: 5.2, pessimistic: 1.0 }
    ]).pipe(delay(300));
  }

  getProjectRankings(): Observable<ProjectRanking[]> {
    return of([
      { rank: 1, projectId: 'P2025004', projectName: '金融區塊鏈交易模組', pm: 'David Wu', revenue: 3500000, profitRate: 45.2 },
      { rank: 2, projectId: 'P2025001', projectName: '企業級 CRM 系統重構', pm: 'Alex Chen', revenue: 4000000, profitRate: 32.5 },
      { rank: 3, projectId: 'P2025005', projectName: '雲端資料倉儲遷移', pm: 'Jessica Lin', revenue: 2800000, profitRate: 28.1 },
      { rank: 4, projectId: 'P2025003', projectName: 'AI 客服機器人開發', pm: 'Mike Wang', revenue: 1500000, profitRate: 12.4 },
      { rank: 5, projectId: 'P2025002', projectName: 'Q4 行銷自動化平台', pm: 'Sarah Lin', revenue: 2000000, profitRate: -5.2 }
    ]).pipe(delay(300));
  }

  getPerformanceAlerts(): Observable<PerformanceAlert[]> {
    return of([
      {
        id: 'pa1',
        projectName: 'Q4 行銷自動化平台',
        variance: '-15% 偏差',
        severity: 'high' as const,
        description: '進度嚴重落後。關鍵路徑任務 "API 整合" 延遲 2 週，預計導致成本超支 $200k。'
      },
      {
        id: 'pa2',
        projectName: 'AI 客服機器人',
        variance: '成本偏高',
        severity: 'medium' as const,
        description: 'GPU 算力成本超出預算 8%。建議優化模型推論效率。'
      }
    ] as PerformanceAlert[]).pipe(delay(200));
  }

  getOKRAnalysis(): Observable<OKRAnalysis[]> {
    return of([
      {
        objective: 'O1: 提升年度營收達 20%',
        contributions: [
          { projectName: '金融區塊鏈', percentage: 40 },
          { projectName: 'CRM 重構', percentage: 25 }
        ]
      },
      {
        objective: 'O2: 優化客戶滿意度 (NPS > 50)',
        contributions: [
          { projectName: 'AI 客服機器人', percentage: 60 },
          { projectName: '行銷自動化', percentage: 15 }
        ]
      },
      {
        objective: 'O3: 技術基礎建設現代化',
        contributions: [
          { projectName: '雲端遷移', percentage: 80 }
        ]
      }
    ]).pipe(delay(200));
  }

  getTeamMembers(): Observable<TeamMember[]> {
    return of(this.teamMembers).pipe(delay(100));
  }

  createProject(form: CreateProjectForm): Observable<Project> {
    const newProject: Project = {
      id: `P${Date.now()}`,
      code: form.code,
      name: form.name,
      pm: this.teamMembers.find(m => m.id === form.pmId)?.name || 'Unknown',
      pmAvatar: this.teamMembers.find(m => m.id === form.pmId)?.initials || 'UN',
      status: 'planning',
      progress: 0,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: form.budget,
      spent: 0,
      estimatedProfit: null,
      team: [],
      department: form.department,
      description: form.objective
    };
    return of(newProject).pipe(delay(500));
  }

  // Chart Data Helpers
  getTimeTunnelData(): Observable<{ months: string[]; actual: (number | null)[]; predicted: (number | null)[] }> {
    return of({
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      actual: [150, 230, 224, 218, 135, 147, 260, null, null, null, null, null],
      predicted: [150, 230, 224, 218, 135, 147, 260, 280, 310, 340, 380, 410]
    }).pipe(delay(200));
  }

  getWaterfallData(): Observable<{ categories: string[]; values: number[]; colors: string[] }> {
    return of({
      categories: ['總預算', '人力成本', '外包成本', '設備成本', '間接成本', '預估毛利'],
      values: [4000000, 1200000, 500000, 100000, 600000, 1600000],
      colors: ['#64748B', '#C77F7F', '#C77F7F', '#C77F7F', '#E3C088', '#7FB095']
    }).pipe(delay(200));
  }

  getCostStructureData(): Observable<{ name: string; value: number }[]> {
    return of([
      { name: '人力成本', value: 1200000 },
      { name: '外包開發', value: 500000 },
      { name: '設備資源', value: 100000 },
      { name: '間接成本', value: 600000 }
    ]).pipe(delay(200));
  }

  getProfitTrendData(): Observable<{ months: string[]; values: number[] }> {
    return of({
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      values: [20, 25, 22, 28, 30, 32]
    }).pipe(delay(200));
  }

  // ===============================================================
  // Forecast 預測系統 (4.3)
  // ===============================================================

  readonly forecastStageDefinitions: ForecastStageDefinition[] = [
    { stage: 10, name: '初步接觸', nameEn: 'Initial Contact', description: '客戶首次接觸專案，尚處於探索需求階段' },
    { stage: 20, name: '需求確認', nameEn: 'Needs Analysis', description: '建立初步需求，雙方尚未確立具體合作方向' },
    { stage: 30, name: '解決方案建議', nameEn: 'Solution Proposal', description: '提出初步解決方案，獲得客戶對方案方向的基本認可' },
    { stage: 40, name: '提案與預算討論', nameEn: 'Proposal Discussion', description: '提交正式提案與初步預算，進入細節磋商階段' },
    { stage: 50, name: '初步承諾', nameEn: 'Initial Commitment', description: '客戶對提案方向及預算表達認可，尚未簽訂合約' },
    { stage: 60, name: '合約談判', nameEn: 'Contract Negotiation', description: '就合約條款、付款計劃、交付時間進行最終確認' },
    { stage: 70, name: '專案啟動', nameEn: 'Project Kick-off', description: '專案正式啟動，執行計劃開始推進' },
    { stage: 80, name: '合約簽訂', nameEn: 'Contract Signed', description: '正式簽署合約，進入執行準備階段' },
    { stage: 90, name: '成果交付', nameEn: 'Delivery', description: '根據合約交付產品或服務，完成驗收' },
    { stage: 100, name: '結案', nameEn: 'Project Closure', description: '專案完成，進入售後支援或維護階段' }
  ];

  private readonly mockForecastProjects: ForecastProject[] = [
    {
      id: 'FC2025001',
      clientName: '台積電',
      projectName: '智慧製造 AI 監控系統',
      budgetAmount: 8500000,
      projectManager: 'Alex Chen',
      salesManager: '王建國',
      engineerManager: 'David Wu',
      currentStage: 70,
      stageHistory: [
        { stage: 10, date: '2024-09-15', updatedBy: '王建國' },
        { stage: 20, date: '2024-10-01', updatedBy: '王建國' },
        { stage: 30, date: '2024-10-20', updatedBy: 'Alex Chen' },
        { stage: 40, date: '2024-11-05', updatedBy: 'Alex Chen' },
        { stage: 50, date: '2024-11-25', updatedBy: '王建國' },
        { stage: 60, date: '2024-12-10', updatedBy: 'Alex Chen' },
        { stage: 70, date: '2025-01-08', updatedBy: 'Alex Chen' }
      ],
      progressNote: '專案已正式啟動，目前進行需求細節確認與技術架構設計',
      forecastStatus: 'on-track',
      expectedBiddingDate: '2024-11-15',
      expectedCloseDate: '2025-06-30',
      opportunityAccount: 'TSMC-2024',
      opportunityName: 'TSMC Smart Manufacturing',
      caseNumber: 'CX-2024-0892'
    },
    {
      id: 'FC2025002',
      clientName: '富邦金控',
      projectName: '數位銀行 2.0 升級專案',
      budgetAmount: 12000000,
      projectManager: 'Jessica Lin',
      salesManager: '林志明',
      engineerManager: 'Kevin Wu',
      currentStage: 50,
      stageHistory: [
        { stage: 10, date: '2024-10-01', updatedBy: '林志明' },
        { stage: 20, date: '2024-10-25', updatedBy: '林志明' },
        { stage: 30, date: '2024-11-15', updatedBy: 'Jessica Lin' },
        { stage: 40, date: '2024-12-05', updatedBy: 'Jessica Lin' },
        { stage: 50, date: '2025-01-10', updatedBy: '林志明' }
      ],
      progressNote: '客戶已初步認可提案，等待內部預算核准',
      forecastStatus: 'on-track',
      expectedBiddingDate: '2025-01-20',
      expectedCloseDate: '2025-09-30',
      opportunityAccount: 'FUBON-2024',
      opportunityName: 'Fubon Digital Bank 2.0',
      caseNumber: 'CX-2024-1023'
    },
    {
      id: 'FC2025003',
      clientName: '統一企業',
      projectName: '供應鏈管理優化系統',
      budgetAmount: 4500000,
      projectManager: 'Mike Wang',
      salesManager: '陳美玲',
      engineerManager: 'David Wu',
      currentStage: 30,
      stageHistory: [
        { stage: 10, date: '2024-11-20', updatedBy: '陳美玲' },
        { stage: 20, date: '2024-12-15', updatedBy: '陳美玲' },
        { stage: 30, date: '2025-01-05', updatedBy: 'Mike Wang' }
      ],
      progressNote: '已提出初步解決方案，客戶評估中',
      forecastStatus: 'at-risk',
      expectedBiddingDate: '2025-02-28',
      expectedCloseDate: '2025-08-31',
      opportunityAccount: 'PCSC-2024',
      opportunityName: 'Uni-President SCM',
      caseNumber: 'CX-2024-1156'
    },
    {
      id: 'FC2025004',
      clientName: '中華電信',
      projectName: '5G 企業專網解決方案',
      budgetAmount: 15000000,
      projectManager: 'Sarah Lin',
      salesManager: '張志豪',
      engineerManager: 'Kevin Wu',
      currentStage: 80,
      stageHistory: [
        { stage: 10, date: '2024-06-01', updatedBy: '張志豪' },
        { stage: 20, date: '2024-06-20', updatedBy: '張志豪' },
        { stage: 30, date: '2024-07-15', updatedBy: 'Sarah Lin' },
        { stage: 40, date: '2024-08-10', updatedBy: 'Sarah Lin' },
        { stage: 50, date: '2024-09-05', updatedBy: '張志豪' },
        { stage: 60, date: '2024-10-01', updatedBy: 'Sarah Lin' },
        { stage: 70, date: '2024-11-15', updatedBy: 'Sarah Lin' },
        { stage: 80, date: '2024-12-20', updatedBy: '張志豪' }
      ],
      progressNote: '合約已簽訂，正在進行執行前準備',
      forecastStatus: 'on-track',
      expectedBiddingDate: '2024-09-30',
      expectedCloseDate: '2025-12-31',
      opportunityAccount: 'CHT-2024',
      opportunityName: 'CHT 5G Enterprise',
      caseNumber: 'CX-2024-0567'
    },
    {
      id: 'FC2025005',
      clientName: '長榮航空',
      projectName: '旅客服務數位轉型',
      budgetAmount: 6800000,
      projectManager: 'Alex Chen',
      salesManager: '王建國',
      engineerManager: 'Mary Yang',
      currentStage: 20,
      stageHistory: [
        { stage: 10, date: '2024-12-10', updatedBy: '王建國' },
        { stage: 20, date: '2025-01-08', updatedBy: '王建國' }
      ],
      progressNote: '正在收集詳細需求，預計下週進行技術評估',
      forecastStatus: 'on-track',
      expectedBiddingDate: '2025-04-15',
      expectedCloseDate: '2025-12-31',
      opportunityAccount: 'EVA-2025',
      opportunityName: 'EVA Air Digital CX',
      caseNumber: 'CX-2025-0012'
    },
    {
      id: 'FC2025006',
      clientName: '遠東集團',
      projectName: '零售數據分析平台',
      budgetAmount: 3200000,
      projectManager: 'Jessica Lin',
      salesManager: '林志明',
      engineerManager: 'Mike Wang',
      currentStage: 40,
      stageHistory: [
        { stage: 10, date: '2024-10-15', updatedBy: '林志明' },
        { stage: 20, date: '2024-11-10', updatedBy: '林志明' },
        { stage: 30, date: '2024-12-05', updatedBy: 'Jessica Lin' },
        { stage: 40, date: '2025-01-02', updatedBy: 'Jessica Lin' }
      ],
      progressNote: '預算討論階段，客戶希望能降低初期投資',
      forecastStatus: 'delayed',
      expectedBiddingDate: '2025-02-10',
      expectedCloseDate: '2025-07-31',
      opportunityAccount: 'FEG-2024',
      opportunityName: 'Far Eastern Retail Analytics',
      caseNumber: 'CX-2024-1089'
    },
    {
      id: 'FC2025007',
      clientName: '國泰人壽',
      projectName: 'AI 理賠自動化系統',
      budgetAmount: 9500000,
      projectManager: 'David Wu',
      salesManager: '陳美玲',
      engineerManager: 'Kevin Wu',
      currentStage: 90,
      stageHistory: [
        { stage: 10, date: '2024-03-01', updatedBy: '陳美玲' },
        { stage: 20, date: '2024-03-20', updatedBy: '陳美玲' },
        { stage: 30, date: '2024-04-15', updatedBy: 'David Wu' },
        { stage: 40, date: '2024-05-10', updatedBy: 'David Wu' },
        { stage: 50, date: '2024-06-05', updatedBy: '陳美玲' },
        { stage: 60, date: '2024-07-01', updatedBy: 'David Wu' },
        { stage: 70, date: '2024-08-15', updatedBy: 'David Wu' },
        { stage: 80, date: '2024-09-20', updatedBy: '陳美玲' },
        { stage: 90, date: '2024-12-15', updatedBy: 'David Wu' }
      ],
      progressNote: '系統已完成交付，進行最終驗收測試',
      forecastStatus: 'on-track',
      expectedBiddingDate: '2024-06-30',
      expectedCloseDate: '2025-01-31',
      opportunityAccount: 'CATHAY-2024',
      opportunityName: 'Cathay Life AI Claims',
      caseNumber: 'CX-2024-0234'
    }
  ];

  getForecastStageDefinitions(): Observable<ForecastStageDefinition[]> {
    return of(this.forecastStageDefinitions).pipe(delay(100));
  }

  getForecastProjects(): Observable<ForecastProject[]> {
    return of(this.mockForecastProjects).pipe(delay(300));
  }

  getForecastSummary(): Observable<ForecastSummary> {
    const projects = this.mockForecastProjects;
    const byStage = this.forecastStageDefinitions.map(def => {
      const stageProjects = projects.filter(p => p.currentStage === def.stage);
      return {
        stage: def.stage,
        count: stageProjects.length,
        budget: stageProjects.reduce((sum, p) => sum + p.budgetAmount, 0)
      };
    });

    return of({
      totalProjects: projects.length,
      totalBudget: projects.reduce((sum, p) => sum + p.budgetAmount, 0),
      byStage,
      onTrack: projects.filter(p => p.forecastStatus === 'on-track').length,
      atRisk: projects.filter(p => p.forecastStatus === 'at-risk').length,
      delayed: projects.filter(p => p.forecastStatus === 'delayed').length
    }).pipe(delay(200));
  }

  updateForecastStage(projectId: string, newStage: ForecastStage): Observable<ForecastProject> {
    const project = this.mockForecastProjects.find(p => p.id === projectId);
    if (project) {
      project.currentStage = newStage;
      project.stageHistory.push({
        stage: newStage,
        date: new Date().toISOString().split('T')[0],
        updatedBy: 'Current User'
      });
    }
    return of(project!).pipe(delay(300));
  }

  // ===============================================================
  // 專案報表與分析 (4.4)
  // ===============================================================

  getProjectReports(): Observable<ProjectReport[]> {
    return of([
      {
        projectId: 'P2025001',
        projectName: '企業級 CRM 系統重構',
        projectCode: 'PROJ-2025001',
        pm: 'Alex Chen',
        department: 'RD',
        objective: '重構現有 CRM 系統，提升數據處理效能 50%',
        scope: '使用者介面更新、後端 API 優化、AI 模型整合',
        acceptanceCriteria: ['API 回應時間 < 200ms', '系統可用性達 99.9%', '用戶滿意度提升 20%'],
        overallProgress: 65,
        taskCompletion: { completed: 18, total: 28 },
        milestoneCompletion: { completed: 3, total: 5 },
        budgetAmount: 4000000,
        actualCost: 2400000,
        costVariance: -100000,
        costVariancePercent: -4.2,
        revenue: 5200000,
        grossProfit: 1300000,
        grossMarginRate: 32.5,
        startDate: '2025-01-01',
        endDate: '2025-06-30',
        remainingDays: 120,
        isDelayed: false,
        riskCount: 2,
        issueCount: 3
      },
      {
        projectId: 'P2025002',
        projectName: 'Q4 行銷自動化平台導入',
        projectCode: 'PROJ-2025002',
        pm: 'Sarah Lin',
        department: 'Marketing',
        objective: '導入行銷自動化平台，提升行銷效率',
        scope: '平台選型、系統整合、人員訓練',
        acceptanceCriteria: ['行銷效率提升 30%', '自動化覆蓋率 80%'],
        overallProgress: 40,
        taskCompletion: { completed: 8, total: 20 },
        milestoneCompletion: { completed: 1, total: 4 },
        budgetAmount: 2000000,
        actualCost: 1800000,
        costVariance: 200000,
        costVariancePercent: 11.1,
        revenue: 2300000,
        grossProfit: -105000,
        grossMarginRate: -5.2,
        startDate: '2025-02-01',
        endDate: '2025-05-31',
        remainingDays: 45,
        isDelayed: true,
        riskCount: 4,
        issueCount: 5
      },
      {
        projectId: 'P2025004',
        projectName: '金融區塊鏈交易模組',
        projectCode: 'PROJ-2025004',
        pm: 'David Wu',
        department: 'RD',
        objective: '開發金融區塊鏈交易模組',
        scope: '智能合約開發、交易引擎、安全審計',
        acceptanceCriteria: ['交易延遲 < 100ms', '99.99% 正常運行時間'],
        overallProgress: 82,
        taskCompletion: { completed: 25, total: 30 },
        milestoneCompletion: { completed: 4, total: 5 },
        budgetAmount: 3500000,
        actualCost: 3200000,
        costVariance: -200000,
        costVariancePercent: -5.9,
        revenue: 5075000,
        grossProfit: 1575000,
        grossMarginRate: 45.0,
        startDate: '2024-10-01',
        endDate: '2025-04-30',
        remainingDays: 30,
        isDelayed: false,
        riskCount: 1,
        issueCount: 1
      },
      {
        projectId: 'P2025005',
        projectName: '雲端資料倉儲遷移',
        projectCode: 'PROJ-2025005',
        pm: 'Jessica Lin',
        department: 'RD',
        objective: '將現有資料倉儲遷移至雲端',
        scope: '資料遷移、架構優化、效能調校',
        acceptanceCriteria: ['零資料遺失', '查詢效能提升 40%'],
        overallProgress: 55,
        taskCompletion: { completed: 12, total: 22 },
        milestoneCompletion: { completed: 2, total: 4 },
        budgetAmount: 2800000,
        actualCost: 1400000,
        costVariance: 0,
        costVariancePercent: 0,
        revenue: 3584000,
        grossProfit: 784000,
        grossMarginRate: 28.0,
        startDate: '2025-01-15',
        endDate: '2025-07-15',
        remainingDays: 150,
        isDelayed: false,
        riskCount: 2,
        issueCount: 2
      }
    ]).pipe(delay(300));
  }

  getProjectHeatmapData(): Observable<ProjectHeatmapData[]> {
    const data: ProjectHeatmapData[] = [
      {
        projectId: 'P2025004',
        projectName: '金融區塊鏈交易模組',
        pm: 'David Wu',
        department: 'RD',
        progressScore: 92,
        costScore: 88,
        profitScore: 95,
        overallScore: 92,
        status: 'excellent'
      },
      {
        projectId: 'P2025001',
        projectName: '企業級 CRM 系統重構',
        pm: 'Alex Chen',
        department: 'RD',
        progressScore: 78,
        costScore: 82,
        profitScore: 75,
        overallScore: 78,
        status: 'good'
      },
      {
        projectId: 'P2025005',
        projectName: '雲端資料倉儲遷移',
        pm: 'Jessica Lin',
        department: 'RD',
        progressScore: 72,
        costScore: 90,
        profitScore: 70,
        overallScore: 77,
        status: 'good'
      },
      {
        projectId: 'P2025003',
        projectName: 'AI 客服機器人開發',
        pm: 'Mike Wang',
        department: 'RD',
        progressScore: 45,
        costScore: 75,
        profitScore: 50,
        overallScore: 57,
        status: 'warning'
      },
      {
        projectId: 'P2025002',
        projectName: 'Q4 行銷自動化平台',
        pm: 'Sarah Lin',
        department: 'Marketing',
        progressScore: 35,
        costScore: 40,
        profitScore: 20,
        overallScore: 32,
        status: 'critical'
      }
    ];
    return of(data).pipe(delay(300));
  }

  getPortfolioStats(): Observable<ProjectPortfolioStats> {
    return of({
      totalProjects: 5,
      totalBudget: 13800000,
      totalSpent: 8900000,
      avgProgress: 50.4,
      avgProfitRate: 24.1,
      onTimeProjects: 4,
      delayedProjects: 1,
      excellentProjects: 1,
      atRiskProjects: 2
    }).pipe(delay(200));
  }
}

