import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PublicReferralService, ReferralIntakeContext } from '../../services/public-referral.service';
import { CandidateFullFormComponent } from '../../../../shared/components/candidate-full-form/candidate-full-form.component';
import { CandidateFullForm } from '../../../../shared/components/candidate-full-form/candidate-full-form.model';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; ctx: ReferralIntakeContext }
  | { kind: 'error'; reason: string; message: string };

@Component({
  selector: 'app-referral-intake-page',
  standalone: true,
  imports: [CommonModule, CandidateFullFormComponent],
  templateUrl: './referral-intake-page.component.html',
  styleUrl: './referral-intake-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReferralIntakePageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private publicReferralService = inject(PublicReferralService);

  state = signal<LoadState>({ kind: 'loading' });
  submitting = signal<boolean>(false);
  submitError = signal<string | null>(null);

  private token = '';

  // 公開 token 版的附件上傳端點
  uploadEndpoint = signal<string>('');

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    if (!this.token) {
      this.router.navigate(['/public/referral-invalid'], { queryParams: { reason: 'missing' } });
      return;
    }

    this.uploadEndpoint.set(`/api/public/referrals/${this.token}/upload`);

    this.publicReferralService.fetchInvitationByToken(this.token).subscribe({
      next: ctx => this.state.set({ kind: 'ready', ctx }),
      error: (err: HttpErrorResponse) => {
        const code = err?.error?.error || 'UNKNOWN';
        this.router.navigate(['/public/referral-invalid'], { queryParams: { reason: code } });
      }
    });
  }

  onSubmit(form: CandidateFullForm): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.submitError.set(null);

    this.publicReferralService.submitIntake(this.token, form).subscribe({
      next: () => {
        this.router.navigate(['/public/referral-success']);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const code = err?.error?.error;
        if (code === 'DUPLICATE_CANDIDATE') {
          this.submitError.set('您已應徵過此職缺，請聯繫 HR 確認。');
        } else if (code === 'EXPIRED' || code === 'ALREADY_SUBMITTED' || code === 'CANCELLED' || code === 'INVALID_TOKEN') {
          this.router.navigate(['/public/referral-invalid'], { queryParams: { reason: code } });
        } else {
          this.submitError.set(err?.error?.message || '送出失敗，請稍後再試');
        }
      }
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}/${mm}/${dd}`;
  }
}
