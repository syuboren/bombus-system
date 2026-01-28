import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { InterviewResponseService } from '../../services/interview-response.service';

@Component({
    selector: 'app-offer-response-page',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './offer-response-page.component.html',
    styleUrl: './offer-response-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OfferResponsePageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private responseService = inject(InterviewResponseService);

    // Signals
    loading = signal<boolean>(true);
    submitting = signal<boolean>(false);
    error = signal<string | null>(null);
    success = signal<boolean>(false);
    successMessage = signal<string>('');

    // Offer data
    token = signal<string>('');
    candidateName = signal<string>('');
    jobTitle = signal<string>('');
    reason = signal<string>('');
    replyDeadline = signal<string>('');
    decidedAt = signal<string>('');

    ngOnInit(): void {
        const token = this.route.snapshot.paramMap.get('token');
        if (!token) {
            this.error.set('無效的連結');
            this.loading.set(false);
            return;
        }

        this.token.set(token);
        this.loadOffer(token);
    }

    private loadOffer(token: string): void {
        this.responseService.getOffer(token).subscribe({
            next: (data) => {
                this.candidateName.set(data.candidateName);
                this.jobTitle.set(data.jobTitle);
                this.reason.set(data.reason || '');
                this.replyDeadline.set(data.replyDeadline);
                this.decidedAt.set(data.decidedAt);
                this.loading.set(false);
            },
            error: (err) => {
                if (err.status === 410) {
                    this.error.set('此錄用通知連結已過期');
                } else if (err.status === 400 && err.error?.error === 'Already responded') {
                    const response = err.error?.response;
                    if (response === 'accepted') {
                        this.error.set('您已接受此錄用通知');
                    } else {
                        this.error.set('您已回覆過此錄用通知');
                    }
                } else {
                    this.error.set('無法載入錄用通知資訊，請稍後再試');
                }
                this.loading.set(false);
            }
        });
    }

    acceptOffer(): void {
        if (!confirm('確定要接受此錄用通知嗎？')) {
            return;
        }

        this.submitting.set(true);

        this.responseService.respondToOffer(this.token(), 'accepted').subscribe({
            next: (data) => {
                this.success.set(true);
                this.successMessage.set(data.message || '恭喜您！感謝您接受我們的錄用通知，HR 將會盡快與您聯繫後續入職事宜。');
                this.submitting.set(false);
            },
            error: () => {
                alert('提交失敗，請稍後再試');
                this.submitting.set(false);
            }
        });
    }

    declineOffer(): void {
        if (!confirm('確定要婉拒此錄用通知嗎？此操作無法撤銷。')) {
            return;
        }

        this.submitting.set(true);

        this.responseService.respondToOffer(this.token(), 'declined').subscribe({
            next: (data) => {
                this.success.set(true);
                this.successMessage.set(data.message || '感謝您的回覆，我們尊重您的決定。祝您未來一切順利！');
                this.submitting.set(false);
            },
            error: () => {
                alert('提交失敗，請稍後再試');
                this.submitting.set(false);
            }
        });
    }

    getRemainingDays(): number {
        const deadline = new Date(this.replyDeadline());
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    formatDate(dateStr: string): string {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }
}
