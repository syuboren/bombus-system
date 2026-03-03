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

  plans = signal<SubscriptionPlan[]>([]);
  loading = signal(true);

  // Form
  showForm = signal(false);
  editingPlan = signal<SubscriptionPlan | null>(null);
  formData = signal<Partial<SubscriptionPlan>>({});

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
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingPlan.set(null);
  }

  saveForm(): void {
    const editing = this.editingPlan();
    const data = this.formData();

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

  getActiveLabel(val: number): string {
    return val === 1 ? '啟用' : '停用';
  }

  getActiveClass(val: number): string {
    return val === 1 ? 'status--active' : 'status--muted';
  }

  formatFeatures(features: string): string[] {
    if (!features) return [];
    try {
      const parsed = JSON.parse(features);
      return Array.isArray(parsed) ? parsed : [features];
    } catch {
      return features.split(',').map(f => f.trim()).filter(Boolean);
    }
  }
}
