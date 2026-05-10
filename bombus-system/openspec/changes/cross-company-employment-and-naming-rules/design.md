## Context

D-10 / D-14 / D-15 三項客戶需求在資料流上強耦合：D-14 的 cross_company_code 由 D-10 跨公司任職事件觸發、且必須使用 D-15 的編號規則生成。本設計涵蓋三者的資料模型、API、UI 與權限影響。

**現況盤點**：

- `employees.org_unit_id` 為單一欄位（ALTER 補上，nullable，FK → org_units.id），無法表達 1:N 任職
- `employees.employee_no` 為 `TEXT UNIQUE`（tenant 全域唯一，不分子公司）
- `batch-import.js:52` 把 `employee_no` 列為 `REQUIRED_FIELDS`，CSV 必填工號
- `organization.js:1135` 已預留 `codeGenHook = (item, ctx) => null`，待 D-15 啟用
- `feature-perm-data-scope` 既有 `buildScopeFilter` 對 `employees.id` 與 `employees.org_unit_id` 做 row-level 過濾（D-02 落地）
- 既有 5 個 `/api/employee/list` caller 依賴 `employees.org_unit_id` 作為主任職代理鍵

**Stakeholders**：

- super_admin（總公司管理者）：D-15 規則設定、D-14 編號開關、D-10 跨公司任職全 tenant 可管
- subsidiary_admin / hr_manager：D-10 跨公司任職管理（依 `L1.profile.edit` 權限與 row scope）
- employee：D-10 任職紀錄唯讀於個人檔案

## Goals / Non-Goals

**Goals:**

- 一次落地三項，避免分批切換時的雙寫成本
- 資料模型相容既有 5 個 caller，不破壞 D-13 員工列表分頁與 D-02 row-level scope
- D-15 引擎為通用設計，承接 D-16 既有 hook 與未來其他 entity 的編號需求
- D-14 cross_company_code 永久保留，員工歷程可追溯（即使後來只剩單一任職）
- 並發匯入 / 並發新增 場景下 `current_seq` 不重複、不跳號

**Non-Goals:**

- 既有 employee_no 不 retrofit（不重新命名既有員工）
- 跨公司任職 UI 不覆蓋批次匯入路徑（避免複雜化批次驗證）
- 不擴張 D-15 規則 scope 至 `job` / `candidate` / `position` / `grade`（保留為未來擴充）
- 不處理跨 tenant 的員工身份（HQ-xxx 仍為 tenant-scope unique）
- 不實作規則修改後的歷史資料重新編號（僅生效後新增記錄套用）

## Decisions

### 採用「主任職保留 + 副任職表」資料模型（路徑 A）

**前後端模型分工**：

- `EmployeeAssignment`（新介面）= DB-row 對應 shape — `orgUnitId / position / grade / level / isPrimary / startDate / endDate?`，編輯 modal 直接操作此型別
- `EmployeePosition`（既有介面，`employee.model.ts:22`）= 顯示用聚合 shape — `companyName / departmentName / positionTitle / isPrimary / startDate / endDate?`，列表 / 卡片 / 詳情頁渲染用
- `UnifiedEmployee.assignments[]` 與 `UnifiedEmployee.positions[]` **由同一份 assignments 資料衍生**：後端 mapping 從 `employee_assignments` JOIN `org_units` 解出 `companyName / departmentName` 寫入 `positions[]`，並把原始 row 寫入 `assignments[]`
- 既有 `employee.js:463` 的 `positions: [{...}]` hard-coded 單筆 + `isPrimary: true` 必須**改為 multi-position**：每筆 active assignment 一筆 position，`isPrimary` 跟 assignment 同步

**選擇**：`employees.org_unit_id` 保留為主任職代理鍵；新增 `employee_assignments` 表記錄所有任職（含主與副）；以 `is_primary` 旗標區分。

**Rationale**：

- 既有 5 個 `/api/employee/list` caller 與 D-13 列表查詢都依賴 `employees.org_unit_id`，全搬代價過高
- 「主任職」概念客戶面好理解（薪資、年資、預設 scope 跟著主任職走）
- 維護一條 service 邏輯保證 `employees.org_unit_id ≡ employee_assignments.org_unit_id WHERE is_primary=1` 即可避免雙寫不一致

**Alternatives**：

- **路徑 B 徹底搬走**：`employees` 不留 `org_unit_id`，全走 `assignments`。優點是單一真理，但 5 個 caller、D-02 row_filter、D-13 查詢全要改
- **路徑 C JSON 陣列**：`employees.org_units_json TEXT`。SQL 查詢能力極差，row-level scope 難寫

**Schema**：

```sql
CREATE TABLE IF NOT EXISTS employee_assignments (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  org_unit_id TEXT NOT NULL REFERENCES org_units(id),
  position TEXT,
  grade TEXT,
  level TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT,  -- NULL = active
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE(employee_id, org_unit_id, start_date)
);

CREATE INDEX IF NOT EXISTS idx_assignments_employee_active
  ON employee_assignments(employee_id) WHERE end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_org_active
  ON employee_assignments(org_unit_id) WHERE end_date IS NULL;
```

每員工最多一筆 `is_primary=1`（service 層保證；DB 層用 UNIQUE partial index 兜底）：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uq_assignments_primary
  ON employee_assignments(employee_id) WHERE is_primary=1;
```

### D-15 引擎以單一 service 集中、target 為列舉

**選擇**：新增 `services/code-generator.js` 暴露 `tryNext(target, ctx)` 與 `previewBatch(target, count, ctx)` 兩個 API；`target` 為列舉（`'employee' | 'department' | 'employee_cross'`），不允許自由字串。

**Rationale**：

- 集中於單一 service 使 transaction 鎖機制可一致實作（鎖 `code_naming_rules` row）
- target 列舉避免拼寫錯誤導致建立孤兒規則（拼錯 `'employees'` vs `'employee'`）
- `previewBatch` 給批次匯入 validate 階段使用，**不**消耗 seq

**Alternatives**：

- 每個業務模組自己處理：易產生不同 transaction 邊界、難保證 seq 不撞號

**Schema**：

```sql
CREATE TABLE IF NOT EXISTS code_naming_rules (
  target TEXT PRIMARY KEY,  -- 'employee' | 'department' | 'employee_cross'
  prefix TEXT NOT NULL DEFAULT '',
  padding INTEGER NOT NULL DEFAULT 4,
  current_seq INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES employees(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);
```

`tryNext(target, ctx)` 行為：

```
BEGIN TRANSACTION
  rule = SELECT * FROM code_naming_rules WHERE target = ? AND enabled = 1
  if (!rule) return null  -- caller fallback
  next = rule.current_seq + 1
  UPDATE code_naming_rules SET current_seq = ?, updated_at = ? WHERE target = ?
  code = rule.prefix + zfill(next, rule.padding)
COMMIT
return code
```

呼叫端依以下 caller table 改寫：

| Caller | 既有 fallback | D-15 啟用後 |
|---|---|---|
| `routes/employee.js` POST `/employee` | HR 必填 employee_no | employee_no 空白時呼叫 `tryNext('employee')` |
| `routes/batch-import.js` execute | employee_no 必填 | 空白時消耗 seq（見下節） |
| `routes/organization.js` department POST | 前端固定格式 | 呼叫 `tryNext('department')` |
| `routes/organization.js:1135` D-16 hook | 回 null | 改為 `codeGenerator.tryNext('department', ctx)` |
| `services/employee-assignment.service.ts` 加入第 2 筆 assignment | n/a | 觸發 `tryNext('employee_cross')` 寫入 employees.cross_company_code |

### D-14 cross_company_code 由 service 層 trigger，不用 DB trigger

**選擇**：在 `services/employee-assignment.service.ts` 的 `addAssignment(employeeId, ...)` 裡判斷「加入後 active assignments ≥ 2 且 employee.cross_company_code IS NULL」時呼叫 `codeGenerator.tryNext('employee_cross')` 寫入。

**Rationale**：

- DB trigger 在 sql.js 上跨 process 行為不穩；service 層 trigger 易測、易加 audit log
- 邏輯與 D-15 引擎共用同一 transaction，避免「assignment 寫入但 cross_company_code 失敗」的中間態
- 永久保留（員工後來只剩單一 assignment 也不清空）— 由 service 層僅在 `IS NULL` 時寫入即可達成

**Alternatives**：

- DB trigger：sql.js 支援度有限、難 unit test
- 前端觸發：違反「資料一致性靠後端」原則

### 跨公司權限聯集走 `employee_assignments` JOIN

**選擇**：擴充 `middleware/scope-filter.js` 的 `buildScopeFilter`，當查詢來源為 `employees` 時，row scope predicate 改為：

```sql
-- 原本（D-02 落地後）：
employees.org_unit_id IN (子樹清單)

-- D-10 上線後：
employees.id IN (
  SELECT DISTINCT employee_id FROM employee_assignments
  WHERE end_date IS NULL AND org_unit_id IN (子樹清單)
)
OR employees.org_unit_id IN (子樹清單)
```

**Rationale**：

- 跨公司員工被任一子公司 HR 看見（聯集語意）
- `OR employees.org_unit_id IN (...)` 兜底既有員工尚未補 assignments 的過渡期資料
- 用 EXISTS 子查詢比 JOIN 後 GROUP BY 簡單，DB plan 也較容易最佳化

**Alternatives**：

- INNER JOIN assignments：必須 DISTINCT 員工，且過渡期既有員工查不到
- 物化「員工 → org_unit 聯集」表：增加同步成本、與既有 D-02 設計脫節

### 批次匯入 employee_no optional + transaction lock 並發保護

**選擇**：`employee_no` 從 `REQUIRED_FIELDS` 移除；validate 階段呼叫 `codeGenerator.previewBatch('employee', N)` 純預覽（不消耗 seq）；execute 階段在 transaction 內逐 row 對空白列消耗 seq。

**Rationale**：

- 客戶面：HR 可選擇手填或交給系統；既有 CSV 範本仍相容
- 並發保護：execute 階段 `BEGIN TRANSACTION` + `SELECT ... FROM code_naming_rules WHERE target='employee'`（sql.js 序列化執行）保證 seq 不重複
- preview 與實際分配可能不一致：用 banner 警告而非 reservation system（避免引入 lease / TTL 的複雜度）

**Alternatives**：

- 路徑 4 預鎖 + reservation：複雜度高、cancel / timeout 釋放邊界多
- 全自動（路徑 3）：HR 失去手動指定能力，違反客戶面慣例

**HR 手填 vs auto 衝突處理**：

- 手填值不消耗 / 不更新 `current_seq`
- 若手填值的數字部分（剝離 prefix）> `current_seq`，validate 階段顯示警告：「您手填的 'E0050' 已超過自動編號當前序號 47，建議調整 current_seq 以避免日後撞號」
- 不自動 bump seq（尊重 HR 自主）

### D-15 設定入口採主動設定，非 lazy modal

**選擇**：super_admin 從 sidebar「系統設定 → 代碼命名規則」進入 `/settings/code-naming` 主動設定；建立第一筆 entity 時不出 modal。

**Rationale**：

- 客戶面 xlsx 寫「在...建立第一筆時，企業可設定」但實務上只有 super_admin 有權限，HR 第一個建員工時若被攔下會被迫等 super_admin
- 主動設定頁可清楚展示三條規則一覽、預估下一個編號、套用範圍
- 規則為空時呼叫端 fallback 至既有 hard-coded 行為，不阻斷既有流程

**Alternatives**：

- Lazy modal：權限分裂，HR 與 super_admin 角色衝突
- 強制必填：既有租戶遷移時所有 super_admin 第一次登入都會被攔下

## Risks / Trade-offs

- **既有 employees.org_unit_id 與 assignments 同步風險** → 由單一 service `EmployeeAssignmentService.setPrimary()` 集中維護；新增 / 修改 assignments 時自動 sync `employees.org_unit_id`；測試 fixture 含「主任職切換」案例
- **大量並發批次匯入時 seq lock 競爭** → 影響範圍限於同 tenant + 同 target；批次匯入頻率低（HR 操作，非系統內部呼叫）；若實測有問題再加 application-level lock
- **D-13 列表查詢顯示跨公司員工策略未定** → 暫採「單行 with badge」（員工有 ≥2 active assignments 時於姓名旁顯示「跨公司」徽章）；未來若客戶要求改「分行列出」再迭代
- **Migration 既有 N 筆 employees 補建 assignments** → 一次性 backfill：`INSERT INTO employee_assignments SELECT ... WHERE org_unit_id IS NOT NULL` 設 `is_primary=1, start_date=hire_date`；寫成冪等遷移，雙清單同步
- **既有 employee_no 與 D-15 規則前綴可能衝突** → super_admin 設定時顯示既有 employee_no 樣本（如「您現有員工編號為 E0001 ~ E0247，建議規則 prefix='E', padding=4, current_seq=247」）以引導
- **cross_company_code UNIQUE 衝突（極端案例）** → 同 tenant 同 target 共用 seq counter，不可能撞；若 super_admin 手動改 current_seq 倒退 → service 層在生成後 `SELECT ... WHERE cross_company_code = ?` 二次驗證，撞號則重試最多 3 次

## Migration Plan

**Step 1 — Schema 與 backfill（單一 PR / 單一 transaction）**：新增 `employee_assignments` 表 + 兩個 partial index、新增 `code_naming_rules` 表、`employees` ALTER 加 `cross_company_code TEXT UNIQUE`、backfill 既有 `employees WHERE org_unit_id IS NOT NULL` 為 `is_primary=1` 的 assignment、雙清單同步遷移（tenant-schema + tenant-db-manager）。

**Step 2 — Service 與 API 啟用**：部署 `services/code-generator.js` + `services/employee-assignment.service.ts`、D-16 hook（`organization.js:1135`）切換為實作版、`batch-import.js` `employee_no` 移出 REQUIRED 並加 execute transaction lock、`middleware/scope-filter.js` 擴充 assignments 聯集。

**Step 3 — UI 上線**：`/settings/code-naming` 設定頁、員工檔案頁「任職紀錄」區塊與 modal、員工列表「跨公司」徽章與「跨公司編號」可見欄位、批次匯入 validate 預覽 banner。

**Rollback**：Schema 為純 ADD（無 DROP / RENAME），rollback 只需停用 service 層使用、不需動 DB。既有 caller 在 `code_naming_rules` 為空時自動 fallback 至原行為。backfill 數據可用 `DELETE FROM employee_assignments` 清空，`employees.org_unit_id` 不受影響。

## Open Questions

- 跨公司員工在「未分配子公司」（無任何 active assignments）時，員工列表是否仍顯示？— 建議顯示但 status 標示為「未指派」
- D-15 規則修改後，既有 entity 是否提供「重新編號」操作（保留為未來迭代，本提案不處理）
- 員工歷程頁顯示 cross_company_code 時，是否同時顯示「曾任職子公司」歷程？— 建議於 D-14 task 中一併處理（既然欄位已永久保留，UI 側順手做）
