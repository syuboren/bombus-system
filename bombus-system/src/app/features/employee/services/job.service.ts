import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay, map, catchError } from 'rxjs';
import {
  Job,
  JobCandidate,
  CandidateDetail,
  JobStats,
  CandidateStats,
  JobStatus,
  Job104,
  Job104Response,
  Job104CreateRequest
} from '../models/job.model';

const API_104_BASE = '/api/jobs/104';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly http = inject(HttpClient);



  private readonly JOBS_API = '/api/jobs';

  getJobs(): Observable<Job[]> {
    return this.http.get<{ status: string; data: any[] }>(`${this.JOBS_API}`).pipe(
      map(response => response.data.map(job => this.mapDbJobToLocal(job))),
      catchError(error => {
        console.error('Failed to fetch jobs:', error);
        return of([]);
      })
    );
  }

  /**
   * 取得已同步 104 的職缺（從資料庫）
   * 用於「104 職缺」分頁，顯示已關聯 104 的職缺
   */
  getSynced104Jobs(): Observable<Job[]> {
    return this.http.get<{ status: string; data: any[] }>(`${this.JOBS_API}`).pipe(
      map(response => response.data
        .filter(job => job.job104_no)  // 只取有 104 編號的職缺
        .map(job => this.mapDbJobToLocal(job))
      ),
      catchError(error => {
        console.error('Failed to fetch synced 104 jobs:', error);
        return of([]);
      })
    );
  }


  /**
   * 取得單一職缺詳情（含 job104_data）
   */
  getJobById(jobId: string): Observable<any> {
    return this.http.get<{ status: string; data: any }>(`${this.JOBS_API}/${jobId}`).pipe(
      map(response => response.data),
      catchError(error => {
        console.error('Failed to fetch job by id:', error);
        return of(null);
      })
    );
  }


  getJobStats(): Observable<JobStats> {
    return this.http.get<{ status: string; data: any }>(`${this.JOBS_API}/stats/summary`).pipe(
      map(response => ({
        activeJobs: response.data?.activeJobs || 0,
        newResumes: 45,  // TODO: 從實際資料取得
        pendingReview: 28,
        scheduledInterviews: 8
      })),
      catchError(() => of({
        activeJobs: 0,
        newResumes: 0,
        pendingReview: 0,
        scheduledInterviews: 0
      }))
    );
  }

  getCandidates(jobId?: string): Observable<JobCandidate[]> {
    if (!jobId) return of([]);

    return this.http.get<{ status: string; data: any[] }>(`${this.JOBS_API}/${jobId}/candidates`).pipe(
      map(response => response.data.map(c => this.mapDbCandidateToLocal(c))),
      catchError(error => {
        console.error('Failed to fetch candidates:', error);
        return of([]);
      })
    );
  }

  getCandidateStats(): Observable<CandidateStats> {
    return of({
      total: 15,
      pending: 3,
      aiRecommended: 5,
      scheduled: 2
    }).pipe(delay(200));
  }

  getCandidateDetail(candidateId: string): Observable<CandidateDetail | null> {
    // 暫時返回一個基本的 mock 物件，以避免 build error
    const detail: CandidateDetail = {
      id: candidateId,
      name: '模擬候選人',
      nameEn: 'Mock Candidate',
      email: 'mock@example.com',
      applyDate: '2026-01-01',
      education: 'Mock University',
      experience: 'Mock Experience',
      experienceYears: 1,
      skills: ['Mock Skill'],
      matchScore: 80,
      scoreLevel: 'medium',
      status: 'new',
      resumeUrl: '',
      aiAnalysis: {
        matchScore: 80,
        skills: [],
        experiences: [],
        education: { school: '', degree: '', major: '', verified: false }
      }
    };
    return of(detail).pipe(delay(300));
  }

  /**
   * 新增職缺 (可選同步至 104)
   */
  createJob(job: Partial<Job> & { syncTo104?: boolean; job104Data?: any }): Observable<Job> {
    const payload = {
      title: job.title,
      department: job.department,
      description: job.description || '',
      recruiter: job.recruiter || 'HR Admin',
      syncTo104: job.syncTo104 || false,
      job104Data: job.job104Data || null
    };

    return this.http.post<{ status: string; data: any }>(`${this.JOBS_API}`, payload).pipe(
      map(response => this.mapDbJobToLocal(response.data)),
      catchError(error => {
        console.error('Failed to create job:', error);
        throw error;
      })
    );
  }

  /**
   * 將現有職缺同步至 104
   */
  syncJobTo104(jobId: string, job104Data: any): Observable<{ job104No: string; syncStatus: string } | null> {
    return this.http.post<{ status: string; data: any }>(`${this.JOBS_API}/${jobId}/sync-104`, { job104Data }).pipe(
      map(response => ({
        job104No: response.data?.job104_no,
        syncStatus: response.data?.sync_status
      })),
      catchError(error => {
        console.error('Failed to sync job to 104:', error);
        return of(null);
      })
    );
  }

  /**
   * 從 104 同步最新資料回本地
   */
  syncFrom104(jobId: string): Observable<{ job104Data: any; syncedAt: string } | null> {
    return this.http.post<{ status: string; data: any; message?: string }>(`${this.JOBS_API}/${jobId}/sync-from-104`, {}).pipe(
      map(response => ({
        job104Data: response.data?.job104_data,
        syncedAt: response.data?.synced_at
      })),
      catchError(error => {
        console.error('Failed to sync from 104:', error);
        return of(null);
      })
    );
  }


  /**
   * 更新職缺
   */
  updateJob(jobId: string, jobData: Partial<Job>): Observable<boolean> {
    return this.http.put<{ status: string }>(`${this.JOBS_API}/${jobId}`, jobData).pipe(
      map(response => response.status === 'success'),
      catchError(error => {
        console.error('Failed to update job:', error);
        return of(false);
      })
    );
  }

  /**
   * 更新職缺狀態
   */
  updateStatus(jobId: string, status: JobStatus): Observable<any> {
    return this.http.patch<{ status: string; sync104?: any }>(`${this.JOBS_API}/${jobId}/status`, { status }).pipe(
      map(response => response),  // 返回完整回應，包含 sync104
      catchError(error => {
        console.error('Failed to update job status:', error);
        return of(false);
      })
    );
  }


  /**
   * 刪除職缺
   */
  deleteJob(jobId: string): Observable<boolean> {
    return this.http.delete<{ status: string }>(`${this.JOBS_API}/${jobId}`).pipe(
      map(response => response.status === 'success'),
      catchError(error => {
        console.error('Failed to delete job:', error);
        return of(false);
      })
    );
  }

  /**
   * 將 DB 職缺格式轉為前端格式
   */
  private mapDbJobToLocal(dbJob: any): Job {
    return {
      id: dbJob.id,
      title: dbJob.title,
      department: dbJob.department || '',
      description: dbJob.description || '',  // 加入 description 欄位
      publishDate: dbJob.publish_date || dbJob.synced_at?.split('T')[0] || null,
      newCandidates: dbJob.new_candidates || 0,
      totalCandidates: dbJob.total_candidates || 0,
      status: (dbJob.status as any) || 'draft',
      recruiter: dbJob.recruiter || 'HR Admin',
      source: dbJob.job104_no ? '104' : 'internal',
      job104No: dbJob.job104_no || undefined,
      syncStatus: dbJob.sync_status || 'local_only'
    };
  }


  getStatusLabel(status: JobStatus): string {
    const labels: Record<JobStatus, string> = {
      published: '刊登中',
      draft: '草稿',
      review: '審核中',
      closed: '已關閉'
    };
    return labels[status];
  }

  getStatusIcon(status: JobStatus): string {
    const icons: Record<JobStatus, string> = {
      published: 'ri-checkbox-circle-line',
      draft: 'ri-file-edit-line',
      review: 'ri-time-line',
      closed: 'ri-close-circle-line'
    };
    return icons[status];
  }

  // ============================================================
  // 104 Job API 整合方法
  // ============================================================

  /**
   * 取得 104 職缺列表
   */
  get104Jobs(limit = 10, offset = 0): Observable<Job[]> {
    return this.http.get<Job104Response>(`${API_104_BASE}/jobs`, {
      params: { limit: limit.toString(), offset: offset.toString() }
    }).pipe(
      map(response => {
        const jobs = Array.isArray(response.data) ? response.data : [response.data];
        return jobs.map(job104 => this.mapJob104ToLocal(job104));
      }),
      catchError(error => {
        console.error('Failed to fetch 104 jobs:', error);
        return of([]);
      })
    );
  }

  /**
   * 取得 104 單一職缺詳情
   */
  get104JobDetail(jobNo: string): Observable<Job | null> {
    return this.http.get<Job104Response>(`${API_104_BASE}/jobs/${jobNo}`).pipe(
      map(response => {
        const job104 = response.data as Job104;
        return this.mapJob104ToLocal(job104);
      }),
      catchError(error => {
        console.error(`Failed to fetch 104 job detail (${jobNo}):`, error);
        return of(null);
      })
    );
  }

  /**
   * 新增職缺至 104
   */
  create104Job(jobData: Job104CreateRequest): Observable<Job | null> {
    return this.http.post<Job104Response>(`${API_104_BASE}/jobs`, jobData).pipe(
      map(response => {
        const job104 = response.data as Job104;
        return this.mapJob104ToLocal(job104);
      }),
      catchError(error => {
        console.error('Failed to create 104 job:', error);
        return of(null);
      })
    );
  }

  /**
   * 更新 104 職缺
   */
  update104Job(jobNo: string, jobData: Partial<Job104CreateRequest>): Observable<Job | null> {
    return this.http.put<Job104Response>(`${API_104_BASE}/jobs/${jobNo}`, jobData).pipe(
      map(response => {
        const job104 = response.data as Job104;
        return this.mapJob104ToLocal(job104);
      }),
      catchError(error => {
        console.error(`Failed to update 104 job (${jobNo}):`, error);
        return of(null);
      })
    );
  }

  /**
   * 刪除/下架 104 職缺
   */
  delete104Job(jobNo: string): Observable<boolean> {
    return this.http.delete<{ status: string }>(`${API_104_BASE}/jobs/${jobNo}`).pipe(
      map(response => response.status === 'success'),
      catchError(error => {
        console.error(`Failed to delete 104 job (${jobNo}):`, error);
        return of(false);
      })
    );
  }

  /**
   * 更新 104 職缺狀態 (開啟/關閉)
   */
  patch104JobStatus(jobNo: string, status: 'on' | 'off'): Observable<boolean> {
    return this.http.patch<{ status: string }>(`${API_104_BASE}/jobs/${jobNo}`, { switch: status }).pipe(
      map(response => response.status === 'success'),
      catchError(error => {
        console.error(`Failed to patch 104 job status (${jobNo}):`, error);
        return of(false);
      })
    );
  }

  // ============================================================
  // 資料轉換方法
  // ============================================================

  /**
   * 將 104 職缺格式轉為本地格式
   */
  mapJob104ToLocal(job104: Job104): Job {
    return {
      id: job104.internalId || job104.jobNo,
      title: job104.jobTitle,
      department: job104.workPlace?.city || '未指定',
      description: '',  // 104 API 列表不返回 description，編輯時需另外獲取
      publishDate: new Date().toISOString().split('T')[0],
      newCandidates: 0,
      totalCandidates: 0,
      status: job104.internalStatus || (job104.switch === 'on' ? 'published' : 'draft'),
      recruiter: 'HR Admin',
      source: '104',
      job104No: job104.jobNo,
      syncStatus: '104_synced'
    };
  }


  /**
   * 將本地格式轉為 104 新增請求格式
   * 注意：104 API 有很多必填欄位，這裡填入預設值
   */
  mapLocalToJob104(job: Partial<Job>): Job104CreateRequest {
    return {
      role: 1,                                    // 全職
      job: job.title || '職缺名稱',               // 職缺名稱
      jobCatSet: [2007001004],                  // 預設: 軟體工程類 (API 需為數字)
      description: `職缺說明：${job.title || '待補充'}\n\n工作內容待補充。`, // 職務說明
      salaryType: 10,                             // 面議
      salaryLow: 0,                               // 最低薪資
      salaryHigh: 0,                              // 最高薪資
      addrNo: 6001001001,                         // 台北市
      edu: [7],                                   // 大學
      contact: 'HR',                              // 聯絡人
      email: ['hr@company.com'],                  // 聯絡 email
      applyType: {
        '104': [2]                               // 接受 104 履歷
      },
      replyDay: 7,                                // 7天內回覆
      workShifts: []                              // 預設空的排班
    };
  }

  private mapDbCandidateToLocal(dbCandidate: any): JobCandidate {
    let skills: string[] = [];
    try {
      if (dbCandidate.skills) {
        skills = JSON.parse(dbCandidate.skills);
      }
    } catch (e) {
      if (typeof dbCandidate.skills === 'string') {
        skills = dbCandidate.skills.split(',').map((s: string) => s.trim());
      }
    }

    let selectedSlots: string[] = [];
    try {
      if (dbCandidate.selected_slots) {
        selectedSlots = JSON.parse(dbCandidate.selected_slots);
      }
    } catch (e) { }

    return {
      id: dbCandidate.id,
      name: dbCandidate.name,
      nameEn: dbCandidate.name_en || '',
      email: dbCandidate.email || '',
      phone: dbCandidate.phone || '',
      location: '台北市',
      applyDate: dbCandidate.apply_date,
      education: dbCandidate.education || '未填寫',
      experience: dbCandidate.experience || '未填寫',
      experienceYears: dbCandidate.experience_years || 0,
      skills: skills,
      matchScore: dbCandidate.score || 0,
      scoreLevel: (dbCandidate.score >= 80 ? 'high' : dbCandidate.score >= 60 ? 'medium' : 'low'),
      status: (dbCandidate.status === 'offer' ? 'hired' : dbCandidate.status as any) || 'new',
      avatarColor: this.getRandomColor(),
      stage: dbCandidate.stage,
      // Invitation Data
      invitationStatus: dbCandidate.invitation_status,
      candidateResponse: dbCandidate.candidate_response,
      selectedSlots: selectedSlots,
      responseToken: dbCandidate.response_token,
      rescheduleNote: dbCandidate.reschedule_note,
      interviewCount: dbCandidate.interview_count || 0
    };
  }

  private getRandomColor(): string {
    const colors = ['#8DA399', '#D6A28C', '#7F9CA0', '#9A8C98', '#B87D7B', '#C4A4A1'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

