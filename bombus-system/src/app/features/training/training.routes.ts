import { Routes } from '@angular/router';

export const TRAINING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'course-management',
    pathMatch: 'full'
  },
  {
    path: 'course-management',
    loadComponent: () => import('./pages/course-management-page/course-management-page.component')
      .then(m => m.CourseManagementPageComponent)
  },
  {
    path: 'effectiveness',
    loadComponent: () => import('./pages/training-effectiveness-page/training-effectiveness-page.component')
      .then(m => m.TrainingEffectivenessPageComponent)
  },
  {
    path: 'learning-map',
    loadComponent: () => import('./pages/learning-map-page/learning-map-page.component')
      .then(m => m.LearningMapPageComponent)
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
  }
];
