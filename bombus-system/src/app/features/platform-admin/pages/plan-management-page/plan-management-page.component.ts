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

interface ModuleChild {
  id: string;
  label: string;
}

interface ModuleGroup {
  id: string;
  label: string;
  icon: string;
  children: ModuleChild[];
}

const MODULE_REGISTRY: ModuleGroup[] = [
  {
    id: 'L1', label: '員工管理', icon: 'ri-team-line',
    children: [
      { id: 'L1.jobs', label: '招募職缺管理' },
      { id: 'L1.recruitment', label: 'AI智能面試' },
      { id: 'L1.talent-pool', label: '人才庫與再接觸管理' },
      { id: 'L1.profile', label: '員工檔案與歷程管理' },
      { id: 'L1.meeting', label: '會議管理' },
      { id: 'L1.onboarding', label: '入職管理' }
    ]
  },
  {
    id: 'L2', label: '職能管理', icon: 'ri-medal-line',
    children: [
      { id: 'L2.grade-matrix', label: '職等職級管理' },
      { id: 'L2.framework', label: '職能模型基準' },
      { id: 'L2.job-description', label: '職務說明書' },
      { id: 'L2.assessment', label: '職能評估系統' },
      { id: 'L2.gap-analysis', label: '職能落差分析' }
    ]
  },
  {
    id: 'L3', label: '教育訓練', icon: 'ri-book-open-line',
    children: [
      { id: 'L3.course-management', label: '課程與報名管理' },
      { id: 'L3.learning-map', label: '學習地圖' },
      { id: 'L3.effectiveness', label: '培訓成效追蹤' },
      { id: 'L3.competency-heatmap', label: '組織職能熱力圖' },
      { id: 'L3.nine-box', label: '人才九宮格' },
      { id: 'L3.learning-path', label: '學習發展路徑圖' },
      { id: 'L3.key-talent', label: '關鍵人才儀表板' }
    ]
  },
  {
    id: 'L4', label: '專案管理', icon: 'ri-folder-chart-line',
    children: [
      { id: 'L4.list', label: '專案列表' },
      { id: 'L4.profit-prediction', label: 'AI損益預測' },
      { id: 'L4.forecast', label: 'Forecast追蹤' },
      { id: 'L4.report', label: '專案報表' }
    ]
  },
  {
    id: 'L5', label: '績效管理', icon: 'ri-line-chart-line',
    children: [
      { id: 'L5.profit-dashboard', label: '毛利監控儀表板' },
      { id: 'L5.bonus-distribution', label: '獎金分配計算' },
      { id: 'L5.goal-task', label: '目標與任務管理' },
      { id: 'L5.profit-settings', label: '毛利計算參數設定' },
      { id: 'L5.review', label: '績效考核' },
      { id: 'L5.360-feedback', label: '360度回饋' }
    ]
  },
  {
    id: 'L6', label: '文化管理', icon: 'ri-heart-line',
    children: [
      { id: 'L6.handbook', label: '企業文化手冊' },
      { id: 'L6.eap', label: 'EAP員工協助' },
      { id: 'L6.awards', label: '獎項資料庫' },
      { id: 'L6.documents', label: '文件儲存庫' },
      { id: 'L6.ai-assistant', label: 'AI申請助理' },
      { id: 'L6.analysis', label: '智慧文件分析' },
      { id: 'L6.impact', label: '影響力評估' }
    ]
  }
];

// 建立 ID → 名稱的快速查找表
const FEATURE_LABEL_MAP = new Map<string, string>();
for (const mod of MODULE_REGISTRY) {
  for (const child of mod.children) {
    FEATURE_LABEL_MAP.set(child.id, child.label);
  }
}

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
    this.selectedFeatures.set(new Set(this.parseFeatureIds(plan.features)));
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
    return ids.map(id => FEATURE_LABEL_MAP.get(id) || id);
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
