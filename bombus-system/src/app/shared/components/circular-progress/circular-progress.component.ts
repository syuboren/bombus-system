import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-circular-progress',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="circular-progress" [style.--size]="size + 'px'" [style.--stroke-width]="strokeWidth + 'px'">
      <svg [attr.viewBox]="'0 0 ' + size + ' ' + size">
        <!-- 背景圓環 -->
        <circle 
          class="progress-bg"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          [style.stroke-width]="strokeWidth"
        />
        <!-- 進度圓環 -->
        <circle 
          class="progress-ring"
          [attr.cx]="center"
          [attr.cy]="center"
          [attr.r]="radius"
          [style.stroke-width]="strokeWidth"
          [style.stroke-dasharray]="circumference"
          [style.stroke-dashoffset]="dashOffset()"
          [style.stroke]="progressColor"
        />
      </svg>
      <div class="progress-content">
        <span class="progress-value" [style.font-size]="valueFontSize + 'px'">
          {{ animatedValue() }}
        </span>
        @if (showLabel) {
          <span class="progress-label">{{ label }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    .circular-progress {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--size);
      height: var(--size);
    }

    svg {
      position: absolute;
      top: 0;
      left: 0;
      transform: rotate(-90deg);
    }

    circle {
      fill: none;
      transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .progress-bg {
      stroke: rgba(0, 0, 0, 0.08);
    }

    .progress-ring {
      stroke-linecap: round;
    }

    .progress-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1;
    }

    .progress-value {
      font-weight: 700;
      color: #1e293b;
      line-height: 1;
    }

    .progress-label {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CircularProgressComponent implements OnChanges {
  @Input() value = 0;
  @Input() maxValue = 100;
  @Input() size = 60;
  @Input() strokeWidth = 6;
  @Input() progressColor = '#3b82f6';
  @Input() label = '';
  @Input() showLabel = false;
  @Input() animationDuration = 800;
  @Input() suffix = '';

  animatedValue = signal(0);
  dashOffset = signal(0);

  private animationFrameId: number | null = null;

  get center(): number {
    return this.size / 2;
  }

  get radius(): number {
    return (this.size - this.strokeWidth) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get valueFontSize(): number {
    return Math.max(12, this.size / 4);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.animateProgress();
    }
  }

  private animateProgress(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const startValue = this.animatedValue();
    const endValue = this.value;
    const startOffset = this.dashOffset();
    const endOffset = this.circumference * (1 - this.value / this.maxValue);
    const duration = this.animationDuration;
    const startTime = performance.now();

    const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      const currentOffset = startOffset + (endOffset - startOffset) * easedProgress;

      this.animatedValue.set(Math.round(currentValue));
      this.dashOffset.set(currentOffset);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    // 初始化 dashOffset
    if (startOffset === 0 && startValue === 0) {
      this.dashOffset.set(this.circumference);
    }

    this.animationFrameId = requestAnimationFrame(animate);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

