import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GradeTrackEntity } from '../../models/competency.model';
import { CompetencyService } from '../../services/competency.service';

/**
 * 部門職位編輯 Modal 元件
 * 支援新增/編輯部門職位（含動態軌道選擇）
 */
@Component({
    selector: 'app-position-edit-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './position-edit-modal.component.html',
    styleUrls: ['./position-edit-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PositionEditModalComponent {
    private competencyService = inject(CompetencyService);

    // --- Input / Output ---
    visible = input<boolean>(false);
    positionData = input<any>(null);
    closed = output<void>();
    saved = output<void>();

    // --- 表單狀態 ---
    saving = signal(false);
    error = signal<string | null>(null);
    isEditMode = signal(false);

    // 下拉選單資料（動態載入）
    departments = signal<{ id: string; name: string; code: string }[]>([]);
    tracks = signal<GradeTrackEntity[]>([]);
    gradeOptions = signal<number[]>([1, 2, 3, 4, 5, 6, 7]);

    // 表單資料
    formData = signal<{
        department: string;
        grade: number;
        title: string;
        track: string;
        supervisedDepartments: string[] | null;
    }>({
        department: '',
        grade: 1,
        title: '',
        track: 'professional',
        supervisedDepartments: null
    });

    constructor() {
        // 當 visible 變為 true 時，載入下拉選單資料
        effect(() => {
            if (this.visible()) {
                this.loadDropdownData();
            }
        });

        // 當 positionData 改變時，同步表單
        effect(() => {
            const isVisible = this.visible();
            const data = this.positionData();
            if (isVisible && data) {
                this.isEditMode.set(true);
                this.formData.set({
                    department: data.department || '',
                    grade: data.grade || 1,
                    title: data.title || '',
                    track: data.track || 'professional',
                    supervisedDepartments: data.supervisedDepartments || null
                });
            } else if (isVisible && !data) {
                this.isEditMode.set(false);
                this.resetForm();
            }
            this.error.set(null);
        }, { allowSignalWrites: true });
    }

    // 載入部門與軌道下拉資料
    private loadDropdownData(): void {
        this.competencyService.getDepartments().subscribe(depts => this.departments.set(depts));
        this.competencyService.getTracks().subscribe(tracks => this.tracks.set(tracks.filter(t => t.isActive)));
    }

    resetForm(): void {
        this.formData.set({ department: '', grade: 1, title: '', track: 'professional', supervisedDepartments: null });
    }

    onClose(): void {
        if (!this.saving()) { this.resetForm(); this.error.set(null); this.closed.emit(); }
    }

    updateField(field: string, value: any): void {
        this.formData.update(prev => ({ ...prev, [field]: value }));
    }

    // 管轄部門（文字輸入轉陣列）
    updateSupervisedDepts(value: string): void {
        const depts = value ? value.split(',').map(d => d.trim()).filter(d => d) : null;
        this.formData.update(prev => ({ ...prev, supervisedDepartments: depts }));
    }

    getSupervisedDeptsString(): string {
        return this.formData().supervisedDepartments?.join(', ') || '';
    }

    validateForm(): boolean {
        const data = this.formData();
        if (!data.department) { this.error.set('部門為必填'); return false; }
        if (!data.title?.trim()) { this.error.set('職位名稱為必填'); return false; }
        if (!data.track) { this.error.set('軌道為必填'); return false; }
        return true;
    }

    onSave(): void {
        if (!this.validateForm()) return;
        this.saving.set(true);
        this.error.set(null);

        const data = this.formData();
        const posData = this.positionData();

        const observable = this.isEditMode() && posData
            ? this.competencyService.updatePosition(posData.id, data)
            : this.competencyService.createPosition(data);

        observable.subscribe({
            next: () => { this.saving.set(false); this.saved.emit(); this.onClose(); },
            error: (err) => { this.saving.set(false); this.error.set(err?.error?.error?.message || '儲存失敗'); }
        });
    }
}
