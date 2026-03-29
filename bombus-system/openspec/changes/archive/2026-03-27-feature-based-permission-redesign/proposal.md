## Why

目前的角色權限管理介面對非技術背景的使用者（如 PM、HR 主管）來說過於複雜且難以理解：

1. **中英混雜**：前端標籤映射不完整，20 種 resource 中有 6 種缺少中文翻譯（approval、audit、export 等），action 的 `reject` 也缺少映射，導致畫面中英文混雜
2. **粒度太細**：20 種 resource × 平均 4 個 action = 80+ 個 checkbox，一般管理者根本看不懂每個勾選代表什麼
3. **缺少資料範圍控制**：現有模型的 scope 綁定在「角色指派」層級（整個角色作用於全域/子公司/部門），無法滿足「同一角色，不同功能有不同資料可見範圍」的業務需求（例如：單位主管可編輯自己的員工檔案、可查看部門員工、但只能看自己相關的會議）
4. **與實際業務脫節**：使用者思考權限的方式是「HR 可以管招募、主管可以看部門」，而不是「recruitment:create, employee:read」

此變更將權限模型從「resource × action」重構為「feature × action_level × scope」三維模型，並提供直觀的管理介面。

## What Changes

### 權限模型重構
- 新增 `features` 表，取代 `permissions` 表，以業務功能（如「招募職缺管理」「員工檔案管理」「職能評估系統」）為單位，按模組（L1~L6）分組
- 新增 `role_feature_perms` 表，取代 `role_permissions` 表，每筆記錄包含：操作等級（none/view/edit）、編輯範圍（self/department/company）、查看範圍（self/department/company）
- 每角色從 ~80 筆 role_permissions 降為 ~15 筆 role_feature_perms
- 保留舊 `permissions` + `role_permissions` 表不刪除，新舊並存過渡

### 角色管理 UI 重新設計
- 以「功能清單 + 漸進式三欄」取代現有的 checkbox 矩陣
- 每個功能一行，依操作等級決定顯示幾個範圍下拉（無權限→不顯示範圍、僅查看→顯示查看範圍、可編輯→顯示編輯範圍+查看範圍）
- 按 L1/L2/L3... 模組分區，可折疊
- 查看範圍自動 >= 編輯範圍（系統自動校正）

### 權限檢查機制更新
- 後端新增 `requireFeaturePerm(featureId, requiredLevel)` 中間件（scope 由路由處理器從請求上下文自動解析，不作為中間件參數）
- 前端 `PermissionService` 新增 `hasFeaturePerm()` 方法
- 新舊兩套權限檢查並存，逐步遷移

### 標籤修復（即時修正）
- 補齊所有 resource 和 action 的中文映射（作為第一步先修，不影響後續重構）

### 預設角色遷移
- 5 個系統預設角色（super_admin、subsidiary_admin、hr_manager、dept_manager、employee）的權限自動轉換至新模型
- 遷移腳本將舊 role_permissions 映射為 role_feature_perms

## Non-goals（不在範圍內）

- 不涉及角色範本/快速建立精靈（未來可在此基礎上擴充）
- 不修改使用者管理頁面（settings/users）的角色指派流程
- 不修改組織架構頁面
- 不新增 L3~L6 模組的具體功能清單（先定義 L1、L2 的 feature，其餘模組留佔位符）

## Capabilities

### New Capabilities

- `feature-based-permissions`: 以業務功能為單位的三維權限模型（feature × action_level × scope），包含 features 表、role_feature_perms 表、權限檢查中間件、前端權限服務

### Modified Capabilities

- `rbac`: 角色定義不再直接關聯 permissions 表，改為關聯 features 表；scope 從角色層級下放到每個功能層級
- `admin-portal`: 角色管理頁面從 checkbox 矩陣改為漸進式三欄功能清單；權限檢視 Modal 從 tag 列表改為分模組的功能表格

## Impact

- 涉及模組：跨模組（權限管理影響全部 L1~L6 路由），但 UI 變更集中在 settings 路由下的角色管理頁面
- 涉及路由：`/settings/roles`（主要）、`/settings/users`（權限顯示）、`/settings/permission-visualization`（視覺化）

- **後端變更：**
  - `server/src/db/tenant-schema.js` — 新增 features、role_feature_perms 表
  - `server/src/db/tenant-db-manager.js` — 新增冪等遷移
  - `server/src/db/migrate-demo.js` — 更新 seed data
  - `server/src/routes/tenant-admin.js` — 新增 features CRUD、role-feature-perms CRUD API
  - `server/src/routes/auth.js` — 新增 `GET /api/auth/my-feature-perms`（使用者合併權限）
  - `server/src/middleware/permission.js` — 新增 requireFeaturePerm() 中間件

- **前端變更：**
  - `src/app/features/tenant-admin/pages/role-management-page/` — 重新設計角色編輯 UI
  - `src/app/features/tenant-admin/pages/permission-visualization-page/` — 適配新模型
  - `src/app/features/tenant-admin/services/tenant-admin.service.ts` — 新增 feature 相關 API
  - `src/app/features/tenant-admin/models/tenant-admin.model.ts` — 新增 Feature、RoleFeaturePerm 介面
  - `src/app/core/services/permission.service.ts` — 新增 hasFeaturePerm()

- **資料模型概述：**
  ```
  features (id, module, name, sort_order)
  role_feature_perms (role_id, feature_id, action_level, edit_scope, view_scope)
  ```
