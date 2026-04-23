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
import { ScheduleInterviewModalComponent } from '../../components/schedule-interview-modal/schedule-interview-modal.component';
import { InterviewInfoModalComponent } from '../../components/interview-info-modal/interview-info-modal.component';
import { InterviewService } from '../../services/interview.service';
import { CandidateDetail, parseReferralSourceDetail } from '../../models/candidate.model';

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
    InterviewScoringModalComponent,
    ScheduleInterviewModalComponent,
    InterviewInfoModalComponent
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
  jobTitle = signal<string>('');  // 職缺標題（從 API 載入）

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
    { key: 'declined', label: '候選人婉拒', icon: 'ri-close-circle-line' },  // 候選人婉拒（邀請/面試/Offer）
    { key: 'offered', label: '待回覆 Offer', icon: 'ri-mail-star-line' },
    { key: 'offer_accepted', label: '已錄取同意', icon: 'ri-trophy-line' },
    { key: 'not_continued', label: '流程結束', icon: 'ri-user-unfollow-line' }  // 公司決定：不邀請 + 未錄取
  ];

  // Offer 回覆連結 Modal
  showOfferLinkModal = signal<boolean>(false);
  offerResponseLink = signal<string>('');

  // 面試資訊 Modal
  showInterviewInfoModal = signal<boolean>(false);
  interviewInfoCandidate = signal<CandidateWithUI | null>(null);

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

    // 載入職缺標題
    if (this.jobId()) {
      this.jobService.getJobById(this.jobId()).subscribe({
        next: (job) => {
          if (job?.title) {
            this.jobTitle.set(job.title);
          }
        }
      });
    }

    this.jobService.getCandidates(this.jobId()).subscribe({
      next: (candidates) => {
        // 保留現有的 AI 評分狀態，避免覆蓋
        const existingCandidates = this.candidates();
        const existingState = new Map(
          existingCandidates.map(c => [c.id, { aiScoringStatus: c.aiScoringStatus, displayScore: c.displayScore }])
        );

        const candidatesWithUI: CandidateWithUI[] = candidates.map(c => {
          // 如果候選人已有 AI 分析結果，直接標記為已評分
          if (c.aiOverallScore !== undefined) {
            const score = c.aiOverallScore;
            return {
              ...c,
              scoreLevel: (score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low') as any,
              aiScoringStatus: 'scored' as const,
              displayScore: score
            };
          }
          // 否則保留現有的 AI 評分狀態
          return {
            ...c,
            aiScoringStatus: existingState.get(c.id)?.aiScoringStatus || 'pending',
            displayScore: existingState.get(c.id)?.displayScore || 0
          };
        });

        // 確保 Signal 更新會觸發變更檢測
        this.candidates.set(candidatesWithUI);
        this.loading.set(false);

        // 動態計算 KPI 統計
        this.stats.set({
          total: candidates.length,
          pending: candidates.filter(c => c.status === 'new').length,
          aiRecommended: candidates.filter(c => c.aiOverallScore !== undefined && c.aiOverallScore >= 70).length,
          scheduled: candidates.filter(c => c.status === 'interview' || c.interviewId).length
        });
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
        // 候選人婉拒：邀請婉拒、面試婉拒、Offer 婉拒
        result = result.filter(c => 
          c.status === 'invite_declined' || 
          c.status === 'interview_declined' || 
          c.status === 'offer_declined' ||
          c.stage === 'OfferDeclined'
        );
      } else if (status === 'not_continued') {
        // 流程結束（公司決定）：不邀請、未錄取
        result = result.filter(c =>
          c.status === 'rejected' ||
          c.status === 'not_invited' ||
          c.status === 'not_hired'
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
      // 候選人婉拒：邀請婉拒、面試婉拒、Offer 婉拒
      return all.filter(c => 
        c.status === 'invite_declined' || 
        c.status === 'interview_declined' || 
        c.status === 'offer_declined' ||
        c.stage === 'OfferDeclined'
      ).length;
    }

    if (statusKey === 'not_continued') {
      // 流程結束（公司決定）：不邀請、未錄取
      return all.filter(c =>
        c.status === 'rejected' ||
        c.status === 'not_invited' ||
        c.status === 'not_hired'
      ).length;
    }

    return all.filter(c => c.status === statusKey).length;
  }

  // 批量 AI 評分 — 呼叫後端為每位候選人產生模擬分析
  batchAIScoring(): void {
    const pendingCandidates = this.candidates().filter(c => c.aiScoringStatus === 'pending');

    if (pendingCandidates.length === 0) {
      this.notificationService.info('所有候選人都已完成評分');
      return;
    }

    this.isAIScoring.set(true);
    this.aiScoringProgress.set(0);
    this.aiScoringMessage.set('正在初始化 AI 評分引擎...');

    const jobId = this.jobId();
    let completed = 0;
    const total = pendingCandidates.length;

    const messages = [
      '正在分析職位需求與職能基準...',
      '正在解析候選人履歷內容...',
      '正在進行職能匹配度計算...',
      '正在生成評分報告...'
    ];

    // 逐一呼叫後端 API
    const processNext = (index: number) => {
      if (index >= total) {
        this.aiScoringProgress.set(100);
        this.aiScoringMessage.set('評分完成！');
        setTimeout(() => {
          this.isAIScoring.set(false);
          this.notificationService.success(`已完成 ${total} 位候選人的 AI 評分`);
          this.loadData(); // 重新載入資料（含 AI 分數）
        }, 500);
        return;
      }

      const candidate = pendingCandidates[index];
      const msgIndex = Math.min(Math.floor((index / total) * messages.length), messages.length - 1);
      this.aiScoringMessage.set(messages[msgIndex]);
      this.aiScoringProgress.set(Math.round((index / total) * 90));

      this.jobService.generateMockAnalysis(jobId, candidate.id).subscribe({
        next: () => {
          completed++;
          processNext(index + 1);
        },
        error: () => {
          completed++;
          processNext(index + 1); // 繼續處理下一位
        }
      });
    };

    processNext(0);
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
      position: c.jobTitle || this.jobTitle(), // 優先使用候選人資料的職缺標題
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
    if (confirm(`確定不邀請候選人「${candidate.name}」嗎？\n\n此操作將結束此候選人的招募流程。`)) {
      this.loading.set(true);

      // Call the decision service with 'Rejected' status (backend will set to not_invited)
      this.interviewService.makeDecision(candidate.id, 'Rejected', '不邀請')
        .subscribe({
          next: () => {
            this.notificationService.success(`已將 ${candidate.name} 設為不邀請`);
            this.loadData();
          },
          error: () => {
            this.notificationService.error('操作失敗，請稍後再試');
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

  /**
   * 顯示面試資訊 Modal
   */
  showInterviewInfo(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();
    // 確保 candidate 有 jobTitle，若無則使用當前職缺標題
    const candidateWithJobTitle = {
      ...candidate,
      jobTitle: candidate.jobTitle || this.jobTitle()
    };
    this.interviewInfoCandidate.set(candidateWithJobTitle);
    this.showInterviewInfoModal.set(true);
  }

  /**
   * 關閉面試資訊 Modal
   */
  closeInterviewInfoModal(): void {
    this.showInterviewInfoModal.set(false);
    this.interviewInfoCandidate.set(null);
  }

  /**
   * 複製面試取消連結到剪貼簿
   */
  copyInterviewCancelLink(candidate: CandidateWithUI, event: Event): void {
    event.stopPropagation();

    if (!candidate.interviewCancelToken) {
      this.notificationService.error('尚無面試取消連結');
      return;
    }

    const fullLink = `${window.location.origin}/public/interview-cancel/${candidate.interviewCancelToken}`;
    navigator.clipboard.writeText(fullLink).then(() => {
      this.notificationService.success('面試取消連結已複製到剪貼簿');
    }).catch(() => {
      // Fallback for older browsers
      prompt('請複製以下連結發送給候選人：', fullLink);
    });
  }

  /**
   * 格式化面試時間顯示
   */
  formatInterviewTime(isoString: string | undefined): string {
    if (!isoString) return '未設定';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short'
      });
    } catch {
      return isoString;
    }
  }

  /**
   * 取得面試地點顯示文字
   */
  getInterviewLocationLabel(location: string | undefined): string {
    if (!location) return '未設定';
    const labels: Record<string, string> = {
      'onsite': '現場面試',
      'online': '線上面試',
      'phone': '電話面試'
    };
    return labels[location] || location;
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
    this.showInterviewModal.set(true);
  }

  onInterviewScheduled(): void {
    this.showInterviewModal.set(false);
    this.selectedCandidateForInterview.set(null);
    this.loadData();
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
      // 流程結束（公司決定）
      rejected: 'status--not-continued',
      not_invited: 'status--not-continued',
      not_hired: 'status--not-continued',
      // 候選人婉拒
      invite_declined: 'status--declined',
      interview_declined: 'status--declined',
      offer_declined: 'status--declined'
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
      rejected: '未錄取',
      not_invited: '不邀請',
      not_hired: '未錄取',
      invite_declined: '邀請婉拒',
      interview_declined: '面試婉拒',
      offer_declined: 'Offer 婉拒'
    };
    return labels[status] || status;
  }

  getInitial(name: string): string {
    return name.charAt(0);
  }

  /** 應徵日期顯示：ISO 時間戳 → YYYY/MM/DD；若只含日期（YYYY-MM-DD）直接轉斜線；解析失敗回原字串 */
  formatApplyDate(raw: string | null | undefined): string {
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd}`;
  }

  /**
   * 來源標籤：根據 reg_source 決定 chip 樣式與 hover tooltip。
   * referral 類型會透過 source_detail 帶出推薦人姓名 + 員編。
   */
  getSourceBadge(candidate: JobCandidate): { key: string; label: string; icon: string; tooltip: string } | null {
    const src = candidate.reg_source;
    if (!src) return null;

    if (src === 'referral') {
      const detail = parseReferralSourceDetail(candidate.source_detail ?? null);
      const tooltip = detail?.recommender_name
        ? `推薦人：${detail.recommender_name}（${detail.recommender_employee_no || '—'}）`
        : '內部推薦';
      return { key: 'referral', label: '內推', icon: 'ri-user-shared-line', tooltip };
    }

    if (src.includes('104')) {
      return { key: '104', label: '104', icon: 'ri-global-line', tooltip: `來源：${src}` };
    }

    if (src === 'manual') {
      return { key: 'other', label: '手動新增', icon: 'ri-user-add-line', tooltip: 'HR 手動新增候選人' };
    }

    return { key: 'other', label: src, icon: 'ri-bookmark-line', tooltip: `來源：${src}` };
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
}
