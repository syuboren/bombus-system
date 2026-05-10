## Why

客戶 L0 權限與系統設定回饋 D-13：「提供系統層級的員工大表（分頁效能優化，支援 150+ 筆分頁）」。目前 `GET /api/employee/list` 全量回傳所有員工（無 LIMIT/OFFSET、無索引、employees 表除 PRIMARY KEY 外完全沒有索引），且前端列表頁無分頁元件 — 在 200+ 員工的租戶下會出現載入卡頓與滾動疲勞。本變更為員工列表頁增加伺服端分頁、搜尋與排序，以滿足大型企業使用情境。

## What Changes

- **`GET /api/employee/list` 增量擴充**：新增 `page / pageSize / search / sort / order` 五個 query params；採向後相容策略 — 不傳 `page` 維持現行 array 回傳，傳 `page` 才回 `{ data, total, page, pageSize, totalPages }` 物件，5 個既有 caller（employee.service / interview.service / meeting.service 等）零修改。
- **搜尋**：`search` 參數對 `name / email / employee_no` 做 LIKE 比對（COLLATE NOCASE），與既有 dept/status/org_unit_id/role 過濾共存後再分頁。
- **排序白名單**：`sort ∈ [name, hire_date, employee_no, department]`、`order ∈ [asc, desc]`，預設維持 `ORDER BY department, name`。白名單避免 SQL injection。
- **分頁上限**：`pageSize` default=50, max=200（>200 自動 cap），對應 xlsx 規格「支援 150+ 筆」。
- **DB 索引**：新增 `idx_employees_status_org_dept_name` 對應 ORDER BY 與既有 status filter（per memory 雙清單同步：`tenant-schema.js initTenantSchema()` 與 `tenant-db-manager.js _runMigrations()` 同步寫入）。
- **L1 員工管理 — 兩個列表頁同步加分頁/排序/搜尋**：
  - HR `/organization/employee-management` 的 list 視圖：加搜尋輸入框（debounce 300ms）、排序欄頭（name/employee_no/department/hire_date toggle asc/desc）、paginator（[20,50,100,200] options，預設 50），矩陣視圖與卡片視圖維持原行為不變
  - 員工自助 `/employee/profile`：表格直接從全量改為伺服端分頁，加搜尋 debounce 300ms、排序欄頭（name/department/hire_date）、paginator 同上
- **前端服務**：`EmployeeService` 新增 `getEmployeesPaginated(opts)` 方法 + `EmployeeListResult` interface，既有 `getEmployees()` 不破壞。
- **測試覆蓋**：新建 `test-d13-employee-list-pagination.js`，涵蓋向後相容、分頁、搜尋、排序、過濾共存、pageSize cap 等 6 個情境。

## Non-Goals

- **矩陣視圖切換到分頁**：D-03 矩陣視圖已用 CDK Virtual Scroll 處理 500+ 筆，無需分頁化；本次仍走全量 `?all=true`。
- **匯出 CSV 走分頁**：員工視角 CSV 匯出（D-04）保持全量輸出，否則內控留存資料不完整。
- **其他 caller 改造**：onboarding-documents-page、employee-detail、org-structure-page、interview/meeting service 等 caller 維持全量陣列回傳，不在本次 scope（profile-page 經 user 確認後納入本次範圍，已從 Non-Goals 移出）。
- **客戶端排序/篩選**：刻意不做 — 客戶端排序在分頁下會失真，必須伺服端統一處理。
- **無限滾動 (infinite scroll)**：只做傳統 paginator；無限滾動會與既有 paginator UI 模式產生不一致。

## Capabilities

### New Capabilities

- `employee-list-pagination`: 員工列表 API 的伺服端分頁、搜尋與排序契約 — 涵蓋向後相容回傳格式、query params、白名單規則、pageSize cap、搜尋欄位範圍、排序欄位範圍、與既有 scope filter 共存規則。

### Modified Capabilities

- `hr-employee-hub`: list 視圖加搜尋輸入框、排序欄頭、paginator；矩陣與卡片視圖不變。
- `employee-self-service`: `/employee/profile` 員工目錄表格切伺服端分頁，加 debounce 搜尋、排序欄頭、paginator。

## Impact

**受影響模組與路由**：
- L1 員工管理 — `/organization/employee-management`（list 視圖增量；matrix / card 視圖不變）

**受影響後端**：
- `server/src/routes/employee.js` GET /list 端點擴充 query params + 條件式分頁回傳
- `server/src/db/tenant-schema.js` 加索引到 INDEX_DEFINITIONS（initTenantSchema 路徑）
- `server/src/db/tenant-db-manager.js` _runMigrations 加冪等 CREATE INDEX IF NOT EXISTS

**受影響前端**：
- `src/app/features/employee/services/employee.service.ts` 加 `getEmployeesPaginated()` + `EmployeeListResult` interface
- `src/app/features/organization/pages/employee-management-page/employee-management-page.component.{ts,html,scss}` list 視圖加 paginator/search/sort
- `src/app/features/employee/pages/profile-page/profile-page.component.{ts,html,scss}` 員工目錄表格切伺服端分頁 + 搜尋 debounce + 排序欄頭 + paginator

**受影響資料**：
- 既有員工資料零變動（只加索引，不改 schema）

**測試**：
- 新增 `server/src/tests/test-d13-employee-list-pagination.js`

**API 契約變更（向後相容）**：
- `GET /api/employee/list?page=1&pageSize=50` → 新回傳格式 `{ data, total, page, pageSize, totalPages }`
- `GET /api/employee/list`（不帶 page）→ 維持現行 array

**驗證指令**：
- `cd bombus-system && npx tsc --noEmit`
- `cd bombus-system && npx ng build --configuration=development`
- `cd bombus-system/server && node src/tests/test-d13-employee-list-pagination.js`
