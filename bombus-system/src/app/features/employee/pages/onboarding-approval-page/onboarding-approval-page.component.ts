import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { OnboardingService } from '../../services/onboarding.service';
import { Submission } from '../../models/onboarding.model';

@Component({
    selector: 'app-onboarding-approval-page',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
    templateUrl: './onboarding-approval-page.component.html',
    styleUrl: './onboarding-approval-page.component.scss'
})
export class OnboardingApprovalPageComponent implements OnInit {
    private onboardingService = inject(OnboardingService);

    // 列表狀態
    loading = signal(true);
    submissions = signal<Submission[]>([]);
    filterStatus = signal<string>('PENDING'); // PENDING, APPROVED, REJECTED
    stats = signal<any>(null);

    // 審核動作狀態 (Moved to Detail Page)
    // actionNote = signal('');
    // processingAction = signal(false);
    // showRejectDialog = signal(false);

    ngOnInit(): void {
        this.loadStats();
        this.loadSubmissions();
    }

    loadStats(): void {
        this.onboardingService.getApprovalStats().subscribe(stats => {
            this.stats.set(stats);
        });
    }

    loadSubmissions(): void {
        this.loading.set(true);
        this.onboardingService.getPendingApprovals(this.filterStatus()).subscribe({
            next: (data) => {
                this.submissions.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load approvals:', err);
                this.loading.set(false);
            }
        });
    }

    setFilter(status: string): void {
        this.filterStatus.set(status);
        this.loadSubmissions();
    }

    // Detail modal logic removed - see OnboardingApprovalDetailPageComponent

    formatDate(dateStr: string): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-TW', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }
}
