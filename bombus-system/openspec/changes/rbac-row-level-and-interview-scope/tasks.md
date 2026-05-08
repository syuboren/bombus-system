## 0. 預飛檢查（Pre-flight — 已於 2026-05-08 執行完畢）

- [x] 0.1 ✅ `role_feature_perms` 5 欄結構與 `tenant-schema.js:22-32` 一致；`mergeFeaturePerms(rows) → { action_level, edit_scope, view_scope }` 簽名未變；`interview_invitations.interviewer_id` (line 991) 與 `interviews.interviewer_id` (line 1013) FK 都指向 `employees(id) ON DELETE RESTRICT`
- [x] 0.2 ✅ `idx_invitations_interviewer` 與 `idx_interviews_interviewer_at` 存在於 `INTERVIEW_MIGRATIONS` 共用常數（`tenant-schema.js:412-413`），雙清單透過 `tenant-db-manager.js:415` for loop 自動同步，無需另補
- [x] 0.3 ⚠️ **發現 feature_id 命名落差**：實際 feature_id 為 `L1.recruitment` 與 `L1.decision`（`tenant-schema.js:36-39`），而非 propose 階段假設的 `recruitment.candidates` / `recruitment.interview-evaluations`。已透過 ingest 修正所有 artifacts（`recruitment.js:512/642/676/777/1036` 已套 `requireFeaturePerm('L1.recruitment')`，row_filter 透過 `buildScopeFilter` 自動生效，無須改 routes）
- [x] 0.4 ✅ `users.employee_id` JOIN `user_roles` JOIN `roles` 路徑暢通（`tenant-admin.js:285, 1052` 多處使用）；preflight 期間已撰寫並驗證 SQL clause（見 design.md 決議 6 程式碼區塊）
- [x] 0.5 ⚠️ **API 端點命名修正**：實際端點為 `GET /api/employee/list`（單數 `/api/employee` base + `/list` path，`employee.js:239`），非 `GET /api/employees`。已 ingest 修正
- [x] 0.6 ⚠️ **三個 FeaturePerm interface 都要動**：`tenant-admin.model.ts:102-123` 有 `RoleFeaturePerm` / `FeaturePermPayload` / `UserFeaturePerm` 三個獨立 interface 都需新增 3 欄，已 ingest 修正 task 5.1
- [x] 0.7 ⚠️ **modal employee 來源是 interview.service**：`invite-candidate-modal.component.ts:120` 透過 `this.interviewService.listActiveEmployees()` 取員工（呼叫 `/api/employee/list`），非直呼 EmployeeService。task 6.1–6.3 修正為「擴 `interview.service.ts` 的 `listActiveEmployees(options)` 加 `role?: string` 選項」

## 1. 資料層遷移（雙清單同步，呼應 design.md Risk 2 雙遷移清單同步）

- [x] 1.1 在 `server/src/db/tenant-schema.js` 的 `role_feature_perms` CREATE TABLE 新增 3 欄：`can_approve INTEGER NOT NULL DEFAULT 0`、`approve_scope TEXT DEFAULT NULL CHECK(approve_scope IN (NULL,'self','department','company'))`、`row_filter_key TEXT DEFAULT NULL`（對應 spec `Approve action verb independent from view/edit` 與 `Row-level filter key in role_feature_perms`，呼應 design.md 決議 1：approve 採位元層級而非流程層級 + 決議 2：approve 用獨立欄位 can_approve + approve_scope）。驗證：新建 demo 租戶後 `PRAGMA table_info(role_feature_perms)` 顯示 6 欄
- [x] 1.2 在 `server/src/db/tenant-db-manager.js _runMigrations()` 同步加 3 條冪等 `ALTER TABLE role_feature_perms ADD COLUMN ...`（既有租戶遷移；呼應 design.md 風險 2：雙遷移清單同步）。驗證：保留既有 demo DB 啟動 server，migration log 出現 3 條 ALTER 與既有 200+ 筆自動 fail-safe（design.md 決議 7：seed default 採激進 fail-safe）
- [x] 1.3 SQLite CHECK constraint 對既有資料相容性驗證：跑 `SELECT COUNT(*) FROM role_feature_perms WHERE approve_scope IS NOT NULL` 應為 0（fail-safe），無 CHECK 違規

## 2. interviewer 系統角色 + seed（決議 5：D-05 砍 candidate 系統角色，僅保留 interviewer）

- [x] 2.1 在 `tenant-schema.js` 的 `seedTenantRBAC` roles 陣列加第 6 個系統角色：`{ code: 'interviewer', name_zh: '面試官', is_system: 1, scope_type: 'company' }`（對應 spec `Interviewer system role with locked semantics` 與 modified `預設角色初始化`）。驗證：新建租戶後 `SELECT * FROM roles WHERE code='interviewer'` 回 1 筆
- [x] 2.2 在 `tenant-db-manager.js _runMigrations` 加冪等 `INSERT OR IGNORE INTO roles (code='interviewer'...)`（既有租戶補入，呼應 design.md 風險 3：interviewer 角色種子在既有租戶補入時機）。驗證：既有 demo 租戶啟動後同樣可看到 interviewer 角色
- [x] 2.3 在 `tenant-schema.js` 的 `DEFAULT_ROLE_FEATURE_PERMS` 物件加 `'interviewer'` key（呼應 design.md 決議 5：D-05 砍 candidate 系統角色，僅保留 interviewer + preflight 0.3 修正 feature_id），對所有 40+ features 給 `_n`（`L1.jobs`/`L1.decision`/`L1.profile`/`L1.talent-pool`/`L1.meeting`/`L1.onboarding`/`L2.*`/`L3.*`/`L4.*`/`L5.*`/`L6.*`/`SYS.*`），**唯獨 `L1.recruitment`** 設 `_e('company', 'company')` + 額外 `row_filter_key: 'interview_assigned'`（一個 feature 涵蓋候選人列表 + 邀約 + 面試 + 評分，因 evaluation routes 共用 `requireFeaturePerm('L1.recruitment')`）。驗證：新建租戶後 interviewer 對 `L1.recruitment` 的 `row_filter_key` 為 `'interview_assigned'`，其他 features `action_level='none'`
- [x] 2.4 修改 `seedTenantRBAC` 的 INSERT OR IGNORE 邏輯（`tenant-schema.js:371` + `platform.js:86-96`），確保把新欄位 `can_approve`、`approve_scope`、`row_filter_key` 一起寫入（不只前 5 角色，也包含新加 interviewer）。同步擴 `_e()/_v()/_n()` helper 簽名（`tenant-schema.js:87-89`）支援 3 個新參數（預設 `0/NULL/NULL`）。對既有 5 角色全部 `can_approve=0 / approve_scope=NULL / row_filter_key=NULL`（呼應 design.md 決議 7：seed default 採激進 fail-safe + 決議 11：既有 5 角色 approve 維持 fail-safe，不預設智慧值）
- [x] 2.5 確認系統角色刪除攔截：API `DELETE /api/tenant-admin/roles/<id>` 對 interviewer 同樣回 400（既有 is_system 邏輯應自動涵蓋；`tenant-admin.js:497` 已實作，測試於 task 7.5 補）

## 3. Middleware：ROW_FILTERS registry + filterByScope 整合 + requireApprovePerm

- [x] 3.1 在 `server/src/middleware/permission.js` 新增 `ROW_FILTERS` registry 物件（對應 spec `Named predicate registry for row-level filtering` + design.md 決議 3：row-level 採 Named Predicate Registry）。註冊 4 個首發 predicate：`interview_assigned` / `subordinate_only` / `self_only` / `org_unit_scope`（包含 design.md 取捨：org_unit_scope predicate 範圍）。每個 predicate 簽名 `(req, tableAlias) => { clause, params }`
- [x] 3.2 `interview_assigned` predicate 實作：EXISTS UNION 反查 interview_invitations（status NOT IN 'Cancelled'）+ interviews（呼應 design.md 決議 4：D-05 不建 interview_assignments 表，採衍生方案 + 風險 4：row_filter EXISTS 子查詢效能）。驗證：手動跑 EXPLAIN QUERY PLAN 應顯示 SEARCH USING INDEX `idx_invitations_interviewer` / `idx_interviews_interviewer_at`
- [x] 3.3 `subordinate_only` predicate 實作：`<table>.manager_id = ?`。驗證：對 employees 表查詢加此 predicate 後僅回下屬資料
- [x] 3.4 `self_only` predicate 實作：`<table>.user_id = ?`
- [x] 3.5 `org_unit_scope` predicate 實作（呼應 design.md 決議 10：org_unit_scope predicate 採遞迴版本，不做 strict 變體）：collect `req.user.orgUnitIds` 子樹（含子部門遞迴），組 IN clause；空集合回 `1=0`。對應補既有 `user_roles.org_unit_id` metadata-only 缺口
- [x] 3.6 修改 `mergeFeaturePerms` 函式：擴 return 物件加 `can_approve`、`approve_scope`、`row_filter_key`。multi-role 合併規則：`can_approve` OR；`approve_scope` 取最大（沿用既有 SCOPE_RANK）；`row_filter_key` 採 least-restrictive（任一 NULL → NULL）
- [x] 3.7 擴充既有 `filterByScope` 函式：在生成 self/dept/company clause 後，若 `perm.row_filter_key` 不為 NULL，從 ROW_FILTERS 取對應 predicate 並 AND 串接（對應 modified spec `Shared scope filter utility for backend routes`）。Short-circuit：若 scope clause 為 `1=0`，整體回 `1=0` 不執行 predicate；若 predicate 回 `1=0`，整體 clause 為 `1=0`（對應 design.md 風險 1：既有 filterByScope short-circuit 行為變化）
- [x] 3.8 unknown row_filter_key 安全 fallback：若 registry 查無對應 key，logger.warn + 回 `{ clause: '1=0', params: [] }`（deny by default，對應 spec scenario `Unknown row_filter_key triggers safety fallback`）
- [x] 3.9 新增 `requireApprovePerm(featureId)` middleware（對應 spec `requireApprovePerm middleware for approve actions`）：查詢 user 對該 feature 的合併權限，`can_approve=0` 回 403；通過時 inject `req.user.approveScope`
- [x] 3.10 client 輸入防護：所有 routes 確保 `row_filter_key` 從不來自 client request body 或 query string（對應 spec scenario `Registry never accepts client input as key`）

## 4. 後端 API

- [x] 4.1 `server/src/routes/employee.js` 既有 `GET /api/employee/list` 端點（line 239，已有 `?dept=` `?status=` `?all=` `?org_unit_id=` 參數）增量擴 `?role=<code>` 過濾分支（對應 spec `Interviewer dropdown filters by interviewer role` + design.md 決議 6：interviewer 下拉過濾走 GET /api/employee/list?role= 後端 API）。SQL：JOIN users + user_roles + roles WHERE roles.code=? AND users.status='active'，對應方向 `users.employee_id → employees.id`（preflight 0.4 確認）。驗證：不傳 role 行為不變；傳 `?role=interviewer` 只回有該角色的員工（建構出 spec 規定的「Three-layer defense for interviewer scope」第 1 層）
- [x] 4.2 `server/src/routes/recruitment.js` 確認以下 6 個端點都已透過 `requireFeaturePerm('L1.recruitment')` 守衛（preflight 0.3 已驗）：`GET /candidates` (line 777)、`GET /candidates/:id/evaluation` (line 642)、`POST /candidates/:id/evaluation` (line 512)、`PATCH /candidates/:id/evaluation` (line 676)、`POST /interviews` (line 938)、`PATCH /interviews/:id/evaluation` (line 1036)。確認 SELECT query 走 `buildScopeFilter`（將自動套用 row_filter_key），未走的補上
- [x] 4.3 `server/src/routes/recruitment.js` 對未直接透過 `buildScopeFilter` 的查詢（特別是 evaluation 相關），手動 inject `row_filter_key` 對應的 predicate；驗證 interviewer 角色測試端到端流程（取列表 + 取單筆評分）只回被指派的
- [x] 4.4 補測試：interviewer 角色用戶呼叫 candidates 列表 → 只回被指派的；hr_manager 角色用戶呼叫 → 全可見（對應 spec `Three-layer defense for interviewer scope` 第 3 層 row filter）

## 5. 前端：tenant-admin / role-management-page

- [x] 5.1 `src/app/features/tenant-admin/models/tenant-admin.model.ts` 三個 interface 全部新增 `can_approve?: number`、`approve_scope?: PermScope | null`、`row_filter_key?: string | null` 三欄位（preflight 0.6 確認需動三個）：`RoleFeaturePerm` (line 102-110)、`FeaturePermPayload` (line 112-117)、`UserFeaturePerm` (line 119-123)
- [x] 5.2 `src/app/features/tenant-admin/services/tenant-admin.service.ts` 確保 GET/PUT roles 序列化包含新欄位
- [x] 5.3 `role-management-page` 編輯介面：每個 feature 列既有「檢視範圍 / 編輯範圍」勾選框旁加「審核」第三欄（顯示 can_approve 勾選 + approve_scope 下拉），對應 design.md 決議 1：approve 採位元層級而非流程層級 與 決議 2：approve 用獨立欄位 can_approve + approve_scope。UI 名詞遵守 design.md 決議 8：UI 名詞遵守既有「全集團 vs 全公司」分層 — approve_scope=company 顯示「全公司」
- [x] 5.4 `role-management-page` 每個 feature 列加「資料列限制」下拉（呼應 design.md 決議 12：role-management-page 的 row_filter 下拉對所有 features 一致顯示），options 對應 ROW_FILTERS registry 的 keys + 中文化標籤（design.md 決議 3 與 8）：`interview_assigned`→「僅被指派的面試者」、`subordinate_only`→「僅下屬」、`self_only`→「僅本人」、`org_unit_scope`→「依組織單位」、NULL→「不限制」
- [x] 5.5 `role-management-page` 系統角色顯示 interviewer：`is_system=1` 不可改名/刪除（既有邏輯涵蓋，但 UI 角色卡片需正確顯示「系統角色」標籤）

## 6. 前端：兩個 modal 換 API（interviewer 下拉過濾，三道防線第 1 層）

- [x] 6.1 修改 `src/app/features/employee/services/interview.service.ts` 的 `listActiveEmployees(options?)` 方法（line 379+，preflight 0.7 確認此為 modal employee 真實來源），加 `role?: string` 選項；呼叫 `/api/employee/list?status=active&role=...`。回傳型別不變（`InterviewerOption[]`）
- [x] 6.2 修改 `src/app/features/employee/components/invite-candidate-modal/invite-candidate-modal.component.ts`：`loadEmployees()` (line 119) 呼叫 `interviewService.listActiveEmployees({ role: 'interviewer' })`。對應 spec `Invite candidate modal shows only interviewers`
- [x] 6.3 修改 `src/app/features/employee/components/schedule-interview-modal/schedule-interview-modal.component.ts`：同樣使用 `interviewService.listActiveEmployees({ role: 'interviewer' })` 取面試官下拉資料。對應 spec `Schedule interview modal shows only interviewers`
- [x] 6.4 UI 提示：當 `?role=interviewer` 回空陣列時，下拉顯示「目前無設定面試官，請至『系統設定 → 員工與帳號管理』為員工加上面試官角色」hint，提升 HR 上手體驗

## 7. 測試（spec 驗證 + 三道防線完整性 + 雙清單驗證）

- [x] 7.1 新建 `server/src/tests/test-rbac-row-level.js`：覆蓋 spec `Named predicate registry for row-level filtering` 全部 scenarios（registry 解析 / 未知 key 回 1=0 / client 輸入不被信任）；spec `Shared scope filter utility for backend routes` 的新增 scenarios（row filter 與 scope 各種組合 + short-circuit 短路驗證）
- [x] 7.2 新建 `server/src/tests/test-rbac-approve.js`：覆蓋 spec `Approve action verb independent from view/edit` 全部 scenarios（與 view/edit 並存 / 多角色 OR 合併 / scope rank 取最大）+ `requireApprovePerm middleware for approve actions` middleware 行為 + `Approve endpoints enforce can_approve and approve_scope` enforcement matrix
- [x] 7.3 新建 `server/src/tests/test-d05-interviewer-scope.js`：覆蓋 spec `Interviewer-assigned row filter for candidates and evaluations` 全部 scenarios（含 cancelled invitation 排除、HR 全可見、空指派回空陣列）+ `Three-layer defense for interviewer scope` 三道防線（UI 過濾 / 403 feature gate / row filter）+ `Interviewer dropdown filters by interviewer role` API 過濾行為
- [x] 7.4 新建 `server/src/tests/test-rbac-merge-multi-role.js`：覆蓋 spec `Row-level filter key in role_feature_perms` 的 least-restrictive 合併 scenarios + 驗證 mergeFeaturePerms 對新欄位的合併
- [x] 7.5 新建 `server/src/tests/test-d05-interviewer-seed.js`：覆蓋 spec `Interviewer system role with locked semantics` 全部 scenarios（新建租戶 seed / 既有租戶 INSERT OR IGNORE 補入 / 不可刪除 / 可改 perms）+ modified `預設角色初始化` 的 6 角色驗證

## 8. Verify（雙路徑驗證 + 完成驗證）

- [x] 8.1 執行 `/verify`：`npx tsc --noEmit` + `npx ng build --configuration=development` 全綠；後端 7.1–7.5 整合測試全部通過
- [x] 8.2 雙清單路徑驗證（呼應 CLAUDE.md「雙遷移清單同步」防護 + design.md 風險 2：雙遷移清單同步）：(a) 新建 demo 租戶 — 刪除 demo DB 後 `npm run init-db`，跑 `PRAGMA table_info(role_feature_perms)` 確認 6 欄齊全 + `SELECT * FROM roles WHERE code='interviewer'` 回 1 筆；(b) 既有租戶遷移 — 保留既有 DB 啟動，migration log 出現 3 條 ALTER + 1 條 INSERT OR IGNORE roles
- [x] 8.3 EXPLAIN QUERY PLAN 驗證 row_filter EXISTS 走索引（呼應 design.md 風險 4：row_filter EXISTS 子查詢效能）：mock interviewer 用戶執行 candidates 列表 query，確認執行計畫顯示 SEARCH USING INDEX `idx_invitations_interviewer`，非 SCAN 全表
- [x] 8.4 三道防線完整性手動 QA：(a) 沒 interviewer 角色的員工嘗試查 candidates → 403；(b) 有 interviewer 角色但無指派 → 空陣列；(c) HR 在 invite-candidate-modal 下拉只看到有 interviewer 角色的員工
- [x] 8.5 D-03 矩陣視圖兼容性驗證（呼應 design.md 風險 5：D-03 矩陣視圖的 scope chip 行為改變）：登入 super_admin 看矩陣，scope chip 顯示行為應與 D-03 完工時一致（不破壞既有 UI）
- [x] 8.6 approve middleware 鋪路驗證（呼應 design.md 風險 6：approve middleware 套用點不夠完整 + 決議 9：approve middleware 純鋪路，不附示範審核端點）：本 change 不新增審核端點，但要驗證 `requireApprovePerm` middleware 可被未來 routes 正確 import 與套用（寫一個 sanity-check 測試端點然後 mark 為 deprecated 後刪除）

## 9. 文件與封存準備

- [x] 9.1 更新 `bombus-system/docs/客戶回饋比對分析_L0權限與系統設定_20260429.xlsx` D-02 與 D-05 row：執行狀態 ⚠️→✅、修改狀態「尚未修正」→「已完成」、預計修改填入本 change 的 8 個 Decision 摘要、修改說明填入實作後完工狀態（OpenSpec change 名稱 + archive 日期）；同步「統計總覽」L0-RBAC 已實作數
- [x] 9.2 release notes 草稿（屬本 change 的交付物，放在 archive 目錄即可）：(a) 「審核」位元預設無人可按、HR 需主動勾說明；(b) interviewer 角色用法 + 三道防線運作；(c) 新增 ROW_FILTERS 4 個 predicate 清單與後續擴充方式；(d) 簡核流程自定義（L0-Workflow）為未來範疇，本次 approve 已鋪路（呼應 Non-Goal）
- [ ] 9.3 archive 階段：執行 `/spectra:archive`，確認 4 份 spec delta 正確 sync 回 `openspec/specs/{rbac, feature-perm-data-scope, edit-scope-enforcement, interviewer-role-scope}/spec.md`
- [ ] 9.4 memory 同步：在 archive 完成後更新 MEMORY.md，把 D-02 row-level + D-05 interviewer-scope 從「Active OpenSpec Changes」移到「Recently Archived」，並修正「Scope is metadata-only」記憶條目（部分缺口已由 `org_unit_scope` predicate 補上）
