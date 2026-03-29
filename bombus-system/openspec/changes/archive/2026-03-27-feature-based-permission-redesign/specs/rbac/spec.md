## MODIFIED Requirements

### Requirement: 角色定義與管理
The system SHALL support creating custom roles. Each role SHALL be bound to a scope_type (global/subsidiary/department) as a descriptive classification of the role's organizational level. In addition to the existing `role_permissions` relationship, roles SHALL also be associated with `role_feature_perms` entries that define feature-level permissions with independent data scopes (self/department/company). The role's scope_type SHALL NOT constrain the per-feature scope values — a role with scope_type='department' SHALL be allowed to have features with view_scope='company'.

#### Scenario: 建立新角色
- **WHEN** a tenant admin creates a role (name, scope_type, feature_perms[])
- **THEN** the system SHALL create a record in the `roles` table and corresponding entries in `role_feature_perms` for each feature permission

#### Scenario: 不可修改系統預設角色名稱
- **WHEN** an attempt is made to modify the name of a role with is_system=1
- **THEN** the system SHALL return HTTP 400 (permissions of system roles can be modified, but name and deletion are restricted)

#### Scenario: 刪除自訂角色
- **WHEN** a tenant admin deletes a role with is_system=0
- **THEN** the system SHALL delete the role and all associated `role_permissions`, `role_feature_perms`, and `user_roles` records (CASCADE)

---

### Requirement: 權限定義
The system SHALL use `resource:action` format for legacy permissions AND a feature-based model (`features` + `role_feature_perms`) for the new permission system. Both models SHALL coexist. The legacy `permissions` and `role_permissions` tables SHALL be preserved for backward compatibility with existing API middleware.

#### Scenario: 預載權限清單
- **WHEN** a tenant database is initialized
- **THEN** the `permissions` table SHALL contain all legacy resource:action combinations, AND the `features` table SHALL contain all pre-defined business features with corresponding `role_feature_perms` for the 5 default roles

#### Scenario: 查詢可用權限
- **WHEN** a tenant admin queries the permission list
- **THEN** the system SHALL return both legacy permissions (grouped by resource) via `GET /api/tenant-admin/permissions` AND feature definitions (grouped by module) via `GET /api/tenant-admin/features`

---

### Requirement: 預設角色初始化
The system SHALL create 5 default roles (super_admin, subsidiary_admin, hr_manager, dept_manager, employee) during tenant database initialization. Each default role SHALL have both legacy `role_permissions` entries AND `role_feature_perms` entries pre-configured.

#### Scenario: 預設角色自動建立
- **WHEN** a new tenant database is initialized
- **THEN** the `roles` table SHALL contain 5 is_system=1 roles, each with corresponding entries in both `role_permissions` (legacy) and `role_feature_perms` (new model)

---

### Requirement: 前端權限感知
The frontend SHALL provide PermissionService (Signal-based) that parses user permissions from the token after login and caches them. In addition to the existing `hasPermission()` method, the service SHALL provide a `hasFeaturePerm()` method for feature-level permission checks with scope awareness. Components SHALL use either method depending on whether they have been migrated to the new model.

#### Scenario: 隱藏無權限的功能按鈕
- **WHEN** a user does not have the `employee:delete` permission (legacy) or the equivalent feature permission
- **THEN** the "Delete" button on the employee management page SHALL NOT be displayed

#### Scenario: Route Guard 攔截無權限路由
- **WHEN** a user does not have permission to access the /settings page
- **THEN** PermissionGuard SHALL intercept and redirect to the homepage or display an access denied message

#### Scenario: Feature permission check in components
- **WHEN** a component uses `hasFeaturePerm('recruitment_jobs', 'edit')`
- **THEN** the result SHALL reflect the user's `role_feature_perms` for the recruitment_jobs feature
