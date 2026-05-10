## Context

`GET /api/employee/list`（[employee.js:239-401](../../../server/src/routes/employee.js)）為 Bombus 員工管理的核心讀取端點，目前由前端 5 個服務共用：

| 呼叫者 | 用途 | 是否需分頁 |
|---|---|---|
| `EmployeeService.getEmployees()` | L1 員工列表頁 / 組織頁 / 個人檔案 / 入職文件 | **列表頁需要**、其他不需 |
| `InterviewService.listActiveEmployees()` | 面試官 / 排面試下拉 | 不需（典型 < 30 筆） |
| `MeetingService.getEmployees()` | 會議出席選擇 | 不需 |
| `OrgStructurePage` | 組織樹員工 hover 與計數 | 不需 |
| `EmployeeManagementPage` 矩陣視圖 | 員工×角色矩陣（D-03） | 不需（CDK Virtual Scroll 自處理 500+ 筆） |

現況痛點：
1. **無 LIMIT/OFFSET**：所有 caller 拿到全部員工，但只有列表頁真的會渲染全部
2. **employees 表完全沒索引**（`grep` 全 schema 確認，除 PRIMARY KEY 外只有業務查詢用的 `idx_invitations_interviewer` 等不相關索引）
3. **無搜尋功能**：客戶 200+ 員工時只能滾動找人

xlsx 規格：「支援 150+ 筆分頁」、難易度「低」。

## Goals / Non-Goals

**Goals:**

- L1 員工列表頁 (`/organization/employee-management` 的 list 視圖) 在 200+ 員工租戶下首屏載入 < 500ms
- 提供搜尋（name / email / employee_no）+ 排序（白名單欄位）
- 既有 5 個 caller 零修改，向後相容
- DB 索引覆蓋 ORDER BY 路徑（status + ORDER）
- SQL injection 防護（排序欄位白名單）
- 與 D-02 row-level scope filter (`buildScopeFilter`) 共存

**Non-Goals:**

- 矩陣視圖切換到分頁（D-03 已用 CDK Virtual Scroll 處理）
- 匯出 CSV 走分頁（員工視角 CSV 必須全量輸出供內控留存）
- 其他 4 個 caller 改造（interview / meeting / org-structure / onboarding 維持全量）
- 客戶端排序/篩選（與分頁本質衝突，刻意不做）
- 無限滾動（與既有 paginator UI 模式不一致，刻意不做）
- L2/L3/L4/L5/L6 模組的列表分頁（本次只做 L1 員工列表）

## Decisions

### Opt-in 分頁回傳格式（向後相容策略）

**決策**：以 query 參數 `page` 是否存在作為分頁開關。

| 請求 | 回傳格式 | 對應使用場景 |
|---|---|---|
| `GET /api/employee/list` | `Employee[]`（陣列）| 既有 5 caller 零修改 |
| `GET /api/employee/list?page=1&pageSize=50` | `{ data: Employee[], total, page, pageSize, totalPages }` | L1 員工列表頁 opt-in |

**為何不採「全部 caller 改成分頁物件」**：5 個既有 caller 涵蓋 4 個獨立 feature 模組，全改的影響面遠大於 D-13 客戶問題範圍，違反 CLAUDE.md「不要為了統一介面做不必要的重構」。

**為何不用獨立端點 `/list/paginated`**：兩個端點 95% 邏輯重複（filter / scope / managers / users / org_units 合併），維護負擔不對稱於收益。

**對既有 TypeScript 型別的影響**：`EmployeeService.getEmployees()` 的回傳型別 `Observable<Employee[]>` 不變；新增 `getEmployeesPaginated()` 回傳 `Observable<EmployeeListResult>`。

### 搜尋採 LIKE，不用 FTS

**決策**：`search` 參數對 `employees.name`、`employees.email`、`employees.employee_no` 各做一次 `LIKE '%?%' COLLATE NOCASE`，OR 串接。

**為何不用 SQLite FTS5**：
- 員工表單筆 < 10K，LIKE + idx 對小資料集已夠快
- FTS5 需要建額外 virtual table + 觸發器同步，提高 schema 複雜度
- 客戶搜尋場景多為 prefix（員工名前幾字、員工編號前綴），LIKE `%?%` 已涵蓋

**為何不只比對 name**：員工編號搜尋是 HR 高頻場景（年資 / 部門撥動時找特定編號），email 搜尋次之。

**Trade-off**：`LIKE '%?%'` 無法走 prefix index（前面有 `%`），全表掃描；但配合 status + org_unit 索引預過濾後，掃描集會大幅縮小。

### 排序欄位白名單

**決策**：`sort` 只接受 `[name, hire_date, employee_no, department]`、`order` 只接受 `[asc, desc]`，不在白名單一律忽略並 fallback 到預設 `ORDER BY department, name`。

**為何**：
1. **SQL injection 防護**：query string 直接組進 ORDER BY 是經典注入點
2. **效能可預測**：限制白名單後可針對性建索引
3. **API contract 清晰**：避免「你怎麼還能用 password 排序？」

**實作模式**：
```js
const ALLOWED_SORTS = { name: 'name', hire_date: 'hire_date', employee_no: 'employee_no', department: 'department' };
const ALLOWED_ORDERS = { asc: 'ASC', desc: 'DESC' };
const sortCol = ALLOWED_SORTS[req.query.sort] || null;
const orderDir = ALLOWED_ORDERS[req.query.order] || 'ASC';
const orderClause = sortCol ? `ORDER BY ${sortCol} ${orderDir}` : 'ORDER BY department, name';
```

### DB 索引：複合索引覆蓋預設查詢路徑

**決策**：新增單一複合索引 `idx_employees_status_org_dept_name ON employees(status, org_unit_id, department, name)`。

**為何此順序**：
1. `status` 大多數查詢預設過濾 `IN ('active', 'probation')`（[employee.js:266](../../../server/src/routes/employee.js)）
2. `org_unit_id` 子公司/部門過濾（[employee.js:253-262](../../../server/src/routes/employee.js)）
3. `department` 與 `name` 對應預設 `ORDER BY department, name`

**為何不建多個單欄索引**：sql.js 對每個寫入操作會更新所有索引；單一複合索引比 4 個單欄索引寫入成本低。

**為何不建 `idx_employees_search` 給搜尋用**：LIKE `%?%` 無法走索引（已上述討論），加索引無效。

**雙清單同步**（per memory dual migration list trap）：
- `tenant-schema.js initTenantSchema()` 對新租戶建立索引
- `tenant-db-manager.js _runMigrations()` 用 `CREATE INDEX IF NOT EXISTS` 對既有租戶冪等加上

### pageSize cap 與 paginator options

**決策**：default=50, max=200，前端 paginator 提供 `[20, 50, 100, 200]`。

| 值 | 用途 |
|---|---|
| 20 | 行動裝置或 hover preview |
| 50 | 桌面預設，xlsx 規格基準 |
| 100 | HR 批量操作 |
| 200 | 上限（覆蓋 xlsx「150+」需求 + 預留） |

**為何 max=200 而非 500**：sql.js LIMIT 越大，每次回傳的 N+1 批次合併（managers / users / org_units）也越多，200 是「能滿足客戶需求」與「單次請求 payload 合理」的平衡。

**Cap 行為**：client 傳 `pageSize=500` 後端自動 cap 至 200，不報錯（avoid breaking experimental client）。

### 與 row-level scope filter 共存

**決策**：分頁的 LIMIT/OFFSET 套在 `buildScopeFilter` 之後。

**SQL 順序**：
```sql
SELECT ... FROM employees
WHERE 1=1
  AND status IN ('active', 'probation')   -- 既有 status filter
  AND org_unit_id IN (...)                -- 既有 org filter
  AND id IN (SELECT ... role)             -- 既有 role filter
  AND (name LIKE ? OR email LIKE ? OR employee_no LIKE ?)  -- 新增 search
  AND (<scope.clause>)                    -- D-02 buildScopeFilter（含 row_filter_key predicate）
ORDER BY <whitelisted_sort>
LIMIT ? OFFSET ?                          -- 新增 paginator
```

**為何 LIMIT 在 scope filter 之後**：scope filter 是安全邊界（決定「這個 user 看得到誰」），LIMIT 只是顯示數量。先過濾再分頁，total 才反映 user 實際可見的數量。

### 前端 debounce 300ms

**決策**：搜尋輸入用 RxJS `debounceTime(300)` + `distinctUntilChanged()`。

**為何 300ms**：低於 200ms 太敏感（每打一字就觸發），高於 500ms user 會懷疑沒反應。300ms 是業界共識（Material UI / GitHub search 同此值）。

## Risks / Trade-offs

[Risk 1] **LIKE `%?%` 全表掃描**：搜尋無法走索引 → status + org_unit_id 索引前置過濾後，掃描集合縮小至「該 user 可見的員工」，10K 以下租戶無感。未來若客戶到 50K+ 員工再評估 FTS5。

[Risk 2] **OFFSET 大頁數效能**：sql.js 對 OFFSET 100000 仍需從頭掃描。→ paginator UI max 5000 筆 / 200 page = OFFSET 1000，可接受。若未來真的有 10 萬員工租戶，再轉 cursor pagination。

[Risk 3] **總筆數雙查**：分頁回傳 total 需要額外 `SELECT COUNT(*)`。→ 接受此成本；total 對 paginator UX 必要（顯示頁碼）。

[Risk 4] **既有 caller 誤用 page 參數**：若 caller 不小心傳 `page=undefined`，URL 會變成 `?page=undefined`，後端會嘗試 parseInt → NaN → 走分頁路徑回傳物件 → 既有 caller 解析失敗。→ 後端用 `req.query.page !== undefined && !isNaN(parseInt(req.query.page))` 嚴格判斷。

[Risk 5] **雙清單同步遺漏**（已知陷阱，per memory）：tenant-schema.js 與 tenant-db-manager.js 必須兩處都加索引。→ 在 tasks 中明列雙處驗證步驟，並於測試中驗證新建租戶與既有租戶皆有此索引。

[Risk 6] **D-02 row-level scope 與分頁的 total 語意**：total 應該反映「user 看得到的數量」還是「DB 總筆數」？→ 採 user 可見數量（scope filter 後 COUNT），符合「我看得到 50 筆，paginator 顯示 50 筆」直覺。
