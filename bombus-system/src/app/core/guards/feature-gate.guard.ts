import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { FeatureGateService } from '../services/feature-gate.service';

export const featureGateGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const featureGateService = inject(FeatureGateService);
  const router = inject(Router);

  const requiredFeaturePrefix = route.data['requiredFeaturePrefix'] as string | undefined;
  if (requiredFeaturePrefix && !featureGateService.isModuleEnabled(requiredFeaturePrefix)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
