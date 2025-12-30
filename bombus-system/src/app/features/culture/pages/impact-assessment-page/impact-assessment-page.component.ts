import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CultureService } from '../../services/culture.service';
import { AwardPotential, CultureImpactReport, HighlightSummary } from '../../models/culture.model';

@Component({
  standalone: true,
  selector: 'app-impact-assessment-page',
  templateUrl: './impact-assessment-page.component.html',
  styleUrl: './impact-assessment-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImpactAssessmentPageComponent implements OnInit {
  private cultureService = inject(CultureService);

  // State
  loading = signal(true);
  awardPotentials = signal<AwardPotential[]>([]);
  impactReport = signal<CultureImpactReport | null>(null);
  highlightSummary = signal<HighlightSummary | null>(null);

  // Active tab
  activeTab = signal<'potential' | 'impact' | 'highlights'>('potential');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.cultureService.getAwardPotentials().subscribe(data => {
      this.awardPotentials.set(data);
    });

    this.cultureService.getCultureImpactReport().subscribe(data => {
      this.impactReport.set(data);
    });

    this.cultureService.getHighlightSummary().subscribe(data => {
      this.highlightSummary.set(data);
      this.loading.set(false);
    });
  }

  setActiveTab(tab: 'potential' | 'impact' | 'highlights'): void {
    this.activeTab.set(tab);
  }

  getEffortLabel(effort: string): string {
    const labels: Record<string, string> = {
      'low': '低投入',
      'medium': '中投入',
      'high': '高投入'
    };
    return labels[effort] || effort;
  }

  getEffortClass(effort: string): string {
    const classes: Record<string, string> = {
      'low': 'effort-low',
      'medium': 'effort-medium',
      'high': 'effort-high'
    };
    return classes[effort] || '';
  }

  getScoreClass(score: number): string {
    if (score >= 85) return 'score-excellent';
    if (score >= 70) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-poor';
  }

  getProbabilityClass(probability: number): string {
    if (probability >= 80) return 'prob-high';
    if (probability >= 60) return 'prob-medium';
    return 'prob-low';
  }

  getSourceModuleIcon(module: string): string {
    const icons: Record<string, string> = {
      'L1': 'ri-organization-chart',
      'L2': 'ri-user-settings-line',
      'L3': 'ri-book-open-line',
      'L4': 'ri-folder-chart-line',
      'L5': 'ri-line-chart-line',
      'L6': 'ri-heart-line'
    };
    return icons[module] || 'ri-database-2-line';
  }
}

