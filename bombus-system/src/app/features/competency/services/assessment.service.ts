import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, delay } from 'rxjs';
import {
  MonthlyCheck,
  MonthlyCheckItem,
  MonthlyCheckTemplate,
  QuarterlyReview,
  WeeklyReport,
  WeeklyReportWorkItem,
  WeeklyTodoItem,
  WeeklyProblemItem,
  WeeklyTrainingItem,
  WeeklyProjectItem,
  WeeklyReportUpdateData,
  WeeklyReportSubmitData,
  WeeklyReportStats,
  CompetencyOverview,
  PersonalTrend,
  PendingTask,
  DeadlineReminder,
  IncompleteItem,
  DepartmentAvgScore,
  PersonalHistory,
  SatisfactionQuestion,
  SatisfactionSurveyAnswer,
  SystemConfig,
  AssessmentFilter,
  PaginatedResult,
  ApiResponse
} from '../models/assessment.model';

/** 週報列表回傳結果（含統計） */
export interface WeeklyReportListResult extends PaginatedResult<WeeklyReport> {
  stats: WeeklyReportStats;
}

/** 當前週資訊 */
export interface CurrentWeekInfo {
  year: number;
  week: number;
  weekStart: string;
  weekEnd: string;
  submitDeadline: string;
  reviewDeadline: string;
}

@Injectable({ providedIn: 'root' })
export class AssessmentService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  // =====================================================
  // 月度檢核 API
  // =====================================================

  /**
   * 取得月度檢核列表
   */
  getMonthlyChecks(filter: AssessmentFilter): Observable<PaginatedResult<MonthlyCheck>> {
    const params = this.buildParams(filter);
    return this.http.get<ApiResponse<PaginatedResult<MonthlyCheck>>>(`${this.baseUrl}/monthly-checks`, { params })
      .pipe(
        map(res => res.data!),
        catchError(this.handleError<PaginatedResult<MonthlyCheck>>({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }))
      );
  }

  /**
   * 取得單筆月度檢核詳情
   */
  getMonthlyCheckById(id: string): Observable<MonthlyCheck | null> {
    return this.http.get<ApiResponse<MonthlyCheck>>(`${this.baseUrl}/monthly-checks/${id}`)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<MonthlyCheck | null>(null))
      );
  }

  /**
   * 建立月度檢核表
   */
  createMonthlyCheck(data: { employeeId: string; year: number; month: number; copyFromPreviousMonth?: boolean }): Observable<MonthlyCheck | null> {
    return this.http.post<ApiResponse<MonthlyCheck>>(`${this.baseUrl}/monthly-checks`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<MonthlyCheck | null>(null))
      );
  }

  /**
   * 員工自評提交 (需要電子簽名)
   */
  submitSelfAssessment(id: string, items: { itemId: string; selfScore: number }[], signature: string): Observable<{ id: string; status: string } | null> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/monthly-checks/${id}/self-assessment`, { items, signature })
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ id: string; status: string } | null>(null))
      );
  }

  /**
   * 主管審核 (核准時需要電子簽名)
   */
  submitManagerReview(id: string, data: { action: 'approve' | 'reject'; items?: { itemId: string; managerScore: number }[]; comment?: string; signature?: string }): Observable<{ id: string; status: string } | null> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/monthly-checks/${id}/manager-review`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ id: string; status: string } | null>(null))
      );
  }

  /**
   * HR 結案 (結案時需要電子簽名)
   */
  submitHrClose(id: string, data: { action: 'close' | 'reopen'; comment?: string; signature?: string }): Observable<{ id: string; status: string } | null> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/monthly-checks/${id}/hr-close`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ id: string; status: string } | null>(null))
      );
  }

  // =====================================================
  // 季度面談 API
  // =====================================================

  /**
   * 取得季度面談列表
   */
  getQuarterlyReviews(filter: AssessmentFilter): Observable<PaginatedResult<QuarterlyReview>> {
    const params = this.buildParams(filter);
    return this.http.get<ApiResponse<PaginatedResult<QuarterlyReview>>>(`${this.baseUrl}/quarterly-reviews`, { params })
      .pipe(
        map(res => res.data!),
        catchError(this.handleError<PaginatedResult<QuarterlyReview>>({ items: [], pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } }))
      );
  }

  /**
   * 取得單筆季度面談詳情
   */
  getQuarterlyReviewById(id: string): Observable<QuarterlyReview | null> {
    return this.http.get<ApiResponse<QuarterlyReview>>(`${this.baseUrl}/quarterly-reviews/${id}`)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<QuarterlyReview | null>(null))
      );
  }

  /**
   * 建立季度面談
   */
  createQuarterlyReview(data: { employeeId: string; year: number; quarter: number; formType: string }): Observable<QuarterlyReview | null> {
    return this.http.post<ApiResponse<QuarterlyReview>>(`${this.baseUrl}/quarterly-reviews`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<QuarterlyReview | null>(null))
      );
  }

  /**
   * 初始化季度面談清單 (為所有員工建立該季面談記錄)
   */
  initializeQuarterlyReviews(year: number, quarter: number): Observable<{
    totalEmployees: number;
    created: number;
    skipped: number;
    records: any[];
  } | null> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/quarterly-reviews/initialize`, { year, quarter })
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<any>(null))
      );
  }

  /**
   * 員工提交季度表單
   */
  submitEmployeeReview(id: string, data: { sections: any; satisfactionSurvey: SatisfactionSurveyAnswer[] }): Observable<QuarterlyReview | null> {
    return this.http.patch<ApiResponse<QuarterlyReview>>(`${this.baseUrl}/quarterly-reviews/${id}/employee-submit`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<QuarterlyReview | null>(null))
      );
  }

  /**
   * 主管評核季度面談
   */
  submitQuarterlyManagerReview(id: string, data: { 
    managerComment?: string; 
    developmentPlan?: string; 
    supervisorComment?: { bestEvaluation: string; worstEvaluation: string; supplement: string };
    sections?: any[] 
  }): Observable<QuarterlyReview | null> {
    return this.http.patch<ApiResponse<QuarterlyReview>>(`${this.baseUrl}/quarterly-reviews/${id}/manager-review`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<QuarterlyReview | null>(null))
      );
  }

  /**
   * 預約面談時間
   */
  scheduleInterview(id: string, data: { interviewDate: string; location?: string }): Observable<QuarterlyReview | null> {
    return this.http.patch<ApiResponse<QuarterlyReview>>(`${this.baseUrl}/quarterly-reviews/${id}/schedule-interview`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<QuarterlyReview | null>(null))
      );
  }

  // =====================================================
  // 週報 API (擴充版)
  // =====================================================

  /**
   * 取得週報列表（含統計數據）
   */
  getWeeklyReports(filter: AssessmentFilter): Observable<WeeklyReportListResult> {
    const params = this.buildParams(filter);
    return this.http.get<ApiResponse<WeeklyReportListResult>>(`${this.baseUrl}/weekly-reports`, { params })
      .pipe(
        map(res => res.data!),
        catchError(this.handleError<WeeklyReportListResult>({
          items: [],
          stats: { total: 0, notStarted: 0, draft: 0, submitted: 0, approved: 0, rejected: 0, submissionRate: 0 },
          pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }
        }))
      );
  }

  /**
   * 取得當前週資訊
   */
  getCurrentWeekInfo(): Observable<CurrentWeekInfo | null> {
    return this.http.get<ApiResponse<CurrentWeekInfo>>(`${this.baseUrl}/weekly-reports/current-week`)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<CurrentWeekInfo | null>(null))
      );
  }

  /**
   * 批量生成週報（為所有在職員工）
   */
  generateWeeklyReports(year: number, week: number): Observable<{
    year: number;
    week: number;
    weekStart: string;
    weekEnd: string;
    created: number;
    skipped: number;
    total: number;
  } | null> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/weekly-reports/generate`, { year, week })
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<any>(null))
      );
  }

  /**
   * 取得單筆週報詳情 (完整資料)
   */
  getWeeklyReportById(id: string): Observable<WeeklyReport | null> {
    return this.http.get<ApiResponse<WeeklyReport>>(`${this.baseUrl}/weekly-reports/${id}`)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<WeeklyReport | null>(null))
      );
  }

  /**
   * 建立週報
   */
  createWeeklyReport(data: { employeeId: string; year: number; week: number }): Observable<WeeklyReport | null> {
    return this.http.post<ApiResponse<WeeklyReport>>(`${this.baseUrl}/weekly-reports`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<WeeklyReport | null>(null))
      );
  }

  /**
   * 更新週報草稿 (擴充版 - 含所有區塊)
   */
  updateWeeklyReport(id: string, data: WeeklyReportUpdateData): Observable<{ id: string } | null> {
    return this.http.patch<ApiResponse<{ id: string }>>(`${this.baseUrl}/weekly-reports/${id}`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ id: string } | null>(null))
      );
  }

  /**
   * 提交週報 (擴充版 - 含簽章)
   */
  submitWeeklyReport(id: string, data: WeeklyReportSubmitData): Observable<{ id: string; status: string } | null> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/weekly-reports/${id}/submit`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ id: string; status: string } | null>(null))
      );
  }

  /**
   * 審核週報 (含簽章)
   */
  reviewWeeklyReport(id: string, data: { action: 'approve' | 'reject'; comment?: string; managerSignature?: string }): Observable<{ id: string; status: string } | null> {
    return this.http.patch<ApiResponse<{ id: string; status: string }>>(`${this.baseUrl}/weekly-reports/${id}/review`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ id: string; status: string } | null>(null))
      );
  }

  // =====================================================
  // 統計 API
  // =====================================================

  /**
   * 取得統計概覽
   */
  getOverview(year: number, month?: number, quarter?: number): Observable<CompetencyOverview> {
    let params = new HttpParams().set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    if (quarter) params = params.set('quarter', quarter.toString());
    
    return this.http.get<ApiResponse<CompetencyOverview>>(`${this.baseUrl}/competency-stats/overview`, { params })
      .pipe(
        map(res => res.data!),
        catchError(this.handleError<CompetencyOverview>({
          monthlyCheck: { total: 0, completed: 0, inProgress: 0, overdue: 0, completionRate: 0 },
          quarterlyReview: { total: 0, completed: 0, inProgress: 0, completionRate: 0 },
          weeklyReport: { total: 0, submitted: 0, approved: 0, submissionRate: 0 }
        }))
      );
  }

  /**
   * 取得個人績效趨勢
   */
  getPersonalTrend(year: number, employeeId: string): Observable<PersonalTrend> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('employeeId', employeeId);
    
    return this.http.get<ApiResponse<PersonalTrend>>(`${this.baseUrl}/competency-stats/personal-trend`, { params })
      .pipe(
        map(res => res.data!),
        catchError(this.handleError<PersonalTrend>({ monthlyScores: [], quarterlyScores: [] }))
      );
  }

  /**
   * 取得待處理事項
   */
  getPendingTasks(employeeId?: string): Observable<PendingTask[]> {
    // TODO: 實作 API 後移除 mock data
    return of<PendingTask[]>([]).pipe(delay(300));
  }

  /**
   * 取得截止日提醒
   */
  getDeadlineReminders(): Observable<DeadlineReminder[]> {
    // TODO: 實作 API 後移除 mock data
    const now = new Date();
    return of<DeadlineReminder[]>([
      { type: 'monthly_check', title: '月度檢核截止', deadline: `${now.getFullYear()}/${now.getMonth() + 1}/10`, daysRemaining: 7 },
      { type: 'weekly_report', title: '本週週報截止', deadline: '週五', daysRemaining: 3 }
    ]).pipe(delay(300));
  }

  // =====================================================
  // HR 儀表板 API
  // =====================================================

  /**
   * 取得月度未完成清單
   */
  getIncompleteMonthlyChecks(year: number, month: number): Observable<IncompleteItem[]> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());
    
    return this.http.get<ApiResponse<IncompleteItem[]>>(`${this.baseUrl}/competency-stats/monthly-incomplete`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(this.handleError<IncompleteItem[]>([]))
      );
  }

  /**
   * 取得季度未完成清單
   */
  getIncompleteQuarterlyReviews(year: number, quarter: number): Observable<IncompleteItem[]> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('quarter', quarter.toString());
    
    return this.http.get<ApiResponse<IncompleteItem[]>>(`${this.baseUrl}/competency-stats/quarterly-incomplete`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(this.handleError<IncompleteItem[]>([]))
      );
  }

  /**
   * 取得各部門平均分數
   */
  getDepartmentAvgScores(year: number, month?: number): Observable<DepartmentAvgScore[]> {
    let params = new HttpParams().set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    
    return this.http.get<ApiResponse<DepartmentAvgScore[]>>(`${this.baseUrl}/competency-stats/department-avg`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(this.handleError<DepartmentAvgScore[]>([]))
      );
  }

  /**
   * 取得個人歷史績效曲線
   */
  getPersonalHistory(employeeId: string, year?: number): Observable<PersonalHistory | null> {
    let params = new HttpParams().set('employeeId', employeeId);
    if (year) params = params.set('year', year.toString());
    
    return this.http.get<ApiResponse<PersonalHistory>>(`${this.baseUrl}/competency-stats/personal-history`, { params })
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<PersonalHistory | null>(null))
      );
  }

  /**
   * 取得所有員工列表（用於下拉選單）
   */
  getEmployeeList(): Observable<{ id: string; name: string; department: string; position: string }[]> {
    return this.http.get<ApiResponse<{ id: string; name: string; department: string; position: string }[]>>(`${this.baseUrl}/employees/list`)
      .pipe(
        map(res => res.data || []),
        catchError(this.handleError<{ id: string; name: string; department: string; position: string }[]>([]))
      );
  }

  /**
   * 取得週報未完成清單
   */
  getIncompleteWeeklyReports(year: number, week: number): Observable<IncompleteItem[]> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('week', week.toString());
    
    return this.http.get<ApiResponse<IncompleteItem[]>>(`${this.baseUrl}/competency-stats/weekly-incomplete`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(this.handleError<IncompleteItem[]>([]))
      );
  }

  /**
   * 取得各部門季度平均分數
   */
  getDepartmentAvgScoresQuarterly(year: number, quarter: number): Observable<DepartmentAvgScore[]> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('quarter', quarter.toString());
    
    return this.http.get<ApiResponse<DepartmentAvgScore[]>>(`${this.baseUrl}/competency-stats/department-avg-quarterly`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(this.handleError<DepartmentAvgScore[]>([]))
      );
  }

  // =====================================================
  // 模板 API
  // =====================================================

  /**
   * 取得月度指標模板
   */
  getMonthlyCheckTemplates(department?: string, position?: string): Observable<MonthlyCheckTemplate[]> {
    let params = new HttpParams();
    if (department) params = params.set('department', department);
    if (position) params = params.set('position', position);
    
    return this.http.get<ApiResponse<MonthlyCheckTemplate[]>>(`${this.baseUrl}/monthly-check-templates`, { params })
      .pipe(
        map(res => res.data || []),
        catchError(this.handleError<MonthlyCheckTemplate[]>([]))
      );
  }

  /**
   * 建立指標模板
   */
  createTemplate(template: Partial<MonthlyCheckTemplate>): Observable<MonthlyCheckTemplate | null> {
    return this.http.post<ApiResponse<MonthlyCheckTemplate>>(`${this.baseUrl}/monthly-check-templates`, template)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<MonthlyCheckTemplate | null>(null))
      );
  }

  /**
   * 更新指標模板
   */
  updateTemplate(id: string, template: Partial<MonthlyCheckTemplate>): Observable<{ id: string } | null> {
    return this.http.patch<ApiResponse<{ id: string }>>(`${this.baseUrl}/monthly-check-templates/${id}`, template)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ id: string } | null>(null))
      );
  }

  /**
   * 刪除指標模板
   */
  deleteTemplate(id: string): Observable<boolean> {
    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/monthly-check-templates/${id}`)
      .pipe(
        map(() => true),
        catchError(() => of(false))
      );
  }

  /**
   * 複製模板
   */
  copyTemplates(data: { sourceDepartment: string; sourcePosition: string; targetDepartment: string; targetPosition: string }): Observable<{ count: number } | null> {
    return this.http.post<ApiResponse<{ count: number }>>(`${this.baseUrl}/monthly-check-templates/copy`, data)
      .pipe(
        map(res => res.data || null),
        catchError(this.handleError<{ count: number } | null>(null))
      );
  }

  /**
   * 批次匯入模板
   */
  importTemplates(templates: Partial<MonthlyCheckTemplate>[]): Observable<{ success: number; failed: number }> {
    return this.http.post<ApiResponse<{ success: number; failed: number }>>(`${this.baseUrl}/monthly-check-templates/import`, { templates })
      .pipe(
        map(res => res.data || { success: 0, failed: 0 }),
        catchError(this.handleError<{ success: number; failed: number }>({ success: 0, failed: 0 }))
      );
  }

  // =====================================================
  // 滿意度調查
  // =====================================================

  /**
   * 取得滿意度調查題目
   */
  getSatisfactionQuestions(): Observable<SatisfactionQuestion[]> {
    return this.http.get<ApiResponse<SatisfactionQuestion[]>>(`${this.baseUrl}/quarterly-reviews/satisfaction-questions`)
      .pipe(
        map(res => res.data || []),
        catchError(() => of<SatisfactionQuestion[]>([
          { id: 1, questionText: '員工清楚自己的工作要求', orderNum: 1, isActive: true },
          { id: 2, questionText: '員工明確有做好自己工作所需要的內容', orderNum: 2, isActive: true },
          { id: 3, questionText: '在工作中，每天都有機會做員工自己最擅長做的事情', orderNum: 3, isActive: true },
          { id: 4, questionText: '在一週工作中，有因為工作出色而受到鼓勵', orderNum: 4, isActive: true },
          { id: 5, questionText: '員工覺得自己的主管或同事有關心個人的情況', orderNum: 5, isActive: true },
          { id: 6, questionText: '在工作中有人鼓勵員工自己的發展', orderNum: 6, isActive: true },
          { id: 7, questionText: '在工作中，自己感覺意見有受到重視', orderNum: 7, isActive: true },
          { id: 8, questionText: '公司的使命與目標，讓員工感覺到自己的工作職務是重要的', orderNum: 8, isActive: true },
          { id: 9, questionText: '同事有致力於高質量的工作', orderNum: 9, isActive: true },
          { id: 10, questionText: '在公司有要好的同事', orderNum: 10, isActive: true },
          { id: 11, questionText: '在過去三個月中，公司有人會與我談及我的進步', orderNum: 11, isActive: true },
          { id: 12, questionText: '在過去三個月中，員工認為自己的工作有機會學習與成長', orderNum: 12, isActive: true }
        ]))
      );
  }

  // =====================================================
  // 匯出 API
  // =====================================================

  /**
   * 匯出月度檢核 Excel
   */
  exportMonthlyChecks(year: number, month?: number, departmentId?: string): Observable<Blob> {
    let params = new HttpParams().set('year', year.toString());
    if (month) params = params.set('month', month.toString());
    if (departmentId) params = params.set('departmentId', departmentId);
    
    return this.http.get(`${this.baseUrl}/export/monthly-checks`, { params, responseType: 'blob' });
  }

  /**
   * 匯出季度面談 Excel
   */
  exportQuarterlyReviews(year: number, quarter?: number): Observable<Blob> {
    let params = new HttpParams().set('year', year.toString());
    if (quarter) params = params.set('quarter', quarter.toString());
    
    return this.http.get(`${this.baseUrl}/quarterly-reviews/export`, { params, responseType: 'blob' });
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * 建立 HTTP 參數
   */
  private buildParams(filter: AssessmentFilter): HttpParams {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return params;
  }

  /**
   * 錯誤處理
   */
  private handleError<T>(defaultValue: T) {
    return (error: any): Observable<T> => {
      console.error('AssessmentService Error:', error);
      return of(defaultValue);
    };
  }
}
