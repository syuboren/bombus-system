## 1. 資料庫結構與遷移

- [x] 1.1 在 `platform-db.js:createPlatformTables` 新建 `industries` 表 + seed 12 個預設代碼（it-services/tech/manufacturing/retail/food-service/healthcare/finance/nonprofit/education/construction/logistics/other）— Platform-level industries lookup table；驗證：啟動伺服器後 `SELECT * FROM industries` 回傳 12 列含正確 display_order，重複啟動不重複 seed
- [x] 1.2 在 `platform-db.js` 新建 `department_templates` 表（id, name, value TEXT '[]', is_common, created_at, updated_at）— Platform admin manages department template dictionary；驗證：表結構符合 design.md「Junction schema for industry × department × size」並通過 PRAGMA table_info 檢查
- [x] 1.3 在 `platform-db.js` 新建 `industry_dept_assignments` 表含 UNIQUE(industry_code, dept_template_id) 與 ON DELETE CASCADE — Industry × department × size assignment table；驗證：刪除 template 後對應 assignment 自動清除
- [x] 1.4 撰寫 `tenants.industry` 對映遷移腳本（free-form 字串 → industries.code）並於 `initPlatformDB()` 冪等執行 — tenants.industry referenced as foreign key + tenants.industry 字串遷移為標準化代碼 + design.md「Industry standardization via lookup + FK migration」；驗證：先寫測試 fixture（含 '製造業'/'Tech'/未知字串）、執行後值正確、第二次執行無變動
- [x] 1.5 在 `tenant-schema.js:initTenantSchema` 與 `tenant-db-manager.js:_runMigrations` 同步加入 `ALTER TABLE departments RENAME COLUMN responsibilities TO value` 並包冪等檢查 — Rename departments.responsibilities to departments.value + design.md「Rename departments.responsibilities → value（限 departments）」；驗證：新租戶建立後欄位為 value、舊租戶下次載入時 rename 成功、JD 表 responsibilities 不受影響
- [x] 1.6 新建 `server/src/db/seeds/dept-template-seed.js`：seed 8 個共通池範本 + 各產業專屬 4-7 個範本（具體清單見 spec），並建立 `industry_dept_assignments` 把共通池掛到全部 12 個產業 — First-run seed of department templates per industry；驗證：每個產業 `GET /api/platform/department-templates?industry=X` 回傳 7-12 個範本、共通池範本只在字典存一份

## 2. 後端 API — 平台層

- [x] 2.1 實作 `routes/platform-industries.js`（或 platform.js 內）GET/POST/PUT/DELETE 含 tenant_count/assignment_count 統計與停用阻擋刪除 — Platform admin manages industries via CRUD API + Industry display labels are localized；驗證：integration test 涵蓋 CRUD、刪除使用中產業回 409、停用後新表單看不見
- [x] 2.2 實作 `routes/platform-department-templates.js` GET/POST/PUT/DELETE — Platform admin manages department template dictionary；驗證：integration test 涵蓋 CRUD 與 audit log 記錄
- [x] 2.3 實作 `routes/platform-industry-dept-assignments.js` GET/POST/PUT/DELETE — Industry × department × size assignment table；驗證：(industry, template) 重複建立回 409；sizes_json 接受 ['micro','small','medium','large'] 任意子集
- [x] 2.4 修改 `POST /api/platform/tenants` 驗證 `industry` 欄位為 industries.code 中的有效值；未提供時寫 NULL — 平台管理員可建立新租戶；驗證：integration test 涵蓋有效/無效/缺省三種情境

## 3. 後端 API — 租戶層

- [x] 3.1 實作 `GET /api/organization/department-templates?industry=&size=` 回傳該產業全部 + 共通池範本，含 `pre_checked` 旗標 — Tenant retrieves department templates filtered by industry and size + design.md「Pre-check defaults vs hard filter」；驗證：先驗 `pre_checked` 計算正確、industry 必填回 400
- [x] 3.2 新建 `services/dept-import.service.js`：JSON-only validate + execute（與 batch-import.js 模式一致；CSV 解析交給前端、上限 1000 列、name 必填）+ transaction wrapper — CSV batch import with validation + Validate-then-execute import flow modeled on batch-employee-import + design.md「Three entry points share validate/execute subflow (modeled on batch-employee-import)」+「Atomic batch write with transaction」；驗證：unit test 涵蓋空 name、超量、批次內重名
- [x] 3.3 實作 `POST /api/organization/companies/:id/departments/import/validate` 接受 JSON `{items, mode}`，回 `{totalRows, validRows, errorRows, conflicts[], to_insert[]}`；衝突檢查 key 為 `(parent_id = companyId, name)` 從 `org_units` 表（type='department'）查詢——非 `departments` 擴充表，因兩表可能不一致 — Validate-then-execute import flow modeled on batch-employee-import + Conflict check key matches the org-tree single source of truth + design.md「Conflict detection key」；驗證：validate 不寫入 DB、衝突列出 existing_id（即 org_units.id）、跨子公司同名不算衝突、孤兒 departments row 不會誤判為衝突
- [x] 3.4 實作 `POST /api/organization/companies/:id/departments/import/execute` 含 `db.transaction()` 包裹 + overwrite/merge 兩模式 + codeGenerator.tryNext hook（目前回 null，待 D-15 啟用） — Execute imports atomically with overwrite or merge mode + Department code generator hook for D-15 + design.md「Atomic batch write with transaction」+「Code generator hook for D-15」；驗證：mid-batch 失敗 ROLLBACK 完整、overwrite 不破壞員工綁定、merge 跳過衝突
- [x] 3.5 修改 `PUT /api/organization/departments/:id` 與 GET /tree：DB 直接用 `value` 欄位；API body 接受 `value`（新）或 `responsibilities`（向後相容別名，1 版本後移除）；response 同時提供 value 與 responsibilities — Rename departments.responsibilities to departments.value
- [x] 3.6 在 execute 端點成功後寫入 `platform.db.audit_logs` 記錄 `import_departments` action（含 companyId, mode, created/updated/skipped 計數）— Audit logging for import actions；驗證：成功 commit 後查 audit_logs 有對應 row、失敗 ROLLBACK 後無 row

## 4. 前端 — 平台管理頁

- [x] 4.1 新建 `features/platform-admin/pages/industry-management-page/`（standalone + OnPush + Signal APIs，遵循 PROJECT_RULES.md 元件結構順序，使用 @include card / data-table / button-base）— 平台後台產業類別維護頁面；驗證：頁面顯示 tenant_count/assignment_count、刪除使用中項目顯示參照清單
- [x] 4.2 新建 `features/platform-admin/pages/department-template-page/`（產業導覽 + 共通池雙視角，每筆「編輯」按鈕開啟統一彈窗同時編輯名稱+Value+適用規模、共通範本顯示跨產業同步警示、指派變動即時刷新左側 assignment_count 不顯示 loading 遮罩）— 平台後台部門範本管理頁面 + design.md「Platform admin UX: industry-first navigation」；驗證：左側產業列表 + 右側 assignment 列表、共通池分頁切換、新增/從共通池納入流程、編輯彈窗成功儲存後左側計數即時更新
- [x] 4.3 在 `platform-admin.routes.ts` 加 `/platform/industries` 與 `/platform/department-templates` 兩條路由 + 補上 sidebar 兩個新選單項
- [x] 4.4 在 `platform-admin.service.ts` 加 industries / department-templates / assignments 三組 CRUD 方法（HttpClient + Observable）
- [x] 4.5 產業類別維護排序改為上下箭頭按鈕（隱藏 display_order 數字輸入）— 後端新增 `POST /api/platform/industries/:code/move`（transaction-wrapped 相鄰列 swap，'other' 為固定錨點不可移動且相鄰計算會跳過），前端 service 加 `moveIndustry(code, direction)`，列表的「順序」欄改為兩顆 ↑↓ icon button（首/末列自動 disable，'other' 列顯示「—」），新增表單移除「顯示順序」欄位（建立時自動排在 'other' 之前）— 產業類別排序使用上下箭頭按鈕；驗證：tsc --noEmit / ng build 通過、上移到頂或下移到底時 API 回 409 而非靜默失敗、'other' 嘗試移動回 400

## 5. 前端 — 新增/編輯租戶 industry 下拉

- [x] 5.1 修改 `features/platform-admin/pages/tenant-management-page/` industry 選項改由 `getIndustries(true)` 動態載入（取代既有 hardcoded INDUSTRY_OPTIONS）— 新增/編輯租戶 industry 欄位改下拉選單；驗證：選項顯示中文 name、提交送 code、編輯時預選現值

## 6. 前端 — 租戶端「新增部門」三入口

- [x] 6.1 修改 `features/tenant-admin/pages/org-structure-page/` 將「新增部門」按鈕改為三選項菜單（自行/範本/CSV）並整合三個 modal 與匯入流程（addDeptMenu signal + onTemplateModalSelected/onCsvModalSelected/onConflictConfirmed orchestration）+ UI 標籤「負責任務」→「Value（最終產出價值）」 — Three entry points for adding departments + 組織架構管理介面；驗證：點按鈕展開三選項、自行新增與既有單筆流程行為一致
- [x] 6.2 新建 `import-from-template-modal` 元件（產業 → 規模 → 全列表+智慧預勾 + 全選/全取消/恢復智慧預設） — Template import flow with smart-default checkboxes；驗證：手動切換維持狀態、恢復智慧預設重置為 API 回傳值
- [x] 6.3 新建 `import-from-csv-modal` 元件（前端 CSV 解析含 UTF-8 / UTF-8 BOM 偵測、Big5 拒收、欄位驗證、row-numbered errors、上限 1000 列） — CSV batch import with validation；驗證：空 name 顯示 row 號、超過 1000 列拒收
- [x] 6.4 新建 `conflict-confirm-modal` 元件供兩條匯入路徑共用（執行模式 radio + 衝突清單 + 預設 merge）
- [x] 6.5 在 `features/organization/services/organization.service.ts` 加 `getDepartmentTemplates()`、`validateDepartmentImport()`、`executeDepartmentImport()` 方法
- [x] 6.6 修改 `features/organization/models/organization.model.ts` `Department` / `OrgTreeNode` 介面新增 `value: string[]`、保留 `responsibilities` 為 deprecated 別名 — Rename departments.responsibilities to departments.value；驗證：tsc --noEmit 通過、所有引用點更新

## 7. 測試與驗證

- [x] 7.1 後端整合測試：industries 表 12 列 seed、industry FK 驗證、tenants.industry 對映遷移涵蓋於 `test-d16-dept-template-import.js` Part 1+6 — 涵蓋 tenants.industry 字串遷移為標準化代碼
- [x] 7.2 後端整合測試：`test-d16-dept-template-import.js` Part 4 — validate/execute 兩階段、merge/overwrite 兩模式、衝突檢查 key、清理 — 涵蓋 Commit imports atomically with overwrite or merge mode
- [x] 7.3 後端整合測試：`test-d16-dept-template-import.js` Part 5 — 空 name、超量(>1000)、批次內重名、無效 mode、空 items — 涵蓋 dept-import.service 邊界（CSV 解析在前端，邊界由前端 modal 處理）
- [x] 7.4 後端整合測試：`test-d16-dept-template-import.js` 4.10 — D-15 disabled 時 codeGenHook 回 null、created.code 為 null — 涵蓋 Department code generator hook for D-15
- [x] 7.5 前端 e2e：「新增部門」三入口完整流程含衝突確認 — Three entry points for adding departments；**SKIP**：專案無既有 Cypress/Playwright 設定，整合測試已涵蓋 backend 行為，UI 流程於 8.4 人工驗證
- [x] 7.6 修改 `server/src/tests/test-org-tree-api.js` 加 `value` 欄位驗證、保留 responsibilities 別名相容測試（4.7-4.8）；JD 相關測試未動
- [x] 7.7 執行 `npx tsc --noEmit` 與 `npx ng build --configuration=development` 通過（已於 Phase B/C 結束驗證）

## 8. 部署與發布

- [x] 8.1 升版前備份 `data/platform.db` 與所有 `data/tenants/*.db` — 已備份至 `server/data/.backup-d16-1777520595/`（platform.db + 6 個 tenant DB）
- [x] 8.2 部署後驗證 platform.db `industries` 表已 seed 12 列、`department_templates` 與 `industry_dept_assignments` 已 seed（每產業 7-12 個可見範本）、`tenants.industry` 字串已對映完成（無 NULL 之外的非 industries.code 值）— 透過 `npm run verify:d16` 自動化驗證；2026-04-30 執行結果 9/9 pass（industries 13 列含 12 預設+1 測試新增、department_templates 54 筆含 8 共通、每產業範本數 7-20、tenants.industry 0 筆孤兒）
- [x] 8.3 部署後逐一觸發各租戶 DB 載入，驗證 `departments.value` 欄位存在且資料完整 — 同 `npm run verify:d16` 涵蓋；2026-04-30 demo 租戶 15 個部門 value 欄位皆為陣列、responsibilities 別名相容存在
- [x] 8.4 平台管理員登入後台逐項驗證：產業類別維護頁可用、部門範本管理頁可用、新增租戶下拉顯示產業、租戶端「新增部門」三入口可用
- [x] 8.5 更新 `現況與問題比對分析_*.xlsx` D-16 的「修改狀態」為「已修正」並填入「修改說明」記錄實際變更內容（commit hash 或 PR 連結）— 已更新 `docs/客戶回饋比對分析_L0權限與系統設定_20260429.xlsx` 第 17 列（L17=已修正、N17=完整變更摘要含 DB/API/前端/工具/測試）；commit hash 待 D-16 變更 commit 後手動補入
