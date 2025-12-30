import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TrainingService } from '../../services/training.service';
import {
  TrainingKPI,
  TrainingEffectiveness,
  CourseTypeStats,
  TTQSIndicator,
  FeedbackSession,
  CourseROI,
  ImprovementItem
} from '../../models/training.model';

@Component({
  selector: 'app-training-effectiveness-page',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './training-effectiveness-page.component.html',
  styleUrl: './training-effectiveness-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrainingEffectivenessPageComponent implements OnInit {
  private trainingService = inject(TrainingService);

  // 資料狀態
  trainingKPI = signal<TrainingKPI | null>(null);
  courseTypeStats = signal<CourseTypeStats[]>([]);
  trainingEffectiveness = signal<TrainingEffectiveness[]>([]);
  ttqsIndicators = signal<TTQSIndicator[]>([]);
  feedbackSessions = signal<FeedbackSession[]>([]);
  courseROIRanking = signal<CourseROI[]>([]);
  improvementItems = signal<ImprovementItem[]>([]);

  // 計算屬性
  ttqsTotalScore = computed(() => {
    const indicators = this.ttqsIndicators();
    if (indicators.length === 0) return 0;
    const total = indicators.reduce((sum, i) => sum + i.score, 0);
    return Math.round(total / indicators.length);
  });

  pendingFeedbackCount = computed(() => 
    this.feedbackSessions().filter(s => s.status === 'scheduled' || s.status === 'overdue').length
  );

  completedFeedbackCount = computed(() =>
    this.feedbackSessions().filter(s => s.status === 'completed').length
  );

  avgBehaviorConversion = computed(() => {
    const completed = this.feedbackSessions().filter(s => s.behaviorConversionRate !== undefined);
    if (completed.length === 0) return 0;
    const sum = completed.reduce((acc, s) => acc + (s.behaviorConversionRate || 0), 0);
    return Math.round(sum / completed.length);
  });

  highPriorityImprovements = computed(() =>
    this.improvementItems().filter(i => i.priority === 'high').length
  );

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.trainingService.getTrainingKPI().subscribe(data => {
      this.trainingKPI.set(data);
    });

    this.trainingService.getCourseTypeStats().subscribe(data => {
      this.courseTypeStats.set(data);
    });

    this.trainingService.getTrainingEffectiveness().subscribe(data => {
      this.trainingEffectiveness.set(data);
    });

    this.trainingService.getTTQSIndicators().subscribe(data => {
      this.ttqsIndicators.set(data);
    });

    this.trainingService.getFeedbackSessions().subscribe(data => {
      this.feedbackSessions.set(data);
    });

    this.trainingService.getCourseROIRanking().subscribe(data => {
      this.courseROIRanking.set(data);
    });

    this.trainingService.getImprovementItems().subscribe(data => {
      this.improvementItems.set(data);
    });
  }

  getEffectivenessClass(status: string): string {
    return `effectiveness--${status}`;
  }

  getTTQSStatusClass(status: string): string {
    return `ttqs-status--${status}`;
  }

  getTTQSIcon(phase: string): string {
    const icons: Record<string, string> = {
      'plan': 'ri-draft-line',
      'design': 'ri-pencil-ruler-2-line',
      'do': 'ri-play-circle-line',
      'review': 'ri-search-eye-line',
      'outcome': 'ri-line-chart-line'
    };
    return icons[phase] || 'ri-checkbox-circle-line';
  }

  getSessionStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待排程',
      scheduled: '已排程',
      completed: '已完成',
      overdue: '已逾期'
    };
    return labels[status] || status;
  }

  getSessionStatusClass(status: string): string {
    return `session-status--${status}`;
  }

  getROIRecommendationLabel(rec: string): string {
    const labels: Record<string, string> = {
      keep: '保留',
      optimize: '優化',
      review: '檢討',
      discontinue: '停開'
    };
    return labels[rec] || rec;
  }

  getROIRecommendationClass(rec: string): string {
    return `roi-rec--${rec}`;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return labels[priority] || priority;
  }

  getPriorityClass(priority: string): string {
    return `priority--${priority}`;
  }

  getImprovementStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待處理',
      'in-progress': '進行中',
      completed: '已完成'
    };
    return labels[status] || status;
  }

  getImprovementStatusClass(status: string): string {
    return `improvement-status--${status}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return (amount / 10000).toFixed(1) + ' 萬';
  }
}

