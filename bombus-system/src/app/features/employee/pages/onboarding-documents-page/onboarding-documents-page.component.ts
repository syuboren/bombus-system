import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { OnboardingService } from '../../services/onboarding.service';

interface DocumentItem {
    template_id: string;
    template_name: string;
    status: 'NOT_STARTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    token?: string;
}

@Component({
    selector: 'app-onboarding-documents-page',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent],
    templateUrl: './onboarding-documents-page.component.html',
    styleUrl: './onboarding-documents-page.component.scss'
})
export class OnboardingDocumentsPageComponent implements OnInit {
    private onboardingService = inject(OnboardingService);
    private router = inject(Router);

    // Mock Employee ID (真實情況應從 Auth Service 取得)
    employeeId = 'EMP001';

    loading = signal(true);
    progress = signal<any>(null);
    documents = signal<DocumentItem[]>([]);

    ngOnInit(): void {
        this.loadProgress();
    }

    loadProgress(): void {
        this.loading.set(true);
        this.onboardingService.getEmployeeProgress(this.employeeId).subscribe({
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
        this.loading.set(true);
        // 1. 呼叫 Create Sign Link (自簽)
        this.onboardingService.createSignLink({
            template_id: templateId,
            employee_name: '測試員工', // Mock Name
            employee_email: 'employee@test.com', // Mock Email
            employee_id: this.employeeId
        }).subscribe({
            next: (res) => {
                this.loading.set(false);
                // 2. 導向至簽署頁面
                this.router.navigate(['/employee/onboarding/sign', res.token]);
            },
            error: (err) => {
                console.error('Failed to start signing:', err);
                this.loading.set(false);
                alert('無法開始簽署');
            }
        });
    }

    viewDocument(token: string): void {
        if (token) {
            this.router.navigate(['/employee/onboarding/sign', token]);
        }
    }

    getStatusClass(status: string): string {
        const map: Record<string, string> = {
            'NOT_STARTED': 'status-todo',
            'PENDING_APPROVAL': 'status-pending',
            'APPROVED': 'status-approved',
            'REJECTED': 'status-rejected'
        };
        return map[status] || '';
    }

    getStatusText(status: string): string {
        const map: Record<string, string> = {
            'NOT_STARTED': '待辦',
            'PENDING_APPROVAL': '審核中',
            'APPROVED': '已核准',
            'REJECTED': '已退回'
        };
        return map[status] || status;
    }
}
