import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  type: 'core' | 'management' | 'ksa';
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

  // Page Info
  readonly pageTitle = '新增職務說明書';
  readonly breadcrumbs = ['首頁', '職能管理', '職務說明書管理'];

  // Mode and Step
  currentMode = signal<CreateMode>('manual');
  currentStep = signal<Step>('mode');
  isGenerating = signal(false);
  generatedJD = signal<Partial<JobDescription> | null>(null);
  isEditing = signal(false);

  // AI 生成動畫狀態
  aiGenerationProgress = signal(0);
  aiGenerationMessage = signal('');

  // 職能基準庫資料
  coreCompetencies = signal<CoreManagementCompetency[]>([]);
  managementCompetencies = signal<CoreManagementCompetency[]>([]);
  ksaCompetencies = signal<KSACompetencyItem[]>([]);

  // 基本資訊
  basicInfo = signal({
    positionCode: '',
    positionName: '',
    department: '',
    gradeLevel: ''
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
    this.basicInfo.update(info => ({ ...info, department: value }));
  }

  get gradeLevel() { return this.basicInfo().gradeLevel; }
  set gradeLevel(value: string) {
    this.basicInfo.update(info => ({ ...info, gradeLevel: value }));
  }

  // 職能選擇
  selectedCompetencies = signal<Map<string, CompetencySelection>>(new Map());
  ksaTypeFilter = signal<string>('');

  // AI 輸入
  aiInputText = signal('');

  // 模板選擇
  selectedTemplate = signal<string>('');

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
  readonly departmentOptions = [
    { value: '研發部', label: '研發部' },
    { value: '業務部', label: '業務部' },
    { value: '行銷部', label: '行銷部' },
    { value: '人資部', label: '人資部' },
    { value: '財務部', label: '財務部' }
  ];

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
    this.loadCompetencies();
  }

  loadCompetencies(): void {
    this.competencyService.getCoreCompetenciesWithLevels().subscribe(data => {
      this.coreCompetencies.set(data);
    });

    this.competencyService.getManagementCompetenciesWithLevels().subscribe(data => {
      this.managementCompetencies.set(data);
    });

    this.competencyService.getKSACompetencies().subscribe(data => {
      this.ksaCompetencies.set(data);
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

  toggleKSACompetency(competency: KSACompetencyItem): void {
    const selected = new Map(this.selectedCompetencies());
    const key = `ksa-${competency.id}`;
    
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

  isKSASelected(competencyId: string): boolean {
    return this.selectedCompetencies().has(`ksa-${competencyId}`);
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
      { progress: 70, message: '匹配職能基準庫...' },
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
          gradeLevel: '中階'
        });
        
        setTimeout(() => {
          this.isGenerating.set(false);
          this.currentStep.set('competency');
        }, 500);
      }
    }, 600);
  }

  // Template import
  importTemplate(templateId: string): void {
    this.selectedTemplate.set(templateId);
    // 模擬載入模板
    setTimeout(() => {
      this.currentStep.set('competency');
    }, 500);
  }

  // Save JD
  saveJD(): void {
    // 儲存邏輯
    this.router.navigate(['/competency/job-description']);
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
      
      const jd: Partial<JobDescription> = {
        positionCode: basic.positionCode,
        positionName: basic.positionName,
        department: basic.department,
        gradeLevel: basic.gradeLevel,
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
          requiredLevel: c.level ? parseInt(c.level.replace('L', '')) : 3,
          weight: c.weight
        })),
        workDescription: content.workDescription.filter(w => w.trim()),
        checklist: content.checklist.filter(c => c.item.trim()),
        jobDuties: content.jobDuties.filter(d => d.trim()),
        dailyTasks: content.dailyTasks.filter(t => t.trim()),
        weeklyTasks: content.weeklyTasks.filter(t => t.trim()),
        monthlyTasks: content.monthlyTasks.filter(t => t.trim()),
        version: '1.0',
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
      'L1': 'L1 - 基礎執行',
      'L2': 'L2 - 獨立作業',
      'L3': 'L3 - 帶領團隊',
      'L4': 'L4 - 策略規劃',
      'L5': 'L5 - 高階領導',
      'L6': 'L6 - 戰略引領'
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

