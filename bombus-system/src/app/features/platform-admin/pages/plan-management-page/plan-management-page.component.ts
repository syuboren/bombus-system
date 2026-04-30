import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformAdminService } from '../../services/platform-admin.service';
import { SubscriptionPlan } from '../../models/platform.model';
import { MODULE_REGISTRY, FEATURE_LABEL_MAP } from '../../models/module-registry';

@Component({
  standalone: true,
  selector: 'app-plan-management-page',
  templateUrl: './plan-management-page.component.html',
  styleUrl: './plan-management-page.component.scss',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanManagementPageComponent implements OnInit {
  private platformService = inject(PlatformAdminService);

  readonly moduleRegistry = MODULE_REGISTRY;

  plans = signal<SubscriptionPlan[]>([]);
  loading = signal(true);

  // Form
  showForm = signal(false);
  editingPlan = signal<SubscriptionPlan | null>(null);
  formData = signal<Partial<SubscriptionPlan>>({});
  selectedFeatures = signal<Set<string>>(new Set());

  ngOnInit(): void {
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading.set(true);
    this.platformService.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => {
        this.plans.set([]);
        this.loading.set(false);
      }
    });
  }

  // ============================================================
  // Feature checkbox 管理
  // ============================================================

  isFeatureSelected(id: string): boolean {
    return this.selectedFeatures().has(id);
  }

  toggleFeature(id: string): void {
    this.selectedFeatures.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isModuleFullySelected(moduleId: string): boolean {
    const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
    if (!mod) return false;
    const selected = this.selectedFeatures();
    return mod.children.every(c => selected.has(c.id));
  }

  isModulePartiallySelected(moduleId: string): boolean {
    const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
    if (!mod) return false;
    const selected = this.selectedFeatures();
    const count = mod.children.filter(c => selected.has(c.id)).length;
    return count > 0 && count < mod.children.length;
  }

  toggleModule(moduleId: string): void {
    const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
    if (!mod) return;

    const fullySelected = this.isModuleFullySelected(moduleId);

    this.selectedFeatures.update(set => {
      const next = new Set(set);
      for (const child of mod.children) {
        if (fullySelected) {
          next.delete(child.id);
        } else {
          next.add(child.id);
        }
      }
      return next;
    });
  }

  getSelectedCount(moduleId: string): number {
    const mod = MODULE_REGISTRY.find(m => m.id === moduleId);
    if (!mod) return 0;
    const selected = this.selectedFeatures();
    return mod.children.filter(c => selected.has(c.id)).length;
  }

  // ============================================================
  // 表單操作
  // ============================================================

  openCreateForm(): void {
    this.editingPlan.set(null);
    this.formData.set({
      name: '',
      max_users: 10,
      max_storage_gb: 5,
      features: '',
      price_monthly: 0,
      price_yearly: 0,
      is_active: 1
    });
    this.selectedFeatures.set(new Set());
    this.showForm.set(true);
  }

  openEditForm(plan: SubscriptionPlan): void {
    this.editingPlan.set(plan);
    this.formData.set({
      name: plan.name,
      max_users: plan.max_users,
      max_storage_gb: plan.max_storage_gb,
      features: plan.features,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      is_active: plan.is_active
    });
    // 將模組級別 ID 展開為子功能 ID
    const rawIds = this.parseFeatureIds(plan.features);
    const expandedIds = new Set<string>();
    for (const id of rawIds) {
      const mod = MODULE_REGISTRY.find(m => m.id === id);
      if (mod) {
        for (const child of mod.children) expandedIds.add(child.id);
      } else {
        expandedIds.add(id);
      }
    }
    this.selectedFeatures.set(expandedIds);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingPlan.set(null);
  }

  saveForm(): void {
    const editing = this.editingPlan();
    const data = {
      ...this.formData(),
      features: JSON.stringify([...this.selectedFeatures()])
    };

    if (editing) {
      this.platformService.updatePlan(editing.id, data).subscribe({
        next: () => {
          this.closeForm();
          this.loadPlans();
        }
      });
    } else {
      this.platformService.createPlan(data).subscribe({
        next: () => {
          this.closeForm();
          this.loadPlans();
        }
      });
    }
  }

  updateFormField(field: string, value: string | number): void {
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  // ============================================================
  // 工具方法
  // ============================================================

  getActiveLabel(val: number): string {
    return val === 1 ? '啟用' : '停用';
  }

  getActiveClass(val: number): string {
    return val === 1 ? 'status--active' : 'status--muted';
  }

  formatFeatures(features: string): string[] {
    const ids = this.parseFeatureIds(features);
    const result: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      // 模組級別 ID → 展開為子功能名稱
      const mod = MODULE_REGISTRY.find(m => m.id === id);
      if (mod) {
        for (const child of mod.children) {
          if (!seen.has(child.id)) {
            seen.add(child.id);
            result.push(child.label);
          }
        }
      } else if (!seen.has(id)) {
        seen.add(id);
        result.push(FEATURE_LABEL_MAP.get(id) || id);
      }
    }
    return result;
  }

  private parseFeatureIds(features: string): string[] {
    if (!features) return [];
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) {
        return parsed.filter(f => typeof f === 'string');
      }
      return [];
    } catch {
      // 向後相容：逗號分隔的舊格式
      return features.split(',').map(f => f.trim()).filter(Boolean);
    }
  }
}
