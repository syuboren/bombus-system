import { Component, ChangeDetectionStrategy, input, output, signal, computed, ViewEncapsulation, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CandidateDetail,
  CandidateFormData,
  ScoringItem,
  ScoringLevel,
  ProcessChecklist,
  ComprehensiveAssessment,
  RecommendationType,
  SCORING_ITEMS_DEF,
  SCORING_CATEGORIES,
  SCORING_LEVEL_MAP,
  PROCESS_CHECKLIST_ITEMS,
  ASSESSMENT_OPTIONS,
  RECOMMENDATION_OPTIONS,
  createEmptyScoringItems,
  createEmptyProcessChecklist,
  createEmptyComprehensiveAssessment,
  calculateTotalScore
} from '../../models/candidate.model';
import { CandidateFull, CandidateResumeAnalysis } from '../../models/job.model';
import { InterviewService } from '../../services/interview.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { ReferencePanelComponent } from '../reference-panel/reference-panel.component';

/**
 * 面試官評分 Modal
 * 依據「面試官面試評分規格」實作 17 題倒扣制評分系統
 */
@Component({
  selector: 'app-interview-scoring-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReferencePanelComponent],
  templateUrl: './interview-scoring-modal.component.html',
  styleUrl: './interview-scoring-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class InterviewScoringModalComponent {
  // ============================================================
  // Inputs
  // ============================================================
  candidate = input.required<CandidateDetail>();
  candidateFull = input<CandidateFull | null>(null);
  interviewId = input<string>();
  isVisible = input.required<boolean>();
  jobId = input<string>();
  
  // 參考資料
  resumeAnalysis = input<CandidateResumeAnalysis | null>(null);
  candidateFormData = input<CandidateFormData | null>(null);

  // ============================================================
  // Outputs
  // ============================================================
  close = output<void>();
  scored = output<void>();

  // ============================================================
  // Services
  // ============================================================
  private interviewService = inject(InterviewService);
  private notificationService = inject(NotificationService);

  // ============================================================
  // Constants (exposed to template)
  // ============================================================
  readonly scoringCategories = SCORING_CATEGORIES;
  readonly scoringLevelMap = SCORING_LEVEL_MAP;
  readonly processChecklistItems = PROCESS_CHECKLIST_ITEMS;
  readonly assessmentOptions = ASSESSMENT_OPTIONS;
  readonly recommendationOptions = RECOMMENDATION_OPTIONS;
  readonly scoringLevels: ScoringLevel[] = ['excellent', 'good', 'fair', 'acceptable', 'poor'];

  // ============================================================
  // State: 基本資訊（系統自動帶入）
  // ============================================================
  fillDate = signal<string>(new Date().toISOString().split('T')[0]);
  interviewerName = signal<string>('HR Admin'); // TODO: 從登入資訊取得

  // ============================================================
  // State: 17 題評核項目
  // ============================================================
  scoringItems = signal<ScoringItem[]>(createEmptyScoringItems());

  // ============================================================
  // State: 面試流程檢核
  // ============================================================
  processChecklist = signal<ProcessChecklist>(createEmptyProcessChecklist());

  // ============================================================
  // State: 綜合評估（10 題）
  // ============================================================
  comprehensiveAssessment = signal<ComprehensiveAssessment>(createEmptyComprehensiveAssessment());

  // ============================================================
  // State: 面試結果總評
  // ============================================================
  prosComment = signal<string>('');
  consComment = signal<string>('');
  recommendation = signal<RecommendationType | null>(null);
  remark = signal<string>('');

  // ============================================================
  // State: 媒體/逐字稿（保留功能）
  // ============================================================
  transcriptText = signal<string>('');
  mediaUrl = signal<string>('');
  mediaSize = signal<number>(0);

  // ============================================================
  // State: UI 控制
  // ============================================================
  loading = signal<boolean>(false);
  isReferencePanelExpanded = signal<boolean>(true);
  activeSection = signal<string>('scoring'); // scoring, checklist, assessment, result

  // ============================================================
  // State: 追蹤上一次的 visible 狀態，用於偵測開啟事件
  // ============================================================
  private previousVisible = false;

  // ============================================================
  // Constructor: 初始化 Effect 載入已儲存的評分資料
  // ============================================================
  constructor() {
    // 當 modal 開啟時，載入候選人的評分資料
    effect(() => {
      const visible = this.isVisible();
      const candidate = this.candidate();
      
      // 偵測 Modal 從關閉變為開啟（上升緣觸發）
      const wasJustOpened = visible && !this.previousVisible;
      this.previousVisible = visible;

      if (wasJustOpened && candidate) {
        // Modal 剛打開，載入或重置表單
        if (candidate.evaluation) {
          console.log('Loading existing evaluation for candidate:', candidate.id, candidate.evaluation);
          this.loadExistingEvaluation(candidate.evaluation);
        } else {
          console.log('No existing evaluation for candidate:', candidate.id, ', resetting form');
          this.resetForm();
        }
      }
    }, { allowSignalWrites: true });
  }

  /**
   * 載入已儲存的評分資料
   */
  private loadExistingEvaluation(evaluation: NonNullable<CandidateDetail['evaluation']>): void {
    console.log('=== Loading evaluation data ===');
    console.log('scoringItems:', evaluation.scoringItems);
    console.log('processChecklist:', evaluation.processChecklist);
    console.log('comprehensiveAssessment:', evaluation.comprehensiveAssessment);
    console.log('prosComment:', evaluation.prosComment);
    console.log('consComment:', evaluation.consComment);
    console.log('recommendation:', evaluation.recommendation);

    // 載入 17 題評核項目（檢查是否有實際評分的項目）
    if (evaluation.scoringItems && Array.isArray(evaluation.scoringItems) && evaluation.scoringItems.length > 0) {
      // 確保每個項目都有完整結構
      const loadedItems = evaluation.scoringItems.map((item: ScoringItem) => ({
        code: item.code,
        name: item.name,
        category: item.category,
        weight: item.weight,
        score: item.score
      }));
      console.log('Setting scoringItems:', loadedItems);
      this.scoringItems.set(loadedItems);
    } else {
      console.log('No scoringItems found, using empty');
      this.scoringItems.set(createEmptyScoringItems());
    }

    // 載入流程檢核
    if (evaluation.processChecklist && typeof evaluation.processChecklist === 'object') {
      console.log('Setting processChecklist:', evaluation.processChecklist);
      this.processChecklist.set(evaluation.processChecklist);
    } else {
      this.processChecklist.set(createEmptyProcessChecklist());
    }

    // 載入綜合評估
    if (evaluation.comprehensiveAssessment && typeof evaluation.comprehensiveAssessment === 'object') {
      console.log('Setting comprehensiveAssessment:', evaluation.comprehensiveAssessment);
      this.comprehensiveAssessment.set(evaluation.comprehensiveAssessment);
    } else {
      this.comprehensiveAssessment.set(createEmptyComprehensiveAssessment());
    }

    // 載入結果總評
    this.prosComment.set(evaluation.prosComment || '');
    this.consComment.set(evaluation.consComment || '');
    this.recommendation.set(evaluation.recommendation || null);
    this.remark.set(evaluation.overallComment || '');

    // 載入媒體/逐字稿
    this.transcriptText.set(evaluation.transcriptText || '');
    this.mediaUrl.set(evaluation.mediaUrl || '');
    this.mediaSize.set(evaluation.mediaSize || 0);

    console.log('=== Evaluation data loaded ===');
  }

  /**
   * 重置表單為空白狀態
   */
  private resetForm(): void {
    this.scoringItems.set(createEmptyScoringItems());
    this.processChecklist.set(createEmptyProcessChecklist());
    this.comprehensiveAssessment.set(createEmptyComprehensiveAssessment());
    this.prosComment.set('');
    this.consComment.set('');
    this.recommendation.set(null);
    this.remark.set('');
    this.transcriptText.set('');
    this.mediaUrl.set('');
    this.mediaSize.set(0);
  }

  // ============================================================
  // Computed: 總分計算（100 + Σ扣分）
  // ============================================================
  totalScore = computed(() => calculateTotalScore(this.scoringItems()));

  // ============================================================
  // Computed: 低分警示（< 65）
  // ============================================================
  isLowScore = computed(() => this.totalScore() < 65);

  // ============================================================
  // Computed: 按分類分組的評核項目
  // ============================================================
  groupedScoringItems = computed(() => {
    const items = this.scoringItems();
    const groups: { category: string; label: string; items: ScoringItem[] }[] = [];
    
    const categoryOrder: (keyof typeof SCORING_CATEGORIES)[] = [
      'PERSONAL_CULTIVATION',
      'JOB_WILLINGNESS',
      'COMPREHENSIVE_QUALITY',
      'PERSONALITY_TRAITS',
      'PROFESSIONAL_SKILLS'
    ];

    categoryOrder.forEach(category => {
      const categoryItems = items.filter(item => item.category === category);
      if (categoryItems.length > 0) {
        groups.push({
          category,
          label: SCORING_CATEGORIES[category],
          items: categoryItems
        });
      }
    });

    return groups;
  });

  // ============================================================
  // Computed: 已評分項目數
  // ============================================================
  scoredItemsCount = computed(() => {
    return this.scoringItems().filter(item => item.score !== null).length;
  });

  // ============================================================
  // Computed: 驗證狀態
  // ============================================================
  validationErrors = computed(() => {
    const errors: string[] = [];
    
    // 檢查評核項目是否全部填寫
    const unscored = this.scoringItems().filter(item => item.score === null);
    if (unscored.length > 0) {
      errors.push(`尚有 ${unscored.length} 題評核項目未評分`);
    }

    // 檢查綜合評估「其他」選項
    const assessment = this.comprehensiveAssessment();
    this.assessmentOptions.forEach(opt => {
      const value = assessment[opt.code as keyof ComprehensiveAssessment];
      const otherValue = assessment[`${opt.code}_other` as keyof ComprehensiveAssessment];
      if (value === 'other' && !otherValue) {
        errors.push(`「${opt.label}」選擇其他時需填寫說明`);
      }
    });

    // 檢查必填欄位
    if (!this.prosComment().trim()) {
      errors.push('請填寫「面試者優點總評」');
    }
    if (!this.consComment().trim()) {
      errors.push('請填寫「面試者缺點總評」');
    }
    if (!this.recommendation()) {
      errors.push('請選擇「錄取建議」');
    }

    return errors;
  });

  isValid = computed(() => this.validationErrors().length === 0);

  // ============================================================
  // Methods: 評核項目
  // ============================================================
  setScoringLevel(itemCode: string, level: ScoringLevel): void {
    this.scoringItems.update(items =>
      items.map(item =>
        item.code === itemCode ? { ...item, score: level } : item
      )
    );
  }

  // ============================================================
  // Methods: 流程檢核
  // ============================================================
  toggleChecklist(code: keyof ProcessChecklist): void {
    this.processChecklist.update(checklist => ({
      ...checklist,
      [code]: !checklist[code]
    }));
  }

  // ============================================================
  // Methods: 綜合評估
  // ============================================================
  setAssessmentValue(code: string, value: string): void {
    this.comprehensiveAssessment.update(assessment => ({
      ...assessment,
      [code]: value
    }));
  }

  setAssessmentOther(code: string, value: string): void {
    this.comprehensiveAssessment.update(assessment => ({
      ...assessment,
      [`${code}_other`]: value
    }));
  }

  /**
   * 設定錄取建議
   */
  setRecommendation(value: RecommendationType): void {
    console.log('Setting recommendation to:', value);
    this.recommendation.set(value);
  }

  getAssessmentValue(code: string): string {
    const assessment = this.comprehensiveAssessment() as unknown as Record<string, string>;
    return assessment[code] || '';
  }

  getAssessmentOther(code: string): string {
    const assessment = this.comprehensiveAssessment() as unknown as Record<string, string>;
    return assessment[`${code}_other`] || '';
  }

  // ============================================================
  // Methods: UI 控制
  // ============================================================
  toggleReferencePanel(): void {
    this.isReferencePanelExpanded.update(v => !v);
  }

  setActiveSection(section: string): void {
    this.activeSection.set(section);
  }

  // ============================================================
  // Methods: 提交
  // ============================================================
  submit(): void {
    // 驗證
    if (!this.isValid()) {
      const errors = this.validationErrors();
      this.notificationService.warning(errors[0]);
      return;
    }

    // 取得目標面試 ID
    let targetInterviewId = this.interviewId();
    if (!targetInterviewId) {
      const pending = this.candidate().interviews?.find(i => i.result === 'Pending');
      targetInterviewId = pending?.id;
    }

    this.loading.set(true);

    // 取得錄取建議值
    const recommendationValue = this.recommendation();
    
    // 建立評分資料
    const evaluationData = {
      interviewId: targetInterviewId,
      // 新版欄位
      scoringItems: this.scoringItems(),
      processChecklist: this.processChecklist(),
      comprehensiveAssessment: this.comprehensiveAssessment(),
      prosComment: this.prosComment(),
      consComment: this.consComment(),
      recommendation: recommendationValue ?? undefined, // null 轉為 undefined
      // 保留欄位
      totalScore: this.totalScore(),
      overallComment: this.remark(),
      transcriptText: this.transcriptText(),
      mediaUrl: this.mediaUrl(),
      mediaSize: this.mediaSize()
    };

    console.log('=== Submitting evaluation data ===');
    console.log('recommendation:', evaluationData.recommendation);
    console.log('totalScore:', evaluationData.totalScore);

    this.interviewService.saveEvaluation(this.candidate().id, evaluationData).subscribe({
      next: () => {
        this.notificationService.success('面試評分已儲存');
        this.scored.emit();
        this.close.emit();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error saving evaluation:', err);
        this.notificationService.error('儲存失敗，請稍後再試');
        this.loading.set(false);
      }
    });
  }

  // ============================================================
  // Helper Methods
  // ============================================================
  getScoringLevelClass(level: ScoringLevel | null, targetLevel: ScoringLevel): string {
    if (level === targetLevel) {
      return `selected level-${targetLevel}`;
    }
    return '';
  }
}
