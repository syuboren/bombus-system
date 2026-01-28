import { Component, ChangeDetectionStrategy, input, output, signal, computed, ViewEncapsulation, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateDetail, Interview } from '../../models/candidate.model';
import { InterviewService } from '../../services/interview.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { JobKeywordsService } from '../../services/job-keywords.service';
import { KeywordConfig } from '../../models/job-keywords.model';

// Media attachment interface
interface MediaAttachment {
    id: string;
    type: 'audio' | 'video';
    filename: string;
    size: number;
    url?: string;
    uploadProgress?: number;
    transcriptText?: string;
}

@Component({
    selector: 'app-interview-scoring-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './interview-scoring-modal.component.html',
    styleUrl: './interview-scoring-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class InterviewScoringModalComponent {
    // Inputs
    candidate = input.required<CandidateDetail>();
    interviewId = input<string>();
    isVisible = input.required<boolean>();
    jobId = input<string>(); // For keyword lookup

    // Outputs
    close = output<void>();
    scored = output<void>();

    // Services
    private interviewService = inject(InterviewService);
    private notificationService = inject(NotificationService);
    private keywordsService = inject(JobKeywordsService);

    // ============================================================
    // Scoring Dimensions
    // ============================================================
    dimensions = signal([
        { name: '專業能力', score: 0, comment: '' },
        { name: '溝通表達', score: 0, comment: '' },
        { name: '團隊合作', score: 0, comment: '' },
        { name: '邏輯思考', score: 0, comment: '' },
        { name: '學習潛力', score: 0, comment: '' }
    ]);

    // ============================================================
    // NEW: Performance Description (候選人表現描述)
    // ============================================================
    performanceDescription = signal<string>('');

    // ============================================================
    // NEW: Media Attachments (錄音/錄影上傳)
    // ============================================================
    mediaAttachments = signal<MediaAttachment[]>([]);
    isDraggingOver = signal<boolean>(false);

    // ============================================================
    // NEW: Keyword Matching (關鍵字即時標記)
    // ============================================================
    positiveKeywords = signal<KeywordConfig[]>([]);
    negativeKeywords = signal<KeywordConfig[]>([]);
    matchedKeywords = signal<{ keyword: string; type: 'positive' | 'negative'; weight: number }[]>([]);

    // ============================================================
    // Decision & State
    // ============================================================
    result = signal<'Pass' | 'Hold' | 'Fail' | null>(null);
    overallComment = signal<string>('');
    loading = signal<boolean>(false);

    // ============================================================
    // Computed Properties
    // ============================================================

    // Average dimension score
    averageScore = computed(() => {
        const dims = this.dimensions();
        const sum = dims.reduce((acc, curr) => acc + (curr.score || 0), 0);
        return dims.length ? (sum / dims.length).toFixed(1) : '0.0';
    });

    // Keyword score based on matched keywords
    keywordScore = computed(() => {
        const matched = this.matchedKeywords();
        let score = 0;
        matched.forEach(m => {
            if (m.type === 'positive') {
                score += m.weight;
            } else {
                score -= m.weight;
            }
        });
        return Math.max(0, Math.min(100, 50 + score * 5)); // Base 50, +/- based on keywords
    });

    // Total score combining dimensions and keywords
    totalScore = computed(() => {
        const dimScore = parseFloat(this.averageScore()) * 20; // Convert 0-5 to 0-100
        const kwScore = this.keywordScore();
        // 60% from dimensions, 40% from keywords
        return Math.round(dimScore * 0.6 + kwScore * 0.4);
    });

    // ============================================================
    // Lifecycle
    // ============================================================
    constructor() {
        // Load keywords when jobId is available
    }

    loadKeywords(): void {
        const jobId = this.jobId();
        if (!jobId) return;

        this.keywordsService.getJobKeywords(jobId).subscribe({
            next: (config) => {
                this.positiveKeywords.set(config.keywords.filter(k => k.type === 'positive'));
                this.negativeKeywords.set(config.keywords.filter(k => k.type === 'negative'));
            }
        });
    }

    // ============================================================
    // Performance Description Methods
    // ============================================================

    onDescriptionChange(text: string): void {
        this.performanceDescription.set(text);
        this.analyzeKeywords(text);
    }

    // Analyze text for keywords and update matched keywords
    analyzeKeywords(text: string): void {
        const lowerText = text.toLowerCase();
        const matched: { keyword: string; type: 'positive' | 'negative'; weight: number }[] = [];

        // Check positive keywords
        this.positiveKeywords().forEach(kw => {
            if (lowerText.includes(kw.keyword.toLowerCase())) {
                matched.push({ keyword: kw.keyword, type: 'positive', weight: kw.weight });
            }
        });

        // Check negative keywords
        this.negativeKeywords().forEach(kw => {
            if (lowerText.includes(kw.keyword.toLowerCase())) {
                matched.push({ keyword: kw.keyword, type: 'negative', weight: kw.weight });
            }
        });

        this.matchedKeywords.set(matched);
    }

    // Highlight keywords in text (returns HTML)
    highlightedDescription = computed(() => {
        let text = this.performanceDescription();
        if (!text) return '';

        // Highlight positive keywords
        this.positiveKeywords().forEach(kw => {
            const regex = new RegExp(`(${kw.keyword})`, 'gi');
            text = text.replace(regex, '<mark class="keyword-positive">$1</mark>');
        });

        // Highlight negative keywords
        this.negativeKeywords().forEach(kw => {
            const regex = new RegExp(`(${kw.keyword})`, 'gi');
            text = text.replace(regex, '<mark class="keyword-negative">$1</mark>');
        });

        return text;
    });

    // ============================================================
    // Media Upload Methods
    // ============================================================

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver.set(true);
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver.set(false);
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDraggingOver.set(false);

        const files = event.dataTransfer?.files;
        if (files) {
            this.handleFiles(files);
        }
    }

    onFileSelect(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            this.handleFiles(input.files);
            input.value = ''; // Reset for next selection
        }
    }

    private handleFiles(files: FileList): void {
        Array.from(files).forEach(file => {
            const isAudio = file.type.startsWith('audio/');
            const isVideo = file.type.startsWith('video/');

            if (!isAudio && !isVideo) {
                this.notificationService.warning(`檔案 "${file.name}" 不是支援的格式（僅支援音訊/影片）`);
                return;
            }

            const attachment: MediaAttachment = {
                id: `media-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: isAudio ? 'audio' : 'video',
                filename: file.name,
                size: file.size,
                uploadProgress: 0
            };

            // Add to list
            this.mediaAttachments.update(current => [...current, attachment]);

            // Simulate upload progress
            this.simulateUpload(attachment.id);
        });
    }

    private simulateUpload(attachmentId: string): void {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }

            this.mediaAttachments.update(attachments =>
                attachments.map(a =>
                    a.id === attachmentId
                        ? { ...a, uploadProgress: Math.min(100, Math.round(progress)) }
                        : a
                )
            );
        }, 300);
    }

    removeAttachment(id: string): void {
        this.mediaAttachments.update(attachments =>
            attachments.filter(a => a.id !== id)
        );
    }

    formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ============================================================
    // Submit
    // ============================================================
    submit() {
        if (!this.result()) {
            this.notificationService.warning('請選擇面試結果');
            return;
        }

        if (this.dimensions().some(d => d.score === 0)) {
            this.notificationService.warning('請為所有評分項目打分');
            return;
        }

        let targetInterviewId = this.interviewId();
        if (!targetInterviewId) {
            const pending = this.candidate().interviews?.find(i => i.result === 'Pending');
            targetInterviewId = pending?.id;
        }

        if (!targetInterviewId) {
            this.notificationService.error('找不到待評分的面試記錄');
            return;
        }

        this.loading.set(true);

        // Build evaluation object
        const evaluation = {
            dimensions: this.dimensions(),
            average: this.averageScore(),
            comment: this.overallComment(),
            // NEW: Phase 2 fields
            performanceDescription: this.performanceDescription(),
            matchedKeywords: this.matchedKeywords(),
            keywordScore: this.keywordScore(),
            totalScore: this.totalScore(),
            mediaAttachments: this.mediaAttachments().map(m => ({
                id: m.id,
                type: m.type,
                filename: m.filename
            }))
        };

        this.interviewService.submitEvaluation(targetInterviewId, {
            evaluationJson: evaluation,
            result: this.result()!,
            remark: this.overallComment()
        }).subscribe({
            next: () => {
                this.notificationService.success('面試評分已提交');
                this.scored.emit();
                this.close.emit();
                this.loading.set(false);
            },
            error: () => {
                this.notificationService.error('提交失敗，請稍後再試');
                this.loading.set(false);
            }
        });
    }
}
