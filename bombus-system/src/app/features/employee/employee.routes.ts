import { Routes } from '@angular/router';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'jobs',
    pathMatch: 'full'
  },
  {
    path: 'jobs',
    loadComponent: () => import('./pages/jobs-page/jobs-page.component')
      .then(m => m.JobsPageComponent)
  },
  {
    path: 'job-candidates',
    loadComponent: () => import('./pages/job-candidates-page/job-candidates-page.component')
      .then(m => m.JobCandidatesPageComponent)
  },
  {
    path: 'profile-detail',
    loadComponent: () => import('./pages/profile-detail-page/profile-detail-page.component')
      .then(m => m.ProfileDetailPageComponent)
  },
  {
    path: 'recruitment',
    loadComponent: () => import('./pages/recruitment-page/recruitment-page.component')
      .then(m => m.RecruitmentPageComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile-page/profile-page.component')
      .then(m => m.ProfilePageComponent)
  },
  {
    path: 'talent-pool',
    loadComponent: () => import('./pages/talent-pool-page/talent-pool-page.component')
      .then(m => m.TalentPoolPageComponent)
  }
];
