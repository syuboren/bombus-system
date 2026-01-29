import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, interval, takeUntil, debounceTime, switchMap, catchError, of } from 'rxjs';
import { InterviewFormService } from '../../services/interview-form.service';
import {
  CandidateFormData,
  CandidateBasicInfo,
  WorkExperienceEntry,
  InterviewFormResponse,
  INTERVIEW_QUESTIONS,
  EDUCATION_LEVELS
} from '../../../employee/models/candidate.model';

/**
 * 候選人面試表單填寫頁面
 * 提供 5 步驟分頁表單，支援自動暫存與倒數計時
 */
@Component({
  selector: 'app-interview-form-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './interview-form-page.component.html',
  styleUrl: './interview-form-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InterviewFormPageComponent implements OnInit, OnDestroy {
  // Services
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private interviewFormService = inject(InterviewFormService);

  // Destroy subject for cleanup
  private destroy$ = new Subject<void>();
  private saveSubject = new Subject<void>();

  // Constants
  readonly educationLevels = EDUCATION_LEVELS;
  readonly questions = INTERVIEW_QUESTIONS;

  // State signals
  token = signal<string>('');
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  formInfo = signal<InterviewFormResponse | null>(null);
  
  // Form state
  currentStep = signal<number>(1);
  isFormStarted = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  lastSavedAt = signal<string | null>(null);
  
  // Timer state
  remainingSeconds = signal<number>(3600);
  isLocked = signal<boolean>(false);
  
  // Form data
  basicInfo = signal<CandidateBasicInfo>({
    fillDate: new Date().toISOString().split('T')[0],
    candidateName: '',
    applyDept: '',
    applyJob: '',
    contactInfo: '',
    birthDate: '',
    educationLevel: 'university',
    currentSalaryMonth: undefined,
    currentSalaryYear: undefined,
    expectedSalaryMonth: 0,
    expectedSalaryYear: 0,
    licenses: [],
    otherLicense: ''
  });
  
  workExperiences = signal<WorkExperienceEntry[]>([
    { companyName: '', jobTitle: '', yearsOfService: '' }
  ]);
  
  interviewAnswers = signal<Record<string, string>>({});

  // Computed values
  totalSteps = signal<number>(5);
  
  progressPercentage = computed(() => {
    return Math.round((this.currentStep() / this.totalSteps()) * 100);
  });

  formattedTime = computed(() => {
    const seconds = this.remainingSeconds();
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  });

  isTimeWarning = computed(() => {
    return this.remainingSeconds() <= 300; // 5 minutes warning
  });

  isTimeCritical = computed(() => {
    return this.remainingSeconds() <= 60; // 1 minute critical
  });

  // Step questions
  step2Questions = computed(() => this.questions.filter(q => q.category === 'GENERAL_IMPRESSION'));
  step3Questions = computed(() => this.questions.filter(q => 
    ['EXPERIENCE_POTENTIAL', 'RESIGNATION_ANALYSIS', 'WORK_ATTITUDE'].includes(q.category)
  ));
  step4Questions = computed(() => this.questions.filter(q => 
    ['INTERPERSONAL', 'CONFLICT_RESOLUTION'].includes(q.category)
  ));
  step5Questions = computed(() => this.questions.filter(q => 
    ['WORK_HABITS', 'CAREER_VISION'].includes(q.category)
  ));

  // Step titles
  stepTitles = [
    '基本資料 & 工作經歷',
    '應徵動機 & 一般印象',
    '工作經驗 & 態度',
    '人際互動 & 衝突解決',
    '職涯規劃與願景'
  ];

  constructor() {
    // Auto-save effect
    this.saveSubject.pipe(
      debounceTime(1000),
      switchMap(() => {
        if (this.isLocked() || !this.isFormStarted()) return of(null);
        this.isSaving.set(true);
        return this.interviewFormService.saveFormData(
          this.token(),
          this.collectFormData(),
          this.currentStep()
        ).pipe(
          catchError(err => {
            console.error('Auto-save error:', err);
            return of(null);
          })
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(result => {
      this.isSaving.set(false);
      if (result?.savedAt) {
        this.lastSavedAt.set(result.savedAt);
      }
    });
  }

  ngOnInit(): void {
    // Get token from route
    this.route.paramMap.subscribe(params => {
      const token = params.get('token');
      if (token) {
        this.token.set(token);
        this.loadForm();
      } else {
        this.error.set('無效的連結');
        this.loading.set(false);
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
  }

  /**
   * 載入表單資訊
   */
  loadForm(): void {
    this.loading.set(true);
    this.interviewFormService.getFormByToken(this.token()).subscribe({
      next: (response) => {
        this.formInfo.set(response);
        
        // Pre-fill basic info
        if (response.candidate) {
          const info = this.basicInfo();
          info.candidateName = response.candidate.name || '';
          info.contactInfo = response.candidate.phone || response.candidate.email || '';
          info.applyJob = response.interview.jobTitle || '';
          info.applyDept = response.interview.department || '';
          this.basicInfo.set({ ...info });
        }

        // Restore saved form data
        if (response.formData) {
          if (response.formData.basicInfo) {
            this.basicInfo.set(response.formData.basicInfo);
          }
          if (response.formData.workExperiences?.length) {
            this.workExperiences.set(response.formData.workExperiences);
          }
          if (response.formData.interviewQuestions) {
            this.interviewAnswers.set(response.formData.interviewQuestions);
          }
        }

        // Restore state
        this.currentStep.set(response.currentStep || 1);
        this.remainingSeconds.set(response.remainingSeconds);
        this.lastSavedAt.set(response.lastSavedAt || null);

        // Check if already started
        if (response.status === 'InProgress') {
          this.isFormStarted.set(true);
          this.startCountdown();
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Load form error:', err);
        this.error.set(err.error?.error || '載入表單失敗');
        this.loading.set(false);
      }
    });
  }

  /**
   * 開始填寫表單
   */
  startForm(): void {
    this.interviewFormService.startForm(this.token()).subscribe({
      next: (response) => {
        this.isFormStarted.set(true);
        this.remainingSeconds.set(response.remainingSeconds);
        this.startCountdown();
      },
      error: (err) => {
        console.error('Start form error:', err);
        this.error.set(err.error?.error || '無法開始填寫');
      }
    });
  }

  /**
   * 啟動倒數計時
   */
  private startCountdown(): void {
    interval(1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const remaining = this.remainingSeconds() - 1;
      if (remaining <= 0) {
        this.remainingSeconds.set(0);
        this.isLocked.set(true);
        this.saveFormData(); // Final save before lock
      } else {
        this.remainingSeconds.set(remaining);
      }
    });
  }

  /**
   * 切換步驟
   */
  goToStep(step: number): void {
    if (step < 1 || step > this.totalSteps()) return;
    if (this.isLocked()) return;
    
    this.saveSubject.next(); // Trigger auto-save
    this.currentStep.set(step);
  }

  /**
   * 下一步
   */
  nextStep(): void {
    if (this.currentStep() < this.totalSteps()) {
      this.goToStep(this.currentStep() + 1);
    }
  }

  /**
   * 上一步
   */
  prevStep(): void {
    if (this.currentStep() > 1) {
      this.goToStep(this.currentStep() - 1);
    }
  }

  /**
   * 新增工作經歷
   */
  addWorkExperience(): void {
    const experiences = this.workExperiences();
    this.workExperiences.set([
      ...experiences,
      { companyName: '', jobTitle: '', yearsOfService: '' }
    ]);
  }

  /**
   * 移除工作經歷
   */
  removeWorkExperience(index: number): void {
    const experiences = this.workExperiences();
    if (experiences.length > 1) {
      this.workExperiences.set(experiences.filter((_, i) => i !== index));
    }
  }

  /**
   * 更新基本資料
   */
  updateBasicInfo(field: keyof CandidateBasicInfo, value: any): void {
    const info = this.basicInfo();
    (info as any)[field] = value;
    this.basicInfo.set({ ...info });
    this.triggerAutoSave();
  }

  /**
   * 更新工作經歷
   */
  updateWorkExperience(index: number, field: keyof WorkExperienceEntry, value: string): void {
    const experiences = [...this.workExperiences()];
    experiences[index] = { ...experiences[index], [field]: value };
    this.workExperiences.set(experiences);
    this.triggerAutoSave();
  }

  /**
   * 更新駕照選項
   */
  toggleLicense(license: string): void {
    const info = this.basicInfo();
    const licenses = info.licenses || [];
    const index = licenses.indexOf(license);
    if (index === -1) {
      info.licenses = [...licenses, license];
    } else {
      info.licenses = licenses.filter(l => l !== license);
    }
    this.basicInfo.set({ ...info });
    this.triggerAutoSave();
  }

  /**
   * 更新問答
   */
  updateAnswer(code: string, value: string): void {
    const answers = this.interviewAnswers();
    this.interviewAnswers.set({ ...answers, [code]: value });
    this.triggerAutoSave();
  }

  /**
   * 觸發自動儲存
   */
  private triggerAutoSave(): void {
    if (this.isFormStarted() && !this.isLocked()) {
      this.saveSubject.next();
    }
  }

  /**
   * 手動儲存
   */
  saveFormData(): void {
    if (this.isLocked()) return;
    
    this.isSaving.set(true);
    this.interviewFormService.saveFormData(
      this.token(),
      this.collectFormData(),
      this.currentStep()
    ).subscribe({
      next: (response) => {
        this.isSaving.set(false);
        this.lastSavedAt.set(response.savedAt);
      },
      error: (err) => {
        console.error('Save error:', err);
        this.isSaving.set(false);
      }
    });
  }

  /**
   * 送出表單
   */
  submitForm(): void {
    if (this.isSubmitting()) return;

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting.set(true);
    this.interviewFormService.submitForm(this.token(), this.collectFormData()).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        // Show success message and redirect
        alert(response.message);
        this.router.navigate(['/public/interview-form-success']);
      },
      error: (err) => {
        console.error('Submit error:', err);
        this.isSubmitting.set(false);
        this.error.set(err.error?.error || '送出失敗，請稍後再試');
      }
    });
  }

  /**
   * 收集表單資料
   */
  private collectFormData(): CandidateFormData {
    return {
      basicInfo: this.basicInfo(),
      workExperiences: this.workExperiences(),
      interviewQuestions: this.interviewAnswers()
    };
  }

  /**
   * 驗證表單
   */
  private validateForm(): boolean {
    const info = this.basicInfo();
    
    // Basic validation
    if (!info.candidateName) {
      alert('請填寫應徵姓名');
      this.currentStep.set(1);
      return false;
    }
    
    if (!info.birthDate) {
      alert('請填寫出生日期');
      this.currentStep.set(1);
      return false;
    }

    if (!info.expectedSalaryMonth || !info.expectedSalaryYear) {
      alert('請填寫期望薪資');
      this.currentStep.set(1);
      return false;
    }

    // Check required questions
    const answers = this.interviewAnswers();
    const unanswered = this.questions.filter(q => q.required && !answers[q.code]);
    
    if (unanswered.length > 0) {
      alert(`尚有 ${unanswered.length} 題必填題目未填寫`);
      return false;
    }

    return true;
  }

  /**
   * 處理頁面離開
   */
  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isFormStarted() && !this.isLocked()) {
      this.saveSubject.next();
      event.preventDefault();
      event.returnValue = '您尚未完成表單，確定要離開嗎？';
    }
  }

  /**
   * 取得問題分類標題
   */
  getCategoryTitle(category: string): string {
    const titles: Record<string, string> = {
      'GENERAL_IMPRESSION': '一般印象',
      'EXPERIENCE_POTENTIAL': '經驗與潛能',
      'RESIGNATION_ANALYSIS': '離職分析與期望',
      'WORK_ATTITUDE': '工作態度',
      'INTERPERSONAL': '人際互動',
      'CONFLICT_RESOLUTION': '衝突解決',
      'WORK_HABITS': '協作、專業與挑戰',
      'CAREER_VISION': '職涯規劃與願景'
    };
    return titles[category] || category;
  }

  /**
   * 依分類分組問題
   */
  groupQuestionsByCategory(questions: typeof INTERVIEW_QUESTIONS): Map<string, typeof INTERVIEW_QUESTIONS> {
    const grouped = new Map<string, typeof INTERVIEW_QUESTIONS>();
    questions.forEach(q => {
      const existing = grouped.get(q.category) || [];
      grouped.set(q.category, [...existing, q]);
    });
    return grouped;
  }
}
