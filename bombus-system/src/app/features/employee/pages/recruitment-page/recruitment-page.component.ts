import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  effect,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { InterviewService } from '../../services/interview.service';
import { AIAnalysisService, AIAnalysisResult } from '../../services/ai-analysis.service';
import { JobKeywordsService } from '../../services/job-keywords.service';
import { Candidate, CandidateDetail, CandidateFormData, FullAIAnalysisResult } from '../../models/candidate.model';
import { CandidateFull, CandidateResumeAnalysis } from '../../models/job.model';
import { EvaluationDimension } from '../../models/job-keywords.model';
import * as echarts from 'echarts';
import { InterviewScoringModalComponent } from '../../components/interview-scoring-modal/interview-scoring-modal.component';

/**
 * 評分維度（保留相容）
 */
interface EvaluationScore {
  dimensionId: string;
  dimensionName: string;
  score: number;
  remark?: string;
}

/**
 * 媒體附件介面
 */
interface MediaFile {
  id: string;
  type: 'audio' | 'video';
  file: File;
  url: string;
  filename: string;
  size: number;
  transcriptText?: string;
}

interface TranscriptSegment {
  time: string;
  speaker: 'interviewer' | 'candidate';
  text: string;
}

/**
 * 候選人狀態（統一定義）
 * 
 * 流程狀態：
 * - interview: 已安排面試
 * - pending_ai: 待 AI 分析
 * - pending_decision: 待決策
 * - offered: 待回覆 Offer
 * - offer_accepted: 已錄取同意
 * - onboarded: 已報到
 * 
 * 終止狀態（公司決定）：
 * - not_invited: 不邀請
 * - not_hired: 未錄取
 * 
 * 終止狀態（候選人婉拒）：
 * - invite_declined: 邀請婉拒
 * - interview_declined: 面試婉拒
 * - offer_declined: Offer 婉拒
 */
type CandidateStatus = 
  | 'interview' | 'pending_ai' | 'pending_decision' 
  | 'offered' | 'offer_accepted' | 'onboarded'
  | 'not_invited' | 'not_hired'
  | 'invite_declined' | 'interview_declined' | 'offer_declined';

import { AiScoringOverlayComponent } from '../../components/ai-scoring-overlay/ai-scoring-overlay.component';
import { JobService } from '../../services/job.service';

@Component({
  selector: 'app-recruitment-page',
  standalone: true,
  imports: [FormsModule, CommonModule, HeaderComponent, AiScoringOverlayComponent, InterviewScoringModalComponent],
  templateUrl: './recruitment-page.component.html',
  styleUrl: './recruitment-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecruitmentPageComponent implements OnInit, OnDestroy {
  @ViewChild('radarChart') radarChartRef!: ElementRef<HTMLDivElement>;

  private interviewService = inject(InterviewService);
  private aiAnalysisService = inject(AIAnalysisService);
  private jobKeywordsService = inject(JobKeywordsService);
  private notificationService = inject(NotificationService);
  private jobService = inject(JobService);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  private radarChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.radarChart?.resize();

  // ============================================================
  // 候選人列表
  // ============================================================
  candidates = signal<Candidate[]>([]);
  searchQuery = signal<string>('');
  statusFilter = signal<'all' | 'waiting' | 'scored'>('all');
  selectedCandidate = signal<CandidateDetail | null>(null);
  loading = signal<boolean>(false);

  // ============================================================
  // 新版評分 Modal（17 題倒扣制）
  // ============================================================
  isScoringModalVisible = signal<boolean>(false);
  candidateFull = signal<CandidateFull | null>(null);
  candidateFormData = signal<CandidateFormData | null>(null);
  resumeAnalysisData = signal<CandidateResumeAnalysis | null>(null);

  // ============================================================
  // 面試評分表單（保留相容，用於雷達圖顯示）
  // ============================================================
  performanceDescription = signal<string>('');
  overallComment = signal<string>('');
  dimensionScores = signal<EvaluationScore[]>([]);
  evaluationDimensions = signal<EvaluationDimension[]>([]);
  scoringSubmitting = signal<boolean>(false);

  // ============================================================
  // 媒體上傳
  // ============================================================
  uploadedMedia = signal<MediaFile | null>(null);
  isDragOver = signal<boolean>(false);
  isTranscribing = signal<boolean>(false);
  transcriptText = signal<string>('');
  
  // 追蹤媒體所屬的候選人 ID，用於判斷是否需要在切換候選人時清除
  private mediaOwnerId = signal<string | null>(null);
  // 追蹤上次初始化的候選人 ID，避免重複初始化
  private lastInitializedCandidateId: string | null = null;

  // ============================================================
  // AI 分析
  // ============================================================
  aiAnalysisResult = signal<AIAnalysisResult | null>(null);
  aiAnalysisLoading = signal<boolean>(false);
  aiAnalysisProgress = signal<number>(0);


  // ============================================================
  // 錄用決策
  // ============================================================
  decision = signal<'Offered' | 'Rejected' | null>(null);
  decisionReason = signal<string>('');
  decisionSubmitting = signal<boolean>(false);
  offerResponseLink = signal<string | null>(null); // 錄用通知回覆連結
  
  // 判斷是否已提交決策（鎖定狀態）
  isDecisionSubmitted = computed(() => {
    const candidate = this.selectedCandidate();
    if (!candidate) return false;
    // 檢查候選人狀態是否為已決策狀態
    return ['offered', 'offer_accepted', 'offer_declined', 'not_hired', 'onboarded'].includes(candidate.status);
  });
  
  // 判斷候選人是否為 Offered 狀態（可顯示 Offer 連結）
  isOfferPending = computed(() => {
    const candidate = this.selectedCandidate();
    return candidate?.status === 'offered';
  });

  // ============================================================
  // Computed
  // ============================================================
  filteredCandidates = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const filter = this.statusFilter();

    return this.candidates().filter(c => {
      const matchesQuery = c.name.toLowerCase().includes(query) ||
        c.position.toLowerCase().includes(query);

      if (filter === 'all') return matchesQuery;
      if (filter === 'waiting') return matchesQuery && c.status === 'interview';
      if (filter === 'scored') {
        // 'scored' tab now covers all post-interview states
        return matchesQuery && (
          c.status === 'pending_ai' ||
          c.status === 'pending_decision' ||
          c.status === 'offered' ||
          c.status === 'offer_accepted' ||
          c.status === 'offer_declined' ||
          c.status === 'onboarded' ||
          c.status === 'not_hired'
        );
      }
      return matchesQuery;
    });
  });

  // AI 分析後的推薦
  hireRecommendation = computed(() => {
    const aiResult = this.aiAnalysisResult();
    if (aiResult) {
      return {
        level: aiResult.recommendation.level,
        text: aiResult.recommendation.label,
        icon: aiResult.recommendation.icon,
        color: aiResult.recommendation.color
      };
    }
    return null;
  });

  // AI 評分顯示
  aiScoresDisplay = computed(() => {
    const aiResult = this.aiAnalysisResult();
    if (aiResult) {
      return {
        keywordMatch: aiResult.scoreBreakdown.keywordScore,
        semanticAnalysis: aiResult.scoreBreakdown.semanticScore,
        jdMatch: aiResult.scoreBreakdown.jdMatchScore,
        overall: aiResult.overallScore
      };
    }
    return null;
  });

  // UX Flow Control

  // 是否已儲存面試評分
  isEvaluationSaved = computed(() => {
    const candidate = this.selectedCandidate();
    return candidate?.scoringStatus === 'Scored' || this.statusFilter() === 'scored';
    // 注意: 這裡邏輯可以更嚴謹，目前判斷 status 或 scoringStatus
  });

  // 是否已有 AI 分析結果
  isAIAnalysisDone = computed(() => {
    return !!this.aiAnalysisResult();
  });

  // 解析後的逐字稿
  parsedTranscript = computed<TranscriptSegment[]>(() => {
    const text = this.transcriptText();
    if (!text) return [];
    return this.parseTranscript(text);
  });

  // 是否已完成評分
  isScoringComplete = computed(() => {
    const desc = this.performanceDescription();
    const scores = this.dimensionScores();
    return desc.trim().length > 0 && scores.every(s => s.score > 0);
  });

  // 計算總評分
  totalScore = computed(() => {
    const scores = this.dimensionScores();
    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, s) => acc + s.score, 0);
    return Math.round(sum / scores.length);
  });

  constructor() {
    // 當候選人改變時，初始化評分維度
    effect(() => {
      const candidate = this.selectedCandidate();
      if (candidate) {
        this.initializeForm(candidate); // Refactored init logic
        setTimeout(() => this.initRadarChart(), 100);
      }
    }, { allowSignalWrites: true });
    
  }

  ngOnInit(): void {
    this.loadCandidates();
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.radarChart?.dispose();
    // 釋放媒體 URL
    const media = this.uploadedMedia();
    if (media) URL.revokeObjectURL(media.url);
  }

  // ============================================================
  // 候選人載入
  // ============================================================
  loadCandidates(): void {
    this.loading.set(true);
    this.interviewService.getScheduledCandidates().subscribe({
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

  selectCandidate(candidate: Candidate): void {
    // 如果點擊的是同一個候選人，不重新載入
    if (this.lastInitializedCandidateId === candidate.id && this.selectedCandidate()?.id === candidate.id) {
      return;
    }
    
    // 如果選擇了不同的候選人，重置初始化標誌並清除 AI 結果
    if (this.lastInitializedCandidateId !== candidate.id) {
      this.lastInitializedCandidateId = null;
      // 只有切換候選人時才清除 AI 分析結果
      this.aiAnalysisResult.set(null);
    }
    
    this.loading.set(true);

    this.interviewService.getCandidateDetail(candidate.id).subscribe({
      next: (detail) => {
        if (detail) {
          // 如果列表中的狀態比詳情中的狀態更新，使用列表狀態
          // 這確保當候選人狀態已更新（如 offered）時，詳情頁面能正確顯示鎖定狀態
          if (candidate.status && detail.status !== candidate.status) {
            detail.status = candidate.status;
          }
          this.selectedCandidate.set(detail);
        }
        this.loading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.error('載入候選人詳情失敗');
        this.loading.set(false);
      }
    });
  }

  // ============================================================
  // 評分維度
  // ============================================================
  initializeForm(candidate: CandidateDetail): void {
    // 如果是同一個候選人，不重複初始化（防止上傳完成後被清除）
    if (this.lastInitializedCandidateId === candidate.id) {
      return;
    }
    
    this.lastInitializedCandidateId = candidate.id;

    // 1. Reset ALL signals (確保切換候選人時完全重置)
    this.performanceDescription.set('');
    this.overallComment.set('');
    this.transcriptText.set('');
    this.aiAnalysisResult.set(null);
    this.decision.set(null);
    this.decisionReason.set('');
    this.offerResponseLink.set(null);
    
    // 只有切換到不同候選人時才清除媒體
    const prevMediaOwner = this.mediaOwnerId();
    if (prevMediaOwner !== null && prevMediaOwner !== candidate.id) {
      const prevMedia = this.uploadedMedia();
      if (prevMedia) {
        // 釋放本地 blob URL（伺服器 URL 不需要釋放）
        if (prevMedia.url.startsWith('blob:')) {
          URL.revokeObjectURL(prevMedia.url);
        }
        this.uploadedMedia.set(null);
        this.mediaOwnerId.set(null);
        console.log('[initializeForm] Cleared media from previous candidate:', prevMediaOwner);
      }
    }

    // 2. Load Evaluation Data if exists
    if (candidate.evaluation) {
      const evalData = candidate.evaluation;
      this.performanceDescription.set(evalData.performanceDescription || '');
      this.overallComment.set(evalData.overallComment || '');
      if (evalData.transcriptText) {
        this.transcriptText.set(evalData.transcriptText);
      }

      // Load Media (僅當此候選人有媒體檔案時，且目前沒有新上傳的媒體)
      if (evalData.mediaUrl && !this.uploadedMedia()) {
        const isVideo = evalData.mediaUrl.endsWith('.mp4') || evalData.mediaUrl.endsWith('.webm') || evalData.mediaUrl.endsWith('.mov');
        this.uploadedMedia.set({
          id: `media-loaded-${candidate.id}`,
          type: isVideo ? 'video' : 'audio',
          file: null as any, // Remote file, no File object
          url: evalData.mediaUrl,
          filename: evalData.mediaUrl.split('/').pop() || 'media-file',
          size: evalData.mediaSize || 0 // 從資料庫載入檔案大小
        });
        this.mediaOwnerId.set(candidate.id);
      }

      // 檢查是否有新版評分資料
      if (evalData.scoringItems && evalData.scoringItems.length > 0) {
        // 新版評分資料：使用新版系統，不載入舊版維度
        console.log('使用新版評分系統');
      } else {
        // 舊版或無評分資料：載入預設維度
        this.loadEvaluationDimensions();
      }
    } else {
      // 3. New Evaluation: Load default dimensions
      this.loadEvaluationDimensions();
    }

    // 4. Load AI Analysis Result if exists
    if (candidate.aiAnalysisResult) {
      this.aiAnalysisResult.set(candidate.aiAnalysisResult);
    }

    // 5. Load Decision if exists (從資料庫載入錄用決策)
    if (candidate.decision) {
      const dec = candidate.decision as any; // 使用 any 以存取蛇形命名欄位
      // 將資料庫的 decision 值映射到 UI 的 'Offered' | 'Rejected'
      if (dec.decision === 'Offered' || dec.decision === 'Rejected') {
        this.decision.set(dec.decision);
        this.decisionReason.set(dec.reason || '');
      }
      
      // 如果是 Offered 狀態，載入 Offer 回覆連結
      // 注意：後端返回蛇形命名 (response_token)，需同時檢查駝峰命名 (responseToken)
      const token = dec.response_token || dec.responseToken;
      if (dec.decision === 'Offered' && token) {
        const fullLink = window.location.origin + `/public/offer-response/${token}`;
        this.offerResponseLink.set(fullLink);
      }
    }
    
    // 6. 如果候選人狀態是 offered，也嘗試獲取 Offer 連結（後備方案）
    if (candidate.status === 'offered' && !this.offerResponseLink()) {
      this.loadOfferResponseLink(candidate.id);
    }
  }
  
  private loadOfferResponseLink(candidateId: string): void {
    this.interviewService.getOfferResponseLink(candidateId).subscribe({
      next: (data) => {
        const fullLink = window.location.origin + data.responseLink;
        this.offerResponseLink.set(fullLink);
      },
      error: () => {
        // 如果獲取失敗，不顯示錯誤（可能是還沒有 Offer）
      }
    });
  }

  loadEvaluationDimensions(): void {
    this.jobKeywordsService.getDimensions().subscribe({
      next: (dimensions) => {
        this.evaluationDimensions.set(dimensions);
        // 初始化評分陣列 (Only reset if we are indeed loading defaults)
        const scores: EvaluationScore[] = dimensions.map(d => ({
          dimensionId: d.id,
          dimensionName: d.name,
          score: 0
        }));
        this.dimensionScores.set(scores);
      }
    });
  }

  updateDimensionScore(dimensionId: string, score: number): void {
    const scores = this.dimensionScores();
    const updated = scores.map(s =>
      s.dimensionId === dimensionId ? { ...s, score } : s
    );
    this.dimensionScores.set(updated);
    // 更新雷達圖
    this.updateRadarChart();
  }

  updateDimensionComment(dimensionId: string, comment: string): void {
    const scores = this.dimensionScores();
    const updated = scores.map(s =>
      s.dimensionId === dimensionId ? { ...s, remark: comment } : s
    );
    this.dimensionScores.set(updated);
  }

  resetForm(): void {
    this.performanceDescription.set('');
    this.overallComment.set('');
    this.decision.set(null);
    this.decisionReason.set('');
    this.transcriptText.set('');
    this.uploadedMedia.set(null); // Just clear the signal, revoke is handled in removeMedia or new upload
    const media = this.uploadedMedia();
    if (media) URL.revokeObjectURL(media.url);
    this.uploadedMedia.set(null);
  }

  // ============================================================
  // 媒體上傳
  // ============================================================
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileUpload(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileUpload(input.files[0]);
    }
  }

  handleFileUpload(file: File): void {
    const candidate = this.selectedCandidate();
    if (!candidate) {
      this.notificationService.error('請先選擇候選人');
      return;
    }
    
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/m4a',
      'video/mp4', 'video/webm', 'video/quicktime'];

    if (!validTypes.some(t => file.type.includes(t.split('/')[1]))) {
      this.notificationService.error('僅支援音訊或影片檔案');
      return;
    }

    const isVideo = file.type.startsWith('video');
    const localUrl = URL.createObjectURL(file);
    const candidateId = candidate.id;

    console.log('[Upload] Starting upload for:', file.name, 'candidateId:', candidateId);

    // 1. 立即設置媒體所屬候選人，並顯示本地預覽
    this.mediaOwnerId.set(candidateId);
    this.uploadedMedia.set({
      id: `media-temp-${Date.now()}`,
      type: isVideo ? 'video' : 'audio',
      file,
      url: localUrl,
      filename: file.name,
      size: file.size
    });
    
    console.log('[Upload] Set uploadedMedia for candidate:', candidateId);
    
    // 強制觸發變更檢測顯示預覽
    this.cdr.detectChanges();

    // 2. 上傳到伺服器
    this.notificationService.info('正在上傳檔案...');
    this.interviewService.uploadMedia(file).subscribe({
      next: (res) => {
        // 檢查是否還是同一個候選人（避免切換候選人後覆蓋）
        if (this.mediaOwnerId() !== candidateId) {
          console.log('[Upload] Candidate changed during upload, discarding result');
          URL.revokeObjectURL(localUrl);
          return;
        }
        
        const persistentUrl = res.url;
        console.log('[Upload] Server responded with URL:', persistentUrl);

        // 3. 上傳成功後，切換到伺服器 URL（持久化）
        this.uploadedMedia.set({
          id: `media-${Date.now()}`,
          type: isVideo ? 'video' : 'audio',
          file,
          url: persistentUrl,
          filename: file.name,
          size: file.size
        });
        
        console.log('[Upload] Completed, uploadedMedia:', this.uploadedMedia());

        this.notificationService.success('檔案上傳成功');

        // 釋放本地預覽 URL
        URL.revokeObjectURL(localUrl);
        
        // 因為 OnPush 策略，需要手動觸發變更檢測
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('[Upload] Failed:', err);
        this.notificationService.error('檔案上傳失敗');
        
        // 上傳失敗時清除媒體狀態（僅當仍是同一候選人時）
        if (this.mediaOwnerId() === candidateId) {
          this.uploadedMedia.set(null);
          this.mediaOwnerId.set(null);
        }
        URL.revokeObjectURL(localUrl);
        this.cdr.detectChanges();
      }
    });
  }

  removeMedia(): void {
    const media = this.uploadedMedia();
    if (media) {
      // 只釋放 blob URL，伺服器 URL 不需要釋放
      if (media.url.startsWith('blob:')) {
        URL.revokeObjectURL(media.url);
      }
      this.uploadedMedia.set(null);
      this.mediaOwnerId.set(null);
      this.transcriptText.set('');
      this.cdr.detectChanges();
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ============================================================
  // 逐字稿產生
  // ============================================================
  generateTranscript(): void {
    const media = this.uploadedMedia();
    if (!media) {
      this.notificationService.warning('請先上傳錄音或錄影檔案');
      return;
    }

    this.isTranscribing.set(true);
    this.notificationService.info('正在產生逐字稿...');

    // Mock: 模擬逐字稿產生
    setTimeout(() => {
      const mockTranscript = `[00:00:15] 面試官：請先做個簡單的自我介紹。
[00:00:30] 候選人：您好！我是${this.selectedCandidate()?.name || '候選人'}，畢業於台灣大學，有三年的工作經驗。
[00:01:00] 面試官：可以分享一下您在團隊協作方面的經驗嗎？
[00:01:15] 候選人：當然！我非常重視團隊協作。在之前的專案中，我經常與跨部門同事緊密合作，成功提升了專案效率。
[00:02:00] 面試官：您對這個職位有什麼期待？
[00:02:15] 候選人：我希望能在這個職位上持續學習成長，並為公司帶來貢獻。`;

      this.transcriptText.set(mockTranscript);
      this.isTranscribing.set(false);
      this.notificationService.success('逐字稿產生完成');
      this.cdr.detectChanges();
    }, 2000);
  }

  // ============================================================
  // 新版評分 Modal 操作
  // ============================================================

  /**
   * 打開評分 Modal
   */
  openScoringModal(): void {
    const candidate = this.selectedCandidate();
    if (!candidate) {
      this.notificationService.warning('請先選擇候選人');
      return;
    }

    // 載入候選人完整履歷資料（包含履歷解析報告）
    if (candidate.jobId) {
      this.jobService.getCandidateFull(candidate.jobId, candidate.id).subscribe({
        next: (full) => {
          this.candidateFull.set(full);
          // 設定履歷解析報告
          if (full.resumeAnalysis) {
            this.resumeAnalysisData.set(full.resumeAnalysis);
          }
        },
        error: () => {
          console.warn('Failed to load candidate full data');
        }
      });
    }

    // 載入候選人面試表單資料（如果有面試 ID）
    const interview = candidate.interviews?.find(i => i.result === 'Pending') || candidate.interviews?.[0];
    if (interview) {
      this.interviewService.getCandidateFormData(interview.id).subscribe({
        next: (data) => {
          if (data.formData) {
            this.candidateFormData.set(data.formData);
          }
        },
        error: () => {
          console.warn('Failed to load candidate form data');
        }
      });
    }

    this.isScoringModalVisible.set(true);
  }

  /**
   * 關閉評分 Modal
   */
  closeScoringModal(): void {
    this.isScoringModalVisible.set(false);
  }

  /**
   * 評分完成回調
   */
  onScoringCompleted(): void {
    const candidate = this.selectedCandidate();
    if (candidate) {
      // 重新載入候選人詳情
      this.interviewService.getCandidateDetail(candidate.id).subscribe({
        next: (detail) => {
          if (detail) {
            console.log('=== Reloaded candidate detail ===');
            console.log('evaluation.totalScore:', detail.evaluation?.totalScore);
            console.log('evaluation.recommendation:', detail.evaluation?.recommendation);
            console.log('evaluation.prosComment:', detail.evaluation?.prosComment);
            console.log('evaluation.consComment:', detail.evaluation?.consComment);
            this.selectedCandidate.set(detail);
            this.cdr.detectChanges();
          }
        }
      });
    }
    // 重新載入候選人列表
    this.loadCandidates();
    this.isScoringModalVisible.set(false);
  }

  // ============================================================
  // 提交面試評分（改為打開新版評分 Modal）
  // ============================================================
  submitScoring(): void {
    this.openScoringModal();
  }

  // ============================================================
  // AI 量化分析
  // ============================================================
  triggerAIAnalysis(): void {
    const candidate = this.selectedCandidate();
    if (!candidate) {
      this.notificationService.warning('請先選擇候選人');
      return;
    }

    // 整合所有文字內容進行分析：逐字稿 + 候選人表現描述 + 總體評價
    const contentParts: string[] = [];
    
    // 1. 即時逐字稿
    const transcriptContent = this.transcriptText();
    if (transcriptContent.trim()) {
      contentParts.push(transcriptContent);
    } else if (candidate.transcript?.length) {
      contentParts.push(candidate.transcript.map(t => t.text).join(' '));
    }
    
    // 2. 候選人表現描述
    const performanceDesc = this.performanceDescription();
    if (performanceDesc.trim()) {
      contentParts.push(performanceDesc);
    }
    
    // 3. 總體評價與建議
    const overallCommentText = this.overallComment();
    if (overallCommentText.trim()) {
      contentParts.push(overallCommentText);
    }
    
    // 合併所有文字內容
    const fullAnalysisText = contentParts.join('\n\n');
    
    if (!fullAnalysisText.trim()) {
      this.notificationService.warning('請先填寫面試評分記錄或產生逐字稿');
      return;
    }

    this.aiAnalysisLoading.set(true);
    this.notificationService.info('正在進行 AI 量化分析...');

    // 準備分析所需資料
    const candidateSkills = (candidate.skills || []).map(s => s.name);
    // 暫時使用通用 JD 需求，未來可從 Job API 取得
    const jdRequirements = ['邏輯思考', '溝通能力', '技術能力', '團隊合作', '學習能力', '問題解決'];

    // 使用完整分析服務（傳入整合後的文字內容）
    this.aiAnalysisService.runFullAnalysis(
      candidate.id,
      candidate.jobId || 'default-job',
      fullAnalysisText, // 整合逐字稿、表現描述、總體評價
      candidateSkills,
      jdRequirements
    ).subscribe({
      next: (result) => {
        this.aiAnalysisResult.set(result);
        this.aiAnalysisLoading.set(false);
        this.notificationService.success('AI 分析完成，請檢閱後儲存');

        // 初始化雷達圖
        setTimeout(() => this.initRadarChart(), 100);
      },
      error: (err) => {
        console.error('AI Analysis Error:', err);
        this.aiAnalysisLoading.set(false);
        this.notificationService.error('AI 分析失敗，請稍後再試');
        console.error(err);
      }
    });
  }

  saveAIAnalysis(): void {
    const candidate = this.selectedCandidate();
    const result = this.aiAnalysisResult();

    if (!candidate || !result) return;

    this.aiAnalysisLoading.set(true);

    const media = this.uploadedMedia();
    const evaluationData = {
      performanceDescription: this.performanceDescription(),
      dimensionScores: this.dimensionScores().map(d => ({
        dimensionId: d.dimensionId,
        dimensionName: d.dimensionName,
        score: d.score,
        comment: d.remark || ''
      })),
      overallComment: this.overallComment(),
      totalScore: this.totalScore(),
      transcriptText: this.transcriptText(),
      mediaUrl: media?.url,
      mediaSize: media?.size,
      aiAnalysisResult: result
    };

    this.interviewService.saveEvaluation(candidate.id, evaluationData).subscribe({
      next: () => {
        this.aiAnalysisLoading.set(false);
        this.notificationService.success('AI 分析結果已儲存');

        // Refresh list to update status
        this.loadCandidates();
      },
      error: (err) => {
        this.aiAnalysisLoading.set(false);
        this.notificationService.error('儲存失敗');
        console.error(err);
      }
    });
  }

  // ============================================================
  // 錄用決策
  // ============================================================
  submitDecision(): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;

    if (!this.decision()) {
      this.notificationService.warning('請選擇錄用或婉拒');
      return;
    }

    this.decisionSubmitting.set(true);

    this.interviewService.makeDecision(candidate.id, this.decision()!, this.decisionReason())
      .subscribe({
        next: (response) => {
          this.decisionSubmitting.set(false);
          
          let offerLink: string | null = null;
          
          if (this.decision() === 'Offered' && response.responseLink) {
            // 錄用決策：保存回覆連結
            offerLink = window.location.origin + response.responseLink;
            this.offerResponseLink.set(offerLink);
            this.notificationService.success('錄用通知已送出');
          } else {
            this.notificationService.success(`決策已提交：${this.decision() === 'Offered' ? '錄用' : '婉拒'}`);
          }
          
          // 【關鍵修正】立即更新 selectedCandidate 的狀態，觸發畫面鎖定
          // 根據決策類型設定對應的狀態
          const newStatus = this.decision() === 'Offered' ? 'offered' : 'not_hired';
          const candidateId = candidate.id;
          
          // 使用 NgZone.run 確保在 Angular zone 內執行，觸發變更檢測
          this.ngZone.run(() => {
            // 1. 更新 selectedCandidate 狀態（觸發 isDecisionSubmitted computed）
            this.selectedCandidate.update(c => c ? { ...c, status: newStatus } : null);
            
            // 2. 同步更新 candidates 列表中的對應候選人狀態（更新側邊欄）
            this.candidates.update(list => 
              list.map(c => c.id === candidateId ? { ...c, status: newStatus } : c)
            );
            
            // 強制觸發變更檢測，確保畫面立即更新
            this.cdr.detectChanges();
          });
          
          // 異步重新載入候選人列表（取得完整後端資料）
          this.loadCandidates();
          
          // 異步重新載入當前候選人完整資料（獲取完整的後端資料）
          // 【重要】確保不覆蓋剛設定的狀態
          this.interviewService.getCandidateDetail(candidate.id).subscribe({
            next: (detail) => {
              if (detail) {
                // 【關鍵】保持已更新的 status，避免被後端舊資料覆蓋
                const preservedStatus = newStatus;
                detail.status = preservedStatus;
                
                this.selectedCandidate.set(detail);
                if (offerLink && !this.offerResponseLink()) {
                  this.offerResponseLink.set(offerLink);
                }
                this.cdr.detectChanges();
              }
            }
          });
        },
        error: () => {
          this.decisionSubmitting.set(false);
          this.notificationService.error('提交失敗，請稍後再試');
        }
      });
  }
  
  private reloadSelectedCandidateWithOfferLink(candidateId: string, offerLink: string | null): void {
    this.interviewService.getCandidateDetail(candidateId).subscribe({
      next: (detail) => {
        if (detail) {
          this.selectedCandidate.set(detail);
          this.initializeForm(detail);
          
          // 如果 initializeForm 沒有從資料庫載入 Offer 連結，使用傳入的連結
          if (offerLink && !this.offerResponseLink()) {
            this.offerResponseLink.set(offerLink);
          }
          
          this.cdr.detectChanges();
        }
      }
    });
  }

  copyOfferLink(): void {
    const link = this.offerResponseLink();
    if (link) {
      navigator.clipboard.writeText(link).then(() => {
        this.notificationService.success('連結已複製到剪貼簿');
      }).catch(() => {
        this.notificationService.error('複製失敗，請手動複製');
      });
    }
  }


  // ============================================================
  // 雷達圖
  // ============================================================
  private initRadarChart(): void {
    if (this.radarChart) {
      this.radarChart.dispose();
    }
    if (this.radarChartRef?.nativeElement) {
      this.radarChart = echarts.init(this.radarChartRef.nativeElement);
      this.updateRadarChart();
    }
  }

  private updateRadarChart(): void {
    if (!this.radarChart) return;

    const dimensions = this.evaluationDimensions();
    const scores = this.dimensionScores();
    const aiResult = this.aiAnalysisResult();

    // 使用 AI 分析結果或手動評分
    const displayScores = aiResult
      ? aiResult.keywordAnalysis.dimensionBreakdown.map(d => d.score)
      : scores.map(s => s.score * 10); // 手動評分 0-10 轉換為 0-100

    const displayNames = aiResult
      ? aiResult.keywordAnalysis.dimensionBreakdown.map(d => d.dimensionName)
      : dimensions.map(d => d.name);

    const option: echarts.EChartsOption = {
      tooltip: {},
      radar: {
        indicator: displayNames.map(name => ({
          name,
          max: 100
        })),
        radius: '65%',
        axisName: {
          color: '#6B7280',
          fontSize: 11
        },
        splitArea: {
          areaStyle: { color: ['#FCFCFD', '#F5F5F7'] }
        },
        splitLine: {
          lineStyle: { color: '#E8E8EA' }
        },
        axisLine: {
          lineStyle: { color: '#E8E8EA' }
        }
      },
      series: [{
        type: 'radar',
        data: [{
          value: displayScores,
          name: this.selectedCandidate()?.name || '評分',
          areaStyle: { color: 'rgba(141, 163, 153, 0.4)' },
          lineStyle: { color: '#8DA399' },
          itemStyle: { color: '#8DA399' }
        }]
      }]
    };

    this.radarChart.setOption(option);
  }

  // ============================================================
  // 匯出報告
  // ============================================================
  exportReport(): void {
    this.notificationService.success('評估報告已匯出');
  }

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * 解析逐字稿文字
   * 格式範例: [00:00:15] 面試官：請介紹一下...
   */
  private parseTranscript(text: string): TranscriptSegment[] {
    const lines = text.split('\n');
    const segments: TranscriptSegment[] = [];

    // Regex for: [MM:SS] Speaker: Content OR [HH:MM:SS] ...
    const regex = /\[(\d{2}:\d{2}(?::\d{2})?)\]\s*([^：:]+)[：:]\s*(.*)/;

    for (const line of lines) {
      if (!line.trim()) continue;

      const match = line.match(regex);
      if (match) {
        let speaker: 'interviewer' | 'candidate' = 'interviewer';
        const speakerName = match[2].trim();

        // 簡單判斷說話者
        if (speakerName.includes('候選人') || speakerName.includes(this.selectedCandidate()?.name || 'Candidate')) {
          speaker = 'candidate';
        }

        segments.push({
          time: match[1],
          speaker: speaker,
          text: match[3].trim()
        });
      } else {
        // Handle continuation lines or unknown format (append to previous if possible)
        if (segments.length > 0) {
          segments[segments.length - 1].text += '\n' + line.trim();
        }
      }
    }
    return segments;
  }
}
