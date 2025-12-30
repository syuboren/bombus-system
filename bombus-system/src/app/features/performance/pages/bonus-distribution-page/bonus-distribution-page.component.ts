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
  BonusSettings,
  BonusTier,
  DepartmentBonus,
  PersonalBonus,
  BonusSummary
} from '../../models/performance.model';
import * as echarts from 'echarts';

type ViewMode = 'department' | 'personal';

@Component({
  standalone: true,
  selector: 'app-bonus-distribution-page',
  templateUrl: './bonus-distribution-page.component.html',
  styleUrl: './bonus-distribution-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BonusDistributionPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bonusDistributionChart') bonusDistributionChartRef!: ElementRef;
  @ViewChild('tierChart') tierChartRef!: ElementRef;

  private performanceService = inject(PerformanceService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Charts
  private bonusDistributionChart: echarts.ECharts | null = null;
  private tierChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.resizeCharts();

  // Period
  readonly periodOptions = this.performanceService.periodOptions;
  selectedPeriod = signal<CalculationPeriod>('month');

  // View mode
  viewMode = signal<ViewMode>('department');
  selectedDepartment = signal<string | null>(null);

  // Data
  loading = signal(true);
  bonusSummary = signal<BonusSummary | null>(null);
  bonusSettings = signal<BonusSettings | null>(null);
  departmentBonuses = signal<DepartmentBonus[]>([]);
  personalBonuses = signal<PersonalBonus[]>([]);

  // Settings editor
  showSettingsModal = signal(false);
  editingTiers = signal<BonusTier[]>([]);

  // Computed
  totalBonusPool = computed(() => {
    return this.departmentBonuses().reduce((sum, d) => sum + d.bonusPool, 0);
  });

  sortedDepartments = computed(() => {
    return [...this.departmentBonuses()].sort((a, b) => b.bonusPool - a.bonusPool);
  });

  sortedPersonal = computed(() => {
    return [...this.personalBonuses()].sort((a, b) => b.totalBonus - a.totalBonus);
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
    this.bonusDistributionChart?.dispose();
    this.tierChart?.dispose();
  }

  onPeriodChange(period: CalculationPeriod): void {
    this.selectedPeriod.set(period);
    this.loadData();
  }

  switchViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
    if (mode === 'department') {
      this.selectedDepartment.set(null);
      this.personalBonuses.set([]);
    }
  }

  selectDepartment(deptId: string): void {
    this.selectedDepartment.set(deptId);
    this.viewMode.set('personal');
    this.loadPersonalBonus(deptId);
  }

  private loadData(): void {
    this.loading.set(true);
    const period = this.selectedPeriod();

    this.performanceService.getBonusSummary(period).subscribe({
      next: (data) => {
        this.bonusSummary.set(data);
        this.cdr.detectChanges();
      }
    });

    this.performanceService.getBonusSettings().subscribe({
      next: (data) => {
        this.bonusSettings.set(data);
        this.editingTiers.set([...data.bonusTiers]);
        this.cdr.detectChanges();
        setTimeout(() => this.updateTierChart(), 100);
      }
    });

    this.performanceService.calculateDepartmentBonus(period).subscribe({
      next: (data) => {
        this.departmentBonuses.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.updateBonusDistributionChart(), 100);
      }
    });
  }

  private loadPersonalBonus(departmentId: string): void {
    this.loading.set(true);
    this.performanceService.calculatePersonalBonus(departmentId).subscribe({
      next: (data) => {
        this.personalBonuses.set(data);
        this.loading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  private initCharts(): void {
    if (this.bonusDistributionChartRef?.nativeElement) {
      this.bonusDistributionChart = echarts.init(this.bonusDistributionChartRef.nativeElement);
    }
    if (this.tierChartRef?.nativeElement) {
      this.tierChart = echarts.init(this.tierChartRef.nativeElement);
    }
    this.updateBonusDistributionChart();
    this.updateTierChart();
  }

  private updateBonusDistributionChart(): void {
    if (!this.bonusDistributionChart) return;

    const data = this.sortedDepartments();
    if (data.length === 0) return;

    const colors = ['#B87D7B', '#9A8C98', '#7F9CA0', '#8DA399'];

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const dept = data[params.dataIndex];
          return `<div style="font-weight: bold; margin-bottom: 4px;">${dept.departmentName}</div>
            <div>獎金池: ${dept.bonusPool.toFixed(2)} 萬</div>
            <div>部門獎金: ${dept.departmentBonus.toFixed(2)} 萬</div>
            <div>個人獎金池: ${dept.personalBonusPool.toFixed(2)} 萬</div>
            <div>人數: ${dept.employeeCount} 人</div>
            <div>人均獎金: ${dept.avgBonusPerPerson.toFixed(2)} 萬</div>`;
        }
      },
      series: [{
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 3
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 12,
          color: '#464E56'
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.2)'
          },
          label: {
            show: true,
            fontWeight: 'bold'
          }
        },
        data: data.map((d, i) => ({
          name: d.departmentName,
          value: d.bonusPool,
          itemStyle: { color: colors[i % colors.length] }
        }))
      }]
    };

    this.bonusDistributionChart.setOption(option);

    // 點擊事件
    this.bonusDistributionChart.off('click');
    this.bonusDistributionChart.on('click', (params: any) => {
      const dept = data[params.dataIndex];
      if (dept) {
        this.selectDepartment(dept.departmentId);
      }
    });
  }

  private updateTierChart(): void {
    if (!this.tierChart) return;

    const settings = this.bonusSettings();
    if (!settings) return;

    const tiers = settings.bonusTiers;

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const tier = tiers[params[0].dataIndex];
          return `達成率 ${tier.minAchievement}% - ${tier.maxAchievement === 999 ? '∞' : tier.maxAchievement + '%'}<br/>
                  提撥比例: <strong>${tier.bonusRatio}%</strong>`;
        }
      },
      grid: {
        left: '3%',
        right: '8%',
        bottom: '10%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: tiers.map(t => `${t.minAchievement}%+`),
        axisLabel: { color: '#6B7280', fontSize: 11 },
        axisLine: { lineStyle: { color: '#E2E4E8' } }
      },
      yAxis: {
        type: 'value',
        name: '提撥比例 (%)',
        axisLabel: { color: '#6B7280', fontSize: 10, formatter: '{value}%' },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#F5F5F7' } }
      },
      series: [{
        type: 'bar',
        barWidth: '50%',
        data: tiers.map((t, i) => ({
          value: t.bonusRatio,
          itemStyle: {
            color: this.getTierColor(t.bonusRatio),
            borderRadius: [6, 6, 0, 0]
          }
        })),
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          color: '#464E56',
          fontWeight: 'bold'
        }
      }]
    };

    this.tierChart.setOption(option);
  }

  getTierColor(ratio: number): string {
    if (ratio >= 15) return '#7FB095';
    if (ratio >= 10) return '#8DA399';
    if (ratio >= 5) return '#9A8C98';
    return '#D6A28C';
  }

  private resizeCharts(): void {
    this.bonusDistributionChart?.resize();
    this.tierChart?.resize();
  }

  // Settings Modal
  openSettingsModal(): void {
    const settings = this.bonusSettings();
    if (settings) {
      this.editingTiers.set([...settings.bonusTiers]);
    }
    this.showSettingsModal.set(true);
  }

  closeSettingsModal(): void {
    this.showSettingsModal.set(false);
  }

  updateTierValue(index: number, field: 'minAchievement' | 'maxAchievement' | 'bonusRatio', value: number): void {
    this.editingTiers.update(tiers => {
      const updated = [...tiers];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  saveSettings(): void {
    const settings = this.bonusSettings();
    if (!settings) return;

    const updatedSettings: BonusSettings = {
      ...settings,
      bonusTiers: this.editingTiers()
    };

    this.performanceService.updateBonusSettings(updatedSettings).subscribe({
      next: (saved) => {
        this.bonusSettings.set(saved);
        this.showSettingsModal.set(false);
        this.cdr.detectChanges();
        setTimeout(() => this.updateTierChart(), 100);
      }
    });
  }

  navigateBack(): void {
    if (this.viewMode() === 'personal') {
      this.viewMode.set('department');
      this.selectedDepartment.set(null);
      this.personalBonuses.set([]);
    } else {
      this.router.navigate(['/performance/profit-dashboard']);
    }
  }

  // Utility methods
  formatCurrency(value: number): string {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(2)}億`;
    }
    return `${value.toFixed(2)}萬`;
  }

  getAchievementClass(achievement: number): string {
    if (achievement >= 110) return 'achievement--excellent';
    if (achievement >= 100) return 'achievement--good';
    if (achievement >= 90) return 'achievement--normal';
    return 'achievement--low';
  }

  getBonusRatioLabel(ratio: number): string {
    if (ratio >= 20) return '特優';
    if (ratio >= 15) return '優良';
    if (ratio >= 10) return '達標';
    if (ratio >= 5) return '基本';
    return '無獎金';
  }

  getContributionLevel(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    return 'C';
  }

  getContributionClass(score: number): string {
    if (score >= 90) return 'level--excellent';
    if (score >= 80) return 'level--good';
    if (score >= 70) return 'level--normal';
    return 'level--low';
  }

  getDepartmentName(deptId: string): string {
    const dept = this.departmentBonuses().find(d => d.departmentId === deptId);
    return dept?.departmentName || deptId;
  }

  exportReport(): void {
    // 實際應用中會產出 PDF/Excel 報表
    console.log('Export bonus report...');
  }
}

