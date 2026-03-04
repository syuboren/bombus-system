import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest, PlatformLoginRequest } from '../../models/auth.model';

@Component({
  standalone: true,
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Login mode
  loginMode = signal<'tenant' | 'platform'>('tenant');

  // Form state
  email = signal('');
  password = signal('');
  tenantSlug = signal('demo');
  rememberMe = signal(false);
  showPassword = signal(false);

  /** @deprecated 向後相容 alias */
  username = this.email;

  // Forgot password modal
  showForgotModal = signal(false);
  forgotEmail = signal('');
  forgotEmailSent = signal(false);

  // Error state
  errorMessage = signal<string | null>(null);
  forgotErrorMessage = signal<string | null>(null);
  forgotSuccessMessage = signal<string | null>(null);

  // Loading state from service
  readonly isLoading = this.authService.isLoading;

  // Current year for footer
  readonly currentYear = new Date().getFullYear();

  ngOnInit(): void {
    // 檢查是否已登入
    if (this.authService.isLoggedIn()) {
      const user = this.authService.getCurrentUser();
      this.router.navigate([user?.isPlatformAdmin ? '/platform' : '/dashboard']);
      return;
    }

    // 載入記住的帳號
    const remembered = this.authService.getRememberedCredentials();
    if (remembered) {
      this.email.set(remembered.email || '');
      if (remembered.tenant_slug) {
        this.tenantSlug.set(remembered.tenant_slug);
      }
      this.rememberMe.set(remembered.rememberMe);
    }
  }

  /**
   * 切換登入模式
   */
  switchMode(mode: 'tenant' | 'platform'): void {
    this.loginMode.set(mode);
    this.errorMessage.set(null);
  }

  /**
   * 切換密碼顯示
   */
  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  /**
   * 執行登入
   */
  onLogin(): void {
    this.errorMessage.set(null);

    if (!this.email() || !this.password()) {
      this.errorMessage.set('請輸入電子郵件和密碼');
      return;
    }

    if (this.loginMode() === 'platform') {
      this.onPlatformLogin();
    } else {
      this.onTenantLogin();
    }
  }

  private onTenantLogin(): void {
    if (!this.tenantSlug()) {
      this.errorMessage.set('請輸入組織代碼');
      return;
    }

    const request: LoginRequest = {
      email: this.email(),
      password: this.password(),
      tenant_slug: this.tenantSlug(),
      rememberMe: this.rememberMe()
    };

    this.authService.login(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: () => {
        this.errorMessage.set('系統發生錯誤，請稍後再試');
      }
    });
  }

  private onPlatformLogin(): void {
    const request: PlatformLoginRequest = {
      email: this.email(),
      password: this.password()
    };

    this.authService.platformLogin(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/platform']);
        } else {
          this.errorMessage.set(response.message);
        }
      },
      error: () => {
        this.errorMessage.set('系統發生錯誤，請稍後再試');
      }
    });
  }

  /**
   * 開啟忘記密碼 Modal
   */
  openForgotModal(): void {
    this.forgotEmail.set('');
    this.forgotErrorMessage.set(null);
    this.forgotSuccessMessage.set(null);
    this.forgotEmailSent.set(false);
    this.showForgotModal.set(true);
  }

  /**
   * 關閉忘記密碼 Modal
   */
  closeForgotModal(): void {
    this.showForgotModal.set(false);
  }

  /**
   * 發送密碼重設連結
   */
  onForgotPassword(): void {
    this.forgotErrorMessage.set(null);
    this.forgotSuccessMessage.set(null);

    const email = this.forgotEmail();

    // 驗證 Email
    if (!email) {
      this.forgotErrorMessage.set('請輸入電子郵件地址');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.forgotErrorMessage.set('請輸入有效的電子郵件地址');
      return;
    }

    this.authService.forgotPassword({ email }).subscribe({
      next: (response) => {
        if (response.success) {
          this.forgotSuccessMessage.set(response.message);
          this.forgotEmailSent.set(true);
        } else {
          this.forgotErrorMessage.set(response.message);
        }
      },
      error: () => {
        this.forgotErrorMessage.set('系統發生錯誤，請稍後再試');
      }
    });
  }

  /**
   * 處理 Enter 鍵登入
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !this.isLoading()) {
      this.onLogin();
    }
  }
}

