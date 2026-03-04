import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { SignatureDialogComponent } from '../../../../shared/components/signature-dialog/signature-dialog.component';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';
import { AssessmentService } from '../../services/assessment.service';
import {
  WeeklyReport,
  WeeklyReportWorkItem,
  WeeklyTodoItem,
  WeeklyProblemItem,
  WeeklyTrainingItem,
  WeeklyProjectItem,
  STATUS_LABELS
} from '../../models/assessment.model';

interface EditableWorkItem {
  id?: string;
  content: string;
  estimatedTime: number;
  actualTime: number;
  completedDate: string;
}

interface EditableTodoItem {
  id?: string;
  task: string;
  startDate: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'normal';
  status: 'not_started' | 'in_progress' | 'completed';
}

interface EditableProblemItem {
  id?: string;
  problem: string;
  solution: string;
  resolved: boolean;
}

interface EditableTrainingItem {
  id?: string;
  courseName: string;
  status: 'not_started' | 'in_progress' | 'completed';
  totalHours: number;
  completedHours: number;
  completedDate: string;
}

interface EditableProjectItem {
  id?: string;
  task: string;
  progressRate: number;
  collaboration: string;
  challenges: string;
  expectedDate: string;
  actualDate: string;
}

@Component({
  selector: 'app-weekly-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, SignatureDialogComponent, SignaturePadComponent],
  templateUrl: './weekly-report-modal.component.html',
  styleUrl: './weekly-report-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WeeklyReportModalComponent {
  private assessmentService = inject(AssessmentService);

  // Inputs
  reportId = input<string>('');
  visible = input<boolean>(false);

  // Outputs
  close = output<void>();
  saved = output<void>();

  // Data signals
  report = signal<WeeklyReport | null>(null);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  // Edit mode
  isEditing = signal(false);

  // 摺疊狀態
  expandedSections = signal<Record<string, boolean>>({
    routine: true,
    nonRoutine: true,
    todo: true,
    problem: true,
    training: true,
    project: true,
    summary: true,
    signature: true
  });

  // 編輯資料
  editedRoutineItems = signal<EditableWorkItem[]>([]);
  editedNonRoutineItems = signal<EditableWorkItem[]>([]);
  editedTodoItems = signal<EditableTodoItem[]>([]);
  editedProblemItems = signal<EditableProblemItem[]>([]);
  editedTrainingItems = signal<EditableTrainingItem[]>([]);
  editedProjectItems = signal<EditableProjectItem[]>([]);
  editedWeeklySummary = signal('');
  editedNextWeekPlan = signal('');
  reviewerComment = signal('');

  // 簽章 (員工提交用)
  showSignaturePad = signal(false);
  employeeSignature = signal<string | null>(null);
  managerSignature = signal<string | null>(null);

  // 審核 Modal 狀態
  showApproveModal = signal(false);  // 核准 Modal (含評語)
  showManagerSignatureDialog = signal(false);  // 主管簽章 Dialog
  showRejectModal = signal(false);   // 退回 Modal (含退回原因)
  rejectReason = signal('');         // 退回原因
  approveComment = signal('');       // 核准評語

  // 計算屬性
  canEdit = computed(() => {
    const r = this.report();
    return r?.status === 'not_started' || r?.status === 'draft' || r?.status === 'rejected';
  });

  canSubmit = computed(() => {
    const r = this.report();
    return r?.status === 'not_started' || r?.status === 'draft' || r?.status === 'rejected';
  });

  canReview = computed(() => {
    const r = this.report();
    return r?.status === 'submitted';
  });

  isReadOnly = computed(() => {
    const r = this.report();
    return r?.status === 'approved';
  });

  // 時數統計
  routineTotalMinutes = computed(() => {
    return this.editedRoutineItems().reduce((sum, item) => sum + (item.actualTime || 0), 0);
  });

  nonRoutineTotalMinutes = computed(() => {
    return this.editedNonRoutineItems().reduce((sum, item) => sum + (item.actualTime || 0), 0);
  });

  totalMinutes = computed(() => {
    return this.routineTotalMinutes() + this.nonRoutineTotalMinutes();
  });

  // 驗證
  isFormValid = computed(() => {
    const routine = this.editedRoutineItems().filter(i => i.content.trim()).length > 0;
    const summary = this.editedWeeklySummary().trim().length > 0;
    return routine && summary;
  });

  constructor() {
    effect(() => {
      const id = this.reportId();
      const vis = this.visible();
      if (id && vis) {
        this.loadReport();
      }
    }, { allowSignalWrites: true });
  }

  loadReport(): void {
    const id = this.reportId();
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    this.assessmentService.getWeeklyReportById(id).subscribe({
      next: (data) => {
        this.report.set(data);
        if (data) {
          this.initializeEditData(data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('載入失敗');
        this.loading.set(false);
      }
    });
  }

  private initializeEditData(data: WeeklyReport): void {
    // 例行工作
    this.editedRoutineItems.set(
      data.routineItems?.length > 0
        ? data.routineItems.map(i => ({
            id: i.id,
            content: i.content,
            estimatedTime: i.estimatedTime || 0,
            actualTime: i.actualTime || 0,
            completedDate: i.completedDate || ''
          }))
        : [this.createEmptyWorkItem()]
    );

    // 非例行工作
    this.editedNonRoutineItems.set(
      data.nonRoutineItems?.length > 0
        ? data.nonRoutineItems.map(i => ({
            id: i.id,
            content: i.content,
            estimatedTime: i.estimatedTime || 0,
            actualTime: i.actualTime || 0,
            completedDate: i.completedDate || ''
          }))
        : []
    );

    // 代辦事項
    this.editedTodoItems.set(
      data.todoItems?.length > 0
        ? data.todoItems.map(i => ({
            id: i.id,
            task: i.task,
            startDate: i.startDate || '',
            dueDate: i.dueDate || '',
            priority: i.priority,
            status: i.status
          }))
        : []
    );

    // 問題與解決方案
    this.editedProblemItems.set(
      data.problemItems?.length > 0
        ? data.problemItems.map(i => ({
            id: i.id,
            problem: i.problem,
            solution: i.solution,
            resolved: i.resolved
          }))
        : []
    );

    // 教育訓練
    this.editedTrainingItems.set(
      data.trainingItems?.length > 0
        ? data.trainingItems.map(i => ({
            id: i.id,
            courseName: i.courseName,
            status: i.status,
            totalHours: i.totalHours,
            completedHours: i.completedHours,
            completedDate: i.completedDate || ''
          }))
        : []
    );

    // 階段性任務
    this.editedProjectItems.set(
      data.projectItems?.length > 0
        ? data.projectItems.map(i => ({
            id: i.id,
            task: i.task,
            progressRate: i.progressRate,
            collaboration: i.collaboration,
            challenges: i.challenges,
            expectedDate: i.expectedDate || '',
            actualDate: i.actualDate || ''
          }))
        : []
    );

    this.editedWeeklySummary.set(data.weeklySummary || '');
    this.editedNextWeekPlan.set(data.nextWeekPlan || '');
    this.reviewerComment.set(data.reviewerComment || '');
    this.employeeSignature.set(data.employeeSignature || null);
    this.managerSignature.set(data.managerSignature || null);
  }

  // 建立空白項目
  private createEmptyWorkItem(): EditableWorkItem {
    return { content: '', estimatedTime: 0, actualTime: 0, completedDate: '' };
  }

  private createEmptyTodoItem(): EditableTodoItem {
    return { task: '', startDate: '', dueDate: '', priority: 'normal', status: 'not_started' };
  }

  private createEmptyProblemItem(): EditableProblemItem {
    return { problem: '', solution: '', resolved: false };
  }

  private createEmptyTrainingItem(): EditableTrainingItem {
    return { courseName: '', status: 'not_started', totalHours: 0, completedHours: 0, completedDate: '' };
  }

  private createEmptyProjectItem(): EditableProjectItem {
    return { task: '', progressRate: 0, collaboration: '', challenges: '', expectedDate: '', actualDate: '' };
  }

  // 區塊摺疊
  toggleSection(section: string): void {
    this.expandedSections.update(sections => ({
      ...sections,
      [section]: !sections[section]
    }));
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections()[section] ?? true;
  }

  // Modal 控制
  onClose(): void {
    // 防呆：如果正在編輯中，需要確認
    if (this.isEditing() && this.hasUnsavedChanges()) {
      if (!confirm('您有未儲存的變更，確定要關閉嗎？')) {
        return;
      }
    }
    this.isEditing.set(false);
    this.showSignaturePad.set(false);
    this.close.emit();
  }

  // 防呆：點擊背景不關閉 modal，避免誤觸導致資料遺失
  onBackdropClick(event: MouseEvent): void {
    // 不做任何事，防止誤觸關閉
  }

  // 檢查是否有未儲存的變更
  private hasUnsavedChanges(): boolean {
    const r = this.report();
    if (!r) return false;
    // 簡單檢查是否有內容變更
    return this.editedWeeklySummary() !== (r.weeklySummary || '') ||
           this.editedNextWeekPlan() !== (r.nextWeekPlan || '');
  }

  startEditing(): void {
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.loadReport();
  }

  // 例行工作 handlers
  addRoutineItem(): void {
    this.editedRoutineItems.update(items => [...items, this.createEmptyWorkItem()]);
  }

  removeRoutineItem(index: number): void {
    this.editedRoutineItems.update(items => items.filter((_, i) => i !== index));
  }

  updateRoutineItem(index: number, field: keyof EditableWorkItem, value: any): void {
    this.editedRoutineItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  }

  // 非例行工作 handlers
  addNonRoutineItem(): void {
    this.editedNonRoutineItems.update(items => [...items, this.createEmptyWorkItem()]);
  }

  removeNonRoutineItem(index: number): void {
    this.editedNonRoutineItems.update(items => items.filter((_, i) => i !== index));
  }

  updateNonRoutineItem(index: number, field: keyof EditableWorkItem, value: any): void {
    this.editedNonRoutineItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  }

  // 代辦事項 handlers
  addTodoItem(): void {
    this.editedTodoItems.update(items => [...items, this.createEmptyTodoItem()]);
  }

  removeTodoItem(index: number): void {
    this.editedTodoItems.update(items => items.filter((_, i) => i !== index));
  }

  updateTodoItem(index: number, field: keyof EditableTodoItem, value: any): void {
    this.editedTodoItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  }

  // 問題與解決方案 handlers
  addProblemItem(): void {
    this.editedProblemItems.update(items => [...items, this.createEmptyProblemItem()]);
  }

  removeProblemItem(index: number): void {
    this.editedProblemItems.update(items => items.filter((_, i) => i !== index));
  }

  updateProblemItem(index: number, field: keyof EditableProblemItem, value: any): void {
    this.editedProblemItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  }

  // 教育訓練 handlers
  addTrainingItem(): void {
    this.editedTrainingItems.update(items => [...items, this.createEmptyTrainingItem()]);
  }

  removeTrainingItem(index: number): void {
    this.editedTrainingItems.update(items => items.filter((_, i) => i !== index));
  }

  updateTrainingItem(index: number, field: keyof EditableTrainingItem, value: any): void {
    this.editedTrainingItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  }

  getTrainingCompletionRate(item: EditableTrainingItem): number {
    if (!item.totalHours || item.totalHours === 0) return 0;
    return Math.round((item.completedHours / item.totalHours) * 100);
  }

  // 階段性任務 handlers
  addProjectItem(): void {
    this.editedProjectItems.update(items => [...items, this.createEmptyProjectItem()]);
  }

  removeProjectItem(index: number): void {
    this.editedProjectItems.update(items => items.filter((_, i) => i !== index));
  }

  updateProjectItem(index: number, field: keyof EditableProjectItem, value: any): void {
    this.editedProjectItems.update(items =>
      items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    );
  }

  // 儲存草稿
  saveDraft(): void {
    const r = this.report();
    if (!r) return;

    this.saving.set(true);
    const data = this.buildSaveData();

    this.assessmentService.updateWeeklyReport(r.id, data).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.loadReport();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('儲存失敗');
      }
    });
  }

  // 提交週報
  submitReport(): void {
    const r = this.report();
    if (!r) return;

    if (!this.isFormValid()) {
      this.error.set('請填寫必填欄位：至少一項例行工作、本週工作總結');
      return;
    }

    // 開啟簽章面板
    this.showSignaturePad.set(true);
  }

  onEmployeeSignatureComplete(signature: string): void {
    this.employeeSignature.set(signature);
    this.showSignaturePad.set(false);
    this.doSubmitReport();
  }

  onSignatureCancel(): void {
    this.showSignaturePad.set(false);
  }

  private doSubmitReport(): void {
    const r = this.report();
    if (!r) return;

    this.saving.set(true);
    const data = {
      ...this.buildSaveData(),
      employeeSignature: this.employeeSignature() || undefined
    };

    this.assessmentService.submitWeeklyReport(r.id, data).subscribe({
      next: () => {
        this.saving.set(false);
        this.isEditing.set(false);
        this.saved.emit();
        this.loadReport();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('提交失敗');
      }
    });
  }

  private buildSaveData() {
    return {
      routineItems: this.editedRoutineItems().filter(i => i.content.trim()),
      nonRoutineItems: this.editedNonRoutineItems().filter(i => i.content.trim()),
      todoItems: this.editedTodoItems().filter(i => i.task.trim()),
      problemItems: this.editedProblemItems().filter(i => i.problem.trim()),
      trainingItems: this.editedTrainingItems().filter(i => i.courseName.trim()),
      projectItems: this.editedProjectItems().filter(i => i.task.trim()),
      weeklySummary: this.editedWeeklySummary(),
      nextWeekPlan: this.editedNextWeekPlan()
    };
  }

  // ===============================
  // 審核流程
  // ===============================

  // 打開核准 Modal
  openApproveModal(): void {
    this.approveComment.set(this.reviewerComment());
    this.managerSignature.set(null);
    this.showApproveModal.set(true);
  }

  // 關閉核准 Modal
  closeApproveModal(): void {
    this.showApproveModal.set(false);
  }

  // 打開主管簽章 Dialog
  openManagerSignatureDialog(): void {
    this.showManagerSignatureDialog.set(true);
  }

  // 主管簽章完成
  onManagerSignatureComplete(signature: string): void {
    this.managerSignature.set(signature);
    this.showManagerSignatureDialog.set(false);
  }

  // 主管簽章取消
  onManagerSignatureCancel(): void {
    this.showManagerSignatureDialog.set(false);
  }

  // 清除主管簽章
  clearManagerSignature(): void {
    this.managerSignature.set(null);
  }

  // 確認核准
  confirmApprove(): void {
    const r = this.report();
    if (!r) return;

    if (!this.managerSignature()) {
      this.error.set('請先完成主管簽章');
      return;
    }

    this.saving.set(true);
    this.assessmentService.reviewWeeklyReport(r.id, {
      action: 'approve',
      comment: this.approveComment(),
      managerSignature: this.managerSignature() || undefined
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showApproveModal.set(false);
        this.saved.emit();
        this.loadReport();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('審核失敗');
      }
    });
  }

  // 打開退回 Modal
  openRejectModal(): void {
    this.rejectReason.set('');
    this.showRejectModal.set(true);
  }

  // 關閉退回 Modal
  closeRejectModal(): void {
    this.showRejectModal.set(false);
  }

  // 確認退回
  confirmReject(): void {
    const r = this.report();
    if (!r) return;

    if (!this.rejectReason().trim()) {
      this.error.set('請輸入退回原因');
      return;
    }

    this.saving.set(true);
    this.assessmentService.reviewWeeklyReport(r.id, {
      action: 'reject',
      comment: this.rejectReason()
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showRejectModal.set(false);
        this.saved.emit();
        this.loadReport();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('退回失敗');
      }
    });
  }

  // 舊方法保留相容性
  approveReport(): void {
    this.openApproveModal();
  }

  rejectReport(): void {
    this.openRejectModal();
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

  formatMinutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} 分鐘`;
    if (mins === 0) return `${hours} 小時`;
    return `${hours} 小時 ${mins} 分鐘`;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'high': '高',
      'medium': '中',
      'normal': '一般'
    };
    return labels[priority] || priority;
  }

  getTaskStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'not_started': '尚未開始',
      'in_progress': '進行中',
      'completed': '已完成'
    };
    return labels[status] || status;
  }

  dismissError(): void {
    this.error.set(null);
  }
}
