/**
 * Onboarding Wizard Page
 * 員工入職填寫精靈
 */

import { Component, OnInit, inject, signal, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OnboardingService } from '../../services/onboarding.service';
import { SignSchema, SignStep } from '../../models/onboarding.model';
import { SignaturePadComponent } from '../../components/signature-pad/signature-pad.component';

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

    // 狀態
    token = signal<string>('');
    schema = signal<SignSchema | null>(null);
    loading = signal(true);
    error = signal<string | null>(null);
    currentStep = signal(0);
    formData = signal<Record<string, any>>({});
    submitting = signal(false);
    completed = signal(false);
    agreedTerms = signal(false);

    // 計算屬性
    steps = computed(() => this.schema()?.steps || []);
    currentStepData = computed(() => this.steps()[this.currentStep()] || null);
    isLastStep = computed(() => this.currentStep() >= this.steps().length - 1);
    isFirstStep = computed(() => this.currentStep() === 0);

    ngOnInit(): void {
        const token = this.route.snapshot.paramMap.get('token');
        if (token) {
            this.token.set(token);
            this.loadSchema(token);
        } else {
            this.error.set('無效的簽署連結');
            this.loading.set(false);
        }
    }

    loadSchema(token: string): void {
        this.onboardingService.getSignSchema(token).subscribe({
            next: (schema) => {
                this.schema.set(schema);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to load schema:', err);
                this.error.set(err.error?.error || '無法載入簽署文件');
                this.loading.set(false);
            }
        });
    }

    updateField(key: string, value: any): void {
        this.formData.update(data => ({ ...data, [key]: value }));
    }

    nextStep(): void {
        if (!this.validateCurrentStep()) return;

        if (this.isLastStep()) {
            this.submit();
        } else {
            this.currentStep.update(s => s + 1);
        }
    }

    prevStep(): void {
        if (!this.isFirstStep()) {
            this.currentStep.update(s => s - 1);
        }
    }

    validateCurrentStep(): boolean {
        const step = this.currentStepData();
        if (!step) return true;

        // 驗證必填欄位
        for (const field of step.fields) {
            if (field.required) {
                const value = this.formData()[field.key];
                if (field.type === 'signature') {
                    if (this.signaturePad && this.signaturePad.isEmpty()) {
                        alert('請完成簽名');
                        return false;
                    }
                } else if (!value || value.toString().trim() === '') {
                    alert(`請填寫「${field.label}」`);
                    return false;
                }
            }
        }

        // 驗證條款同意
        if (step.title === '條款簽署' && !this.agreedTerms()) {
            alert('請先閱讀並同意條款');
            return false;
        }

        return true;
    }

    clearSignature(): void {
        this.signaturePad?.clear();
    }

    submit(): void {
        if (!this.validateCurrentStep()) return;

        this.submitting.set(true);

        // Get signature data
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
}
