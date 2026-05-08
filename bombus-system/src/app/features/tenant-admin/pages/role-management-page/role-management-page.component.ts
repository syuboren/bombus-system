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
import { TenantAdminService } from '../../services/tenant-admin.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  Role,
  RoleUser,
  Feature,
  RoleFeaturePerm,
  FeaturePermPayload,
  ActionLevel,
  PermScope
} from '../../models/tenant-admin.model';

interface FeaturePermState {
  feature_id: string;
  action_level: ActionLevel;
  edit_scope: PermScope | null;
  view_scope: PermScope | null;
  // rbac-row-level-and-interview-scope
  can_approve: 0 | 1;
  approve_scope: PermScope | null;
  row_filter_key: string | null;
}

const MODULE_LABELS: Record<string, string> = {
  L1: 'L1 員工管理',
  L2: 'L2 職能管理',
  L3: 'L3 教育訓練',
  L4: 'L4 專案管理',
  L5: 'L5 績效管理',
  L6: 'L6 文化管理',
  SYS: '系統管理'
};

const ACTION_LEVEL_OPTIONS: { value: ActionLevel; label: string }[] = [
  { value: 'none', label: '無權限' },
  { value: 'view', label: '僅查看' },
  { value: 'edit', label: '可編輯' }
];

const SCOPE_OPTIONS: { value: PermScope; label: string }[] = [
  { value: 'self', label: '個人' },
  { value: 'department', label: '部門' },
  { value: 'company', label: '全公司' }
];

// rbac-row-level-and-interview-scope: 已註冊 row_filter predicate（與後端 ROW_FILTERS registry 同步）
// 決議 8：UI 名詞遵守「全集團 vs 全公司」分層 — row_filter 是過濾邏輯標籤，非 scope，用業務語意命名
const ROW_FILTER_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: '不限制' },
  { value: 'interview_assigned', label: '僅被指派的面試者' },
  { value: 'subordinate_only', label: '僅下屬' },
  { value: 'self_only', label: '僅本人' },
  { value: 'org_unit_scope', label: '依組織單位' }
];

const SCOPE_RANK: Record<string, number> = { self: 1, department: 2, company: 3 };

@Component({
  standalone: true,
  selector: 'app-role-management-page',
  templateUrl: './role-management-page.component.html',
  styleUrl: './role-management-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleManagementPageComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);
  private notificationService = inject(NotificationService);

  // Data
  roles = signal<Role[]>([]);
  features = signal<Feature[]>([]);
  loading = signal(true);

  // Role CRUD Form
  showForm = signal(false);
  formEditingRole = signal<Role | null>(null);
  formName = signal('');
  formDescription = signal('');
  formScopeType = signal('global');

  // Feature permission editing
  editingRole = signal<Role | null>(null);
  featurePermStates = signal<Map<string, FeaturePermState>>(new Map());
  saving = signal(false);

  // View mode (read-only)
  showFeatureView = signal(false);
  viewRole = signal<Role | null>(null);
  viewFeaturePerms = signal<RoleFeaturePerm[]>([]);
  viewLoading = signal(false);

  // Module collapse
  collapsedModules = signal<Set<string>>(new Set());

  // Delete
  showDeleteConfirm = signal(false);
  deletingRole = signal<Role | null>(null);

  // Role users
  showRoleUsers = signal(false);
  roleUsersRole = signal<Role | null>(null);
  roleUsers = signal<RoleUser[]>([]);
  loadingRoleUsers = signal(false);

  // Expose constants to template
  readonly moduleLabels = MODULE_LABELS;
  readonly actionLevelOptions = ACTION_LEVEL_OPTIONS;
  readonly scopeOptions = SCOPE_OPTIONS;
  readonly rowFilterOptions = ROW_FILTER_OPTIONS;

  // Computed: features grouped by module
  featuresByModule = computed(() => {
    const grouped = new Map<string, Feature[]>();
    for (const f of this.features()) {
      if (!grouped.has(f.module)) grouped.set(f.module, []);
      grouped.get(f.module)!.push(f);
    }
    return grouped;
  });

  moduleOrder = computed(() => {
    const order = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'SYS'];
    return order.filter(m => this.featuresByModule().has(m));
  });

  // Computed: view mode features grouped by module
  viewFeaturesByModule = computed(() => {
    const perms = this.viewFeaturePerms();
    const grouped = new Map<string, RoleFeaturePerm[]>();
    for (const p of perms) {
      if (!grouped.has(p.module)) grouped.set(p.module, []);
      grouped.get(p.module)!.push(p);
    }
    return grouped;
  });

  ngOnInit(): void {
    this.loadRoles();
    this.loadFeatures();
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

  loadFeatures(): void {
    this.tenantAdminService.getFeatures().subscribe({
      next: (res) => this.features.set(res.features),
      error: () => this.features.set([])
    });
  }

  // ============================================================
  // Role CRUD
  // ============================================================

  openCreateForm(): void {
    this.formEditingRole.set(null);
    this.formName.set('');
    this.formDescription.set('');
    this.formScopeType.set('global');
    this.showForm.set(true);
  }

  openEditForm(role: Role): void {
    this.formEditingRole.set(role);
    this.formName.set(role.name);
    this.formDescription.set(role.description || '');
    this.formScopeType.set(role.scope_type || 'global');
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.formEditingRole.set(null);
  }

  saveForm(): void {
    const editing = this.formEditingRole();
    const data: Partial<Role> = {
      name: this.formName(),
      description: this.formDescription(),
      scope_type: this.formScopeType() as any
    };

    if (editing) {
      this.tenantAdminService.updateRole(editing.id, data).subscribe({
        next: () => {
          this.notificationService.success('角色已更新');
          this.closeForm();
          this.loadRoles();
        }
      });
    } else {
      this.tenantAdminService.createRole(data).subscribe({
        next: () => {
          this.notificationService.success('角色已建立');
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
          this.notificationService.success('角色已刪除');
        }
      });
    }
  }

  // ============================================================
  // Role Users
  // ============================================================

  openRoleUsers(role: Role): void {
    this.roleUsersRole.set(role);
    this.roleUsers.set([]);
    this.loadingRoleUsers.set(true);
    this.showRoleUsers.set(true);

    this.tenantAdminService.getRoleUsers(role.id).subscribe({
      next: (users) => {
        this.roleUsers.set(users);
        this.loadingRoleUsers.set(false);
      },
      error: () => {
        this.roleUsers.set([]);
        this.loadingRoleUsers.set(false);
      }
    });
  }

  closeRoleUsers(): void {
    this.showRoleUsers.set(false);
    this.roleUsersRole.set(null);
    this.roleUsers.set([]);
  }

  // ============================================================
  // Feature Permission Editing
  // ============================================================

  openFeaturePermEdit(role: Role): void {
    this.editingRole.set(role);
    this.collapsedModules.set(new Set());
    this.saving.set(false);

    // 先用所有 features 初始化為 none
    const states = new Map<string, FeaturePermState>();
    for (const f of this.features()) {
      states.set(f.id, {
        feature_id: f.id,
        action_level: 'none',
        edit_scope: null,
        view_scope: null,
        can_approve: 0,
        approve_scope: null,
        row_filter_key: null
      });
    }
    this.featurePermStates.set(states);

    // 再用 API 回傳的值覆蓋
    this.tenantAdminService.getRoleFeaturePerms(role.id).subscribe({
      next: (perms) => {
        this.featurePermStates.update(map => {
          const next = new Map(map);
          for (const p of perms) {
            next.set(p.feature_id, {
              feature_id: p.feature_id,
              action_level: p.action_level,
              edit_scope: p.edit_scope,
              view_scope: p.view_scope,
              // rbac-row-level-and-interview-scope: 從後端 sync 三新欄位
              can_approve: (p.can_approve === 1 ? 1 : 0),
              approve_scope: p.approve_scope ?? null,
              row_filter_key: p.row_filter_key ?? null
            });
          }
          return next;
        });
      }
    });
  }

  closeFeaturePermEdit(): void {
    this.editingRole.set(null);
    this.featurePermStates.set(new Map());
  }

  getFeaturePermState(featureId: string): FeaturePermState {
    return this.featurePermStates().get(featureId) || {
      feature_id: featureId,
      action_level: 'none',
      edit_scope: null,
      view_scope: null,
      can_approve: 0,
      approve_scope: null,
      row_filter_key: null
    };
  }

  onActionLevelChange(featureId: string, level: ActionLevel): void {
    this.featurePermStates.update(map => {
      const next = new Map(map);
      const current = next.get(featureId) || {
        feature_id: featureId, action_level: 'none', edit_scope: null, view_scope: null,
        can_approve: 0 as const, approve_scope: null, row_filter_key: null
      };

      if (level === 'none') {
        next.set(featureId, { ...current, action_level: 'none', edit_scope: null, view_scope: null });
      } else if (level === 'view') {
        next.set(featureId, {
          ...current,
          action_level: 'view',
          edit_scope: null,
          view_scope: current.view_scope || 'self'
        });
      } else {
        // edit
        const editScope = current.edit_scope || 'self';
        const viewScope = current.view_scope || editScope;
        // Ensure view_scope >= edit_scope
        const correctedViewScope = (SCOPE_RANK[viewScope] >= SCOPE_RANK[editScope]) ? viewScope : editScope;
        next.set(featureId, {
          ...current,
          action_level: 'edit',
          edit_scope: editScope,
          view_scope: correctedViewScope
        });
      }
      return next;
    });
  }

  onEditScopeChange(featureId: string, scope: PermScope): void {
    this.featurePermStates.update(map => {
      const next = new Map(map);
      const current = next.get(featureId);
      if (!current) return next;

      let viewScope = current.view_scope || scope;
      // Auto-correct: view_scope must >= edit_scope
      if (SCOPE_RANK[viewScope] < SCOPE_RANK[scope]) {
        viewScope = scope;
      }
      next.set(featureId, { ...current, edit_scope: scope, view_scope: viewScope });
      return next;
    });
  }

  onViewScopeChange(featureId: string, scope: PermScope): void {
    this.featurePermStates.update(map => {
      const next = new Map(map);
      const current = next.get(featureId);
      if (!current) return next;

      // Ensure view_scope >= edit_scope
      if (current.edit_scope && SCOPE_RANK[scope] < SCOPE_RANK[current.edit_scope]) {
        return next; // Reject invalid selection
      }
      next.set(featureId, { ...current, view_scope: scope });
      return next;
    });
  }

  // rbac-row-level-and-interview-scope: 審核位元變更
  onCanApproveChange(featureId: string, checked: boolean): void {
    this.featurePermStates.update(map => {
      const next = new Map(map);
      const current = next.get(featureId) || {
        feature_id: featureId, action_level: 'none' as const,
        edit_scope: null, view_scope: null,
        can_approve: 0 as const, approve_scope: null, row_filter_key: null
      };
      // 勾選時預設 approve_scope='department'（中庸），取消勾選清空 approve_scope
      next.set(featureId, {
        ...current,
        can_approve: checked ? 1 : 0,
        approve_scope: checked ? (current.approve_scope || 'department') : null
      });
      return next;
    });
  }

  onApproveScopeChange(featureId: string, scope: PermScope): void {
    this.featurePermStates.update(map => {
      const next = new Map(map);
      const current = next.get(featureId);
      if (!current) return next;
      next.set(featureId, { ...current, approve_scope: scope });
      return next;
    });
  }

  // rbac-row-level-and-interview-scope: 資料列限制變更
  onRowFilterKeyChange(featureId: string, value: string): void {
    this.featurePermStates.update(map => {
      const next = new Map(map);
      const current = next.get(featureId) || {
        feature_id: featureId, action_level: 'none' as const,
        edit_scope: null, view_scope: null,
        can_approve: 0 as const, approve_scope: null, row_filter_key: null
      };
      // 空字串視為 NULL（HTML select 對 NULL value 的常見處理）
      next.set(featureId, { ...current, row_filter_key: value || null });
      return next;
    });
  }

  saveFeaturePerms(): void {
    const role = this.editingRole();
    if (!role) return;

    const perms: FeaturePermPayload[] = [];
    for (const [, state] of this.featurePermStates()) {
      perms.push({
        feature_id: state.feature_id,
        action_level: state.action_level,
        edit_scope: state.edit_scope,
        view_scope: state.view_scope,
        // rbac-row-level-and-interview-scope: 帶上新欄位
        can_approve: state.can_approve,
        approve_scope: state.approve_scope,
        row_filter_key: state.row_filter_key
      });
    }

    this.saving.set(true);
    this.tenantAdminService.updateRoleFeaturePerms(role.id, perms).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeFeaturePermEdit();
        this.notificationService.success(`${role.name} 的功能權限已更新`);
        this.loadRoles();
      },
      error: () => {
        this.saving.set(false);
        this.notificationService.error('儲存失敗，請稍後再試');
      }
    });
  }

  // ============================================================
  // View Feature Perms (Read-Only)
  // ============================================================

  viewFeaturePermissions(role: Role): void {
    this.viewRole.set(role);
    this.viewFeaturePerms.set([]);
    this.viewLoading.set(true);
    this.collapsedModules.set(new Set());
    this.showFeatureView.set(true);

    this.tenantAdminService.getRoleFeaturePerms(role.id).subscribe({
      next: (perms) => {
        this.viewFeaturePerms.set(perms);
        this.viewLoading.set(false);
      },
      error: () => this.viewLoading.set(false)
    });
  }

  closeFeatureView(): void {
    this.showFeatureView.set(false);
    this.viewRole.set(null);
    this.viewFeaturePerms.set([]);
  }

  // ============================================================
  // Module Collapse
  // ============================================================

  toggleModule(module: string): void {
    this.collapsedModules.update(set => {
      const next = new Set(set);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  }

  isModuleCollapsed(module: string): boolean {
    return this.collapsedModules().has(module);
  }

  // ============================================================
  // Helpers
  // ============================================================

  getModuleLabel(module: string): string {
    return MODULE_LABELS[module] || module;
  }

  getActionLevelLabel(level: ActionLevel): string {
    const found = ACTION_LEVEL_OPTIONS.find(o => o.value === level);
    return found?.label || level;
  }

  getScopeLabel(scopeOrType: string): string {
    // 'company' = 功能權限的編輯範圍（perm_scope）保留「全公司」
    // 'global' / 'group' = 角色指派層級（scope_type），改用「全集團」避免名詞重複
    const scopeLabels: Record<string, string> = {
      self: '個人',
      department: '部門',
      company: '全公司',
      global: '全集團',
      group: '全集團',
      subsidiary: '子公司'
    };
    return scopeLabels[scopeOrType] || scopeOrType;
  }

  getActionLevelClass(level: ActionLevel): string {
    const classes: Record<ActionLevel, string> = {
      none: 'level--none',
      view: 'level--view',
      edit: 'level--edit'
    };
    return classes[level] || '';
  }
}
