import { Component, ChangeDetectionStrategy, signal, computed, inject, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TrainingService } from '../../services/training.service';
import {
  LearningBranch,
  LearningPathNode,
  LearnerProfile,
  CourseRecommendation,
  CompetencyGap,
  CourseCategory
} from '../../models/training.model';

// 職涯發展路徑選項
interface CareerPathOption {
  id: string;
  type: 'vertical' | 'horizontal' | 'cross-department';
  label: string;
  icon: string;
  targetPosition: string;
  targetGrade: string;
  estimatedTime: string;
  feasibility: number;
  description: string;
}

@Component({
  selector: 'app-learning-map-page',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './learning-map-page.component.html',
  styleUrl: './learning-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LearningMapPageComponent implements OnInit, AfterViewInit {
  private trainingService = inject(TrainingService);

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  // 狀態
  loading = signal(false);
  selectedCategory = signal<CourseCategory | 'all'>('all');
  selectedNode = signal<LearningPathNode | null>(null);
  showRecommendations = signal(false);
  showCareerPathSelector = signal(false);

  // 職涯發展路徑
  careerPaths = signal<CareerPathOption[]>([]);
  selectedCareerPath = signal<CareerPathOption | null>(null);

  // 資料
  learnerProfile = signal<LearnerProfile | null>(null);
  learningBranches = signal<LearningBranch[]>([]);
  recommendations = signal<CourseRecommendation[]>([]);

  // 計算屬性
  filteredBranches = computed(() => {
    const category = this.selectedCategory();
    const branches = this.learningBranches();
    if (category === 'all') return branches;
    return branches.filter(b => b.category === category);
  });

  totalProgress = computed(() => {
    const branches = this.learningBranches();
    if (branches.length === 0) return 0;
    return Math.round(branches.reduce((sum, b) => sum + b.overallProgress, 0) / branches.length);
  });

  highPriorityCount = computed(() => {
    return this.recommendations().filter(r => r.priority === 'high').length;
  });

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    // 初始化動畫效果
    setTimeout(() => this.animateNodes(), 500);
  }

  loadData(): void {
    this.loading.set(true);

    // 載入職涯發展路徑選項
    this.careerPaths.set([
      {
        id: 'vertical',
        type: 'vertical',
        label: '垂直發展',
        icon: 'ri-arrow-up-line',
        targetPosition: '技術經理',
        targetGrade: 'M1',
        estimatedTime: '2-3 年',
        feasibility: 85,
        description: '往管理職發展，帶領團隊達成目標'
      },
      {
        id: 'horizontal',
        type: 'horizontal',
        label: '水平發展',
        icon: 'ri-arrow-right-line',
        targetPosition: '資深架構師',
        targetGrade: 'P4',
        estimatedTime: '1-2 年',
        feasibility: 92,
        description: '深化專業技術能力，成為領域專家'
      },
      {
        id: 'cross-dept',
        type: 'cross-department',
        label: '跨部門發展',
        icon: 'ri-shuffle-line',
        targetPosition: '產品經理',
        targetGrade: 'P3',
        estimatedTime: '2-3 年',
        feasibility: 72,
        description: '跨足產品領域，結合技術與商業思維'
      }
    ]);

    // 預設選擇水平發展並載入對應資料
    const defaultPath = this.careerPaths()[1];
    this.selectedCareerPath.set(defaultPath);
    this.loadDataForCareerPath(defaultPath);

    this.loading.set(false);
  }

  // 保留舊的模擬資料供參考，實際會被 loadDataForCareerPath 覆蓋
  private _legacyProfileData(): void {
    this.learnerProfile.set({
      employeeId: 'EMP001',
      employeeName: '王小明',
      department: '產品開發部',
      position: '資深工程師',
      overallProgress: 68,
      totalGaps: 8,
      highPriorityGaps: 3,
      completedCourses: 12,
      inProgressCourses: 2,
      totalLearningHours: 156,
      competencyGaps: [
        { id: '1', competencyName: '專案管理', category: 'professional', currentLevel: 55, requiredLevel: 80, gapPercentage: 31, priority: 'high' },
        { id: '2', competencyName: '領導力', category: 'management', currentLevel: 40, requiredLevel: 70, gapPercentage: 43, priority: 'high' },
        { id: '3', competencyName: '資訊安全', category: 'general', currentLevel: 60, requiredLevel: 85, gapPercentage: 29, priority: 'medium' },
        { id: '4', competencyName: '數據分析', category: 'professional', currentLevel: 70, requiredLevel: 90, gapPercentage: 22, priority: 'medium' },
        { id: '5', competencyName: '溝通技巧', category: 'general', currentLevel: 75, requiredLevel: 85, gapPercentage: 12, priority: 'low' },
      ]
    });

    // 模擬學習分支資料
    this.learningBranches.set([
      {
        id: 'general',
        category: 'general',
        label: '通識職能',
        icon: 'ri-book-2-line',
        color: '#7C9885',
        totalCourses: 6,
        completedCourses: 4,
        overallProgress: 67,
        nodes: [
          { id: 'g1', courseId: 'C001', courseName: '資訊安全基礎', category: 'general', duration: 4, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['資訊安全'], expectedGrowth: 15, prerequisites: [], position: { x: 150, y: 100 } },
          { id: 'g2', courseId: 'C002', courseName: '個資保護實務', category: 'general', duration: 3, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['資訊安全', '法規遵循'], expectedGrowth: 10, prerequisites: ['g1'], position: { x: 280, y: 60 } },
          { id: 'g3', courseId: 'C003', courseName: '職業安全衛生', category: 'general', duration: 2, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['職安衛生'], expectedGrowth: 8, prerequisites: [], position: { x: 280, y: 140 } },
          { id: 'g4', courseId: 'C004', courseName: '簡報技巧精進', category: 'general', duration: 6, status: 'in-progress', progress: 60, priority: 'medium', targetCompetencies: ['溝通技巧'], expectedGrowth: 12, prerequisites: [], position: { x: 420, y: 80 } },
          { id: 'g5', courseId: 'C005', courseName: '高效時間管理', category: 'general', duration: 4, status: 'available', progress: 0, priority: 'low', targetCompetencies: ['時間管理'], expectedGrowth: 10, prerequisites: [], position: { x: 420, y: 150 } },
          { id: 'g6', courseId: 'C006', courseName: '進階資安認證', category: 'general', duration: 8, status: 'locked', progress: 0, priority: 'high', targetCompetencies: ['資訊安全'], expectedGrowth: 20, prerequisites: ['g1', 'g2'], position: { x: 560, y: 100 } },
        ]
      },
      {
        id: 'professional',
        category: 'professional',
        label: '專業職能',
        icon: 'ri-code-s-slash-line',
        color: '#E3C088',
        totalCourses: 8,
        completedCourses: 5,
        overallProgress: 62,
        nodes: [
          { id: 'p1', courseId: 'C101', courseName: '敏捷開發基礎', category: 'professional', duration: 8, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['專案管理'], expectedGrowth: 18, prerequisites: [], position: { x: 150, y: 280 } },
          { id: 'p2', courseId: 'C102', courseName: 'Scrum Master認證', category: 'professional', duration: 16, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['專案管理', '團隊協作'], expectedGrowth: 25, prerequisites: ['p1'], position: { x: 280, y: 240 } },
          { id: 'p3', courseId: 'C103', courseName: 'Power BI 數據視覺化', category: 'professional', duration: 12, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['數據分析'], expectedGrowth: 15, prerequisites: [], position: { x: 280, y: 320 } },
          { id: 'p4', courseId: 'C104', courseName: '進階專案管理', category: 'professional', duration: 16, status: 'in-progress', progress: 35, priority: 'high', targetCompetencies: ['專案管理'], expectedGrowth: 22, prerequisites: ['p2'], position: { x: 420, y: 260 } },
          { id: 'p5', courseId: 'C105', courseName: 'Python 數據分析', category: 'professional', duration: 20, status: 'available', progress: 0, priority: 'medium', targetCompetencies: ['數據分析', '程式設計'], expectedGrowth: 18, prerequisites: ['p3'], position: { x: 420, y: 340 } },
          { id: 'p6', courseId: 'C106', courseName: 'PMP 認證培訓', category: 'professional', duration: 35, status: 'locked', progress: 0, priority: 'high', targetCompetencies: ['專案管理'], expectedGrowth: 30, prerequisites: ['p4'], position: { x: 560, y: 260 } },
          { id: 'p7', courseId: 'C107', courseName: '機器學習入門', category: 'professional', duration: 24, status: 'locked', progress: 0, priority: 'medium', targetCompetencies: ['數據分析', 'AI應用'], expectedGrowth: 20, prerequisites: ['p5'], position: { x: 560, y: 340 } },
          { id: 'p8', courseId: 'C108', courseName: '系統架構設計', category: 'professional', duration: 16, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['系統設計'], expectedGrowth: 15, prerequisites: [], position: { x: 150, y: 360 } },
        ]
      },
      {
        id: 'management',
        category: 'management',
        label: '管理職能',
        icon: 'ri-team-line',
        color: '#9B7C8E',
        totalCourses: 5,
        completedCourses: 2,
        overallProgress: 40,
        nodes: [
          { id: 'm1', courseId: 'C201', courseName: '新任主管培訓', category: 'management', duration: 8, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['領導力', '團隊管理'], expectedGrowth: 20, prerequisites: [], position: { x: 150, y: 460 } },
          { id: 'm2', courseId: 'C202', courseName: '績效面談技巧', category: 'management', duration: 6, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['績效管理'], expectedGrowth: 12, prerequisites: ['m1'], position: { x: 280, y: 420 } },
          { id: 'm3', courseId: 'C203', courseName: '領導力工作坊', category: 'management', duration: 8, status: 'available', progress: 0, priority: 'high', targetCompetencies: ['領導力'], expectedGrowth: 25, prerequisites: ['m1'], position: { x: 280, y: 500 } },
          { id: 'm4', courseId: 'C204', courseName: '策略思維培養', category: 'management', duration: 12, status: 'locked', progress: 0, priority: 'high', targetCompetencies: ['策略思維', '決策能力'], expectedGrowth: 22, prerequisites: ['m2', 'm3'], position: { x: 420, y: 460 } },
          { id: 'm5', courseId: 'C205', courseName: '跨部門協作實戰', category: 'management', duration: 6, status: 'locked', progress: 0, priority: 'medium', targetCompetencies: ['跨部門協作'], expectedGrowth: 15, prerequisites: ['m4'], position: { x: 560, y: 460 } },
        ]
      }
    ]);

    // 模擬推薦課程
    this.recommendations.set([
      { id: 'r1', courseId: 'C203', courseName: '領導力工作坊', category: 'management', type: 'Off-JT', duration: 8, instructor: '張經理', targetCompetency: '領導力', expectedGrowth: 25, priority: 'high', matchScore: 95, nextSessionDate: new Date('2026-01-15') },
      { id: 'r2', courseId: 'C104', courseName: '進階專案管理', category: 'professional', type: 'Off-JT', duration: 16, instructor: '李顧問', targetCompetency: '專案管理', expectedGrowth: 22, priority: 'high', matchScore: 92, nextSessionDate: new Date('2026-01-20'), certifications: ['PMP預備'] },
      { id: 'r3', courseId: 'C006', courseName: '進階資安認證', category: 'general', type: 'Off-JT', duration: 8, instructor: '王講師', targetCompetency: '資訊安全', expectedGrowth: 20, priority: 'high', matchScore: 88 },
      { id: 'r4', courseId: 'C105', courseName: 'Python 數據分析', category: 'professional', type: 'SD', duration: 20, instructor: '陳講師', targetCompetency: '數據分析', expectedGrowth: 18, priority: 'medium', matchScore: 85 },
      { id: 'r5', courseId: 'C005', courseName: '高效時間管理', category: 'general', type: 'Off-JT', duration: 4, instructor: '外部講師', targetCompetency: '時間管理', expectedGrowth: 10, priority: 'low', matchScore: 72 },
    ]);

    this.loading.set(false);
  }

  animateNodes(): void {
    // 可以在這裡添加節點進場動畫
  }

  selectCategory(category: CourseCategory | 'all'): void {
    this.selectedCategory.set(category);
  }

  selectNode(node: LearningPathNode): void {
    this.selectedNode.set(node);
  }

  closeNodeDetail(): void {
    this.selectedNode.set(null);
  }

  toggleRecommendations(): void {
    this.showRecommendations.update(v => !v);
  }

  getNodeStatusClass(status: string): string {
    return `node--${status}`;
  }

  getPriorityClass(priority: string): string {
    return `priority--${priority}`;
  }

  getCategoryClass(category: CourseCategory): string {
    return `category--${category}`;
  }

  getCategoryLabel(category: CourseCategory): string {
    const labels: Record<CourseCategory, string> = {
      'core': '核心職能',
      'general': '通識職能',
      'professional': '專業職能',
      'management': '管理職能'
    };
    return labels[category];
  }

  getCategoryIcon(category: CourseCategory): string {
    const icons: Record<CourseCategory, string> = {
      'core': 'ri-focus-3-line',
      'general': 'ri-book-2-line',
      'professional': 'ri-code-s-slash-line',
      'management': 'ri-team-line'
    };
    return icons[category];
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'high': '高優先',
      'medium': '中優先',
      'low': '低優先'
    };
    return labels[priority] || priority;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'locked': '未解鎖',
      'available': '可學習',
      'in-progress': '進行中',
      'completed': '已完成'
    };
    return labels[status] || status;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  enrollCourse(courseId: string): void {
    console.log('報名課程:', courseId);
    // 實作報名邏輯
  }

  openEmployeeSelector(): void {
    console.log('開啟人員選擇器');
    // 實作人員選擇邏輯
  }

  toggleCareerPathSelector(): void {
    this.showCareerPathSelector.update(v => !v);
  }

  selectCareerPath(path: CareerPathOption): void {
    this.selectedCareerPath.set(path);
    this.showCareerPathSelector.set(false);

    // 清空資料觸發動畫重播
    this.learningBranches.set([]);
    this.recommendations.set([]);

    // 延遲載入新資料以觸發動畫
    setTimeout(() => {
      this.loadDataForCareerPath(path);
    }, 100);
  }

  loadDataForCareerPath(path: CareerPathOption): void {
    // 根據職涯路徑載入不同的資料
    if (path.type === 'vertical') {
      this.loadVerticalPathData();
    } else if (path.type === 'horizontal') {
      this.loadHorizontalPathData();
    } else {
      this.loadCrossDepartmentPathData();
    }
  }

  // 垂直發展路徑資料 - 強調管理職能
  loadVerticalPathData(): void {
    this.learnerProfile.set({
      employeeId: 'EMP001',
      employeeName: '王小明',
      department: '產品開發部',
      position: '資深工程師',
      overallProgress: 52,
      totalGaps: 10,
      highPriorityGaps: 5,
      completedCourses: 8,
      inProgressCourses: 3,
      totalLearningHours: 120,
      competencyGaps: [
        { id: '1', competencyName: '領導力', category: 'management', currentLevel: 35, requiredLevel: 80, gapPercentage: 56, priority: 'high' },
        { id: '2', competencyName: '團隊管理', category: 'management', currentLevel: 40, requiredLevel: 75, gapPercentage: 47, priority: 'high' },
        { id: '3', competencyName: '績效管理', category: 'management', currentLevel: 30, requiredLevel: 70, gapPercentage: 57, priority: 'high' },
        { id: '4', competencyName: '策略思維', category: 'management', currentLevel: 45, requiredLevel: 80, gapPercentage: 44, priority: 'high' },
        { id: '5', competencyName: '跨部門協作', category: 'management', currentLevel: 50, requiredLevel: 75, gapPercentage: 33, priority: 'high' },
        { id: '6', competencyName: '專案管理', category: 'professional', currentLevel: 70, requiredLevel: 85, gapPercentage: 18, priority: 'medium' },
      ]
    });

    this.learningBranches.set([
      {
        id: 'management',
        category: 'management',
        label: '管理職能',
        icon: 'ri-team-line',
        color: '#9B7C8E',
        totalCourses: 8,
        completedCourses: 2,
        overallProgress: 25,
        nodes: [
          { id: 'm1', courseId: 'C201', courseName: '新任主管培訓', category: 'management', duration: 8, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['領導力', '團隊管理'], expectedGrowth: 20, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'm2', courseId: 'C202', courseName: '績效面談技巧', category: 'management', duration: 6, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['績效管理'], expectedGrowth: 15, prerequisites: ['m1'], position: { x: 0, y: 0 } },
          { id: 'm3', courseId: 'C203', courseName: '領導力工作坊', category: 'management', duration: 16, status: 'in-progress', progress: 45, priority: 'high', targetCompetencies: ['領導力'], expectedGrowth: 30, prerequisites: ['m1'], position: { x: 0, y: 0 } },
          { id: 'm4', courseId: 'C204', courseName: '團隊激勵與溝通', category: 'management', duration: 8, status: 'available', progress: 0, priority: 'high', targetCompetencies: ['團隊管理'], expectedGrowth: 20, prerequisites: ['m2'], position: { x: 0, y: 0 } },
          { id: 'm5', courseId: 'C205', courseName: '策略思維培養', category: 'management', duration: 12, status: 'available', progress: 0, priority: 'high', targetCompetencies: ['策略思維', '決策能力'], expectedGrowth: 25, prerequisites: ['m3'], position: { x: 0, y: 0 } },
          { id: 'm6', courseId: 'C206', courseName: '變革管理實戰', category: 'management', duration: 10, status: 'locked', progress: 0, priority: 'medium', targetCompetencies: ['變革管理'], expectedGrowth: 18, prerequisites: ['m5'], position: { x: 0, y: 0 } },
          { id: 'm7', courseId: 'C207', courseName: '高階主管培訓', category: 'management', duration: 24, status: 'locked', progress: 0, priority: 'high', targetCompetencies: ['領導力', '策略思維'], expectedGrowth: 35, prerequisites: ['m5', 'm6'], position: { x: 0, y: 0 } },
          { id: 'm8', courseId: 'C208', courseName: '跨部門協作實戰', category: 'management', duration: 6, status: 'locked', progress: 0, priority: 'medium', targetCompetencies: ['跨部門協作'], expectedGrowth: 15, prerequisites: ['m4'], position: { x: 0, y: 0 } },
        ]
      },
      {
        id: 'professional',
        category: 'professional',
        label: '專業職能',
        icon: 'ri-code-s-slash-line',
        color: '#E3C088',
        totalCourses: 4,
        completedCourses: 3,
        overallProgress: 75,
        nodes: [
          { id: 'p1', courseId: 'C101', courseName: '進階專案管理', category: 'professional', duration: 16, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['專案管理'], expectedGrowth: 20, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p2', courseId: 'C102', courseName: 'PMP 認證培訓', category: 'professional', duration: 35, status: 'in-progress', progress: 60, priority: 'medium', targetCompetencies: ['專案管理'], expectedGrowth: 25, prerequisites: ['p1'], position: { x: 0, y: 0 } },
          { id: 'p3', courseId: 'C103', courseName: '技術架構設計', category: 'professional', duration: 20, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['系統設計'], expectedGrowth: 15, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p4', courseId: 'C104', courseName: '技術團隊管理', category: 'professional', duration: 12, status: 'available', progress: 0, priority: 'medium', targetCompetencies: ['團隊管理', '技術領導'], expectedGrowth: 20, prerequisites: ['p3'], position: { x: 0, y: 0 } },
        ]
      },
      {
        id: 'general',
        category: 'general',
        label: '通識職能',
        icon: 'ri-book-2-line',
        color: '#7C9885',
        totalCourses: 3,
        completedCourses: 2,
        overallProgress: 67,
        nodes: [
          { id: 'g1', courseId: 'C001', courseName: '商業簡報技巧', category: 'general', duration: 6, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['溝通技巧'], expectedGrowth: 12, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g2', courseId: 'C002', courseName: '衝突管理', category: 'general', duration: 4, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['溝通技巧'], expectedGrowth: 10, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g3', courseId: 'C003', courseName: '高效會議主持', category: 'general', duration: 4, status: 'available', progress: 0, priority: 'low', targetCompetencies: ['溝通技巧'], expectedGrowth: 8, prerequisites: ['g1'], position: { x: 0, y: 0 } },
        ]
      }
    ]);

    this.recommendations.set([
      { id: 'r1', courseId: 'C203', courseName: '領導力工作坊', category: 'management', type: 'Off-JT', duration: 16, instructor: '張經理', targetCompetency: '領導力', expectedGrowth: 30, priority: 'high', matchScore: 98, nextSessionDate: new Date('2026-01-15') },
      { id: 'r2', courseId: 'C205', courseName: '策略思維培養', category: 'management', type: 'Off-JT', duration: 12, instructor: '王顧問', targetCompetency: '策略思維', expectedGrowth: 25, priority: 'high', matchScore: 95 },
      { id: 'r3', courseId: 'C204', courseName: '團隊激勵與溝通', category: 'management', type: 'Off-JT', duration: 8, instructor: '李講師', targetCompetency: '團隊管理', expectedGrowth: 20, priority: 'high', matchScore: 92, nextSessionDate: new Date('2026-02-01') },
      { id: 'r4', courseId: 'C104', courseName: '技術團隊管理', category: 'professional', type: 'Off-JT', duration: 12, instructor: '陳講師', targetCompetency: '技術領導', expectedGrowth: 20, priority: 'medium', matchScore: 85 },
    ]);
  }

  // 水平發展路徑資料 - 強調專業職能
  loadHorizontalPathData(): void {
    this.learnerProfile.set({
      employeeId: 'EMP001',
      employeeName: '王小明',
      department: '產品開發部',
      position: '資深工程師',
      overallProgress: 68,
      totalGaps: 6,
      highPriorityGaps: 2,
      completedCourses: 12,
      inProgressCourses: 2,
      totalLearningHours: 156,
      competencyGaps: [
        { id: '1', competencyName: '系統架構', category: 'professional', currentLevel: 65, requiredLevel: 90, gapPercentage: 28, priority: 'high' },
        { id: '2', competencyName: '雲端技術', category: 'professional', currentLevel: 55, requiredLevel: 85, gapPercentage: 35, priority: 'high' },
        { id: '3', competencyName: '技術文件撰寫', category: 'professional', currentLevel: 70, requiredLevel: 85, gapPercentage: 18, priority: 'medium' },
        { id: '4', competencyName: '程式碼審查', category: 'professional', currentLevel: 75, requiredLevel: 90, gapPercentage: 17, priority: 'medium' },
        { id: '5', competencyName: '技術簡報', category: 'general', currentLevel: 60, requiredLevel: 75, gapPercentage: 20, priority: 'low' },
      ]
    });

    this.learningBranches.set([
      {
        id: 'professional',
        category: 'professional',
        label: '專業職能',
        icon: 'ri-code-s-slash-line',
        color: '#E3C088',
        totalCourses: 10,
        completedCourses: 6,
        overallProgress: 60,
        nodes: [
          { id: 'p1', courseId: 'C101', courseName: '系統架構設計', category: 'professional', duration: 20, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['系統架構'], expectedGrowth: 20, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p2', courseId: 'C102', courseName: '微服務架構實戰', category: 'professional', duration: 24, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['系統架構', '雲端技術'], expectedGrowth: 25, prerequisites: ['p1'], position: { x: 0, y: 0 } },
          { id: 'p3', courseId: 'C103', courseName: 'AWS 雲端認證', category: 'professional', duration: 40, status: 'in-progress', progress: 45, priority: 'high', targetCompetencies: ['雲端技術'], expectedGrowth: 30, prerequisites: ['p2'], position: { x: 0, y: 0 } },
          { id: 'p4', courseId: 'C104', courseName: 'Kubernetes 進階', category: 'professional', duration: 16, status: 'available', progress: 0, priority: 'high', targetCompetencies: ['雲端技術', '容器技術'], expectedGrowth: 22, prerequisites: ['p3'], position: { x: 0, y: 0 } },
          { id: 'p5', courseId: 'C105', courseName: '效能優化實戰', category: 'professional', duration: 12, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['系統效能'], expectedGrowth: 15, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p6', courseId: 'C106', courseName: '技術文件撰寫', category: 'professional', duration: 8, status: 'in-progress', progress: 70, priority: 'medium', targetCompetencies: ['技術文件撰寫'], expectedGrowth: 12, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p7', courseId: 'C107', courseName: 'Code Review 最佳實踐', category: 'professional', duration: 6, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['程式碼審查'], expectedGrowth: 10, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p8', courseId: 'C108', courseName: '技術架構師認證', category: 'professional', duration: 60, status: 'locked', progress: 0, priority: 'high', targetCompetencies: ['系統架構', '技術領導'], expectedGrowth: 35, prerequisites: ['p3', 'p4'], position: { x: 0, y: 0 } },
          { id: 'p9', courseId: 'C109', courseName: 'DevOps 實踐', category: 'professional', duration: 20, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['DevOps'], expectedGrowth: 18, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p10', courseId: 'C110', courseName: '資安防護實戰', category: 'professional', duration: 12, status: 'available', progress: 0, priority: 'medium', targetCompetencies: ['資訊安全'], expectedGrowth: 15, prerequisites: ['p9'], position: { x: 0, y: 0 } },
        ]
      },
      {
        id: 'general',
        category: 'general',
        label: '通識職能',
        icon: 'ri-book-2-line',
        color: '#7C9885',
        totalCourses: 4,
        completedCourses: 3,
        overallProgress: 75,
        nodes: [
          { id: 'g1', courseId: 'C001', courseName: '技術簡報技巧', category: 'general', duration: 6, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['技術簡報'], expectedGrowth: 12, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g2', courseId: 'C002', courseName: '英文技術溝通', category: 'general', duration: 20, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['英文溝通'], expectedGrowth: 15, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g3', courseId: 'C003', courseName: '知識分享與培訓', category: 'general', duration: 8, status: 'available', progress: 0, priority: 'low', targetCompetencies: ['知識傳承'], expectedGrowth: 10, prerequisites: ['g1'], position: { x: 0, y: 0 } },
          { id: 'g4', courseId: 'C004', courseName: '技術社群經營', category: 'general', duration: 6, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['影響力'], expectedGrowth: 8, prerequisites: [], position: { x: 0, y: 0 } },
        ]
      },
      {
        id: 'management',
        category: 'management',
        label: '管理職能',
        icon: 'ri-team-line',
        color: '#9B7C8E',
        totalCourses: 2,
        completedCourses: 1,
        overallProgress: 50,
        nodes: [
          { id: 'm1', courseId: 'C201', courseName: '技術導師培訓', category: 'management', duration: 8, status: 'completed', progress: 100, priority: 'low', targetCompetencies: ['指導能力'], expectedGrowth: 12, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'm2', courseId: 'C202', courseName: '技術團隊協作', category: 'management', duration: 6, status: 'available', progress: 0, priority: 'low', targetCompetencies: ['團隊協作'], expectedGrowth: 10, prerequisites: ['m1'], position: { x: 0, y: 0 } },
        ]
      }
    ]);

    this.recommendations.set([
      { id: 'r1', courseId: 'C104', courseName: 'Kubernetes 進階', category: 'professional', type: 'Off-JT', duration: 16, instructor: '陳講師', targetCompetency: '雲端技術', expectedGrowth: 22, priority: 'high', matchScore: 96, nextSessionDate: new Date('2026-01-20') },
      { id: 'r2', courseId: 'C108', courseName: '技術架構師認證', category: 'professional', type: 'Off-JT', duration: 60, instructor: '外部顧問', targetCompetency: '系統架構', expectedGrowth: 35, priority: 'high', matchScore: 94, certifications: ['架構師認證'] },
      { id: 'r3', courseId: 'C110', courseName: '資安防護實戰', category: 'professional', type: 'Off-JT', duration: 12, instructor: '王講師', targetCompetency: '資訊安全', expectedGrowth: 15, priority: 'medium', matchScore: 88 },
      { id: 'r4', courseId: 'C003', courseName: '知識分享與培訓', category: 'general', type: 'Off-JT', duration: 8, instructor: 'HR 團隊', targetCompetency: '知識傳承', expectedGrowth: 10, priority: 'low', matchScore: 75 },
    ]);
  }

  // 跨部門發展路徑資料 - 強調通識職能與跨領域
  loadCrossDepartmentPathData(): void {
    this.learnerProfile.set({
      employeeId: 'EMP001',
      employeeName: '王小明',
      department: '產品開發部',
      position: '資深工程師',
      overallProgress: 45,
      totalGaps: 12,
      highPriorityGaps: 4,
      completedCourses: 6,
      inProgressCourses: 4,
      totalLearningHours: 98,
      competencyGaps: [
        { id: '1', competencyName: '產品思維', category: 'professional', currentLevel: 30, requiredLevel: 80, gapPercentage: 63, priority: 'high' },
        { id: '2', competencyName: '使用者研究', category: 'professional', currentLevel: 25, requiredLevel: 75, gapPercentage: 67, priority: 'high' },
        { id: '3', competencyName: '商業分析', category: 'professional', currentLevel: 35, requiredLevel: 70, gapPercentage: 50, priority: 'high' },
        { id: '4', competencyName: '跨部門溝通', category: 'general', currentLevel: 50, requiredLevel: 85, gapPercentage: 41, priority: 'high' },
        { id: '5', competencyName: '簡報說服力', category: 'general', currentLevel: 55, requiredLevel: 80, gapPercentage: 31, priority: 'medium' },
        { id: '6', competencyName: '數據分析', category: 'professional', currentLevel: 60, requiredLevel: 80, gapPercentage: 25, priority: 'medium' },
      ]
    });

    this.learningBranches.set([
      {
        id: 'general',
        category: 'general',
        label: '通識職能',
        icon: 'ri-book-2-line',
        color: '#7C9885',
        totalCourses: 8,
        completedCourses: 3,
        overallProgress: 38,
        nodes: [
          { id: 'g1', courseId: 'C001', courseName: '跨部門溝通技巧', category: 'general', duration: 8, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['跨部門溝通'], expectedGrowth: 20, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g2', courseId: 'C002', courseName: '說服力簡報', category: 'general', duration: 6, status: 'in-progress', progress: 55, priority: 'high', targetCompetencies: ['簡報說服力'], expectedGrowth: 18, prerequisites: ['g1'], position: { x: 0, y: 0 } },
          { id: 'g3', courseId: 'C003', courseName: '利害關係人管理', category: 'general', duration: 8, status: 'available', progress: 0, priority: 'high', targetCompetencies: ['利害關係人管理'], expectedGrowth: 22, prerequisites: ['g1'], position: { x: 0, y: 0 } },
          { id: 'g4', courseId: 'C004', courseName: '設計思考工作坊', category: 'general', duration: 16, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['創新思維'], expectedGrowth: 15, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g5', courseId: 'C005', courseName: '敏捷思維入門', category: 'general', duration: 8, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['敏捷思維'], expectedGrowth: 12, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g6', courseId: 'C006', courseName: '商業英文溝通', category: 'general', duration: 20, status: 'in-progress', progress: 30, priority: 'medium', targetCompetencies: ['英文溝通'], expectedGrowth: 15, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'g7', courseId: 'C007', courseName: '談判技巧', category: 'general', duration: 8, status: 'locked', progress: 0, priority: 'medium', targetCompetencies: ['談判能力'], expectedGrowth: 18, prerequisites: ['g2', 'g3'], position: { x: 0, y: 0 } },
          { id: 'g8', courseId: 'C008', courseName: '問題解決方法論', category: 'general', duration: 6, status: 'available', progress: 0, priority: 'low', targetCompetencies: ['問題解決'], expectedGrowth: 10, prerequisites: ['g4'], position: { x: 0, y: 0 } },
        ]
      },
      {
        id: 'professional',
        category: 'professional',
        label: '專業職能',
        icon: 'ri-code-s-slash-line',
        color: '#E3C088',
        totalCourses: 7,
        completedCourses: 2,
        overallProgress: 29,
        nodes: [
          { id: 'p1', courseId: 'C101', courseName: '產品管理基礎', category: 'professional', duration: 16, status: 'completed', progress: 100, priority: 'high', targetCompetencies: ['產品思維'], expectedGrowth: 25, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p2', courseId: 'C102', courseName: '使用者研究方法', category: 'professional', duration: 12, status: 'in-progress', progress: 40, priority: 'high', targetCompetencies: ['使用者研究'], expectedGrowth: 28, prerequisites: ['p1'], position: { x: 0, y: 0 } },
          { id: 'p3', courseId: 'C103', courseName: '商業分析入門', category: 'professional', duration: 20, status: 'available', progress: 0, priority: 'high', targetCompetencies: ['商業分析'], expectedGrowth: 30, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p4', courseId: 'C104', courseName: 'SQL 數據分析', category: 'professional', duration: 12, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['數據分析'], expectedGrowth: 15, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'p5', courseId: 'C105', courseName: 'Power BI 視覺化', category: 'professional', duration: 10, status: 'available', progress: 0, priority: 'medium', targetCompetencies: ['數據分析'], expectedGrowth: 12, prerequisites: ['p4'], position: { x: 0, y: 0 } },
          { id: 'p6', courseId: 'C106', courseName: '產品路線圖規劃', category: 'professional', duration: 8, status: 'locked', progress: 0, priority: 'high', targetCompetencies: ['產品思維', '策略規劃'], expectedGrowth: 22, prerequisites: ['p2', 'p3'], position: { x: 0, y: 0 } },
          { id: 'p7', courseId: 'C107', courseName: 'AARRR 指標分析', category: 'professional', duration: 8, status: 'locked', progress: 0, priority: 'medium', targetCompetencies: ['數據分析', '產品思維'], expectedGrowth: 18, prerequisites: ['p5', 'p6'], position: { x: 0, y: 0 } },
        ]
      },
      {
        id: 'management',
        category: 'management',
        label: '管理職能',
        icon: 'ri-team-line',
        color: '#9B7C8E',
        totalCourses: 3,
        completedCourses: 1,
        overallProgress: 33,
        nodes: [
          { id: 'm1', courseId: 'C201', courseName: '專案協調技巧', category: 'management', duration: 8, status: 'completed', progress: 100, priority: 'medium', targetCompetencies: ['專案協調'], expectedGrowth: 12, prerequisites: [], position: { x: 0, y: 0 } },
          { id: 'm2', courseId: 'C202', courseName: '虛擬團隊管理', category: 'management', duration: 6, status: 'in-progress', progress: 25, priority: 'medium', targetCompetencies: ['團隊協作'], expectedGrowth: 15, prerequisites: ['m1'], position: { x: 0, y: 0 } },
          { id: 'm3', courseId: 'C203', courseName: '敏捷產品負責人', category: 'management', duration: 16, status: 'locked', progress: 0, priority: 'high', targetCompetencies: ['產品負責人', '敏捷管理'], expectedGrowth: 25, prerequisites: ['m2'], position: { x: 0, y: 0 } },
        ]
      }
    ]);

    this.recommendations.set([
      { id: 'r1', courseId: 'C103', courseName: '商業分析入門', category: 'professional', type: 'Off-JT', duration: 20, instructor: '外部顧問', targetCompetency: '商業分析', expectedGrowth: 30, priority: 'high', matchScore: 97, nextSessionDate: new Date('2026-01-25') },
      { id: 'r2', courseId: 'C003', courseName: '利害關係人管理', category: 'general', type: 'Off-JT', duration: 8, instructor: '李講師', targetCompetency: '利害關係人管理', expectedGrowth: 22, priority: 'high', matchScore: 94 },
      { id: 'r3', courseId: 'C102', courseName: '使用者研究方法', category: 'professional', type: 'Off-JT', duration: 12, instructor: 'UX 團隊', targetCompetency: '使用者研究', expectedGrowth: 28, priority: 'high', matchScore: 92 },
      { id: 'r4', courseId: 'C002', courseName: '說服力簡報', category: 'general', type: 'Off-JT', duration: 6, instructor: '張講師', targetCompetency: '簡報說服力', expectedGrowth: 18, priority: 'high', matchScore: 89 },
      { id: 'r5', courseId: 'C203', courseName: '敏捷產品負責人', category: 'management', type: 'Off-JT', duration: 16, instructor: '外部顧問', targetCompetency: '產品負責人', expectedGrowth: 25, priority: 'high', matchScore: 85, certifications: ['CSPO'] },
    ]);
  }

  getCareerPathTypeClass(type: string): string {
    return `path-type--${type}`;
  }

  // 獲取所有連線資料
  getConnections(): { from: LearningPathNode; to: LearningPathNode; branch: LearningBranch }[] {
    const connections: { from: LearningPathNode; to: LearningPathNode; branch: LearningBranch }[] = [];

    this.filteredBranches().forEach(branch => {
      branch.nodes.forEach(node => {
        node.prerequisites.forEach(prereqId => {
          const fromNode = branch.nodes.find(n => n.id === prereqId);
          if (fromNode) {
            connections.push({ from: fromNode, to: node, branch });
          }
        });
      });
    });

    return connections;
  }
}

