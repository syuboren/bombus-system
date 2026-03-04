import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';
import { platformAdminGuard } from './core/guards/platform-admin.guard';
import { featureGateGuard } from './core/guards/feature-gate.guard';

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
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/pages/dashboard-page/dashboard-page.component')
      .then(m => m.DashboardPageComponent)
  },
  {
    path: 'employee',
    canActivate: [authGuard, featureGateGuard],
    data: { requiredFeaturePrefix: 'L1' },
    loadChildren: () => import('./features/employee/employee.routes')
      .then(m => m.EMPLOYEE_ROUTES)
  },
  {
    path: 'training',
    canActivate: [authGuard, featureGateGuard],
    data: { requiredFeaturePrefix: 'L3' },
    loadChildren: () => import('./features/training/training.routes')
      .then(m => m.TRAINING_ROUTES)
  },
  {
    path: 'project',
    canActivate: [authGuard, featureGateGuard],
    data: { requiredFeaturePrefix: 'L4' },
    loadChildren: () => import('./features/project/project.routes')
      .then(m => m.PROJECT_ROUTES)
  },
  {
    path: 'competency',
    canActivate: [authGuard, featureGateGuard],
    data: { requiredFeaturePrefix: 'L2' },
    loadChildren: () => import('./features/competency/competency.routes')
      .then(m => m.COMPETENCY_ROUTES)
  },
  {
    path: 'organization',
    canActivate: [authGuard, permissionGuard],
    data: { requiredPermission: 'organization:read' },
    loadChildren: () => import('./features/organization/organization.routes')
      .then(m => m.organizationRoutes)
  },
  {
    path: 'performance',
    canActivate: [authGuard, featureGateGuard],
    data: { requiredFeaturePrefix: 'L5' },
    loadChildren: () => import('./features/performance/performance.routes')
      .then(m => m.PERFORMANCE_ROUTES)
  },
  {
    path: 'culture',
    canActivate: [authGuard, featureGateGuard],
    data: { requiredFeaturePrefix: 'L6' },
    loadChildren: () => import('./features/culture/culture.routes')
      .then(m => m.CULTURE_ROUTES)
  },
  {
    path: 'settings',
    canActivate: [authGuard, permissionGuard],
    data: { requiredRoles: ['super_admin', 'subsidiary_admin'] },
    loadChildren: () => import('./features/tenant-admin/tenant-admin.routes')
      .then(m => m.TENANT_ADMIN_ROUTES)
  },
  {
    path: 'platform',
    canActivate: [authGuard, platformAdminGuard],
    loadChildren: () => import('./features/platform-admin/platform-admin.routes')
      .then(m => m.PLATFORM_ADMIN_ROUTES)
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
