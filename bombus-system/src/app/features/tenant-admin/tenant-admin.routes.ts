import { Routes } from '@angular/router';

export const TENANT_ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'org-structure',
    pathMatch: 'full'
  },
  {
    path: 'org-structure',
    loadComponent: () => import('./pages/org-structure-page/org-structure-page.component')
      .then(m => m.OrgStructurePageComponent)
  },
  {
    path: 'roles',
    loadComponent: () => import('./pages/role-management-page/role-management-page.component')
      .then(m => m.RoleManagementPageComponent)
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/user-management-page/user-management-page.component')
      .then(m => m.UserManagementPageComponent)
  },
  {
    path: 'permissions',
    loadComponent: () => import('./pages/permission-visualization-page/permission-visualization-page.component')
      .then(m => m.PermissionVisualizationPageComponent)
  },
  {
    path: 'audit',
    loadComponent: () => import('./pages/tenant-audit-log-page/tenant-audit-log-page.component')
      .then(m => m.TenantAuditLogPageComponent)
  }
];
