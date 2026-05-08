## Context

**既有 RBAC 模型現況**

```
role_feature_perms（tenant-schema.js:22-32）
  ├─ action_level: 'none' | 'view' | 'edit'         ← 二態，缺 approve
  ├─ edit_scope:   self / department / company        ← 缺 row-level
  └─ view_scope:   self / department / company

middleware/permission.js（505 行）
  ├─ requireFeaturePerm(featureId)         ← feature 級閘
  ├─ mergeFeaturePerms(rows)               ← 多角色合併（rank-based max）
  ├─ filterByScope(perm, options)          ← 既有 self/dept/company SQL clause builder
  └─ checkEditScope                        ← 編輯越權檢查
```

**既有 5 個系統角色**

`super_admin / subsidiary_admin / hr_manager / dept_manager / employee` — 透過 `seedTenantRBAC` 在租戶建立時 INSERT OR IGNORE seed（platform.js:86-96）。`is_system=1` 不可刪改。

**既有 interview 相關 schema**

```
interview_invitations（line 985）
  ├─ candidate_id FK candidates
  ├─ interviewer_id FK employees    ← HR 排邀約時就指定
  ├─ status (Pending / ... / Cancelled)
  └─ ...

interviews（line 1010）
  ├─ candidate_id FK candidates
  ├─ interviewer_id FK employees    ← 排定面試時就指定
  └─ ...

interview_evaluations（line 857）— 評分基礎設施已存在
  ├─ evaluator_id（= interviewer = employee）
  ├─ status DEFAULT 'draft'         ← state machine 已有 hook
  └─ dimension_scores / pros_comment / cons_comment / recommendation
```

**客戶來源 + 關鍵記憶**

- `客戶回饋比對分析_L0權限與系統設定_20260429.xlsx` D-02（三層權限 + approve）+ D-05（面試官例外）
- `project_scope_metadata_only.md`：既有 `user_roles.org_unit_id` 為 metadata-only，middleware 不檢查 — 本 change 順手以 `org_unit_scope` predicate 補上
- `feedback_naming_convention_scope.md`：「全集團 vs 全公司」名詞分層 — UI 標籤須遵守
- D-03 完工封存（2026-05-08）：矩陣視圖的 scope chip 純 metadata，等本 change 落地後才反映實際權限邊界

## Goals / Non-Goals

**Goals:**

1. RBAC 動詞從 view/edit 二態擴成 view/edit/**approve** 三態，且三者**不互斥**
2. 所有業務列表查詢支援 row-level 過濾，採 named predicate 不開放 SQL 自由表達式
3. interviewer 系統角色可登入後**只看到被指派的候選人/評分**，三道防線（UI 下拉過濾 + feature gate + row filter）
4. 為未來 L0-Workflow（簽核流程引擎）鋪路：approve 位元獨立欄位，workflow step 可直接引用
5. 補上既有 metadata-only scope 的 enforcement 缺口（`org_unit_scope` predicate）

**Non-Goals:**

- **L0-Workflow 簽核流程引擎**：客戶提到的「簽核流程自定義」屬此範疇（請假/加班/調薪/離職多階簽核），是 1.5–2 個月獨立模組工程。本 change 的 approve 設計鋪路後 workflow engine 可零 schema 變動引用
- **候選人自助 portal / candidate 系統角色**：現況 candidates 表獨立於 users + 既有 UUID 機制 = 架構性鎖死。候選人查應徵狀態走 104 等外部平台，本系統不做 self-service
- **interview_assignments 顯式表**：採衍生方案，row_filter `interview_assigned` 反查既有 `interview_invitations` + `interviews`。零新表，零雙寫漂移
- **面試官接案 / 認領流程**：採 HR 手動指派；自動接案屬未來 ATS 自動化
- **評分狀態機（draft → submitted → locked）**：屬業務邏輯，留待 `interview-evaluation-lifecycle` 後續 change
- **interview_evaluations audit log**：歸 D-07 業務稽核日誌統一規劃
- **批次指派工具**：HR 仍逐 invitation 指定 interviewer
- **SQL 表達式 row filter / UI rule builder**：安全（注入）與效能（無索引垃圾查詢）風險高，採 named predicate 取代

## Decisions

### 決議 1：approve 採位元層級而非流程層級

**選 A 位元層級，B 流程層級拆獨立模組。**

| | A 位元 | B 流程 |
|---|---|---|
| 本質 | role_feature_perms 加欄位 | workflow engine |
| 工期 | 同 change +0.5 週 | 獨立模組 1.5–2 個月 |
| 適用 | 「誰能按審核按鈕」 | 「請假經主管→HR→CFO」 |

**理由：**
1. xlsx「讀／寫／審核」三動詞並列文法是位元
2. 客戶說「簽核流程自定義」確實要做 B，但屬另一個世界 — 硬塞進來會讓本 change 收斂不了
3. **A 是 B 的前提**：B 的 workflow step 設「角色簽核」時引用 A 的 `can_approve=1 AND approve_scope=...`，A 完全不動

**替代方案：把 approve 加進 `action_level` 第四值。淘汰**：會讓 view/edit/approve 變互斥，但 HR 場景常需同時擁有（既能編輯員工資料、又能批准調薪），未來做 B 時必須先拆欄位 — 無謂遷移。

### 決議 2：approve 用獨立欄位 can_approve + approve_scope

```sql
role_feature_perms
  ├─ action_level   ('none' | 'view' | 'edit')        -- 既有，不動
  ├─ edit_scope     (self/dept/company)                -- 既有
  ├─ view_scope     (self/dept/company)                -- 既有
  ├─ can_approve    INTEGER NOT NULL DEFAULT 0         -- 新增
  └─ approve_scope  TEXT DEFAULT NULL                  -- 新增
                    CHECK(approve_scope IN (NULL,'self','department','company'))
```

**理由：**
- 與 view/edit 完全並存，互不影響
- `mergeFeaturePerms` 多角色合併邏輯：`can_approve = OR (取 1 為強)`，`approve_scope` 取最大（沿用既有 SCOPE_RANK）
- `view_scope` 的 fallback 規則保留：approve 預設不需要看就能批准（如 manager 只批准請假天數但不看細節），但若 approve_scope=NULL 視為「無 approve 權」

### 決議 3：row-level 採 Named Predicate Registry

**選 D 命名規則 registry，不採 SQL/UI builder/單純擴 enum。**

| | A SQL 表達式 | B 擴 enum | C UI builder | **D Named Predicate** |
|---|---|---|---|---|
| 彈性 | ★★★★★ | ★ | ★★★ | ★★★★ |
| 安全 | ❌ 注入 | ✅ | ✅ | ✅ |
| 效能可預測 | ❌ | ✅ | ⚠️ | ✅ |
| 配置門檻 | 需懂 SQL | 0 | 中 | 0（下拉選） |

**Schema：**

```sql
role_feature_perms
  └─ row_filter_key TEXT DEFAULT NULL    -- 新增，引用 ROW_FILTERS registry key
                                          -- NULL = 不限制 row（向後相容）
```

**Middleware Registry（server/src/middleware/permission.js）：**

```js
const ROW_FILTERS = {
  // D-05 主用途：interviewer 限定被指派的候選人
  // 注意：predicate 第二參數從 string 升為 options object，支援 candidateIdColumn
  // 因 L1.recruitment feature 同時涵蓋 candidates 列表（用 c.id）與 interview_evaluations 列表（用 ie.candidate_id）
  'interview_assigned': (req, options) => {
    const { tableAlias = 'c', candidateIdColumn = 'id' } = options || {};
    const candidateRef = `${tableAlias}.${candidateIdColumn}`;
    return {
      clause: `EXISTS (
        SELECT 1 FROM interview_invitations ii
        WHERE ii.interviewer_id = ?
          AND ii.candidate_id = ${candidateRef}
          AND ii.status NOT IN ('Cancelled')
        UNION
        SELECT 1 FROM interviews i
        WHERE i.interviewer_id = ?
          AND i.candidate_id = ${candidateRef}
      )`,
      params: [req.user.userId, req.user.userId]
    };
  },

  // 未來主管視角
  'subordinate_only': (req, options) => {
    const { tableAlias = 'e' } = options || {};
    return {
      clause: `${tableAlias}.manager_id = ?`,
      params: [req.user.userId]
    };
  },

  // 員工本人
  'self_only': (req, options) => {
    const { tableAlias = 'e' } = options || {};
    return {
      clause: `${tableAlias}.user_id = ?`,
      params: [req.user.userId]
    };
  },

  // 補既有 user_roles.org_unit_id metadata-only 缺口
  'org_unit_scope': (req, options) => {
    const { tableAlias = 'e' } = options || {};
    // 取 req.user.assignedOrgUnitIds 子樹（含子部門遞迴）
    const ids = collectOrgUnitSubtree(req.tenantDB, req.user.orgUnitIds);
    if (!ids.length) return { clause: '1=0', params: [], reason: 'empty_scope' };
    const placeholders = ids.map(() => '?').join(',');
    return {
      clause: `${tableAlias}.org_unit_id IN (${placeholders})`,
      params: ids
    };
  }
};
```

**整合點：** 既有 `filterByScope(perm, options)` 在生成 self/dept/company clause 後，若 `perm.row_filter_key` 不為 NULL，串接對應 predicate 的 clause（AND）。Short-circuit：若 predicate 回 `1=0`（如 empty_scope），整體 clause 直接回 `1=0`。

**理由：**
1. **D-05 直接解**：interviewer 角色 seed `L1.recruitment` 設 `row_filter_key='interview_assigned'`，零特殊邏輯
2. **既有 90% 場景不變**：self/dept/company 完全保留，row_filter_key=NULL 等同既有
3. **新需求邊際成本低**：未來「主管只看下屬績效」就在 registry 加一個 function
4. **效能可控**：每個 predicate 開發時加 EXPLAIN，預先建索引（已有 `idx_invitations_interviewer`、`idx_interviews_interviewer_at`）

### 決議 4：D-05 不建 interview_assignments 表，採衍生方案

xlsx 影響範圍寫「加 interview_assignments(interviewer_id, candidate_id) 表」 — **不採用**。

**理由：**
1. **YAGNI**：客戶沒明確要求「面試官接案」流程，xlsx 只說「row-level」
2. **零雙寫**：HR 排面試流程不變（既有 `invite-candidate-modal` → 寫 `interview_invitations.interviewer_id`），row_filter 自動跟隨。建一張新表然後 trigger 同步是雙寫漂移風險
3. **取消邀約自動失效**：`status NOT IN ('Cancelled')` 過濾，UX 直覺
4. **進一步縮 D-05 scope**：少一張表 + 少 CRUD UI + 少 seed default

**指派流程（不變）：**
```
HR 在 invite-candidate-modal 排邀約 → invitations.interviewer_id 寫入
    ↓
該 interviewer 即自動取得 row_filter 通過的權限
```

### 決議 5：D-05 砍 candidate 系統角色

xlsx「面試者帳號為系統鎖死」原本以為要建 candidate 角色 + portal — **不採用**。

**理由：**
- 現況 `candidates` 表獨立於 `users`，候選人**沒有登入路徑** = 架構性鎖死
- candidates UUID 機制已存在，候選人經 104/1111 平台投遞，查狀態在外部平台
- `hr-onboarding.js:252` 才在 candidate 轉員工時建 user — 反向支援未來若有 self-service 需求
- 客戶這句話更可能是「資安規範模板照抄」，不是實際登入需求

**等於：「不建帳號」就是最強的「鎖死」。**

### 決議 6：interviewer 下拉過濾走 GET /api/employee/list?role= 後端 API

D-05 第三道防線（UI 防呆）：`invite-candidate-modal` 與 `schedule-interview-modal` 的 interviewer 下拉只列有 `interviewer` 角色的員工。

**API：** 既有 `GET /api/employee/list`（`employee.js:239`，已有 `?dept= / ?status= / ?all= / ?org_unit_id=` 參數）增量擴 `?role=<code>` — 後端 JOIN `users + user_roles + roles` 過濾。**不另立 `/api/employees` 端點**（preflight 修正：API 命名為單數 `/api/employee/list`）。

```sql
SELECT e.id, e.employee_no, e.name, e.email, e.phone, e.department, e.position,
       e.level, e.grade, e.manager_id, e.hire_date, e.contract_type,
       e.work_location, e.avatar, e.status, e.org_unit_id
FROM employees e
JOIN users u ON u.employee_id = e.id      -- preflight 確認方向：users 指向 employees
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE r.code = ?
  AND (u.status IS NULL OR u.status = 'active')
ORDER BY e.department, e.name
```

**前端整合：** preflight 發現 `invite-candidate-modal` 與 `schedule-interview-modal` 透過 `interview.service.ts:listActiveEmployees()` 取員工（呼叫 `/api/employee/list?status=active&dept=...`），非直呼 EmployeeService。需擴 `listActiveEmployees(options)` 加 `role?: string` 選項或新增 `listInterviewers()` 方法。

**注意：** 並非所有 employee 都有對應 user record（員工檔案建立後可選擇是否開通帳號）— LEFT JOIN 不適用，採 INNER JOIN 自然過濾「有帳號的員工」。沒帳號的員工本來也無法登入系統，不會出現在 interviewer 下拉是正確行為。

### 決議 7：seed default 採激進 fail-safe

| | 激進 | 保守 | 漸進 |
|---|---|---|---|
| 既有 5 角色新欄位 | 全部 0/NULL | 200 筆逐筆決定 | 部分智慧預設 |
| HR 體感 | 「審核」按鈕無人可按、需主動勾 | 開箱即用但可能猜錯 | 邊角自調 |

**選激進。理由：**
1. xlsx 沒列「哪些 feature 需要 approve」，猜 200 筆翻車成本高
2. fail-safe 是 RBAC 業界默認（預設無權、主動賦予）
3. D-04 客戶選擇「讓 HR 自己決定」勝過「先猜好」呼應

**例外（D-05 必須附 seed，preflight 修正：feature_id 對齊系統實際命名）：**
- `interviewer` 角色為新建系統角色，必須完整定義所有 40+ features 的權限：
  - `L1.recruitment`：action='edit', edit_scope='company', view_scope='company', row_filter_key='interview_assigned'（一個 feature 涵蓋候選人列表 + 邀約 + 面試 + 評分 — 既有路由 `recruitment.js:512/642/676/777/1036` 共用 `requireFeaturePerm('L1.recruitment')`）
  - `L1.decision`：'none'（interviewer 不參與面試決策）
  - 其他 40+ features（`L1.jobs`/`L1.profile`/`L2.*`/`L3.*`/`L4.*`/`L5.*`/`L6.*`/`SYS.*`）全 `_n`

### 決議 8：UI 名詞遵守既有「全集團 vs 全公司」分層

依 `feedback_naming_convention_scope.md`：

| 概念 | 後端值 | 中文 | 出現位置 |
|---|---|---|---|
| **assignment scope_type** | global/group | **全集團** | 矩陣 / popover / 角色管理頁卡片 / CSV |
| **perm_scope**（含本次新增 approve_scope） | company | **全公司** | 角色管理頁的權限細項表 |
| 子公司 | subsidiary | 子公司 | 共用 |
| 部門 | department | 部門 | 共用 |

**新增 row_filter_key 的中文化：**
- `interview_assigned` → 「僅被指派的面試者」
- `subordinate_only` → 「僅下屬」
- `self_only` → 「僅本人」
- `org_unit_scope` → 「依組織單位」
- NULL → 「不限制」

## Risks / Trade-offs

### 風險 1：既有 filterByScope short-circuit 行為變化

`filterByScope` 在 empty subsidiary scope 時回 `clause='1=0'`（line ~375）。串接 row_filter 時若 row_filter 也回 `1=0`（如 `org_unit_scope` 無分配），AND 串接結果仍 `1=0` 正確；但若 scope 部分產出有值 + row_filter 產出 `1=0`，AND 結果仍 `1=0` — 預期行為。

**Mitigation：** 整合測試明確覆蓋三種短路情境（scope=1=0 / row=1=0 / 兩者皆有 / 兩者皆 NULL）。

### 風險 2：雙遷移清單同步

CLAUDE.md 多次警告 `tenant-schema.js:initTenantSchema` 與 `tenant-db-manager.js:_runMigrations` 的雙清單漂移風險。本 change 加 3 欄 + 1 新角色 seed 必須兩處同步。

**Mitigation：**
1. tasks.md 明確列雙清單修改為相鄰任務
2. verify 階段必跑「新建租戶 + 既有租戶遷移」雙路徑驗證（呼應 D-16 verify:d16 模式）

### 風險 3：interviewer 角色種子在既有租戶補入時機

新增 `interviewer` 系統角色，既有租戶啟動時 `_runMigrations` 必須冪等 INSERT OR IGNORE 補入 + 對該角色 INSERT OR IGNORE 完整 seed `role_feature_perms`。

**Mitigation：** 沿用 D-16 既有 `INSERT OR IGNORE` 模式 + verify 腳本檢查既有 demo 租戶啟動後可看到 interviewer 角色與其 features。

### 風險 4：row_filter EXISTS 子查詢效能

`interview_assigned` 的 EXISTS UNION 兩張表，最壞情況可能掃 invitations + interviews 全表。

**Mitigation：** 既有索引足夠支撐：
- `idx_invitations_interviewer` (line 412)
- `idx_interviews_interviewer_at` (line 413)
EXPLAIN QUERY PLAN 應顯示走 SEARCH using INDEX。tasks.md 加一條驗證任務。

### 風險 5：D-03 矩陣視圖的 scope chip 行為改變

D-03 矩陣視圖目前顯示 scope chip 純 metadata。本 change 落地後，若 HR 給 interviewer 角色設 scope=部門，矩陣 cell 會顯示「部門」chip 但實際 enforcement 因 row_filter 更嚴格 — chip 不反映完整 enforcement。

**Mitigation：** 不在本 change 修矩陣 UI（避免 scope creep），但 release notes 加說明：「Cell scope chip 顯示『指派層級』；row-level 過濾透過 row_filter 額外限制，可在角色管理頁查看」。未來可在 cell tooltip 補充 row_filter 資訊（屬 D-03 後續優化）。

### 風險 6：approve middleware 套用點不夠完整

本 change 新增 `requireApprovePerm(featureId)` 但**現況無端點需要 approve**（沒人按審核按鈕）。若僅加 middleware 不示範套用，未來新增審核端點時維護者可能忘記引用。

**Mitigation：** design.md 在 Open Questions 註記：「approve middleware 屬鋪路設計，預期由未來 L0-Workflow 或請假/調薪審核 change 真正套用。本 change 提供 1 個示範端點：`POST /api/recruitment/decisions/:id/approve`（若範圍過大可拆出 — 列為 Open Question）」。

### 取捨：org_unit_scope predicate 範圍

決定把「補既有 metadata-only scope 缺口」一併做，可能把 D-02 scope 拉大。但 `org_unit_scope` 與其他 predicate 同樣是 registry 中一個 function，邊際成本低 + 解一個明確的歷史債（D-03 矩陣記錄已標註）。

### 決議 9：approve middleware 純鋪路，不附示範審核端點

**收斂自 Q1（2026-05-08）：** 本 change 不新增任何審核業務端點。`requireApprovePerm` middleware 寫好後僅做 sanity-check 驗證 import 路徑可用，等待未來 L0-Workflow 或具體業務 change（如請假審核 / 調薪審核）真正套用。

**理由：**
- xlsx 未指定哪些 feature 需要 approve，硬選 `recruitment.decisions` 等是猜題
- 純鋪路避免 scope creep，本 change 聚焦 RBAC infra
- HR 上線後可在角色管理頁勾選 approve（位元已存在），等業務端點補齊就能直接生效

**對 HR 體感的處置：** release notes 須說明「審核位元已可勾選但尚未有 caller，等後續業務端點套用」。

### 決議 10：org_unit_scope predicate 採遞迴版本，不做 strict 變體

**收斂自 Q2（2026-05-08）：** ROW_FILTERS 首發 4 個 predicate 中，`org_unit_scope` 採「包含子部門遞迴子樹」實作。**不做** `org_unit_scope_strict`（不含子部門）變體。

**理由：**
- 客戶從未提及「不含子部門」需求 — YAGNI
- 遞迴版符合大多數企業權限直覺（主管看自己單位含下層）
- 未來若有 strict 需求，registry 加一個 function 即可（邊際成本低）

### 決議 11：既有 5 角色 approve 維持 fail-safe，不預設智慧值

**收斂自 Q3（2026-05-08）：** 既有 5 角色的 `can_approve` 與 `approve_scope` 全部預設 `0` / `NULL`，**不**為 `super_admin / hr_manager` 等預設「應有審核權」的智慧值。HR 上線後依實際組織需求自勾。

**理由：**
- 與決議 7（seed default 採激進 fail-safe）一致
- xlsx 未列「哪些 feature 需要哪個角色 approve」清單，猜 200 筆翻車成本高於不猜
- RBAC 業界默認：預設無權、主動賦予

**配套：** release notes 附「常見預設場景參考」（如「super_admin 通常需對所有 features 開啟 approve」），純參考非強制。

### 決議 12：role-management-page 的 row_filter 下拉對所有 features 一致顯示

**收斂自 Q4（2026-05-08）：** 角色管理頁每個 feature 列都顯示「資料列限制」下拉，預設值為 NULL「不限制」。**不**做 feature metadata 標記「哪些可配 row_filter」的差異化顯示。

**理由：**
- UX 一致性 > 局部優化；HR 看到無意義組合會自然不選
- 為某些 feature 隱藏下拉會讓維護者困惑「為何這個 feature 沒有」
- 過早優化等於 over-engineering — 真有客訴再加 metadata 控制

**邊界：** 系統管理類 feature（如 `system.tenant-config`）若選了 row_filter 也不會生效（middleware 對應端點通常不走 buildScopeFilter），屬無害選擇。

## Migration Plan

**Phase 1：Schema migration（雙清單）**

```sql
-- tenant-schema.js: initTenantSchema 改 CREATE TABLE 含新欄位（新租戶直接生效）
-- tenant-db-manager.js: _runMigrations 加冪等 ALTER TABLE
ALTER TABLE role_feature_perms ADD COLUMN can_approve INTEGER NOT NULL DEFAULT 0;
ALTER TABLE role_feature_perms ADD COLUMN approve_scope TEXT DEFAULT NULL;
ALTER TABLE role_feature_perms ADD COLUMN row_filter_key TEXT DEFAULT NULL;
```

既有 200 筆自動拿到 `0/NULL/NULL`（fail-safe），**零人工 backfill**。

**Phase 2：interviewer 角色 + seed**

```sql
-- 既有 seedTenantRBAC roles 陣列加 interviewer
INSERT OR IGNORE INTO roles (id, code, name_zh, is_system, ...) VALUES (?, 'interviewer', '面試官', 1, ...);

-- DEFAULT_ROLE_FEATURE_PERMS['interviewer'] 對所有 features INSERT OR IGNORE
-- 其中 recruitment.candidates / recruitment.interview-evaluations 帶 row_filter_key='interview_assigned'
```

**Phase 3：Middleware + API + 前端（並行）**

雙清單同步通過後：
- middleware 加 ROW_FILTERS registry + filterByScope 整合
- `GET /api/employees?role=` 過濾參數
- 前端兩個 modal 換 API、role-management-page 加 approve 與 row_filter 下拉

**Rollback strategy**

- **Schema rollback**：sql.js 不支援 DROP COLUMN — 但所有新欄位 DEFAULT 0/NULL，舊 code 自動忽略。回滾只需要 revert middleware + UI code，schema 留著無害
- **interviewer 角色 rollback**：可保留（無人指派該角色等同未啟用），或 UPDATE roles SET deleted_at=now() 軟刪
- **Seed rollback**：fail-safe 預設意味著回滾後 HR 觀察到「審核權都還在 0」屬正常

## Open Questions

**全部已收斂於 2026-05-08。** 原 4 題（approve 示範端點 / org_unit_scope strict 變體 / 既有 5 角色 approve 預設 / row_filter 下拉顯示策略）已轉化為決議 9–12。本節保留為佔位以利日後新議題追加。

（無未決議題）
