import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  HealthAxis,
  RiskAlert,
  DecisionItem,
  TrendData,
  CapabilityKPI,
  CapabilityGap,
  TalentRiskKPI,
  HighRiskTalent,
  SuccessionCoverage,
  ProjectDeliveryKPI,
  ProjectStatus,
  ProfitKPI,
  ProjectRanking,
  ErosionCause,
  RewardKPI,
  RewardRiskEmployee,
  NineBoxData,
  RiskQuadrantPerson,
  CompetencyEmployee,
  ProjectBubble
} from '../models/ceo-dashboard.model';

@Injectable({ providedIn: 'root' })
export class CEODashboardService {

  // ---------------------------------------------------------------
  // CEO Board 數據
  // ---------------------------------------------------------------
  getHealthAxes(): Observable<HealthAxis[]> {
    const data: HealthAxis[] = [
      {
        name: 'people',
        label: 'People 人才',
        score: 78,
        description: '能力與風險可視化',
        icon: 'ri-team-line',
        color: '#8DA399',
        metrics: [
          { label: '關鍵職能覆蓋', value: '85%', status: 'positive' },
          { label: '關鍵人才風險', value: '3 人', status: 'danger' },
          { label: '接班覆蓋率', value: '67%', status: 'warning' }
        ],
        sparklineData: [72, 74, 80, 82, 87, 78]
      },
      {
        name: 'project',
        label: 'Project 專案',
        score: 72,
        description: '人力配置→交付→毛利',
        icon: 'ri-folder-chart-line',
        color: '#D6A28C',
        metrics: [
          { label: '專案交付健康度', value: '4/5 正常', status: 'positive' },
          { label: '毛利達成率', value: '103%', status: 'positive' },
          { label: '風險專案', value: '1 個', status: 'danger' }
        ],
        sparklineData: [68, 50, 81, 91, 80, 72]
      },
      {
        name: 'culture',
        label: 'Culture 文化',
        score: 81,
        description: '行為訊號量化',
        icon: 'ri-heart-line',
        color: '#9A8C98',
        metrics: [
          { label: '績效獎酬對齊度', value: '92%', status: 'positive' },
          { label: '訓練轉化率', value: '68%', status: 'warning' },
          { label: '訊號對齊度', value: '92%', status: 'positive' }
        ],
        sparklineData: [85, 79, 70, 82, 90, 81]
      }
    ];
    return of(data).pipe(delay(300));
  }

  // 三主軸健康度趨勢（近6個月）
  getHealthTrendData(): Observable<{ month: string; people: number; project: number; culture: number }[]> {
    const data = [
      { month: '7月', people: 72, project: 68, culture: 78 },
      { month: '8月', people: 74, project: 70, culture: 79 },
      { month: '9月', people: 75, project: 69, culture: 80 },
      { month: '10月', people: 76, project: 71, culture: 80 },
      { month: '11月', people: 77, project: 70, culture: 81 },
      { month: '12月', people: 78, project: 72, culture: 81 }
    ];
    return of(data).pipe(delay(200));
  }

  getRiskAlerts(): Observable<RiskAlert[]> {
    const data: RiskAlert[] = [
      {
        id: '1',
        title: '資深專案經理職位',
        description: '接班人數：0，預計 Q2 離職風險',
        severity: 'critical',
        category: 'people'
      },
      {
        id: '2',
        title: '行銷自動化專案',
        description: '進度落後 15%，毛利預警',
        severity: 'critical',
        category: 'project'
      },
      {
        id: '3',
        title: '專案管理能力缺口',
        description: '12 人待培訓，影響 Q3 交付',
        severity: 'warning',
        category: 'people'
      }
    ];
    return of(data).pipe(delay(200));
  }

  getDecisionItems(): Observable<DecisionItem[]> {
    const data: DecisionItem[] = [
      // 緊急
      {
        id: '1',
        title: '行銷自動化專案',
        description: '進度落後 15%，建議本週召開檢討會',
        priority: 'urgent',
        icon: 'ri-alarm-warning-line',
        actionLabel: '查看詳情'
      },
      {
        id: '2',
        title: '資深架構師離職預警',
        description: '核心成員即將離職，需啟動知識轉移',
        priority: 'urgent',
        icon: 'ri-user-unfollow-line',
        actionLabel: '查看詳情'
      },
      {
        id: '3',
        title: '客戶合約到期',
        description: 'A 級客戶合約 2 週後到期，需續約談判',
        priority: 'urgent',
        icon: 'ri-file-warning-line',
        actionLabel: '查看詳情'
      },
      // 重要
      {
        id: '4',
        title: '專案管理能力缺口',
        description: '12 人待培訓，建議啟動 Q1 PMP 班',
        priority: 'important',
        icon: 'ri-user-settings-line',
        actionLabel: '查看詳情'
      },
      {
        id: '5',
        title: '技術債務清理',
        description: '累積 45 項技術債，建議安排 Sprint 處理',
        priority: 'important',
        icon: 'ri-code-box-line',
        actionLabel: '查看詳情'
      },
      {
        id: '6',
        title: '年度績效評估',
        description: '距離評估截止日剩 3 週，已完成 65%',
        priority: 'important',
        icon: 'ri-survey-line',
        actionLabel: '查看詳情'
      },
      {
        id: '7',
        title: '新進人員培訓',
        description: '5 名新進人員待完成入職培訓',
        priority: 'important',
        icon: 'ri-graduation-cap-line',
        actionLabel: '查看詳情'
      },
      // 機會
      {
        id: '8',
        title: '金融區塊鏈專案',
        description: '毛利率 45%，建議複製模式到下季專案',
        priority: 'opportunity',
        icon: 'ri-lightbulb-line',
        actionLabel: '查看詳情'
      },
      {
        id: '9',
        title: 'AI 客服機器人商機',
        description: '3 家潛在客戶表達興趣，預估營收 $2M',
        priority: 'opportunity',
        icon: 'ri-robot-line',
        actionLabel: '查看詳情'
      },
      {
        id: '10',
        title: '內部工具 SaaS 化',
        description: '專案管理工具可對外銷售，市場潛力大',
        priority: 'opportunity',
        icon: 'ri-cloud-line',
        actionLabel: '查看詳情'
      }
    ];
    return of(data).pipe(delay(200));
  }

  getTrendData(): Observable<TrendData[]> {
    const data: TrendData[] = [
      { month: '1月', revenue: 8.2, profitRate: 25 },
      { month: '2月', revenue: 8.5, profitRate: 26 },
      { month: '3月', revenue: 9.1, profitRate: 27 },
      { month: '4月', revenue: 8.8, profitRate: 26 },
      { month: '5月', revenue: 9.4, profitRate: 28 },
      { month: '6月', revenue: 10.2, profitRate: 29 },
      { month: '7月', revenue: 9.8, profitRate: 28 },
      { month: '8月', revenue: 10.5, profitRate: 30 },
      { month: '9月', revenue: 11.2, profitRate: 31 },
      { month: '10月', revenue: 11.8, profitRate: 30 },
      { month: '11月', revenue: 12.3, profitRate: 29 },
      { month: '12月', revenue: 13.8, profitRate: 30 }
    ];
    return of(data).pipe(delay(300));
  }

  // ---------------------------------------------------------------
  // 能力地圖數據
  // ---------------------------------------------------------------
  getCapabilityKPI(): Observable<CapabilityKPI> {
    const data: CapabilityKPI = {
      coverageRate: 85,
      coverageChange: 3,
      achievementRate: 72,
      achievementTarget: 80,
      avgOnboardingDays: 45,
      gapCount: 8
    };
    return of(data).pipe(delay(200));
  }

  getCapabilityGaps(): Observable<CapabilityGap[]> {
    const data: CapabilityGap[] = [
      {
        department: '業務部',
        competency: '專案管理',
        gap: -1.5,
        impact: '影響 3 個專案交付',
        suggestion: 'PMP 認證培訓'
      },
      {
        department: '業務部',
        competency: '數據分析',
        gap: -1.6,
        impact: '影響銷售預測準確度',
        suggestion: 'Power BI 課程'
      },
      {
        department: '行銷部',
        competency: '技術開發',
        gap: -1.8,
        impact: '影響 MarTech 導入',
        suggestion: '跨部門協作或招募'
      }
    ];
    return of(data).pipe(delay(200));
  }

  // 部門 × 核心職能 熱力圖
  getCompetencyHeatmap(): Observable<{
    departments: string[];
    competencies: string[];
    data: { dept: string; comp: string; score: number; status: 'achieved' | 'slight' | 'severe' }[];
  }> {
    const departments = ['研發部', '業務部', '行銷部', '人資部', '財務部'];
    const competencies = ['專案管理', '技術開發', '溝通協調', '數據分析', '領導力', '創新思維'];

    const getStatus = (score: number): 'achieved' | 'slight' | 'severe' => {
      if (score >= 4.0) return 'achieved';
      if (score >= 3.0) return 'slight';
      return 'severe';
    };

    const rawData = [
      // 研發部
      { dept: '研發部', comp: '專案管理', score: 3.2 },
      { dept: '研發部', comp: '技術開發', score: 4.5 },
      { dept: '研發部', comp: '溝通協調', score: 3.8 },
      { dept: '研發部', comp: '數據分析', score: 4.2 },
      { dept: '研發部', comp: '領導力', score: 3.0 },
      { dept: '研發部', comp: '創新思維', score: 3.9 },
      // 業務部
      { dept: '業務部', comp: '專案管理', score: 2.5 },
      { dept: '業務部', comp: '技術開發', score: 2.8 },
      { dept: '業務部', comp: '溝通協調', score: 4.3 },
      { dept: '業務部', comp: '數據分析', score: 2.4 },
      { dept: '業務部', comp: '領導力', score: 3.6 },
      { dept: '業務部', comp: '創新思維', score: 3.2 },
      // 行銷部
      { dept: '行銷部', comp: '專案管理', score: 3.0 },
      { dept: '行銷部', comp: '技術開發', score: 2.2 },
      { dept: '行銷部', comp: '溝通協調', score: 4.1 },
      { dept: '行銷部', comp: '數據分析', score: 3.7 },
      { dept: '行銷部', comp: '領導力', score: 3.1 },
      { dept: '行銷部', comp: '創新思維', score: 4.4 },
      // 人資部
      { dept: '人資部', comp: '專案管理', score: 3.8 },
      { dept: '人資部', comp: '技術開發', score: 2.0 },
      { dept: '人資部', comp: '溝通協調', score: 4.5 },
      { dept: '人資部', comp: '數據分析', score: 3.2 },
      { dept: '人資部', comp: '領導力', score: 3.9 },
      { dept: '人資部', comp: '創新思維', score: 3.3 },
      // 財務部
      { dept: '財務部', comp: '專案管理', score: 3.6 },
      { dept: '財務部', comp: '技術開發', score: 2.8 },
      { dept: '財務部', comp: '溝通協調', score: 3.7 },
      { dept: '財務部', comp: '數據分析', score: 4.6 },
      { dept: '財務部', comp: '領導力', score: 3.2 },
      { dept: '財務部', comp: '創新思維', score: 2.9 }
    ];

    const data = rawData.map(item => ({
      ...item,
      status: getStatus(item.score)
    }));

    return of({ departments, competencies, data }).pipe(delay(200));
  }

  // 獲取特定部門+職能的人員清單
  getCompetencyEmployees(dept: string, comp: string): Observable<CompetencyEmployee[]> {
    // 模擬人員資料
    const allEmployees: Record<string, CompetencyEmployee[]> = {
      '研發部-專案管理': [
        { id: '1', name: '陳建宏', position: '資深工程師', avatar: 'CJ', currentScore: 3.5, requiredScore: 4.0, gap: -0.5, status: 'slight', suggestion: '建議參加 PMP 認證培訓', courses: ['PMP 專案管理認證班', '敏捷開發實務'] },
        { id: '2', name: '林雅婷', position: '軟體工程師', avatar: 'LY', currentScore: 2.8, requiredScore: 4.0, gap: -1.2, status: 'severe', suggestion: '需加強專案規劃能力', courses: ['專案管理基礎', 'Scrum Master 培訓'] },
        { id: '3', name: '王志明', position: '技術主管', avatar: 'WZ', currentScore: 4.2, requiredScore: 4.0, gap: 0.2, status: 'achieved', suggestion: '可擔任內部講師', courses: [] }
      ],
      '業務部-專案管理': [
        { id: '4', name: '張美玲', position: '業務經理', avatar: 'ZM', currentScore: 2.3, requiredScore: 4.0, gap: -1.7, status: 'severe', suggestion: '急需強化專案管理技能', courses: ['業務專案管理', '客戶專案協調'] },
        { id: '5', name: '李俊傑', position: '業務專員', avatar: 'LJ', currentScore: 2.8, requiredScore: 4.0, gap: -1.2, status: 'severe', suggestion: '建議參加入門課程', courses: ['專案管理入門', '時間管理技巧'] }
      ],
      '業務部-數據分析': [
        { id: '6', name: '黃雅芳', position: '業務主管', avatar: 'HY', currentScore: 2.2, requiredScore: 4.0, gap: -1.8, status: 'severe', suggestion: '建議學習 Power BI', courses: ['Power BI 數據視覺化', 'Excel 進階分析'] },
        { id: '7', name: '陳偉強', position: '資深業務', avatar: 'CW', currentScore: 2.6, requiredScore: 4.0, gap: -1.4, status: 'severe', suggestion: '需提升數據解讀能力', courses: ['業務數據分析', 'SQL 基礎查詢'] }
      ],
      '行銷部-技術開發': [
        { id: '8', name: '周怡君', position: '行銷專員', avatar: 'ZY', currentScore: 2.0, requiredScore: 3.5, gap: -1.5, status: 'severe', suggestion: '建議學習 MarTech 工具', courses: ['MarTech 工具應用', 'GA4 分析實務'] },
        { id: '9', name: '吳建華', position: '數位行銷主管', avatar: 'WJ', currentScore: 2.5, requiredScore: 3.5, gap: -1.0, status: 'severe', suggestion: '需了解行銷自動化', courses: ['行銷自動化平台', 'CRM 系統操作'] }
      ]
    };

    const key = `${dept}-${comp}`;
    const employees = allEmployees[key] || this.generateMockEmployees(dept, comp);

    return of(employees).pipe(delay(150));
  }

  private generateMockEmployees(dept: string, comp: string): CompetencyEmployee[] {
    const names = ['王小明', '李大華', '張美玲', '陳建宏', '林雅婷'];
    const positions = ['專員', '資深專員', '主管', '經理'];

    return names.slice(0, 3).map((name, i) => {
      const score = 2.5 + Math.random() * 2;
      const requiredScore = 4.0;
      const gap = score - requiredScore;
      const status: 'achieved' | 'slight' | 'severe' = score >= 4 ? 'achieved' : score >= 3 ? 'slight' : 'severe';

      return {
        id: `gen-${i}`,
        name,
        position: positions[i % positions.length],
        avatar: name.substring(0, 2),
        currentScore: Math.round(score * 10) / 10,
        requiredScore,
        gap: Math.round(gap * 10) / 10,
        status,
        suggestion: status === 'severe' ? '建議參加相關培訓課程' : status === 'slight' ? '持續加強即可' : '表現優異',
        courses: status !== 'achieved' ? [`${comp}進階培訓`, `${comp}實務應用`] : []
      };
    });
  }

  // ---------------------------------------------------------------
  // 人才風險數據
  // ---------------------------------------------------------------
  getTalentRiskKPI(): Observable<TalentRiskKPI> {
    const data: TalentRiskKPI = {
      highRiskCount: 3,
      successionCoverage: 67,
      successionTarget: 80,
      keyPositionCount: 5,
      riskCost: 150
    };
    return of(data).pipe(delay(200));
  }

  // 風險象限圖資料 (X=離職風險, Y=關鍵性)
  getRiskQuadrantData(): Observable<RiskQuadrantPerson[]> {
    const data: RiskQuadrantPerson[] = [
      {
        id: '1',
        name: '王大明',
        position: '資深專案經理',
        department: '專案部',
        turnoverRisk: 85,
        criticality: 90,
        avatar: 'WD',
        riskSignals: ['市場薪資差距 +25%', '近期更新履歷', '工作滿意度下降'],
        suggestedActions: ['本週安排留才面談', '討論職涯發展計畫', '評估薪資調整空間']
      },
      {
        id: '2',
        name: '李小華',
        position: '技術架構師',
        department: '研發部',
        turnoverRisk: 78,
        criticality: 95,
        avatar: 'LX',
        riskSignals: ['獵頭接觸頻繁', '加班時數減少', '參與度降低'],
        suggestedActions: ['提供技術領導機會', '討論股權激勵方案', '安排高層一對一']
      },
      {
        id: '3',
        name: '張志遠',
        position: '業務總監',
        department: '業務部',
        turnoverRisk: 65,
        criticality: 85,
        avatar: 'ZZ',
        riskSignals: ['業績壓力大', '團隊人員流動'],
        suggestedActions: ['檢視業績目標合理性', '提供團隊支援']
      },
      {
        id: '4',
        name: '陳美玲',
        position: '人資經理',
        department: '人資部',
        turnoverRisk: 45,
        criticality: 70,
        avatar: 'CM',
        riskSignals: ['職涯發展受限'],
        suggestedActions: ['討論跨部門輪調', '提供管理培訓']
      },
      {
        id: '5',
        name: '林建宏',
        position: '財務主管',
        department: '財務部',
        turnoverRisk: 30,
        criticality: 75,
        avatar: 'LJ',
        riskSignals: ['工作負荷穩定'],
        suggestedActions: ['維持現狀', '定期關心']
      },
      {
        id: '6',
        name: '黃雅婷',
        position: '產品經理',
        department: '產品部',
        turnoverRisk: 55,
        criticality: 80,
        avatar: 'HY',
        riskSignals: ['專案延遲壓力', '跨部門溝通摩擦'],
        suggestedActions: ['提供專案管理支援', '協調跨部門資源']
      },
      {
        id: '7',
        name: '吳俊傑',
        position: '資深工程師',
        department: '研發部',
        turnoverRisk: 70,
        criticality: 65,
        avatar: 'WJ',
        riskSignals: ['技術成長停滯', '市場競爭力高'],
        suggestedActions: ['提供進修補助', '參與新技術專案']
      },
      {
        id: '8',
        name: '周怡君',
        position: '行銷專員',
        department: '行銷部',
        turnoverRisk: 25,
        criticality: 50,
        avatar: 'ZY',
        riskSignals: ['狀態穩定'],
        suggestedActions: ['維持現狀']
      }
    ];
    return of(data).pipe(delay(200));
  }

  getHighRiskTalents(): Observable<HighRiskTalent[]> {
    const data: HighRiskTalent[] = [
      {
        id: '1',
        name: '王大明',
        position: '資深專案經理',
        department: '專案部',
        riskScore: 85,
        criticality: 'extreme',
        signals: '市場薪資差距 +25%、近期更新履歷',
        action: '本週安排留才面談'
      },
      {
        id: '2',
        name: '李小華',
        position: '技術主管',
        department: '研發部',
        riskScore: 78,
        criticality: 'extreme',
        signals: '獵頭接觸頻繁、加班時數減少',
        action: '提供技術領導機會'
      },
      {
        id: '3',
        name: '張志遠',
        position: '業務總監',
        department: '業務部',
        riskScore: 65,
        criticality: 'high',
        signals: '業績壓力大、團隊人員流動',
        action: '檢視業績目標合理性'
      },
      {
        id: '4',
        name: '吳俊傑',
        position: '資深工程師',
        department: '研發部',
        riskScore: 70,
        criticality: 'high',
        signals: '技術成長停滯、市場競爭力高',
        action: '提供進修補助'
      }
    ];
    return of(data).pipe(delay(200));
  }

  getSuccessionCoverages(): Observable<SuccessionCoverage[]> {
    const data: SuccessionCoverage[] = [
      { position: '技術長', coverage: 'full', successorCount: 2, label: '2 人可接班' },
      { position: '財務主管', coverage: 'partial', successorCount: 1, label: '1 人可接班' },
      { position: '資深專案經理', coverage: 'training', successorCount: 1, label: '1 人培養中' },
      { position: '人資主管', coverage: 'none', successorCount: 0, label: '0 人可接班' }
    ];
    return of(data).pipe(delay(200));
  }

  // ---------------------------------------------------------------
  // 專案交付數據
  // ---------------------------------------------------------------
  getProjectDeliveryKPI(): Observable<ProjectDeliveryKPI> {
    const data: ProjectDeliveryKPI = {
      activeProjects: 5,
      onTrackCount: 4,
      atRiskCount: 1,
      avgProgress: 87,
      progressTarget: 90,
      utilizationRate: 82,
      manpowerGap: 3
    };
    return of(data).pipe(delay(200));
  }

  getProjectStatuses(): Observable<ProjectStatus[]> {
    const data: ProjectStatus[] = [
      { id: '1', name: '企業級 CRM 重構', status: 'normal', progress: 65, pm: 1, dev: 4, design: 1, test: 1 },
      { id: '2', name: '行銷自動化平台', status: 'risk', progress: 40, pm: 1, dev: 2, design: 1, test: 0, issue: '缺 2 名後端、缺測試人力' },
      { id: '3', name: '金融區塊鏈模組', status: 'normal', progress: 82, pm: 1, dev: 3, design: 0, test: 1 },
      { id: '4', name: '雲端資料倉儲遷移', status: 'normal', progress: 55, pm: 1, dev: 2, design: 0, test: 1, issue: '資深架構師即將離職' },
      { id: '5', name: 'AI 客服機器人 v2', status: 'planning', progress: 10, pm: 1, dev: 0, design: 0, test: 0, issue: '待組建團隊' }
    ];
    return of(data).pipe(delay(200));
  }

  // 專案 Portfolio 泡泡圖資料
  getProjectBubbles(): Observable<ProjectBubble[]> {
    const data: ProjectBubble[] = [
      { id: '1', name: '企業級 CRM 重構', progressDeviation: -5, qualityRisk: 25, budgetScale: 4.0, needsAttention: false, pm: 'Alex Chen', status: 'normal' },
      { id: '2', name: '行銷自動化平台', progressDeviation: -15, qualityRisk: 65, budgetScale: 2.0, needsAttention: true, pm: 'Sarah Lin', status: 'critical' },
      { id: '3', name: '金融區塊鏈模組', progressDeviation: 8, qualityRisk: 15, budgetScale: 3.5, needsAttention: false, pm: 'David Wu', status: 'normal' },
      { id: '4', name: '雲端資料倉儲遷移', progressDeviation: -8, qualityRisk: 45, budgetScale: 2.8, needsAttention: false, pm: 'Jessica Lin', status: 'warning' },
      { id: '5', name: 'AI 客服機器人 v2', progressDeviation: 0, qualityRisk: 30, budgetScale: 1.5, needsAttention: false, pm: 'Mike Wang', status: 'normal' }
    ];
    return of(data).pipe(delay(200));
  }

  // ---------------------------------------------------------------
  // 毛利預測數據
  // ---------------------------------------------------------------
  getProfitKPI(): Observable<ProfitKPI> {
    const data: ProfitKPI = {
      totalRevenue: 13.8,
      avgProfitRate: 30,
      profitRateChange: 3.5,
      aiConfidence: 92,
      erosionWarning: 200
    };
    return of(data).pipe(delay(200));
  }

  getProjectRankings(): Observable<ProjectRanking[]> {
    const data: ProjectRanking[] = [
      { rank: 1, name: '金融區塊鏈交易模組', profitRate: 45.2, revenue: 3.5, pm: 'David Wu' },
      { rank: 2, name: '企業級 CRM 系統重構', profitRate: 32.5, revenue: 4.0, pm: 'Alex Chen' },
      { rank: 3, name: '雲端資料倉儲遷移', profitRate: 28.1, revenue: 2.8, pm: 'Jessica Lin' },
      { rank: 4, name: 'AI 客服機器人開發', profitRate: 12.4, revenue: 1.5, pm: 'Mike Wang' },
      { rank: 5, name: 'Q4 行銷自動化平台', profitRate: -5.2, revenue: 2.0, pm: 'Sarah Lin' }
    ];
    return of(data).pipe(delay(200));
  }

  getErosionCauses(): Observable<ErosionCause[]> {
    const data: ErosionCause[] = [
      { cause: '需求變更', amount: 85, percentage: 100 },
      { cause: '返工修正', amount: 62, percentage: 73 },
      { cause: '加班成本', amount: 45, percentage: 53 },
      { cause: '關鍵人力短缺', amount: 38, percentage: 45 },
      { cause: '延誤罰款', amount: 20, percentage: 24 }
    ];
    return of(data).pipe(delay(200));
  }

  // 毛利預測趨勢（實際 + AI 預測：基準/樂觀/悲觀）
  getProfitTrendData(): Observable<{ month: string; actual: number | null; predicted: number | null; optimistic: number | null; pessimistic: number | null }[]> {
    const data = [
      { month: '1月', actual: 1.0, predicted: null, optimistic: null, pessimistic: null },
      { month: '2月', actual: 1.3, predicted: null, optimistic: null, pessimistic: null },
      { month: '3月', actual: 1.2, predicted: null, optimistic: null, pessimistic: null },
      { month: '4月', actual: 1.7, predicted: null, optimistic: null, pessimistic: null },
      { month: '5月', actual: 2.0, predicted: null, optimistic: null, pessimistic: null },
      { month: '6月', actual: 2.2, predicted: null, optimistic: null, pessimistic: null },
      { month: '7月', actual: null, predicted: 2.5, optimistic: 2.8, pessimistic: 2.2 },
      { month: '8月', actual: null, predicted: 2.7, optimistic: 3.2, pessimistic: 2.3 },
      { month: '9月', actual: null, predicted: 2.6, optimistic: 3.3, pessimistic: 2.1 },
      { month: '10月', actual: null, predicted: 2.8, optimistic: 3.5, pessimistic: 2.2 },
      { month: '11月', actual: null, predicted: 3.2, optimistic: 4.0, pessimistic: 2.5 },
      { month: '12月', actual: null, predicted: 3.5, optimistic: 4.5, pessimistic: 2.8 }
    ];
    return of(data).pipe(delay(200));
  }

  // ---------------------------------------------------------------
  // 績效獎酬數據
  // ---------------------------------------------------------------
  getRewardKPI(): Observable<RewardKPI> {
    const data: RewardKPI = {
      alignmentRate: 92,
      alignmentTarget: 90,
      highPerfLowReward: 3,
      lowPerfHighReward: 2,
      fairnessRate: 88
    };
    return of(data).pipe(delay(200));
  }

  getRewardRiskEmployees(): Observable<RewardRiskEmployee[]> {
    const data: RewardRiskEmployee[] = [
      { id: '1', name: '王大明', position: '資深專案經理', performance: 'A', rewardLevel: 'P30', marketLevel: 'P75', riskType: 'retention' },
      { id: '2', name: '李小華', position: '技術主管', performance: 'A-', rewardLevel: 'P25', marketLevel: 'P60', riskType: 'retention' },
      { id: '3', name: '陳志明', position: '資深工程師', performance: 'A', rewardLevel: 'P35', marketLevel: 'P65', riskType: 'retention' },
      { id: '4', name: '張建華', position: '業務經理', performance: 'C+', rewardLevel: 'P80', marketLevel: '歷史因素', riskType: 'culture' },
      { id: '5', name: '林美玲', position: '行政主管', performance: 'C', rewardLevel: 'P70', marketLevel: '年資因素', riskType: 'culture' }
    ];
    return of(data).pipe(delay(200));
  }

  getNineBoxData(): Observable<NineBoxData[]> {
    const data: NineBoxData[] = [
      { category: 'high-high', count: 2, label: '觀察', color: '#E3C088' },
      { category: 'high-mid', count: 15, label: '合理', color: '#7FB095' },
      { category: 'high-low', count: 8, label: '明星', color: '#5a9e6f' },
      { category: 'mid-high', count: 12, label: '待發展', color: '#f0f0f0' },
      { category: 'mid-mid', count: 45, label: '主力', color: '#8DA8BE' },
      { category: 'mid-low', count: 18, label: '待調薪', color: '#7FB095' },
      { category: 'low-high', count: 8, label: '待觀察', color: '#f5f5f5' },
      { category: 'low-mid', count: 5, label: '檢視', color: '#E3C088' },
      { category: 'low-low', count: 3, label: '留才風險', color: '#C77F7F' }
    ];
    return of(data).pipe(delay(200));
  }
}

