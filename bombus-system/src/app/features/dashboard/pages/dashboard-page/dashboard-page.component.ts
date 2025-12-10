import { Component, ChangeDetectionStrategy, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { StatCardComponent, ModuleType, ChangeType } from '../../../../shared/components/stat-card/stat-card.component';

interface StatData {
  icon: string;
  label: string;
  value: string | number;
  changeText: string;
  changeType: ChangeType;
  moduleType: ModuleType;
}

interface QuickAccess {
  title: string;
  description: string;
  icon: string;
  route: string;
  moduleClass: string;
}

interface Activity {
  title: string;
  description: string;
  time: string;
  moduleClass: string;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, HeaderComponent, StatCardComponent],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent implements OnInit {
  currentDate = signal<string>('');
  
  readonly stats: StatData[] = [
    {
      icon: 'ri-team-line',
      label: '總員工數',
      value: '1,247',
      changeText: '較上月 +3.2%',
      changeType: 'positive',
      moduleType: 'l1'
    },
    {
      icon: 'ri-book-open-line',
      label: '培訓完成率',
      value: '72%',
      changeText: '較上季 +5%',
      changeType: 'positive',
      moduleType: 'l3'
    },
    {
      icon: 'ri-folder-chart-line',
      label: '進行中專案',
      value: '42',
      changeText: '與上月持平',
      changeType: 'neutral',
      moduleType: 'l4'
    },
    {
      icon: 'ri-line-chart-line',
      label: '平均績效分數',
      value: '85.3',
      changeText: '較上季 +2.1',
      changeType: 'positive',
      moduleType: 'l5'
    }
  ];

  readonly quickAccessItems: QuickAccess[] = [
    {
      title: '職能熱力圖',
      description: '快速定位組織職能短板',
      icon: 'ri-fire-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    },
    {
      title: '人才九宮格',
      description: '績效潛力矩陣分析',
      icon: 'ri-grid-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    },
    {
      title: '學習路徑圖',
      description: '智能推薦學習路徑',
      icon: 'ri-route-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    },
    {
      title: '關鍵人才儀表板',
      description: '高風險人才預警',
      icon: 'ri-star-line',
      route: '/training/talent-map',
      moduleClass: 'module-l3'
    }
  ];

  readonly activities: Activity[] = [
    {
      title: '新增員工檔案',
      description: '王小明已完成入職程序',
      time: '5 分鐘前',
      moduleClass: 'module-l1'
    },
    {
      title: '培訓課程完成',
      description: '15位員工完成「Python進階開發」課程',
      time: '1 小時前',
      moduleClass: 'module-l3'
    },
    {
      title: '績效考核啟動',
      description: 'Q4績效考核週期已開始',
      time: '3 小時前',
      moduleClass: 'module-l5'
    }
  ];

  todos = signal<TodoItem[]>([
    { id: '1', text: '審核5份面試評估報告', completed: false },
    { id: '2', text: '完成Q4培訓計畫', completed: false },
    { id: '3', text: '系統備份檢查', completed: true }
  ]);

  ngOnInit(): void {
    this.updateCurrentDate();
  }

  toggleTodo(id: string): void {
    this.todos.update(todos =>
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  }

  private updateCurrentDate(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[today.getDay()];
    
    this.currentDate.set(`${year}-${month}-${day} (${weekday})`);
  }
}

