import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats-card.component.html',
  styleUrl: './stats-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsCardComponent {
  /** 圖示 class (Remix Icon) */
  icon = input<string>('ri-file-list-3-line');
  
  /** 數值 */
  value = input<number | string>(0);
  
  /** 標籤 */
  label = input<string>('');
  
  /** 顏色主題 */
  color = input<'primary' | 'success' | 'warning' | 'danger' | 'info'>('primary');
  
  /** 是否顯示進度條 */
  showProgress = input<boolean>(false);
  
  /** 進度值 (0-100) */
  progressValue = input<number>(0);
  
  /** 自訂顏色 (覆蓋 color 主題) */
  customColor = input<string>('');
  
  /** 計算圖示樣式 */
  iconStyle = computed(() => {
    const colorMap: Record<string, string> = {
      primary: '#D6A28C',
      success: '#8DA399',
      warning: '#D6A28C',
      danger: '#C75B5B',
      info: '#7F9CA0'
    };
    const bgColor = this.customColor() || colorMap[this.color()] || colorMap['primary'];
    return {
      'background-color': `rgba(${this.hexToRgb(bgColor)}, 0.1)`,
      'color': bgColor
    };
  });
  
  /** 計算進度條樣式 */
  progressStyle = computed(() => {
    const colorMap: Record<string, string> = {
      primary: '#D6A28C',
      success: '#8DA399',
      warning: '#D6A28C',
      danger: '#C75B5B',
      info: '#7F9CA0'
    };
    return {
      'background-color': this.customColor() || colorMap[this.color()] || colorMap['primary'],
      'width': `${this.progressValue()}%`
    };
  });
  
  /** Hex 轉 RGB */
  private hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '214, 162, 140';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
}
