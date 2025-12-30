import { Routes } from '@angular/router';

export const CULTURE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'handbook',
    pathMatch: 'full'
  },
  {
    path: 'handbook',
    loadComponent: () => import('./pages/culture-handbook-page/culture-handbook-page.component')
      .then(m => m.CultureHandbookPageComponent)
  },
  {
    path: 'eap',
    loadComponent: () => import('./pages/eap-page/eap-page.component')
      .then(m => m.EapPageComponent)
  },
  {
    path: 'awards',
    loadComponent: () => import('./pages/awards-page/awards-page.component')
      .then(m => m.AwardsPageComponent)
  },
  {
    path: 'documents',
    loadComponent: () => import('./pages/document-repository-page/document-repository-page.component')
      .then(m => m.DocumentRepositoryPageComponent)
  },
  {
    path: 'ai-assistant',
    loadComponent: () => import('./pages/ai-assistant-page/ai-assistant-page.component')
      .then(m => m.AiAssistantPageComponent)
  },
  {
    path: 'analysis',
    loadComponent: () => import('./pages/document-analysis-page/document-analysis-page.component')
      .then(m => m.DocumentAnalysisPageComponent)
  },
  {
    path: 'impact',
    loadComponent: () => import('./pages/impact-assessment-page/impact-assessment-page.component')
      .then(m => m.ImpactAssessmentPageComponent)
  }
];

