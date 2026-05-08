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

The system SHALL create 6 default roles (super_admin, subsidiary_admin, hr_manager, dept_manager, employee, **interviewer**) during tenant database initialization. Each default role SHALL have both legacy `role_permissions` entries AND `role_feature_perms` entries pre-configured. For the existing 5 roles, all new columns (`can_approve`, `approve_scope`, `row_filter_key`) SHALL default to `0`/`NULL`/`NULL` (fail-safe: HR must opt in to approve and row-level filtering). The `interviewer` role SHALL be seeded with `L1.recruitment` granted at action_level='edit' with `row_filter_key='interview_assigned'` (the recruitment feature_id covers candidates, invitations, interviews, AND evaluations endpoints — confirmed via preflight against `recruitment.js`), all other features (including `L1.decision`) set to `action_level='none'`.

#### Scenario: 預設角色自動建立

- **WHEN** a new tenant database is initialized
- **THEN** the `roles` table SHALL contain 6 is_system=1 roles, each with corresponding entries in both `role_permissions` (legacy) and `role_feature_perms` (new model with all 5 columns: action_level, view_scope, edit_scope, can_approve, approve_scope, row_filter_key)

#### Scenario: Existing 5 roles get fail-safe defaults for new columns

- **WHEN** an existing tenant's `role_feature_perms` rows are migrated
- **THEN** every row SHALL have `can_approve=0`, `approve_scope=NULL`, `row_filter_key=NULL` regardless of the original role
- **AND** tenant admins SHALL opt in to approve permissions per-feature via the role management UI

#### Scenario: Interviewer role default seed

- **WHEN** the interviewer role is seeded
- **THEN** `role_feature_perms` for `L1.recruitment` SHALL be `(action_level='edit', view_scope='company', edit_scope='company', can_approve=0, approve_scope=NULL, row_filter_key='interview_assigned')`
- **AND** `role_feature_perms` for `L1.decision` SHALL be `(action_level='none', everything else NULL/0)`
- **AND** all other features (40+ entries including L1.jobs / L1.profile / L2.\* / L3.\* / L4.\* / L5.\* / L6.\* / SYS.\*) SHALL be `(action_level='none', everything else NULL/0)`


<!-- @trace
source: rbac-row-level-and-interview-scope
updated: 2026-05-08
code:
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).pdf
  - bombus-system/docs/測試計畫/測試計畫與驗收標準(範本).md
  - bombus-system/docs/系統優化紀錄_20260416-20260430.xlsx
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).xlsx
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
-->

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

---
### Requirement: Approve action verb independent from view/edit

The `role_feature_perms` schema SHALL support an independent approve action verb expressed via two new columns: `can_approve INTEGER NOT NULL DEFAULT 0` and `approve_scope TEXT DEFAULT NULL CHECK(approve_scope IN (NULL,'self','department','company'))`. The approve verb SHALL NOT be mutually exclusive with `action_level` (view/edit) — a single permission row MAY have any combination of view, edit, and approve enabled. Multi-role permission merging (`mergeFeaturePerms`) SHALL combine `can_approve` via logical OR (any role granting approve grants the permission) and `approve_scope` via maximum-scope rank (NULL < self < department < company).

#### Scenario: Approve column added with safe default

- **WHEN** the schema migration runs on an existing tenant database
- **THEN** all existing `role_feature_perms` rows SHALL have `can_approve=0` and `approve_scope=NULL` after migration completes, requiring no backfill

#### Scenario: Approve coexists with view and edit

- **WHEN** a role's permission for a feature has `action_level='edit'`, `edit_scope='company'`, `can_approve=1`, `approve_scope='department'`
- **THEN** the user SHALL be permitted to view, edit, AND approve, with edit scope = company and approve scope = department

#### Scenario: Multi-role approve merging

- **WHEN** a user holds two roles where role-A has `can_approve=0` and role-B has `can_approve=1` with `approve_scope='department'` for the same feature
- **THEN** the merged permission SHALL have `can_approve=1` and `approve_scope='department'`

##### Example: Approve scope rank merging

| Role A | Role B | Merged |
|---|---|---|
| `can_approve=0`, `approve_scope=NULL` | `can_approve=1`, `approve_scope='self'` | `can_approve=1`, `approve_scope='self'` |
| `can_approve=1`, `approve_scope='department'` | `can_approve=1`, `approve_scope='company'` | `can_approve=1`, `approve_scope='company'` |
| `can_approve=0`, `approve_scope=NULL` | `can_approve=0`, `approve_scope=NULL` | `can_approve=0`, `approve_scope=NULL` |


<!-- @trace
source: rbac-row-level-and-interview-scope
updated: 2026-05-08
code:
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).pdf
  - bombus-system/docs/測試計畫/測試計畫與驗收標準(範本).md
  - bombus-system/docs/系統優化紀錄_20260416-20260430.xlsx
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).xlsx
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
-->

---
### Requirement: Row-level filter key in role_feature_perms

The `role_feature_perms` schema SHALL support row-level filtering via a new column `row_filter_key TEXT DEFAULT NULL`. The value SHALL reference a key registered in the backend `ROW_FILTERS` registry. NULL SHALL mean no row-level restriction (backward-compatible with existing behavior). The system SHALL NOT accept arbitrary SQL expressions, regular expressions, or user-defined predicates from clients — only registry-registered keys SHALL be valid values. Multi-role merging of `row_filter_key` SHALL pick the **least restrictive** outcome **among rows that actually grant access** (action_level != 'none'): if any access-granting role for the same feature has `row_filter_key=NULL`, the merged result SHALL be NULL (no row restriction); otherwise the merged result SHALL retain a non-NULL key. Rows with `action_level='none'` SHALL NOT contribute to row_filter_key merging — they grant no access, so their NULL row_filter_key cannot lift restrictions imposed by other access-granting roles. (Logic for combining different non-NULL keys is undefined and SHALL be avoided by tenant admin convention — design a single key per role-feature pair.)

#### Scenario: NULL row_filter_key preserves existing behavior

- **WHEN** all existing 200+ rows in `role_feature_perms` have `row_filter_key=NULL` after schema migration
- **THEN** queries SHALL behave identically to the pre-migration system, with only `view_scope`/`edit_scope` applied

#### Scenario: Non-NULL row_filter_key triggers predicate evaluation

- **WHEN** a user's merged permission for a feature has `row_filter_key='interview_assigned'`
- **THEN** SELECT queries on the relevant table SHALL include the SQL clause produced by the registry's `interview_assigned` predicate, AND-combined with the existing scope clause

#### Scenario: Unknown row_filter_key triggers safety fallback

- **WHEN** a tenant database contains a `row_filter_key` value not registered in `ROW_FILTERS` (e.g., from a stale row)
- **THEN** the middleware SHALL log a warning AND return a `1=0` clause (deny by default), NOT silently bypass row filtering

#### Scenario: Least-restrictive merging for row_filter_key

- **WHEN** a user has two roles for the same feature: role-A with `row_filter_key='interview_assigned'` and role-B with `row_filter_key=NULL`, AND role-B has `action_level='view'` or higher (actually grants access)
- **THEN** the merged `row_filter_key` SHALL be NULL (least restrictive — role-B grants unrestricted access)

#### Scenario: action_level='none' row does NOT lift row_filter_key restriction

- **GIVEN** an interviewer has two roles for `L1.recruitment`: interviewer (action_level='edit', row_filter_key='interview_assigned') AND employee (action_level='none', row_filter_key=NULL)
- **WHEN** their permissions are merged
- **THEN** the merged result SHALL be `(action_level='edit', row_filter_key='interview_assigned')` — the employee row's NULL row_filter_key SHALL NOT lift the interviewer's row restriction, because action_level='none' grants no access and therefore cannot grant unrestricted access either


<!-- @trace
source: rbac-row-level-and-interview-scope
updated: 2026-05-08
code:
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).pdf
  - bombus-system/docs/測試計畫/測試計畫與驗收標準(範本).md
  - bombus-system/docs/系統優化紀錄_20260416-20260430.xlsx
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).xlsx
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
-->

---