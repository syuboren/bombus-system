import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CountUpDirective } from '../../directives/count-up.directive';

export type ModuleType = 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'l6';
export type ChangeType = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CountUpDirective],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  icon = input.required<string>();
  label = input.required<string>();
  value = input.required<string | number>();
  changeText = input<string>('');
  changeType = input<ChangeType>('neutral');
  moduleType = input<ModuleType>('l1');
  animateValue = input<boolean>(true); // 是否啟用數字動畫
  animationDelay = input<number>(0); // 動畫延遲 (ms)

  // 判斷值是否為數字
  isNumericValue = computed(() => {
    const val = this.value();
    return typeof val === 'number' || !isNaN(Number(val));
  });

  // 取得數字值
  numericValue = computed(() => {
    const val = this.value();
    return typeof val === 'number' ? val : Number(val) || 0;
  });

  getChangeIcon(): string {
    const icons: Record<ChangeType, string> = {
      positive: 'ri-arrow-up-line',
      negative: 'ri-arrow-down-line',
      neutral: 'ri-subtract-line'
    };
    return icons[this.changeType()];
  }
}

