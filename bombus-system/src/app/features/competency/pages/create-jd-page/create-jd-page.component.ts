import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CompetencyService } from '../../services/competency.service';
import {
  CoreManagementCompetency,
  KSACompetencyItem,
  CompetencyType,
  CompetencyGradeLevel,
  JobDescription,
  ChecklistItem,
  COMPETENCY_TYPE_OPTIONS,
  COMPETENCY_GRADE_LEVEL_OPTIONS
} from '../../models/competency.model';

type CreateMode = 'manual' | 'template' | 'ai';
type Step = 'mode' | 'basic' | 'competency' | 'content' | 'review';

// 內容區塊介面
interface JDContentBlocks {
  responsibilities: string[];
  jobPurpose: string[];
  qualifications: string[];
  vfp: string[];
  workDescription: string[];
  checklist: ChecklistItem[];
  jobDuties: string[];
  dailyTasks: string[];
  weeklyTasks: string[];
  monthlyTasks: string[];
}

interface CompetencySelection {
  competencyId: string;
  competencyName: string;
  type: 'core' | 'management' | 'professional' | 'ksa';
  level?: CompetencyGradeLevel;
  ksaType?: CompetencyType;
  weight: number;
}

@Component({
  selector: 'app-create-jd-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './create-jd-page.component.html',
  styleUrl: './create-jd-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateJDPageComponent implements OnInit {
  private competencyService = inject(CompetencyService);
  router = inject(Router);
  private route = inject(ActivatedRoute);

  // Mode and Step
  isEditMode = signal(false); // For page mode (Edit vs Create)
  editingId = signal<string | null>(null);
  currentVersion = signal('1.0'); // Track current version for edit mode

  // Page Info
  pageTitle = computed(() => this.isEditMode() ? '編輯職務說明書' : '新增職務說明書');
  readonly breadcrumbs = ['首頁', '職能管理', '職務說明書管理'];

  currentMode = signal<CreateMode>('manual');
  currentStep = signal<Step>('mode');
  isGenerating = signal(false);
  generatedJD = signal<Partial<JobDescription> | null>(null);
  isEditing = signal(false); // For review step

  // AI 生成動畫狀態
  aiGenerationProgress = signal(0);
  aiGenerationMessage = signal('');

  // 職能模型基準資料
  coreCompetencies = signal<CoreManagementCompetency[]>([]);
  managementCompetencies = signal<CoreManagementCompetency[]>([]);
  professionalCompetencies = signal<CoreManagementCompetency[]>([]);
  ksaCompetencies = signal<KSACompetencyItem[]>([]);

  // 基本資料選項（介接資料庫）
  departments = signal<{ id: string; name: string; code: string; sort_order?: number }[]>([]);
  gradeLevels = signal<any[]>([]);
  positions = signal<any[]>([]);

  // 基本資訊
  basicInfo = signal({
    positionCode: '',
    positionName: '',
    department: '',
    grade: 0 as number,
    gradeCode: '',
    positionTitle: ''
  });

  // 用於 ngModel 的 getter/setter
  get positionCode() { return this.basicInfo().positionCode; }
  set positionCode(value: string) {
    this.basicInfo.update(info => ({ ...info, positionCode: value }));
  }

  get positionName() { return this.basicInfo().positionName; }
  set positionName(value: string) {
    this.basicInfo.update(info => ({ ...info, positionName: value }));
  }

  get department() { return this.basicInfo().department; }
  set department(value: string) {
    this.basicInfo.update(info => ({ ...info, department: value, positionTitle: '', positionName: info.positionName || '' }));
    this.loadPositions();
    if (this.basicInfo().grade) this.generateCodeIfReady();
  }

  get grade() { return this.basicInfo().grade; }
  set grade(value: number) {
    this.basicInfo.update(info => ({ ...info, grade: value }));
    this.loadPositions();
    this.generateCodeIfReady();
  }

  get gradeLevel() { return this.basicInfo().grade > 0 ? String(this.basicInfo().grade) : ''; }
  set gradeLevel(value: string) {
    const num = value ? parseInt(value, 10) : 0;
    this.grade = num;
  }

  get positionTitle() { return this.basicInfo().positionTitle; }
  set positionTitle(value: string) {
    this.basicInfo.update(info => ({ ...info, positionTitle: value, positionName: value || info.positionName }));
  }

  // 職能選擇
  selectedCompetencies = signal<Map<string, CompetencySelection>>(new Map());
  ksaTypeFilter = signal<string>('');

  // AI 輸入
  aiInputText = signal('');

  // 模板選擇
  selectedTemplate = signal<string>('');
  availableTemplates = signal<{ id: string; positionCode: string; positionName: string; department: string; grade: number }[]>([]);
  isLoadingTemplate = signal(false);

  // 12區塊內容（步驟4編輯用）
  jdContent = signal<JDContentBlocks>({
    responsibilities: [''],
    jobPurpose: [''],
    qualifications: [''],
    vfp: [''],
    workDescription: [''],
    checklist: [{ item: '', points: 0 }],
    jobDuties: [''],
    dailyTasks: [''],
    weeklyTasks: [''],
    monthlyTasks: ['']
  });

  // 用於模板中的 Array.from
  readonly Array = Array;

  // Options
  readonly levelOptions = COMPETENCY_GRADE_LEVEL_OPTIONS;
  readonly typeOptions = COMPETENCY_TYPE_OPTIONS;

  // 過濾後的 KSA 職能
  filteredKSACompetencies = computed(() => {
    let items = this.ksaCompetencies();
    const filter = this.ksaTypeFilter();
    if (filter) {
      items = items.filter(item => item.ksaType === filter);
    }
    return items;
  });

  // 總權重
  totalWeight = computed(() => {
    let total = 0;
    this.selectedCompetencies().forEach(comp => {
      total += comp.weight;
    });
    return total;
  });

  ngOnInit(): void {
    // Check for Edit ID
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.initEditMode(id);
    }

    this.loadCompetencies();
    this.loadDepartments();
    this.loadGradeLevels();
    this.loadTemplates();
  }

  initEditMode(id: string): void {
    this.isEditMode.set(true);
    this.editingId.set(id);
    this.currentMode.set('manual');
    this.isLoadingTemplate.set(true);

    this.competencyService.getJobDescriptionById(id).subscribe({
      next: (jd) => {
        if (jd) {
          this.applyTemplate(jd, true); // true for Edit Mode
          this.currentStep.set('basic');
        }
        this.isLoadingTemplate.set(false);
      },
      error: () => this.isLoadingTemplate.set(false)
    });
  }

  loadCompetencies(): void {
    this.competencyService.getCoreCompetenciesWithLevels().subscribe(data => {
      this.coreCompetencies.set(data);
    });
    this.competencyService.getManagementCompetenciesWithLevels().subscribe(data => {
      this.managementCompetencies.set(data);
    });
    this.competencyService.getProfessionalCompetenciesWithLevels().subscribe(data => {
      this.professionalCompetencies.set(data);
    });
    this.competencyService.getKSACompetencies().subscribe(data => {
      this.ksaCompetencies.set(data);
    });
  }

  loadDepartments(): void {
    this.competencyService.getDepartments().subscribe(data => {
      this.departments.set(data);
    });
  }

  loadGradeLevels(): void {
    this.competencyService.getGradeLevelsForJD().subscribe((data: any[]) => {
      this.gradeLevels.set(data);
    });
  }

  loadPositions(): void {
    const info = this.basicInfo();
    if (!info.department) {
      this.positions.set([]);
      return;
    }
    this.competencyService.getPositions(info.department, info.grade || undefined).subscribe(data => {
      this.positions.set(data);
    });
  }

  // 載入可用模版（從現有職務說明書）
  loadTemplates(): void {
    // 載入所有職務說明書作為模版選項（不限狀態）
    this.competencyService.getJobDescriptions().subscribe(data => {
      const templates = data.map(jd => ({
        id: jd.id || '',
        positionCode: jd.positionCode || '',
        positionName: jd.positionName || '',
        department: jd.department || '',
        grade: typeof jd.gradeLevel === 'string' ? parseInt(jd.gradeLevel, 10) || 0 : 0
      }));
      this.availableTemplates.set(templates);
    });
  }

  generateCodeIfReady(): void {
    const info = this.basicInfo();
    const dept = this.departments().find(d => d.name === info.department);
    if (!dept?.code || !info.grade) return;
    this.competencyService.generateJDCode(dept.code, info.grade).subscribe(code => {
      if (code) {
        this.basicInfo.update(i => ({ ...i, positionCode: code }));
      }
    });
  }

  // Mode selection
  selectMode(mode: CreateMode): void {
    this.currentMode.set(mode);
    this.currentStep.set('basic');
  }

  // Step navigation
  nextStep(): void {
    const steps: Step[] = ['mode', 'basic', 'competency', 'content', 'review'];
    const currentIndex = steps.indexOf(this.currentStep());
    if (currentIndex < steps.length - 1) {
      this.currentStep.set(steps[currentIndex + 1]);
    }
  }

  prevStep(): void {
    const steps: Step[] = ['mode', 'basic', 'competency', 'content', 'review'];
    const currentIndex = steps.indexOf(this.currentStep());
    if (currentIndex > 0) {
      this.currentStep.set(steps[currentIndex - 1]);
    }
  }

  goToStep(step: Step): void {
    this.currentStep.set(step);
  }

  // Competency selection
  toggleCoreCompetency(competency: CoreManagementCompetency, level: CompetencyGradeLevel | null): void {
    const selected = new Map(this.selectedCompetencies());
    const key = `core-${competency.id}`;

    if (level === null) {
      selected.delete(key);
    } else {
      const existing = selected.get(key);
      selected.set(key, {
        competencyId: competency.id,
        competencyName: competency.name,
        type: 'core',
        level: level,
        weight: existing?.weight || 10
      });
    }
    this.selectedCompetencies.set(selected);
  }

  toggleManagementCompetency(competency: CoreManagementCompetency, level: CompetencyGradeLevel | null): void {
    const selected = new Map(this.selectedCompetencies());
    const key = `management-${competency.id}`;

    if (level === null) {
      selected.delete(key);
    } else {
      const existing = selected.get(key);
      selected.set(key, {
        competencyId: competency.id,
        competencyName: competency.name,
        type: 'management',
        level: level,
        weight: existing?.weight || 10
      });
    }
    this.selectedCompetencies.set(selected);
  }

  toggleProfessionalCompetency(competency: CoreManagementCompetency, level: CompetencyGradeLevel | null): void {
    const selected = new Map(this.selectedCompetencies());
    const key = `professional-${competency.id}`;

    if (level === null) {
      selected.delete(key);
    } else {
      const existing = selected.get(key);
      selected.set(key, {
        competencyId: competency.id,
        competencyName: competency.name,
        type: 'professional',
        level: level,
        weight: existing?.weight || 10
      });
    }
    this.selectedCompetencies.set(selected);
  }

  toggleKSACompetency(competency: KSACompetencyItem): void {
    const selected = new Map(this.selectedCompetencies());
    // competency.id 已包含 ksa- 前綴（如 ksa-a-01），直接使用
    const key = competency.id;

    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.set(key, {
        competencyId: competency.id,
        competencyName: competency.name,
        type: 'ksa',
        ksaType: competency.ksaType,
        weight: 5
      });
    }
    this.selectedCompetencies.set(selected);
  }

  updateWeight(key: string, weight: number): void {
    const selected = new Map(this.selectedCompetencies());
    const comp = selected.get(key);
    if (comp) {
      comp.weight = Math.max(0, Math.min(100, weight));
      selected.set(key, comp);
      this.selectedCompetencies.set(selected);
    }
  }

  isCoreSelected(competencyId: string): boolean {
    return this.selectedCompetencies().has(`core-${competencyId}`);
  }

  getCoreLevel(competencyId: string): CompetencyGradeLevel | null {
    return this.selectedCompetencies().get(`core-${competencyId}`)?.level || null;
  }

  isManagementSelected(competencyId: string): boolean {
    return this.selectedCompetencies().has(`management-${competencyId}`);
  }

  getManagementLevel(competencyId: string): CompetencyGradeLevel | null {
    return this.selectedCompetencies().get(`management-${competencyId}`)?.level || null;
  }

  isProfessionalSelected(competencyId: string): boolean {
    return this.selectedCompetencies().has(`professional-${competencyId}`);
  }

  getProfessionalLevel(competencyId: string): CompetencyGradeLevel | null {
    return this.selectedCompetencies().get(`professional-${competencyId}`)?.level || null;
  }

  isKSASelected(competencyId: string): boolean {
    // competencyId 已包含 ksa- 前綴（如 ksa-a-01），直接使用
    return this.selectedCompetencies().has(competencyId);
  }

  getWeight(key: string): number {
    return this.selectedCompetencies().get(key)?.weight || 0;
  }

  // AI Generation
  generateWithAI(): void {
    if (!this.aiInputText()) return;
    this.isGenerating.set(true);
    this.aiGenerationProgress.set(0);
    this.aiGenerationMessage.set('正在分析職位需求...');

    // 模擬 AI 生成進度
    const messages = [
      { progress: 15, message: '正在分析職位需求...' },
      { progress: 30, message: '解析職能要求...' },
      { progress: 50, message: '生成職務說明內容...' },
      { progress: 70, message: '匹配職能模型基準...' },
      { progress: 85, message: '優化結構化內容...' },
      { progress: 100, message: '生成完成！' }
    ];

    let step = 0;
    const interval = setInterval(() => {
      if (step < messages.length) {
        this.aiGenerationProgress.set(messages[step].progress);
        this.aiGenerationMessage.set(messages[step].message);
        step++;
      } else {
        clearInterval(interval);

        // 設定生成的基本資訊
        this.basicInfo.set({
          positionCode: 'HR-4-XXX',
          positionName: 'AI 生成的職位',
          department: '人資部',
          grade: 5,
          gradeCode: '',
          positionTitle: ''
        });

        setTimeout(() => {
          this.isGenerating.set(false);
          this.currentStep.set('competency');
        }, 500);
      }
    }, 600);
  }

  // Template import - 載入並套用模版資料
  importTemplate(templateId: string): void {
    if (!templateId) return;
    this.selectedTemplate.set(templateId);
    this.isLoadingTemplate.set(true);

    // 從 API 載入完整職務說明書資料
    this.competencyService.getJobDescriptionById(templateId).subscribe({
      next: (jd) => {
        if (jd) {
          this.applyTemplate(jd);
        }
        this.isLoadingTemplate.set(false);
      },
      error: () => {
        this.isLoadingTemplate.set(false);
      }
    });
  }

  // 套用模版資料到各 Signal
  private applyTemplate(jd: JobDescription, isEdit: boolean = false): void {
    // 防禦性檢查
    if (!jd) {
      console.warn('applyTemplate: jd is undefined');
      return;
    }

    // 0. 保存版本資訊 (僅在編輯模式)
    if (isEdit) {
      this.currentVersion.set(jd.version || '1.0');
    } else {
      this.currentVersion.set('1.0');
    }

    // 1. 套用基本資訊
    this.basicInfo.set({
      positionCode: isEdit ? (jd.positionCode || '') : '', // 編輯模式保留代碼，模板模式清空
      positionName: jd.positionName || '',
      department: jd.department || '',
      grade: typeof jd.gradeLevel === 'string' ? parseInt(jd.gradeLevel, 10) || 0 : 0,
      gradeCode: jd.gradeCode || '',
      positionTitle: jd.positionTitle || ''
    });

    // 載入該部門的職位選項
    this.loadPositions();

    // 2. 套用職能需求（從模版的職能需求設定）
    const newSelections = new Map<string, CompetencySelection>();

    // 核心職能
    if (jd.coreCompetencyRequirements) {
      jd.coreCompetencyRequirements.forEach((req: any) => {
        const key = `core-${req.competencyId}`;
        newSelections.set(key, {
          competencyId: req.competencyId,
          competencyName: req.competencyName,
          type: 'core',
          level: req.requiredLevel || 'L1',
          weight: req.weight || 10
        });
      });
    }

    // 管理職能
    if (jd.managementCompetencyRequirements) {
      jd.managementCompetencyRequirements.forEach((req: any) => {
        const key = `management-${req.competencyId}`;
        newSelections.set(key, {
          competencyId: req.competencyId,
          competencyName: req.competencyName,
          type: 'management',
          level: req.requiredLevel || 'L1',
          weight: req.weight || 10
        });
      });
    }

    // 專業職能
    if (jd.professionalCompetencyRequirements) {
      jd.professionalCompetencyRequirements.forEach((req: any) => {
        const key = `professional-${req.competencyId}`;
        newSelections.set(key, {
          competencyId: req.competencyId,
          competencyName: req.competencyName,
          type: 'professional',
          level: req.requiredLevel || 'L1',
          weight: req.weight || 10
        });
      });
    }

    // KSA 職能
    if (jd.ksaCompetencyRequirements) {
      jd.ksaCompetencyRequirements.forEach((req: any) => {
        // KSA competencyId 已包含 ksa- 前綴（如 ksa-a-01），直接使用
        const key = req.competencyId;
        newSelections.set(key, {
          competencyId: req.competencyId,
          competencyName: req.competencyName,
          type: 'ksa',
          ksaType: req.ksaType,
          weight: req.weight || 5
        });
      });
    }

    this.selectedCompetencies.set(newSelections);

    // 3. 套用 12 區塊內容
    this.jdContent.set({
      responsibilities: jd.responsibilities?.length ? jd.responsibilities : [''],
      jobPurpose: jd.jobPurpose?.length ? jd.jobPurpose : [''],
      qualifications: jd.qualifications?.length ? jd.qualifications : [''],
      vfp: jd.vfp?.length ? jd.vfp : [''],
      workDescription: jd.workDescription?.length ? jd.workDescription : [''],
      checklist: jd.checklist?.length ? jd.checklist : [{ item: '', points: 0 }],
      jobDuties: jd.jobDuties?.length ? jd.jobDuties : [''],
      dailyTasks: jd.dailyTasks?.length ? jd.dailyTasks : [''],
      weeklyTasks: jd.weeklyTasks?.length ? jd.weeklyTasks : [''],
      monthlyTasks: jd.monthlyTasks?.length ? jd.monthlyTasks : ['']
    });

    // 重新生成職位代碼 (僅在非編輯模式或代碼為空時)
    if (!isEdit || !this.basicInfo().positionCode) {
      this.generateCodeIfReady();
    }
  }

  saving = signal(false);

  // Save JD
  saveJD(): void {
    const jd = this.generatedJD();
    if (!jd) return;
    this.saving.set(true);

    if (this.isEditMode() && this.editingId()) {
      const id = this.editingId()!;
      // Ensure generatedJD has id
      const jdToUpdate = { ...jd, id };
      this.competencyService.updateJobDescription(id, jdToUpdate).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/competency/job-description']);
        },
        error: () => this.saving.set(false)
      });
    } else {
      this.competencyService.createJobDescription(jd).subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/competency/job-description']);
        },
        error: () => this.saving.set(false)
      });
    }
  }

  // 內容編輯方法
  updateContentItem(field: keyof JDContentBlocks, index: number, value: string): void {
    this.jdContent.update(content => {
      const newContent = { ...content };
      if (field !== 'checklist') {
        const arr = [...(newContent[field] as string[])];
        arr[index] = value;
        (newContent[field] as string[]) = arr;
      }
      return newContent;
    });
  }

  addContentItem(field: keyof JDContentBlocks): void {
    this.jdContent.update(content => {
      const newContent = { ...content };
      if (field !== 'checklist') {
        (newContent[field] as string[]) = [...(content[field] as string[]), ''];
      }
      return newContent;
    });
  }

  removeContentItem(field: keyof JDContentBlocks, index: number): void {
    this.jdContent.update(content => {
      const newContent = { ...content };
      if (field !== 'checklist') {
        (newContent[field] as string[]) = (content[field] as string[]).filter((_, i) => i !== index);
      }
      return newContent;
    });
  }

  updateChecklistItem(index: number, field: 'item' | 'points', value: string | number): void {
    this.jdContent.update(content => {
      const newChecklist = [...content.checklist];
      newChecklist[index] = { ...newChecklist[index], [field]: value };
      return { ...content, checklist: newChecklist };
    });
  }

  addChecklistItem(): void {
    this.jdContent.update(content => ({
      ...content,
      checklist: [...content.checklist, { item: '', points: 0 }]
    }));
  }

  removeChecklistItem(index: number): void {
    this.jdContent.update(content => ({
      ...content,
      checklist: content.checklist.filter((_, i) => i !== index)
    }));
  }

  // 進入步驟4時的處理
  goToContentStep(): void {
    this.currentStep.set('content');
  }

  // 從步驟4生成JD並進入步驟5
  generateFromContent(): void {
    this.isGenerating.set(true);

    setTimeout(() => {
      const basic = this.basicInfo();
      const competencies = Array.from(this.selectedCompetencies().values());
      const content = this.jdContent();

      const coreReqs = competencies.filter(c => c.type === 'core').map(c => ({
        competencyId: c.competencyId,
        competencyName: c.competencyName,
        type: 'core' as const,
        requiredLevel: c.level || 'L1',
        weight: c.weight
      }));
      const mgmtReqs = competencies.filter(c => c.type === 'management').map(c => ({
        competencyId: c.competencyId,
        competencyName: c.competencyName,
        type: 'management' as const,
        requiredLevel: c.level || 'L1',
        weight: c.weight
      }));
      const profReqs = competencies.filter(c => c.type === 'professional').map(c => ({
        competencyId: c.competencyId,
        competencyName: c.competencyName,
        type: 'professional' as const,
        requiredLevel: c.level || 'L1',
        weight: c.weight
      }));
      const ksaReqs = competencies.filter(c => c.type === 'ksa').map(c => ({
        competencyId: c.competencyId,
        competencyName: c.competencyName,
        ksaType: c.ksaType || 'skill',
        weight: c.weight
      }));

      const jd: Partial<JobDescription> = {
        positionCode: basic.positionCode,
        positionName: basic.positionName,
        department: basic.department,
        gradeLevel: basic.grade > 0 ? String(basic.grade) : '',
        grade: basic.grade || undefined,
        gradeCode: basic.gradeCode || undefined,
        positionTitle: basic.positionTitle || undefined,
        summary: `負責${basic.positionName}相關工作，確保達成組織目標`,
        responsibilities: content.responsibilities.filter(r => r.trim()),
        jobPurpose: content.jobPurpose.filter(p => p.trim()),
        qualifications: content.qualifications.filter(q => q.trim()),
        vfp: content.vfp.filter(v => v.trim()),
        competencyStandards: [],
        requiredCompetencies: competencies.map(c => ({
          competencyId: c.competencyId,
          competencyName: c.competencyName,
          type: c.ksaType || 'skill',
          requiredLevel: c.level ? parseInt(c.level.replace('L', ''), 10) : 3,
          weight: c.weight
        })),
        coreCompetencyRequirements: coreReqs,
        managementCompetencyRequirements: mgmtReqs,
        professionalCompetencyRequirements: profReqs,
        ksaCompetencyRequirements: ksaReqs,
        workDescription: content.workDescription.filter(w => w.trim()),
        checklist: content.checklist.filter(c => c.item.trim()),
        jobDuties: content.jobDuties.filter(d => d.trim()),
        dailyTasks: content.dailyTasks.filter(t => t.trim()),
        weeklyTasks: content.weeklyTasks.filter(t => t.trim()),
        monthlyTasks: content.monthlyTasks.filter(t => t.trim()),
        version: this.isEditMode() ? this.currentVersion() : '1.0',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'Current User'
      };

      this.generatedJD.set(jd);
      this.isGenerating.set(false);
      this.currentStep.set('review');
      this.isEditing.set(true);
    }, 2500);
  }

  // Helper methods
  getLevelLabel(level: CompetencyGradeLevel): string {
    const levelMap: Record<CompetencyGradeLevel, string> = {
      'L1': 'L1',
      'L2': 'L2',
      'L3': 'L3',
      'L4': 'L4',
      'L5': 'L5',
      'L6': 'L6'
    };
    return levelMap[level] || level;
  }

  getKSATypeLabel(type: CompetencyType): string {
    const typeMap: Record<CompetencyType, string> = {
      knowledge: '知識',
      skill: '技能',
      attitude: '態度'
    };
    return typeMap[type] || type;
  }

  getKSATypeClass(type: CompetencyType): string {
    return `type-${type}`;
  }

  onKsaTypeFilterChange(value: string): void {
    this.ksaTypeFilter.set(value);
  }
}

