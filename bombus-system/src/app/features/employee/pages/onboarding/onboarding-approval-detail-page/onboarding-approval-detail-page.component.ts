import { Component, OnInit, inject, signal, ViewChild, ElementRef, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../shared/components/header/header.component';
import { OnboardingService } from '../../../services/onboarding.service';
import * as pdfjsLib from 'pdfjs-dist';

// Set Worker Src
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

interface PdfPage {
    pageNumber: number;
    width: number;
    height: number;
}

@Component({
    selector: 'app-onboarding-approval-detail-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
    templateUrl: './onboarding-approval-detail-page.component.html',
    styleUrl: './onboarding-approval-detail-page.component.scss'
})
export class OnboardingApprovalDetailPageComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private onboardingService = inject(OnboardingService);

    @ViewChildren('pdfCanvas') pdfCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

    loading = signal(true);
    submission = signal<any>(null);

    // PDF Preview State
    pdfBase64 = signal<string | null>(null);
    pages = signal<PdfPage[]>([]);
    formFields = signal<any[]>([]);

    // Approval Action State
    actionNote = signal('');
    processingAction = signal(false);
    showRejectDialog = signal(false);

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadDetail(id);
        } else {
            alert('無效的 ID');
            this.router.navigate(['/employee/onboarding'], { queryParams: { tab: 'approval' } });
        }
    }

    loadDetail(id: string): void {
        this.loading.set(true);
        this.onboardingService.getSubmissionDetail(id).subscribe({
            next: (detail) => {
                this.submission.set(detail);

                // Set PDF and Fields
                if (detail.template_pdf) {
                    this.pdfBase64.set(detail.template_pdf);
                    setTimeout(() => this.renderPdf(detail.template_pdf), 100);
                }

                if (detail.template_mapping?.fields) {
                    this.formFields.set(detail.template_mapping.fields);
                }

                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load detail:', err);
                alert('無法載入詳細資料');
                this.router.navigate(['/employee/onboarding'], { queryParams: { tab: 'approval' } });
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
                const scale = 1.5; // Match 1.5x scale
                const viewport = page.getViewport({ scale });
                newPages.push({
                    pageNumber: i,
                    width: viewport.width,
                    height: viewport.height
                });
            }
            this.pages.set(newPages);

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

    approve(): void {
        const sub = this.submission();
        if (!sub) return;

        if (!confirm('確定要核准此文件嗎？')) return;

        this.processingAction.set(true);
        const approverId = 'MGR001'; // Mock ID

        this.onboardingService.approveSubmission(sub.id, {
            approver_id: approverId,
            approval_note: this.actionNote()
        }).subscribe({
            next: () => {
                this.processingAction.set(false);
                alert('已核准');
                this.router.navigate(['/employee/onboarding'], { queryParams: { tab: 'approval' } });
            },
            error: (err) => {
                this.processingAction.set(false);
                console.error('Failed to approve:', err);
                alert('核准失敗');
            }
        });
    }

    openRejectDialog(): void {
        this.actionNote.set('');
        this.showRejectDialog.set(true);
    }

    confirmReject(): void {
        const sub = this.submission();
        if (!sub) return;

        if (!this.actionNote().trim()) {
            alert('請輸入退回原因');
            return;
        }

        this.processingAction.set(true);
        const approverId = 'MGR001';

        this.onboardingService.rejectSubmission(sub.id, {
            approver_id: approverId,
            approval_note: this.actionNote()
        }).subscribe({
            next: () => {
                this.processingAction.set(false);
                alert('已退回');
                this.router.navigate(['/employee/onboarding'], { queryParams: { tab: 'approval' } });
            },
            error: (err) => {
                this.processingAction.set(false);
                console.error('Failed to reject:', err);
                alert('退回失敗');
            }
        });
    }

    // Helpers
    getFieldsForPage(pageNumber: number): any[] {
        return this.formFields().filter(f =>
            f.placements?.some((p: any) => p.page_number === pageNumber)
        );
    }

    getPlacementForPage(field: any, pageNumber: number) {
        return field.placements?.find((p: any) => p.page_number === pageNumber);
    }

    getFieldValue(field: any): string {
        return this.submission()?.form_data?.[field.key] || '';
    }

    formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }
}
