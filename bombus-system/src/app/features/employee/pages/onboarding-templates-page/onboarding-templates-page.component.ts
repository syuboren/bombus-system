import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { OnboardingService } from '../../services/onboarding.service';
import { TemplateListItem } from '../../models/onboarding.model';

@Component({
    selector: 'app-onboarding-templates-page',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent],
    templateUrl: './onboarding-templates-page.component.html',
    styleUrl: './onboarding-templates-page.component.scss'
})
export class OnboardingTemplatesPageComponent implements OnInit {
    private onboardingService = inject(OnboardingService);
    private router = inject(Router);

    templates = signal<TemplateListItem[]>([]);
    loading = signal(true);

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

    navigateToTemplate(id: string): void {
        this.router.navigate(['/employee/onboarding/templates', id]);
    }
}
