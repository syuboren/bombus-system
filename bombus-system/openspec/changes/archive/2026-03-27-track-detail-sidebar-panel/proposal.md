## Why

目前 L2 職能管理模組的職等職級矩陣頁面中，Tab B/C（管理職/專業職軌道明細表）使用「行展開 inline 編輯」方式，在表格行下方展開學歷要求、職責描述、技能培訓、晉升條件等欄位。此方式有兩個核心問題：

1. **資訊顯示不完整**：晉升條件在行展開區只顯示摘要（績效門檻 + 必備技能），無法完整呈現必修課程、KPI 指標、晉升程序等關鍵資訊，使用者需額外開啟 Modal 才能檢視完整內容
2. **晉升條件綁定不直覺**：「新增晉升條件」按鈕位於工具列，與特定職等沒有直觀的關聯性，使用者無法一眼看出「從哪個職等晉升到哪個職等」

改為與 Tab A（職等職級薪資對照表）一致的**側邊面板**編輯方式，可統一操作體驗，並將晉升條件管理嵌入面板內、自動綁定來源職等，提升操作直覺性。

## What Changes

- **新增** `track-detail-edit-panel` 側邊面板元件：420px 右側滑入面板，整合軌道資訊編輯（職稱、學歷、職責、技能）與晉升條件管理（績效門檻、技能、課程、KPI、附加條件）
- **移除** Tab B/C 的行展開 inline 編輯區塊（`row-detail-expand`）
- **移除** 工具列中獨立的「新增晉升條件」按鈕（晉升條件改由面板內管理）
- **修改** Tab B/C 表格行點擊行為：從展開行內明細改為開啟側邊面板
- **保留** 部門×職位名稱的 inline 編輯功能不變

## Non-goals（不在範圍內）

- 不修改 Tab A（職等職級薪資對照表）的 `grade-edit-panel` 元件
- 不修改後端 API 端點或資料庫 schema
- 不刪除 `promotion-criteria-edit-modal` 元件（其他頁面可能仍在使用）
- 不修改 position inline 編輯邏輯

## Capabilities

### New Capabilities

- `track-detail-sidebar`: 軌道明細側邊面板 — 在職等職級矩陣的軌道明細 Tab 中，以右側滑入面板的形式統一管理單一職等的軌道資訊與晉升條件

### Modified Capabilities

（無既有 spec 需要修改）

## Impact

- **影響模組**：L2 職能管理 (`/competency`)
- **影響路由**：`/competency/grade-matrix`
- **新增檔案**：
  - `src/app/features/competency/components/track-detail-edit-panel/track-detail-edit-panel.component.ts`
  - `src/app/features/competency/components/track-detail-edit-panel/track-detail-edit-panel.component.html`
  - `src/app/features/competency/components/track-detail-edit-panel/track-detail-edit-panel.component.scss`
- **修改檔案**：
  - `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts`
  - `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html`
  - `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss`
- **API 依賴**（不修改，僅消費）：
  - `PUT /api/grade-matrix/track-entries/:id`（更新軌道條目）
  - `POST /api/grade-matrix/grades/:grade/tracks`（新增軌道條目）
  - `POST /api/grade-matrix/promotion/criteria`（新增晉升條件）
  - `PUT /api/grade-matrix/promotion/criteria/:id`（更新晉升條件）
