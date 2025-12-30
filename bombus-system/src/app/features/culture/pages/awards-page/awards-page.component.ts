import { Component, ChangeDetectionStrategy, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { CultureService } from '../../services/culture.service';
import { Award, AwardApplication, AwardCategory } from '../../models/culture.model';

@Component({
  standalone: true,
  selector: 'app-awards-page',
  templateUrl: './awards-page.component.html',
  styleUrl: './awards-page.component.scss',
  imports: [CommonModule, HeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AwardsPageComponent implements OnInit {
  private cultureService = inject(CultureService);

  // State
  loading = signal(true);
  awards = signal<Award[]>([]);
  applications = signal<AwardApplication[]>([]);

  // Filters
  selectedCategory = signal<AwardCategory | 'all'>('all');
  searchQuery = signal('');

  // Categories
  categories: { value: AwardCategory | 'all'; label: string; icon: string }[] = [
    { value: 'all', label: '全部', icon: 'ri-apps-line' },
    { value: 'hr', label: '人資類', icon: 'ri-user-star-line' },
    { value: 'employer', label: '雇主品牌', icon: 'ri-building-2-line' },
    { value: 'government', label: '政府獎項', icon: 'ri-government-line' },
    { value: 'sustainability', label: '永續發展', icon: 'ri-leaf-line' },
    { value: 'innovation', label: '創新類', icon: 'ri-lightbulb-line' },
    { value: 'industry', label: '產業獎項', icon: 'ri-award-line' }
  ];

  // Computed
  filteredAwards = computed(() => {
    let result = this.awards();
    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase();

    if (category !== 'all') {
      result = result.filter(a => a.category === category);
    }

    if (query) {
      result = result.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.organizer.toLowerCase().includes(query) ||
        a.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    return result;
  });

  upcomingDeadlines = computed(() => {
    const now = new Date();
    const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return this.awards().filter(a =>
      a.applicationDeadline >= now &&
      a.applicationDeadline <= twoWeeks
    );
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.cultureService.getAwards().subscribe(data => {
      this.awards.set(data);
    });

    this.cultureService.getAwardApplications().subscribe(data => {
      this.applications.set(data);
      this.loading.set(false);
    });
  }

  setCategory(category: AwardCategory | 'all'): void {
    this.selectedCategory.set(category);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'hr': '人資類',
      'employer': '雇主品牌',
      'government': '政府獎項',
      'sustainability': '永續發展',
      'innovation': '創新類',
      'industry': '產業獎項'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'hr': 'ri-user-star-line',
      'employer': 'ri-building-2-line',
      'government': 'ri-government-line',
      'sustainability': 'ri-leaf-line',
      'innovation': 'ri-lightbulb-line',
      'industry': 'ri-award-line'
    };
    return icons[category] || 'ri-award-line';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'upcoming': '即將開放',
      'applying': '申請中',
      'submitted': '已提交',
      'won': '已獲獎',
      'not-won': '未獲獎',
      'missed': '已錯過'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'upcoming': 'status-upcoming',
      'applying': 'status-applying',
      'submitted': 'status-submitted',
      'won': 'status-won',
      'not-won': 'status-not-won',
      'missed': 'status-missed'
    };
    return classes[status] || '';
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'high': '高優先',
      'medium': '中優先',
      'low': '低優先'
    };
    return labels[priority] || priority;
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getDaysUntilDeadline(date: Date): number {
    const now = new Date();
    const deadline = new Date(date);
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getMatchScoreClass(score: number): string {
    if (score >= 90) return 'score-high';
    if (score >= 70) return 'score-medium';
    return 'score-low';
  }
}

