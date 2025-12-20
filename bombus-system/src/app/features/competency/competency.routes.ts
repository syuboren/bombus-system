import { Routes } from '@angular/router';

export const COMPETENCY_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'grade-matrix',
    pathMatch: 'full'
  },
  {
    path: 'grade-matrix',
    loadComponent: () => import('./pages/grade-matrix-page/grade-matrix-page.component')
      .then(m => m.GradeMatrixPageComponent)
  },
  {
    path: 'job-description',
    loadComponent: () => import('./pages/job-description-page/job-description-page.component')
      .then(m => m.JobDescriptionPageComponent)
  },
  {
    path: 'job-description/create',
    loadComponent: () => import('./pages/create-jd-page/create-jd-page.component')
      .then(m => m.CreateJDPageComponent)
  },
  {
    path: 'framework',
    loadComponent: () => import('./pages/framework-page/framework-page.component')
      .then(m => m.FrameworkPageComponent)
  },
  {
    path: 'gap-analysis',
    loadComponent: () => import('./pages/gap-analysis-page/gap-analysis-page.component')
      .then(m => m.GapAnalysisPageComponent)
  },
  {
    path: 'assessment',
    loadComponent: () => import('./pages/assessment-page/assessment-page.component')
      .then(m => m.AssessmentPageComponent)
  }
];
