import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  Job104CreateRequest,
  CandidateFull,
  CandidateResumeAnalysis
} from '../models/job.model';

const API_104_BASE = '/api/jobs/104';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly http = inject(HttpClient);



  private readonly JOBS_API = '/api/jobs';

  getJobs(orgUnitId?: string): Observable<Job[]> {
    let params = new HttpParams();
    if (orgUnitId) params = params.set('org_unit_id', orgUnitId);
    return this.http.get<{ status: string; data: any[] }>(`${this.JOBS_API}`, { params }).pipe(
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
  getSynced104Jobs(orgUnitId?: string): Observable<Job[]> {
    let params = new HttpParams();
    if (orgUnitId) params = params.set('org_unit_id', orgUnitId);
    return this.http.get<{ status: string; data: any[] }>(`${this.JOBS_API}`, { params }).pipe(
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


  getJobStats(orgUnitId?: string): Observable<JobStats> {
    let params = new HttpParams();
    if (orgUnitId) params = params.set('org_unit_id', orgUnitId);
    return this.http.get<{ status: string; data: any }>(`${this.JOBS_API}/stats/summary`, { params }).pipe(
      map(response => ({
        activeJobs: response.data?.activeJobs || 0,
        newResumes: response.data?.newResumes || 0,
        pendingReview: response.data?.pendingReview || 0,
        scheduledInterviews: response.data?.scheduledInterviews || 0
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

  getCandidateStats(jobId: string): Observable<CandidateStats> {
    if (!jobId) {
      return of({ total: 0, pending: 0, aiRecommended: 0, scheduled: 0 });
    }
    return this.getCandidates(jobId).pipe(
      map(candidates => {
        const total = candidates.length;
        const pending = candidates.filter(c => c.status === 'new').length;
        const aiRecommended = candidates.filter(c =>
          c.aiOverallScore !== undefined && c.aiOverallScore >= 70
        ).length;
        const scheduled = candidates.filter(c =>
          c.status === 'interview' || c.interviewId
        ).length;
        return { total, pending, aiRecommended, scheduled };
      })
    );
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
   * 取得候選人完整履歷資料與 AI 解析報告
   */
  getCandidateFull(jobId: string, candidateId: string): Observable<CandidateFull & { resumeAnalysis?: CandidateResumeAnalysis }> {
    return this.http.get<any>(`${this.JOBS_API}/${jobId}/candidates/${candidateId}/full`).pipe(
      map(dbData => this.mapDbCandidateFullToLocal(dbData)),
      catchError(error => {
        console.error('Failed to fetch candidate full data:', error);
        throw error;
      })
    );
  }

  /**
   * 將資料庫候選人完整資料轉為前端格式
   */
  private mapDbCandidateFullToLocal(dbData: any): CandidateFull & { resumeAnalysis?: CandidateResumeAnalysis } {
    // Parse skills
    let skills: string[] = [];
    try {
      if (dbData.skills) {
        skills = JSON.parse(dbData.skills);
      }
    } catch (e) {
      if (typeof dbData.skills === 'string') {
        skills = dbData.skills.split(',').map((s: string) => s.trim());
      }
    }

    // Parse personal page
    let personalPage: string[] = [];
    try {
      if (dbData.personal_page) {
        personalPage = JSON.parse(dbData.personal_page);
      }
    } catch (e) { }

    // Parse selected slots
    let selectedSlots: string[] = [];
    try {
      if (dbData.selected_slots) {
        selectedSlots = JSON.parse(dbData.selected_slots);
      }
    } catch (e) { }

    const candidate: CandidateFull = {
      // 基本資料
      id: dbData.id,
      name: dbData.name,
      nameEn: dbData.name_en || '',
      email: dbData.email || '',
      phone: dbData.phone || '',
      location: dbData.location || dbData.address || '',
      applyDate: dbData.apply_date || '',
      education: dbData.education || '',
      experience: dbData.experience || '',
      experienceYears: dbData.experience_years || 0,
      skills: skills,
      matchScore: dbData.score || 0,
      scoreLevel: (dbData.score >= 80 ? 'high' : dbData.score >= 60 ? 'medium' : 'low'),
      status: dbData.status || 'new',
      stage: dbData.stage,
      avatarColor: this.getRandomColor(),
      jobTitle: dbData.job_title || '',  // 應徵職缺標題
      
      // 面試邀請資訊
      invitationStatus: dbData.invitation_status,
      candidateResponse: dbData.candidate_response,
      selectedSlots: selectedSlots,
      responseToken: dbData.response_token,
      rescheduleNote: dbData.reschedule_note,
      interviewCount: dbData.interview_count || 0,
      
      // 面試資訊
      interviewId: dbData.interview_id,
      interviewAt: dbData.interview_at,
      interviewLocation: dbData.interview_location,
      interviewAddress: dbData.interview_address,
      meetingLink: dbData.meeting_link,
      interviewCancelToken: dbData.interview_cancel_token,
      interviewResult: dbData.interview_result,
      
      // 104 擴充資料
      currentPosition: dbData.current_position,
      currentCompany: dbData.current_company,
      expectedSalary: dbData.expected_salary,
      avatar: dbData.avatar,
      resume104Id: dbData.resume_104_id,
      gender: dbData.gender,
      birthday: dbData.birthday,
      employmentStatus: dbData.employment_status,
      seniority: dbData.seniority,
      subPhone: dbData.sub_phone,
      tel: dbData.tel,
      contactInfo: dbData.contact_info,
      address: dbData.address,
      regSource: dbData.reg_source,
      militaryStatus: dbData.military_status,
      militaryRetireDate: dbData.military_retire_date,
      introduction: dbData.introduction,
      motto: dbData.motto,
      characteristic: dbData.characteristic,
      personalPage: personalPage,
      drivingLicenses: dbData.driving_licenses,
      transports: dbData.transports,
      specialIdentities: dbData.special_identities,
      nationality: dbData.nationality,
      disabledTypes: dbData.disabled_types,
      disabilityCard: dbData.disability_card,
      assistiveDevices: dbData.assistive_devices,
      
      // 求職條件
      jobCharacteristic: dbData.job_characteristic,
      workInterval: dbData.work_interval,
      otherWorkInterval: dbData.other_work_interval,
      shiftWork: dbData.shift_work === 1,
      startDateOpt: dbData.start_date_opt,
      preferredLocation: dbData.preferred_location,
      remoteWork: dbData.remote_work,
      preferredJobName: dbData.preferred_job_name,
      preferredJobCategory: dbData.preferred_job_category,
      preferredIndustry: dbData.preferred_industry,
      workDesc: dbData.work_desc,
      
      // 自傳
      biography: dbData.biography,
      biographyEn: dbData.biography_en,
      
      // 證照
      certificates: dbData.certificates,
      otherCertificates: dbData.other_certificates,
      
      // 子資料（轉換 snake_case 為 camelCase）
      educationList: (dbData.educationList || []).map((edu: any) => ({
        id: edu.id,
        candidateId: edu.candidate_id,
        schoolName: edu.school_name,
        degreeLevel: edu.degree_level,
        major: edu.major,
        majorCategory: edu.major_category,
        degreeStatus: edu.degree_status,
        schoolCountry: edu.school_country,
        startDate: edu.start_date,
        endDate: edu.end_date,
        sortOrder: edu.sort_order,
        createdAt: edu.created_at
      })),
      experienceList: (dbData.experienceList || []).map((exp: any) => ({
        id: exp.id,
        candidateId: exp.candidate_id,
        firmName: exp.firm_name,
        industryCategory: exp.industry_category,
        companySize: exp.company_size,
        workPlace: exp.work_place,
        jobName: exp.job_name,
        jobRole: exp.job_role,
        jobCategory: exp.job_category,
        startDate: exp.start_date,
        endDate: exp.end_date,
        jobDesc: exp.job_desc,
        skills: exp.skills,
        management: exp.management,
        wageTypeDesc: exp.wage_type_desc,
        wage: exp.wage,
        wageYear: exp.wage_year,
        sortOrder: exp.sort_order,
        createdAt: exp.created_at
      })),
      specialityList: (dbData.specialityList || []).map((spec: any) => ({
        id: spec.id,
        candidateId: spec.candidate_id,
        skill: spec.skill,
        description: spec.description,
        tags: spec.tags,
        sortOrder: spec.sort_order,
        createdAt: spec.created_at
      })),
      languageList: (dbData.languageList || []).map((lang: any) => ({
        id: lang.id,
        candidateId: lang.candidate_id,
        langType: lang.lang_type,
        languageCategory: lang.language_category,
        listenDegree: lang.listen_degree,
        speakDegree: lang.speak_degree,
        readDegree: lang.read_degree,
        writeDegree: lang.write_degree,
        degree: lang.degree,
        certificates: lang.certificates,
        sortOrder: lang.sort_order,
        createdAt: lang.created_at
      })),
      attachmentList: (dbData.attachmentList || []).map((attach: any) => ({
        id: attach.id,
        candidateId: attach.candidate_id,
        type: attach.type,
        title: attach.title,
        fileName: attach.file_name,
        resourceLink: attach.resource_link,
        website: attach.website,
        sortOrder: attach.sort_order,
        createdAt: attach.created_at
      })),
      projectList: (dbData.projectList || []).map((proj: any) => ({
        id: proj.id,
        candidateId: proj.candidate_id,
        title: proj.title,
        startDate: proj.start_date,
        endDate: proj.end_date,
        description: proj.description,
        type: proj.type,
        resourceLink: proj.resource_link,
        website: proj.website,
        sortOrder: proj.sort_order,
        createdAt: proj.created_at
      })),
      customContentList: dbData.customContentList || [],
      recommenderList: (dbData.recommenderList || []).map((rec: any) => ({
        id: rec.id,
        candidateId: rec.candidate_id,
        name: rec.name,
        corp: rec.corp,
        jobTitle: rec.job_title,
        email: rec.email,
        tel: rec.tel,
        sortOrder: rec.sort_order,
        createdAt: rec.created_at
      })),
      applyRecordList: (dbData.applyRecordList || []).map((record: any) => ({
        id: record.id,
        candidateId: record.candidate_id,
        applyDate: record.apply_date,
        jobName: record.job_name,
        jobNo: record.job_no,
        applySource: record.apply_source,
        createdAt: record.created_at
      })),
      applyQuestionList: (dbData.applyQuestionList || []).map((q: any) => ({
        id: q.id,
        candidateId: q.candidate_id,
        type: q.type,
        question: q.question,
        answer: q.answer,
        sortOrder: q.sort_order,
        createdAt: q.created_at
      }))
    };

    // AI 解析報告（如果有）
    const result: CandidateFull & { resumeAnalysis?: CandidateResumeAnalysis } = candidate;
    
    if (dbData.resumeAnalysis) {
      result.resumeAnalysis = {
        id: dbData.resumeAnalysis.id,
        candidateId: dbData.resumeAnalysis.candidate_id,
        jobId: dbData.resumeAnalysis.job_id,
        overallMatchScore: dbData.resumeAnalysis.overall_match_score || 0,
        requirementMatchScore: dbData.resumeAnalysis.requirement_match_score || 0,
        keywordMatchScore: dbData.resumeAnalysis.keyword_match_score || 0,
        experienceRelevanceScore: dbData.resumeAnalysis.experience_relevance_score || 0,
        matchedRequirements: dbData.resumeAnalysis.matchedRequirements || [],
        unmatchedRequirements: dbData.resumeAnalysis.unmatchedRequirements || [],
        bonusSkills: dbData.resumeAnalysis.bonusSkills || [],
        extractedTechSkills: dbData.resumeAnalysis.extractedTechSkills || [],
        extractedSoftSkills: dbData.resumeAnalysis.extractedSoftSkills || [],
        jdRequiredMatchCount: dbData.resumeAnalysis.jd_required_match_count || 0,
        jdRequiredTotalCount: dbData.resumeAnalysis.jd_required_total_count || 0,
        jdBonusMatchCount: dbData.resumeAnalysis.jd_bonus_match_count || 0,
        jdBonusTotalCount: dbData.resumeAnalysis.jd_bonus_total_count || 0,
        experienceAnalysis: dbData.resumeAnalysis.experienceAnalysis || [],
        totalRelevantYears: dbData.resumeAnalysis.total_relevant_years || 0,
        jdRequiredYears: dbData.resumeAnalysis.jd_required_years || 0,
        writingStyle: dbData.resumeAnalysis.writing_style || '',
        analysisConfidence: dbData.resumeAnalysis.analysis_confidence || 0,
        contentFeatures: dbData.resumeAnalysis.contentFeatures || [],
        areasToClarify: dbData.resumeAnalysis.areasToClarify || [],
        techVerificationPoints: dbData.resumeAnalysis.techVerificationPoints || [],
        experienceSupplementPoints: dbData.resumeAnalysis.experienceSupplementPoints || [],
        analyzedAt: dbData.resumeAnalysis.analyzed_at || '',
        analysisEngineVersion: dbData.resumeAnalysis.analysis_engine_version || '',
        resumeWordCount: dbData.resumeAnalysis.resume_word_count || 0
      };
    }

    return result;
  }

  /**
   * 新增職缺 (可選同步至 104)
   */
  createJob(job: Partial<Job> & { syncTo104?: boolean; job104Data?: any }): Observable<Job> {
    const payload: Record<string, unknown> = {
      title: job.title,
      department: job.department,
      description: job.description || '',
      recruiter: job.recruiter || 'HR Admin',
      syncTo104: job.syncTo104 || false,
      job104Data: job.job104Data || null
    };
    if (job.org_unit_id) payload['org_unit_id'] = job.org_unit_id;

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
      avatar: dbCandidate.avatar?.startsWith('/') || dbCandidate.avatar?.startsWith('http') ? dbCandidate.avatar : undefined,
      location: '台北市',
      applyDate: dbCandidate.apply_date,
      education: dbCandidate.education || '未填寫',
      experience: dbCandidate.experience || '未填寫',
      experienceYears: dbCandidate.experience_years || 0,
      skills: skills,
      matchScore: dbCandidate.score || 0,
      scoreLevel: (dbCandidate.score >= 80 ? 'high' : dbCandidate.score >= 60 ? 'medium' : 'low'),
      status: dbCandidate.status || 'new',
      avatarColor: this.getRandomColor(),
      stage: dbCandidate.stage,
      // Invitation Data
      invitationStatus: dbCandidate.invitation_status,
      candidateResponse: dbCandidate.candidate_response,
      selectedSlots: selectedSlots,
      responseToken: dbCandidate.response_token,
      rescheduleNote: dbCandidate.reschedule_note,
      interviewCount: dbCandidate.interview_count || 0,
      // 面試資訊
      interviewId: dbCandidate.interview_id,
      interviewAt: dbCandidate.interview_at,
      interviewLocation: dbCandidate.interview_location,
      interviewAddress: dbCandidate.interview_address,
      meetingLink: dbCandidate.meeting_link,
      interviewCancelToken: dbCandidate.interview_cancel_token,
      interviewResult: dbCandidate.interview_result,
      // AI 履歷解析
      aiOverallScore: dbCandidate.ai_overall_score ?? undefined,
      aiAnalyzedAt: dbCandidate.ai_analyzed_at ?? undefined
    };
  }

  /**
   * 產生模擬 AI 履歷解析報告
   */
  generateMockAnalysis(jobId: string, candidateId: string): Observable<{ status: string; overallScore: number }> {
    return this.http.post<{ status: string; overallScore: number }>(
      `${this.JOBS_API}/${jobId}/candidates/${candidateId}/generate-mock-analysis`, {}
    );
  }

  private getRandomColor(): string {
    const colors = ['#8DA399', '#D6A28C', '#7F9CA0', '#9A8C98', '#B87D7B', '#C4A4A1'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

