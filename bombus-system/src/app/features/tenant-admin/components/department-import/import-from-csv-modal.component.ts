import { Component, ChangeDetectionStrategy, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CsvSelectedItemsEvent {
  items: Array<{ name: string; code?: string; value: string[] }>;
  fileName: string;
}

interface ParsedRow {
  row: number;
  name: string;
  code: string;
  value: string[];
  errors: string[];
}

const MAX_ROWS = 1000;

@Component({
  selector: 'app-import-from-csv-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal-backdrop" (click)="cancel.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2>批次匯入部門 (CSV)</h2>
          <button class="btn-icon" (click)="cancel.emit()"><i class="ri-close-line"></i></button>
        </header>

        <div class="modal-body">
          <!-- CSV 檔案上傳 -->
          @if (parsed().length === 0 && !error()) {
            <div class="csv-uploader">
              <i class="ri-upload-cloud-2-line"></i>
              <p><strong>支援格式：</strong>UTF-8 / UTF-8 BOM 編碼的 CSV 檔</p>
              <p>
                <strong>欄位：</strong>
                name（必填，部門名稱）/ code（選填，部門代碼）/ value（選填，以 <code>;</code> 或換行分隔的條列項）
              </p>
              <p><strong>限制：</strong>單次最多 {{ MAX_ROWS }} 列</p>
              <input #fileInput type="file" accept=".csv,text/csv"
                     (change)="onFileSelected($any($event.target).files)"
                     class="hidden-file-input" />
              <div class="uploader-actions">
                <button type="button" class="btn-primary" (click)="fileInput.click()">
                  <i class="ri-folder-open-line"></i> 選擇 CSV 檔
                </button>
                <button type="button" class="btn-secondary" (click)="downloadSampleCsv()">
                  <i class="ri-download-line"></i> 下載範例檔
                </button>
              </div>
              @if (fileName()) {
                <div class="file-info">已選：{{ fileName() }}</div>
              }
            </div>
            <details class="csv-help">
              <summary>CSV 範例（內容預覽）</summary>
              <pre>name,code,value
人資部,HR-001,招募;教育訓練;員工關係
財務部,FN-001,財務規劃;會計處理
研發部,RD-001,新產品開發;技術研究</pre>
              <p class="csv-help-note">
                提示：value 欄位中的條列項以分號 <code>;</code> 分隔。code 欄位可留空，未填者由系統自動生成（D-15 啟用後）。Excel 開啟若中文亂碼，請另存為「CSV UTF-8 (逗號分隔)」格式。
              </p>
            </details>
          }

          @if (error(); as msg) {
            <div class="alert alert-error">
              <i class="ri-error-warning-line"></i> {{ msg }}
              <button class="btn-text" (click)="reset()">重新上傳</button>
            </div>
          }

          <!-- 已解析資料預覽 -->
          @if (parsed().length > 0) {
            <div class="summary">
              <div class="stat">
                <span class="num">{{ parsed().length }}</span>
                <span class="label">總列數</span>
              </div>
              <div class="stat stat--ok">
                <span class="num">{{ validCount() }}</span>
                <span class="label">有效</span>
              </div>
              @if (errorCount() > 0) {
                <div class="stat stat--error">
                  <span class="num">{{ errorCount() }}</span>
                  <span class="label">錯誤</span>
                </div>
              }
            </div>

            @if (errorCount() > 0) {
              <div class="alert alert-error">
                <i class="ri-error-warning-line"></i>
                有 {{ errorCount() }} 列格式錯誤，請修正後重新上傳。
              </div>
            }

            <div class="parsed-list">
              <table>
                <thead>
                  <tr>
                    <th style="width: 60px">列</th>
                    <th>name</th>
                    <th style="width: 120px">code</th>
                    <th>value</th>
                    <th style="width: 220px">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of parsed(); track r.row) {
                    <tr [class.error-row]="r.errors.length > 0">
                      <td>{{ r.row }}</td>
                      <td>{{ r.name || '—' }}</td>
                      <td>
                        @if (r.code) {
                          <code class="code-cell">{{ r.code }}</code>
                        } @else {
                          <span class="muted">—</span>
                        }
                      </td>
                      <td>
                        @if (r.value.length) {
                          {{ r.value.join('、') }}
                        } @else {
                          <span class="muted">—</span>
                        }
                      </td>
                      <td>
                        @if (r.errors.length === 0) {
                          <span class="badge badge-specific">OK</span>
                        } @else {
                          <span class="badge badge-error">{{ r.errors.join('；') }}</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <footer class="modal-footer">
          <div class="left-actions">
            @if (parsed().length > 0) {
              <button class="btn-secondary" (click)="reset()">重新上傳</button>
            }
          </div>
          <div class="right-actions">
            <button class="btn-secondary" (click)="cancel.emit()">取消</button>
            <button class="btn-primary"
                    [disabled]="validCount() === 0 || errorCount() > 0"
                    (click)="onConfirm()">
              下一步：確認匯入（{{ validCount() }} 列）
            </button>
          </div>
        </footer>
      </div>
    </div>
  `,
  styleUrls: ['./shared-modal.scss', './import-modal.scss'],
  styles: [`
    .csv-help {
      margin-top: 12px;
      summary { cursor: pointer; color: #6b7280; font-size: 13px; }
      pre {
        background: rgba(0,0,0,0.04);
        padding: 12px;
        border-radius: 8px;
        margin-top: 8px;
        font-size: 12px;
        font-family: 'JetBrains Mono', monospace;
      }
      .csv-help-note {
        font-size: 12px;
        color: #6b7280;
        margin-top: 8px;
        line-height: 1.5;
      }
    }
    code { background: rgba(0,0,0,0.06); padding: 1px 6px; border-radius: 4px; font-family: monospace; }
    .muted { color: #6b7280; }
    .code-cell {
      background: rgba(0,0,0,0.04);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 12px;
    }
    .uploader-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .hidden-file-input {
      display: none !important;
    }
  `]
})
export class ImportFromCsvModalComponent {
  readonly MAX_ROWS = MAX_ROWS;

  selected = output<CsvSelectedItemsEvent>();
  cancel = output<void>();

  parsed = signal<ParsedRow[]>([]);
  error = signal<string | null>(null);
  fileName = signal<string>('');

  validCount(): number { return this.parsed().filter(r => r.errors.length === 0).length; }
  errorCount(): number { return this.parsed().filter(r => r.errors.length > 0).length; }

  async onFileSelected(files: FileList | null): Promise<void> {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error.set('檔案格式錯誤，僅支援 .csv 副檔名');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('檔案過大（>5MB），請拆分後再上傳');
      return;
    }

    this.fileName.set(file.name);

    try {
      const text = await this.readAsUtf8(file);
      const rows = this.parseCsv(text);
      if (rows.length === 0) {
        this.error.set('CSV 內容為空，請確認檔案有資料列');
        return;
      }
      if (rows.length > MAX_ROWS) {
        this.error.set(`筆數超過上限（${MAX_ROWS}），請拆分後再上傳`);
        return;
      }
      this.parsed.set(rows);
      this.error.set(null);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'CSV 解析失敗');
    }
  }

  /**
   * 讀取檔案為 UTF-8 文字（自動偵測並剝離 BOM）
   * 拒絕非 UTF-8 編碼（如 Big5）— 透過嘗試 UTF-8 decode 檢查
   */
  private async readAsUtf8(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);

    // 偵測 + 剝離 UTF-8 BOM (EF BB BF)
    let start = 0;
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      start = 3;
    }

    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return decoder.decode(bytes.slice(start));
    } catch {
      throw new Error('檔案編碼非 UTF-8（可能為 Big5 或其他編碼），請另存為 UTF-8 後再上傳');
    }
  }

  /**
   * 簡易 CSV 解析（支援雙引號跳脫、逗號分隔）
   * 第一列為 header，需含 `name` 欄；可選 `value` 欄
   */
  private parseCsv(text: string): ParsedRow[] {
    const lines = this.splitCsvLines(text);
    if (lines.length < 1) return [];

    const headers = this.parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const codeIdx = headers.indexOf('code');
    const valueIdx = headers.indexOf('value');

    if (nameIdx < 0) {
      throw new Error('CSV 標頭缺少必要欄位「name」');
    }

    const result: ParsedRow[] = [];
    const seenName = new Map<string, number>(); // 同檔內重名檢查
    const seenCode = new Map<string, number>(); // 同檔內重複 code 檢查

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue; // 跳過空行
      const cells = this.parseCsvLine(line);
      const errors: string[] = [];

      const rawName = (cells[nameIdx] || '').trim();
      const rawCode = codeIdx >= 0 ? (cells[codeIdx] || '').trim() : '';
      const rawValue = valueIdx >= 0 ? (cells[valueIdx] || '').trim() : '';

      if (!rawName) {
        errors.push('name 欄位不可為空');
      } else if (rawName.length > 100) {
        errors.push('name 超過 100 字元');
      }

      // code 驗證（選填，但有提供時需檢查格式）
      if (rawCode) {
        if (rawCode.length > 50) {
          errors.push('code 超過 50 字元');
        }
        const prevCode = seenCode.get(rawCode);
        if (prevCode !== undefined) {
          errors.push(`code「${rawCode}」與第 ${prevCode} 列重複`);
        } else {
          seenCode.set(rawCode, i);
        }
      }

      // value 解析：支援 ; / 全形分號 / 換行 分隔
      const valueArr = rawValue
        ? rawValue.split(/[;；\n]/).map(s => s.trim()).filter(s => s)
        : [];

      // 同檔重名檢查
      if (rawName) {
        const prev = seenName.get(rawName);
        if (prev !== undefined) {
          errors.push(`與第 ${prev} 列同名`);
        } else {
          seenName.set(rawName, i);
        }
      }

      result.push({ row: i, name: rawName, code: rawCode, value: valueArr, errors });
    }

    return result;
  }

  /** 將 CSV 文字依 \r\n / \n / \r 分行（支援雙引號內含換行） */
  private splitCsvLines(text: string): string[] {
    const lines: string[] = [];
    let curr = '';
    let inQuote = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        // 處理 ""（跳脫的雙引號）
        if (inQuote && text[i + 1] === '"') {
          curr += '""';
          i++;
        } else {
          inQuote = !inQuote;
          curr += ch;
        }
      } else if (!inQuote && (ch === '\n' || ch === '\r')) {
        // 行結尾
        if (ch === '\r' && text[i + 1] === '\n') i++; // 跳過 \n
        lines.push(curr);
        curr = '';
      } else {
        curr += ch;
      }
    }
    if (curr) lines.push(curr);
    return lines;
  }

  /** 解析單一 CSV 行為欄位陣列 */
  private parseCsvLine(line: string): string[] {
    const cells: string[] = [];
    let curr = '';
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          curr += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (ch === ',' && !inQuote) {
        cells.push(curr);
        curr = '';
      } else {
        curr += ch;
      }
    }
    cells.push(curr);
    return cells;
  }

  reset(): void {
    this.parsed.set([]);
    this.error.set(null);
    this.fileName.set('');
  }

  /**
   * 產生並下載 CSV 範例檔（UTF-8 BOM 確保 Excel 不亂碼）
   */
  downloadSampleCsv(): void {
    const sample = [
      'name,code,value',
      '人資部,HR-001,招募;教育訓練;員工關係;薪酬福利',
      '財務部,FN-001,財務規劃;會計處理;稅務管理',
      '資訊部,IT-001,系統維運;資安管理;網路維護',
      '行政管理部,AD-001,行政庶務;採購支援;辦公室管理',
      '業務部,SA-001,業務開發;客戶關係維護;銷售目標達成',
      '行銷部,MK-001,品牌推廣;行銷企劃;數位行銷',
      '研發部,RD-001,新產品開發;技術研究',
      '客戶服務部,CS-001,客戶問題處理;售後服務'
    ].join('\n');

    // BOM (﻿) 確保 Excel 開啟時 UTF-8 中文不亂碼
    const blob = new Blob(['﻿' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `部門匯入範例_${this.formatDate()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private formatDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  onConfirm(): void {
    const items = this.parsed()
      .filter(r => r.errors.length === 0)
      .map(r => {
        const item: { name: string; code?: string; value: string[] } = {
          name: r.name,
          value: r.value
        };
        if (r.code) item.code = r.code;
        return item;
      });
    this.selected.emit({ items, fileName: this.fileName() });
  }
}
