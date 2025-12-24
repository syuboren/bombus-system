import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
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
  ProjectBubble,
  ProjectGanttItem,
  ProjectStatusStats,
  ProjectTypeStats,
  CostStructureItem,
  CostWarningItem
} from '../../models/ceo-dashboard.model';
import { TrainingService } from '../../../training/services/training.service';
import {
  TrainingKPI,
  CourseTypeStats,
  TrainingEffectiveness,
  UpcomingCourse,
  TrainingRecommendation,
  CourseCategory
} from '../../../training/models/training.model';
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
  private trainingService = inject(TrainingService);
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
  showQuickNav = signal(true);
  activeSection = signal('section-overview');

  // Decision carousel
  decisionPage = signal<number>(0);
  totalDecisionPages = signal<number>(1);

  // CEO Dashboard Data - 所有區塊資料
  healthAxes = signal<HealthAxis[]>([]);
  healthTrendData = signal<HealthTrendData[]>([]);
  riskAlerts = signal<RiskAlert[]>([]);
  projectRiskAlerts = computed(() => this.riskAlerts().filter(a => a.category === 'project'));
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
  costStructure = signal<CostStructureItem[]>([]);
  costWarnings = signal<CostWarningItem[]>([]);

  // 績效獎酬
  rewardKPI = signal<RewardKPI | null>(null);
  rewardRiskEmployees = signal<RewardRiskEmployee[]>([]);
  selectedRewardRiskType = signal<'retention' | 'culture'>('retention');

  // 教育訓練
  trainingKPI = signal<TrainingKPI | null>(null);
  courseTypeStats = signal<CourseTypeStats[]>([]);
  trainingEffectiveness = signal<TrainingEffectiveness[]>([]);
  upcomingCourses = signal<UpcomingCourse[]>([]);
  trainingRecommendations = signal<TrainingRecommendation[]>([]);

  // 專案甘特圖
  projectGanttItems = signal<ProjectGanttItem[]>([]);
  projectStatusStats = signal<ProjectStatusStats[]>([]);
  projectTypeStats = signal<ProjectTypeStats[]>([]);
  selectedProjectStatus = signal<string | null>(null);
  selectedProjectType = signal<string | null>(null);
  selectedGanttProject = signal<ProjectGanttItem | null>(null);
  ganttTimeRange = signal<{ start: Date; end: Date }>({
    start: new Date('2025-11-01'),
    end: new Date('2026-03-31')
  });

  // 專案甘特圖統計圖表
  private projectStatusDonutChart: echarts.ECharts | null = null;
  private projectTypeBarChart: echarts.ECharts | null = null;

  // 依類型篩選績效獎酬風險人員
  getFilteredRewardEmployees(): RewardRiskEmployee[] {
    return this.rewardRiskEmployees().filter(e => e.riskType === this.selectedRewardRiskType());
  }

  // 切換績效獎酬風險類型
  switchRewardRiskType(type: 'retention' | 'culture'): void {
    this.selectedRewardRiskType.set(type);
  }

  // 取得課程類別標籤
  getCategoryLabel(category: CourseCategory): string {
    return this.trainingService.getCategoryLabel(category);
  }

  // 取得課程類別顏色
  getCategoryColor(category: CourseCategory): string {
    return this.trainingService.getCategoryColor(category);
  }

  // 取得成效等級樣式
  getEffectivenessClass(status: string): string {
    return `effectiveness--${status}`;
  }

  // 取得總課程數
  getTotalCourses(): number {
    return this.courseTypeStats().reduce((sum, stat) => sum + stat.count, 0);
  }

  // 根據分數取得成效配色 class
  getEffectivenessColorClass(score: number): string {
    if (score >= 80) return 'effectiveness--green';
    if (score >= 60) return 'effectiveness--yellow';
    return 'effectiveness--red';
  }

  // 初始化課程類型環狀圖
  private courseTypeDonutChart: echarts.ECharts | null = null;

  private initCourseTypeDonutChart(): void {
    const container = document.getElementById('course-type-donut-chart');
    if (!container) return;

    if (this.courseTypeDonutChart) {
      this.courseTypeDonutChart.dispose();
    }

    this.courseTypeDonutChart = echarts.init(container);
    const stats = this.courseTypeStats();
    const total = this.getTotalCourses();

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 門 ({d}%)'
      },
      series: [{
        type: 'pie',
        radius: ['55%', '85%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{value|${total}}\n{label|門課程}`,
          rich: {
            value: {
              fontSize: 28,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 'bold',
              color: '#374151',
              lineHeight: 32
            },
            label: {
              fontSize: 12,
              color: '#9CA3AF',
              lineHeight: 18
            }
          }
        },
        emphasis: {
          label: { show: true },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          },
          scale: true,
          scaleSize: 6
        },
        labelLine: { show: false },
        data: stats.map(stat => ({
          name: stat.label,
          value: stat.count,
          itemStyle: { color: stat.color }
        }))
      }]
    };

    this.courseTypeDonutChart.setOption(option);
  }

  // 取得優先級樣式
  getPriorityClass(priority: string): string {
    return `priority--${priority}`;
  }

  // 格式化日期
  formatCourseDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit'
    });
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
      route: '/training/competency-heatmap',
      moduleClass: 'module-l3'
    },
    {
      title: '人才九宮格',
      description: '績效潛力矩陣分析',
      icon: 'ri-grid-line',
      route: '/training/nine-box',
      moduleClass: 'module-l3'
    },
    {
      title: '學習路徑圖',
      description: '智能推薦學習路徑',
      icon: 'ri-route-line',
      route: '/training/learning-path',
      moduleClass: 'module-l3'
    },
    {
      title: '關鍵人才儀表板',
      description: '高風險人才預警',
      icon: 'ri-star-line',
      route: '/training/key-talent',
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
    setTimeout(() => {
      this.initTrendChart();
      if (this.currentView() === 'ceo') {
        this.initScrollListener();
      }
    }, 300);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('scroll', this.handleScroll);
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
      setTimeout(() => {
        this.initTrendChart();
        this.initScrollListener();
      }, 200);
    } else {
      window.removeEventListener('scroll', this.handleScroll);
    }
  }

  // 快速導航邏輯
  toggleQuickNav(): void {
    this.showQuickNav.update(v => !v);
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      this.activeSection.set(sectionId);
      const headerOffset = 100; // 考慮到 Header 高度
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  private initScrollListener(): void {
    window.addEventListener('scroll', this.handleScroll);
  }

  private handleScroll = () => {
    if (this.currentView() !== 'ceo') return;

    const sections = [
      'section-overview',
      'section-talent',
      'section-project',
      'section-profit',
      'section-culture',
      'section-decision'
    ];

    const currentScrollPos = window.pageYOffset + 150;

    for (const sectionId of sections) {
      const element = document.getElementById(sectionId);
      if (element) {
        const { top, bottom } = element.getBoundingClientRect();
        const elementTop = top + window.pageYOffset;
        const elementBottom = bottom + window.pageYOffset;

        if (currentScrollPos >= elementTop && currentScrollPos < elementBottom) {
          this.activeSection.set(sectionId);
          break;
        }
      }
    }
  };

  private disposeCharts(): void {
    if (this.trendChart) {
      this.trendChart.dispose();
      this.trendChart = null;
    }
    if (this.healthTrendChart) {
      this.healthTrendChart.dispose();
      this.healthTrendChart = null;
    }
    if (this.profitSparklineChart) {
      this.profitSparklineChart.dispose();
      this.profitSparklineChart = null;
    }
    if (this.projectBubbleChart) {
      this.projectBubbleChart.dispose();
      this.projectBubbleChart = null;
    }
    if (this.projectStatusDonutChart) {
      this.projectStatusDonutChart.dispose();
      this.projectStatusDonutChart = null;
    }
    if (this.projectTypeBarChart) {
      this.projectTypeBarChart.dispose();
      this.projectTypeBarChart = null;
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

  getRiskLevel(riskScore: number): string {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  getAlertsByType(alertType: 'key-position' | 'capability-gap' | 'project-risk') {
    return this.riskAlerts().filter(alert => alert.alertType === alertType);
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
      // 預設開啟研發部 - 專案管理
      setTimeout(() => this.selectHeatmapCell('研發部', '專案管理', 3.2), 100);
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

    this.ceoService.getCostStructure().subscribe(data => {
      this.costStructure.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getCostWarnings().subscribe(data => {
      this.costWarnings.set(data);
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

    // 教育訓練區塊
    this.trainingService.getTrainingKPI().subscribe(data => {
      this.trainingKPI.set(data);
      this.cdr.detectChanges();
    });

    this.trainingService.getCourseTypeStats().subscribe(data => {
      this.courseTypeStats.set(data);
      this.cdr.detectChanges();
      setTimeout(() => this.initCourseTypeDonutChart(), 100);
    });

    this.trainingService.getTrainingEffectiveness().subscribe(data => {
      this.trainingEffectiveness.set(data);
      this.cdr.detectChanges();
    });

    this.trainingService.getUpcomingCourses().subscribe(data => {
      this.upcomingCourses.set(data);
      this.cdr.detectChanges();
    });

    this.trainingService.getTrainingRecommendations().subscribe(data => {
      this.trainingRecommendations.set(data);
      this.cdr.detectChanges();
    });

    // 專案甘特圖區塊
    this.ceoService.getProjectGanttItems().subscribe(data => {
      this.projectGanttItems.set(data);
      this.cdr.detectChanges();
    });

    this.ceoService.getProjectStatusStats().subscribe(data => {
      this.projectStatusStats.set(data);
      this.cdr.detectChanges();
      setTimeout(() => this.initProjectStatusDonutChart(), 100);
    });

    this.ceoService.getProjectTypeStats().subscribe(data => {
      this.projectTypeStats.set(data);
      this.cdr.detectChanges();
      setTimeout(() => this.initProjectTypeBarChart(), 100);
    });
  }

  private initTrendChart(): void {
    if (this.currentView() !== 'ceo') return;
    this.updateTrendChart();
    this.initSparklineCharts();
    // 初始化專案交付和毛利預測圖表
    setTimeout(() => {
      this.initProfitSparkline();
      this.initProjectBubbleChart();
      this.initCourseTypeDonutChart();
      this.initProjectStatusDonutChart();
      this.initProjectTypeBarChart();
    }, 100);
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

  // ---------------------------------------------------------------
  // 專案甘特圖相關方法
  // ---------------------------------------------------------------

  // 取得頭像顯示文字（PM 名稱第一個字）
  getAvatarLabel(name: string): string {
    return name ? name.charAt(0) : '?';
  }

  // 根據 PM 名稱生成固定的柔和背景色
  getAvatarColor(name: string): string {
    const colors = [
      '#8DA399', // L1 Sage
      '#D6A28C', // L2 Terracotta
      '#9A8C98', // L4 Mauve
      '#7F9CA0', // L3 Petrol light
      '#E3C088', // Warning
      '#7FB095', // Success light
      '#B8A9C9', // Purple light
      '#A3C4BC'  // Teal light
    ];
    // 使用名稱的 charCode 總和來決定顏色
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  // 取得專案類型顏色
  getProjectTypeColor(type: string): string {
    const colors: Record<string, string> = {
      integration: '#b8a99a',  // 整合 - 米棕色
      procurement: '#7F9CA0',  // 採購 - Petrol
      service: '#9A8C98',      // 服務 - Mauve
      software: '#D6A28C'      // 軟體 - Terracotta
    };
    return colors[type] || '#b8a99a';
  }

  // 取得專案類型標籤
  getProjectTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      integration: '整合',
      procurement: '採購',
      service: '服務',
      software: '軟體'
    };
    return labels[type] || type;
  }

  // 取得專案狀態標籤
  getProjectStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      normal: '正常',
      risk: '風險',
      delay: '延遲'
    };
    return labels[status] || status;
  }

  // 顯示專案詳細資訊
  showProjectDetail(item: ProjectGanttItem): void {
    this.selectedGanttProject.set(item);
  }

  // 關閉專案詳細資訊
  closeProjectDetail(): void {
    this.selectedGanttProject.set(null);
  }

  // 計算甘特圖專案條的位置和寬度
  getGanttBarStyle(item: ProjectGanttItem): { left: string; width: string } {
    const range = this.ganttTimeRange();
    const totalDays = this.getDaysBetween(range.start, range.end);
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);

    const startOffset = this.getDaysBetween(range.start, startDate);
    const duration = this.getDaysBetween(startDate, endDate);

    const leftPercent = Math.max(0, (startOffset / totalDays) * 100);
    const widthPercent = Math.min(100 - leftPercent, (duration / totalDays) * 100);

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 5)}%`
    };
  }

  // 計算兩個日期之間的天數
  private getDaysBetween(start: Date, end: Date): number {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round((end.getTime() - start.getTime()) / oneDay);
  }

  // 依據專案類型篩選專案
  filterByType(type: string | null): void {
    if (this.selectedProjectType() === type) {
      this.selectedProjectType.set(null);
    } else {
      this.selectedProjectType.set(type);
    }
    this.updateChartsOnFilter();
  }

  // 依據專案狀態篩選專案
  filterByStatus(status: string | null): void {
    if (this.selectedProjectStatus() === status) {
      this.selectedProjectStatus.set(null);
    } else {
      this.selectedProjectStatus.set(status);
    }
    this.updateChartsOnFilter();
  }

  // 取得過濾後的專案列表
  getFilteredGanttItems(): ProjectGanttItem[] {
    let items = this.projectGanttItems();
    const status = this.selectedProjectStatus();
    const type = this.selectedProjectType();

    if (status) {
      items = items.filter(item => item.status === status);
    }
    if (type) {
      items = items.filter(item => item.type === type);
    }
    return items;
  }

  // 篩選時更新圖表
  private updateChartsOnFilter(): void {
    this.updateProjectStatusDonutChart();
    this.updateProjectTypeBarChart();
  }

  // 初始化專案狀態環狀圖
  private initProjectStatusDonutChart(): void {
    const container = document.getElementById('project-status-donut-chart');
    if (!container) return;

    if (this.projectStatusDonutChart) {
      this.projectStatusDonutChart.dispose();
    }

    this.projectStatusDonutChart = echarts.init(container);
    this.updateProjectStatusDonutChart();

    // 添加點擊事件
    this.projectStatusDonutChart.on('click', (params: any) => {
      this.filterByStatus(params.data?.status || null);
    });
  }

  // 更新專案狀態環狀圖
  private updateProjectStatusDonutChart(): void {
    if (!this.projectStatusDonutChart) return;

    const allItems = this.projectGanttItems();
    const selectedStatus = this.selectedProjectStatus();
    const selectedType = this.selectedProjectType();

    // 根據選中的類型過濾，計算每個狀態的數量
    const filteredItems = selectedType
      ? allItems.filter(item => item.type === selectedType)
      : allItems;

    const statusCounts: Record<string, number> = {
      normal: 0,
      risk: 0,
      delay: 0
    };
    filteredItems.forEach(item => {
      statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    });

    const stats = this.projectStatusStats();
    const total = filteredItems.length;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 個 ({d}%)'
      },
      series: [{
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{value|${total}}\n{name|專案}`,
          rich: {
            value: {
              fontFamily: 'Georgia, serif',
              fontSize: 24,
              fontWeight: 'bold',
              fontStyle: 'italic',
              color: '#464E56',
              lineHeight: 30
            },
            name: {
              fontSize: 12,
              color: '#6B7280',
              lineHeight: 20
            }
          }
        },
        emphasis: {
          label: { show: true },
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          }
        },
        data: stats.map(s => ({
          value: statusCounts[s.status] || 0,
          name: s.label,
          status: s.status,
          itemStyle: {
            color: s.color,
            opacity: selectedStatus && selectedStatus !== s.status ? 0.3 : 1
          }
        }))
      }]
    };

    this.projectStatusDonutChart.setOption(option);
  }

  // 初始化專案類型柱狀圖
  private initProjectTypeBarChart(): void {
    const container = document.getElementById('project-type-bar-chart');
    if (!container) return;

    if (this.projectTypeBarChart) {
      this.projectTypeBarChart.dispose();
    }

    this.projectTypeBarChart = echarts.init(container);
    this.updateProjectTypeBarChart();

    // 添加點擊事件
    this.projectTypeBarChart.on('click', (params: any) => {
      this.filterByType(params.data?.type || null);
    });
  }

  // 更新專案類型柱狀圖
  private updateProjectTypeBarChart(): void {
    if (!this.projectTypeBarChart) return;

    const allItems = this.projectGanttItems();
    const selectedStatus = this.selectedProjectStatus();
    const selectedType = this.selectedProjectType();

    // 根據選中的狀態過濾，計算每個類型的數量
    const filteredItems = selectedStatus
      ? allItems.filter(item => item.status === selectedStatus)
      : allItems;

    const typeCounts: Record<string, number> = {
      integration: 0,
      procurement: 0,
      service: 0,
      software: 0
    };
    filteredItems.forEach(item => {
      typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });

    const stats = this.projectTypeStats();

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: '{b}: {c} 個'
      },
      grid: {
        left: '3%',
        right: '12%',
        bottom: '5%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: stats.map(s => s.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6B7280',
          fontSize: 13,
          fontWeight: 500
        }
      },
      series: [{
        type: 'bar',
        barWidth: 16,
        barCategoryGap: '40%',
        itemStyle: {
          borderRadius: 12
        },
        data: stats.map(s => ({
          value: typeCounts[s.type] || 0,
          name: s.label,
          type: s.type,
          itemStyle: {
            color: s.color,
            opacity: selectedType && selectedType !== s.type ? 0.3 : 1
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          color: '#6B7280',
          fontSize: 12,
          fontWeight: 'bold'
        }
      }]
    };

    this.projectTypeBarChart.setOption(option);
  }

  // 取得甘特圖時間軸刻度
  getGanttTimeMarkers(): { label: string; position: string }[] {
    const range = this.ganttTimeRange();
    const totalDays = this.getDaysBetween(range.start, range.end);
    const markers: { label: string; position: string }[] = [];

    // 每月顯示一個刻度（包含年份）
    const current = new Date(range.start);
    let lastYear = -1;
    while (current <= range.end) {
      const offset = this.getDaysBetween(range.start, current);
      const position = `${(offset / totalDays) * 100}%`;
      const year = current.getFullYear();
      const month = current.getMonth() + 1;

      // 如果是新的一年或第一個刻度，顯示年份
      const label = year !== lastYear ? `${year}/${month}月` : `${month}月`;
      lastYear = year;

      markers.push({ label, position });

      // 移到下個月
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
    }

    return markers;
  }
}
