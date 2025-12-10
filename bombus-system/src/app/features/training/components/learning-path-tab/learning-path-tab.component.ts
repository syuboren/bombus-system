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
import { LearningProgress, Course, PathStep, TimelineItem, SkillTreeNode } from '../../models/talent-map.model';
import * as echarts from 'echarts';

@Component({
  selector: 'app-learning-path-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './learning-path-tab.component.html',
  styleUrl: './learning-path-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningPathTabComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('timelineChart', { static: false }) timelineChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('skillTreeChart', { static: false }) skillTreeChartRef!: ElementRef<HTMLDivElement>;

  private talentMapService = inject(TalentMapService);
  private cdr = inject(ChangeDetectorRef);
  private timelineChart: echarts.ECharts | null = null;
  private skillTreeChart: echarts.ECharts | null = null;
  private viewReady = false;
  private resizeHandler = () => {
    this.timelineChart?.resize();
    this.skillTreeChart?.resize();
  };

  // View Level Options
  readonly viewLevelOptions = [
    { value: 'org', label: '組織層級' },
    { value: 'dept', label: '部門層級' },
    { value: 'individual', label: '個人層級' }
  ];

  readonly employeeOptions = [
    { value: '', label: '請選擇員工...' },
    { value: 'e001', label: '王小明 (前端工程師)' },
    { value: 'e002', label: '李小華 (業務專員)' },
    { value: 'e003', label: '張大同 (行銷專員)' }
  ];

  // Signals
  viewLevel = signal<string>('org');
  selectedEmployee = signal<string>('');
  progressData = signal<LearningProgress[]>([]);
  courses = signal<Course[]>([]);
  pathSteps = signal<PathStep[]>([]);
  timelineData = signal<TimelineItem[]>([]);
  skillTreeData = signal<SkillTreeNode | null>(null);
  loading = signal(false);

  ngOnInit(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadData();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.timelineChart?.dispose();
    this.skillTreeChart?.dispose();
  }

  loadData(): void {
    this.loading.set(true);

    this.talentMapService.getLearningProgress().subscribe(data => {
      this.progressData.set(data);
      this.cdr.detectChanges();
    });

    this.talentMapService.getCourses().subscribe(data => {
      this.courses.set(data);
      this.cdr.detectChanges();
    });

    this.talentMapService.getTimelineData().subscribe(data => {
      this.timelineData.set(data);
      this.cdr.detectChanges();
      if (this.viewReady && data.length > 0) {
        setTimeout(() => this.updateTimelineChart(data), 100);
      }
    });

    this.talentMapService.getSkillTreeData().subscribe(data => {
      this.skillTreeData.set(data);
      this.loading.set(false);
      this.cdr.detectChanges();
      if (this.viewReady && data) {
        setTimeout(() => this.updateSkillTreeChart(data), 100);
      }
    });
  }

  switchViewLevel(level: string): void {
    this.viewLevel.set(level);
    if (level === 'individual' && this.selectedEmployee()) {
      this.loadIndividualPath();
    }
  }

  selectEmployee(employeeId: string): void {
    this.selectedEmployee.set(employeeId);
    if (employeeId) {
      this.loadIndividualPath();
    }
  }

  private loadIndividualPath(): void {
    const empId = this.selectedEmployee();
    if (!empId) return;

    this.talentMapService.getPathSteps(empId).subscribe(data => {
      this.pathSteps.set(data);
    });
  }

  getCourseLevelClass(level: string): string {
    return `course-badge--${level}`;
  }

  exportChart(chartType: 'timeline' | 'skillTree'): void {
    const chart = chartType === 'timeline' ? this.timelineChart : this.skillTreeChart;
    if (chart) {
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${chartType}-chart.png`;
      link.href = url;
      link.click();
    }
  }

  private updateTimelineChart(data: TimelineItem[]): void {
    if (!this.timelineChartRef?.nativeElement) return;

    if (!this.timelineChart) {
      this.timelineChart = echarts.init(this.timelineChartRef.nativeElement);
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['課程數', '培訓時數', '完成率'],
        bottom: 0,
        textStyle: { color: '#6B7280' }
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
        data: data.map(d => d.month),
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: [
        {
          type: 'value',
          name: '數量/時數',
          axisLine: { lineStyle: { color: '#E8E8EA' } },
          axisLabel: { color: '#6B7280' },
          splitLine: { lineStyle: { color: '#F5F5F7' } }
        },
        {
          type: 'value',
          name: '完成率 %',
          max: 100,
          axisLine: { lineStyle: { color: '#E8E8EA' } },
          axisLabel: { color: '#6B7280' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: '課程數',
          type: 'bar',
          data: data.map(d => d.courses),
          itemStyle: { color: '#8DA399' }
        },
        {
          name: '培訓時數',
          type: 'bar',
          data: data.map(d => d.hours),
          itemStyle: { color: '#7F9CA0' }
        },
        {
          name: '完成率',
          type: 'line',
          yAxisIndex: 1,
          data: data.map(d => d.completion),
          itemStyle: { color: '#C9A88C' },
          lineStyle: { width: 3 },
          smooth: true
        }
      ]
    };

    this.timelineChart.setOption(option);
  }

  private updateSkillTreeChart(data: SkillTreeNode): void {
    if (!this.skillTreeChartRef?.nativeElement) return;

    if (!this.skillTreeChart) {
      this.skillTreeChart = echarts.init(this.skillTreeChartRef.nativeElement);
    }

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; value?: number };
          return p.value ? `${p.name}: ${p.value}%` : p.name;
        }
      },
      series: [{
        type: 'tree',
        data: [data],
        top: '5%',
        left: '15%',
        bottom: '5%',
        right: '15%',
        symbolSize: 12,
        orient: 'TB',
        label: {
          position: 'bottom',
          verticalAlign: 'middle',
          fontSize: 12,
          color: '#4B5563'
        },
        leaves: {
          label: {
            position: 'bottom',
            verticalAlign: 'middle'
          }
        },
        expandAndCollapse: true,
        animationDuration: 550,
        animationDurationUpdate: 750,
        lineStyle: {
          color: '#8DA399',
          width: 2
        },
        itemStyle: {
          color: '#7F9CA0',
          borderColor: '#7F9CA0'
        }
      }]
    };

    this.skillTreeChart.setOption(option);
  }
}
