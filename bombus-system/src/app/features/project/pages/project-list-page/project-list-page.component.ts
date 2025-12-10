import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { ProjectService } from '../../services/project.service';
import { Project, ProjectStats, ProjectFilter, TeamMember, CreateProjectForm } from '../../models/project.model';

@Component({
  standalone: true,
  selector: 'app-project-list-page',
  templateUrl: './project-list-page.component.html',
  styleUrl: './project-list-page.component.scss',
  imports: [CommonModule, FormsModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectListPageComponent implements OnInit {
  private projectService = inject(ProjectService);
  private router = inject(Router);

  // State
  loading = signal(false);
  projects = signal<Project[]>([]);
  stats = signal<ProjectStats | null>(null);
  teamMembers = signal<TeamMember[]>([]);
  showCreateModal = signal(false);

  // Filter State
  searchText = signal('');
  selectedDepartment = signal('all');
  selectedStatus = signal('all');

  // Create Form State
  newProject = signal<CreateProjectForm>({
    name: '',
    code: '',
    pmId: '',
    startDate: '',
    endDate: '',
    objective: '',
    budget: 0,
    department: ''
  });

  // Computed
  filteredProjects = computed(() => {
    const search = this.searchText().toLowerCase();
    const dept = this.selectedDepartment();
    const status = this.selectedStatus();
    
    return this.projects().filter(p => {
      const matchSearch = !search || 
        p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search) ||
        p.pm.toLowerCase().includes(search);
      const matchDept = dept === 'all' || p.department === dept;
      const matchStatus = status === 'all' || p.status === status;
      return matchSearch && matchDept && matchStatus;
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    
    this.projectService.getProjectStats().subscribe({
      next: (stats) => this.stats.set(stats)
    });

    this.projectService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      }
    });

    this.projectService.getTeamMembers().subscribe({
      next: (members) => this.teamMembers.set(members)
    });
  }

  onSearch(value: string): void {
    this.searchText.set(value);
  }

  onDepartmentChange(value: string): void {
    this.selectedDepartment.set(value);
  }

  onStatusChange(value: string): void {
    this.selectedStatus.set(value);
  }

  navigateToDetail(projectId: string): void {
    this.router.navigate(['/project/detail', projectId]);
  }

  openCreateModal(): void {
    this.newProject.set({
      name: '',
      code: '',
      pmId: '',
      startDate: '',
      endDate: '',
      objective: '',
      budget: 0,
      department: ''
    });
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
  }

  updateNewProject(field: keyof CreateProjectForm, value: string | number): void {
    this.newProject.update(p => ({ ...p, [field]: value }));
  }

  createProject(): void {
    const form = this.newProject();
    if (!form.name || !form.code) {
      return;
    }

    this.projectService.createProject(form).subscribe({
      next: (project) => {
        this.projects.update(list => [...list, project]);
        this.closeCreateModal();
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active': return 'status-progress';
      case 'risk': return 'status-risk';
      case 'planning': return 'status-planning';
      case 'completed': return 'status-completed';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'active': return '進行中';
      case 'risk': return '風險';
      case 'planning': return '規劃中';
      case 'completed': return '已完成';
      default: return status;
    }
  }

  getProgressBarStyle(project: Project): { [key: string]: string } {
    const color = project.status === 'risk' ? 'var(--color-danger)' :
                  project.status === 'planning' ? '#E3C088' : 'var(--color-l4-mauve)';
    return {
      width: `${project.progress}%`,
      background: color
    };
  }

  formatCurrency(value: number): string {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  }
}
