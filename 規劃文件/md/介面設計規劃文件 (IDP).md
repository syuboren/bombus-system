# **介面設計規劃文件 (Interface Design Plan)**

**專案名稱**：Bombus 企業管理系統

**版本**：V6.0 (PRD Strict Alignment Ver.)

**對應文件**：Bombus V6.0 PRD Section 3

**狀態**：完整版

**撰寫人**：Gemini (資深系統設計規劃師)

## **1\. 設計規範系統 (Design System Guidelines)**

### **1.1 色彩規範 (Color Palette) \- 莫蘭迪色系 (Morandi System)**

本系統採用 **莫蘭迪色系 (Morandi Colors)**，透過在色彩中加入不同比例的灰階（Gray Scale），降低飽和度，營造出「高質感、低視覺壓力、專業穩重」的氛圍。

我們採用 **Semantic Color Tokens (語意化色彩變數)** 進行定義，確保開發與設計的一致性。

#### **A. 基礎色調 (Neutrals)**

用於背景、邊框與文字，避免使用純黑 (\#000000) 或純白 (\#FFFFFF)。

* \--color-bg-base: \#F5F5F7 (雲霧灰 \- 溫潤的背景底色)  
* \--color-bg-card: \#FCFCFD (極致灰白 \- 卡片與內容區塊)  
* \--color-text-primary: \#464E56 (岩石灰 \- 主要標題)  
* \--color-text-secondary: \#858E96 (迷霧灰 \- 次要資訊、內文)  
* \--color-border: \#E2E4E8 (淡灰 \- 柔和的邊界)

#### **B. 品牌主色 (Brand Colors)**

捨棄高飽和漸層，改為帶有灰度的藍紫色調，傳遞智慧與信任。

* \--color-brand-main: \#64748B (Slate Blue \- 板岩藍)  
* \--color-brand-light: \#94A3B8 (Dusty Blue \- 塵藍)  
* \--color-brand-dark: \#475569 (Deep Slate \- 深岩)

#### **C. 模組功能色 (Module Semantic Tokens)**

為 L1-L6 定義專屬的莫蘭迪識別色，用於圖示、標籤與強調區塊。

* **L1 員工管理 (Green)**: \--color-l1-sage: \#8DA399 (鼠尾草綠 \- 成長與平衡)  
* **L2 職能管理 (Orange)**: \--color-l2-clay: \#D6A28C (陶土橙 \- 溫暖與技能)  
* **L3 教育訓練 (Teal)**: \--color-l3-petrol: \#7F9CA0 (復古藍綠 \- 知識與沉澱)  
* **L4 專案管理 (Purple)**: \--color-l4-mauve: \#9A8C98 (錦葵紫 \- 協作與智慧)  
* **L5 績效管理 (Red)**: \--color-l5-brick: \#B87D7B (磚紅 \- 重點與警示，但不刺眼)  
* **L6 文化管理 (Pink)**: \--color-l6-rose: \#C4A4A1 (乾燥玫瑰 \- 人文與關懷)

#### **D. 狀態色 (Status Tokens)**

* \--color-success: \#7FB095 (薄荷灰綠 \- 達標)  
* \--color-warning: \#E3C088 (亞麻黃 \- 待辦/試行)  
* \--color-danger: \#C77F7F (珊瑚灰紅 \- 異常/落後)  
* \--color-info: \#8DA8BE (霧霾藍 \- 資訊)

### **1.2 圖示與排版 (Iconography & Typography)**

#### **A. 圖示系統 (Iconography)**

* **技術選型**: 使用 **Icon Fonts** (推薦: *Phosphor Icons* 或 *Remix Icon*)，以確保縮放不失真且易於套用 CSS 變數。  
* **風格規範**:  
  * 使用 **Outline (線框)** 或 **Duotone (雙色)** 風格。  
  * **色彩應用**: 圖示顏色需對應模組的 Semantic Token (例如：L1 模組的圖示使用 \#8DA399)。  
  * **線條粗細**: 統一設定為 1.5px 或 Regular 級別，保持精緻感。

#### **B. 字體排版 (Typography)**

* **字體家族**: \-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", sans-serif  
* **層級規範**:  
  * H1 (頁面標題): 24px, Medium, \--color-text-primary  
  * H2 (區塊標題): 18px, Medium, \--color-brand-main  
  * Body (內文): 14px, Regular, \--color-text-secondary, Line-height 1.6  
  * Tag/Label (標籤): 12px, Medium, 配色採「同色系背景淡化」原則 (如: 背景 \#8DA399 的 15% 透明度，文字 \#8DA399)。

### **1.3 版面佈局 (Layout Structure)**

* **視覺風格**: **Soft UI (柔和介面)**  
  * **圓角 (Border Radius)**: 統一 12px，營造親和力。  
  * **陰影 (Shadows)**: 使用擴散性高、透明度低的陰影 box-shadow: 0 4px 20px rgba(0,0,0,0.05)，讓卡片產生「懸浮感」而非「厚重感」。  
* **導航模式**:  
  * **左側側邊欄 (Sidebar)**: 背景色 \--color-bg-card，選單項目選中時呈現 \--color-bg-base 背景色與 \--color-brand-main 文字。  
  * **頂部導航列 (Top Bar)**: 簡約白底，僅保留必要資訊，減少視覺干擾。

## **2\. 關鍵模組介面詳細設計 (Detailed UI Design by Module)**

本章節嚴格依據 **PRD L0.0 \- L6.6** 結構定義各功能模組的視覺呈現與互動邏輯。

### **L0 系統核心與儀表層 (System Core & Dashboard)**

#### **L0.0 企業管理儀表板**

* **呈現方式**：高質感戰情室 (Premium Dashboard)。  
* **版面配置**：  
  * **關鍵指標卡片**: 背景為純白卡片，數值使用莫蘭迪狀態色。Hover 時卡片輕微上浮。  
  * **Working Flow 互動關聯圖**: 節點依照部門職能套用 L1-L6 模組色，連線使用淺灰色。  
  * **AI OKR 摘要**: 頂部橫幅使用 \--color-info 的極淡色調，搭配打字機動畫效果。

#### **L0.1 系統管理與權限控制**

* **呈現方式**：棋盤式資料網格 (Grid)。  
* **版面配置**：  
  * **權限矩陣**: 橫軸為功能模組，縱軸為角色。交集處為 Soft UI 風格 Toggle Switch。  
  * **備份日誌**: 列表式設計，狀態欄使用柔和的綠色勾勾或紅色驚嘆號圖示。

### **L1 員工管理模組 (Employee Management)**

#### **L1.1 招募與候選人管理**

* **呈現方式**：沉浸式專注介面 (Immersive Split View)。  
* **版面配置**：  
  * **左側 (影音區)**: 視訊播放器，下方時間軸使用莫蘭迪色標記情緒點 (焦慮=\#C77F7F, 自信=\#7FB095)。  
  * **右側 (分析區)**: 逐字稿顯示關鍵字高亮 (正向綠底/負向紅底)，頂部顯示雷達圖。

#### **L1.2 員工檔案與歷程管理**

* **呈現方式**：個人化數據卡片 (Profile Card)。  
* **版面配置**：  
  * **ROI 儀表板**: 雙軸折線圖，X軸為時間，Y1為薪資成本(灰色)，Y2為產出貢獻(綠色 \--color-l1-sage)。  
  * **歷程時間軸**: 垂直時間軸，節點使用圓形圖示標示異動類型。

#### **L1.3 人才庫與再接觸管理**

* **呈現方式**：搜尋引擎風格 (Search Engine)。  
* **版面配置**：  
  * **搜尋列**: 大型中央搜尋框，支援自然語言輸入。  
  * **標籤雲**: 使用莫蘭迪色系的 Pill 標籤，顯示熱門技能關鍵字。  
  * **匹配卡片**: 搜尋結果顯示與當前職缺的「匹配度百分比環」。

#### **L1.4 職涯晉升與接班規劃**

* **呈現方式**：柔和進度追蹤 (Progress Tracker)。  
* **版面配置**：  
  * **週休三日監控**: 進度條底色 \--color-bg-base，填滿色 \--color-l3-petrol。若指標異常，頂部顯示柔和的橘色預警橫幅。  
  * **接班人樹狀圖**: 組織樹狀圖，關鍵職位節點旁顯示「接班人頭像」與「準備度燈號」。

#### **L1.5 會議管理**

* **呈現方式**：行事曆整合視圖 (Calendar View)。  
* **版面配置**：  
  * **雙欄佈局**: 左側為待辦會議列表，右側為日/週/月行事曆視圖。  
  * **衝突提示**: 偵測到時間衝突時，時段區塊顯示紅色斜線陰影。

### **L2 職能管理模組 (Competency Management)**

#### **L2.1 職等職級管理**

* **呈現方式**：互動式矩陣 (Interactive Matrix)。  
* **版面配置**：  
  * **職級表**: 橫軸為職系，縱軸為職等。  
  * **AI 職涯助手**: 側邊浮動面板，顯示員工目前的「職涯定位點」與「晉升路徑線」。

#### **L2.2 職務說明書管理 (JD)**

* **呈現方式**：文件編輯器 (Document Editor)。  
* **版面配置**：  
  * **AI 側欄**: 輸入職稱與關鍵字，點擊生成後，內容自動流式填入編輯區。  
  * **版控歷程**: 右側顯示版本時間軸，支援差異比對 (Diff View)。

#### **L2.3 職能框架開發**

* **呈現方式**：卡片式目錄 (Card Catalog)。  
* **版面配置**：  
  * **KSA 卡片**: 每張卡片代表一個職能要素，使用標籤顏色區分 K/S/A 類型。  
  * **連動提示**: 當職能被修改時，顯示彈窗提示「將同步更新 L3 相關課程推薦」。

#### **L2.4 職能評估系統**

* **呈現方式**：線性問卷 (Step Form)。  
* **版面配置**：  
  * **單題聚焦**: 每次只顯示一個評估項目，配有行為指標說明。  
  * **進度指示**: 頂部顯示評估進度條。

#### **L2.5 職能落差分析**

* **呈現方式**：疊加比較視圖 (Overlay View)。  
* **版面配置**：  
  * **落差雷達**: 底層為「JD 標準」(灰色填充)，上層為「實測能力」(橙色線條)。  
  * **落差列表**: 僅列出未達標項目，右側配置「一鍵推薦課程」按鈕。

#### **L2.6 AI 職能生成引擎**

* **呈現方式**：對話式生成介面 (Chat Interface)。  
* **版面配置**：  
  * **輸入區**: 上傳 JD 文件或貼上文字。  
  * **輸出區**: 結構化的職能列表，支援拖曳排序與編輯。

### **L3 教育訓練管理模組 (Training & Development)**

#### **L3.1 培訓計畫管理**

* **呈現方式**：甘特圖 (Gantt Chart)。  
* **版面配置**：  
  * **時間軸**: 顯示年度計畫時程，不同類型的培訓使用不同莫蘭迪色塊。  
  * **預算水位**: 底部顯示預算消耗進度條。

#### **L3.2 課程與報名管理**

* **呈現方式**：優雅的數據矩陣 (Elegant Matrix)。  
* **版面配置**：  
  * **多層次人才地圖**:  
    * **熱力圖**: 使用同色系深淺 (淺灰-\>深綠) 表示職能強弱。  
    * **九宮格**: 支援 Drag-and-Drop，拖曳員工頭像模擬晉升與培育。  
  * **課程庫**: 網格卡片佈局，封面圖標示課程類型。

#### **L3.3 線上測驗系統**

* **呈現方式**：專注閱讀模式 (Focus Mode)。  
* **版面配置**：  
  * **無干擾設計**: 隱藏側邊欄與頂部選單。  
  * **倒數計時**: 右上角懸浮顯示剩餘時間。

#### **L3.4 培訓成效追蹤與回饋**

* **呈現方式**：會議記錄型態 (Meeting Log)。  
* **版面配置**：  
  * **反饋會議室**: 頂部顯示參與者，中段左右分欄 (案例分享 vs AI 分析)。  
  * **轉化率儀表**: 柱狀圖對比 (訓前績效 vs 訓後績效)。

### **L4 專案管理模組 (Project Management)**

#### **L4.1 專案與任務管理**

* **呈現方式**：樹狀列表 (Tree List) 與 看板 (Kanban)。  
* **版面配置**：  
  * **任務詳情**: 側邊滑出面板 (Slide-over)，顯示隱形成本計算公式 (工時 \* 時薪)。

#### **L4.2 專案協作與進度追蹤**

* **呈現方式**：協作看板 (Collaboration Board)。  
* **版面配置**：  
  * **泳道**: 背景色為極淡的 \--color-bg-base。  
  * **進度環**: 任務卡片右下角顯示微型圓環進度圖。

#### **L4.3 專案績效與毛利**

* **呈現方式**：理性的趨勢預測圖 (Predictive Chart)。  
* **版面配置**：  
  * **P\&L 趨勢**: 實線(歷史) \+ 虛線(AI 預測)。  
  * **虧損警示**: 顯示「霧面玻璃質感」的 Modal，邊框帶有柔和的 \#B87D7B 光暈，列出風險因子。

#### **L4.4 專案報表與分析**

* **呈現方式**：A4 預覽模式 (Print Preview)。  
* **版面配置**：  
  * **文件視圖**: 中央顯示報表預覽，右側為參數設定欄 (日期範圍、匯出格式)。

#### **L4.5 專案自動化引擎**

* **呈現方式**：流程圖編輯器 (Flow Editor)。  
* **版面配置**：  
  * **規則設定**: "If \[Condition\] Then \[Action\]" 的積木式拖曳介面。

### **L5 績效管理模組 (Performance Management)**

#### **L5.1 過程管理系統與毛利計算**

* **呈現方式**：計算機介面 (Calculator UI)。  
* **版面配置**：  
  * **參數區**: 輸入框 (Input) 調整分攤比例。  
  * **結果區**: 數字跳動動畫 (Count Up)，即時顯示獎金池金額。

#### **L5.2 考核週期管理**

* **呈現方式**：流程進度監控 (Pipeline Monitor)。  
* **版面配置**：  
  * **階段卡片**: 顯示「目標設定」、「期中檢核」、「期末評分」各階段的完成率。

#### **L5.3 360 度回饋系統**

* **呈現方式**：環狀分佈圖 (Donut Chart)。  
* **版面配置**：  
  * **同心圓**: 內圈為自評分數，外圈為他評分數 (上司/同儕/部屬)。顏色區分使用不同明度的 \--color-l5-brick。

#### **L5.4 績效紀錄與日誌系統**

* **呈現方式**：時間軸日誌 (Timeline Log)。  
* **版面配置**：  
  * **CITA 卡片**: 依時間序排列的關鍵事件卡片，標籤顯示「正向/負向」。

#### **L5.5 績效分析與改善計畫**

* **呈現方式**：分佈曲線圖 (Bell Curve)。  
* **版面配置**：  
  * **績效分佈**: 顯示部門績效落點，支援拖曳節點進行強制分佈校準 (Calibration)。  
  * **PIP 追蹤**: 進度條顯示改善計畫的檢核點狀態。

### **L6 文化管理模組 (Culture Management)**

#### **L6.1 企業文化手冊管理**

* **呈現方式**：電子書閱讀器 (E-Book Reader) & 服務入口。  
* **版面配置**：  
  * **EAP 入口**: 溫馨插畫風格，匿名預約按鈕使用低飽和粉色 (--color-l6-rose)。  
  * **員旅投票**: 圖片投票介面，顯示目的地照片與票數條。

#### **L6.2 獎項資料庫管理**

* **呈現方式**：時間軸列表 (Timeline List)。  
* **版面配置**：  
  * **報名倒數**: 每個獎項卡片右側顯示剩餘天數倒數環。

#### **L6.3 文件儲存庫**

* **呈現方式**：檔案總管 (File Manager)。  
* **版面配置**：  
  * **格狀視圖**: 文件縮圖預覽，右上角顯示標籤顏色。

#### **L6.4 AI 申請助理**

* **呈現方式**：對話式精靈 (Chat Wizard)。  
* **版面配置**：  
  * **分步引導**: AI 提問引導使用者輸入亮點，右側即時預覽生成的申請書草稿。

#### **L6.5 智慧文件分析**

* **呈現方式**：掃描檢核視圖 (Scan Check View)。  
* **版面配置**：  
  * **文件預覽**: 左側顯示上傳文件，右側列出 AI 偵測到的缺漏項與合規風險。

#### **L6.6 影響力評估引擎**

* **呈現方式**：滾動式長條圖文 (Scrollytelling)。  
* **版面配置**：  
  * **相關性分析**: 散佈圖 (Scatter Plot)，X軸為 EAP 使用率，Y軸為留任率，顯示回歸線。隨著滾動，圖表動態演繹數據變化。

## **3\. 互動與反饋設計 (Interaction & Feedback)**

### **3.1 載入狀態 (Loading States)**

* **骨架屏 (Skeleton Screen)**: 使用 \--color-bg-base 與 \--color-border 的微光流動動畫 (Shimmer effect)，保持低調質感。  
* **AI 運算中**: 顯示莫蘭迪色系的呼吸燈效果 (Breathing Light)，顏色在 \--color-brand-light 與 \--color-brand-main 之間緩慢切換。

### **3.2 操作回饋 (Feedback)**

* **Toast Notification**:  
  * 底色：深灰 \--color-text-primary (提升閱讀對比)。  
  * Icon：使用對應的狀態色 (如 Success 使用 \#7FB095)。  
* **按鈕狀態**:  
  * Default: \--color-brand-main (Solid)。  
  * Hover: 降低亮度 10% 或增加陰影，不改變色相。  
  * Disabled: \--color-border (Grey)。

### **3.3 響應式設計 (RWD Strategy)**

* 在行動裝置上，側邊欄收折為底部導航列 (Bottom Navigation)，圖示使用 Outline 風格，選中時填滿並套用 \--color-brand-main。

## **4\. 附錄：UI Wireframes (Mermaid)**

graph TD  
    subgraph Browser Window  
        Header\[Top Bar: Clean White Background | Soft Shadow\]  
          
        subgraph Main Content \[Bg: Cloud Grey \#F5F5F7\]  
            subgraph Left Panel \[Video Area\]  
                VideoPlayer\[Video Player\]  
                Timeline\[Timeline: Muted Red/Green Dots\]  
            end  
              
            subgraph Right Panel \[Analysis Area\]  
                Tabs\[Tabs: Text \#464E56 | Active Border \#64748B\]  
                Content\[Content: Highlights in Sage Green/Brick Red\]  
                  
                Action\[Buttons: Slate Blue Background\]  
            end  
        end  
          
        Sidebar\[Sidebar: Bg \#FCFCFD | Icons: Semantic Colors\]  
    end  
      
    Header \--- Sidebar  
    Sidebar \--- Main Content  
    Left Panel \--- Right Panel  
    style Left Panel fill:\#f0f0f0,stroke:\#E2E4E8  
    style Right Panel fill:\#ffffff,stroke:\#E2E4E8  
