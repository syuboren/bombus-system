import { 
  Directive, 
  ElementRef, 
  Input, 
  OnChanges, 
  SimpleChanges,
  inject,
  AfterViewInit
} from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnChanges, AfterViewInit {
  private el = inject(ElementRef);
  
  @Input('appCountUp') targetValue = 0;
  @Input() duration = 1000; // 動畫持續時間 (ms)
  @Input() delay = 0; // 延遲開始時間 (ms)
  @Input() suffix = ''; // 後綴 (例如 %)
  @Input() prefix = ''; // 前綴
  @Input() decimals = 0; // 小數位數
  @Input() startValue = 0; // 起始值
  @Input() useEasing = true; // 是否使用緩動
  
  private isInitialized = false;
  private animationFrameId: number | null = null;

  ngAfterViewInit(): void {
    this.isInitialized = true;
    this.animateValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targetValue'] && this.isInitialized) {
      this.animateValue();
    }
  }

  private animateValue(): void {
    // 取消之前的動畫
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const start = this.startValue;
    const end = this.targetValue;
    const duration = this.duration;
    const startTime = performance.now() + this.delay;

    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4);
    };

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      
      if (elapsed < 0) {
        // 還在延遲中
        this.el.nativeElement.textContent = this.formatValue(start);
        this.animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = this.useEasing ? easeOutQuart(progress) : progress;
      const currentValue = start + (end - start) * easedProgress;

      this.el.nativeElement.textContent = this.formatValue(currentValue);

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private formatValue(value: number): string {
    const formattedNumber = this.decimals > 0 
      ? value.toFixed(this.decimals) 
      : Math.round(value).toString();
    return `${this.prefix}${formattedNumber}${this.suffix}`;
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

