import { Routes } from '@angular/router';
import { featureGateGuard } from '../../core/guards/feature-gate.guard';

export const PROJECT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./pages/project-list-page/project-list-page.component')
      .then(m => m.ProjectListPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L4.list' }
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./pages/project-detail-page/project-detail-page.component')
      .then(m => m.ProjectDetailPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L4.list' }
  },
  {
    path: 'profit-prediction',
    loadComponent: () => import('./pages/profit-prediction-page/profit-prediction-page.component')
      .then(m => m.ProfitPredictionPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L4.profit-prediction' }
  },
  {
    path: 'forecast',
    loadComponent: () => import('./pages/forecast-tracking-page/forecast-tracking-page.component')
      .then(m => m.ForecastTrackingPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L4.forecast' }
  },
  {
    path: 'report',
    loadComponent: () => import('./pages/project-report-page/project-report-page.component')
      .then(m => m.ProjectReportPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L4.report' }
  }
];
