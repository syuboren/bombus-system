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
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { TalentPoolService } from '../../services/talent-pool.service';
import {
  TalentCandidate,
  TalentPoolStats,
  TalentReminder,
  TalentTag,
  TalentContactHistory,
  TalentMatchResult
} from '../../models/talent-pool.model';

@Component({
  selector: 'app-talent-pool-page',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './talent-pool-page.component.html',
  styleUrl: './talent-pool-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TalentPoolPageComponent implements OnInit {
  private talentPoolService = inject(TalentPoolService);
  private notificationService = inject(NotificationService);

  // State
  stats = signal<TalentPoolStats | null>(null);
  candidates = signal<TalentCandidate[]>([]);
  reminders = signal<TalentReminder[]>([]);
  tags = signal<TalentTag[]>([]);
  selectedCandidate = signal<TalentCandidate | null>(null);
  contactHistory = signal<TalentContactHistory[]>([]);
  matchResults = signal<TalentMatchResult[]>([]);

  // Filters
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  selectedSource = signal<string>('all');
  selectedTags = signal<string[]>([]);

  // UI State
  loading = signal<boolean>(false);
  showContactModal = signal<boolean>(false);
  activeTab = signal<'info' | 'history' | 'match'>('info');

  // Computed
  filteredCandidates = computed(() => {
    let result = this.candidates();
    const query = this.searchQuery().toLowerCase();
    const status = this.selectedStatus();
    const source = this.selectedSource();
    const tagIds = this.selectedTags();

    if (query) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.currentPosition.toLowerCase().includes(query) ||
        c.currentCompany.toLowerCase().includes(query) ||
        c.skills.some(s => s.toLowerCase().includes(query))
      );
    }

    if (status !== 'all') {
      result = result.filter(c => c.status === status);
    }

    if (source !== 'all') {
      result = result.filter(c => c.source === source);
    }

    if (tagIds.length > 0) {
      result = result.filter(c => c.tags.some(t => tagIds.includes(t.id)));
    }

    return result;
  });

  upcomingReminders = computed(() => {
    return this.reminders().filter(r => !r.isCompleted).slice(0, 5);
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.talentPoolService.getTalentPoolStats().subscribe(stats => {
      this.stats.set(stats);
    });

    this.talentPoolService.getCandidates().subscribe(candidates => {
      this.candidates.set(candidates);
      this.loading.set(false);
    });

    this.talentPoolService.getReminders().subscribe(reminders => {
      this.reminders.set(reminders);
    });

    this.talentPoolService.getTags().subscribe(tags => {
      this.tags.set(tags);
    });
  }

  selectCandidate(candidate: TalentCandidate): void {
    this.selectedCandidate.set(candidate);
    this.activeTab.set('info');

    // Load contact history
    this.talentPoolService.getContactHistory(candidate.id).subscribe(history => {
      this.contactHistory.set(history);
    });

    // Load match results
    this.talentPoolService.getMatchResults(candidate.id).subscribe(results => {
      this.matchResults.set(results);
    });
  }

  closeDetail(): void {
    this.selectedCandidate.set(null);
  }

  setActiveTab(tab: 'info' | 'history' | 'match'): void {
    this.activeTab.set(tab);
  }

  toggleTag(tagId: string): void {
    const current = this.selectedTags();
    if (current.includes(tagId)) {
      this.selectedTags.set(current.filter(id => id !== tagId));
    } else {
      this.selectedTags.set([...current, tagId]);
    }
  }

  openContactModal(): void {
    this.showContactModal.set(true);
  }

  closeContactModal(): void {
    this.showContactModal.set(false);
  }

  addContact(): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;

    this.talentPoolService.addContact(candidate.id, {
      contactDate: new Date(),
      contactMethod: 'email',
      summary: '新增聯繫紀錄',
      outcome: 'neutral'
    }).subscribe(() => {
      this.notificationService.success('聯繫紀錄已新增');
      this.closeContactModal();
      this.talentPoolService.getContactHistory(candidate.id).subscribe(history => {
        this.contactHistory.set(history);
      });
    });
  }

  updateStatus(status: TalentCandidate['status']): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;

    this.talentPoolService.updateCandidateStatus(candidate.id, status).subscribe(() => {
      this.notificationService.success('狀態已更新');
      this.loadData();
    });
  }

  completeReminder(reminder: TalentReminder): void {
    this.talentPoolService.completeReminder(reminder.id).subscribe(() => {
      this.notificationService.success('提醒已完成');
      this.talentPoolService.getReminders().subscribe(reminders => {
        this.reminders.set(reminders);
      });
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'active': '待聯繫',
      'contacted': '已聯繫',
      'scheduled': '已排程',
      'hired': '已錄用',
      'declined': '已婉拒',
      'expired': '已過期'
    };
    return labels[status] || status;
  }

  getSourceLabel(source: string): string {
    const labels: Record<string, string> = {
      '104': '104人力銀行',
      'linkedin': 'LinkedIn',
      'referral': '內部推薦',
      'website': '官網投遞',
      'headhunter': '獵頭推薦',
      'other': '其他'
    };
    return labels[source] || source;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority}`;
  }

  getMatchClass(score: number): string {
    if (score >= 90) return 'match-excellent';
    if (score >= 80) return 'match-good';
    if (score >= 70) return 'match-fair';
    return 'match-low';
  }

  getRecommendationLabel(rec: string): string {
    const labels: Record<string, string> = {
      'highly-recommended': '強烈推薦',
      'recommended': '推薦',
      'consider': '可考慮',
      'not-recommended': '不推薦'
    };
    return labels[rec] || rec;
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('zh-TW');
  }
}
