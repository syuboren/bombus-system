import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective, provideEcharts } from 'ngx-echarts';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ProjectService } from '../../services/project.service';
import {
  ForecastProject,
  ForecastStageDefinition,
  ForecastSummary,
  ForecastStage
} from '../../models/project.model';

@Component({
  selector: 'app-forecast-tracking-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective, HeaderComponent],
  templateUrl: './forecast-tracking-page.component.html',
  styleUrl: './forecast-tracking-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideEcharts()]
})
export class ForecastTrackingPageComponent implements OnInit {
  private projectService = inject(ProjectService);

  // State signals
  loading = signal(true);
  projects = signal<ForecastProject[]>([]);
  stageDefinitions = signal<ForecastStageDefinition[]>([]);
  summary = signal<ForecastSummary | null>(null);
  selectedProject = signal<ForecastProject | null>(null);
  showDetailModal = signal(false);
  viewMode = signal<'table' | 'gantt'>('table');
  filterStatus = signal<string>('all');
  searchTerm = signal('');

  // Computed signals
  filteredProjects = computed(() => {
    let result = this.projects();
    const status = this.filterStatus();
    const search = this.searchTerm().toLowerCase();

    if (status !== 'all') {
      result = result.filter(p => p.forecastStatus === status);
    }

    if (search) {
      result = result.filter(p =>
        p.projectName.toLowerCase().includes(search) ||
        p.clientName.toLowerCase().includes(search) ||
        p.projectManager.toLowerCase().includes(search)
      );
    }

    return result;
  });

  // Stage distribution chart options
  stageChartOptions = computed(() => {
    const summary = this.summary();
    if (!summary) return {};

    const data = summary.byStage
      .filter(s => s.count > 0)
      .map(s => {
        const def = this.stageDefinitions().find(d => d.stage === s.stage);
        return {
          name: def ? `${s.stage}% ${def.name}` : `${s.stage}%`,
          value: s.count
        };
      });

    return {
      tooltip: {
        trigger: 'item' as const,
        formatter: '{b}: {c} 個專案 ({d}%)'
      },
      legend: {
        orient: 'vertical' as const,
        right: 20,
        top: 'center' as const,
        textStyle: { color: '#64748B', fontSize: 12 }
      },
      series: [{
        type: 'pie' as const,
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold' as const
          }
        },
        data: data.map((d, i) => ({
          ...d,
          itemStyle: { color: this.getStageColor(i) }
        }))
      }]
    };
  });

  // Budget by stage chart
  budgetChartOptions = computed(() => {
    const summary = this.summary();
    if (!summary) return {};

    const stages = summary.byStage.filter(s => s.budget > 0);
    const categories = stages.map(s => `${s.stage}%`);
    const values = stages.map(s => s.budget / 10000);

    return {
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          const p = params[0];
          return `${p.name}<br/>預算：${p.value.toFixed(0)} 萬`;
        }
      },
      grid: { left: 60, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category' as const,
        data: categories,
        axisLabel: { color: '#64748B', fontSize: 11 },
        axisLine: { lineStyle: { color: '#E2E8F0' } }
      },
      yAxis: {
        type: 'value' as const,
        name: '萬元',
        nameTextStyle: { color: '#64748B', fontSize: 11 },
        axisLabel: { color: '#64748B', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' as const } }
      },
      series: [{
        type: 'bar' as const,
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: this.getStageColor(i), borderRadius: [4, 4, 0, 0] as [number, number, number, number] }
        })),
        barWidth: '60%'
      }]
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);

    this.projectService.getForecastStageDefinitions().subscribe(defs => {
      this.stageDefinitions.set(defs);
    });

    this.projectService.getForecastProjects().subscribe(projects => {
      this.projects.set(projects);
    });

    this.projectService.getForecastSummary().subscribe(summary => {
      this.summary.set(summary);
      this.loading.set(false);
    });
  }

  getStageColor(index: number): string {
    const colors = [
      '#9A8C98', '#C4A4A1', '#D6A28C', '#E3C088',
      '#8DA399', '#7F9CA0', '#64748B', '#7FB095',
      '#B87D7B', '#A89F91'
    ];
    return colors[index % colors.length];
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'on-track': return 'status--success';
      case 'at-risk': return 'status--warning';
      case 'delayed': return 'status--danger';
      case 'completed': return 'status--info';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'on-track': return '正常';
      case 'at-risk': return '有風險';
      case 'delayed': return '延遲';
      case 'completed': return '已完成';
      default: return status;
    }
  }

  getStageName(stage: ForecastStage): string {
    const def = this.stageDefinitions().find(d => d.stage === stage);
    return def ? def.name : `${stage}%`;
  }

  getStageProgress(stage: ForecastStage): number {
    return stage;
  }

  formatBudget(amount: number): string {
    if (amount >= 10000000) {
      return (amount / 10000000).toFixed(1) + ' 千萬';
    }
    return (amount / 10000).toFixed(0) + ' 萬';
  }

  openDetail(project: ForecastProject): void {
    this.selectedProject.set(project);
    this.showDetailModal.set(true);
  }

  closeDetail(): void {
    this.showDetailModal.set(false);
    this.selectedProject.set(null);
  }

  setViewMode(mode: 'table' | 'gantt'): void {
    this.viewMode.set(mode);
  }

  setFilterStatus(status: string): void {
    this.filterStatus.set(status);
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  // Gantt chart helper
  getGanttBarStyle(project: ForecastProject): { [key: string]: string } {
    const width = project.currentStage;
    let bgColor = '#7FB095';
    if (project.forecastStatus === 'at-risk') bgColor = '#E3C088';
    if (project.forecastStatus === 'delayed') bgColor = '#C77F7F';

    return {
      'width': `${width}%`,
      'background-color': bgColor
    };
  }

  getGanttStageMarkers(): number[] {
    return [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  }
}

