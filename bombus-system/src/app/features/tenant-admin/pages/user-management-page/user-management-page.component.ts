import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-user-management-page',
  imports: [CommonModule],
  template: '<div class="placeholder">使用者管理（待實作）</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserManagementPageComponent {}
