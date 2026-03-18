## Why

目前 `view_scope = 'company'` 的使用者在所有頁面的子公司篩選 dropdown 中可以自由切換至任何子公司，後端 `buildScopeFilter()` 對 company scope 直接回傳 `1=1`（不限制），導致非 super_admin 的使用者能看到不屬於自己公司的員工、招募、職務等資料。這違反了組織資料隔離的基本原則——「每個人只能看到自己公司的內容」。

此變更確保只有 super_admin 可以跨子公司瀏覽，其餘使用者（含集團員工）皆鎖定到所屬的子公司/集團。

## What Changes

- **後端**：新增 `findUserSubsidiaryId()` 從員工的 org_unit 向上走 parent chain，判斷使用者所屬子公司或集團
- **後端**：`tenant.js` middleware 注入 `req.user.subsidiaryId`，供所有 API 路由使用
- **後端**：`buildScopeFilter()` 的 company scope 從 `1=1` 改為根據 `subsidiaryId` 過濾到該子公司下所有 org_unit
- **後端**：`checkEditScope()` 同步更新 company scope 驗證
- **後端**：登入 (`/api/auth/login`) 與 Token 刷新 (`/api/auth/refresh`) 回應加入 `subsidiary_id`
- **前端**：`User` interface 新增 `subsidiary_id` 欄位
- **前端**：`OrgUnitService` 新增 `visibleSubsidiaries`、`isSubsidiaryLocked` computed signals，更新 `lockedSubsidiaryId` 邏輯
- **前端**：19 個含子公司 dropdown 的頁面/元件統一使用 `visibleSubsidiaries` 取代 `subsidiaries`，鎖定時禁用切換
- **例外**：職等職級管理（grade-matrix）Tab A 保留「全部子公司」選項以查看集團預設薪資對照表

## Non-goals（不在範圍內）

- 不新增「subsidiary」scope 類型到 feature permission（維持現有 self/department/company 三層）
- 不變更 grade-matrix 後端 API 行為（它不使用 buildScopeFilter，保持以 query param 控制）
- 不變更 super_admin 的任何現有行為

## Capabilities

### New Capabilities

- `subsidiary-scope-lock`: 使用者子公司鎖定機制——後端 scope 過濾、前端 dropdown 限制、登入回應的 subsidiary_id 傳遞

### Modified Capabilities

（無現有 spec 需修改）

## Impact

- **影響模組**：L1 員工管理、L2 職能管理、L3 教育訓練、L4 專案管理、L5 績效管理（所有含子公司篩選器的頁面）
- **影響路由**：`/employee/*`, `/competency/*`, `/training/*`, `/project/*`, `/performance/*`
- **後端檔案**：
  - `server/src/middleware/permission.js` — findUserSubsidiaryId + buildScopeFilter + checkEditScope
  - `server/src/middleware/tenant.js` — req.user.subsidiaryId 注入
  - `server/src/routes/auth.js` — login + refresh 回應
- **前端核心檔案**：
  - `src/app/features/auth/models/auth.model.ts` — User interface
  - `src/app/core/services/org-unit.service.ts` — 集中鎖定邏輯
- **前端頁面/元件**（19 個 TS + 對應 HTML）：
  - L1: profile-page, jobs-page, meeting-page, recruitment-page, talent-pool-page, onboarding-convert-modal
  - L2: grade-matrix-page, job-description-page, assessment-page, framework-page, template-manage-page, create-jd-page, position-edit-modal
  - L3: nine-box-tab, key-talent-tab, heatmap-tab
  - L4: project-list-page
  - L5: profit-settings-page, goal-task-page
- **API 行為變更**：所有使用 `buildScopeFilter` 的 API（employee, recruitment, jobs, meetings, talent-pool）在 company scope 下將從「不限」變為「限制到使用者所屬子公司」— **BREAKING**（僅影響非 super_admin 的 company scope 使用者）
