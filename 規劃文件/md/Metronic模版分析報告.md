# Metronic 模版頁面詳細分析報告

本報告詳細分析了 Metronic HTML 模版中的主要頁面內容與圖表呈現方式，旨在協助 Bombus 專案開發時能快速對應所需功能。

## 1. 儀表板 (Dashboards)

儀表板是 Metronic 的核心，提供了多種業務場景的數據可視化佈局。

### 1.1 電子商務儀表板 (eCommerce Dashboard)
*   **檔案路徑**: `dashboards/ecommerce.html`
*   **頁面用途**: 專為線上商店設計，監控銷售、訂單與客戶數據。
*   **詳細內容**:
    *   **頂部工具列**: 包含「管理銷售 (Manage Sales)」與「新增產品 (Add Product)」的快速按鈕。
    *   **關鍵指標卡片 (Key Metrics Cards)**:
        *   **預期收益 (Expected Earnings)**: 顯示金額與成長率，並附帶一個小型長條圖 (Bar Chart) 顯示不同類別 (Shoes, Gaming, Others) 的收益分佈。
        *   **本月訂單 (Orders This Month)**: 顯示訂單數與目標達成率的進度條 (Progress Bar)。
        *   **平均日銷售 (Average Daily Sales)**: 顯示金額與成長率，附帶一個小型折線圖 (Line Chart)。
        *   **本月新客戶 (New Customers This Month)**: 顯示客戶數，並列出「今日英雄 (Today's Heroes)」的用戶頭像列表。
    *   **本月銷售圖表 (Sales This Months)**:
        *   **呈現方式**: 大型區域圖 (Area Chart) 或長條圖，顯示整個月的銷售趨勢。
        *   **功能**: 包含「快速動作」選單 (新增工單、新客戶等) 與統計摘要 (目前金額、距離目標金額)。
    *   **近期訂單列表 (Recent Orders Table)**:
        *   **呈現方式**: 表格形式，包含商品圖片、名稱、數量、單價、總價。
        *   **互動功能**: 支援分頁籤 (Tabs) 切換不同商品類別 (T-shirt, Gaming, Watch, Gloves, Shoes)，方便快速查看各類別的近期訂單。

### 1.2 物流儀表板 (Logistics Dashboard)
*   **檔案路徑**: `dashboards/logistics.html`
*   **頁面用途**: 追蹤貨運、車隊與配送狀態。
*   **詳細內容**:
    *   **快速新增貨運 (New Shipment Widget)**: 一個引導式的卡片，包含插圖與「立即開始」按鈕。
    *   **貨運統計圖表**:
        *   **總線上銷售 (Total Online Sales)**: 顯示噸數 (Tons)，附帶圖表。
        *   **預期收益 (Expected Earnings)**: 使用 **甜甜圈圖 (Donut Chart)** 顯示不同運輸方式 (卡車、輪船、飛機) 的佔比。
        *   **總貨運量 (Total Shipments)**: 顯示總數與趨勢圖。
    *   **貨運歷史 (Shipment History)**:
        *   **呈現方式**: 時間軸列表 (Timeline)，顯示貨物的運送狀態 (如 "Delivered", "Shipping", "Delayed")。
        *   **互動功能**: 分頁籤切換 "Notable", "Delivered", "Shipping" 等不同狀態的貨運記錄。每個記錄包含地點、時間與相關人員。

### 1.3 行銷儀表板 (Marketing Dashboard)
*   **檔案路徑**: `dashboards/marketing.html`
*   **頁面用途**: 監控行銷活動成效、社群媒體數據與廣告投放。
*   **詳細內容**:
    *   **亮點數據 (Highlights)**:
        *   顯示「平均客戶評分 (Avg. Client Rating)」、「Instagram 追蹤者」、「Google Ads CPC」等關鍵指標。
        *   使用帶有圖示的列表呈現，簡潔明瞭。
    *   **外部連結 (External Links)**: 列出常用的外部工具連結 (如 Google Analytics, Facebook Ads, Seranking)，方便快速跳轉。
    *   **精選活動 (Featured Campaigns)**:
        *   **呈現方式**: 表格列表，顯示 Email 標題、狀態 (Sent, In Draft, In Queue) 與轉換率 (Conversion)。
        *   **互動功能**: 透過分頁籤切換不同品牌的活動數據 (如 Beats, Amazon, BP, Slack)。

### 1.4 其他儀表板概覽
*   **Multipurpose (`index.html`)**: 綜合型儀表板，包含多種通用 Widget，適合做為系統首頁。
*   **Finance Performance (`finance-performance.html`)**: 專注於財務報表，包含收支曲線圖、淨利潤分析等。
*   **Store Analytics (`store-analytics.html`)**: 實體店面或特定分店的分析，可能包含人流、庫存周轉率等圖表。
*   **Social (`social.html`)**: 社群媒體專用，包含粉絲成長趨勢、貼文互動率等圖表。
*   **Crypto (`crypto.html`)**: 加密貨幣交易儀表板，包含即時匯率、資產分佈 (Pie Chart)、交易歷史等。

## 2. 應用程式 (Apps)

Metronic 的 Apps 模組提供了完整的業務流程頁面。

### 2.1 電子商務 (eCommerce)
*   **Catalog (產品目錄)**:
    *   `products.html`: 產品列表，支援搜尋、篩選 (價格、類別)、狀態標籤 (Published, Inactive)。
    *   `add-product.html`: 複雜的表單頁面，包含基本資訊、媒體上傳 (Dropzone)、定價設定、庫存管理等區塊。
*   **Sales (銷售)**:
    *   `listing.html`: 訂單列表，包含訂單號、客戶、狀態、總額、下單日期。
    *   `details.html`: 訂單詳情，包含配送資訊、商品清單、發票下載等。

### 2.2 專案管理 (Projects)
*   **Project Dashboard (`project.html`)**:
    *   包含專案進度概覽、預算使用情況 (圖表)、團隊成員、近期活動 (Timeline)。
    *   **Targets**: 專案目標清單。
    *   **Budget**: 預算報表與支出記錄。

### 2.3 用戶管理 (User Management)
*   **Users List (`users/list.html`)**: 標準的用戶管理列表，支援新增、編輯、刪除用戶，以及權限分配。
*   **View User (`users/view.html`)**: 用戶個人檔案頁面，整合了該用戶的詳細資訊、登入記錄、權限設定等。

## 3. 圖表與組件 (Charts & Widgets)

Metronic 主要使用 **ApexCharts** 與 **Chart.js** (部分) 來呈現數據。

*   **ApexCharts**: 用於大多數互動式圖表，如折線圖、長條圖、區域圖、甜甜圈圖、雷達圖等。支援動態更新與 Tooltip 提示。
*   **Mixed Widgets**: 結合圖表與統計數字的複合組件，例如「銷售統計」卡片中同時包含總金額與趨勢圖。
*   **Tables Widgets**: 高度客製化的表格，支援分頁、排序、狀態顏色標記、操作按鈕等。
*   **Feeds Widgets**: 用於顯示動態消息流、用戶評論或系統通知。

## 4. 認證與帳戶 (Authentication & Account)

*   **Authentication**: 提供多種佈局 (Basic, Aside, Dark) 的登入、註冊、忘記密碼頁面。
*   **Account**: 用戶中心的標準頁面，包含個人資料設定 (Settings)、帳戶安全 (Security, 2FA)、帳單資訊 (Billing) 等。

## 總結

Metronic 提供了極為豐富的頁面模版，其中 **Dashboards** 模組展示了強大的數據可視化能力，特別適合用於 Bombus 專案中的「L4.3 損益預測」與「L3.2 人才地圖」等需要圖表呈現的模組。而 **Apps** 模組中的 User Management 與 eCommerce 流程則可直接應用於「L1.1 AI 面試」的後台管理與用戶系統。
