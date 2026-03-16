import { Component, ChangeDetectionStrategy, input, output, signal, computed, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateDetail } from '../../models/candidate.model';
import { InterviewService } from '../../services/interview.service';
import { AIAnalysisResult } from '../../services/ai-analysis.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
    selector: 'app-hiring-decision-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './hiring-decision-modal.component.html',
    styleUrl: './hiring-decision-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class HiringDecisionModalComponent {
    candidate = input.required<CandidateDetail>();
    isVisible = input.required<boolean>();
    aiAnalysisResult = input<AIAnalysisResult | null>(null);  // 新增 AI 分析結果輸入
    close = output<void>();
    decided = output<void>();

    private interviewService = inject(InterviewService);
    private notificationService = inject(NotificationService);

    decision = signal<'Offered' | 'Rejected' | null>(null);
    reason = signal<string>('');
    loading = signal<boolean>(false);

    // 計算 AI 推薦資訊
    aiRecommendation = computed(() => {
        const result = this.aiAnalysisResult();
        if (!result) return null;
        return {
            score: result.overallScore,
            label: result.recommendation.label,
            color: result.recommendation.color,
            icon: result.recommendation.icon,
            keywordScore: result.scoreBreakdown.keywordScore,
            semanticScore: result.scoreBreakdown.semanticScore,
            jdMatchScore: result.scoreBreakdown.jdMatchScore,
            insights: result.semanticAnalysis.insights.slice(0, 3),  // 只取前 3 個洞察
            missingSkills: result.jdMatchResult.missingSkills
        };
    });

    tryClose(): void {
        if (this.loading()) return;
        if ((this.decision() || this.reason()) && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
        this.decision.set(null);
        this.reason.set('');
        this.close.emit();
    }

    submit() {
        if (!this.decision()) {
            this.notificationService.warning('請選擇決策結果');
            return;
        }

        this.loading.set(true);
        this.interviewService.makeDecision(this.candidate().id, this.decision()!, this.reason())
            .subscribe({
                next: () => {
                    this.notificationService.success(`決策已提交：${this.decision() === 'Offered' ? '錄用' : '婉拒'}`);
                    this.decided.emit();
                    this.close.emit();
                    this.loading.set(false);
                },
                error: () => {
                    this.notificationService.error('提交失敗，請稍後再試');
                    this.loading.set(false);
                }
            });
    }
}
