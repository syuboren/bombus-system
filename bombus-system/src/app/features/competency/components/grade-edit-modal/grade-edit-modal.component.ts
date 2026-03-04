import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeLevelNew, SalaryLevel } from '../../models/competency.model';
import { CompetencyService } from '../../services/competency.service';

/**
 * 職等編輯 Modal 元件
 * 支援新增/編輯職等（含職級薪資列表動態編輯）
 */
@Component({
    selector: 'app-grade-edit-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './grade-edit-modal.component.html',
    styleUrls: ['./grade-edit-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GradeEditModalComponent {
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

    // 表單資料
    formData = signal<{
        grade: number;
        codeRange: string;
        titleManagement: string;
        titleProfessional: string;
        educationRequirement: string;
        responsibilityDescription: string;
        salaryLevels: SalaryLevel[];
    }>({
        grade: 1,
        codeRange: '',
        titleManagement: '',
        titleProfessional: '',
        educationRequirement: '',
        responsibilityDescription: '',
        salaryLevels: []
    });

    constructor() {
        // 當 visible 或 gradeData 改變時，同步表單資料
        effect(() => {
            const isVisible = this.visible();
            const data = this.gradeData();
            if (isVisible && data) {
                this.isEditMode.set(true);
                this.formData.set({
                    grade: data.grade,
                    codeRange: data.codeRange || '',
                    titleManagement: data.titleManagement || '',
                    titleProfessional: data.titleProfessional || '',
                    educationRequirement: data.educationRequirement || '',
                    responsibilityDescription: data.responsibilityDescription || '',
                    salaryLevels: data.salaryLevels ? data.salaryLevels.map(s => ({ ...s })) : []
                });
            } else if (isVisible && !data) {
                this.isEditMode.set(false);
                this.resetForm();
            }
            this.error.set(null);
        }, { allowSignalWrites: true });
    }

    // 重置表單
    resetForm(): void {
        this.formData.set({
            grade: 1,
            codeRange: '',
            titleManagement: '',
            titleProfessional: '',
            educationRequirement: '',
            responsibilityDescription: '',
            salaryLevels: []
        });
    }

    // 關閉 Modal
    onClose(): void {
        if (!this.saving()) {
            this.resetForm();
            this.error.set(null);
            this.closed.emit();
        }
    }

    // 更新表單欄位
    updateField(field: string, value: any): void {
        this.formData.update(prev => ({ ...prev, [field]: value }));
    }

    // --- 薪資列表操作 ---

    // 新增薪資行
    addSalaryLevel(): void {
        this.formData.update(prev => ({
            ...prev,
            salaryLevels: [...prev.salaryLevels, { code: '', salary: 0, order: prev.salaryLevels.length + 1 }]
        }));
    }

    // 更新薪資行
    updateSalaryLevel(index: number, field: keyof SalaryLevel, value: any): void {
        this.formData.update(prev => {
            const updated = [...prev.salaryLevels];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, salaryLevels: updated };
        });
    }

    // 移除薪資行
    removeSalaryLevel(index: number): void {
        this.formData.update(prev => ({
            ...prev,
            salaryLevels: prev.salaryLevels.filter((_, i) => i !== index)
        }));
    }

    // 驗證表單
    validateForm(): boolean {
        const data = this.formData();
        if (!data.grade || data.grade < 1) {
            this.error.set('職等為必填且必須大於 0');
            return false;
        }
        if (!data.codeRange?.trim()) {
            this.error.set('職等代碼範圍為必填');
            return false;
        }
        if (!data.titleManagement?.trim()) {
            this.error.set('管理職稱謂為必填');
            return false;
        }
        if (!data.titleProfessional?.trim()) {
            this.error.set('專業職稱謂為必填');
            return false;
        }
        return true;
    }

    // 儲存職等
    onSave(): void {
        if (!this.validateForm()) return;
        this.saving.set(true);
        this.error.set(null);

        const data = this.formData();

        const observable = this.isEditMode()
            ? this.competencyService.updateGradeLevel(data.grade, data)
            : this.competencyService.createGradeLevel(data);

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
