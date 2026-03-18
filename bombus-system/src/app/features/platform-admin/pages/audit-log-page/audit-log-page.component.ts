import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformAdminService } from '../../services/platform-admin.service';
import { AuditLog } from '../../models/platform.model';

@Component({
  standalone: true,
  selector: 'app-audit-log-page',
  templateUrl: './audit-log-page.component.html',
  styleUrl: './audit-log-page.component.scss',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogPageComponent implements OnInit {
  private platformService = inject(PlatformAdminService);

  logs = signal<AuditLog[]>([]);
  totalCount = signal(0);
  loading = signal(true);

  // Filters
  actionFilter = signal('');
  tenantFilter = signal('');
  startDate = signal('');
  endDate = signal('');
  currentPage = signal(1);
  pageSize = 30;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.platformService.getAuditLogs({
      page: this.currentPage(),
      limit: this.pageSize,
      action: this.actionFilter() || undefined,
      tenant_id: this.tenantFilter() || undefined,
      start_date: this.startDate() || undefined,
      end_date: this.endDate() || undefined
    }).subscribe({
      next: (res) => {
        this.logs.set(res.data || []);
        this.totalCount.set(res.pagination?.total || 0);
        this.loading.set(false);
      },
      error: () => {
        this.logs.set([]);
        this.loading.set(false);
      }
    });
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadLogs();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadLogs();
  }

  clearFilters(): void {
    this.actionFilter.set('');
    this.tenantFilter.set('');
    this.startDate.set('');
    this.endDate.set('');
    this.currentPage.set(1);
    this.loadLogs();
  }

  totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize);
  }

  getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'login_success': '登入成功',
      'login_failed': '登入失敗',
      'tenant_create': '建立租戶',
      'tenant_suspend': '暫停租戶',
      'tenant_soft_delete': '軟刪除租戶',
      'tenant_restore': '恢復租戶',
      'tenant_purge': '永久刪除租戶',
      'role_create': '建立角色',
      'role_update': '更新角色',
      'role_delete': '刪除角色',
      'user_role_assign': '指派角色',
      'user_role_revoke': '移除角色',
      'data_migration': '資料遷移',
      'plan_create': '建立方案',
      'plan_update': '更新方案',
      'tenant_update': '更新租戶'
    };
    return labels[action] || action;
  }

  getActionClass(action: string): string {
    if (action.includes('delete') || action.includes('purge') || action === 'login_failed') {
      return 'action--danger';
    }
    if (action.includes('create') || action === 'login_success' || action.includes('restore')) {
      return 'action--success';
    }
    if (action.includes('suspend')) {
      return 'action--warning';
    }
    return 'action--info';
  }

  formatDetails(details: Record<string, unknown> | string | null): string {
    if (!details) return '';
    if (typeof details === 'object') return JSON.stringify(details);
    return details;
  }

  parseDetails(details: Record<string, unknown> | string | null): string {
    if (!details) return '';
    if (typeof details === 'object') return JSON.stringify(details, null, 2);
    try {
      const parsed = JSON.parse(details);
      return typeof parsed === 'object' ? JSON.stringify(parsed, null, 2) : details;
    } catch {
      return details;
    }
  }
}
