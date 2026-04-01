## Why

員工入職流程中，文件簽署與資料上傳是最關鍵的步驟。目前這些操作分散在 `/employee/onboarding` 獨立模組中，員工需要特別導航到入職頁面才能完成。而 HR 在 `settings/user`（員工與帳號管理）查看員工時，也無法直接管理該員工的入職文件。

此變更將入職文件簽署與資料上傳能力嵌入 Employee Detail Modal 的 documents tab，讓員工從 `/employee/profile` 查看自己的檔案時可以直接完成簽署與上傳，HR 從 `settings/user` 管理員工時也能直接檢視簽署狀態並代為上傳資料。透過身份自動推導（`isSelf = 登入者 employeeId === 檢視對象 employeeId`）決定操作權限，消除配置錯誤風險。

## What Changes

- **升級 Employee Detail Modal 的 documents tab**：從純唯讀狀態展示，升級為可互動的文件管理介面
- **入職文件簽署區塊**：顯示所有待簽署/已簽署文件狀態，`isSelf` 時顯示「前往簽署」連結（跳轉至 `/employee/onboarding/sign/:token`），非本人時僅顯示狀態
- **入職資料上傳區塊**：5 種固定文件類型 + 無限自訂文件，`isSelf || hasEditPerm` 時可上傳/重傳/刪除，支援 Modal 內直接上傳操作
- **身份推導權限**：自動比對登入者 `employeeId` 與檢視對象，決定可用操作，無需父元件傳遞 mode 參數

## Non-Goals

- **不修改現有簽署流程**：簽署仍透過 `/employee/onboarding/sign/:token` 完成，不在 Modal 內嵌簽名板
- **不新增後端 API**：複用現有 `/api/employee/submissions`、`/api/employee/documents`、`/api/employee/documents/progress` 端點
- **不新增資料表**：使用現有 `submissions`、`employee_documents` 表
- **不調整入職模組本身**：`/employee/onboarding` 頁面功能不變

## Capabilities

### New Capabilities

- `employee-document-portal`: Employee Detail Modal 的 documents tab 升級為可互動的入職文件管理入口，支援身份推導權限控制（本人可簽署＋上傳，HR 可查看＋代傳）

### Modified Capabilities

（無）

## Impact

- **影響模組**：L1 員工管理（`/employee/profile`、`settings/user`）
- **影響元件**：
  - `shared/components/employee-detail/employee-detail.component.ts` — documents tab 主要改造對象
  - `shared/components/employee-detail/employee-detail.component.html` — 模板升級
  - `shared/components/employee-detail/employee-detail.component.scss` — 樣式新增
- **複用服務**：
  - `features/employee/services/onboarding.service.ts` — 文件上傳/簽署狀態查詢
  - `features/employee/services/employee.service.ts` — 員工資料
  - `features/auth/services/auth.service.ts` — 身份推導（currentUser employeeId）
  - `core/services/notification.service.ts` — 操作回饋
- **複用元件**：
  - `shared/components/status-badge/` — 文件狀態標記
- **API 微調**：`POST /api/auth/login` 回應的 user 物件新增 `employee_id` 欄位（既有資料，新增回傳），其餘端點不變
- **無 DB 變更**：全部使用現有資料表
