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
  TalentMatchResult,
  JobMatch
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
  jobMatches = signal<JobMatch[]>([]);
  analyzingJobs = signal<boolean>(false);

  // Filters
  searchQuery = signal<string>('');
  selectedStatus = signal<string>('all');
  selectedSource = signal<string>('all');
  selectedTags = signal<string[]>([]);

  // UI State
  loading = signal<boolean>(false);
  showContactModal = signal<boolean>(false);
  activeTab = signal<'info' | 'history' | 'match'>('info');
  showTagFilter = signal<boolean>(false);
  expandedCategories = signal<Set<string>>(new Set(['skill', 'experience', 'education', 'personality', 'custom'])); // 預設全部展開

  // 面試邀約 Modal
  showInviteModal = signal<boolean>(false);
  inviteJob = signal<JobMatch | null>(null);
  inviteMessage = signal<string>('您好，感謝您投遞履歷。我們對您的經歷印象深刻，希望能邀請您參加面試。請查看以下建議時段並回覆確認。');
  inviteSlots = signal<string[]>(['']);
  inviteLoading = signal<boolean>(false);

  // 新增聯繫紀錄表單
  contactForm = signal<{
    contactMethod: 'phone' | 'email' | 'interview' | 'meeting';
    contactBy: string;
    summary: string;
    outcome: 'positive' | 'neutral' | 'negative' | 'no-response';
    nextAction: string;
  }>({
    contactMethod: 'phone',
    contactBy: '',
    summary: '',
    outcome: 'neutral',
    nextAction: ''
  });

  // 標籤分類定義
  readonly tagCategoryLabels: Record<string, string> = {
    'skill': '技能',
    'experience': '經驗',
    'education': '學歷',
    'personality': '特質',
    'custom': '自訂'
  };

  readonly tagCategoryIcons: Record<string, string> = {
    'skill': 'ri-tools-line',
    'experience': 'ri-briefcase-line',
    'education': 'ri-graduation-cap-line',
    'personality': 'ri-user-heart-line',
    'custom': 'ri-price-tag-3-line'
  };

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

    // 根據 contactStatus 篩選
    if (status !== 'all') {
      result = result.filter(c => c.contactStatus === status);
    }

    if (source !== 'all') {
      result = result.filter(c => c.source === source);
    }

    if (tagIds.length > 0) {
      result = result.filter(c => c.tags.some(t => tagIds.includes(t.id)));
    }

    return result;
  });

  // 待聯繫人才列表（contactStatus = 'pending' 的人才）
  pendingContactCandidates = computed(() => {
    return this.candidates().filter(c => c.contactStatus === 'pending');
  });

  // 按分類分組的標籤
  groupedTags = computed(() => {
    const tags = this.tags();
    const groups: Record<string, TalentTag[]> = {
      'skill': [],
      'experience': [],
      'education': [],
      'personality': [],
      'custom': []
    };

    tags.forEach(tag => {
      const category = tag.category || 'custom';
      if (groups[category]) {
        groups[category].push(tag);
      } else {
        groups['custom'].push(tag);
      }
    });

    // 轉換為陣列格式，只保留有標籤的分類
    return Object.entries(groups)
      .filter(([_, tags]) => tags.length > 0)
      .map(([category, tags]) => ({
        category,
        label: this.tagCategoryLabels[category] || category,
        icon: this.tagCategoryIcons[category] || 'ri-price-tag-3-line',
        tags
      }));
  });

  // 已選標籤數量
  selectedTagCount = computed(() => this.selectedTags().length);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    this.talentPoolService.getTalentPoolStats().subscribe(stats => {
      this.stats.set(stats);
    });

    this.talentPoolService.getCandidates().subscribe(result => {
      this.candidates.set(result.talents);
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

    // Load job matches
    this.talentPoolService.getJobMatches(candidate.id).subscribe(matches => {
      this.jobMatches.set(matches);
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

  // 切換標籤篩選面板顯示
  toggleTagFilter(): void {
    this.showTagFilter.update(v => !v);
  }

  // 展開/收合分類
  toggleCategory(category: string): void {
    const current = this.expandedCategories();
    const newSet = new Set(current);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    this.expandedCategories.set(newSet);
  }

  // 檢查分類是否展開
  isCategoryExpanded(category: string): boolean {
    return this.expandedCategories().has(category);
  }

  // 清除所有標籤篩選
  clearTagFilters(): void {
    this.selectedTags.set([]);
  }

  // 取得標籤名稱（用於顯示已選標籤）
  getTagNameById(tagId: string): string {
    const tag = this.tags().find(t => t.id === tagId);
    return tag?.name || tagId;
  }

  // 取得標籤顏色
  getTagColorById(tagId: string): string {
    const tag = this.tags().find(t => t.id === tagId);
    return tag?.color || '#6B7280';
  }

  openContactModal(): void {
    // 重置表單
    this.contactForm.set({
      contactMethod: 'phone',
      contactBy: '',
      summary: '',
      outcome: 'neutral',
      nextAction: ''
    });
    this.showContactModal.set(true);
  }

  closeContactModal(): void {
    this.showContactModal.set(false);
  }

  updateContactForm<K extends keyof ReturnType<typeof this.contactForm>>(
    field: K,
    value: ReturnType<typeof this.contactForm>[K]
  ): void {
    this.contactForm.update(form => ({ ...form, [field]: value }));
  }

  addContact(): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;

    const form = this.contactForm();
    if (!form.summary.trim()) {
      this.notificationService.error('請填寫聯繫摘要');
      return;
    }

    this.talentPoolService.addContact(candidate.id, {
      contactDate: new Date(),
      contactMethod: form.contactMethod,
      contactBy: form.contactBy || '目前使用者',
      summary: form.summary,
      outcome: form.outcome,
      nextAction: form.nextAction || undefined
    }).subscribe(success => {
      if (success) {
        this.notificationService.success('聯繫紀錄已新增');
        this.closeContactModal();
        // 重新載入聯繫紀錄
        this.talentPoolService.getContactHistory(candidate.id).subscribe(history => {
          this.contactHistory.set(history);
        });
        // 重新載入人才列表以更新狀態
        this.loadData();
      }
    });
  }

  // 設定待聯繫提醒
  toggleContactReminder(candidate: TalentCandidate): void {
    const newValue = !candidate.contactReminderEnabled;
    this.talentPoolService.setContactReminder(candidate.id, newValue).subscribe(success => {
      if (success) {
        this.notificationService.success(newValue ? '已開啟待聯繫提醒' : '已關閉待聯繫提醒');
        this.loadData();
        // 更新 selectedCandidate
        if (this.selectedCandidate()?.id === candidate.id) {
          this.selectedCandidate.update(c => c ? { ...c, contactReminderEnabled: newValue } : null);
        }
      }
    });
  }

  // 取得聯繫狀態標籤
  getContactStatusLabel(status: string | null | undefined): string {
    if (status === 'contacted') return '已聯繫';
    if (status === 'pending') return '待聯繫';
    return '';
  }

  getContactStatusClass(status: string | null | undefined): string {
    if (status === 'contacted') return 'contact-status--contacted';
    if (status === 'pending') return 'contact-status--pending';
    return '';
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

  getDeclineStageLabel(stage: string | undefined): string {
    if (!stage) return '';
    const labels: Record<string, string> = {
      'invite_declined': '邀請婉拒',
      'interview_declined': '面試婉拒',
      'offer_declined': 'Offer 婉拒',
      'not_hired': '未錄取'
    };
    return labels[stage] || stage;
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

  // =====================================================
  // 職缺媒合功能
  // =====================================================

  /**
   * AI 分析所有職缺的媒合度
   */
  analyzeJobMatches(): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;

    this.analyzingJobs.set(true);
    this.talentPoolService.analyzeJobs(candidate.id).subscribe({
      next: (matches) => {
        this.jobMatches.set(matches);
        this.analyzingJobs.set(false);
        this.notificationService.success(`已完成 ${matches.length} 個職缺的媒合度分析`);
      },
      error: () => {
        this.analyzingJobs.set(false);
        this.notificationService.error('分析失敗，請稍後再試');
      }
    });
  }

  /**
   * 將人才加入職缺候選人（僅加入，不發送邀請）
   */
  applyToJob(job: JobMatch, sendInvitation: boolean): void {
    const candidate = this.selectedCandidate();
    if (!candidate) return;

    if (sendInvitation) {
      // 開啟面試邀約 Modal，讓 HR 填寫邀約資訊
      this.openInviteModal(job);
    } else {
      // 僅加入候選人名單
      this.talentPoolService.applyToJob(candidate.id, job.jobId, false).subscribe({
        next: (result) => {
          if (result) {
            this.notificationService.success(`已將 ${result.talentName} 加入「${result.jobTitle}」候選人名單`);
            this.closeDetail();
          }
        },
        error: () => {
          this.notificationService.error('操作失敗，請稍後再試');
        }
      });
    }
  }

  /**
   * 開啟面試邀約 Modal
   */
  openInviteModal(job: JobMatch): void {
    this.inviteJob.set(job);
    this.inviteMessage.set('您好，感謝您投遞履歷。我們對您的經歷印象深刻，希望能邀請您參加面試。請查看以下建議時段並回覆確認。');
    this.inviteSlots.set(['']);
    this.showInviteModal.set(true);
  }

  /**
   * 關閉面試邀約 Modal
   */
  closeInviteModal(): void {
    this.showInviteModal.set(false);
    this.inviteJob.set(null);
  }

  /**
   * 新增面試時段
   */
  addInviteSlot(): void {
    this.inviteSlots.update(slots => [...slots, '']);
  }

  /**
   * 移除面試時段
   */
  removeInviteSlot(index: number): void {
    this.inviteSlots.update(slots => slots.filter((_, i) => i !== index));
  }

  /**
   * 更新面試時段
   */
  updateInviteSlot(index: number, value: string): void {
    this.inviteSlots.update(slots => {
      const newSlots = [...slots];
      newSlots[index] = value;
      return newSlots;
    });
  }

  /**
   * 確認發送面試邀約
   */
  confirmInvite(): void {
    const candidate = this.selectedCandidate();
    const job = this.inviteJob();
    if (!candidate || !job) return;

    const validSlots = this.inviteSlots().filter(s => !!s);
    if (validSlots.length === 0) {
      this.notificationService.warning('請至少提供一個建議時段');
      return;
    }

    this.inviteLoading.set(true);

    this.talentPoolService.applyToJobWithInvitation(
      candidate.id,
      job.jobId,
      this.inviteMessage(),
      validSlots
    ).subscribe({
      next: (result) => {
        if (result) {
          this.notificationService.success(`已將 ${result.talentName} 加入「${result.jobTitle}」並發送面試邀請`);
          this.closeInviteModal();
          this.closeDetail();
        }
        this.inviteLoading.set(false);
      },
      error: () => {
        this.notificationService.error('發送失敗，請稍後再試');
        this.inviteLoading.set(false);
      }
    });
  }

  /**
   * 取得媒合度分數的樣式類別
   */
  getJobMatchScoreClass(score: number | null): string {
    if (score === null) return 'score-none';
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    if (score >= 40) return 'score-low';
    return 'score-very-low';
  }

  /**
   * 取得媒合度標籤文字
   */
  getJobMatchScoreLabel(score: number | null): string {
    if (score === null) return '尚未分析';
    if (score >= 80) return '高度匹配';
    if (score >= 60) return '中度匹配';
    if (score >= 40) return '低度匹配';
    return '不太匹配';
  }
}
