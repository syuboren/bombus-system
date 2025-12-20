import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
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

  // Signals
  jobs = signal<Job[]>([]);
  stats = signal<JobStats | null>(null);
  loading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  showImportModal = signal<boolean>(false);
  selectedJobForImport = signal<Job | null>(null);

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
    jdId: ''  // 新增: 關聯的 JD ID
  });

  // Computed: 根據選擇的 JD 自動填入資訊
  selectedJD = computed(() => {
    const jdId = this.newJob().jdId;
    if (!jdId) return null;
    return this.jobDescriptions().find(jd => jd.id === jdId) || null;
  });

  ngOnInit(): void {
    this.loadData();
    this.loadJobDescriptions();
  }

  loadData(): void {
    this.loading.set(true);

    this.jobService.getJobStats().subscribe({
      next: (stats) => this.stats.set(stats)
    });

    this.jobService.getJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('載入職缺列表失敗');
        this.loading.set(false);
      }
    });
  }

  loadJobDescriptions(): void {
    this.competencyService.getJobDescriptions().subscribe({
      next: (jds) => this.jobDescriptions.set(jds)
    });
  }

  filteredJobs(): Job[] {
    let result = this.jobs();
    const query = this.searchQuery().toLowerCase();
    const dept = this.departmentFilter();
    const status = this.statusFilter();

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
  }

  viewCandidates(job: Job): void {
    this.router.navigate(['/employee/job-candidates'], {
      queryParams: { jobId: job.id }
    });
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

    this.jobService.createJob({
      title: formData.title,
      department: formData.department,
      recruiter: formData.recruiter
    }).subscribe({
      next: () => {
        this.notificationService.success('職缺已成功發布！');
        this.closeModal();
        this.loadData();
      },
      error: () => {
        this.notificationService.error('發布職缺失敗');
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
      jdId: ''
    });
  }
}

