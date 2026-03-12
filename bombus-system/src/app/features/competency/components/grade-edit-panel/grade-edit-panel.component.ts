import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeLevelNew, GradeTrackEntry, SalaryLevel } from '../../models/competency.model';
import { CompetencyService } from '../../services/competency.service';

@Component({
  selector: 'app-grade-edit-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './grade-edit-panel.component.html',
  styleUrls: ['./grade-edit-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradeEditPanelComponent {
  private competencyService = inject(CompetencyService);

  // --- Input / Output ---
  visible = input<boolean>(false);
  gradeData = input<GradeLevelNew | null>(null);
  closed = output<void>();
  saved = output<void>();

  // --- 表單狀態 ---
  saving = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  activeTrackTab = signal<'management' | 'professional'>('management');

  // 基本資訊
  formGrade = signal(1);
  formCodeRange = signal('');

  // 薪資列表
  formSalaryLevels = signal<SalaryLevel[]>([]);

  // 管理職 track entry
  formManagement = signal<{ title: string; educationRequirement: string; responsibilityDescription: string }>({
    title: '', educationRequirement: '', responsibilityDescription: ''
  });

  // 專業職 track entry
  formProfessional = signal<{ title: string; educationRequirement: string; responsibilityDescription: string }>({
    title: '', educationRequirement: '', responsibilityDescription: ''
  });

  // 目前 Tab 對應的表單資料
  activeTrackForm = computed(() => {
    return this.activeTrackTab() === 'management'
      ? this.formManagement()
      : this.formProfessional();
  });

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const data = this.gradeData();
      if (isVisible && data) {
        this.isEditMode.set(true);
        this.formGrade.set(data.grade);
        this.formCodeRange.set(data.codeRange || '');
        this.formSalaryLevels.set(data.salaryLevels ? data.salaryLevels.map(s => ({ ...s })) : []);

        // 從 trackEntries 載入軌道資料
        const mgmt = data.trackEntries?.find(e => e.track === 'management');
        const prof = data.trackEntries?.find(e => e.track === 'professional');
        this.formManagement.set({
          title: mgmt?.title || '',
          educationRequirement: mgmt?.educationRequirement || '',
          responsibilityDescription: mgmt?.responsibilityDescription || ''
        });
        this.formProfessional.set({
          title: prof?.title || '',
          educationRequirement: prof?.educationRequirement || '',
          responsibilityDescription: prof?.responsibilityDescription || ''
        });
      } else if (isVisible && !data) {
        this.isEditMode.set(false);
        this.resetForm();
      }
      this.error.set(null);
    }, { allowSignalWrites: true });
  }

  resetForm(): void {
    this.formGrade.set(1);
    this.formCodeRange.set('');
    this.formSalaryLevels.set([]);
    this.formManagement.set({ title: '', educationRequirement: '', responsibilityDescription: '' });
    this.formProfessional.set({ title: '', educationRequirement: '', responsibilityDescription: '' });
    this.activeTrackTab.set('management');
  }

  onClose(): void {
    if (!this.saving()) {
      this.resetForm();
      this.error.set(null);
      this.closed.emit();
    }
  }

  setTrackTab(tab: 'management' | 'professional'): void {
    this.activeTrackTab.set(tab);
  }

  // --- 基本欄位更新 ---
  updateGrade(value: number): void { this.formGrade.set(value); }
  updateCodeRange(value: string): void { this.formCodeRange.set(value); }

  // --- 軌道欄位更新 ---
  updateTrackField(field: 'title' | 'educationRequirement' | 'responsibilityDescription', value: string): void {
    if (this.activeTrackTab() === 'management') {
      this.formManagement.update(prev => ({ ...prev, [field]: value }));
    } else {
      this.formProfessional.update(prev => ({ ...prev, [field]: value }));
    }
  }

  // --- 薪資列表操作 ---
  addSalaryLevel(): void {
    this.formSalaryLevels.update(prev => [
      ...prev,
      { code: '', salary: 0, order: prev.length + 1 }
    ]);
  }

  updateSalaryLevel(index: number, field: keyof SalaryLevel, value: string | number): void {
    this.formSalaryLevels.update(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  removeSalaryLevel(index: number): void {
    this.formSalaryLevels.update(prev => prev.filter((_, i) => i !== index));
  }

  // --- 驗證 ---
  validateForm(): boolean {
    if (!this.formGrade() || this.formGrade() < 1) {
      this.error.set('職等為必填且必須大於 0');
      return false;
    }
    if (!this.formCodeRange().trim()) {
      this.error.set('職等代碼範圍為必填');
      return false;
    }
    if (!this.formManagement().title.trim()) {
      this.error.set('管理職稱謂為必填');
      return false;
    }
    if (!this.formProfessional().title.trim()) {
      this.error.set('專業職稱謂為必填');
      return false;
    }
    return true;
  }

  // --- 儲存 ---
  onSave(): void {
    if (!this.validateForm()) return;
    this.saving.set(true);
    this.error.set(null);

    const mgmt = this.formManagement();
    const prof = this.formProfessional();

    const payload: any = {
      grade: this.formGrade(),
      codeRange: this.formCodeRange(),
      salaryLevels: this.formSalaryLevels(),
      managementTitle: mgmt.title,
      managementEducation: mgmt.educationRequirement,
      managementResponsibility: mgmt.responsibilityDescription,
      professionalTitle: prof.title,
      professionalEducation: prof.educationRequirement,
      professionalResponsibility: prof.responsibilityDescription
    };

    const observable = this.isEditMode()
      ? this.competencyService.updateGradeLevel(this.formGrade(), payload)
      : this.competencyService.createGradeLevel(payload);

    observable.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.onClose();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error?.message || '儲存失敗，請稍後再試');
      }
    });
  }
}
