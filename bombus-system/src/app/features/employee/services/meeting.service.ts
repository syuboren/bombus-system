import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import {
  Meeting,
  MeetingAttendee,
  MeetingStats,
  DepartmentMeetingStats,
  PersonalMeetingLoad,
  MeetingEfficiency,
  CalendarEvent,
  MeetingConclusion,
  MEETING_TYPE_OPTIONS
} from '../models/meeting.model';

@Injectable({
  providedIn: 'root'
})
export class MeetingService {

  private mockAttendees: MeetingAttendee[] = [
    { id: '1', name: '王大明', department: '專案部', position: '專案經理', avatar: 'WD', email: 'wang@company.com', isOrganizer: true, isRequired: true, attendanceStatus: 'accepted', signedIn: true, signedInTime: new Date() },
    { id: '2', name: '李小華', department: '研發部', position: '技術主管', avatar: 'LH', email: 'lee@company.com', isOrganizer: false, isRequired: true, attendanceStatus: 'accepted', signedIn: true, signedInTime: new Date() },
    { id: '3', name: '張志遠', department: '業務部', position: '業務經理', avatar: 'ZZ', email: 'zhang@company.com', isOrganizer: false, isRequired: true, attendanceStatus: 'accepted', signedIn: false },
    { id: '4', name: '林建宏', department: '研發部', position: '資深工程師', avatar: 'LJ', email: 'lin@company.com', isOrganizer: false, isRequired: false, attendanceStatus: 'tentative', signedIn: false },
    { id: '5', name: '周怡君', department: '人資部', position: 'HR 專員', avatar: 'ZY', email: 'zhou@company.com', isOrganizer: false, isRequired: false, attendanceStatus: 'accepted', signedIn: true, signedInTime: new Date() },
    { id: '6', name: '陳美玲', department: '財務部', position: '財務主管', avatar: 'CM', email: 'chen@company.com', isOrganizer: false, isRequired: true, attendanceStatus: 'accepted', signedIn: false },
    { id: '7', name: '吳俊傑', department: '研發部', position: '前端工程師', avatar: 'WJ', email: 'wu@company.com', isOrganizer: false, isRequired: false, attendanceStatus: 'declined', signedIn: false },
    { id: '8', name: '黃雅婷', department: '行銷部', position: '行銷專員', avatar: 'HY', email: 'huang@company.com', isOrganizer: false, isRequired: false, attendanceStatus: 'pending', signedIn: false }
  ];

  private mockMeetings: Meeting[] = [
    {
      id: '1',
      title: 'Q1 專案進度檢討會',
      type: 'project',
      status: 'completed',
      location: '會議室 A',
      isOnline: false,
      startTime: new Date(2025, 11, 20, 10, 0),
      endTime: new Date(2025, 11, 20, 11, 30),
      duration: 90,
      recurrence: 'none',
      reminders: [{ id: '1', timing: '1day', enabled: true }, { id: '2', timing: '1hour', enabled: true }],
      organizer: this.mockAttendees[0],
      attendees: [this.mockAttendees[0], this.mockAttendees[1], this.mockAttendees[2], this.mockAttendees[3]],
      agenda: [
        { id: '1', order: 1, title: 'CRM 專案進度報告', description: '報告目前開發進度與遇到的問題', presenter: '李小華', duration: 20, status: 'discussed', createdBy: '1', createdAt: new Date() },
        { id: '2', order: 2, title: '行銷平台專案更新', description: '說明行銷自動化平台開發狀況', presenter: '張志遠', duration: 15, status: 'discussed', createdBy: '1', createdAt: new Date() },
        { id: '3', order: 3, title: 'Q2 目標討論', description: '討論下季度目標與資源配置', presenter: '王大明', duration: 30, status: 'discussed', createdBy: '1', createdAt: new Date() }
      ],
      attachments: [
        { id: '1', name: 'Q1專案進度報告.pdf', type: 'application/pdf', size: 2500000, url: '#', uploadedBy: '王大明', uploadedAt: new Date() }
      ],
      conclusions: [
        { id: '1', agendaItemId: '1', content: 'CRM 專案需增派 2 名後端工程師', responsible: '李小華', responsibleId: '2', department: '研發部', dueDate: new Date(2025, 11, 27), status: 'in-progress', progress: 60, progressNotes: [], createdAt: new Date() },
        { id: '2', agendaItemId: '2', content: '行銷平台 UI 設計需於本週五完成', responsible: '張志遠', responsibleId: '3', department: '業務部', dueDate: new Date(2025, 11, 25), status: 'completed', progress: 100, progressNotes: [], createdAt: new Date(), completedAt: new Date() },
        { id: '3', agendaItemId: '3', content: '提交 Q2 預算規劃書', responsible: '王大明', responsibleId: '1', department: '專案部', dueDate: new Date(2025, 11, 30), status: 'pending', progress: 20, progressNotes: [], createdAt: new Date() }
      ],
      notes: '本次會議順利完成，各專案進度符合預期。',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      title: '週例會',
      type: 'regular',
      status: 'scheduled',
      location: '線上會議',
      isOnline: true,
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      startTime: new Date(2025, 11, 23, 9, 0),
      endTime: new Date(2025, 11, 23, 10, 0),
      duration: 60,
      recurrence: 'weekly',
      recurrenceEndDate: new Date(2026, 2, 31),
      reminders: [{ id: '1', timing: '15min', enabled: true }],
      organizer: this.mockAttendees[0],
      attendees: [this.mockAttendees[0], this.mockAttendees[1], this.mockAttendees[4], this.mockAttendees[5]],
      agenda: [
        { id: '1', order: 1, title: '上週工作回顧', description: '', presenter: '全體', duration: 15, status: 'pending', createdBy: '1', createdAt: new Date() },
        { id: '2', order: 2, title: '本週工作計畫', description: '', presenter: '全體', duration: 30, status: 'pending', createdBy: '1', createdAt: new Date() },
        { id: '3', order: 3, title: '問題討論', description: '', presenter: '全體', duration: 15, status: 'pending', createdBy: '1', createdAt: new Date() }
      ],
      attachments: [],
      conclusions: [],
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '6',
      title: '產品規劃討論會',
      type: 'project',
      status: 'scheduled',
      location: '會議室 C',
      isOnline: false,
      startTime: new Date(2025, 11, 23, 14, 0),
      endTime: new Date(2025, 11, 23, 15, 30),
      duration: 90,
      recurrence: 'none',
      reminders: [{ id: '1', timing: '1hour', enabled: true }],
      organizer: this.mockAttendees[1],
      attendees: [this.mockAttendees[1], this.mockAttendees[3], this.mockAttendees[6]],
      agenda: [
        { id: '1', order: 1, title: '新功能需求分析', description: '討論 Q1 新功能需求', presenter: '李小華', duration: 30, status: 'pending', createdBy: '2', createdAt: new Date() },
        { id: '2', order: 2, title: '技術可行性評估', description: '', presenter: '林建宏', duration: 30, status: 'pending', createdBy: '2', createdAt: new Date() },
        { id: '3', order: 3, title: '開發時程規劃', description: '', presenter: '全體', duration: 30, status: 'pending', createdBy: '2', createdAt: new Date() }
      ],
      attachments: [],
      conclusions: [],
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '7',
      title: '行銷策略會議',
      type: 'cross-department',
      status: 'scheduled',
      location: '線上會議',
      isOnline: true,
      meetingLink: 'https://meet.google.com/xyz-uvwx-rst',
      startTime: new Date(2025, 11, 23, 16, 0),
      endTime: new Date(2025, 11, 23, 17, 0),
      duration: 60,
      recurrence: 'none',
      reminders: [{ id: '1', timing: '15min', enabled: true }],
      organizer: this.mockAttendees[7],
      attendees: [this.mockAttendees[2], this.mockAttendees[5], this.mockAttendees[7]],
      agenda: [
        { id: '1', order: 1, title: 'Q1 行銷活動計畫', description: '', presenter: '黃雅婷', duration: 20, status: 'pending', createdBy: '8', createdAt: new Date() },
        { id: '2', order: 2, title: '預算與資源討論', description: '', presenter: '陳美玲', duration: 20, status: 'pending', createdBy: '8', createdAt: new Date() },
        { id: '3', order: 3, title: '業務配合事項', description: '', presenter: '張志遠', duration: 20, status: 'pending', createdBy: '8', createdAt: new Date() }
      ],
      attachments: [],
      conclusions: [],
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      title: '跨部門協調會議',
      type: 'cross-department',
      status: 'scheduled',
      location: '會議室 B',
      isOnline: false,
      startTime: new Date(2025, 11, 24, 14, 0),
      endTime: new Date(2025, 11, 24, 16, 0),
      duration: 120,
      recurrence: 'monthly',
      reminders: [{ id: '1', timing: '1day', enabled: true }, { id: '2', timing: '1hour', enabled: true }],
      organizer: this.mockAttendees[4],
      attendees: this.mockAttendees,
      agenda: [
        { id: '1', order: 1, title: '人力資源配置討論', description: '討論各部門人力需求', presenter: '周怡君', duration: 30, status: 'pending', createdBy: '5', createdAt: new Date() },
        { id: '2', order: 2, title: '預算分配協調', description: '協調各部門 Q1 預算', presenter: '陳美玲', duration: 40, status: 'pending', createdBy: '5', createdAt: new Date() },
        { id: '3', order: 3, title: '跨部門專案合作', description: '討論專案合作機制', presenter: '王大明', duration: 30, status: 'pending', createdBy: '5', createdAt: new Date() }
      ],
      attachments: [
        { id: '1', name: '部門人力需求表.xlsx', type: 'application/vnd.ms-excel', size: 150000, url: '#', uploadedBy: '周怡君', uploadedAt: new Date() },
        { id: '2', name: 'Q1預算規劃.pdf', type: 'application/pdf', size: 800000, url: '#', uploadedBy: '陳美玲', uploadedAt: new Date() }
      ],
      conclusions: [],
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      title: '新人培訓：公司制度介紹',
      type: 'training',
      status: 'scheduled',
      location: '培訓室',
      isOnline: false,
      startTime: new Date(2025, 11, 26, 9, 0),
      endTime: new Date(2025, 11, 26, 12, 0),
      duration: 180,
      recurrence: 'none',
      reminders: [{ id: '1', timing: '1day', enabled: true }],
      organizer: this.mockAttendees[4],
      attendees: [this.mockAttendees[4], this.mockAttendees[7]],
      agenda: [
        { id: '1', order: 1, title: '公司願景與文化', description: '', presenter: '周怡君', duration: 45, status: 'pending', createdBy: '5', createdAt: new Date() },
        { id: '2', order: 2, title: '人事制度說明', description: '', presenter: '周怡君', duration: 60, status: 'pending', createdBy: '5', createdAt: new Date() },
        { id: '3', order: 3, title: 'Q&A', description: '', presenter: '周怡君', duration: 30, status: 'pending', createdBy: '5', createdAt: new Date() }
      ],
      attachments: [
        { id: '1', name: '員工手冊.pdf', type: 'application/pdf', size: 5000000, url: '#', uploadedBy: '周怡君', uploadedAt: new Date() }
      ],
      conclusions: [],
      notes: '',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '5',
      title: '技術架構檢討會',
      type: 'review',
      status: 'completed',
      location: '會議室 A',
      isOnline: false,
      startTime: new Date(2025, 11, 18, 14, 0),
      endTime: new Date(2025, 11, 18, 16, 0),
      duration: 120,
      recurrence: 'none',
      reminders: [],
      organizer: this.mockAttendees[1],
      attendees: [this.mockAttendees[1], this.mockAttendees[3], this.mockAttendees[6]],
      agenda: [
        { id: '1', order: 1, title: '現有架構分析', description: '', presenter: '李小華', duration: 40, status: 'discussed', createdBy: '2', createdAt: new Date() },
        { id: '2', order: 2, title: '效能瓶頸討論', description: '', presenter: '林建宏', duration: 40, status: 'discussed', createdBy: '2', createdAt: new Date() },
        { id: '3', order: 3, title: '優化方案提案', description: '', presenter: '全體', duration: 40, status: 'discussed', createdBy: '2', createdAt: new Date() }
      ],
      attachments: [],
      conclusions: [
        { id: '1', content: '導入 Redis 快取機制', responsible: '林建宏', responsibleId: '4', department: '研發部', dueDate: new Date(2026, 0, 15), status: 'in-progress', progress: 40, progressNotes: [{ id: '1', content: '已完成技術評估，開始實作', progress: 40, createdBy: '林建宏', createdAt: new Date() }], createdAt: new Date() },
        { id: '2', content: '資料庫查詢優化', responsible: '李小華', responsibleId: '2', department: '研發部', dueDate: new Date(2026, 0, 10), status: 'overdue', progress: 30, progressNotes: [], createdAt: new Date() }
      ],
      notes: '確認需要進行架構優化，預計 Q1 完成。',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // 取得所有會議
  getMeetings(): Observable<Meeting[]> {
    return of(this.mockMeetings).pipe(delay(300));
  }

  // 取得單一會議
  getMeeting(id: string): Observable<Meeting | undefined> {
    const meeting = this.mockMeetings.find(m => m.id === id);
    return of(meeting).pipe(delay(200));
  }

  // 取得日曆事件
  getCalendarEvents(): Observable<CalendarEvent[]> {
    const events: CalendarEvent[] = this.mockMeetings.map(m => {
      const typeOption = MEETING_TYPE_OPTIONS.find(t => t.value === m.type);
      return {
        id: m.id,
        title: m.title,
        start: m.startTime,
        end: m.endTime,
        type: m.type,
        status: m.status,
        color: typeOption?.color || '#8DA399',
        meeting: m
      };
    });
    return of(events).pipe(delay(300));
  }

  // 取得出席人員列表
  getAttendees(): Observable<MeetingAttendee[]> {
    return of(this.mockAttendees).pipe(delay(200));
  }

  // 取得會議統計
  getMeetingStats(): Observable<MeetingStats> {
    const completed = this.mockMeetings.filter(m => m.status === 'completed');
    const allConclusions = this.mockMeetings.flatMap(m => m.conclusions);
    const completedConclusions = allConclusions.filter(c => c.status === 'completed');
    const overdueConclusions = allConclusions.filter(c => c.status === 'overdue');

    const stats: MeetingStats = {
      totalMeetings: this.mockMeetings.length,
      completedMeetings: completed.length,
      totalHours: this.mockMeetings.reduce((sum, m) => sum + m.duration, 0) / 60,
      avgDuration: this.mockMeetings.reduce((sum, m) => sum + m.duration, 0) / this.mockMeetings.length,
      conclusionCount: allConclusions.length,
      completedConclusions: completedConclusions.length,
      overdueConclusions: overdueConclusions.length,
      executionRate: allConclusions.length > 0 ? Math.round((completedConclusions.length / allConclusions.length) * 100) : 0
    };
    return of(stats).pipe(delay(200));
  }

  // 取得部門會議統計
  getDepartmentStats(): Observable<DepartmentMeetingStats[]> {
    const stats: DepartmentMeetingStats[] = [
      { department: '專案部', meetingCount: 12, totalHours: 18, conclusionCount: 24, completedCount: 18, executionRate: 75 },
      { department: '研發部', meetingCount: 15, totalHours: 22, conclusionCount: 30, completedCount: 21, executionRate: 70 },
      { department: '業務部', meetingCount: 8, totalHours: 10, conclusionCount: 16, completedCount: 14, executionRate: 88 },
      { department: '人資部', meetingCount: 6, totalHours: 8, conclusionCount: 12, completedCount: 11, executionRate: 92 },
      { department: '財務部', meetingCount: 5, totalHours: 6, conclusionCount: 10, completedCount: 9, executionRate: 90 },
      { department: '行銷部', meetingCount: 7, totalHours: 9, conclusionCount: 14, completedCount: 10, executionRate: 71 }
    ];
    return of(stats).pipe(delay(300));
  }

  // 取得個人會議負荷
  getPersonalMeetingLoad(): Observable<PersonalMeetingLoad[]> {
    const loads: PersonalMeetingLoad[] = [
      { employeeId: '1', employeeName: '王大明', weeklyMeetingHours: 12, pendingTasks: 5, overdueTasks: 1, attendedMeetings: 8 },
      { employeeId: '2', employeeName: '李小華', weeklyMeetingHours: 10, pendingTasks: 3, overdueTasks: 1, attendedMeetings: 7 },
      { employeeId: '3', employeeName: '張志遠', weeklyMeetingHours: 8, pendingTasks: 2, overdueTasks: 0, attendedMeetings: 5 },
      { employeeId: '4', employeeName: '林建宏', weeklyMeetingHours: 6, pendingTasks: 2, overdueTasks: 0, attendedMeetings: 4 },
      { employeeId: '5', employeeName: '周怡君', weeklyMeetingHours: 14, pendingTasks: 4, overdueTasks: 0, attendedMeetings: 10 }
    ];
    return of(loads).pipe(delay(200));
  }

  // 取得會議效能指標
  getMeetingEfficiency(): Observable<MeetingEfficiency> {
    const efficiency: MeetingEfficiency = {
      avgMeetingDuration: 75,
      conclusionsPerMeeting: 2.4,
      completionRate: 78,
      onTimeRate: 85,
      overdueCount: 3,
      overdueTrend: [5, 4, 6, 3, 4, 3]
    };
    return of(efficiency).pipe(delay(200));
  }

  // 取得待追蹤結論
  getPendingConclusions(): Observable<MeetingConclusion[]> {
    const conclusions = this.mockMeetings
      .flatMap(m => m.conclusions.map(c => ({ ...c, meetingTitle: m.title, meetingId: m.id })))
      .filter(c => c.status !== 'completed')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return of(conclusions as MeetingConclusion[]).pipe(delay(200));
  }
}

