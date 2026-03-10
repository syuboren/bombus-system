import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { OrgUnitService } from '../../../../core/services/org-unit.service';
import * as echarts from 'echarts';

// ============================================
// 資料模型
// ============================================
type GoalType = 'okr' | 'smart';
type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'completed';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

interface KeyResult {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  weight: number;
  progress: number;
}

interface Goal {
  id: string;
  type: GoalType;
  title: string;
  description: string;
  owner: string;
  ownerAvatar: string;
  department: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: GoalStatus;
  keyResults?: KeyResult[];
  // SMART 欄位
  specific?: string;
  measurable?: string;
  achievable?: string;
  relevant?: string;
  timeBound?: string;
}

interface Task {
  id: string;
  goalId: string;
  title: string;
  assignee: string;
  assigneeAvatar: string;
  department: string;
  status: TaskStatus;
  progress: number;
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
  completedDate?: Date;
}

interface DepartmentStats {
  department: string;
  totalGoals: number;
  completedGoals: number;
  totalTasks: number;
  completedTasks: number;
  avgProgress: number;
}

@Component({
  standalone: true,
  selector: 'app-goal-task-page',
  templateUrl: './goal-task-page.component.html',
  styleUrl: './goal-task-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalTaskPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('progressChart') progressChartRef!: ElementRef;
  @ViewChild('departmentChart') departmentChartRef!: ElementRef;

  private cdr = inject(ChangeDetectorRef);
  private orgUnitService = inject(OrgUnitService);

  // 子公司→部門級聯篩選
  selectedSubsidiaryId = signal<string>('');
  subsidiaries = this.orgUnitService.subsidiaries;
  filteredDepartments = computed(() => this.orgUnitService.filterDepartments(this.selectedSubsidiaryId()));

  // Charts
  private progressChart: echarts.ECharts | null = null;
  private departmentChart: echarts.ECharts | null = null;
  private resizeHandler = () => this.resizeCharts();

  // Filters
  selectedType = signal<GoalType | 'all'>('all');
  selectedStatus = signal<GoalStatus | 'all'>('all');
  selectedDepartment = signal<string | 'all'>('all');
  searchKeyword = signal('');

  // Data
  loading = signal(true);
  goals = signal<Goal[]>([]);
  tasks = signal<Task[]>([]);
  departmentStats = signal<DepartmentStats[]>([]);

  // View
  viewMode = signal<'grid' | 'list'>('grid');
  selectedGoal = signal<Goal | null>(null);
  showGoalModal = signal(false);

  // Computed
  readonly filteredGoals = computed(() => {
    let result = this.goals();
    
    if (this.selectedType() !== 'all') {
      result = result.filter(g => g.type === this.selectedType());
    }
    if (this.selectedStatus() !== 'all') {
      result = result.filter(g => g.status === this.selectedStatus());
    }
    if (this.selectedDepartment() !== 'all') {
      result = result.filter(g => g.department === this.selectedDepartment());
    }
    if (this.searchKeyword()) {
      const keyword = this.searchKeyword().toLowerCase();
      result = result.filter(g => 
        g.title.toLowerCase().includes(keyword) ||
        g.owner.toLowerCase().includes(keyword)
      );
    }
    return result;
  });

  readonly goalStats = computed(() => {
    const all = this.goals();
    return {
      total: all.length,
      onTrack: all.filter(g => g.status === 'on_track').length,
      atRisk: all.filter(g => g.status === 'at_risk').length,
      behind: all.filter(g => g.status === 'behind').length,
      completed: all.filter(g => g.status === 'completed').length,
      avgProgress: all.length > 0 
        ? Math.round(all.reduce((sum, g) => sum + g.progress, 0) / all.length)
        : 0
    };
  });

  readonly taskStats = computed(() => {
    const all = this.tasks();
    return {
      total: all.length,
      pending: all.filter(t => t.status === 'pending').length,
      inProgress: all.filter(t => t.status === 'in_progress').length,
      completed: all.filter(t => t.status === 'completed').length,
      overdue: all.filter(t => t.status === 'overdue').length
    };
  });

  ngOnInit(): void {
    this.orgUnitService.loadOrgUnits().subscribe();
    this.loadMockData();
  }

  ngAfterViewInit(): void {
    window.addEventListener('resize', this.resizeHandler);
    setTimeout(() => this.initCharts(), 300);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
    this.progressChart?.dispose();
    this.departmentChart?.dispose();
  }

  private loadMockData(): void {
    this.loading.set(true);

    // Mock Goals
    const mockGoals: Goal[] = [
      {
        id: 'G001',
        type: 'okr',
        title: '提升客戶滿意度至 95%',
        description: '透過優化服務流程與品質，達成客戶滿意度目標',
        owner: '林經理',
        ownerAvatar: '林',
        department: '業務部',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
        progress: 78,
        status: 'on_track',
        keyResults: [
          { id: 'KR1', title: '客戶投訴率降低 50%', target: 50, current: 42, unit: '%', weight: 40, progress: 84 },
          { id: 'KR2', title: 'NPS 分數達到 45', target: 45, current: 38, unit: '分', weight: 35, progress: 84 },
          { id: 'KR3', title: '回覆時效縮短至 2 小時', target: 2, current: 2.5, unit: '小時', weight: 25, progress: 80 }
        ]
      },
      {
        id: 'G002',
        type: 'okr',
        title: '完成 ERP 系統升級專案',
        description: '將現有 ERP 系統升級至新版本，提升作業效率',
        owner: '張副理',
        ownerAvatar: '張',
        department: '工程部',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        progress: 45,
        status: 'at_risk',
        keyResults: [
          { id: 'KR1', title: '完成需求分析', target: 100, current: 100, unit: '%', weight: 20, progress: 100 },
          { id: 'KR2', title: '完成系統開發', target: 100, current: 60, unit: '%', weight: 50, progress: 60 },
          { id: 'KR3', title: '完成使用者測試', target: 100, current: 0, unit: '%', weight: 30, progress: 0 }
        ]
      },
      {
        id: 'G003',
        type: 'smart',
        title: 'Q1 營收成長 15%',
        description: '透過新客戶開發與既有客戶深耕，達成營收成長目標',
        owner: '陳總監',
        ownerAvatar: '陳',
        department: '業務部',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-03-31'),
        progress: 92,
        status: 'on_track',
        specific: '第一季營收較去年同期成長 15%',
        measurable: '營收金額從 5000 萬成長至 5750 萬',
        achievable: '透過現有客戶加購與新客戶開發',
        relevant: '符合公司年度成長策略',
        timeBound: '2025 年 Q1 結束前達成'
      },
      {
        id: 'G004',
        type: 'smart',
        title: '降低專案超支率至 5% 以下',
        description: '強化專案成本控管，減少預算超支情況',
        owner: '王經理',
        ownerAvatar: '王',
        department: '專案部',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        progress: 65,
        status: 'on_track',
        specific: '專案預算超支率控制在 5% 以內',
        measurable: '每月統計超支專案數量與金額',
        achievable: '透過定期成本審查與預警機制',
        relevant: '提升公司整體獲利能力',
        timeBound: '2025 年底前達成'
      },
      {
        id: 'G005',
        type: 'okr',
        title: '建立人才培育體系',
        description: '完善公司培訓制度與職涯發展路徑',
        owner: '李主任',
        ownerAvatar: '李',
        department: '人資部',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-06-30'),
        progress: 35,
        status: 'behind',
        keyResults: [
          { id: 'KR1', title: '完成職能模型基準', target: 100, current: 80, unit: '%', weight: 30, progress: 80 },
          { id: 'KR2', title: '設計 20 門內訓課程', target: 20, current: 8, unit: '門', weight: 40, progress: 40 },
          { id: 'KR3', title: '建立導師制度', target: 100, current: 0, unit: '%', weight: 30, progress: 0 }
        ]
      }
    ];

    // Mock Tasks
    const mockTasks: Task[] = [
      { id: 'T001', goalId: 'G001', title: '設計客戶滿意度調查問卷', assignee: '林經理', assigneeAvatar: '林', department: '業務部', status: 'completed', progress: 100, priority: 'high', dueDate: new Date('2025-01-15'), completedDate: new Date('2025-01-14') },
      { id: 'T002', goalId: 'G001', title: '分析客戶投訴原因', assignee: '周專員', assigneeAvatar: '周', department: '業務部', status: 'completed', progress: 100, priority: 'high', dueDate: new Date('2025-01-20') },
      { id: 'T003', goalId: 'G001', title: '優化客服 SOP', assignee: '林經理', assigneeAvatar: '林', department: '業務部', status: 'in_progress', progress: 60, priority: 'medium', dueDate: new Date('2025-02-28') },
      { id: 'T004', goalId: 'G002', title: '完成系統架構設計', assignee: '張副理', assigneeAvatar: '張', department: '工程部', status: 'completed', progress: 100, priority: 'high', dueDate: new Date('2025-02-01') },
      { id: 'T005', goalId: 'G002', title: '開發核心模組', assignee: '黃工程師', assigneeAvatar: '黃', department: '工程部', status: 'in_progress', progress: 70, priority: 'high', dueDate: new Date('2025-03-31') },
      { id: 'T006', goalId: 'G002', title: '資料庫遷移', assignee: '劉工程師', assigneeAvatar: '劉', department: '工程部', status: 'pending', progress: 0, priority: 'medium', dueDate: new Date('2025-04-15') },
      { id: 'T007', goalId: 'G003', title: '開發新客戶 10 家', assignee: '陳總監', assigneeAvatar: '陳', department: '業務部', status: 'in_progress', progress: 80, priority: 'high', dueDate: new Date('2025-03-15') },
      { id: 'T008', goalId: 'G004', title: '建立成本預警機制', assignee: '王經理', assigneeAvatar: '王', department: '專案部', status: 'completed', progress: 100, priority: 'high', dueDate: new Date('2025-02-01') },
      { id: 'T009', goalId: 'G005', title: '完成職能盤點', assignee: '李主任', assigneeAvatar: '李', department: '人資部', status: 'in_progress', progress: 80, priority: 'medium', dueDate: new Date('2025-02-28') },
      { id: 'T010', goalId: 'G005', title: '設計內訓教材', assignee: '吳專員', assigneeAvatar: '吳', department: '人資部', status: 'overdue', progress: 40, priority: 'high', dueDate: new Date('2025-01-31') }
    ];

    // Mock Department Stats
    const mockDeptStats: DepartmentStats[] = [
      { department: '業務部', totalGoals: 2, completedGoals: 0, totalTasks: 4, completedTasks: 2, avgProgress: 85 },
      { department: '工程部', totalGoals: 1, completedGoals: 0, totalTasks: 3, completedTasks: 1, avgProgress: 45 },
      { department: '專案部', totalGoals: 1, completedGoals: 0, totalTasks: 1, completedTasks: 1, avgProgress: 65 },
      { department: '人資部', totalGoals: 1, completedGoals: 0, totalTasks: 2, completedTasks: 0, avgProgress: 35 }
    ];

    this.goals.set(mockGoals);
    this.tasks.set(mockTasks);
    this.departmentStats.set(mockDeptStats);
    this.loading.set(false);
    this.cdr.detectChanges();

    setTimeout(() => this.updateCharts(), 100);
  }

  private initCharts(): void {
    if (this.progressChartRef?.nativeElement) {
      this.progressChart = echarts.init(this.progressChartRef.nativeElement);
    }
    if (this.departmentChartRef?.nativeElement) {
      this.departmentChart = echarts.init(this.departmentChartRef.nativeElement);
    }
    this.updateCharts();
  }

  private updateCharts(): void {
    this.updateProgressChart();
    this.updateDepartmentChart();
  }

  private updateProgressChart(): void {
    if (!this.progressChart) return;

    const stats = this.goalStats();

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 個 ({d}%)'
      },
      series: [{
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{value|${stats.avgProgress}%}\n{label|平均進度}`,
          rich: {
            value: {
              fontSize: 28,
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontWeight: 'bold',
              color: '#464E56',
              lineHeight: 36
            },
            label: {
              fontSize: 12,
              color: '#9CA3AF',
              lineHeight: 20
            }
          }
        },
        emphasis: {
          label: { show: true }
        },
        labelLine: { show: false },
        data: [
          { name: '順利進行', value: stats.onTrack, itemStyle: { color: '#7FB095' } },
          { name: '有風險', value: stats.atRisk, itemStyle: { color: '#E3C088' } },
          { name: '落後', value: stats.behind, itemStyle: { color: '#C77F7F' } },
          { name: '已完成', value: stats.completed, itemStyle: { color: '#7F9CA0' } }
        ]
      }]
    };

    this.progressChart.setOption(option);
  }

  private updateDepartmentChart(): void {
    if (!this.departmentChart) return;

    const stats = this.departmentStats();

    const option: echarts.EChartsOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      grid: {
        left: '3%',
        right: '8%',
        bottom: '5%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%', color: '#6B7280', fontSize: 10 }
      },
      yAxis: {
        type: 'category',
        data: stats.map(s => s.department),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#464E56', fontSize: 12 }
      },
      series: [{
        type: 'bar',
        barWidth: 16,
        data: stats.map(s => ({
          value: s.avgProgress,
          itemStyle: {
            color: s.avgProgress >= 70 ? '#7FB095' : s.avgProgress >= 50 ? '#E3C088' : '#C77F7F',
            borderRadius: 8
          }
        })),
        label: {
          show: true,
          position: 'right',
          formatter: '{c}%',
          color: '#6B7280',
          fontSize: 11
        }
      }]
    };

    this.departmentChart.setOption(option);
  }

  private resizeCharts(): void {
    this.progressChart?.resize();
    this.departmentChart?.resize();
  }

  // View Methods
  selectGoal(goal: Goal): void {
    this.selectedGoal.set(goal);
    this.showGoalModal.set(true);
  }

  closeGoalModal(): void {
    this.showGoalModal.set(false);
    this.selectedGoal.set(null);
  }

  getGoalTasks(goalId: string): Task[] {
    return this.tasks().filter(t => t.goalId === goalId);
  }

  // Status Helpers
  getStatusLabel(status: GoalStatus): string {
    const labels: Record<GoalStatus, string> = {
      on_track: '順利進行',
      at_risk: '有風險',
      behind: '落後',
      completed: '已完成'
    };
    return labels[status];
  }

  getStatusClass(status: GoalStatus): string {
    return `status--${status.replace('_', '-')}`;
  }

  getTaskStatusLabel(status: TaskStatus): string {
    const labels: Record<TaskStatus, string> = {
      pending: '待開始',
      in_progress: '進行中',
      completed: '已完成',
      overdue: '逾期'
    };
    return labels[status];
  }

  getTaskStatusClass(status: TaskStatus): string {
    return `task-status--${status.replace('_', '-')}`;
  }

  getPriorityLabel(priority: 'high' | 'medium' | 'low'): string {
    const labels = { high: '高', medium: '中', low: '低' };
    return labels[priority];
  }

  getPriorityClass(priority: 'high' | 'medium' | 'low'): string {
    return `priority--${priority}`;
  }

  getTypeLabel(type: GoalType): string {
    return type === 'okr' ? 'OKR' : 'SMART';
  }

  getProgressColor(progress: number): string {
    if (progress >= 80) return '#7FB095';
    if (progress >= 50) return '#E3C088';
    return '#C77F7F';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}

