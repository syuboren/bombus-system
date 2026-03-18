## MODIFIED Requirements

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

## ADDED Requirements

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
