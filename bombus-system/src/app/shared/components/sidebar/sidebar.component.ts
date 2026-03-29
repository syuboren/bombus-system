import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { PermissionService } from '../../../core/services/permission.service';
import { FeatureGateService } from '../../../core/services/feature-gate.service';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  badge?: string;
  moduleClass?: string;
  featureId?: string;
  children?: MenuItem[];
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private sidebarService = inject(SidebarService);
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private permissionService = inject(PermissionService);
  private featureGateService = inject(FeatureGateService);

  // Get current user from auth service
  readonly currentUser = this.authService.currentUser;
  readonly isPlatformAdmin = this.permissionService.isPlatformAdmin;

  readonly isMinimized = this.sidebarService.isMinimized;
  readonly isMobileOpen = this.sidebarService.isMobileOpen;

  expandedMenus = signal<Set<string>>(new Set());

  readonly menuSections: MenuSection[] = [
    {
      items: [
        {
          label: '企業管理儀表板',
          icon: 'ri-dashboard-line',
          route: '/dashboard',
          badge: 'L0.0'
        }
      ]
    },
    {
      title: '員工管理模組',
      items: [
        {
          label: '員工管理',
          icon: 'ri-team-line',
          moduleClass: 'module-l1',
          children: [
            { label: '招募職缺管理', icon: '', route: '/employee/jobs', featureId: 'L1.jobs' },
            { label: 'AI智能面試', icon: '', route: '/employee/recruitment', featureId: 'L1.recruitment' },
            { label: '人才庫與再接觸管理', icon: '', route: '/employee/talent-pool', featureId: 'L1.talent-pool' },
            { label: '員工檔案與歷程管理', icon: '', route: '/employee/profile', featureId: 'L1.profile' },
            { label: '會議管理', icon: '', route: '/employee/meeting', featureId: 'L1.meeting' },
            { label: '入職管理', icon: '', route: '/employee/onboarding', featureId: 'L1.onboarding' }
          ]
        },
        {
          label: '職能管理',
          icon: 'ri-medal-line',
          moduleClass: 'module-l2',
          children: [
            { label: '職等職級管理', icon: '', route: '/competency/grade-matrix', featureId: 'L2.grade-matrix' },
            { label: '職能模型基準', icon: '', route: '/competency/framework', featureId: 'L2.framework' },
            { label: '職務說明書', icon: '', route: '/competency/job-description', featureId: 'L2.job-description' },
            { label: '職能評估系統', icon: '', route: '/competency/assessment', featureId: 'L2.assessment' },
            { label: '職能落差分析', icon: '', route: '/competency/gap-analysis', featureId: 'L2.gap-analysis' }
          ]
        },
        {
          label: '教育訓練',
          icon: 'ri-book-open-line',
          moduleClass: 'module-l3',
          children: [
            { label: '課程與報名管理', icon: '', route: '/training/course-management', featureId: 'L3.course-management' },
            { label: '學習地圖', icon: '', route: '/training/learning-map', featureId: 'L3.learning-map' },
            { label: '培訓成效追蹤', icon: '', route: '/training/effectiveness', featureId: 'L3.effectiveness' },
            { label: '組織職能熱力圖', icon: '', route: '/training/competency-heatmap', featureId: 'L3.competency-heatmap' },
            { label: '人才九宮格', icon: '', route: '/training/nine-box', featureId: 'L3.nine-box' },
            { label: '學習發展路徑圖', icon: '', route: '/training/learning-path', featureId: 'L3.learning-path' },
            { label: '關鍵人才儀表板', icon: '', route: '/training/key-talent', featureId: 'L3.key-talent' }
          ]
        },
        {
          label: '專案管理',
          icon: 'ri-folder-chart-line',
          moduleClass: 'module-l4',
          children: [
            { label: '專案列表', icon: '', route: '/project/list', featureId: 'L4.list' },
            { label: 'AI損益預測', icon: '', route: '/project/profit-prediction', featureId: 'L4.profit-prediction' },
            { label: 'Forecast追蹤', icon: '', route: '/project/forecast', featureId: 'L4.forecast' },
            { label: '專案報表', icon: '', route: '/project/report', featureId: 'L4.report' }
          ]
        },
        {
          label: '績效管理',
          icon: 'ri-line-chart-line',
          moduleClass: 'module-l5',
          children: [
            { label: '毛利監控儀表板', icon: '', route: '/performance/profit-dashboard', featureId: 'L5.profit-dashboard' },
            { label: '獎金分配計算', icon: '', route: '/performance/bonus-distribution', featureId: 'L5.bonus-distribution' },
            { label: '目標與任務管理', icon: '', route: '/performance/goal-task', featureId: 'L5.goal-task' },
            { label: '毛利計算參數設定', icon: '', route: '/performance/profit-settings', featureId: 'L5.profit-settings' },
            { label: '績效考核', icon: '', route: '/performance/review', featureId: 'L5.review' },
            { label: '360度回饋', icon: '', route: '/performance/360-feedback', featureId: 'L5.360-feedback' }
          ]
        },
        {
          label: '文化管理',
          icon: 'ri-heart-line',
          moduleClass: 'module-l6',
          children: [
            { label: '企業文化手冊', icon: '', route: '/culture/handbook', featureId: 'L6.handbook' },
            { label: 'EAP員工協助', icon: '', route: '/culture/eap', featureId: 'L6.eap' },
            { label: '獎項資料庫', icon: '', route: '/culture/awards', featureId: 'L6.awards' },
            { label: '文件儲存庫', icon: '', route: '/culture/documents', featureId: 'L6.documents' },
            { label: 'AI申請助理', icon: '', route: '/culture/ai-assistant', featureId: 'L6.ai-assistant' },
            { label: '智慧文件分析', icon: '', route: '/culture/analysis', featureId: 'L6.analysis' },
            { label: '影響力評估', icon: '', route: '/culture/impact', featureId: 'L6.impact' }
          ]
        }
      ]
    },
    {
      title: '系統設定',
      items: [
        {
          label: '租戶管理',
          icon: 'ri-settings-3-line',
          children: [
            { label: '組織架構管理', icon: '', route: '/settings/org-structure', featureId: 'SYS.org-structure' },
            { label: '員工與帳號管理', icon: '', route: '/settings/users', featureId: 'SYS.user-management' },
            { label: '角色權限管理', icon: '', route: '/settings/roles', featureId: 'SYS.role-management' },
            { label: '審計日誌', icon: '', route: '/settings/audit', featureId: 'SYS.audit' }
          ]
        }
      ]
    },
  ];

  readonly platformMenuSections: MenuSection[] = [
    {
      items: [
        {
          label: '平台總覽',
          icon: 'ri-dashboard-line',
          route: '/platform/tenants'
        }
      ]
    },
    {
      title: '平台管理',
      items: [
        {
          label: '租戶管理',
          icon: 'ri-building-line',
          route: '/platform/tenants'
        },
        {
          label: '方案管理',
          icon: 'ri-vip-crown-line',
          route: '/platform/plans'
        },
        {
          label: '審計日誌',
          icon: 'ri-file-list-3-line',
          route: '/platform/audit'
        }
      ]
    }
  ];

  readonly activeMenuSections = computed(() => {
    if (this.isPlatformAdmin()) {
      return this.platformMenuSections;
    }

    // 觸發 signal 依賴以便功能變更時自動更新
    this.featureGateService.enabledFeatures();
    this.authService.featurePerms();

    return this.menuSections
      .map(section => ({
        ...section,
        items: section.items
          .map(item => {
            if (!item.children || item.children.length === 0) {
              if (!item.featureId || this.featureGateService.isFeatureAccessible(item.featureId)) {
                return item;
              }
              return null;
            }

            const visibleChildren = item.children.filter(
              child => !child.featureId || this.featureGateService.isFeatureAccessible(child.featureId)
            );

            if (visibleChildren.length === 0) return null;
            return { ...item, children: visibleChildren };
          })
          .filter((item): item is MenuItem => item !== null)
      }))
      .filter(section => section.items.length > 0);
  });

  toggleSidebar(): void {
    this.sidebarService.toggle();
  }

  closeMobileSidebar(): void {
    this.sidebarService.closeMobile();
  }

  toggleMenu(label: string): void {
    this.expandedMenus.update(set => {
      const newSet = new Set(set);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  }

  isMenuExpanded(label: string): boolean {
    return this.expandedMenus().has(label);
  }

  getUserInitial(): string {
    const user = this.currentUser();
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return 'U';
  }

  onLogout(): void {
    this.authService.logout();
    this.notificationService.success('已成功登出');
  }
}

