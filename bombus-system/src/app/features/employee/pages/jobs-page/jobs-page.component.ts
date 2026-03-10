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
import { OrgUnitService } from '../../../../core/services/org-unit.service';

// 新增候選人表單介面
interface NewCandidateForm {
  // 基本資料
  name: string;
  nameEn: string;
  gender: string;
  birthday: string;
  email: string;
  phone: string;
  tel: string;
  contactInfo: string;
  address: string;
  nationality: string;
  militaryStatus: string;
  drivingLicenses: string;
  transports: string;
  // 求職條件
  jobCharacteristic: string;
  workInterval: string;
  shiftWork: boolean | null;
  startDateOpt: string;
  expectedSalary: string;
  preferredLocation: string;
  preferredJobName: string;
  preferredJobCategory: string;
  preferredIndustry: string;
  introduction: string;
  motto: string;
  characteristic: string;
  certificates: string;
  // 學經歷
  educationList: EducationEntry[];
  experienceList: ExperienceEntry[];
  skillsText: string;
  // 推薦人
  recommenderList: RecommenderEntry[];
}

interface EducationEntry {
  schoolName: string;
  major: string;
  degreeLevel: string;
  degreeStatus: string;
}

interface ExperienceEntry {
  firmName: string;
  jobName: string;
  industryCategory: string;
  startDate: string;
  endDate: string;
  jobDesc: string;
}

interface RecommenderEntry {
  name: string;
  corp: string;
  jobTitle: string;
  tel: string;
  email: string;
}

// 104 匯入排程設定介面
interface Import104Schedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  dailyTime: string;
  weeklyDays: number[];
  weeklyTime: string;
  monthlyDates: number[];
  monthlyTime: string;
}

// 104 匯入進度介面
interface ImportProgress {
  isImporting: boolean;
  currentIndex: number;
  totalResumes: number;
  jobs: ImportJobStatus[];
}

interface ImportJobStatus {
  jobId: string;
  jobTitle: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  resumeCount: number;
}

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
  private orgUnitService = inject(OrgUnitService);

  // Signals
  jobs = signal<Job[]>([]);
  jobs104 = signal<Job[]>([]);  // 104 職缺列表
  stats = signal<JobStats | null>(null);
  loading = signal<boolean>(false);
  loading104 = signal<boolean>(false);  // 104 載入狀態
  showModal = signal<boolean>(false);
  showImportModal = signal<boolean>(false);
  selectedJobForImport = signal<Job | null>(null);

  // ============================================================
  // 新增候選人相關 Signals
  // ============================================================
  candidateFormTab = signal<number>(1);
  candidateAttachments = signal<File[]>([]);
  newCandidate = signal<NewCandidateForm>({
    // 基本資料
    name: '',
    nameEn: '',
    gender: '',
    birthday: '',
    email: '',
    phone: '',
    tel: '',
    contactInfo: '',
    address: '',
    nationality: '',
    militaryStatus: '',
    drivingLicenses: '',
    transports: '',
    // 求職條件
    jobCharacteristic: '',
    workInterval: '',
    shiftWork: null,
    startDateOpt: '',
    expectedSalary: '',
    preferredLocation: '',
    preferredJobName: '',
    preferredJobCategory: '',
    preferredIndustry: '',
    introduction: '',
    motto: '',
    characteristic: '',
    certificates: '',
    // 學經歷
    educationList: [{ schoolName: '', major: '', degreeLevel: '', degreeStatus: '' }],
    experienceList: [{ firmName: '', jobName: '', industryCategory: '', startDate: '', endDate: '', jobDesc: '' }],
    skillsText: '',
    // 推薦人
    recommenderList: []
  });

  // 資料來源切換
  dataSource = signal<'internal' | '104'>('internal');

  // ============================================================
  // 104 匯入設定相關 Signals
  // ============================================================
  showImport104SettingsModal = signal<boolean>(false);
  showImport104ProgressModal = signal<boolean>(false);
  
  import104Schedule = signal<Import104Schedule>({
    enabled: false,
    frequency: 'daily',
    dailyTime: '09:00',
    weeklyDays: [1], // 預設星期一
    weeklyTime: '09:00',
    monthlyDates: [1], // 預設 1 號
    monthlyTime: '09:00'
  });
  
  import104Progress = signal<ImportProgress>({
    isImporting: false,
    currentIndex: 0,
    totalResumes: 0,
    jobs: []
  });
  
  // 時間選項（00:00 ~ 23:00）
  timeOptions = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  );
  
  // 星期選項
  weekDays = [
    { value: 0, label: '日' },
    { value: 1, label: '一' },
    { value: 2, label: '二' },
    { value: 3, label: '三' },
    { value: 4, label: '四' },
    { value: 5, label: '五' },
    { value: 6, label: '六' }
  ];
  
  // 日期選項（1~31）
  monthDays = Array.from({ length: 31 }, (_, i) => i + 1);

  // JD 列表
  jobDescriptions = signal<JobDescription[]>([]);

  // 子公司/部門篩選（頁面篩選列）
  selectedSubsidiaryId = signal<string>('');
  subsidiaries = this.orgUnitService.subsidiaries;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Modal 專用子公司篩選（獨立於頁面篩選列）
  modalSubsidiaryId = signal<string>('');
  modalFilteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.modalSubsidiaryId()));

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
    this.orgUnitService.loadOrgUnits().subscribe();
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
    this.modalSubsidiaryId.set(this.selectedSubsidiaryId());
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

  // ============================================================
  // 新增候選人相關
  // ============================================================
  openImportModal(job: Job): void {
    this.selectedJobForImport.set(job);
    this.resetCandidateForm();
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
    this.selectedJobForImport.set(null);
    this.resetCandidateForm();
  }

  // 頁籤切換
  setCandidateFormTab(tab: number): void {
    this.candidateFormTab.set(tab);
  }

  prevCandidateTab(): void {
    const current = this.candidateFormTab();
    if (current > 1) {
      this.candidateFormTab.set(current - 1);
    }
  }

  nextCandidateTab(): void {
    const current = this.candidateFormTab();
    if (current < 4) {
      this.candidateFormTab.set(current + 1);
    }
  }

  // 學歷操作
  addEducation(): void {
    this.newCandidate.update(c => ({
      ...c,
      educationList: [...c.educationList, { schoolName: '', major: '', degreeLevel: '', degreeStatus: '' }]
    }));
  }

  removeEducation(index: number): void {
    this.newCandidate.update(c => ({
      ...c,
      educationList: c.educationList.filter((_, i) => i !== index)
    }));
  }

  // 工作經歷操作
  addExperience(): void {
    this.newCandidate.update(c => ({
      ...c,
      experienceList: [...c.experienceList, { firmName: '', jobName: '', industryCategory: '', startDate: '', endDate: '', jobDesc: '' }]
    }));
  }

  removeExperience(index: number): void {
    this.newCandidate.update(c => ({
      ...c,
      experienceList: c.experienceList.filter((_, i) => i !== index)
    }));
  }

  // 推薦人操作
  addRecommender(): void {
    this.newCandidate.update(c => ({
      ...c,
      recommenderList: [...c.recommenderList, { name: '', corp: '', jobTitle: '', tel: '', email: '' }]
    }));
  }

  removeRecommender(index: number): void {
    this.newCandidate.update(c => ({
      ...c,
      recommenderList: c.recommenderList.filter((_, i) => i !== index)
    }));
  }

  // 附件上傳
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      this.candidateAttachments.update(files => [...files, ...newFiles]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer?.files) {
      const newFiles = Array.from(event.dataTransfer.files);
      this.candidateAttachments.update(files => [...files, ...newFiles]);
    }
  }

  removeAttachment(index: number): void {
    this.candidateAttachments.update(files => files.filter((_, i) => i !== index));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 表單驗證
  hasTabErrors(tab: number): boolean {
    const c = this.newCandidate();
    switch (tab) {
      case 1: // 基本資料
        return !c.name || !c.nameEn || !c.gender || !c.birthday || 
               !c.email || !c.phone || !c.contactInfo || !c.address || !c.nationality;
      case 2: // 求職條件
        return !c.jobCharacteristic || !c.workInterval || c.shiftWork === null;
      case 3: // 學經歷
        const hasValidEdu = c.educationList.some(e => 
          e.schoolName && e.major && e.degreeLevel && e.degreeStatus);
        const hasValidExp = c.experienceList.some(e => 
          e.firmName && e.jobName && e.industryCategory && e.startDate && e.jobDesc);
        return !hasValidEdu || !hasValidExp;
      default:
        return false;
    }
  }

  isCandidateFormValid(): boolean {
    return !this.hasTabErrors(1) && !this.hasTabErrors(2) && !this.hasTabErrors(3);
  }

  // 提交候選人
  submitCandidate(): void {
    if (!this.isCandidateFormValid()) {
      this.notificationService.error('請填寫所有必填欄位');
      return;
    }

    const job = this.selectedJobForImport();
    if (!job) return;

    // TODO: 呼叫 API 建立候選人
    console.log('Submitting candidate:', {
      jobId: job.id,
      candidate: this.newCandidate(),
      attachments: this.candidateAttachments()
    });

    this.notificationService.success('候選人新增成功！已觸發 AI 履歷評分');
    this.closeImportModal();
    this.loadData();
  }

  // 重置候選人表單
  private resetCandidateForm(): void {
    this.candidateFormTab.set(1);
    this.candidateAttachments.set([]);
    this.newCandidate.set({
      name: '',
      nameEn: '',
      gender: '',
      birthday: '',
      email: '',
      phone: '',
      tel: '',
      contactInfo: '',
      address: '',
      nationality: '',
      militaryStatus: '',
      drivingLicenses: '',
      transports: '',
      jobCharacteristic: '',
      workInterval: '',
      shiftWork: null,
      startDateOpt: '',
      expectedSalary: '',
      preferredLocation: '',
      preferredJobName: '',
      preferredJobCategory: '',
      preferredIndustry: '',
      introduction: '',
      motto: '',
      characteristic: '',
      certificates: '',
      educationList: [{ schoolName: '', major: '', degreeLevel: '', degreeStatus: '' }],
      experienceList: [{ firmName: '', jobName: '', industryCategory: '', startDate: '', endDate: '', jobDesc: '' }],
      skillsText: '',
      recommenderList: []
    });
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
    this.modalSubsidiaryId.set(this.selectedSubsidiaryId());
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

  // ============================================================
  // 104 匯入設定相關方法
  // ============================================================
  
  /** 開啟匯入設定 Modal */
  openImport104SettingsModal(): void {
    this.showImport104SettingsModal.set(true);
  }
  
  /** 關閉匯入設定 Modal */
  closeImport104SettingsModal(): void {
    this.showImport104SettingsModal.set(false);
  }
  
  /** 更新匯入排程設定 */
  updateImport104Schedule(field: keyof Import104Schedule, value: any): void {
    this.import104Schedule.update(schedule => ({
      ...schedule,
      [field]: value
    }));
  }
  
  /** 切換星期選擇 */
  toggleWeekday(day: number): void {
    this.import104Schedule.update(schedule => {
      const days = [...schedule.weeklyDays];
      const index = days.indexOf(day);
      if (index > -1) {
        // 至少保留一天
        if (days.length > 1) {
          days.splice(index, 1);
        }
      } else {
        days.push(day);
        days.sort((a, b) => a - b);
      }
      return { ...schedule, weeklyDays: days };
    });
  }
  
  /** 更新每月日期 */
  updateMonthlyDate(index: number, date: number): void {
    this.import104Schedule.update(schedule => {
      const dates = [...schedule.monthlyDates];
      dates[index] = date;
      return { ...schedule, monthlyDates: dates };
    });
  }
  
  /** 新增每月日期 */
  addMonthlyDate(): void {
    this.import104Schedule.update(schedule => ({
      ...schedule,
      monthlyDates: [...schedule.monthlyDates, 1]
    }));
  }
  
  /** 移除每月日期 */
  removeMonthlyDate(index: number): void {
    this.import104Schedule.update(schedule => ({
      ...schedule,
      monthlyDates: schedule.monthlyDates.filter((_, i) => i !== index)
    }));
  }
  
  /** 儲存匯入排程設定 */
  saveImport104Schedule(): void {
    const schedule = this.import104Schedule();
    // TODO: 呼叫 API 儲存排程設定
    console.log('Saving import schedule:', schedule);
    this.notificationService.success('匯入排程設定已儲存');
    this.closeImport104SettingsModal();
  }
  
  /** 開始手動匯入 */
  startManualImport(): void {
    this.closeImport104SettingsModal();
    
    // 準備匯入進度資料（從已發布的 104 職缺）
    const publishedJobs = this.jobs104().filter(job => job.status === 'published');
    
    if (publishedJobs.length === 0) {
      this.notificationService.warning('目前沒有已發布的 104 職缺');
      return;
    }
    
    const jobStatusList: ImportJobStatus[] = publishedJobs.map(job => ({
      jobId: job.job104No || job.id,
      jobTitle: job.title,
      status: 'pending' as const,
      resumeCount: 0
    }));
    
    this.import104Progress.set({
      isImporting: true,
      currentIndex: 0,
      totalResumes: 0,
      jobs: jobStatusList
    });
    
    this.showImport104ProgressModal.set(true);
    
    // 開始模擬匯入流程
    this.processImportQueue();
  }
  
  /** 處理匯入佇列（模擬） */
  private processImportQueue(): void {
    const progress = this.import104Progress();
    
    if (!progress.isImporting || progress.currentIndex >= progress.jobs.length) {
      // 匯入完成
      this.import104Progress.update(p => ({ ...p, isImporting: false }));
      this.cdr.markForCheck();
      return;
    }
    
    // 標記當前職缺為處理中
    this.import104Progress.update(p => {
      const jobs = [...p.jobs];
      jobs[p.currentIndex] = { ...jobs[p.currentIndex], status: 'processing' };
      return { ...p, jobs };
    });
    this.cdr.markForCheck();
    
    // 模擬 API 呼叫延遲（1~3秒）
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      // 模擬取得履歷數量（0~15）
      const resumeCount = Math.floor(Math.random() * 16);
      
      this.import104Progress.update(p => {
        const jobs = [...p.jobs];
        jobs[p.currentIndex] = { 
          ...jobs[p.currentIndex], 
          status: 'completed',
          resumeCount 
        };
        return { 
          ...p, 
          jobs,
          currentIndex: p.currentIndex + 1,
          totalResumes: p.totalResumes + resumeCount
        };
      });
      this.cdr.markForCheck();
      
      // 處理下一個職缺
      this.processImportQueue();
    }, delay);
  }
  
  /** 取消匯入 */
  cancelImport104(): void {
    this.import104Progress.update(p => ({ ...p, isImporting: false }));
    this.showImport104ProgressModal.set(false);
    this.notificationService.info('匯入已取消');
  }
  
  /** 關閉匯入進度 Modal */
  closeImport104ProgressModal(): void {
    this.showImport104ProgressModal.set(false);
    // 重新載入 104 職缺列表以顯示最新履歷
    this.load104Jobs();
  }
  
  /** 計算匯入進度百分比 */
  getImportProgressPercent(): number {
    const progress = this.import104Progress();
    if (progress.jobs.length === 0) return 0;
    return Math.round((progress.currentIndex / progress.jobs.length) * 100);
  }
}
