<!-- SPECTRA:START v1.0.0 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `openspec/specs/`, change proposals in `openspec/changes/`.

## Use `/spectra:*` skills when:

- A discussion needs structure before coding → `/spectra:discuss`
- User wants to plan, propose, or design a change → `/spectra:propose`
- Tasks are ready to implement → `/spectra:apply`
- There's an in-progress change to continue → `/spectra:ingest`
- User asks about specs or how something works → `/spectra:ask`
- Implementation is done → `/spectra:verify` then `/spectra:archive`

## Workflow

discuss? → propose → apply ⇄ ingest → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

<!-- SPECTRA:END -->

# Bombus System - Angular 子專案規範

本檔案為 `bombus-system/` 目錄的作用域規則，補充根目錄 CLAUDE.md 的通用規範。

## 設計系統速查

### 莫蘭迪色系模組色 (Module Colors)
| 模組 | 色名 | 色碼 | SCSS 變數 |
|------|------|------|-----------|
| L1 員工管理 | 鼠尾草綠 | #8DA399 | `$color-l1-sage` |
| L2 職能管理 | 陶土橙 | #D6A28C | `$color-l2-terracotta` |
| L3 教育訓練 | 復古藍綠 | #7F9CA0 | `$color-l3-petrol` |
| L4 專案管理 | 錦葵紫 | #9A8C98 | `$color-l4-mauve` |
| L5 績效管理 | 磚紅 | #B87D7B | `$color-l5-brick` |
| L6 文化管理 | 乾燥玫瑰 | #C4A4A1 | `$color-l6-rose` |

### 視覺風格
- **核心風格**: Soft UI（柔和、輕盈、懸浮感）
- **圓角**: 統一 `12px`
- **陰影**: `box-shadow: 0 4px 20px rgba(0,0,0,0.05)`
- **留白**: 充分留白（p-6 / 24px），避免視覺擁擠

### 元件 SCSS Mixin 標準

開發 UI 時，必須使用以下 mixin（定義於 `src/assets/styles/_mixins.scss`）：

| 元件 | HTML 結構 | SCSS 用法 |
|------|-----------|-----------|
| 篩選列 | `.filter-bar` > `.filter-item` + `.filter-actions` | `@include filter-bar($module-color)` |
| 資料表格 | `.table-wrapper` > `table.standard-table` | 外層 `@include card; padding: 0; overflow: hidden;`，表格 `@include data-table($module-color)` |
| 按鈕 | - | `@include button-base` + `@include button-module($module-color)` |
| 狀態標記 | - | `@include status-badge` |
| 視圖切換 | `<app-view-toggle>` | mode 值統一用 `list`（非 `table`） |

**關鍵提醒**:
- 資料表格：**禁止**手動加 `border-bottom` 或 `background` 到 `th`，讓 mixin 處理
- 視圖切換：優先使用共用 `ViewToggleComponent`，active 按鈕用實色模組色背景 + 白色圖示
- 模組色變數標記：SCSS 檔案頂部定義 `$module-color: $color-lX-xxx;`
- 硬編碼色碼替換為共用變數（`$color-soft-gray`, `$color-text-dark` 等）

### 模組呈現路徑
| 模組功能 | 推薦佈局 |
|----------|----------|
| L1.2 員工檔案 | Profile Card（個人化數據卡片）|
| L2.2 職務說明書 | Document Editor（文件編輯器）|
| L3.2 課程地圖 | Elegant Matrix（數據矩陣）|
| L4.1 任務管理 | Kanban（看板）或 Tree List（樹狀列表）|

### SCSS 變數與 Mixin 位置
- 色彩與間距變數：`src/assets/styles/_variables.scss`
- 元件 Mixins：`src/assets/styles/_mixins.scss`

## UI/UX 交付前檢核

- [ ] 留白充足、元素對齊、樣式一致
- [ ] 空狀態有友善的插圖或訊息
- [ ] Hover 效果、Loading 狀態（Skeleton/Spinner）、成功/錯誤 Toast
- [ ] `cursor: pointer` 在所有可點擊元素上
- [ ] 響應式佈局 375px ~ 1920px 無水平捲軸
- [ ] 篩選列在手機上正確堆疊

## 詳細參考文件
- 完整色彩、排版、互動規範 → `DESIGN_SYSTEM.md`（根目錄）
- Web 品質與 A11y 指南 → `WEB_GUIDELINES.md`（根目錄）
