# **SaaS 員工入職電子簽署系統設計規範書 v2.0**

**專案名稱：** No-Code 員工入職與電子簽署 SaaS 平台

**文件版本：** v2.0 (新增 DB Schema, API Specs, Security)

**規劃角色：** 資深系統設計規劃師 (Gemini)

**日期：** 2026-01-14

## **1\. 功能設計文件 (FDD) \- 系統資料流程圖**

### **1.1 資料流程概述**

本系統的核心邏輯在於將「非結構化的 PDF」轉化為「結構化的資料映射 (Mapping Data)」。流程分為三個階段：

1. **定義階段 (Definition Phase)：** HR 建立模板，產生座標映射設定檔 (JSON)。  
2. **填寫階段 (Collection Phase)：** 員工填寫 Web 表單，資料暫存於 DB。  
3. **合成階段 (Generation Phase)：** 後端引擎結合 PDF 模板、員工資料與簽名檔，產出最終合約。

### **1.2 系統資料流向圖 (Data Flow Diagram)**

graph TD  
    %% 定義階段  
    subgraph "Phase 1: 模板定義 (HR 端)"  
        HR\[HR 管理員\] \--\>|1.上傳空白 PDF| API\_Upload\[文件上傳服務\]  
        API\_Upload \--\>|2.儲存原始檔| S3\[(雲端儲存 \- Original PDF)\]  
        API\_Upload \--\>|3.轉換為圖片| Converter\[PDF 轉 Image 預覽引擎\]  
        Converter \--\>|4.回傳頁面圖片| UI\_Designer\[模板定義器 UI\]  
          
        HR \--\>|5.拖拉欄位定義座標| UI\_Designer  
        UI\_Designer \--\>|6.產出 Mapping JSON| API\_Template\[模板管理服務\]  
        API\_Template \--\>|7.儲存模板設定| DB\[(資料庫 \- Templates)\]  
    end

    %% 填寫階段  
    subgraph "Phase 2: 資料填寫 (員工端)"  
        Link\[入職連結\] \--\>|8.啟動流程| UI\_Wizard\[員工填寫精靈 UI\]  
        API\_Template \--\>|9.讀取欄位設定| UI\_Wizard  
          
        Employee\[新進員工\] \--\>|10.輸入個人資料| UI\_Wizard  
        UI\_Wizard \--\>|11.暫存資料| API\_Onboarding\[入職資料服務\]  
        Employee \--\>|12.簽署名字| UI\_Sign\[簽名板 Canvas\]  
        UI\_Sign \--\>|13.上傳簽名圖檔| S3\_Sign\[(雲端儲存 \- Signatures)\]  
    end

    %% 合成與歸檔  
    subgraph "Phase 3: 合成與歸檔 (後端)"  
        Employee \--\>|14.確認送出| API\_Merge\[文件合成引擎\]  
          
        API\_Merge \--\>|讀取原始 PDF| S3  
        API\_Merge \--\>|讀取 Mapping JSON| DB  
        API\_Merge \--\>|讀取員工文字資料| API\_Onboarding  
        API\_Merge \--\>|讀取簽名圖檔| S3\_Sign  
          
        API\_Merge \--\>|15.合成最終 PDF| Generator\[PDF 生成器 (pdf-lib)\]  
        Generator \--\>|16.加上雜湊與浮水印| Security\[資安模組\]  
        Security \--\>|17.儲存已簽署文件| S3\_Final\[(雲端儲存 \- Signed Docs)\]  
          
        S3\_Final \--\>|18.寫入稽核紀錄| Audit\[(稽核日誌 Audit Log)\]  
        S3\_Final \--\>|19.通知雙方| Notify\[郵件/簡訊服務\]  
    end

## **2\. 產品需求規劃書 (PRD)**

### **2.1 核心模組一：模板定義器 (Template Designer)**

**目標：** 讓不具備程式背景的 HR，能透過「所見即所得 (WYSIWYG)」的方式，將靜態 PDF 轉化為動態表單。

#### **功能細節：**

1. **PDF 解析與渲染：** 將 PDF 解析為高解析度圖片作為背景，避免字體跑版。  
2. **欄位庫 (Field Library)：** 提供標準欄位（如姓名）與自訂欄位。  
3. **拖拉映射 (Drag & Drop Mapping)：** 支援縮放、多處帶入、屬性設定（字體、必填）。  
4. **簽署區設定：** 支援簽名區與日期章設定。

### **2.2 核心模組二：員工填寫精靈 (Onboarding Wizard)**

**目標：** 提供極致順暢的移動端 (Mobile-First) 填寫體驗。

#### **功能細節：**

1. **RWD 問卷式介面：** 卡片式輸入，非直接填寫 PDF。  
2. **即時合約預覽：** 資料 Overlay 在 PDF 上供確認。  
3. **強制閱讀機制：** Scroll-to-Accept。  
4. **簽名板：** 支援觸控手寫，記錄筆畫軌跡。

## **3\. 介面設計規劃 (IDP) \- 模板定義器 Wireframe**

### **3.1 佈局結構圖**

classDiagram  
    class 頂部導航列 {  
        \+ 返回列表按鈕  
        \+ 檔名顯示  
        \+ 儲存與發布按鈕  
    }  
    class 左側工具欄\_欄位庫 {  
        \+ 分類: 標準資訊  
        \+ 分類: 合約變數  
        \+ 分類: 簽署元件  
    }  
    class 中間工作區\_畫布 {  
        \+ PDF 頁面預覽  
        \+ 拖放區域 (Drop Zone Layer)  
    }  
    class 右側屬性欄\_設定 {  
        \+ 變數名稱 (Variable ID)  
        \+ 字體設定  
        \+ 必填開關  
    }  
    頂部導航列 \<|-- 左側工具欄\_欄位庫  
    左側工具欄\_欄位庫 \-- 中間工作區\_畫布 : 拖曳  
    中間工作區\_畫布 \-- 右側屬性欄\_設定 : 選取

## **4\. 技術架構文件 (TAD) \- 資料庫架構設計 (Database Schema)**

本系統需支援 **多租戶 (Multi-tenant)** 架構，並處理大量非結構化的座標設定資料。建議採用 PostgreSQL，利用其強大的 **JSONB** 欄位來儲存靈活的 Mapping 設定。

### **4.1 實體關係圖 (ER Diagram)**

erDiagram  
    TENANTS ||--o{ EMPLOYEES : "hires"  
    TENANTS ||--o{ TEMPLATES : "owns"  
      
    TEMPLATES ||--o{ SUBMISSIONS : "generates"  
    EMPLOYEES ||--o{ SUBMISSIONS : "creates"  
      
    %% Table Definitions  
    TENANTS {  
        uuid id PK  
        string company\_name  
        string tax\_id "統一編號"  
        jsonb config "企業Logo、品牌色"  
    }

    EMPLOYEES {  
        uuid id PK  
        uuid tenant\_id FK  
        string name  
        string email  
        string phone  
        string status "INVITED, ACTIVE, TERMINATED"  
    }

    TEMPLATES {  
        uuid id PK  
        uuid tenant\_id FK  
        string name "如: 113年勞動契約"  
        string s3\_key\_original "原始空白PDF路徑"  
        int version  
        boolean is\_active  
        jsonb mapping\_config "核心：欄位座標映射設定"  
        timestamp created\_at  
    }

    SUBMISSIONS {  
        uuid id PK  
        uuid template\_id FK  
        uuid employee\_id FK  
        string status "DRAFT, SIGNED, COMPLETED"  
        jsonb form\_data "員工填寫的 Key-Value 資料"  
        string s3\_key\_signed "最終合成PDF路徑"  
        string s3\_key\_audit "稽核報告路徑"  
        timestamp signed\_at  
        string ip\_address  
    }

### **4.2 核心欄位詳解：TEMPLATES.mapping\_config**

這是系統中最關鍵的欄位，儲存了「哪個欄位」要在「哪一頁」的「哪個位置」。我們不使用傳統關聯表來存座標，而是使用 JSONB 以提升讀取效能。

// 範例：Mapping JSON 結構 (儲存在 mapping\_config 欄位)  
{  
  "fields": \[  
    {  
      "id": "field\_001",  
      "key": "user\_name",          // 對應到 form\_data 的 Key  
      "label": "員工姓名",  
      "type": "text",              // text, date, signature, checkbox  
      "is\_required": true,  
      "font\_size": 12,             // 預設字體大小，0 為自動縮放  
      "placements": \[              // 支援「一次輸入，多處帶入」  
        {  
          "page\_number": 1,  
          "x": 150.5,              // PDF 座標 (pt)  
          "y": 600.2,  
          "width": 100,  
          "height": 20  
        },  
        {  
          "page\_number": 15,       // 簽名頁也要帶入姓名  
          "x": 50.0,  
          "y": 120.0,  
          "width": 80,  
          "height": 20  
        }  
      \]  
    },  
    {  
      "id": "field\_002",  
      "key": "signature\_main",  
      "label": "員工簽名",  
      "type": "signature",  
      "placements": \[  
        {  
          "page\_number": 15,  
          "x": 200.0,  
          "y": 100.0,  
          "width": 120,  
          "height": 60  
        }  
      \]  
    }  
  \]  
}

## **5\. 技術架構文件 (TAD) \- API 接口定義**

定義前端 (React/Vue) 與後端 (Node.js/Go) 溝通的契約。

### **5.1 模板定義 API (HR 端)**

#### **POST /api/v1/templates/{id}/mapping**

**用途：** HR 在介面上拖拉完成後，儲存整份文件的欄位映射設定。

**Request Body:**

{  
  "mapping\_config": {  
    "fields": \[  
      // 結構同上方的 mapping\_config JSON  
      { "key": "user\_name", "placements": \[...\] },  
      { "key": "user\_address", "placements": \[...\] }  
    \]  
  },  
  "is\_published": true  
}

### **5.2 資料填寫 API (員工端)**

#### **GET /api/v1/onboarding/{token}/schema**

**用途：** 員工開啟連結時，前端索取「這份合約需要填哪些欄位」。

**Response:**

{  
  "template\_name": "113年入職合約包",  
  "steps": \[  
    {  
      "title": "基本資料",  
      "fields": \[  
        { "key": "user\_name", "label": "姓名", "type": "text", "required": true },  
        { "key": "user\_id", "label": "身分證字號", "type": "text", "required": true }  
      \]  
    },  
    {  
      "title": "條款簽署",  
      "fields": \[  
        { "key": "agreed\_terms", "label": "我同意勞動契約", "type": "checkbox" },  
        { "key": "signature\_main", "label": "請簽名", "type": "signature" }  
      \]  
    }  
  \]  
}

#### **POST /api/v1/onboarding/{token}/submit**

**用途：** 員工送出填寫資料。

**Request Body:**

{  
  "form\_data": {  
    "user\_name": "王小明",  
    "user\_id": "A123456789",  
    "signature\_main": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA..." // 簽名檔 Base64  
  },  
  "metadata": {  
    "ip\_address": "203.66.x.x",  
    "user\_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16\_0...",  
    "device\_fingerprint": "xyz123hash..."  
  }  
}

## **6\. 資安與合規性規劃 (Security & Compliance)**

針對《電子簽章法》與 GDPR/個資法 的具體技術實作。

### **6.1 電子簽章法合規 (Validity)**

根據台灣《電子簽章法》，電子文件需具備「可驗證性」與「不可否認性」。

1. **實名驗證 (Identity Assurance):**  
   * **機制：** 採用 **2FA (雙因子驗證)**。  
   * **流程：** 在員工按下「最終提交」前，系統發送 SMS 簡訊驗證碼至員工手機。  
   * **紀錄：** 將 mobile\_number、otp\_code、verified\_at 寫入稽核日誌。  
2. **文件完整性 (Integrity) \- 數位雜湊封蠟：**  
   * **技術：** 使用伺服器端的 **X.509 數位憑證 (Digital Certificate)** (如 GlobalSign 或自行簽署的 CA) 對最終合成的 PDF 進行簽署。  
   * **效果：** 若 PDF 在下載後被修改（如用 Adobe Acrobat 改薪資數字），PDF 閱讀器會顯示「簽章無效 (Invalid Signature)」，確保文件未被竄改。

### **6.2 稽核軌跡 (Audit Trail)**

這是在發生勞資爭議時的呈堂證供。系統需自動生成最後一頁的「稽核證書 (Audit Certificate)」。

**稽核紀錄內容 (JSON 結構存於 DB)：**

{  
  "audit\_id": "aud\_987654321",  
  "document\_hash": "sha256:a1b2c3d4...", // 原始文件雜湊值  
  "events": \[  
    { "action": "VIEWED", "timestamp": "2026-01-14T10:00:00Z", "ip": "1.1.1.1" },  
    { "action": "CONSENT\_AGREED", "timestamp": "2026-01-14T10:05:00Z", "detail": "Scroll-to-bottom checked" },  
    { "action": "OTP\_SENT", "timestamp": "2026-01-14T10:06:00Z", "target": "+886912\*\*\*456" },  
    { "action": "OTP\_VERIFIED", "timestamp": "2026-01-14T10:06:30Z" },  
    { "action": "SIGNED", "timestamp": "2026-01-14T10:07:00Z", "signature\_id": "sig\_555" }  
  \]  
}

### **6.3 資料保護 (Data Protection)**

1. **傳輸加密：** 全程使用 TLS 1.3 (HTTPS)。  
2. **靜態加密 (Encryption at Rest)：**  
   * 資料庫敏感欄位 (如身分證字號) 使用 AES-256 加密儲存。  
   * S3 Bucket 設定 Server-Side Encryption (SSE-S3)。  
3. **最小權限原則：** HR 只能看到自己公司 (Tenant) 的資料，利用 DB Row-Level Security (RLS) 或 Application Logic 強制過濾 where tenant\_id \= ?。