import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CompetencyService } from '../../services/competency.service';
import {
  CompetencyAssessment,
  AssessmentSchedule,
  AssessmentStatus
} from '../../models/competency.model';

@Component({
  selector: 'app-assessment-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './assessment-page.component.html',
  styleUrl: './assessment-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AssessmentPageComponent implements OnInit {
  private competencyService = inject(CompetencyService);

  // Page Info
  readonly pageTitle = '職能評估系統';
  readonly breadcrumbs = ['首頁', '職能管理'];

  // Data signals
  schedules = signal<AssessmentSchedule[]>([]);
  assessments = signal<CompetencyAssessment[]>([]);
  loading = signal(true);

  // Active tab
  activeTab = signal<'schedules' | 'assessments'>('schedules');

  // Filter
  selectedStatus = signal<string>('');
  selectedDepartment = signal<string>('');

  // Stats computed from data
  stats = signal({
    totalEmployees: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    completionRate: 0
  });

  readonly departmentOptions = [
    { value: '', label: '全部部門' },
    { value: '研發部', label: '研發部' },
    { value: '業務部', label: '業務部' },
    { value: '行銷部', label: '行銷部' },
    { value: '人資部', label: '人資部' },
    { value: '財務部', label: '財務部' }
  ];

  readonly statusOptions = [
    { value: '', label: '全部狀態' },
    { value: 'not_started', label: '未開始' },
    { value: 'self_assessment', label: '自評中' },
    { value: 'manager_review', label: '主管審核中' },
    { value: 'completed', label: '已完成' }
  ];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.competencyService.getAssessmentSchedules().subscribe(data => {
      this.schedules.set(data);
    });

    this.competencyService.getAssessments().subscribe(data => {
      this.assessments.set(data);
      this.calculateStats(data);
      this.loading.set(false);
    });
  }

  private calculateStats(assessments: CompetencyAssessment[]): void {
    const total = assessments.length;
    const completed = assessments.filter(a => a.status === 'completed').length;
    const inProgress = assessments.filter(a => a.status === 'self_assessment' || a.status === 'manager_review').length;
    const notStarted = assessments.filter(a => a.status === 'not_started').length;

    this.stats.set({
      totalEmployees: total,
      completed,
      inProgress,
      notStarted,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
    });
  }

  setActiveTab(tab: 'schedules' | 'assessments'): void {
    this.activeTab.set(tab);
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value);
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartment.set(value);
  }

  getFilteredAssessments(): CompetencyAssessment[] {
    let result = this.assessments();

    if (this.selectedStatus()) {
      result = result.filter(a => a.status === this.selectedStatus());
    }
    if (this.selectedDepartment()) {
      result = result.filter(a => a.department === this.selectedDepartment());
    }

    return result;
  }

  // Helper methods
  getStatusLabel(status: AssessmentStatus): string {
    const map: Record<AssessmentStatus, string> = {
      not_started: '未開始',
      self_assessment: '自評中',
      manager_review: '主管審核中',
      completed: '已完成'
    };
    return map[status];
  }

  getStatusClass(status: AssessmentStatus): string {
    return `status-${status.replace('_', '-')}`;
  }

  getScheduleStatusLabel(status: 'scheduled' | 'in_progress' | 'completed'): string {
    const map = {
      scheduled: '已排程',
      in_progress: '進行中',
      completed: '已完成'
    };
    return map[status];
  }

  getScheduleStatusClass(status: 'scheduled' | 'in_progress' | 'completed'): string {
    return `schedule-${status.replace('_', '-')}`;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getAvatarInitial(name: string): string {
    return name ? name.charAt(0) : 'U';
  }

  startAssessment(assessment: CompetencyAssessment): void {
    console.log('Start assessment:', assessment.id);
    // Implement start assessment logic
  }

  viewAssessment(assessment: CompetencyAssessment): void {
    console.log('View assessment:', assessment.id);
    // Implement view assessment logic
  }
}

