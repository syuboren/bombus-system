import { Component, ChangeDetectionStrategy, input, output, signal, computed, effect, ViewEncapsulation, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidateDetail } from '../../models/candidate.model';
import { InterviewService } from '../../services/interview.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { inject } from '@angular/core';

interface InterviewerOption {
    id: string;
    name: string;
    department: string | null;
    position: string | null;
}

interface SlotConflictStatus {
    status: 'unchecked' | 'checking' | 'available' | 'conflict' | 'invalid';
    reasons: string[];
}

@Component({
    selector: 'app-invite-candidate-modal',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './invite-candidate-modal.component.html',
    styleUrl: './invite-candidate-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class InviteCandidateModalComponent {
    candidate = input.required<CandidateDetail>();
    isVisible = input.required<boolean>();
    /** 可選：職缺所屬部門，用於預設篩選面試官清單 */
    jobDepartment = input<string | null>(null);
    close = output<void>();
    invited = output<void>();

    private interviewService = inject(InterviewService);
    private notificationService = inject(NotificationService);

    message = signal<string>('您好，感謝您投遞履歷。我們對您的經歷印象深刻，希望能邀請您參加面試。請查看以下建議時段並回覆確認。');
    slotParts = signal<Array<{ date: string; hour: string; minute: string }>>([
        { date: '', hour: '', minute: '' }
    ]);
    proposedSlots = computed(() => this.slotParts().map(p =>
        p.date && p.hour !== '' && p.minute !== '' ? `${p.date}T${p.hour}:${p.minute}` : ''
    ));
    loading = signal<boolean>(false);

    readonly hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    readonly minuteOptions = ['00', '15', '30', '45'];

    interviewerId = signal<string | null>(null);
    employees = signal<InterviewerOption[]>([]);
    filterByDept = signal<boolean>(true);
    deptFallbackHint = signal<string | null>(null);

    slotConflicts = signal<SlotConflictStatus[]>([{ status: 'unchecked', reasons: [] }]);

    private conflictCheckTimer: ReturnType<typeof setTimeout> | null = null;

    filteredEmployees = computed(() => {
        const all = this.employees();
        const dept = this.jobDepartment();
        if (!this.filterByDept() || !dept) return all;
        const matched = all.filter(e => e.department === dept);
        return matched.length > 0 ? matched : all;
    });

    hasAnyConflict = computed(() => this.slotConflicts().some(s => s.status === 'conflict' || s.status === 'invalid'));

    canSubmit = computed(() => {
        if (this.loading()) return false;
        if (!this.interviewerId()) return false;
        const hasSlot = this.proposedSlots().some(s => !!s && !!s.trim());
        if (!hasSlot) return false;
        if (this.hasAnyConflict()) return false;
        return true;
    });

    constructor() {
        // 開啟時載入員工清單；關閉時重置所有表單 state 避免殘留
        effect(() => {
            const visible = this.isVisible();
            untracked(() => {
                if (visible) {
                    this.loadEmployees();
                } else {
                    this.resetForm();
                }
            });
        }, { allowSignalWrites: true });

        // 面試官或時段變動 → debounced 衝突檢查
        effect(() => {
            const id = this.interviewerId();
            const slots = this.proposedSlots();
            untracked(() => this.scheduleConflictCheck(id, slots));
        }, { allowSignalWrites: true });

        // 同部門無員工時 fallback 全員並顯示提示
        effect(() => {
            const all = this.employees();
            const dept = this.jobDepartment();
            const useFilter = this.filterByDept();
            untracked(() => {
                if (!dept || !useFilter) {
                    this.deptFallbackHint.set(null);
                    return;
                }
                const matched = all.filter(e => e.department === dept);
                this.deptFallbackHint.set(matched.length === 0 && all.length > 0
                    ? `同部門「${dept}」目前無在職員工，已顯示全部員工`
                    : null);
            });
        }, { allowSignalWrites: true });
    }

    private loadEmployees(): void {
        // rbac-row-level-and-interview-scope: 三道防線第 1 層 — 下拉只列有 interviewer 角色的員工
        this.interviewService.listActiveEmployees({ role: 'interviewer' }).subscribe({
            next: list => this.employees.set(list),
            error: () => this.notificationService.error('載入員工清單失敗')
        });
    }

    toggleDeptFilter(): void {
        this.filterByDept.update(v => !v);
    }

    tryClose(): void {
        if (this.loading()) return;
        const hasContent = this.proposedSlots().some(s => !!s.trim()) || !!this.interviewerId();
        if (hasContent && !confirm('您有未儲存的變更，確定要離開嗎？')) return;
        this.close.emit();
    }

    addSlot(): void {
        this.slotParts.update(parts => [...parts, { date: '', hour: '', minute: '' }]);
        this.slotConflicts.update(sc => [...sc, { status: 'unchecked', reasons: [] }]);
    }

    removeSlot(index: number): void {
        this.slotParts.update(parts => parts.filter((_, i) => i !== index));
        this.slotConflicts.update(sc => sc.filter((_, i) => i !== index));
    }

    updateSlotPart(index: number, field: 'date' | 'hour' | 'minute', value: string): void {
        this.slotParts.update(parts => {
            const next = [...parts];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    }

    private resetForm(): void {
        if (this.conflictCheckTimer) {
            clearTimeout(this.conflictCheckTimer);
            this.conflictCheckTimer = null;
        }
        this.interviewerId.set(null);
        this.slotParts.set([{ date: '', hour: '', minute: '' }]);
        this.message.set('您好，感謝您投遞履歷。我們對您的經歷印象深刻，希望能邀請您參加面試。請查看以下建議時段並回覆確認。');
        this.slotConflicts.set([{ status: 'unchecked', reasons: [] }]);
        this.filterByDept.set(true);
        this.deptFallbackHint.set(null);
        this.loading.set(false);
    }

    private scheduleConflictCheck(interviewerId: string | null, slots: string[]): void {
        if (this.conflictCheckTimer) clearTimeout(this.conflictCheckTimer);
        if (!interviewerId) {
            this.slotConflicts.set(slots.map(() => ({ status: 'unchecked', reasons: [] })));
            return;
        }
        this.slotConflicts.set(slots.map(s => ({ status: s ? 'checking' : 'unchecked', reasons: [] })));
        this.conflictCheckTimer = setTimeout(() => this.runConflictCheck(interviewerId, slots), 300);
    }

    private runConflictCheck(interviewerId: string, slots: string[]): Promise<boolean> {
        const filledSlots = slots.map((s, i) => ({ raw: s, index: i })).filter(x => !!x.raw);
        if (filledSlots.length === 0) {
            this.slotConflicts.set(slots.map(() => ({ status: 'unchecked', reasons: [] })));
            return Promise.resolve(true);
        }
        const candidateId = this.candidate().id;
        return new Promise((resolve) => {
            this.interviewService.checkConflicts(interviewerId, filledSlots.map(x => x.raw), { candidateId }).subscribe({
                next: res => {
                    const next: SlotConflictStatus[] = slots.map(s => ({ status: s ? 'unchecked' : 'unchecked' as const, reasons: [] }));
                    res.slots.forEach((slotResult, i) => {
                        const origIndex = filledSlots[i].index;
                        if (slotResult.status === 'available') {
                            next[origIndex] = { status: 'available', reasons: [] };
                        } else if (slotResult.status === 'conflict') {
                            next[origIndex] = {
                                status: 'conflict',
                                reasons: slotResult.conflicts.map(c => c.reason)
                            };
                        } else {
                            next[origIndex] = { status: 'invalid', reasons: ['時段格式錯誤'] };
                        }
                    });
                    this.slotConflicts.set(next);
                    resolve(res.allClear);
                },
                error: () => {
                    this.slotConflicts.set(slots.map(() => ({ status: 'unchecked', reasons: ['無法檢查衝突'] })));
                    resolve(false);
                }
            });
        });
    }

    submit(): void {
        if (!this.interviewerId()) {
            this.notificationService.warning('請選擇面試官');
            return;
        }
        const slots = this.proposedSlots().filter(s => !!s);
        if (slots.length === 0) {
            this.notificationService.warning('請至少提供一個建議時段');
            return;
        }

        this.loading.set(true);
        // 送出前強制最終衝突檢查（debounce 可能尚未觸發）
        this.runConflictCheck(this.interviewerId()!, this.proposedSlots()).then(allClear => {
            if (!allClear) {
                this.loading.set(false);
                this.notificationService.error('部分時段與面試官或候選人行程衝突，請調整後再送出');
                return;
            }
            const candidateId = this.candidate().id;
            const jobId = this.candidate().jobId || 'UNKNOWN_JOB';

            this.interviewService.inviteCandidate(candidateId, jobId, this.interviewerId()!, this.message(), slots)
                .subscribe({
                    next: () => {
                        this.notificationService.success('面試邀約已發送');
                        this.invited.emit();
                        this.close.emit();
                        this.loading.set(false);
                    },
                    error: (err) => {
                        if (err?.status === 409) {
                            this.notificationService.error('建議時段全部衝突，請調整');
                        } else if (err?.status === 400) {
                            this.notificationService.error(err?.error?.message || '送出資料有誤');
                        } else {
                            this.notificationService.error('發送失敗，請稍後再試');
                        }
                        this.loading.set(false);
                    }
                });
        });
    }
}
