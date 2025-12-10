import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  effect,
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { InterviewService } from '../../services/interview.service';
import { Candidate, CandidateDetail } from '../../models/candidate.model';
import * as echarts from 'echarts';

@Component({
  selector: 'app-recruitment-page',
  standalone: true,
  imports: [FormsModule, HeaderComponent],
  templateUrl: './recruitment-page.component.html',
  styleUrl: './recruitment-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecruitmentPageComponent implements OnInit, OnDestroy {
  @ViewChild('emotionChart') emotionChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLDivElement>;

  private interviewService = inject(InterviewService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  private emotionChart: echarts.ECharts | null = null;
  private radarChart: echarts.ECharts | null = null;
  private resizeHandler = () => {
    this.emotionChart?.resize();
    this.radarChart?.resize();
  };

  // Signals
  candidates = signal<Candidate[]>([]);
  searchQuery = signal<string>('');
  selectedCandidate = signal<CandidateDetail | null>(null);
  loading = signal<boolean>(false);

  // Computed
  filteredCandidates = computed(() => {
    const query = this.searchQuery().toLowerCase();
    return this.candidates().filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.position.toLowerCase().includes(query)
    );
  });

  hireRecommendation = computed(() => {
    const candidate = this.selectedCandidate();
    if (!candidate) return null;
    return this.interviewService.getHireRecommendation(candidate.aiScores.overall);
  });

  // Positive keywords for highlighting
  private positiveKeywords = ['團隊協作', '溝通', '學習能力', '合作', '熱情', '專注', '成功'];
  private negativeKeywords = ['壓力', '焦慮', '困難', '問題', '衝突'];

  constructor() {
    // Effect to update charts when candidate changes
    effect(() => {
      const candidate = this.selectedCandidate();
      if (candidate) {
        // Wait for DOM to be ready after @if renders the chart containers
        setTimeout(() => {
          this.initAndUpdateCharts(candidate);
        }, 50);
      }
    });
  }

  ngOnInit(): void {
    this.loadCandidates();
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.emotionChart?.dispose();
    this.radarChart?.dispose();
  }

  loadCandidates(): void {
    this.loading.set(true);
    this.interviewService.getCandidates().subscribe({
      next: (candidates) => {
        this.candidates.set(candidates);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('載入候選人列表失敗');
        this.loading.set(false);
      }
    });
  }

  selectCandidate(candidate: Candidate): void {
    if (candidate.status === 'pending') {
      this.notificationService.warning('此候選人尚未完成面試');
      return;
    }

    this.loading.set(true);
    this.interviewService.getCandidateDetail(candidate.id).subscribe({
      next: (detail) => {
        this.selectedCandidate.set(detail);
        this.loading.set(false);
        this.cdr.detectChanges(); // Force change detection to render the @if block
      },
      error: () => {
        this.notificationService.error('載入候選人詳情失敗');
        this.loading.set(false);
      }
    });
  }

  highlightKeywords(text: string): string {
    let result = text;

    this.positiveKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      result = result.replace(regex, `<span class="keyword-positive">${keyword}</span>`);
    });

    this.negativeKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      result = result.replace(regex, `<span class="keyword-negative">${keyword}</span>`);
    });

    return result;
  }

  exportReport(): void {
    this.notificationService.success('評估報告已匯出');
  }

  private initAndUpdateCharts(candidate: CandidateDetail): void {
    // Initialize emotion chart if not already initialized
    if (!this.emotionChart && this.emotionChartRef?.nativeElement) {
      this.emotionChart = echarts.init(this.emotionChartRef.nativeElement);
    }

    // Initialize radar chart if not already initialized
    if (!this.radarChart && this.radarChartRef?.nativeElement) {
      this.radarChart = echarts.init(this.radarChartRef.nativeElement);
    }

    // Update charts
    this.updateEmotionChart(candidate);
    this.updateRadarChart(candidate);
  }

  private updateEmotionChart(candidate: CandidateDetail): void {
    if (!this.emotionChart) return;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['自信度', '焦慮度', '熱情度'],
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: candidate.emotions.map(e => `${e.time} 分鐘`),
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280' },
        splitLine: { lineStyle: { color: '#F5F5F7' } }
      },
      series: [
        {
          name: '自信度',
          type: 'line',
          smooth: true,
          data: candidate.emotions.map(e => e.confidence),
          lineStyle: { color: '#8DA399' },
          itemStyle: { color: '#8DA399' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(141, 163, 153, 0.3)' },
              { offset: 1, color: 'rgba(141, 163, 153, 0.05)' }
            ])
          }
        },
        {
          name: '焦慮度',
          type: 'line',
          smooth: true,
          data: candidate.emotions.map(e => e.anxiety),
          lineStyle: { color: '#C77F7F' },
          itemStyle: { color: '#C77F7F' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(199, 127, 127, 0.3)' },
              { offset: 1, color: 'rgba(199, 127, 127, 0.05)' }
            ])
          }
        },
        {
          name: '熱情度',
          type: 'line',
          smooth: true,
          data: candidate.emotions.map(e => e.enthusiasm),
          lineStyle: { color: '#7F9CA0' },
          itemStyle: { color: '#7F9CA0' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(127, 156, 160, 0.3)' },
              { offset: 1, color: 'rgba(127, 156, 160, 0.05)' }
            ])
          }
        }
      ]
    };

    this.emotionChart.setOption(option);
  }

  private updateRadarChart(candidate: CandidateDetail): void {
    if (!this.radarChart) return;

    const option: echarts.EChartsOption = {
      tooltip: {},
      radar: {
        indicator: candidate.skills.map(s => ({
          name: s.name,
          max: 100
        })),
        radius: '65%',
        axisName: {
          color: '#6B7280',
          fontSize: 12
        },
        splitArea: {
          areaStyle: {
            color: ['#FCFCFD', '#F5F5F7']
          }
        },
        splitLine: {
          lineStyle: {
            color: '#E8E8EA'
          }
        },
        axisLine: {
          lineStyle: {
            color: '#E8E8EA'
          }
        }
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: candidate.skills.map(s => s.score),
              name: candidate.name,
              areaStyle: {
                color: 'rgba(141, 163, 153, 0.4)'
              },
              lineStyle: {
                color: '#8DA399'
              },
              itemStyle: {
                color: '#8DA399'
              }
            }
          ]
        }
      ]
    };

    this.radarChart.setOption(option);
  }
}
