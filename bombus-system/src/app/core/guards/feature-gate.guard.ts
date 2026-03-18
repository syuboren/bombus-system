import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { FeatureGateService } from '../services/feature-gate.service';
import { NotificationService } from '../services/notification.service';

export const featureGateGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const featureGateService = inject(FeatureGateService);
  const router = inject(Router);
  const notificationService = inject(NotificationService);

  // Decision 4：優先檢查功能層級 requiredFeature
  const requiredFeature = route.data['requiredFeature'] as string | undefined;
  if (requiredFeature && !featureGateService.isFeatureAccessible(requiredFeature)) {
    notificationService.warning('您沒有權限存取此功能');
    return router.createUrlTree(['/dashboard']);
  }

  // Fallback：模組層級 requiredFeaturePrefix
  const requiredFeaturePrefix = route.data['requiredFeaturePrefix'] as string | undefined;
  if (requiredFeaturePrefix && !featureGateService.isModuleEnabled(requiredFeaturePrefix)) {
    notificationService.warning('此模組未啟用');
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
