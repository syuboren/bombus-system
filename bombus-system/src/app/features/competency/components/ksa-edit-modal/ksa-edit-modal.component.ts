import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompetencyService } from '../../services/competency.service';
import { KSACompetencyItem, CompetencyType } from '../../models/competency.model';

/**
 * KSA 職能編輯 Modal 元件
 * 用於新增/編輯 KSA 職能（無等級區分）
 */
@Component({
    selector: 'app-ksa-edit-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './ksa-edit-modal.component.html',
    styleUrl: './ksa-edit-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KsaEditModalComponent {
    private competencyService = inject(CompetencyService);

    // Inputs
    visible = input<boolean>(false);
    competency = input<KSACompetencyItem | null>(null);
    orgUnitId = input<string>('');

    // Outputs
    close = output<void>();
    saved = output<KSACompetencyItem>();

    // Form state
    formData = signal<Partial<KSACompetencyItem>>({
        code: '',
        name: '',
        ksaType: 'knowledge',
        description: '',
        behaviorIndicators: [],
        linkedCourses: []
    });

    // UI state
    saving = signal(false);
    error = signal<string | null>(null);

    // KSA 類型選項
    readonly ksaTypes: { value: CompetencyType; label: string; icon: string }[] = [
        { value: 'knowledge', label: '知識 (K)', icon: 'ri-book-open-line' },
        { value: 'skill', label: '技能 (S)', icon: 'ri-tools-line' },
        { value: 'attitude', label: '態度 (A)', icon: 'ri-lightbulb-line' }
    ];

    // Computed
    isEditMode = computed(() => !!this.competency());
    modalTitle = computed(() => this.isEditMode() ? '編輯 KSA 職能' : '新增 KSA 職能');

    constructor() {
        // 當 visible 或 competency input 改變時，更新表單資料
        // 需要 allowSignalWrites 因為要在 effect 中寫入 formData
        effect(() => {
            const isVisible = this.visible();
            const comp = this.competency();

            // 只在 Modal 打開時初始化表單
            if (isVisible) {
                if (comp) {
                    // 編輯模式：填入現有資料
                    this.formData.set({
                        code: comp.code,
                        name: comp.name,
                        ksaType: comp.ksaType,
                        description: comp.description,
                        behaviorIndicators: [...comp.behaviorIndicators],
                        linkedCourses: [...(comp.linkedCourses || [])]
                    });
                } else {
                    // 新增模式：重置表單
                    this.resetForm();
                }
            }
        }, { allowSignalWrites: true });
    }

    /**
     * 重置表單
     */
    resetForm(): void {
        this.formData.set({
            code: '',
            name: '',
            ksaType: 'knowledge',
            description: '',
            behaviorIndicators: [],
            linkedCourses: []
        });
        this.error.set(null);
    }

    /**
     * 關閉 Modal
     */
    onClose(): void {
        if (!this.saving()) {
            this.close.emit();
        }
    }

    /**
     * 更新基本欄位
     */
    updateField(field: keyof KSACompetencyItem, value: any): void {
        this.formData.update(current => ({
            ...current,
            [field]: value
        }));
    }

    /**
     * 新增行為指標
     */
    addIndicator(): void {
        const current = this.formData();
        const indicators = [...(current.behaviorIndicators || []), ''];
        this.formData.set({ ...current, behaviorIndicators: indicators });
    }

    /**
     * 更新行為指標
     */
    updateIndicator(index: number, value: string): void {
        const current = this.formData();
        const indicators = [...(current.behaviorIndicators || [])];
        indicators[index] = value;
        this.formData.set({ ...current, behaviorIndicators: indicators });
    }

    /**
     * 移除行為指標
     */
    removeIndicator(index: number): void {
        const current = this.formData();
        const indicators = [...(current.behaviorIndicators || [])];
        indicators.splice(index, 1);
        this.formData.set({ ...current, behaviorIndicators: indicators });
    }

    /**
     * 驗證表單
     */
    validateForm(): boolean {
        const data = this.formData();
        if (!data.code?.trim()) {
            this.error.set('請輸入職能代碼');
            return false;
        }
        if (!data.name?.trim()) {
            this.error.set('請輸入職能名稱');
            return false;
        }
        return true;
    }

    /**
     * 儲存職能
     */
    onSave(): void {
        if (!this.validateForm()) return;

        this.saving.set(true);
        this.error.set(null);

        const data = this.formData();
        const comp = this.competency();

        // 過濾掉空的行為指標
        const cleanedIndicators = (data.behaviorIndicators || []).filter(i => i.trim() !== '');

        const payload: Partial<KSACompetencyItem> = {
            code: data.code,
            name: data.name,
            ksaType: data.ksaType,
            description: data.description,
            behaviorIndicators: cleanedIndicators,
            linkedCourses: data.linkedCourses,
            org_unit_id: this.orgUnitId() || null
        };

        const request$ = this.isEditMode() && comp
            ? this.competencyService.updateKSACompetency(comp.id, payload)
            : this.competencyService.createKSACompetency(payload);

        request$.subscribe({
            next: (result) => {
                this.saving.set(false);
                this.saved.emit(result);
                this.close.emit();
            },
            error: (err) => {
                this.saving.set(false);
                this.error.set(err.message || '儲存失敗，請稍後重試');
            }
        });
    }
}
