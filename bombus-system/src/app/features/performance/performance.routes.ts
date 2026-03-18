import { Routes } from '@angular/router';
import { featureGateGuard } from '../../core/guards/feature-gate.guard';

export const PERFORMANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'profit-dashboard',
    pathMatch: 'full'
  },
  {
    path: 'profit-dashboard',
    loadComponent: () => import('./pages/profit-dashboard-page/profit-dashboard-page.component')
      .then(m => m.ProfitDashboardPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L5.profit-dashboard' }
  },
  {
    path: 'bonus-distribution',
    loadComponent: () => import('./pages/bonus-distribution-page/bonus-distribution-page.component')
      .then(m => m.BonusDistributionPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L5.bonus-distribution' }
  },
  {
    path: 'goal-task',
    loadComponent: () => import('./pages/goal-task-page/goal-task-page.component')
      .then(m => m.GoalTaskPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L5.goal-task' }
  },
  {
    path: 'profit-settings',
    loadComponent: () => import('./pages/profit-settings-page/profit-settings-page.component')
      .then(m => m.ProfitSettingsPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L5.profit-settings' }
  }
];

