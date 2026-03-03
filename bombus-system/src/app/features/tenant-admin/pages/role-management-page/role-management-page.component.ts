import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-role-management-page',
  imports: [CommonModule],
  template: '<div class="placeholder">角色管理（待實作）</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleManagementPageComponent {}
