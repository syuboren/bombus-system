import { Routes } from '@angular/router';

export const TRAINING_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'talent-map',
    pathMatch: 'full'
  },
  {
    path: 'talent-map',
    loadComponent: () => import('./pages/talent-map-page/talent-map-page.component')
      .then(m => m.TalentMapPageComponent)
  }
];
