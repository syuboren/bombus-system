import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy,
  ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as echarts from 'echarts';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { AuthService } from '../../../auth/services/auth.service';
import { FeatureGateService } from '../../../../core/services/feature-gate.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DecisionService } from '../../services/decision.service';
import { InterviewService } from '../../services/interview.service';
import { JobService } from '../../services/job.service';
import {
  Candidate, CandidateStatus, SalaryRangeResult, ApprovalStatus,
  DECISION_PENDING_STATUSES, DECISION_DECIDED_STATUSES, CANDIDATE_STATUS_LABELS
} from '../../models/candidate.model';
import { CandidateFull, CandidateResumeAnalysis } from '../../models/job.model';
import { InterviewScoringModalComponent } from '../../components/interview-scoring-modal/interview-scoring-modal.component';

type StatusFilter = 'all' | 'pending' | 'decided';

const APPROVER_ROLES = ['super_admin', 'subsidiary_admin'];
const RELEVANT_STATUSES: CandidateStatus[] = [...DECISION_PENDING_STATUSES, ...DECISION_DECIDED_STATUSES];
const OFFER_STATUSES: CandidateStatus[] = ['offered', 'offer_accepted', 'offer_declined', 'onboarded'];

@Component({
  selector: 'app-decision-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, InterviewScoringModalComponent],
  templateUrl: './decision-page.component.html',
  styleUrl: './decision-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecisionPageComponent implements OnInit, OnDestroy {
  @ViewChild('radarChart') radarChartRef?: ElementRef<HTMLDivElement>;
  private radarChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.radarChart?.resize();

  private decisionService = inject(DecisionService);
  private interviewService = inject(InterviewService);
  private jobService = inject(JobService);
  private authService = inject(AuthService);
  private featureGate = inject(FeatureGateService);
  private notification = inject(NotificationService);

  // 權限
  readonly canEdit = computed(() => this.featureGate.canEdit('L1.decision'));
  readonly canApprove = computed(() => {
    const user = this.authService.currentUser();
    return !!user?.roles?.some(r => APPROVER_ROLES.includes(r));
  });

  // 候選人列表
  candidates = signal<Candidate[]>([]);
  selectedCandidateId = signal<string | null>(null);
  statusFilter = signal<StatusFilter>('all');
  searchQuery = signal<string>('');
  loading = signal<boolean>(false);

  // 決策表單
  decisionValue = signal<'Offered' | 'Rejected' | null>(null);
  decisionReason = signal<string>('');
  salaryType = signal<number>(50); // 預設月薪
  salaryAmount = signal<number | null>(null);
  submitting = signal<boolean>(false);

  // 薪資範圍
  salaryRange = signal<SalaryRangeResult | null>(null);

  // 簽核退回原因
  rejectNote = signal<string>('');

  // AI 分析與評分（從候選人詳情載入，唯讀）
  // 使用 any：後端 /candidates/:id 回傳混合 snake_case 欄位（expectedSalary、jobDescription、decision.reason…）
  // 未全部映射進 CandidateDetail 型別；徹底型別化需要另開 change 處理 mapper
  candidateDetail = signal<any | null>(null);
  candidateFull = signal<CandidateFull | null>(null);
  resumeAnalysis = signal<CandidateResumeAnalysis | null>(null);

  // 評分詳情 Modal（唯讀模式）
  isScoringModalVisible = signal<boolean>(false);

  // Offer 回覆連結（已決策時載入）
  offerResponseLink = signal<string | null>(null);

  // Computed：候選人過濾
  readonly filteredCandidates = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const filter = this.statusFilter();
    return this.candidates()
      .filter(c => RELEVANT_STATUSES.includes(c.status as CandidateStatus))
      .filter(c => {
        const matchesQuery = c.name.toLowerCase().includes(q) || (c.position || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;
        if (filter === 'all') return true;
        if (filter === 'pending') return DECISION_PENDING_STATUSES.includes(c.status as CandidateStatus);
        if (filter === 'decided') return DECISION_DECIDED_STATUSES.includes(c.status as CandidateStatus);
        return true;
      });
  });

  readonly selectedCandidate = computed<Candidate | null>(() => {
    const id = this.selectedCandidateId();
    return id ? this.candidates().find(c => c.id === id) ?? null : null;
  });

  // 只讀模式：狀態 >= pending_approval 時鎖定表單
  readonly isReadOnly = computed(() => {
    const c = this.selectedCandidate();
    if (!c) return false;
    return c.status !== 'pending_decision';
  });

  readonly approvalStatus = computed<ApprovalStatus | null>(() => this.selectedCandidate()?.approval_status ?? null);

  // list 欄位優先（即時），詳情 fetch 為 fallback（極少數 list 尚未刷新的情境）
  readonly decisionReasonText = computed<string>(() => {
    const c = this.selectedCandidate();
    const d = this.candidateDetail();
    return c?.decision_reason || (d?.decision as any)?.reason || '';
  });

  readonly isOutOfRange = computed(() => {
    const range = this.salaryRange();
    const amt = this.salaryAmount();
    if (!range?.has_range || amt == null) return false;
    return amt < (range.salary_low ?? 0) || amt > (range.salary_high ?? Number.MAX_SAFE_INTEGER);
  });

  ngOnInit(): void {
    this.loadCandidates();
  }

  ngOnDestroy(): void {
    this.disposeRadarChart();
  }

  loadCandidates(): void {
    this.loading.set(true);
    const currentId = this.selectedCandidateId();
    this.decisionService.listDecisionCandidates().subscribe({
      next: (list) => {
        this.candidates.set(list ?? []);
        this.loading.set(false);
        // 若已選中的候選人仍在列表中，用新鮮資料重新觸發 selectCandidate 的副作用
        // （重新載入 offer 回覆連結、候選人詳情等），避免狀態變更後右側面板資料過期
        if (currentId) {
          const refreshed = (list ?? []).find(c => c.id === currentId);
          if (refreshed) this.selectCandidate(refreshed);
        }
      },
      error: (err) => {
        console.error('Load candidates failed:', err);
        this.notification.show('載入候選人列表失敗', 'error');
        this.loading.set(false);
      }
    });
  }

  selectCandidate(c: Candidate): void {
    // 點到同一筆且狀態/簽核狀態都沒變時，跳過 3~4 個 HTTP 載入；
    // loadCandidates 刷新後若狀態有變（approve/reject 後），
    // 仍會正確 re-run 以帶出新資料（例如 Offer 連結）
    const prev = this.selectedCandidate();
    if (prev && prev.id === c.id && prev.status === c.status && prev.approval_status === c.approval_status) return;

    this.selectedCandidateId.set(c.id);
    this.rejectNote.set('');

    // 預填決策表單
    this.salaryType.set(c.approved_salary_type ?? 50);
    this.salaryAmount.set(c.approved_salary_amount ?? null);
    // 退回重送場景：狀態回到 pending_decision 但 approval_status='REJECTED' 時
    // 還原先前輸入的決策、理由、薪資，HR 只需調整後重新送簽
    const isRejectedResubmit = c.status === 'pending_decision' && c.approval_status === 'REJECTED';
    this.decisionValue.set(isRejectedResubmit ? (c.decision_type ?? null) : null);
    this.decisionReason.set(isRejectedResubmit ? (c.decision_reason ?? '') : '');
    this.offerResponseLink.set(null);

    // 釋放上一張雷達圖
    this.disposeRadarChart();

    // 重置 reference panel 資料
    this.candidateFull.set(null);
    this.resumeAnalysis.set(null);

    // 載入薪資範圍
    this.decisionService.getSalaryRange(c.id).subscribe({
      next: (r) => this.salaryRange.set(r),
      error: () => this.salaryRange.set(null)
    });

    // 載入詳情（含評分、AI 分析）
    this.interviewService.getCandidateDetail(c.id).subscribe({
      next: (d) => {
        this.candidateDetail.set(d);
        // 等 Angular 渲染 @if (aiAnalysisData()) 後再初始化雷達圖
        setTimeout(() => this.initRadarChart(), 100);
      },
      error: () => this.candidateDetail.set(null)
    });

    // 載入完整履歷（for 評分 Modal 的履歷/AI 報告頁籤）
    if (c.jobId) {
      this.jobService.getCandidateFull(c.jobId, c.id).subscribe({
        next: (full) => {
          this.candidateFull.set(full);
          if (full.resumeAnalysis) {
            this.resumeAnalysis.set(full.resumeAnalysis);
          }
        },
        error: () => {
          this.candidateFull.set(null);
          this.resumeAnalysis.set(null);
        }
      });
    }

    // 已決策候選人載入 offer 連結
    if (OFFER_STATUSES.includes(c.status as CandidateStatus)) {
      this.interviewService.getOfferResponseLink(c.id).subscribe({
        next: (link: any) => {
          if (link) {
            const full = typeof link === 'string' ? link : (link.responseLink || link.link || '');
            if (full) {
              const origin = typeof window !== 'undefined' ? window.location.origin : '';
              this.offerResponseLink.set(full.startsWith('http') ? full : `${origin}${full}`);
            }
          }
        },
        error: () => this.offerResponseLink.set(null)
      });
    }
  }

  openScoringDetailModal(): void {
    if (!this.candidateDetail()) {
      this.notification.show('面試官尚未完成評分', 'info');
      return;
    }
    this.isScoringModalVisible.set(true);
  }

  closeScoringDetailModal(): void {
    this.isScoringModalVisible.set(false);
  }

  copyOfferLink(): void {
    const link = this.offerResponseLink();
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      this.notification.show('已複製 Offer 回覆連結', 'success');
    }).catch(() => {
      this.notification.show('複製失敗', 'error');
    });
  }

  // ─── 雷達圖 ───
  private initRadarChart(): void {
    const container = this.radarChartRef?.nativeElement;
    const ai = this.aiAnalysisData();
    const dims = ai?.keywordAnalysis?.dimensionBreakdown;
    if (!container || !dims?.length) return;
    this.disposeRadarChart();

    this.radarChart = echarts.init(container);
    const indicators = dims.map((d: any) => ({ name: d.dimensionName, max: 100 }));
    const values = dims.map((d: any) => d.score);

    this.radarChart.setOption({
      tooltip: {},
      radar: {
        indicator: indicators,
        radius: '65%',
        shape: 'polygon',
        splitLine: { lineStyle: { color: '#E8E8EA' } },
        splitArea: { areaStyle: { color: ['#FCFCFD', '#F5F5F7'] } },
        axisLine: { lineStyle: { color: '#E8E8EA' } },
        axisName: { color: '#6B7280', fontSize: 11 }
      },
      series: [{
        type: 'radar',
        data: [{
          value: values,
          name: this.selectedCandidate()?.name || '能力評分',
          areaStyle: { color: 'rgba(141,163,153,0.4)' },
          lineStyle: { color: '#8DA399' },
          itemStyle: { color: '#8DA399' }
        }]
      }]
    });

    window.addEventListener('resize', this.resizeHandler);
  }

  private disposeRadarChart(): void {
    if (this.radarChart) {
      window.removeEventListener('resize', this.resizeHandler);
      this.radarChart.dispose();
      this.radarChart = null;
    }
  }

  // AI 分析資料（標準化處理，相容多種回傳格式）
  readonly aiAnalysisData = computed(() => {
    const d = this.candidateDetail();
    if (!d?.aiAnalysisResult) return null;
    const ai = typeof d.aiAnalysisResult === 'string' ? JSON.parse(d.aiAnalysisResult) : d.aiAnalysisResult;
    return ai;
  });

  /**
   * HR 送簽
   */
  submitForApproval(): void {
    const c = this.selectedCandidate();
    if (!c || !this.canEdit()) return;
    const decision = this.decisionValue();
    const reason = this.decisionReason().trim();
    if (!decision || !reason) {
      this.notification.show('請選擇決策並填寫理由', 'warning');
      return;
    }
    if (decision === 'Offered' && (!this.salaryAmount() || this.salaryAmount()! <= 0)) {
      this.notification.show('請輸入核定薪資金額', 'warning');
      return;
    }
    this.submitting.set(true);
    this.decisionService.submitForApproval(c.id, {
      decision,
      decision_reason: reason,
      approved_salary_type: decision === 'Offered' ? this.salaryType() : undefined,
      approved_salary_amount: decision === 'Offered' ? this.salaryAmount()! : undefined
    }).subscribe({
      next: () => {
        this.notification.show('已送交簽核', 'success');
        this.submitting.set(false);
        this.loadCandidates();
      },
      error: (err) => {
        console.error('Submit approval failed:', err);
        this.notification.show(err?.error?.error || '送簽失敗', 'error');
        this.submitting.set(false);
      }
    });
  }

  /**
   * 主管簽核通過
   */
  approve(): void {
    const c = this.selectedCandidate();
    if (!c || !this.canApprove()) return;
    this.submitting.set(true);
    this.decisionService.approve(c.id).subscribe({
      next: () => {
        this.notification.show('簽核通過', 'success');
        this.submitting.set(false);
        this.loadCandidates();
      },
      error: (err) => {
        console.error('Approve failed:', err);
        this.notification.show(err?.error?.error || '簽核失敗', 'error');
        this.submitting.set(false);
      }
    });
  }

  /**
   * 主管退回
   */
  rejectApproval(): void {
    const c = this.selectedCandidate();
    const note = this.rejectNote().trim();
    if (!c || !this.canApprove()) return;
    if (!note) {
      this.notification.show('退回必須填寫原因', 'warning');
      return;
    }
    this.submitting.set(true);
    this.decisionService.rejectApproval(c.id, note).subscribe({
      next: () => {
        this.notification.show('已退回，可由 HR 重新修改送出', 'success');
        this.submitting.set(false);
        this.rejectNote.set('');
        this.loadCandidates();
      },
      error: (err) => {
        console.error('Reject failed:', err);
        this.notification.show(err?.error?.error || '退回失敗', 'error');
        this.submitting.set(false);
      }
    });
  }

  statusBadgeLabel(status: string): string {
    return CANDIDATE_STATUS_LABELS[status as CandidateStatus] ?? status;
  }

  salaryTypeLabel(type: number | null | undefined): string {
    switch (type) {
      case 10: return '面議';
      case 50: return '月薪';
      case 60: return '年薪';
      default: return '-';
    }
  }

  setStatusFilter(f: StatusFilter): void { this.statusFilter.set(f); }
  setDecision(v: 'Offered' | 'Rejected'): void { this.decisionValue.set(v); }
}
