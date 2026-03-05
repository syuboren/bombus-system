import { Routes } from '@angular/router';

export const organizationRoutes: Routes = [
  {
    path: '',
    redirectTo: 'employee-management',
    pathMatch: 'full'
  },
  {
    path: 'employee-management',
    loadComponent: () => import('./pages/employee-management-page/employee-management-page.component')
      .then(m => m.EmployeeManagementPageComponent)
  },
  {
    path: '**',
    redirectTo: 'employee-management'
  }
];
