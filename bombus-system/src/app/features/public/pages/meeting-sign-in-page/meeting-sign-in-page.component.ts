import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface MeetingInfo {
  id: string;
  title: string;
  startTime: Date;
  location: string;
}

@Component({
  standalone: true,
  selector: 'app-meeting-sign-in-page',
  templateUrl: './meeting-sign-in-page.component.html',
  styleUrl: './meeting-sign-in-page.component.scss',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeetingSignInPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  meetingId = signal<string>('');
  meeting = signal<MeetingInfo | null>(null);
  employeeName = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  signedInTime = signal<string>('');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('meetingId');
    if (id) {
      this.meetingId.set(id);
      this.loadMeetingInfo(id);
    }
  }

  private loadMeetingInfo(meetingId: string): void {
    this.http.get<any>(`/api/meetings/${meetingId}`).subscribe({
      next: (data) => {
        this.meeting.set({
          id: data.id,
          title: data.title,
          startTime: new Date(data.start_time),
          location: data.location
        });
      },
      error: () => {
        this.error.set('找不到會議資訊');
      }
    });
  }

  updateName(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.employeeName.set(input.value);
  }

  signIn(): void {
    const name = this.employeeName().trim();
    if (!name) {
      this.error.set('請輸入您的姓名');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.http.post<{ success: boolean; signedInTime: string }>(`/api/meetings/${this.meetingId()}/check-in`, {
      name: name
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(true);
        this.signedInTime.set(new Date(res.signedInTime).toLocaleTimeString('zh-TW'));
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.error.set('您不在此會議的出席名單中');
        } else {
          this.error.set('簽到失敗，請稍後再試');
        }
      }
    });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('zh-TW', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
