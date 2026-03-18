import { Routes } from '@angular/router';
import { featureGateGuard } from '../../core/guards/feature-gate.guard';

export const TRAINING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'course-management',
    pathMatch: 'full'
  },
  {
    path: 'course-management',
    loadComponent: () => import('./pages/course-management-page/course-management-page.component')
      .then(m => m.CourseManagementPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L3.course-management' }
  },
  {
    path: 'effectiveness',
    loadComponent: () => import('./pages/training-effectiveness-page/training-effectiveness-page.component')
      .then(m => m.TrainingEffectivenessPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L3.effectiveness' }
  },
  {
    path: 'learning-map',
    loadComponent: () => import('./pages/learning-map-page/learning-map-page.component')
      .then(m => m.LearningMapPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L3.learning-map' }
  },
  {
    path: 'competency-heatmap',
    loadComponent: () => import('./pages/competency-heatmap-page/competency-heatmap-page.component')
      .then(m => m.CompetencyHeatmapPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L3.competency-heatmap' }
  },
  {
    path: 'nine-box',
    loadComponent: () => import('./pages/nine-box-page/nine-box-page.component')
      .then(m => m.NineBoxPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L3.nine-box' }
  },
  {
    path: 'learning-path',
    loadComponent: () => import('./pages/learning-path-page/learning-path-page.component')
      .then(m => m.LearningPathPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L3.learning-path' }
  },
  {
    path: 'key-talent',
    loadComponent: () => import('./pages/key-talent-page/key-talent-page.component')
      .then(m => m.KeyTalentPageComponent),
    canActivate: [featureGateGuard],
    data: { requiredFeature: 'L3.key-talent' }
  }
];
