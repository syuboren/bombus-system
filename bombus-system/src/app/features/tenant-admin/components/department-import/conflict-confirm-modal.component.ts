import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConflictPreview {
  totalRows: number;
  validRows: number;
  errorRows: number;
  conflicts: Array<{ row: number; name: string; existing_id: string; value: string[] }>;
  to_insert: Array<{ row: number; name: string; value: string[] }>;
  items: Array<{ row: number; status: 'valid' | 'conflict' | 'error'; data: any; errors?: string[] }>;
}

export type ImportMode = 'overwrite' | 'merge';

export interface ConfirmEvent {
  mode: ImportMode;
}

@Component({
  selector: 'app-conflict-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2>匯入確認</h2>
          <button class="btn-icon" (click)="cancel.emit()"><i class="ri-close-line"></i></button>
        </header>

        <div class="modal-body">
          <!-- 概況 -->
          <div class="summary">
            <div class="stat">
              <span class="num">{{ preview().totalRows }}</span>
              <span class="label">總筆數</span>
            </div>
            <div class="stat stat--ok">
              <span class="num">{{ preview().to_insert.length }}</span>
              <span class="label">將新增</span>
            </div>
            <div class="stat stat--warn" [class.empty]="!preview().conflicts.length">
              <span class="num">{{ preview().conflicts.length }}</span>
              <span class="label">衝突（同名）</span>
            </div>
            @if (preview().errorRows > 0) {
              <div class="stat stat--error">
                <span class="num">{{ preview().errorRows }}</span>
                <span class="label">格式錯誤</span>
              </div>
            }
          </div>

          @if (preview().errorRows > 0) {
            <div class="alert alert-error">
              <i class="ri-error-warning-line"></i>
              有 {{ preview().errorRows }} 筆格式錯誤，請先回上一步修正後再匯入
            </div>
          }

          <!-- 衝突清單 -->
          @if (preview().conflicts.length) {
            <h3>同名衝突清單</h3>
            <p class="hint">下列部門名稱已存在於此公司，請選擇處理方式：</p>
            <div class="conflict-list">
              @for (c of preview().conflicts; track c.name) {
                <div class="conflict-row">
                  <span class="row-num">第 {{ c.row }} 列</span>
                  <strong>{{ c.name }}</strong>
                  <span class="existing-tag">已存在</span>
                </div>
              }
            </div>

            <div class="mode-section">
              <h4>匯入模式</h4>
              <label class="mode-option" [class.selected]="selectedMode() === 'merge'">
                <input type="radio" name="mode" value="merge"
                       [checked]="selectedMode() === 'merge'"
                       (change)="selectedMode.set('merge')" />
                <div>
                  <div class="mode-title">合併模式（建議）</div>
                  <div class="mode-desc">保留現有部門不動，僅新增 {{ preview().to_insert.length }} 個無衝突項；衝突的 {{ preview().conflicts.length }} 個項目跳過</div>
                </div>
              </label>
              <label class="mode-option" [class.selected]="selectedMode() === 'overwrite'">
                <input type="radio" name="mode" value="overwrite"
                       [checked]="selectedMode() === 'overwrite'"
                       (change)="selectedMode.set('overwrite')" />
                <div>
                  <div class="mode-title">覆蓋模式</div>
                  <div class="mode-desc">新增 {{ preview().to_insert.length }} 個無衝突項；同名 {{ preview().conflicts.length }} 個項目以匯入內容更新 Value（部門 ID 與員工綁定保留）</div>
                </div>
              </label>
            </div>
          } @else if (preview().to_insert.length) {
            <div class="alert alert-info">
              <i class="ri-checkbox-circle-line"></i>
              無衝突，將直接新增 {{ preview().to_insert.length }} 個部門。
            </div>
          } @else {
            <div class="alert alert-info">
              <i class="ri-information-line"></i>
              沒有可匯入的項目。
            </div>
          }
        </div>

        <footer class="modal-footer">
          <div class="left-actions">
            <button class="btn-secondary" (click)="back.emit()" [disabled]="executing()">
              <i class="ri-arrow-left-line"></i> 回上一步重新選擇
            </button>
          </div>
          <div class="right-actions">
            <button class="btn-secondary" (click)="cancel.emit()" [disabled]="executing()">取消</button>
            <button class="btn-primary"
                    [disabled]="preview().errorRows > 0 || (!preview().to_insert.length && !preview().conflicts.length) || executing()"
                    (click)="onConfirm()">
              @if (executing()) {
                <i class="ri-loader-4-line ri-spin"></i> 匯入中…
              } @else {
                確認匯入
              }
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./shared-modal.scss']
})
export class ConflictConfirmModalComponent {
  preview = input.required<ConflictPreview>();
  executing = input<boolean>(false);

  confirm = output<ConfirmEvent>();
  cancel = output<void>();
  back = output<void>();

  selectedMode = signal<ImportMode>('merge');

  onConfirm(): void {
    this.confirm.emit({ mode: this.selectedMode() });
  }
}
