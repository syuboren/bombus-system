# SaaS 員工入職電子簽署系統 - 系統雛形

## 專案簡介

本專案為「No-Code 員工入職與電子簽署 SaaS 平台」的系統雛形，採用 HTML + CSS + jQuery 技術架構開發。

## 功能模組

### 1. HR 模板定義器 (Template Designer)
- **頁面**: `hr-designer.html`
- **功能**:
  - 上傳 PDF 模板（模擬）
  - 從左側欄位庫拖放欄位到畫布
  - 設定欄位屬性（名稱、字體、必填）
  - 儲存模板設定

### 2. 員工填寫精靈 (Onboarding Wizard)
- **頁面**: `employee-wizard.html`
- **功能**:
  - 多步驟表單填寫
  - Canvas 簽名板功能（支援觸控）
  - 表單驗證
  - 提交簽署資料

## 檔案結構

```
專案根目錄/
├── index.html                 # 主入口頁面（角色選擇）
├── hr-designer.html          # HR 模板定義器
├── employee-wizard.html      # 員工填寫精靈
├── css/
│   ├── common.css            # 共用樣式
│   ├── designer.css          # 模板定義器樣式
│   └── wizard.css            # 填寫精靈樣式
├── js/
│   ├── storage.js            # localStorage 資料管理
│   ├── designer.js           # 模板定義器邏輯
│   ├── wizard.js             # 填寫精靈邏輯
│   └── signature.js          # 簽名板功能
└── README.md                 # 本文件
```

## 技術架構

- **前端框架**: jQuery 3.6.0
- **資料儲存**: localStorage (模擬後端資料庫)
- **簽名功能**: HTML5 Canvas API
- **樣式**: 原生 CSS (無框架)

## 使用方式

### 本地執行

1. 使用瀏覽器直接開啟 `index.html`
2. 或使用本地伺服器（建議）：
   ```bash
   # 使用 Python
   python -m http.server 8000
   
   # 使用 Node.js
   npx http-server
   ```
3. 訪問 `http://localhost:8000`

### 功能流程

#### HR 管理員端
1. 從首頁選擇「HR 管理員」
2. 上傳 PDF 模板（目前為模擬功能）
3. 從左側欄位庫拖放欄位到畫布
4. 點擊欄位編輯屬性
5. 點擊「儲存模板」儲存設定

#### 員工端
1. 從首頁選擇「新進員工」
2. 依序填寫各步驟表單
3. 在簽名步驟使用簽名板簽名
4. 確認無誤後提交

## 資料結構

### 模板資料 (Template)
儲存在 localStorage 的 `templates` 鍵中：

```javascript
{
  id: "template_id",
  name: "模板名稱",
  mapping_config: {
    fields: [
      {
        id: "field_001",
        key: "user_name",
        label: "員工姓名",
        type: "text",
        is_required: true,
        font_size: 12,
        placements: [{
          page_number: 1,
          x: 150,
          y: 600,
          width: 100,
          height: 20
        }]
      }
    ]
  }
}
```

### 提交資料 (Submission)
儲存在 localStorage 的 `submissions` 鍵中：

```javascript
{
  id: "submission_id",
  template_id: "template_id",
  token: "token_string",
  status: "SIGNED",
  form_data: {
    user_name: "王小明",
    signature_main: "data:image/png;base64,..."
  },
  signed_at: "2026-01-14T10:00:00Z"
}
```

## 注意事項

1. **PDF 上傳功能**: 已實作 PDF.js 整合，支援 PDF 上傳、預覽與拖放上傳
2. **資料儲存**: 使用 localStorage，清除瀏覽器資料會遺失所有資料（注意：大型 PDF 檔案可能超出 localStorage 限制）
3. **瀏覽器相容性**: 建議使用現代瀏覽器（Chrome、Firefox、Edge、Safari）
4. **觸控支援**: 簽名板支援觸控裝置，可在手機/平板使用
5. **PDF.js 依賴**: 需要網路連線以載入 PDF.js 庫（使用 CDN）

## 未來擴充方向

- [x] 整合真實的 PDF 處理功能（PDF.js）✅
- [ ] 連接後端 API
- [ ] 實作完整的多租戶架構
- [ ] 加入電子簽章法合規功能（數位憑證、稽核軌跡）
- [ ] 實作 PDF 合成功能
- [ ] 加入通知功能（郵件/簡訊）
- [ ] 實作完整的權限管理

## 授權

本專案為系統設計規範書的實作雛形，僅供開發參考使用。

