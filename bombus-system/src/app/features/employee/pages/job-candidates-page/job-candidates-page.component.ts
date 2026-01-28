import { Component, ChangeDetectionStrategy, inject, signal, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { CircularProgressComponent } from '../../../../shared/components/circular-progress/circular-progress.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobService } from '../../services/job.service';
import { JobCandidate, CandidateStats } from '../../models/job.model';

// New Imports
import { InviteCandidateModalComponent } from '../../components/invite-candidate-modal/invite-candidate-modal.component';
import { HiringDecisionModalComponent } from '../../components/hiring-decision-modal/hiring-decision-modal.component';
import { InterviewScoringModalComponent } from '../../components/interview-scoring-modal/interview-scoring-modal.component';
import { InterviewService } from '../../services/interview.service';
import { CandidateDetail } from '../../models/candidate.model';

interface CandidateWithUI extends JobCandidate {
  aiScoringStatus: 'pending' | 'scoring' | 'scored';
  displayScore: number;
}

@Component({
  selector: 'app-job-candidates-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    StatCardComponent,
    CircularProgressComponent,
    InviteCandidateModalComponent,
    HiringDecisionModalComponent,
    InterviewScoringModalComponent
  ],
  templateUrl: './job-candidates-page.component.html',
  styleUrl: './job-candidates-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobCandidatesPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);
  private interviewService = inject(InterviewService);
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

  // Modals Visibility
  showInviteModal = signal<boolean>(false);
  showDecisionModal = signal<boolean>(false);
  showScoringModal = signal<boolean>(false);

  // Existing Interview Modal (Scheduling)
  showInterviewModal = signal<boolean>(false);

  // Selected Candidates
  selectedCandidate = signal<CandidateDetail | null>(null);
  selectedCandidateForInterview = signal<CandidateWithUI | null>(null);

  interviewDate = signal<string>('');
  interviewTime = signal<string>('');
  interviewType = signal<string>('onsite');
  interviewNotes = signal<string>('');
  meetingLink = signal<string>('');
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

  // 熱門標籤
  readonly popularTags = ['React', 'Angular', 'Python', 'Java', 'AWS', 'Node.js', 'Spring Boot', 'Docker'];

  // Tab 配置（統一狀態標籤）
  readonly statusTabs = [
    { key: '', label: '全部', icon: 'ri-list-check' },
    { key: 'new', label: '新進履歷', icon: 'ri-file-user-line' },
    { key: 'invited', label: '已邀請', icon: 'ri-mail-send-line' },
    { key: 'pending-schedule', label: '待安排', icon: 'ri-calendar-2-line' },
    { key: 'reschedule', label: '待改期', icon: 'ri-calendar-todo-line' },
    { key: 'interview', label: '已安排面試', icon: 'ri-calendar-check-line' },
    { key: 'declined', label: '已婉拒', icon: 'ri-close-circle-line' },  // 候選人婉拒（合併顯示）
    { key: 'offered', label: '待回覆 Offer', icon: 'ri-mail-star-line' },
    { key: 'offer_accepted', label: '已錄取同意', icon: 'ri-trophy-line' },
    { key: 'not_continued', label: '已結束', icon: 'ri-user-unfollow-line' }  // 不邀請 + 未錄取 + Offer 婉拒
  ];

  // Offer 回覆連結 Modal
  showOfferLinkModal = signal<boolean>(false);
  offerResponseLink = signal<string>('');

  // Filter signals
  searchQuery = signal<string>('');
  scoreFilter = signal<string>('');
  statusFilter = signal<string>('');

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        this.jobId.set(params['jobId']);
      }
      // Load data after jobId is set (or even if empty, load all)
      this.loadData();
    });
  }

  loadData(): void {
    this.loading.set(true);

    this.jobService.getCandidateStats().subscribe({
      next: (stats) => this.stats.set(stats)
    });

    this.jobService.getCandidates(this.jobId()).subscribe({
      next: (candidates) => {
        // 保留現有的 AI 評分狀態，避免覆蓋
        const existingCandidates = this.candidates();
        const existingState = new Map(
          existingCandidates.map(c => [c.id, { aiScoringStatus: c.aiScoringStatus, displayScore: c.displayScore }])
        );

        const candidatesWithUI: CandidateWithUI[] = candidates.map(c => ({
          ...c,
          // 保留現有的 AI 評分狀態，如果候選人是新的則設為 pending
          aiScoringStatus: existingState.get(c.id)?.aiScoringStatus || 'pending',
          displayScore: existingState.get(c.id)?.displayScore || 0
        }));

        // 確保 Signal 更新會觸發變更檢測
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
      if (status === 'pending-schedule') {
        result = result.filter(c => c.status === 'invited' && c.candidateResponse === 'accepted');
      } else if (status === 'invited') {
        result = result.filter(c => c.status === 'invited' && c.candidateResponse !== 'accepted');
      } else if (status === 'declined') {
        // 候選人婉拒：邀請婉拒、面試婉拒、舊 rejected 狀態
        result = result.filter(c => 
          c.status === 'invite_declined' || 
          c.status === 'interview_declined' || 
          (c.status === 'rejected' && c.stage !== 'OfferDeclined')
        );
      } else if (status === 'not_continued') {
        // 已結束：不邀請、未錄取、Offer 婉拒
        result = result.filter(c => 
          c.status === 'not_invited' || 
          c.status === 'not_hired' || 
          c.status === 'offer_declined' ||
          c.stage === 'OfferDeclined'
        );
      } else {
        result = result.filter(c => c.status === status);
      }
    }

    return result;
  }

  /**
   * 取得各 Tab 的候選人數量
   */
  getTabCount(statusKey: string): number {
    const all = this.candidates();
    if (!statusKey) return all.length; // 全部

    if (statusKey === 'pending-schedule') {
      return all.filter(c => c.status === 'invited' && c.candidateResponse === 'accepted').length;
    }

    if (statusKey === 'invited') {
      return all.filter(c => c.status === 'invited' && c.candidateResponse !== 'accepted').length;
    }

    if (statusKey === 'declined') {
      // 候選人婉拒
      return all.filter(c => 
        c.status === 'invite_declined' || 
        c.status === 'interview_declined' || 
        (c.status === 'rejected' && c.stage !== 'OfferDeclined')
      ).length;
    }

    if (statusKey === 'not_continued') {
      // 已結束：不邀請、未錄取、Offer 婉拒
      return all.filter(c => 
        c.status === 'not_invited' || 
        c.status === 'not_hired' || 
        c.status === 'offer_declined' ||
        c.stage === 'OfferDeclined'
      ).length;
    }

    return all.filter(c => c.status === statusKey).length;
  }

  // 批量 AI 評分 (Existing logic)
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

        const updatedCandidates = this.candidates().map(c => {
          if (c.aiScoringStatus === 'pending') {
            return { ...c, aiScoringStatus: 'scored' as const };
          }
          return c;
        });
        this.candidates.set(updatedCandidates);

        setTimeout(() => {
          this.isAIScoring.set(false);
          this.notificationService.success(`已完成 ${pendingCandidates.length} 位候選人的 AI 評分`);
          this.animateScores();
        }, 500);
      }
    }, stepDuration);
  }

  private animateScores(): void {
    const candidates = this.candidates();
    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

  // ============================================
  // New Modal Actions
  // ============================================

  private mapToDetail(c: JobCandidate): CandidateDetail {
    return {
      id: c.id,
      name: c.name,
      position: this.jobTitle(),
      email: c.email,
      status: c.status,
      jobId: this.jobId(),
      rescheduleNote: c.rescheduleNote,
      // Extend with other props if needed
    } as unknown as CandidateDetail;
  }

  inviteCandidate(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    this.selectedCandidate.set(this.mapToDetail(candidate));
    this.showInviteModal.set(true);
  }

  decideCandidate(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    this.selectedCandidate.set(this.mapToDetail(candidate));
    this.showDecisionModal.set(true);
  }

  scoreCandidate(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    this.selectedCandidate.set(this.mapToDetail(candidate));
    this.showScoringModal.set(true);
  }

  rejectCandidate(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();

    // Early-stage rejection: use simple confirmation
    if (confirm(`確定要婉拒候選人「${candidate.name}」嗎？\n\n此操作將結束此候選人的招募流程。`)) {
      this.loading.set(true);

      // Call the decision service with 'Rejected' status
      this.interviewService.makeDecision(candidate.id, 'Rejected', '早期階段婉拒')
        .subscribe({
          next: () => {
            this.notificationService.success(`已婉拒候選人 ${candidate.name}`);
            this.loadData();
          },
          error: () => {
            this.notificationService.error('婉拒操作失敗，請稍後再試');
            this.loading.set(false);
          }
        });
    }
  }

  onInvited() {
    this.loadData();
    // 邀約成功後，顯示可複製的回覆連結
    if (this.selectedCandidate()) {
      const candidateId = this.selectedCandidate()!.id;
      this.interviewService.getResponseLink(candidateId).subscribe({
        next: (data) => {
          const fullLink = `${window.location.origin}${data.responseLink}`;
          navigator.clipboard.writeText(fullLink).then(() => {
            this.notificationService.success(`面試邀約連結已複製到剪貼簿！\n請手動發送給候選人。`);
          });
        }
      });
    }
  }
  onDecided() {
    this.loadData();
  }
  onScored() {
    this.loadData();
  }

  /**
   * 複製候選人的面試回覆連結到剪貼簿
   */
  copyResponseLink(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();

    this.interviewService.getResponseLink(candidate.id).subscribe({
      next: (data) => {
        const fullLink = `${window.location.origin}${data.responseLink}`;
        navigator.clipboard.writeText(fullLink).then(() => {
          this.notificationService.success('回覆連結已複製到剪貼簿');
        }).catch(() => {
          // Fallback for older browsers
          prompt('請複製以下連結發送給候選人：', fullLink);
        });
      },
      error: () => {
        this.notificationService.error('尚無回覆連結，請先發送面試邀約');
      }
    });
  }

  /**
   * 複製候選人的 Offer 回覆連結到剪貼簿
   */
  copyOfferResponseLink(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();

    this.interviewService.getOfferResponseLink(candidate.id).subscribe({
      next: (data) => {
        const fullLink = `${window.location.origin}${data.responseLink}`;
        navigator.clipboard.writeText(fullLink).then(() => {
          this.notificationService.success('錄用通知回覆連結已複製到剪貼簿');
        }).catch(() => {
          // Fallback for older browsers
          prompt('請複製以下連結發送給候選人：', fullLink);
        });
      },
      error: () => {
        this.notificationService.error('尚無錄用通知回覆連結');
      }
    });
  }

  // ============================================
  // Existing Scheduling Logic (Refined)
  // ============================================

  openInviteModal(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    this.selectedCandidate.set(this.mapToDetail(candidate));
    this.showInviteModal.set(true);
  }

  openInterviewModal(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    this.selectedCandidateForInterview.set(candidate);
    this.interviewDate.set('');
    this.interviewTime.set('10:00');
    this.interviewType.set('onsite');
    this.meetingLink.set('');
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

    this.interviewService.scheduleInterview({
      candidateId: candidate.id,
      jobId: this.jobId(),
      interviewerId: this.selectedInterviewer(),
      interviewAt: `${this.interviewDate()}T${this.interviewTime()}:00`,
      location: this.interviewType(),
      meetingLink: this.interviewType() === 'online' ? this.meetingLink() : undefined,
      round: 1
    }).subscribe({
      next: () => {
        this.notificationService.success(
          `已發送面試邀請給 ${candidate.name}，面試時間：${this.interviewDate()} ${this.interviewTime()}`
        );
        this.closeInterviewModal();
        this.loadData();
      },
      error: () => this.notificationService.error('安排面試失敗')
    });
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  viewProfile(candidate: JobCandidate): void {
    this.router.navigate(['/employee/profile-detail'], {
      queryParams: { candidateId: candidate.id, jobId: this.jobId() }
    });
  }

  goBack(): void {
    this.router.navigate(['/employee/jobs']);
  }

  getScoreClass(level: string): string {
    const classes: Record<string, string> = {
      high: 'score--high', medium: 'score--medium', low: 'score--low'
    };
    return classes[level] || '';
  }

  getScoreColor(level: string): string {
    const colors: Record<string, string> = {
      high: '#8DA399', medium: '#D6A28C', low: '#B87D7B'
    };
    return colors[level] || '#9A8C98';
  }

  getStatusClass(candidate: JobCandidate): string {
    const status = candidate.status;

    // Check if invited but accepted (pending schedule)
    if (status === 'invited' && candidate.candidateResponse === 'accepted') {
      return 'status--pending-schedule'; // New class
    }

    const classes: Record<string, string> = {
      new: 'status--new',
      invited: 'status--invited',
      reschedule: 'status--reschedule',
      interview: 'status--interview',
      pending_ai: 'status--pending-ai',
      pending_decision: 'status--pending-decision',
      offered: 'status--offered',
      offer_accepted: 'status--offer-accepted',
      onboarded: 'status--hired',
      // 流程未繼續
      not_invited: 'status--not-continued',
      not_hired: 'status--not-continued',
      // 候選人婉拒
      invite_declined: 'status--declined',
      interview_declined: 'status--declined',
      offer_declined: 'status--declined',
      // 舊狀態相容
      rejected: 'status--declined',
      hired: 'status--hired',
      completed: 'status--hired',
      pending: 'status--pending'
    };
    return classes[status] || '';
  }

  getStatusLabel(candidate: JobCandidate): string {
    const status = candidate.status;
    const stage = candidate.stage;
    const hasInterview = (candidate.interviewCount ?? 0) > 0;

    // Check if invited but accepted (pending schedule)
    if (status === 'invited' && candidate.candidateResponse === 'accepted') {
      return '待安排';
    }

    // 新狀態：候選人婉拒
    if (status === 'invite_declined') return '邀請婉拒';
    if (status === 'interview_declined') return '面試婉拒';
    if (status === 'offer_declined' || stage === 'OfferDeclined') return 'Offer 婉拒';

    // 新狀態：流程未繼續
    if (status === 'not_invited') return '不邀請';
    if (status === 'not_hired') return '未錄取';

    // 舊狀態相容：rejected 根據階段判斷
    if (status === 'rejected' || stage === 'Rejected') {
      // 有面試記錄 → 面試婉拒
      if (hasInterview) return '面試婉拒';
      // 邀請被拒 → 邀請婉拒
      if (candidate.invitationStatus === 'Declined') return '邀請婉拒';
      return '已婉拒';
    }

    // 統一狀態標籤
    const labels: Record<string, string> = {
      new: '新進履歷',
      invited: '已邀請',
      reschedule: '待改期',
      interview: '已安排面試',
      pending_ai: '待 AI 分析',
      pending_decision: '待決策',
      offered: '待回覆 Offer',
      offer_accepted: '已錄取同意',
      onboarded: '已報到',
      // 舊狀態相容
      hired: '已報到',
      completed: '已完成',
      pending: '待處理'
    };
    return labels[status] || status;
  }

  getInitial(name: string): string {
    return name.charAt(0);
  }

  getScoringStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'scoring--pending', scoring: 'scoring--scoring', scored: 'scoring--scored'
    };
    return classes[status] || 'scoring--scored';
  }

  getScoringStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待評分', scoring: '評分中', scored: '已評分'
    };
    return labels[status] || '已評分';
  }

  triggerAIScoring(candidate: JobCandidate): void {
    this.notificationService.info(`正在對 ${candidate.name} 進行 AI 履歷評分...`);
    setTimeout(() => {
      this.notificationService.success(`${candidate.name} 的 AI 評分已完成！`);
      this.loadData();
    }, 2000);
  }

  selectSlot(slot: string): void {
    if (!slot) return;

    // Handle ISO format (e.g. 2026-01-25T17:09)
    if (slot.includes('T')) {
      const [datePart, timePart] = slot.split('T');
      this.interviewDate.set(datePart);
      // Take HH:mm
      if (timePart) {
        this.interviewTime.set(timePart.substring(0, 5));
      }
      return;
    }

    const parts = slot.split(' ');
    // Handle format: 2026/01/28 (週三) 下午04:00
    if (parts.length >= 1) {
      // Date part: 2026/01/28 -> 2026-01-28
      let dateStr = parts[0].replace(/\//g, '-');
      if (!isNaN(Date.parse(dateStr))) {
        this.interviewDate.set(dateStr);
      }
    }

    // Time part
    let timePart = parts.find(p => p.includes('上午') || p.includes('下午') || p.includes('中午') || p.includes(':'));
    if (timePart) {
      let formattedTime = '';
      if (timePart.includes('下午')) {
        const raw = timePart.replace('下午', '');
        const [h, m] = raw.split(':').map(Number);
        const hour = (h === 12) ? 12 : h + 12;
        formattedTime = `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      } else if (timePart.includes('上午')) {
        const raw = timePart.replace('上午', '');
        const [h, m] = raw.split(':').map(Number);
        const hour = (h === 12) ? 0 : h;
        formattedTime = `${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      } else if (timePart.includes('中午')) {
        const raw = timePart.replace('中午', '');
        formattedTime = raw;
      } else {
        formattedTime = timePart;
      }

      if (formattedTime) {
        this.interviewTime.set(formattedTime);
      }
    }
  }
}
