import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TalentMapService } from '../../services/talent-map.service';
import { NineBoxEmployee, NineBoxFilter, NineBoxCategory, NineBoxCategoryInfo } from '../../models/talent-map.model';
import * as echarts from 'echarts';

@Component({
  selector: 'app-nine-box-tab',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './nine-box-tab.component.html',
  styleUrl: './nine-box-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NineBoxTabComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('distributionChart', { static: false }) distributionChartRef!: ElementRef<HTMLDivElement>;
  @ViewChild('scatterChart', { static: false }) scatterChartRef!: ElementRef<HTMLDivElement>;

  private talentMapService = inject(TalentMapService);
  private cdr = inject(ChangeDetectorRef);
  private distributionChart: echarts.ECharts | null = null;
  private scatterChart: echarts.ECharts | null = null;
  private viewReady = false;
  private resizeHandler = () => {
    this.distributionChart?.resize();
    this.scatterChart?.resize();
  };

  // Options
  readonly departmentOptions = [
    { value: 'all', label: '所有部門' },
    { value: 'rd', label: '研發部' },
    { value: 'hr', label: '人資部' },
    { value: 'sales', label: '業務部' },
    { value: 'marketing', label: '行銷部' }
  ];
  readonly levelOptions = this.talentMapService.levelOptions;
  readonly categories = this.talentMapService.nineBoxCategories;

  // Signals
  filter = signal<NineBoxFilter>({ department: 'all', level: 'all' });
  employees = signal<NineBoxEmployee[]>([]);
  loading = signal(false);
  simulationMode = signal(false);

  // Computed - Group employees by category
  employeesByCategory = computed(() => {
    const emps = this.employees();
    const grouped: Record<NineBoxCategory, NineBoxEmployee[]> = {
      'star': [], 'potential': [], 'develop': [],
      'specialist': [], 'stable': [], 'risk': [],
      'expert': [], 'need-improve': [], 'exit': []
    };
    emps.forEach(e => grouped[e.category].push(e));
    return grouped;
  });

  // Grid order for display (top-left to bottom-right)
  readonly gridOrder: NineBoxCategory[] = [
    'develop', 'potential', 'star',
    'risk', 'stable', 'specialist',
    'exit', 'need-improve', 'expert'
  ];

  ngOnInit(): void {
    window.addEventListener('resize', this.resizeHandler);
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.loadData();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.distributionChart?.dispose();
    this.scatterChart?.dispose();
  }

  loadData(): void {
    this.loading.set(true);
    this.talentMapService.getNineBoxEmployees(this.filter()).subscribe({
      next: (data) => {
        this.employees.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
        
        if (this.viewReady && data.length > 0) {
          setTimeout(() => this.updateCharts(data), 100);
        }
      }
    });
  }

  updateFilter(key: keyof NineBoxFilter, value: string): void {
    this.filter.update(f => ({ ...f, [key]: value }));
    this.loadData();
  }

  toggleSimulationMode(): void {
    this.simulationMode.update(v => !v);
  }

  getCategoryInfo(key: NineBoxCategory): NineBoxCategoryInfo {
    return this.categories.find(c => c.key === key)!;
  }

  getEmployeeCount(category: NineBoxCategory): number {
    return this.employeesByCategory()[category].length;
  }

  exportChart(chartType: 'distribution' | 'scatter'): void {
    const chart = chartType === 'distribution' ? this.distributionChart : this.scatterChart;
    if (chart) {
      const url = chart.getDataURL({ type: 'png', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `${chartType}-chart.png`;
      link.href = url;
      link.click();
    }
  }

  private updateCharts(employees: NineBoxEmployee[]): void {
    this.updateDistributionChart(employees);
    this.updateScatterChart(employees);
  }

  private updateDistributionChart(employees: NineBoxEmployee[]): void {
    if (!this.distributionChartRef?.nativeElement) return;

    if (!this.distributionChart) {
      this.distributionChart = echarts.init(this.distributionChartRef.nativeElement);
    }

    const grouped = this.employeesByCategory();
    const data = this.categories.map(cat => ({
      name: cat.title.replace('⭐ ', ''),
      value: grouped[cat.key].length,
      itemStyle: { color: cat.color }
    })).filter(d => d.value > 0);

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 人 ({d}%)'
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
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        data
      }]
    };

    this.distributionChart.setOption(option);
  }

  private updateScatterChart(employees: NineBoxEmployee[]): void {
    if (!this.scatterChartRef?.nativeElement) return;

    if (!this.scatterChart) {
      this.scatterChart = echarts.init(this.scatterChartRef.nativeElement);
    }

    const data = employees.map(e => {
      const catInfo = this.getCategoryInfo(e.category);
      return {
        name: e.name,
        value: [e.performance, e.potential],
        itemStyle: { color: catInfo.color }
      };
    });

    const option: echarts.EChartsOption = {
      tooltip: {
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number[] };
          return `${p.name}<br/>績效: ${p.value[0]}<br/>潛力: ${p.value[1]}`;
        }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '10%',
        bottom: '15%'
      },
      xAxis: {
        type: 'value',
        name: '績效表現',
        nameLocation: 'middle',
        nameGap: 30,
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280' }
      },
      yAxis: {
        type: 'value',
        name: '發展潛力',
        nameLocation: 'middle',
        nameGap: 40,
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#E8E8EA' } },
        axisLabel: { color: '#6B7280' }
      },
      series: [{
        type: 'scatter',
        symbolSize: 15,
        data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)'
          }
        }
      }],
      // Grid lines for 9-box
      markLine: {
        silent: true,
        lineStyle: { color: '#E8E8EA', type: 'dashed' },
        data: [
          { xAxis: 33 },
          { xAxis: 66 },
          { yAxis: 33 },
          { yAxis: 66 }
        ]
      }
    };

    this.scatterChart.setOption(option);
  }
}

