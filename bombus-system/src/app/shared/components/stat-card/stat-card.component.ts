import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export type ModuleType = 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'l6';
export type ChangeType = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [],
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

  getChangeIcon(): string {
    const icons: Record<ChangeType, string> = {
      positive: 'ri-arrow-up-line',
      negative: 'ri-arrow-down-line',
      neutral: 'ri-subtract-line'
    };
    return icons[this.changeType()];
  }
}

