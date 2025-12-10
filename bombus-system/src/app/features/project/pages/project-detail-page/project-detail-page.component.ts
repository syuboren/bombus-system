import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ProjectService } from '../../services/project.service';
import { ProjectDetail, Task, TaskDetail, TeamMember } from '../../models/project.model';
import * as echarts from 'echarts';

type TabType = 'overview' | 'tasks' | 'financial';

@Component({
  standalone: true,
  selector: 'app-project-detail-page',
  templateUrl: './project-detail-page.component.html',
  styleUrl: './project-detail-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectDetailPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('miniProfitChart') miniProfitChartRef!: ElementRef;
  @ViewChild('timeTunnelChart') timeTunnelChartRef!: ElementRef;
  @ViewChild('waterfallChart') waterfallChartRef!: ElementRef;
  @ViewChild('costPieChart') costPieChartRef!: ElementRef;
  @ViewChild('profitTrendChart') profitTrendChartRef!: ElementRef;

  private projectService = inject(ProjectService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Charts
  private miniProfitChart: echarts.ECharts | null = null;
  private timeTunnelChart: echarts.ECharts | null = null;
  private waterfallChart: echarts.ECharts | null = null;
  private costPieChart: echarts.ECharts | null = null;
  private profitTrendChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.resizeCharts();

  // State
  loading = signal(true);
  project = signal<ProjectDetail | null>(null);
  activeTab = signal<TabType>('overview');
  teamMembers = signal<TeamMember[]>([]);

  // Task Modal
  showTaskModal = signal(false);
  selectedTask = signal<TaskDetail | null>(null);
  taskHours = signal(40);
  taskAssigneeRate = signal(800);

  // Computed for header
  projectName = computed(() => this.project()?.name || '專案詳情');
  breadcrumbs = computed(() => ['專案管理', '專案列表', this.projectName()]);

  ngOnInit(): void {
    const projectId = this.route.snapshot.paramMap.get('id');
    if (projectId) {
      this.loadProjectDetail(projectId);
    }

    this.projectService.getTeamMembers().subscribe({
      next: (members) => this.teamMembers.set(members)
    });
  }

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeHandler);
    // Initialize overview charts after view init
    setTimeout(() => this.initOverviewCharts(), 100);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.disposeCharts();
  }

  private loadProjectDetail(id: string): void {
    this.loading.set(true);
    this.projectService.getProjectDetail(id).subscribe({
      next: (detail) => {
        this.project.set(detail);
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  switchTab(tab: TabType): void {
    this.activeTab.set(tab);
    this.cdr.detectChanges();

    if (tab === 'financial') {
      setTimeout(() => this.initFinancialCharts(), 100);
    }
  }

  goBack(): void {
    this.router.navigate(['/project']);
  }

  // Task Modal
  openTaskDetail(task: Task): void {
    this.projectService.getTaskDetail(task.id).subscribe({
      next: (detail) => {
        this.selectedTask.set(detail);
        this.taskHours.set(detail.estimatedHours);
        this.taskAssigneeRate.set(detail.hourlyRate);
        this.showTaskModal.set(true);
        this.cdr.detectChanges();
      }
    });
  }

  closeTaskDetail(): void {
    this.showTaskModal.set(false);
    this.selectedTask.set(null);
  }

  updateTaskCost(): void {
    const hours = this.taskHours();
    const rate = this.taskAssigneeRate();
    const labor = hours * rate;
    const overhead = Math.round(labor * 0.05);

    this.selectedTask.update(task => {
      if (!task) return null;
      return {
        ...task,
        estimatedHours: hours,
        hourlyRate: rate,
        laborCost: labor,
        overheadCost: overhead,
        totalCost: labor + overhead
      };
    });
  }

  // Charts
  private initOverviewCharts(): void {
    if (this.miniProfitChartRef?.nativeElement) {
      this.miniProfitChart = echarts.init(this.miniProfitChartRef.nativeElement);
      this.miniProfitChart.setOption({
        grid: { top: 10, bottom: 20, left: 30, right: 10 },
        xAxis: { type: 'category', data: ['M1', 'M2', 'M3'] },
        yAxis: { type: 'value' },
        series: [{
          data: [10, 12, 8],
          type: 'line',
          smooth: true,
          areaStyle: { color: 'rgba(199,127,127,0.2)' },
          lineStyle: { color: '#C77F7F' }
        }]
      });
    }
  }

  private initFinancialCharts(): void {
    // Time Tunnel Chart
    if (this.timeTunnelChartRef?.nativeElement) {
      this.timeTunnelChart = echarts.init(this.timeTunnelChartRef.nativeElement);
      this.timeTunnelChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: ['實際成本', 'AI 預測成本'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        },
        yAxis: { type: 'value', name: '成本 (K)', axisLabel: { formatter: '${value}' } },
        series: [
          {
            name: '實際成本',
            type: 'line',
            data: [150, 230, 224, 218, 135, 147, 260, null, null, null, null, null],
            itemStyle: { color: '#64748B' },
            lineStyle: { width: 3 }
          },
          {
            name: 'AI 預測成本',
            type: 'line',
            smooth: true,
            lineStyle: { type: 'dashed', width: 3 },
            data: [150, 230, 224, 218, 135, 147, 260, 280, 310, 340, 380, 410],
            itemStyle: { color: '#9A8C98' },
            markArea: {
              itemStyle: { color: 'rgba(154, 140, 152, 0.1)' },
              data: [[{ xAxis: 'Jul' }, { xAxis: 'Dec' }]]
            }
          }
        ]
      });
    }

    // Waterfall Chart
    if (this.waterfallChartRef?.nativeElement) {
      this.waterfallChart = echarts.init(this.waterfallChartRef.nativeElement);
      this.waterfallChart.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
        xAxis: {
          type: 'category',
          splitLine: { show: false },
          data: ['總預算', '人力成本', '外包成本', '設備成本', '間接成本', '預估毛利']
        },
        yAxis: { type: 'value' },
        series: [
          {
            name: 'Placeholder',
            type: 'bar',
            stack: 'Total',
            itemStyle: { borderColor: 'transparent', color: 'transparent' },
            data: [0, 2800000, 2300000, 2200000, 1600000, 0]
          },
          {
            name: '金額',
            type: 'bar',
            stack: 'Total',
            label: { show: true, position: 'top', formatter: (p: { value: number }) => `$${(p.value / 1000000).toFixed(1)}M` },
            data: [
              { value: 4000000, itemStyle: { color: '#64748B' } },
              { value: 1200000, itemStyle: { color: '#C77F7F' } },
              { value: 500000, itemStyle: { color: '#C77F7F' } },
              { value: 100000, itemStyle: { color: '#C77F7F' } },
              { value: 600000, itemStyle: { color: '#E3C088' } },
              { value: 1600000, itemStyle: { color: '#7FB095' } }
            ]
          }
        ]
      });
    }

    // Cost Pie Chart
    if (this.costPieChartRef?.nativeElement) {
      this.costPieChart = echarts.init(this.costPieChartRef.nativeElement);
      this.costPieChart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: ${c} ({d}%)' },
        legend: { bottom: '0%', left: 'center', icon: 'circle', itemWidth: 8, itemHeight: 8 },
        color: ['#9A8C98', '#B87D7B', '#D6A28C', '#E3C088'],
        series: [{
          name: 'Cost Structure',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
          label: { show: false, position: 'center' },
          emphasis: { label: { show: true, fontSize: 16, fontWeight: 'bold', color: '#475569' } },
          labelLine: { show: false },
          data: [
            { value: 1200000, name: '人力成本' },
            { value: 500000, name: '外包開發' },
            { value: 100000, name: '設備資源' },
            { value: 600000, name: '間接成本' }
          ]
        }]
      });
    }

    // Profit Trend Chart
    if (this.profitTrendChartRef?.nativeElement) {
      this.profitTrendChart = echarts.init(this.profitTrendChartRef.nativeElement);
      this.profitTrendChart.setOption({
        tooltip: { trigger: 'axis' },
        grid: { left: '10%', bottom: '10%' },
        xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'] },
        yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
        series: [{
          type: 'line',
          data: [20, 25, 22, 28, 30, 32],
          smooth: true,
          itemStyle: { color: '#8DA399' },
          areaStyle: { color: 'rgba(141, 163, 153, 0.2)' }
        }]
      });
    }
  }

  private resizeCharts(): void {
    this.miniProfitChart?.resize();
    this.timeTunnelChart?.resize();
    this.waterfallChart?.resize();
    this.costPieChart?.resize();
    this.profitTrendChart?.resize();
  }

  private disposeCharts(): void {
    this.miniProfitChart?.dispose();
    this.timeTunnelChart?.dispose();
    this.waterfallChart?.dispose();
    this.costPieChart?.dispose();
    this.profitTrendChart?.dispose();
  }

  // Helpers
  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'badge--active';
      case 'risk': return 'badge--risk';
      case 'planning': return 'badge--planning';
      case 'completed': return 'badge--completed';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return '進行中';
      case 'risk': return '風險';
      case 'planning': return '規劃中';
      case 'completed': return '已完成';
      default: return status;
    }
  }

  getTaskStatusClass(status: string): string {
    switch (status) {
      case 'completed': return 'badge--active';
      case 'in-progress': return 'badge--planning';
      case 'delayed': return 'badge--risk';
      case 'pending': return 'badge--pending';
      default: return '';
    }
  }

  getTaskStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return '已完成';
      case 'in-progress': return '進行中';
      case 'delayed': return '延遲中';
      case 'pending': return '待開始';
      default: return status;
    }
  }

  getWeightClass(weight: string): string {
    switch (weight) {
      case 'high': return 'badge--active';
      case 'medium': return 'badge--medium';
      case 'low': return 'badge--low';
      default: return '';
    }
  }

  getWeightLabel(weight: string): string {
    switch (weight) {
      case 'high': return 'High (40%)';
      case 'medium': return 'Med (25%)';
      case 'low': return 'Low (10%)';
      default: return weight;
    }
  }

  formatCurrency(value: number): string {
    return `$${value.toLocaleString()}`;
  }

  formatCurrencyShort(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  }
}
