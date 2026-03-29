## Why

目前「人員管理」功能分散在三個頁面：`settings/users`（帳號管理）、`organization/employee-management`（組織視角員工管理）、`employee/profile`（員工檔案）。三者使用不同的資料模型、不同的 API、不同深度的詳情 Modal，且功能配置與實際業務定位相反——深度功能（6 Tab 詳情、ROI、績效）蓋在自助頁面上，HR 管理頁面反而只有淺層 Modal。此外，建立 Employee 和建立 User 帳號是完全獨立的流程，對於企業導入場景（大量既有員工需批次匯入）缺乏支援。

此變更將三個頁面重新定位、整合共用元件、統一資料模型，並新增批次匯入功能，使系統能同時服務員工自助查閱與 HR 集中管理兩種場景。

## What Changes

- **HR 管理中心**（`organization/employee-management`）：升級為人員管理主入口，整合 7 Tab 可編輯詳情 Modal（基本資料、職務異動、文件管理、訓練紀錄、績效評核、ROI 分析、帳號與權限）、HR 儀表板（KPI、到期文件、ROI、週年提醒）、新增員工（自動建 User 帳號）、批次匯入
- **員工自助**（`employee/profile`）：重新定位為員工自助查閱頁，按權限範圍（`view_scope`）顯示員工清單，共用 6 Tab 唯讀 Modal（不含帳號與權限 Tab），移除 HR 專屬功能（儀表板、新增、編輯）
- **帳號總覽**（`settings/users`）：精簡為帳號快速總覽頁，顯示帳號狀態/角色/最後登入，提供快速操作（啟用/停用/密碼重設），詳細管理導向 `organization/employee-management`
- **統一 Employee 資料模型**：合併 `organization.model.ts` 和 `talent-pool.model.ts` 兩套 Employee 介面，支援跨公司 `positions[]` 與完整歷程欄位
- **統一帳號建立服務**：三個入口（面試錄取、HR 手動新增、批次匯入）共用後端邏輯，自動建 Employee + User + 預設 employee 角色
- **批次匯入**：兩階段制（先全部驗證→預覽報告→確認後才匯入），支援組織架構比對驗證、重複偵測、背景處理、進度回報、結果報告下載

## Non-Goals

- **SMTP 郵件發送**：不在此變更範圍內。密碼發送現階段維持「顯示/匯出臨時密碼」模式，預留 SMTP 接口供未來擴充
- **員工自助編輯個人資料**：`employee/profile` 定位為唯讀，員工不可自行修改資料
- **組織架構管理重構**：`organization` 模組的公司/部門 CRUD 維持現狀不動
- **角色權限管理頁面變更**：`settings/roles` 頁面維持現狀不動

## Capabilities

### New Capabilities

- `shared-employee-detail`: 共用員工詳情元件，支援 7 Tab（基本資料、職務異動、文件管理、訓練紀錄、績效評核、ROI 分析、帳號與權限），透過 `readonly` 輸入控制唯讀/可編輯模式，帳號與權限 Tab 由 `SYS.user-management` 功能權限獨立控制
- `unified-employee-model`: 統一 Employee 資料模型，合併跨公司職位 `positions[]` 與完整歷程欄位（異動、文件、訓練、績效、ROI），前後端共用同一套介面定義與 API
- `unified-account-creation`: 統一帳號建立服務，三個入口（面試錄取入職、HR 手動新增、批次匯入）共用後端邏輯，自動建立 Employee + User + 指派預設 employee 角色，密碼策略為系統產生隨機密碼 + `must_change_password` 強制首次改密，預留 SMTP 擴充接口
- `batch-employee-import`: 批次員工匯入功能，支援 CSV 上傳→兩階段驗證（格式驗證 + 組織架構比對）→預覽報告（每筆 ✓/✗ + 錯誤原因）→全部通過後才可確認匯入→背景處理 + 進度回報→匯入結果報告（含臨時密碼，可下載）→稽核紀錄
- `employee-self-service`: 員工自助檔案查閱頁面，按 `L1.profile` 的 `view_scope` 權限控制可見範圍，共用 `shared-employee-detail` 元件（唯讀模式，6 Tab 不含帳號與權限），無 HR 儀表板與管理操作
- `hr-employee-hub`: HR 員工管理中心頁面，整合 HR 儀表板（KPI 卡片、到期文件警示、部門 ROI、週年提醒）、員工清單（搜尋/篩選/分頁/雙視圖）、新增員工、批次匯入入口，共用 `shared-employee-detail` 元件（可編輯模式，7 Tab 含帳號與權限）
- `user-overview-lite`: 精簡版帳號總覽頁面，顯示帳號清單（狀態/角色/最後登入）、快速操作（啟用/停用/密碼重設），詳細管理提供導向連結至 HR 員工管理中心

### Modified Capabilities

- `employee-onboarding-automation`: 入職帳號建立邏輯改為呼叫統一帳號建立服務（`unified-account-creation`），不再獨立實作密碼產生與 User 建立
- `admin-portal`: `settings/users` 頁面精簡為帳號總覽，移除使用者建立功能，新增導向連結至 HR 員工管理中心

## Impact

- **影響模組**：L1 員工管理（`/employee`）、組織管理（`/organization`）、系統設定（`/settings`）
- **影響路由**：`/employee/profile`、`/organization/employee-management`、`/settings/users`
- **前端影響檔案**：
  - `features/employee/pages/profile-page/` — 重構為自助唯讀頁面
  - `features/organization/pages/employee-management-page/` — 升級為 HR 管理中心
  - `features/tenant-admin/pages/user-management-page/` — 精簡為帳號總覽
  - `features/organization/models/organization.model.ts` — 合併至統一模型
  - `features/employee/models/` — 合併至統一模型
  - `features/employee/services/employee.service.ts` — API 整合
  - `features/organization/services/organization.service.ts` — API 整合
  - `features/tenant-admin/services/tenant-admin.service.ts` — 精簡
  - 新增 `shared/components/employee-detail/` — 共用元件
  - 新增 `shared/models/employee.model.ts` — 統一資料模型
  - 新增 `shared/services/account-creation.service.ts` — 統一帳號建立前端服務
- **後端影響檔案**：
  - `server/src/routes/employee.js` — 擴充統一 Employee API
  - `server/src/routes/tenant-admin.js` — 整合帳號建立邏輯
  - `server/src/routes/hr-onboarding.js` — 改用統一帳號建立服務
  - 新增 `server/src/services/account-creation.js` — 統一帳號建立後端服務
  - 新增 `server/src/routes/batch-import.js` — 批次匯入 API
- **資料庫影響**：
  - `employees` 表：可能新增欄位以支援統一模型
  - 新增 `import_jobs` 表：追蹤批次匯入任務狀態與進度
  - 新增 `import_results` 表：儲存匯入結果報告
