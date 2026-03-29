import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  computed,
  input,
  output,
  effect
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { NotificationService } from '../../../core/services/notification.service';
import { OrgUnitService } from '../../../core/services/org-unit.service';
import { TenantAdminService } from '../../../features/tenant-admin/services/tenant-admin.service';
import { UserRole } from '../../models/employee.model';
import { Role, RoleFeaturePerm } from '../../../features/tenant-admin/models/tenant-admin.model';

@Component({
  selector: 'app-account-permission',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-permission.component.html',
  styleUrl: './account-permission.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountPermissionComponent {
  // ===== Inputs / Outputs =====
  readonly userId = input.required<string>();
  readonly employeeName = input<string>('');
  readonly employeeEmail = input<string>('');
  readonly userStatus = input<string | null>(null);
  readonly moduleColor = input<string>('#8DA399');

  readonly userUpdated = output<void>();

  // ===== Services =====
  private tenantAdminService = inject(TenantAdminService);
  private notificationService = inject(NotificationService);
  private orgUnitService = inject(OrgUnitService);
  private destroyRef = inject(DestroyRef);

  // ===== State =====
  loading = signal(false);
  userRoles = signal<UserRole[]>([]);
  availableRoles = signal<Role[]>([]);
  mergedPerms = signal<RoleFeaturePerm[]>([]);
  newPassword = signal<string | null>(null);

  // 指派
  selectedRoleId = signal('');
  selectedScopeId = signal('');
  selectedScopeType = signal('');
  assignLoading = signal(false);
  assignPreviewPerms = signal<RoleFeaturePerm[]>([]);

  // 展開/收起
  expandedRoleIds = signal<Set<string>>(new Set());
  rolePermsCache = signal<Map<string, RoleFeaturePerm[]>>(new Map());

  // 合併權限展開
  mergedPermsExpanded = signal(false);

  // 組織單位
  subsidiaries = this.orgUnitService.subsidiaries;
  selectedSubsidiaryForScope = signal('');
  filteredDepartmentsForScope = signal<{ id: string; name: string }[]>([]);

  // Computed
  assignableRoles = computed(() => {
    const currentIds = new Set(this.userRoles().map(r => r.roleId));
    return this.availableRoles().filter(r => !currentIds.has(r.id));
  });

  selectedRole = computed(() =>
    this.availableRoles().find(r => r.id === this.selectedRoleId()) || null
  );

  canAssign = computed(() => {
    if (!this.selectedRoleId()) return false;
    if (this.selectedScopeType() === 'global') return true;
    return !!this.selectedScopeId();
  });

  constructor() {
    effect(() => {
      const id = this.userId();
      if (id) {
        this.loadData(id);
      }
    }, { allowSignalWrites: true });
  }

  // ===== Data Loading =====

  private loadData(userId: string): void {
    this.loading.set(true);
    this.newPassword.set(null);
    this.orgUnitService.loadOrgUnits().subscribe();

    forkJoin({
      userRoles: this.tenantAdminService.getUserRoles(userId),
      allRoles: this.tenantAdminService.getRoles()
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ userRoles, allRoles }) => {
        this.userRoles.set(userRoles.map((r: any) => ({
          roleId: r.role_id,
          roleName: r.role_name,
          orgUnitId: r.scope_id || undefined,
          orgUnitName: r.parent_name && r.scope_name
            ? `${r.parent_name} / ${r.scope_name}`
            : r.scope_name || undefined
        })));
        this.availableRoles.set(allRoles);
        this.loading.set(false);
        this.loadMergedPerms(userRoles.map((r: any) => r.role_id));
      },
      error: () => {
        this.userRoles.set([]);
        this.availableRoles.set([]);
        this.loading.set(false);
      }
    });
  }

  private loadMergedPerms(roleIds: string[]): void {
    if (roleIds.length === 0) {
      this.mergedPerms.set([]);
      return;
    }
    forkJoin(roleIds.map(id => this.tenantAdminService.getRoleFeaturePerms(id))).subscribe({
      next: (allPerms) => {
        const merged = new Map<string, RoleFeaturePerm>();
        const levelRank: Record<string, number> = { none: 0, view: 1, edit: 2 };
        const scopeRank: Record<string, number> = { self: 0, department: 1, company: 2 };

        for (const perms of allPerms) {
          for (const p of perms) {
            const existing = merged.get(p.feature_id);
            if (!existing || levelRank[p.action_level] > levelRank[existing.action_level]) {
              merged.set(p.feature_id, { ...p });
            } else if (levelRank[p.action_level] === levelRank[existing.action_level]) {
              if (p.view_scope && scopeRank[p.view_scope] > scopeRank[existing.view_scope || 'self']) {
                existing.view_scope = p.view_scope;
              }
              if (p.edit_scope && scopeRank[p.edit_scope] > scopeRank[existing.edit_scope || 'self']) {
                existing.edit_scope = p.edit_scope;
              }
            }
          }
        }
        this.mergedPerms.set(
          Array.from(merged.values()).sort((a, b) => a.sort_order - b.sort_order)
        );
      },
      error: () => this.mergedPerms.set([])
    });
  }

  // ===== Role Expand/Collapse =====

  toggleRolePerms(roleId: string): void {
    const expanded = new Set(this.expandedRoleIds());
    if (expanded.has(roleId)) {
      expanded.delete(roleId);
    } else {
      expanded.add(roleId);
      if (!this.rolePermsCache().has(roleId)) {
        this.tenantAdminService.getRoleFeaturePerms(roleId).subscribe({
          next: (perms) => {
            const cache = new Map(this.rolePermsCache());
            cache.set(roleId, perms.sort((a, b) => a.sort_order - b.sort_order));
            this.rolePermsCache.set(cache);
          },
          error: () => {
            const cache = new Map(this.rolePermsCache());
            cache.set(roleId, []);
            this.rolePermsCache.set(cache);
          }
        });
      }
    }
    this.expandedRoleIds.set(expanded);
  }

  isRoleExpanded(roleId: string): boolean {
    return this.expandedRoleIds().has(roleId);
  }

  getRolePerms(roleId: string): RoleFeaturePerm[] {
    return this.rolePermsCache().get(roleId) || [];
  }

  // ===== Assign =====

  // 根據角色 scope_type 決定可選的範圍選項
  availableScopeTypes = computed(() => {
    const role = this.selectedRole();
    if (!role) return [];
    if (role.scope_type === 'global') {
      return [
        { value: 'global', label: '全域（不限組織）' },
        { value: 'subsidiary', label: '指定子公司' },
        { value: 'department', label: '指定部門' }
      ];
    }
    if (role.scope_type === 'subsidiary') {
      return [
        { value: 'subsidiary', label: '指定子公司' },
        { value: 'department', label: '指定部門' }
      ];
    }
    return [
      { value: 'department', label: '指定部門' }
    ];
  });

  onRoleSelected(roleId: string): void {
    this.selectedRoleId.set(roleId);
    this.selectedScopeId.set('');
    this.selectedSubsidiaryForScope.set('');
    this.filteredDepartmentsForScope.set([]);
    this.assignPreviewPerms.set([]);

    // 預設為角色定義的 scope_type
    const role = this.availableRoles().find(r => r.id === roleId);
    this.selectedScopeType.set(role?.scope_type || 'global');

    if (roleId) {
      this.tenantAdminService.getRoleFeaturePerms(roleId).subscribe({
        next: (perms) => this.assignPreviewPerms.set(perms.sort((a, b) => a.sort_order - b.sort_order)),
        error: () => this.assignPreviewPerms.set([])
      });
    }
  }

  onScopeTypeChange(scopeType: string): void {
    this.selectedScopeType.set(scopeType);
    this.selectedScopeId.set('');
    this.selectedSubsidiaryForScope.set('');
    this.filteredDepartmentsForScope.set([]);
  }

  onScopeSubsidiaryChange(subId: string): void {
    this.selectedSubsidiaryForScope.set(subId);
    this.selectedScopeId.set('');
    if (this.selectedScopeType() === 'subsidiary') {
      this.selectedScopeId.set(subId);
    } else {
      const depts = this.orgUnitService.filterDepartments(subId);
      this.filteredDepartmentsForScope.set(depts.map(d => ({ id: d.id, name: d.name })));
    }
  }

  assignRole(): void {
    const roleId = this.selectedRoleId();
    const userId = this.userId();
    if (!userId || !roleId) return;

    this.assignLoading.set(true);
    this.tenantAdminService.assignRole({
      user_id: userId,
      role_id: roleId,
      scope_type: this.selectedScopeType() as any,
      scope_id: this.selectedScopeType() !== 'global' ? this.selectedScopeId() : undefined
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.notificationService.success('角色已指派');
        this.selectedRoleId.set('');
        this.selectedScopeId.set('');
        this.selectedScopeType.set('');
        this.assignPreviewPerms.set([]);
        this.expandedRoleIds.set(new Set());
        this.rolePermsCache.set(new Map());
        this.assignLoading.set(false);
        this.loadData(userId);
        this.userUpdated.emit();
      },
      error: (err) => {
        this.assignLoading.set(false);
        this.notificationService.error(err.message || '角色指派失敗');
      }
    });
  }

  revokeRole(roleId: string, scopeId?: string): void {
    const userId = this.userId();
    if (!userId) return;

    this.tenantAdminService.revokeRole({
      user_id: userId,
      role_id: roleId,
      scope_id: scopeId
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.notificationService.success('角色已移除');
        this.expandedRoleIds.set(new Set());
        this.rolePermsCache.set(new Map());
        this.loadData(userId);
        this.userUpdated.emit();
      },
      error: () => this.notificationService.error('角色移除失敗')
    });
  }

  // ===== Account Actions =====

  resetPassword(): void {
    this.tenantAdminService.resetUserPassword(this.userId()).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (result) => {
        this.newPassword.set(result.newPassword);
        this.notificationService.success('密碼已重設');
      },
      error: () => this.notificationService.error('密碼重設失敗')
    });
  }

  toggleUserStatus(): void {
    const newStatus = this.userStatus() === 'active' ? 'inactive' : 'active';
    this.tenantAdminService.updateUser(this.userId(), { status: newStatus } as any).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.notificationService.success(newStatus === 'active' ? '帳號已啟用' : '帳號已停用');
        this.userUpdated.emit();
      },
      error: () => this.notificationService.error('帳號狀態更新失敗')
    });
  }

  // ===== Helpers =====

  getUserStatusLabel(status: string | null): string {
    const labels: Record<string, string> = {
      'active': '啟用中', 'inactive': '已停用', 'locked': '已鎖定'
    };
    return labels[status || ''] || status || '-';
  }

  getActionLevelLabel(level: string): string {
    return ({ 'none': '無', 'view': '檢視', 'edit': '編輯' } as Record<string, string>)[level] || level;
  }

  getScopeLabel(scope: string | null): string {
    return ({ 'self': '個人', 'department': '部門', 'company': '全公司' } as Record<string, string>)[scope || ''] || '-';
  }

  getModuleLabel(module: string): string {
    return ({
      'L1': '員工管理', 'L2': '職能管理', 'L3': '教育訓練',
      'L4': '專案管理', 'L5': '績效管理', 'L6': '文化管理', 'SYS': '系統設定'
    } as Record<string, string>)[module] || module;
  }
}
