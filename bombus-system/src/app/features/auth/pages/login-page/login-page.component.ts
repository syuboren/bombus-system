import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/auth.model';

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

  // Form state
  username = signal('');
  password = signal('');
  rememberMe = signal(false);
  showPassword = signal(false);

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
      this.router.navigate(['/dashboard']);
      return;
    }

    // 載入記住的帳號
    const remembered = this.authService.getRememberedCredentials();
    if (remembered) {
      this.username.set(remembered.username);
      this.rememberMe.set(remembered.rememberMe);
    }
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

    // 表單驗證
    if (!this.username() || !this.password()) {
      this.errorMessage.set('請輸入帳號和密碼');
      return;
    }

    const request: LoginRequest = {
      username: this.username(),
      password: this.password(),
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

