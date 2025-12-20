import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CompetencyService } from '../../services/competency.service';
import {
  GapAnalysisReport,
  CompetencyGap,
  RadarDataPoint,
  GapSeverity
} from '../../models/competency.model';
import * as echarts from 'echarts';

@Component({
  selector: 'app-gap-analysis-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './gap-analysis-page.component.html',
  styleUrl: './gap-analysis-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GapAnalysisPageComponent implements OnInit, AfterViewInit {
  private competencyService = inject(CompetencyService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLDivElement>;
  private radarChartInstance: echarts.ECharts | null = null;

  // Page Info
  readonly pageTitle = '職能落差分析';
  readonly breadcrumbs = ['首頁', '職能管理'];

  // Data signals
  report = signal<GapAnalysisReport | null>(null);
  departmentSummary = signal<{ department: string; avgGap: number; criticalCount: number }[]>([]);
  loading = signal(true);

  // Filter
  selectedEmployee = signal<string>('emp-001');

  // Employee options (mock)
  readonly employeeOptions = [
    { value: 'emp-001', label: '王小明 - 研發部 / 資深工程師' },
    { value: 'emp-002', label: '李小華 - 研發部 / 工程師' },
    { value: 'emp-003', label: '陳大文 - 業務部 / 業務專員' }
  ];

  // Expose Math to template
  readonly Math = Math;

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initRadarChart();
    }, 500);
  }

  loadData(): void {
    this.loading.set(true);

    // Load department summary
    this.competencyService.getDepartmentGapSummary().subscribe(data => {
      this.departmentSummary.set(data);
    });

    // Load employee report
    this.competencyService.getGapAnalysisReport(this.selectedEmployee()).subscribe(data => {
      this.report.set(data);
      this.loading.set(false);
      this.cdr.detectChanges();

      // Update chart after data loaded
      setTimeout(() => {
        this.updateRadarChart(data.radarData);
      }, 100);
    });
  }

  onEmployeeChange(value: string): void {
    this.selectedEmployee.set(value);
    this.loadData();
  }

  private initRadarChart(): void {
    if (!this.radarChartRef?.nativeElement) return;

    // 只初始化 ECharts 實例，不設置任何配置
    // 配置將由 updateRadarChart 在數據載入後設置
    this.radarChartInstance = echarts.init(this.radarChartRef.nativeElement);

    // Handle resize
    window.addEventListener('resize', () => {
      this.radarChartInstance?.resize();
    });
  }

  private updateRadarChart(data: RadarDataPoint[]): void {
    if (!this.radarChartRef?.nativeElement) return;

    // 如果資料為空，不更新
    if (!data || !data.length) return;

    // 檢查當前 DOM 元素上是否有 ECharts 實例
    const existingInstance = echarts.getInstanceByDom(this.radarChartRef.nativeElement);

    if (existingInstance) {
      // 如果 DOM 上已有實例，使用它
      this.radarChartInstance = existingInstance;
    } else {
      // 如果當前 DOM 沒有實例，但我們保留了舊的實例引用，先 dispose 舊的
      if (this.radarChartInstance) {
        this.radarChartInstance.dispose();
      }
      // 在當前 DOM 初始化新實例
      this.radarChartInstance = echarts.init(this.radarChartRef.nativeElement);
    }

    const indicators = data.map(d => ({
      name: d.competencyName,
      max: 5
    }));

    const requiredData = data.map(d => d.required);
    const actualData = data.map(d => d.actual);

    // 使用完整配置並設置 notMerge: true 確保完全替換
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item'
      },
      legend: {
        data: ['JD 要求標準', '實際評估分數'],
        bottom: 0,
        textStyle: {
          color: '#6B7280',
          fontSize: 12
        }
      },
      radar: {
        indicator: indicators,
        radius: '65%',
        center: ['50%', '45%'],
        axisName: {
          color: '#464E56',
          fontSize: 12
        },
        splitNumber: 5,
        splitArea: {
          areaStyle: {
            color: ['rgba(214, 162, 140, 0.05)', 'rgba(214, 162, 140, 0.1)']
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(214, 162, 140, 0.3)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(214, 162, 140, 0.2)'
          }
        }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: requiredData,
              name: 'JD 要求標準',
              lineStyle: {
                color: '#94A3B8',
                width: 2
              },
              areaStyle: {
                color: 'rgba(148, 163, 184, 0.2)'
              },
              itemStyle: {
                color: '#94A3B8'
              }
            },
            {
              value: actualData,
              name: '實際評估分數',
              lineStyle: {
                color: '#D6A28C',
                width: 2
              },
              areaStyle: {
                color: 'rgba(214, 162, 140, 0.3)'
              },
              itemStyle: {
                color: '#D6A28C'
              }
            }
          ]
        }
      ]
    };

    // 使用 notMerge: true 確保完全替換配置，避免舊的 indicator 與新的 series 不匹配
    this.radarChartInstance.setOption(option, { notMerge: true });
  }

  // Helper methods
  getSeverityClass(severity: GapSeverity): string {
    return `severity-${severity}`;
  }

  getSeverityLabel(severity: GapSeverity): string {
    const map: Record<GapSeverity, string> = {
      critical: '嚴重落差',
      moderate: '中度落差',
      minor: '輕微落差',
      none: '達標'
    };
    return map[severity];
  }

  getGapPercentage(gap: number, required: number): number {
    if (required === 0) return 0;
    return Math.round((Math.abs(gap) / required) * 100);
  }

  getProgressWidth(actual: number, required: number): number {
    return Math.min((actual / required) * 100, 100);
  }

  getGapIcon(gap: number): string {
    if (gap > 0) return 'ri-arrow-down-line';
    if (gap < 0) return 'ri-arrow-up-line';
    return 'ri-check-line';
  }

  getGapColor(severity: GapSeverity): string {
    const colorMap: Record<GapSeverity, string> = {
      critical: '#C77F7F',
      moderate: '#E3C088',
      minor: '#8DA8BE',
      none: '#7FB095'
    };
    return colorMap[severity];
  }

  hasGaps(): boolean {
    const gaps = this.report()?.gaps || [];
    return gaps.some(g => g.gap > 0);
  }

  getCriticalGaps(): CompetencyGap[] {
    return (this.report()?.gaps || []).filter(g => g.severity === 'critical' || g.severity === 'moderate');
  }

  getAchievedCompetencies(): CompetencyGap[] {
    return (this.report()?.gaps || []).filter(g => g.gap <= 0);
  }
}

