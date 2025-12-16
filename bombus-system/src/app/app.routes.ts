import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login-page/login-page.component')
      .then(m => m.LoginPageComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/pages/dashboard-page/dashboard-page.component')
      .then(m => m.DashboardPageComponent)
  },
  {
    path: 'employee',
    loadChildren: () => import('./features/employee/employee.routes')
      .then(m => m.EMPLOYEE_ROUTES)
  },
  {
    path: 'training',
    loadChildren: () => import('./features/training/training.routes')
      .then(m => m.TRAINING_ROUTES)
  },
  {
    path: 'project',
    loadChildren: () => import('./features/project/project.routes')
      .then(m => m.PROJECT_ROUTES)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
