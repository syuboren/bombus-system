import { Routes } from '@angular/router';

export const TRAINING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'competency-heatmap',
    pathMatch: 'full'
  },
  {
    path: 'competency-heatmap',
    loadComponent: () => import('./pages/competency-heatmap-page/competency-heatmap-page.component')
      .then(m => m.CompetencyHeatmapPageComponent)
  },
  {
    path: 'nine-box',
    loadComponent: () => import('./pages/nine-box-page/nine-box-page.component')
      .then(m => m.NineBoxPageComponent)
  },
  {
    path: 'learning-path',
    loadComponent: () => import('./pages/learning-path-page/learning-path-page.component')
      .then(m => m.LearningPathPageComponent)
  },
  {
    path: 'key-talent',
    loadComponent: () => import('./pages/key-talent-page/key-talent-page.component')
      .then(m => m.KeyTalentPageComponent)
  },
  {
    path: 'course-management',
    loadComponent: () => import('./pages/course-management-page/course-management-page.component')
      .then(m => m.CourseManagementPageComponent)
  }
];
