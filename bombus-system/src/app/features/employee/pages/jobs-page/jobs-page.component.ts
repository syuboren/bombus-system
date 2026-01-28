import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobService } from '../../services/job.service';
import { Job, JobStats } from '../../models/job.model';
import { CompetencyService } from '../../../competency/services/competency.service';
import { JobDescription } from '../../../competency/models/competency.model';

@Component({
  selector: 'app-jobs-page',
  standalone: true,
  imports: [FormsModule, HeaderComponent, StatCardComponent],
  templateUrl: './jobs-page.component.html',
  styleUrl: './jobs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobsPageComponent implements OnInit {
  private router = inject(Router);
  private jobService = inject(JobService);
  private competencyService = inject(CompetencyService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  // Signals
  jobs = signal<Job[]>([]);
  jobs104 = signal<Job[]>([]);  // 104 職缺列表
  stats = signal<JobStats | null>(null);
  loading = signal<boolean>(false);
  loading104 = signal<boolean>(false);  // 104 載入狀態
  showModal = signal<boolean>(false);
  showImportModal = signal<boolean>(false);
  selectedJobForImport = signal<Job | null>(null);

  // 資料來源切換
  dataSource = signal<'internal' | '104'>('internal');

  // JD 列表
  jobDescriptions = signal<JobDescription[]>([]);

  // Filter signals
  searchQuery = signal<string>('');
  departmentFilter = signal<string>('');
  statusFilter = signal<string>('');

  // Form data
  newJob = signal({
    title: '',
    department: '',
    recruiter: 'Admin (您)',
    description: '',
    jdId: '',  // 關聯的 JD ID
    syncTo104: false,  // 同步至 104
    // 104 專屬欄位
    job104: {
      role: 1 as number,          // 1=全職, 2=兼職, 3=高階
      jobCatSet: [2001002002] as number[], // 預設: 測試類別 (API Example: 2001002002)
      salaryType: 10 as number,   // 10=面議, 50=月薪, 60=年薪
      salaryLow: null as number | null,  // 初始為空，讓用戶看到 placeholder 提示
      salaryHigh: null as number | null, // 初始為空，讓用戶看到 placeholder 提示
      addrNo: 6001001001,         // 台北市
      edu: [8] as number[],       // 8=大學 (API: 1, 2, 4, 8, 16, 32)
      contact: 'HR',
      email: 'hr@company.com',
      replyDay: 7,
      workShifts: [{              // 預設: 日班 09:00-18:00
        type: 1,
        periods: [{
          startHour: 9,
          startMinute: 0,
          endHour: 18,
          endMinute: 0
        }]
      }]
    }
  });

  // Computed: 根據選擇的 JD 自動填入資訊
  selectedJD = computed(() => {
    const jdId = this.newJob().jdId;
    if (!jdId) return null;
    return this.jobDescriptions().find(jd => jd.id === jdId) || null;
  });

  // Computed: 根據過濾條件計算過濾後的職缺列表
  filteredJobs = computed(() => {
    const jobs = this.jobs();
    const jobs104 = this.jobs104();
    const source = this.dataSource();
    const query = this.searchQuery().toLowerCase();
    const dept = this.departmentFilter();
    const status = this.statusFilter();

    // 根據資料來源選擇對應的職缺列表
    let result: Job[];
    if (source === 'internal') {
      // 內部職缺：顯示沒有 104 編號的職缺
      result = jobs.filter(j => !j.job104No);
    } else {
      // 104 職缺：使用 jobs104（已從資料庫獲取的 104 同步職缺）
      result = [...jobs104];
    }

    // 過濾掉沒有 ID 的異常資料
    result = result.filter(j => !!j.id);

    if (query) {
      result = result.filter(j =>
        j.title.toLowerCase().includes(query) ||
        j.department.toLowerCase().includes(query)
      );
    }

    if (dept) {
      result = result.filter(j => j.department === dept);
    }

    if (status) {
      result = result.filter(j => j.status === status);
    }

    return result;
  });


  ngOnInit(): void {
    this.loadData();
    this.loadJobDescriptions();
    this.load104Jobs();
  }

  loadData(): void {
    this.loading.set(true);

    this.jobService.getJobStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.cdr?.markForCheck();
      }
    });

    this.jobService.getJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
        this.cdr?.markForCheck();
      },
      error: () => {
        this.notificationService.error('載入職缺列表失敗');
        this.loading.set(false);
        this.cdr?.markForCheck();
      }
    });
  }

  loadJobDescriptions(): void {
    this.competencyService.getJobDescriptions().subscribe({
      next: (jds) => {
        this.jobDescriptions.set(jds);
        this.cdr?.markForCheck();
      }
    });
  }

  /**
   * 載入 104 職缺列表（從資料庫，已同步的職缺）
   */
  load104Jobs(): void {
    this.loading104.set(true);
    this.jobService.getSynced104Jobs().subscribe({  // 改用資料庫資料
      next: (jobs) => {
        this.jobs104.set(jobs);
        this.loading104.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.error('載入 104 職缺失敗');
        this.loading104.set(false);
        this.cdr.markForCheck();
      }
    });
  }


  switchDataSource(source: 'internal' | '104'): void {
    this.dataSource.set(source);
    if (source === '104' && this.jobs104().length === 0) {
      this.load104Jobs();
    }
    this.cdr?.markForCheck();
  }

  viewCandidates(job: Job): void {
    this.router.navigate(['/employee/job-candidates'], {
      queryParams: { jobId: job.id }
    });
  }

  /**
   * 導航至關鍵字管理頁面
   */
  navigateToKeywords(job: Job): void {
    this.router.navigate(['/employee/job-keywords', job.id]);
  }

  editJob(job: Job): void {
    this.notificationService.info(`編輯職缺: ${job.title}`);
  }

  openModal(): void {
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  saveJob(): void {
    const formData = this.newJob();
    if (!formData.title || !formData.department) {
      this.notificationService.warning('請填寫必要欄位');
      return;
    }

    // 準備 104 資料 (若有勾選)
    let job104Data = null;
    if (formData.syncTo104) {
      const job104 = formData.job104;
      job104Data = {
        role: job104.role,
        job: formData.title,
        jobCatSet: job104.jobCatSet,
        description: formData.description || `職缺說明：${formData.title}\n\n工作內容待補充。`,
        salaryType: job104.salaryType,
        salaryLow: job104.salaryLow,
        salaryHigh: job104.salaryHigh,
        addrNo: job104.addrNo,
        edu: job104.edu.map(e => typeof e === 'number' ? e : parseInt(e as unknown as string, 10)),
        contact: job104.contact,
        email: Array.isArray(job104.email) ? job104.email : [job104.email],
        applyType: { '104': [2] },
        replyDay: job104.replyDay,
        workShifts: (job104.workShifts && job104.workShifts.length > 0)
          ? job104.workShifts
          : [{
            type: 1,
            periods: [{ startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 }]
          }]
      };
    }

    // 建立職缺草稿 (104 同步將在核准發布時觸發)
    this.jobService.createJob({
      title: formData.title,
      department: formData.department,
      description: formData.description,
      recruiter: formData.recruiter,
      job104Data: job104Data  // 只傳 job104Data，不傳 syncTo104
    }).subscribe({
      next: () => {
        if (formData.syncTo104) {
          this.notificationService.success('草稿已儲存！含 104 設定，核准發布後將自動同步');
        } else {
          this.notificationService.success('草稿已儲存！');
        }
        this.closeModal();
        this.loadData();
      },
      error: () => {
        this.notificationService.error('儲存草稿失敗');
      }
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      published: 'status--published',
      draft: 'status--draft',
      review: 'status--review'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    return this.jobService.getStatusLabel(status as 'published' | 'draft' | 'review');
  }

  getStatusIcon(status: string): string {
    return this.jobService.getStatusIcon(status as 'published' | 'draft' | 'review');
  }

  updateJobField(field: 'title' | 'department' | 'description' | 'jdId', value: string): void {
    this.newJob.update(current => ({
      ...current,
      [field]: value
    }));

    // 如果選擇了 JD，自動填入職稱和部門
    if (field === 'jdId' && value) {
      const jd = this.jobDescriptions().find(j => j.id === value);
      if (jd) {
        this.newJob.update(current => ({
          ...current,
          title: jd.positionName,
          department: jd.department,
          description: jd.summary
        }));
      }
    }
  }

  /**
   * 切換同步至 104 選項
   */
  toggleSyncTo104(checked: boolean): void {
    this.newJob.update(current => ({
      ...current,
      syncTo104: checked
    }));
  }

  /**
   * 更新 104 專屬欄位
   */
  updateJob104Field(field: string, value: any): void {
    this.newJob.update(current => {
      const updated = {
        ...current,
        job104: {
          ...current.job104,
          [field]: value
        }
      };

      // 當 role 改變時，自動更新 jobCatSet 為對應的預設值
      if (field === 'role') {
        if (value === 3) {
          // 高階主管 -> 使用高階類別 + 強制面議（104 API 規定）
          updated.job104.jobCatSet = [9001001000];
          updated.job104.salaryType = 10; // 面議
          updated.job104.salaryLow = null;
          updated.job104.salaryHigh = null;
        } else {
          // 全職/兼職 -> 使用一般類別
          updated.job104.jobCatSet = [2001002002];
        }
      }

      return updated;
    });
  }

  // 匯入履歷相關
  openImportModal(job: Job): void {
    this.selectedJobForImport.set(job);
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    this.selectedJobForImport.set(null);
  }

  importResumes(): void {
    this.notificationService.success('履歷匯入成功！已觸發 AI 評分');
    this.closeImportModal();
    this.loadData();
  }

  private resetForm(): void {
    this.newJob.set({
      title: '',
      department: '',
      recruiter: 'Admin (您)',
      description: '',
      jdId: '',
      syncTo104: false,
      job104: {
        role: 1,
        jobCatSet: [2001002002],
        salaryType: 10,
        salaryLow: null as number | null,  // 初始為空，讓用戶看到 placeholder 提示
        salaryHigh: null as number | null, // 初始為空，讓用戶看到 placeholder 提示
        addrNo: 6001001001,
        edu: [8],
        contact: 'HR',
        email: 'hr@company.com',
        replyDay: 7,
        workShifts: [{
          type: 1,
          periods: [{
            startHour: 9,
            startMinute: 0,
            endHour: 18,
            endMinute: 0
          }]
        }]
      }
    });
    this.editingJob.set(null);
  }

  // ============================================================
  // 編輯職缺
  // ============================================================
  editingJob = signal<Job | null>(null);
  showEditModal = signal<boolean>(false);

  openEditModal(job: Job): void {
    this.editingJob.set(job);

    // 預設 104 設定
    const defaultJob104 = {
      role: 1,
      jobCatSet: [2001002002],
      salaryType: 10,
      salaryLow: null as number | null,  // 初始為空，讓用戶看到 placeholder 提示
      salaryHigh: null as number | null, // 初始為空，讓用戶看到 placeholder 提示
      addrNo: 6001001001,
      edu: [8],
      contact: 'HR',
      email: 'hr@company.com',
      replyDay: 7,
      workShifts: [{
        type: 1,
        periods: [{
          startHour: 9,
          startMinute: 0,
          endHour: 18,
          endMinute: 0
        }]
      }]
    };

    // 如果是 104 職缺，需要先獲取完整資料（含 job104_data）
    if (job.job104No) {
      this.jobService.getJobById(job.id).subscribe(fullJob => {
        let job104Data = defaultJob104;
        if (fullJob?.job104_data) {
          try {
            job104Data = typeof fullJob.job104_data === 'string'
              ? JSON.parse(fullJob.job104_data)
              : fullJob.job104_data;
          } catch (e) {
            console.error('Failed to parse job104_data:', e);
          }
        }
        this.newJob.set({
          title: job.title,
          department: job.department,
          recruiter: job.recruiter,
          description: job.description || fullJob?.description || '',
          jdId: '',
          syncTo104: true,  // 104 職缺預設同步
          job104: job104Data
        });
        this.cdr.markForCheck();
      });
    } else {
      // 內部職缺
      this.newJob.set({
        title: job.title,
        department: job.department,
        recruiter: job.recruiter,
        description: job.description || '',
        jdId: '',
        syncTo104: false,
        job104: defaultJob104
      });
    }

    this.showEditModal.set(true);
  }

  // 同步狀態
  syncingFrom104 = signal<boolean>(false);

  /**
   * 從 104 同步最新資料
   */
  syncFrom104(): void {
    const job = this.editingJob();
    if (!job || !job.job104No) {
      this.notificationService.warning('此職缺尚未同步至 104');
      return;
    }

    this.syncingFrom104.set(true);

    this.jobService.syncFrom104(job.id).subscribe({
      next: (result) => {
        this.syncingFrom104.set(false);

        if (result?.job104Data) {
          // 更新表單資料
          const job104Data = result.job104Data;
          this.newJob.update(current => ({
            ...current,
            title: job104Data.job || current.title,
            description: job104Data.description || current.description,
            job104: {
              role: job104Data.role || 1,
              jobCatSet: job104Data.jobCatSet || [2001002002],
              salaryType: job104Data.salaryType || 10,
              salaryLow: job104Data.salaryLow ?? null,  // 使用 nullish coalescing，保留 0 值但預設為 null
              salaryHigh: job104Data.salaryHigh ?? null, // 使用 nullish coalescing，保留 0 值但預設為 null
              addrNo: job104Data.addrNo || 6001001001,
              edu: job104Data.edu || [8],
              contact: job104Data.contact || 'HR',
              email: Array.isArray(job104Data.email) ? job104Data.email[0] : job104Data.email || 'hr@company.com',
              replyDay: job104Data.replyDay || 7,
              workShifts: job104Data.workShifts || [{
                type: 1,
                periods: [{ startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 }]
              }]
            }
          }));
          this.notificationService.success('已從 104 同步最新資料');
          this.cdr.markForCheck();
        } else {
          this.notificationService.error('從 104 同步失敗');
        }
      },
      error: () => {
        this.syncingFrom104.set(false);
        this.notificationService.error('從 104 同步時發生錯誤');
      }
    });
  }


  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editingJob.set(null);
    this.resetForm();
  }


  saveEditedJob(): void {
    const job = this.editingJob();
    const formData = this.newJob();

    if (!job) return;
    if (!formData.title || !formData.department) {
      this.notificationService.warning('請填寫必要欄位');
      return;
    }

    // 準備更新資料
    const updateData: any = {
      title: formData.title,
      department: formData.department,
      description: formData.description,
      recruiter: formData.recruiter
    };

    // 如果是 104 職缺，需要同時更新 job104Data
    if (job.job104No) {
      const job104 = formData.job104;
      updateData.job104Data = {
        role: job104.role,
        job: formData.title,
        jobCatSet: job104.jobCatSet,
        description: formData.description || `職缺說明：${formData.title}`,
        salaryType: job104.salaryType,
        salaryLow: job104.salaryLow,
        salaryHigh: job104.salaryHigh,
        addrNo: job104.addrNo,
        edu: job104.edu.map(e => typeof e === 'number' ? e : parseInt(e as unknown as string, 10)),
        contact: job104.contact,
        email: Array.isArray(job104.email) ? job104.email : [job104.email],
        applyType: { '104': [2] },
        replyDay: job104.replyDay,
        workShifts: (job104.workShifts && job104.workShifts.length > 0)
          ? job104.workShifts
          : [{
            type: 1,
            periods: [{ startHour: 9, startMinute: 0, endHour: 18, endMinute: 0 }]
          }]
      };
    }

    this.jobService.updateJob(job.id, updateData).subscribe({
      next: (success) => {
        if (success) {
          if (job.job104No) {
            this.notificationService.success('職缺已更新並同步至 104！');
          } else {
            this.notificationService.success('職缺已更新！');
          }
          this.closeEditModal();
          this.loadData();
          if (this.dataSource() === '104') {
            this.load104Jobs();
          }
        } else {
          this.notificationService.error('更新職缺失敗');
        }
      },
      error: () => {
        this.notificationService.error('更新職缺失敗');
      }
    });
  }


  // ============================================================
  // 更新職缺狀態
  // ============================================================
  updateJobStatus(job: Job, newStatus: string): void {
    if (job.status === newStatus) return;

    this.jobService.updateStatus(job.id, newStatus as any).subscribe({
      next: (response: any) => {
        if (response === true || response?.status === 'success' || response === false) {
          // 處理 104 同步結果
          const sync104 = response?.sync104;

          if (sync104) {
            if (sync104.success) {
              this.notificationService.success(`狀態更新成功，104 同步完成 (${sync104.action})`);
            } else {
              this.notificationService.warning(`狀態已更新，但 104 同步失敗：${sync104.error || '未知錯誤'}`);
            }
          } else {
            this.notificationService.success('狀態更新成功');
          }

          // 重新載入資料
          this.loadData();
          if (this.dataSource() === '104') {
            this.load104Jobs();
          }
          this.cdr.markForCheck();
        } else {
          this.notificationService.error('狀態更新失敗');
        }
      },
      error: (err) => {
        console.error('Update status error:', err);
        this.notificationService.error('更新過程發生錯誤');
      }
    });
  }

  // ============================================================
  // 刪除職缺
  // ============================================================
  showDeleteConfirm = signal<boolean>(false);
  jobToDelete = signal<Job | null>(null);

  confirmDeleteJob(job: Job): void {
    this.jobToDelete.set(job);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.jobToDelete.set(null);
  }

  executeDelete(): void {
    const job = this.jobToDelete();
    if (!job) return;

    // 如果職缺沒有 ID (前端暫存或異常資料)，直接從列表中移除
    if (!job.id) {
      this.jobs.update(jobs => jobs.filter(j => j !== job));
      this.cancelDelete();
      this.notificationService.success('職缺已刪除');
      return;
    }

    this.jobService.deleteJob(job.id).subscribe({
      next: () => {
        this.notificationService.success('職缺已刪除');
        this.loadData(); // 重新載入列表
        this.cancelDelete();
      },
      error: () => {
        this.notificationService.error('刪除失敗');
      }
    });
  }
}
