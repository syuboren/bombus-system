## 1. 後端：DB Schema 遷移

- [x] [P] 1.1 修改 `server/src/db/tenant-schema.js`：在 `grade_salary_levels` CREATE TABLE 中移除 `code TEXT UNIQUE NOT NULL`，改為 `code TEXT NOT NULL`。新增 `CREATE UNIQUE INDEX IF NOT EXISTS idx_gsl_code_org ON grade_salary_levels(code, COALESCE(org_unit_id, '__NULL__'))`。驗證：新租戶建立時 schema 正確，允許不同 org_unit_id 使用相同 code
- [x] [P] 1.2 修改 `server/src/db/tenant-db-manager.js`：在 `_runMigrations()` 中新增遷移步驟 — 檢查 `grade_salary_levels` 是否有舊的 `code UNIQUE` 約束，若有則透過 recreate table 方式移除（建新表 → 複製資料 → 刪舊表 → 改名 → 建複合索引）。驗證：重啟 server，已存在的 `tenant_demo.db` 正確遷移，原有資料保留

## 2. 後端：API 薪資查詢 Fallback 邏輯

- [x] 2.1 修改 `server/src/routes/grade-matrix.js`：GET `/api/grade-matrix` 端點的薪資查詢邏輯 — **（W3 修正）** 當提供 `org_unit_id` 時，查詢 `WHERE (org_unit_id = ? OR org_unit_id IS NULL)`，在 JS 層面 per-grade dedup（同一 grade 若有子公司專屬記錄則忽略集團預設記錄）。**未提供 `org_unit_id` 時，薪資查詢必須明確加入 `WHERE org_unit_id IS NULL` 條件，確保只回傳集團預設值（排除子公司覆寫記錄）。** 驗證：curl `GET /api/grade-matrix` 只回傳集團預設薪資；curl `GET /api/grade-matrix?org_unit_id=xxx` 回傳子公司薪資（有覆寫時）或集團預設（無覆寫時）

## 3. 後端：Demo 資料

- [x] 3.1 修改 `server/src/db/migrate-demo.js`：為 demo 租戶的某個子公司新增差異化薪資資料（至少 2 個職等），使 demo 環境可驗證子公司覆寫功能。驗證：執行遷移後，該子公司的薪資與集團預設不同

## 4. 前端：Service 層更新

- [x] 4.1 修改 `src/app/features/competency/services/competency.service.ts`：`getGradeMatrix()` 方法新增可選的 `orgUnitId` 參數，當提供時加入 `org_unit_id` 查詢參數。驗證：TypeScript 編譯通過

## 5. 前端：整體對照表加入子公司篩選

- [x] 5.1 修改 `grade-matrix-page.component.ts`：**（W1 修正）** 新增獨立的 `overviewSubsidiaryId = signal<string>('')` signal（與 Tab B/C 的 `selectedSubsidiaryId` 分離，避免切換 Tab 時互相干擾）。新增 `onOverviewSubsidiaryChange(id: string)` 方法（設定 `overviewSubsidiaryId`、重新呼叫 `loadDataNew()`）。**（W2 修正）** 修改 `loadDataNew()` 使其讀取 `overviewSubsidiaryId()` 傳入 `getGradeMatrix()`，不影響 Tab B/C 的 `selectedSubsidiaryId` 邏輯。驗證：TypeScript 編譯通過
- [x] 5.2 修改 `grade-matrix-page.component.html`：在 Tab A（整體對照表）的 subtab-actions 區域加入子公司篩選 `<select>`，**綁定 `overviewSubsidiaryId`（非 `selectedSubsidiaryId`）**，使用已有的 `filter-select-sm` 樣式，選項為「集團預設」+ 動態子公司列表。驗證：`npx ng build --configuration=development` 成功
- [x] 5.3 修改 `grade-matrix-page.component.scss`：為 Tab A 的篩選器列新增 `.overview-filter-bar` 樣式（flex 排列，與 subtab-actions 同行）。驗證：視覺呈現正確

## 6. 前端：編輯面板子公司綁定

- [x] 6.1 修改 `grade-edit-panel.component.ts`：新增 `orgUnitId = input<string>('')` input。在 `onSave()` 中將 `orgUnitId()` 加入 payload（`payload.orgUnitId = this.orgUnitId() || null`）。驗證：TypeScript 編譯通過
- [x] 6.2 修改 `grade-matrix-page.component.html`：在 `<app-grade-edit-panel>` 標籤加入 `[orgUnitId]="overviewSubsidiaryId()"`（使用 Tab A 獨立的子公司 signal）。驗證：`npx ng build --configuration=development` 成功

## 7. 驗證與收尾

- [x] 7.1 執行 `npx ng build --configuration=development` 確認 Angular 建置無錯誤
- [x] 7.2 啟動後端 server，執行遷移腳本，驗證 DB schema 變更正確（修正：排除 grade_salary_levels 在「NULL → root org」遷移迴圈中 + 加入恢復步驟將已被錯誤歸屬到根組織的薪資記錄轉回 NULL）
- [x] 7.3 端對端手動驗證：
