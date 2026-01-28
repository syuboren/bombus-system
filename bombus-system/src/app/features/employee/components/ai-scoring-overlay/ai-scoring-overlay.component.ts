import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-ai-scoring-overlay',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ai-scoring-overlay.component.html',
    styleUrls: ['./ai-scoring-overlay.component.scss']
})
export class AiScoringOverlayComponent {
    @Input() message: string = 'Processing...';
    @Input() progress: number = -1;
}
