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
  VarianceAlert
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
}

