import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobService } from '../../services/job.service';
import { CandidateDetail } from '../../models/job.model';

@Component({
  selector: 'app-profile-detail-page',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './profile-detail-page.component.html',
  styleUrl: './profile-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileDetailPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);
  private notificationService = inject(NotificationService);

  // Signals
  candidate = signal<CandidateDetail | null>(null);
  loading = signal<boolean>(false);
  candidateId = signal<string>('');

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['candidateId']) {
        this.candidateId.set(params['candidateId']);
        this.loadCandidate(params['candidateId']);
      } else {
        // 預設載入第一個候選人
        this.loadCandidate('C001');
      }
    });
  }

  loadCandidate(id: string): void {
    this.loading.set(true);
    this.jobService.getCandidateDetail(id).subscribe({
      next: (detail) => {
        this.candidate.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('載入候選人資料失敗');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/employee/job-candidates']);
  }

  goToInterview(): void {
    this.router.navigate(['/employee/recruitment'], {
      queryParams: { candidateId: this.candidateId() }
    });
  }

  downloadResume(): void {
    this.notificationService.success('履歷下載中...');
  }

  getInitial(name: string): string {
    return name?.charAt(0) || '';
  }

  getSkillClass(level: string): string {
    const classes: Record<string, string> = {
      high: 'skill--high',
      medium: 'skill--medium',
      low: 'skill--low'
    };
    return classes[level] || '';
  }
}

