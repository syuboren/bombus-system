# UI 標準化工作流程

將指定模組的 UI 頁面重構為符合系統設計系統的標準。

## 輸入參數
$ARGUMENTS 應包含：模組名稱與模組色變數（例如：「L4 專案管理 $color-l4-mauve」）

## 執行前準備
1. 讀取 `DESIGN_SYSTEM.md` 確認設計規範
2. 讀取 `bombus-system/CLAUDE.md` 確認 mixin 標準
3. 確認 `src/assets/styles/_variables.scss` 中的模組色彩變數

## 步驟

### 1. 分析模組
- 找出 `src/app/features/[module]/pages` 中所有頁面元件
- 檢查目前 HTML/SCSS 實作狀態
- 列出需要重構的項目清單

### 2. 逐頁重構
針對每個頁面元件執行：

**SCSS 檔案頂部**：加入 `$module-color: [色彩變數];`（在 imports 之後）

**篩選列 (Filter Bar)**:
- HTML: `.filter-bar` > `.filter-item` + `.filter-actions`
- SCSS: `@include filter-bar($module-color);`
- 如有視圖切換，移入 `.filter-actions` 內

**資料表格 (Data Table)**:
- HTML: `.table-wrapper` > `table.standard-table`
- SCSS 外層: `@include card; padding: 0; overflow: hidden;`
- SCSS 表格: `@include data-table($module-color);`
- **禁止**手動加 `border-bottom` 或 `background` 到 `th`

**按鈕 (Buttons)**:
- `@include button-base;`
- `@include button-module($module-color);`

**狀態標記 (Status Badges)**:
- `@include status-badge;`
- 模組色標記: `background: rgba($module-color, 0.15); color: $module-color;`

**視圖切換 (View Toggle)**:
- 使用共用 `<app-view-toggle>` 元件
- TS: `viewMode = signal<'list' | 'card'>('list');`
- HTML: `<app-view-toggle [viewMode]="viewMode()" [moduleColor]="'#hex'" (viewModeChange)="setViewMode($event)" />`
- mode 值統一用 `list`（非 `table`）

**變數清理**:
- 硬編碼色碼 → 共用變數（`$color-soft-gray`, `$color-text-dark`）
- 舊變數（`$color-l2-clay`, `$color-border`）→ 新系統變數

### 3. 驗證
- 確認無 "Undefined mixin" 錯誤
- 檢查無冗餘 CSS 或手動覆蓋
- 確認響應式佈局（篩選列手機堆疊）
- 執行 `cd bombus-system && npm start` 視覺確認與 L1/L2 一致

### 4. 報告
- 列出已重構的元件與變更摘要
- 標註任何需要注意的項目
