import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, map, catchError, switchMap } from 'rxjs';
import {
  LoginRequest,
  LoginResponse,
  TokenResponse,
  RefreshTokenResponse,
  User,
  UserFeaturePerm,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  RememberedCredentials,
  PlatformLoginRequest,
  ChangePasswordRequest,
  ChangePasswordResponse
} from '../models/auth.model';

const STORAGE_KEY = 'bombus_remembered_credentials';
const ACCESS_TOKEN_KEY = 'bombus_access_token';
const REFRESH_TOKEN_KEY = 'bombus_refresh_token';
const USER_KEY = 'bombus_user';
const FEATURE_PERMS_KEY = 'bombus_feature_perms';

/** @deprecated 向後相容 key，6.2 後移除 */
const LEGACY_TOKEN_KEY = 'bombus_auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Signals for reactive state
  private currentUserSignal = signal<User | null>(null);
  private isLoadingSignal = signal(false);
  private featurePermsSignal = signal<Map<string, UserFeaturePerm>>(new Map());

  // Public computed signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUserSignal());
  readonly featurePerms = this.featurePermsSignal.asReadonly();

  constructor() {
    this.checkStoredSession();
  }

  /**
   * 取得當前使用者（同步方式）
   */
  getCurrentUser(): User | null {
    return this.currentUserSignal();
  }

  /**
   * 取得 Access Token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
      || localStorage.getItem(LEGACY_TOKEN_KEY);
  }

  /**
   * 取得 Refresh Token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * 判斷是否為 HR（可管理員工文件）
   * 使用 roles 或 deprecated 欄位判斷
   */
  isHR(): boolean {
    const user = this.currentUserSignal();
    if (!user) return false;
    // 新邏輯：檢查 roles
    if (user.roles?.some(r => ['super_admin', 'subsidiary_admin', 'hr_manager'].includes(r))) {
      return true;
    }
    // 向後相容
    return user.role === 'admin' || user.department === '人資部';
  }

  /**
   * Observable 版本（供非同步場景使用）
   */
  isHR$(): Observable<boolean> {
    return of(this.isHR());
  }

  /**
   * 檢查是否有已儲存的登入狀態
   */
  private checkStoredSession(): void {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY)
      || localStorage.getItem(LEGACY_TOKEN_KEY);
    const userJson = localStorage.getItem(USER_KEY);

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        this.currentUserSignal.set(user);
        this.restoreFeaturePerms();
      } catch {
        this.clearSession();
      }
    }
  }

  /**
   * 登入（呼叫後端 /api/auth/login）
   */
  login(request: LoginRequest): Observable<LoginResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<TokenResponse>('/api/auth/login', {
      email: request.email,
      password: request.password,
      tenant_slug: request.tenant_slug
    }).pipe(
      switchMap(tokenRes => {
        // 儲存 Token
        localStorage.setItem(ACCESS_TOKEN_KEY, tokenRes.access_token);
        localStorage.setItem(REFRESH_TOKEN_KEY, tokenRes.refresh_token);

        // 合併 must_change_password + tenant_slug 到 user
        const user: User = {
          ...tokenRes.user,
          must_change_password: tokenRes.user.must_change_password || tokenRes.must_change_password,
          tenant_slug: request.tenant_slug
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        // 清除舊版 key
        localStorage.removeItem(LEGACY_TOKEN_KEY);

        this.currentUserSignal.set(user);

        // 處理記住登入資訊
        if (request.rememberMe) {
          this.saveCredentials(request.email, request.tenant_slug);
        } else {
          this.clearCredentials();
        }

        const loginResponse: LoginResponse = {
          success: true,
          message: '登入成功',
          user,
          token: tokenRes.access_token
        };

        // Decision 1：登入後載入功能權限（平台管理員跳過）
        if (!user.isPlatformAdmin) {
          return this.loadFeaturePerms().pipe(
            map(() => loginResponse),
            catchError(() => of(loginResponse))
          );
        }
        return of(loginResponse);
      }),
      catchError(err => {
        const message = err.error?.message || '登入失敗，請稍後再試';
        return of({
          success: false,
          message
        } as LoginResponse);
      }),
      tap(() => this.isLoadingSignal.set(false))
    );
  }

  /**
   * 平台管理員登入（呼叫後端 /api/auth/platform-login）
   */
  platformLogin(request: PlatformLoginRequest): Observable<LoginResponse> {
    this.isLoadingSignal.set(true);

    return this.http.post<{ access_token: string; token_type: string; expires_in: string; user: User }>(
      '/api/auth/platform-login',
      { email: request.email, password: request.password }
    ).pipe(
      map(res => {
        localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        localStorage.removeItem(LEGACY_TOKEN_KEY);

        this.currentUserSignal.set(res.user);

        return {
          success: true,
          message: '登入成功',
          user: res.user,
          token: res.access_token
        } as LoginResponse;
      }),
      catchError(err => {
        const message = err.error?.message || '登入失敗，請稍後再試';
        return of({ success: false, message } as LoginResponse);
      }),
      tap(() => this.isLoadingSignal.set(false))
    );
  }

  /**
   * 刷新 Access Token
   */
  refreshToken(): Observable<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.clearSession();
      return of(null);
    }

    return this.http.post<RefreshTokenResponse>('/api/auth/refresh', {
      refresh_token: refreshToken
    }).pipe(
      switchMap(res => {
        localStorage.setItem(ACCESS_TOKEN_KEY, res.access_token);
        if (res.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.currentUserSignal.set(res.user);
        }
        // Token refresh 時重新載入功能權限
        return this.loadFeaturePerms().pipe(
          map(() => res.access_token),
          catchError(() => of(res.access_token))
        );
      }),
      catchError(() => {
        this.clearSession();
        this.router.navigate(['/login']);
        return of(null);
      })
    );
  }

  /**
   * 登出
   */
  logout(): void {
    const refreshToken = this.getRefreshToken();

    // 通知後端撤銷 refresh token
    if (refreshToken) {
      this.http.post('/api/auth/logout', { refresh_token: refreshToken })
        .subscribe({ error: () => {} });
    }

    this.clearSession();
    this.router.navigate(['/login']);
  }

  /**
   * 清除登入狀態
   */
  private clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(FEATURE_PERMS_KEY);
    this.currentUserSignal.set(null);
    this.featurePermsSignal.set(new Map());
  }

  /**
   * 忘記密碼（目前仍為模擬）
   */
  forgotPassword(request: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    this.isLoadingSignal.set(true);

    return of({
      success: true,
      message: `密碼重設連結已發送至 ${request.email}`
    }).pipe(
      tap(() => this.isLoadingSignal.set(false))
    );
  }

  /**
   * 變更密碼
   */
  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse> {
    return this.http.post<ChangePasswordResponse>('/api/auth/change-password', request).pipe(
      tap(res => {
        if (res.success) {
          const user = this.currentUserSignal();
          if (user) {
            const updated = { ...user, must_change_password: false };
            this.currentUserSignal.set(updated);
            localStorage.setItem(USER_KEY, JSON.stringify(updated));
          }
        }
      })
    );
  }

  /**
   * 從後端載入合併後的功能權限
   */
  private loadFeaturePerms(): Observable<void> {
    return this.http.get<{ featurePerms: Array<{ feature_id: string; action_level: string; edit_scope: string | null; view_scope: string | null }> }>(
      '/api/auth/my-feature-perms'
    ).pipe(
      tap(res => {
        const permsMap = new Map<string, UserFeaturePerm>();
        for (const p of res.featurePerms || []) {
          permsMap.set(p.feature_id, {
            action_level: p.action_level as UserFeaturePerm['action_level'],
            edit_scope: p.edit_scope as UserFeaturePerm['edit_scope'],
            view_scope: p.view_scope as UserFeaturePerm['view_scope']
          });
        }
        this.featurePermsSignal.set(permsMap);
        localStorage.setItem(FEATURE_PERMS_KEY, JSON.stringify(Array.from(permsMap.entries())));
      }),
      map(() => void 0)
    );
  }

  /**
   * 從 localStorage 還原功能權限
   */
  private restoreFeaturePerms(): void {
    const stored = localStorage.getItem(FEATURE_PERMS_KEY);
    if (stored) {
      try {
        const entries = JSON.parse(stored) as Array<[string, UserFeaturePerm]>;
        this.featurePermsSignal.set(new Map(entries));
      } catch {
        // ignore
      }
    }
  }

  /**
   * 儲存記住的帳號
   */
  private saveCredentials(email: string, tenantSlug?: string): void {
    const credentials: RememberedCredentials = {
      email,
      tenant_slug: tenantSlug,
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
}
