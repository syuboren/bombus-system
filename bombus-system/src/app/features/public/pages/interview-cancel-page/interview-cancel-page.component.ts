import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InterviewResponseService } from '../../services/interview-response.service';

@Component({
    selector: 'app-interview-cancel-page',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './interview-cancel-page.component.html',
    styleUrl: './interview-cancel-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewCancelPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private responseService = inject(InterviewResponseService);

    // Signals
    loading = signal<boolean>(true);
    submitting = signal<boolean>(false);
    error = signal<string | null>(null);
    success = signal<boolean>(false);

    // Interview data
    token = signal<string>('');
    candidateName = signal<string>('');
    jobTitle = signal<string>('');
    interviewAt = signal<string>('');
    location = signal<string>('');
    meetingLink = signal<string>('');

    // User input
    cancelReason = signal<string>('');

    ngOnInit(): void {
        const token = this.route.snapshot.paramMap.get('token');
        if (!token) {
            this.error.set('無效的連結');
            this.loading.set(false);
            return;
        }

        this.token.set(token);
        this.loadInterview(token);
    }

    private loadInterview(token: string): void {
        this.responseService.getInterviewForCancel(token).subscribe({
            next: (data) => {
                this.candidateName.set(data.candidateName);
                this.jobTitle.set(data.jobTitle);
                this.interviewAt.set(data.interviewAt);
                this.location.set(data.location || '');
                this.meetingLink.set(data.meetingLink || '');
                this.loading.set(false);
            },
            error: (err) => {
                if (err.status === 410) {
                    this.error.set('此面試已經結束');
                } else if (err.status === 400 && err.error?.error === 'Interview already cancelled') {
                    this.error.set('此面試已經取消');
                } else {
                    this.error.set('無法載入面試資訊，請稍後再試');
                }
                this.loading.set(false);
            }
        });
    }

    formatDateTime(dateStr: string): string {
        try {
            const date = new Date(dateStr);
            return date.toLocaleString('zh-TW', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    }

    confirmCancel(): void {
        if (!confirm('確定要取消此面試嗎？')) {
            return;
        }

        this.submitting.set(true);

        this.responseService.cancelInterview(this.token(), this.cancelReason()).subscribe({
            next: () => {
                this.success.set(true);
                this.submitting.set(false);
            },
            error: () => {
                alert('提交失敗，請稍後再試');
                this.submitting.set(false);
            }
        });
    }
}
