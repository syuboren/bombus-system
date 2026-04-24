import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ViewEncapsulation,
  input,
  output,
  signal,
  computed,
  effect,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReferralInvitationService } from '../../services/referral-invitation.service';
import {
  CreateReferralInvitationResponse,
  ReferralInvitationListItem,
  RecommenderPreview
} from '../../models/referral-invitation.model';
import { NotificationService } from '../../../../core/services/notification.service';

type Tab = 'create' | 'history';
type RecommenderState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; preview: RecommenderPreview }
  | { kind: 'error'; message: string };

@Component({
  selector: 'app-referral-invitation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './referral-invitation-modal.component.html',
  styleUrl: './referral-invitation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ReferralInvitationModalComponent {
  isVisible = input.required<boolean>();
  jobId = input.required<string>();
  jobTitle = input<string>('');
  close = output<void>();
  invitationCreated = output<void>();

  private referralService = inject(ReferralInvitationService);
  private notify = inject(NotificationService);
  private destroyRef = inject(DestroyRef);

  tab = signal<Tab>('create');

  // ─── 表單 ───
  recommenderEmployeeNo = signal<string>('');
  candidateEmail = signal<string>('');
  customMessage = signal<string>('');
  submitting = signal<boolean>(false);
  createdInvitation = signal<CreateReferralInvitationResponse | null>(null);

  // ─── 推薦人預覽 ───
  recommenderState = signal<RecommenderState>({ kind: 'idle' });
  private previewInput$ = new Subject<string>();

  // ─── 歷史邀請 ───
  historyLoading = signal<boolean>(false);
  invitations = signal<ReferralInvitationListItem[]>([]);

  constructor() {
    // 員編即時預覽（debounce 400ms；字串過短不送出以減少無意義 400）
    this.previewInput$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap(employeeNo => {
          const trimmed = employeeNo.trim();
          if (!trimmed) {
            this.recommenderState.set({ kind: 'idle' });
            return of(null);
          }
          if (trimmed.length < 3) {
            // 字串太短視為尚未輸入完成，不打 API
            this.recommenderState.set({ kind: 'idle' });
            return of(null);
          }
          this.recommenderState.set({ kind: 'loading' });
          return this.referralService.previewRecommender(trimmed).pipe(
            catchError(err => {
              const message = err?.error?.message || '查無此員工或已離職';
              this.recommenderState.set({ kind: 'error', message });
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(preview => {
        if (preview) this.recommenderState.set({ kind: 'ok', preview });
      });

    // 當 Modal 開啟切到 history tab 時載入清單
    // NG0600：effect 內寫 signal 需 allowSignalWrites（loadHistory 內會 set historyLoading）
    effect(() => {
      if (this.isVisible() && this.tab() === 'history') {
        this.loadHistory();
      }
    }, { allowSignalWrites: true });

    // Modal 關閉時重置表單（queueMicrotask 把寫入移到 effect 外，本身不需 allowSignalWrites）
    effect(() => {
      if (!this.isVisible()) {
        queueMicrotask(() => this.resetAll());
      }
    });
  }

  isFormValid = computed(() => {
    const recoOk = this.recommenderState().kind === 'ok';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.candidateEmail());
    return recoOk && emailOk;
  });

  onEmployeeNoInput(value: string): void {
    this.recommenderEmployeeNo.set(value);
    this.previewInput$.next(value);
  }

  onSubmit(): void {
    if (!this.isFormValid() || this.submitting()) return;

    this.submitting.set(true);
    this.referralService
      .createInvitation({
        jobId: this.jobId(),
        recommenderEmployeeNo: this.recommenderEmployeeNo().trim(),
        candidateEmail: this.candidateEmail().trim(),
        customMessage: this.customMessage().trim() || undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.createdInvitation.set(res);
          this.submitting.set(false);
          this.invitationCreated.emit();
          this.notify.success('已建立內推邀請，請複製連結傳給候選人');
        },
        error: err => {
          this.submitting.set(false);
          const code = err?.error?.error;
          const msg = err?.error?.message;
          if (code === 'DUPLICATE_PENDING_INVITATION') {
            this.notify.error(msg || '此職缺已有此候選人的進行中邀請');
          } else if (code === 'RECOMMENDER_INVALID') {
            this.notify.error(msg || '推薦人員編無效或已離職');
          } else if (code === 'JOB_NOT_PUBLISHED') {
            this.notify.error(msg || '僅已發佈職缺可發起內推');
          } else {
            this.notify.error(msg || '建立邀請失敗');
          }
        }
      });
  }

  copyLink(link: string): void {
    navigator.clipboard.writeText(link).then(
      () => this.notify.success('連結已複製'),
      () => this.notify.error('複製失敗，請手動選取連結')
    );
  }

  tryClose(): void {
    this.close.emit();
  }

  switchTab(tab: Tab): void {
    this.tab.set(tab);
  }

  // ─── 歷史邀請操作 ───
  loadHistory(): void {
    this.historyLoading.set(true);
    this.referralService.listInvitations(this.jobId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: res => {
        this.invitations.set(res.invitations);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
        this.notify.error('載入歷史邀請失敗');
      }
    });
  }

  cancelInvitation(id: string): void {
    if (!confirm('確定要取消此邀請？連結將立即失效。')) return;
    this.referralService.cancelInvitation(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notify.success('邀請已取消');
        this.loadHistory();
      },
      error: err => this.notify.error(err?.error?.message || '取消失敗')
    });
  }

  renewInvitation(id: string): void {
    this.referralService.renewInvitation(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.notify.success('效期已延長 7 天，請重新複製連結');
        this.loadHistory();
      },
      error: err => this.notify.error(err?.error?.message || '延長失敗')
    });
  }

  statusLabel(s: string): string {
    return (
      { pending: '待填寫', submitted: '已提交', expired: '已過期', cancelled: '已取消' } as Record<string, string>
    )[s] || s;
  }

  formatDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${d.getFullYear()}/${mm}/${dd} ${hh}:${mi}`;
  }

  private resetAll(): void {
    this.tab.set('create');
    this.recommenderEmployeeNo.set('');
    this.candidateEmail.set('');
    this.customMessage.set('');
    this.recommenderState.set({ kind: 'idle' });
    this.createdInvitation.set(null);
    this.submitting.set(false);
    this.invitations.set([]);
  }
}
