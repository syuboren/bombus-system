import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="view-toggle-group" [style.--toggle-active-color]="moduleColor">
      <button class="toggle-btn" [class.active]="viewMode === 'card'" (click)="setMode('card')" type="button" title="卡片檢視">
        <i class="ri-layout-grid-line"></i>
      </button>
      <button class="toggle-btn" [class.active]="viewMode === 'list'" (click)="setMode('list')" type="button" title="列表檢視">
        <i class="ri-list-check"></i>
      </button>
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
      color: #6c757d; /* text-secondary */
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 18px;

      &:hover {
        background: #f8f9fa; /* soft-gray */
        color: #212529; /* text-primary */
      }

      &.active {
        background: var(--toggle-active-color, #8DA399); /* Fallback to KSA color */
        color: white;
      }
    }
  `]
})
export class ViewToggleComponent {
  @Input() viewMode: 'card' | 'list' = 'card';
  @Input() moduleColor: string = '#8DA399'; // Default KSA color
  @Output() viewModeChange = new EventEmitter<'card' | 'list'>();

  setMode(mode: 'card' | 'list') {
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
  }
}
