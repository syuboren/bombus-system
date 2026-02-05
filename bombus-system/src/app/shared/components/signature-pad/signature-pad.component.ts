import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, Output, EventEmitter, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * 電子簽名元件
 * 用於職能評估系統各階段的線上簽名功能
 */
@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signature-pad.component.html',
  styleUrl: './signature-pad.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignaturePadComponent implements AfterViewInit {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  
  /** 簽名完成事件 */
  @Output() signatureChange = new EventEmitter<string | null>();
  
  /** 標籤文字 */
  @Input() label = '請在此區域簽名';
  
  /** 是否禁用 */
  @Input() disabled = false;
  
  /** 預設簽名圖片（用於顯示已存在的簽名） */
  @Input() set existingSignature(value: string | null) {
    this._existingSignature = value;
    if (value && this.cx) {
      this.loadSignature(value);
    }
  }
  get existingSignature(): string | null {
    return this._existingSignature;
  }
  private _existingSignature: string | null = null;

  private cx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private hasContent = false;

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    this.cx = canvas.getContext('2d')!;
    this.resizeCanvas();

    // Set default styles
    this.cx.lineWidth = 2;
    this.cx.lineCap = 'round';
    this.cx.lineJoin = 'round';
    this.cx.strokeStyle = '#1a1a1a';
    
    // Load existing signature if provided
    if (this._existingSignature) {
      this.loadSignature(this._existingSignature);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.parentElement?.getBoundingClientRect();

    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height || 150;

      // Restore styles after resize
      this.cx.lineWidth = 2;
      this.cx.lineCap = 'round';
      this.cx.lineJoin = 'round';
      this.cx.strokeStyle = '#1a1a1a';
      
      // Reload existing signature after resize
      if (this._existingSignature) {
        this.loadSignature(this._existingSignature);
      }
    }
  }

  private loadSignature(dataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      const canvas = this.canvasRef.nativeElement;
      this.cx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Scale image to fit canvas while maintaining aspect ratio
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9;
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      this.cx.drawImage(img, x, y, img.width * scale, img.height * scale);
      this.hasContent = true;
    };
    img.src = dataUrl;
  }

  // Mouse Events
  onMouseDown(e: MouseEvent): void {
    if (this.disabled) return;
    this.isDrawing = true;
    this.hasContent = true;
    const { offsetX, offsetY } = this.getMousePos(e);
    this.cx.beginPath();
    this.cx.moveTo(offsetX, offsetY);
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDrawing || this.disabled) return;
    const { offsetX, offsetY } = this.getMousePos(e);
    this.cx.lineTo(offsetX, offsetY);
    this.cx.stroke();
  }

  onMouseUp(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.emitSignature();
    }
  }

  onMouseLeave(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.emitSignature();
    }
  }

  private getMousePos(e: MouseEvent): { offsetX: number; offsetY: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    return {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
  }

  // Touch Events
  onTouchStart(e: TouchEvent): void {
    if (this.disabled) return;
    e.preventDefault();
    this.isDrawing = true;
    this.hasContent = true;
    const { offsetX, offsetY } = this.getTouchPos(e);
    this.cx.beginPath();
    this.cx.moveTo(offsetX, offsetY);
  }

  onTouchMove(e: TouchEvent): void {
    if (this.disabled) return;
    e.preventDefault();
    if (!this.isDrawing) return;
    const { offsetX, offsetY } = this.getTouchPos(e);
    this.cx.lineTo(offsetX, offsetY);
    this.cx.stroke();
  }

  onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (this.isDrawing) {
      this.isDrawing = false;
      this.emitSignature();
    }
  }

  private getTouchPos(e: TouchEvent): { offsetX: number; offsetY: number } {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top
    };
  }

  private emitSignature(): void {
    this.signatureChange.emit(this.toDataURL());
  }

  // Public API
  clear(): void {
    if (this.disabled) return;
    const canvas = this.canvasRef.nativeElement;
    this.cx.clearRect(0, 0, canvas.width, canvas.height);
    this.hasContent = false;
    this._existingSignature = null;
    this.signatureChange.emit(null);
  }

  toDataURL(): string | null {
    if (!this.hasContent) return null;
    return this.canvasRef.nativeElement.toDataURL('image/png');
  }

  isEmpty(): boolean {
    return !this.hasContent;
  }
}
