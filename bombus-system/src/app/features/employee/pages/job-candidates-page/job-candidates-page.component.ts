import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobService } from '../../services/job.service';
import { JobCandidate, CandidateStats } from '../../models/job.model';

interface CandidateWithUI extends JobCandidate {
  aiScoringStatus: 'pending' | 'scoring' | 'scored';
  displayScore: number;
}

@Component({
  selector: 'app-job-candidates-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, StatCardComponent],
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
  candidates = signal<CandidateWithUI[]>([]);
  stats = signal<CandidateStats | null>(null);
  loading = signal<boolean>(false);
  jobId = signal<string>('');
  jobTitle = signal<string>('資深前端工程師');

  // AI Scoring
  isAIScoring = signal<boolean>(false);
  aiScoringProgress = signal<number>(0);
  aiScoringMessage = signal<string>('');

  // Interview Modal
  showInterviewModal = signal<boolean>(false);
  selectedCandidateForInterview = signal<CandidateWithUI | null>(null);
  interviewDate = signal<string>('');
  interviewTime = signal<string>('');
  interviewType = signal<string>('onsite');
  interviewNotes = signal<string>('');
  selectedInterviewer = signal<string>('');

  // 面試官選項
  readonly interviewerOptions = [
    { id: 'INT-001', name: '張經理', department: '人資部', title: '人資經理' },
    { id: 'INT-002', name: '李副理', department: '人資部', title: '人資副理' },
    { id: 'INT-003', name: '王主管', department: '人資部', title: '招募主管' },
    { id: 'INT-004', name: '陳總監', department: '人資部', title: '人資總監' },
    { id: 'INT-005', name: '林經理', department: '業務部', title: '業務經理' },
    { id: 'INT-006', name: '黃經理', department: '技術部', title: '技術經理' }
  ];

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
        // 添加 UI 狀態字段，初始狀態為未評分
        const candidatesWithUI: CandidateWithUI[] = candidates.map(c => ({
          ...c,
          aiScoringStatus: 'pending' as const,
          displayScore: 0
        }));
        this.candidates.set(candidatesWithUI);
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('載入候選人列表失敗');
        this.loading.set(false);
      }
    });
  }

  filteredCandidates(): CandidateWithUI[] {
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
      result = result.filter(c => c.matchScore >= minScore && c.aiScoringStatus === 'scored');
    }

    if (status) {
      result = result.filter(c => c.status === status);
    }

    return result;
  }

  // 批量 AI 評分
  batchAIScoring(): void {
    const pendingCandidates = this.candidates().filter(c => c.aiScoringStatus === 'pending');
    
    if (pendingCandidates.length === 0) {
      this.notificationService.info('所有候選人都已完成評分');
      return;
    }

    this.isAIScoring.set(true);
    this.aiScoringProgress.set(0);
    this.aiScoringMessage.set('正在初始化 AI 評分引擎...');

    const messages = [
      '正在分析職位需求與職能基準...',
      '正在解析候選人履歷內容...',
      '正在進行職能匹配度計算...',
      '正在生成評分報告...',
      '評分完成！'
    ];

    let currentStep = 0;
    const totalSteps = messages.length;
    const stepDuration = 800;

    const interval = setInterval(() => {
      currentStep++;
      const progress = Math.min((currentStep / totalSteps) * 100, 100);
      this.aiScoringProgress.set(progress);
      
      if (currentStep < messages.length) {
        this.aiScoringMessage.set(messages[currentStep]);
      }

      if (currentStep >= totalSteps) {
        clearInterval(interval);
        
        // 更新候選人狀態為已評分
        const updatedCandidates = this.candidates().map(c => {
          if (c.aiScoringStatus === 'pending') {
            return { ...c, aiScoringStatus: 'scored' as const };
          }
          return c;
        });
        this.candidates.set(updatedCandidates);

        // 關閉動畫
        setTimeout(() => {
          this.isAIScoring.set(false);
          this.notificationService.success(`已完成 ${pendingCandidates.length} 位候選人的 AI 評分`);
          
          // 啟動分數動畫
          this.animateScores();
        }, 500);
      }
    }, stepDuration);
  }

  // 分數動畫效果
  private animateScores(): void {
    const candidates = this.candidates();
    const duration = 1500; // 動畫持續時間
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 easeOutExpo 緩動函數
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const updatedCandidates = candidates.map(c => {
        if (c.aiScoringStatus === 'scored') {
          return {
            ...c,
            displayScore: Math.round(c.matchScore * easeProgress)
          };
        }
        return c;
      });
      
      this.candidates.set(updatedCandidates);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  // 打開面試邀約 Modal
  openInterviewModal(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    this.selectedCandidateForInterview.set(candidate);
    this.interviewDate.set('');
    this.interviewTime.set('10:00');
    this.interviewType.set('onsite');
    this.interviewNotes.set('');
    this.selectedInterviewer.set('');
    this.showInterviewModal.set(true);
  }

  closeInterviewModal(): void {
    this.showInterviewModal.set(false);
    this.selectedCandidateForInterview.set(null);
  }

  confirmInterview(): void {
    const candidate = this.selectedCandidateForInterview();
    if (!candidate || !this.interviewDate()) {
      this.notificationService.error('請選擇面試日期');
      return;
    }

    // 更新候選人狀態為已安排面試
    const updatedCandidates = this.candidates().map(c => {
      if (c.id === candidate.id) {
        return { ...c, status: 'interview' as const };
      }
      return c;
    });
    this.candidates.set(updatedCandidates);

    this.notificationService.success(
      `已發送面試邀請給 ${candidate.name}，面試時間：${this.interviewDate()} ${this.interviewTime()}`
    );
    this.closeInterviewModal();
  }

  // 獲取今天日期（用於日期選擇器的最小值）
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
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
      interview: '已安排面試',
      rejected: '已婉拒',
      hired: '已錄用'
    };
    return labels[status] || status;
  }

  getInitial(name: string): string {
    return name.charAt(0);
  }

  // AI 評分狀態
  getScoringStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'scoring--pending',
      scoring: 'scoring--scoring',
      scored: 'scoring--scored'
    };
    return classes[status] || 'scoring--scored';
  }

  getScoringStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待評分',
      scoring: '評分中',
      scored: '已評分'
    };
    return labels[status] || '已評分';
  }

  // 觸發 AI 評分
  triggerAIScoring(candidate: JobCandidate): void {
    this.notificationService.info(`正在對 ${candidate.name} 進行 AI 履歷評分...`);
    // 模擬 AI 評分過程
    setTimeout(() => {
      this.notificationService.success(`${candidate.name} 的 AI 評分已完成！`);
      this.loadData();
    }, 2000);
  }

  // 邀請面試 - 改為打開 Modal
  inviteCandidate(candidate: CandidateWithUI, event: Event): void {
    this.openInterviewModal(candidate, event);
  }

  // 婉拒候選人
  rejectCandidate(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    
    // 更新狀態
    const updatedCandidates = this.candidates().map(c => {
      if (c.id === candidate.id) {
        return { ...c, status: 'rejected' as const };
      }
      return c;
    });
    this.candidates.set(updatedCandidates);
    
    this.notificationService.info(`已婉拒 ${candidate.name}，將發送感謝信`);
  }
}

