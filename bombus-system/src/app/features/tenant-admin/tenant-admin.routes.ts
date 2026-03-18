import { Routes } from '@angular/router';
import { featureGateGuard } from '../../core/guards/feature-gate.guard';

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
    data: { requiredFeature: 'SYS.role-management' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/role-management-page/role-management-page.component')
      .then(m => m.RoleManagementPageComponent)
  },
  {
    path: 'users',
    data: { requiredFeature: 'SYS.user-management' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/user-management-page/user-management-page.component')
      .then(m => m.UserManagementPageComponent)
  },
  {
    path: 'audit',
    data: { requiredFeature: 'SYS.audit' },
    canActivate: [featureGateGuard],
    loadComponent: () => import('./pages/tenant-audit-log-page/tenant-audit-log-page.component')
      .then(m => m.TenantAuditLogPageComponent)
  }
];
