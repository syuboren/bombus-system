## Why

依《L0權限與系統設定_客戶回饋比對分析_20260429》D-10 / D-14 / D-15 三項，集團型租戶於 Bombus 上有以下實務痛點：

- **D-10 集團跨公司任職**：現行 `employees.org_unit_id` 是單一欄位，HR 主管無法登錄員工同時任職多家子公司（例：HR Tech 兼 HR Sales）。導致薪資、權限、組織圖只看得到主任職那一家，跨公司任職資訊被迫散落於 Excel 或備註欄。
- **D-14 跨公司專屬編號**：當員工跨子公司任職時，集團希望有一組「跨公司可辨識」的統一編號（如 `HQ-001`）以利後續對人事資料、報表、稽核做統一追蹤；現行 `employee_no` 僅 tenant 內 unique，沒有「跨公司身分」概念。
- **D-15 代碼命名規則**：員工編號、部門編號目前採前端固定格式或 HR 手填；客戶要求企業可自訂前綴（如 `ENG-`、`HR-`、`HQ-`）並由系統自動帶流水號。同時 D-16 部門範本批次匯入已預留 `codeGenerator` hook（見 `organization.js:1135`），等本提案落實後啟用。

三項在資料流上強耦合 — D-14 的 `cross_company_code` 由 D-10 的「第二筆任職」事件觸發、且必須使用 D-15 規則生成前綴與流水號。一次到位避免分批落地時的雙寫與切換成本，配合 5/22 批次交付窗口。

## What Changes

### L0 系統設定新增「代碼命名規則」（D-15）

- 新元件 `features/tenant-admin/pages/code-naming-rules-page/`，super_admin 角色獨佔可進入。
- 規則粒度為「每 target 一條」（`employee` / `department` / `employee_cross`），可設定 `prefix` 與 `padding`（流水號補零位數）。
- 規則生效後**只套用於規則生效後新增的記錄**，既有資料不 retrofit（避免破壞 audit trail / 既有 FK）。
- 新增 `services/code-generator.js` 提供 `tryNext(target, ctx)` API，所有業務模組透過此 service 取得下一個編號；無規則時回 `null`，呼叫端 fallback 至既有行為。
- 啟用 D-16 部門批次匯入既有的 `codeGenHook`（`organization.js:1135`）— hook 改為呼叫 `codeGenerator.tryNext('department', ctx)`，覆蓋部門匯入時的編號自動生成。

### L1 員工管理新增「跨公司任職」（D-10）

- 員工檔案頁新增「任職紀錄」區塊：列出該員工所有 `employee_assignments`（含主任職與副任職），可新增、編輯、結束（end_date）。
- 新增「跨公司任職管理 modal」：HR 與 super_admin 可在員工詳情頁勾選該員工跨集團內哪些子公司、各自的部門 / 職等 / 職位 / 起迄日。
- 員工列表 / 個人檔案頁顯示「跨公司」徽章（badge）— 員工有 ≥ 2 筆 active assignments 時顯示，hover 列出所有任職子公司。
- D-02 row-level scope 擴充：HR 主管查詢員工列表時，row_filter 預測 = 員工**所有 assignments 的 org_unit subtree 聯集**（不只主任職），確保跨公司員工被任一子公司 HR 都看得到。

### L1 員工管理新增「跨公司編號」（D-14）

- `employees` 表新增 `cross_company_code TEXT UNIQUE`（per tenant）。
- 觸發時機：員工被加入第 2 筆 active assignment 且 `cross_company_code IS NULL` 時，由 service 層呼叫 `codeGenerator.tryNext('employee_cross', ctx)` 自動生成。
- 編號**永不釋放**（即使員工後來只剩一筆 assignment 仍保留），員工歷程可追溯。
- 員工列表新增「跨公司編號」欄（預設隱藏，可由 super_admin 開啟）；員工檔案頁顯示於姓名旁。

### L0 系統設定 — 員工批次匯入調整

- CSV `employee_no` 欄位**降為 optional**（既有為必填）。
- Validate 階段：空白列預覽「預計分配 `<prefix>0051 ~ <prefix>0100`」；已填列照舊驗 uniqueness。並發批次警告 banner 提示「實際以執行結果為準」。
- Execute 階段：`code_naming_rules` row 在 transaction 內鎖定，依 CSV row 順序消耗 `current_seq`，已填 `employee_no` 不動 seq；HR 手填值若超過 `current_seq` 顯示警告但不自動 bump。
- **批次匯入不觸發 D-14 `cross_company_code`** — 跨公司任職統一在系統 UI 設定，不在批次處理。

## Capabilities

### New Capabilities

- `code-naming-rules`: 平台層級代碼命名規則服務 — 提供 `tryNext(target, ctx)` API、`code_naming_rules` 表、super_admin 設定頁，以及 transaction-safe 的 seq 消耗保護。
- `cross-company-employment`: 員工跨子公司任職資料模型與 UI — `employee_assignments` 表（多筆 1:N 對 employees）、主／副任職管理介面、跨公司權限聯集規則。
- `cross-company-employee-id`: 員工跨公司專屬編號（HQ-xxx）— `employees.cross_company_code` 欄位、生成 trigger、員工歷程追溯。

### Modified Capabilities

- `unified-employee-model`: `UnifiedEmployee` 介面擴充 `assignments: EmployeeAssignment[]` 與 `crossCompanyCode?: string` 欄位；前端 service mapping 同步擴充。
- `hr-employee-hub`: 員工列表新增「跨公司」徽章與「跨公司編號」可見欄位；員工檔案頁新增「任職紀錄」區塊與「跨公司任職管理」modal 入口。
- `feature-perm-data-scope`: `buildScopeFilter` 對 `employees` 與 `users` 來源加入「assignments org_unit subtree 聯集」規則；HR 主管查詢時跨公司員工被聯集子公司任一視為可見。
- `batch-employee-import`: `employee_no` 降為 optional；execute 階段加入 `code_naming_rules` transaction lock；validate 階段加入 seq 預覽與並發警告。
- `department-template-import`: `organization.js:1135` 的 `codeGenHook` 啟用，呼叫 `codeGenerator.tryNext('department', ctx)`。

## Impact

- **新資料表**：`employee_assignments`、`code_naming_rules`
- **新欄位**：`employees.cross_company_code TEXT UNIQUE`
- **雙清單同步遷移**：`tenant-schema.js` + `tenant-db-manager.js` 兩處遷移清單必須同步更新（含新表 CREATE 與 employees ALTER）
- **影響後端檔案**：`server/src/services/code-generator.js`（新）、`server/src/services/employee-assignment.service.ts`（新）、`server/src/routes/employee.js`、`server/src/routes/batch-import.js`、`server/src/routes/organization.js`、`server/src/routes/tenant-admin.js`、`server/src/middleware/scope-filter.js`
- **影響前端模組**：L1 員工管理（員工檔案、列表、批次匯入），L0 系統設定（新增代碼命名規則頁），L1 招募管理（候選人轉員工流程驗證 cross_company_code 不誤觸）
- **連動既有 capability**：D-13 列表查詢需驗證跨公司員工顯示行為、D-16 hook 啟用、D-02 row-level scope 跨 org_unit 聯集
- **權限模型**：super_admin 獨佔 D-15 規則設定、HR 與 super_admin 可進行 D-10 跨公司任職管理（依 L1.profile.edit）
- **不破壞性**：既有 `employees.org_unit_id` 欄位保留為主任職欄位，既有 5 個 `/api/employee/list` caller 不需改動（assignments 為新增欄位）；既有 `employee_no` 不 retrofit
