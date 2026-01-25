import { Component, ChangeDetectionStrategy, input, output, signal, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateDetail, Interview } from '../../models/candidate.model';
import { InterviewService } from '../../services/interview.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { inject } from '@angular/core';

@Component({
    selector: 'app-interview-scoring-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './interview-scoring-modal.component.html',
    styleUrl: './interview-scoring-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class InterviewScoringModalComponent {
    candidate = input.required<CandidateDetail>();
    interviewId = input<string>(); // Optional, if not provided we might pick the latest pending or error
    isVisible = input.required<boolean>();
    close = output<void>();
    scored = output<void>();

    private interviewService = inject(InterviewService);
    private notificationService = inject(NotificationService);

    // Default Dimensions
    dimensions = signal([
        { name: '專業能力', score: 0, comment: '' },
        { name: '溝通表達', score: 0, comment: '' },
        { name: '團隊合作', score: 0, comment: '' },
        { name: '邏輯思考', score: 0, comment: '' },
        { name: '學習潛力', score: 0, comment: '' }
    ]);

    result = signal<'Pass' | 'Hold' | 'Fail' | null>(null);
    overallComment = signal<string>('');
    loading = signal<boolean>(false);

    // Computed Average
    averageScore = computed(() => {
        const dims = this.dimensions();
        const sum = dims.reduce((acc, curr) => acc + (curr.score || 0), 0);
        return dims.length ? (sum / dims.length).toFixed(1) : '0.0';
    });

    submit() {
        if (!this.result()) {
            this.notificationService.warning('請選擇面試結果');
            return;
        }

        if (this.dimensions().some(d => d.score === 0)) {
            this.notificationService.warning('請為所有評分項目打分');
            return;
        }

        let targetInterviewId = this.interviewId();
        if (!targetInterviewId) {
            // Try to find a pending interview from candidate details
            // Note: candidate() comes from input, make sure it has interviews populated
            const pending = this.candidate().interviews?.find(i => i.result === 'Pending');
            targetInterviewId = pending?.id;
        }

        if (!targetInterviewId) {
            this.notificationService.error('找不到待評分的面試記錄');
            return;
        }

        this.loading.set(true);
        const evaluation = {
            dimensions: this.dimensions(),
            average: this.averageScore(),
            comment: this.overallComment()
        };

        this.interviewService.submitEvaluation(targetInterviewId, {
            evaluationJson: evaluation,
            result: this.result()!,
            remark: this.overallComment()
        }).subscribe({
            next: () => {
                this.notificationService.success('面試評分已提交');
                this.scored.emit();
                this.close.emit();
                this.loading.set(false);
            },
            error: () => {
                this.notificationService.error('提交失敗，請稍後再試');
                this.loading.set(false);
            }
        });
    }
}
