import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { TenantAdminService } from '../../services/tenant-admin.service';
import { TenantUser } from '../../models/tenant-admin.model';

@Component({
  standalone: true,
  selector: 'app-user-management-page',
  templateUrl: './user-management-page.component.html',
  styleUrl: './user-management-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementPageComponent implements OnInit {
  private tenantAdminService = inject(TenantAdminService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  users = signal<TenantUser[]>([]);
  loading = signal(true);

  // Password reset result
  resetResult = signal<{ userId: string; newPassword: string } | null>(null);
  resetLoading = signal<string | null>(null); // userId being reset

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.tenantAdminService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.loading.set(false);
      }
    });
  }

  // ===== Quick Actions =====

  toggleUserStatus(user: TenantUser): void {
    const newStatus = user.is_active === 1 ? 'suspended' : 'active';
    this.tenantAdminService.updateUser(user.id, { status: newStatus } as any).subscribe({
      next: () => {
        this.notificationService.success(
          newStatus === 'active' ? `${user.name} 帳號已啟用` : `${user.name} 帳號已停用`
        );
        this.loadUsers();
      },
      error: () => {
        this.notificationService.error('帳號狀態更新失敗');
      }
    });
  }

  resetPassword(user: TenantUser): void {
    this.resetLoading.set(user.id);
    this.resetResult.set(null);
    this.tenantAdminService.resetUserPassword(user.id).subscribe({
      next: (result) => {
        this.resetResult.set({ userId: user.id, newPassword: result.newPassword });
        this.resetLoading.set(null);
        this.notificationService.success(`${user.name} 密碼已重設`);
      },
      error: () => {
        this.resetLoading.set(null);
        this.notificationService.error('密碼重設失敗');
      }
    });
  }

  dismissResetResult(): void {
    this.resetResult.set(null);
  }

  navigateToEmployee(user: TenantUser): void {
    this.router.navigate(['/organization/employee-management'], {
      queryParams: { userId: user.id }
    });
  }

  // ===== Helpers =====

  getActiveLabel(val: number): string {
    return val === 1 ? '啟用' : '停用';
  }

  getActiveClass(val: number): string {
    return val === 1 ? 'status--active' : 'status--muted';
  }
}
