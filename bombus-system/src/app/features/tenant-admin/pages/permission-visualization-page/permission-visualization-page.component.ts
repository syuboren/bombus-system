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
import {
  OrgUnit,
  TenantUser,
  UserRole,
  Role,
  Permission
} from '../../models/tenant-admin.model';

interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

@Component({
  standalone: true,
  selector: 'app-permission-visualization-page',
  templateUrl: './permission-visualization-page.component.html',
  styleUrl: './permission-visualization-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionVisualizationPageComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);

  orgUnits = signal<OrgUnit[]>([]);
  users = signal<TenantUser[]>([]);
  roles = signal<Role[]>([]);
  allPermissions = signal<Permission[]>([]);
  loading = signal(true);

  // User query
  selectedUserId = signal('');
  userRoles = signal<UserRole[]>([]);
  loadingUserRoles = signal(false);

  expandedNodes = signal<Set<string>>(new Set());

  tree = computed(() => this.buildTree(this.orgUnits()));

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

  effectivePermissionIds = computed(() => {
    const roles = this.userRoles();
    const allRoles = this.roles();
    const ids = new Set<string>();

    roles.forEach(ur => {
      const role = allRoles.find(r => r.id === ur.role_id);
      if (role?.permissions) {
        role.permissions.forEach(p => ids.add(p.permission_id));
      }
    });
    return ids;
  });

  scopeHighlightIds = computed(() => {
    const roles = this.userRoles();
    const ids = new Set<string>();
    roles.forEach(ur => {
      if (ur.scope_id) {
        ids.add(ur.scope_id);
      }
    });
    return ids;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    let completed = 0;
    const checkDone = () => {
      completed++;
      if (completed >= 4) this.loading.set(false);
    };

    this.tenantAdminService.getOrgUnits().subscribe({
      next: (units) => {
        this.orgUnits.set(units);
        const ids = new Set(units.map(u => u.id));
        this.expandedNodes.set(ids);
        checkDone();
      },
      error: () => { this.orgUnits.set([]); checkDone(); }
    });

    this.tenantAdminService.getUsers().subscribe({
      next: (users) => { this.users.set(users); checkDone(); },
      error: () => { this.users.set([]); checkDone(); }
    });

    this.tenantAdminService.getRoles().subscribe({
      next: (roles) => { this.roles.set(roles); checkDone(); },
      error: () => { this.roles.set([]); checkDone(); }
    });

    this.tenantAdminService.getPermissions().subscribe({
      next: (perms) => { this.allPermissions.set(perms); checkDone(); },
      error: () => { this.allPermissions.set([]); checkDone(); }
    });
  }

  buildTree(units: OrgUnit[]): OrgUnit[] {
    const map = new Map<string, OrgUnit>();
    const roots: OrgUnit[] = [];
    units.forEach(u => map.set(u.id, { ...u, children: [] }));
    map.forEach(node => {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }

  toggleNode(id: string): void {
    this.expandedNodes.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedNodes().has(id);
  }

  hasChildren(node: OrgUnit): boolean {
    return !!node.children && node.children.length > 0;
  }

  isHighlighted(nodeId: string): boolean {
    return this.scopeHighlightIds().has(nodeId);
  }

  // ============================================================
  // User Query
  // ============================================================

  onUserSelect(userId: string): void {
    this.selectedUserId.set(userId);
    if (!userId) {
      this.userRoles.set([]);
      return;
    }
    this.loadingUserRoles.set(true);
    this.tenantAdminService.getUserRoles(userId).subscribe({
      next: (roles) => {
        this.userRoles.set(roles);
        this.loadingUserRoles.set(false);
      },
      error: () => {
        this.userRoles.set([]);
        this.loadingUserRoles.set(false);
      }
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      group: '集團',
      subsidiary: '子公司',
      department: '部門'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      group: 'ri-building-4-line',
      subsidiary: 'ri-building-line',
      department: 'ri-organization-chart'
    };
    return icons[type] || 'ri-folder-line';
  }

  getScopeLabel(scopeType: string): string {
    const labels: Record<string, string> = {
      global: '全域',
      subsidiary: '子公司',
      department: '部門'
    };
    return labels[scopeType] || scopeType;
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

  isPermissionActive(permId: string): boolean {
    return this.effectivePermissionIds().has(permId);
  }

  getSelectedUserName(): string {
    const user = this.users().find(u => u.id === this.selectedUserId());
    return user?.name || '';
  }

  getRolesForNode(nodeId: string): UserRole[] {
    return this.userRoles().filter(ur => ur.scope_id === nodeId);
  }

  getGlobalRoles(): UserRole[] {
    return this.userRoles().filter(ur => ur.scope_type === 'global');
  }
}
