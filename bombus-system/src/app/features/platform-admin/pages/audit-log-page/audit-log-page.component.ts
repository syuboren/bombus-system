import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-audit-log-page',
  imports: [CommonModule],
  template: '<div class="placeholder">審計日誌（待實作）</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditLogPageComponent {}
