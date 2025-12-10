import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';

interface MenuItem {
  label: string;
  icon: string;
  route?: string;
  badge?: string;
  moduleClass?: string;
  children?: MenuItem[];
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  private sidebarService = inject(SidebarService);

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
            { label: '招募職缺管理', icon: '', route: '/employee/jobs' },
            { label: 'AI智能面試', icon: '', route: '/employee/recruitment' },
            { label: '員工檔案管理', icon: '', route: '/employee/profile' },
            { label: '人才庫管理', icon: '', route: '/employee/talent-pool' }
          ]
        },
        {
          label: '職能管理',
          icon: 'ri-medal-line',
          moduleClass: 'module-l2',
          children: [
            { label: '職能框架開發', icon: '', route: '/competency/framework' },
            { label: '職能評估系統', icon: '', route: '/competency/assessment' },
            { label: '職能落差分析', icon: '', route: '/competency/gap-analysis' }
          ]
        },
        {
          label: '教育訓練',
          icon: 'ri-book-open-line',
          moduleClass: 'module-l3',
          children: [
            { label: '人才地圖總覽', icon: '', route: '/training/talent-map' }
          ]
        },
        {
          label: '專案管理',
          icon: 'ri-folder-chart-line',
          moduleClass: 'module-l4',
          children: [
            { label: '專案列表', icon: '', route: '/project/list' },
            { label: 'AI損益預測', icon: '', route: '/project/profit-prediction' }
          ]
        },
        {
          label: '績效管理',
          icon: 'ri-line-chart-line',
          moduleClass: 'module-l5',
          children: [
            { label: '績效考核', icon: '', route: '/performance/review' },
            { label: '360度回饋', icon: '', route: '/performance/360-feedback' }
          ]
        },
        {
          label: '文化管理',
          icon: 'ri-heart-line',
          moduleClass: 'module-l6',
          children: [
            { label: '企業文化手冊', icon: '', route: '/culture/handbook' },
            { label: 'EAP員工協助', icon: '', route: '/culture/eap' }
          ]
        }
      ]
    },
    {
      title: '系統設定',
      items: [
        {
          label: '權限管理',
          icon: 'ri-shield-user-line',
          route: '/settings/permissions'
        },
        {
          label: '備份管理',
          icon: 'ri-database-2-line',
          route: '/settings/backup'
        }
      ]
    }
  ];

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
}

