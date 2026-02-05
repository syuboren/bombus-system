import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CandidateDetail, CandidateFormData, INTERVIEW_QUESTIONS, INTERVIEW_QUESTION_CATEGORIES } from '../../models/candidate.model';
import { CandidateFull, CandidateResumeAnalysis } from '../../models/job.model';

/**
 * 參考資料面板
 * 顯示候選人履歷、AI 評分報告、候選人面試記錄表內容
 */
@Component({
  selector: 'app-reference-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reference-panel.component.html',
  styleUrl: './reference-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferencePanelComponent {
  // Inputs
  candidate = input<CandidateDetail | null>(null);
  candidateFull = input<CandidateFull | null>(null);
  resumeAnalysis = input<CandidateResumeAnalysis | null>(null);
  candidateFormData = input<CandidateFormData | null>(null);
  isExpanded = input<boolean>(true);

  // Outputs
  toggleExpand = output<void>();

  // State
  activeTab = signal<'resume' | 'ai' | 'form'>('resume');

  // Computed: 分類後的面試問答
  groupedQuestions = computed(() => {
    const formData = this.candidateFormData();
    if (!formData?.interviewQuestions) return [];

    const groups: { category: string; label: string; questions: { question: string; answer: string }[] }[] = [];
    const categoryLabels = INTERVIEW_QUESTION_CATEGORIES;

    // 按分類分組
    const categoryMap = new Map<string, { question: string; answer: string }[]>();
    
    INTERVIEW_QUESTIONS.forEach(q => {
      const answer = formData.interviewQuestions[q.code];
      if (answer) {
        if (!categoryMap.has(q.category)) {
          categoryMap.set(q.category, []);
        }
        categoryMap.get(q.category)!.push({
          question: q.question,
          answer: answer
        });
      }
    });

    // 轉換為陣列
    categoryMap.forEach((questions, category) => {
      groups.push({
        category,
        label: categoryLabels[category as keyof typeof categoryLabels] || category,
        questions
      });
    });

    return groups;
  });

  // Methods
  setActiveTab(tab: 'resume' | 'ai' | 'form'): void {
    this.activeTab.set(tab);
  }

  onToggleExpand(): void {
    this.toggleExpand.emit();
  }

  // Helper: 取得 AI 建議等級樣式
  getRecommendationClass(score: number): string {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 55) return 'neutral';
    return 'poor';
  }

  // Helper: 取得 AI 建議文字
  getRecommendationText(score: number): string {
    if (score >= 85) return '強烈推薦錄用';
    if (score >= 70) return '推薦錄用';
    if (score >= 55) return '待觀察';
    return '不建議錄用';
  }

  // Helper: 格式化日期
  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    // 如果是 YYYY-MM 格式，直接返回
    if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;
    // 如果是 ISO 日期，轉換為 YYYY-MM
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  }

  // Helper: 取得技能匹配百分比
  getMatchPercentage(matched: number | undefined, total: number | undefined): number {
    if (!total || total === 0) return 0;
    return Math.round(((matched || 0) / total) * 100);
  }

  // Helper: 取得相關性等級文字
  getRelevanceLevelText(level: number): string {
    switch (level) {
      case 5: return '高度相關';
      case 4: return '相關';
      case 3: return '部分相關';
      case 2: return '略有相關';
      case 1: return '無相關';
      default: return '未評估';
    }
  }
}
