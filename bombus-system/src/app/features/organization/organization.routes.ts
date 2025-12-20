import { Routes } from '@angular/router';

export const organizationRoutes: Routes = [
  {
    path: '',
    redirectTo: 'group-structure',
    pathMatch: 'full'
  },
  {
    path: 'group-structure',
    loadComponent: () => import('./pages/group-structure-page/group-structure-page.component')
      .then(m => m.GroupStructurePageComponent)
  },
  {
    path: 'department-structure',
    loadComponent: () => import('./pages/department-structure-page/department-structure-page.component')
      .then(m => m.DepartmentStructurePageComponent)
  },
  {
    path: 'employee-management',
    loadComponent: () => import('./pages/employee-management-page/employee-management-page.component')
      .then(m => m.EmployeeManagementPageComponent)
  }
];

