import { Component, ChangeDetectionStrategy, input, output, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateDetail } from '../../models/candidate.model';
import { InterviewService } from '../../services/interview.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { inject } from '@angular/core';

@Component({
    selector: 'app-hiring-decision-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './hiring-decision-modal.component.html',
    styleUrl: './hiring-decision-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class HiringDecisionModalComponent {
    candidate = input.required<CandidateDetail>();
    isVisible = input.required<boolean>();
    close = output<void>();
    decided = output<void>();

    private interviewService = inject(InterviewService);
    private notificationService = inject(NotificationService);

    decision = signal<'Offered' | 'Rejected' | null>(null);
    reason = signal<string>('');
    loading = signal<boolean>(false);

    submit() {
        if (!this.decision()) {
            this.notificationService.warning('請選擇決策結果');
            return;
        }

        this.loading.set(true);
        this.interviewService.makeDecision(this.candidate().id, this.decision()!, this.reason())
            .subscribe({
                next: () => {
                    this.notificationService.success(`決策已提交：${this.decision() === 'Offered' ? '錄用' : '婉拒'}`);
                    this.decided.emit();
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
