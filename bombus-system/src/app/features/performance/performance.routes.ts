import { Routes } from '@angular/router';

export const PERFORMANCE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'profit-dashboard',
    pathMatch: 'full'
  },
  {
    path: 'profit-dashboard',
    loadComponent: () => import('./pages/profit-dashboard-page/profit-dashboard-page.component')
      .then(m => m.ProfitDashboardPageComponent)
  },
  {
    path: 'bonus-distribution',
    loadComponent: () => import('./pages/bonus-distribution-page/bonus-distribution-page.component')
      .then(m => m.BonusDistributionPageComponent)
  },
  {
    path: 'goal-task',
    loadComponent: () => import('./pages/goal-task-page/goal-task-page.component')
      .then(m => m.GoalTaskPageComponent)
  },
  {
    path: 'profit-settings',
    loadComponent: () => import('./pages/profit-settings-page/profit-settings-page.component')
      .then(m => m.ProfitSettingsPageComponent)
  }
];

