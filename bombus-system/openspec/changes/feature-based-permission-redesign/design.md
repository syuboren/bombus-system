## Context

Bombus 目前使用 `resource:action` 二維 RBAC 模型（20 resources × ~4 actions = 80+ permissions），scope 綁定在角色指派層級（user_roles.org_unit_id）。

PM 反映角色管理介面有三個痛點：
1. 中英混雜（標籤映射不完整）
2. 80+ 個 checkbox 太多、看不懂
3. 無法針對不同功能設定不同的資料可見範圍

### 現有資料表結構
```sql
permissions (id, resource, action, description)           -- 80+ 筆
role_permissions (role_id, permission_id)                  -- 多對多
user_roles (user_id, role_id, org_unit_id, created_at)    -- scope 在角色層級
```

### 需要修改的現有檔案

**後端：**
- `server/src/db/tenant-schema.js` — 新增 features、role_feature_perms 表定義
- `server/src/db/tenant-db-manager.js` — 新增冪等遷移（ALTER TABLE、INSERT 等）
- `server/src/db/migrate-demo.js` — 更新 seed data（features + 5 個預設角色的 feature perms）
- `server/src/routes/tenant-admin.js` — 新增 features / role-feature-perms API
- `server/src/middleware/permission.js` — 新增 requireFeaturePerm()

**前端：**
- `src/app/features/tenant-admin/pages/role-management-page/` — 重寫角色編輯 UI（.ts/.html/.scss）
- `src/app/features/tenant-admin/pages/permission-visualization-page/` — 適配新模型
- `src/app/features/tenant-admin/services/tenant-admin.service.ts` — 新增 API 呼叫
- `src/app/features/tenant-admin/models/tenant-admin.model.ts` — 新增介面
- `src/app/core/services/permission.service.ts` — 新增 hasFeaturePerm()

### 複用的現有服務與元件
- `NotificationService` — 操作回饋
- `OrgUnitService` — 組織架構資料
- `AuthService` — 登入後 token 解析
- SCSS Mixins: `@include card`, `@include data-table`, `@include button-module`

---

## Goals / Non-Goals

**Goals:**
- 將權限模型從 resource×action 改為 feature×action_level×scope 三維模型
- 提供直觀的角色權限編輯 UI（漸進式三欄：操作等級 → 編輯範圍 → 查看範圍）
- 預設角色（5 個）自動遷移至新模型
- 新舊權限檢查並存，不破壞現有 API 保護

**Non-Goals:**
- 不建立角色範本/快速建立精靈
- 不修改 settings/users 頁面的角色指派流程
- 不新增 L3~L6 的具體 feature 定義（留佔位符）
- 不刪除舊 permissions/role_permissions 表

---

## Decisions

### Decision 1: Feature 定義採靜態表而非動態配置

**選擇：** features 表的資料在 DB 初始化時預載，管理員不可自行新增/刪除 feature。

**替代方案：** 允許管理員自訂 feature — 但這會讓介面更複雜，且目前無明確需求。

**理由：** feature 定義與程式碼路由/元件緊密綁定，允許自訂會導致前端找不到對應的路由守衛。未來若需要，可以開放「啟用/停用」但不開放新增。

### Decision 2: 漸進式三欄 UI（操作等級 → 編輯範圍 → 查看範圍）

**選擇：** 每個 feature 一行，根據操作等級動態顯示 0~2 個 scope 下拉選單。

```
操作 = none  → 不顯示任何 scope 下拉
操作 = view  → 只顯示「查看範圍」
操作 = edit  → 顯示「編輯範圍」+「查看範圍」
```

查看範圍自動 >= 編輯範圍（改編輯範圍時自動校正查看範圍）。

**替代方案 A：** 80+ checkbox 矩陣（現狀）— 太複雜。
**替代方案 B：** 合併成單一下拉（如「可編輯（部門）」）— 無法分開設定編輯/查看範圍。

**理由：** PM 提供的權限表明確顯示「編輯自己、可查看部門」的場景，必須支援雙範圍。漸進式顯示讓簡單情境（無權限/僅查看）不會被多餘選項干擾。

### Decision 3: Feature 清單分模組折疊

**選擇：** features 按 module 欄位分組（L1 員工管理、L2 職能管理...），每個模組可折疊/展開。

**Feature 清單（L1 共 5 個、L2 共 7 個、SYS 共 4 個，合計 16 個 feature）：**

| module | feature_id | name |
|--------|-----------|------|
| L1 | `recruitment_jobs` | 招募職缺管理 |
| L1 | `ai_interview` | AI 智能面試 |
| L1 | `employee_profile` | 員工檔案管理 |
| L1 | `talent_pool` | 人才庫管理 |
| L1 | `meeting` | 會議管理 |
| L2 | `grade_matrix` | 職等職級矩陣 |
| L2 | `career_path` | 職涯發展路徑 |
| L2 | `ai_career` | AI 職涯規劃助手 |
| L2 | `job_description` | 職務說明書 |
| L2 | `competency_library` | 職能基準庫 |
| L2 | `competency_assessment` | 職能評估系統 |
| L2 | `competency_gap` | 職能落差分析 |
| SYS | `organization` | 組織架構管理 |
| SYS | `user_management` | 使用者管理 |
| SYS | `export` | 匯出功能 |
| SYS | `audit_log` | 審計日誌 |

L3~L6 模組預留 module 值，後續擴充 feature 時只需 INSERT，不需改結構。

**sort_order 值定義：** 各模組內按以下順序排列（sort_order = module_base + index）：

| module | feature_id | sort_order |
|--------|-----------|------------|
| L1 | recruitment_jobs | 100 |
| L1 | ai_interview | 101 |
| L1 | employee_profile | 102 |
| L1 | talent_pool | 103 |
| L1 | meeting | 104 |
| L2 | grade_matrix | 200 |
| L2 | career_path | 201 |
| L2 | ai_career | 202 |
| L2 | job_description | 203 |
| L2 | competency_library | 204 |
| L2 | competency_assessment | 205 |
| L2 | competency_gap | 206 |
| SYS | organization | 900 |
| SYS | user_management | 901 |
| SYS | export | 902 |
| SYS | audit_log | 903 |

**未映射的既有路由：** 以下既有業務路由在 16 個 feature 中無獨立對應項，在新舊並存期間由 legacy `requirePermission()` 保護：
- `onboarding` → 業務上歸屬 `recruitment_jobs` feature 範疇
- `monthly_check`、`weekly_report`、`quarterly_review` → L3~L6 待後續定義
- `approval`、`submission`、`template` → 跨模組功能，待後續定義

### Decision 4: 新舊模型並存過渡策略

**選擇：** 新增 features + role_feature_perms 表，保留舊 permissions + role_permissions 表。新 UI 讀寫新表，舊 requirePermission() 中間件保持不變。新增 requireFeaturePerm() 中間件，路由逐步從舊切新。

**理由：** 現有 30+ 條路由使用 requirePermission()，一次全改風險太大。並存策略允許逐步遷移，每次遷移一個路由模組。

### Decision 5: 預設角色權限映射

5 個系統預設角色的 feature 權限映射（依 PM 提供的表格）：

| feature_id | employee | dept_manager | hr_manager | subsidiary_admin | super_admin |
|---|---|---|---|---|---|
| recruitment_jobs | none | none | edit/company | edit/company | edit/company |
| ai_interview | none | edit/company | view/company | edit/company | edit/company |
| employee_profile | edit/self + view/self | edit/self + view/dept | edit/company | edit/company | edit/company |
| talent_pool | none | none | edit/company | edit/company | edit/company |
| meeting | edit/self + view/company | edit/self + view/company | edit/self + view/company | edit/self + view/company | edit/company |
| grade_matrix | view/company | view/company | edit/company | edit/company | edit/company |
| career_path | view/company | view/company | edit/company | edit/company | edit/company |
| ai_career | view/self | view/self | view/company | view/company | view/company |
| job_description | view/company | view/company | edit/company | edit/company | edit/company |
| competency_library | view/company | view/company | edit/company | edit/company | edit/company |
| competency_assessment | view/self | view/dept | view/company | view/company | edit/company |
| competency_gap | view/self | view/dept | view/company | view/company | edit/company |
| organization | none | none | view/company | edit/company | edit/company |
| user_management | none | none | none | view/company | edit/company |
| export | none | none | view/company | view/company | edit/company |
| audit_log | none | none | none | view/company | view/company |

### Decision 6: DB Schema 設計

**新增表：**

```sql
-- 功能定義
CREATE TABLE IF NOT EXISTS features (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 角色功能權限
CREATE TABLE IF NOT EXISTS role_feature_perms (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  feature_id TEXT NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  action_level TEXT NOT NULL DEFAULT 'none'
    CHECK(action_level IN ('none', 'view', 'edit')),
  edit_scope TEXT DEFAULT NULL
    CHECK(edit_scope IN (NULL, 'self', 'department', 'company')),
  view_scope TEXT DEFAULT NULL
    CHECK(view_scope IN (NULL, 'self', 'department', 'company')),
  PRIMARY KEY (role_id, feature_id)
);
```

**約束規則（由 API 層驗證）：**
- `action_level = 'none'` → `edit_scope` 和 `view_scope` 必須為 NULL
- `action_level = 'view'` → `edit_scope` 必須為 NULL，`view_scope` 必須非 NULL
- `action_level = 'edit'` → `edit_scope` 和 `view_scope` 都必須非 NULL
- `view_scope` 的層級 >= `edit_scope`（self < department < company）

### Decision 7: API 端點設計

**新增 API：**

| Method | Path | 路由檔案 | 中間件 | 說明 |
|--------|------|----------|--------|------|
| GET | `/api/tenant-admin/features` | tenant-admin.js | authMiddleware + tenantMiddleware + requireRole | 取得所有 feature 定義（按 module 分組） |
| GET | `/api/tenant-admin/roles/:id/feature-perms` | tenant-admin.js | authMiddleware + tenantMiddleware + requireRole | 取得角色的所有 feature 權限 |
| PUT | `/api/tenant-admin/roles/:id/feature-perms` | tenant-admin.js | authMiddleware + tenantMiddleware + requireRole | 批量更新角色的 feature 權限（全量替換） |
| GET | `/api/auth/my-feature-perms` | auth.js | authMiddleware + tenantMiddleware | 取得目前登入使用者的合併 feature 權限 |

PUT 使用全量替換（而非單筆 PATCH），因為 UI 是整個角色的權限一次送出。API 在 transaction 內執行 DELETE + INSERT。

**`/api/auth/my-feature-perms` 回應格式：**

```json
{
  "featurePerms": [
    {
      "feature_id": "recruitment_jobs",
      "module": "L1",
      "name": "招募職缺管理",
      "action_level": "edit",
      "edit_scope": "company",
      "view_scope": "company"
    }
  ]
}
```

此端點放在 auth.js 但必須掛載 `tenantMiddleware`（因為需要查詢租戶 DB 的 `role_feature_perms` 表）。合併邏輯見 Decision 9。

### Decision 8: 前端權限服務擴充

`PermissionService` 新增：

```typescript
// Signal: 目前使用者的 feature 權限（登入後從 API 載入）
featurePerms = signal<Map<string, FeaturePerm>>(new Map());

// 檢查使用者是否有功能權限
hasFeaturePerm(featureId: string, requiredLevel: 'view' | 'edit', scope?: string): boolean;
```

Token 不嵌入 feature perms（太大），改為登入成功後呼叫 `/api/auth/my-feature-perms` 取得。

**已知限制：** 當管理員修改某使用者的角色權限後，該使用者的前端 `featurePerms` Signal 不會即時更新，需等到下次登入或頁面重新整理。首階段不實作即時推送或定期輪詢，視為已知限制。

### Decision 9: 多角色權限合併演算法

**選擇：** 當使用者擁有多個角色時，對每個 feature 取所有角色中的最高權限。

**合併規則：**

1. **action_level 取最高：** `edit > view > none`
2. **edit_scope 取最大：** `company > department > self > NULL`
3. **view_scope 取最大：** `company > department > self > NULL`
4. 合併後仍需滿足 `view_scope >= edit_scope` 約束（正常情況下各角色個別已滿足，合併後自然滿足）

**範例：**

| 角色 A | 角色 B | 合併結果 |
|--------|--------|----------|
| edit/self + view/dept | view/company | edit/self + view/company |
| view/self | edit/dept + view/dept | edit/dept + view/dept |
| none | edit/company + view/company | edit/company + view/company |

**理由：** 採「最寬鬆」策略符合 RBAC 慣例 — 使用者的有效權限等於其所有角色權限的聯集。

### Decision 10: Scope 執行機制與 scope_type 關係

**Scope 判定機制：**

`requireFeaturePerm(featureId, requiredLevel)` 中間件接受 2 個參數（不含 scope）。Scope 從請求上下文自動解析：

1. 中間件先查詢使用者所有角色的 feature perms，依 Decision 9 合併
2. 檢查合併後的 `action_level` 是否 >= `requiredLevel`
3. 若路由需要 scope 檢查，由路由處理器自行比對 `req.featurePerm.edit_scope` / `req.featurePerm.view_scope` 與目標資料的 org_unit_id
4. 「使用者所屬部門」透過 `user_roles.org_unit_id` 判定（與現有機制一致）

中間件將合併後的 feature perm 注入 `req.featurePerm`，供路由處理器做 scope 層級的細粒度檢查。

**scope_type 與 per-feature scope 的關係：**

- `scope_type` (global/subsidiary/department) 是**角色的行政層級描述**，描述該角色適用於哪個組織層級
- per-feature scope (self/department/company) 是**資料可見範圍**，描述該功能可存取的資料範圍
- 兩者使用不同詞彙但概念互補：scope_type 決定角色指派給誰，per-feature scope 決定指派後能看到什麼
- scope_type **不作為** per-feature scope 的上限約束（例如 scope_type=department 的角色仍可有 view_scope=company 的 feature）
- scope_type 在新模型中保留為**角色描述性欄位**，用於 UI 顯示和篩選，不影響權限運算

---

## Risks / Trade-offs

**[Risk] 舊 requirePermission() 與新 requireFeaturePerm() 不同步**
→ 遷移期間可能某個路由用舊模型允許、新模型禁止，造成不一致。
→ **Mitigation:** 首階段只在角色管理 UI 使用新模型，不立即切換路由守衛。舊模型繼續保護所有 API。

**[Risk] Feature 清單與實際前端路由不一致**
→ 新增前端頁面時忘記同步新增 feature。
→ **Mitigation:** Feature 清單定義在 tenant-schema.js 的 seed data 中，與 DB 初始化綁定。新增模組時必須同步更新。

**[Risk] 資料遷移：既有自訂角色的權限轉換**
→ 如果租戶已自訂角色（非 5 個預設），舊 role_permissions 無法自動映射到新 role_feature_perms。
→ **Mitigation:** 遷移腳本為自訂角色建立「最接近」的 feature perms（基於 resource 對應關係），並在管理介面提示管理員檢視。

**[Trade-off] Feature 粒度固定 vs 動態**
→ 固定粒度較簡單但不夠靈活。目前優先簡單，未來可開放「啟用/停用 feature」。

**[Risk] 既有 L1 路由（onboarding 等）無獨立 feature 映射**
→ onboarding、monthly_check、weekly_report、quarterly_review、approval 等路由在 16 個 feature 中無獨立項。
→ **Mitigation:** 新舊並存期間由 legacy `requirePermission()` 保護。onboarding 業務上歸屬 `recruitment_jobs` feature。L3~L6 相關路由待後續模組開發時定義 feature。

**[Risk] 權限快取失效**
→ 管理員修改使用者角色權限後，該使用者前端快取不會即時更新。
→ **Mitigation:** 首階段視為已知限制。使用者下次登入或重新整理頁面即可取得最新權限。未來可考慮 token refresh 時同步更新 feature perms。

---

## Migration Plan

**階段 1：DB 遷移（向後相容）**
1. tenant-schema.js 新增 features、role_feature_perms CREATE TABLE
2. tenant-db-manager.js 的 `_runMigrations()` 新增冪等遷移（CREATE TABLE IF NOT EXISTS）
3. migrate-demo.js 新增 seed data（16 個 features + 5 個預設角色的 feature perms）

**階段 2：後端 API**
1. tenant-admin.js 新增 3 個新 API endpoint（features、role feature-perms CRUD）
2. auth.js 新增 `GET /api/auth/my-feature-perms`（使用者合併權限，需掛載 tenantMiddleware）
3. permission.js 新增 requireFeaturePerm() 中間件（此階段不替換既有路由）

**階段 3：前端 UI**
1. 新增 Feature、RoleFeaturePerm 介面
2. TenantAdminService 新增 API 呼叫方法
3. 重寫 role-management-page 的角色編輯 UI
4. PermissionService 新增 hasFeaturePerm()
5. 修復現有標籤映射（補齊 getResourceLabel、getActionLabel 中文）

**階段 4：驗證**
1. Angular build 驗證
2. 手動測試角色編輯流程
3. 確認既有 API 權限檢查不受影響

**Rollback：** 如果新模型有問題，只需在角色管理 UI 切回使用舊 permissions API（前端條件切換），DB 中新表不影響舊功能。

---

## Open Questions

1. **L3~L6 的 feature 清單**：目前只定義 L1/L2/SYS 共 16 個 feature。L3~L6 的具體子功能待各模組開發時再定義，還是現在就先建立佔位 feature？
   → **暫定決策：** 現階段只做 L1/L2/SYS，L3~L6 留待後續。
