import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../shared/components/header/header.component';
import { OnboardingService } from '../../../services/onboarding.service';
import { TemplateListItem, Submission, CreateSignLinkResponse } from '../../../models/onboarding.model';

@Component({
    selector: 'app-onboarding-templates-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
    templateUrl: './onboarding-templates-page.component.html',
    styleUrl: './onboarding-templates-page.component.scss'
})
export class OnboardingTemplatesPageComponent implements OnInit {
    private onboardingService = inject(OnboardingService);
    private router = inject(Router);

    templates = signal<TemplateListItem[]>([]);
    loading = signal(true);

    // 篩選狀態
    searchQuery = signal('');
    statusFilter = signal('');

    // 過濾後的模板列表
    filteredTemplates = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        const status = this.statusFilter();

        return this.templates().filter(t => {
            const matchesQuery = !query || t.name.toLowerCase().includes(query);
            const matchesStatus = !status ||
                (status === 'active' && t.is_active) ||
                (status === 'inactive' && !t.is_active);

            return matchesQuery && matchesStatus;
        });
    });

    // 簽署連結對話框狀態
    showLinkDialog = signal(false);
    linkDialogLoading = signal(false);
    generatedLink = signal<CreateSignLinkResponse | null>(null);
    linkCopied = signal(false);
    newLinkEmployeeName = signal('');
    newLinkEmployeeEmail = signal('');
    selectedTemplateId = signal<string | null>(null);

    // 提交記錄對話框狀態
    showSubmissionsDialog = signal(false);
    submissions = signal<Submission[]>([]);
    submissionsLoading = signal(false);
    selectedTemplateName = signal('');

    ngOnInit(): void {
        this.loadTemplates();
    }

    loadTemplates(): void {
        this.loading.set(true);
        this.onboardingService.getTemplates().subscribe({
            next: (templates) => {
                this.templates.set(templates);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load templates:', err);
                this.loading.set(false);
            }
        });
    }

    deleteTemplate(id: string, event: Event): void {
        event.stopPropagation();
        if (confirm('確定要刪除此模板嗎？')) {
            this.onboardingService.deleteTemplate(id).subscribe({
                next: () => {
                    this.loadTemplates();
                },
                error: (err) => {
                    console.error('Failed to delete template:', err);
                    alert('刪除失敗');
                }
            });
        }
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatDateTime(dateStr: string): string {
        return new Date(dateStr).toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    navigateToTemplate(id: string): void {
        this.router.navigate(['/employee/onboarding/templates', id]);
    }

    // ==================== 簽署連結功能 (已移除) ====================
    // Future: 員工登入後自動看到待辦事項，無需 HR 手動產生連結
    // 連結生成相關程式碼已移除

    // ==================== 提交記錄功能 ====================

    openSubmissionsDialog(template: TemplateListItem, event: Event): void {
        event.stopPropagation();
        this.selectedTemplateId.set(template.id);
        this.selectedTemplateName.set(template.name);
        this.submissions.set([]);
        this.showSubmissionsDialog.set(true);
        this.loadSubmissions(template.id);
    }

    closeSubmissionsDialog(): void {
        this.showSubmissionsDialog.set(false);
    }

    loadSubmissions(templateId: string): void {
        this.submissionsLoading.set(true);
        this.onboardingService.getSubmissions(templateId).subscribe({
            next: (submissions) => {
                this.submissions.set(submissions);
                this.submissionsLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load submissions:', err);
                this.submissionsLoading.set(false);
            }
        });
    }

    getStatusText(status: string): string {
        const statusMap: Record<string, string> = {
            'DRAFT': '待簽署',
            'SIGNED': '已簽署',
            'COMPLETED': '已完成'
        };
        return statusMap[status] || status;
    }

    getStatusClass(status: string): string {
        const classMap: Record<string, string> = {
            'DRAFT': 'status--draft',
            'SIGNED': 'status--signed',
            'COMPLETED': 'status--completed'
        };
        return classMap[status] || '';
    }

    viewSubmission(token: string): void {
        const url = this.router.serializeUrl(
            this.router.createUrlTree(['/employee/onboarding/sign', token])
        );
        window.open(url, '_blank');
    }

    copySubmissionLink(token: string): void {
        const url = `${window.location.origin}/employee/onboarding/sign/${token}`;
        navigator.clipboard.writeText(url).then(() => {
            alert('連結已複製');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('複製失敗，請手動複製');
        });
    }

    // ==================== 發布新版功能 ====================

    showNewVersionDialog = signal(false);
    newVersionLoading = signal(false);
    newVersionPdfBase64 = signal<string | null>(null);
    newVersionPdfName = signal('');
    newVersionInheritFields = signal(true);

    openNewVersionDialog(template: TemplateListItem, event: Event): void {
        event.stopPropagation();

        // 若已有草稿，直接進入草稿編輯模式
        if (template.has_draft) {
            this.router.navigate(['/employee/onboarding/templates', template.id], {
                queryParams: { mode: 'draft' }
            });
            return;
        }

        // 沒有草稿，開啟對話框建立新草稿
        this.selectedTemplateId.set(template.id);
        this.selectedTemplateName.set(template.name);
        this.newVersionPdfBase64.set(null);
        this.newVersionPdfName.set('');
        this.newVersionInheritFields.set(true);
        this.showNewVersionDialog.set(true);
    }

    closeNewVersionDialog(): void {
        this.showNewVersionDialog.set(false);
        this.newVersionPdfBase64.set(null);
        this.newVersionPdfName.set('');
    }

    onNewVersionFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;

        if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
            alert('請上傳 PDF 檔案');
            return;
        }

        this.newVersionPdfName.set(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target?.result as string;
            this.newVersionPdfBase64.set(base64);
        };
        reader.readAsDataURL(file);
    }

    createDraftAndNavigate(): void {
        const templateId = this.selectedTemplateId();
        const pdfBase64 = this.newVersionPdfBase64();

        if (!templateId || !pdfBase64) {
            alert('請上傳 PDF 檔案');
            return;
        }

        this.newVersionLoading.set(true);
        this.onboardingService.saveDraft(templateId, {
            pdf_base64: pdfBase64,
            inherit_fields: this.newVersionInheritFields()
        }).subscribe({
            next: () => {
                this.newVersionLoading.set(false);
                this.closeNewVersionDialog();
                // 導航至草稿編輯模式
                this.router.navigate(['/employee/onboarding/templates', templateId], {
                    queryParams: { mode: 'draft' }
                });
            },
            error: (err) => {
                this.newVersionLoading.set(false);
                console.error('Failed to create draft:', err);
                alert('建立草稿失敗：' + (err.error?.error || '未知錯誤'));
            }
        });
    }

    // 移除舊的 publishNewVersion 方法，改用 createDraftAndNavigate
}
