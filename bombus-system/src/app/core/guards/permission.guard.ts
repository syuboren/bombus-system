import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { PermissionService } from '../services/permission.service';

/**
 * PermissionGuard — 檢查使用者是否擁有路由所需權限
 *
 * 使用方式（在 route data 設定）：
 * {
 *   path: 'settings',
 *   canActivate: [permissionGuard],
 *   data: { requiredPermission: 'settings:manage' }
 * }
 *
 * 也可用 requiredRoles：
 * {
 *   data: { requiredRoles: ['super_admin', 'subsidiary_admin'] }
 * }
 */
export const permissionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  // 頁面重整時 rolesSignal 可能尚未從 currentUser 初始化，同步載入
  if (permissionService.roles().length === 0) {
    permissionService.loadPermissions().subscribe();
  }

  // 檢查角色
  const requiredRoles = route.data['requiredRoles'] as string[] | undefined;
  if (requiredRoles && requiredRoles.length > 0) {
    if (!permissionService.hasAnyRole(requiredRoles)) {
      return router.createUrlTree(['/dashboard']);
    }
  }

  // 檢查權限（resource:action 格式）
  const requiredPermission = route.data['requiredPermission'] as string | undefined;
  if (requiredPermission) {
    const [resource, action] = requiredPermission.split(':');
    if (!permissionService.hasPermission(resource, action)) {
      return router.createUrlTree(['/dashboard']);
    }
  }

  return true;
};
