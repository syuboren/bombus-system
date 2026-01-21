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
  },
  {
    path: 'meeting',
    loadComponent: () => import('./pages/meeting-page/meeting-page.component')
      .then(m => m.MeetingPageComponent)
  },
  // 入職簽署功能
  {
    path: 'onboarding/templates',
    loadComponent: () => import('./pages/onboarding-templates-page/onboarding-templates-page.component')
      .then(m => m.OnboardingTemplatesPageComponent)
  },
  {
    path: 'onboarding/templates/new',
    loadComponent: () => import('./pages/template-designer-page/template-designer-page.component')
      .then(m => m.TemplateDesignerPageComponent)
  },
  {
    path: 'onboarding/templates/:id',
    loadComponent: () => import('./pages/template-designer-page/template-designer-page.component')
      .then(m => m.TemplateDesignerPageComponent)
  },
  {
    path: 'onboarding/sign/:token',
    loadComponent: () => import('./pages/onboarding-wizard-page/onboarding-wizard-page.component')
      .then(m => m.OnboardingWizardPageComponent)
  },
  {
    path: 'onboarding/my-documents',
    loadComponent: () => import('./pages/onboarding-documents-page/onboarding-documents-page.component')
      .then(m => m.OnboardingDocumentsPageComponent)
  },
  // 主管簽核功能
  {
    path: 'onboarding/approval',
    loadComponent: () => import('./pages/onboarding-approval-page/onboarding-approval-page.component')
      .then(m => m.OnboardingApprovalPageComponent)
  },
  {
    path: 'onboarding/approval/:id',
    loadComponent: () => import('./pages/onboarding-approval-detail-page/onboarding-approval-detail-page.component')
      .then(m => m.OnboardingApprovalDetailPageComponent)
  }
];
