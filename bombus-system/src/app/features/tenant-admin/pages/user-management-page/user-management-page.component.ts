import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TenantAdminService } from '../../services/tenant-admin.service';
import {
  TenantUser,
  Role,
  UserRole,
  OrgUnit,
  ScopeType
} from '../../models/tenant-admin.model';

@Component({
  standalone: true,
  selector: 'app-user-management-page',
  templateUrl: './user-management-page.component.html',
  styleUrl: './user-management-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementPageComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);

  users = signal<TenantUser[]>([]);
  roles = signal<Role[]>([]);
  orgUnits = signal<OrgUnit[]>([]);
  loading = signal(true);

  // Create user form
  showCreateForm = signal(false);
  formEmail = signal('');
  formName = signal('');
  formPassword = signal('');
  formEmployeeId = signal('');

  // Assign role
  showAssignRole = signal(false);
  assigningUser = signal<TenantUser | null>(null);
  assignRoleId = signal('');
  assignScopeType = signal<ScopeType>('global');
  assignScopeId = signal('');
  userRoles = signal<UserRole[]>([]);

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadOrgUnits();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.tenantAdminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.loading.set(false);
      }
    });
  }

  loadRoles(): void {
    this.tenantAdminService.getRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.roles.set([])
    });
  }

  loadOrgUnits(): void {
    this.tenantAdminService.getOrgUnits().subscribe({
      next: (units) => this.orgUnits.set(units),
      error: () => this.orgUnits.set([])
    });
  }

  // ============================================================
  // Create User
  // ============================================================

  openCreateForm(): void {
    this.formEmail.set('');
    this.formName.set('');
    this.formPassword.set('');
    this.formEmployeeId.set('');
    this.showCreateForm.set(true);
  }

  closeCreateForm(): void {
    this.showCreateForm.set(false);
  }

  createUser(): void {
    this.tenantAdminService.createUser({
      email: this.formEmail(),
      name: this.formName(),
      password: this.formPassword(),
      employee_id: this.formEmployeeId() || undefined
    }).subscribe({
      next: () => {
        this.closeCreateForm();
        this.loadUsers();
      }
    });
  }

  // ============================================================
  // Assign Role
  // ============================================================

  openAssignRole(user: TenantUser): void {
    this.assigningUser.set(user);
    this.assignRoleId.set('');
    this.assignScopeType.set('global');
    this.assignScopeId.set('');
    this.loadUserRoles(user.id);
    this.showAssignRole.set(true);
  }

  closeAssignRole(): void {
    this.showAssignRole.set(false);
    this.assigningUser.set(null);
  }

  loadUserRoles(userId: string): void {
    this.tenantAdminService.getUserRoles(userId).subscribe({
      next: (roles) => this.userRoles.set(roles),
      error: () => this.userRoles.set([])
    });
  }

  assignRole(): void {
    const user = this.assigningUser();
    if (!user || !this.assignRoleId()) return;

    this.tenantAdminService.assignRole({
      user_id: user.id,
      role_id: this.assignRoleId(),
      scope_type: this.assignScopeType(),
      scope_id: this.assignScopeId() || undefined
    }).subscribe({
      next: () => {
        this.loadUserRoles(user.id);
        this.loadUsers();
        this.assignRoleId.set('');
      }
    });
  }

  revokeRole(userRole: UserRole): void {
    const user = this.assigningUser();
    if (!user) return;

    this.tenantAdminService.revokeRole({
      user_id: user.id,
      role_id: userRole.role_id,
      scope_type: userRole.scope_type,
      scope_id: userRole.scope_id || undefined
    }).subscribe({
      next: () => {
        this.loadUserRoles(user.id);
        this.loadUsers();
      }
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  getScopeLabel(scopeType: ScopeType): string {
    const labels: Record<ScopeType, string> = {
      global: '全域',
      subsidiary: '子公司',
      department: '部門'
    };
    return labels[scopeType] || scopeType;
  }

  getScopeOptions(): OrgUnit[] {
    const scopeType = this.assignScopeType();
    if (scopeType === 'global') return [];
    return this.orgUnits().filter(u => {
      if (scopeType === 'subsidiary') return u.type === 'subsidiary';
      if (scopeType === 'department') return u.type === 'department';
      return false;
    });
  }

  getActiveLabel(val: number): string {
    return val === 1 ? '啟用' : '停用';
  }

  getActiveClass(val: number): string {
    return val === 1 ? 'status--active' : 'status--muted';
  }

  getRoleName(roleId: string): string {
    const role = this.roles().find(r => r.id === roleId);
    return role?.name || roleId;
  }
}
