import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-org-structure-page',
  imports: [CommonModule],
  template: '<div class="placeholder">組織架構管理（待實作）</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrgStructurePageComponent {}
