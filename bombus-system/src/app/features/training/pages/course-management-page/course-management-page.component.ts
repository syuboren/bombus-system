import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TrainingService } from '../../services/training.service';
import {
  Course,
  CourseCategory,
  CourseStatus,
  CourseTypeStats,
  TrainingKPI,
  TrainingEffectiveness,
  UpcomingCourse,
  PopularCourse
} from '../../models/training.model';

@Component({
  selector: 'app-course-management-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    HeaderComponent
  ],
  templateUrl: './course-management-page.component.html',
  styleUrl: './course-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementPageComponent implements OnInit {
  private trainingService = inject(TrainingService);

  // 狀態
  courses = signal<Course[]>([]);
  trainingKPI = signal<TrainingKPI | null>(null);
  courseTypeStats = signal<CourseTypeStats[]>([]);
  trainingEffectiveness = signal<TrainingEffectiveness[]>([]);
  upcomingCourses = signal<UpcomingCourse[]>([]);
  popularCourses = signal<PopularCourse[]>([]);

  // 篩選
  selectedCategory = signal<CourseCategory | 'all'>('all');
  selectedStatus = signal<CourseStatus | 'all'>('all');
  searchKeyword = signal<string>('');

  // 計算屬性
  filteredCourses = computed(() => {
    let result = this.courses();

    if (this.selectedCategory() !== 'all') {
      result = result.filter(c => c.category === this.selectedCategory());
    }

    if (this.selectedStatus() !== 'all') {
      result = result.filter(c => c.status === this.selectedStatus());
    }

    if (this.searchKeyword()) {
      const keyword = this.searchKeyword().toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(keyword) ||
        c.instructor.toLowerCase().includes(keyword)
      );
    }

    return result;
  });

  // 統計
  totalCourses = computed(() => this.courses().length);
  upcomingCount = computed(() => this.courses().filter(c => c.status === 'upcoming').length);
  ongoingCount = computed(() => this.courses().filter(c => c.status === 'ongoing').length);
  completedCount = computed(() => this.courses().filter(c => c.status === 'completed').length);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.trainingService.getAllCourses().subscribe(data => {
      this.courses.set(data);
    });

    this.trainingService.getTrainingKPI().subscribe(data => {
      this.trainingKPI.set(data);
    });

    this.trainingService.getCourseTypeStats().subscribe(data => {
      this.courseTypeStats.set(data);
    });

    this.trainingService.getTrainingEffectiveness().subscribe(data => {
      this.trainingEffectiveness.set(data);
    });

    this.trainingService.getUpcomingCourses().subscribe(data => {
      this.upcomingCourses.set(data);
    });

    this.trainingService.getPopularCourses().subscribe(data => {
      this.popularCourses.set(data);
    });
  }

  setCategory(category: CourseCategory | 'all'): void {
    this.selectedCategory.set(category);
  }

  setStatus(status: CourseStatus | 'all'): void {
    this.selectedStatus.set(status);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchKeyword.set(input.value);
  }

  getCategoryLabel(category: CourseCategory): string {
    return this.trainingService.getCategoryLabel(category);
  }

  getCategoryColor(category: CourseCategory): string {
    return this.trainingService.getCategoryColor(category);
  }

  getStatusLabel(status: CourseStatus): string {
    const labels: Record<CourseStatus, string> = {
      upcoming: '即將開課',
      ongoing: '進行中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return labels[status];
  }

  getStatusClass(status: CourseStatus): string {
    const classes: Record<CourseStatus, string> = {
      upcoming: 'status--upcoming',
      ongoing: 'status--ongoing',
      completed: 'status--completed',
      cancelled: 'status--cancelled'
    };
    return classes[status];
  }

  getEffectivenessClass(status: string): string {
    return `effectiveness--${status}`;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatFullDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatBudget(amount: number): string {
    return (amount / 10000).toFixed(0) + ' 萬';
  }
}

