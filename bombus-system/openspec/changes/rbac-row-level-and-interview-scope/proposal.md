## Why

依《客戶回饋比對分析_L0權限與系統設定_20260429》D-02、D-05，現行 RBAC 模型僅支援 **模組 + 功能頁面** 兩層權限，且 `action_level` 只有 `none / view / edit` 二態，無法表達：

1. **資料列級權限（Row-level）**：例如「面試官只能看到被指派給自己的候選人」、「主管只能看到下屬的績效」這類「同一張表內，不同人看到不同 row」的需求
2. **審核動詞（Approve）**：客戶要求「讀／寫／審核」三動詞並列。現況把審核行為混在 `edit` 裡，無法獨立授權「可批准但不可編輯」的場景（如 HR 主管批准調薪、財務批准請款）
3. **面試官角色與 row scope**：D-05 客戶明確要求「面試官僅能被授與針對特定面試者的檢視與評分權限」。目前 `interview_invitations.interviewer_id` 已存在，但任何被指派的員工登入後仍可看到全公司所有候選人 — 缺 RBAC enforcement

同時，記憶提醒（`project_scope_metadata_only.md`）指出既有 `user_roles.org_unit_id` scope 為 metadata-only，middleware 不檢查 — 此次將補上 `org_unit_scope` predicate 順手 enforce。

關於客戶提到的「簽核流程自定義」屬於 workflow engine（請假/加班/調薪/離職多階簽核），是 L0-Workflow 模組級工程，**不在本次範圍**。本次的 approve 位元設計不會撞牆，未來 L0-Workflow 啟動時可直接引用 `can_approve` 過閘。

## What Changes

### Schema 變動（雙遷移清單同步）

- **新增 `role_feature_perms.can_approve INTEGER NOT NULL DEFAULT 0`**：審核動詞獨立位元，**與 `action_level` 不互斥**（HR 既能 edit 員工資料、又能 approve 調薪）
- **新增 `role_feature_perms.approve_scope TEXT DEFAULT NULL`**（CHECK IN NULL/self/department/company）：審核作用範圍，沿用既有 scope 概念
- **新增 `role_feature_perms.row_filter_key TEXT DEFAULT NULL`**：引用 middleware 註冊的 named predicate（如 `interview_assigned`）；NULL = 不限制 row（向後相容）
- **新增 `interviewer` 系統鎖死角色**：`roles` 表 seed 第 6 個系統角色，與既有 5 個並列，`is_system=1` 不可改名/刪除（既有 `tenant-admin.js:480-497` 已對 `is_system=1` 攔截 DELETE）
- **`tenant-schema.js:initTenantSchema` 與 `tenant-db-manager.js:_runMigrations` 雙清單同步**（CLAUDE.md 防護規則）

### 後端中介層

- **新增 `ROW_FILTERS` registry**（`server/src/middleware/permission.js`）：註冊 4 個首發 predicate：
  - `interview_assigned`：反查 `interview_invitations` + `interviews` 兩張表，過濾 `status NOT IN ('Cancelled')`（D-05 主要用途）
  - `subordinate_only`：`employees.manager_id = req.user.userId`（未來主管視角用）
  - `self_only`：`employees.user_id = req.user.userId`（員工本人）
  - `org_unit_scope`：限定 `user_roles.org_unit_id` 子樹（補既有 scope metadata-only 缺口）
- **新增 `requireApprovePerm(featureId)` middleware**：審核動作端點守衛
- **擴充 `filterByScope`**：在既有 self/department/company scope 過濾後，串接 `row_filter_key` 對應 predicate 的 SQL clause（AND 串接）

### 後端 API

- **`GET /api/employee/list?role=<code>` 過濾參數**：JOIN `users + user_roles + roles` 過濾擁有指定角色的員工。D-05 兩個 modal 用此 API 限制 interviewer 下拉只列有 `interviewer` 角色者
- **`L1.recruitment` 列表 SELECT 自動套 row_filter**（透過既有 `requireFeaturePerm` middleware）
- **`L1.recruitment`（候選人列表與面試評分屬同一 feature） 列表 SELECT 自動套 row_filter**

### 前端

- **角色管理頁**（`role-management-page`）每個 feature 列：
  - 既有勾選框 view / edit **新增第三欄 approve**
  - **新增下拉「資料列限制」**，選項為已註冊 predicate 的中文化標籤（如「僅被指派的面試者」）
- **`invite-candidate-modal` interviewer 下拉**改用 `?role=interviewer` 過濾
- **`schedule-interview-modal` interviewer 下拉**改用 `?role=interviewer` 過濾
- **`tenant-admin.model.ts`**：三個介面 `RoleFeaturePerm`、`FeaturePermPayload`、`UserFeaturePerm` 全部新增 `can_approve / approve_scope / row_filter_key` 欄位（preflight 確認）

### Seed default

- **既有 5 角色**：`can_approve=0` / `row_filter_key=NULL`（fail-safe，HR 上線後自勾）
- **interviewer 新角色**（preflight 修正：feature_id 對齊系統實際命名）：
  - `L1.recruitment`：action='edit', edit_scope='company', view_scope='company', row_filter_key='interview_assigned'（候選人列表 + 面試評分屬同一 feature，evaluations endpoint `recruitment.js:512/676/1036` 共用 `requireFeaturePerm('L1.recruitment')`）
  - `L1.decision`：'none'（interviewer 不參與面試決策）
  - 其他 40+ features（`L1.jobs` / `L1.profile` / `L2.*` / `L3.*` / `L4.*` / `L5.*` / `L6.*` / `SYS.*`）全 `_n`

## Non-Goals

> 詳細 Non-Goals 與替代方案在 `design.md` 中討論。以下為 propose 階段聲明：

- **L0-Workflow 簽核流程引擎** — 客戶要的「簽核流程自定義」屬此範疇，本次 approve 採位元層級鋪路
- **候選人自助 portal / candidate 系統角色** — 候選人不登入 Bombus（架構性鎖死），candidates 表獨立於 users
- **interview_assignments 顯式表** — 採衍生方案沿用既有 invitations + interviews，零新表
- **面試官接案 / 認領流程** — 採 HR 手動指派；自動接案屬未來 ATS 自動化
- **評分狀態機（draft → submitted → locked）** — 屬 interview-evaluation-lifecycle 後續 change
- **interview_evaluations audit log** — 歸 D-07 業務稽核日誌統一規劃
- **批次指派工具** — HR 仍逐 invitation 指定 interviewer
- **SQL 表達式 row filter / UI rule builder** — 安全與效能風險高，採 named predicate 替代

## Capabilities

### New Capabilities

- `interviewer-role-scope`: 面試官系統角色、interviewer 下拉過濾、row-filtered 候選人/評分查詢的完整 RBAC enforcement

### Modified Capabilities

- `rbac`: 新增 approve 動詞與 row_filter_key 欄位語意；新增 interviewer 第 6 個系統鎖死角色定義
- `feature-perm-data-scope`: 擴充 `filterByScope` 支援 row_filter_key predicate registry 串接
- `edit-scope-enforcement`: 新增 `requireApprovePerm` 端點守衛規範

## Impact

**影響模組（L1）：**
- L1 員工管理：招募 (`/employee/jobs`, `/employee/candidates`) 列表自動套 row_filter；invite/schedule modal 換 API
- 系統設定：`/settings/users` 內角色管理頁 UI 加 approve 欄與 row_filter 下拉

**影響檔案（preflight 已精化，2026-05-08）：**

Schema：
- `server/src/db/tenant-schema.js`（`DEFAULT_ROLE_FEATURE_PERMS` 加 interviewer + 既有 5 角色擴 3 欄；`role_feature_perms` CREATE TABLE 加 3 欄；`seedTenantRBAC` roles 陣列加 interviewer；helper `_e()/_v()/_n()` 簽名擴 `can_approve / approve_scope / row_filter_key`）
- `server/src/db/tenant-db-manager.js`（`_runMigrations()` 加 3 條 `ALTER TABLE role_feature_perms ADD COLUMN` + 1 條 `INSERT OR IGNORE INTO roles` for interviewer + interviewer 對 40+ features 的 `INSERT OR IGNORE INTO role_feature_perms`；既有 `INTERVIEW_MIGRATIONS` 共用常數無需動）

後端：
- `server/src/middleware/permission.js`（`ROW_FILTERS` registry + `requireApprovePerm` + 擴 `mergeFeaturePerms` return 3 欄 + 擴 `buildScopeFilter` 串接 row_filter）
- `server/src/routes/employee.js`（既有 `GET /api/employee/list` 加 `?role=<code>` 過濾分支，JOIN `users + user_roles + roles`；不另立端點）
- `server/src/routes/recruitment.js`（既有 `GET /candidates` line 777、`GET/PATCH /candidates/:id/evaluation` line 642/676 已套 `requireFeaturePerm('L1.recruitment')`，preflight 確認 row_filter 透過 `buildScopeFilter` 自動生效，無須改 routes）

前端：
- `src/app/features/tenant-admin/pages/role-management-page/`（勾選框加 approve 欄 + row_filter 下拉）
- `src/app/features/tenant-admin/models/tenant-admin.model.ts`（**3 個 interface 都要改：`RoleFeaturePerm` line 102、`FeaturePermPayload` line 112、`UserFeaturePerm` line 119**，preflight 確認）
- `src/app/features/employee/services/interview.service.ts`（`listActiveEmployees(options)` 加 `role?: string` 選項或新增 `listInterviewers()` 方法 — preflight 發現 modal 透過此 service 取員工，非直呼 EmployeeService）
- `src/app/features/employee/components/invite-candidate-modal/`（既有 `loadEmployees()` 改帶 `role: 'interviewer'`）
- `src/app/features/employee/components/schedule-interview-modal/`（同上修改）

測試：
- `server/src/tests/test-rbac-row-level.js`（新）
- `server/src/tests/test-d05-interviewer-scope.js`（新）

**API 變動（增量，無 breaking）：**
- `GET /api/employee/list` 新增可選參數 `?role=<code>` — 既有端點增量擴充，不另立 `/api/employees`
- `GET /api/recruitment/candidates` 與 `GET /api/recruitment/candidates/:id/evaluation` 結果集依登入者角色自動縮小（不破壞既有 super_admin / hr_manager 全可見行為；feature_id 為 `L1.recruitment`）

**相依：**
- 無新增 npm 套件
- xlsx 文件後續更新：`bombus-system/docs/客戶回饋比對分析_L0權限與系統設定_20260429.xlsx` 的 D-02 與 D-05 row（修改狀態 / 預計修改 / 修改說明）將於 archive 階段補上

**風險：**
- middleware 整合風險：既有 `filterByScope` 已有 `1=0` empty subsidiary scope 邏輯，串接 row_filter 時須確保 short-circuit 行為一致
- 雙遷移清單同步：CLAUDE.md 已多次警告，本 change 須在 verify 階段同時驗證新建租戶 + 既有租戶 migration 路徑
