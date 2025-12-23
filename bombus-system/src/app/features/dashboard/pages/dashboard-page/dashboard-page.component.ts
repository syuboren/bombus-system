import {
  Component,
  ChangeDetectionStrategy,
  signal,
  inject,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { StatCardComponent, ModuleType, ChangeType } from '../../../../shared/components/stat-card/stat-card.component';
import { CEODashboardService } from '../../services/ceo-dashboard.service';
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
  RewardKPI,
  RewardRiskEmployee,
  RiskQuadrantPerson,
  CompetencyEmployee,
  ProjectBubble
} from '../../models/ceo-dashboard.model';
import * as echarts from 'echarts';

interface HealthTrendData {
  month: string;
  people: number;
  project: number;
  culture: number;
}

type DashboardView = 'ceo' | 'operational';

interface StatData {
  icon: string;
  label: string;
  value: string | number;
  changeText: string;
  changeType: ChangeType;
  moduleType: ModuleType;
}

interface QuickAccess {
  title: string;
  description: string;
  icon: string;
  route: string;
  moduleClass: string;
}

interface Activity {
  title: string;
  description: string;
  time: string;
  moduleClass: string;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, StatCardComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendChart') trendChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('healthTrendChart') healthTrendChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('profitSparkline') profitSparklineRef!: ElementRef<HTMLDivElement>;
  @ViewChild('projectBubbleChart') projectBubbleChartRef!: ElementRef<HTMLDivElement>;

  private ceoService = inject(CEODashboardService);
  private cdr = inject(ChangeDetectorRef);

  // Charts
  private trendChart: echarts.ECharts | null = null;
  private healthTrendChart: echarts.ECharts | null = null;
  private profitSparklineChart: echarts.ECharts | null = null;
  private projectBubbleChart: echarts.ECharts | null = null;
  private sparklineCharts: Map<string, echarts.ECharts> = new Map();
  private resizeHandler = () => {
    this.trendChart?.resize();
    this.healthTrendChart?.resize();
    this.profitSparklineChart?.resize();
    this.projectBubbleChart?.resize();
    this.sparklineCharts.forEach(chart => chart.resize());
  };

  // View state
  currentView = signal<DashboardView>('ceo');
  currentDate = signal<string>('');

  // Decision carousel
  decisionPage = signal<number>(0);
  totalDecisionPages = signal<number>(1);

  // CEO Dashboard Data - 所有區塊資料
  healthAxes = signal<HealthAxis[]>([]);
  healthTrendData = signal<HealthTrendData[]>([]);
  riskAlerts = signal<RiskAlert[]>([]);
  decisionItems = signal<DecisionItem[]>([]);
  trendData = signal<TrendData[]>([]);

  // 能力地圖
  capabilityKPI = signal<CapabilityKPI | null>(null);
  capabilityGaps = signal<CapabilityGap[]>([]);
  competencyHeatmap = signal<{
    departments: string[];
    competencies: string[];
    data: { dept: string; comp: string; score: number; status: 'achieved' | 'slight' | 'severe' }[];
  } | null>(null);
  showHeatmapLegend = signal(false);
  selectedHeatmapCell = signal<{ dept: string; comp: string; score: number } | null>(null);
  heatmapEmployees = signal<CompetencyEmployee[]>([]);
  loadingEmployees = signal(false);

  // 人才風險
  talentRiskKPI = signal<TalentRiskKPI | null>(null);
  highRiskTalents = signal<HighRiskTalent[]>([]);
  successionCoverages = signal<SuccessionCoverage[]>([]);
  riskQuadrantData = signal<RiskQuadrantPerson[]>([]);
  selectedQuadrantPerson = signal<RiskQuadrantPerson | null>(null);

  // 專案交付
  projectDeliveryKPI = signal<ProjectDeliveryKPI | null>(null);
  projectStatuses = signal<ProjectStatus[]>([]);
  projectBubbles = signal<ProjectBubble[]>([]);

  // 毛利預測
  profitKPI = signal<ProfitKPI | null>(null);
  projectRankings = signal<ProjectRanking[]>([]);
  profitTrendData = signal<{ month: string; actual: number | null; predicted: number | null; optimistic: number | null; pessimistic: number | null }[]>([]);

  // 績效獎酬
  rewardKPI = signal<RewardKPI | null>(null);
  rewardRiskEmployees = signal<RewardRiskEmployee[]>([]);
  selectedRewardRiskType = signal<'retention' | 'culture'>('retention');

  // 依類型篩選績效獎酬風險人員
  getFilteredRewardEmployees(): RewardRiskEmployee[] {
    return this.rewardRiskEmployees().filter(e => e.riskType === this.selectedRewardRiskType());
  }

  // 切換績效獎酬風險類型
  switchRewardRiskType(type: 'retention' | 'culture'): void {
    this.selectedRewardRiskType.set(type);
  }

  // 營運視角資料 (原本的)
  readonly stats: StatData[] = [
    {
      icon: 'ri-team-line',
      label: '總員工數',
      value: '1,247',
      changeText: '較上月 +3.2%',
      changeType: 'positive',
      moduleType: 'l1'
    },
    {
      icon: 'ri-book-open-line',
      label: '培訓完成率',
      value: '72%',
      changeText: '較上季 +5%',
      changeType: 'positive',
      moduleType: 'l3'
    },
    {
      icon: 'ri-folder-chart-line',
      label: '進行中專案',
      value: '42',
      changeText: '與上月持平',
      changeType: 'neutral',
      moduleType: 'l4'
    },
    {
      icon: 'ri-line-chart-line',
      label: '平均績效分數',
      value: '85.3',
      changeText: '較上季 +2.1',
      changeType: 'positive',
      moduleType: 'l5'
    }
  ];

  readonly quickAccessItems: QuickAccess[] = [
    {
      title: '職能熱力圖',
      description: '快速定位組織職能短板',
      icon: 'ri-fire-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    },
    {
      title: '人才九宮格',
      description: '績效潛力矩陣分析',
      icon: 'ri-grid-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    },
    {
      title: '學習路徑圖',
      description: '智能推薦學習路徑',
      icon: 'ri-route-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    },
    {
      title: '關鍵人才儀表板',
      description: '高風險人才預警',
      icon: 'ri-star-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    }
  ];

  readonly activities: Activity[] = [
    {
      title: '新增員工檔案',
      description: '王小明已完成入職程序',
      time: '5 分鐘前',
      moduleClass: 'module-l1'
    },
    {
      title: '培訓課程完成',
      description: '15位員工完成「Python進階開發」課程',
      time: '1 小時前',
      moduleClass: 'module-l3'
    },
    {
      title: '績效考核啟動',
      description: 'Q4績效考核週期已開始',
      time: '3 小時前',
      moduleClass: 'module-l5'
    }
  ];

  todos = signal<TodoItem[]>([
    { id: '1', text: '審核5份面試評估報告', completed: false },
    { id: '2', text: '完成Q4培訓計畫', completed: false },
    { id: '3', text: '系統備份檢查', completed: true }
  ]);

  ngOnInit(): void {
    this.updateCurrentDate();
    this.loadCEOData();
    window.addEventListener('resize', this.resizeHandler);
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initTrendChart(), 300);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.disposeCharts();
  }

  // 切換視角
  switchView(view: DashboardView): void {
    // 切換前先銷毀圖表實例
    this.disposeCharts();

    this.currentView.set(view);
    this.cdr.detectChanges();

    if (view === 'ceo') {
      // 延遲初始化圖表，確保 DOM 已經渲染
      setTimeout(() => this.initTrendChart(), 200);
    }
  }

  private disposeCharts(): void {
    if (this.trendChart) {
      this.trendChart.dispose();
      this.trendChart = null;
    }
    if (this.healthTrendChart) {
      this.healthTrendChart.dispose();
      this.healthTrendChart = null;
    }
    // Dispose sparkline charts
    this.sparklineCharts.forEach(chart => chart.dispose());
    this.sparklineCharts.clear();
  }

  toggleTodo(id: string): void {
    this.todos.update(todos =>
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  // Decision carousel methods
  getDecisionsByPriority(priority: 'urgent' | 'important' | 'opportunity'): DecisionItem[] {
    return this.decisionItems().filter(item => item.priority === priority);
  }

  prevDecisionPage(): void {
    if (this.decisionPage() > 0) {
      this.decisionPage.update(p => p - 1);
    }
  }

  nextDecisionPage(): void {
    if (this.decisionPage() < this.totalDecisionPages() - 1) {
      this.decisionPage.update(p => p + 1);
    }
  }

  // Heatmap helper
  getHeatmapCell(dept: string, comp: string): { score: number; status: string } | null {
    const heatmap = this.competencyHeatmap();
    if (!heatmap) return null;
    const cell = heatmap.data.find(d => d.dept === dept && d.comp === comp);
    return cell ? { score: cell.score, status: cell.status } : null;
  }

  toggleHeatmapLegend(): void {
    this.showHeatmapLegend.update(v => !v);
  }

  selectHeatmapCell(dept: string, comp: string, score: number): void {
    const current = this.selectedHeatmapCell();

    // Toggle off if same cell clicked
    if (current && current.dept === dept && current.comp === comp) {
      this.selectedHeatmapCell.set(null);
      this.heatmapEmployees.set([]);
      return;
    }

    this.selectedHeatmapCell.set({ dept, comp, score });
    this.loadingEmployees.set(true);

    this.ceoService.getCompetencyEmployees(dept, comp).subscribe(employees => {
      this.heatmapEmployees.set(employees);
      this.loadingEmployees.set(false);
      this.cdr.detectChanges();
    });
  }

  clearHeatmapSelection(): void {
    this.selectedHeatmapCell.set(null);
    this.heatmapEmployees.set([]);
  }

  selectQuadrantPerson(person: RiskQuadrantPerson): void {
    this.selectedQuadrantPerson.set(person);
  }

  clearSelectedPerson(): void {
    this.selectedQuadrantPerson.set(null);
  }

  getQuadrantZone(person: RiskQuadrantPerson): string {
    const isHighRisk = person.turnoverRisk >= 50;
    const isHighCriticality = person.criticality >= 50;

    if (isHighRisk && isHighCriticality) return 'critical'; // 右上：高風險高關鍵
    if (isHighRisk && !isHighCriticality) return 'monitor'; // 右下：高風險低關鍵
    if (!isHighRisk && isHighCriticality) return 'protect'; // 左上：低風險高關鍵
    return 'stable'; // 左下：低風險低關鍵
  }

  private updateCurrentDate(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[today.getDay()];

    this.currentDate.set(`${year}-${month}-${day} (${weekday})`);
  }

  private loadCEOData(): void {
    // 決策資訊區塊
    this.ceoService.getHealthAxes().subscribe(data => {
      this.healthAxes.set(data);
      this.cdr.detectChanges();
      // 初始化 Sparkline 圖表
      setTimeout(() => this.initSparklineCharts(), 200);
    });

    this.ceoService.getHealthTrendData().subscribe(data => {
      this.healthTrendData.set(data);
      this.cdr.detectChanges();
      setTimeout(() => this.updateHealthTrendChart(), 100);
    });

    this.ceoService.getRiskAlerts().subscribe(data => {
      this.riskAlerts.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getDecisionItems().subscribe(data => {
      this.decisionItems.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getTrendData().subscribe(data => {
      this.trendData.set(data);
      this.cdr.detectChanges();
      setTimeout(() => this.updateTrendChart(), 100);
    });

    // 能力地圖區塊
    this.ceoService.getCapabilityKPI().subscribe(data => {
      this.capabilityKPI.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getCapabilityGaps().subscribe(data => {
      this.capabilityGaps.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getCompetencyHeatmap().subscribe(data => {
      this.competencyHeatmap.set(data);
      this.cdr.detectChanges();
    });

    // 人才風險區塊
    this.ceoService.getTalentRiskKPI().subscribe(data => {
      this.talentRiskKPI.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getHighRiskTalents().subscribe(data => {
      this.highRiskTalents.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getSuccessionCoverages().subscribe(data => {
      this.successionCoverages.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getRiskQuadrantData().subscribe(data => {
      this.riskQuadrantData.set(data);
      this.cdr.detectChanges();
    });

    // 專案交付區塊
    this.ceoService.getProjectDeliveryKPI().subscribe(data => {
      this.projectDeliveryKPI.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getProjectStatuses().subscribe(data => {
      this.projectStatuses.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getProjectBubbles().subscribe(data => {
      this.projectBubbles.set(data);
      this.cdr.detectChanges();
      setTimeout(() => this.initProjectBubbleChart(), 100);
    });

    // 毛利預測區塊
    this.ceoService.getProfitKPI().subscribe(data => {
      this.profitKPI.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getProjectRankings().subscribe(data => {
      this.projectRankings.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getProfitTrendData().subscribe(data => {
      this.profitTrendData.set(data);
      this.cdr.detectChanges();
      setTimeout(() => this.initProfitSparkline(), 100);
    });

    // 績效獎酬區塊
    this.ceoService.getRewardKPI().subscribe(data => {
      this.rewardKPI.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getRewardRiskEmployees().subscribe(data => {
      this.rewardRiskEmployees.set(data);
      this.cdr.detectChanges();
    });
  }

  private initTrendChart(): void {
    if (this.currentView() !== 'ceo') return;
    this.updateTrendChart();
    this.initSparklineCharts();
  }

  private updateTrendChart(): void {
    if (!this.trendChartRef?.nativeElement) return;

    if (!this.trendChart) {
      this.trendChart = echarts.init(this.trendChartRef.nativeElement);
    }

    const data = this.trendData();
    if (data.length === 0) return;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E4E8',
        textStyle: { color: '#464E56', fontSize: 12 }
      },
      legend: {
        data: ['營收 (百萬)', '毛利率 (%)'],
        bottom: 0,
        textStyle: { color: '#6B7280', fontSize: 11 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '18%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.month),
        axisLabel: { color: '#6B7280', fontSize: 10 },
        axisLine: { lineStyle: { color: '#E2E4E8' } }
      },
      yAxis: [
        {
          type: 'value',
          position: 'left',
          axisLabel: { color: '#6B7280', fontSize: 10, formatter: '${value}M' },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#F5F5F7' } }
        },
        {
          type: 'value',
          position: 'right',
          axisLabel: { color: '#6B7280', fontSize: 10, formatter: '{value}%' },
          axisLine: { show: false },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '營收 (百萬)',
          type: 'line',
          data: data.map(d => d.revenue),
          smooth: true,
          lineStyle: { width: 3, color: '#64748B' },
          itemStyle: { color: '#64748B' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(100, 116, 139, 0.2)' },
                { offset: 1, color: 'rgba(100, 116, 139, 0)' }
              ]
            }
          }
        },
        {
          name: '毛利率 (%)',
          type: 'line',
          yAxisIndex: 1,
          data: data.map(d => d.profitRate),
          smooth: true,
          lineStyle: { width: 3, color: '#7FB095' },
          itemStyle: { color: '#7FB095' }
        }
      ]
    };

    this.trendChart.setOption(option);
  }

  private updateHealthTrendChart(): void {
    if (!this.healthTrendChartRef?.nativeElement) return;

    if (!this.healthTrendChart) {
      this.healthTrendChart = echarts.init(this.healthTrendChartRef.nativeElement);
    }

    const data = this.healthTrendData();
    if (data.length === 0) return;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E4E8',
        textStyle: { color: '#464E56', fontSize: 12 }
      },
      legend: {
        data: ['People', 'Project', 'Culture'],
        bottom: 0,
        textStyle: { color: '#6B7280', fontSize: 11 }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '18%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.month),
        axisLabel: { color: '#6B7280', fontSize: 10 },
        axisLine: { lineStyle: { color: '#E2E4E8' } }
      },
      yAxis: {
        type: 'value',
        min: 60,
        max: 90,
        axisLabel: { color: '#6B7280', fontSize: 10 },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#F5F5F7' } }
      },
      series: [
        {
          name: 'People',
          type: 'line',
          data: data.map(d => d.people),
          smooth: true,
          lineStyle: { width: 3, color: '#8DA399' },
          itemStyle: { color: '#8DA399' }
        },
        {
          name: 'Project',
          type: 'line',
          data: data.map(d => d.project),
          smooth: true,
          lineStyle: { width: 3, color: '#D6A28C' },
          itemStyle: { color: '#D6A28C' }
        },
        {
          name: 'Culture',
          type: 'line',
          data: data.map(d => d.culture),
          smooth: true,
          lineStyle: { width: 3, color: '#9A8C98' },
          itemStyle: { color: '#9A8C98' }
        }
      ]
    };

    this.healthTrendChart.setOption(option);
  }

  // 初始化 Sparkline 圖表
  private initSparklineCharts(): void {
    const axes = this.healthAxes();
    if (axes.length === 0) return;

    axes.forEach(axis => {
      const container = document.getElementById(`sparkline-${axis.name}`);
      if (!container) return;

      // 如果已存在則先銷毀
      const existingChart = this.sparklineCharts.get(axis.name);
      if (existingChart) {
        existingChart.dispose();
      }

      const chart = echarts.init(container);
      this.sparklineCharts.set(axis.name, chart);

      const sparklineData = axis.sparklineData || [];
      if (sparklineData.length === 0) return;

      const months = ['7月', '8月', '9月', '10月', '11月', '12月'];
      const option: echarts.EChartsOption = {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: axis.color,
          borderWidth: 1,
          textStyle: { color: '#464E56', fontSize: 12 },
          formatter: (params: unknown) => {
            const p = params as { dataIndex: number; value: number }[];
            if (p && p[0]) {
              return `<strong>${months[p[0].dataIndex]}</strong><br/>健康度: <span style="color:${axis.color};font-weight:bold;">${p[0].value}</span>`;
            }
            return '';
          }
        },
        grid: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
        },
        xAxis: {
          type: 'category',
          show: false,
          data: months,
          boundaryGap: false
        },
        yAxis: {
          type: 'value',
          show: false,
          min: Math.min(...sparklineData) - 5,
          max: Math.max(...sparklineData) + 5
        },
        series: [
          {
            type: 'line',
            data: sparklineData,
            smooth: 0.6, // Monotone smooth curve
            symbol: 'circle',
            symbolSize: 6,
            showSymbol: false,
            emphasis: {
              focus: 'series',
              itemStyle: {
                borderWidth: 2,
                borderColor: '#fff'
              }
            },
            lineStyle: {
              width: 2.5,
              color: axis.color
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: axis.color },
                  { offset: 1, color: 'rgba(255, 255, 255, 0)' }
                ]
              },
              opacity: 0.3
            }
          }
        ]
      };

      chart.setOption(option);
    });
  }

  private initProfitSparkline(): void {
    if (!this.profitSparklineRef?.nativeElement) return;

    if (this.profitSparklineChart) {
      this.profitSparklineChart.dispose();
    }

    this.profitSparklineChart = echarts.init(this.profitSparklineRef.nativeElement);
    const data = this.profitTrendData();
    if (data.length === 0) return;

    const months = data.map(d => d.month);
    const actualData = data.map(d => d.actual);
    const predictedData = data.map(d => d.predicted);
    const optimisticData = data.map(d => d.optimistic);
    const pessimisticData = data.map(d => d.pessimistic);

    // 找到實際資料的最後一個點，用於連接預測線
    let lastActualIndex = -1;
    for (let i = actualData.length - 1; i >= 0; i--) {
      if (actualData[i] !== null) {
        lastActualIndex = i;
        break;
      }
    }

    // 連接預測線到實際資料最後一點
    const connectPrediction = (predData: (number | null)[]) => {
      return predData.map((v: number | null, i: number) => {
        if (i === lastActualIndex && actualData[lastActualIndex] !== null) {
          return actualData[lastActualIndex];
        }
        return v;
      });
    };

    const connectedPredictedData = connectPrediction(predictedData);
    const connectedOptimisticData = connectPrediction(optimisticData);
    const connectedPessimisticData = connectPrediction(pessimisticData);

    const allValues = [
      ...actualData.filter(v => v !== null),
      ...predictedData.filter(v => v !== null),
      ...optimisticData.filter(v => v !== null),
      ...pessimisticData.filter(v => v !== null)
    ] as number[];
    const minValue = Math.min(...allValues) - 0.5;
    const maxValue = Math.max(...allValues) + 0.5;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E4E8',
        textStyle: { color: '#464E56', fontSize: 11 },
        formatter: (params: any) => {
          const month = params[0]?.axisValue || '';
          let html = `<div style="font-weight: bold; margin-bottom: 4px;">${month}</div>`;
          params.forEach((p: any) => {
            if (p.value !== null && p.value !== undefined) {
              const label = p.seriesName;
              const color = p.color;
              html += `<div style="display: flex; align-items: center; gap: 4px;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span>
                <span>${label}: $${p.value}M</span>
              </div>`;
            }
          });
          return html;
        }
      },
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      },
      xAxis: {
        type: 'category',
        show: false,
        data: months,
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        show: false,
        min: minValue,
        max: maxValue
      },
      series: [
        // 樂觀預測 - 虛線無填充（綠色）
        {
          name: 'AI 預測 (樂觀)',
          type: 'line',
          data: connectedOptimisticData,
          smooth: 0.5,
          symbol: 'none',
          showSymbol: false,
          connectNulls: false,
          lineStyle: {
            width: 1.5,
            color: '#7FB095',
            type: 'dotted'
          },
          z: 1
        },
        // 悲觀預測 - 虛線無填充（紅色）
        {
          name: 'AI 預測 (悲觀)',
          type: 'line',
          data: connectedPessimisticData,
          smooth: 0.5,
          symbol: 'none',
          showSymbol: false,
          connectNulls: false,
          lineStyle: {
            width: 1.5,
            color: '#C77F7F',
            type: 'dotted'
          },
          z: 1
        },
        // AI 基準預測 - 虛線無填充（灰色）
        {
          name: 'AI 預測 (基準)',
          type: 'line',
          data: connectedPredictedData,
          smooth: 0.5,
          symbol: 'circle',
          symbolSize: 5,
          showSymbol: false,
          connectNulls: false,
          emphasis: {
            focus: 'series',
            itemStyle: {
              borderWidth: 2,
              borderColor: '#fff'
            }
          },
          lineStyle: {
            width: 2,
            color: '#9A8C98',
            type: 'dashed'
          },
          z: 2
        },
        // 實際數據 - 實線 + 漸層填充
        {
          name: '歷史損益',
          type: 'line',
          data: actualData,
          smooth: 0.5,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: true,
          connectNulls: false,
          emphasis: {
            focus: 'series',
            itemStyle: {
              borderWidth: 2,
              borderColor: '#fff'
            }
          },
          itemStyle: {
            color: '#8DA399',
            borderColor: '#fff',
            borderWidth: 1
          },
          lineStyle: {
            width: 2.5,
            color: '#8DA399'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(141, 163, 153, 0.35)' },
                { offset: 1, color: 'rgba(141, 163, 153, 0)' }
              ]
            }
          },
          z: 3
        }
      ]
    };

    this.profitSparklineChart.setOption(option);
  }

  private initProjectBubbleChart(): void {
    if (!this.projectBubbleChartRef?.nativeElement) return;

    if (this.projectBubbleChart) {
      this.projectBubbleChart.dispose();
    }

    this.projectBubbleChart = echarts.init(this.projectBubbleChartRef.nativeElement);
    const data = this.projectBubbles();
    if (data.length === 0) return;

    // 計算泡泡大小範圍
    const maxBudget = Math.max(...data.map(d => d.budgetScale));
    const minBubbleSize = 15;
    const maxBubbleSize = 40;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E4E8',
        textStyle: { color: '#464E56', fontSize: 11 },
        formatter: (params: any) => {
          const d = params.data;
          return `<div style="font-weight: bold; margin-bottom: 4px;">${d.name}</div>
            <div>PM: ${d.pm}</div>
            <div>進度偏差: ${d.progressDeviation > 0 ? '+' : ''}${d.progressDeviation}%</div>
            <div>品質風險: ${d.qualityRisk}</div>
            <div>預算: $${d.budgetScale}M</div>
            ${d.needsAttention ? '<div style="color: #C77F7F; font-weight: bold;">⚠ 需立即關注</div>' : ''}`;
        }
      },
      grid: {
        left: '12%',
        right: '8%',
        top: '15%',
        bottom: '18%'
      },
      xAxis: {
        type: 'value',
        name: '進度偏差 (%)',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: { color: '#6B7280', fontSize: 11 },
        min: -20,
        max: 15,
        axisLine: { lineStyle: { color: '#E2E4E8' } },
        axisLabel: { color: '#6B7280', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
      },
      yAxis: {
        type: 'value',
        name: '品質風險',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: { color: '#6B7280', fontSize: 11 },
        min: 0,
        max: 80,
        axisLine: { lineStyle: { color: '#E2E4E8' } },
        axisLabel: { color: '#6B7280', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } }
      },
      series: [{
        type: 'scatter',
        data: data.map(d => ({
          value: [d.progressDeviation, d.qualityRisk],
          name: d.name,
          pm: d.pm,
          progressDeviation: d.progressDeviation,
          qualityRisk: d.qualityRisk,
          budgetScale: d.budgetScale,
          needsAttention: d.needsAttention,
          symbolSize: minBubbleSize + (d.budgetScale / maxBudget) * (maxBubbleSize - minBubbleSize),
          itemStyle: {
            color: d.needsAttention ? '#C77F7F' : (d.status === 'warning' ? '#E3C088' : '#8DA399'),
            opacity: 0.85,
            shadowBlur: 8,
            shadowColor: 'rgba(0, 0, 0, 0.15)'
          }
        })),
        emphasis: {
          itemStyle: {
            opacity: 1,
            shadowBlur: 12,
            shadowColor: 'rgba(0, 0, 0, 0.25)'
          }
        }
      }],
      // 危險區域標記
      graphic: [
        {
          type: 'rect',
          left: '12%',
          top: '15%',
          shape: { width: 100, height: 80 },
          style: { fill: 'rgba(199, 127, 127, 0.08)' },
          silent: true,
          z: -1
        }
      ]
    };

    this.projectBubbleChart.setOption(option);
  }
}
