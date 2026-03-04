import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';
import { UserScope } from '../../features/auth/models/auth.model';

export interface PermissionInfo {
  resource: string;
  action: string;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  // 權限快取
  private permissionsSignal = signal<string[]>([]);
  private rolesSignal = signal<string[]>([]);
  private scopeSignal = signal<UserScope | null>(null);

  readonly permissions = this.permissionsSignal.asReadonly();
  readonly roles = this.rolesSignal.asReadonly();
  readonly scope = this.scopeSignal.asReadonly();

  readonly isSuperAdmin = computed(() =>
    this.rolesSignal().includes('super_admin')
  );

  readonly isPlatformAdmin = computed(() =>
    this.authService.currentUser()?.isPlatformAdmin === true
  );

  /**
   * 從後端載入使用者權限（登入後呼叫）
   */
  loadPermissions(): Observable<string[]> {
    const user = this.authService.currentUser();
    if (!user) {
      this.permissionsSignal.set([]);
      this.rolesSignal.set([]);
      this.scopeSignal.set(null);
      return of([]);
    }

    // 設定 roles 和 scope
    this.rolesSignal.set(user.roles || []);
    this.scopeSignal.set(user.scope || null);

    // 如果 user 已帶有 permissions（從 token 解析），直接使用
    if (user.permissions && user.permissions.length > 0) {
      this.permissionsSignal.set(user.permissions);
      return of(user.permissions);
    }

    // 從後端查詢完整權限（多角色聯集）
    return this.http.get<{ permissions: string[] }>('/api/tenant-admin/my-permissions').pipe(
      map(res => {
        this.permissionsSignal.set(res.permissions);
        return res.permissions;
      }),
      catchError(() => {
        // 若 API 不存在，回退至空權限
        this.permissionsSignal.set([]);
        return of([]);
      })
    );
  }

  /**
   * 檢查是否擁有特定權限（resource:action 格式）
   */
  hasPermission(resource: string, action: string): boolean {
    // super_admin 擁有所有權限
    if (this.isSuperAdmin()) return true;

    const key = `${resource}:${action}`;
    return this.permissionsSignal().includes(key);
  }

  /**
   * 檢查是否擁有特定角色
   */
  hasRole(role: string): boolean {
    return this.rolesSignal().includes(role);
  }

  /**
   * 檢查是否擁有任一角色
   */
  hasAnyRole(roles: string[]): boolean {
    return roles.some(role => this.rolesSignal().includes(role));
  }

  /**
   * 取得有效權限列表
   */
  getEffectivePermissions(): string[] {
    return this.permissionsSignal();
  }

  /**
   * 清除權限快取（登出時呼叫）
   */
  clearPermissions(): void {
    this.permissionsSignal.set([]);
    this.rolesSignal.set([]);
    this.scopeSignal.set(null);
  }
}
