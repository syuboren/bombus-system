import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { OrganizationService } from '../../services/organization.service';
import { Company, Department, Employee, EmployeePosition } from '../../models/organization.model';

type ViewMode = 'card' | 'list';

@Component({
  selector: 'app-employee-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './employee-management-page.component.html',
  styleUrl: './employee-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeManagementPageComponent implements OnInit {
  private orgService = inject(OrganizationService);

  // Page Info
  readonly pageTitle = '員工管理';
  readonly breadcrumbs = ['首頁', '組織管理'];

  // Data signals
  companies = signal<Company[]>([]);
  departments = signal<Department[]>([]);
  employees = signal<Employee[]>([]);
  loading = signal(true);

  // Filters
  selectedCompanyId = signal<string>('');
  selectedDepartmentId = signal<string>('');
  searchKeyword = signal<string>('');
  statusFilter = signal<string>('all');

  // View mode
  viewMode = signal<ViewMode>('card');

  // Selected employee
  selectedEmployee = signal<Employee | null>(null);
  showEmployeeModal = signal(false);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(12);

  // Filtered departments by selected company
  filteredDepartments = computed(() => {
    const companyId = this.selectedCompanyId();
    if (!companyId) return this.departments();
    return this.departments().filter(d => d.companyId === companyId);
  });

  // Filtered employees (by primary position to avoid counting cross-company employees multiple times)
  filteredEmployees = computed(() => {
    let result = this.employees();

    // Filter by company (using primary position only)
    const companyId = this.selectedCompanyId();
    if (companyId) {
      result = result.filter(e => {
        const primaryPosition = e.positions.find(p => p.isPrimary);
        return primaryPosition?.companyId === companyId;
      });
    }

    // Filter by department (using primary position only)
    const deptId = this.selectedDepartmentId();
    if (deptId) {
      result = result.filter(e => {
        const primaryPosition = e.positions.find(p => p.isPrimary);
        return primaryPosition?.departmentId === deptId;
      });
    }

    // Filter by status
    const status = this.statusFilter();
    if (status !== 'all') {
      result = result.filter(e => e.status === status);
    }

    // Filter by search keyword
    const keyword = this.searchKeyword().toLowerCase();
    if (keyword) {
      result = result.filter(e =>
        e.name.toLowerCase().includes(keyword) ||
        e.employeeNo.toLowerCase().includes(keyword) ||
        e.email.toLowerCase().includes(keyword) ||
        (e.englishName && e.englishName.toLowerCase().includes(keyword))
      );
    }

    return result;
  });

  // Paginated employees
  paginatedEmployees = computed(() => {
    const all = this.filteredEmployees();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return all.slice(start, end);
  });

  // Total pages
  totalPages = computed(() => {
    return Math.ceil(this.filteredEmployees().length / this.pageSize());
  });

  // Cross company employees count
  crossCompanyCount = computed(() => {
    return this.employees().filter(e => {
      const uniqueCompanies = new Set(e.positions.map(p => p.companyId));
      return uniqueCompanies.size > 1;
    }).length;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.orgService.getCompanies().subscribe(data => {
      this.companies.set(data);
    });

    this.orgService.getDepartments().subscribe(data => {
      this.departments.set(data);
    });

    this.orgService.getEmployees().subscribe(data => {
      this.employees.set(data);
      this.loading.set(false);
    });
  }

  // Filter handlers
  onCompanyChange(companyId: string): void {
    this.selectedCompanyId.set(companyId);
    this.selectedDepartmentId.set('');
    this.currentPage.set(1);
  }

  onDepartmentChange(deptId: string): void {
    this.selectedDepartmentId.set(deptId);
    this.currentPage.set(1);
  }

  onStatusChange(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  onSearch(keyword: string): void {
    this.searchKeyword.set(keyword);
    this.currentPage.set(1);
  }

  // View mode toggle
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // Employee actions
  selectEmployee(employee: Employee): void {
    this.selectedEmployee.set(employee);
    this.showEmployeeModal.set(true);
  }

  closeEmployeeModal(): void {
    this.showEmployeeModal.set(false);
    this.selectedEmployee.set(null);
  }

  // Helper methods
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: '在職',
      on_leave: '留職停薪',
      resigned: '已離職',
      probation: '試用期'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status--${status}`;
  }

  getGenderLabel(gender: string): string {
    const labels: Record<string, string> = {
      male: '男',
      female: '女',
      other: '其他'
    };
    return labels[gender] || gender;
  }

  getPrimaryPosition(employee: Employee): EmployeePosition | undefined {
    return employee.positions.find(p => p.isPrimary);
  }

  getPositionCount(employee: Employee): number {
    return employee.positions.length;
  }

  isCrossCompanyEmployee(employee: Employee): boolean {
    const uniqueCompanies = new Set(employee.positions.map(p => p.companyId));
    return uniqueCompanies.size > 1;
  }

  getEmployeeInitial(name: string): string {
    return name.charAt(0);
  }

  getCompanyName(companyId: string): string {
    return this.companies().find(c => c.id === companyId)?.name || '';
  }

  getDepartmentName(deptId: string): string {
    return this.departments().find(d => d.id === deptId)?.name || '';
  }

  getTenure(hireDate: Date): string {
    const now = new Date();
    const hire = new Date(hireDate);
    const years = Math.floor((now.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((now.getTime() - hire.getTime()) % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

    if (years > 0) {
      return `${years} 年 ${months} 個月`;
    }
    return `${months} 個月`;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // ellipsis
        pages.push(total);
      } else if (current >= total - 3) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(total);
      }
    }

    return pages;
  }
}

