## Group 1：後端 — Career Paths CRUD

### 1.1 新增 career paths POST/PUT/DELETE 端點

- [x] 修改 `server/src/routes/grade-matrix.js`，在 GET `/career/paths/:id` 之後新增 POST `/career/paths`、PUT `/career/paths/:id`、DELETE `/career/paths/:id`。每個端點接受 `org_unit_id`，使用 `createChangeRecord(req, 'career', ...)` 走審核流程。**驗證**：POST 帶 org_unit_id 建立 career path → approve → GET 確認 org_unit_id 正確寫入

### 1.2 applyCreate/applyUpdate/applyDelete 加入 career case

- [x] 修改 `applyCreate`：加入 `case 'career':` INSERT INTO career_paths。修改 `applyUpdate`：加入 `case 'career':` UPDATE career_paths SET ... org_unit_id = ?。修改 `applyDelete`：tableMap 加入 `career: 'career_paths'`。**驗證**：審核通過後 career_paths 表寫入正確

> 依賴：無前置依賴

## Group 2：前端 — CompetencyService CRUD 方法

### 2.1 新增 createCareerPath / updateCareerPath

- [x] 修改 `src/app/features/competency/services/competency.service.ts`。新增 `createCareerPath(data)` 方法 POST `/grade-matrix/career/paths`。新增 `updateCareerPath(id, data)` 方法 PUT `/grade-matrix/career/paths/:id`。**驗證**：TypeScript 編譯無錯誤

### 2.2 CRUD 方法加 org_unit_id

- [x] 修改 `createCompetency` / `updateCompetency` 的 request body 加 `org_unit_id: (data as any).org_unit_id || null`。修改 `createKSACompetency` / `updateKSACompetency` 的 request body 加 `org_unit_id`。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無錯誤

> 依賴：Group 1

## Group 3：前端 — JD 頁面職能篩選

### 3.1 修改 job-description-page.component.ts

- [x] 提取 `loadCompetencies()` 方法，傳入 `this.selectedSubsidiaryId()` 給 getCoreCompetenciesWithLevels、getManagementCompetenciesWithLevels、getKSACompetencies。constructor effect 加入 `this.loadCompetencies()` 呼叫。**驗證**：選擇子公司 → 職能參考列表只顯示該子公司 + 共用

### 3.2 修改 create-jd-page.component.ts

- [x] `loadCompetencies()` 傳入 `this.selectedSubsidiaryId()`。`generateFromContent()` 產生的 JD 帶入 `org_unit_id: this.selectedSubsidiaryId() || null`。**驗證**：建立新 JD → org_unit_id 正確

> 依賴：Group 2

## Group 4：前端 — Modal org_unit_id 傳遞

### 4.1 修改 4 個 Modal 元件

- [x] [P] competency-edit-modal.component.ts：加 `orgUnitId = input<string>('')`，payload 加 `org_unit_id: this.orgUnitId() || null`
- [x] [P] ksa-edit-modal.component.ts：同上
- [x] [P] position-edit-modal.component.ts：加 `orgUnitId` input，`dataWithOrg = { ...data, org_unit_id: this.orgUnitId() || null }`
- [x] [P] promotion-criteria-edit-modal.component.ts：同上

### 4.2 修改父頁面 HTML

- [x] framework-page.component.html：`<app-competency-edit-modal>` 和 `<app-ksa-edit-modal>` 加 `[orgUnitId]="selectedSubsidiaryId()"`
- [x] grade-matrix-page.component.html：`<app-position-edit-modal>` 和 `<app-promotion-criteria-edit-modal>` 加 `[orgUnitId]="selectedSubsidiaryId()"`

> 依賴：Group 2

## Group 5：Build 驗證

### 5.1 Angular Build

- [x] 執行 `cd bombus-system && npx ng build --configuration=development`，確認 0 errors。**驗證**：build 成功，無編譯錯誤

### 5.2 功能驗證場景

- [x] **場景 A — 職能建立**：選子公司 → 新增核心職能 → org_unit_id 正確帶入
- [x] **場景 B — KSA 建立**：選子公司 → 新增 KSA 職能 → org_unit_id 正確帶入
- [x] **場景 C — 職位/晉升建立**：選子公司 → 新增職位/晉升條件 → org_unit_id 正確帶入
- [x] **場景 D — JD 職能篩選**：JD 頁面選子公司 → 職能參考列表更新 → 建新 JD 帶 org_unit_id
- [x] **場景 E — 向下相容**：不選子公司 → 建立資料 org_unit_id 為 NULL

> 依賴：Groups 3-4
