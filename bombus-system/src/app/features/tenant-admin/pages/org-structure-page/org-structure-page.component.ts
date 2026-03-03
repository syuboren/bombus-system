import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TenantAdminService } from '../../services/tenant-admin.service';
import { OrgUnit, OrgUnitType } from '../../models/tenant-admin.model';

@Component({
  standalone: true,
  selector: 'app-org-structure-page',
  templateUrl: './org-structure-page.component.html',
  styleUrl: './org-structure-page.component.scss',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgStructurePageComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);

  orgUnits = signal<OrgUnit[]>([]);
  loading = signal(true);
  expandedNodes = signal<Set<string>>(new Set());

  // Form
  showForm = signal(false);
  editingUnit = signal<OrgUnit | null>(null);
  formData = signal<Partial<OrgUnit>>({});

  // Confirm delete
  showDeleteConfirm = signal(false);
  deletingUnit = signal<OrgUnit | null>(null);

  tree = computed(() => this.buildTree(this.orgUnits()));

  ngOnInit(): void {
    this.loadOrgUnits();
  }

  loadOrgUnits(): void {
    this.loading.set(true);
    this.tenantAdminService.getOrgUnits().subscribe({
      next: (units) => {
        this.orgUnits.set(units);
        // Expand all nodes by default
        const ids = new Set(units.map(u => u.id));
        this.expandedNodes.set(ids);
        this.loading.set(false);
      },
      error: () => {
        this.orgUnits.set([]);
        this.loading.set(false);
      }
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedNodes().has(id);
  }

  // ============================================================
  // CRUD
  // ============================================================

  openCreateForm(parentUnit?: OrgUnit): void {
    this.editingUnit.set(null);
    const childType = this.getChildType(parentUnit?.type);
    this.formData.set({
      name: '',
      type: childType,
      parent_id: parentUnit?.id || null
    });
    this.showForm.set(true);
  }

  openEditForm(unit: OrgUnit): void {
    this.editingUnit.set(unit);
    this.formData.set({
      name: unit.name,
      type: unit.type,
      parent_id: unit.parent_id
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingUnit.set(null);
  }

  saveForm(): void {
    const editing = this.editingUnit();
    const data = this.formData();

    if (editing) {
      this.tenantAdminService.updateOrgUnit(editing.id, data).subscribe({
        next: () => {
          this.closeForm();
          this.loadOrgUnits();
        }
      });
    } else {
      this.tenantAdminService.createOrgUnit(data).subscribe({
        next: () => {
          this.closeForm();
          this.loadOrgUnits();
        }
      });
    }
  }

  confirmDelete(unit: OrgUnit): void {
    this.deletingUnit.set(unit);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.deletingUnit.set(null);
  }

  executeDelete(): void {
    const unit = this.deletingUnit();
    if (unit) {
      this.tenantAdminService.deleteOrgUnit(unit.id).subscribe({
        next: () => {
          this.closeDeleteConfirm();
          this.loadOrgUnits();
        }
      });
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  getChildType(parentType?: OrgUnitType): OrgUnitType {
    if (!parentType) return 'group';
    if (parentType === 'group') return 'subsidiary';
    return 'department';
  }

  getTypeLabel(type: OrgUnitType): string {
    const labels: Record<OrgUnitType, string> = {
      group: '集團',
      subsidiary: '子公司',
      department: '部門'
    };
    return labels[type] || type;
  }

  getTypeIcon(type: OrgUnitType): string {
    const icons: Record<OrgUnitType, string> = {
      group: 'ri-building-4-line',
      subsidiary: 'ri-building-line',
      department: 'ri-organization-chart'
    };
    return icons[type] || 'ri-folder-line';
  }

  getTypeClass(type: OrgUnitType): string {
    return `type--${type}`;
  }

  getParentOptions(): OrgUnit[] {
    const editing = this.editingUnit();
    return this.orgUnits().filter(u => {
      if (editing && u.id === editing.id) return false;
      return u.type !== 'department';
    });
  }

  hasChildren(node: OrgUnit): boolean {
    return !!node.children && node.children.length > 0;
  }

  updateFormField(field: string, value: string | null): void {
    this.formData.update(d => ({ ...d, [field]: value }));
  }
}
