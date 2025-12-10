# Metronic 模版對應與實作計劃

本文件詳細規劃如何利用 Metronic HTML 模版來實作 Bombus V6.0 的三大優先模組。

## 1. L3.2 多層次人才地圖 (Talent Map Engine)

**目標**: 可視化組織能力與人才分佈，支援互動式決策。

| 功能區塊 | Metronic 參考模版 | 實作策略 |
| :--- | :--- | :--- |
| **主儀表板佈局** | `dashboards/ecommerce.html` | 使用其頂部 KPI 卡片與中間的主要圖表區塊作為佈局基礎。 |
| **職能熱力圖** | `widgets/charts.html` (Heatmap) | 使用 ApexCharts 的 Heatmap 類型，客製化顏色範圍 (紅-黃-綠) 代表職能強弱。 |
| **人才九宮格** | `apps/file-manager/folders.html` (Grid View) | 修改 Grid 佈局為 3x3 矩陣。每個格子內使用 `widgets/lists.html` 的樣式來顯示員工卡片 (頭像+姓名)。支援 Drag & Drop。 |
| **學習路徑圖** | `dashboards/logistics.html` (Timeline) | 使用 Timeline widget 來呈現學習階段。結合 `dashboards/online-courses.html` 的課程卡片樣式。 |
| **員工列表/鑽取** | `apps/user-management/users/list.html` | 標準的 DataTable，用於顯示部門詳細人員清單。 |

## 2. L1.1 AI 智能面試系統 (AI Interview System)

**目標**: 展示 AI 語音分析、情緒偵測與自動評分。

| 功能區塊 | Metronic 參考模版 | 實作策略 |
| :--- | :--- | :--- |
| **候選人檔案** | `pages/user-profile/overview.html` | 左側顯示個人資訊，右側顯示評分概況。 |
| **面試逐字稿** | `apps/chat/private.html` | 使用聊天室介面呈現逐字稿。將 "對方" 設為候選人，"我方" 設為面試官。在文字旁加入情緒標籤 (Badge)。 |
| **情緒/能力分析** | `widgets/charts.html` (Radar, Area) | **雷達圖**: 展示 5-6 個維度的能力評分。<br>**區域圖**: 展示面試過程中的情緒起伏 (時間軸)。 |
| **AI 評分報告** | `apps/invoices/view/invoice-1.html` | 修改發票模版為 "評估報告書"，包含各項分數與 AI 總評。 |

## 3. L4.3 損益預測引擎 (P&L Prediction Engine)

**目標**: 財務預警與情境模擬。

| 功能區塊 | Metronic 參考模版 | 實作策略 |
| :--- | :--- | :--- |
| **財務儀表板** | `dashboards/finance-performance.html` | 直接套用。包含收入、支出、淨利潤的圖表。 |
| **預測趨勢圖** | `widgets/charts.html` (Line/Area) | 實線顯示歷史數據，虛線顯示 AI 預測數據 (ApexCharts 支援 dashed lines)。 |
| **風險預警** | `widgets/lists.html` (Alerts) | 使用帶顏色的 Alert 組件或 Modal (`authentication/general/error-500.html` 的風格) 來製作全螢幕或醒目的預警彈窗。 |
| **專案預算表** | `apps/projects/budget.html` | 使用既有的預算表格，加入 "預測完工成本 (EAC)" 欄位。 |

## 資源準備清單

1.  **ApexCharts 配置檔**: 準備 Heatmap, Radar, Line (Dashed) 的設定 JSON。
2.  **假資料生成**: 為上述圖表準備逼真的 JSON 數據 (符合 Bombus 業務場景)。
3.  **圖示集**: 確認 Metronic 內建的 Duotone/Outline Icons 是否足夠，或需引入 FontAwesome。
