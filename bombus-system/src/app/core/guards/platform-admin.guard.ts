import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

/**
 * PlatformAdminGuard — 僅允許平台管理員存取
 */
export const platformAdminGuard: CanActivateFn = () => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  if (permissionService.isPlatformAdmin()) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
