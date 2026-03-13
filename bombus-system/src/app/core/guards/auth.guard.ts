import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';

export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // 強制改密碼：must_change_password 為 true 時只允許 /change-password
  const user = authService.currentUser();
  if (user?.must_change_password && route.routeConfig?.path !== 'change-password') {
    return router.createUrlTree(['/change-password']);
  }

  return true;
};
