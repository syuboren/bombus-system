import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed, OnInit, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';
import { AssessmentService } from '../../services/assessment.service';
import {
  MonthlyCheck,
  MonthlyCheckItem,
  STATUS_LABELS,
  SCORE_OPTIONS
} from '../../models/assessment.model';

@Component({
  selector: 'app-monthly-check-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, SignaturePadComponent],
  templateUrl: './monthly-check-modal.component.html',
  styleUrl: './monthly-check-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MonthlyCheckModalComponent implements OnInit {
  private assessmentService = inject(AssessmentService);

  @ViewChild('signaturePad') signaturePad!: SignaturePadComponent;

  // Inputs
  checkId = input<string>('');
  visible = input<boolean>(false);

  // Outputs
  close = output<void>();
  saved = output<void>();

  // Data signals
  check = signal<MonthlyCheck | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Edit mode
  isEditing = signal(false);
  editedItems = signal<{ itemId: string; selfScore: number; managerScore: number }[]>([]);
  managerComment = signal('');
  
  // 電子簽名
  currentSignature = signal<string | null>(null);

  // Computed
  readonly scoreOptions = SCORE_OPTIONS;

  canSelfAssess = computed(() => {
    const c = this.check();
    return c?.status === 'self_assessment';
  });

  canManagerReview = computed(() => {
    const c = this.check();
    return c?.status === 'manager_review';
  });

  canHrClose = computed(() => {
    const c = this.check();
    return c?.status === 'hr_review';
  });

  totalWeightedScore = computed(() => {
    const items = this.editedItems();
    const checkData = this.check();
    if (!checkData || items.length === 0) return 0;

    const totalPoints = checkData.items.reduce((sum, item) => sum + (item.points || 0), 0);
    if (totalPoints === 0) return 0;

    const weightedSum = items.reduce((sum, edited) => {
      const item = checkData.items.find(i => i.id === edited.itemId);
      if (!item) return sum;
      const score = edited.managerScore || edited.selfScore || 0;
      return sum + (score * (item.points / totalPoints));
    }, 0);

    return Math.round(weightedSum * 20 * 10) / 10;
  });

  // 驗證：檢查所有自評分數是否都已填寫
  allSelfScoresFilled = computed(() => {
    const items = this.editedItems();
    if (items.length === 0) return false;
    return items.every(item => item.selfScore > 0);
  });

  // 驗證：檢查所有主管評分是否都已填寫
  allManagerScoresFilled = computed(() => {
    const items = this.editedItems();
    if (items.length === 0) return false;
    return items.every(item => item.managerScore > 0);
  });

  // 未填寫的項目數量
  unfilledSelfScoreCount = computed(() => {
    const items = this.editedItems();
    return items.filter(item => item.selfScore === 0).length;
  });

  unfilledManagerScoreCount = computed(() => {
    const items = this.editedItems();
    return items.filter(item => item.managerScore === 0).length;
  });

  // 檢查簽名是否已完成
  hasSignature = computed(() => {
    return this.currentSignature() !== null;
  });

  // 檢查是否可以提交自評
  canSubmitSelfAssessment = computed(() => {
    return this.allSelfScoresFilled() && this.hasSignature();
  });

  // 檢查是否可以核准
  canSubmitManagerApproval = computed(() => {
    return this.allManagerScoresFilled() && this.hasSignature();
  });

  // 檢查是否可以結案
  canSubmitHrClose = computed(() => {
    return this.hasSignature();
  });

  constructor() {
    effect(() => {
      const id = this.checkId();
      const vis = this.visible();
      if (id && vis) {
        this.loadCheck();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // Initial load handled by effect
  }

  loadCheck(): void {
    const id = this.checkId();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);
    this.currentSignature.set(null);

    this.assessmentService.getMonthlyCheckById(id).subscribe({
      next: (data) => {
        this.check.set(data);
        if (data) {
          this.editedItems.set(data.items.map(item => ({
            itemId: item.id,
            selfScore: item.selfScore || 0,
            managerScore: item.managerScore || 0
          })));
          this.managerComment.set(data.managerComment || '');
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('載入失敗');
        this.loading.set(false);
      }
    });
  }

  onClose(): void {
    // 防呆：如果正在編輯中，需要確認
    if (this.isEditing()) {
      if (!confirm('您有未儲存的變更，確定要關閉嗎？')) {
        return;
      }
    }
    this.isEditing.set(false);
    this.currentSignature.set(null);
    this.close.emit();
  }

  // 防呆：點擊背景不關閉 modal，避免誤觸導致資料遺失
  onBackdropClick(event: MouseEvent): void {
    // 不做任何事，防止誤觸關閉
  }

  // Edit handlers
  startEditing(): void {
    this.isEditing.set(true);
    this.currentSignature.set(null);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.currentSignature.set(null);
    this.loadCheck(); // Reset to original values
  }

  updateSelfScore(itemId: string, score: number): void {
    this.editedItems.update(items =>
      items.map(item =>
        item.itemId === itemId ? { ...item, selfScore: score } : item
      )
    );
  }

  updateManagerScore(itemId: string, score: number): void {
    this.editedItems.update(items =>
      items.map(item =>
        item.itemId === itemId ? { ...item, managerScore: score } : item
      )
    );
  }

  // 簽名更新處理
  onSignatureChange(signature: string | null): void {
    this.currentSignature.set(signature);
  }

  // Submit handlers
  submitSelfAssessment(): void {
    const c = this.check();
    if (!c) return;

    // 驗證所有自評分數是否都已填寫
    if (!this.allSelfScoresFilled()) {
      const count = this.unfilledSelfScoreCount();
      this.error.set(`請完成所有自評分數填寫（還有 ${count} 項未填寫）`);
      return;
    }

    // 驗證簽名
    const signature = this.currentSignature();
    if (!signature) {
      this.error.set('請完成電子簽名後再提交');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const items = this.editedItems().map(item => ({
      itemId: item.itemId,
      selfScore: item.selfScore
    }));

    this.assessmentService.submitSelfAssessment(c.id, items, signature).subscribe({
      next: () => {
        this.saving.set(false);
        this.isEditing.set(false);
        this.currentSignature.set(null);
        this.saved.emit();
        this.loadCheck();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('提交失敗');
      }
    });
  }

  submitManagerReview(action: 'approve' | 'reject'): void {
    const c = this.check();
    if (!c) return;

    // 核准時驗證所有主管評分是否都已填寫
    if (action === 'approve' && !this.allManagerScoresFilled()) {
      const count = this.unfilledManagerScoreCount();
      this.error.set(`請完成所有主管評分填寫（還有 ${count} 項未填寫）`);
      return;
    }

    // 核准時驗證簽名
    const signature = this.currentSignature();
    if (action === 'approve' && !signature) {
      this.error.set('請完成電子簽名後再核准');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    const data = {
      action,
      items: action === 'approve' ? this.editedItems().map(item => ({
        itemId: item.itemId,
        managerScore: item.managerScore
      })) : undefined,
      comment: this.managerComment(),
      signature: action === 'approve' && signature ? signature : undefined
    };

    this.assessmentService.submitManagerReview(c.id, data).subscribe({
      next: () => {
        this.saving.set(false);
        this.isEditing.set(false);
        this.currentSignature.set(null);
        this.saved.emit();
        this.loadCheck();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('提交失敗');
      }
    });
  }

  submitHrClose(action: 'close' | 'reopen'): void {
    const c = this.check();
    if (!c) return;

    // 結案時驗證簽名
    const signature = this.currentSignature();
    if (action === 'close' && !signature) {
      this.error.set('請完成電子簽名後再結案');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.assessmentService.submitHrClose(c.id, { 
      action,
      signature: action === 'close' ? signature! : undefined
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.currentSignature.set(null);
        this.saved.emit();
        this.loadCheck();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('提交失敗');
      }
    });
  }

  // Helper methods
  getStatusLabel(status: string): string {
    return STATUS_LABELS[status] || status;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getItemScore(itemId: string, type: 'self' | 'manager'): number {
    const item = this.editedItems().find(i => i.itemId === itemId);
    return type === 'self' ? (item?.selfScore || 0) : (item?.managerScore || 0);
  }
}
