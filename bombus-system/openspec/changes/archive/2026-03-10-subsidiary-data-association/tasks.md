## Group 1：DB Schema 遷移

### 1.1 新增 org_unit_id 欄位至 6 張表

- [x] 修改 `server/src/db/tenant-schema.js` 的 `initTenantSchema()` 函數，在現有 ALTER TABLE 遷移區塊後，加入 6 個 ALTER TABLE + CREATE INDEX。用 try-catch 包裝確保冪等。表：job_descriptions、competencies、grade_salary_levels、department_positions、promotion_criteria、career_paths。**驗證**：啟動 server `cd bombus-system/server && npm run dev`，執行 `SELECT * FROM pragma_table_info('job_descriptions')` 確認 org_unit_id 欄位存在；對其他 5 張表重複確認

> 依賴：無前置依賴

## Group 2：後端 API — 職務說明書

### 2.1 修改 job-descriptions.js GET/POST/PUT

- [x] [P] 修改 `server/src/routes/job-descriptions.js`。GET `/`：從 `req.query.org_unit_id` 取值，有值時 SQL 加 `AND (org_unit_id IS NULL OR org_unit_id = ?)`。POST `/`：從 `req.body.org_unit_id` 取值，INSERT 時帶入。PUT `/:id`：從 `req.body.org_unit_id` 取值，UPDATE 時帶入。**驗證**：`curl "http://localhost:3001/api/job-descriptions?org_unit_id=xxx"` 回傳篩選後結果；POST 帶 org_unit_id 建立 JD 後，GET 可以篩選到

> 依賴：Group 1

## Group 3：後端 API — 職能模型

### 3.1 修改 competency-management.js GET/POST/PUT

- [x] [P] 修改 `server/src/routes/competency-management.js`。GET `/:category`：加 `req.query.org_unit_id` 篩選，SQL 加 `AND (org_unit_id IS NULL OR org_unit_id = ?)`。POST `/:category`：body 接受 org_unit_id，INSERT 帶入。PUT `/:category/:id`：body 接受 org_unit_id，UPDATE 帶入。**驗證**：`curl "http://localhost:3001/api/competency-mgmt/core?org_unit_id=xxx"` 回傳篩選結果

### 3.2 修改 competency.js GET

- [x] [P] 修改 `server/src/routes/competency.js`。GET `/competencies`：加 `req.query.org_unit_id` 篩選，有值時 SQL 加 `AND (c.org_unit_id IS NULL OR c.org_unit_id = ?)`。**驗證**：`curl "http://localhost:3001/api/competencies?category=core&org_unit_id=xxx"` 回傳篩選結果

> 依賴：Group 1

## Group 4：後端 API — 職等職級

### 4.1 修改 grade-matrix.js READ 端點

- [x] [P] 修改 `server/src/routes/grade-matrix.js`。GET `/`：加 `req.query.org_unit_id`，grade_levels 保持全部回傳，salary_levels 子查詢加 `AND (gsl.org_unit_id IS NULL OR gsl.org_unit_id = ?)`。GET `/positions/list`：加篩選。GET `/promotion/criteria`：加篩選。GET `/career/paths`：加篩選。**驗證**：呼叫各端點帶 org_unit_id 參數，確認回傳結果只包含共用和指定子公司的資料

### 4.2 修改 grade-matrix.js CRUD 端點（含審核流程）

- [x] 修改 `server/src/routes/grade-matrix.js`。所有 POST/PUT 端點的 `new_data` JSON 接受 `org_unit_id`（影響端點：salaries、positions、promotion/criteria、career/paths 的 POST 和 PUT）。修改 `applyCreate` 函數：從 `JSON.parse(change.new_data).org_unit_id` 取值，INSERT 到 `grade_salary_levels`、`department_positions`、`promotion_criteria`、`career_paths` 時帶入。修改 `applyUpdate` 函數：UPDATE SET 加入 `org_unit_id = ?`。完整傳遞路徑：前端 POST → `grade_change_history.new_data` JSON 含 `org_unit_id` → approve → `applyCreate`/`applyUpdate` 從 JSON 取出 → INSERT/UPDATE 帶入實際表。**驗證**：建立新 salary level 帶 org_unit_id → approve → GET 確認 org_unit_id 正確寫入 grade_salary_levels

> 依賴：Group 1；4.2 依賴 4.1

## Group 5：前端 — CompetencyService

### 5.1 修改 CompetencyService 方法

- [x] 修改 `src/app/features/competency/services/competency.service.ts`。**READ 方法**加入可選 `orgUnitId` 參數並在 URL 附加 `?org_unit_id=`：getJobDescriptions、getCoreCompetenciesWithLevels、getManagementCompetenciesWithLevels、getProfessionalCompetenciesWithLevels、getKSACompetencies、getGradeMatrixFromAPI、getDepartmentPositions、getPromotionCriteria、getCareerPathsFromAPI。**CRUD 方法**的 data 物件加入 `org_unit_id`（含 create 和 update）：createJobDescription、updateJobDescription、createSalaryLevel、updateSalaryLevel、createPosition、updatePosition、createPromotionCriteria、updatePromotionCriteria、createCareerPath、updateCareerPath。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無型別錯誤

> 依賴：Groups 2-4（API 端點先就緒）

## Group 6：前端 — 職務說明書頁面

### 6.1 連接子公司篩選到 JD 資料載入

- [x] [P] 修改 `src/app/features/competency/pages/job-description-page/job-description-page.component.ts`。加入 effect：`selectedSubsidiaryId` 變化時呼叫 `loadJobDescriptions()`。`loadJobDescriptions()` 傳入 `{ orgUnitId: this.selectedSubsidiaryId() }`。建立新 JD 的表單資料帶入 `org_unit_id: this.selectedSubsidiaryId()`。**驗證**：開啟 JD 頁面 → 選擇子公司 → JD 列表更新 → 建立新 JD → 確認 org_unit_id 正確

> 依賴：Group 5

## Group 7：前端 — 職能模型基準頁面

### 7.1 新增子公司篩選功能

- [x] [P] 修改 `src/app/features/competency/pages/framework-page/framework-page.component.ts`。注入 OrgUnitService，加入 `selectedSubsidiaryId` signal + `subsidiaries` computed。ngOnInit 中載入 org units + 鎖定子公司。加入 effect：`selectedSubsidiaryId` 變化時重新載入四類職能（core/management/professional/ksa），呼叫時傳入 orgUnitId。建立新職能時帶入 org_unit_id

### 7.2 修改 framework-page HTML

- [x] 修改 `src/app/features/competency/pages/framework-page/framework-page.component.html`。在頁面頂部篩選區域加入子公司下拉選單（使用標準模式：`@if (subsidiaries().length > 0) { <select ...> }`）。**驗證**：開啟職能模型頁面 → 子公司下拉出現 → 選擇子公司 → 四類職能列表更新

> 依賴：Group 5；7.2 依賴 7.1

## Group 8：前端 — 職等職級管理頁面

### 8.1 連接子公司篩選到職等資料載入

- [x] [P] 修改 `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts`。加入 effect：`selectedSubsidiaryId` 變化時重新載入資料。各載入方法傳入 orgUnitId：getGradeMatrixFromAPI、getDepartmentPositions、getPromotionCriteria、getCareerPathsFromAPI。CRUD 操作的 data 帶入 org_unit_id。**驗證**：開啟職等頁面 → 選擇子公司 → 薪級表/職位表/晉升條件更新 → 新增薪級帶 org_unit_id

> 依賴：Group 5

## Group 9：Build 驗證

### 9.1 Angular Build

- [x] 執行 `cd bombus-system && npx ng build --configuration=development`，確認 0 errors。**驗證**：build 成功，無編譯錯誤

### 9.2 功能驗證場景

- [x] **場景 A — JD 頁面**：選子公司 → JD 列表篩選正確 → 建新 JD 帶 org_unit_id → 再次篩選可見
- [x] **場景 B — 職能頁面**：子公司下拉出現 → 選子公司 → 四類職能列表更新 → 建新職能帶 org_unit_id
- [x] **場景 C — 職等頁面**：選子公司 → 薪級/職位/晉升表篩選正確 → 審核流程帶 org_unit_id
- [x] **場景 D — 向下相容**：不選子公司（全部）→ 三個頁面顯示所有資料（含 NULL 和有值的）

> 依賴：Groups 6-8
