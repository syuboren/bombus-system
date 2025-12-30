import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ProjectService } from '../../services/project.service';
import {
  ProjectReport,
  ProjectHeatmapData,
  ProjectPortfolioStats
} from '../../models/project.model';

@Component({
  selector: 'app-project-report-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective, HeaderComponent],
  templateUrl: './project-report-page.component.html',
  styleUrl: './project-report-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideEcharts()]
})
export class ProjectReportPageComponent implements OnInit {
  private projectService = inject(ProjectService);

  // State signals
  loading = signal(true);
  reports = signal<ProjectReport[]>([]);
  heatmapData = signal<ProjectHeatmapData[]>([]);
  portfolioStats = signal<ProjectPortfolioStats | null>(null);
  selectedReport = signal<ProjectReport | null>(null);
  showReportModal = signal(false);
  viewMode = signal<'portfolio' | 'heatmap'>('portfolio');

  // Computed signals
  sortedReports = computed(() => {
    return [...this.reports()].sort((a, b) => b.grossMarginRate - a.grossMarginRate);
  });

  // Portfolio overview chart
  portfolioChartOptions = computed(() => {
    const reports = this.reports();
    if (!reports.length) return {};

    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'shadow' as const }
      },
      legend: {
        data: ['預算', '實際成本', '毛利'],
        bottom: 0,
        textStyle: { color: '#64748B', fontSize: 12 }
      },
      grid: { left: 60, right: 30, top: 20, bottom: 50 },
      xAxis: {
        type: 'category' as const,
        data: reports.map(r => this.truncateName(r.projectName)),
        axisLabel: {
          color: '#64748B',
          fontSize: 11,
          rotate: 15,
          interval: 0
        },
        axisLine: { lineStyle: { color: '#E2E8F0' } }
      },
      yAxis: {
        type: 'value' as const,
        name: '萬元',
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        axisLabel: {
          color: '#64748B',
          fontSize: 11,
          formatter: (value: number) => (value / 10000).toFixed(0)
        },
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' as const } }
      },
      series: [
        {
          name: '預算',
          type: 'bar' as const,
          data: reports.map(r => r.budgetAmount),
          itemStyle: { color: '#9A8C98', borderRadius: [4, 4, 0, 0] as [number, number, number, number] },
          barWidth: '25%'
        },
        {
          name: '實際成本',
          type: 'bar' as const,
          data: reports.map(r => r.actualCost),
          itemStyle: { color: '#E3C088', borderRadius: [4, 4, 0, 0] as [number, number, number, number] },
          barWidth: '25%'
        },
        {
          name: '毛利',
          type: 'bar' as const,
          data: reports.map(r => r.grossProfit),
          itemStyle: {
            color: (params: any) => params.value >= 0 ? '#7FB095' : '#C77F7F',
            borderRadius: [4, 4, 0, 0] as [number, number, number, number]
          },
          barWidth: '25%'
        }
      ]
    };
  });

  // Profit rate radar chart
  profitRadarOptions = computed(() => {
    const reports = this.reports();
    if (!reports.length) return {};

    const maxRate = Math.max(...reports.map(r => Math.abs(r.grossMarginRate)));
    const maxValue = Math.ceil(maxRate / 10) * 10 + 10;

    return {
      tooltip: {},
      radar: {
        indicator: reports.map(r => ({
          name: this.truncateName(r.projectName, 8),
          max: maxValue
        })),
        radius: '65%',
        axisName: {
          color: '#64748B',
          fontSize: 11
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(154, 140, 152, 0.05)', 'rgba(154, 140, 152, 0.1)']
          }
        },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        splitLine: { lineStyle: { color: '#E2E8F0' } }
      },
      series: [{
        type: 'radar' as const,
        data: [{
          value: reports.map(r => Math.max(0, r.grossMarginRate)),
          name: '毛利率',
          areaStyle: {
            color: 'rgba(127, 176, 149, 0.3)'
          },
          lineStyle: { color: '#7FB095', width: 2 },
          itemStyle: { color: '#7FB095' }
        }]
      }]
    };
  });

  // Heatmap chart options
  heatmapChartOptions = computed(() => {
    const data = this.heatmapData();
    if (!data.length) return {};

    const dimensions = ['進度', '成本', '毛利'];
    const projects = data.map(d => this.truncateName(d.projectName, 10));

    const heatmapValues: number[][] = [];
    data.forEach((d, yIndex) => {
      heatmapValues.push([0, yIndex, d.progressScore]);
      heatmapValues.push([1, yIndex, d.costScore]);
      heatmapValues.push([2, yIndex, d.profitScore]);
    });

    return {
      tooltip: {
        position: 'top' as const,
        formatter: (params: any) => {
          const dim = dimensions[params.data[0]];
          const proj = projects[params.data[1]];
          const score = params.data[2];
          return `${proj}<br/>${dim}：${score} 分`;
        }
      },
      grid: { left: 150, right: 30, top: 30, bottom: 50 },
      xAxis: {
        type: 'category' as const,
        data: dimensions,
        axisLabel: { color: '#64748B', fontSize: 12 },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category' as const,
        data: projects,
        axisLabel: { color: '#64748B', fontSize: 12 },
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        splitArea: { show: true }
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'horizontal' as const,
        left: 'center' as const,
        bottom: 0,
        inRange: {
          color: ['#C77F7F', '#E3C088', '#7FB095']
        },
        textStyle: { color: '#64748B' }
      },
      series: [{
        type: 'heatmap' as const,
        data: heatmapValues,
        label: {
          show: true,
          color: '#fff',
          fontSize: 12,
          fontWeight: 'bold' as const
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    this.projectService.getProjectReports().subscribe(reports => {
      this.reports.set(reports);
    });

    this.projectService.getProjectHeatmapData().subscribe(data => {
      this.heatmapData.set(data);
    });

    this.projectService.getPortfolioStats().subscribe(stats => {
      this.portfolioStats.set(stats);
      this.loading.set(false);
    });
  }

  truncateName(name: string, length: number = 12): string {
    return name.length > length ? name.substring(0, length) + '...' : name;
  }

  formatCurrency(amount: number): string {
    if (Math.abs(amount) >= 10000000) {
      return (amount / 10000000).toFixed(1) + ' 千萬';
    }
    return (amount / 10000).toFixed(0) + ' 萬';
  }

  formatPercent(value: number): string {
    const prefix = value >= 0 ? '+' : '';
    return prefix + value.toFixed(1) + '%';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'excellent': return 'status--excellent';
      case 'good': return 'status--good';
      case 'warning': return 'status--warning';
      case 'critical': return 'status--critical';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'excellent': return '優良';
      case 'good': return '良好';
      case 'warning': return '注意';
      case 'critical': return '危險';
      default: return status;
    }
  }

  getProfitClass(rate: number): string {
    if (rate >= 30) return 'profit--high';
    if (rate >= 15) return 'profit--medium';
    if (rate >= 0) return 'profit--low';
    return 'profit--negative';
  }

  getVarianceClass(variance: number): string {
    if (variance > 0) return 'variance--over';
    if (variance < 0) return 'variance--under';
    return 'variance--on-target';
  }

  setViewMode(mode: 'portfolio' | 'heatmap'): void {
    this.viewMode.set(mode);
  }

  openReport(report: ProjectReport): void {
    this.selectedReport.set(report);
    this.showReportModal.set(true);
  }

  closeReport(): void {
    this.showReportModal.set(false);
    this.selectedReport.set(null);
  }

  exportReport(format: 'pdf' | 'excel'): void {
    // TODO: Implement export functionality
    console.log(`Exporting report as ${format}`);
  }
}

