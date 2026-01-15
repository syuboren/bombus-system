import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { TrainingService } from '../../services/training.service';
import { ViewToggleComponent } from '../../../../shared/components/view-toggle/view-toggle.component';
import {
  Course,
  CourseCategory,
  CourseType,
  CourseStatus,
  UpcomingCourse,
  PopularCourse,
  Instructor
} from '../../models/training.model';

@Component({
  selector: 'app-course-management-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HeaderComponent,
    ViewToggleComponent
  ],
  templateUrl: './course-management-page.component.html',
  styleUrl: './course-management-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CourseManagementPageComponent implements OnInit {
  private trainingService = inject(TrainingService);

  // 資料狀態
  courses = signal<Course[]>([]);
  upcomingCourses = signal<UpcomingCourse[]>([]);
  popularCourses = signal<PopularCourse[]>([]);
  instructors = signal<Instructor[]>([]);

  // 篩選
  selectedCategory = signal<CourseCategory | 'all'>('all');
  selectedStatus = signal<CourseStatus | 'all'>('all');
  selectedCourseType = signal<CourseType | 'all'>('all');
  searchKeyword = signal<string>('');
  viewMode = signal<'list' | 'card'>('list');

  // 計算屬性 - 課程篩選
  filteredCourses = computed(() => {
    let result = this.courses();

    if (this.selectedCategory() !== 'all') {
      result = result.filter(c => c.category === this.selectedCategory());
    }

    if (this.selectedStatus() !== 'all') {
      result = result.filter(c => c.status === this.selectedStatus());
    }

    if (this.selectedCourseType() !== 'all') {
      result = result.filter(c => c.type === this.selectedCourseType());
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

  // 待處理事項統計 (模擬數據)
  pendingEnrollments = signal(5);
  todayCourses = signal(2);
  pendingFeedback = signal(8);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.trainingService.getAllCourses().subscribe(data => {
      this.courses.set(data);
    });

    this.trainingService.getUpcomingCourses().subscribe(data => {
      this.upcomingCourses.set(data);
    });

    this.trainingService.getPopularCourses().subscribe(data => {
      this.popularCourses.set(data);
    });

    this.trainingService.getInstructors().subscribe(data => {
      this.instructors.set(data);
    });
  }

  setCategory(category: CourseCategory | 'all'): void {
    this.selectedCategory.set(category);
  }

  setStatus(status: CourseStatus | 'all'): void {
    this.selectedStatus.set(status);
  }

  setCourseType(type: CourseType | 'all'): void {
    this.selectedCourseType.set(type);
  }

  setViewMode(mode: 'list' | 'card'): void {
    this.viewMode.set(mode);
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

  openAddCourseModal(): void {
    // TODO: Implement add course modal
    console.log('Open add course modal');
  }

  openEnrollmentModal(course: Course): void {
    // TODO: Implement enrollment modal
    console.log('Open enrollment modal for:', course.name);
  }
}
