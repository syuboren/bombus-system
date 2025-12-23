import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CompetencyService } from '../../services/competency.service';
import {
  CompetencyItem,
  CompetencyFramework,
  CompetencyStats,
  CompetencyType,
  CompetencyCategory,
  CompetencyLevel,
  CoreManagementCompetency,
  KSACompetencyItem,
  COMPETENCY_TYPE_OPTIONS,
  COMPETENCY_CATEGORY_OPTIONS,
  COMPETENCY_LEVEL_OPTIONS
} from '../../models/competency.model';

type ActiveTab = 'core' | 'management' | 'ksa';

@Component({
  selector: 'app-framework-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './framework-page.component.html',
  styleUrl: './framework-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FrameworkPageComponent implements OnInit {
  private competencyService = inject(CompetencyService);

  // Page Info
  readonly pageTitle = '職能基準庫';
  readonly breadcrumbs = ['首頁', '職能管理'];

  // Data signals
  stats = signal<CompetencyStats | null>(null);
  frameworks = signal<CompetencyFramework[]>([]);
  loading = signal(true);

  // 三類職能資料（完全獨立）
  coreCompetencies = signal<CoreManagementCompetency[]>([]);
  managementCompetencies = signal<CoreManagementCompetency[]>([]);
  ksaCompetencies = signal<KSACompetencyItem[]>([]);

  // 舊版 KSA 資料（供列表顯示）
  legacyCompetencies = signal<CompetencyItem[]>([]);

  // Tab 切換
  activeTab = signal<ActiveTab>('core');

  // 展開/收合狀態
  expandedCompetencies = signal<Set<string>>(new Set());
  expandedLevels = signal<Set<string>>(new Set());

  // KSA Filter signals
  selectedKsaType = signal<string>('');
  searchKeyword = signal<string>('');

  // View mode for KSA
  viewMode = signal<'card' | 'list'>('card');

  // Modal state
  showDetailModal = signal(false);
  selectedCompetency = signal<CompetencyItem | null>(null);

  // Options
  readonly typeOptions = COMPETENCY_TYPE_OPTIONS;
  readonly categoryOptions = COMPETENCY_CATEGORY_OPTIONS;
  readonly levelOptions = COMPETENCY_LEVEL_OPTIONS;

  // Level labels
  readonly levelLabels: Record<string, string> = {
    'L1': 'L1 - 基礎執行',
    'L2': 'L2 - 獨立作業',
    'L3': 'L3 - 帶領團隊',
    'L4': 'L4 - 策略規劃',
    'L5': 'L5 - 高階領導',
    'L6': 'L6 - 戰略引領'
  };

  // Filtered KSA competencies
  filteredKsaCompetencies = computed(() => {
    let result = this.legacyCompetencies();

    if (this.selectedKsaType()) {
      result = result.filter(c => c.type === this.selectedKsaType());
    }
    if (this.searchKeyword()) {
      const keyword = this.searchKeyword().toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(keyword) ||
        c.description.toLowerCase().includes(keyword) ||
        c.code.toLowerCase().includes(keyword)
      );
    }

    return result;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // Load stats
    this.competencyService.getCompetencyStats().subscribe(data => {
      this.stats.set(data);
    });

    // Load frameworks
    this.competencyService.getCompetencyFrameworks().subscribe(data => {
      this.frameworks.set(data);
    });

    // Load core competencies (L1-L6)
    this.competencyService.getCoreCompetenciesWithLevels().subscribe(data => {
      this.coreCompetencies.set(data);
    });

    // Load management competencies (L1-L6)
    this.competencyService.getManagementCompetenciesWithLevels().subscribe(data => {
      this.managementCompetencies.set(data);
    });

    // Load KSA competencies (no levels)
    this.competencyService.getKSACompetencies().subscribe(data => {
      this.ksaCompetencies.set(data);
    });

    // Load legacy KSA for card/list display
    this.competencyService.getCompetencies().subscribe(data => {
      this.legacyCompetencies.set(data);
      this.loading.set(false);
    });
  }

  // Tab methods
  setActiveTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
  }

  // Expand/collapse methods for competencies
  toggleCompetency(competencyId: string): void {
    const expanded = new Set(this.expandedCompetencies());
    if (expanded.has(competencyId)) {
      expanded.delete(competencyId);
    } else {
      expanded.add(competencyId);
    }
    this.expandedCompetencies.set(expanded);
  }

  isCompetencyExpanded(competencyId: string): boolean {
    return this.expandedCompetencies().has(competencyId);
  }

  // Expand/collapse methods for levels
  toggleLevel(levelKey: string): void {
    const expanded = new Set(this.expandedLevels());
    if (expanded.has(levelKey)) {
      expanded.delete(levelKey);
    } else {
      expanded.add(levelKey);
    }
    this.expandedLevels.set(expanded);
  }

  isLevelExpanded(levelKey: string): boolean {
    return this.expandedLevels().has(levelKey);
  }

  // Set expanded levels up to selected level (inclusive)
  // If clicking a lower level, will collapse higher levels
  expandUpToLevel(competencyId: string, targetLevel: string): void {
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
    const targetIndex = levels.indexOf(targetLevel);
    const currentExpanded = this.expandedLevels();
    const expanded = new Set(currentExpanded);

    // Find current max expanded level for this competency
    let currentMaxIndex = -1;
    for (let i = levels.length - 1; i >= 0; i--) {
      if (currentExpanded.has(`${competencyId}-${levels[i]}`)) {
        currentMaxIndex = i;
        break;
  }
    }

    // Clear all levels for this competency first
    for (const level of levels) {
      expanded.delete(`${competencyId}-${level}`);
    }

    // Determine action based on target vs current max
    if (currentMaxIndex === -1) {
      // Nothing expanded, expand up to target
      for (let i = 0; i <= targetIndex; i++) {
        expanded.add(`${competencyId}-${levels[i]}`);
      }
    } else if (targetIndex === currentMaxIndex) {
      // Clicking same level, toggle off (collapse all) - already cleared above
    } else {
      // Different level, set to target level
      for (let i = 0; i <= targetIndex; i++) {
        expanded.add(`${competencyId}-${levels[i]}`);
      }
    }

    this.expandedLevels.set(expanded);
  }

  // Get cumulative indicators up to a level
  getCumulativeIndicators(competency: CoreManagementCompetency, targetLevel: string): { level: string; indicators: string[] }[] {
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];
    const targetIndex = levels.indexOf(targetLevel);
    const result: { level: string; indicators: string[] }[] = [];

    for (const levelData of competency.levels) {
      const levelIndex = levels.indexOf(levelData.level);
      if (levelIndex <= targetIndex) {
        result.push({
          level: levelData.level,
          indicators: levelData.indicators
        });
      }
    }

    return result;
  }

  // Filter methods for KSA
  onKsaTypeChange(value: string): void {
    this.selectedKsaType.set(value);
  }

  onSearchChange(value: string): void {
    this.searchKeyword.set(value);
  }

  clearFilters(): void {
    this.selectedKsaType.set('');
    this.searchKeyword.set('');
  }

  // View mode toggle
  setViewMode(mode: 'card' | 'list'): void {
    this.viewMode.set(mode);
  }

  // Modal methods
  openDetailModal(competency: CompetencyItem): void {
    this.selectedCompetency.set(competency);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedCompetency.set(null);
  }

  // Helper methods
  getTypeLabel(type: CompetencyType): string {
    const typeMap: Record<CompetencyType, string> = {
      knowledge: 'K',
      skill: 'S',
      attitude: 'A'
    };
    return typeMap[type];
  }

  getTypeName(type: CompetencyType): string {
    const typeMap: Record<CompetencyType, string> = {
      knowledge: '知識',
      skill: '技能',
      attitude: '態度'
    };
    return typeMap[type];
  }

  getTypeClass(type: CompetencyType): string {
    return `type-${type}`;
  }

  getCategoryName(category: CompetencyCategory): string {
    const categoryMap: Record<CompetencyCategory, string> = {
      core: '核心職能',
      management: '管理職能',
      ksa: 'KSA職能'
    };
    return categoryMap[category];
  }

  getLevelName(level: CompetencyLevel): string {
    const levelMap: Record<CompetencyLevel, string> = {
      basic: '初階',
      intermediate: '中階',
      advanced: '進階',
      expert: '專家'
    };
    return levelMap[level];
  }

  getLevelClass(level: CompetencyLevel): string {
    return `level-${level}`;
  }

  getCategoryIcon(category: CompetencyCategory): string {
    const iconMap: Record<CompetencyCategory, string> = {
      core: 'ri-heart-pulse-line',
      management: 'ri-team-line',
      ksa: 'ri-book-3-line'
    };
    return iconMap[category];
  }

  getFrameworkColor(category: CompetencyCategory): string {
    const colorMap: Record<CompetencyCategory, string> = {
      core: '#D6A28C',      // L2 陶土橙
      management: '#9A8C98',   // L4 錦葵紫
      ksa: '#8DA399'           // L1 鼠尾草綠
    };
    return colorMap[category];
  }

  getLevelColor(level: string): string {
    const colorMap: Record<string, string> = {
      'L1': '#8DA399',   // 鼠尾草綠
      'L2': '#D6A28C',   // 陶土橙
      'L3': '#4A7C6F',   // 深綠
      'L4': '#9A8C98',   // 錦葵紫
      'L5': '#2D5A4A',   // 墨綠
      'L6': '#5D4E6D'    // 深紫
    };
    return colorMap[level] || '#6B7280';
  }
}
