import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  inject,
  DestroyRef,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, debounceTime } from 'rxjs';
import { TenantUser, Role, ScopeType } from '../../../tenant-admin/models/tenant-admin.model';

interface MatrixCell {
  hasRole: boolean;
  chip: string;          // 最廣 scope 的分類標籤（全集團 / 子公司 / 部門）
  tooltipDetail: string; // hover 顯示完整 scope 細節，多筆以 " · " 連接
}

// 視覺合併：global（無 org 錨點）與 group（錨在集團根節點）在單集團租戶下權限等價，
// 顯示為統一的「全集團」（避免與功能權限的編輯範圍 company='全公司' 混淆）
const GROUP_WIDE_LABEL = '全集團';

// Cell chip 分類標籤（顯示用） — 三類
const SCOPE_TYPE_LABEL: Record<ScopeType, string> = {
  global: GROUP_WIDE_LABEL,
  group: GROUP_WIDE_LABEL,
  subsidiary: '子公司',
  department: '部門'
};

// 廣度排序：global / group > subsidiary > department（用於指派 chip 排序）
const SCOPE_BREADTH: Record<ScopeType, number> = {
  global: 4,
  group: 3,
  subsidiary: 2,
  department: 1
};

const RESPONSIVE_THRESHOLD_PX = 1024;

@Component({
  selector: 'app-employee-role-matrix',
  standalone: true,
  imports: [CommonModule, ScrollingModule],
  templateUrl: './employee-role-matrix.component.html',
  styleUrl: './employee-role-matrix.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeRoleMatrixComponent implements AfterViewInit {
  private destroyRef = inject(DestroyRef);

  employees = input.required<TenantUser[]>();
  roles = input.required<Role[]>();
  loading = input<boolean>(false);

  employeeClick = output<TenantUser>();
  roleHeaderClick = output<{ role: Role; anchor: HTMLElement }>();
  autoFallback = output<void>();

  private fallbackEmitted = signal(false);

  ngAfterViewInit(): void {
    this.checkViewportWidth();
    fromEvent(window, 'resize')
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.checkViewportWidth());
  }

  private checkViewportWidth(): void {
    if (this.fallbackEmitted()) return;
    if (window.innerWidth < RESPONSIVE_THRESHOLD_PX) {
      this.fallbackEmitted.set(true);
      this.autoFallback.emit();
    }
  }

  trackByUserId = (_: number, u: TenantUser) => u.id;
  trackByRoleId = (_: number, r: Role) => r.id;

  getCell(user: TenantUser, role: Role): MatrixCell {
    const matches = (user.roles ?? []).filter(ur => ur.role_id === role.id);
    if (matches.length === 0) {
      return { hasRole: false, chip: '', tooltipDetail: '' };
    }

    // 取最廣 scope 反映 effective 權限（perms 合併以最廣 scope 為主）
    const broadest = matches.reduce((a, b) =>
      SCOPE_BREADTH[a.scope_type] >= SCOPE_BREADTH[b.scope_type] ? a : b
    );

    // Tooltip 詳細：依廣度排序 → 每筆顯示 scope_name 或型別 fallback；多筆以 " · " 連接
    const sorted = [...matches].sort(
      (a, b) => SCOPE_BREADTH[b.scope_type] - SCOPE_BREADTH[a.scope_type]
    );
    const detailParts = sorted.map(m => {
      if (m.scope_type === 'global' || m.scope_type === 'group') {
        return GROUP_WIDE_LABEL;
      }
      return m.scope_name ?? SCOPE_TYPE_LABEL[m.scope_type];
    });
    const dedupedDetails = Array.from(new Set(detailParts));

    return {
      hasRole: true,
      chip: SCOPE_TYPE_LABEL[broadest.scope_type],
      tooltipDetail: dedupedDetails.join(' · ')
    };
  }

  getCellTooltip(cell: MatrixCell): string {
    return cell.tooltipDetail;
  }

  onRowClick(user: TenantUser): void {
    this.employeeClick.emit(user);
  }

  onRoleHeaderClick(role: Role, event: MouseEvent): void {
    const target = event.currentTarget as HTMLElement;
    this.roleHeaderClick.emit({ role, anchor: target });
  }
}
