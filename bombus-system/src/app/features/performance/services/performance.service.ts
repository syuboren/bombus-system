import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  CalculationPeriod,
  PeriodOption,
  ProfitKPISummary,
  DepartmentProfit,
  CostStructureItem,
  ProfitTrendData,
  ProfitAlert,
  BonusSettings,
  BonusTier,
  DepartmentBonus,
  PersonalBonus,
  BonusSummary,
  DepartmentTaskStats
} from '../models/performance.model';

@Injectable({
  providedIn: 'root'
})
export class PerformanceService {

  // ============================================
  // 計算週期選項
  // ============================================
  readonly periodOptions: PeriodOption[] = [
    { value: 'month', label: '本月' },
    { value: 'quarter', label: '本季' },
    { value: 'year', label: '本年度' }
  ];

  // ============================================
  // 預設獎金設定
  // ============================================
  private readonly defaultBonusSettings: BonusSettings = {
    bonusTiers: [
      { minAchievement: 0, maxAchievement: 80, bonusRatio: 0 },
      { minAchievement: 80, maxAchievement: 90, bonusRatio: 5 },
      { minAchievement: 90, maxAchievement: 100, bonusRatio: 10 },
      { minAchievement: 100, maxAchievement: 110, bonusRatio: 15 },
      { minAchievement: 110, maxAchievement: 999, bonusRatio: 20 }
    ],
    contributionWeights: {
      taskCompletion: 30,
      projectParticipation: 25,
      performanceScore: 30,
      competencyLevel: 15
    },
    distributionRatio: {
      departmentRatio: 30,
      personalRatio: 70,
      managerBonus: 10
    }
  };

  // ============================================
  // 毛利監控 API
  // ============================================

  /** 取得毛利 KPI 總覽 */
  getProfitKPISummary(period: CalculationPeriod): Observable<ProfitKPISummary> {
    const mockData: Record<CalculationPeriod, ProfitKPISummary> = {
      month: {
        currentProfit: 1850,
        profitMargin: 32.5,
        targetAchievement: 98.2,
        profitTrend: 'up',
        trendValue: 5.8,
        estimatedBonusPool: 185
      },
      quarter: {
        currentProfit: 5420,
        profitMargin: 31.8,
        targetAchievement: 102.5,
        profitTrend: 'up',
        trendValue: 8.2,
        estimatedBonusPool: 542
      },
      year: {
        currentProfit: 21680,
        profitMargin: 30.2,
        targetAchievement: 96.8,
        profitTrend: 'up',
        trendValue: 12.5,
        estimatedBonusPool: 2168
      }
    };
    return of(mockData[period]).pipe(delay(300));
  }

  /** 取得部門毛利資料 */
  getDepartmentProfits(period: CalculationPeriod): Observable<DepartmentProfit[]> {
    const mockData: DepartmentProfit[] = [
      {
        departmentId: 'eng',
        departmentName: '工程部',
        revenue: 2850,
        directCost: 1680,
        indirectCost: 285,
        grossProfit: 885,
        profitMargin: 31.1,
        targetAchievement: 103.5,
        bonusPool: 133,
        employeeCount: 42,
        color: '#7F9CA0'
      },
      {
        departmentId: 'pm',
        departmentName: '專案部',
        revenue: 1920,
        directCost: 1150,
        indirectCost: 192,
        grossProfit: 578,
        profitMargin: 30.1,
        targetAchievement: 98.2,
        bonusPool: 58,
        employeeCount: 28,
        color: '#9A8C98'
      },
      {
        departmentId: 'sales',
        departmentName: '業務部',
        revenue: 1680,
        directCost: 920,
        indirectCost: 168,
        grossProfit: 592,
        profitMargin: 35.2,
        targetAchievement: 112.8,
        bonusPool: 118,
        employeeCount: 18,
        color: '#D6A28C'
      },
      {
        departmentId: 'finance',
        departmentName: '財會部',
        revenue: 420,
        directCost: 280,
        indirectCost: 42,
        grossProfit: 98,
        profitMargin: 23.3,
        targetAchievement: 88.5,
        bonusPool: 5,
        employeeCount: 8,
        color: '#8DA399'
      }
    ];
    return of(mockData).pipe(delay(300));
  }

  /** 取得成本結構 */
  getCostStructure(period: CalculationPeriod): Observable<CostStructureItem[]> {
    const mockData: CostStructureItem[] = [
      { category: 'labor', label: '人力成本', amount: 2580, percentage: 52.3, color: '#B87D7B' },
      { category: 'material', label: '材料成本', amount: 1250, percentage: 25.4, color: '#9A8C98' },
      { category: 'outsource', label: '外包費用', amount: 680, percentage: 13.8, color: '#7F9CA0' },
      { category: 'indirect', label: '間接成本', amount: 420, percentage: 8.5, color: '#8DA399' }
    ];
    return of(mockData).pipe(delay(200));
  }

  /** 取得毛利趨勢資料 */
  getProfitTrendData(period: CalculationPeriod): Observable<ProfitTrendData[]> {
    const monthlyData: ProfitTrendData[] = [
      { period: '7月', revenue: 5200, cost: 3580, grossProfit: 1620, profitMargin: 31.2, target: 30 },
      { period: '8月', revenue: 5450, cost: 3720, grossProfit: 1730, profitMargin: 31.7, target: 30 },
      { period: '9月', revenue: 5680, cost: 3890, grossProfit: 1790, profitMargin: 31.5, target: 30 },
      { period: '10月', revenue: 5920, cost: 4050, grossProfit: 1870, profitMargin: 31.6, target: 30 },
      { period: '11月', revenue: 5780, cost: 3980, grossProfit: 1800, profitMargin: 31.1, target: 30 },
      { period: '12月', revenue: 5690, cost: 3840, grossProfit: 1850, profitMargin: 32.5, target: 30 }
    ];
    
    if (period === 'quarter') {
      return of([
        { period: 'Q1', revenue: 15800, cost: 10920, grossProfit: 4880, profitMargin: 30.9, target: 30 },
        { period: 'Q2', revenue: 16250, cost: 11180, grossProfit: 5070, profitMargin: 31.2, target: 30 },
        { period: 'Q3', revenue: 16820, cost: 11540, grossProfit: 5280, profitMargin: 31.4, target: 30 },
        { period: 'Q4', revenue: 17390, cost: 11870, grossProfit: 5520, profitMargin: 31.7, target: 30 }
      ]).pipe(delay(300));
    }
    
    return of(monthlyData).pipe(delay(300));
  }

  /** 取得異常警示 */
  getProfitAlerts(): Observable<ProfitAlert[]> {
    const mockData: ProfitAlert[] = [
      {
        id: '1',
        type: 'cost_overrun',
        severity: 'high',
        department: '工程部',
        message: '人力成本超出預算 15%',
        value: '+15%',
        createdAt: new Date()
      },
      {
        id: '2',
        type: 'low_margin',
        severity: 'medium',
        department: '財會部',
        message: '毛利率低於目標 6.7%',
        value: '-6.7%',
        createdAt: new Date()
      },
      {
        id: '3',
        type: 'target_risk',
        severity: 'low',
        department: '專案部',
        message: '目標達成率接近警戒線',
        value: '98.2%',
        createdAt: new Date()
      }
    ];
    return of(mockData).pipe(delay(200));
  }

  // ============================================
  // 獎金分配 API
  // ============================================

  /** 取得獎金設定 */
  getBonusSettings(): Observable<BonusSettings> {
    return of(this.defaultBonusSettings).pipe(delay(200));
  }

  /** 更新獎金設定 */
  updateBonusSettings(settings: BonusSettings): Observable<BonusSettings> {
    // 實際應用中會發送到後端
    return of(settings).pipe(delay(300));
  }

  /** 計算部門獎金 */
  calculateDepartmentBonus(period: CalculationPeriod): Observable<DepartmentBonus[]> {
    const settings = this.defaultBonusSettings;
    
    const mockData: DepartmentBonus[] = [
      {
        departmentId: 'eng',
        departmentName: '工程部',
        revenue: 2850,
        grossProfit: 885,
        profitMargin: 31.1,
        targetAchievement: 103.5,
        bonusTierApplied: 15,
        bonusPool: 132.75,
        departmentBonus: 39.83,
        personalBonusPool: 92.93,
        employeeCount: 42,
        avgBonusPerPerson: 2.21
      },
      {
        departmentId: 'pm',
        departmentName: '專案部',
        revenue: 1920,
        grossProfit: 578,
        profitMargin: 30.1,
        targetAchievement: 98.2,
        bonusTierApplied: 10,
        bonusPool: 57.8,
        departmentBonus: 17.34,
        personalBonusPool: 40.46,
        employeeCount: 28,
        avgBonusPerPerson: 1.45
      },
      {
        departmentId: 'sales',
        departmentName: '業務部',
        revenue: 1680,
        grossProfit: 592,
        profitMargin: 35.2,
        targetAchievement: 112.8,
        bonusTierApplied: 20,
        bonusPool: 118.4,
        departmentBonus: 35.52,
        personalBonusPool: 82.88,
        employeeCount: 18,
        avgBonusPerPerson: 4.60
      },
      {
        departmentId: 'finance',
        departmentName: '財會部',
        revenue: 420,
        grossProfit: 98,
        profitMargin: 23.3,
        targetAchievement: 88.5,
        bonusTierApplied: 5,
        bonusPool: 4.9,
        departmentBonus: 1.47,
        personalBonusPool: 3.43,
        employeeCount: 8,
        avgBonusPerPerson: 0.43
      }
    ];
    
    return of(mockData).pipe(delay(400));
  }

  /** 計算個人獎金 */
  calculatePersonalBonus(departmentId: string): Observable<PersonalBonus[]> {
    // 根據部門生成 Mock 資料
    const names: Record<string, string[]> = {
      eng: ['張志豪', '林淑芬', '王建民', '陳美玲', '李宗翰'],
      pm: ['黃雅琪', '吳承恩', '劉曉慧', '周杰倫'],
      sales: ['蔡依林', '周潤發', '林青霞'],
      finance: ['郭富城', '張國榮']
    };

    const positions: Record<string, string[]> = {
      eng: ['資深工程師', '工程師', '技術經理', '工程師', '資深工程師'],
      pm: ['專案經理', '專案副理', '專案經理', '專案專員'],
      sales: ['業務經理', '資深業務', '業務專員'],
      finance: ['財務經理', '會計師']
    };

    const deptNames = names[departmentId] || names['eng'];
    const deptPositions = positions[departmentId] || positions['eng'];

    const mockData: PersonalBonus[] = deptNames.map((name, index) => {
      const isManager = deptPositions[index]?.includes('經理') || false;
      const baseSalary = isManager ? 8.5 : 5.2 + Math.random() * 2;
      const taskScore = 70 + Math.random() * 30;
      const projectScore = 65 + Math.random() * 35;
      const perfScore = 72 + Math.random() * 28;
      const compLevel = Math.floor(2 + Math.random() * 3);
      
      const totalScore = (taskScore * 0.3 + projectScore * 0.25 + perfScore * 0.3 + compLevel * 20 * 0.15);
      const contributionWeight = 15 + Math.random() * 10;
      const baseBonus = (contributionWeight / 100) * 92.93;
      const managerBonusAmt = isManager ? baseBonus * 0.1 : 0;
      const totalBonus = baseBonus + managerBonusAmt;

      return {
        employeeId: `EMP${String(index + 1).padStart(3, '0')}`,
        employeeName: name,
        department: departmentId === 'eng' ? '工程部' : 
                    departmentId === 'pm' ? '專案部' : 
                    departmentId === 'sales' ? '業務部' : '財會部',
        position: deptPositions[index] || '專員',
        isManager,
        baseSalary: parseFloat(baseSalary.toFixed(2)),
        taskCompletionScore: parseFloat(taskScore.toFixed(1)),
        projectParticipationScore: parseFloat(projectScore.toFixed(1)),
        performanceScore: parseFloat(perfScore.toFixed(1)),
        competencyLevel: compLevel,
        totalContributionScore: parseFloat(totalScore.toFixed(1)),
        contributionWeight: parseFloat(contributionWeight.toFixed(1)),
        baseBonus: parseFloat(baseBonus.toFixed(2)),
        managerBonus: parseFloat(managerBonusAmt.toFixed(2)),
        totalBonus: parseFloat(totalBonus.toFixed(2)),
        bonusRatio: parseFloat(((totalBonus / baseSalary) * 100).toFixed(1))
      };
    });

    return of(mockData).pipe(delay(300));
  }

  /** 取得獎金計算摘要 */
  getBonusSummary(period: CalculationPeriod): Observable<BonusSummary> {
    const mockData: BonusSummary = {
      period: period === 'month' ? '2025年12月' : period === 'quarter' ? '2025年Q4' : '2025年度',
      totalRevenue: 6870,
      totalGrossProfit: 2153,
      avgProfitMargin: 31.3,
      totalBonusPool: 313.85,
      totalDepartmentBonus: 94.16,
      totalPersonalBonus: 219.70,
      employeeCount: 96,
      avgBonusPerPerson: 2.29
    };
    return of(mockData).pipe(delay(300));
  }

  /** 取得獎金提撥比例 (根據達成率) */
  getBonusRatioByAchievement(achievement: number, tiers: BonusTier[]): number {
    for (const tier of tiers) {
      if (achievement >= tier.minAchievement && achievement < tier.maxAchievement) {
        return tier.bonusRatio;
      }
    }
    return 0;
  }

  // ============================================
  // 任務統計
  // ============================================

  /** 取得部門任務統計 */
  getDepartmentTaskStats(): Observable<DepartmentTaskStats[]> {
    const mockData: DepartmentTaskStats[] = [
      { department: '工程部', totalTasks: 156, completedTasks: 128, inProgressTasks: 22, overdueTasks: 6, completionRate: 82.1 },
      { department: '專案部', totalTasks: 89, completedTasks: 72, inProgressTasks: 14, overdueTasks: 3, completionRate: 80.9 },
      { department: '業務部', totalTasks: 64, completedTasks: 58, inProgressTasks: 5, overdueTasks: 1, completionRate: 90.6 },
      { department: '財會部', totalTasks: 42, completedTasks: 38, inProgressTasks: 3, overdueTasks: 1, completionRate: 90.5 }
    ];
    return of(mockData).pipe(delay(200));
  }
}

