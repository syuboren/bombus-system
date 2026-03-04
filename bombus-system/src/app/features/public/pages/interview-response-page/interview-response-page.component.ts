import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InterviewResponseService } from '../../services/interview-response.service';

@Component({
    selector: 'app-interview-response-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './interview-response-page.component.html',
    styleUrl: './interview-response-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewResponsePageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private responseService = inject(InterviewResponseService);

    // Signals
    loading = signal<boolean>(true);
    submitting = signal<boolean>(false);
    error = signal<string | null>(null);
    success = signal<boolean>(false);
    successMessage = signal<string>('');

    // Invitation data
    token = signal<string>('');
    candidateName = signal<string>('');
    jobTitle = signal<string>('');
    message = signal<string>('');
    proposedSlots = signal<string[]>([]);
    replyDeadline = signal<string>('');

    // User selections
    selectedSlots = signal<Set<string>>(new Set());

    // Reschedule state
    showReschedule = signal<boolean>(false);
    rescheduleNote = signal<string>('');

    ngOnInit(): void {
        const token = this.route.snapshot.paramMap.get('token');
        if (!token) {
            this.error.set('無效的連結');
            this.loading.set(false);
            return;
        }

        this.token.set(token);
        this.loadInvitation(token);
    }

    private loadInvitation(token: string): void {
        this.responseService.getInvitation(token).subscribe({
            next: (data) => {
                this.candidateName.set(data.candidateName);
                this.jobTitle.set(data.jobTitle);
                this.message.set(data.message);
                this.proposedSlots.set(data.proposedSlots || []);
                this.replyDeadline.set(data.replyDeadline);
                this.loading.set(false);
            },
            error: (err) => {
                if (err.status === 410) {
                    this.error.set('此邀約連結已過期');
                } else if (err.status === 400 && err.error?.error === 'Already responded') {
                    this.error.set('您已經回覆過此邀約');
                } else {
                    this.error.set('無法載入邀約資訊，請稍後再試');
                }
                this.loading.set(false);
            }
        });
    }

    toggleSlot(slot: string): void {
        const current = this.selectedSlots();
        const newSet = new Set(current);
        if (newSet.has(slot)) {
            newSet.delete(slot);
        } else {
            newSet.add(slot);
        }
        this.selectedSlots.set(newSet);
    }

    isSelected(slot: string): boolean {
        return this.selectedSlots().has(slot);
    }

    formatSlot(slot: string): string {
        try {
            const date = new Date(slot);
            return date.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return slot;
        }
    }

    confirmResponse(): void {
        if (this.selectedSlots().size === 0) {
            alert('請至少選擇一個可以的時段');
            return;
        }

        this.submitting.set(true);
        const slotsArray = Array.from(this.selectedSlots());

        this.responseService.respond(this.token(), 'accepted', slotsArray).subscribe({
            next: (data) => {
                this.success.set(true);
                this.successMessage.set('感謝您的回覆！我們會盡快與您確認面試時間。');
                this.submitting.set(false);
            },
            error: () => {
                alert('提交失敗，請稍後再試');
                this.submitting.set(false);
            }
        });
    }

    declineInvitation(): void {
        if (!confirm('確定要婉拒此面試邀約嗎？')) {
            return;
        }

        this.submitting.set(true);

        this.responseService.respond(this.token(), 'declined').subscribe({
            next: () => {
                this.success.set(true);
                this.successMessage.set('我們理解您的決定，謝謝您的回覆。祝您一切順利！');
                this.submitting.set(false);
            },
            error: () => {
                alert('提交失敗，請稍後再試');
                this.submitting.set(false);
            }
        });
    }

    toggleReschedule(): void {
        this.showReschedule.set(!this.showReschedule());
    }

    requestReschedule(): void {
        const note = this.rescheduleNote().trim();
        if (!note) {
            alert('請輸入您方便的面試時間');
            return;
        }

        this.submitting.set(true);

        this.responseService.respond(this.token(), 'reschedule', [], note).subscribe({
            next: () => {
                this.success.set(true);
                this.successMessage.set('感謝您的回覆！我們會根據您提供的時間重新安排面試。');
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
}
