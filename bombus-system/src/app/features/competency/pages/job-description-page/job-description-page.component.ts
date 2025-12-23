import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CompetencyService } from '../../services/competency.service';
import { PdfExportService } from '../../services/pdf-export.service';
import {
  JobDescription,
  CompetencyRequirement,
  CoreManagementCompetency,
  KSACompetencyItem,
  CoreMgmtCompetencyRequirement,
  KSACompetencyRequirement,
  CompetencyType,
  CompetencyGradeLevel,
  COMPETENCY_TYPE_OPTIONS,
  COMPETENCY_GRADE_LEVEL_OPTIONS
} from '../../models/competency.model';

@Component({
  selector: 'app-job-description-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './job-description-page.component.html',
  styleUrl: './job-description-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobDescriptionPageComponent implements OnInit {
  private competencyService = inject(CompetencyService);
  private pdfExportService = inject(PdfExportService);
  router = inject(Router);

  // PDF Export state
  isExporting = signal(false);

  // Page Info
  readonly pageTitle = '職務說明書管理';
  readonly breadcrumbs = ['首頁', '職能管理'];

  // Data signals
  jobDescriptions = signal<JobDescription[]>([]);
  loading = signal(true);

  // 職能基準庫資料
  coreCompetencies = signal<CoreManagementCompetency[]>([]);
  managementCompetencies = signal<CoreManagementCompetency[]>([]);
  ksaCompetencies = signal<KSACompetencyItem[]>([]);

  // Filter
  searchKeyword = signal('');
  selectedDepartment = signal<string>('');
  selectedStatus = signal<string>('');

  // 職能需求選擇狀態（用於建立/編輯 JD）
  selectedCoreCompetencies = signal<Map<string, CompetencyGradeLevel>>(new Map());
  selectedManagementCompetencies = signal<Map<string, CompetencyGradeLevel>>(new Map());
  selectedKSACompetencies = signal<Set<string>>(new Set());
  ksaTypeFilter = signal<string>('');

  // Modal states
  showDetailModal = signal(false);
  showCreateModal = signal(false);
  showAIAssistantModal = signal(false);
  selectedJD = signal<JobDescription | null>(null);

  // AI Assistant state
  aiInputText = signal('');
  aiGenerating = signal(false);
  aiGeneratedContent = signal<{
    positionName: string;
    summary: string;
    responsibilities: string[];
    qualifications: string[];
    competencies: { name: string; type: string; level: number }[];
  } | null>(null);

  // View mode
  viewMode = signal<'card' | 'list'>('card');

  // Options
  readonly typeOptions = COMPETENCY_TYPE_OPTIONS;
  readonly levelOptions = COMPETENCY_GRADE_LEVEL_OPTIONS;
  readonly departmentOptions = [
    { value: '', label: '全部部門' },
    { value: '研發部', label: '研發部' },
    { value: '業務部', label: '業務部' },
    { value: '行銷部', label: '行銷部' },
    { value: '人資部', label: '人資部' },
    { value: '財務部', label: '財務部' }
  ];
  readonly statusOptions = [
    { value: '', label: '全部狀態' },
    { value: 'draft', label: '草稿' },
    { value: 'published', label: '已發布' },
    { value: 'archived', label: '已封存' }
  ];

  // Computed
  filteredJDs = computed(() => {
    let jds = this.jobDescriptions();

    if (this.searchKeyword()) {
      const keyword = this.searchKeyword().toLowerCase();
      jds = jds.filter(jd =>
        jd.positionName.toLowerCase().includes(keyword) ||
        jd.positionCode.toLowerCase().includes(keyword) ||
        jd.summary.toLowerCase().includes(keyword)
      );
    }

    if (this.selectedDepartment()) {
      jds = jds.filter(jd => jd.department === this.selectedDepartment());
    }

    if (this.selectedStatus()) {
      jds = jds.filter(jd => jd.status === this.selectedStatus());
    }

    return jds;
  });

  stats = computed(() => {
    const all = this.jobDescriptions();
    return {
      total: all.length,
      published: all.filter(j => j.status === 'published').length,
      draft: all.filter(j => j.status === 'draft').length,
      archived: all.filter(j => j.status === 'archived').length
    };
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    
    // Load job descriptions
    this.competencyService.getJobDescriptions().subscribe(data => {
      this.jobDescriptions.set(data);
    });

    // Load core competencies
    this.competencyService.getCoreCompetenciesWithLevels().subscribe(data => {
      this.coreCompetencies.set(data);
    });

    // Load management competencies
    this.competencyService.getManagementCompetenciesWithLevels().subscribe(data => {
      this.managementCompetencies.set(data);
    });

    // Load KSA competencies
    this.competencyService.getKSACompetencies().subscribe(data => {
      this.ksaCompetencies.set(data);
      this.loading.set(false);
    });
  }

  // Filter handlers
  onSearchChange(value: string): void {
    this.searchKeyword.set(value);
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartment.set(value);
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value);
  }

  setViewMode(mode: 'card' | 'list'): void {
    this.viewMode.set(mode);
  }

  // Detail Modal
  openDetailModal(jd: JobDescription): void {
    this.selectedJD.set(jd);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedJD.set(null);
  }

  // Create Modal
  openCreateModal(): void {
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  // AI Assistant Modal
  openAIAssistant(): void {
    this.showAIAssistantModal.set(true);
    this.aiInputText.set('');
    this.aiGeneratedContent.set(null);
  }

  closeAIAssistantModal(): void {
    this.showAIAssistantModal.set(false);
  }

  generateWithAI(): void {
    if (!this.aiInputText()) return;

    this.aiGenerating.set(true);

    // Simulate AI generation
    setTimeout(() => {
      this.aiGeneratedContent.set({
        positionName: '產品經理',
        summary: '負責產品規劃、開發流程管理與市場策略制定，推動產品持續成長',
        responsibilities: [
          '進行市場調研與競品分析，制定產品策略',
          '撰寫產品需求文件（PRD）與使用者故事',
          '與研發、設計團隊協作，推動產品開發',
          '追蹤產品指標，持續優化產品體驗',
          '與業務、行銷團隊協作進行產品推廣'
        ],
        qualifications: [
          '3年以上產品管理經驗',
          '熟悉敏捷開發流程',
          '優秀的跨部門溝通協調能力',
          '具備數據分析能力',
          '相關產業經驗優先'
        ],
        competencies: [
          { name: '產品規劃', type: '技能', level: 4 },
          { name: '使用者研究', type: '技能', level: 3 },
          { name: '數據分析', type: '技能', level: 3 },
          { name: '專案管理', type: '技能', level: 4 },
          { name: '溝通表達', type: '技能', level: 4 },
          { name: '創新思維', type: '態度', level: 4 }
        ]
      });
      this.aiGenerating.set(false);
    }, 2000);
  }

  applyAIContent(): void {
    // Apply AI generated content to create form
    this.closeAIAssistantModal();
    this.openCreateModal();
  }

  // Helper methods
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: '草稿',
      published: '已發布',
      archived: '已封存'
    };
    return map[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  getCompetencyTypeLabel(type: string): string {
    const map: Record<string, string> = {
      knowledge: '知識',
      skill: '技能',
      attitude: '態度'
    };
    return map[type] || type;
  }

  getCompetencyTypeClass(type: string): string {
    return `type-${type}`;
  }

  getLevelStars(level: number): string {
    return '★'.repeat(level) + '☆'.repeat(5 - level);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW');
  }

  // PDF 匯出方法
  async exportToPdf(): Promise<void> {
    const jd = this.selectedJD();
    if (!jd) return;

    this.isExporting.set(true);
    try {
      await this.pdfExportService.exportJobDescription(jd);
    } catch (error) {
      console.error('PDF 匯出失敗:', error);
    } finally {
      this.isExporting.set(false);
    }
  }

  getTotalWeight(competencies: CompetencyRequirement[]): number {
    return competencies.reduce((sum, c) => sum + c.weight, 0);
  }

  // 計算所有職能需求的總權重 (核心 + 管理 + KSA)
  getAllCompetenciesTotalWeight(jd: JobDescription): number {
    let total = 0;
    
    // 核心職能權重
    if (jd.coreCompetencyRequirements) {
      total += jd.coreCompetencyRequirements.reduce((sum, c) => sum + c.weight, 0);
    }
    
    // 管理職能權重
    if (jd.managementCompetencyRequirements) {
      total += jd.managementCompetencyRequirements.reduce((sum, c) => sum + c.weight, 0);
    }
    
    // KSA 職能權重
    if (jd.ksaCompetencyRequirements) {
      total += jd.ksaCompetencyRequirements.reduce((sum, c) => sum + c.weight, 0);
    }
    
    return total;
  }

  // 職能需求選擇方法
  toggleCoreCompetency(competencyId: string, level: CompetencyGradeLevel | null): void {
    const selected = new Map(this.selectedCoreCompetencies());
    if (level === null) {
      selected.delete(competencyId);
    } else {
      selected.set(competencyId, level);
    }
    this.selectedCoreCompetencies.set(selected);
  }

  toggleManagementCompetency(competencyId: string, level: CompetencyGradeLevel | null): void {
    const selected = new Map(this.selectedManagementCompetencies());
    if (level === null) {
      selected.delete(competencyId);
    } else {
      selected.set(competencyId, level);
    }
    this.selectedManagementCompetencies.set(selected);
  }

  toggleKSACompetency(competencyId: string): void {
    const selected = new Set(this.selectedKSACompetencies());
    if (selected.has(competencyId)) {
      selected.delete(competencyId);
    } else {
      selected.add(competencyId);
    }
    this.selectedKSACompetencies.set(selected);
  }

  isCoreCompetencySelected(competencyId: string): boolean {
    return this.selectedCoreCompetencies().has(competencyId);
  }

  getCoreCompetencyLevel(competencyId: string): CompetencyGradeLevel | null {
    return this.selectedCoreCompetencies().get(competencyId) || null;
  }

  isManagementCompetencySelected(competencyId: string): boolean {
    return this.selectedManagementCompetencies().has(competencyId);
  }

  getManagementCompetencyLevel(competencyId: string): CompetencyGradeLevel | null {
    return this.selectedManagementCompetencies().get(competencyId) || null;
  }

  isKSACompetencySelected(competencyId: string): boolean {
    return this.selectedKSACompetencies().has(competencyId);
  }

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

  getKSACompetencyTypeLabel(type: CompetencyType): string {
    const typeMap: Record<CompetencyType, string> = {
      knowledge: '知識',
      skill: '技能',
      attitude: '態度'
    };
    return typeMap[type] || type;
  }

  getKSACompetencyTypeClass(type: CompetencyType): string {
    return `type-${type}`;
  }

  onKsaTypeChange(value: string): void {
    this.ksaTypeFilter.set(value);
  }

  // 過濾 KSA 職能
  filteredKSACompetencies = computed(() => {
    let items = this.ksaCompetencies();
    const filter = this.ksaTypeFilter();
    if (filter) {
      items = items.filter(item => item.ksaType === filter);
    }
    return items;
  });
}

