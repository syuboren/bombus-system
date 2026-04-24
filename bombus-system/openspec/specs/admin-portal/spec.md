# Admin Portal — 管理後台

## Purpose

定義 Bombus 的平台管理後台與租戶自助管理入口，包含平台管理員的租戶/方案管理介面，以及租戶管理員的組織架構、角色權限、使用者管理介面。

## Requirements

### Requirement: 平台管理後台入口
系統 SHALL 提供獨立的平台管理後台（路由 `/platform`），僅限平台管理員存取。

#### Scenario: 平台管理員存取後台
- **WHEN** 已登入的平台管理員存取 `/platform`
- **THEN** 系統顯示平台管理後台，包含租戶列表、方案管理等功能

#### Scenario: 非平台管理員被拒絕
- **WHEN** 一般租戶使用者嘗試存取 `/platform`
- **THEN** 系統攔截並導向登入頁面或顯示無權限提示

---
### Requirement: 租戶管理介面
平台管理後台 SHALL 提供租戶管理介面，包含租戶列表、新增、編輯、暫停、退租等操作。

#### Scenario: 租戶列表頁面
- **WHEN** 平台管理員進入租戶管理頁面
- **THEN** 系統以表格顯示所有租戶，包含名稱、slug、狀態、方案、建立日期，支援搜尋與狀態篩選

#### Scenario: 新增租戶表單
- **WHEN** 平台管理員點擊「新增租戶」
- **THEN** 系統顯示表單，包含：租戶名稱、slug、選擇方案、初始管理員 email/密碼

#### Scenario: 編輯租戶資訊
- **WHEN** 平台管理員點擊租戶列表中的「編輯」
- **THEN** 系統顯示編輯表單，可修改名稱、方案、狀態

#### Scenario: 軟刪除租戶
- **WHEN** 平台管理員對租戶執行退租
- **THEN** 租戶狀態設為 deleted（軟刪除），資料保留，使用者無法登入

#### Scenario: 恢復軟刪除的租戶
- **WHEN** 平台管理員對 deleted 租戶點擊「恢復」
- **THEN** 租戶狀態恢復為 active

---
### Requirement: 方案管理介面
平台管理後台 SHALL 提供訂閱方案管理介面。

#### Scenario: 方案列表
- **WHEN** 平台管理員進入方案管理頁面
- **THEN** 系統顯示所有方案，包含名稱、人數上限、子公司上限、功能限制

#### Scenario: 新增/編輯方案
- **WHEN** 平台管理員新增或編輯方案
- **THEN** 系統提供表單設定 name、max_users、max_subsidiaries、features

---
### Requirement: 租戶自助管理入口
系統 SHALL 提供租戶管理設定入口（路由 `/settings`），供租戶管理員（super_admin 或 subsidiary_admin）管理自己組織的設定。

#### Scenario: 租戶管理員存取設定
- **WHEN** 具有管理權限的使用者存取 `/settings`
- **THEN** 系統顯示租戶管理設定頁面，包含組織架構、角色權限、使用者管理

#### Scenario: 一般員工無法存取
- **WHEN** 僅有 employee 角色的使用者存取 `/settings`
- **THEN** 系統攔截並顯示無權限提示

---
### Requirement: 組織架構管理介面
租戶設定 SHALL 提供組織架構的視覺化編輯介面，與既有的組織管理模組（`features/organization/`）共用 Canvas/List 視圖模式，支援新增/編輯/刪除集團→子公司→部門的樹狀結構。

#### Scenario: 顯示組織架構樹
- **WHEN** 管理員進入組織架構管理
- **THEN** 系統以可互動的樹狀圖顯示完整組織結構（來自 org_units 表），支援展開/收縮

#### Scenario: 新增子公司
- **WHEN** 管理員在集團節點下點擊「新增子公司」
- **THEN** 系統顯示表單輸入名稱，提交後在 org_units 表新增記錄，樹狀圖即時更新

#### Scenario: 新增部門
- **WHEN** 管理員在子公司節點下點擊「新增部門」
- **THEN** 系統顯示表單輸入名稱，提交後在 org_units 表新增記錄，樹狀圖即時更新

---
### Requirement: 角色權限設定介面
The tenant settings SHALL provide a role management interface with role list, role CRUD, and a feature-based permission editor. The permission editor SHALL present features grouped by module (L1, L2, SYS) with collapsible sections. Each feature row SHALL use a progressive three-column layout: action level dropdown, edit scope dropdown (visible only when action_level = 'edit'), and view scope dropdown (visible when action_level = 'view' or 'edit'). This replaces the legacy resource × action checkbox matrix.

#### Scenario: 角色列表
- **WHEN** a tenant admin opens the role management page
- **THEN** the system SHALL display all roles as cards with role name, description, scope type, and the number of active feature permissions. System roles SHALL be marked as non-deletable.

#### Scenario: 編輯角色權限 — 漸進式三欄
- **WHEN** a tenant admin opens the role permission editor
- **THEN** the system SHALL display all features grouped by module, with each feature showing:
  - An action level dropdown (無權限 / 僅查看 / 可編輯)
  - An edit scope dropdown (自己 / 部門 / 公司) — visible only when action level is '可編輯'
  - A view scope dropdown (自己 / 部門 / 公司) — visible when action level is '僅查看' or '可編輯'

#### Scenario: 查看範圍自動校正
- **WHEN** a tenant admin sets edit_scope to 'department' and view_scope is currently 'self'
- **THEN** the system SHALL automatically upgrade view_scope to 'department' (view_scope must be >= edit_scope)

#### Scenario: 操作等級切換重設範圍
- **WHEN** a tenant admin changes action_level from 'edit' to 'view'
- **THEN** the system SHALL clear edit_scope (set to NULL) and preserve or reset view_scope
- **WHEN** a tenant admin changes action_level from 'view' to 'none'
- **THEN** the system SHALL clear both edit_scope and view_scope

#### Scenario: 模組分區可折疊
- **WHEN** a tenant admin clicks on a module section header (e.g., "L1 員工管理")
- **THEN** the section SHALL toggle between collapsed and expanded states, preserving unsaved changes

#### Scenario: 儲存角色權限
- **WHEN** a tenant admin clicks the save button after editing feature permissions
- **THEN** the system SHALL call `PUT /api/tenant-admin/roles/:id/feature-perms` with the complete permission set, and display a success notification upon completion

#### Scenario: 新增自訂角色
- **WHEN** a tenant admin creates a new role
- **THEN** the system SHALL provide a form for role name, scope_type, and the feature-based permission editor. All features SHALL default to `action_level = 'none'` (no permissions) until explicitly configured by the admin.

#### Scenario: 角色權限唯讀檢視
- **WHEN** a tenant admin views a role's permissions (read-only mode)
- **THEN** the system SHALL display the same feature-grouped layout but with all controls disabled, showing current permission values as text labels instead of dropdowns

---
### Requirement: 使用者管理介面

租戶設定 SHALL 提供精簡版使用者帳號總覽介面，顯示帳號清單（姓名、email、角色摘要、狀態、最後登入）。使用者帳號 SHALL 與既有 employees 表的員工資料關聯。帳號建立功能 SHALL 移至 HR 員工管理中心（`/organization/employee-management`），不在此頁面提供。

#### Scenario: 使用者列表

- **WHEN** 管理員進入使用者管理
- **THEN** 系統顯示所有使用者帳號清單，包含姓名、email、角色摘要（逗號分隔角色名稱）、帳號狀態、最後登入時間

#### Scenario: 快速操作 — 啟用/停用

- **WHEN** 管理員點擊帳號的啟用/停用切換
- **THEN** 系統更新帳號狀態並顯示成功通知

#### Scenario: 快速操作 — 密碼重設

- **WHEN** 管理員點擊「重設密碼」按鈕
- **THEN** 系統顯示確認對話框，確認後產生新隨機密碼、顯示在 Modal 中、設定 `must_change_password = 1`

#### Scenario: 導向 HR 管理中心

- **WHEN** 管理員點擊帳號列的「管理」連結
- **THEN** 系統導向 `/organization/employee-management?userId={userId}`，在 HR 管理中心開啟該員工的詳情 Modal 並切換至「帳號與權限」Tab

#### Scenario: 無新增使用者功能

- **WHEN** 管理員檢視使用者管理頁面
- **THEN** 頁面 SHALL NOT 顯示「新增使用者」按鈕或使用者建立表單。頁面標題或說明文字 SHALL 指示新帳號透過「組織管理 > 員工管理」建立


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: 標籤完整中文化
All resource names, action names, feature names, and scope labels displayed in the role management and permission visualization interfaces SHALL use Chinese labels. No English fallback SHALL be visible in the UI.

#### Scenario: 所有功能標籤顯示中文
- **WHEN** the role management page displays feature names
- **THEN** every feature SHALL show its Chinese `name` from the features table (e.g., "招募職缺管理", "員工檔案管理")

#### Scenario: 所有操作等級標籤顯示中文
- **WHEN** the UI displays action level options
- **THEN** the options SHALL be labeled "無權限", "僅查看", "可編輯" (not "none", "view", "edit")

#### Scenario: 所有範圍標籤顯示中文
- **WHEN** the UI displays scope options
- **THEN** the options SHALL be labeled "自己", "部門", "公司" (not "self", "department", "company")

#### Scenario: 舊版權限標籤也顯示中文
- **WHEN** the legacy permission view displays resource or action labels
- **THEN** all labels SHALL use Chinese mappings with no English fallback

---
### Requirement: 權限可視化頁面適配
The permission visualization page SHALL support displaying feature-based permissions in addition to or instead of legacy permissions.

#### Scenario: 使用者有效權限顯示 feature 模型
- **WHEN** a tenant admin selects a user on the permission visualization page
- **THEN** the system SHALL display the user's effective feature permissions grouped by module, showing action level and scope for each feature