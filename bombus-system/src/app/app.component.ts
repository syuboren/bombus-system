import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { NotificationComponent } from './shared/components/notification/notification.component';
import { SidebarService } from './core/services/sidebar.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  private sidebarService = inject(SidebarService);
  private router = inject(Router);

  // 監聽路由變化，判斷是否為登入頁面
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(event => (event as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  // 計算是否顯示側邊欄（登入頁面不顯示）
  readonly showSidebar = computed(() => {
    const url = this.currentUrl();
    return !url?.includes('/login');
  });

  readonly isMinimized = this.sidebarService.isMinimized;
}
