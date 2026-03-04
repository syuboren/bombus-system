import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssessmentService } from '../../services/assessment.service';
import { finalize } from 'rxjs';
import {
  QuarterlyReview,
  SatisfactionQuestion,
  SatisfactionSurveyAnswer,
  ContributionItem,
  LearningItem,
  JdReviewItem,
  OkrReviewItem,
  CoreCompetencyItem,
  ManagementCompetencyItem,
  SupervisorEvaluationCategory,
  SupervisorComment,
  ImprovementPlanItem,
  NextGoalItem,
  STATUS_LABELS,
  CORE_COMPETENCIES,
  MANAGEMENT_COMPETENCIES,
  SUPERVISOR_EVALUATION_CATEGORIES
} from '../../models/assessment.model';

/** 步驟定義 */
interface StepDefinition {
  id: number;
  label: string;
  icon: string;
  key: string;
}

@Component({
  selector: 'app-quarterly-review-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quarterly-review-modal.component.html',
  styleUrl: './quarterly-review-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuarterlyReviewModalComponent {
  private assessmentService = inject(AssessmentService);

  // Inputs
  reviewId = input<string>('');
  visible = input<boolean>(false);

  // Outputs
  close = output<void>();
  saved = output<void>();

  // Data signals
  review = signal<QuarterlyReview | null>(null);
  satisfactionQuestions = signal<SatisfactionQuestion[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  hasUnsavedChanges = signal(false);

  // Edit mode
  isEditing = signal(false);
  isManagerEditing = signal(false);
  activeStep = signal(1);

  // =====================================================
  // 表單資料 signals
  // =====================================================

  // 區塊一：員工自評
  selfAssessment = signal('');

  // 區塊二：貢獻價值
  contributionItems = signal<ContributionItem[]>([]);

  // 區塊三：學習成長
  learningItems = signal<LearningItem[]>([]);

  // 區塊四：JD 指標季檢核
  jdReviewItems = signal<JdReviewItem[]>([]);

  // 區塊五：OKR 目標季檢核
  okrReviewItems = signal<OkrReviewItem[]>([]);

  // 區塊六：核心職能
  coreCompetencies = signal<CoreCompetencyItem[]>([]);

  // 區塊七：管理職能 (僅主管)
  managementCompetencies = signal<ManagementCompetencyItem[]>([]);

  // 區塊七/八：直屬主管評價
  supervisorEvaluation = signal<SupervisorEvaluationCategory[]>([]);
  supervisorComment = signal<SupervisorComment>({
    bestEvaluation: '',
    worstEvaluation: '',
    supplement: ''
  });

  // 區塊八/九：改善計劃
  improvementPlanItems = signal<ImprovementPlanItem[]>([]);

  // 區塊十/十一：所需支持與發展
  supportPlan = signal('');

  // 區塊十一/十二：個人成長與意見
  personalGrowth = signal('');

  // 區塊十二/十三：其他面談內容
  otherContent = signal('');

  // 區塊十三/十四：下階段目標
  nextGoalItems = signal<NextGoalItem[]>([]);

  // 滿意度調查
  satisfactionAnswers = signal<SatisfactionSurveyAnswer[]>([]);

  // 面談資訊
  interviewDate = signal('');
  interviewLocation = signal('');

  // 主管評語 (面談階段)
  managerComment = signal('');
  developmentPlan = signal('');
  totalScore = signal<number | null>(null);

  // =====================================================
  // 權限判斷
  // =====================================================

  /** 員工可編輯 (pending 狀態) */
  canEmployeeEdit = computed(() => {
    return this.review()?.status === 'pending';
  });

  /** 主管可評核 (employee_submitted 狀態) */
  canManagerReview = computed(() => {
    return this.review()?.status === 'employee_submitted';
  });

  /** 可預約面談 (manager_reviewed 狀態) */
  canScheduleInterview = computed(() => {
    return this.review()?.status === 'manager_reviewed';
  });

  /** 可進行面談 (interview_scheduled 狀態) */
  canConductInterview = computed(() => {
    return this.review()?.status === 'interview_scheduled';
  });

  /** HR 可結案 (interview_completed 狀態) */
  canHrClose = computed(() => {
    return this.review()?.status === 'interview_completed';
  });

  /** 唯讀 (completed 狀態) */
  isReadOnly = computed(() => {
    return this.review()?.status === 'completed';
  });

  /** 表單類型判斷 */
  isManagerForm = computed(() => {
    return this.review()?.formType === 'manager';
  });

  // =====================================================
  // 步驟定義
  // =====================================================

  /** 員工表單步驟 (pending 狀態) - 6 步 */
  readonly employeeSteps: StepDefinition[] = [
    { id: 1, label: '自我評估', icon: 'ri-user-line', key: 'self_assessment' },
    { id: 2, label: '貢獻與學習', icon: 'ri-award-line', key: 'contribution_learning' },
    { id: 3, label: '目標檢核', icon: 'ri-target-line', key: 'goal_review' },
    { id: 4, label: '職能自評', icon: 'ri-focus-3-line', key: 'competency' },
    { id: 5, label: '主管評價自評', icon: 'ri-star-line', key: 'supervisor_eval' },
    { id: 6, label: '滿意度調查', icon: 'ri-questionnaire-line', key: 'satisfaction' }
  ];

  /** 主管表單步驟 (pending 狀態) - 7 步 */
  readonly managerFormSteps: StepDefinition[] = [
    { id: 1, label: '自我評估', icon: 'ri-user-line', key: 'self_assessment' },
    { id: 2, label: '貢獻與學習', icon: 'ri-award-line', key: 'contribution_learning' },
    { id: 3, label: '目標檢核', icon: 'ri-target-line', key: 'goal_review' },
    { id: 4, label: '核心職能', icon: 'ri-focus-3-line', key: 'core_competency' },
    { id: 5, label: '管理職能', icon: 'ri-team-line', key: 'management_competency' },
    { id: 6, label: '主管評價自評', icon: 'ri-star-line', key: 'supervisor_eval' },
    { id: 7, label: '滿意度調查', icon: 'ri-questionnaire-line', key: 'satisfaction' }
  ];

  /** 主管評核步驟 (employee_submitted 狀態) - 3 步 */
  readonly managerReviewSteps: StepDefinition[] = [
    { id: 1, label: '目標與職能評分', icon: 'ri-edit-line', key: 'score_review' },
    { id: 2, label: '直屬主管評價', icon: 'ri-star-line', key: 'supervisor_eval' },
    { id: 3, label: '主管評語', icon: 'ri-chat-4-line', key: 'manager_comment' }
  ];

  /** 面談步驟 (interview_scheduled 狀態) - 2 步 */
  readonly interviewSteps: StepDefinition[] = [
    { id: 1, label: '改善計劃', icon: 'ri-file-list-3-line', key: 'improvement' },
    { id: 2, label: '下階段目標', icon: 'ri-flag-line', key: 'next_goals' }
  ];

  /** 動態取得當前步驟 */
  steps = computed(() => {
    const status = this.review()?.status;

    if (status === 'pending') {
      return this.isManagerForm() ? this.managerFormSteps : this.employeeSteps;
    }
    if (status === 'employee_submitted' && this.isManagerEditing()) {
      return this.managerReviewSteps;
    }
    if (status === 'interview_scheduled' && this.isEditing()) {
      return this.interviewSteps;
    }
    return [];
  });

  /** 最後一步編號 */
  lastStep = computed(() => {
    return this.steps().length || 1;
  });

  /** 評分選項 */
  readonly scoreOptions = [1, 2, 3, 4, 5];

  /** 滿意度評分選項 */
  readonly satisfactionScoreOptions = [
    { value: 5, label: '非常同意' },
    { value: 4, label: '同意' },
    { value: 3, label: '普通' },
    { value: 2, label: '不同意' },
    { value: 1, label: '非常不同意' }
  ];

  constructor() {
    effect(() => {
      const id = this.reviewId();
      const vis = this.visible();
      // 監聽輸入狀態，視需求觸發資料載入
      if (id && vis) {
        // 使用 untracked 避免將內部 signal 讀取加入依賴
        untracked(() => {
          this.loadReview();
          this.loadSatisfactionQuestions();
        });
      }
    }, { allowSignalWrites: true });
  }

  // =====================================================
  // 載入資料
  // =====================================================

  loadReview(): void {
    const id = this.reviewId();
    if (!id) return;

    // 初始化表單狀態，避免殘留舊資料
    this.resetFormData();
    this.loading.set(true);
    this.error.set(null);

    this.assessmentService.getQuarterlyReviewById(id)
      .pipe(
        // 無論成功或失敗都結束 loading，避免卡在載入中
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (data) => {
          this.review.set(data);
          if (!data) {
            this.error.set('查無資料');
            return;
          }
          this.initFormData(data);
          // 使用後端返回的月度檢核分數填入 JD 指標
          this.populateJdReviewScores(data);
        },
        error: () => {
          this.error.set('載入失敗');
        }
      });
  }

  /** 使用後端返回的月度檢核分數填入 JD 指標 */
  private populateJdReviewScores(review: QuarterlyReview): void {
    if (!review.monthlyScores || review.monthlyScores.length === 0) return;

    // 如果 jd_review section 已有資料，則保留（員工已填寫過）
    const existingJdSection = review.sections?.find(s => s.sectionType === 'jd_review');
    if (existingJdSection && Array.isArray(existingJdSection.content)) {
      // 已有資料，不覆蓋
      return;
    }

    // 否則從月度檢核分數填入
    this.jdReviewItems.update(items =>
      items.map(item => {
        const monthlyScore = review.monthlyScores?.find(s => s.month === item.month);
        if (monthlyScore) {
          return {
            ...item,
            selfScore: monthlyScore.selfScore ?? item.selfScore,
            managerScore: monthlyScore.managerScore ?? item.managerScore
          };
        }
        return item;
      })
    );
  }

  loadSatisfactionQuestions(): void {
    this.assessmentService.getSatisfactionQuestions().subscribe({
      next: (questions) => {
        this.satisfactionQuestions.set(questions);
      }
    });
  }

  // =====================================================
  // 初始化與重置表單
  // =====================================================

  private resetFormData(): void {
    this.isEditing.set(false);
    this.isManagerEditing.set(false);
    this.activeStep.set(1);

    // 區塊一：員工自評
    this.selfAssessment.set('');

    // 區塊二：貢獻價值
    this.contributionItems.set([
      { order: 1, description: '', result: '', value: '' },
      { order: 2, description: '', result: '', value: '' },
      { order: 3, description: '', result: '', value: '' }
    ]);

    // 區塊三：學習成長
    this.learningItems.set([
      { order: 1, content: '', insights: '', implementation: '' },
      { order: 2, content: '', insights: '', implementation: '' },
      { order: 3, content: '', insights: '', implementation: '' }
    ]);

    // 區塊四：JD 指標季檢核 (依季度月份初始化)
    const r = this.review();
    const quarter = r?.quarter || 1;
    const months = this.getQuarterMonths(quarter);
    this.jdReviewItems.set(
      months.map((month, i) => ({
        order: i + 1,
        month,
        description: '',
        selfScore: undefined,
        managerScore: undefined
      }))
    );

    // 區塊五：OKR 目標季檢核
    this.okrReviewItems.set([
      { order: 1, objective: '', description: '', selfScore: undefined, managerScore: undefined },
      { order: 2, objective: '', description: '', selfScore: undefined, managerScore: undefined },
      { order: 3, objective: '', description: '', selfScore: undefined, managerScore: undefined }
    ]);

    // 區塊六：核心職能
    this.coreCompetencies.set(
      CORE_COMPETENCIES.map((c, i) => ({
        order: i + 1,
        name: c.name,
        behavior: c.behavior,
        event: '',
        selfScore: undefined,
        managerScore: undefined
      }))
    );

    // 區塊七：管理職能
    this.managementCompetencies.set(
      MANAGEMENT_COMPETENCIES.map((c, i) => ({
        order: i + 1,
        name: c.name,
        behavior: c.behavior,
        event: '',
        selfScore: undefined,
        managerScore: undefined
      }))
    );

    // 區塊七/八：直屬主管評價
    this.supervisorEvaluation.set(
      SUPERVISOR_EVALUATION_CATEGORIES.map(cat => ({
        category: cat.category,
        items: cat.items.map((desc, i) => ({
          order: i + 1,
          description: desc,
          selfScore: undefined,
          managerScore: undefined
        }))
      }))
    );
    this.supervisorComment.set({
      bestEvaluation: '',
      worstEvaluation: '',
      supplement: ''
    });

    // 區塊八/九：改善計劃
    this.improvementPlanItems.set([
      { order: 1, indicator: '', measure: '', deadline: '', resource: '' },
      { order: 2, indicator: '', measure: '', deadline: '', resource: '' }
    ]);

    // 區塊十/十一：所需支持
    this.supportPlan.set('');

    // 區塊十一/十二：個人成長
    this.personalGrowth.set('');

    // 區塊十二/十三：其他面談內容
    this.otherContent.set('');

    // 區塊十三/十四：下階段目標
    this.nextGoalItems.set([
      { order: 1, task: '', support: '', deadline: '' },
      { order: 2, task: '', support: '', deadline: '' },
      { order: 3, task: '', support: '', deadline: '' }
    ]);

    // 滿意度調查
    this.satisfactionAnswers.set([]);

    // 面談資訊
    this.interviewDate.set('');
    this.interviewLocation.set('');
    this.managerComment.set('');
    this.developmentPlan.set('');
    this.totalScore.set(null);
  }

  private initFormData(data: QuarterlyReview): void {
    // 從 sections 載入各區塊資料
    if (data.sections) {
      for (const section of data.sections) {
        switch (section.sectionType) {
          case 'self_assessment':
            if (typeof section.content === 'string') {
              this.selfAssessment.set(section.content);
            }
            break;

          case 'contribution':
            if (Array.isArray(section.content)) {
              this.contributionItems.set(section.content as ContributionItem[]);
            }
            break;

          case 'learning':
            if (Array.isArray(section.content)) {
              this.learningItems.set(section.content as LearningItem[]);
            }
            break;

          case 'jd_review':
            if (Array.isArray(section.content)) {
              this.jdReviewItems.set(section.content as unknown as JdReviewItem[]);
            }
            break;

          case 'okr_review':
            if (Array.isArray(section.content)) {
              this.okrReviewItems.set(section.content as unknown as OkrReviewItem[]);
            }
            break;

          case 'core_competency':
            if (Array.isArray(section.content)) {
              this.coreCompetencies.set(section.content as CoreCompetencyItem[]);
            }
            break;

          case 'management_competency':
            if (Array.isArray(section.content)) {
              this.managementCompetencies.set(section.content as ManagementCompetencyItem[]);
            }
            break;

          case 'supervisor_evaluation':
            if (Array.isArray(section.content)) {
              this.supervisorEvaluation.set(section.content as SupervisorEvaluationCategory[]);
            }
            break;

          case 'improvement_plan':
            if (Array.isArray(section.content)) {
              this.improvementPlanItems.set(section.content as unknown as ImprovementPlanItem[]);
            }
            break;

          case 'support_plan':
            if (typeof section.content === 'string') {
              this.supportPlan.set(section.content);
            }
            break;

          case 'personal_growth':
            if (typeof section.content === 'string') {
              this.personalGrowth.set(section.content);
            }
            break;

          case 'other_content':
            if (typeof section.content === 'string') {
              this.otherContent.set(section.content);
            }
            break;

          case 'next_goals':
            if (Array.isArray(section.content)) {
              this.nextGoalItems.set(section.content as unknown as NextGoalItem[]);
            }
            break;
        }
      }
    }

    // 滿意度調查
    if (data.satisfactionSurvey && data.satisfactionSurvey.length > 0) {
      this.satisfactionAnswers.set(data.satisfactionSurvey);
    }

    // 面談資訊
    this.interviewDate.set(data.interviewDate || '');
    this.interviewLocation.set(data.interviewLocation || '');
    this.managerComment.set(data.managerComment || '');
    this.developmentPlan.set(data.developmentPlan || '');
    this.totalScore.set(data.totalScore || null);
  }

  // =====================================================
  // 關閉與導航
  // =====================================================

  onClose(): void {
    // 檢查是否有未保存的變更
    if (this.hasUnsavedChanges() && this.isEditing()) {
      const confirmed = confirm('您有尚未保存的變更，確定要關閉嗎？');
      if (!confirmed) {
        return;
      }
    }

    // 關閉時重置狀態，避免重新開啟仍卡在載入中
    this.loading.set(false);
    this.error.set(null);
    this.hasUnsavedChanges.set(false);
    this.resetFormData();
    this.review.set(null);
    this.close.emit();
  }

  // 防呆：點擊背景不關閉 modal，避免誤觸導致資料遺失
  onBackdropClick(event: MouseEvent): void {
    // 不做任何事，防止誤觸關閉
  }

  setStep(step: number): void {
    this.activeStep.set(step);
  }

  prevStep(): void {
    if (this.activeStep() > 1) {
      this.activeStep.update(s => s - 1);
    }
  }

  nextStep(): void {
    if (this.activeStep() < this.lastStep()) {
      this.activeStep.update(s => s + 1);
    }
  }

  // =====================================================
  // 編輯模式控制
  // =====================================================

  startEditing(): void {
    this.isEditing.set(true);
    this.activeStep.set(1);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.loadReview();
  }

  startManagerEditing(): void {
    this.isManagerEditing.set(true);
    this.activeStep.set(1);
  }

  cancelManagerEditing(): void {
    this.isManagerEditing.set(false);
    this.loadReview();
  }

  // =====================================================
  // 貢獻價值項目
  // =====================================================

  // =====================================================
  // 自我評估
  // =====================================================

  updateSelfAssessment(value: string): void {
    this.selfAssessment.set(value);
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 貢獻價值項目
  // =====================================================

  addContributionItem(): void {
    this.contributionItems.update(items => [
      ...items,
      { order: items.length + 1, description: '', result: '', value: '' }
    ]);
    this.hasUnsavedChanges.set(true);
  }

  removeContributionItem(index: number): void {
    this.contributionItems.update(items =>
      items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }))
    );
    this.hasUnsavedChanges.set(true);
  }

  updateContributionItem(index: number, field: keyof ContributionItem, value: string): void {
    this.contributionItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 學習成長項目
  // =====================================================

  addLearningItem(): void {
    this.learningItems.update(items => [
      ...items,
      { order: items.length + 1, content: '', insights: '', implementation: '' }
    ]);
    this.hasUnsavedChanges.set(true);
  }

  removeLearningItem(index: number): void {
    this.learningItems.update(items =>
      items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }))
    );
    this.hasUnsavedChanges.set(true);
  }

  updateLearningItem(index: number, field: keyof LearningItem, value: string): void {
    this.learningItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // JD 指標季檢核
  // =====================================================

  updateJdReviewItem(index: number, field: keyof JdReviewItem, value: string | number | undefined): void {
    this.jdReviewItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // OKR 目標季檢核
  // =====================================================

  addOkrReviewItem(): void {
    this.okrReviewItems.update(items => [
      ...items,
      { order: items.length + 1, objective: '', description: '', selfScore: undefined, managerScore: undefined }
    ]);
    this.hasUnsavedChanges.set(true);
  }

  removeOkrReviewItem(index: number): void {
    this.okrReviewItems.update(items =>
      items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }))
    );
    this.hasUnsavedChanges.set(true);
  }

  updateOkrReviewItem(index: number, field: keyof OkrReviewItem, value: string | number | undefined): void {
    this.okrReviewItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 核心職能
  // =====================================================

  updateCoreCompetency(index: number, field: keyof CoreCompetencyItem, value: string | number | undefined): void {
    this.coreCompetencies.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 管理職能
  // =====================================================

  updateManagementCompetency(index: number, field: keyof ManagementCompetencyItem, value: string | number | undefined): void {
    this.managementCompetencies.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 直屬主管評價
  // =====================================================

  updateSupervisorEvalItem(catIndex: number, itemIndex: number, field: 'selfScore' | 'managerScore', value: number | undefined): void {
    this.supervisorEvaluation.update(categories =>
      categories.map((cat, ci) => {
        if (ci !== catIndex) return cat;
        return {
          ...cat,
          items: cat.items.map((item, ii) =>
            ii === itemIndex ? { ...item, [field]: value } : item
          )
        };
      })
    );
    this.hasUnsavedChanges.set(true);
  }

  updateSupervisorComment(field: keyof SupervisorComment, value: string): void {
    this.supervisorComment.update(c => ({ ...c, [field]: value }));
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 改善計劃
  // =====================================================

  addImprovementPlanItem(): void {
    this.improvementPlanItems.update(items => [
      ...items,
      { order: items.length + 1, indicator: '', measure: '', deadline: '', resource: '' }
    ]);
    this.hasUnsavedChanges.set(true);
  }

  removeImprovementPlanItem(index: number): void {
    this.improvementPlanItems.update(items =>
      items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }))
    );
    this.hasUnsavedChanges.set(true);
  }

  updateImprovementPlanItem(index: number, field: keyof ImprovementPlanItem, value: string): void {
    this.improvementPlanItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 下階段目標
  // =====================================================

  addNextGoalItem(): void {
    this.nextGoalItems.update(items => [
      ...items,
      { order: items.length + 1, task: '', support: '', deadline: '' }
    ]);
    this.hasUnsavedChanges.set(true);
  }

  removeNextGoalItem(index: number): void {
    this.nextGoalItems.update(items =>
      items.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 }))
    );
    this.hasUnsavedChanges.set(true);
  }

  updateNextGoalItem(index: number, field: keyof NextGoalItem, value: string): void {
    this.nextGoalItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
    this.hasUnsavedChanges.set(true);
  }

  // =====================================================
  // 滿意度調查
  // =====================================================

  updateSatisfactionAnswer(questionId: number, score: number): void {
    this.satisfactionAnswers.update(answers => {
      const existing = answers.find(a => a.questionId === questionId);
      if (existing) {
        return answers.map(a => a.questionId === questionId ? { ...a, score } : a);
      }
      return [...answers, { questionId, score }];
    });
    this.hasUnsavedChanges.set(true);
  }

  getSatisfactionScore(questionId: number): number {
    return this.satisfactionAnswers().find(a => a.questionId === questionId)?.score || 0;
  }

  // =====================================================
  // 提交表單
  // =====================================================

  /** 員工提交表單 (pending → employee_submitted) */
  submitEmployeeForm(): void {
    const r = this.review();
    if (!r) return;

    // 檢查直屬主管評價是否已完成
    if (!this.isSupervisorEvalComplete()) {
      this.error.set('請完成所有直屬主管評價題目');
      return;
    }

    // 檢查滿意度調查是否已完成
    if (!this.isSatisfactionSurveyComplete()) {
      this.error.set('請完成所有滿意度調查題目');
      return;
    }

    this.saving.set(true);

    const sections = [
      { sectionType: 'self_assessment', content: this.selfAssessment() },
      { sectionType: 'contribution', content: this.contributionItems().filter(i => i.description.trim()) },
      { sectionType: 'learning', content: this.learningItems().filter(i => i.content.trim()) },
      { sectionType: 'jd_review', content: this.jdReviewItems() },
      { sectionType: 'okr_review', content: this.okrReviewItems().filter(i => i.objective.trim()) },
      { sectionType: 'core_competency', content: this.coreCompetencies() },
      ...(this.isManagerForm() ? [{ sectionType: 'management_competency', content: this.managementCompetencies() }] : []),
      { sectionType: 'supervisor_evaluation', content: this.supervisorEvaluation() },
      { sectionType: 'support_plan', content: this.supportPlan() },
      { sectionType: 'personal_growth', content: this.personalGrowth() }
    ];

    this.assessmentService.submitEmployeeReview(r.id, {
      sections,
      satisfactionSurvey: this.satisfactionAnswers()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.isEditing.set(false);
        this.hasUnsavedChanges.set(false);
        this.saved.emit();
        this.loadReview();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('提交失敗');
      }
    });
  }

  /** 主管提交評核 (employee_submitted → manager_reviewed) */
  submitManagerReview(): void {
    const r = this.review();
    if (!r) return;

    this.saving.set(true);

    const sections = [
      { sectionType: 'jd_review', content: this.jdReviewItems() },
      { sectionType: 'okr_review', content: this.okrReviewItems() },
      { sectionType: 'core_competency', content: this.coreCompetencies() },
      ...(this.isManagerForm() ? [{ sectionType: 'management_competency', content: this.managementCompetencies() }] : []),
      { sectionType: 'supervisor_evaluation', content: this.supervisorEvaluation() }
    ];

    this.assessmentService.submitQuarterlyManagerReview(r.id, {
      managerComment: this.managerComment(),
      developmentPlan: this.developmentPlan(),
      supervisorComment: this.supervisorComment(),
      sections
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.isManagerEditing.set(false);
        this.hasUnsavedChanges.set(false);
        this.saved.emit();
        this.loadReview();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('評核提交失敗');
      }
    });
  }

  /** 預約面談 (manager_reviewed → interview_scheduled) */
  updateInterviewDate(value: string): void {
    this.interviewDate.set(value);
    this.hasUnsavedChanges.set(true);
  }

  updateInterviewLocation(value: string): void {
    this.interviewLocation.set(value);
    this.hasUnsavedChanges.set(true);
  }

  scheduleInterview(): void {
    const r = this.review();
    if (!r || !this.interviewDate()) return;

    this.saving.set(true);
    this.assessmentService.scheduleInterview(r.id, {
      interviewDate: this.interviewDate(),
      location: this.interviewLocation()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.hasUnsavedChanges.set(false);
        this.saved.emit();
        this.loadReview();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('預約失敗');
      }
    });
  }

  /** 完成面談 (interview_scheduled → interview_completed) */
  completeInterview(): void {
    const r = this.review();
    if (!r) return;

    this.saving.set(true);

    // 計算總分
    const satisfactionAvg = this.satisfactionAnswers().length > 0
      ? this.satisfactionAnswers().reduce((sum, a) => sum + a.score, 0) / this.satisfactionAnswers().length
      : 3;
    const calculatedScore = ((r.monthlyAvgScore || 0) + (satisfactionAvg * 20)) / 2;

    const sections = [
      { sectionType: 'improvement_plan', content: this.improvementPlanItems().filter(i => i.indicator.trim()) },
      { sectionType: 'next_goals', content: this.nextGoalItems().filter(i => i.task.trim()) },
      { sectionType: 'other_content', content: this.otherContent() }
    ];

    fetch(`/api/quarterly-reviews/${r.id}/complete-interview`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalScore: Math.round(calculatedScore * 10) / 10,
        managerComment: this.managerComment(),
        developmentPlan: this.developmentPlan(),
        sections
      })
    })
      .then(res => res.json())
      .then(() => {
        this.saving.set(false);
        this.isEditing.set(false);
        this.saved.emit();
        this.loadReview();
      })
      .catch(() => {
        this.saving.set(false);
        this.error.set('完成面談失敗');
      });
  }

  /** HR 結案 (interview_completed → completed) */
  hrClose(): void {
    const r = this.review();
    if (!r) return;

    this.saving.set(true);

    fetch(`/api/quarterly-reviews/${r.id}/hr-close`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hrComment: '' })
    })
      .then(res => res.json())
      .then(() => {
        this.saving.set(false);
        this.saved.emit();
        this.loadReview();
      })
      .catch(() => {
        this.saving.set(false);
        this.error.set('結案失敗');
      });
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getQuarterLabel(quarter: number): string {
    const labels: Record<number, string> = {
      1: 'Q1 (1-3月)',
      2: 'Q2 (4-6月)',
      3: 'Q3 (7-9月)',
      4: 'Q4 (10-12月)'
    };
    return labels[quarter] || `Q${quarter}`;
  }

  getQuarterMonths(quarter: number): number[] {
    switch (quarter) {
      case 1: return [1, 2, 3];
      case 2: return [4, 5, 6];
      case 3: return [7, 8, 9];
      case 4: return [10, 11, 12];
      default: return [1, 2, 3];
    }
  }

  getMonthLabel(month: number): string {
    return `${month}月`;
  }

  /** 計算直屬主管評價的平均分 (員工自評) */
  getSupervisorEvalSelfAvg(): number {
    const allItems = this.supervisorEvaluation().flatMap(c => c.items);
    const scored = allItems.filter(i => i.selfScore !== undefined && i.selfScore > 0);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((sum, i) => sum + (i.selfScore || 0), 0) / scored.length * 10) / 10;
  }

  /** 計算直屬主管評價的平均分 (主管評分) */
  getSupervisorEvalManagerAvg(): number {
    const allItems = this.supervisorEvaluation().flatMap(c => c.items);
    const scored = allItems.filter(i => i.managerScore !== undefined && i.managerScore > 0);
    if (scored.length === 0) return 0;
    return Math.round(scored.reduce((sum, i) => sum + (i.managerScore || 0), 0) / scored.length * 10) / 10;
  }

  /** 判斷滿意度調查是否已完成 */
  isSatisfactionSurveyComplete(): boolean {
    const questions = this.satisfactionQuestions();
    const answers = this.satisfactionAnswers();
    
    // 如果沒有題目，視為完成
    if (questions.length === 0) return true;
    
    // 檢查是否所有題目都已作答
    return questions.every(q => {
      const answer = answers.find(a => a.questionId === q.id);
      return answer && answer.score > 0;
    });
  }

  /** 判斷直屬主管評價是否已完成（員工自評部分） */
  isSupervisorEvalComplete(): boolean {
    const categories = this.supervisorEvaluation();
    if (categories.length === 0) return true;
    
    // 檢查所有項目是否都已填寫員工自評
    return categories.every(cat =>
      cat.items.every(item => item.selfScore !== undefined && item.selfScore > 0)
    );
  }
}
