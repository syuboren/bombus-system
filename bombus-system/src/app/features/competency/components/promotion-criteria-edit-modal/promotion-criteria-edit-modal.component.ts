import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromotionCriteria, GradeTrackEntity } from '../../models/competency.model';
import { CompetencyService } from '../../services/competency.service';

/**
 * 晉升條件編輯 Modal 元件
 * 支援新增/編輯晉升條件（含 Chip 動態標籤輸入）
 */
@Component({
    selector: 'app-promotion-criteria-edit-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './promotion-criteria-edit-modal.component.html',
    styleUrls: ['./promotion-criteria-edit-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromotionCriteriaEditModalComponent {
    private competencyService = inject(CompetencyService);

    // --- Input / Output ---
    visible = input<boolean>(false);
    criteriaData = input<PromotionCriteria | null>(null);
    orgUnitId = input<string>('');
    closed = output<void>();
    saved = output<void>();

    // --- 表單狀態 ---
    saving = signal(false);
    error = signal<string | null>(null);
    isEditMode = signal(false);

    // 動態載入的軌道列表
    tracks = signal<GradeTrackEntity[]>([]);
    gradeOptions = signal<number[]>([1, 2, 3, 4, 5, 6, 7]);

    // 表單資料
    formData = signal<{
        fromGrade: number;
        toGrade: number;
        track: string;
        requiredSkills: string[];
        requiredCourses: string[];
        performanceThreshold: string;
        kpiFocus: string[];
        additionalCriteria: string[];
        promotionProcedure: string;
    }>({
        fromGrade: 1,
        toGrade: 2,
        track: 'both',
        requiredSkills: [],
        requiredCourses: [],
        performanceThreshold: 'A',
        kpiFocus: [],
        additionalCriteria: [],
        promotionProcedure: ''
    });

    // Chip 輸入暫存（各欄位獨立）
    chipInput = signal<{ skills: string; courses: string; kpi: string; criteria: string }>({
        skills: '', courses: '', kpi: '', criteria: ''
    });
    private _initialSnapshot = '';

    constructor() {
        effect(() => {
            if (this.visible()) {
                this.competencyService.getTracks().subscribe(tracks => this.tracks.set(tracks.filter(t => t.isActive)));
            }
        });

        effect(() => {
            const isVisible = this.visible();
            const data = this.criteriaData();
            if (isVisible && data) {
                this.isEditMode.set(true);
                this.formData.set({
                    fromGrade: data.fromGrade,
                    toGrade: data.toGrade,
                    track: data.track,
                    requiredSkills: [...(data.requiredSkills || [])],
                    requiredCourses: [...(data.requiredCourses || [])],
                    performanceThreshold: String(data.performanceThreshold || 'A'),
                    kpiFocus: [...(data.kpiFocus || [])],
                    additionalCriteria: [...(data.additionalCriteria || [])],
                    promotionProcedure: data.promotionProcedure || ''
                });
                this._initialSnapshot = this._captureSnapshot();
            } else if (isVisible && !data) {
                this.isEditMode.set(false);
                this.resetForm();
                this._initialSnapshot = this._captureSnapshot();
            }
            this.error.set(null);
        }, { allowSignalWrites: true });
    }

    resetForm(): void {
        this.formData.set({
            fromGrade: 1, toGrade: 2, track: 'both',
            requiredSkills: [], requiredCourses: [],
            performanceThreshold: 'A', kpiFocus: [], additionalCriteria: [],
            promotionProcedure: ''
        });
        this.chipInput.set({ skills: '', courses: '', kpi: '', criteria: '' });
    }

    private _captureSnapshot(): string {
        return JSON.stringify(this.formData());
    }

    private hasUnsavedChanges(): boolean {
        return this._initialSnapshot !== '' && this._captureSnapshot() !== this._initialSnapshot;
    }

    onClose(): void {
        if (this.saving()) return;
        if (this.hasUnsavedChanges() && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
        this.resetForm(); this.error.set(null); this.closed.emit();
    }

    updateField(field: string, value: any): void {
        this.formData.update(prev => ({ ...prev, [field]: value }));
    }

    // --- Chip 操作 ---

    // 新增 Chip（按下 Enter 觸發）
    addChip(category: 'requiredSkills' | 'requiredCourses' | 'kpiFocus' | 'additionalCriteria', value: string): void {
        const trimmed = value.trim();
        if (!trimmed) return;

        this.formData.update(prev => ({
            ...prev,
            [category]: [...prev[category], trimmed]
        }));

        // 清空對應的輸入框
        const chipKey = { requiredSkills: 'skills', requiredCourses: 'courses', kpiFocus: 'kpi', additionalCriteria: 'criteria' }[category] as keyof typeof this.chipInput extends never ? never : string;
        this.chipInput.update(prev => ({ ...prev, [chipKey]: '' }));
    }

    // 移除 Chip
    removeChip(category: 'requiredSkills' | 'requiredCourses' | 'kpiFocus' | 'additionalCriteria', index: number): void {
        this.formData.update(prev => ({
            ...prev,
            [category]: prev[category].filter((_, i) => i !== index)
        }));
    }

    // 更新 Chip 輸入框暫存
    updateChipInput(field: string, value: string): void {
        this.chipInput.update(prev => ({ ...prev, [field]: value }));
    }

    // Enter 鍵處理
    onChipKeyDown(event: KeyboardEvent, category: 'requiredSkills' | 'requiredCourses' | 'kpiFocus' | 'additionalCriteria', value: string): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addChip(category, value);
        }
    }

    validateForm(): boolean {
        const data = this.formData();
        if (data.fromGrade >= data.toGrade) { this.error.set('目標職等必須大於來源職等'); return false; }
        if (!data.performanceThreshold?.trim()) { this.error.set('績效門檻為必填'); return false; }
        return true;
    }

    onSave(): void {
        if (!this.validateForm()) return;
        this.saving.set(true);
        this.error.set(null);

        const data = this.formData();
        const criteriaData = this.criteriaData();

        const dataWithOrg = { ...data, org_unit_id: this.orgUnitId() || null };

        const observable = this.isEditMode() && criteriaData
            ? this.competencyService.updatePromotionCriteria(criteriaData.id, dataWithOrg as any)
            : this.competencyService.createPromotionCriteria(dataWithOrg as any);

        observable.subscribe({
            next: () => { this.saving.set(false); this.saved.emit(); this.onClose(); },
            error: (err) => { this.saving.set(false); this.error.set(err?.error?.error?.message || '儲存失敗'); }
        });
    }
}
