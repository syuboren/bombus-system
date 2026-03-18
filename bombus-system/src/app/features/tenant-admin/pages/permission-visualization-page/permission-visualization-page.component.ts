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
  RoleFeaturePerm,
  ActionLevel
} from '../../models/tenant-admin.model';
import { mergeFeaturePerms, groupByModule, MODULE_LABELS, MODULE_ORDER } from '../../utils/merge-feature-perms';

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
  loading = signal(true);

  // User query
  selectedUserId = signal('');
  userRoles = signal<UserRole[]>([]);
  loadingUserRoles = signal(false);

  // Feature permissions
  featurePermsList = signal<RoleFeaturePerm[]>([]);

  expandedNodes = signal<Set<string>>(new Set());

  tree = computed(() => this.buildTree(this.orgUnits()));

  featurePermsByModule = computed(() => groupByModule(this.featurePermsList()));

  featureModuleOrder = computed(() =>
    MODULE_ORDER.filter(m => this.featurePermsByModule().has(m))
  );

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
      if (completed >= 2) this.loading.set(false);
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
      this.featurePermsList.set([]);
      return;
    }
    this.loadingUserRoles.set(true);
    this.tenantAdminService.getUserRoles(userId).subscribe({
      next: (roles) => {
        this.userRoles.set(roles);
        this.loadingUserRoles.set(false);
        this.loadUserFeaturePerms(roles);
      },
      error: () => {
        this.userRoles.set([]);
        this.loadingUserRoles.set(false);
      }
    });
  }

  private loadUserFeaturePerms(userRoles: UserRole[]): void {
    if (userRoles.length === 0) {
      this.featurePermsList.set([]);
      return;
    }

    let loaded = 0;
    const total = userRoles.length;
    const allPerms: RoleFeaturePerm[][] = [];

    for (const ur of userRoles) {
      this.tenantAdminService.getRoleFeaturePerms(ur.role_id).subscribe({
        next: (perms) => {
          allPerms.push(perms);
          loaded++;
          if (loaded === total) {
            this.featurePermsList.set(mergeFeaturePerms(allPerms));
          }
        },
        error: () => {
          loaded++;
          if (loaded === total) {
            this.featurePermsList.set(mergeFeaturePerms(allPerms));
          }
        }
      });
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

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
