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
    path: 'competency',
    loadChildren: () => import('./features/competency/competency.routes')
      .then(m => m.COMPETENCY_ROUTES)
  },
  {
    path: 'organization',
    loadChildren: () => import('./features/organization/organization.routes')
      .then(m => m.organizationRoutes)
  },
  {
    path: 'performance',
    loadChildren: () => import('./features/performance/performance.routes')
      .then(m => m.PERFORMANCE_ROUTES)
  },
  {
    path: 'culture',
    loadChildren: () => import('./features/culture/culture.routes')
      .then(m => m.CULTURE_ROUTES)
  },
  {
    // Public routes (no auth required) - 候選人回覆面試邀約
    path: 'public',
    loadChildren: () => import('./features/public/public.routes')
      .then(m => m.publicRoutes)
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
