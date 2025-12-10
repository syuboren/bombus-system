import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TalentMapService } from '../../services/talent-map.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { KeyTalentMetric, RiskAlert, SuccessionPlan } from '../../models/talent-map.model';
import * as echarts from 'echarts';

@Component({
  selector: 'app-key-talent-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './key-talent-tab.component.html',
  styleUrl: './key-talent-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeyTalentTabComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('coverageChart', { static: false }) coverageChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('costChart', { static: false }) costChartRef!: ElementRef<HTMLDivElement>;

  private talentMapService = inject(TalentMapService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private coverageChart: echarts.ECharts | null = null;
  private costChart: echarts.ECharts | null = null;
  private viewReady = false;
  private resizeHandler = () => {
    this.coverageChart?.resize();
    this.costChart?.resize();
  };

  // Options
  readonly departmentOptions = this.talentMapService.departmentOptions;

  // Retention suggestions
  readonly retentionSuggestions = [
    '立即安排一對一面談，了解真實離職意願',
    '評估薪資調整空間（建議調幅 15-20%）',
    '提供職涯發展機會或晉升路徑',
    '安排 EAP 心理諮商服務',
    '彈性工作安排（如週休三日試行）'
  ];

  // Signals
  selectedDepartment = signal<string>('all');
  metrics = signal<KeyTalentMetric[]>([]);
  riskAlerts = signal<RiskAlert[]>([]);
  successionPlans = signal<SuccessionPlan[]>([]);
  loading = signal(false);

  // Modal state
  showRetentionModal = signal(false);
  selectedAlert = signal<RiskAlert | null>(null);

  ngOnInit(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadData();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.coverageChart?.dispose();
    this.costChart?.dispose();
  }

  loadData(): void {
    this.loading.set(true);

    this.talentMapService.getKeyTalentMetrics().subscribe(data => {
      this.metrics.set(data);
      this.cdr.detectChanges();
    });

    this.talentMapService.getRiskAlerts().subscribe(data => {
      this.riskAlerts.set(data);
      this.cdr.detectChanges();
    });

    this.talentMapService.getSuccessionPlans().subscribe(data => {
      this.successionPlans.set(data);
      this.loading.set(false);
      this.cdr.detectChanges();
      
      if (this.viewReady && data.length > 0) {
        setTimeout(() => this.updateCharts(data), 100);
      }
    });
  }

  updateDepartment(dept: string): void {
    this.selectedDepartment.set(dept);
    this.loadData();
  }

  startRetentionPlan(): void {
    this.notificationService.info('功能開發中：將連結至完整的留才計畫管理模組');
  }

  // Open retention modal
  openRetentionModal(alert: RiskAlert): void {
    this.selectedAlert.set(alert);
    this.showRetentionModal.set(true);
    this.cdr.detectChanges();
  }

  // Close retention modal
  closeRetentionModal(): void {
    this.showRetentionModal.set(false);
    this.selectedAlert.set(null);
    this.cdr.detectChanges();
  }

  // Confirm retention plan
  confirmRetention(): void {
    const alert = this.selectedAlert();
    if (!alert) return;

    this.closeRetentionModal();
    this.notificationService.success(`留才計畫已啟動：${alert.name} 的留才方案已建立，HR 將在 24 小時內聯繫`);
  }

  // Calculate estimated success rate based on risk score
  getEstimatedSuccessRate(alert: RiskAlert | null): number {
    if (!alert) return 0;
    // Higher risk score = lower success rate
    return Math.max(50, 100 - alert.riskScore + 20);
  }

  getCoverageClass(coverage: string): string {
    return `coverage-badge--${coverage}`;
  }

  exportChart(chartType: 'coverage' | 'cost'): void {
    const chart = chartType === 'coverage' ? this.coverageChart : this.costChart;
    if (chart) {
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${chartType}-chart.png`;
      link.href = url;
      link.click();
    }
  }

  private updateCharts(plans: SuccessionPlan[]): void {
    this.updateCoverageChart(plans);
    this.updateCostChart();
  }

  private updateCoverageChart(plans: SuccessionPlan[]): void {
    if (!this.coverageChartRef?.nativeElement) return;

    if (!this.coverageChart) {
      this.coverageChart = echarts.init(this.coverageChartRef.nativeElement);
    }

    const coverageMap: Record<string, number> = { high: 100, medium: 60, low: 20 };
    const colorMap: Record<string, string> = { high: '#7FB095', medium: '#E3C088', low: '#C77F7F' };

    const option: echarts.EChartsOption = {
      title: {
        text: '關鍵職位接班人覆蓋率',
        left: 'center',
        textStyle: { color: '#1F2937', fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: plans.map(p => p.position),
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: {
          color: '#6B7280',
          rotate: 15,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280', formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#F5F5F7' } }
      },
      series: [{
        type: 'bar',
        data: plans.map(p => ({
          value: coverageMap[p.coverage],
          itemStyle: { color: colorMap[p.coverage] }
        })),
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: '#6B7280'
        }
      }]
    };

    this.coverageChart.setOption(option);
  }

  private updateCostChart(): void {
    if (!this.costChartRef?.nativeElement) return;

    if (!this.costChart) {
      this.costChart = echarts.init(this.costChartRef.nativeElement);
    }

    const option: echarts.EChartsOption = {
      title: {
        text: '人才流失成本分析',
        left: 'center',
        textStyle: { color: '#1F2937', fontSize: 16 }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 萬 ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#6B7280' }
      },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '55%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data: [
          { value: 60, name: '替換成本', itemStyle: { color: '#C77F7F' } },
          { value: 35, name: '培訓成本', itemStyle: { color: '#E3C088' } },
          { value: 30, name: '產出損失', itemStyle: { color: '#7F9CA0' } },
          { value: 25, name: '其他成本', itemStyle: { color: '#8DA399' } }
        ]
      }]
    };

    this.costChart.setOption(option);
  }
}
