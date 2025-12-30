import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CultureService } from '../../services/culture.service';
import { VisionMission, CultureStory, CultureSurvey, CultureMetric } from '../../models/culture.model';

@Component({
  standalone: true,
  selector: 'app-culture-handbook-page',
  templateUrl: './culture-handbook-page.component.html',
  styleUrl: './culture-handbook-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CultureHandbookPageComponent implements OnInit {
  private cultureService = inject(CultureService);
  private route = inject(ActivatedRoute);

  // State
  loading = signal(true);
  visionMission = signal<VisionMission | null>(null);
  stories = signal<CultureStory[]>([]);
  surveys = signal<CultureSurvey[]>([]);
  metrics = signal<CultureMetric[]>([]);

  // UI State
  selectedValueId = signal<string | null>(null);
  activeTab = signal<'vision' | 'stories' | 'metrics'>('vision');

  ngOnInit(): void {
    this.loadData();
    // 偵測查詢參數以切換 Tab
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'stories' || tab === 'vision' || tab === 'metrics') {
        this.setActiveTab(tab as any);
      }
    });
  }

  loadData(): void {
    this.loading.set(true);

    this.cultureService.getVisionMission().subscribe(data => {
      this.visionMission.set(data);
    });

    this.cultureService.getCultureStories().subscribe(data => {
      this.stories.set(data);
    });

    this.cultureService.getCultureSurveys().subscribe(data => {
      this.surveys.set(data);
    });

    this.cultureService.getCultureMetrics().subscribe(data => {
      this.metrics.set(data);
      this.loading.set(false);
    });
  }

  setActiveTab(tab: 'vision' | 'stories' | 'metrics'): void {
    this.activeTab.set(tab);
  }

  selectValue(id: string): void {
    this.selectedValueId.set(this.selectedValueId() === id ? null : id);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'founder': '創辦故事',
      'success': '成功案例',
      'teamwork': '團隊合作',
      'innovation': '創新突破',
      'customer': '客戶導向'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'founder': 'ri-star-line',
      'success': 'ri-trophy-line',
      'teamwork': 'ri-team-line',
      'innovation': 'ri-lightbulb-flash-line',
      'customer': 'ri-customer-service-2-line'
    };
    return icons[category] || 'ri-article-line';
  }

  getMetricCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'engagement': '參與度',
      'retention': '留任',
      'satisfaction': '滿意度',
      'behavior': '行為'
    };
    return labels[category] || category;
  }

  getTrendIcon(trend: string): string {
    const icons: Record<string, string> = {
      'up': 'ri-arrow-up-line',
      'down': 'ri-arrow-down-line',
      'stable': 'ri-subtract-line'
    };
    return icons[trend] || 'ri-subtract-line';
  }

  getLatestSurvey(): CultureSurvey | null {
    const list = this.surveys();
    return list.length > 0 ? list[0] : null;
  }
}

