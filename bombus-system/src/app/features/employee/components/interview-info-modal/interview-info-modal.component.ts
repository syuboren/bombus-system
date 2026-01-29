import { Component, ChangeDetectionStrategy, input, output, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobCandidate } from '../../models/job.model';
import { NotificationService } from '../../../../core/services/notification.service';
import { InterviewService } from '../../services/interview.service';
import { InterviewQrcodeModalComponent } from '../interview-qrcode-modal/interview-qrcode-modal.component';
import { FormStatusResponse } from '../../models/candidate.model';

@Component({
  selector: 'app-interview-info-modal',
  standalone: true,
  imports: [CommonModule, InterviewQrcodeModalComponent],
  templateUrl: './interview-info-modal.component.html',
  styleUrl: './interview-info-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewInfoModalComponent implements OnChanges {
  // Inputs
  candidate = input.required<JobCandidate>();
  isVisible = input.required<boolean>();

  // Outputs
  close = output<void>();

  // Services
  private notificationService = inject(NotificationService);
  private interviewService = inject(InterviewService);

  // Form Status State
  formStatus = signal<FormStatusResponse | null>(null);
  loadingFormStatus = signal<boolean>(false);
  showQrCodeModal = signal<boolean>(false);

  ngOnChanges(changes: SimpleChanges): void {
    // 當 Modal 顯示且有面試資訊時，載入表單狀態
    if (this.isVisible() && this.candidate()?.interviewId) {
      this.loadFormStatus();
    }
  }

  /**
   * 載入表單狀態
   */
  loadFormStatus(): void {
    const interviewId = this.candidate()?.interviewId;
    if (!interviewId) return;

    this.loadingFormStatus.set(true);
    this.interviewService.getFormStatus(interviewId).subscribe({
      next: (status) => {
        this.formStatus.set(status);
        this.loadingFormStatus.set(false);
      },
      error: () => {
        this.formStatus.set({ hasForm: false });
        this.loadingFormStatus.set(false);
      }
    });
  }

  /**
   * 顯示 QR Code Modal
   */
  showQrCode(): void {
    this.showQrCodeModal.set(true);
  }

  /**
   * 關閉 QR Code Modal
   */
  onQrCodeModalClose(): void {
    this.showQrCodeModal.set(false);
    // 重新載入表單狀態
    this.loadFormStatus();
  }

  /**
   * 取得表單狀態標籤
   */
  getFormStatusLabel(status: string | undefined): string {
    if (!status) return '未產生';
    const labels: Record<string, string> = {
      'Pending': '待填寫',
      'InProgress': '填寫中',
      'Submitted': '已送出',
      'Locked': '已鎖定'
    };
    return labels[status] || status;
  }

  /**
   * 取得表單狀態顏色
   */
  getFormStatusColor(status: string | undefined): string {
    if (!status) return 'gray';
    const colors: Record<string, string> = {
      'Pending': 'yellow',
      'InProgress': 'blue',
      'Submitted': 'green',
      'Locked': 'red'
    };
    return colors[status] || 'gray';
  }

  getInitial(name: string): string {
    return name?.charAt(0) || '';
  }

  formatInterviewTime(dateTime: string | undefined): string {
    if (!dateTime) return '待確認';
    
    try {
      const date = new Date(dateTime);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      // Get day of week
      const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
      const weekDay = weekDays[date.getDay()];
      
      return `${year}/${month}/${day} (${weekDay}) ${hours}:${minutes}`;
    } catch {
      return dateTime;
    }
  }

  getInterviewLocationLabel(location: string | undefined): string {
    if (!location) return '待確認';
    
    const labels: Record<string, string> = {
      'onsite': '現場面試',
      'online': '線上面試'
    };
    return labels[location] || location;
  }

  copyInterviewCancelLink(): void {
    const c = this.candidate();
    if (!c.interviewCancelToken) {
      this.notificationService.warning('此候選人尚無面試取消連結');
      return;
    }

    const cancelLink = `/public/interview-cancel/${c.interviewCancelToken}`;
    const fullLink = `${window.location.origin}${cancelLink}`;
    
    navigator.clipboard.writeText(fullLink).then(() => {
      this.notificationService.success('取消面試連結已複製到剪貼簿');
    }).catch(() => {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = fullLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.notificationService.success('取消面試連結已複製到剪貼簿');
    });
  }
}
