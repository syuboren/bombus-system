## 1. 資料庫結構與遷移（採用「主任職保留 + 副任職表」資料模型（路徑 A））

- [x] 1.1 在 `server/src/db/tenant-schema.js` 的 `EMPLOYEE_MIGRATIONS` 陣列末尾加入 `'ALTER TABLE employees ADD COLUMN cross_company_code TEXT'` 與 `'CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_cross_company_code ON employees(cross_company_code) WHERE cross_company_code IS NOT NULL'` — Cross-company employee identifier column；驗證：新租戶 `PRAGMA table_info(employees)` 含此欄、既有租戶下次載入後查得索引
- [x] 1.2 在 `tenant-schema.js:initTenantSchema` 加入 `CREATE TABLE IF NOT EXISTS employee_assignments` 含全部欄位 (id / employee_id / org_unit_id / position / grade / level / is_primary / start_date / end_date / created_at / updated_at) 與 `UNIQUE(employee_id, org_unit_id, start_date)` — Employee assignments table for 1:N subsidiary relationships；驗證：表結構符合 design.md 並通過 PRAGMA table_info 檢查
- [x] 1.3 加入兩個 partial index：`idx_assignments_employee_active`（WHERE end_date IS NULL）、`idx_assignments_org_active` 與唯一約束 `uq_assignments_primary`（WHERE is_primary=1）保證每員工最多一筆主任職 — Employee assignments table for 1:N subsidiary relationships；驗證：嘗試插入第二筆 is_primary=1 失敗
- [x] 1.4 加入 `CREATE TABLE IF NOT EXISTS code_naming_rules`（target / prefix / padding / current_seq / enabled / updated_by / created_at / updated_at）— Code naming rules table for tenant-scoped sequence generation；驗證：表結構符合 design.md 並通過 PRAGMA table_info
- [x] 1.5 在 `tenant-db-manager.js:_runMigrations()` 同步加入上述四項（含 ALTER 與兩張新表），驗證雙清單同步遷移 — Dual migration list synchronization；驗證：對既有 demo 租戶重啟伺服器兩次，第一次成功遷移、第二次無 SQL error
- [x] 1.6 撰寫一次性 backfill 腳本：`INSERT INTO employee_assignments (employee_id, org_unit_id, position, grade, level, is_primary, start_date) SELECT id, org_unit_id, position, grade, level, 1, COALESCE(hire_date, created_at) FROM employees WHERE org_unit_id IS NOT NULL AND id NOT IN (SELECT employee_id FROM employee_assignments)`，包冪等檢查 — Migration backfills primary assignments for existing employees；驗證：執行後 demo 租戶 247 員工皆有 is_primary=1 任職、第二次執行不重複插入

## 2. D-15 代碼生成 service（D-15 引擎以單一 service 集中、target 為列舉）

- [x] 2.1 新建 `server/src/services/code-generator.js` 暴露 `tryNext(target, ctx)` 與 `previewBatch(target, count, ctx)` 兩個 function；target 限定 `'employee' | 'department' | 'employee_cross'` 列舉，其他值回 null — Code generator service exposes tryNext and previewBatch APIs；驗證：unit test 涵蓋 supported target、unsupported target、enabled=0 三種情境
- [x] 2.2 `tryNext` 必須在呼叫端 transaction 內執行：SELECT rule → compute next → UPDATE current_seq → 回 formatted code；不得自行 BEGIN/COMMIT — Concurrent batch protection via row-level transaction lock；驗證：在 transaction 外呼叫應 throw、ROLLBACK 後 current_seq 還原
- [x] 2.3 `previewBatch` 純查詢不消耗 seq，回傳 `[code1, code2, ...]` 陣列 — Code generator service exposes tryNext and previewBatch APIs；驗證：呼叫前後 current_seq 不變、回傳長度等於 count 參數
- [x] 2.4 撰寫 integration test：兩個 transaction 並發呼叫 tryNext 應序列化、不撞號、不跳號 — Concurrent batch protection via row-level transaction lock；驗證：模擬並發 100 次呼叫、final current_seq = initial + 100、所有 code 唯一

## 3. D-15 super_admin 設定頁（D-15 設定入口採主動設定，非 lazy modal）

- [ ] 3.1 新增 `server/src/routes/tenant-admin.js` 的 `GET /api/tenant-admin/code-naming-rules`（回三筆 rule，target 缺者回 default 模板）— Super_admin sets rules via dedicated settings page；**注意**：tenant-admin.js:46 router-level 已掛 `requireRole('super_admin', 'subsidiary_admin')`，本 endpoint 必須**額外**掛 `requireRole('super_admin')`（由 `middleware/permission.js:132` 提供）覆蓋預設允許，subsidiary_admin 不得進入；驗證：super_admin 取得 200、subsidiary_admin 與 hr_manager 取得 403
- [ ] 3.2 新增 `PUT /api/tenant-admin/code-naming-rules/:target` 更新 prefix / padding / enabled / current_seq，路由層額外掛 `requireRole('super_admin')` — Super_admin sets rules via dedicated settings page；驗證：integration test 涵蓋 super_admin 成功、subsidiary_admin 403、hr_manager 403、target 非列舉值 400
- [ ] 3.3 規則 enable/disable 時保留 current_seq 值，並驗證重啟後不重置（Rules apply only to records created after activation）— Rules apply only to records created after activation；驗證：disable 後 current_seq 不變、重新 enable 後下一個 code 從原 seq+1 開始
- [ ] 3.4 新建 `features/tenant-admin/pages/code-naming-rules-page/`（standalone + OnPush + Signal APIs）含三組規則卡片，每卡片顯示 target / prefix / padding / current_seq / enabled toggle / 預估下一個 code；首次設定 employee 規則時於頁面上半顯示**既有 employee_no 樣本與分佈**（呼叫 `GET /api/employee/list` 抽樣 5-10 筆已存在 employee_no，並計算最大數字部分），給 super_admin 作為 prefix / padding / current_seq 起始值的引導 — Super_admin sets rules via dedicated settings page；驗證：頁面顯示三組 rule、編輯後即時更新預估、規則為空時顯示「未設定」狀態、既有員工樣本區塊在 employee target 規則未設定時顯示
- [ ] 3.5 在 `tenant-admin.routes.ts` 加 `/settings/code-naming` 路由 + sidebar 選單項（has-permission directive 限 super_admin） — Super_admin sets rules via dedicated settings page；驗證：super_admin 看得到選單、hr_manager 看不到、直接訪問 URL 由 platformAdminGuard 攔下

## 4. D-10 跨公司任職 service 與 API（採用「主任職保留 + 副任職表」資料模型（路徑 A）、Assignment service maintains employees.org_unit_id consistency）

- [ ] 4.1 新建 `server/src/services/employee-assignment.service.js` 暴露 `addAssignment / updateAssignment / endAssignment / setPrimary / listAssignments` 五個 function，全部走 transaction — Assignment service maintains employees.org_unit_id consistency；驗證：unit test 涵蓋 addAssignment 後 employees.org_unit_id 同步、setPrimary 切換時兩筆 assignment is_primary 翻轉、最後一筆 active 不可 endAssignment
- [ ] 4.2 `setPrimary` 操作：先 UPDATE 既有 primary 為 0、再 UPDATE 目標為 1、再 UPDATE employees.org_unit_id；任一失敗 ROLLBACK — Assignment service maintains employees.org_unit_id consistency；驗證：sql.js 模擬中間步驟失敗、確認三表全還原
- [ ] 4.3 新建 `server/src/routes/employee-assignment.js` 實作四個 endpoint（GET /:id/assignments / POST /:id/assignments / PATCH /:id/assignments/:aid / DELETE /:id/assignments/:aid）配 `requireFeaturePerm('L1.profile', 'edit')` — API endpoints for cross-company assignment management；驗證：integration test 涵蓋 CRUD、最後一筆刪除回 400、HR view_scope 限制
- [ ] 4.4 POST endpoint 觸發 `EmployeeAssignmentService.addAssignment` 同時呼叫 D-14 trigger（見 task 6.1）— Auto-generation triggered by adding second active assignment；驗證：建立第二筆 active assignment 後 employees.cross_company_code 被填入

## 5. D-10 員工檔案頁 UI（Cross-company assignment management UI in employee detail page、Employee detail page assignments section）

- [ ] 5.1 新建 `features/employee/components/assignment-list/`（standalone + OnPush）顯示員工任職紀錄列表，欄位：子公司、部門、職位、職等、職級、起始日期、結束日期、主任職標記 — Employee detail page assignments section；驗證：員工有 3 筆任職時排序為 is_primary DESC, start_date ASC、結束日期 NULL 顯示「在職中」
- [ ] 5.2 新建 `features/employee/components/assignment-modal/`（含新增 / 編輯兩種模式），子公司 dropdown 套用 user view scope filter — Employee detail page assignments section；驗證：HR view_scope='department' 時 dropdown 只列出子樹內子公司、submit 後呼叫對應 API
- [ ] 5.3 在 `features/employee/pages/employee-detail-page/`（或對應 modal）加入「任職紀錄」區塊，內嵌 assignment-list + 「新增任職」按鈕（has-permission='L1.profile.edit'），完成 Cross-company assignment management UI in employee detail page 整合 — Employee detail page assignments section；驗證：HR 與 super_admin 看到操作按鈕、非 edit 權限唯讀
- [ ] 5.4 員工自助頁（`features/employee/pages/profile-page/`）若顯示「任職紀錄」時為 read-only 模式，view_scope='self' 不顯示新增/編輯按鈕 — Employee detail page assignments section；驗證：自助身份開啟自己的 profile-page 看到任職紀錄但無動作鈕

## 6. D-14 cross_company_code 自動生成（D-14 cross_company_code 由 service 層 trigger，不用 DB trigger）

- [ ] 6.1 在 `EmployeeAssignmentService.addAssignment` 結尾加入 trigger：若該員工 active assignments 數量 ≥ 2 且 `employees.cross_company_code IS NULL`，呼叫 `codeGenerator.tryNext('employee_cross', ctx)` 並 UPDATE employees — Auto-generation triggered by adding second active assignment；驗證：建立第二筆 assignment 後 cross_company_code 寫入、第三筆不再寫入、無規則時保持 NULL
- [ ] 6.2 確保 cross_company_code 一旦寫入即永久保留：endAssignment 時不清空、删除副任職時不清空 — Cross-company employee identifier column；驗證：員工從 2 筆 active 降回 1 筆後 cross_company_code 仍保留原值
- [ ] 6.3 撰寫 audit log 記錄：generation 成功時寫入 `audit_logs` row（action='cross_company_code_generated', target_id=employee_id, detail JSON 含 code 與 triggering_assignment_id）— Audit trail in employee history；驗證：audit_logs 有對應 row、包含 actor user_id

## 7. D-14 員工列表與檔案顯示（Display in employee list and detail pages）

- [ ] 7.1 員工檔案頁 header 在姓名與 employee_no 旁顯示 cross_company_code（NULL 時不顯示） — Display in employee list and detail pages；驗證：員工有 cross_company_code='HQ-005' 時顯示 `E0042 · HQ-005`
- [ ] 7.2 員工列表（card view 與 list view）為員工 ≥ 2 筆 active assignments 時顯示「跨公司」徽章，hover 顯示子公司清單 — Employee list with dual view mode；驗證：跨公司員工看到 badge、單任職員工不顯示
- [ ] 7.3 員工列表 list view 加入「跨公司編號」column-visibility toggle（hidden by default、僅 super_admin 可開啟）— Employee list with dual view mode；驗證：super_admin 看到 toggle、hr_manager 看不到、toggle 開啟後 column 渲染、empty 顯示 em-dash
- [ ] 7.4 員工檔案歷程 tab 顯示 cross_company_code 生成事件：`"系統指派跨公司編號 HQ-005（觸發：新增任職 sub-B）"` — Audit trail in employee history；驗證：歷程 tab 依時間排序顯示此事件

## 8. unified-employee-model 介面與 mapping 擴充（採用「主任職保留 + 副任職表」資料模型（路徑 A））

- [ ] 8.1 在 `shared/models/employee.model.ts` 新增 `EmployeeAssignment` interface（id / employeeId / orgUnitId / position? / grade? / level? / isPrimary / startDate / endDate?） — Unified Employee interface；驗證：`npx tsc --noEmit` 無錯誤
- [ ] 8.2 擴充 `UnifiedEmployee` interface 加入 `assignments: EmployeeAssignment[]` 與 `crossCompanyCode?: string` 欄位 — Unified Employee interface；驗證：既有所有 caller 編譯通過、新欄位 optional 不破壞既有
- [ ] 8.3 後端 `routes/employee.js` 的 `/api/employee/list` 與 `/api/employee/:id` response 加入 `assignments` 陣列（active + historical 全列、依 is_primary DESC, start_date ASC 排序）與 `crossCompanyCode` 欄位；同時把現行 `employee.js:463` 的 hard-coded `positions: [{...}]` 單筆陣列**改為從 active assignments 衍生 multi-position**（每筆 active assignment → 一筆 position 含 resolved companyName / departmentName，isPrimary 沿用 assignment 值）— Unified Employee API includes assignments and cross_company_code；驗證：跨公司員工 response 的 positions[] 長度等於 active assignments 數、isPrimary 正確、curl response 含 assignments 與 crossCompanyCode 兩欄、null 顯式回傳不省略
- [ ] 8.4 前端 `employee.service.ts` 的 `transformEmployee` / `transformUnifiedEmployee` 補上 `assignments` 與 `crossCompanyCode` mapping，避免欄位掉漏；spot check 既有 5 個 caller（platform-admin.service.ts / role-matrix-csv.spec.ts / department-template-page.component.ts / role-holders-popover.component.ts / employee-management-page.component.ts）的 `assignments` 字眼皆為**不同概念**（D-16 industry-dept-assignments / role assignments）不會與 `UnifiedEmployee.assignments` 命名衝突，新欄位以 optional 形式加入確保不破壞既有渲染 — Unified Employee API includes assignments and cross_company_code；驗證：UnifiedEmployee 物件含完整 assignments 陣列、5 個 caller 頁面手動點選正常顯示

## 9. 跨公司權限聯集（跨公司權限聯集走 `employee_assignments` JOIN）

- [ ] 9.1 修改 `server/src/middleware/scope-filter.js` 的 `buildScopeFilter`，當查詢來源為 employees 時加入「assignments union」子查詢：`employees.id IN (SELECT DISTINCT employee_id FROM employee_assignments WHERE end_date IS NULL AND org_unit_id IN (子樹清單)) OR employees.org_unit_id IN (子樹清單)` — Shared scope filter utility for backend routes；驗證：跨公司員工被任一子公司 HR 都看得到
- [ ] 9.2 確保非 employees 表（如 interview_invitations）的 scope filter 邏輯不變 — Shared scope filter utility for backend routes；驗證：interview_invitations 仍用 org_unit_id IN (子樹清單)、不誤觸 assignments union
- [ ] 9.3 撰寫 integration test：跨公司員工跨 sub-A 與 sub-B、HR-A 與 HR-B 都能在自己列表看見 — Shared scope filter utility for backend routes；驗證：兩個 HR account 各自查詢都包含此跨公司員工

## 10. D-16 hook 啟用（Department code generator hook for D-15）

- [ ] 10.1 將 `routes/organization.js` 第 1135 行的 `codeGenHook` 從 `return null` 改為 `return codeGenerator.tryNext('department', ctx)` — Department code generator hook for D-15；驗證：規則有效時部門匯入回 code、規則 disabled / 缺則回 NULL
- [ ] 10.2 確保 hook 在 import execute 的 transaction 內呼叫，與 department INSERT 同 transaction — Department code generator hook for D-15；驗證：mid-import 失敗 ROLLBACK 後 current_seq 不前進

## 11. 員工批次匯入調整（批次匯入 employee_no optional + transaction lock 並發保護）

- [ ] 11.1 將 `batch-import.js:52` 的 `REQUIRED_FIELDS` 移除 `employee_no`（保留為其他必填）— CSV required fields validation；驗證：CSV employee_no 空白不再觸發 missing 錯誤
- [ ] 11.2 在 validate endpoint 加入 `previewedSequence` 計算：對 CSV 中空白 employee_no rows 依序對應 `current_seq + 1, current_seq + 2, ...`，已填 row 對應 null — Validate-phase preview of auto-generated employee numbers；驗證：mixed CSV 預覽陣列順序與位置正確
- [ ] 11.3 validate response 加入 banner warning：「並發匯入時實際分配可能與預覽不同，請以執行結果為準」（有 row 預覽時顯示） — Validate-phase preview of auto-generated employee numbers；驗證：純手填 CSV 不顯示 banner、含空白 row 顯示
- [ ] 11.4 validate 對 row 缺 employee_no 且無規則時回 status='error'：「工號未填且系統未設定員工編號規則，請填寫或聯絡 super_admin 設定規則」 — CSV required fields validation；驗證：規則 disabled 時空白 row 不誤過驗證
- [ ] 11.5 validate 對 row 手填 `employee_no` 數字部分超過 `current_seq` 時回 warning（非 error）— Manual code values do not bump current_seq；驗證：CSV 手填 'E0050' 而 current_seq=10 時 response 含警告字串
- [ ] 11.6 execute endpoint 在單一 db.transaction 內逐 row 處理：空白 row 呼叫 `codeGenerator.tryNext('employee', ctx)`、手填 row 寫入原值不動 seq — Execute-phase atomic seq consumption with concurrent protection；驗證：integration test 涵蓋 mixed CSV、final current_seq 等於 initial + 空白 row 數
- [ ] 11.7 execute 過程 mid-batch 失敗（row 26 reference invalid）整批 ROLLBACK、current_seq 還原 — Execute-phase atomic seq consumption with concurrent protection；驗證：故意失敗測試後 current_seq 不前進、無員工被建立
- [ ] 11.8 execute 偵測規則被 disable 時 ROLLBACK 並回 409：「員工編號規則已被停用，請重新驗證」 — Execute-phase atomic seq consumption with concurrent protection；驗證：模擬 validate 後 disable rule、execute 收到 409
- [ ] 11.9 確認 batch import 不觸發 D-14：每筆 row 建立員工 + 一筆 is_primary=1 assignment，cross_company_code 永遠 NULL — Cross-company assignment is not handled by batch import；驗證：批次匯入 50 員工後查 employees.cross_company_code 全部 NULL

## 12. 端到端驗證與既有功能不破壞

- [ ] 12.1 執行 `npx tsc --noEmit` 與 `npx ng build --configuration=development` 確保前端無錯誤 — 跨層整合驗證；驗證：build success、無新 NG0600 / NG8107 警告
- [ ] 12.2 跑既有 D-13 員工列表分頁測試（test-d13-employee-list-pagination.js）確保 49 / 49 仍通過 — 跨層整合驗證；驗證：未引入 regression
- [ ] 12.3 撰寫 e2e fixture：建立兩個 HR（HR-A scope=sub-A subtree、HR-B scope=sub-B subtree），建立跨公司員工 emp-X 同時任職 sub-A 與 sub-B，驗證雙方列表皆可見、cross_company_code 已生成、列表 badge 與欄位顯示正確 — Cross-company employee visible to multiple HR managers；驗證：模擬完整流程通過
- [ ] 12.4 確認既有 5 個 `/api/employee/list` caller（meeting / interview / onboarding-documents 等）回傳 array 格式不變、新增 assignments 欄位不破壞既有 mapping — Unified Employee API includes assignments and cross_company_code；驗證：開發伺服器啟動後手動點選會議、面試、入職文件等頁面正常顯示員工
