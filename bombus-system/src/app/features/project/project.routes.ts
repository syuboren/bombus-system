import { Routes } from '@angular/router';

export const PROJECT_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./pages/project-list-page/project-list-page.component')
      .then(m => m.ProjectListPageComponent)
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./pages/project-detail-page/project-detail-page.component')
      .then(m => m.ProjectDetailPageComponent)
  },
  {
    path: 'profit-prediction',
    loadComponent: () => import('./pages/profit-prediction-page/profit-prediction-page.component')
      .then(m => m.ProfitPredictionPageComponent)
  },
  {
    path: 'forecast',
    loadComponent: () => import('./pages/forecast-tracking-page/forecast-tracking-page.component')
      .then(m => m.ForecastTrackingPageComponent)
  },
  {
    path: 'report',
    loadComponent: () => import('./pages/project-report-page/project-report-page.component')
      .then(m => m.ProjectReportPageComponent)
  }
];
