import { Component, ViewEncapsulation, input, output, computed } from '@angular/core';

export type ViewMode = 'card' | 'list' | 'matrix';

interface ModeConfig {
  mode: ViewMode;
  icon: string;
  title: string;
}

const MODE_CATALOG: Record<ViewMode, ModeConfig> = {
  card: { mode: 'card', icon: 'ri-layout-grid-line', title: '卡片檢視' },
  list: { mode: 'list', icon: 'ri-list-check', title: '列表檢視' },
  matrix: { mode: 'matrix', icon: 'ri-grid-fill', title: '矩陣檢視' }
};

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="view-toggle-group" [style.--toggle-active-color]="moduleColor()">
      @for (m of visibleModes(); track m.mode) {
        <button
          class="toggle-btn"
          type="button"
          [class.active]="viewMode() === m.mode"
          [title]="m.title"
          (click)="setMode(m.mode)">
          <i [class]="m.icon"></i>
        </button>
      }
    </div>
  `,
  styles: [`
    .view-toggle-group {
      display: flex;
      gap: 4px;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #6c757d;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 18px;

      &:hover {
        background: #f8f9fa;
        color: #212529;
      }

      &.active {
        background: var(--toggle-active-color, #8DA399);
        color: white;
      }
    }
  `]
})
export class ViewToggleComponent {
  viewMode = input<ViewMode>('card');
  moduleColor = input<string>('#8DA399');
  modes = input<readonly ViewMode[]>(['card', 'list']);
  viewModeChange = output<ViewMode>();

  visibleModes = computed<ModeConfig[]>(() =>
    this.modes().map(m => MODE_CATALOG[m])
  );

  setMode(mode: ViewMode): void {
    this.viewModeChange.emit(mode);
  }
}
