import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TenantAdminService } from '../../services/tenant-admin.service';
import { AuditLog } from '../../../platform-admin/models/platform.model';

@Component({
  standalone: true,
  selector: 'app-tenant-audit-log-page',
  templateUrl: './tenant-audit-log-page.component.html',
  styleUrl: './tenant-audit-log-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantAuditLogPageComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);

  logs = signal<AuditLog[]>([]);
  totalCount = signal(0);
  loading = signal(true);

  // Filters
  actionFilter = signal('');
  startDate = signal('');
  endDate = signal('');
  currentPage = signal(1);
  pageSize = 30;

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.tenantAdminService.getAuditLogs({
      page: this.currentPage(),
      limit: this.pageSize,
      action: this.actionFilter() || undefined,
      start_date: this.startDate() || undefined,
      end_date: this.endDate() || undefined
    }).subscribe({
      next: (res) => {
        this.logs.set(res.data || []);
        this.totalCount.set(res.total || 0);
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
      'role_create': '建立角色',
      'role_update': '更新角色',
      'role_delete': '刪除角色',
      'user_role_assign': '指派角色',
      'user_role_revoke': '移除角色',
      'data_migration': '資料遷移'
    };
    return labels[action] || action;
  }

  getActionClass(action: string): string {
    if (action.includes('delete') || action === 'login_failed') return 'action--danger';
    if (action.includes('create') || action === 'login_success') return 'action--success';
    if (action.includes('assign')) return 'action--info';
    return 'action--muted';
  }
}
