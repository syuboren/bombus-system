import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-permission-visualization-page',
  imports: [CommonModule],
  template: '<div class="placeholder">權限可視化（待實作）</div>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionVisualizationPageComponent {}
