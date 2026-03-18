import { Routes } from '@angular/router';
import { featureGateGuard } from '../../core/guards/feature-gate.guard';

export const COMPETENCY_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'grade-matrix',
    pathMatch: 'full'
  },
  {
    path: 'grade-matrix',
    data: { requiredFeature: 'L2.grade-matrix' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/grade-matrix-page/grade-matrix-page.component')
      .then(m => m.GradeMatrixPageComponent)
  },
  {
    path: 'job-description',
    data: { requiredFeature: 'L2.job-description' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/job-description-page/job-description-page.component')
      .then(m => m.JobDescriptionPageComponent)
  },
  {
    path: 'job-description/create',
    data: { requiredFeature: 'L2.job-description' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/create-jd-page/create-jd-page.component')
      .then(m => m.CreateJDPageComponent)
  },
  {
    path: 'job-description/edit/:id',
    data: { requiredFeature: 'L2.job-description' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/create-jd-page/create-jd-page.component')
      .then(m => m.CreateJDPageComponent)
  },
  {
    path: 'framework',
    data: { requiredFeature: 'L2.framework' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/framework-page/framework-page.component')
      .then(m => m.FrameworkPageComponent)
  },
  {
    path: 'gap-analysis',
    data: { requiredFeature: 'L2.gap-analysis' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/gap-analysis-page/gap-analysis-page.component')
      .then(m => m.GapAnalysisPageComponent)
  },
  {
    path: 'assessment',
    data: { requiredFeature: 'L2.assessment' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/assessment-page/assessment-page.component')
      .then(m => m.AssessmentPageComponent)
  },
  {
    path: 'templates',
    loadComponent: () => import('./pages/template-manage-page/template-manage-page.component')
      .then(m => m.TemplateManagePageComponent)
  }
];
