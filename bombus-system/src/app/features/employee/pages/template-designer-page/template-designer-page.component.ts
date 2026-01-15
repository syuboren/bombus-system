import { Component, OnInit, inject, signal, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { OnboardingService } from '../../services/onboarding.service';
import { Template, TemplateField, FieldPlacement } from '../../models/onboarding.model';
import * as pdfjsLib from 'pdfjs-dist';

// 設定 Worker Src
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

interface CanvasField extends TemplateField {
    selected?: boolean;
    group?: string; // Checkbox 群組名稱
}

interface PdfPage {
    pageNumber: number;
    width: number;
    height: number;
}

@Component({
    selector: 'app-template-designer-page',
    standalone: true,
    imports: [CommonModule, FormsModule, HeaderComponent],
    templateUrl: './template-designer-page.component.html',
    styleUrl: './template-designer-page.component.scss'
})
export class TemplateDesignerPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private onboardingService = inject(OnboardingService);

    @ViewChildren('pdfCanvas') pdfCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

    // 狀態
    templateId = signal<string | null>(null);
    templateName = signal('新模板');
    pdfBase64 = signal<string | null>(null);
    pdfLoaded = signal(false);
    fields = signal<CanvasField[]>([]);
    pages = signal<PdfPage[]>([]);
    selectedField = signal<CanvasField | null>(null);
    saving = signal(false);
    hasUnsavedChanges = signal(false);
    version = signal(1);

    // 草稿模式狀態
    isDraftMode = signal(false);
    publishingDraft = signal(false);
    deletingDraft = signal(false);

    // 欄位庫
    fieldLibrary = [
        {
            category: '標準資訊 (系統自動帶入)', items: [
                { type: 'text', key: 'user_name', label: '員工姓名', icon: 'ri-user-line', isSystem: true },
                { type: 'text', key: 'user_id', label: '身分證字號', icon: 'ri-id-card-line', isSystem: true },
                { type: 'text', key: 'user_phone', label: '手機號碼', icon: 'ri-phone-line', isSystem: true },
                { type: 'text', key: 'user_email', label: '電子信箱', icon: 'ri-mail-line', isSystem: true },
                { type: 'text', key: 'user_address', label: '地址', icon: 'ri-map-pin-line', isSystem: true }
            ]
        },
        {
            category: '自定義欄位 (合約變數)', items: [
                { type: 'text', key: 'custom_text', label: '單行文字', icon: 'ri-text', isSystem: false },
                { type: 'date', key: 'custom_date', label: '日期欄位', icon: 'ri-calendar-line', isSystem: false },
                { type: 'checkbox', key: 'custom_check', label: '勾選框', icon: 'ri-checkbox-line', isSystem: false }
            ]
        },
        {
            category: '簽署元件', items: [
                { type: 'signature', key: 'signature_main', label: '員工簽名', icon: 'ri-edit-line', isSystem: true },
                { type: 'date', key: 'sign_date', label: '簽署日期', icon: 'ri-calendar-check-line', isSystem: true }
            ]
        }
    ];

    private fieldCounter = 0;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        const mode = this.route.snapshot.queryParamMap.get('mode');

        if (id && id !== 'new') {
            this.templateId.set(id);

            if (mode === 'draft') {
                this.isDraftMode.set(true);
                this.loadDraft(id);
            } else {
                this.loadTemplate(id);
            }
        }
    }

    loadDraft(id: string): void {
        this.onboardingService.getDraft(id).subscribe({
            next: (draft) => {
                this.templateName.set(draft.name + ' (草稿)');
                this.version.set(draft.current_version);
                this.pdfBase64.set(draft.draft_pdf_base64 || null);
                if (draft.draft_mapping_config?.fields) {
                    this.fields.set(draft.draft_mapping_config.fields);
                    this.fieldCounter = draft.draft_mapping_config.fields.length;
                    const maxId = draft.draft_mapping_config.fields.reduce((max: number, f: any) => {
                        const num = parseInt(f.id.split('_')[1] || '0');
                        return num > max ? num : max;
                    }, 0);
                    this.fieldCounter = Math.max(this.fieldCounter, maxId);
                }
                if (this.pdfBase64()) {
                    this.pdfLoaded.set(true);
                    setTimeout(() => this.renderPdf(this.pdfBase64()!), 100);
                }
            },
            error: (err) => {
                console.error('Failed to load draft:', err);
                alert('載入草稿失敗');
                this.router.navigate(['/employee/onboarding/templates']);
            }
        });
    }

    loadTemplate(id: string): void {
        this.onboardingService.getTemplate(id).subscribe({
            next: (template) => {
                this.templateName.set(template.name);
                this.version.set(template.version || 1);
                this.pdfBase64.set(template.pdf_base64 || null);
                if (template.mapping_config?.fields) {
                    this.fields.set(template.mapping_config.fields);
                    this.fieldCounter = template.mapping_config.fields.length;

                    // 若有自定義欄位，更新 counter 以避免 ID 衝突
                    const maxId = template.mapping_config.fields.reduce((max, f) => {
                        const num = parseInt(f.id.split('_')[1] || '0');
                        return num > max ? num : max;
                    }, 0);
                    this.fieldCounter = Math.max(this.fieldCounter, maxId);
                }
                if (template.pdf_base64) {
                    this.pdfLoaded.set(true);
                    // 等待視圖更新後渲染 PDF
                    setTimeout(() => this.renderPdf(template.pdf_base64!), 100);
                }
                this.hasUnsavedChanges.set(false);
            },
            error: (err) => {
                console.error('Failed to load template:', err);
                alert('載入模板失敗');
            }
        });
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            alert('請上傳 PDF 檔案');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            this.pdfBase64.set(base64);
            this.pdfLoaded.set(true);
            setTimeout(() => this.renderPdf(base64), 100);
        };
        reader.readAsDataURL(file);
    }

    async renderPdf(base64: string): Promise<void> {
        try {
            const loadingTask = pdfjsLib.getDocument(base64);
            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            const newPages: PdfPage[] = [];

            // 預先獲取頁面尺寸以設定容器
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                const scale = 1.5;
                const viewport = page.getViewport({ scale });
                newPages.push({
                    pageNumber: i,
                    width: viewport.width,
                    height: viewport.height
                });
            }

            this.pages.set(newPages);

            // 等待視圖更新 (ngFor 渲染 canvas 元素)
            setTimeout(async () => {
                const canvases = this.pdfCanvases.toArray();

                for (let i = 0; i < numPages; i++) {
                    const pageNum = i + 1;
                    const page = await pdf.getPage(pageNum);
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale });

                    const canvas = canvases[i]?.nativeElement;
                    if (canvas) {
                        const context = canvas.getContext('2d');
                        if (context) {
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;

                            const renderContext = {
                                canvasContext: context,
                                viewport: viewport
                            } as any;

                            await page.render(renderContext).promise;
                        }
                    }
                }
            }, 100);

        } catch (error) {
            console.error('Error rendering PDF:', error);
            alert('PDF 渲染失敗');
        }
    }

    getFieldsForPage(pageNumber: number): CanvasField[] {
        // 先過濾出沒有 page_number (舊資料預設第1頁) 或 page_number 相符的欄位
        return this.fields().filter(f => {
            const placement = f.placements?.[0];
            const pPage = placement?.page_number || 1;
            return pPage === pageNumber;
        });
    }

    addFieldToCanvas(item: any, pageNumber: number = 1): void {
        // 預設放在頁面中間
        const targetPage = this.pages().find(p => p.pageNumber === pageNumber) || this.pages()[0];
        const centerX = (targetPage?.width || 800) / 2 - 50;
        const centerY = (targetPage?.height || 600) / 2 - 12;
        const targetPageNum = targetPage?.pageNumber || 1;

        this.createFieldOnCanvas(item, targetPageNum, centerX, centerY);
    }

    selectField(field: CanvasField): void {
        const currentFields = this.fields();
        // 1. 更新選取狀態 (immutable update)
        const updatedFields = currentFields.map(f => ({ ...f, selected: f.id === field.id }));
        this.fields.set(updatedFields);

        // 2. 設定選取物件為新陣列中的對應物件，確保引用一致
        const newSelected = updatedFields.find(f => f.id === field.id) || null;
        this.selectedField.set(newSelected);
    }

    deselectField(): void {
        this.fields.update(fields =>
            fields.map(f => ({ ...f, selected: false }))
        );
        this.selectedField.set(null);
    }

    // 新增：統一處理屬性變更，解決狀態不同步問題
    updateFieldProperty(key: keyof CanvasField, value: any): void {
        const selected = this.selectedField();
        if (!selected) return;

        this.fields.update(fields => fields.map(f => {
            if (f.id === selected.id) {
                return { ...f, [key]: value };
            }
            return f;
        }));

        // 更新 selectedField 引用
        const updatedFields = this.fields();
        const newSelected = updatedFields.find(f => f.id === selected.id) || null;
        this.selectedField.set(newSelected);

        this.hasUnsavedChanges.set(true);
    }

    deleteField(): void {
        const field = this.selectedField();
        if (!field) return;

        if (confirm('確定要刪除此欄位嗎？')) {
            this.fields.update(fields => fields.filter(f => f.id !== field.id));
            this.deselectField();
        }
        this.hasUnsavedChanges.set(true);
    }

    // ... (drag handlers unchanged) ...
    // 拖放相關狀態
    private dragOffsetX = 0;
    private dragOffsetY = 0;
    onLibraryDragStart(event: DragEvent, item: any): void {
        event.dataTransfer?.setData('libraryItem', JSON.stringify(item));
        event.dataTransfer!.effectAllowed = 'copy';
    }

    // 處理畫布上欄位拖曳開始
    onFieldDragStart(event: DragEvent, field: CanvasField): void {
        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();
        this.dragOffsetX = event.clientX - rect.left;
        this.dragOffsetY = event.clientY - rect.top;

        event.dataTransfer?.setData('fieldId', field.id);
        event.dataTransfer!.effectAllowed = 'move';

        // 使用重構後的 selectField
        this.selectField(field);
    }

    // ... (onFieldDrop uses createFieldOnCanvas, logic holds) ...

    onFieldDrop(event: DragEvent, pageNumber: number): void {
        event.preventDefault();

        const container = (event.currentTarget as HTMLElement).getBoundingClientRect();

        // 情況 1: 從欄位庫新增 (Copy)
        const libraryItemJson = event.dataTransfer?.getData('libraryItem');
        if (libraryItemJson) {
            const item = JSON.parse(libraryItemJson);

            // 計算放置位置 (置中於滑鼠指標)
            const x = event.clientX - container.left - 50;
            const y = event.clientY - container.top - 12;

            // 確保不超出邊界
            const targetPage = this.pages().find(p => p.pageNumber === pageNumber);
            const maxX = (targetPage?.width || 800) - 100;
            const maxY = (targetPage?.height || 600) - 24;

            const clampedX = Math.max(0, Math.min(x, maxX));
            const clampedY = Math.max(0, Math.min(y, maxY));

            this.createFieldOnCanvas(item, pageNumber, clampedX, clampedY);
            // createFieldOnCanvas sets unsaved changes
            return;
        }

        // 情況 2: 移動現有欄位 (Move)
        const fieldId = event.dataTransfer?.getData('fieldId');
        if (fieldId) {
            const field = this.fields().find(f => f.id === fieldId);
            if (!field) return;

            const x = event.clientX - container.left - this.dragOffsetX;
            const y = event.clientY - container.top - this.dragOffsetY;

            const maxX = container.width - (field.placements[0]?.width || 100);
            const maxY = container.height - (field.placements[0]?.height || 24);
            const clampedX = Math.max(0, Math.min(x, maxX));
            const clampedY = Math.max(0, Math.min(y, maxY));

            this.fields.update(fields => fields.map(f => {
                if (f.id === fieldId) {
                    const placement = f.placements[0];
                    return {
                        ...f,
                        placements: [{
                            ...placement,
                            page_number: pageNumber,
                            x: clampedX,
                            y: clampedY
                        }]
                    };
                }
                return f;
            }));

            // 更新選取狀態的引用
            this.selectField(field);
            this.hasUnsavedChanges.set(true);
        }
    }

    createFieldOnCanvas(item: any, pageNumber: number, x: number, y: number): void {
        this.fieldCounter++;
        const fieldId = `field_${this.fieldCounter}`;

        // 如果是自定義欄位，生成唯一 Key
        let key = item.key;
        let label = item.label;

        if (!item.isSystem) {
            key = `${item.key}_${this.fieldCounter}`;
            label = `${item.label}_${this.fieldCounter}`;
        }

        // 預設尺寸：如果是勾選框則為方形
        const defaultWidth = item.type === 'checkbox' ? 24 : 100;
        const defaultHeight = item.type === 'checkbox' ? 24 : 24;

        const newField: CanvasField = {
            id: fieldId,
            key: key,
            label: label,
            type: item.type,
            is_required: true,
            font_size: 14,
            placements: [
                {
                    page_number: pageNumber,
                    x: x,
                    y: y,
                    width: defaultWidth,
                    height: defaultHeight
                }
            ],
            selected: true
        };

        this.deselectField();
        this.fields.update(fs => [...fs, newField]);
        this.selectedField.set(newField);
        this.hasUnsavedChanges.set(true);
    }

    // 處理欄位縮放 (透過 CSS resize 觸發)
    onFieldResize(event: MouseEvent, field: CanvasField): void {
        const target = event.target as HTMLElement;
        // 只有當目標是欄位本身時才處理（避免子元素觸發）
        if (target.classList.contains('canvas-field')) {
            const newWidth = target.offsetWidth;
            const newHeight = target.offsetHeight;

            // 如果尺寸有變更
            if (field.placements[0].width !== newWidth || field.placements[0].height !== newHeight) {
                this.fields.update(fields => fields.map(f => {
                    if (f.id === field.id) {
                        const placement = f.placements[0];
                        return {
                            ...f,
                            placements: [{
                                ...placement,
                                width: newWidth,
                                height: newHeight
                            }]
                        };
                    }
                    return f;
                }));

                // 更新選取狀態的引用
                const selected = this.selectedField();
                if (selected && selected.id === field.id) {
                    const currentFields = this.fields();
                    const newSelected = currentFields.find(f => f.id === field.id) || null;
                    this.selectedField.set(newSelected);
                }

                this.hasUnsavedChanges.set(true);
            }
        }
    }

    saveTemplate(): void {
        const name = this.templateName();
        if (!name.trim()) {
            alert('請輸入模板名稱');
            return;
        }

        this.saving.set(true);

        const data = {
            name,
            pdf_base64: this.pdfBase64() || undefined,
            mapping_config: { fields: this.fields() }
        };

        const request = this.templateId()
            ? this.onboardingService.updateTemplate(this.templateId()!, data)
            : this.onboardingService.createTemplate(data);

        request.subscribe({
            next: (template) => {
                this.saving.set(false);
                this.hasUnsavedChanges.set(false); // 修正：儲存成功後重置 dirty 狀態
                alert('模板已儲存');
                if (!this.templateId()) {
                    this.router.navigate(['/employee/onboarding/templates', template.id]);
                }
            },
            error: (err) => {
                this.saving.set(false);
                console.error('Failed to save template:', err);
                alert('儲存失敗');
            }
        });
    }


    updateTemplateName(name: string): void {
        this.templateName.set(name);
        this.hasUnsavedChanges.set(true);
    }

    goBack(): void {
        if (this.hasUnsavedChanges()) {
            if (confirm('確定要返回嗎？未儲存的變更將遺失。')) {
                this.router.navigate(['/employee/onboarding/templates']);
            }
        } else {
            this.router.navigate(['/employee/onboarding/templates']);
        }
    }

    // ==================== 草稿操作 ====================

    saveDraftChanges(): void {
        const id = this.templateId();
        if (!id) return;

        this.saving.set(true);
        this.onboardingService.saveDraft(id, {
            pdf_base64: this.pdfBase64() || undefined,
            mapping_config: { fields: this.fields() }
        }).subscribe({
            next: () => {
                this.saving.set(false);
                this.hasUnsavedChanges.set(false);
                alert('草稿已儲存');
            },
            error: (err) => {
                this.saving.set(false);
                console.error('Failed to save draft:', err);
                alert('儲存草稿失敗');
            }
        });
    }

    publishDraft(): void {
        const id = this.templateId();
        if (!id) return;

        if (this.hasUnsavedChanges()) {
            alert('請先儲存草稿後再發布');
            return;
        }

        if (!confirm('確定要發布此草稿為正式版本嗎？')) {
            return;
        }

        this.publishingDraft.set(true);
        this.onboardingService.publishDraft(id).subscribe({
            next: (response) => {
                this.publishingDraft.set(false);
                alert(`發布成功！目前版本為 v${response.version}`);
                this.router.navigate(['/employee/onboarding/templates']);
            },
            error: (err) => {
                this.publishingDraft.set(false);
                console.error('Failed to publish draft:', err);
                alert('發布失敗：' + (err.error?.error || '未知錯誤'));
            }
        });
    }

    deleteDraft(): void {
        const id = this.templateId();
        if (!id) return;

        if (!confirm('確定要刪除此草稿嗎？所有變更將遺失。')) {
            return;
        }

        this.deletingDraft.set(true);
        this.onboardingService.deleteDraft(id).subscribe({
            next: () => {
                this.deletingDraft.set(false);
                alert('草稿已刪除');
                this.router.navigate(['/employee/onboarding/templates']);
            },
            error: (err) => {
                this.deletingDraft.set(false);
                console.error('Failed to delete draft:', err);
                alert('刪除草稿失敗');
            }
        });
    }
}
