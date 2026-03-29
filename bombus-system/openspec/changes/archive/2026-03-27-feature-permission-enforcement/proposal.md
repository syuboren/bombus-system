## Why

目前角色管理頁面雖可設定每個功能的 action_level（none/view/edit）與資料範圍（self/department/company），但這些設定**完全沒有被強制執行**。一般員工登入後仍可看到所有側邊欄項目、存取所有頁面、查看所有資料。這使得權限管理形同虛設，對於企業客戶而言是不可接受的安全漏洞。

此變更的目標：讓功能權限設定**真正生效** — 從側邊欄顯示、頁面存取到 API 資料過濾，三個層級全面強制執行。

影響模組：L1-L6 全部模組 + SYS 系統管理，對應所有路由前綴（/employee, /competency, /training, /project, /performance, /culture, /settings）。

## What Changes

### 前端（UI + 路由層）

- **登入時載入功能權限**：登入成功後呼叫 `GET /api/auth/feature-perms` 取得使用者合併後的 39 個功能權限，存入 AuthService Signal
- **FeatureGateService 升級**：從僅檢查模組啟用（subscription plan）→ 同時檢查使用者的 feature action_level，提供 `canView(featureId)` / `canEdit(featureId)` / `getViewScope(featureId)` 方法
- **側邊欄動態過濾**：`activeMenuSections` computed 整合 feature permission，action_level = 'none' 的項目隱藏
- **路由守衛強化**：`featureGateGuard` 從模組層級升級為功能層級（檢查具體 featureId 的 action_level）
- **唯讀模式支援**：action_level = 'view' 時，頁面的新增/編輯/刪除按鈕隱藏或禁用

### 後端（API 資料範圍過濾）

- **新增共用 helper `applyScopeFilter()`**：根據 `req.featurePerm.view_scope` 自動為 SQL 查詢附加範圍條件（self = 僅本人、department = 僅所屬部門、company = 不限）
- **L1-L6 主要 API 端點套用範圍過濾**：員工列表、招募、會議、職能評估、課程等端點依 view_scope 過濾資料
- **寫入端點檢查 edit_scope**：建立/更新/刪除操作依 edit_scope 檢查是否有權操作目標資料
- **`requireFeaturePerm()` 中介層整合**：在各路由掛載，自動注入 `req.featurePerm` 供資料過濾使用

### Non-goals（不在範圍內）

- 不修改 `role_feature_perms` 資料表結構（已完備）
- 不修改角色管理 UI（功能權限設定頁面已完成）
- 不新增 subscription plan 相關邏輯（方案過濾已完成）
- 不實作欄位層級權限（如隱藏薪資欄位）— 僅做功能+資料範圍層級
- 不實作 L3-L6 的完整業務 API 資料過濾（這些模組的頁面尚未開發，僅做路由守衛）

## Capabilities

### New Capabilities

- `feature-perm-frontend-gate`: 前端功能權限閘門 — 登入後載入合併的功能權限，側邊欄與路由守衛依 action_level 過濾，唯讀模式下隱藏操作按鈕
- `feature-perm-data-scope`: 後端資料範圍過濾 — API 端點依 view_scope/edit_scope 限制資料可見與可操作範圍

### Modified Capabilities

(none)

## Impact

- 受影響的 API 端點：
  - `GET /api/auth/feature-perms`（已存在，登入後前端需呼叫）
  - `GET /api/employee/list`、`GET /api/recruitment/candidates`、`GET /api/meetings/`（套用 view_scope）
  - `GET /api/competency-mgmt/*`、`GET /api/grade-matrix/*`（套用 view_scope）
  - `GET /api/jobs/*`、`GET /api/talent-pool/*`、`GET /api/onboarding/*`（套用 view_scope）
  - 各模組 POST/PUT/DELETE 端點（套用 edit_scope 檢查）
- 受影響的前端檔案：
  - `core/services/feature-gate.service.ts`（升級為 feature-level 檢查）
  - `core/guards/feature-gate.guard.ts`（升級為 feature-level 守衛）
  - `features/auth/services/auth.service.ts`（登入後載入 feature perms）
  - `features/auth/models/auth.model.ts`（新增 UserFeaturePerm 到 User）
  - `shared/components/sidebar/sidebar.component.ts`（整合 feature permission 過濾）
  - 各功能頁面元件（唯讀模式下隱藏操作按鈕）
- 受影響的後端檔案：
  - `server/src/middleware/permission.js`（新增 applyScopeFilter helper）
  - `server/src/routes/employee.js`、`recruitment.js`、`meetings.js`、`competency.js`、`grade-matrix.js`、`jobs.js`、`talent-pool.js`、`onboarding.js`（掛載 requireFeaturePerm + 資料過濾）

### 概略資料模型

不新增資料表。使用既有的 `role_feature_perms` 表：

```
role_feature_perms: { role_id, feature_id, action_level, edit_scope, view_scope }
```

前端新增的資料結構：
```typescript
// 登入後存入 AuthService 的功能權限 Map
Map<string, { action_level, edit_scope, view_scope }>
```
