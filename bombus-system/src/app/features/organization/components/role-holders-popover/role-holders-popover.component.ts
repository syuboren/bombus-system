import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
  inject,
  input,
  output,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Role, TenantUser, UserRole } from '../../../tenant-admin/models/tenant-admin.model';

export interface RoleHolder {
  user: TenantUser;
  assignments: UserRole[];
}

@Component({
  selector: 'app-role-holders-popover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-holders-popover.component.html',
  styleUrl: './role-holders-popover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleHoldersPopoverComponent {
  private hostRef = inject(ElementRef<HTMLElement>);

  role = input.required<Role>();
  holders = input.required<RoleHolder[]>();
  anchorRect = input.required<DOMRect>();

  holderClick = output<TenantUser>();
  close = output<void>();

  position = computed(() => {
    const rect = this.anchorRect();
    return {
      top: `${rect.bottom + 4}px`,
      left: `${Math.max(8, rect.left)}px`
    };
  });

  scopeLabel(assignment: UserRole): string {
    // global / group 視覺上合併為「全集團」（與矩陣顯示一致；避免與功能權限編輯範圍 '全公司' 混淆）
    if (assignment.scope_type === 'global' || assignment.scope_type === 'group') {
      return '全集團';
    }
    if (assignment.scope_name) return assignment.scope_name;
    return assignment.scope_type;
  }

  onHolderClick(user: TenantUser): void {
    this.holderClick.emit(user);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const host = this.hostRef.nativeElement as HTMLElement;
    const target = event.target as Node;
    if (host.contains(target)) return;
    this.close.emit();
  }
}
