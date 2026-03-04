import { Component, ChangeDetectionStrategy, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobCandidate } from '../../models/job.model';
import { InterviewService } from '../../services/interview.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-schedule-interview-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-interview-modal.component.html',
  styleUrl: './schedule-interview-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduleInterviewModalComponent {
  // Inputs
  candidate = input.required<JobCandidate>();
  isVisible = input.required<boolean>();
  jobId = input.required<string>();

  // Outputs
  close = output<void>();
  scheduled = output<void>();

  // Services
  private interviewService = inject(InterviewService);
  private notificationService = inject(NotificationService);

  // Form Signals
  interviewDate = signal<string>('');
  interviewTime = signal<string>('10:00');
  interviewType = signal<string>('onsite');
  meetingLink = signal<string>('');
  interviewAddress = signal<string>('');
  selectedInterviewer = signal<string>('');
  loading = signal<boolean>(false);

  // 面試官選項
  readonly interviewerOptions = [
    { id: 'INT-001', name: '張經理', department: '人資部', title: '人資經理' },
    { id: 'INT-002', name: '李主管', department: '研發部', title: '技術主管' },
    { id: 'INT-003', name: '王總監', department: '產品部', title: '產品總監' },
    { id: 'INT-004', name: '陳協理', department: '業務部', title: '業務協理' }
  ];

  getInitial(name: string): string {
    return name?.charAt(0) || '';
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  selectSlot(slot: string): void {
    if (!slot) return;

    // Handle ISO format (e.g. 2026-01-25T17:09)
    if (slot.includes('T')) {
      const [datePart, timePart] = slot.split('T');
      this.interviewDate.set(datePart);
      if (timePart) {
        this.interviewTime.set(timePart.substring(0, 5));
      }
      return;
    }

    const parts = slot.split(' ');
    if (parts.length >= 1) {
      let dateStr = parts[0].replace(/\//g, '-');
      if (!isNaN(Date.parse(dateStr))) {
        this.interviewDate.set(dateStr);
      }
    }

    let timePart = parts.find(p => p.includes('上午') || p.includes('下午') || p.includes('中午') || p.includes(':'));
    if (timePart) {
      let hours = 0;
      let minutes = 0;
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
      }
      if (timePart.includes('下午') && hours < 12) {
        hours += 12;
      } else if (timePart.includes('上午') && hours === 12) {
        hours = 0;
      }
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      if (formattedTime) {
        this.interviewTime.set(formattedTime);
      }
    }
  }

  submit(): void {
    const c = this.candidate();
    if (!c || !this.interviewDate()) {
      this.notificationService.error('請選擇面試日期');
      return;
    }

    this.loading.set(true);
    const interviewAtStr = `${this.interviewDate()}T${this.interviewTime()}:00`;

    this.interviewService.scheduleInterview({
      candidateId: c.id,
      jobId: this.jobId(),
      interviewerId: this.selectedInterviewer(),
      interviewAt: interviewAtStr,
      location: this.interviewType(),
      meetingLink: this.interviewType() === 'online' ? this.meetingLink() : undefined,
      address: this.interviewType() === 'onsite' ? this.interviewAddress() : undefined,
      round: 1
    }).subscribe({
      next: (response) => {
        this.notificationService.success(
          `已安排面試，時間：${this.interviewDate()} ${this.interviewTime()}`
        );
        
        // 背景產生面試表單 Token（不阻塞 UI，不顯示 Modal）
        if (response.interviewId) {
          this.interviewService.generateFormToken(response.interviewId).subscribe({
            error: () => {
              // Token 產生失敗不影響排程結果，靜默處理
            }
          });
        }
        
        // 直接關閉視窗
        this.loading.set(false);
        this.resetForm();
        this.scheduled.emit();
        this.close.emit();
      },
      error: () => {
        this.notificationService.error('安排面試失敗');
        this.loading.set(false);
      }
    });
  }

  private resetForm(): void {
    this.interviewDate.set('');
    this.interviewTime.set('10:00');
    this.interviewType.set('onsite');
    this.meetingLink.set('');
    this.interviewAddress.set('');
    this.selectedInterviewer.set('');
  }
}
