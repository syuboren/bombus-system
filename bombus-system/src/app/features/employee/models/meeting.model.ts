// 會議類型
export type MeetingType = 'cross-department' | 'project' | 'regular' | 'training' | 'review' | 'other';

// 會議週期
export type MeetingRecurrence = 'none' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

// 會議狀態
export type MeetingStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

// 議程項目狀態
export type AgendaItemStatus = 'pending' | 'discussed' | 'deferred';

// 結論執行狀態
export type ConclusionStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

// 提醒設定
export interface MeetingReminder {
  id: string;
  timing: '1day' | '1hour' | '15min';
  enabled: boolean;
}

// 出席人員
export interface MeetingAttendee {
  id: string;
  name: string;
  department: string;
  position: string;
  avatar: string;
  email: string;
  isOrganizer: boolean;
  isRequired: boolean;
  attendanceStatus: 'pending' | 'accepted' | 'declined' | 'tentative';
  signedIn: boolean;
  signedInTime?: Date;
  signature?: string;
}

// 議程項目
export interface AgendaItem {
  id: string;
  order: number;
  title: string;
  description: string;
  presenter: string;
  duration: number; // 分鐘
  status: AgendaItemStatus;
  createdBy: string;
  createdAt: Date;
}

// 會議附件
export interface MeetingAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

// 會議結論
export interface MeetingConclusion {
  id: string;
  agendaItemId?: string;
  content: string;
  responsible: string;
  responsibleId: string;
  department: string;
  dueDate: Date;
  status: ConclusionStatus;
  progress: number; // 0-100
  progressNotes: ProgressNote[];
  createdAt: Date;
  completedAt?: Date;
}

// 進度備註
export interface ProgressNote {
  id: string;
  content: string;
  progress: number;
  createdBy: string;
  createdAt: Date;
}

// 會議
export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  location: string;
  isOnline: boolean;
  meetingLink?: string;
  startTime: Date;
  endTime: Date;
  duration: number; // 分鐘
  recurrence: MeetingRecurrence;
  recurrenceEndDate?: Date;
  reminders: MeetingReminder[];
  organizer: MeetingAttendee;
  attendees: MeetingAttendee[];
  agenda: AgendaItem[];
  attachments: MeetingAttachment[];
  conclusions: MeetingConclusion[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// 會議統計
export interface MeetingStats {
  totalMeetings: number;
  completedMeetings: number;
  totalHours: number;
  avgDuration: number;
  conclusionCount: number;
  completedConclusions: number;
  overdueConclusions: number;
  executionRate: number;
}

// 部門會議統計
export interface DepartmentMeetingStats {
  department: string;
  meetingCount: number;
  totalHours: number;
  conclusionCount: number;
  completedCount: number;
  executionRate: number;
}

// 個人會議負荷
export interface PersonalMeetingLoad {
  employeeId: string;
  employeeName: string;
  weeklyMeetingHours: number;
  pendingTasks: number;
  overdueTasks: number;
  attendedMeetings: number;
}

// 會議效能指標
export interface MeetingEfficiency {
  avgMeetingDuration: number;
  conclusionsPerMeeting: number;
  completionRate: number;
  onTimeRate: number;
  overdueCount: number;
  overdueTrend: number[]; // 近6個月趨勢
}

// 日曆事件（用於日曆顯示）
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: MeetingType;
  status: MeetingStatus;
  color: string;
  meeting: Meeting;
}

// 會議類型選項
export const MEETING_TYPE_OPTIONS: { value: MeetingType; label: string; icon: string; color: string }[] = [
  { value: 'cross-department', label: '跨部門會議', icon: 'ri-team-line', color: '#8DA399' },
  { value: 'project', label: '專案會議', icon: 'ri-folder-chart-line', color: '#9A8C98' },
  { value: 'regular', label: '例行會議', icon: 'ri-calendar-check-line', color: '#D6A28C' },
  { value: 'training', label: '培訓會議', icon: 'ri-book-open-line', color: '#B8C4A8' },
  { value: 'review', label: '檢討會議', icon: 'ri-search-eye-line', color: '#C4B8A8' },
  { value: 'other', label: '其他', icon: 'ri-more-line', color: '#A8B8C4' }
];

// 週期選項
export const RECURRENCE_OPTIONS: { value: MeetingRecurrence; label: string }[] = [
  { value: 'none', label: '不重複' },
  { value: 'weekly', label: '每週' },
  { value: 'biweekly', label: '每兩週' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每季' }
];

// 提醒選項
export const REMINDER_OPTIONS: { value: '1day' | '1hour' | '15min'; label: string }[] = [
  { value: '1day', label: '會前 1 天' },
  { value: '1hour', label: '會前 1 小時' },
  { value: '15min', label: '會前 15 分鐘' }
];

