import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TenantAdminService } from '../../services/tenant-admin.service';
import {
  TenantUser,
  Role,
  UserRole,
  OrgUnit,
  ScopeType,
  RoleFeaturePerm,
  ActionLevel,
  PermScope
} from '../../models/tenant-admin.model';
import {
  mergeFeaturePerms,
  groupByModule,
  MODULE_LABELS,
  MODULE_ORDER
} from '../../utils/merge-feature-perms';

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

  // Role selection permission preview (Feature 1)
  previewRolePerms = signal<RoleFeaturePerm[]>([]);
  loadingPreview = signal(false);

  previewByModule = computed(() => groupByModule(this.previewRolePerms()));
  previewModules = computed(() =>
    MODULE_ORDER.filter(m => this.previewByModule().has(m))
  );

  // Assigned role permission expand (Feature 2)
  expandedRolePerms = signal<Map<string, RoleFeaturePerm[]>>(new Map());
  expandedRoleIds = signal<Set<string>>(new Set());
  loadingRolePerms = signal<Set<string>>(new Set());

  // Effective permissions (Feature 3)
  effectivePerms = signal<RoleFeaturePerm[]>([]);
  showEffectivePerms = signal(false);
  loadingEffective = signal(false);

  effectiveByModule = computed(() => groupByModule(this.effectivePerms()));
  effectiveModules = computed(() =>
    MODULE_ORDER.filter(m => this.effectiveByModule().has(m))
  );

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
    this.previewRolePerms.set([]);
    this.loadingPreview.set(false);
    this.expandedRolePerms.set(new Map());
    this.expandedRoleIds.set(new Set());
    this.loadingRolePerms.set(new Set());
    this.effectivePerms.set([]);
    this.showEffectivePerms.set(false);
    this.loadingEffective.set(false);
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
        this.previewRolePerms.set([]);
        if (this.showEffectivePerms()) {
          this.loadEffectivePerms();
        }
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
        // Remove cached perms for the revoked role
        this.expandedRolePerms.update(m => {
          const next = new Map(m);
          next.delete(userRole.role_id);
          return next;
        });
        this.expandedRoleIds.update(s => {
          const next = new Set(s);
          next.delete(userRole.role_id);
          return next;
        });
        this.loadUserRoles(user.id);
        this.loadUsers();
        if (this.showEffectivePerms()) {
          this.loadEffectivePerms();
        }
      }
    });
  }

  // ============================================================
  // Feature 1: Role Selection Permission Preview
  // ============================================================

  onAssignRoleChange(roleId: string): void {
    this.assignRoleId.set(roleId);
    if (!roleId) {
      this.previewRolePerms.set([]);
      return;
    }
    this.loadingPreview.set(true);
    this.tenantAdminService.getRoleFeaturePerms(roleId).subscribe({
      next: (perms) => {
        this.previewRolePerms.set(perms.filter(p => p.action_level !== 'none'));
        this.loadingPreview.set(false);
      },
      error: () => {
        this.previewRolePerms.set([]);
        this.loadingPreview.set(false);
      }
    });
  }

  // ============================================================
  // Feature 2: Assigned Role Permission Detail Expand
  // ============================================================

  toggleRolePermView(roleId: string): void {
    if (this.isRoleExpanded(roleId)) {
      this.expandedRoleIds.update(s => {
        const next = new Set(s);
        next.delete(roleId);
        return next;
      });
      return;
    }

    // Expand
    this.expandedRoleIds.update(s => new Set(s).add(roleId));

    // Use cache if available
    if (this.expandedRolePerms().has(roleId)) return;

    // Load from API
    this.loadingRolePerms.update(s => new Set(s).add(roleId));
    this.tenantAdminService.getRoleFeaturePerms(roleId).subscribe({
      next: (perms) => {
        this.expandedRolePerms.update(m => new Map(m).set(roleId, perms));
        this.loadingRolePerms.update(s => {
          const next = new Set(s);
          next.delete(roleId);
          return next;
        });
      },
      error: () => {
        this.expandedRolePerms.update(m => new Map(m).set(roleId, []));
        this.loadingRolePerms.update(s => {
          const next = new Set(s);
          next.delete(roleId);
          return next;
        });
      }
    });
  }

  isRoleExpanded(roleId: string): boolean {
    return this.expandedRoleIds().has(roleId);
  }

  isRoleLoading(roleId: string): boolean {
    return this.loadingRolePerms().has(roleId);
  }

  getRolePerms(roleId: string): RoleFeaturePerm[] {
    return this.expandedRolePerms().get(roleId) || [];
  }

  groupPermsByModule(perms: RoleFeaturePerm[]): Map<string, RoleFeaturePerm[]> {
    return groupByModule(perms);
  }

  // ============================================================
  // Feature 3: User Effective Permissions Display
  // ============================================================

  toggleEffectivePerms(): void {
    if (this.showEffectivePerms()) {
      this.showEffectivePerms.set(false);
      return;
    }
    this.showEffectivePerms.set(true);
    this.loadEffectivePerms();
  }

  loadEffectivePerms(): void {
    const roles = this.userRoles();
    if (roles.length === 0) {
      this.effectivePerms.set([]);
      return;
    }

    this.loadingEffective.set(true);
    const requests = roles.map(ur =>
      this.tenantAdminService.getRoleFeaturePerms(ur.role_id)
    );

    forkJoin(requests).subscribe({
      next: (allPerms) => {
        this.effectivePerms.set(mergeFeaturePerms(allPerms));
        this.loadingEffective.set(false);
      },
      error: () => {
        this.effectivePerms.set([]);
        this.loadingEffective.set(false);
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

  getModuleLabel(module: string): string {
    return MODULE_LABELS[module] || module;
  }

  getActionLevelLabel(level: ActionLevel): string {
    const labels: Record<string, string> = {
      none: '無權限',
      view: '僅查看',
      edit: '可編輯'
    };
    return labels[level] || level;
  }

  getActionLevelClass(level: ActionLevel): string {
    const classes: Record<string, string> = {
      none: 'level--none',
      view: 'level--view',
      edit: 'level--edit'
    };
    return classes[level] || '';
  }

  getPermScopeLabel(scope: PermScope | null): string {
    if (!scope) return '—';
    const labels: Record<string, string> = {
      self: '個人',
      department: '部門',
      company: '全公司'
    };
    return labels[scope] || scope;
  }

  getModulesForPerms(perms: RoleFeaturePerm[]): string[] {
    const moduleSet: Set<string> = new Set(perms.map(p => p.module));
    return MODULE_ORDER.filter(m => moduleSet.has(m));
  }
}
