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
  ChangeDetectorRef,
  HostListener
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TalentMapService } from '../../services/talent-map.service';
import { HeatmapCell, HeatmapStats, HeatmapFilter } from '../../models/talent-map.model';
import * as echarts from 'echarts';

interface HeatmapDetail {
  competency: string;
  department: string;
  score: number;
  level: { label: string; color: string };
  requiredScore: number;
  gap: number;
  rank: string;
  courses: { name: string; improvement: number }[];
}

@Component({
  selector: 'app-heatmap-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './heatmap-tab.component.html',
  styleUrl: './heatmap-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeatmapTabComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heatmapChart', { static: false }) heatmapChartRef!: ElementRef<HTMLDivElement>;

  private talentMapService = inject(TalentMapService);
  private cdr = inject(ChangeDetectorRef);
  private heatmapChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.heatmapChart?.resize();
  private viewReady = false;

  // Course database for recommendations
  private readonly courseDatabase: Record<string, { name: string; improvement: number }[]> = {
    '溝通協調': [
      { name: '高效溝通技巧實戰班', improvement: 8 },
      { name: '跨部門協作工作坊', improvement: 6 },
      { name: '衝突管理與談判技巧', improvement: 7 }
    ],
    '團隊合作': [
      { name: '團隊建設與協作工作坊', improvement: 9 },
      { name: '跨職能團隊合作技巧', improvement: 7 },
      { name: '虛擬團隊管理實務', improvement: 8 }
    ],
    '問題解決': [
      { name: '邏輯思維與問題分析', improvement: 10 },
      { name: '系統思考方法論', improvement: 8 },
      { name: '創意問題解決工作坊', improvement: 9 }
    ],
    '創新思維': [
      { name: '設計思考實務課程', improvement: 11 },
      { name: '創新管理與變革領導', improvement: 9 },
      { name: 'TRIZ 創新方法論', improvement: 10 }
    ],
    '學習能力': [
      { name: '高效學習方法論', improvement: 8 },
      { name: '知識管理與應用', improvement: 7 },
      { name: '自主學習能力培養', improvement: 9 }
    ],
    '專業技術': [
      { name: 'Python 進階開發課程', improvement: 12 },
      { name: '系統架構設計實務', improvement: 10 },
      { name: '敏捷開發方法論', improvement: 8 }
    ],
    '數據分析': [
      { name: 'Excel 進階分析技巧', improvement: 7 },
      { name: 'Power BI 數據視覺化', improvement: 9 },
      { name: 'SQL 資料庫查詢優化', improvement: 8 }
    ],
    '專案管理': [
      { name: 'PMP 專案管理認證課程', improvement: 12 },
      { name: '敏捷專案管理實務', improvement: 10 },
      { name: '專案風險管理工作坊', improvement: 8 }
    ],
    '流程優化': [
      { name: '精實管理實務課程', improvement: 9 },
      { name: '流程改善方法論', improvement: 8 },
      { name: '自動化流程設計', improvement: 10 }
    ],
    '品質管理': [
      { name: '六標準差綠帶認證', improvement: 11 },
      { name: '品質管理系統實務', improvement: 9 },
      { name: 'SPC 統計製程管制', improvement: 8 }
    ],
    '領導統御': [
      { name: '中階主管領導力培訓', improvement: 10 },
      { name: '團隊激勵與輔導技巧', improvement: 8 },
      { name: '變革管理實務工作坊', improvement: 9 }
    ],
    '決策能力': [
      { name: '策略思維與決策分析', improvement: 10 },
      { name: '風險評估與決策模型', improvement: 9 },
      { name: '數據驅動決策實務', improvement: 11 }
    ],
    '目標管理': [
      { name: 'OKR 目標管理實戰班', improvement: 9 },
      { name: 'KPI 設計與績效管理', improvement: 8 },
      { name: '目標達成追蹤技巧', improvement: 7 }
    ],
    '資源配置': [
      { name: '資源規劃與配置策略', improvement: 8 },
      { name: '預算管理與成本控制', improvement: 9 },
      { name: '人力資源最佳化', improvement: 10 }
    ],
    '績效管理': [
      { name: '績效評估與回饋技巧', improvement: 9 },
      { name: '績效改善計畫設計', improvement: 8 },
      { name: '持續績效管理實務', improvement: 10 }
    ]
  };

  // Options
  readonly departmentOptions = this.talentMapService.departmentOptions;
  readonly competencyTypeOptions = this.talentMapService.competencyTypeOptions;
  readonly viewLevelOptions = this.talentMapService.viewLevelOptions;

  // Signals
  filter = signal<HeatmapFilter>({
    viewLevel: 'org',
    department: 'all',
    competencyType: 'all'
  });

  heatmapData = signal<HeatmapCell[]>([]);
  stats = signal<HeatmapStats>({ avgScore: 0, excellentCount: 0, needTrainingCount: 0 });
  loading = signal(false);

  // Modal state
  showDetailModal = signal(false);
  selectedDetail = signal<HeatmapDetail | null>(null);

  // ESC key listener
  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showDetailModal()) {
      this.closeDetailModal();
    }
  }

  ngOnInit(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadData();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.heatmapChart?.dispose();
  }

  loadData(): void {
    this.loading.set(true);
    this.talentMapService.getHeatmapData(this.filter()).subscribe({
      next: (data) => {
        this.heatmapData.set(data);
        this.stats.set(this.talentMapService.getHeatmapStats(data));
        this.loading.set(false);
        this.cdr.detectChanges();

        // Update chart after data loaded
        if (this.viewReady && data.length > 0) {
          setTimeout(() => this.updateChart(data), 100);
        }
      }
    });
  }

  updateFilter(key: keyof HeatmapFilter, value: string): void {
    this.filter.update(f => ({ ...f, [key]: value }));
    this.loadData();
  }

  exportChart(): void {
    if (this.heatmapChart) {
      const url = this.heatmapChart.getDataURL({ type: 'png', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'heatmap-chart.png';
      link.href = url;
      link.click();
    }
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDetail.set(null);
    this.cdr.detectChanges();
  }

  assignTraining(): void {
    console.log('Assigning training for:', this.selectedDetail());
    this.closeDetailModal();
    // TODO: Navigate to training assignment module
  }

  viewHistory(): void {
    console.log('Viewing history for:', this.selectedDetail());
    // TODO: Navigate to history view
  }

  private getScoreLevel(score: number): { label: string; color: string } {
    if (score >= 90) {
      return { label: '職能優秀', color: '#2d5f3e' };
    } else if (score >= 70) {
      return { label: '職能達標', color: '#7FB095' };
    } else if (score >= 50) {
      return { label: '接近標準', color: '#E3C088' };
    } else {
      return { label: '需重點培育', color: '#C77F7F' };
    }
  }

  private getRecommendedCourses(competency: string, score: number): { name: string; improvement: number }[] {
    const courses = this.courseDatabase[competency] || [
      { name: `${competency}基礎培訓課程`, improvement: 8 },
      { name: `${competency}進階實戰班`, improvement: 10 },
      { name: `${competency}專家認證課程`, improvement: 12 }
    ];

    // Return more courses for lower scores
    if (score < 50) {
      return courses;
    } else if (score < 70) {
      return courses.slice(0, 2);
    } else {
      return courses.slice(0, 1);
    }
  }

  private showCellDetail(competency: string, department: string, score: number): void {
    const level = this.getScoreLevel(score);
    const requiredScore = 70;
    const gap = score - requiredScore;
    const rank = Math.floor(Math.random() * 5) + 1;
    const courses = this.getRecommendedCourses(competency, score);

    const detail: HeatmapDetail = {
      competency,
      department,
      score,
      level,
      requiredScore,
      gap,
      rank: `第 ${rank} 名 / 8`,
      courses
    };

    this.selectedDetail.set(detail);
    this.showDetailModal.set(true);
    this.cdr.detectChanges();
  }

  private updateChart(data: HeatmapCell[]): void {
    if (!this.heatmapChartRef?.nativeElement) return;

    if (!this.heatmapChart) {
      this.heatmapChart = echarts.init(this.heatmapChartRef.nativeElement);
    }

    const departments = [...new Set(data.map(d => d.department))];
    const competencies = [...new Set(data.map(d => d.competency))];

    // 數據格式：[x索引, y索引, 分數]
    const chartData = data.map(d => [
      competencies.indexOf(d.competency),  // X軸是職能
      departments.indexOf(d.department),    // Y軸是部門
      d.score
    ]);

    const self = this;

    const option: echarts.EChartsOption = {
      tooltip: {
        position: 'top',
        formatter: (params: unknown) => {
          const p = params as { value: number[] };
          const competency = competencies[p.value[0]];
          const dept = departments[p.value[1]];
          const score = p.value[2];
          const level = self.getScoreLevel(score);

          return `
            <div style="padding: 10px;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">
                ${dept} - ${competency}
              </div>
              <div style="color: #718096; font-size: 13px;">
                職能分數：<strong style="color: ${level.color};">${score} 分</strong><br/>
                狀態：<strong style="color: ${level.color};">${level.label}</strong>
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #a0aec0;">
                點擊查看詳細資訊
              </div>
            </div>
          `;
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#E2E4E8',
        borderWidth: 1,
        extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;'
      },
      grid: {
        top: '5%',
        left: '5%',
        right: '15%',
        bottom: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: competencies,
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(250,250,250,0.1)', 'rgba(245,245,247,0.3)']
          }
        },
        axisLabel: {
          rotate: 45,
          interval: 0,
          fontSize: 12,
          color: '#464E56',
          fontWeight: 500
        },
        axisLine: {
          lineStyle: {
            color: '#E2E4E8'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: departments,
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(250,250,250,0.1)', 'rgba(245,245,247,0.3)']
          }
        },
        axisLabel: {
          fontSize: 12,
          color: '#464E56',
          fontWeight: 500
        },
        axisLine: {
          lineStyle: {
            color: '#E2E4E8'
          }
        }
      },
      visualMap: {
        min: 0,
        max: 100,
        calculable: true,
        orient: 'vertical',
        right: 10,
        bottom: 'center',
        inRange: {
          color: [
            '#C77F7F',  // 紅色 <50
            '#E3C088',  // 黃色 50-69
            '#7FB095',  // 淺綠 70-89
            '#2d5f3e'   // 深綠 90-100
          ]
        },
        text: ['高分', '低分'],
        textStyle: {
          color: '#464E56',
          fontSize: 12
        }
      },
      series: [{
        name: '職能分數',
        type: 'heatmap',
        data: chartData,
        label: {
          show: true,
          fontSize: 11,
          color: '#fff',
          fontWeight: 'bold',
          formatter: (params: unknown) => {
            const p = params as { value: number[] };
            return String(p.value[2]);
          }
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
            borderColor: '#fff',
            borderWidth: 2
          }
        },
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 4
        }
      }]
    };

    this.heatmapChart.setOption(option, true);

    // Bind click event
    this.heatmapChart.off('click');
    this.heatmapChart.on('click', (params) => {
      if (params.componentType === 'series' && Array.isArray(params.value)) {
        const value = params.value as number[];
        const competency = competencies[value[0]];
        const dept = departments[value[1]];
        const score = value[2];
        this.showCellDetail(competency, dept, score);
      }
    });
  }
}
