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
  ProjectBubble,
  ProjectGanttItem,
  ProjectStatusStats,
  ProjectTypeStats,
  CostStructureItem,
  CostWarningItem,
  VisionMissionSummary,
  EAPSummary,
  EmployeeStorySummary,
  ForecastPipeline
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
        trend: 6,
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
        trend: 4,
        description: '人力配置→交付→毛利',
        icon: 'ri-folder-chart-line',
        color: '#D6A28C',
        metrics: [
          { label: '專案交付健康度', value: '3/5 正常', status: 'warning' },
          { label: '毛利達成率', value: '103%', status: 'positive' },
          { label: '風險專案', value: '2 個', status: 'danger' }
        ],
        sparklineData: [68, 50, 81, 91, 80, 72]
      },
      {
        name: 'culture',
        label: 'Culture 文化',
        score: 81,
        trend: -2,
        description: '行為訊號量化',
        icon: 'ri-heart-line',
        color: '#9A8C98',
        metrics: [
          { label: '績效獎酬對齊度', value: '92%', status: 'positive' },
          { label: '本年獎金池', value: '$2,850,000', status: 'positive' },
          { label: '員工故事', value: '本月 +12 則', status: 'positive' }
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
      // 人才風險 - 關鍵職位 (紅色)
      {
        id: 't1',
        title: '人資主管職位',
        description: '接班人數：0，預計 Q2 離職風險',
        severity: 'critical',
        category: 'people',
        alertType: 'key-position',
        icon: 'ri-user-star-line'
      },
      {
        id: 't2',
        title: '技術長',
        description: '現任者已提出轉調意向',
        severity: 'critical',
        category: 'people',
        alertType: 'key-position',
        icon: 'ri-user-star-line'
      },
      {
        id: 't3',
        title: '財務主管',
        description: '關鍵人才離職率偏高',
        severity: 'critical',
        category: 'people',
        alertType: 'key-position',
        icon: 'ri-user-star-line'
      },
      // 人才風險 - 能力缺口 (黃色)
      {
        id: 't4',
        title: '專案管理能力缺口',
        description: '12 人待培訓，影響 Q3 交付',
        severity: 'warning',
        category: 'people',
        alertType: 'capability-gap',
        icon: 'ri-lightbulb-flash-line'
      },
      {
        id: 't5',
        title: '技術新技術導入落差',
        description: '需補足 AI/ML 領域人才 5 名',
        severity: 'warning',
        category: 'people',
        alertType: 'capability-gap',
        icon: 'ri-lightbulb-flash-line'
      },
      // 專案風險 - 高風險 (紅色)
      {
        id: 'p1',
        title: 'PRJ-001 網路設備整合',
        description: '進度落後 15%，建議本週召開檢討會',
        severity: 'critical',
        category: 'project',
        alertType: 'project-risk',
        icon: 'ri-timer-flash-line'
      },
      {
        id: 'p2',
        title: 'PRJ-003 通訊設備採購',
        description: '核心成員即將離職，需啟動知識轉移',
        severity: 'critical',
        category: 'project',
        alertType: 'project-risk',
        icon: 'ri-user-unfollow-line'
      },
      // 專案風險 - 中風險 (黃色)
      {
        id: 'p3',
        title: 'PRJ-006 資訊設備標案',
        description: 'A 級客戶合約 2 週後到期，需續約談判',
        severity: 'warning',
        category: 'project',
        alertType: 'project-risk',
        icon: 'ri-file-warning-line'
      }
    ];
    return of(data).pipe(delay(200));
  }

  getDecisionItems(): Observable<DecisionItem[]> {
    const data: DecisionItem[] = [
      // 緊急
      {
        id: '1',
        title: 'PRJ-001 網路設備整合',
        description: '進度落後 15%，建議本週召開檢討會',
        priority: 'urgent',
        icon: 'ri-alarm-warning-line',
        actionLabel: '查看詳情'
      },
      {
        id: '2',
        title: 'PRJ-003 通訊設備採購',
        description: '核心成員即將離職，需啟動知識轉移',
        priority: 'urgent',
        icon: 'ri-user-unfollow-line',
        actionLabel: '查看詳情'
      },
      {
        id: '3',
        title: 'PRJ-006 資訊設備標案',
        description: 'A 級客戶合約 2 週後到期，需續約談判',
        priority: 'urgent',
        icon: 'ri-file-warning-line',
        actionLabel: '查看詳情'
      },
      // 重要
      {
        id: '4',
        title: 'PRJ-007 通訊設備採購案',
        description: '12 人待培訓，建議啟動 Q1 PMP 班',
        priority: 'important',
        icon: 'ri-user-settings-line',
        actionLabel: '查看詳情'
      },
      {
        id: '5',
        title: 'PRJ-004 系統建置',
        description: '累積 45 項技術債，建議安排 Sprint 處理',
        priority: 'important',
        icon: 'ri-code-box-line',
        actionLabel: '查看詳情'
      },
      {
        id: '6',
        title: 'PRJ-005 通訊設備採購案',
        description: '距離評估截止日剩 3 週，已完成 65%',
        priority: 'important',
        icon: 'ri-survey-line',
        actionLabel: '查看詳情'
      },
      {
        id: '7',
        title: 'PRJ-011 軟體升級專案',
        description: '5 名新進人員待完成入職培訓',
        priority: 'important',
        icon: 'ri-graduation-cap-line',
        actionLabel: '查看詳情'
      },
      // 機會
      {
        id: '8',
        title: 'PRJ-021 金融區塊鏈專案',
        description: '毛利率 45%，建議複製模式到下季專案',
        priority: 'opportunity',
        icon: 'ri-lightbulb-line',
        actionLabel: '查看詳情'
      },
      {
        id: '9',
        title: 'PRJ-023 AI 客服機器人建置',
        description: '3 家潛在客戶表達興趣，預估營收 $2M',
        priority: 'opportunity',
        icon: 'ri-robot-line',
        actionLabel: '查看詳情'
      },
      {
        id: '10',
        title: 'PRJ-014 內部工具 SaaS 化',
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
    const competencies = ['領導力', '創新思維', '專案管理', '數據分析', '溝通協調', '團隊合作'];

    const getStatus = (score: number): 'achieved' | 'slight' | 'severe' => {
      if (score >= 4.0) return 'achieved';
      if (score >= 3.0) return 'slight';
      return 'severe';
    };

    const rawData = [
      // 研發部
      { dept: '研發部', comp: '領導力', score: 3.0 },
      { dept: '研發部', comp: '創新思維', score: 3.9 },
      { dept: '研發部', comp: '專案管理', score: 3.2 },
      { dept: '研發部', comp: '數據分析', score: 4.2 },
      { dept: '研發部', comp: '溝通協調', score: 3.8 },
      { dept: '研發部', comp: '團隊合作', score: 4.5 },
      // 業務部
      { dept: '業務部', comp: '領導力', score: 3.6 },
      { dept: '業務部', comp: '創新思維', score: 3.2 },
      { dept: '業務部', comp: '專案管理', score: 2.5 },
      { dept: '業務部', comp: '數據分析', score: 2.4 },
      { dept: '業務部', comp: '溝通協調', score: 4.3 },
      { dept: '業務部', comp: '團隊合作', score: 4.1 },
      // 行銷部
      { dept: '行銷部', comp: '領導力', score: 3.1 },
      { dept: '行銷部', comp: '創新思維', score: 4.4 },
      { dept: '行銷部', comp: '專案管理', score: 3.0 },
      { dept: '行銷部', comp: '數據分析', score: 3.7 },
      { dept: '行銷部', comp: '溝通協調', score: 4.1 },
      { dept: '行銷部', comp: '團隊合作', score: 3.5 },
      // 人資部
      { dept: '人資部', comp: '領導力', score: 3.9 },
      { dept: '人資部', comp: '創新思維', score: 3.3 },
      { dept: '人資部', comp: '專案管理', score: 3.8 },
      { dept: '人資部', comp: '數據分析', score: 3.2 },
      { dept: '人資部', comp: '溝通協調', score: 4.5 },
      { dept: '人資部', comp: '團隊合作', score: 4.2 },
      // 財務部
      { dept: '財務部', comp: '領導力', score: 3.2 },
      { dept: '財務部', comp: '創新思維', score: 2.9 },
      { dept: '財務部', comp: '專案管理', score: 3.6 },
      { dept: '財務部', comp: '數據分析', score: 4.6 },
      { dept: '財務部', comp: '溝通協調', score: 3.7 },
      { dept: '財務部', comp: '團隊合作', score: 3.8 }
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
        performanceGrade: 'A',
        leaveReason: '月度績效下滑',
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
        performanceGrade: 'A+',
        leaveReason: '工作負荷過重',
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
        performanceGrade: 'A-',
        leaveReason: '缺乏晉升機會',
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
        performanceGrade: 'A',
        leaveReason: '缺乏實務機會',
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
      onTrackCount: 3,
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
      confirmedRevenue: 68,
      confirmedProjects: 9,
      avgProfitRate: 28,
      profitRateTarget: 30,
      costControlRate: 86,
      anomalyWarnings: 2,
      totalRevenue: 13.8,
      erosionWarning: 200
    };
    return of(data).pipe(delay(200));
  }

  getCostStructure(): Observable<CostStructureItem[]> {
    const data: CostStructureItem[] = [
      { id: 'fixed', label: '固定成本', estimated: 25, actual: 28, difference: 3, estimatedAmount: 250, actualAmount: 280 },
      { id: 'indirect', label: '間接成本', estimated: 15, actual: 12, difference: -3, estimatedAmount: 150, actualAmount: 120 },
      { id: 'labor', label: '人力成本', estimated: 45, actual: 52, difference: 7, estimatedAmount: 450, actualAmount: 520 },
      { id: 'other', label: '其他', estimated: 15, actual: 8, difference: -7, estimatedAmount: 150, actualAmount: 80 }
    ];
    return of(data).pipe(delay(200));
  }

  getCostWarnings(): Observable<CostWarningItem[]> {
    const data: CostWarningItem[] = [
      { id: '1', projectName: '網路設備整合案', category: '人力成本', overBudget: 45, severity: 'high' },
      { id: '2', projectName: '系統建置專案', category: '固定成本', overBudget: 28, severity: 'medium' }
    ];
    return of(data).pipe(delay(200));
  }

  getProjectRankings(): Observable<ProjectRanking[]> {
    const data: ProjectRanking[] = [
      { rank: 1, name: '金融區塊鏈交易模組', profitRate: 45.2, revenue: 3.5, pm: 'David Wu', contractValue: 7.8, costStatus: 'better' },
      { rank: 2, name: '企業級 CRM 系統重構', profitRate: 32.5, revenue: 4.0, pm: 'Alex Chen', contractValue: 12.3, costStatus: 'normal' },
      { rank: 3, name: '雲端資料倉儲遷移', profitRate: 28.1, revenue: 2.8, pm: 'Jessica Lin', contractValue: 10.0, costStatus: 'better' },
      { rank: 4, name: 'AI 客服機器人開發', profitRate: 12.4, revenue: 1.5, pm: 'Mike Wang', contractValue: 5.5, costStatus: 'normal' },
      { rank: 5, name: 'Q4 行銷自動化平台', profitRate: -5.2, revenue: 2.0, pm: 'Sarah Lin', contractValue: 8.2, costStatus: 'pending' }
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

  // ---------------------------------------------------------------
  // 專案甘特圖數據
  // ---------------------------------------------------------------
  getProjectGanttItems(): Observable<ProjectGanttItem[]> {
    const data: ProjectGanttItem[] = [
      {
        id: 'PRJ-001',
        title: '網路設備整合案',
        type: 'integration',
        pm: { name: '待指派', avatar: null },
        progress: 30,
        stage: '履約中',
        status: 'risk',
        startDate: '2025-12-01',
        endDate: '2026-02-15',
        budget: 850,
        nextMilestone: { percentage: 40, label: '提案與預算討論', expectedDate: '2025/01' },
        salesLead: '張志遠',
        engineeringLead: '王大明'
      },
      {
        id: 'PRJ-002',
        title: '設備維護服務案',
        type: 'service',
        pm: { name: '林經理', avatar: null },
        progress: 20,
        stage: '規劃中',
        status: 'delay',
        startDate: '2025-12-10',
        endDate: '2026-01-20',
        budget: 320,
        nextMilestone: { percentage: 30, label: '解決方案建議', expectedDate: '2025/01' },
        salesLead: '陳美玲',
        engineeringLead: '林建宏'
      },
      {
        id: 'PRJ-003',
        title: '通訊設備採購案',
        type: 'procurement',
        pm: { name: '陳專員', avatar: null },
        progress: 50,
        stage: '履約中',
        status: 'normal',
        startDate: '2025-11-20',
        endDate: '2026-01-15',
        budget: 1200,
        nextMilestone: { percentage: 60, label: '合約談判', expectedDate: '2025/01' },
        salesLead: '黃雅婷',
        engineeringLead: '吳俊傑'
      },
      {
        id: 'PRJ-004',
        title: '系統建置專案',
        type: 'integration',
        pm: { name: '張大銘', avatar: null },
        progress: 45,
        stage: '履約中',
        status: 'normal',
        startDate: '2025-12-05',
        endDate: '2026-03-01',
        budget: 2500,
        nextMilestone: { percentage: 50, label: '初步承諾', expectedDate: '2025/02' },
        salesLead: '李小華',
        engineeringLead: '陳建宏'
      },
      {
        id: 'PRJ-005',
        title: '軟體升級專案',
        type: 'software',
        pm: { name: '王小美', avatar: null },
        progress: 35,
        stage: '開發中',
        status: 'normal',
        startDate: '2025-12-15',
        endDate: '2026-02-28',
        budget: 680,
        nextMilestone: { percentage: 40, label: '提案與預算討論', expectedDate: '2025/01' },
        salesLead: '周怡君',
        engineeringLead: '林雅婷'
      },
      {
        id: 'PRJ-006',
        title: '資訊設備標案',
        type: 'procurement',
        pm: { name: '李建國', avatar: null },
        progress: 60,
        stage: '驗收中',
        status: 'normal',
        startDate: '2025-11-01',
        endDate: '2025-12-31',
        budget: 1800,
        nextMilestone: { percentage: 70, label: '專案啟動', expectedDate: '2025/01' },
        salesLead: '張美玲',
        engineeringLead: '王志明'
      }
    ];
    return of(data).pipe(delay(200));
  }

  getProjectStatusStats(): Observable<ProjectStatusStats[]> {
    const data: ProjectStatusStats[] = [
      { status: 'normal', count: 4, label: '正常', color: '#7FB095' },
      { status: 'risk', count: 1, label: '風險', color: '#E3C088' },
      { status: 'delay', count: 1, label: '延遲', color: '#C77F7F' }
    ];
    return of(data).pipe(delay(200));
  }

  getProjectTypeStats(): Observable<ProjectTypeStats[]> {
    const data: ProjectTypeStats[] = [
      { type: 'integration', count: 2, label: '整合', color: '#b8a99a' },
      { type: 'procurement', count: 2, label: '採購', color: '#7F9CA0' },
      { type: 'service', count: 1, label: '服務', color: '#9A8C98' },
      { type: 'software', count: 1, label: '軟體', color: '#D6A28C' }
    ];
    return of(data).pipe(delay(200));
  }

  // ---------------------------------------------------------------
  // 願景使命 & 員工關懷 (文化訊號區塊)
  // ---------------------------------------------------------------
  getVisionMissionSummary(): Observable<VisionMissionSummary> {
    const data: VisionMissionSummary = {
      vision: '藉由系統整合提供軍用標準的客製化解決方案，成為客戶不可或缺的夥伴、行業的標竿。',
      mission: '防禦國家安全、守護人民安全，實現安全無虞的社會價值。',
      coreValues: [
        { name: '使命宣言', icon: 'ri-lightbulb-flash-line', description: '我們每一天的努力都是為了這個偉大的使命做出貢獻。' }
      ],
      version: '3.0'
    };
    return of(data).pipe(delay(200));
  }

  getEAPSummary(): Observable<EAPSummary> {
    const data: EAPSummary = {
      benefits: [
        {
          id: 'mental-leave',
          name: '心靈假',
          icon: 'ri-mental-health-line',
          quota: '4 天/年',
          description: '身心調適假期',
          status: 'active'
        },
        {
          id: 'counseling',
          name: '心理諮商',
          icon: 'ri-empathize-line',
          quota: '4 次/年',
          description: '免費・匿名',
          status: 'active'
        },
        {
          id: 'three-day-weekend',
          name: '週休三日',
          icon: 'ri-calendar-check-line',
          quota: '績效獎勵式',
          description: '預計 2026 上線',
          status: 'coming-soon',
          launchDate: '2026'
        }
      ],
      impact: {
        productivityImprovement: 8,
        turnoverReduction: 15,
        roi: 320
      }
    };
    return of(data).pipe(delay(200));
  }

  // ---------------------------------------------------------------
  // 員工故事區塊 (佈告欄便利貼風格)
  // ---------------------------------------------------------------
  getEmployeeStorySummary(): Observable<EmployeeStorySummary> {
    const data: EmployeeStorySummary = {
      kpi: {
        newThisMonth: 12,
        totalStories: 47
      },
      categoryStats: [
        { category: 'training', label: '培訓回饋分享', icon: 'ri-graduation-cap-line', count: 18, color: '#FFB74D' },
        { category: 'interaction', label: '日常互動故事', icon: 'ri-chat-smile-3-line', count: 15, color: '#81C784' },
        { category: 'customer', label: '客戶感謝回饋', icon: 'ri-heart-line', count: 9, color: '#64B5F6' },
        { category: 'collaboration', label: '跨部門協作', icon: 'ri-team-line', count: 5, color: '#BA68C8' }
      ],
      featuredStories: [
        {
          id: '1',
          title: '培訓後的蛻變',
          excerpt: '參加完領導力培訓後，終於有勇氣主動帶領專案！',
          author: '王小美',
          department: '產品部',
          category: 'training',
          likes: 32,
          date: '2024-12-25',
          moodColor: '#FFB74D'
        },
        {
          id: '2',
          title: '午餐時刻的溫暖',
          excerpt: '同事知道我加班晚餐沒著落，悄悄幫我訂了便當 💕',
          author: '李大華',
          department: '研發部',
          category: 'interaction',
          likes: 45,
          date: '2024-12-24',
          moodColor: '#81C784'
        },
        {
          id: '3',
          title: '客戶的手寫卡片',
          excerpt: '收到客戶親手寫的感謝卡，這就是工作的意義！',
          author: '張美玲',
          department: '客服部',
          category: 'customer',
          likes: 56,
          date: '2024-12-23',
          moodColor: '#64B5F6'
        },
        {
          id: '4',
          title: '跨部門的奇蹟',
          excerpt: '研發×業務×客服一起熬夜完成不可能的任務 🎉',
          author: '陳志明',
          department: '業務部',
          category: 'collaboration',
          likes: 78,
          date: '2024-12-22',
          moodColor: '#BA68C8'
        },
        {
          id: '5',
          title: 'Excel 進階班收穫滿滿',
          excerpt: '原來 VLOOKUP 還可以這樣用！效率提升 200%',
          author: '林小芳',
          department: '財務部',
          category: 'training',
          likes: 28,
          date: '2024-12-21',
          moodColor: '#FFB74D'
        },
        {
          id: '6',
          title: '新人的第一杯咖啡',
          excerpt: '報到第一天，前輩就主動請我喝咖啡聊天 ☕',
          author: '周俊傑',
          department: '行銷部',
          category: 'interaction',
          likes: 41,
          date: '2024-12-20',
          moodColor: '#81C784'
        },
        {
          id: '7',
          title: '客戶主動續約',
          excerpt: '客戶說很滿意我們的服務，直接簽了三年約！',
          author: '黃雅琪',
          department: '業務部',
          category: 'customer',
          likes: 67,
          date: '2024-12-19',
          moodColor: '#64B5F6'
        },
        {
          id: '8',
          title: '會議室裡的火花',
          excerpt: '行銷跟研發一起腦力激盪，碰撞出超棒的新功能！',
          author: '吳建宏',
          department: '研發部',
          category: 'collaboration',
          likes: 52,
          date: '2024-12-18',
          moodColor: '#BA68C8'
        }
      ]
    };
    return of(data).pipe(delay(200));
  }

  // ---------------------------------------------------------------
  // Forecast Pipeline 數據
  // ---------------------------------------------------------------
  getForecastPipeline(): Observable<ForecastPipeline> {
    const data: ForecastPipeline = {
      stages: [
        // 探索期 (10-30%) - 藍色系，由淺到深
        { percentage: 10, label: '接觸', count: 3, color: '#B8D4E8' },    // 淺藍
        { percentage: 20, label: '需求', count: 2, color: '#8FBFE0' },    // 中藍
        { percentage: 30, label: '提案', count: 4, color: '#5A9BD4' },    // 深藍
        // 提案期 (40-50%) - 黃色系，由淺到深
        { percentage: 40, label: '討論', count: 2, color: '#F5E6B8' },    // 淺黃
        { percentage: 50, label: '承諾', count: 3, color: '#E3C088' },    // 深黃
        // 執行期 (60-80%) - 紅/橙色系，由淺到深
        { percentage: 60, label: '談判', count: 2, color: '#F0C4B8' },    // 淺紅
        { percentage: 70, label: '啟動', count: 1, color: '#D9A89C' },    // 中紅
        { percentage: 80, label: '簽約', count: 2, color: '#C77F7F' },    // 深紅
        // 結案期 (90-100%) - 綠色系，由淺到深
        { percentage: 90, label: '交付', count: 1, color: '#B8D9C4' },    // 淺綠
        { percentage: 100, label: '結案', count: 5, color: '#7FB095' }    // 深綠
      ],
      groups: [
        { id: 'exploration', label: '探索期', range: '(10-30%)', amount: 8210, color: '#5A9BD4' },   // 藍色 (與30%一致)
        { id: 'proposal', label: '提案期', range: '(40-50%)', amount: 6500, color: '#E3C088' },      // 黃色 (與50%一致)
        { id: 'execution', label: '執行期', range: '(60-80%)', amount: 1600, color: '#C77F7F' },     // 紅色 (與80%一致)
        { id: 'closing', label: '結案期', range: '(90-100%)', amount: 620, color: '#7FB095' }        // 綠色 (與100%一致)
      ],
      totalAmount: 16930,
      totalProjects: 25
    };
    return of(data).pipe(delay(200));
  }
}

