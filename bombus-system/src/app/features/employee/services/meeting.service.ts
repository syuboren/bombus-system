import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
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
  private http = inject(HttpClient);
  private apiUrl = '/api/meetings';

  /**
   * Helper to map backend snake_case to frontend camelCase
   */
  private mapToMeeting(data: any): Meeting {
    return {
      ...data,
      startTime: new Date(data.start_time),
      endTime: new Date(data.end_time),
      isOnline: Boolean(data.is_online),
      meetingLink: data.meeting_link,
      recurrenceEndDate: data.recurrence_end_date ? new Date(data.recurrence_end_date) : undefined,
      createdAt: new Date(data.created_at),
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      attendeeCount: data.attendeeCount || data.attendee_count || 0,
      // Map nested arrays if they exist
      // 重要：統一使用員工 ID 作為 id，避免比對問題
      attendees: data.attendees?.map((a: any) => ({
        ...a,
        id: a.employee_id || a.id, // 統一使用員工 ID 作為 id
        attendeeRecordId: a.id, // 保留原始的出席記錄 ID（如果需要）
        employeeId: a.employee_id,
        employeeNo: a.employee_no, // 員工編號
        isOrganizer: Boolean(a.is_organizer),
        isRequired: Boolean(a.is_required),
        attendanceStatus: a.attendance_status,
        signedIn: Boolean(a.signed_in),
        signedInTime: a.signed_in_time ? new Date(a.signed_in_time) : undefined
      })) || [],
      agenda: data.agenda?.map((item: any) => ({
        ...item,
        order: item.order_index,
        discussionPoints: item.discussion_points || [],
        meetingId: item.meeting_id,
        createdBy: item.created_by,
        createdAt: new Date(item.created_at)
      })) || [],
      conclusions: data.conclusions?.map((c: any) => ({
        ...c,
        meetingId: c.meeting_id,
        agendaItemId: c.agenda_item_id,
        responsibleId: c.responsible_id,
        responsibleName: c.responsible_name,
        responsible: c.responsible_name || c.responsible || '', // 向後相容
        department: c.department || '',
        dueDate: c.due_date ? new Date(c.due_date) : undefined,
        createdAt: new Date(c.created_at),
        completedAt: c.completed_at ? new Date(c.completed_at) : undefined,
        progressNotes: typeof c.progress_notes === 'string' ? JSON.parse(c.progress_notes || '[]') : (c.progress_notes || [])
      })) || [],
      attachments: data.attachments?.map((f: any) => ({
        ...f,
        meetingId: f.meeting_id,
        uploadedBy: f.uploaded_by,
        uploadedAt: new Date(f.uploaded_at)
      })) || [],
      reminders: data.reminders || []
    };
  }

  // 取得所有會議
  getMeetings(filters?: {
    start?: Date;
    end?: Date;
    type?: string;
    scope?: 'company' | 'department' | 'personal';
    employeeId?: string;
    department?: string;
    orgUnitId?: string;
  }): Observable<Meeting[]> {
    let params = new HttpParams();
    if (filters?.start) params = params.set('start', filters.start.toISOString());
    if (filters?.end) params = params.set('end', filters.end.toISOString());
    if (filters?.type) params = params.set('type', filters.type);
    if (filters?.scope) params = params.set('scope', filters.scope);
    if (filters?.employeeId) params = params.set('employeeId', filters.employeeId);
    if (filters?.department) params = params.set('department', filters.department);
    if (filters?.orgUnitId) params = params.set('org_unit_id', filters.orgUnitId);

    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(list => list.map(item => this.mapToMeeting(item)))
    );
  }

  // 取得單一會議詳情
  getMeeting(id: string): Observable<Meeting> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(data => this.mapToMeeting(data))
    );
  }

  // 建立會議
  createMeeting(meeting: Partial<Meeting>): Observable<Meeting> {
    // Convert to simplified payload if necessary, but backend handles most
    return this.http.post<any>(this.apiUrl, meeting).pipe(
      map(data => this.mapToMeeting(data))
    );
  }

  // 更新會議
  updateMeeting(id: string, meeting: Partial<Meeting>): Observable<Meeting> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, meeting).pipe(
      map(data => this.mapToMeeting(data))
    );
  }

  // 取消會議 (軟刪除)
  cancelMeeting(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}?softDelete=true`);
  }

  // 刪除會議 (硬刪除)
  deleteMeeting(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  // 完成會議（更新狀態並新增結論）
  completeMeeting(id: string, data: {
    notes: string;
    conclusions: Array<{
      content: string;
      responsibleId: string;
      responsibleName: string;
      department: string;
      dueDate: string;
    }>;
  }): Observable<Meeting> {
    return this.http.patch<any>(`${this.apiUrl}/${id}/complete`, data).pipe(
      map(res => this.mapToMeeting(res))
    );
  }

  // 取得所有結論（含來源會議資訊）
  getConclusions(filters?: { status?: string; department?: string }): Observable<any[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.department) params = params.set('department', filters.department);
    return this.http.get<any[]>(`${this.apiUrl}/conclusions`, { params });
  }

  // 線上簽到
  checkIn(meetingId: string, employeeId: string): Observable<{ success: boolean, signedInTime: string }> {
    return this.http.post<{ success: boolean, signedInTime: string }>(`${this.apiUrl}/${meetingId}/check-in`, { employeeId });
  }

  // 簽到出席者（別名）
  signInAttendee(meetingId: string, attendeeId: string): Observable<{ success: boolean, signedInTime: string }> {
    return this.checkIn(meetingId, attendeeId);
  }

  // 新增結論/待辦
  addConclusion(meetingId: string, conclusion: Partial<MeetingConclusion>): Observable<any> {
    return this.http.post(`${this.apiUrl}/${meetingId}/conclusions`, conclusion);
  }

  // 更新結論進度
  updateConclusionProgress(id: string, progress: number, status?: string, note?: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/conclusions/${id}`, { progress, status, note });
  }

  // 上傳附件
  uploadAttachment(meetingId: string, file: File, uploadedBy: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadedBy', uploadedBy);
    // 傳遞原始檔名以避免編碼問題
    formData.append('originalName', file.name);
    return this.http.post(`${this.apiUrl}/${meetingId}/upload`, formData);
  }

  // 取得日曆事件
  getCalendarEvents(filters?: {
    scope?: 'company' | 'department' | 'personal';
    employeeId?: string;
    department?: string;
  }): Observable<CalendarEvent[]> {
    return this.getMeetings(filters).pipe(
      map(meetings => meetings.map(m => {
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
      }))
    );
  }

  // 取得部門列表
  getDepartments(): Observable<string[]> {
    return this.http.get<string[]>('/api/employee/departments');
  }

  // 取得出席人員列表 (從員工 API 取得)
  getAttendees(): Observable<MeetingAttendee[]> {
    return this.http.get<any[]>('/api/employee/list').pipe(
      map(employees => employees.map(emp => ({
        id: emp.id,
        employeeId: emp.id, // 明確設置 employeeId，確保 ID 一致性
        employeeNo: emp.employee_no, // 員工編號（用於顯示）
        name: emp.name,
        department: emp.department,
        position: emp.position,
        avatar: emp.avatar,
        email: emp.email,
        isOrganizer: false,
        isRequired: true,
        attendanceStatus: 'pending',
        signedIn: false
      })))
    );
  }

  // 取得會議統計
  getMeetingStats(orgUnitId?: string): Observable<MeetingStats> {
    let params = new HttpParams();
    if (orgUnitId) params = params.set('org_unit_id', orgUnitId);

    return this.http.get<any>(`${this.apiUrl}/dashboard/stats`, { params }).pipe(
      map(stats => ({
        ...stats,
        executionRate: stats.executionRate || 0
      }))
    );
  }

  // 取得部門會議統計 (Mock for now or implement backend)
  getDepartmentStats(): Observable<DepartmentMeetingStats[]> {
    // Placeholder as backend doesn't implement this yet
    return of([]);
  }

  // 取得個人會議負荷 (Mock)
  getPersonalMeetingLoad(): Observable<PersonalMeetingLoad[]> {
    return of([]);
  }

  // 取得會議效能指標 (Mock)
  getMeetingEfficiency(): Observable<MeetingEfficiency> {
    return of({
      avgMeetingDuration: 0,
      conclusionsPerMeeting: 0,
      completionRate: 0,
      onTimeRate: 0,
      overdueCount: 0,
      overdueTrend: []
    });
  }

  // 取得待追蹤結論
  getPendingConclusions(): Observable<MeetingConclusion[]> {
    // Could implement GET /api/meetings/conclusions?status=pending
    // For now, fetch all meetings and filter
    return this.getMeetings().pipe(
      map(meetings => {
        return meetings
          .flatMap(m => m.conclusions?.map(c => ({ ...c, meetingTitle: m.title, meetingId: m.id })) || [])
          .filter(c => c.status !== 'completed')
          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      })
    );
  }
}

