import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  standalone: true,
  selector: 'app-change-password-page',
  templateUrl: './change-password-page.component.html',
  styleUrl: './change-password-page.component.scss',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePasswordPageComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);
  showCurrentPassword = signal(false);
  showNewPassword = signal(false);

  readonly user = this.authService.currentUser;

  passwordsMatch = computed(() =>
    this.newPassword() === this.confirmPassword()
  );

  canSubmit = computed(() =>
    this.currentPassword().length >= 1 &&
    this.newPassword().length >= 8 &&
    this.passwordsMatch() &&
    !this.isLoading()
  );

  onSubmit(): void {
    if (!this.canSubmit()) return;
    this.errorMessage.set(null);
    this.isLoading.set(true);

    const user = this.authService.getCurrentUser();
    const tenantSlug = user?.tenant_slug;
    if (!tenantSlug) {
      this.isLoading.set(false);
      this.errorMessage.set('無法取得租戶資訊，請重新登入');
      return;
    }

    this.authService.changePassword({
      current_password: this.currentPassword(),
      new_password: this.newPassword(),
      tenant_slug: tenantSlug
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.notificationService.success('密碼已變更成功');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || '變更失敗，請稍後再試');
      }
    });
  }
}
