## 1. 後端：資料遷移策略 — data migration for existing NULL records

- [x] 1.1 實作 data migration for existing NULL records：在 `tenant-schema.js`（涉及檔案）與 `tenant-db-manager.js` 的 `_runMigrations()` 新增遷移，將 `grade_salary_levels`、`grade_track_entries`、`promotion_criteria`、`department_positions` 中 `org_unit_id = NULL` 的資料更新為集團 org_unit_id（資料歸屬：消滅 NULL，綁定明確 org_unit_id）。參考現有資料分佈（Demo 租戶）進行驗證。驗證：啟動 server，查詢 `SELECT COUNT(*) FROM grade_salary_levels WHERE org_unit_id IS NULL` 應為 0
- [x] 1.2 更新 `tenant-schema.js` 的 UNIQUE constraint：從 `UNIQUE(code, COALESCE(org_unit_id, '__NULL__'))` 改為 `UNIQUE(code, org_unit_id)`，實現 org-unit-bound grade salary data。驗證：嘗試插入 `org_unit_id = NULL` 的 salary level 應失敗

## 2. 後端：GET API 查詢簡化 — remove salary code cascade logic + org-unit-bound grade salary data

- [x] 2.1 在 `grade-matrix.js` 刪除 `cascadeSalaryCodes()` 和 `cascadeSalaryCodesDown()` 函數（約 180 行）及所有呼叫點（移除 cascade 邏輯），完成 remove salary code cascade logic。驗證：搜尋 `cascadeSalary` 在整個 server 目錄應無結果
- [x] 2.2 在 `grade-matrix.js` 移除所有 `org_unit_id IS NULL` 的 fallback 查詢分支，統一改為 `WHERE org_unit_id = ?`（GET API 查詢簡化）。涉及 GET `/`、GET `/:grade`、POST/PUT grades、POST `track-detail-save` 等端點。驗證：搜尋 `IS NULL` 在 `grade-matrix.js` 應無結果
- [x] 2.3 在 `hr-onboarding.js` 移除 3 處薪資查詢的 `IS NULL` fallback，改為直接用員工所屬 org_unit_id 查詢。驗證：入職流程查詢薪資等級應正確回傳該子公司的資料

## 3. 後端：範本複製 API 設計 — Template import from parent company

- [x] 3.1 在 `grade-matrix.js` 新增 `POST /import-template` 端點（template import from parent company）：接收 `source_org_unit_id` 和 `target_org_unit_id`，以 `db.transaction()` 複製 `grade_salary_levels`、`grade_track_entries`、`promotion_criteria`、`department_positions`，生成新 UUID。目標已有資料時回傳 400、來源無資料時回傳 400。驗證：用 curl 呼叫 API，確認回傳正確的 imported 計數；重複呼叫應回傳 400

## 4. 前端：前端空狀態設計 — Frontend empty state with template import action

- [x] 4.1 在 `competency.service.ts` 新增 `importGradeTemplate(sourceOrgUnitId, targetOrgUnitId)` 方法，呼叫 `POST /api/grade-matrix/import-template`。複用元件與服務：NotificationService 顯示成功/失敗提示。驗證：TypeScript 編譯無錯誤
- [x] 4.2 在 `grade-matrix-page.component.ts` 移除 overviewSubsidiaryId 的 NULL/空值 fallback 邏輯，確保查詢都帶入明確的 org_unit_id（對應 org-unit-bound grade salary data）。驗證：切換子公司時只顯示該公司的資料
- [x] 4.3 在 `grade-matrix-page.component.html/scss` 加入空狀態區塊（frontend empty state with template import action）：無資料時顯示 `@include empty-state` 搭配「從母公司帶入範本」按鈕（`$color-l2-terracotta` 模組色）。母公司無資料時按鈕禁用並顯示 tooltip。驗證：選擇無資料的子公司時看到空狀態；點擊帶入後資料正確載入

## 5. 驗證與回歸測試

- [x] 5.1 端對端驗證：建立新子公司 → 職等薪資頁面應為空狀態 → 點擊「從母公司帶入」→ 資料正確顯示 → 編輯子公司薪資 → 母公司資料不受影響。Angular build 無錯誤，後端無 console error
