import { Component, ChangeDetectionStrategy, input, output, signal, computed, inject } from '@angular/core';
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
  candidate = input.required<JobCandidate>();
  isVisible = input.required<boolean>();
  jobId = input.required<string>();

  close = output<void>();
  scheduled = output<void>();

  private interviewService = inject(InterviewService);
  private notificationService = inject(NotificationService);

  interviewDate = signal<string>('');
  interviewHour = signal<string>('10');
  interviewMinute = signal<string>('00');
  interviewTime = computed(() => `${this.interviewHour()}:${this.interviewMinute()}`);
  interviewType = signal<string>('onsite');
  meetingLink = signal<string>('');
  interviewAddress = signal<string>('');
  loading = signal<boolean>(false);

  readonly hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  readonly minuteOptions = ['00', '15', '30', '45'];

  hasInterviewer = computed(() => !!this.candidate()?.invitationInterviewerId);

  canSubmit = computed(() => {
    if (this.loading()) return false;
    if (!this.hasInterviewer()) return false;
    if (!this.interviewDate()) return false;
    return true;
  });

  tryClose(): void {
    if (this.loading()) return;
    if (this.interviewDate() && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
    this.resetForm();
    this.close.emit();
  }

  getInitial(name: string): string {
    return name?.charAt(0) || '';
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  selectSlot(slot: string): void {
    if (!slot) return;

    if (slot.includes('T')) {
      const [datePart, timePart] = slot.split('T');
      this.interviewDate.set(datePart);
      if (timePart) {
        this.setTimeFromHHMM(timePart.substring(0, 5));
      }
      return;
    }

    const parts = slot.split(' ');
    if (parts.length >= 1) {
      const dateStr = parts[0].replace(/\//g, '-');
      if (!isNaN(Date.parse(dateStr))) {
        this.interviewDate.set(dateStr);
      }
    }

    const timePart = parts.find(p => p.includes('上午') || p.includes('下午') || p.includes('中午') || p.includes(':'));
    if (timePart) {
      let hours = 0;
      let minutes = 0;
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
      }
      if (timePart.includes('下午') && hours < 12) hours += 12;
      else if (timePart.includes('上午') && hours === 12) hours = 0;
      const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      this.setTimeFromHHMM(formatted);
    }
  }

  /** 把 HH:MM 拆進 hour/minute 兩個 signal，minute 向下對齊到 15 分鐘 */
  private setTimeFromHHMM(hhmm: string): void {
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (Number.isFinite(h)) this.interviewHour.set(String(h).padStart(2, '0'));
    if (Number.isFinite(m)) {
      const aligned = Math.floor(m / 15) * 15;
      this.interviewMinute.set(String(aligned).padStart(2, '0'));
    }
  }

  submit(): void {
    const c = this.candidate();
    if (!c || !this.interviewDate()) {
      this.notificationService.error('請選擇面試日期');
      return;
    }
    if (!c.invitationInterviewerId) {
      this.notificationService.error('邀約尚未指派面試官，請先重發邀約');
      return;
    }

    const interviewAtStr = `${this.interviewDate()}T${this.interviewTime()}:00`;
    this.loading.set(true);

    // D-07: 送出前最終衝突驗證
    this.interviewService.checkConflicts(c.invitationInterviewerId, [interviewAtStr], { candidateId: c.id })
      .subscribe({
        next: res => {
          if (!res.allClear) {
            this.loading.set(false);
            const reasons = res.slots[0]?.conflicts?.map(x => x.reason).join('；') || '時段衝突';
            this.notificationService.error(`該時段衝突：${reasons}`);
            return;
          }
          this.doSchedule(c, interviewAtStr);
        },
        error: () => {
          this.loading.set(false);
          this.notificationService.error('無法確認時段可用性，請稍後再試');
        }
      });
  }

  private doSchedule(c: JobCandidate, interviewAtStr: string): void {
    this.interviewService.scheduleInterview({
      candidateId: c.id,
      jobId: this.jobId(),
      interviewerId: c.invitationInterviewerId!,
      interviewAt: interviewAtStr,
      location: this.interviewType(),
      meetingLink: this.interviewType() === 'online' ? this.meetingLink() : undefined,
      address: this.interviewType() === 'onsite' ? this.interviewAddress() : undefined,
      round: 1
    }).subscribe({
      next: (response) => {
        this.notificationService.success(`已安排面試，時間：${this.interviewDate()} ${this.interviewTime()}`);
        if (response.interviewId) {
          this.interviewService.generateFormToken(response.interviewId).subscribe({ error: () => {} });
        }
        this.loading.set(false);
        this.resetForm();
        this.scheduled.emit();
        this.close.emit();
      },
      error: (err) => {
        if (err?.status === 409) {
          const conflicts = err?.error?.conflicts || [];
          const reasons = conflicts.map((x: any) => x.reason).join('；') || '該時段與其他行程衝突';
          this.notificationService.error(`無法安排：${reasons}`);
        } else if (err?.status === 400 && err?.error?.error === 'SLOT_NOT_ALIGNED') {
          this.notificationService.error('面試時間需以 15 分鐘為單位');
        } else {
          this.notificationService.error('安排面試失敗');
        }
        this.loading.set(false);
      }
    });
  }

  private resetForm(): void {
    this.interviewDate.set('');
    this.interviewHour.set('10');
    this.interviewMinute.set('00');
    this.interviewType.set('onsite');
    this.meetingLink.set('');
    this.interviewAddress.set('');
  }
}
