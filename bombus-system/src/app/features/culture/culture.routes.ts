import { Routes } from '@angular/router';
import { featureGateGuard } from '../../core/guards/feature-gate.guard';

export const CULTURE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'handbook',
    pathMatch: 'full'
  },
  {
    path: 'handbook',
    loadComponent: () => import('./pages/culture-handbook-page/culture-handbook-page.component')
      .then(m => m.CultureHandbookPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L6.handbook' }
  },
  {
    path: 'eap',
    loadComponent: () => import('./pages/eap-page/eap-page.component')
      .then(m => m.EapPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L6.eap' }
  },
  {
    path: 'awards',
    loadComponent: () => import('./pages/awards-page/awards-page.component')
      .then(m => m.AwardsPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L6.awards' }
  },
  {
    path: 'documents',
    loadComponent: () => import('./pages/document-repository-page/document-repository-page.component')
      .then(m => m.DocumentRepositoryPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L6.documents' }
  },
  {
    path: 'ai-assistant',
    loadComponent: () => import('./pages/ai-assistant-page/ai-assistant-page.component')
      .then(m => m.AiAssistantPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L6.ai-assistant' }
  },
  {
    path: 'analysis',
    loadComponent: () => import('./pages/document-analysis-page/document-analysis-page.component')
      .then(m => m.DocumentAnalysisPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L6.analysis' }
  },
  {
    path: 'impact',
    loadComponent: () => import('./pages/impact-assessment-page/impact-assessment-page.component')
      .then(m => m.ImpactAssessmentPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L6.impact' }
  }
];

