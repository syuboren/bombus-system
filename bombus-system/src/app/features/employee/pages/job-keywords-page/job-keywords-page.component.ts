import {
    Component,
    ChangeDetectionStrategy,
    inject,
    signal,
    computed,
    OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobKeywordsService } from '../../services/job-keywords.service';
import { JobService } from '../../services/job.service';
import {
    JobKeywordsConfig,
    EvaluationDimension,
    KeywordConfig,
    EvaluationTemplate,
    BatchKeywordFormData
} from '../../models/job-keywords.model';

@Component({
    selector: 'app-job-keywords-page',
    standalone: true,
    imports: [CommonModule, FormsModule, HeaderComponent],
    templateUrl: './job-keywords-page.component.html',
    styleUrl: './job-keywords-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobKeywordsPageComponent implements OnInit {
    // Services
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private keywordsService = inject(JobKeywordsService);
    private jobService = inject(JobService);
    private notificationService = inject(NotificationService);

    // State
    jobId = signal<string>('');
    jobTitle = signal<string>('');
    loading = signal<boolean>(true);
    saving = signal<boolean>(false);

    // Config Data
    config = signal<JobKeywordsConfig | null>(null);
    dimensions = signal<EvaluationDimension[]>([]);
    keywords = signal<KeywordConfig[]>([]);
    templates = signal<EvaluationTemplate[]>([]);

    // UI State
    activeTab = signal<'positive' | 'negative'>('positive');
    selectedDimensionId = signal<string>('all');
    showAddKeywordModal = signal<boolean>(false);
    showBatchAddModal = signal<boolean>(false);
    showTemplateModal = signal<boolean>(false);
    showDimensionModal = signal<boolean>(false);

    // Form Data
    newKeyword = signal<Partial<KeywordConfig>>({
        keyword: '',
        dimensionId: '',
        type: 'positive',
        weight: 5
    });

    batchForm = signal<BatchKeywordFormData>({
        keywords: '',
        dimensionId: '',
        type: 'positive',
        defaultWeight: 5
    });

    editingDimension = signal<EvaluationDimension | null>(null);

    // Computed
    filteredKeywords = computed(() => {
        const kws = this.keywords();
        const tab = this.activeTab();
        const dimId = this.selectedDimensionId();

        return kws.filter(kw => {
            const typeMatch = kw.type === tab;
            const dimMatch = dimId === 'all' || kw.dimensionId === dimId;
            return typeMatch && dimMatch;
        });
    });

    positiveCount = computed(() => this.keywords().filter(k => k.type === 'positive').length);
    negativeCount = computed(() => this.keywords().filter(k => k.type === 'negative').length);

    totalWeight = computed(() => {
        return this.dimensions().reduce((sum, d) => sum + d.weight, 0);
    });

    ngOnInit(): void {
        const jobId = this.route.snapshot.paramMap.get('jobId');
        if (jobId) {
            this.jobId.set(jobId);
            this.loadData();
        } else {
            this.notificationService.error('缺少職缺 ID');
            this.router.navigate(['/employee/jobs']);
        }
    }

    loadData(): void {
        this.loading.set(true);

        // 載入職缺資訊
        this.jobService.getJobs().subscribe({
            next: (jobs) => {
                const job = jobs.find(j => j.id === this.jobId());
                if (job) {
                    this.jobTitle.set(job.title);
                }
            }
        });

        // 載入關鍵字配置
        this.keywordsService.getJobKeywords(this.jobId()).subscribe({
            next: (config) => {
                this.config.set(config);
                this.dimensions.set([...config.dimensions]);
                this.keywords.set([...config.keywords]);
                this.loading.set(false);
            },
            error: () => {
                this.notificationService.error('載入配置失敗');
                this.loading.set(false);
            }
        });

        // 載入範本列表
        this.keywordsService.getTemplates().subscribe({
            next: (templates) => this.templates.set(templates)
        });
    }

    // ============================================================
    // Tab & Filter Actions
    // ============================================================

    switchTab(tab: 'positive' | 'negative'): void {
        this.activeTab.set(tab);
    }

    filterByDimension(dimensionId: string): void {
        this.selectedDimensionId.set(dimensionId);
    }

    // ============================================================
    // Keyword Management
    // ============================================================

    openAddKeywordModal(): void {
        this.newKeyword.set({
            keyword: '',
            dimensionId: this.dimensions()[0]?.id || '',
            type: this.activeTab(),
            weight: 5
        });
        this.showAddKeywordModal.set(true);
    }

    closeAddKeywordModal(): void {
        this.showAddKeywordModal.set(false);
    }

    saveNewKeyword(): void {
        const kw = this.newKeyword();
        if (!kw.keyword?.trim()) {
            this.notificationService.warning('請輸入關鍵字');
            return;
        }

        const newKw: KeywordConfig = {
            id: `kw-${Date.now()}`,
            jobId: this.jobId(),
            dimensionId: kw.dimensionId || this.dimensions()[0]?.id || '',
            keyword: kw.keyword.trim(),
            type: kw.type || 'positive',
            weight: kw.weight || 5,
            createdAt: new Date().toISOString()
        };

        this.keywords.update(list => [...list, newKw]);
        this.closeAddKeywordModal();
        this.notificationService.success('關鍵字已新增');
    }

    openBatchAddModal(): void {
        this.batchForm.set({
            keywords: '',
            dimensionId: this.dimensions()[0]?.id || '',
            type: this.activeTab(),
            defaultWeight: 5
        });
        this.showBatchAddModal.set(true);
    }

    closeBatchAddModal(): void {
        this.showBatchAddModal.set(false);
    }

    saveBatchKeywords(): void {
        const form = this.batchForm();
        const lines = form.keywords.split('\n').map(l => l.trim()).filter(l => l);

        if (lines.length === 0) {
            this.notificationService.warning('請輸入至少一個關鍵字');
            return;
        }

        const newKeywords: KeywordConfig[] = lines.map((kw, i) => ({
            id: `kw-batch-${Date.now()}-${i}`,
            jobId: this.jobId(),
            dimensionId: form.dimensionId,
            keyword: kw,
            type: form.type,
            weight: form.defaultWeight,
            createdAt: new Date().toISOString()
        }));

        this.keywords.update(list => [...list, ...newKeywords]);
        this.closeBatchAddModal();
        this.notificationService.success(`已新增 ${newKeywords.length} 個關鍵字`);
    }

    deleteKeyword(keywordId: string): void {
        this.keywords.update(list => list.filter(k => k.id !== keywordId));
        this.notificationService.success('關鍵字已刪除');
    }

    updateKeywordWeight(keywordId: string, weight: number): void {
        this.keywords.update(list =>
            list.map(k => k.id === keywordId ? { ...k, weight } : k)
        );
    }

    // ============================================================
    // Dimension Management
    // ============================================================

    openDimensionModal(dimension?: EvaluationDimension): void {
        if (dimension) {
            this.editingDimension.set({ ...dimension });
        } else {
            this.editingDimension.set({
                id: `dim-${Date.now()}`,
                name: '',
                weight: 10,
                order: this.dimensions().length + 1
            });
        }
        this.showDimensionModal.set(true);
    }

    closeDimensionModal(): void {
        this.showDimensionModal.set(false);
        this.editingDimension.set(null);
    }

    saveDimension(): void {
        const dim = this.editingDimension();
        if (!dim || !dim.name.trim()) {
            this.notificationService.warning('請輸入維度名稱');
            return;
        }

        const exists = this.dimensions().find(d => d.id === dim.id);
        if (exists) {
            // Update
            this.dimensions.update(list =>
                list.map(d => d.id === dim.id ? dim : d)
            );
        } else {
            // Add
            this.dimensions.update(list => [...list, dim]);
        }

        this.closeDimensionModal();
        this.notificationService.success('維度已儲存');
    }

    deleteDimension(dimensionId: string): void {
        // 檢查是否有關鍵字使用此維度
        const hasKeywords = this.keywords().some(k => k.dimensionId === dimensionId);
        if (hasKeywords) {
            this.notificationService.warning('此維度下有關鍵字，請先刪除相關關鍵字');
            return;
        }

        this.dimensions.update(list => list.filter(d => d.id !== dimensionId));
        this.notificationService.success('維度已刪除');
    }

    // ============================================================
    // Template Management
    // ============================================================

    openTemplateModal(): void {
        this.showTemplateModal.set(true);
    }

    closeTemplateModal(): void {
        this.showTemplateModal.set(false);
    }

    applyTemplate(template: EvaluationTemplate): void {
        this.keywordsService.applyTemplate(this.jobId(), template.id).subscribe({
            next: (config) => {
                this.config.set(config);
                this.dimensions.set([...config.dimensions]);
                this.keywords.set([...config.keywords]);
                this.closeTemplateModal();
                this.notificationService.success(`已套用範本「${template.name}」`);
            },
            error: () => {
                this.notificationService.error('套用範本失敗');
            }
        });
    }

    importFromEmployee(): void {
        // Mock: 從高績效員工匯入
        this.keywordsService.importFromEmployee(this.jobId(), 'emp-001').subscribe({
            next: (imported) => {
                this.keywords.update(list => [...list, ...imported]);
                this.closeTemplateModal();
                this.notificationService.success(`已匯入 ${imported.length} 個關鍵字`);
            },
            error: () => {
                this.notificationService.error('匯入失敗');
            }
        });
    }

    // ============================================================
    // Save & Navigation
    // ============================================================

    saveConfig(): void {
        this.saving.set(true);

        const config: JobKeywordsConfig = {
            jobId: this.jobId(),
            jobTitle: this.jobTitle(),
            dimensions: this.dimensions(),
            keywords: this.keywords(),
            updatedAt: new Date().toISOString()
        };

        this.keywordsService.saveJobKeywords(config).subscribe({
            next: () => {
                this.config.set(config);
                this.saving.set(false);
                this.notificationService.success('配置已儲存');
            },
            error: () => {
                this.saving.set(false);
                this.notificationService.error('儲存失敗');
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/employee/jobs']);
    }

    // ============================================================
    // Helper Methods
    // ============================================================

    getDimensionName(dimensionId: string): string {
        return this.dimensions().find(d => d.id === dimensionId)?.name || '未分類';
    }

    getKeywordCountByDimension(dimensionId: string): number {
        return this.keywords().filter(k => k.dimensionId === dimensionId).length;
    }

    // ============================================================
    // Form Update Helpers (避免在模板中使用 arrow function)
    // ============================================================

    updateNewKeywordField(field: keyof Partial<KeywordConfig>, value: string | number): void {
        this.newKeyword.update(v => ({ ...v, [field]: value }));
    }

    updateBatchFormField(field: keyof BatchKeywordFormData, value: string | number): void {
        this.batchForm.update(v => ({ ...v, [field]: value }));
    }

    updateEditingDimensionField(field: keyof EvaluationDimension, value: string | number): void {
        this.editingDimension.update(v => v ? { ...v, [field]: value } : v);
    }
}
