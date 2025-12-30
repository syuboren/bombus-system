import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CultureService } from '../../services/culture.service';
import { Award, ApplicationChecklist, ChecklistItem } from '../../models/culture.model';

@Component({
  standalone: true,
  selector: 'app-ai-assistant-page',
  templateUrl: './ai-assistant-page.component.html',
  styleUrl: './ai-assistant-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiAssistantPageComponent implements OnInit {
  private cultureService = inject(CultureService);

  // State
  loading = signal(true);
  awards = signal<Award[]>([]);
  selectedAward = signal<Award | null>(null);
  checklist = signal<ApplicationChecklist | null>(null);

  // AI Features
  showAIGenerator = signal(false);
  generatingContent = signal(false);
  generatedContent = signal<string>('');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.cultureService.getAwards().subscribe(data => {
      const applyingAwards = data.filter(a => a.status === 'upcoming' || a.status === 'applying');
      this.awards.set(applyingAwards);

      if (applyingAwards.length > 0) {
        this.selectAward(applyingAwards[0]);
      }

      this.loading.set(false);
    });
  }

  selectAward(award: Award): void {
    this.selectedAward.set(award);
    this.loadChecklist(award.id);
  }

  loadChecklist(awardId: string): void {
    this.cultureService.getApplicationChecklist(awardId).subscribe(data => {
      this.checklist.set(data);
    });
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'pending': 'ri-checkbox-blank-circle-line',
      'in-progress': 'ri-loader-4-line',
      'completed': 'ri-checkbox-circle-fill',
      'not-applicable': 'ri-forbid-line'
    };
    return icons[status] || 'ri-checkbox-blank-circle-line';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'pending': '待處理',
      'in-progress': '進行中',
      'completed': '已完成',
      'not-applicable': '不適用'
    };
    return labels[status] || status;
  }

  getSourceModuleLabel(module: string): string {
    const labels: Record<string, string> = {
      'L1': '組織管理',
      'L2': '職能管理',
      'L3': '教育訓練',
      'L4': '專案管理',
      'L5': '績效管理',
      'L6': '文化管理'
    };
    return labels[module] || module;
  }

  getGroupedChecklist(): { category: string; items: ChecklistItem[] }[] {
    const items = this.checklist()?.items || [];
    const groups: Record<string, ChecklistItem[]> = {};

    items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });

    return Object.entries(groups).map(([category, items]) => ({ category, items }));
  }

  getCategoryProgress(items: ChecklistItem[]): number {
    const completed = items.filter(i => i.status === 'completed').length;
    return Math.round((completed / items.length) * 100);
  }

  toggleAIGenerator(): void {
    this.showAIGenerator.set(!this.showAIGenerator());
  }

  generateContent(type: string): void {
    this.generatingContent.set(true);
    this.generatedContent.set('');

    // 模擬 AI 生成
    setTimeout(() => {
      if (type === 'highlight') {
        this.generatedContent.set(`
## 2024 年度人資管理亮點

### 人才發展成就
- **TTQS 金牌認證**：連續三年獲得國家人才發展品質認證金牌，培訓體系獲國家肯定
- **培訓投資**：年度培訓總時數達 32,000 小時，人均培訓時數 40 小時，較去年成長 15%
- **培訓滿意度**：學員滿意度達 4.6/5 分，講師滿意度 4.8/5 分

### 員工關懷創新
- **EAP 服務擴展**：新增財務與法律諮詢服務，服務使用率提升 25%
- **員工滿意度**：年度員工滿意度調查達 4.2/5 分，較去年提升 0.3 分
- **員工留任率**：關鍵人才留任率達 95%，整體留任率 92%

### 績效管理革新
- **OKR 導入**：全公司導入 OKR 制度，目標達成率提升 18%
- **即時回饋**：建立即時回饋文化，每季 1:1 面談覆蓋率達 100%
        `);
      } else if (type === 'summary') {
        this.generatedContent.set(`
## 企業概況摘要

本公司成立於 2015 年，專注於人力資源科技領域，致力於透過創新科技協助企業提升人才管理效能。

### 核心業務
- 人力資源管理系統 (HRMS)
- 人才發展解決方案
- 組織效能診斷與諮詢

### 經營績效
- 員工人數：150 人
- 2024 年營收成長：25%
- 客戶滿意度：4.7/5 分
- 市場佔有率：產業前三名

### 企業文化
秉持「創新、誠信、協作、卓越、關懷」五大核心價值，打造以人為本的工作環境。
        `);
      }

      this.generatingContent.set(false);
    }, 2000);
  }

  exportPresentation(format: string): void {
    console.log('Exporting presentation as:', format);
    // 實際實作會調用後端 API 生成簡報
  }
}

