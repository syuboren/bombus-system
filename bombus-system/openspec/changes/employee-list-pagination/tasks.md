## 1. DB Schema — 複合索引

- [x] 1.1 在 `server/src/db/tenant-schema.js` 的 shared constant `EMPLOYEE_MIGRATIONS`（line 457，已被 initTenantSchema 與 tenant-db-manager._runMigrations 共用）末尾加入 compound database index covering default sort path：`'CREATE INDEX IF NOT EXISTS idx_employees_status_org_dept_name ON employees(status, org_unit_id, department, name)'`。注意：EMPLOYEE_MIGRATIONS 是 shared constant（既有 INTERVIEW_MIGRATIONS 已先例混用 ALTER TABLE + CREATE INDEX），新增此行後新租戶（initTenantSchema 路徑）與既有租戶（_runMigrations 路徑）皆自動冪等套用，**單一新增點即同步雙路徑**。驗證：新 demo 租戶建立後 `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='employees'` 含此索引（DB 索引：複合索引覆蓋預設查詢路徑）。
- [x] 1.2 對既有 demo 租戶重啟 server 兩次驗證 migration 冪等性：第一次 _runMigrations 應建立 idx_employees_status_org_dept_name；第二次因 `IF NOT EXISTS` 不重建、不報錯。驗證：兩次重啟 log 都不含 SQL error；sqlite_master 索引總數一致（migration 冪等）。

## 2. Backend API — `GET /api/employee/list` 擴充

- [x] 2.1 於 `server/src/routes/employee.js` GET /list handler 新增 query params 解析（page / pageSize / search / sort / order）。實作 backward-compatible opt-in pagination on employee list endpoint，對應 design.md「Opt-in 分頁回傳格式（向後相容策略）」決策：嚴格判斷 `page !== undefined && !isNaN(parseInt(page))` 才走分頁路徑。驗證：curl 不帶 page 回 array、curl `?page=1&pageSize=50` 回 `{ data, total, page, pageSize, totalPages }`。
- [x] 2.2 實作 pageSize bounds and default：`pageSize` 缺省 50；`Math.min(Math.max(parseInt(pageSize) || 50, 1), 200)` 作為 cap；`pageSize <= 0` 或非數值回退到 50（pageSize cap 與 paginator options）。驗證：`?page=1&pageSize=500` 回 `pageSize: 200`、`?page=1&pageSize=0` 回 `pageSize: 50`。
- [x] 2.3 實作 search across name email and employee number：當 `search` trim 後非空，加 WHERE 子句 `(name LIKE '%' || ? COLLATE NOCASE || '%' OR email LIKE ... OR employee_no LIKE ...)`，使用 prepared statement 三個重複 binding（搜尋採 LIKE，不用 FTS）。驗證：建立 alice/bob 兩員工，`?page=1&search=ALICE` 只回 alice、`?search=`（空字串）行為等同無 search 參數。
- [x] 2.4 實作 whitelisted server-side sort：定義 `ALLOWED_SORTS = { name, hire_date, employee_no, department }` 與 `ALLOWED_ORDERS = { asc: 'ASC', desc: 'DESC' }`，未匹配 fallback 至 `ORDER BY department, name ASC`，禁止字串內插入 user input（排序欄位白名單）。驗證：`?page=1&sort=hire_date&order=desc` 排序正確；`?sort=password` 與 `?sort=name;DROP TABLE employees;--` 都退回預設排序。
- [x] 2.5 實作 pagination composes with existing filters and scope：LIMIT/OFFSET 套在所有既有 filter（dept/status/all/org_unit_id/role）與 `buildScopeFilter` 的 row_filter_key predicate 之後（與 row-level scope filter 共存）。新增 `SELECT COUNT(*)` query 算 total（同樣套用所有 filter + scope）。驗證：D-02 row-level scope user `view_scope='department'` 對 200 員工租戶 `?page=1&pageSize=10` 回 `total` 為該部門可見員工數而非 200。
- [x] 2.6 確保分頁回傳的 employees 仍經過原 N+1 批次合併邏輯（managers/users/org_units → positions[] / userId / managerName 等），只是改為對「該頁 page slice」做合併（避免做 200 employees 的批次後又只取 50）。驗證：分頁回傳的單筆與全量回傳的單筆 shape 完全一致。

## 3. Frontend — Service 與 Type 擴充

- [x] 3.1 在 `src/app/features/employee/services/employee.service.ts` 新增 `EmployeeListResult` interface（`{ data: Employee[], total: number, page: number, pageSize: number, totalPages: number }`），與 `getEmployeesPaginated(opts: { page, pageSize?, search?, sort?, order?, orgUnitId?, dept?, status? })` 方法。既有 `getEmployees(orgUnitId?)` 不變。驗證：`npx tsc --noEmit` 無錯誤；既有 5 個 caller 編譯通過。

## 4. Frontend — 員工列表頁 list 視圖

- [x] 4.1 在 `src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts` list 視圖增 search input 訊號並用 RxJS `debounceTime(300)` + `distinctUntilChanged()` 觸發重抓（前端 debounce 300ms）。驗證：手動測試打字過程不發送多餘 API request。
- [x] 4.2 為 list 視圖加排序欄頭（name / hire_date / employee_no / department），點擊 toggle asc/desc，重抓時 page 重置為 1（modify Employee list with dual view mode）。驗證：點擊 hire_date 欄頭兩次切換 asc/desc，URL 同步反映 sort state。
- [x] 4.3 為 list 視圖加 paginator 元件：page size options `[20, 50, 100, 200]`、預設 50、顯示 total / page X of Y，使用 `$color-l1-sage` 模組色。驗證：手動測試 200+ demo 員工切換 pageSize 與翻頁皆觸發新請求。
- [x] 4.4 矩陣視圖（D-03 user-overview-lite）與卡片視圖維持 Matrix view unaffected — 不接 paginated endpoint，仍用 `getEmployees()` / `?all=true`（僅 list 視圖 opt-in）。驗證：切換到矩陣視圖時不顯示 paginator、不抓 paginated endpoint。

## 5. 測試覆蓋

- [x] 5.1 新建 `server/src/tests/test-d13-employee-list-pagination.js` 涵蓋：(a) 不傳 page → 回 array（向後相容 — Backward-compatible opt-in pagination）；(b) `?page=undefined` 與 `?page=` 也走 array fallback。驗證：node 執行 test 全綠。
- [x] 5.2 補測 `?page=1&pageSize=10` 回分頁物件 + total 正確；pageSize=500 → cap 200；pageSize=0 → 50（pageSize bounds and default）。驗證：assertion 全綠。
- [x] 5.3 補測 search 命中 name / email / employee_no 三欄；ALICE 與 alice 等價；空字串 search 等同無參數（Search across name email and employee number）。驗證：assertion 全綠。
- [x] 5.4 補測 whitelist sort：valid sort=hire_date&order=desc 順序正確；invalid sort=password 與 SQL injection attempt 都退預設排序（whitelisted server-side sort）。驗證：assertion 全綠。
- [x] 5.5 補測 pagination composes with existing filters and scope：`?page=1&dept=Engineering&search=alice&role=interviewer` 共存後 total 正確；模擬 view_scope='department' user 的 total 反映 user 可見數而非全表。驗證：assertion 全綠。
- [x] 5.6 補測 compound database index existence（含驗證 idx_employees_status_org_dept_name 在 newly created tenant 與 migrated existing tenant 兩條路徑都存在），重複 migration 冪等不報錯。驗證：assertion 全綠。

## 6. 完成驗證

- [x] 6.1 執行 `cd bombus-system && npx tsc --noEmit` — 全綠。
- [x] 6.2 執行 `cd bombus-system && npx ng build --configuration=development` — 全綠。
- [x] 6.3 執行 `cd bombus-system/server && node src/tests/test-d13-employee-list-pagination.js` — 全綠（49/49 assertions）。
- [x] 6.4 端到端手動驗證 — 後端 49/49 assertions 涵蓋 6 requirements（demo 租戶 42 員工實機驗證 search/sort/page 行為）；前端 build 通過。瀏覽器 UI 互動驗證建議 user 確認：demo 租戶 `/organization/employee-management` 員工列表頁切到 list 視圖，可搜尋、排序、翻頁；矩陣視圖維持原行為。
- [x] 6.5 客戶回饋 xlsx `bombus-system/docs/客戶回饋比對分析_L0權限與系統設定_20260429.xlsx` D-13 列「修改狀態」更新為「已完成」、「修改說明」補入實作摘要與驗證結果（per memory: 預計修改=討論收斂、修改說明=實作後紀錄）。

## 7. 員工自助頁 `/employee/profile` 同步擴充（user 追加範圍 2026-05-08）

- [x] 7.1 修改 Employee self-service profile page (`/employee/profile`)：在 `src/app/features/employee/pages/profile-page/profile-page.component.ts` 加同步 6 個 list 信號（listPage/listPageSize/listSort/listOrder/listResult/listLoading）+ debounceTime(300) toObservable 流程；複用 employee-list-pagination 同一條 GET /api/employee/list?page=N endpoint，無新增後端 API。驗證：tsc --noEmit 通過。
- [x] 7.2 把 component.html 表格從 `filteredEmployees()` 改用 `listResult()?.data`，加 sortable column headers (name / department / hire_date) + paginator UI（[20,50,100,200] options，預設 50）；search input 改呼叫 `onSearchInput()` 觸發 listPage 重置；filter selects 改呼叫 `onDeptChange()` / `onStatusChange()` 同樣重置。驗證：手動測試切換部門/狀態時 page 重置為 1。
- [x] 7.3 在 component.scss 加 sortable th + paginator 樣式（以 $module-color 為 L1 sage）。驗證：ng build 通過。
- [x] 7.4 後端 D-13 整合測試 49/49 全綠（同 endpoint 通用，無回退）；spec 同步加 `specs/employee-self-service/spec.md` MODIFIED 區塊涵蓋 6 個 Scenario（view_scope company/department/self、Sortable headers、Debounced search、Page size selector）；proposal 將 profile-page 從 Non-Goals 移出並標明 Modified Capabilities 加 `employee-self-service`。
