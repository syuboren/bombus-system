import { Routes } from '@angular/router';
import { featureGateGuard } from '../../core/guards/feature-gate.guard';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'jobs',
    pathMatch: 'full'
  },
  {
    path: 'jobs',
    data: { requiredFeature: 'L1.jobs' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/jobs-page/jobs-page.component')
      .then(m => m.JobsPageComponent)
  },
  {
    path: 'job-candidates',
    loadComponent: () => import('./pages/job-candidates-page/job-candidates-page.component')
      .then(m => m.JobCandidatesPageComponent)
  },
  // 職缺關鍵字管理
  {
    path: 'job-keywords/:jobId',
    loadComponent: () => import('./pages/job-keywords-page/job-keywords-page.component')
      .then(m => m.JobKeywordsPageComponent)
  },
  {
    path: 'profile-detail',
    loadComponent: () => import('./pages/profile-detail-page/profile-detail-page.component')
      .then(m => m.ProfileDetailPageComponent)
  },
  {
    path: 'recruitment',
    data: { requiredFeature: 'L1.recruitment' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/recruitment-page/recruitment-page.component')
      .then(m => m.RecruitmentPageComponent)
  },
  {
    path: 'decision',
    data: { requiredFeature: 'L1.decision' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/decision-page/decision-page.component')
      .then(m => m.DecisionPageComponent)
  },
  {
    path: 'profile',
    data: { requiredFeature: 'L1.profile' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/profile-page/profile-page.component')
      .then(m => m.ProfilePageComponent)
  },
  {
    path: 'talent-pool',
    data: { requiredFeature: 'L1.talent-pool' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/talent-pool-page/talent-pool-page.component')
      .then(m => m.TalentPoolPageComponent)
  },
  {
    path: 'meeting',
    data: { requiredFeature: 'L1.meeting' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/meeting-page/meeting-page.component')
      .then(m => m.MeetingPageComponent)
  },
  // 入職管理（Tab 整合頁面）
  {
    path: 'onboarding',
    data: { requiredFeature: 'L1.onboarding' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/onboarding/onboarding-page/onboarding-page.component')
      .then(m => m.OnboardingPageComponent)
  },
  // 入職文件設計器
  {
    path: 'onboarding/templates/new',
    loadComponent: () => import('./pages/onboarding/template-designer-page/template-designer-page.component')
      .then(m => m.TemplateDesignerPageComponent)
  },
  {
    path: 'onboarding/templates/:id',
    loadComponent: () => import('./pages/onboarding/template-designer-page/template-designer-page.component')
      .then(m => m.TemplateDesignerPageComponent)
  },
  // 入職簽署流程
  {
    path: 'onboarding/sign/:token',
    loadComponent: () => import('./pages/onboarding/onboarding-wizard-page/onboarding-wizard-page.component')
      .then(m => m.OnboardingWizardPageComponent)
  },
  // 簽核詳情頁
  {
    path: 'onboarding/approval/:id',
    loadComponent: () => import('./pages/onboarding/onboarding-approval-detail-page/onboarding-approval-detail-page.component')
      .then(m => m.OnboardingApprovalDetailPageComponent)
  }
];
