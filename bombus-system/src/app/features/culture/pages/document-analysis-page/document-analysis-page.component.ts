import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CultureService } from '../../services/culture.service';
import { DocumentGap, ComplianceRisk } from '../../models/culture.model';

@Component({
  standalone: true,
  selector: 'app-document-analysis-page',
  templateUrl: './document-analysis-page.component.html',
  styleUrl: './document-analysis-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentAnalysisPageComponent implements OnInit {
  private cultureService = inject(CultureService);

  // State
  loading = signal(true);
  documentGaps = signal<DocumentGap[]>([]);
  complianceRisks = signal<ComplianceRisk[]>([]);

  // Summary stats
  totalGaps = signal(0);
  criticalGaps = signal(0);
  openRisks = signal(0);
  overallScore = signal(0);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.cultureService.getDocumentGaps().subscribe(data => {
      this.documentGaps.set(data);
      this.totalGaps.set(data.length);
      this.criticalGaps.set(data.filter(g => g.severity === 'high' || g.severity === 'critical').length);
    });

    this.cultureService.getComplianceRisks().subscribe(data => {
      this.complianceRisks.set(data);
      this.openRisks.set(data.filter(r => r.status === 'open').length);

      // 計算整體分數
      const maxRisk = data.length * 4; // 假設每個風險最高 4 分
      const currentRisk = data.reduce((sum, r) => {
        const riskScore = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
        return sum + (riskScore[r.riskLevel] || 0);
      }, 0);
      this.overallScore.set(Math.round(((maxRisk - currentRisk) / maxRisk) * 100));

      this.loading.set(false);
    });
  }

  getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'critical': '嚴重'
    };
    return labels[severity] || severity;
  }

  getSeverityIcon(severity: string): string {
    const icons: Record<string, string> = {
      'low': 'ri-error-warning-line',
      'medium': 'ri-alert-line',
      'high': 'ri-alarm-warning-line',
      'critical': 'ri-fire-line'
    };
    return icons[severity] || 'ri-error-warning-line';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'missing': '缺漏',
      'expired': '已過期',
      'outdated': '需更新',
      'incomplete': '不完整',
      'open': '待處理',
      'in-progress': '處理中',
      'resolved': '已解決'
    };
    return labels[status] || status;
  }

  getRiskStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'open': '待處理',
      'in-progress': '處理中',
      'resolved': '已解決'
    };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDaysUntilDue(date: Date): number {
    const now = new Date();
    const due = new Date(date);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(date: Date): boolean {
    return this.getDaysUntilDue(date) < 0;
  }

  getScoreClass(score: number): string {
    if (score >= 80) return 'score-good';
    if (score >= 60) return 'score-warning';
    return 'score-danger';
  }
}

