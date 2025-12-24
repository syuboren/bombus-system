import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { MeetingService } from '../../services/meeting.service';
import {
  Meeting,
  MeetingAttendee,
  MeetingStats,
  DepartmentMeetingStats,
  PersonalMeetingLoad,
  MeetingEfficiency,
  CalendarEvent,
  MeetingConclusion,
  MeetingType,
  MeetingRecurrence,
  AgendaItem,
  MEETING_TYPE_OPTIONS,
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS
} from '../../models/meeting.model';

type ViewMode = 'calendar' | 'list' | 'tracking' | 'stats';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

@Component({
  selector: 'app-meeting-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent
  ],
  templateUrl: './meeting-page.component.html',
  styleUrl: './meeting-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeetingPageComponent implements OnInit {
  private meetingService = inject(MeetingService);
  private cdr = inject(ChangeDetectorRef);

  // 視圖模式
  viewMode = signal<ViewMode>('calendar');

  // 資料
  meetings = signal<Meeting[]>([]);
  calendarEvents = signal<CalendarEvent[]>([]);
  attendees = signal<MeetingAttendee[]>([]);
  stats = signal<MeetingStats | null>(null);
  departmentStats = signal<DepartmentMeetingStats[]>([]);
  personalLoads = signal<PersonalMeetingLoad[]>([]);
  efficiency = signal<MeetingEfficiency | null>(null);
  pendingConclusions = signal<MeetingConclusion[]>([]);

  // 日曆狀態
  currentDate = signal<Date>(new Date());
  calendarDays = signal<CalendarDay[]>([]);

  // Modal 狀態
  showAddMeetingModal = signal(false);
  showMeetingDetailModal = signal(false);
  showAgendaModal = signal(false);
  selectedMeeting = signal<Meeting | null>(null);

  // 新增會議表單
  newMeeting = signal<Partial<Meeting>>({
    title: '',
    type: 'regular',
    location: '',
    isOnline: false,
    startTime: new Date(),
    endTime: new Date(),
    recurrence: 'none',
    reminders: [
      { id: '1', timing: '1day', enabled: true },
      { id: '2', timing: '1hour', enabled: false },
      { id: '3', timing: '15min', enabled: false }
    ],
    attendees: [],
    agenda: [],
    attachments: []
  });

  // 新增議程項目
  newAgendaItem = signal<Partial<AgendaItem>>({
    title: '',
    description: '',
    presenter: '',
    duration: 15
  });

  // 選項
  readonly meetingTypeOptions = MEETING_TYPE_OPTIONS;
  readonly recurrenceOptions = RECURRENCE_OPTIONS;
  readonly reminderOptions = REMINDER_OPTIONS;

  // 計算屬性
  currentMonthLabel = computed(() => {
    const date = this.currentDate();
    return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
  });

  upcomingMeetings = computed(() => {
    const now = new Date();
    return this.meetings()
      .filter(m => new Date(m.startTime) >= now && m.status === 'scheduled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  });

  todayMeetings = computed(() => {
    const today = new Date();
    return this.calendarEvents().filter(e => {
      const eventDate = new Date(e.start);
      return eventDate.toDateString() === today.toDateString();
    });
  });

  ngOnInit(): void {
    this.loadData();
    this.generateCalendarDays();
  }

  private loadData(): void {
    this.meetingService.getMeetings().subscribe(data => {
      this.meetings.set(data);
      this.cdr.detectChanges();
    });

    this.meetingService.getCalendarEvents().subscribe(data => {
      this.calendarEvents.set(data);
      this.generateCalendarDays();
      this.cdr.detectChanges();
    });

    this.meetingService.getAttendees().subscribe(data => {
      this.attendees.set(data);
      this.cdr.detectChanges();
    });

    this.meetingService.getMeetingStats().subscribe(data => {
      this.stats.set(data);
      this.cdr.detectChanges();
    });

    this.meetingService.getDepartmentStats().subscribe(data => {
      this.departmentStats.set(data);
      this.cdr.detectChanges();
    });

    this.meetingService.getPersonalMeetingLoad().subscribe(data => {
      this.personalLoads.set(data);
      this.cdr.detectChanges();
    });

    this.meetingService.getMeetingEfficiency().subscribe(data => {
      this.efficiency.set(data);
      this.cdr.detectChanges();
    });

    this.meetingService.getPendingConclusions().subscribe(data => {
      this.pendingConclusions.set(data);
      this.cdr.detectChanges();
    });
  }

  // 切換視圖
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // 日曆導航
  prevMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.generateCalendarDays();
  }

  nextMonth(): void {
    const current = this.currentDate();
    this.currentDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.generateCalendarDays();
  }

  goToToday(): void {
    this.currentDate.set(new Date());
    this.generateCalendarDays();
  }

  private generateCalendarDays(): void {
    const current = this.currentDate();
    const year = current.getFullYear();
    const month = current.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days: CalendarDay[] = [];
    const today = new Date();

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayEvents = this.calendarEvents().filter(e => {
        const eventDate = new Date(e.start);
        return eventDate.toDateString() === currentDate.toDateString();
      });

      days.push({
        date: new Date(currentDate),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: currentDate.toDateString() === today.toDateString(),
        events: dayEvents
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    this.calendarDays.set(days);
    this.cdr.detectChanges();
  }

  // 開啟新增會議 Modal
  openAddMeetingModal(): void {
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    this.newMeeting.set({
      title: '',
      type: 'regular',
      location: '',
      isOnline: false,
      startTime: startTime,
      endTime: endTime,
      recurrence: 'none',
      reminders: [
        { id: '1', timing: '1day', enabled: true },
        { id: '2', timing: '1hour', enabled: false },
        { id: '3', timing: '15min', enabled: false }
      ],
      attendees: [],
      agenda: [],
      attachments: []
    });
    this.showAddMeetingModal.set(true);
  }

  closeAddMeetingModal(): void {
    this.showAddMeetingModal.set(false);
  }

  // 開啟會議詳情 Modal
  openMeetingDetail(meeting: Meeting): void {
    this.selectedMeeting.set(meeting);
    this.showMeetingDetailModal.set(true);
  }

  closeMeetingDetailModal(): void {
    this.showMeetingDetailModal.set(false);
    this.selectedMeeting.set(null);
  }

  // 開啟議程 Modal
  openAgendaModal(): void {
    this.newAgendaItem.set({
      title: '',
      description: '',
      presenter: '',
      duration: 15
    });
    this.showAgendaModal.set(true);
  }

  closeAgendaModal(): void {
    this.showAgendaModal.set(false);
  }

  // 新增會議表單處理
  updateNewMeeting(field: string, value: unknown): void {
    this.newMeeting.update(m => ({ ...m, [field]: value }));
  }

  toggleReminder(timing: '1day' | '1hour' | '15min'): void {
    const meeting = this.newMeeting();
    const reminders = meeting.reminders?.map(r =>
      r.timing === timing ? { ...r, enabled: !r.enabled } : r
    ) || [];
    this.newMeeting.update(m => ({ ...m, reminders }));
  }

  toggleAttendee(attendee: MeetingAttendee): void {
    const meeting = this.newMeeting();
    const attendees = meeting.attendees || [];
    const exists = attendees.find(a => a.id === attendee.id);

    if (exists) {
      this.newMeeting.update(m => ({
        ...m,
        attendees: attendees.filter(a => a.id !== attendee.id)
      }));
    } else {
      this.newMeeting.update(m => ({
        ...m,
        attendees: [...attendees, { ...attendee, attendanceStatus: 'pending', signedIn: false }]
      }));
    }
  }

  isAttendeeSelected(attendeeId: string): boolean {
    return this.newMeeting().attendees?.some(a => a.id === attendeeId) || false;
  }

  addAgendaItem(): void {
    const item = this.newAgendaItem();
    if (!item.title) return;

    const meeting = this.newMeeting();
    const agenda = meeting.agenda || [];

    const newItem: AgendaItem = {
      id: String(Date.now()),
      order: agenda.length + 1,
      title: item.title || '',
      description: item.description || '',
      presenter: item.presenter || '',
      duration: item.duration || 15,
      status: 'pending',
      createdBy: '1',
      createdAt: new Date()
    };

    this.newMeeting.update(m => ({
      ...m,
      agenda: [...agenda, newItem]
    }));

    this.closeAgendaModal();
  }

  removeAgendaItem(itemId: string): void {
    const meeting = this.newMeeting();
    this.newMeeting.update(m => ({
      ...m,
      agenda: (meeting.agenda || []).filter(a => a.id !== itemId)
    }));
  }

  updateAgendaField(field: string, value: unknown): void {
    this.newAgendaItem.update(a => ({ ...a, [field]: value }));
  }

  saveMeeting(): void {
    // 模擬儲存
    console.log('Saving meeting:', this.newMeeting());
    this.closeAddMeetingModal();
    // 在實際應用中，這裡會呼叫 API 並重新載入資料
  }

  // 格式化工具
  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  }

  formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('zh-TW', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} 小時 ${mins} 分鐘`;
    } else if (hours > 0) {
      return `${hours} 小時`;
    } else {
      return `${mins} 分鐘`;
    }
  }

  getMeetingTypeLabel(type: MeetingType): string {
    return this.meetingTypeOptions.find(t => t.value === type)?.label || type;
  }

  getMeetingTypeIcon(type: MeetingType): string {
    return this.meetingTypeOptions.find(t => t.value === type)?.icon || 'ri-calendar-line';
  }

  getMeetingTypeColor(type: MeetingType): string {
    return this.meetingTypeOptions.find(t => t.value === type)?.color || '#8DA399';
  }

  getRecurrenceLabel(recurrence: MeetingRecurrence): string {
    return this.recurrenceOptions.find(r => r.value === recurrence)?.label || '';
  }

  getCompletedConclusionsCount(conclusions: MeetingConclusion[]): number {
    return conclusions.filter(c => c.status === 'completed').length;
  }

  getReminderLabel(timing: '1day' | '1hour' | '15min'): string {
    return this.reminderOptions.find(r => r.value === timing)?.label || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'scheduled': '已排程',
      'in-progress': '進行中',
      'completed': '已完成',
      'cancelled': '已取消',
      'pending': '待執行',
      'overdue': '已逾期'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'scheduled': 'status--scheduled',
      'in-progress': 'status--progress',
      'completed': 'status--completed',
      'cancelled': 'status--cancelled',
      'pending': 'status--pending',
      'overdue': 'status--overdue'
    };
    return classes[status] || '';
  }

  getDaysUntil(date: Date): number {
    const now = new Date();
    const target = new Date(date);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // 追蹤結論進度更新
  updateConclusionProgress(conclusion: MeetingConclusion, progress: number): void {
    // 模擬更新進度
    console.log('Updating progress:', conclusion.id, progress);
  }
}

