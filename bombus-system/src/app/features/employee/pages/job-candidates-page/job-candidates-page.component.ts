import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobService } from '../../services/job.service';
import { JobCandidate, CandidateStats } from '../../models/job.model';

@Component({
  selector: 'app-job-candidates-page',
  standalone: true,
  imports: [FormsModule, HeaderComponent, StatCardComponent],
  templateUrl: './job-candidates-page.component.html',
  styleUrl: './job-candidates-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobCandidatesPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);
  private notificationService = inject(NotificationService);

  // Signals
  candidates = signal<JobCandidate[]>([]);
  stats = signal<CandidateStats | null>(null);
  loading = signal<boolean>(false);
  jobId = signal<string>('');
  jobTitle = signal<string>('資深前端工程師');

  // Filter signals
  searchQuery = signal<string>('');
  scoreFilter = signal<string>('');
  statusFilter = signal<string>('');

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.jobId.set(params['jobId']);
      }
    });
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.jobService.getCandidateStats().subscribe({
      next: (stats) => this.stats.set(stats)
    });

    this.jobService.getCandidates(this.jobId()).subscribe({
      next: (candidates) => {
        this.candidates.set(candidates);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('載入候選人列表失敗');
        this.loading.set(false);
      }
    });
  }

  filteredCandidates(): JobCandidate[] {
    let result = this.candidates();
    const query = this.searchQuery().toLowerCase();
    const score = this.scoreFilter();
    const status = this.statusFilter();

    if (query) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.nameEn.toLowerCase().includes(query) ||
        c.education.toLowerCase().includes(query) ||
        c.skills.some(s => s.toLowerCase().includes(query))
      );
    }

    if (score) {
      const minScore = parseInt(score, 10);
      result = result.filter(c => c.matchScore >= minScore);
    }

    if (status) {
      result = result.filter(c => c.status === status);
    }

    return result;
  }

  viewProfile(candidate: JobCandidate): void {
    this.router.navigate(['/employee/profile-detail'], {
      queryParams: { candidateId: candidate.id }
    });
  }

  goBack(): void {
    this.router.navigate(['/employee/jobs']);
  }

  getScoreClass(level: string): string {
    const classes: Record<string, string> = {
      high: 'score--high',
      medium: 'score--medium',
      low: 'score--low'
    };
    return classes[level] || '';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      new: 'status--new',
      interview: 'status--interview',
      rejected: 'status--rejected',
      hired: 'status--hired'
    };
    return classes[status] || '';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      new: '新進履歷',
      interview: '面試中',
      rejected: '已婉拒',
      hired: '已錄用'
    };
    return labels[status] || status;
  }

  getInitial(name: string): string {
    return name.charAt(0);
  }
}

