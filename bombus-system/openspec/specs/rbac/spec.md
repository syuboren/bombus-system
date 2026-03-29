# RBAC — 角色與權限控制

## Purpose

定義 Bombus 多租戶架構的 Role-Based Access Control（RBAC）系統，包含多層級組織架構、角色定義、權限管理、作用範圍繼承，以及前端的權限感知機制。

## Requirements

### Requirement: 多層級組織架構
系統 SHALL 支援集團（group）→ 子公司（subsidiary）→ 部門（department）三層組織架構。org_units 表 SHALL 以 parent_id 形成樹狀結構。現有 onboarding.db 的 `departments` 表資料（7 個部門）SHALL 作為 demo 租戶的預設部門。

#### Scenario: 建立組織架構
- **WHEN** 租戶管理員建立組織單位（name、type、parent_id）
- **THEN** 系統在 org_units 表新增記錄，自動計算 level 值（group=0, subsidiary=1, department=2）

#### Scenario: 部門必須屬於子公司
- **WHEN** 建立 type=department 的組織單位
- **THEN** parent_id MUST 指向一個 type=subsidiary 的組織單位，否則回傳 400 錯誤

#### Scenario: 查詢組織架構樹
- **WHEN** 使用者查詢組織架構
- **THEN** 系統回傳完整的樹狀結構（JSON），包含各層級的組織單位

#### Scenario: demo 租戶預載現有部門
- **WHEN** demo 租戶資料庫初始化
- **THEN** org_units 表 SHALL 包含從現有 onboarding.db `departments` 表遷入的 7 個部門（執行長辦公室、行政部、財務部、專案部、人資部、業務部、工程部），以及一個預設的集團根節點

---
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
### Requirement: 使用者角色指派（Scoped Roles）
The system SHALL support assigning roles to users with a bound scope (org_unit_id). In addition to manual assignment via the tenant admin interface, the system SHALL support automatic role assignment during candidate-to-employee conversion.

#### Scenario: 指派集團級角色
- **WHEN** a role with scope_type=global is assigned to a user
- **THEN** user_roles org_unit_id is set to the group root node ID, and the user can access all subsidiaries and departments

#### Scenario: 指派子公司級角色
- **WHEN** a role with scope_type=subsidiary is assigned to a user, bound to a subsidiary
- **THEN** user_roles org_unit_id is set to that subsidiary ID, and the user can only access that subsidiary and its departments

#### Scenario: 指派部門級角色
- **WHEN** a role with scope_type=department is assigned to a user, bound to a department
- **THEN** user_roles org_unit_id is set to that department ID, and the user can only access that department

#### Scenario: 同一使用者可擁有多個角色
- **WHEN** a user is assigned multiple roles (e.g., manager in dept A, employee in dept B)
- **THEN** the system SHALL merge all role permissions, taking the union

#### Scenario: Automatic employee role assignment during conversion
- **WHEN** a candidate is converted to an employee and a new user account is created
- **THEN** the system SHALL automatically assign the `employee` system role (is_system=1) to the new user, with org_unit_id set to the employee's assigned organizational unit (or NULL if no org unit is provided)

---
### Requirement: 權限繼承
系統 SHALL 實作範圍繼承：global 角色自動涵蓋所有 subsidiary 和 department；subsidiary 角色自動涵蓋該子公司下所有 department。

#### Scenario: global 角色存取部門資料
- **WHEN** 擁有 global 角色且具備 employee:read 權限的使用者，請求某部門的員工列表
- **THEN** 系統允許存取（global 範圍自動涵蓋所有層級）

#### Scenario: subsidiary 角色存取下屬部門
- **WHEN** 擁有子公司 A 的 subsidiary 角色使用者，請求子公司 A 下某部門的資料
- **THEN** 系統允許存取

#### Scenario: subsidiary 角色不可跨公司存取
- **WHEN** 擁有子公司 A 的 subsidiary 角色使用者，請求子公司 B 的資料
- **THEN** 系統回傳 403 Forbidden

---
### Requirement: Permission Middleware 檢查存取權限
系統 SHALL 提供 Permission Middleware，根據路由所需權限與使用者角色/範圍進行存取控制。

#### Scenario: 有權限的請求通過
- **WHEN** 使用者的角色包含路由所需的 resource:action 權限，且作用範圍涵蓋請求的資料
- **THEN** 中介層允許請求繼續

#### Scenario: 無權限的請求被拒
- **WHEN** 使用者缺少路由所需的權限
- **THEN** 中介層回傳 403 Forbidden

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

---
### Requirement: 權限範圍可視化
前端 SHALL 提供權限可視化介面，以樹狀圖呈現組織架構與各角色的權限範圍，讓管理員直觀理解「誰可以看到什麼」。

#### Scenario: 顯示組織架構權限樹
- **WHEN** 租戶管理員開啟權限可視化頁面
- **THEN** 系統以樹狀圖顯示集團→子公司→部門結構，每個節點標註生效的角色與權限

#### Scenario: 查看特定使用者的有效權限
- **WHEN** 管理員選擇某位使用者
- **THEN** 系統高亮顯示該使用者所有角色的作用範圍，並列出合併後的有效權限清單

---
### Requirement: 既有組織管理模組整合
The system SHALL integrate the existing organization management module with real API data. The `employees` table SHALL include an `org_unit_id` column as a foreign key referencing `org_units(id)` to link employees to the organizational structure.

#### Scenario: 集團組織圖使用真實資料
- **WHEN** a user opens the group organization chart page (`/organization/group-structure`)
- **THEN** OrganizationService fetches data from `/api/organization/companies` (replacing mockCompanies), with Company data sourced from org_units(type=group/subsidiary)

#### Scenario: 部門結構管理使用真實資料
- **WHEN** a user opens the department structure management page (`/organization/department-structure`)
- **THEN** OrganizationService fetches department data from `/api/organization/departments` (replacing mockDepartments), sourced from org_units(type=department) and the existing departments table

#### Scenario: 員工管理使用真實資料
- **WHEN** a user opens the employee management page (`/organization/employee-management`)
- **THEN** OrganizationService fetches employee data from `/api/employee` (replacing mockEmployees), with multi-dimensional filtering and pagination

#### Scenario: CRUD 操作連接真實 API
- **WHEN** a user creates/modifies/deletes companies, departments, or employees in organization management
- **THEN** OrganizationService calls the corresponding backend API, and data is persisted to the tenant database

#### Scenario: 組織管理受權限控制
- **WHEN** a user does not have organization:manage permission
- **THEN** edit functions (create/modify/delete) in org chart and department structure SHALL be hidden, showing read-only mode only

#### Scenario: 員工與使用者帳號關聯
- **WHEN** both employees and users tables exist in the system
- **THEN** the system SHALL link users to employees via the employee_id column. Employees with an `org_unit_id` SHALL have their corresponding user_roles scoped to that organizational unit.

#### Scenario: Employee org_unit_id linked to org_units
- **WHEN** an employee record has a non-null `org_unit_id`
- **THEN** the `org_unit_id` SHALL reference a valid record in the `org_units` table, establishing the employee's position in the organizational hierarchy
