import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  OnboardingService,
  PendingCandidate,
  InProgressEmployee,
  ConvertCandidateResponse
} from '../../../services/onboarding.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { OnboardingConvertModalComponent } from '../../../components/onboarding-convert-modal/onboarding-convert-modal.component';

@Component({
  selector: 'app-onboarding-progress-page',
  standalone: true,
  imports: [CommonModule, OnboardingConvertModalComponent],
  templateUrl: './onboarding-progress-page.component.html',
  styleUrl: './onboarding-progress-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingProgressPageComponent implements OnInit {
  private onboardingService = inject(OnboardingService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Data
  pendingCandidates = signal<PendingCandidate[]>([]);
  inProgressEmployees = signal<InProgressEmployee[]>([]);

  // UI State
  loading = signal<boolean>(false);
  expandedPending = signal<boolean>(true);
  expandedInProgress = signal<boolean>(true);

  // Modal State
  showConvertModal = signal<boolean>(false);
  selectedCandidate = signal<PendingCandidate | null>(null);

  // 連結 Modal State
  showLinksModal = signal<boolean>(false);
  selectedEmployeeLinks = signal<{
    employee: InProgressEmployee | null;
    links: { name: string; url: string; token: string }[];
  }>({ employee: null, links: [] });

  // Computed
  pendingCount = computed(() => this.pendingCandidates().length);
  inProgressCount = computed(() => this.inProgressEmployees().length);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);

    // 載入待入職候選人
    this.onboardingService.getPendingConversions().subscribe({
      next: (data) => this.pendingCandidates.set(data),
      error: () => {
        this.pendingCandidates.set([]);
        this.notificationService.error('載入待入職候選人失敗');
      }
    });

    // 載入入職中員工
    this.onboardingService.getInProgressEmployees().subscribe({
      next: (data) => {
        this.inProgressEmployees.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.inProgressEmployees.set([]);
        this.loading.set(false);
        this.notificationService.error('載入入職中員工失敗');
      }
    });
  }

  // 開啟入職轉換 Modal
  openConvertModal(candidate: PendingCandidate): void {
    this.selectedCandidate.set(candidate);
    this.showConvertModal.set(true);
  }

  // 關閉 Modal
  closeConvertModal(): void {
    this.showConvertModal.set(false);
    this.selectedCandidate.set(null);
  }

  // 轉換成功後
  onConverted(result: ConvertCandidateResponse): void {
    this.loadData(); // 重新載入資料
  }

  // 前往員工檔案
  goToEmployeeProfile(employeeId: string): void {
    this.router.navigate(['/employee/profile'], {
      queryParams: { id: employeeId }
    });
  }

  // 開啟入職連結 Modal
  openLinksModal(employee: InProgressEmployee): void {
    // 取得該員工的入職進度詳情
    this.onboardingService.getOnboardingProgress(employee.id).subscribe({
      next: (detail) => {
        const links = detail.progress.templates.items.map((item: any) => ({
          name: item.template_name,
          url: window.location.origin + item.url,
          token: item.token
        }));

        if (links.length > 0) {
          this.selectedEmployeeLinks.set({ employee, links });
          this.showLinksModal.set(true);
        } else {
          this.notificationService.warning('該員工尚無入職文件連結');
        }
      },
      error: () => {
        this.notificationService.error('取得入職連結失敗');
      }
    });
  }

  // 關閉連結 Modal
  closeLinksModal(): void {
    this.showLinksModal.set(false);
    this.selectedEmployeeLinks.set({ employee: null, links: [] });
  }

  // 複製單一連結
  copyLink(url: string, name: string): void {
    navigator.clipboard.writeText(url).then(() => {
      this.notificationService.success(`「${name}」連結已複製`);
    });
  }

  // 複製所有連結
  copyAllLinks(): void {
    const links = this.selectedEmployeeLinks().links;
    const text = links.map(l => `${l.name}: ${l.url}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      this.notificationService.success(`已複製 ${links.length} 個連結`);
    });
  }

  // 展開/收合
  togglePending(): void {
    this.expandedPending.update(v => !v);
  }

  toggleInProgress(): void {
    this.expandedInProgress.update(v => !v);
  }

  // 取得進度條顏色
  getProgressColor(progress: number): string {
    if (progress >= 100) return '#10B981';
    if (progress >= 60) return '#8DA399';
    if (progress >= 30) return '#F59E0B';
    return '#EF4444';
  }

  // 格式化日期
  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit'
    });
  }

  // 計算等待天數
  getDaysSinceAccepted(dateStr: string): number {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
