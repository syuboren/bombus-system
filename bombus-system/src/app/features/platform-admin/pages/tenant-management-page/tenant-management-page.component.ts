import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-tenant-management-page',
  imports: [CommonModule],
  template: '<div class="placeholder">租戶管理（待實作）</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TenantManagementPageComponent {}
