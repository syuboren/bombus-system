import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, delay, tap } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  User,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  RememberedCredentials
} from '../models/auth.model';

const STORAGE_KEY = 'bombus_remembered_credentials';
const TOKEN_KEY = 'bombus_auth_token';
const USER_KEY = 'bombus_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);

  // Signals for reactive state
  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal(false);

  // Public computed signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUserSignal());

  constructor() {
    this.checkStoredSession();
  }

  /**
   * 檢查是否有已儲存的登入狀態
   */
  private checkStoredSession(): void {
    const token = localStorage.getItem(TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        this.currentUserSignal.set(user);
      } catch {
        this.clearSession();
      }
    }
  }

  /**
   * 登入
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    this.isLoadingSignal.set(true);

    // 模擬 API 呼叫
    return of(this.mockLogin(request)).pipe(
      delay(1500),
      tap(response => {
        this.isLoadingSignal.set(false);

        if (response.success && response.user && response.token) {
          // 儲存登入狀態
          localStorage.setItem(TOKEN_KEY, response.token);
          localStorage.setItem(USER_KEY, JSON.stringify(response.user));
          this.currentUserSignal.set(response.user);

          // 處理記住登入資訊
          if (request.rememberMe) {
            this.saveCredentials(request.username);
          } else {
            this.clearCredentials();
          }
        }
      })
    );
  }

  /**
   * 登出
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * 清除登入狀態
   */
  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
  }

  /**
   * 忘記密碼
   */
  forgotPassword(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    this.isLoadingSignal.set(true);

    // 模擬 API 呼叫
    return of({
      success: true,
      message: `密碼重設連結已發送至 ${request.email}`
    }).pipe(
      delay(1500),
      tap(() => this.isLoadingSignal.set(false))
    );
  }

  /**
   * 儲存記住的帳號
   */
  private saveCredentials(username: string): void {
    const credentials: RememberedCredentials = {
      username,
      rememberMe: true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  }

  /**
   * 清除記住的帳號
   */
  private clearCredentials(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 取得記住的帳號
   */
  getRememberedCredentials(): RememberedCredentials | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as RememberedCredentials;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * 模擬登入邏輯
   */
  private mockLogin(request: LoginRequest): LoginResponse {
    // Demo 帳號：admin / admin123
    if (request.username === 'admin' && request.password === 'admin123') {
      return {
        success: true,
        message: '登入成功',
        user: {
          id: 'U001',
          username: 'admin',
          email: 'admin@bombus.com',
          name: '系統管理員',
          role: 'admin',
          department: '資訊部',
          lastLogin: new Date()
        },
        token: 'mock-jwt-token-' + Date.now()
      };
    }

    // Demo 帳號：user / user123
    if (request.username === 'user' && request.password === 'user123') {
      return {
        success: true,
        message: '登入成功',
        user: {
          id: 'U002',
          username: 'user',
          email: 'user@bombus.com',
          name: '一般使用者',
          role: 'employee',
          department: '業務部',
          lastLogin: new Date()
        },
        token: 'mock-jwt-token-' + Date.now()
      };
    }

    return {
      success: false,
      message: '帳號或密碼錯誤'
    };
  }
}

