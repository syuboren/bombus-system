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

    // 欄位庫
    fieldLibrary = [
        {
            category: '標準資訊', items: [
                { type: 'text', key: 'user_name', label: '員工姓名', icon: 'ri-user-line' },
                { type: 'text', key: 'user_id', label: '身分證字號', icon: 'ri-id-card-line' },
                { type: 'text', key: 'user_phone', label: '手機號碼', icon: 'ri-phone-line' },
                { type: 'text', key: 'user_email', label: '電子信箱', icon: 'ri-mail-line' },
                { type: 'text', key: 'user_address', label: '地址', icon: 'ri-map-pin-line' }
            ]
        },
        {
            category: '合約變數', items: [
                { type: 'date', key: 'start_date', label: '到職日期', icon: 'ri-calendar-line' },
                { type: 'text', key: 'position', label: '職位', icon: 'ri-briefcase-line' },
                { type: 'text', key: 'department', label: '部門', icon: 'ri-building-line' }
            ]
        },
        {
            category: '簽署元件', items: [
                { type: 'signature', key: 'signature_main', label: '員工簽名', icon: 'ri-edit-line' },
                { type: 'date', key: 'sign_date', label: '簽署日期', icon: 'ri-calendar-check-line' }
            ]
        }
    ];

    private fieldCounter = 0;

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id && id !== 'new') {
            this.templateId.set(id);
            this.loadTemplate(id);
        }
    }

    loadTemplate(id: string): void {
        this.onboardingService.getTemplate(id).subscribe({
            next: (template) => {
                this.templateName.set(template.name);
                this.pdfBase64.set(template.pdf_base64 || null);
                if (template.mapping_config?.fields) {
                    this.fields.set(template.mapping_config.fields);
                    this.fieldCounter = template.mapping_config.fields.length;
                }
                if (template.pdf_base64) {
                    this.pdfLoaded.set(true);
                    // 等待視圖更新後渲染 PDF
                    setTimeout(() => this.renderPdf(template.pdf_base64!), 100);
                }
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
        const fieldId = `field_${++this.fieldCounter}`;
        // 預設放在頁面中間
        const targetPage = this.pages().find(p => p.pageNumber === pageNumber) || this.pages()[0];
        const centerX = (targetPage?.width || 800) / 2 - 50;
        const centerY = (targetPage?.height || 600) / 2 - 12;
        const targetPageNum = targetPage?.pageNumber || 1;

        const newField: CanvasField = {
            id: fieldId,
            key: `${item.key}_${this.fieldCounter}`,
            label: item.label,
            type: item.type,
            is_required: true,
            font_size: 14,
            placements: [
                {
                    page_number: targetPageNum,
                    x: centerX,
                    y: centerY,
                    width: 100,
                    height: 24
                }
            ],
            selected: true
        };

        this.deselectField();
        this.fields.update(fs => [...fs, newField]);
        this.selectedField.set(newField);
    }

    selectField(field: CanvasField): void {
        this.fields.update(fields =>
            fields.map(f => ({ ...f, selected: f.id === field.id }))
        );
        this.selectedField.set(field);
    }

    deselectField(): void {
        this.fields.update(fields =>
            fields.map(f => ({ ...f, selected: false }))
        );
        this.selectedField.set(null);
    }

    deleteField(): void {
        const field = this.selectedField();
        if (!field) return;

        if (confirm('確定要刪除此欄位嗎？')) {
            this.fields.update(fields => fields.filter(f => f.id !== field.id));
            this.deselectField();
        }
    }

    onFieldDragEnd(field: CanvasField, event: DragEvent, pageNumber: number): void {
        // 更新欄位位置
        // 注意：Container 現在是每頁的 .canvas-background
        // 我們需要找到對應頁面的 container

        // 這裡需要透過 event 來找相對座標
        // 簡單解法：因為是在該容器內拖拉，offsetX/Y 可能可以用，但 DragEvent 的 offset 參考點比較複雜

        const target = event.target as HTMLElement;
        const rect = target.getBoundingClientRect();

        // 假設 .canvas-background 是 target 的 offsetParent
        // 但 drag ghost 不一定在 DOM 樹中正確位置

        // 更好的方式：計算滑鼠位置相對於容器的位置
        // event.clientX - container.left

        // 我們在此簡單假設使用者精確放開
        // 但因為 ViewChildren 難以反查特定 DOM
        // 暫時保留原邏輯，但需要獲取正確的 container
        // 這需要 HTML 傳入 container 引用
    }

    // 改良版 Drop Handler (需要在 HTML 實作 drop zone)
    onFieldDrop(event: DragEvent, pageNumber: number): void {
        event.preventDefault();
        const fieldId = event.dataTransfer?.getData('fieldId');
        if (!fieldId) return;

        const field = this.fields().find(f => f.id === fieldId);
        if (!field) return;

        // 計算相對座標
        const container = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const x = event.clientX - container.left;
        const y = event.clientY - container.top;

        this.fields.update(fields => fields.map(f => {
            if (f.id === fieldId) {
                const placement = f.placements[0];
                return {
                    ...f,
                    placements: [{
                        ...placement,
                        page_number: pageNumber,
                        x: x, // 需要校正滑鼠在元素的偏移
                        y: y
                    }]
                };
            }
            return f;
        }));
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

    goBack(): void {
        if (confirm('確定要返回嗎？未儲存的變更將遺失。')) {
            this.router.navigate(['/employee/onboarding/templates']);
        }
    }
}
