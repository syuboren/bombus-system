import {
  Component,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  input,
  output,
  signal,
  inject,
  computed
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { JobService } from '../../services/job.service';
import { JobPublication, JobPublicationStatus } from '../../models/job.model';
import { NotificationService } from '../../../../core/services/notification.service';

const PLATFORM_LABELS: Record<string, string> = {
  '104': '104 人力銀行',
  '518': '518 人力銀行',
  '1111': '1111 人力銀行'
};

const STATUS_LABELS: Record<JobPublicationStatus, string> = {
  pending: '等待同步',
  syncing: '同步中',
  synced: '已同步',
  failed: '同步失敗',
  closed: '已關閉'
};

@Component({
  selector: 'app-publication-detail-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './publication-detail-modal.component.html',
  styleUrl: './publication-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PublicationDetailModalComponent {
  private readonly jobService = inject(JobService);
  private readonly notification = inject(NotificationService);

  jobId = input.required<string>();
  publication = input.required<JobPublication>();

  closed = output<void>();
  retried = output<void>();

  retrying = signal(false);

  platformLabel = computed(() => PLATFORM_LABELS[this.publication().platform] || this.publication().platform);
  statusLabel = computed(() => STATUS_LABELS[this.publication().status] || this.publication().status);

  canRetry = computed(() => {
    const s = this.publication().status;
    return s === 'failed' || s === 'pending' || s === 'synced';
  });

  isClosed = computed(() => this.publication().status === 'closed');

  close(): void {
    this.closed.emit();
  }

  retry(): void {
    const pub = this.publication();
    if (!this.canRetry() || this.retrying()) return;
    this.retrying.set(true);
    this.jobService.retryPublication(this.jobId(), pub.platform).subscribe({
      next: (updated) => {
        this.retrying.set(false);
        if (updated.status === 'synced') {
          this.notification.success(`${this.platformLabel()} 同步成功`);
        } else {
          this.notification.warning(`${this.platformLabel()} 仍然失敗：${updated.sync_error || '未知錯誤'}`);
        }
        this.retried.emit();
      },
      error: (err) => {
        this.retrying.set(false);
        const msg = err?.error?.message || err?.message || '重試失敗';
        this.notification.error(`${this.platformLabel()} 重試失敗：${msg}`);
      }
    });
  }
}
