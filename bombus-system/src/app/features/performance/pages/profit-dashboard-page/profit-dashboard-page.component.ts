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
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { PerformanceService } from '../../services/performance.service';
import {
  CalculationPeriod,
  PeriodOption,
  ProfitKPISummary,
  DepartmentProfit,
  CostStructureItem,
  ProfitTrendData,
  ProfitAlert
} from '../../models/performance.model';
import * as echarts from 'echarts';

@Component({
  standalone: true,
  selector: 'app-profit-dashboard-page',
  templateUrl: './profit-dashboard-page.component.html',
  styleUrl: './profit-dashboard-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfitDashboardPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('profitTrendChart') profitTrendChartRef!: ElementRef;
  @ViewChild('costDonutChart') costDonutChartRef!: ElementRef;
  @ViewChild('departmentBarChart') departmentBarChartRef!: ElementRef;

  // Math reference for template
  readonly Math = Math;

  private performanceService = inject(PerformanceService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Charts
  private profitTrendChart: echarts.ECharts | null = null;
  private costDonutChart: echarts.ECharts | null = null;
  private departmentBarChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.resizeCharts();

  // Period
  readonly periodOptions = this.performanceService.periodOptions;
  selectedPeriod = signal<CalculationPeriod>('month');

  // Data
  loading = signal(true);
  kpiSummary = signal<ProfitKPISummary | null>(null);
  departmentProfits = signal<DepartmentProfit[]>([]);
  costStructure = signal<CostStructureItem[]>([]);
  profitTrendData = signal<ProfitTrendData[]>([]);
  alerts = signal<ProfitAlert[]>([]);

  // Computed
  totalCost = computed(() => {
    return this.costStructure().reduce((sum, item) => sum + item.amount, 0);
  });

  sortedDepartments = computed(() => {
    return [...this.departmentProfits()].sort((a, b) => b.grossProfit - a.grossProfit);
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeHandler);
    setTimeout(() => this.initCharts(), 300);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.profitTrendChart?.dispose();
    this.costDonutChart?.dispose();
    this.departmentBarChart?.dispose();
  }

  onPeriodChange(period: CalculationPeriod): void {
    this.selectedPeriod.set(period);
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    const period = this.selectedPeriod();

    this.performanceService.getProfitKPISummary(period).subscribe({
      next: (data) => {
        this.kpiSummary.set(data);
        this.cdr.detectChanges();
      }
    });

    this.performanceService.getDepartmentProfits(period).subscribe({
      next: (data) => {
        this.departmentProfits.set(data);
        this.cdr.detectChanges();
        setTimeout(() => this.updateDepartmentBarChart(), 100);
      }
    });

    this.performanceService.getCostStructure(period).subscribe({
      next: (data) => {
        this.costStructure.set(data);
        this.cdr.detectChanges();
        setTimeout(() => this.updateCostDonutChart(), 100);
      }
    });

    this.performanceService.getProfitTrendData(period).subscribe({
      next: (data) => {
        this.profitTrendData.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.updateProfitTrendChart(), 100);
      }
    });

    this.performanceService.getProfitAlerts().subscribe({
      next: (data) => {
        this.alerts.set(data);
        this.cdr.detectChanges();
      }
    });
  }

  private initCharts(): void {
    if (this.profitTrendChartRef?.nativeElement) {
      this.profitTrendChart = echarts.init(this.profitTrendChartRef.nativeElement);
    }
    if (this.costDonutChartRef?.nativeElement) {
      this.costDonutChart = echarts.init(this.costDonutChartRef.nativeElement);
    }
    if (this.departmentBarChartRef?.nativeElement) {
      this.departmentBarChart = echarts.init(this.departmentBarChartRef.nativeElement);
    }
    this.updateProfitTrendChart();
    this.updateCostDonutChart();
    this.updateDepartmentBarChart();
  }

  private updateProfitTrendChart(): void {
    if (!this.profitTrendChart) return;

    const data = this.profitTrendData();
    if (data.length === 0) return;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E4E8',
        textStyle: { color: '#464E56', fontSize: 12 },
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['營收', '成本', '毛利', '毛利率', '目標'],
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
        data: data.map(d => d.period),
        axisLabel: { color: '#6B7280', fontSize: 11 },
        axisLine: { lineStyle: { color: '#E2E4E8' } }
      },
      yAxis: [
        {
          type: 'value',
          name: '金額 (萬)',
          position: 'left',
          axisLabel: { color: '#6B7280', fontSize: 10, formatter: '{value}' },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: '#F5F5F7' } }
        },
        {
          type: 'value',
          name: '毛利率 (%)',
          position: 'right',
          min: 0,
          max: 50,
          axisLabel: { color: '#6B7280', fontSize: 10, formatter: '{value}%' },
          axisLine: { show: false },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '營收',
          type: 'bar',
          barWidth: '20%',
          data: data.map(d => d.revenue),
          itemStyle: { color: '#7F9CA0', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: '成本',
          type: 'bar',
          barWidth: '20%',
          data: data.map(d => d.cost),
          itemStyle: { color: '#D6A28C', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: '毛利',
          type: 'bar',
          barWidth: '20%',
          data: data.map(d => d.grossProfit),
          itemStyle: { color: '#8DA399', borderRadius: [4, 4, 0, 0] }
        },
        {
          name: '毛利率',
          type: 'line',
          yAxisIndex: 1,
          data: data.map(d => d.profitMargin),
          smooth: true,
          lineStyle: { width: 3, color: '#9A8C98' },
          itemStyle: { color: '#9A8C98' },
          symbol: 'circle',
          symbolSize: 8
        },
        {
          name: '目標',
          type: 'line',
          yAxisIndex: 1,
          data: data.map(d => d.target),
          lineStyle: { width: 2, color: '#E57373', type: 'dashed' },
          itemStyle: { color: '#E57373' },
          symbol: 'none'
        }
      ]
    };

    this.profitTrendChart.setOption(option);
  }

  private updateCostDonutChart(): void {
    if (!this.costDonutChart) return;

    const data = this.costStructure();
    if (data.length === 0) return;

    const total = this.totalCost();

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `${params.name}<br/>金額: ${params.value} 萬<br/>佔比: ${params.percent}%`;
        }
      },
      series: [{
        type: 'pie',
        radius: ['50%', '80%'],
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
          formatter: () => `{value|${total.toLocaleString()}}\n{label|萬元}`,
          rich: {
            value: {
              fontSize: 28,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 'bold',
              color: '#374151',
              lineHeight: 36
            },
            label: {
              fontSize: 12,
              color: '#9CA3AF',
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
        labelLine: { show: false },
        data: data.map(item => ({
          name: item.label,
          value: item.amount,
          itemStyle: { color: item.color }
        }))
      }]
    };

    this.costDonutChart.setOption(option);
  }

  private updateDepartmentBarChart(): void {
    if (!this.departmentBarChart) return;

    const data = this.sortedDepartments();
    if (data.length === 0) return;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const d = params[0];
          const dept = data[d.dataIndex];
          return `<div style="font-weight: bold; margin-bottom: 4px;">${dept.departmentName}</div>
            <div>營收: ${dept.revenue.toLocaleString()} 萬</div>
            <div>毛利: ${dept.grossProfit.toLocaleString()} 萬</div>
            <div>毛利率: ${dept.profitMargin}%</div>
            <div>達成率: ${dept.targetAchievement}%</div>`;
        }
      },
      grid: {
        left: '3%',
        right: '15%',
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
        data: data.map(d => d.departmentName),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#464E56',
          fontSize: 13,
          fontWeight: 500
        },
        inverse: true
      },
      series: [{
        type: 'bar',
        barWidth: 20,
        data: data.map(d => ({
          value: d.grossProfit,
          itemStyle: {
            color: d.color,
            borderRadius: 12
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            const dept = data[params.dataIndex];
            return `${params.value} 萬 (${dept.profitMargin}%)`;
          },
          color: '#6B7280',
          fontSize: 12,
          fontWeight: 500
        }
      }]
    };

    this.departmentBarChart.setOption(option);
  }

  private resizeCharts(): void {
    this.profitTrendChart?.resize();
    this.costDonutChart?.resize();
    this.departmentBarChart?.resize();
  }

  navigateToBonusDistribution(): void {
    this.router.navigate(['/performance/bonus-distribution']);
  }

  getAlertSeverityClass(severity: string): string {
    return `alert--${severity}`;
  }

  getAlertIcon(type: string): string {
    switch (type) {
      case 'cost_overrun': return 'ri-money-dollar-circle-line';
      case 'low_margin': return 'ri-percent-line';
      case 'target_risk': return 'ri-alarm-warning-line';
      default: return 'ri-information-line';
    }
  }

  getTrendIcon(trend: 'up' | 'down' | 'flat'): string {
    switch (trend) {
      case 'up': return 'ri-arrow-up-line';
      case 'down': return 'ri-arrow-down-line';
      default: return 'ri-subtract-line';
    }
  }

  getTrendClass(trend: 'up' | 'down' | 'flat'): string {
    switch (trend) {
      case 'up': return 'trend--up';
      case 'down': return 'trend--down';
      default: return 'trend--flat';
    }
  }

  formatCurrency(value: number): string {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}億`;
    }
    return `${value.toLocaleString()}萬`;
  }
}

