---
name: bombus-ui-design-system
description: Core UI/UX design guidelines for Bombus System, based on the IDP (Interface Design Plan). Focuses on Morandi colors, Soft UI, and module-specific layouts.
---

# Bombus UI Design System

本規範整合自「介面設計規劃文件 (IDP)」，旨在確保系統視覺風格的一致性。

## 1. 色彩規範 (Color Palette) - 莫蘭迪色系 (Morandi)

### A. 基礎色調 (Neutrals)
- `--color-bg-base`: `#F5F5F7` (雲霧灰 - 溫潤的背景底色)
- `--color-bg-card`: `#FCFCFD` (極致灰白 - 卡片與內容區塊)
- `--color-text-primary`: `#464E56` (岩石灰 - 主要標題)
- `--color-text-secondary`: `#858E96` (迷霧灰 - 次要資訊)
- `--color-border`: `#E2E4E8` (淡灰 - 柔和邊界)

### B. 模組視覺色 (Module Semantic Tokens)
每個模組有其專屬識別色，用於圖示、標籤與強調區塊：
- **L1 員工管理 (Green)**: `#8DA399` (鼠尾草綠)
- **L2 職能管理 (Orange)**: `#D6A28C` (陶土橙)
- **L3 教育訓練 (Teal)**: `#7F9CA0` (復古藍綠)
- **L4 專案管理 (Purple)**: `#9A8C98` (錦葵紫)
- **L5 績效管理 (Red)**: `#B87D7B` (磚紅)
- **L6 文化管理 (Pink)**: `#C4A4A1` (乾燥玫瑰)

## 2. 視覺風格與佈局 (Visual Style & Layout)

- **核心風格**: **Soft UI** (柔和介面)。
- **圓角 (Radius)**: 統一 `12px`。
- **陰影 (Shadow)**: `0 4px 20px rgba(0,0,0,0.05)` (懸浮感而非厚重感)。
- **留白 (Whitespace)**: 確保足夠留白，避免視覺擁擠。

## 3. 組件實作標準 (Component Standards)

### A. 篩選列 (Filter Bar)
- **結構**: 使用 `.filter-bar` 包裹 `.filter-item` 與 `.filter-actions`。
- **SCSS**: 必須引用 `@include filter-bar($module-color);`。

### B. 資料表格 (Data Table)
- **結構**: 使用 `.table-wrapper` (套用 `@include card;`) 包裹 `.standard-table`。
- **SCSS**: 必須引用 `@include data-table($module-color);`。

### C. 按鈕 (Buttons)
- **基礎**: `@include button-base;`
- **模組主色**: `@include button-module($module-color);`

## 4. 模組呈現路徑 (Module Patterns)
- **L1.2 員工檔案**: 使用 **Profile Card (個人化數據卡片)** 佈局。
- **L2.2 職務說明書**: 使用 **Document Editor (文件編輯器)** 視圖。
- **L3.2 課程地圖**: 使用 **Elegant Matrix (數據矩陣)** 視圖。
- **L4.1 任務管理**: 使用 **Kanban (看板)** 或 **Tree List (樹狀列表)**。

---
*請在開發任何 UI 功能前，先比對上述規範。*
