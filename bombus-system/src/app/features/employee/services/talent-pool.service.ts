import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import {
  TalentCandidate,
  TalentContactHistory,
  TalentReminder,
  TalentMatchResult,
  TalentPoolStats,
  TalentTag,
  TalentSource,
  TalentStatus,
  ContactPriority
} from '../models/talent-pool.model';

// API 回應介面
interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}

interface TalentListResponse {
  talents: ApiTalent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API 回傳的人才資料格式 (snake_case)
interface ApiTalent {
  id: string;
  candidate_id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  current_position?: string;
  current_company?: string;
  experience_years?: number;
  education?: string;
  expected_salary?: string;
  skills?: string;
  resume_url?: string;
  source?: string;
  status?: string;
  match_score?: number;
  contact_priority?: string;
  decline_stage?: string;
  decline_reason?: string;
  original_job_id?: string;
  original_job_title?: string;
  added_date?: string;
  last_contact_date?: string;
  next_contact_date?: string;
  contact_count?: number;
  notes?: string;
  tags?: { id: string; name: string; color: string; category?: string }[];
}

interface ApiContact {
  id: string;
  talent_id: string;
  contact_date: string;
  contact_method?: string;
  contact_by?: string;
  summary?: string;
  outcome?: string;
  next_action?: string;
  next_action_date?: string;
}

interface ApiReminder {
  id: string;
  talent_id: string;
  candidate_name?: string;
  reminder_date: string;
  reminder_type?: string;
  message?: string;
  is_completed?: number;
  completed_at?: string;
  assigned_to?: string;
}

interface ApiTag {
  id: string;
  name: string;
  color?: string;
  category?: string;
  description?: string;
  usage_count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TalentPoolService {
  private http = inject(HttpClient);
  private baseUrl = '/api/talent-pool';

  // =====================================================
  // 統計資料
  // =====================================================

  getTalentPoolStats(): Observable<TalentPoolStats> {
    return this.http.get<ApiResponse<TalentPoolStats>>(`${this.baseUrl}/stats`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error fetching talent pool stats:', error);
        return of(this.getDefaultStats());
      })
    );
  }

  private getDefaultStats(): TalentPoolStats {
    return {
      totalCandidates: 0,
      activeCount: 0,
      contactedThisMonth: 0,
      hiredThisYear: 0,
      avgMatchScore: 0,
      sourceBreakdown: [],
      statusBreakdown: [],
      upcomingReminders: 0
    };
  }

  // =====================================================
  // 人才 CRUD
  // =====================================================

  getCandidates(filters?: {
    status?: TalentStatus;
    source?: TalentSource;
    priority?: ContactPriority;
    search?: string;
    tags?: string[];
    minScore?: number;
    maxScore?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Observable<{ talents: TalentCandidate[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.source) params = params.set('source', filters.source);
      if (filters.priority) params = params.set('priority', filters.priority);
      if (filters.search) params = params.set('search', filters.search);
      if (filters.tags?.length) params = params.set('tags', filters.tags.join(','));
      if (filters.minScore) params = params.set('minScore', filters.minScore.toString());
      if (filters.maxScore) params = params.set('maxScore', filters.maxScore.toString());
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params = params.set('sortOrder', filters.sortOrder);
    }

    return this.http.get<ApiResponse<TalentListResponse>>(`${this.baseUrl}`, { params }).pipe(
      map(response => ({
        talents: response.data.talents.map(t => this.mapApiTalentToCandidate(t)),
        pagination: response.data.pagination
      })),
      catchError(error => {
        console.error('Error fetching candidates:', error);
        return of({ talents: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );
  }

  getCandidateById(id: string): Observable<TalentCandidate | undefined> {
    return this.http.get<ApiResponse<ApiTalent & { contactHistory: ApiContact[]; reminders: ApiReminder[] }>>(`${this.baseUrl}/${id}`).pipe(
      map(response => this.mapApiTalentToCandidate(response.data)),
      catchError(error => {
        console.error('Error fetching candidate:', error);
        return of(undefined);
      })
    );
  }

  addCandidate(candidate: Partial<TalentCandidate>): Observable<{ id: string } | null> {
    const apiData = this.mapCandidateToApiTalent(candidate);
    return this.http.post<ApiResponse<{ id: string }>>(`${this.baseUrl}`, apiData).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error adding candidate:', error);
        return of(null);
      })
    );
  }

  updateCandidate(id: string, updates: Partial<TalentCandidate>): Observable<boolean> {
    const apiData = this.mapCandidateToApiTalent(updates);
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/${id}`, apiData).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating candidate:', error);
        return of(false);
      })
    );
  }

  deleteCandidate(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting candidate:', error);
        return of(false);
      })
    );
  }

  updateCandidateStatus(candidateId: string, status: TalentStatus): Observable<boolean> {
    return this.updateCandidate(candidateId, { status });
  }

  // =====================================================
  // 聯繫紀錄
  // =====================================================

  getContactHistory(candidateId: string): Observable<TalentContactHistory[]> {
    return this.http.get<ApiResponse<ApiContact[]>>(`${this.baseUrl}/${candidateId}/contacts`).pipe(
      map(response => response.data.map(c => this.mapApiContactToHistory(c, candidateId))),
      catchError(error => {
        console.error('Error fetching contact history:', error);
        return of([]);
      })
    );
  }

  addContact(candidateId: string, contact: Partial<TalentContactHistory>): Observable<boolean> {
    const apiData = {
      contactDate: contact.contactDate?.toISOString(),
      contactMethod: contact.contactMethod,
      contactBy: contact.contactBy,
      summary: contact.summary,
      outcome: contact.outcome,
      nextAction: contact.nextAction,
      nextActionDate: contact.nextActionDate?.toISOString()
    };
    
    return this.http.post<ApiResponse<{ id: string }>>(`${this.baseUrl}/${candidateId}/contacts`, apiData).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error adding contact:', error);
        return of(false);
      })
    );
  }

  // =====================================================
  // 提醒事項
  // =====================================================

  getReminders(filters?: { completed?: boolean; upcoming?: boolean; assignedTo?: string }): Observable<TalentReminder[]> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.completed !== undefined) params = params.set('completed', filters.completed.toString());
      if (filters.upcoming) params = params.set('upcoming', 'true');
      if (filters.assignedTo) params = params.set('assignedTo', filters.assignedTo);
    }

    return this.http.get<ApiResponse<ApiReminder[]>>(`${this.baseUrl}/reminders/list`, { params }).pipe(
      map(response => response.data.map(r => this.mapApiReminderToReminder(r))),
      catchError(error => {
        console.error('Error fetching reminders:', error);
        return of([]);
      })
    );
  }

  addReminder(candidateId: string, reminder: Partial<TalentReminder>): Observable<boolean> {
    const apiData = {
      reminderDate: reminder.reminderDate?.toISOString(),
      reminderType: reminder.reminderType,
      message: reminder.message,
      assignedTo: reminder.assignedTo
    };
    
    return this.http.post<ApiResponse<{ id: string }>>(`${this.baseUrl}/${candidateId}/reminders`, apiData).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error adding reminder:', error);
        return of(false);
      })
    );
  }

  updateReminder(reminderId: string, updates: Partial<TalentReminder>): Observable<boolean> {
    const apiData: Record<string, unknown> = {};
    if (updates.isCompleted !== undefined) apiData['isCompleted'] = updates.isCompleted;
    if (updates.reminderDate) apiData['reminderDate'] = updates.reminderDate.toISOString();
    if (updates.reminderType) apiData['reminderType'] = updates.reminderType;
    if (updates.message) apiData['message'] = updates.message;
    if (updates.assignedTo) apiData['assignedTo'] = updates.assignedTo;

    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/reminders/${reminderId}`, apiData).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating reminder:', error);
        return of(false);
      })
    );
  }

  completeReminder(reminderId: string): Observable<boolean> {
    return this.updateReminder(reminderId, { isCompleted: true });
  }

  deleteReminder(reminderId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/reminders/${reminderId}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting reminder:', error);
        return of(false);
      })
    );
  }

  // =====================================================
  // 標籤管理
  // =====================================================

  getTags(category?: string): Observable<TalentTag[]> {
    let params = new HttpParams();
    if (category) params = params.set('category', category);

    return this.http.get<ApiResponse<ApiTag[]>>(`${this.baseUrl}/tags/list`, { params }).pipe(
      map(response => response.data.map(t => this.mapApiTagToTag(t))),
      catchError(error => {
        console.error('Error fetching tags:', error);
        return of([]);
      })
    );
  }

  addTag(tag: Partial<TalentTag>): Observable<TalentTag | null> {
    return this.http.post<ApiResponse<TalentTag>>(`${this.baseUrl}/tags`, tag).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error adding tag:', error);
        return of(null);
      })
    );
  }

  updateTag(tagId: string, updates: Partial<TalentTag>): Observable<boolean> {
    return this.http.put<ApiResponse<void>>(`${this.baseUrl}/tags/${tagId}`, updates).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error updating tag:', error);
        return of(false);
      })
    );
  }

  deleteTag(tagId: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/tags/${tagId}`).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error deleting tag:', error);
        return of(false);
      })
    );
  }

  setTalentTags(talentId: string, tagIds: string[]): Observable<boolean> {
    return this.http.post<ApiResponse<void>>(`${this.baseUrl}/${talentId}/tags`, { tagIds }).pipe(
      map(() => true),
      catchError(error => {
        console.error('Error setting tags:', error);
        return of(false);
      })
    );
  }

  // =====================================================
  // 職缺媒合
  // =====================================================

  getMatchResults(candidateId: string): Observable<TalentMatchResult[]> {
    // TODO: 實作 AI 媒合 API
    // 目前回傳空陣列，待後續整合 AI 服務
    return of([]);
  }

  // =====================================================
  // 從招募流程匯入
  // =====================================================

  importFromCandidate(candidateId: string, declineStage: string, declineReason?: string): Observable<{ id: string } | null> {
    return this.http.post<ApiResponse<{ id: string }>>(`${this.baseUrl}/import-from-candidate`, {
      candidateId,
      declineStage,
      declineReason
    }).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Error importing candidate:', error);
        return of(null);
      })
    );
  }

  // =====================================================
  // 資料映射 (API snake_case -> Frontend camelCase)
  // =====================================================

  private mapApiTalentToCandidate(api: ApiTalent): TalentCandidate {
    return {
      id: api.id,
      name: api.name,
      email: api.email || '',
      phone: api.phone || '',
      avatar: api.avatar,
      currentPosition: api.current_position || '',
      currentCompany: api.current_company || '',
      experience: api.experience_years || 0,
      education: api.education || '',
      expectedSalary: api.expected_salary,
      source: (api.source || 'other') as TalentSource,
      status: (api.status || 'active') as TalentStatus,
      tags: (api.tags || []).map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        category: (t.category || 'custom') as 'skill' | 'experience' | 'education' | 'personality' | 'custom'
      })),
      skills: api.skills ? (typeof api.skills === 'string' ? JSON.parse(api.skills) : api.skills) : [],
      matchScore: api.match_score || 0,
      addedDate: api.added_date ? new Date(api.added_date) : new Date(),
      lastContactDate: api.last_contact_date ? new Date(api.last_contact_date) : undefined,
      nextContactDate: api.next_contact_date ? new Date(api.next_contact_date) : undefined,
      contactPriority: (api.contact_priority || 'medium') as ContactPriority,
      notes: api.notes || '',
      resumeUrl: api.resume_url
    };
  }

  private mapCandidateToApiTalent(candidate: Partial<TalentCandidate>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    
    if (candidate.name !== undefined) result['name'] = candidate.name;
    if (candidate.email !== undefined) result['email'] = candidate.email;
    if (candidate.phone !== undefined) result['phone'] = candidate.phone;
    if (candidate.avatar !== undefined) result['avatar'] = candidate.avatar;
    if (candidate.currentPosition !== undefined) result['currentPosition'] = candidate.currentPosition;
    if (candidate.currentCompany !== undefined) result['currentCompany'] = candidate.currentCompany;
    if (candidate.experience !== undefined) result['experienceYears'] = candidate.experience;
    if (candidate.education !== undefined) result['education'] = candidate.education;
    if (candidate.expectedSalary !== undefined) result['expectedSalary'] = candidate.expectedSalary;
    if (candidate.source !== undefined) result['source'] = candidate.source;
    if (candidate.status !== undefined) result['status'] = candidate.status;
    if (candidate.skills !== undefined) result['skills'] = candidate.skills;
    if (candidate.matchScore !== undefined) result['matchScore'] = candidate.matchScore;
    if (candidate.contactPriority !== undefined) result['contactPriority'] = candidate.contactPriority;
    if (candidate.notes !== undefined) result['notes'] = candidate.notes;
    if (candidate.resumeUrl !== undefined) result['resumeUrl'] = candidate.resumeUrl;
    if (candidate.tags !== undefined) result['tags'] = candidate.tags.map(t => t.id);
    if (candidate.nextContactDate !== undefined) {
      result['nextContactDate'] = candidate.nextContactDate?.toISOString();
    }
    
    return result;
  }

  private mapApiContactToHistory(api: ApiContact, candidateId: string): TalentContactHistory {
    return {
      id: api.id,
      candidateId: candidateId,
      contactDate: new Date(api.contact_date),
      contactMethod: (api.contact_method || 'email') as 'phone' | 'email' | 'interview' | 'meeting',
      contactBy: api.contact_by || '',
      summary: api.summary || '',
      outcome: (api.outcome || 'neutral') as 'positive' | 'neutral' | 'negative' | 'no-response',
      nextAction: api.next_action,
      nextActionDate: api.next_action_date ? new Date(api.next_action_date) : undefined
    };
  }

  private mapApiReminderToReminder(api: ApiReminder): TalentReminder {
    return {
      id: api.id,
      candidateId: api.talent_id,
      candidateName: api.candidate_name || '',
      reminderDate: new Date(api.reminder_date),
      reminderType: (api.reminder_type || 'contact') as 'contact' | 'follow-up' | 'interview' | 'offer',
      message: api.message || '',
      isCompleted: api.is_completed === 1,
      assignedTo: api.assigned_to || ''
    };
  }

  private mapApiTagToTag(api: ApiTag): TalentTag {
    return {
      id: api.id,
      name: api.name,
      color: api.color || '#3B82F6',
      category: (api.category || 'custom') as 'skill' | 'experience' | 'education' | 'personality' | 'custom'
    };
  }
}
