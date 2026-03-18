## Context

Bombus 為多租戶 HR SaaS 系統，採用 Database-per-Tenant 隔離策略。每個租戶內有 org_units 樹狀結構（group → subsidiary → department）。現有的 RBAC 系統提供 feature-level 權限控制，`view_scope` 分為 self / department / company 三層，但 company scope 目前在後端 `buildScopeFilter()` 中直接回傳 `1=1`（不限制），前端也未限制子公司 dropdown 切換。

**現有架構：**

- **tenant.js middleware**：注入 `req.user.employeeId` 和 `req.user.departmentId`（來自 employees.org_unit_id）
- **permission.js `buildScopeFilter()`**：根據 `view_scope` 產生 SQL WHERE clause（company=1=1, dept=recursive CTE, self=employeeId）
- **auth.js login response**：回傳 `scope: { type, id }` 來自 user_roles，無 subsidiary_id
- **前端 OrgUnitService**：有 `lockedSubsidiaryId` computed 但僅對 `scope.type === 'subsidiary'` 生效，頁面未使用

**約束條件：**

- 不引入新的資料表或 API 端點
- 19 個前端頁面/元件需同步更新
- 必須向後相容（現有 JWT token 無 subsidiary info）
- Grade matrix 需保留集團預設查詢能力

## Goals / Non-Goals

**Goals:**

- Company scope 使用者只能看到所屬子公司/集團的資料
- 只有 super_admin 可以跨子公司瀏覽
- 集團層級員工鎖定到集團（含所有子公司資料）
- 後端 + 前端雙重保護（API 過濾 + UI 鎖定）

**Non-Goals:**

- 不新增 `subsidiary` scope 類型到 feature permission
- 不改變 grade-matrix 後端 API（不使用 buildScopeFilter）
- 不改變 super_admin 現有行為
- 不改變 department/self scope 行為（已正確實作）

## Decisions

### Decision 1：後端子公司判斷 — 從 org_unit 向上走 parent chain

在 `permission.js` 新增 `findUserSubsidiaryId(db, orgUnitId)` helper：

1. 查詢員工所屬 org_unit 的 type
2. 若 `type = 'subsidiary'` → 回傳該 ID
3. 若 `type = 'group'` → 回傳該 ID（集團員工鎖定到集團）
4. 若 `type = 'department'` → 沿 `parent_id` 向上走直到找到 subsidiary 或 group
5. 無結果 → 回傳 `null`（優雅降級）

**為何不用 recursive CTE？** 組織樹通常只有 3 層（group → subsidiary → department），簡單的 while loop 即可，避免 CTE 的複雜度。

**檔案**：`server/src/middleware/permission.js`（新增 helper + export）

### Decision 2：tenant.js 注入 subsidiaryId

在現有 `employeeId` / `departmentId` 注入邏輯之後，呼叫 `findUserSubsidiaryId()` 設定 `req.user.subsidiaryId`。

```
req.user.subsidiaryId = findUserSubsidiaryId(tenantDB, req.user.departmentId);
```

**檔案**：`server/src/middleware/tenant.js`

### Decision 3：buildScopeFilter company scope 改為子公司過濾

更新 `buildScopeFilter()` 中 `company` scope 的邏輯：

```
if (view_scope === 'company') {
  if (req.user.roles 含 'super_admin') → 回傳 1=1
  if (req.user.subsidiaryId 存在) → 用 getUserDepartmentIds() 取得該子公司下所有 org_unit_id，過濾 orgUnitColumn IN (...)
  否則 → 回傳 1=1（優雅降級）
}
```

**為何複用 `getUserDepartmentIds()`？** 該 helper 已實作 recursive CTE，從任意 org_unit_id 向下取得所有子節點。傳入 subsidiaryId 即可取得該子公司下所有部門 + 子公司本身。

同步更新 `checkEditScope()` 的 company 邏輯。

**檔案**：`server/src/middleware/permission.js`

### Decision 4：登入/刷新回應加入 subsidiary_id

在 login 和 refresh 兩個端點，查詢使用者的 employee_id → org_unit_id → 呼叫 `findUserSubsidiaryId()` → 加入回應的 user 物件。

**檔案**：`server/src/routes/auth.js`

### Decision 5：前端 OrgUnitService 集中鎖定邏輯

更新 `lockedSubsidiaryId` computed（只有 super_admin 不鎖定）：

```typescript
lockedSubsidiaryId = computed(() => {
  const user = this.authService.currentUser();
  if (!user) return null;
  if (user.roles?.includes('super_admin')) return null;
  return user.subsidiary_id || null;
});
```

新增 `visibleSubsidiaries` 和 `isSubsidiaryLocked` computed signals。

**檔案**：`src/app/core/services/org-unit.service.ts`

### Decision 6：前端頁面統一使用 visibleSubsidiaries

所有 19 個頁面/元件改為引用 `orgUnitService.visibleSubsidiaries` 取代 `orgUnitService.subsidiaries`。

TS 變更模式：
```typescript
subsidiaries = this.orgUnitService.visibleSubsidiaries;
// ngOnInit: 若 lockedSubsidiaryId() 有值則自動設定 selectedSubsidiaryId
```

HTML 變更模式：
- 鎖定時 dropdown 加上 `[disabled]="true"`
- 鎖定時隱藏「全部子公司」選項

**檔案**：`src/app/features/auth/models/auth.model.ts`（User interface），19 個頁面 TS + HTML

### Decision 7：Grade Matrix 例外處理

Grade matrix Tab A 保留「全部子公司」選項（= 集團預設），但 subsidiary 列表仍使用 `visibleSubsidiaries`（鎖定使用者只能選自己公司或集團預設）。Tab B/C 完全鎖定到使用者子公司。

**檔案**：`src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts` + `.html`

## Risks / Trade-offs

- **[行為變更]** `buildScopeFilter` company scope 從 `1=1` 變為子公司過濾，影響所有使用 `buildScopeFilter` 的 API 路由（employee, recruitment, jobs, meetings, talent-pool）→ 降低風險：super_admin 不受影響，無員工記錄的帳號優雅降級為不限制
- **[效能]** `findUserSubsidiaryId()` 在每次 API 請求時執行最多 3 次 DB 查詢（org_unit 最多 3 層）→ 可接受：org_units 表通常很小（< 100 筆），查詢快速
- **[向後相容]** 現有 JWT token 無 subsidiary_id → 前端在 token 刷新前會使用 localStorage 中的 user 物件，新登入才有 subsidiary_id。若 localStorage 中無此欄位，`lockedSubsidiaryId` 回傳 null（不鎖定），直到重新登入
- **[19 個檔案同步更新]** 大量頁面修改 → 採用統一模式降低出錯風險，集中邏輯於 OrgUnitService

## 需要複用的現有服務/元件

| 服務/元件 | 檔案 | 用途 |
|-----------|------|------|
| `OrgUnitService` | `core/services/org-unit.service.ts` | 集中子公司鎖定邏輯 |
| `AuthService` | `features/auth/services/auth.service.ts` | currentUser() signal |
| `FeatureGateService` | `core/services/feature-gate.service.ts` | viewScope 判斷（已有） |
| `getUserDepartmentIds()` | `server/src/middleware/permission.js` | Recursive CTE 共用 |
