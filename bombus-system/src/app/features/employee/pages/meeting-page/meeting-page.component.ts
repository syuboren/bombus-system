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
import { QRCodeModule } from 'angularx-qrcode';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { MeetingService } from '../../services/meeting.service';
import { OrgUnitService } from '../../../../core/services/org-unit.service';
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
type CalendarScope = 'company' | 'department' | 'personal';

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
    QRCodeModule,
    HeaderComponent
  ],
  templateUrl: './meeting-page.component.html',
  styleUrl: './meeting-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MeetingPageComponent implements OnInit {
  private meetingService = inject(MeetingService);
  private cdr = inject(ChangeDetectorRef);
  private orgUnitService = inject(OrgUnitService);

  // 視圖模式
  viewMode = signal<ViewMode>('calendar');

  // 日曆層級切換
  calendarScope = signal<CalendarScope>('company');
  selectedSubsidiaryId = signal<string>('');
  subsidiaries = this.orgUnitService.subsidiaries;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));
  selectedDepartment = signal<string>('');
  selectedEmployeeId = signal<string>(''); // 個人視角選擇的員工
  currentEmployeeId = signal<string>('1'); // TODO: 從登入狀態取得
  currentEmployeeDept = signal<string>('研發部'); // TODO: 從登入狀態取得

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
  showSignInModal = signal(false);
  showDeleteConfirmModal = signal(false);
  showCompleteMeetingModal = signal(false); // 完成會議 Modal
  selectedMeeting = signal<Meeting | null>(null);
  isEditMode = signal(false);

  // 完成會議表單
  completeMeetingForm = signal<{
    notes: string;
    conclusions: Array<{
      id: string;
      agendaItemId: string;
      pointIndex: number;
      content: string;
      responsibleIds: string[];
      responsibleNames: string[];
      departments: string[];
      dueDate: string;
    }>;
  }>({
    notes: '',
    conclusions: []
  });

  // 更新進度 Modal
  showUpdateProgressModal = signal(false);
  selectedConclusion = signal<any>(null);
  progressForm = signal<{
    progress: number;
    status: string;
    note: string;
  }>({
    progress: 0,
    status: 'pending',
    note: ''
  });

  // 表單驗證
  formErrors = signal<Record<string, string>>({});
  formSubmitted = signal(false);

  // 附件上傳狀態
  isDragging = signal(false);

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
    discussionPoints: [],
    presenter: '',
    duration: 15
  });
  editingAgendaItemId = signal<string | null>(null); // 正在編輯的議程項目 ID

  // 選項
  readonly meetingTypeOptions = MEETING_TYPE_OPTIONS;
  readonly recurrenceOptions = RECURRENCE_OPTIONS;
  readonly reminderOptions = REMINDER_OPTIONS;

  // 時間選項 (每 15 分鐘一個選項)
  readonly timeOptions = this.generateTimeOptions();

  // 全天選項
  isAllDay = signal(false);

  private generateTimeOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 15) {
        const h = hour.toString().padStart(2, '0');
        const m = min.toString().padStart(2, '0');
        const value = `${h}:${m}`;
        const label = `${hour > 12 ? '下午' : '上午'} ${hour > 12 ? hour - 12 : hour || 12}:${m}`;
        options.push({ value, label });
      }
    }
    return options;
  }

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
    this.orgUnitService.loadOrgUnits().subscribe();
    this.loadData();
    this.generateCalendarDays();
  }

  private loadData(): void {
    // 根據日曆層級建立過濾條件
    const filters = this.buildScopeFilters();

    this.meetingService.getMeetings(filters).subscribe(data => {
      this.meetings.set(data);
      this.cdr.detectChanges();
    });

    this.meetingService.getCalendarEvents(filters).subscribe(data => {
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

    // 使用新的 getConclusions API 取得結論（含來源會議資訊）
    this.meetingService.getConclusions().subscribe(data => {
      this.pendingConclusions.set(data);
      this.cdr.detectChanges();
    });
  }

  // 建立日曆層級過濾條件
  private buildScopeFilters(): { scope?: CalendarScope; employeeId?: string; department?: string } {
    const scope = this.calendarScope();
    
    if (scope === 'personal') {
      // 使用選擇的員工 ID，若無則使用當前登入用戶
      const employeeId = this.selectedEmployeeId() || this.currentEmployeeId();
      return { scope, employeeId };
    } else if (scope === 'department') {
      const dept = this.selectedDepartment() || this.currentEmployeeDept();
      return { scope, department: dept };
    }
    
    return { scope: 'company' };
  }

  // 切換選擇的員工（個人視角）
  setSelectedEmployee(employeeId: string): void {
    this.selectedEmployeeId.set(employeeId);
    if (this.calendarScope() === 'personal') {
      this.loadData();
    }
  }

  // 取得選擇的員工名稱
  getSelectedEmployeeName(): string {
    const employeeId = this.selectedEmployeeId() || this.currentEmployeeId();
    const employee = this.attendees().find(a => a.id === employeeId);
    return employee?.name || '我';
  }

  // 切換日曆層級
  setCalendarScope(scope: CalendarScope): void {
    this.calendarScope.set(scope);
    if (scope === 'department' && !this.selectedDepartment()) {
      this.selectedDepartment.set(this.currentEmployeeDept());
    }
    this.loadData();
  }

  // 切換部門過濾
  setSelectedDepartment(dept: string): void {
    this.selectedDepartment.set(dept);
    if (this.calendarScope() === 'department') {
      this.loadData();
    }
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
    this.isEditMode.set(false);
    this.formSubmitted.set(false);
    this.formErrors.set({});
    this.isAllDay.set(false);
    
    const now = new Date();
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    this.initNewMeetingForm(startTime, endTime);
    this.showAddMeetingModal.set(true);
  }

  // 點擊日曆格子開啟新增會議 Modal（帶入日期）
  openAddMeetingWithDate(date: Date): void {
    this.isEditMode.set(false);
    this.formSubmitted.set(false);
    this.formErrors.set({});
    this.isAllDay.set(false);
    
    // 設定開始時間為該日期的上午 9:00
    const startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 預設 1 小時

    this.initNewMeetingForm(startTime, endTime);
    this.showAddMeetingModal.set(true);
  }

  // 初始化新增會議表單
  private initNewMeetingForm(startTime: Date, endTime: Date): void {
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
  }

  closeAddMeetingModal(): void {
    this.showAddMeetingModal.set(false);
    this.isEditMode.set(false);
    this.formSubmitted.set(false);
    this.formErrors.set({});
  }

  // 開啟會議詳情 Modal
  openMeetingDetail(meeting: Meeting): void {
    // 先顯示基本資料，然後載入完整詳情
    this.selectedMeeting.set(meeting);
    this.showMeetingDetailModal.set(true);
    
    // 從 API 取得完整會議詳情（包含出席人員、議程等）
    this.meetingService.getMeeting(meeting.id).subscribe({
      next: (fullMeeting) => {
        this.selectedMeeting.set(fullMeeting);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading meeting details:', err);
      }
    });
  }

  closeMeetingDetailModal(): void {
    this.showMeetingDetailModal.set(false);
    this.selectedMeeting.set(null);
  }

  // 開啟議程 Modal (新增模式)
  openAgendaModal(): void {
    this.editingAgendaItemId.set(null);
    this.newAgendaItem.set({
      title: '',
      description: '',
      discussionPoints: [],
      presenter: '',
      duration: 15
    });
    this.showAgendaModal.set(true);
  }

  // 開啟議程 Modal (編輯模式)
  editAgendaItem(item: AgendaItem): void {
    this.editingAgendaItemId.set(item.id);
    this.newAgendaItem.set({
      title: item.title,
      description: item.description,
      discussionPoints: item.discussionPoints || [],
      presenter: item.presenter,
      duration: item.duration
    });
    this.showAgendaModal.set(true);
  }

  closeAgendaModal(): void {
    this.showAgendaModal.set(false);
    this.editingAgendaItemId.set(null);
  }

  // 新增會議表單處理
  updateNewMeeting(field: string, value: unknown): void {
    this.newMeeting.update(m => ({ ...m, [field]: value }));
  }

  // 切換全天選項
  toggleAllDay(isAllDay: boolean): void {
    this.isAllDay.set(isAllDay);
    const meeting = this.newMeeting();
    if (isAllDay) {
      // 設為全天：開始時間為 00:00，結束時間為 23:59
      const startDate = meeting.startTime ? new Date(meeting.startTime) : new Date();
      const endDate = meeting.endTime ? new Date(meeting.endTime) : new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      this.newMeeting.update(m => ({ ...m, startTime: startDate, endTime: endDate }));
    }
  }

  // 更新日期部分（保留時間）
  updateMeetingDate(field: 'startTime' | 'endTime', dateStr: string): void {
    const meeting = this.newMeeting();
    const currentDate = meeting[field] ? new Date(meeting[field] as Date) : new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    
    currentDate.setFullYear(year, month - 1, day);
    this.newMeeting.update(m => ({ ...m, [field]: new Date(currentDate) }));
  }

  // 更新時間部分（保留日期）
  updateMeetingTime(field: 'startTime' | 'endTime', timeStr: string): void {
    const meeting = this.newMeeting();
    const currentDate = meeting[field] ? new Date(meeting[field] as Date) : new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    currentDate.setHours(hours, minutes, 0, 0);
    this.newMeeting.update(m => ({ ...m, [field]: new Date(currentDate) }));

    // 如果修改開始時間，且結束時間早於開始時間，自動調整結束時間
    if (field === 'startTime') {
      const endTime = meeting.endTime ? new Date(meeting.endTime as Date) : new Date();
      if (currentDate >= endTime) {
        const newEndTime = new Date(currentDate.getTime() + 60 * 60 * 1000); // 加 1 小時
        this.newMeeting.update(m => ({ ...m, endTime: newEndTime }));
      }
    }
  }

  // 取得日期字串 (yyyy-MM-dd)
  getDateString(date: Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // 取得時間字串 (HH:mm)，對齊到最近的 15 分鐘
  getTimeString(date: Date | undefined): string {
    if (!date) return '09:00';
    const d = new Date(date);
    const hours = d.getHours();
    // 將分鐘對齊到最近的 15 分鐘（向下取整）
    const minutes = Math.floor(d.getMinutes() / 15) * 15;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  toggleReminder(timing: '1day' | '1hour' | '15min'): void {
    const meeting = this.newMeeting();
    const reminders = meeting.reminders?.map(r =>
      r.timing === timing ? { ...r, enabled: !r.enabled } : r
    ) || [];
    this.newMeeting.update(m => ({ ...m, reminders }));
  }

  // 更新會議召集人
  updateOrganizer(attendeeId: string): void {
    const meeting = this.newMeeting();
    
    // 如果選擇的是同一個召集人，不做任何變更
    if (meeting.organizer?.id === attendeeId) {
      return;
    }
    
    const attendee = this.attendees().find(a => a.id === attendeeId);
    if (attendee) {
      this.newMeeting.update(m => {
        const currentAttendees = m.attendees || [];
        // 檢查是否已在出席人員中（id 已統一為員工 ID）
        const alreadySelected = currentAttendees.some(a => a.id === attendee.id);
        
        // 更新 attendees 陣列中的 isOrganizer 標記
        const updatedAttendees = currentAttendees.map(a => ({
          ...a,
          isOrganizer: a.id === attendeeId
        }));
        
        // 如果召集人不在出席人員中，添加進去
        if (!alreadySelected) {
          updatedAttendees.push({ ...attendee, isOrganizer: true, attendanceStatus: 'pending', signedIn: false });
        }
        
        return {
          ...m,
          organizer: { ...attendee, isOrganizer: true },
          attendees: updatedAttendees
        };
      });
    } else {
      // 清除召集人，重置所有 attendees 的 isOrganizer
      this.newMeeting.update(m => ({
        ...m,
        organizer: undefined as any,
        attendees: (m.attendees || []).map(a => ({ ...a, isOrganizer: false }))
      }));
    }
  }

  toggleAttendee(attendee: MeetingAttendee): void {
    const meeting = this.newMeeting();
    const attendees = meeting.attendees || [];
    // id 已統一為員工 ID，直接比較即可
    const exists = attendees.find(a => a.id === attendee.id);

    if (exists) {
      // 如果取消選擇的是召集人，也清除召集人
      const isOrganizer = meeting.organizer?.id === attendee.id;
      
      // 過濾掉被取消的參與人員
      const filteredAttendees = attendees.filter(a => a.id !== attendee.id);
      
      if (isOrganizer) {
        this.newMeeting.update(m => ({
          ...m,
          organizer: undefined as any,
          attendees: filteredAttendees
        }));
      } else {
        this.newMeeting.update(m => ({
          ...m,
          attendees: filteredAttendees
        }));
      }
    } else {
      this.newMeeting.update(m => ({
        ...m,
        attendees: [...attendees, { ...attendee, attendanceStatus: 'pending', signedIn: false }]
      }));
    }
  }

  isAttendeeSelected(attendeeId: string): boolean {
    // id 已統一為員工 ID，直接比較即可
    return this.newMeeting().attendees?.some(a => a.id === attendeeId) || false;
  }

  addAgendaItem(): void {
    const item = this.newAgendaItem();
    if (!item.title) return;

    const meeting = this.newMeeting();
    const agenda = meeting.agenda || [];
    const editingId = this.editingAgendaItemId();
    // 過濾空白的討論要點
    const discussionPoints = (item.discussionPoints || []).filter(p => p.trim() !== '');

    if (editingId) {
      // 編輯模式：更新現有項目
      this.newMeeting.update(m => ({
        ...m,
        agenda: (m.agenda || []).map(a => 
          a.id === editingId
            ? { ...a, title: item.title || '', description: item.description || '', discussionPoints, presenter: item.presenter || '', duration: item.duration || 15 }
            : a
        )
      }));
    } else {
      // 新增模式
      const newItem: AgendaItem = {
        id: String(Date.now()),
        order: agenda.length + 1,
        title: item.title || '',
        description: item.description || '',
        discussionPoints,
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
    }

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

  // 討論要點相關方法
  addDiscussionPoint(): void {
    this.newAgendaItem.update(a => ({
      ...a,
      discussionPoints: [...(a.discussionPoints || []), '']
    }));
  }

  updateDiscussionPoint(index: number, value: string): void {
    this.newAgendaItem.update(a => ({
      ...a,
      discussionPoints: (a.discussionPoints || []).map((p, i) => i === index ? value : p)
    }));
  }

  removeDiscussionPoint(index: number): void {
    this.newAgendaItem.update(a => ({
      ...a,
      discussionPoints: (a.discussionPoints || []).filter((_, i) => i !== index)
    }));
  }

  // 附件上傳相關方法
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(Array.from(files));
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.processFiles(Array.from(input.files));
      input.value = ''; // 清空 input 以允許重複選擇相同檔案
    }
  }

  private processFiles(files: File[]): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', '.png'];

    files.forEach(file => {
      // 檢查檔案大小
      if (file.size > maxSize) {
        alert(`檔案 "${file.name}" 超過 10MB 限制`);
        return;
      }

      // 檢查檔案類型
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validExtensions.includes(ext)) {
        alert(`不支援的檔案格式: ${ext}`);
        return;
      }

      // 添加到附件列表
      const attachment = {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        file: file
      };

      this.newMeeting.update(m => ({
        ...m,
        attachments: [...(m.attachments || []), attachment]
      }));

      // 模擬上傳進度（實際上傳會在 saveMeeting 時進行）
      this.simulateUpload(attachment.id);
    });
  }

  private simulateUpload(attachmentId: string): void {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      this.updateAttachmentProgress(attachmentId, Math.round(progress));
    }, 200);
  }

  private updateAttachmentProgress(attachmentId: string, progress: number): void {
    this.newMeeting.update(m => ({
      ...m,
      attachments: (m.attachments || []).map(a =>
        a.id === attachmentId ? { ...a, uploadProgress: progress } : a
      )
    }));
  }

  removeAttachment(attachmentId: string): void {
    this.newMeeting.update(m => ({
      ...m,
      attachments: (m.attachments || []).filter(a => a.id !== attachmentId)
    }));
  }

  getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      'pdf': 'ri-file-pdf-2-line',
      'doc': 'ri-file-word-2-line',
      'docx': 'ri-file-word-2-line',
      'xls': 'ri-file-excel-2-line',
      'xlsx': 'ri-file-excel-2-line',
      'ppt': 'ri-file-ppt-2-line',
      'pptx': 'ri-file-ppt-2-line',
      'txt': 'ri-file-text-line',
      'jpg': 'ri-image-line',
      'jpeg': 'ri-image-line',
      'png': 'ri-image-line'
    };
    return iconMap[ext || ''] || 'ri-file-line';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  // 表單驗證
  validateForm(): boolean {
    const meeting = this.newMeeting();
    const errors: Record<string, string> = {};

    // 必填欄位驗證
    if (!meeting.title?.trim()) {
      errors['title'] = '請輸入會議名稱';
    }

    if (!meeting.startTime) {
      errors['startTime'] = '請選擇開始時間';
    }

    if (!meeting.endTime) {
      errors['endTime'] = '請選擇結束時間';
    }

    // 時間邏輯驗證
    if (meeting.startTime && meeting.endTime) {
      const start = new Date(meeting.startTime);
      const end = new Date(meeting.endTime);
      if (end <= start) {
        errors['endTime'] = '結束時間必須晚於開始時間';
      }
    }

    // 至少需要一位出席人員
    if (!meeting.attendees || meeting.attendees.length === 0) {
      errors['attendees'] = '請至少選擇一位出席人員';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  hasError(field: string): boolean {
    return this.formSubmitted() && !!this.formErrors()[field];
  }

  getError(field: string): string {
    return this.formErrors()[field] || '';
  }

  saveMeeting(): void {
    this.formSubmitted.set(true);
    
    if (!this.validateForm()) {
      return;
    }

    const meetingData = this.newMeeting();
    // 取出需要上傳的檔案（有 file 屬性的附件）
    const filesToUpload = (meetingData.attachments || []).filter(a => a.file);
    // 移除 file 屬性，只保留 metadata（後端不接受 File 物件）
    const cleanAttachments = (meetingData.attachments || []).map(({ file, ...rest }) => rest);
    const cleanMeetingData = { ...meetingData, attachments: cleanAttachments };
    
    console.log('Saving meeting:', cleanMeetingData);

    if (this.isEditMode()) {
      // 編輯模式
      const meetingId = this.selectedMeeting()?.id;
      if (!meetingId) return;

      this.meetingService.updateMeeting(meetingId, cleanMeetingData).subscribe({
        next: (res) => {
          console.log('Meeting updated successfully:', res);
          // 上傳新附件
          this.uploadPendingFiles(meetingId, filesToUpload);
          this.closeAddMeetingModal();
          this.loadData();
        },
        error: (err) => {
          console.error('Error updating meeting:', err);
          alert('更新會議失敗，請稍後再試');
        }
      });
    } else {
      // 新增模式
      this.meetingService.createMeeting(cleanMeetingData).subscribe({
        next: (res) => {
          console.log('Meeting created successfully:', res);
          // 上傳附件
          this.uploadPendingFiles(res.id, filesToUpload);
          this.closeAddMeetingModal();
          this.loadData();
        },
        error: (err) => {
          console.error('Error creating meeting:', err);
          alert('建立會議失敗，請稍後再試');
        }
      });
    }
  }

  // 上傳待傳檔案
  private uploadPendingFiles(meetingId: string, files: any[]): void {
    if (!files.length) return;
    
    files.forEach(attachment => {
      if (attachment.file) {
        this.meetingService.uploadAttachment(meetingId, attachment.file, 'system').subscribe({
          next: (res) => {
            console.log('File uploaded:', res);
          },
          error: (err) => {
            console.error('File upload error:', err);
          }
        });
      }
    });
  }

  // 開啟編輯會議 Modal
  openEditMeetingModal(meeting: Meeting): void {
    this.isEditMode.set(true);
    this.formSubmitted.set(false);
    this.formErrors.set({});
    this.selectedMeeting.set(meeting);
    
    // 從 attendees 中找出召集人（isOrganizer 為 true 的人）
    // id 已統一為員工 ID，不需要特別轉換
    const organizer = meeting.attendees?.find(a => a.isOrganizer);
    
    // 將會議資料載入表單
    this.newMeeting.set({
      title: meeting.title,
      type: meeting.type,
      location: meeting.location,
      isOnline: meeting.isOnline,
      meetingLink: meeting.meetingLink,
      startTime: new Date(meeting.startTime),
      endTime: new Date(meeting.endTime),
      recurrence: meeting.recurrence,
      reminders: meeting.reminders ? [...meeting.reminders] : [],
      attendees: meeting.attendees ? [...meeting.attendees] : [],
      organizer: organizer,
      agenda: meeting.agenda ? [...meeting.agenda] : [],
      attachments: meeting.attachments ? [...meeting.attachments] : []
    });
    
    this.showMeetingDetailModal.set(false);
    this.showAddMeetingModal.set(true);
  }

  // 取消會議
  cancelMeeting(): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    if (!confirm('確定要取消此會議嗎？會議將被標記為已取消狀態。')) {
      return;
    }

    this.meetingService.cancelMeeting(meeting.id).subscribe({
      next: () => {
        alert('會議已取消');
        this.closeAddMeetingModal();
        this.closeMeetingDetailModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error cancelling meeting:', err);
        alert('取消會議失敗，請稍後再試');
      }
    });
  }

  // 刪除會議
  deleteMeeting(): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    if (!confirm('確定要永久刪除此會議嗎？此操作無法復原。')) {
      return;
    }

    this.meetingService.deleteMeeting(meeting.id).subscribe({
      next: () => {
        alert('會議已刪除');
        this.closeAddMeetingModal();
        this.closeMeetingDetailModal();
        this.loadData();
      },
      error: (err) => {
        console.error('Error deleting meeting:', err);
        alert('刪除會議失敗，請稍後再試');
      }
    });
  }

  // 開啟完成會議 Modal
  openCompleteMeetingModal(): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    // 重置表單
    this.completeMeetingForm.set({
      notes: meeting.notes || '',
      conclusions: []
    });
    this.showCompleteMeetingModal.set(true);
  }

  // 關閉完成會議 Modal
  closeCompleteMeetingModal(): void {
    this.showCompleteMeetingModal.set(false);
  }

  // 更新會議記錄
  updateMeetingNotes(notes: string): void {
    this.completeMeetingForm.update(f => ({ ...f, notes }));
  }

  // 取得特定討論要點的結論
  getConclusionForPoint(agendaItemId: string, pointIndex: number): any {
    return this.completeMeetingForm().conclusions.find(
      c => c.agendaItemId === agendaItemId && c.pointIndex === pointIndex
    );
  }

  // 新增討論要點的結論
  addPointConclusion(agendaItemId: string, pointIndex: number): void {
    const newConclusion = {
      id: crypto.randomUUID(),
      agendaItemId,
      pointIndex,
      content: '',
      responsibleIds: [] as string[],
      responsibleNames: [] as string[],
      departments: [] as string[],
      dueDate: this.getDefaultDueDate()
    };
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: [...f.conclusions, newConclusion]
    }));
  }

  // 更新討論要點的結論
  updatePointConclusion(agendaItemId: string, pointIndex: number, field: string, value: string): void {
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.map(c => {
        if (c.agendaItemId !== agendaItemId || c.pointIndex !== pointIndex) return c;
        return { ...c, [field]: value };
      })
    }));
  }

  // 移除討論要點的結論
  removePointConclusion(agendaItemId: string, pointIndex: number): void {
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.filter(
        c => !(c.agendaItemId === agendaItemId && c.pointIndex === pointIndex)
      )
    }));
  }

  // 檢查討論要點的負責人是否已選
  isPointResponsibleSelected(agendaItemId: string, pointIndex: number, attendeeId: string): boolean {
    const conclusion = this.getConclusionForPoint(agendaItemId, pointIndex);
    return conclusion?.responsibleIds?.includes(attendeeId) || false;
  }

  // 切換討論要點的負責人
  togglePointResponsible(agendaItemId: string, pointIndex: number, attendee: MeetingAttendee): void {
    // id 已統一為員工 ID，直接使用即可
    const attendeeId = attendee.id;
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.map(c => {
        if (c.agendaItemId !== agendaItemId || c.pointIndex !== pointIndex) return c;
        
        const isSelected = c.responsibleIds.includes(attendeeId);
        if (isSelected) {
          const idx = c.responsibleIds.indexOf(attendeeId);
          return {
            ...c,
            responsibleIds: c.responsibleIds.filter((_, i) => i !== idx),
            responsibleNames: c.responsibleNames.filter((_, i) => i !== idx),
            departments: c.departments.filter((_, i) => i !== idx)
          };
        } else {
          return {
            ...c,
            responsibleIds: [...c.responsibleIds, attendeeId],
            responsibleNames: [...c.responsibleNames, attendee.name],
            departments: [...c.departments, attendee.department]
          };
        }
      })
    }));
  }

  // 取得預設期限（7 天後）
  private getDefaultDueDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  }

  // === 額外結論（不對應討論要點）===
  
  // 取得議程的額外結論（pointIndex = -1 表示額外結論）
  getExtraConclusionsForAgenda(agendaItemId: string): any[] {
    return this.completeMeetingForm().conclusions.filter(
      c => c.agendaItemId === agendaItemId && c.pointIndex === -1
    );
  }

  // 新增額外結論
  addExtraConclusion(agendaItemId: string): void {
    const newConclusion = {
      id: crypto.randomUUID(),
      agendaItemId,
      pointIndex: -1, // -1 表示額外結論
      content: '',
      responsibleIds: [] as string[],
      responsibleNames: [] as string[],
      departments: [] as string[],
      dueDate: this.getDefaultDueDate()
    };
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: [...f.conclusions, newConclusion]
    }));
  }

  // 更新額外結論
  updateExtraConclusion(conclusionId: string, field: string, value: string): void {
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.map(c => {
        if (c.id !== conclusionId) return c;
        return { ...c, [field]: value };
      })
    }));
  }

  // 移除額外結論
  removeExtraConclusion(conclusionId: string): void {
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.filter(c => c.id !== conclusionId)
    }));
  }

  // 檢查額外結論的負責人是否已選
  isExtraResponsibleSelected(conclusionId: string, attendeeId: string): boolean {
    const conclusion = this.completeMeetingForm().conclusions.find(c => c.id === conclusionId);
    return conclusion?.responsibleIds?.includes(attendeeId) || false;
  }

  // 切換額外結論的負責人
  toggleExtraResponsible(conclusionId: string, attendee: MeetingAttendee): void {
    // id 已統一為員工 ID，直接使用即可
    const attendeeId = attendee.id;
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.map(c => {
        if (c.id !== conclusionId) return c;
        
        const isSelected = c.responsibleIds.includes(attendeeId);
        if (isSelected) {
          const idx = c.responsibleIds.indexOf(attendeeId);
          return {
            ...c,
            responsibleIds: c.responsibleIds.filter((_, i) => i !== idx),
            responsibleNames: c.responsibleNames.filter((_, i) => i !== idx),
            departments: c.departments.filter((_, i) => i !== idx)
          };
        } else {
          return {
            ...c,
            responsibleIds: [...c.responsibleIds, attendeeId],
            responsibleNames: [...c.responsibleNames, attendee.name],
            departments: [...c.departments, attendee.department]
          };
        }
      })
    }));
  }

  // 更新決議事項
  updateConclusion(id: string, field: string, value: string): void {
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.map(c => {
        if (c.id !== id) return c;
        
        // 如果更新負責人，自動帶入部門
        if (field === 'responsibleId') {
          // id 已統一為員工 ID，直接比較即可
          const attendee = this.selectedMeeting()?.attendees.find(a => a.id === value);
          return {
            ...c,
            responsibleId: value,
            responsibleName: attendee?.name || '',
            department: attendee?.department || ''
          };
        }
        
        return { ...c, [field]: value };
      })
    }));
  }

  // 刪除決議事項
  removeConclusion(id: string): void {
    this.completeMeetingForm.update(f => ({
      ...f,
      conclusions: f.conclusions.filter(c => c.id !== id)
    }));
  }

  // 提交完成會議
  submitCompleteMeeting(): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    const form = this.completeMeetingForm();
    
    // 驗證：有結論的項目要填寫完整（結論內容、當責人、期限）
    const invalidConclusions = form.conclusions.filter(c => 
      !c.content.trim() || c.responsibleIds.length === 0 || !c.dueDate
    );
    
    if (invalidConclusions.length > 0) {
      alert('請填寫完整的結論資訊（結論內容、當責人、完成時間）');
      return;
    }

    // 取得議程標題對應
    const agendaTitleMap = new Map<string, string>();
    meeting.agenda.forEach(a => agendaTitleMap.set(a.id, a.title));

    // 轉換資料格式給後端
    const payload = {
      notes: form.notes,
      conclusions: form.conclusions.map(c => ({
        content: c.content,
        responsibleId: c.responsibleIds.join(','),
        responsibleName: c.responsibleNames.join('、'),
        department: [...new Set(c.departments)].join('、'),
        dueDate: c.dueDate,
        agendaItemId: c.agendaItemId,
        agendaTitle: agendaTitleMap.get(c.agendaItemId) || ''
      }))
    };

    this.meetingService.completeMeeting(meeting.id, payload).subscribe({
      next: () => {
        this.closeCompleteMeetingModal();
        this.closeMeetingDetailModal();
        this.loadData();
        alert('會議已完成');
      },
      error: (err) => {
        console.error('Error completing meeting:', err);
        alert('完成會議失敗，請稍後再試');
      }
    });
  }

  // 開啟更新進度 Modal
  openUpdateProgressModal(conclusion: any): void {
    this.selectedConclusion.set(conclusion);
    this.progressForm.set({
      progress: conclusion.progress || 0,
      status: conclusion.status || 'pending',
      note: ''
    });
    this.showUpdateProgressModal.set(true);
  }

  // 關閉更新進度 Modal
  closeUpdateProgressModal(): void {
    this.showUpdateProgressModal.set(false);
    this.selectedConclusion.set(null);
  }

  // 更新進度值
  updateProgressValue(value: number): void {
    this.progressForm.update(f => ({ ...f, progress: value }));
    // 如果進度達到 100%，自動設為已完成
    if (value === 100) {
      this.progressForm.update(f => ({ ...f, status: 'completed' }));
    }
  }

  // 更新狀態
  updateProgressStatus(status: string): void {
    this.progressForm.update(f => ({ ...f, status }));
    // 如果設為已完成，進度自動設為 100%
    if (status === 'completed') {
      this.progressForm.update(f => ({ ...f, progress: 100 }));
    }
  }

  // 更新備註
  updateProgressNote(note: string): void {
    this.progressForm.update(f => ({ ...f, note }));
  }

  // 提交進度更新
  submitProgressUpdate(): void {
    const conclusion = this.selectedConclusion();
    if (!conclusion) return;

    const form = this.progressForm();
    
    this.meetingService.updateConclusionProgress(
      conclusion.id,
      form.progress,
      form.status,
      form.note
    ).subscribe({
      next: () => {
        this.closeUpdateProgressModal();
        this.loadData(); // 重新載入資料
        alert('進度已更新');
      },
      error: (err) => {
        console.error('Error updating progress:', err);
        alert('更新進度失敗，請稍後再試');
      }
    });
  }

  // 透過會議 ID 開啟會議詳情
  openMeetingById(meetingId: string): void {
    if (!meetingId) return;
    
    this.meetingService.getMeeting(meetingId).subscribe({
      next: (meeting) => {
        this.selectedMeeting.set(meeting);
        this.showMeetingDetailModal.set(true);
      },
      error: (err) => {
        console.error('Error loading meeting:', err);
      }
    });
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
    if (!minutes || minutes <= 0) return '0 分鐘';
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

  // 根據開始和結束時間計算會議時長（分鐘）
  calculateDuration(startTime: Date, endTime: Date): number {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.max(0, Math.round((end - start) / (1000 * 60)));
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

  // ===== 簽到功能 =====
  openSignInModal(): void {
    this.showSignInModal.set(true);
  }

  closeSignInModal(): void {
    this.showSignInModal.set(false);
  }

  enableSignIn(): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    // 更新會議的簽到狀態
    this.meetingService.updateMeeting(meeting.id, { signInEnabled: true }).subscribe({
      next: () => {
        this.selectedMeeting.update(m => m ? { ...m, signInEnabled: true } : null);
      },
      error: (err) => {
        console.error('Failed to enable sign-in:', err);
        alert('開啟簽到失敗，請稍後再試');
      }
    });
  }

  getSignedInCount(attendees: MeetingAttendee[]): number {
    return attendees.filter(a => a.signedIn).length;
  }

  getRecentSignedIn(attendees: MeetingAttendee[]): MeetingAttendee[] {
    return attendees
      .filter(a => a.signedIn)
      .sort((a, b) => {
        const timeA = a.signedInTime ? new Date(a.signedInTime).getTime() : 0;
        const timeB = b.signedInTime ? new Date(b.signedInTime).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 5);
  }

  formatSignInTime(time: Date | undefined): string {
    if (!time) return '';
    return new Date(time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
  }

  signInAttendee(attendeeId: string): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    this.meetingService.signInAttendee(meeting.id, attendeeId).subscribe({
      next: () => {
        this.selectedMeeting.update(m => {
          if (!m) return null;
          return {
            ...m,
            attendees: m.attendees.map(a =>
              // id 已統一為員工 ID，直接比較即可
              a.id === attendeeId ? { ...a, signedIn: true, signedInTime: new Date() } : a
            )
          };
        });
      },
      error: (err) => {
        console.error('Failed to sign in attendee:', err);
        alert('簽到失敗，請稍後再試');
      }
    });
  }

  isCurrentUserSignedIn(): boolean {
    const meeting = this.selectedMeeting();
    if (!meeting || !meeting.attendees?.length) return true;
    
    // TODO: 整合登入系統後，根據真實登入用戶判斷
    // 目前暫時檢查是否還有未簽到的出席者
    return meeting.attendees.every(a => a.signedIn);
  }

  signInCurrentUser(): void {
    const meeting = this.selectedMeeting();
    if (!meeting || !meeting.attendees?.length) return;

    // TODO: 整合登入系統後，根據真實登入用戶的 id 簽到
    // 目前暫時使用第一個未簽到的出席者進行模擬
    const currentUser = meeting.attendees.find(a => !a.signedIn);
    if (currentUser) {
      // id 已統一為員工 ID，直接使用即可
      this.signInAttendee(currentUser.id);
    } else {
      alert('所有出席者皆已簽到');
    }
  }

  getSignInUrl(meetingId: string): string {
    // 生成簽到 URL
    return `${window.location.origin}/public/meeting-sign-in/${meetingId}`;
  }

  copySignInUrl(meetingId: string): void {
    const url = this.getSignInUrl(meetingId);
    navigator.clipboard.writeText(url).then(() => {
      alert('簽到連結已複製到剪貼簿');
    }).catch(() => {
      alert('複製失敗，請手動複製');
    });
  }

  exportSignInList(): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    // 生成簽到表 CSV
    const headers = ['姓名', '部門', '職位', '簽到狀態', '簽到時間'];
    const rows = meeting.attendees.map(a => [
      a.name,
      a.department,
      a.position,
      a.signedIn ? '已簽到' : '未簽到',
      a.signedInTime ? this.formatSignInTime(a.signedInTime) : ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `簽到表_${meeting.title}_${this.formatDate(meeting.startTime)}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

