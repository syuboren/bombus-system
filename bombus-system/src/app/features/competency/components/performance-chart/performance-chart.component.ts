import { Component, ChangeDetectionStrategy, input, computed, effect, ElementRef, viewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

// ECharts 類型 (若未安裝則使用 any)
declare const echarts: any;

export interface ChartDataPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-performance-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './performance-chart.component.html',
  styleUrl: './performance-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PerformanceChartComponent implements AfterViewInit, OnDestroy {
  /** 圖表類型 */
  chartType = input<'line' | 'bar' | 'radar'>('line');
  
  /** 圖表標題 */
  title = input<string>('');
  
  /** 月度分數資料 */
  monthlyData = input<ChartDataPoint[]>([]);
  
  /** 季度分數資料 */
  quarterlyData = input<ChartDataPoint[]>([]);
  
  /** 圖表高度 */
  height = input<string>('300px');
  
  /** 顯示圖例 */
  showLegend = input<boolean>(true);
  
  /** 主題色 */
  themeColor = input<string>('#D6A28C');

  private chartContainer = viewChild<ElementRef>('chartContainer');
  private chartInstance: any = null;

  constructor() {
    effect(() => {
      // 監聽資料變化重繪圖表
      const monthly = this.monthlyData();
      const quarterly = this.quarterlyData();
      if (this.chartInstance && (monthly.length > 0 || quarterly.length > 0)) {
        this.updateChart();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initChart();
  }

  ngOnDestroy(): void {
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  }

  private initChart(): void {
    const container = this.chartContainer()?.nativeElement;
    if (!container) return;

    // 檢查 ECharts 是否可用
    if (typeof echarts === 'undefined') {
      console.warn('ECharts 未載入，請確認已安裝 echarts 並在 angular.json 中引入');
      container.innerHTML = '<div class="chart-placeholder">圖表載入中...</div>';
      return;
    }

    this.chartInstance = echarts.init(container);
    this.updateChart();

    // 響應式調整
    window.addEventListener('resize', () => {
      this.chartInstance?.resize();
    });
  }

  private updateChart(): void {
    if (!this.chartInstance) return;

    const type = this.chartType();
    let option: any;

    switch (type) {
      case 'line':
        option = this.getLineChartOption();
        break;
      case 'bar':
        option = this.getBarChartOption();
        break;
      case 'radar':
        option = this.getRadarChartOption();
        break;
      default:
        option = this.getLineChartOption();
    }

    this.chartInstance.setOption(option, true);
  }

  private getLineChartOption(): any {
    const monthly = this.monthlyData();
    const quarterly = this.quarterlyData();
    const color = this.themeColor();

    const series: any[] = [];
    const legendData: string[] = [];

    if (monthly.length > 0) {
      legendData.push('月度分數');
      series.push({
        name: '月度分數',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        data: monthly.map(d => d.value),
        lineStyle: { width: 3, color },
        itemStyle: { color },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}40` },
              { offset: 1, color: `${color}05` }
            ]
          }
        }
      });
    }

    if (quarterly.length > 0) {
      legendData.push('季度分數');
      series.push({
        name: '季度分數',
        type: 'line',
        smooth: true,
        symbol: 'diamond',
        symbolSize: 10,
        data: quarterly.map(d => d.value),
        lineStyle: { width: 3, color: '#8DA399' },
        itemStyle: { color: '#8DA399' }
      });
    }

    const xAxisData = monthly.length > 0 
      ? monthly.map(d => d.label)
      : quarterly.map(d => d.label);

    return {
      title: {
        text: this.title(),
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 600, color: '#2d3748' }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#2d3748' },
        formatter: (params: any) => {
          let result = `<strong>${params[0].axisValue}</strong><br/>`;
          params.forEach((p: any) => {
            result += `${p.marker} ${p.seriesName}: <strong>${p.value?.toFixed(1) || '-'}</strong><br/>`;
          });
          return result;
        }
      },
      legend: {
        show: this.showLegend(),
        data: legendData,
        bottom: 0,
        textStyle: { color: '#718096' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: this.showLegend() ? '15%' : '3%',
        top: this.title() ? '15%' : '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: xAxisData,
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#718096' }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
        axisLabel: { color: '#718096' }
      },
      series
    };
  }

  private getBarChartOption(): any {
    const monthly = this.monthlyData();
    const color = this.themeColor();

    return {
      title: {
        text: this.title(),
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 600, color: '#2d3748' }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        formatter: (params: any) => {
          const p = params[0];
          return `${p.axisValue}<br/>${p.marker} 分數: <strong>${p.value?.toFixed(1)}</strong>`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: this.title() ? '15%' : '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: monthly.map(d => d.label),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#718096' }
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } },
        axisLabel: { color: '#718096' }
      },
      series: [{
        type: 'bar',
        data: monthly.map(d => d.value),
        barWidth: '50%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color },
              { offset: 1, color: `${color}80` }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      }]
    };
  }

  private getRadarChartOption(): any {
    const monthly = this.monthlyData();
    const color = this.themeColor();

    // 只取最近 6 個月
    const recentData = monthly.slice(-6);
    
    return {
      title: {
        text: this.title(),
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 600, color: '#2d3748' }
      },
      tooltip: {
        trigger: 'item'
      },
      radar: {
        indicator: recentData.map(d => ({ name: d.label, max: 100 })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: '#718096', fontSize: 12 },
        splitLine: { lineStyle: { color: '#e2e8f0' } },
        splitArea: { areaStyle: { color: ['#fff', '#f7fafc'] } },
        axisLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: [{
        type: 'radar',
        data: [{
          value: recentData.map(d => d.value),
          name: '績效分數',
          lineStyle: { color, width: 2 },
          areaStyle: { color: `${color}30` },
          itemStyle: { color }
        }]
      }]
    };
  }

  /** 手動刷新圖表 */
  refresh(): void {
    this.updateChart();
    this.chartInstance?.resize();
  }
}
