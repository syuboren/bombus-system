import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-time-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-input.component.html',
  styleUrl: './time-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeInputComponent {
  // Inputs
  value = input<number>(0);      // 分鐘數
  label = input<string>('');     // 標籤
  placeholder = input<string>('0');
  disabled = input<boolean>(false);
  showQuickButtons = input<boolean>(true);
  maxMinutes = input<number>(600); // 預設最大 10 小時

  // Outputs
  valueChange = output<number>();

  // 內部值
  internalValue = signal<number>(0);

  // 快捷按鈕配置
  quickButtons = [
    { label: '+15分', value: 15 },
    { label: '+30分', value: 30 },
    { label: '+1時', value: 60 }
  ];

  // 格式化顯示
  formattedTime = computed(() => {
    const minutes = this.value();
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} 分鐘`;
    if (mins === 0) return `${hours} 小時`;
    return `${hours} 小時 ${mins} 分鐘`;
  });

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    let newValue = parseInt(input.value, 10) || 0;
    newValue = Math.max(0, Math.min(newValue, this.maxMinutes()));
    this.valueChange.emit(newValue);
  }

  addTime(minutes: number): void {
    if (this.disabled()) return;
    const currentValue = this.value();
    const newValue = Math.min(currentValue + minutes, this.maxMinutes());
    this.valueChange.emit(newValue);
  }

  resetTime(): void {
    if (this.disabled()) return;
    this.valueChange.emit(0);
  }
}
