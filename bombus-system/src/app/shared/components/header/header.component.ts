import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { SidebarService } from '../../../core/services/sidebar.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private sidebarService = inject(SidebarService);
  private notificationService = inject(NotificationService);

  pageTitle = input<string>('儀表板');
  breadcrumbs = input<string[]>(['首頁']);

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

  onUserMenu(): void {
    this.notificationService.info('使用者選單');
  }
}

