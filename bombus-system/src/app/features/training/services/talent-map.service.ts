import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  HeatmapCell,
  HeatmapStats,
  HeatmapFilter,
  NineBoxEmployee,
  NineBoxFilter,
  NineBoxCategory,
  NineBoxCategoryInfo,
  LearningProgress,
  Course,
  PathStep,
  TimelineItem,
  SkillTreeNode,
  KeyTalentMetric,
  RiskAlert,
  SuccessionPlan,
  SelectOption
} from '../models/talent-map.model';

@Injectable({ providedIn: 'root' })
export class TalentMapService {

  // =====================================================
  // Common Options
  // =====================================================

  readonly departmentOptions: SelectOption[] = [
    { value: 'all', label: '所有部門' },
    { value: 'RD', label: '研發部' },
    { value: 'HR', label: '人資部' },
    { value: 'Sales', label: '業務部' },
    { value: 'Marketing', label: '行銷部' }
  ];

  readonly competencyTypeOptions: SelectOption[] = [
    { value: 'all', label: '所有職能' },
    { value: 'technical', label: '技術職能' },
    { value: 'management', label: '管理職能' },
    { value: 'soft', label: '軟技能' }
  ];

  readonly levelOptions: SelectOption[] = [
    { value: 'all', label: '所有職級' },
    { value: 'staff', label: '一般員工' },
    { value: 'middle', label: '中階主管' },
    { value: 'senior', label: '高階主管' }
  ];

  readonly viewLevelOptions: SelectOption[] = [
    { value: 'org', label: '組織層級' },
    { value: 'dept', label: '部門層級' },
    { value: 'emp', label: '員工層級' }
  ];

  // =====================================================
  // Heatmap Data
  // =====================================================

  // 部門列表
  private readonly heatmapDepartments = ['研發部', '業務部', '行銷部', '人資部', '財務部', '客服部', '產品部', '設計部'];

  // 職能項目列表
  private readonly competenciesMap: Record<string, string[]> = {
    core: ['溝通協調', '團隊合作', '問題解決', '創新思維', '學習能力'],
    professional: ['專業技術', '數據分析', '專案管理', '流程優化', '品質管理'],
    management: ['領導統御', '決策能力', '目標管理', '資源配置', '績效管理']
  };

  getHeatmapData(filter: HeatmapFilter): Observable<HeatmapCell[]> {
    // 根據職能類型篩選
    let competencies: string[];
    if (filter.competencyType === 'all') {
      competencies = [
        ...this.competenciesMap['core'],
        ...this.competenciesMap['professional'],
        ...this.competenciesMap['management']
      ];
    } else if (filter.competencyType === 'technical') {
      competencies = this.competenciesMap['professional'];
    } else if (filter.competencyType === 'management') {
      competencies = this.competenciesMap['management'];
    } else if (filter.competencyType === 'soft') {
      competencies = this.competenciesMap['core'];
    } else {
      competencies = [
        ...this.competenciesMap['core'],
        ...this.competenciesMap['professional'],
        ...this.competenciesMap['management']
      ];
    }

    // 根據部門篩選
    let departments = this.heatmapDepartments;
    if (filter.department !== 'all') {
      const deptMap: Record<string, string> = {
        'RD': '研發部',
        'HR': '人資部',
        'Sales': '業務部',
        'Marketing': '行銷部'
      };
      const selectedDept = deptMap[filter.department];
      if (selectedDept) {
        departments = [selectedDept];
      }
    }

    const data: HeatmapCell[] = [];

    departments.forEach(dept => {
      competencies.forEach(comp => {
        // 生成 30-100 之間的隨機分數
        let score = Math.floor(Math.random() * 70) + 30;

        // 某些部門在特定職能上表現較好
        if (dept.includes('研發') && comp.includes('技術')) score += 15;
        if (dept.includes('業務') && comp.includes('溝通')) score += 15;
        if (dept.includes('人資') && comp.includes('協調')) score += 15;
        if (dept.includes('財務') && comp.includes('分析')) score += 15;

        // 確保分數在 0-100 範圍內
        score = Math.min(100, Math.max(0, score));

        const required = 70;
        data.push({
          department: dept,
          competency: comp,
          score,
          required,
          gap: required - score
        });
      });
    });

    return of(data).pipe(delay(300));
  }

  getHeatmapStats(data: HeatmapCell[]): HeatmapStats {
    const scores = data.map(d => d.score);
    const avgScore = parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
    const excellentCount = data.filter(d => d.score >= 90).length;
    const needTrainingCount = data.filter(d => d.score < 50).length;

    return { avgScore, excellentCount, needTrainingCount };
  }

  // =====================================================
  // Nine Box Data
  // =====================================================

  readonly nineBoxCategories: NineBoxCategoryInfo[] = [
    { key: 'develop', title: '待開發', subtitle: '低績效高潛力', color: '#E3C088', bgGradient: 'linear-gradient(135deg, rgba(227, 192, 136, 0.15) 0%, rgba(227, 192, 136, 0.25) 100%)' },
    { key: 'potential', title: '潛力股', subtitle: '中績效高潛力', color: '#7FB095', bgGradient: 'linear-gradient(135deg, rgba(127, 176, 149, 0.15) 0%, rgba(127, 176, 149, 0.25) 100%)' },
    { key: 'star', title: '⭐ 明星員工', subtitle: '高績效高潛力', color: '#8DA399', bgGradient: 'linear-gradient(135deg, rgba(141, 163, 153, 0.15) 0%, rgba(141, 163, 153, 0.3) 100%)' },
    { key: 'risk', title: '風險員工', subtitle: '低績效中潛力', color: '#C77F7F', bgGradient: 'linear-gradient(135deg, rgba(199, 127, 127, 0.15) 0%, rgba(199, 127, 127, 0.25) 100%)' },
    { key: 'stable', title: '穩定員工', subtitle: '中績效中潛力', color: '#8DA8BE', bgGradient: 'linear-gradient(135deg, rgba(141, 168, 190, 0.15) 0%, rgba(141, 168, 190, 0.25) 100%)' },
    { key: 'specialist', title: '核心骨幹', subtitle: '高績效中潛力', color: '#7F9CA0', bgGradient: 'linear-gradient(135deg, rgba(127, 156, 160, 0.15) 0%, rgba(127, 156, 160, 0.25) 100%)' },
    { key: 'exit', title: '淘汰名單', subtitle: '低績效低潛力', color: '#858E96', bgGradient: 'linear-gradient(135deg, rgba(133, 142, 150, 0.15) 0%, rgba(133, 142, 150, 0.25) 100%)' },
    { key: 'need-improve', title: '需改善', subtitle: '中績效低潛力', color: '#B87D7B', bgGradient: 'linear-gradient(135deg, rgba(184, 125, 123, 0.15) 0%, rgba(184, 125, 123, 0.25) 100%)' },
    { key: 'expert', title: '專業專家', subtitle: '高績效低潛力', color: '#D6A28C', bgGradient: 'linear-gradient(135deg, rgba(214, 162, 140, 0.15) 0%, rgba(214, 162, 140, 0.25) 100%)' }
  ];

  getNineBoxEmployees(filter: NineBoxFilter): Observable<NineBoxEmployee[]> {
    const names = ['王小明', '李小華', '張大同', '陳美玲', '林志偉', '黃雅芳', '吳建宏', '周怡君', '蔡明哲', '許雅琪', '鄭家豪', '楊淑芬'];
    const departments = ['研發部', '人資部', '業務部', '行銷部'];
    const positions = ['工程師', '專員', '主管', '經理'];
    const levels: Array<'staff' | 'middle' | 'senior'> = ['staff', 'middle', 'senior'];

    const employees: NineBoxEmployee[] = names.map((name, idx) => {
      const performance = Math.floor(Math.random() * 100);
      const potential = Math.floor(Math.random() * 100);
      const category = this.calculateNineBoxCategory(performance, potential);

      return {
        id: `emp-${idx + 1}`,
        name,
        department: departments[idx % departments.length],
        position: positions[idx % positions.length],
        level: levels[idx % levels.length],
        performance,
        potential,
        category
      };
    });

    let filtered = employees;

    if (filter.department !== 'all') {
      const deptMap: Record<string, string> = {
        'rd': '研發部',
        'hr': '人資部',
        'sales': '業務部',
        'marketing': '行銷部'
      };
      filtered = filtered.filter(e => e.department === deptMap[filter.department]);
    }

    if (filter.level !== 'all') {
      filtered = filtered.filter(e => e.level === filter.level);
    }

    return of(filtered).pipe(delay(300));
  }

  private calculateNineBoxCategory(performance: number, potential: number): NineBoxCategory {
    const perfLevel = performance >= 66 ? 'high' : performance >= 33 ? 'mid' : 'low';
    const potLevel = potential >= 66 ? 'high' : potential >= 33 ? 'mid' : 'low';

    const categoryMap: Record<string, NineBoxCategory> = {
      'high-high': 'star',
      'mid-high': 'potential',
      'low-high': 'develop',
      'high-mid': 'specialist',
      'mid-mid': 'stable',
      'low-mid': 'risk',
      'high-low': 'expert',
      'mid-low': 'need-improve',
      'low-low': 'exit'
    };

    return categoryMap[`${perfLevel}-${potLevel}`];
  }

  // =====================================================
  // Learning Path Data
  // =====================================================

  getLearningProgress(): Observable<LearningProgress[]> {
    return of([
      { title: '整體培訓完成率', value: 72, color: '#8DA399' },
      { title: '核心職能覆蓋率', value: 85, color: '#C9A88C' },
      { title: '課程參與度', value: 68, color: '#7F9CA0' },
      { title: '認證通過率', value: 91, color: '#A89BB5' }
    ]).pipe(delay(200));
  }

  getCourses(): Observable<Course[]> {
    const courses: Course[] = [
      {
        id: 'c1',
        title: '領導力基礎課程',
        level: 'basic',
        duration: '8小時',
        participants: 45,
        description: '培養新任主管的基礎領導技能與團隊管理能力',
        progress: 100
      },
      {
        id: 'c2',
        title: '進階專案管理',
        level: 'advanced',
        duration: '16小時',
        participants: 28,
        description: '深入學習專案規劃、風險管理與跨部門協調',
        progress: 65
      },
      {
        id: 'c3',
        title: '策略思維工作坊',
        level: 'expert',
        duration: '24小時',
        participants: 12,
        description: '高階主管策略制定與商業決策能力培養',
        progress: 30
      },
      {
        id: 'c4',
        title: '溝通技巧訓練',
        level: 'basic',
        duration: '6小時',
        participants: 60,
        description: '有效溝通、簡報技巧與跨文化溝通能力',
        progress: 85
      }
    ];
    return of(courses).pipe(delay(300));
  }

  getPathSteps(employeeId: string): Observable<PathStep[]> {
    const steps: PathStep[] = [
      { name: '入職培訓', status: 'completed' },
      { name: '基礎技能', status: 'completed' },
      { name: '專業深化', status: 'current' },
      { name: '管理技能', status: 'pending' },
      { name: '領導力', status: 'pending' }
    ];
    return of(steps).pipe(delay(200));
  }

  getTimelineData(): Observable<TimelineItem[]> {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    return of(months.map(month => ({
      month,
      courses: Math.floor(Math.random() * 10) + 5,
      hours: Math.floor(Math.random() * 100) + 50,
      completion: Math.floor(Math.random() * 30) + 60
    }))).pipe(delay(300));
  }

  getSkillTreeData(): Observable<SkillTreeNode> {
    return of({
      name: '職能發展',
      children: [
        {
          name: '技術職能',
          children: [
            { name: '程式開發', value: 85 },
            { name: '系統設計', value: 70 },
            { name: '資料分析', value: 65 }
          ]
        },
        {
          name: '管理職能',
          children: [
            { name: '專案管理', value: 75 },
            { name: '團隊領導', value: 60 },
            { name: '績效管理', value: 55 }
          ]
        },
        {
          name: '軟技能',
          children: [
            { name: '溝通協調', value: 80 },
            { name: '問題解決', value: 72 },
            { name: '創新思維', value: 68 }
          ]
        }
      ]
    }).pipe(delay(300));
  }

  // =====================================================
  // Key Talent Data
  // =====================================================

  getKeyTalentMetrics(): Observable<KeyTalentMetric[]> {
    return of([
      {
        title: '關鍵職位覆蓋率',
        value: '85%',
        color: '#7FB095',
        description: '財務經理有 2 位接班人候選'
      },
      {
        title: '高風險人才預警',
        value: '3 人',
        color: '#C77F7F',
        description: '離職傾向 > 60%',
        actionLabel: '啟動留才計畫'
      },
      {
        title: '人才流失成本估算',
        value: 'NT$ 1,500,000',
        color: '#E3C088',
        description: '替換成本 + 培訓成本 + 產出損失'
      },
      {
        title: '外部挖角風險評估',
        value: '中等',
        color: '#7F9CA0',
        description: '市場薪資對比、產業搶人熱度'
      }
    ]).pipe(delay(200));
  }

  getRiskAlerts(): Observable<RiskAlert[]> {
    const alerts: RiskAlert[] = [
      {
        id: 't001',
        name: '張資深',
        department: '研發部',
        position: '技術主管',
        riskScore: 85,
        riskLevel: 'high',
        factors: ['市場薪資落差 25%', '近期績效波動', '團隊衝突記錄']
      },
      {
        id: 't002',
        name: '李專家',
        department: '產品部',
        position: '產品經理',
        riskScore: 78,
        riskLevel: 'high',
        factors: ['外部挖角接觸', '晉升受阻', '工作滿意度下降']
      },
      {
        id: 't003',
        name: '王主任',
        department: '業務部',
        position: '業務主任',
        riskScore: 72,
        riskLevel: 'high',
        factors: ['績效目標壓力大', '工作生活平衡差', 'EAP 使用頻繁']
      },
      {
        id: 't004',
        name: '陳經理',
        department: '行銷部',
        position: '行銷經理',
        riskScore: 68,
        riskLevel: 'medium',
        factors: ['近期家庭因素', '職涯發展不明確']
      },
      {
        id: 't005',
        name: '林總監',
        department: '財務部',
        position: '財務總監',
        riskScore: 65,
        riskLevel: 'medium',
        factors: ['工作倦怠徵兆', '培訓資源不足']
      }
    ];
    return of(alerts).pipe(delay(300));
  }

  getSuccessionPlans(): Observable<SuccessionPlan[]> {
    const plans: SuccessionPlan[] = [
      {
        position: '技術長 (CTO)',
        coverage: 'high',
        coverageText: '覆蓋良好',
        successors: [
          { rank: 1, name: '林志偉', readiness: 85 },
          { rank: 2, name: '黃雅芳', readiness: 70 }
        ]
      },
      {
        position: '財務長 (CFO)',
        coverage: 'medium',
        coverageText: '需要加強',
        successors: [
          { rank: 1, name: '陳美玲', readiness: 60 }
        ]
      },
      {
        position: '業務總監',
        coverage: 'low',
        coverageText: '風險較高',
        successors: []
      },
      {
        position: '人資總監',
        coverage: 'high',
        coverageText: '覆蓋良好',
        successors: [
          { rank: 1, name: '周怡君', readiness: 80 },
          { rank: 2, name: '蔡明哲', readiness: 65 }
        ]
      }
    ];
    return of(plans).pipe(delay(300));
  }
}
