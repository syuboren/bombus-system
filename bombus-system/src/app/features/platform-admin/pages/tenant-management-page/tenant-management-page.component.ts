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
  TenantAdmin,
  SubscriptionPlan,
  CreateTenantRequest
} from '../../models/platform.model';
import { MODULE_REGISTRY } from '../../models/module-registry';

interface IndustryOption {
  value: string;
  label: string;
}

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

  // D-16: 產業選項由 API 動態載入
  industryOptions = signal<IndustryOption[]>([]);
  private industryLabelMap = signal<Map<string, string>>(new Map());
  readonly moduleRegistry = MODULE_REGISTRY;

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
  logoPreview = signal<string | null>(null);
  logoUploading = signal(false);

  // Admin management (edit mode)
  tenantAdmins = signal<TenantAdmin[]>([]);
  adminEdits = signal<Record<string, { name?: string; email?: string; password?: string }>>({});

  // Feature overrides
  useFeatureOverrides = signal(false);
  selectedFeatures = signal<Set<string>>(new Set());
  featureOverridesNote = signal('');

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
    this.loadIndustries();
  }

  loadIndustries(): void {
    this.platformService.getIndustries(true).subscribe({
      next: (rows) => {
        const opts = rows.map(r => ({ value: r.code, label: r.name }));
        this.industryOptions.set(opts);
        const map = new Map<string, string>();
        for (const r of rows) map.set(r.code, r.name);
        this.industryLabelMap.set(map);
      },
      error: () => {
        // 載入失敗時保持空清單；getIndustryLabel 將回傳 raw value 作 fallback
        this.industryOptions.set([]);
      }
    });
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
      logo_url: '',
      industry: '',
      admin_email: '',
      admin_name: '',
      admin_password: ''
    });
    this.logoPreview.set(null);
    this.useFeatureOverrides.set(false);
    this.selectedFeatures.set(new Set());
    this.featureOverridesNote.set('');
    this.showForm.set(true);
  }

  openEditForm(tenant: Tenant): void {
    this.editingTenant.set(tenant);
    this.formData.set({
      name: tenant.name,
      slug: tenant.slug,
      plan_id: tenant.plan_id,
      logo_url: tenant.logo_url || '',
      industry: tenant.industry || ''
    });
    this.logoPreview.set(tenant.logo_url || null);
    this.tenantAdmins.set([]);
    this.adminEdits.set({});

    // 初始化功能覆寫
    const overrides = this.parseFeatureIds(tenant.feature_overrides || '');
    this.useFeatureOverrides.set(overrides.length > 0);
    this.selectedFeatures.set(new Set(overrides));
    this.featureOverridesNote.set(tenant.feature_overrides_note || '');

    this.showForm.set(true);

    // 載入租戶管理員
    this.platformService.getTenantAdmins(tenant.id).subscribe({
      next: (admins) => this.tenantAdmins.set(admins),
      error: () => this.tenantAdmins.set([])
    });
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingTenant.set(null);
    this.logoPreview.set(null);
    this.tenantAdmins.set([]);
    this.adminEdits.set({});
    this.useFeatureOverrides.set(false);
    this.selectedFeatures.set(new Set());
    this.featureOverridesNote.set('');
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // 檔案大小檢查 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('檔案大小不可超過 2MB');
      return;
    }

    this.logoUploading.set(true);
    this.platformService.uploadTenantLogo(file).subscribe({
      next: (res) => {
        this.formData.update(d => ({ ...d, logo_url: res.url }));
        this.logoPreview.set(res.url);
        this.logoUploading.set(false);
      },
      error: () => {
        this.logoUploading.set(false);
        alert('Logo 上傳失敗，請確認格式為 JPEG、PNG 或 WebP');
      }
    });

    // 清空 input 以允許重複選擇同一檔案
    input.value = '';
  }

  removeLogo(): void {
    this.formData.update(d => ({ ...d, logo_url: '' }));
    this.logoPreview.set(null);
  }

  saveForm(): void {
    const editing = this.editingTenant();
    const data = this.formData();

    if (editing) {
      // 準備功能覆寫資料
      const featureOverrides = this.useFeatureOverrides()
        ? JSON.stringify([...this.selectedFeatures()])
        : null;

      // 先更新租戶基本資料
      this.platformService.updateTenant(editing.id, {
        name: data.name,
        plan_id: data.plan_id,
        logo_url: data.logo_url || null,
        industry: data.industry || null,
        feature_overrides: featureOverrides,
        feature_overrides_note: this.useFeatureOverrides() ? (this.featureOverridesNote() || null) : null
      } as Partial<Tenant>).subscribe({
        next: () => {
          // 接著更新管理員（如有變更）
          this.saveAdminEdits(editing.id);
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

  updateAdminField(userId: string, field: string, value: string): void {
    this.adminEdits.update(edits => ({
      ...edits,
      [userId]: { ...(edits[userId] || {}), [field]: value }
    }));
  }

  private saveAdminEdits(tenantId: string): void {
    const edits = this.adminEdits();
    for (const [userId, changes] of Object.entries(edits)) {
      const hasChanges = Object.values(changes).some(v => v && v.trim());
      if (hasChanges) {
        const updates: { name?: string; email?: string; password?: string } = {};
        if (changes.name?.trim()) updates.name = changes.name.trim();
        if (changes.email?.trim()) updates.email = changes.email.trim();
        if (changes.password?.trim()) updates.password = changes.password.trim();
        this.platformService.updateTenantAdmin(tenantId, userId, updates).subscribe();
      }
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

  isPlanInactive(planId: string): boolean {
    const plan = this.plans().find(p => p.id === planId);
    return !!plan && !plan.is_active;
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  getIndustryLabel(value: string): string {
    return this.industryLabelMap().get(value) || value || '-';
  }

  updateFormField(field: string, value: string): void {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  // ============================================================
  // Feature Override 選擇器
  // ============================================================

  toggleUseOverrides(): void {
    const next = !this.useFeatureOverrides();
    this.useFeatureOverrides.set(next);
    if (next && this.selectedFeatures().size === 0) {
      // 初始化：從方案繼承
      const plan = this.plans().find(p => p.id === this.formData().plan_id);
      if (plan) {
        this.selectedFeatures.set(new Set(this.parseFeatureIds(plan.features)));
      }
    }
  }

  isFeatureSelected(id: string): boolean {
    return this.selectedFeatures().has(id);
  }

  toggleFeature(id: string): void {
    this.selectedFeatures.update(set => {
      const next = new Set(set);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
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
        if (fullySelected) { next.delete(child.id); } else { next.add(child.id); }
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

  private parseFeatureIds(features: string): string[] {
    if (!features) return [];
    try {
      const parsed = JSON.parse(features);
      if (Array.isArray(parsed)) return parsed.filter((f: unknown) => typeof f === 'string');
      return [];
    } catch {
      return [];
    }
  }
}
