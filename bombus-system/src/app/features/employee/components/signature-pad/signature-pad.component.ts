import { Component, ElementRef, ViewChild, AfterViewInit, HostListener, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-signature-pad',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './signature-pad.component.html',
    styleUrl: './signature-pad.component.scss'
})
export class SignaturePadComponent implements AfterViewInit {
    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
    @Output() endDrawing = new EventEmitter<void>();

    private cx!: CanvasRenderingContext2D;
    private isDrawing = false;
    private hasContent = false;

    ngAfterViewInit(): void {
        const canvas = this.canvasRef.nativeElement;
        this.cx = canvas.getContext('2d')!;
        this.resizeCanvas();

        // Set default styles
        this.cx.lineWidth = 3;
        this.cx.lineCap = 'round';
        this.cx.strokeStyle = '#000000';
    }

    @HostListener('window:resize')
    onResize(): void {
        this.resizeCanvas();
    }

    private resizeCanvas(): void {
        const canvas = this.canvasRef.nativeElement;
        const rect = canvas.parentElement?.getBoundingClientRect();

        if (rect) {
            // Save content if any
            let imageData: ImageData | null = null;
            if (this.hasContent) {
                imageData = this.cx.getImageData(0, 0, canvas.width, canvas.height);
            }

            canvas.width = rect.width;
            canvas.height = rect.height || 200; // Default height

            // Restore styles after resize
            this.cx.lineWidth = 3;
            this.cx.lineCap = 'round';
            this.cx.strokeStyle = '#000000';
        }
    }

    // Mouse Events
    onMouseDown(e: MouseEvent): void {
        this.isDrawing = true;
        this.hasContent = true;
        const { offsetX, offsetY } = this.getMousePos(e);
        this.cx.beginPath();
        this.cx.moveTo(offsetX, offsetY);
    }

    onMouseMove(e: MouseEvent): void {
        if (!this.isDrawing) return;
        const { offsetX, offsetY } = this.getMousePos(e);
        this.cx.lineTo(offsetX, offsetY);
        this.cx.stroke();
    }

    onMouseUp(): void {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.endDrawing.emit();
        }
    }

    onMouseLeave(): void {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.endDrawing.emit();
        }
    }

    private getMousePos(e: MouseEvent): { offsetX: number, offsetY: number } {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        return {
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top
        };
    }

    // Touch Events
    onTouchStart(e: TouchEvent): void {
        e.preventDefault();
        this.isDrawing = true;
        this.hasContent = true;
        const { offsetX, offsetY } = this.getTouchPos(e);
        this.cx.beginPath();
        this.cx.moveTo(offsetX, offsetY);
    }

    onTouchMove(e: TouchEvent): void {
        e.preventDefault(); // Prevent scrolling
        if (!this.isDrawing) return;
        const { offsetX, offsetY } = this.getTouchPos(e);
        this.cx.lineTo(offsetX, offsetY);
        this.cx.stroke();
    }

    onTouchEnd(e: TouchEvent): void {
        e.preventDefault();
        if (this.isDrawing) {
            this.isDrawing = false;
            this.endDrawing.emit();
        }
    }

    private getTouchPos(e: TouchEvent): { offsetX: number, offsetY: number } {
        const rect = this.canvasRef.nativeElement.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            offsetX: touch.clientX - rect.left,
            offsetY: touch.clientY - rect.top
        };
    }

    // Public API
    clear(): void {
        const canvas = this.canvasRef.nativeElement;
        this.cx.clearRect(0, 0, canvas.width, canvas.height);
        this.hasContent = false;
    }

    toDataURL(): string | null {
        if (!this.hasContent) return null;
        return this.canvasRef.nativeElement.toDataURL('image/png');
    }

    isEmpty(): boolean {
        return !this.hasContent;
    }
}
