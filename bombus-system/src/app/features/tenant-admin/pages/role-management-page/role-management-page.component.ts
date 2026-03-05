import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TenantAdminService } from '../../services/tenant-admin.service';
import { Role, Permission, ScopeType } from '../../models/tenant-admin.model';

interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

@Component({
  standalone: true,
  selector: 'app-role-management-page',
  templateUrl: './role-management-page.component.html',
  styleUrl: './role-management-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleManagementPageComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);

  roles = signal<Role[]>([]);
  allPermissions = signal<Permission[]>([]);
  loading = signal(true);

  // Form
  showForm = signal(false);
  editingRole = signal<Role | null>(null);
  formName = signal('');
  formDescription = signal('');
  formScopeType = signal<ScopeType>('global');
  selectedPermissions = signal<Set<string>>(new Set());

  // Delete
  showDeleteConfirm = signal(false);
  deletingRole = signal<Role | null>(null);

  // Permission matrix view
  showPermissionMatrix = signal(false);
  matrixRole = signal<Role | null>(null);

  permissionGroups = computed<PermissionGroup[]>(() => {
    const perms = this.allPermissions();
    const grouped = new Map<string, Permission[]>();
    perms.forEach(p => {
      if (!grouped.has(p.resource)) {
        grouped.set(p.resource, []);
      }
      grouped.get(p.resource)!.push(p);
    });
    return Array.from(grouped.entries()).map(([resource, permissions]) => ({
      resource,
      permissions
    }));
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.tenantAdminService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.roles.set([]);
        this.loading.set(false);
      }
    });
  }

  loadPermissions(): void {
    this.tenantAdminService.getPermissions().subscribe({
      next: (perms) => this.allPermissions.set(perms),
      error: () => this.allPermissions.set([])
    });
  }

  // ============================================================
  // Role CRUD
  // ============================================================

  openCreateForm(): void {
    this.editingRole.set(null);
    this.formName.set('');
    this.formDescription.set('');
    this.formScopeType.set('global');
    this.selectedPermissions.set(new Set());
    this.showForm.set(true);
  }

  openEditForm(role: Role): void {
    this.editingRole.set(role);
    this.formName.set(role.name);
    this.formDescription.set(role.description || '');
    this.formScopeType.set(role.scope_type);
    const permIds = new Set((role.permissions || []).map(p => p.permission_id));
    this.selectedPermissions.set(permIds);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingRole.set(null);
  }

  saveForm(): void {
    const editing = this.editingRole();
    const data: Partial<Role> & { permission_ids?: string[] } = {
      name: this.formName(),
      description: this.formDescription(),
      scope_type: this.formScopeType()
    };
    (data as Record<string, unknown>)['permission_ids'] = Array.from(this.selectedPermissions());

    if (editing) {
      this.tenantAdminService.updateRole(editing.id, data).subscribe({
        next: () => {
          this.closeForm();
          this.loadRoles();
        }
      });
    } else {
      this.tenantAdminService.createRole(data).subscribe({
        next: () => {
          this.closeForm();
          this.loadRoles();
        }
      });
    }
  }

  confirmDelete(role: Role): void {
    this.deletingRole.set(role);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deletingRole.set(null);
  }

  executeDelete(): void {
    const role = this.deletingRole();
    if (role) {
      this.tenantAdminService.deleteRole(role.id).subscribe({
        next: () => {
          this.closeDeleteConfirm();
          this.loadRoles();
        }
      });
    }
  }

  // ============================================================
  // Permission Matrix
  // ============================================================

  togglePermission(permissionId: string): void {
    this.selectedPermissions.update(set => {
      const next = new Set(set);
      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }
      return next;
    });
  }

  isPermissionSelected(permissionId: string): boolean {
    return this.selectedPermissions().has(permissionId);
  }

  selectAllInGroup(group: PermissionGroup): void {
    this.selectedPermissions.update(set => {
      const next = new Set(set);
      group.permissions.forEach(p => next.add(p.id));
      return next;
    });
  }

  deselectAllInGroup(group: PermissionGroup): void {
    this.selectedPermissions.update(set => {
      const next = new Set(set);
      group.permissions.forEach(p => next.delete(p.id));
      return next;
    });
  }

  isGroupFullySelected(group: PermissionGroup): boolean {
    return group.permissions.every(p => this.selectedPermissions().has(p.id));
  }

  // ============================================================
  // View Permission Matrix (read-only)
  // ============================================================

  viewPermissions(role: Role): void {
    this.matrixRole.set(role);
    const permIds = new Set((role.permissions || []).map(p => p.permission_id));
    this.selectedPermissions.set(permIds);
    this.showPermissionMatrix.set(true);
  }

  closePermissionMatrix(): void {
    this.showPermissionMatrix.set(false);
    this.matrixRole.set(null);
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

  getScopeClass(scopeType: ScopeType): string {
    const classes: Record<ScopeType, string> = {
      global: 'scope--global',
      subsidiary: 'scope--subsidiary',
      department: 'scope--department'
    };
    return classes[scopeType] || '';
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      read: '讀取',
      create: '建立',
      update: '更新',
      delete: '刪除',
      manage: '管理',
      export: '匯出',
      approve: '審核',
      assign: '指派'
    };
    return labels[action] || action;
  }

  getResourceLabel(resource: string): string {
    const labels: Record<string, string> = {
      employee: '員工管理',
      recruitment: '招募管理',
      organization: '組織管理',
      competency: '職能管理',
      training: '教育訓練',
      performance: '績效管理',
      culture: '文化管理',
      project: '專案管理',
      grade_matrix: '職等職級',
      job_descriptions: '職務說明書',
      meetings: '會議管理',
      talent_pool: '人才庫',
      reports: '報表',
      settings: '系統設定'
    };
    return labels[resource] || resource;
  }
}
