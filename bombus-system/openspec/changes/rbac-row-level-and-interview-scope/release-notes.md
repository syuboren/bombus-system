# Release Notes — D-02 row-level RBAC + D-05 interviewer scope

**Change**: `rbac-row-level-and-interview-scope`
**完工日期**: 2026-05-08
**對應客戶需求**: D-02（三層權限控管）+ D-05（面試者/面試官權限例外）

---

## 一、HR 必讀（行為變更）

### 1. 新增第 6 個系統角色：interviewer（面試官）

- 系統自動在 demo / 既有租戶補入此角色，不可改名/刪除（is_system=1）
- **預設權限**：對 `L1.recruitment`（AI智能面試 — 候選人 + 邀約 + 面試 + 評分）有 view+edit 權限，但**僅限被指派的候選人**
- 其他 40+ feature 全部為 'none'（fail-safe）
- HR 可於「系統設定 → 員工與帳號管理」為員工指派 interviewer 角色

### 2. 排面試流程：interviewer 下拉只列有 interviewer 角色的員工

- `invite-candidate-modal`「面試官」下拉自動過濾
- 若下拉為空，顯示提示：「目前無設定面試官，請至『系統設定 → 員工與帳號管理』為員工加上面試官角色」
- HR 不再會誤指派沒角色的員工（避免「人選了但他登入看不到」客服問題）

### 3. interviewer 登入後只看到被指派的候選人

- AI 智能面試頁面候選人列表自動過濾
- 三道防線（UI 下拉 / Feature gate / row filter）任一失效都不會洩漏
- 取消的邀約（`status='Cancelled'`）自動失效不再可見

---

## 二、進階：審核位元（鋪路功能）

本次新增 RBAC 的「審核」第三動詞，與 view/edit 並存（不互斥）。

**目前狀態：純鋪路、暫無業務端點呼叫。**

- 既有 5 角色（super_admin / subsidiary_admin / hr_manager / dept_manager / employee）的所有 feature 預設 `can_approve=0`（fail-safe）
- HR 可於「角色管理」每個 feature 列勾選「可審核」並設定範圍（個人/部門/全公司）
- 但目前沒有任何 endpoint 呼叫 `requireApprovePerm` middleware，故勾選後**暫時沒有實際效果**

**等待時機**：未來實作 L0-Workflow（簽核流程引擎，請假 / 加班 / 調薪 / 離職）或具體業務審核 endpoint 時，會引用這層位元做為過閘條件。

### 常見預設場景參考（HR 自行配置）

| 角色 | 建議勾選 approve 的 feature | 範圍 |
|---|---|---|
| super_admin | 所有 features | 全公司 |
| hr_manager | 員工調薪 / 離職核准 / 員工檔案 | 全公司 |
| dept_manager | 請假 / 加班 / 部門員工調薪 | 部門 |
| subsidiary_admin | 子公司業務審批 | 子公司 |
| employee | 不勾選 | — |

---

## 三、進階：資料列限制（row_filter）

每個 feature 的角色配置現在多了「資料列限制」下拉，5 個選項：

| 選項 | 用途 | 適用角色 |
|---|---|---|
| 不限制（預設） | 沒 row 限制，沿用既有 self/dept/company scope | 多數角色 |
| 僅被指派的面試者 | 只看 invitations / interviews 指派給自己的候選人 | interviewer（已預設） |
| 僅下屬 | 只看 manager_id 為自己的 employees | 主管（HR 自行勾） |
| 僅本人 | 只看自己的記錄 | 員工自助 |
| 依組織單位 | 限定 user_roles.org_unit_id 子樹 | 補既有 metadata-only 缺口 |

**注意：** 這 5 個選項是**已註冊的 named predicate**，不接受其他輸入（避免 SQL 注入 / 任意過濾）。新需求需開發者註冊新 predicate。

---

## 四、開發者注意事項

### 1. 三個 FeaturePerm interface 已擴 3 欄

`tenant-admin.model.ts` 的 `RoleFeaturePerm` / `FeaturePermPayload` / `UserFeaturePerm` 都加了：
- `can_approve?: number`（0 或 1）
- `approve_scope?: PermScope | null`
- `row_filter_key?: string | null`

### 2. `mergeFeaturePerms` return 型別擴增

permission.js 的 `mergeFeaturePerms(rows)` 回傳物件多了三欄。多角色合併規則：

- `can_approve`：OR — 任一角色 access-granting + can_approve=1 → 1
- `approve_scope`：取最大（沿用 SCOPE_RANK） — 限 access-granting rows
- `row_filter_key`：least-restrictive — 限 access-granting rows，任一 NULL → 整體 NULL

**重要：** `action_level='none'` 的 row 不參與 row_filter / can_approve / approve_scope 合併（避免雙角色用戶被「無權角色」誤解除限制）。

### 3. 新 predicate 註冊位置

`server/src/middleware/permission.js` 的 `ROW_FILTERS` 物件。新增 predicate 步驟：
1. 在 registry 加 function `(req, options) => { clause, params }`
2. 在 `tenant-admin.js` PUT `/roles/:id/feature-perms` 的 `validRowFilterKeys` 白名單加 key
3. 在 `role-management-page.component.ts` 的 `ROW_FILTER_OPTIONS` 加中文化 label

### 4. 雙清單同步

- 新建租戶：`tenant-schema.js` 的 `RBAC_TABLES_SQL` CREATE TABLE 已含 8 欄
- 既有租戶：`tenant-db-manager.js` `_runMigrations` 跑 `ROLE_FEATURE_PERMS_MIGRATIONS`（共用常數）3 條 ALTER TABLE
- interviewer 角色：兩處都處理（platform.js 新建 / tenant-db-manager.js INSERT OR IGNORE 補入）

---

## 五、Non-Goals（明確不做的事）

| 項目 | 為何不做 | 後續處理 |
|---|---|---|
| L0-Workflow 簽核流程引擎 | 屬獨立模組級工程（請假/加班/調薪/離職多階簽核），1.5–2 個月 | 未來獨立 change |
| 候選人自助 portal / 登入查狀態 | 候選人查狀態走 104 等外部平台，現有架構已是最強鎖死 | 不做 |
| `interview_assignments` 顯式表 | 採衍生方案沿用既有 invitations + interviews 即可 | 不做 |
| 面試官接案 / 認領流程 | 採 HR 手動指派 | 屬未來 ATS 自動化 |
| 評分狀態機（draft → submitted → locked） | 屬業務邏輯非 RBAC | `interview-evaluation-lifecycle` 後續 change |
| interview_evaluations audit log | 屬業務稽核日誌 | 歸 D-07 統一規劃 |

---

## 六、回歸風險（已驗證沒退化）

- ✅ 既有 super_admin 看全部資料（FULL_ACCESS_PERM 不受 row_filter 限制）
- ✅ 既有 hr_manager / dept_manager / employee 行為不變（fail-safe 預設保留既有 scope）
- ✅ D-03 員工×角色矩陣 cell 顯示 scope chip 與 row_filter 解耦，不破壞 UI
- ✅ tsc + ng build 全綠（含 model interface 擴充）
- ✅ EXPLAIN QUERY PLAN：interview_assigned EXISTS 子查詢走 INDEX，不掃全表

## 七、測試覆蓋

5 個整合測試檔，總計 100 assertions 全綠：

| 檔案 | 範圍 | 通過 |
|---|---|---|
| `test-rbac-merge-multi-role.js` | mergeFeaturePerms pure function（含 bugfix scenarios） | 17/17 |
| `test-rbac-row-level.js` | ROW_FILTERS registry + buildScopeFilter 整合 | 29/29 |
| `test-rbac-approve.js` | requireApprovePerm + PUT 驗證 | 10/10 |
| `test-d05-interviewer-seed.js` | interviewer 角色 seed + 系統角色不可刪 | 28/28 |
| `test-d05-interviewer-scope.js` | 三道防線端到端 | 16/16 |

執行：`cd server && node src/tests/test-<name>.js`（需 server 跑 port 3001）
