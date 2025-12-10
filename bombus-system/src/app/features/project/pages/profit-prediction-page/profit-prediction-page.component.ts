import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ProjectService } from '../../services/project.service';
import { ProjectRanking, PerformanceAlert, OKRAnalysis, ProfitPrediction } from '../../models/project.model';
import * as echarts from 'echarts';

@Component({
  standalone: true,
  selector: 'app-profit-prediction-page',
  templateUrl: './profit-prediction-page.component.html',
  styleUrl: './profit-prediction-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfitPredictionPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mainPredictionChart') mainPredictionChartRef!: ElementRef;

  private projectService = inject(ProjectService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Chart
  private mainPredictionChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.resizeCharts();

  // State
  loading = signal(false);
  rankings = signal<ProjectRanking[]>([]);
  alerts = signal<PerformanceAlert[]>([]);
  okrAnalysis = signal<OKRAnalysis[]>([]);
  predictions = signal<ProfitPrediction[]>([]);
  selectedPeriod = signal('quarter');

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeHandler);
    setTimeout(() => this.initChart(), 100);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.mainPredictionChart?.dispose();
  }

  private loadData(): void {
    this.loading.set(true);

    this.projectService.getProjectRankings().subscribe({
      next: (rankings) => this.rankings.set(rankings)
    });

    this.projectService.getPerformanceAlerts().subscribe({
      next: (alerts) => this.alerts.set(alerts)
    });

    this.projectService.getOKRAnalysis().subscribe({
      next: (analysis) => this.okrAnalysis.set(analysis)
    });

    this.projectService.getProfitPredictions().subscribe({
      next: (predictions) => {
        this.predictions.set(predictions);
        this.loading.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.updateChart(), 100);
      }
    });
  }

  private initChart(): void {
    if (!this.mainPredictionChartRef?.nativeElement) return;

    this.mainPredictionChart = echarts.init(this.mainPredictionChartRef.nativeElement);
    this.updateChart();
  }

  private updateChart(): void {
    if (!this.mainPredictionChart) return;

    const predictions = this.predictions();
    const months = predictions.map(p => p.month);
    const actual = predictions.map(p => p.actual);
    const predicted = predictions.map(p => p.predicted);
    const optimistic = predictions.map(p => p.optimistic);
    const pessimistic = predictions.map(p => p.pessimistic);

    this.mainPredictionChart.setOption({
      tooltip: {
        trigger: 'axis',
        formatter: (params: { name: string; seriesName: string; value: number | null }[]) => {
          let html = params[0].name + '<br/>';
          params.forEach(param => {
            if (param.value !== null) {
              html += param.seriesName + ': $' + param.value + 'M<br/>';
            }
          });
          return html;
        }
      },
      legend: {
        data: ['歷史損益', 'AI 預測 (悲觀)', 'AI 預測 (基準)', 'AI 預測 (樂觀)'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: months
      },
      yAxis: {
        type: 'value',
        name: '淨利 (Million)',
        axisLabel: { formatter: '${value}M' }
      },
      series: [
        {
          name: '歷史損益',
          type: 'line',
          data: actual,
          itemStyle: { color: '#64748B' },
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(100, 116, 139, 0.3)' },
                { offset: 1, color: 'rgba(100, 116, 139, 0)' }
              ]
            }
          }
        },
        {
          name: 'AI 預測 (基準)',
          type: 'line',
          smooth: true,
          lineStyle: { type: 'dashed', width: 3 },
          data: predicted,
          itemStyle: { color: '#9A8C98' }
        },
        {
          name: 'AI 預測 (樂觀)',
          type: 'line',
          smooth: true,
          lineStyle: { type: 'dotted', opacity: 0.5 },
          data: optimistic,
          itemStyle: { color: '#7FB095' },
          symbol: 'none'
        },
        {
          name: 'AI 預測 (悲觀)',
          type: 'line',
          smooth: true,
          lineStyle: { type: 'dotted', opacity: 0.5 },
          data: pessimistic,
          itemStyle: { color: '#C77F7F' },
          symbol: 'none'
        }
      ]
    });
  }

  private resizeCharts(): void {
    this.mainPredictionChart?.resize();
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod.set(period);
    // Could reload data with different period filter
  }

  navigateToProject(projectId: string): void {
    this.router.navigate(['/project/detail', projectId]);
  }

  getRankClass(rank: number): string {
    switch (rank) {
      case 1: return 'rank-1';
      case 2: return 'rank-2';
      case 3: return 'rank-3';
      default: return '';
    }
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  }
}
