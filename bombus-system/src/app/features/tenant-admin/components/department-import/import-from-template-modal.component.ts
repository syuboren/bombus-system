import { Component, ChangeDetectionStrategy, inject, signal, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService } from '../../../organization/services/organization.service';
import { CompanySize } from '../../../platform-admin/models/platform.model';

interface IndustryOption {
  code: string;
  name: string;
  display_order: number;
}

interface TemplateRow {
  template_id: string;
  name: string;
  value: string[];
  is_common: boolean;
  applicable_sizes: CompanySize[];
  pre_checked: boolean;
  selected: boolean;
}

const SIZE_OPTIONS: Array<{ code: CompanySize; label: string; hint: string }> = [
  { code: 'micro', label: '微型', hint: '1-10 人 / 扁平化' },
  { code: 'small', label: '小型', hint: '10-50 人 / 功能型' },
  { code: 'medium', label: '中型', hint: '50-200 人 / 事業部' },
  { code: 'large', label: '大型', hint: '200+ 人 / 矩陣型' }
];

export interface SelectedItemsEvent {
  items: Array<{ name: string; value: string[] }>;
}

@Component({
  selector: 'app-import-from-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2>從範本庫導入部門</h2>
          <button class="btn-icon" (click)="cancel.emit()"><i class="ri-close-line"></i></button>
        </header>

        <div class="modal-body">
          <div class="filters">
            <div class="form-group">
              <label>產業 <span class="required">*</span></label>
              <select [value]="selectedIndustry()"
                      (change)="onIndustryChange($any($event.target).value)">
                <option value="">請選擇產業</option>
                @for (ind of industries(); track ind.code) {
                  <option [value]="ind.code">{{ ind.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>公司規模 <span class="required">*</span></label>
              <select [value]="selectedSize()"
                      (change)="onSizeChange($any($event.target).value)"
                      [disabled]="!selectedIndustry()">
                <option value="">請選擇規模</option>
                @for (s of SIZE_OPTIONS; track s.code) {
                  <option [value]="s.code">{{ s.label }} — {{ s.hint }}</option>
                }
              </select>
            </div>
          </div>

          @if (loading()) {
            <div class="loading">載入範本中…</div>
          } @else if (rows().length === 0 && selectedIndustry() && selectedSize()) {
            <div class="alert alert-info">
              <i class="ri-information-line"></i>
              此產業尚無可用的部門範本，請聯絡平台管理員。
            </div>
          } @else if (rows().length > 0) {
            <div class="toolbar">
              <button class="btn-text" (click)="selectAll()">全選</button>
              <button class="btn-text" (click)="deselectAll()">全取消</button>
              <button class="btn-text" (click)="resetToSmartDefaults()">恢復智慧預設</button>
              <span class="counter">已選 {{ selectedCount() }} / {{ rows().length }}</span>
            </div>

            <div class="template-list">
              @for (row of rows(); track row.template_id) {
                <label class="template-row" [class.checked]="row.selected">
                  <input type="checkbox"
                         [checked]="row.selected"
                         (change)="toggleRow(row.template_id)" />
                  <div class="row-content">
                    <div class="row-head">
                      <strong>{{ row.name }}</strong>
                      @if (row.is_common) {
                        <span class="badge badge-common">共通</span>
                      } @else {
                        <span class="badge badge-specific">專屬</span>
                      }
                      @if (row.pre_checked) {
                        <span class="badge badge-pre">智慧預設</span>
                      }
                    </div>
                    <div class="row-meta">
                      <span class="meta-label">適用規模：</span>
                      @for (s of row.applicable_sizes; track s) {
                        <span class="size-pill">{{ sizeLabel(s) }}</span>
                      }
                    </div>
                    @if (row.value.length) {
                      <div class="row-value">
                        @for (v of row.value; track $index) {
                          <span class="value-chip">{{ v }}</span>
                        }
                      </div>
                    }
                  </div>
                </label>
              }
            </div>
          } @else {
            <div class="alert alert-info">
              <i class="ri-information-line"></i>
              請選擇產業與規模以列出範本。
            </div>
          }

          @if (error(); as msg) {
            <div class="alert alert-error">
              <i class="ri-error-warning-line"></i> {{ msg }}
            </div>
          }
        </div>

        <footer class="modal-footer footer-end">
          <button class="btn-secondary" (click)="cancel.emit()">取消</button>
          <button class="btn-primary"
                  [disabled]="selectedCount() === 0"
                  (click)="onConfirm()">
            下一步：確認匯入（{{ selectedCount() }} 個部門）
          </button>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./shared-modal.scss', './import-modal.scss']
})
export class ImportFromTemplateModalComponent implements OnInit {
  private organizationService = inject(OrganizationService);

  readonly SIZE_OPTIONS = SIZE_OPTIONS;

  selected = output<SelectedItemsEvent>();
  cancel = output<void>();

  industries = signal<IndustryOption[]>([]);
  selectedIndustry = signal<string>('');
  selectedSize = signal<CompanySize | ''>('');

  rows = signal<TemplateRow[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    // 使用 tenant-side 唯讀端點（無需 platform admin 權限）
    this.organizationService.getIndustriesForTenant(true).subscribe({
      next: (rows) => this.industries.set(rows),
      error: () => this.error.set('載入產業清單失敗')
    });
  }

  onIndustryChange(val: string): void {
    this.selectedIndustry.set(val);
    this.maybeLoadTemplates();
  }

  onSizeChange(val: string): void {
    this.selectedSize.set(val as CompanySize | '');
    this.maybeLoadTemplates();
  }

  private maybeLoadTemplates(): void {
    const industry = this.selectedIndustry();
    const size = this.selectedSize();
    if (!industry || !size) {
      this.rows.set([]);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.organizationService.getDepartmentTemplates(industry, size).subscribe({
      next: (resp) => {
        this.rows.set(resp.departments.map(d => ({
          template_id: d.template_id,
          name: d.name,
          value: d.value,
          is_common: d.is_common,
          applicable_sizes: d.applicable_sizes as CompanySize[],
          pre_checked: d.pre_checked,
          selected: d.pre_checked
        })));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || '載入範本失敗');
        this.loading.set(false);
      }
    });
  }

  toggleRow(id: string): void {
    this.rows.update(arr => arr.map(r => r.template_id === id ? { ...r, selected: !r.selected } : r));
  }

  selectAll(): void {
    this.rows.update(arr => arr.map(r => ({ ...r, selected: true })));
  }

  deselectAll(): void {
    this.rows.update(arr => arr.map(r => ({ ...r, selected: false })));
  }

  resetToSmartDefaults(): void {
    this.rows.update(arr => arr.map(r => ({ ...r, selected: r.pre_checked })));
  }

  selectedCount(): number {
    return this.rows().filter(r => r.selected).length;
  }

  onConfirm(): void {
    const items = this.rows().filter(r => r.selected).map(r => ({
      name: r.name,
      value: r.value
    }));
    this.selected.emit({ items });
  }

  sizeLabel(code: CompanySize): string {
    return SIZE_OPTIONS.find(s => s.code === code)?.label || code;
  }
}
