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
  },
  {
    id: 'SYS', label: '系統管理', icon: 'ri-settings-3-line',
    children: [
      { id: 'SYS.org-structure', label: '組織架構管理' },
      { id: 'SYS.user-management', label: '員工與帳號管理' },
      { id: 'SYS.role-management', label: '角色權限管理' },
      { id: 'SYS.audit', label: '審計日誌' }
    ]
  }
];

interface IndustryOption {
  value: string;
  label: string;
}

const INDUSTRY_OPTIONS: IndustryOption[] = [
  { value: 'technology', label: '科技業' },
  { value: 'manufacturing', label: '製造業' },
  { value: 'finance', label: '金融保險業' },
  { value: 'healthcare', label: '醫療保健業' },
  { value: 'retail', label: '零售業' },
  { value: 'food-beverage', label: '餐飲業' },
  { value: 'education', label: '教育業' },
  { value: 'construction', label: '營建業' },
  { value: 'logistics', label: '物流運輸業' },
  { value: 'consulting', label: '顧問服務業' },
  { value: 'media', label: '媒體傳播業' },
  { value: 'real-estate', label: '不動產業' },
  { value: 'energy', label: '能源業' },
  { value: 'agriculture', label: '農林漁牧業' },
  { value: 'other', label: '其他' }
];

const INDUSTRY_LABEL_MAP = new Map<string, string>();
for (const opt of INDUSTRY_OPTIONS) {
  INDUSTRY_LABEL_MAP.set(opt.value, opt.label);
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

  readonly industryOptions = INDUSTRY_OPTIONS;
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
    return INDUSTRY_LABEL_MAP.get(value) || value || '-';
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
