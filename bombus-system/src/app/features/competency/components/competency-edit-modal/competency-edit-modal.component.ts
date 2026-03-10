import { Component, ChangeDetectionStrategy, input, output, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompetencyService } from '../../services/competency.service';
import { CoreManagementCompetency, CompetencyLevelIndicator, CompetencyGradeLevel } from '../../models/competency.model';

/**
 * 職能編輯 Modal 元件
 * 用於新增/編輯 核心、管理、專業職能（含 L1-L6 等級行為指標）
 */
@Component({
    selector: 'app-competency-edit-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './competency-edit-modal.component.html',
    styleUrl: './competency-edit-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CompetencyEditModalComponent {
    private competencyService = inject(CompetencyService);

    // Inputs
    visible = input<boolean>(false);
    competency = input<CoreManagementCompetency | null>(null);
    category = input<'core' | 'management' | 'professional'>('core');
    orgUnitId = input<string>('');

    // Outputs
    close = output<void>();
    saved = output<CoreManagementCompetency>();

    // Form state
    formData = signal<Partial<CoreManagementCompetency>>({
        code: '',
        name: '',
        definition: '',
        levels: []
    });

    // UI state
    saving = signal(false);
    error = signal<string | null>(null);
    expandedLevels = signal<Set<CompetencyGradeLevel>>(new Set(['L1']));

    // 等級列表（L1-L6）
    readonly gradeLabels: { level: CompetencyGradeLevel; label: string }[] = [
        { level: 'L1', label: 'L1 (初階)' },
        { level: 'L2', label: 'L2 (資深)' },
        { level: 'L3', label: 'L3 (主管)' },
        { level: 'L4', label: 'L4 (中階)' },
        { level: 'L5', label: 'L5 (高階)' },
        { level: 'L6', label: 'L6 (頂尖)' }
    ];

    // Computed
    isEditMode = computed(() => !!this.competency());
    categoryLabel = computed(() => {
        const labels: Record<string, string> = {
            core: '核心職能',
            management: '管理職能',
            professional: '專業職能'
        };
        return labels[this.category()] || '職能';
    });

    modalTitle = computed(() => {
        const mode = this.isEditMode() ? '編輯' : '新增';
        return `${mode}${this.categoryLabel()}`;
    });

    constructor() {
        // 當 visible 或 competency input 改變時，更新表單資料
        // 需要 allowSignalWrites 因為要在 effect 中寫入 formData 和 expandedLevels
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
                        definition: comp.definition,
                        levels: comp.levels.map(l => ({
                            level: l.level,
                            indicators: [...l.indicators]
                        }))
                    });
                    // 展開有資料的第一個等級
                    const firstLevelWithData = comp.levels.find(l => l.indicators.length > 0);
                    if (firstLevelWithData) {
                        this.expandedLevels.set(new Set([firstLevelWithData.level]));
                    }
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
            definition: '',
            levels: this.gradeLabels.map(g => ({
                level: g.level,
                indicators: []
            }))
        });
        this.error.set(null);
        this.expandedLevels.set(new Set(['L1']));
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
     * 切換等級展開狀態
     */
    toggleLevel(level: CompetencyGradeLevel): void {
        const current = this.expandedLevels();
        const newSet = new Set(current);
        if (newSet.has(level)) {
            newSet.delete(level);
        } else {
            newSet.add(level);
        }
        this.expandedLevels.set(newSet);
    }

    /**
     * 檢查等級是否展開
     */
    isLevelExpanded(level: CompetencyGradeLevel): boolean {
        return this.expandedLevels().has(level);
    }

    /**
     * 取得等級的行為指標
     */
    getLevelIndicators(level: CompetencyGradeLevel): string[] {
        const levels = this.formData().levels || [];
        const found = levels.find(l => l.level === level);
        return found?.indicators || [];
    }

    /**
     * 新增行為指標
     */
    addIndicator(level: CompetencyGradeLevel): void {
        const current = this.formData();
        const levels = (current.levels || []).map(l => {
            if (l.level === level) {
                return {
                    ...l,
                    indicators: [...l.indicators, '']
                };
            }
            return l;
        });
        this.formData.set({ ...current, levels });
    }

    /**
     * 更新行為指標
     */
    updateIndicator(level: CompetencyGradeLevel, index: number, value: string): void {
        const current = this.formData();
        const levels = (current.levels || []).map(l => {
            if (l.level === level) {
                const indicators = [...l.indicators];
                indicators[index] = value;
                return { ...l, indicators };
            }
            return l;
        });
        this.formData.set({ ...current, levels });
    }

    /**
     * 移除行為指標
     */
    removeIndicator(level: CompetencyGradeLevel, index: number): void {
        const current = this.formData();
        const levels = (current.levels || []).map(l => {
            if (l.level === level) {
                const indicators = [...l.indicators];
                indicators.splice(index, 1);
                return { ...l, indicators };
            }
            return l;
        });
        this.formData.set({ ...current, levels });
    }

    /**
     * 更新基本欄位
     */
    updateField(field: 'code' | 'name' | 'definition', value: string): void {
        this.formData.update(current => ({
            ...current,
            [field]: value
        }));
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
        const cat = this.category();
        const comp = this.competency();

        // 過濾掉空的行為指標
        const cleanedLevels = (data.levels || []).map(l => ({
            level: l.level,
            indicators: l.indicators.filter(i => i.trim() !== '')
        }));

        const payload: Partial<CoreManagementCompetency> = {
            code: data.code,
            name: data.name,
            definition: data.definition,
            levels: cleanedLevels,
            org_unit_id: this.orgUnitId() || null
        };

        const request$ = this.isEditMode() && comp
            ? this.competencyService.updateCompetency(cat, comp.id, payload)
            : this.competencyService.createCompetency(cat, payload);

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
