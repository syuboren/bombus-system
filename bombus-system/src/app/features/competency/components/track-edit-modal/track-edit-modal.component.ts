import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeTrackEntity } from '../../models/competency.model';
import { CompetencyService } from '../../services/competency.service';

/**
 * 軌道編輯 Modal 元件
 * 支援新增/編輯軌道（管理職、專業職、自訂軌道等）
 */
@Component({
    selector: 'app-track-edit-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './track-edit-modal.component.html',
    styleUrls: ['./track-edit-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrackEditModalComponent {
    private competencyService = inject(CompetencyService);

    // --- Input / Output ---
    visible = input<boolean>(false);
    trackData = input<GradeTrackEntity | null>(null);
    maxGradeLimit = input<number>(7);
    closed = output<void>();
    saved = output<void>();

    // --- 表單狀態 ---
    saving = signal(false);
    error = signal<string | null>(null);

    // 表單資料（可編輯的複本）
    formData = signal<Partial<GradeTrackEntity>>({
        code: '',
        name: '',
        icon: 'ri-briefcase-line',
        color: '#6B7B8D',
        maxGrade: 7,
        sortOrder: 0
    });

    // 是否為編輯模式
    isEditMode = signal(false);
    private _initialSnapshot = '';

    // 預設圖示選項
    iconOptions = [
        { icon: 'ri-briefcase-line', label: '公事包' },
        { icon: 'ri-code-s-slash-line', label: '程式碼' },
        { icon: 'ri-microscope-line', label: '顯微鏡' },
        { icon: 'ri-user-star-line', label: '專家' },
        { icon: 'ri-lightbulb-line', label: '創意' },
        { icon: 'ri-shield-star-line', label: '安全' },
        { icon: 'ri-line-chart-line', label: '趨勢' },
        { icon: 'ri-team-line', label: '團隊' },
        { icon: 'ri-tools-line', label: '工具' },
        { icon: 'ri-book-open-line', label: '書本' }
    ];

    // 預設顏色選項（Morandi 色系）
    colorOptions = [
        '#6B7B8D', '#8B9DAF', '#7B8FA3', '#A3917B',
        '#8BA88B', '#9B7B8B', '#7B9B9B', '#A39B7B',
        '#8B7BA3', '#7BA38B'
    ];

    constructor() {
        // 當 visible 或 trackData 改變時，同步表單資料
        effect(() => {
            const isVisible = this.visible();
            const data = this.trackData();
            if (isVisible && data) {
                this.isEditMode.set(true);
                this.formData.set({
                    code: data.code,
                    name: data.name,
                    icon: data.icon || 'ri-briefcase-line',
                    color: data.color || '#6B7B8D',
                    maxGrade: data.maxGrade || 7,
                    sortOrder: data.sortOrder || 0
                });
                untracked(() => { this._initialSnapshot = this._captureSnapshot(); });
            } else if (isVisible && !data) {
                this.isEditMode.set(false);
                this.resetForm();
                untracked(() => { this._initialSnapshot = this._captureSnapshot(); });
            }
            this.error.set(null);
        }, { allowSignalWrites: true });
    }

    // 重置表單為預設值
    resetForm(): void {
        this.formData.set({
            code: '',
            name: '',
            icon: 'ri-briefcase-line',
            color: '#6B7B8D',
            maxGrade: 7,
            sortOrder: 0
        });
    }

    private _captureSnapshot(): string {
        return JSON.stringify(this.formData());
    }

    private hasUnsavedChanges(): boolean {
        return this._initialSnapshot !== '' && this._captureSnapshot() !== this._initialSnapshot;
    }

    // 關閉 Modal
    onClose(): void {
        if (this.saving()) return;
        if (this.hasUnsavedChanges() && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
        this.resetForm();
        this.error.set(null);
        this.closed.emit();
    }

    // 更新表單欄位
    updateField(field: keyof GradeTrackEntity, value: any): void {
        this.formData.update(prev => ({ ...prev, [field]: value }));
    }

    // 選擇圖示
    selectIcon(icon: string): void {
        this.formData.update(prev => ({ ...prev, icon }));
    }

    // 選擇顏色
    selectColor(color: string): void {
        this.formData.update(prev => ({ ...prev, color }));
    }

    // 驗證表單
    validateForm(): boolean {
        const data = this.formData();
        if (!data.code?.trim()) {
            this.error.set('軌道代碼為必填');
            return false;
        }
        if (!data.name?.trim()) {
            this.error.set('軌道名稱為必填');
            return false;
        }
        const limit = this.maxGradeLimit();
        if (!data.maxGrade || data.maxGrade < 1 || data.maxGrade > limit) {
            this.error.set(`最高職等必須在 1-${limit} 之間`);
            return false;
        }
        return true;
    }

    // 儲存軌道
    onSave(): void {
        if (!this.validateForm()) return;
        this.saving.set(true);
        this.error.set(null);

        const data = this.formData();
        const trackData = this.trackData();

        const observable = this.isEditMode() && trackData
            ? this.competencyService.updateTrack(trackData.id, data)
            : this.competencyService.createTrack(data);

        observable.subscribe({
            next: () => {
                this.saving.set(false);
                this._initialSnapshot = '';
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
