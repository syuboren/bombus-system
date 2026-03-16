import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobService } from '../../services/job.service';
import { InterviewService } from '../../services/interview.service';
import { CandidateFull, CandidateResumeAnalysis } from '../../models/job.model';
import { CandidateDetail } from '../../models/candidate.model';
import { InviteCandidateModalComponent } from '../../components/invite-candidate-modal/invite-candidate-modal.component';
import { HiringDecisionModalComponent } from '../../components/hiring-decision-modal/hiring-decision-modal.component';
import { ScheduleInterviewModalComponent } from '../../components/schedule-interview-modal/schedule-interview-modal.component';
import { InterviewInfoModalComponent } from '../../components/interview-info-modal/interview-info-modal.component';

@Component({
  selector: 'app-profile-detail-page',
  standalone: true,
  imports: [
    HeaderComponent,
    InviteCandidateModalComponent,
    HiringDecisionModalComponent,
    ScheduleInterviewModalComponent,
    InterviewInfoModalComponent
  ],
  templateUrl: './profile-detail-page.component.html',
  styleUrl: './profile-detail-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileDetailPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private jobService = inject(JobService);
  private interviewService = inject(InterviewService);
  private notificationService = inject(NotificationService);

  // Signals
  candidate = signal<CandidateFull | null>(null);
  resumeAnalysis = signal<CandidateResumeAnalysis | null>(null);
  loading = signal<boolean>(false);
  analyzing = signal<boolean>(false);
  candidateId = signal<string>('');
  jobId = signal<string>('');
  jobTitle = signal<string>('');  // 職缺標題
  
  // 確保 candidate 有 jobTitle 的 computed
  candidateWithJobTitle = computed(() => {
    const c = this.candidate();
    if (!c) return null;
    return {
      ...c,
      jobTitle: c.jobTitle || this.jobTitle()
    };
  });
  
  // Modals
  showInviteModal = signal<boolean>(false);
  showDecisionModal = signal<boolean>(false);
  showInterviewModal = signal<boolean>(false);
  showInterviewInfoModal = signal<boolean>(false);
  selectedCandidateForModal = signal<CandidateDetail | null>(null);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      // 先設定 jobId（必須在 loadCandidate 之前）
      if (params['jobId']) {
        this.jobId.set(params['jobId']);
      }

      // 再載入候選人資料
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
    if (!this.jobId()) {
      this.notificationService.error('缺少職缺 ID');
      return;
    }

    this.loading.set(true);
    this.jobService.getCandidateFull(this.jobId(), id).subscribe({
      next: (fullData) => {
        this.candidate.set(fullData);
        this.resumeAnalysis.set(fullData.resumeAnalysis || null);
        // 設定職缺標題（優先使用 candidate 的 jobTitle，若無則嘗試載入）
        if (fullData.jobTitle) {
          this.jobTitle.set(fullData.jobTitle);
        } else {
          // 若 candidate 沒有 jobTitle，嘗試從 job 取得
          this.loadJobTitle();
        }
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('載入候選人資料失敗');
        this.loading.set(false);
      }
    });
  }

  /**
   * 載入職缺標題
   */
  private loadJobTitle(): void {
    if (!this.jobId()) return;
    
    this.jobService.getJobById(this.jobId()).subscribe({
      next: (job) => {
        if (job?.title) {
          this.jobTitle.set(job.title);
        }
      },
      error: () => {
        // 靜默處理錯誤
      }
    });
  }

  goBack(): void {
    const params: any = {};
    if (this.jobId()) {
      params.jobId = this.jobId();
    }
    this.router.navigate(['/employee/job-candidates'], { queryParams: params });
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

  // 職能類型樣式
  getCompetencyTypeClass(type: string): string {
    const classes: Record<string, string> = {
      knowledge: 'type--knowledge',
      skill: 'type--skill',
      attitude: 'type--attitude'
    };
    return classes[type] || '';
  }

  // 職能類型標籤
  getCompetencyTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      knowledge: 'K',
      skill: 'S',
      attitude: 'A'
    };
    return labels[type] || type;
  }

  // 匹配分數樣式
  getMatchScoreClass(score: number): string {
    if (score >= 85) return 'score--excellent';
    if (score >= 70) return 'score--good';
    if (score >= 60) return 'score--fair';
    return 'score--poor';
  }

  // 格式化日期
  formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}.${month}`;
  }

  // 格式化日期時間
  formatDateTime(dateStr?: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  }

  // HTML 內容清理
  sanitizeHtml(html?: string): string {
    if (!html) return '';
    // 簡單的清理，實際應用可使用 DomSanitizer
    return html;
  }

  // 計算匹配百分比
  getMatchPercentage(matched: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((matched / total) * 100);
  }

  // 取得經歷相關性文字
  getRelevanceLevelText(level: number): string {
    const texts: Record<number, string> = {
      5: '高度相關',
      4: '相關',
      3: '中度相關',
      2: '低度相關',
      1: '不相關'
    };
    return texts[level] || '';
  }

  // 檢查候選人回覆狀態
  getCandidateResponse(candidate: CandidateFull): string | undefined {
    return (candidate as any).candidateResponse;
  }

  // 取得招募狀態標籤（複用 job-candidates-page 邏輯）
  getStatusLabel(candidate: CandidateFull): string {
    const status = candidate.status;
    const candidateResponse = this.getCandidateResponse(candidate);

    // Check if invited but accepted (pending schedule)
    if (status === 'invited' && candidateResponse === 'accepted') {
      return '待安排';
    }

    // 候選人婉拒
    if (status === 'invite_declined') return '邀請婉拒';
    if (status === 'interview_declined') return '面試婉拒';
    if (status === 'offer_declined' || candidate.stage === 'OfferDeclined') return 'Offer 婉拒';

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
    return labels[status] || '新進履歷';
  }

  // 取得招募狀態樣式（複用 job-candidates-page 邏輯）
  getStatusClass(candidate: CandidateFull): string {
    const status = candidate.status;
    const candidateResponse = this.getCandidateResponse(candidate);

    // Check if invited but accepted (pending schedule)
    if (status === 'invited' && candidateResponse === 'accepted') {
      return 'status--pending-schedule';
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
      rejected: 'status--not-continued',
      not_invited: 'status--not-continued',
      not_hired: 'status--not-continued',
      invite_declined: 'status--declined',
      interview_declined: 'status--declined',
      offer_declined: 'status--declined'
    };
    return classes[status] || '';
  }

  // 將 CandidateFull 轉為 CandidateDetail（供 Modal 使用）
  private mapToDetail(c: CandidateFull): CandidateDetail {
    return {
      id: c.id,
      name: c.name,
      position: c.jobTitle || '', // 應徵職缺標題
      email: c.email,
      status: c.status,
      jobId: this.jobId(),
      rescheduleNote: c.rescheduleNote
    } as unknown as CandidateDetail;
  }

  // 發送面試邀請
  inviteCandidate(): void {
    const c = this.candidate();
    if (!c) return;
    
    this.selectedCandidateForModal.set(this.mapToDetail(c));
    this.showInviteModal.set(true);
  }

  // 邀請成功回調
  onInvited(): void {
    this.loadCandidate(this.candidateId());
    
    // 邀約成功後，顯示可複製的回覆連結
    const candidateId = this.candidateId();
    this.interviewService.getResponseLink(candidateId).subscribe({
      next: (data) => {
        const fullLink = `${window.location.origin}${data.responseLink}`;
        navigator.clipboard.writeText(fullLink).then(() => {
          this.notificationService.success(`面試邀約連結已複製到剪貼簿！\n請手動發送給候選人。`);
        });
      }
    });
  }

  // 標記為不適合
  rejectCandidate(): void {
    const c = this.candidate();
    if (!c) return;

    if (confirm(`確定不邀請候選人「${c.name}」嗎？\n\n此操作將結束此候選人的招募流程。`)) {
      this.loading.set(true);
      
      this.interviewService.makeDecision(c.id, 'Rejected', '不邀請')
        .subscribe({
          next: () => {
            this.notificationService.success(`已將 ${c.name} 設為不邀請`);
            this.loadCandidate(this.candidateId());
          },
          error: () => {
            this.notificationService.error('操作失敗，請稍後再試');
            this.loading.set(false);
          }
        });
    }
  }

  // 面試決策回調
  onDecided(): void {
    this.loadCandidate(this.candidateId());
  }

  // 複製回覆連結
  copyResponseLink(): void {
    this.interviewService.getResponseLink(this.candidateId()).subscribe({
      next: (data) => {
        const fullLink = `${window.location.origin}${data.responseLink}`;
        navigator.clipboard.writeText(fullLink).then(() => {
          this.notificationService.success('回覆連結已複製到剪貼簿');
        }).catch(() => {
          prompt('請複製以下連結發送給候選人：', fullLink);
        });
      },
      error: () => {
        this.notificationService.error('尚無回覆連結，請先發送面試邀約');
      }
    });
  }

  // 安排面試（導向候選人清單頁處理）
  openInterviewModal(): void {
    this.showInterviewModal.set(true);
  }

  onInterviewScheduled(): void {
    this.showInterviewModal.set(false);
    this.loadCandidate(this.candidateId());
  }

  // 顯示面試資訊
  openInterviewInfoModal(): void {
    this.showInterviewInfoModal.set(true);
  }

  // 重新邀約
  openInviteModal(): void {
    const c = this.candidate();
    if (!c) return;
    
    this.selectedCandidateForModal.set(this.mapToDetail(c));
    this.showInviteModal.set(true);
  }

  // 查看面試資訊
  showInterviewInfo(): void {
    this.showInterviewInfoModal.set(true);
  }

  // 複製取消面試連結
  copyInterviewCancelLink(): void {
    const c = this.candidate();
    if (!c || !c.interviewCancelToken) {
      this.notificationService.warning('此候選人尚無面試安排或取消連結');
      return;
    }
    
    const cancelLink = `/public/interview-cancel/${c.interviewCancelToken}`;
    const fullLink = `${window.location.origin}${cancelLink}`;
    
    navigator.clipboard.writeText(fullLink).then(() => {
      this.notificationService.success('取消面試連結已複製到剪貼簿');
    }).catch(() => {
      prompt('請複製以下連結發送給候選人：', fullLink);
    });
  }

  // 複製 Offer 回覆連結
  copyOfferResponseLink(): void {
    this.interviewService.getOfferResponseLink(this.candidateId()).subscribe({
      next: (data) => {
        const fullLink = `${window.location.origin}${data.responseLink}`;
        navigator.clipboard.writeText(fullLink).then(() => {
          this.notificationService.success('錄用通知回覆連結已複製到剪貼簿');
        }).catch(() => {
          prompt('請複製以下連結發送給候選人：', fullLink);
        });
      },
      error: () => {
        this.notificationService.error('無法取得 Offer 回覆連結');
      }
    });
  }

  // 產生模擬 AI 分析
  generateAnalysis(): void {
    if (this.analyzing() || !this.jobId() || !this.candidateId()) return;
    this.analyzing.set(true);
    this.jobService.generateMockAnalysis(this.jobId(), this.candidateId()).subscribe({
      next: () => {
        this.loadCandidate(this.candidateId());
        this.analyzing.set(false);
        this.notificationService.success('AI 分析已完成');
      },
      error: () => {
        this.notificationService.error('分析失敗，請稍後再試');
        this.analyzing.set(false);
      }
    });
  }

  // 進入面試評核
  goToInterview(): void {
    const c = this.candidate();
    if (!c) return;
    
    this.router.navigate(['/employee/recruitment'], {
      queryParams: { candidateId: c.id, jobId: this.jobId() }
    });
  }
}

