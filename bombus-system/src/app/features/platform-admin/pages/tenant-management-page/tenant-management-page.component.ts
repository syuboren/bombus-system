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
import { PlatformAdminService } from '../../services/platform-admin.service';
import {
  Tenant,
  TenantStatus,
  SubscriptionPlan,
  CreateTenantRequest
} from '../../models/platform.model';

@Component({
  standalone: true,
  selector: 'app-tenant-management-page',
  templateUrl: './tenant-management-page.component.html',
  styleUrl: './tenant-management-page.component.scss',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantManagementPageComponent implements OnInit {
  private platformService = inject(PlatformAdminService);

  // Data
  tenants = signal<Tenant[]>([]);
  plans = signal<SubscriptionPlan[]>([]);
  totalCount = signal(0);
  loading = signal(true);

  // Filters
  searchKeyword = signal('');
  statusFilter = signal<string>('');
  currentPage = signal(1);
  pageSize = 20;

  // Form
  showForm = signal(false);
  editingTenant = signal<Tenant | null>(null);
  formData = signal<Partial<CreateTenantRequest>>({});

  // Confirm dialog
  showConfirmDialog = signal(false);
  confirmAction = signal<{ type: string; tenant: Tenant | null }>({ type: '', tenant: null });
  confirmInput = signal('');

  // Stats
  stats = computed(() => {
    const all = this.tenants();
    return {
      total: this.totalCount(),
      active: all.filter(t => t.status === 'active').length,
      suspended: all.filter(t => t.status === 'suspended').length
    };
  });

  ngOnInit(): void {
    this.loadTenants();
    this.loadPlans();
  }

  loadTenants(): void {
    this.loading.set(true);
    this.platformService.getTenants({
      page: this.currentPage(),
      limit: this.pageSize,
      search: this.searchKeyword() || undefined,
      status: this.statusFilter() || undefined
    }).subscribe({
      next: (res) => {
        this.tenants.set(res.data || []);
        this.totalCount.set(res.total || 0);
        this.loading.set(false);
      },
      error: () => {
        this.tenants.set([]);
        this.loading.set(false);
      }
    });
  }

  loadPlans(): void {
    this.platformService.getPlans().subscribe({
      next: (plans) => this.plans.set(plans),
      error: () => this.plans.set([])
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadTenants();
  }

  onStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.loadTenants();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadTenants();
  }

  // ============================================================
  // 表單操作
  // ============================================================

  openCreateForm(): void {
    this.editingTenant.set(null);
    this.formData.set({
      name: '',
      slug: '',
      plan_id: '',
      admin_email: '',
      admin_name: '',
      admin_password: ''
    });
    this.showForm.set(true);
  }

  openEditForm(tenant: Tenant): void {
    this.editingTenant.set(tenant);
    this.formData.set({
      name: tenant.name,
      slug: tenant.slug,
      plan_id: tenant.plan_id
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingTenant.set(null);
  }

  saveForm(): void {
    const editing = this.editingTenant();
    const data = this.formData();

    if (editing) {
      this.platformService.updateTenant(editing.id, {
        name: data.name,
        plan_id: data.plan_id
      } as Partial<Tenant>).subscribe({
        next: () => {
          this.closeForm();
          this.loadTenants();
        }
      });
    } else {
      this.platformService.createTenant(data as CreateTenantRequest).subscribe({
        next: () => {
          this.closeForm();
          this.loadTenants();
        }
      });
    }
  }

  // ============================================================
  // 狀態操作
  // ============================================================

  suspendTenant(tenant: Tenant): void {
    this.platformService.updateTenant(tenant.id, { status: 'suspended' } as Partial<Tenant>).subscribe({
      next: () => this.loadTenants()
    });
  }

  restoreTenant(tenant: Tenant): void {
    this.platformService.updateTenant(tenant.id, { status: 'active' } as Partial<Tenant>).subscribe({
      next: () => this.loadTenants()
    });
  }

  softDelete(tenant: Tenant): void {
    this.platformService.softDeleteTenant(tenant.id).subscribe({
      next: () => this.loadTenants()
    });
  }

  openPurgeConfirm(tenant: Tenant): void {
    this.confirmAction.set({ type: 'purge', tenant });
    this.confirmInput.set('');
    this.showConfirmDialog.set(true);
  }

  closeConfirm(): void {
    this.showConfirmDialog.set(false);
    this.confirmAction.set({ type: '', tenant: null });
    this.confirmInput.set('');
  }

  executePurge(): void {
    const action = this.confirmAction();
    if (action.type === 'purge' && action.tenant) {
      this.platformService.purgeTenant(action.tenant.id, this.confirmInput()).subscribe({
        next: () => {
          this.closeConfirm();
          this.loadTenants();
        }
      });
    }
  }

  // ============================================================
  // 工具方法
  // ============================================================

  getStatusLabel(status: TenantStatus): string {
    const labels: Record<TenantStatus, string> = {
      active: '啟用中',
      suspended: '已暫停',
      deleted: '已刪除'
    };
    return labels[status] || status;
  }

  getStatusClass(status: TenantStatus): string {
    const classes: Record<TenantStatus, string> = {
      active: 'status--active',
      suspended: 'status--warning',
      deleted: 'status--danger'
    };
    return classes[status] || '';
  }

  getPlanName(planId: string): string {
    const plan = this.plans().find(p => p.id === planId);
    return plan?.name || '未知方案';
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  updateFormField(field: string, value: string): void {
    this.formData.update(data => ({ ...data, [field]: value }));
  }
}
