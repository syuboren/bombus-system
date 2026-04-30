import { Routes } from '@angular/router';

export const PLATFORM_ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'tenants',
    pathMatch: 'full'
  },
  {
    path: 'tenants',
    loadComponent: () => import('./pages/tenant-management-page/tenant-management-page.component')
      .then(m => m.TenantManagementPageComponent)
  },
  {
    path: 'plans',
    loadComponent: () => import('./pages/plan-management-page/plan-management-page.component')
      .then(m => m.PlanManagementPageComponent)
  },
  {
    path: 'audit',
    loadComponent: () => import('./pages/audit-log-page/audit-log-page.component')
      .then(m => m.AuditLogPageComponent)
  },
  {
    path: 'industries',
    loadComponent: () => import('./pages/industry-management-page/industry-management-page.component')
      .then(m => m.IndustryManagementPageComponent)
  },
  {
    path: 'department-templates',
    loadComponent: () => import('./pages/department-template-page/department-template-page.component')
      .then(m => m.DepartmentTemplatePageComponent)
  }
];
