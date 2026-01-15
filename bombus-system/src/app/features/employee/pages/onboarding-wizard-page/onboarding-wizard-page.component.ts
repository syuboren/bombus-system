/**
 * Onboarding Wizard Page
 * 員工入職填寫精靈 - 三階段流程
 * 步驟1：閱讀文件 + 填寫資料（左右分割）
 * 步驟2：預覽最終成果
 * 步驟3：電子簽署
 */

import { Component, OnInit, inject, signal, computed, ViewChild, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OnboardingService } from '../../services/onboarding.service';
import { SignaturePadComponent } from '../../components/signature-pad/signature-pad.component';
import * as pdfjsLib from 'pdfjs-dist';

// 設定 Worker Src
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

interface FormField {
    key: string;
    label: string;
    type: string;
    required: boolean;
    font_size?: number; // 新增字體大小
    group?: string; // Checkbox 群組名稱
    placements: Array<{ page_number: number; x: number; y: number; width: number; height: number }>;
}

interface PdfPage {
    pageNumber: number;
    width: number;
    height: number;
}

@Component({
    selector: 'app-onboarding-wizard-page',
    standalone: true,
    imports: [CommonModule, FormsModule, SignaturePadComponent],
    templateUrl: './onboarding-wizard-page.component.html',
    styleUrl: './onboarding-wizard-page.component.scss'
})
export class OnboardingWizardPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private onboardingService = inject(OnboardingService);

    @ViewChild(SignaturePadComponent) signaturePad!: SignaturePadComponent;
    @ViewChildren('pdfCanvas') pdfCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

    // 狀態
    token = signal<string>('');
    templateName = signal('');
    pdfBase64 = signal<string | null>(null);
    formFields = signal<FormField[]>([]);
    signatureFields = signal<FormField[]>([]);
    pages = signal<PdfPage[]>([]);

    loading = signal(true);
    error = signal<string | null>(null);
    currentPhase = signal<'form' | 'preview' | 'sign'>('form');
    formData = signal<Record<string, any>>({});
    submitting = signal(false);
    completed = signal(false);
    agreedTerms = signal(false);
    highlightedField = signal<string | null>(null);
    status = signal<'DRAFT' | 'SIGNED' | 'COMPLETED'>('DRAFT');

    // 計算屬性
    pdfLoaded = computed(() => this.pages().length > 0);

    ngOnInit(): void {
        const token = this.route.snapshot.paramMap.get('token');
        if (token) {
            this.token.set(token);
            this.loadData(token);
        } else {
            this.error.set('無效的簽署連結');
            this.loading.set(false);
        }
    }

    loadData(token: string): void {
        this.onboardingService.getSignSchema(token).subscribe({
            next: (data: any) => {
                this.templateName.set(data.template_name);
                this.formFields.set(data.form_fields || []);
                this.signatureFields.set(data.signature_fields || []);
                this.status.set(data.status || 'DRAFT');

                if (data.form_data) {
                    this.formData.set(data.form_data);
                }

                if (data.pdf_base64) {
                    this.pdfBase64.set(data.pdf_base64);
                    // 延遲渲染 PDF
                    setTimeout(() => this.renderPdf(data.pdf_base64), 100);
                }

                // 如果已簽署，直接進入預覽模式 (Read Only)
                if (data.status === 'SIGNED' || data.status === 'COMPLETED') {
                    this.currentPhase.set('preview');
                }

                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load data:', err);
                this.error.set(err.error?.error || '無法載入簽署文件');
                this.loading.set(false);
            }
        });
    }

    async renderPdf(base64: string): Promise<void> {
        try {
            const loadingTask = pdfjsLib.getDocument(base64);
            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            const newPages: PdfPage[] = [];
            for (let i = 1; i <= numPages; i++) {
                const page = await pdf.getPage(i);
                // 使用與 Template Designer 相同的縮放比例，確保欄位位置正確
                const scale = 1.5;
                const viewport = page.getViewport({ scale });
                newPages.push({
                    pageNumber: i,
                    width: viewport.width,
                    height: viewport.height
                });
            }
            this.pages.set(newPages);

            // 等待 DOM 更新後渲染
            setTimeout(async () => {
                const canvases = this.pdfCanvases.toArray();
                for (let i = 0; i < numPages; i++) {
                    const page = await pdf.getPage(i + 1);
                    const scale = 1.5;
                    const viewport = page.getViewport({ scale });
                    const canvas = canvases[i]?.nativeElement;
                    if (canvas) {
                        const context = canvas.getContext('2d');
                        if (context) {
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({
                                canvasContext: context,
                                viewport: viewport
                            } as any).promise;
                        }
                    }
                }
            }, 100);
        } catch (error) {
            console.error('Error rendering PDF:', error);
        }
    }

    updateField(key: string, value: any): void {
        this.formData.update(data => {
            const newData = { ...data, [key]: value };

            // 實作 Checkbox 群組互斥邏輯 (Radio Button 行為)
            if (value === true) { // 只有當勾選時才觸發互斥
                const currentField = this.formFields().find(f => f.key === key);
                if (currentField && currentField.group) {
                    // 找出同群組的其他欄位
                    const groupFields = this.formFields().filter(f =>
                        f.group === currentField.group && f.key !== key
                    );
                    // 將同群組其他欄位設為 false
                    groupFields.forEach(f => {
                        newData[f.key] = false;
                    });
                }
            }
            return newData;
        });
    }

    // 觸發 PDF 重渲染 (等待 DOM 更新後)
    private requestRenderPdf(): void {
        if (this.pdfBase64()) {
            // setTimeout 確保 DOM 元素 (canvas) 已被 Angular 重新建立
            setTimeout(() => this.renderPdf(this.pdfBase64()!), 100);
        }
    }

    // 進入預覽階段
    goToPreview(): void {
        if (!this.validateFormFields()) return;
        this.currentPhase.set('preview');
        this.requestRenderPdf();
    }

    // 進入簽署階段
    goToSign(): void {
        this.currentPhase.set('sign');
        // 簽署頁面不需要 PDF 渲染，但如果有預覽區塊則需要
    }

    // 返回填寫階段
    backToForm(): void {
        this.currentPhase.set('form');
        this.requestRenderPdf();
    }

    // 返回預覽階段
    backToPreview(): void {
        this.currentPhase.set('preview');
        this.requestRenderPdf();
    }

    validateFormFields(): boolean {
        const fields = this.formFields();
        const data = this.formData();

        // 1. 找出所有獨立的必填欄位 (沒有 group 且 required = true)
        const standaloneRequired = fields.filter(f => !f.group && f.required);
        for (const field of standaloneRequired) {
            const value = data[field.key];
            if (!value || value.toString().trim() === '') {
                alert(`請填寫「${field.label}」`);
                return false;
            }
        }

        // 2. 找出所有有 group 的欄位，並按 group 分組
        const groupedFields = fields.filter(f => f.group);
        const groups = new Set(groupedFields.map(f => f.group!));

        for (const groupName of groups) {
            // 取得該群組的所有欄位
            const groupMembers = groupedFields.filter(f => f.group === groupName);

            // 檢查該群組是否設定為必填 (只要其中有一個是必填，整個群組就視為必填)
            const isGroupRequired = groupMembers.some(f => f.required);

            if (isGroupRequired) {
                // 檢查群組中是否至少有一個欄位被勾選 (值為 true)
                const hasSelection = groupMembers.some(f => data[f.key] === true);

                if (!hasSelection) {
                    // 取第一個欄位的 label 作為提示
                    const firstLabel = groupMembers[0].label;
                    alert(`請在「${groupName}」群組中選擇一個項目 (例如: ${firstLabel})`);
                    return false;
                }
            }
        }

        return true;
    }

    clearSignature(): void {
        this.signaturePad?.clear();
    }

    submit(): void {
        if (!this.agreedTerms()) {
            alert('請先勾選同意條款');
            return;
        }

        if (this.signaturePad?.isEmpty()) {
            alert('請完成簽名');
            return;
        }

        this.submitting.set(true);

        const signatureBase64 = this.signaturePad?.toDataURL();

        const data = {
            form_data: this.formData(),
            signature_base64: signatureBase64 || undefined
        };

        this.onboardingService.submitSignature(this.token(), data).subscribe({
            next: () => {
                this.submitting.set(false);
                this.completed.set(true);
            },
            error: (err) => {
                this.submitting.set(false);
                console.error('Failed to submit:', err);
                alert(err.error?.error || '提交失敗，請稍後再試');
            }
        });
    }

    // 取得欄位在頁面上的填入值（用於預覽）
    getFieldValue(field: FormField): string {
        return this.formData()[field.key] || '';
    }

    // 取得特定頁面的欄位
    getFieldsForPage(pageNumber: number): FormField[] {
        return this.formFields().filter(f =>
            f.placements?.some(p => p.page_number === pageNumber)
        );
    }

    // 取得欄位在特定頁面的位置
    getPlacementForPage(field: FormField, pageNumber: number) {
        return field.placements?.find(p => p.page_number === pageNumber);
    }

    // 高亮欄位（左右同步）
    highlightField(fieldKey: string | null): void {
        this.highlightedField.set(fieldKey);
    }

    // 點擊 PDF 上的欄位時聚焦對應的輸入框
    focusField(fieldKey: string): void {
        const element = document.getElementById('field-' + fieldKey);
        if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 當表單欄位獲得焦點時，捲動 PDF 到對應位置
    scrollToPdfField(fieldKey: string): void {
        const element = document.getElementById('overlay-' + fieldKey);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // 取得欄位的索引（用於顯示編號）
    getFieldIndex(field: FormField): number {
        return this.formFields().findIndex(f => f.key === field.key);
    }
}
