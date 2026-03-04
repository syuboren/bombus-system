import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../../shared/components/header/header.component';
import { OnboardingService } from '../../../services/onboarding.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { EmployeeService } from '../../../services/employee.service';
import { Employee } from '../../../models/talent-pool.model';
import {
    UploadDocument,
    UploadDocumentType,
    UploadDocumentStatus,
    FIXED_DOCUMENT_TYPES,
    FixedDocumentDefinition
} from '../../../models/onboarding.model';

interface DocumentItem {
    template_id: string;
    template_name: string;
    status: 'NOT_STARTED' | 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    token?: string;
}

// 本地上傳狀態追蹤
interface LocalUploadState {
    type: UploadDocumentType;
    uploading: boolean;
    error?: string;
}

// 其他文件輸入狀態
interface OtherDocumentInput {
    id: string;
    customName: string;
    file: File | null;
    uploading: boolean;
    error?: string;
}

@Component({
    selector: 'app-onboarding-documents-page',
    standalone: true,
    imports: [CommonModule, FormsModule, HeaderComponent],
    templateUrl: './onboarding-documents-page.component.html',
    styleUrl: './onboarding-documents-page.component.scss'
})
export class OnboardingDocumentsPageComponent implements OnInit {
    private onboardingService = inject(OnboardingService);
    private authService = inject(AuthService);
    private employeeService = inject(EmployeeService);
    private router = inject(Router);

    // 當前使用者與員工選擇
    currentUser = signal<any>(null);
    isHR = computed(() => {
        const user = this.currentUser();
        if (!user) return false;
        return user.role === 'admin' || user.department === '人資部';
    });
    employees = signal<Employee[]>([]);
    selectedEmployeeId = signal<string>('');
    selectedEmployee = computed(() => {
        return this.employees().find(e => e.id === this.selectedEmployeeId()) || null;
    });
    selectedEmployeeName = computed(() => {
        return this.selectedEmployee()?.name || '';
    });

    // 載入狀態
    loading = signal(true);
    progress = signal<any>(null);
    documents = signal<DocumentItem[]>([]);

    // 上傳文件相關狀態
    uploadedDocuments = signal<UploadDocument[]>([]);
    uploadStates = signal<Map<UploadDocumentType, LocalUploadState>>(new Map());
    otherDocuments = signal<UploadDocument[]>([]);
    otherDocumentInputs = signal<OtherDocumentInput[]>([]);

    // 顯示新增其他文件的對話框
    showAddOtherDialog = signal(false);
    newOtherDocName = signal('');

    // 固定文件類型定義
    readonly fixedDocumentTypes = FIXED_DOCUMENT_TYPES;

    // 計算上傳進度
    uploadProgress = computed(() => {
        const uploaded = this.uploadedDocuments();
        const fixedUploaded = uploaded.filter(d => d.type !== 'other').length;
        const total = this.fixedDocumentTypes.length;
        const percentage = total > 0 ? Math.round((fixedUploaded / total) * 100) : 0;

        return {
            total,
            uploaded: fixedUploaded,
            pending: total - fixedUploaded,
            percentage
        };
    });

    ngOnInit(): void {
        this.loadCurrentUser();
    }

    private loadCurrentUser(): void {
        const user = this.authService.getCurrentUser();
        this.currentUser.set(user);

        if (user) {
            if (this.isHR()) {
                // HR 可切換員工，先載入員工列表
                this.loadEmployeeList();
            } else {
                // 一般員工使用自己的 ID
                this.selectedEmployeeId.set(user.id);
                this.loadProgress();
                this.loadUploadedDocuments();
            }
        }
    }

    private loadEmployeeList(): void {
        this.employeeService.getEmployees().subscribe({
            next: (employees) => {
                this.employees.set(employees);
                
                // 員工列表載入後，設置預設選中的員工
                const currentUser = this.currentUser();
                if (employees.length > 0) {
                    // 嘗試找到與當前用戶對應的員工（通過 email 匹配）
                    const matchedEmployee = employees.find(
                        e => e.email === currentUser?.email
                    );
                    
                    if (matchedEmployee) {
                        this.selectedEmployeeId.set(matchedEmployee.id);
                    } else {
                        // 如果找不到匹配的員工，使用列表中的第一個
                        this.selectedEmployeeId.set(employees[0].id);
                    }
                    
                    this.loadProgress();
                    this.loadUploadedDocuments();
                }
            },
            error: (err) => console.error('Failed to load employees', err)
        });
    }

    onEmployeeChange(employeeId: string): void {
        this.selectedEmployeeId.set(employeeId);
        this.loadProgress();
        this.loadUploadedDocuments();
    }

    // ==================== 原有簽署文件功能 ====================

    loadProgress(): void {
        const employeeId = this.selectedEmployeeId();
        if (!employeeId) return;

        this.loading.set(true);
        this.onboardingService.getEmployeeProgress(employeeId).subscribe({
            next: (data) => {
                this.progress.set(data);
                this.documents.set(data.items);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load progress:', err);
                this.loading.set(false);
            }
        });
    }

    startSigning(templateId: string): void {
        const employeeId = this.selectedEmployeeId();
        if (!employeeId) return;

        // 優先使用選定的員工資訊
        const employee = this.selectedEmployee();
        const currentUser = this.currentUser();
        
        // 如果有選定的員工（HR 模式），使用員工資訊；否則使用當前用戶資訊
        const employeeName = employee?.name || currentUser?.name || '';
        const employeeEmail = employee?.email || currentUser?.email || '';

        console.log('[StartSigning] Employee:', employee?.name, 'Email:', employeeEmail, 'ID:', employeeId);

        this.loading.set(true);
        this.onboardingService.createSignLink({
            template_id: templateId,
            employee_name: employeeName,
            employee_email: employeeEmail,
            employee_id: employeeId
        }).subscribe({
            next: (res) => {
                this.loading.set(false);
                this.router.navigate(['/employee/onboarding/sign', res.token]);
            },
            error: (err) => {
                console.error('Failed to start signing:', err);
                this.loading.set(false);
                alert('無法開始簽署');
            }
        });
    }

    viewSignDocument(token: string): void {
        if (token) {
            this.router.navigate(['/employee/onboarding/sign', token]);
        }
    }

    getStatusClass(status: string): string {
        const map: Record<string, string> = {
            'NOT_STARTED': 'status-todo',
            'DRAFT': 'status-todo',
            'PENDING_APPROVAL': 'status-pending',
            'APPROVED': 'status-approved',
            'REJECTED': 'status-rejected'
        };
        return map[status] || '';
    }

    getStatusText(status: string): string {
        const map: Record<string, string> = {
            'NOT_STARTED': '待辦',
            'DRAFT': '待辦',
            'PENDING_APPROVAL': '審核中',
            'APPROVED': '已核准',
            'REJECTED': '已退回'
        };
        return map[status] || status;
    }

    // ==================== 上傳文件功能 ====================

    /**
     * 載入已上傳的文件列表
     */
    loadUploadedDocuments(): void {
        const employeeId = this.selectedEmployeeId();
        if (!employeeId) return;

        this.onboardingService.getUploadedDocuments(employeeId).subscribe({
            next: (docs) => {
                this.uploadedDocuments.set(docs);
                // 分離其他文件
                this.otherDocuments.set(docs.filter(d => d.type === 'other'));
            },
            error: (err) => {
                console.error('Failed to load uploaded documents:', err);
                // 使用空陣列作為預設值
                this.uploadedDocuments.set([]);
                this.otherDocuments.set([]);
            }
        });
    }

    /**
     * 取得指定類型的已上傳文件
     */
    getUploadedDocument(type: UploadDocumentType): UploadDocument | undefined {
        return this.uploadedDocuments().find(d => d.type === type);
    }

    /**
     * 檢查指定類型是否正在上傳
     */
    isUploading(type: UploadDocumentType): boolean {
        return this.uploadStates().get(type)?.uploading || false;
    }

    /**
     * 取得上傳錯誤訊息
     */
    getUploadError(type: UploadDocumentType): string | undefined {
        return this.uploadStates().get(type)?.error;
    }

    /**
     * 處理檔案選擇
     */
    onFileSelected(event: Event, type: UploadDocumentType, definition: FixedDocumentDefinition): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        // 驗證檔案大小
        if (file.size > definition.maxSize) {
            const maxSizeMB = definition.maxSize / (1024 * 1024);
            alert(`檔案大小超過限制 (最大 ${maxSizeMB}MB)`);
            input.value = '';
            return;
        }

        // 開始上傳
        this.uploadFile(type, file);

        // 清除 input 值，允許重複選擇同一檔案
        input.value = '';
    }

    /**
     * 上傳檔案
     */
    uploadFile(type: UploadDocumentType, file: File, customName?: string): void {
        const employeeId = this.selectedEmployeeId();
        if (!employeeId) return;

        // 更新上傳狀態
        const states = new Map(this.uploadStates());
        states.set(type, { type, uploading: true, error: undefined });
        this.uploadStates.set(states);

        this.onboardingService.uploadDocument(employeeId, type, file, customName).subscribe({
            next: (doc) => {
                // 更新已上傳文件列表
                const docs = [...this.uploadedDocuments()];
                const existingIndex = docs.findIndex(d => d.type === type && d.type !== 'other');

                if (existingIndex >= 0) {
                    docs[existingIndex] = doc;
                } else {
                    docs.push(doc);
                }

                this.uploadedDocuments.set(docs);

                // 更新其他文件列表
                if (type === 'other') {
                    this.otherDocuments.set(docs.filter(d => d.type === 'other'));
                }

                // 清除上傳狀態
                const newStates = new Map(this.uploadStates());
                newStates.delete(type);
                this.uploadStates.set(newStates);
            },
            error: (err) => {
                console.error('Upload failed:', err);
                const states = new Map(this.uploadStates());
                states.set(type, { type, uploading: false, error: '上傳失敗，請重試' });
                this.uploadStates.set(states);
            }
        });
    }

    /**
     * 查看/下載文件
     */
    viewDocument(doc: UploadDocument): void {
        if (!doc.fileUrl) {
            alert('檔案連結無效');
            return;
        }

        // 構建完整的 URL
        const baseUrl = 'http://localhost:3001';
        const fullUrl = `${baseUrl}${doc.fileUrl}`;

        // 在新視窗中開啟
        window.open(fullUrl, '_blank');
    }

    /**
     * 刪除已上傳的文件
     */
    deleteDocument(doc: UploadDocument): void {
        if (!confirm(`確定要刪除「${doc.customName || doc.label}」嗎？`)) {
            return;
        }

        this.onboardingService.deleteUploadedDocument(doc.id).subscribe({
            next: () => {
                // 從列表中移除
                const docs = this.uploadedDocuments().filter(d => d.id !== doc.id);
                this.uploadedDocuments.set(docs);
                this.otherDocuments.set(docs.filter(d => d.type === 'other'));
            },
            error: (err) => {
                console.error('Delete failed:', err);
                alert('刪除失敗，請重試');
            }
        });
    }

    /**
     * 取得上傳狀態樣式類
     */
    getUploadStatusClass(doc: UploadDocument | undefined): string {
        if (!doc) return 'status-pending';

        const map: Record<UploadDocumentStatus, string> = {
            'pending': 'status-pending',
            'uploaded': 'status-uploaded',
            'approved': 'status-approved',
            'rejected': 'status-rejected'
        };
        return map[doc.status] || 'status-pending';
    }

    /**
     * 取得上傳狀態文字
     */
    getUploadStatusText(doc: UploadDocument | undefined): string {
        if (!doc) return '待上傳';

        const map: Record<UploadDocumentStatus, string> = {
            'pending': '待審核',
            'uploaded': '已上傳',
            'approved': '已核准',
            'rejected': '已退回'
        };
        return map[doc.status] || '待上傳';
    }

    /**
     * 格式化檔案大小
     */
    formatFileSize(bytes?: number): string {
        if (!bytes) return '';

        if (bytes < 1024) {
            return `${bytes} B`;
        } else if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        } else {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
        }
    }

    /**
     * 格式化日期
     */
    formatDate(dateStr?: string): string {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ==================== 其他文件功能 ====================

    /**
     * 開啟新增其他文件對話框
     */
    openAddOtherDialog(): void {
        this.newOtherDocName.set('');
        this.showAddOtherDialog.set(true);
    }

    /**
     * 關閉新增其他文件對話框
     */
    closeAddOtherDialog(): void {
        this.showAddOtherDialog.set(false);
        this.newOtherDocName.set('');
    }

    /**
     * 新增其他文件輸入欄位
     */
    addOtherDocumentInput(): void {
        const inputs = [...this.otherDocumentInputs()];
        inputs.push({
            id: `other-${Date.now()}`,
            customName: '',
            file: null,
            uploading: false
        });
        this.otherDocumentInputs.set(inputs);
    }

    /**
     * 移除其他文件輸入欄位
     */
    removeOtherDocumentInput(inputId: string): void {
        const inputs = this.otherDocumentInputs().filter(i => i.id !== inputId);
        this.otherDocumentInputs.set(inputs);
    }

    /**
     * 處理其他文件選擇
     */
    onOtherFileSelected(event: Event, inputId: string): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        // 驗證檔案大小 (10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('檔案大小超過限制 (最大 10MB)');
            input.value = '';
            return;
        }

        // 更新輸入狀態
        const inputs = this.otherDocumentInputs().map(i => {
            if (i.id === inputId) {
                return { ...i, file };
            }
            return i;
        });
        this.otherDocumentInputs.set(inputs);
    }

    /**
     * 上傳其他文件
     */
    uploadOtherDocument(inputId: string): void {
        const inputs = this.otherDocumentInputs();
        const input = inputs.find(i => i.id === inputId);

        if (!input || !input.file || !input.customName.trim()) {
            alert('請填寫文件名稱並選擇檔案');
            return;
        }

        // 更新上傳狀態
        const employeeId = this.selectedEmployeeId();
        if (!employeeId) return;

        const updatedInputs = inputs.map(i => {
            if (i.id === inputId) {
                return { ...i, uploading: true, error: undefined };
            }
            return i;
        });
        this.otherDocumentInputs.set(updatedInputs);

        this.onboardingService.uploadDocument(
            employeeId,
            'other',
            input.file,
            input.customName.trim()
        ).subscribe({
            next: (doc) => {
                // 更新已上傳文件列表
                const docs = [...this.uploadedDocuments(), doc];
                this.uploadedDocuments.set(docs);
                this.otherDocuments.set(docs.filter(d => d.type === 'other'));

                // 移除輸入欄位
                this.removeOtherDocumentInput(inputId);
            },
            error: (err) => {
                console.error('Upload other document failed:', err);
                const failedInputs = this.otherDocumentInputs().map(i => {
                    if (i.id === inputId) {
                        return { ...i, uploading: false, error: '上傳失敗，請重試' };
                    }
                    return i;
                });
                this.otherDocumentInputs.set(failedInputs);
            }
        });
    }

    /**
     * 取得文件圖示
     */
    getDocumentIcon(type: UploadDocumentType): string {
        const icons: Record<UploadDocumentType, string> = {
            'id_card': 'ri-id-card-line',
            'bank_account': 'ri-bank-card-line',
            'health_report': 'ri-heart-pulse-line',
            'photo': 'ri-user-line',
            'education_cert': 'ri-graduation-cap-line',
            'other': 'ri-file-text-line'
        };
        return icons[type] || 'ri-file-text-line';
    }
}
