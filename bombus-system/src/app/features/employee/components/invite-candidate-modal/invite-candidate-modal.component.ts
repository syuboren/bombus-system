import { Component, ChangeDetectionStrategy, input, output, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateDetail } from '../../models/candidate.model';
import { InterviewService } from '../../services/interview.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { inject } from '@angular/core';

@Component({
    selector: 'app-invite-candidate-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './invite-candidate-modal.component.html',
    styleUrl: './invite-candidate-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class InviteCandidateModalComponent {
    candidate = input.required<CandidateDetail>();
    isVisible = input.required<boolean>();
    close = output<void>();
    invited = output<void>();

    private interviewService = inject(InterviewService);
    private notificationService = inject(NotificationService);

    // Form Signals
    message = signal<string>('您好，感謝您投遞履歷。我們對您的經歷印象深刻，希望能邀請您參加面試。請查看以下建議時段並回覆確認。');
    proposedSlots = signal<string[]>(['']);
    loading = signal<boolean>(false);

    tryClose(): void {
        if (this.loading()) return;
        const hasContent = this.proposedSlots().some(s => !!s.trim());
        if (hasContent && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
        this.close.emit();
    }

    addSlot() {
        this.proposedSlots.update(slots => [...slots, '']);
    }

    removeSlot(index: number) {
        this.proposedSlots.update(slots => slots.filter((_, i) => i !== index));
    }

    updateSlot(index: number, value: string) {
        this.proposedSlots.update(slots => {
            const newSlots = [...slots];
            newSlots[index] = value;
            return newSlots;
        });
    }

    submit() {
        if (this.proposedSlots().filter(s => !!s).length === 0) {
            this.notificationService.warning('請至少提供一個建議時段');
            return;
        }

        this.loading.set(true);
        const candidateId = this.candidate().id;
        // Assuming jobId is available on candidate or we need to pass it.
        // In our updated model, candidate has jobId.
        const jobId = this.candidate().jobId || 'UNKNOWN_JOB'; // Fallback

        this.interviewService.inviteCandidate(candidateId, jobId, this.message(), this.proposedSlots())
            .subscribe({
                next: () => {
                    this.notificationService.success('面試邀約已發送');
                    this.invited.emit();
                    this.close.emit();
                    this.loading.set(false);
                },
                error: () => {
                    this.notificationService.error('發送失敗，請稍後再試');
                    this.loading.set(false);
                }
            });
    }
}
