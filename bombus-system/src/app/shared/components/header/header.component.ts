import { Component, ChangeDetectionStrategy, inject, input, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarService } from '../../../core/services/sidebar.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../features/auth/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private sidebarService = inject(SidebarService);
  private notificationService = inject(NotificationService);
  private authService = inject(AuthService);

  pageTitle = input<string>('儀表板');
  breadcrumbs = input<string[]>(['首頁']);

  // User menu dropdown state
  showUserMenu = signal(false);

  // Get current user from auth service
  readonly currentUser = this.authService.currentUser;

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.header__user-menu-wrapper')) {
      this.showUserMenu.set(false);
    }
  }

  toggleMobileSidebar(): void {
    this.sidebarService.toggleMobile();
  }

  onSearch(): void {
    this.notificationService.info('搜尋功能開發中');
  }

  onNotification(): void {
    this.notificationService.info('您有 5 條新通知');
  }

  onQuickAction(): void {
    this.notificationService.info('快速操作選單');
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  onLogout(): void {
    this.showUserMenu.set(false);
    this.authService.logout();
    this.notificationService.success('已成功登出');
  }

  getUserInitial(): string {
    const user = this.currentUser();
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return 'U';
  }
}

