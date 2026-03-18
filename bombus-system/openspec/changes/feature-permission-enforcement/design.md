## Context

Bombus 已完成角色管理 UI，租戶管理員可設定每個角色對 39 個功能的 action_level（none/view/edit）與資料範圍（self/department/company）。後端也已有 `requireFeaturePerm()` 中介層與 `/api/auth/feature-perms` 端點，但**前端完全未串接**，路由也未依 scope 過濾資料。

現況：
- 登入回應僅包含 `enabled_features: ["L1", "L2", ...]`（模組層級，來自 subscription plan）
- `FeatureGateService` 只檢查模組是否啟用，不檢查個別功能的 action_level
- 側邊欄根據模組啟用狀態過濾，不根據使用者角色權限
- `featureGateGuard` 只做模組層級守衛（`requiredFeaturePrefix: 'L1'`）
- API 端點未掛載 `requireFeaturePerm` 中介層，資料未依 scope 過濾

需要複用的既有服務與元件：
- `AuthService`（`features/auth/services/auth.service.ts`）— 現有 user signal + localStorage
- `FeatureGateService`（`core/services/feature-gate.service.ts`）— 需擴展
- `featureGateGuard`（`core/guards/feature-gate.guard.ts`）— 需升級
- `NotificationService`（`core/services/notification.service.ts`）— 路由攔截通知
- `requireFeaturePerm()`（`server/src/middleware/permission.js`）— 已有，需掛載到路由
- `mergeFeaturePerms()`（`server/src/middleware/permission.js:117-146`）— 已有多角色合併邏輯

## Goals / Non-Goals

**Goals:**
- 登入後載入使用者合併的功能權限（39 個 feature → action_level + scope）
- 側邊欄動態隱藏 action_level = 'none' 的項目
- 路由守衛阻擋無權限的頁面存取（含直接 URL 輸入）
- action_level = 'view' 時頁面進入唯讀模式
- L1/L2 主要 API 端點依 view_scope 過濾資料、依 edit_scope 檢查寫入權限
- 多角色使用者取聯集最高權限（已有 mergeFeaturePerms）

**Non-Goals:**
- 不修改資料表結構
- 不實作欄位層級權限
- 不實作 L3-L6 的 API 資料過濾（頁面尚未開發，僅做路由守衛）
- 不修改角色管理 UI

## Decisions

### Decision 1：前端權限資料載入策略 — 登入後額外呼叫 feature-perms API

**選擇**：登入成功後立即呼叫 `GET /api/auth/feature-perms`，將結果存入 AuthService signal + localStorage。

**替代方案**：
- 在 login response 中直接包含 feature perms → 會使 JWT payload 膨脹，且 token refresh 時無法更新
- 用 Resolver 在每次路由切換時查詢 → 過多 API 呼叫，影響體驗

**理由**：login + token refresh 時各一次 API 呼叫，平衡即時性與效能。

**檔案影響**：
- `features/auth/services/auth.service.ts` — 登入流程新增 feature-perms 呼叫
- `features/auth/models/auth.model.ts` — User interface 新增 `featurePerms` 欄位

### Decision 2：FeatureGateService 雙層檢查架構

**選擇**：保留現有的 subscription plan 模組檢查（`isModuleEnabled`），疊加 feature-level 權限檢查。

檢查流程：
```
isFeatureAccessible(featureId) =
  isModuleEnabled(module_prefix)   // subscription plan
  && canView(featureId)            // role feature perm
```

**理由**：subscription plan 是租戶層級（全租戶統一），feature perm 是使用者層級。兩者獨立且互補。

**檔案影響**：
- `core/services/feature-gate.service.ts` — 新增 `canView()`, `canEdit()`, `getFeaturePerm()`, `isFeatureAccessible()`

### Decision 3：側邊欄過濾整合方式

**選擇**：修改 `activeMenuSections` computed signal，將現有的 `isFeatureEnabled()` 調用替換為新的 `isFeatureAccessible()`，同時檢查模組啟用和功能權限。

**理由**：側邊欄已有 computed signal 做過濾，只需更換底層檢查方法，不需要改動模板。

**檔案影響**：
- `shared/components/sidebar/sidebar.component.ts` — `activeMenuSections` computed 內的過濾邏輯

### Decision 4：路由守衛升級策略 — 功能層級 requiredFeature

**選擇**：在各子路由的 `data` 中新增 `requiredFeature: 'L1.jobs'`（具體功能 ID），`featureGateGuard` 優先檢查 `requiredFeature`，若無則 fallback 到 `requiredFeaturePrefix`（模組層級）。

路由範例：
```typescript
{
  path: 'jobs',
  data: { requiredFeature: 'L1.jobs' },
  canActivate: [authGuard, featureGateGuard],
  loadComponent: () => import(...)
}
```

**替代方案**：每個模組各自寫守衛 → 大量重複程式碼

**理由**：統一在 `featureGateGuard` 中處理，route data 聲明式配置。

**檔案影響**：
- `core/guards/feature-gate.guard.ts` — 升級為支援 `requiredFeature`
- `features/employee/employee.routes.ts` — 子路由加 `requiredFeature`
- `features/competency/competency.routes.ts` — 子路由加 `requiredFeature`
- `features/training/training.routes.ts` — 子路由加 `requiredFeature`
- `features/project/project.routes.ts` — 子路由加 `requiredFeature`
- `features/performance/performance.routes.ts` — 子路由加 `requiredFeature`
- `features/culture/culture.routes.ts` — 子路由加 `requiredFeature`
- `features/tenant-admin/tenant-admin.routes.ts` — 子路由加 `requiredFeature`

### Decision 5：唯讀模式實作方式 — FeatureGateService 注入 + 條件渲染

**選擇**：各頁面元件注入 `FeatureGateService`，用 `canEdit(featureId)` 控制操作按鈕的顯示。使用 `@if` 條件渲染隱藏按鈕。

**替代方案**：
- 自訂 directive `*hasEditPerm="'L1.jobs'"` → 多一層抽象，維護成本增加
- 全域 CSS class → 無法精確控制

**理由**：直接在元件內用 `@if (canEdit)` 最直觀，且與現有 Angular control flow 一致。

**檔案影響**：L1/L2 各頁面元件 .ts + .html（僅需在操作按鈕加 `@if` 條件）

### Decision 6：後端 Scope 過濾共用函式 — buildScopeFilter

**選擇**：在 `server/src/middleware/permission.js` 新增 `buildScopeFilter(req, featureId, options)` 函式。

```javascript
function buildScopeFilter(req, featureId, { tableAlias = '', employeeIdColumn = 'employee_id', createdByColumn = null } = {}) {
  const perm = getFeaturePerm(req, featureId);
  const prefix = tableAlias ? `${tableAlias}.` : '';

  if (!perm || perm.action_level === 'none') return { clause: '1=0', params: [] };
  if (perm.view_scope === 'company') return { clause: '1=1', params: [] };

  if (perm.view_scope === 'self') {
    const col = createdByColumn || `${prefix}${employeeIdColumn}`;
    return { clause: `${col} = ?`, params: [req.user.employeeId] };
  }

  if (perm.view_scope === 'department') {
    // 查詢使用者所屬部門及子部門的 org_unit_id 列表
    const deptIds = getUserDepartmentIds(req);
    const placeholders = deptIds.map(() => '?').join(',');
    return { clause: `${prefix}org_unit_id IN (${placeholders})`, params: deptIds };
  }

  return { clause: '1=1', params: [] };
}
```

**理由**：各路由只需一行呼叫即可套用範圍過濾，避免重複邏輯。

**前提**：`req.user` 須包含 `employeeId` 和 `departmentId`。需在 auth middleware 中查詢並注入。

**檔案影響**：
- `server/src/middleware/permission.js` — 新增 `buildScopeFilter()` + `checkEditScope()` + `getUserDepartmentIds()`
- `server/src/middleware/auth.js` — login token 或 middleware 注入 `req.user.employeeId` / `req.user.departmentId`

### Decision 7：Auth Middleware 擴展 — 注入 employeeId 與 departmentId

**選擇**：在 `authMiddleware` 驗證 JWT 後，查詢 tenant DB 取得 user 對應的 employee_id 和 department_id，注入到 `req.user`。

```javascript
// auth middleware 中 JWT 驗證後追加
const userRecord = req.tenantDB.queryOne(
  'SELECT u.employee_id, e.department_id FROM users u LEFT JOIN employees e ON e.id = u.employee_id WHERE u.id = ?',
  [decoded.sub]
);
req.user.employeeId = userRecord?.employee_id || null;
req.user.departmentId = userRecord?.department_id || null;
```

**替代方案**：在 buildScopeFilter 內部查詢 → 每次呼叫都查一次，效能差

**理由**：一次查詢，整個 request lifecycle 都可用。

**檔案影響**：
- `server/src/middleware/auth.js` — JWT 驗證後追加查詢
- `server/src/middleware/tenant.js` — 確認 tenantDB 在 auth 後可用

### Decision 8：L1/L2 路由掛載 requireFeaturePerm 的範圍

**Phase 1（本次）**：僅掛載 L1 和 L2 模組的路由，因為這兩個模組的頁面已開發完成。
**Phase 2（未來）**：L3-L6 頁面開發時逐步掛載。

L1 路由掛載對照：

| 路由檔案 | 端點群組 | Feature ID |
|---------|---------|-----------|
| `routes/employee.js` | `/api/employee/*` | `L1.profile` |
| `routes/recruitment.js` | `/api/recruitment/*` | `L1.recruitment` |
| `routes/jobs.js` | `/api/jobs/*` | `L1.jobs` |
| `routes/meetings.js` | `/api/meetings/*` | `L1.meeting` |
| `routes/talent-pool.js` | `/api/talent-pool/*` | `L1.talent-pool` |
| `routes/onboarding.js` | `/api/onboarding/*` | `L1.onboarding` |

L2 路由掛載對照：

| 路由檔案 | 端點群組 | Feature ID |
|---------|---------|-----------|
| `routes/grade-matrix.js` | `/api/grade-matrix/*` | `L2.grade-matrix` |
| `routes/competency.js` | `/api/competency-mgmt/*` | `L2.framework` |

**檔案影響**：上述 8 個路由檔案

## Risks / Trade-offs

**[Risk] employeeId 未關聯** → 部分 user 可能沒有對應的 employee record（如系統管理員）。
→ Mitigation：`buildScopeFilter` 對 `employeeId = null` 的情況，self scope 回傳空結果或降級為 company scope（取決於角色，super_admin 預設 company）。

**[Risk] 子部門層級查詢效能** → `getUserDepartmentIds` 需遞迴查詢 org_units 的子部門。
→ Mitigation：org_units 表資料量小（通常 < 100 筆），遞迴查詢在 SQLite 中可接受。可用 WITH RECURSIVE CTE。

**[Risk] 前端權限快取可能過期** → 管理員修改角色權限後，已登入使用者的權限不會立即更新。
→ Mitigation：下次 token refresh 時自動更新。15 分鐘 access token 有效期內可能存在延遲，這對大多數場景可接受。

**[Risk] 既有 API 呼叫可能因權限不足而失敗** → 頁面已載入但 API 回傳 403。
→ Mitigation：路由守衛在頁面載入前已攔截，正常流程不會到達 API 層。僅防禦直接 API 呼叫。

## Open Questions

- Q1：`self` scope 的「自己」定義 — 若 user 沒有關聯的 employee，是否視為無權限？建議：super_admin/subsidiary_admin 自動升級為 company scope。
- Q2：department scope 是否包含子部門？建議：包含（遞迴查詢所有 descendant departments）。
