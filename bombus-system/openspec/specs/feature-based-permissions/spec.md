# Feature-Based Permissions — 功能層級權限模型

## Purpose

定義 Bombus 的功能層級權限系統（Feature-Based Permission），包含功能定義表、角色功能權限模型、API 端點、預設角色權限種子、前端權限服務、多角色權限合併機制。

## Requirements

### Requirement: Feature definition table

The system SHALL maintain a `features` table containing business-level feature definitions. Each feature SHALL have an `id` (kebab-case text primary key), `module` (e.g., 'L1', 'L2', 'SYS'), `name` (Chinese display label), and `sort_order` (integer for UI ordering, using module_base + index: L1=100+, L2=200+, SYS=900+). Features SHALL be pre-seeded during tenant database initialization and SHALL NOT be user-creatable or user-deletable.

#### Scenario: Features pre-seeded on tenant initialization

- **WHEN** a new tenant database is initialized
- **THEN** the `features` table SHALL contain at least 16 pre-defined features covering L1, L2, and SYS modules

#### Scenario: Features pre-seeded on existing tenant migration

- **WHEN** an existing tenant database is loaded and the `features` table does not exist
- **THEN** the idempotent migration SHALL create the `features` table and insert all pre-defined features

#### Scenario: Feature list API

- **WHEN** a tenant admin calls `GET /api/tenant-admin/features`
- **THEN** the system SHALL return all features grouped by module, ordered by sort_order

---
### Requirement: Role-feature permission model

The system SHALL maintain a `role_feature_perms` table that maps each role to feature-level permissions. Each record SHALL contain: `role_id`, `feature_id`, `action_level` ('none', 'view', or 'edit'), `edit_scope` (NULL, 'self', 'department', or 'company'), and `view_scope` (NULL, 'self', 'department', or 'company'). The primary key SHALL be (role_id, feature_id).

#### Scenario: Action level none implies null scopes

- **WHEN** a role-feature permission has `action_level = 'none'`
- **THEN** both `edit_scope` and `view_scope` SHALL be NULL

#### Scenario: Action level view requires view_scope only

- **WHEN** a role-feature permission has `action_level = 'view'`
- **THEN** `edit_scope` SHALL be NULL and `view_scope` SHALL NOT be NULL

#### Scenario: Action level edit requires both scopes

- **WHEN** a role-feature permission has `action_level = 'edit'`
- **THEN** both `edit_scope` and `view_scope` SHALL NOT be NULL

#### Scenario: View scope must be greater than or equal to edit scope

- **WHEN** a role-feature permission has `action_level = 'edit'`
- **THEN** the `view_scope` hierarchy level SHALL be greater than or equal to `edit_scope` (self < department < company)

#### Scenario: Invalid scope combination rejected

- **WHEN** an API request attempts to set `edit_scope = 'company'` and `view_scope = 'self'`
- **THEN** the system SHALL return HTTP 400 with an error message explaining the scope constraint

---
### Requirement: Bulk update role feature permissions

The system SHALL provide an API to bulk-update all feature permissions for a given role in a single transaction.

#### Scenario: Bulk update replaces all feature permissions

- **WHEN** a tenant admin calls `PUT /api/tenant-admin/roles/:id/feature-perms` with a complete list of feature permissions
- **THEN** the system SHALL delete all existing `role_feature_perms` for that role and insert the new set within a single database transaction

#### Scenario: Bulk update validates all entries before applying

- **WHEN** the bulk update request contains an invalid entry (e.g., unknown feature_id or invalid scope combination)
- **THEN** the system SHALL reject the entire request with HTTP 400 and SHALL NOT modify any existing permissions

#### Scenario: System roles allow permission modification

- **WHEN** a tenant admin updates feature permissions for a system role (is_system=1)
- **THEN** the system SHALL allow the permission modification (system roles restrict name/delete changes, not permission changes)

---
### Requirement: Read role feature permissions

The system SHALL provide an API to retrieve all feature permissions for a specific role.

#### Scenario: Retrieve role feature permissions

- **WHEN** a tenant admin calls `GET /api/tenant-admin/roles/:id/feature-perms`
- **THEN** the system SHALL return all `role_feature_perms` entries for that role, joined with feature name and module information

#### Scenario: Role with no feature permissions returns empty array

- **WHEN** a role has no entries in `role_feature_perms`
- **THEN** the API SHALL return an empty array (not an error)

---
### Requirement: Default role feature permission seeding

The system SHALL seed feature permissions for the 5 default system roles during tenant database initialization.

#### Scenario: Super admin gets full edit/company on all features

- **WHEN** a new tenant database is initialized
- **THEN** the `super_admin` role SHALL have `action_level = 'edit'` with `edit_scope = 'company'` and `view_scope = 'company'` for all features

#### Scenario: Employee gets minimal permissions

- **WHEN** a new tenant database is initialized
- **THEN** the `employee` role SHALL have:
  - `action_level = 'edit'` with `edit_scope = 'self'` and `view_scope = 'self'` for `employee_profile` (employees can edit their own profile)
  - `action_level = 'view'` with `view_scope = 'self'` for personal observation features (competency_assessment, competency_gap, ai_career)
  - `action_level = 'edit'` with `edit_scope = 'self'` and `view_scope = 'company'` for `meeting`
  - `action_level = 'view'` with `view_scope = 'company'` for reference features (grade_matrix, career_path, job_description, competency_library)
  - `action_level = 'none'` for all other features (recruitment_jobs, ai_interview, talent_pool, organization, user_management, export, audit_log)

#### Scenario: HR manager gets HR-related edit permissions

- **WHEN** a new tenant database is initialized
- **THEN** the `hr_manager` role SHALL have:
  - `action_level = 'edit'` with `edit_scope = 'company'` and `view_scope = 'company'` for HR-managed features (recruitment_jobs, employee_profile, talent_pool, grade_matrix, career_path, job_description, competency_library)
  - `action_level = 'edit'` with `edit_scope = 'self'` and `view_scope = 'company'` for `meeting`
  - `action_level = 'view'` with `view_scope = 'company'` for observation features (ai_interview, ai_career, competency_assessment, competency_gap, organization, export)
  - `action_level = 'none'` for restricted features (user_management, audit_log)

---
### Requirement: Feature permission check middleware

The system SHALL provide a `requireFeaturePerm()` middleware function that checks the requesting user's feature-level permissions including data scope.

#### Scenario: User with sufficient feature permission passes

- **WHEN** a user with `edit/company` permission on `recruitment_jobs` accesses a recruitment API endpoint protected by `requireFeaturePerm('recruitment_jobs', 'edit')`
- **THEN** the middleware SHALL allow the request to proceed

#### Scenario: User without feature permission is denied

- **WHEN** a user with `none` permission on `recruitment_jobs` accesses a protected recruitment endpoint
- **THEN** the middleware SHALL return HTTP 403 Forbidden

#### Scenario: Scope check for department-level access

- **WHEN** a user with `view/department` permission on `employee_profile` requests employee data from their own department
- **THEN** the middleware SHALL allow the request
- **WHEN** the same user requests employee data from a different department
- **THEN** the middleware SHALL return HTTP 403 Forbidden

---
### Requirement: Frontend feature permission service

The frontend PermissionService SHALL provide a `hasFeaturePerm()` method that checks the current user's feature-level permissions.

#### Scenario: Feature permissions loaded after login

- **WHEN** a user successfully logs in
- **THEN** the PermissionService SHALL fetch the user's feature permissions from `GET /api/auth/my-feature-perms` and store them in a Signal

#### Scenario: UI element hidden based on feature permission

- **WHEN** a component checks `hasFeaturePerm('recruitment_jobs', 'edit')`
- **THEN** the method SHALL return true only if the user's role has edit permission on recruitment_jobs

#### Scenario: Scope-aware permission check

- **WHEN** a component checks `hasFeaturePerm('employee_profile', 'view', 'department')`
- **THEN** the method SHALL return true only if the user's view_scope for employee_profile is 'department' or 'company'

---
### Requirement: Multi-role permission merging

When a user holds multiple roles, the system SHALL merge their feature permissions by taking the highest privilege across all roles for each feature.

#### Scenario: Action level takes highest across roles

- **WHEN** a user has role A with `action_level = 'view'` and role B with `action_level = 'edit'` on the same feature
- **THEN** the merged result SHALL be `action_level = 'edit'` (edit > view > none)

#### Scenario: Scopes take widest across roles

- **WHEN** a user has role A with `edit_scope = 'self'` and `view_scope = 'department'`, and role B with `view_scope = 'company'` (action_level = 'view') on the same feature
- **THEN** the merged result SHALL be `action_level = 'edit'`, `edit_scope = 'self'`, `view_scope = 'company'`

#### Scenario: None role does not reduce permissions

- **WHEN** a user has role A with `action_level = 'none'` and role B with `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'` on the same feature
- **THEN** the merged result SHALL be `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'`

---
### Requirement: User effective feature permissions API

The system SHALL provide `GET /api/auth/my-feature-perms` to return the current user's merged feature permissions.

#### Scenario: Authenticated user retrieves merged permissions

- **WHEN** an authenticated user calls `GET /api/auth/my-feature-perms`
- **THEN** the system SHALL return the user's feature permissions merged across all assigned roles (per the multi-role merging rules), including feature_id, module, name, action_level, edit_scope, and view_scope for each feature

#### Scenario: User with no roles returns empty permissions

- **WHEN** an authenticated user with no assigned roles calls `GET /api/auth/my-feature-perms`
- **THEN** the system SHALL return an empty `featurePerms` array

#### Scenario: Endpoint requires tenant context

- **WHEN** a request to `GET /api/auth/my-feature-perms` does not include valid tenant context
- **THEN** the system SHALL return HTTP 401 or 403 (this endpoint requires both authMiddleware and tenantMiddleware)

---
### Requirement: Feature IDs match sidebar identifiers

The features table in each tenant database SHALL use the same identifier format as the sidebar component's `featureId` property (e.g., `L1.jobs`, `L2.grade-matrix`, `SYS.org-structure`). The features table SHALL contain one entry for every sidebar menu item that has a `featureId` defined. Feature names in the features table SHALL exactly match the sidebar menu item labels.

#### Scenario: Feature ID format consistency

- **WHEN** a tenant database is initialized or migrated
- **THEN** the `features` table SHALL contain entries with IDs in the `L#.xxx` format matching `sidebar.component.ts` featureIds

#### Scenario: Feature name matches sidebar label

- **WHEN** an administrator views the feature permission management page
- **THEN** each feature name displayed SHALL exactly match the corresponding sidebar menu item label (e.g., "員工檔案與歷程管理" not "員工檔案管理")

#### Scenario: All sidebar features are represented

- **WHEN** a tenant has all modules enabled (L1 through L6)
- **THEN** the features table SHALL contain entries for all sidebar menu items plus SYS system management features, totaling approximately 40 features

---
### Requirement: Existing tenant data migration

The system SHALL migrate existing tenant databases from the old feature ID format (`recruitment_jobs`) to the new format (`L1.jobs`) without data loss. The migration SHALL rename feature IDs in both the `features` table and the `role_feature_perms` table. Features that have no sidebar counterpart (`career_path`, `ai_career`) SHALL be removed along with their associated permission records.

#### Scenario: Successful ID migration for existing tenant

- **WHEN** an existing tenant database with old-format feature IDs is loaded
- **THEN** the system SHALL rename all feature IDs in `role_feature_perms` first, then in `features`, preserving all user-configured permission levels and scopes

#### Scenario: Removed features are cleaned up

- **WHEN** an existing tenant database contains features `career_path` or `ai_career`
- **THEN** the system SHALL delete these features and their associated `role_feature_perms` entries

#### Scenario: Migration is idempotent

- **WHEN** the migration runs on a tenant database that has already been migrated
- **THEN** the system SHALL produce no errors and no data changes (UPDATE affects 0 rows for already-renamed IDs)

---
### Requirement: API filters features by tenant subscription plan

The `GET /api/tenant-admin/features` endpoint SHALL return only features belonging to modules enabled in the tenant's subscription plan. The `GET /api/tenant-admin/roles/:id/feature-perms` endpoint SHALL likewise filter results by the tenant's enabled modules. SYS module features SHALL always be returned regardless of the subscription plan.

#### Scenario: Tenant with L1 and L2 modules only

- **WHEN** a tenant's subscription plan enables modules `["L1", "L2"]`
- **AND** the `GET /api/tenant-admin/features` endpoint is called
- **THEN** the response SHALL contain only features with module `L1`, `L2`, or `SYS`
- **AND** SHALL NOT contain features with module `L3`, `L4`, `L5`, or `L6`

#### Scenario: Tenant with all modules enabled

- **WHEN** a tenant's subscription plan enables modules `["L1", "L2", "L3", "L4", "L5", "L6"]`
- **AND** the `GET /api/tenant-admin/features` endpoint is called
- **THEN** the response SHALL contain features for all modules including SYS

#### Scenario: Graceful degradation when no plan is assigned

- **WHEN** a tenant has no subscription plan assigned (plan_id is NULL)
- **AND** the `GET /api/tenant-admin/features` endpoint is called
- **THEN** the response SHALL return all features without filtering (graceful degradation)

#### Scenario: Feature perms filtered for role detail

- **WHEN** a tenant's subscription plan enables only `["L1"]`
- **AND** the `GET /api/tenant-admin/roles/:id/feature-perms` endpoint is called
- **THEN** the response SHALL contain only feature permissions for L1 and SYS modules
- **AND** SHALL NOT include permission entries for disabled modules

---
### Requirement: Default role permissions for new features

When new features are added to the features table (via seed or migration), the system SHALL assign default permission levels to all five system roles (`super_admin`, `subsidiary_admin`, `hr_manager`, `dept_manager`, `employee`) using `INSERT OR IGNORE` for idempotency. Custom roles (non-system) SHALL receive `none` permissions for newly added features.

#### Scenario: Super admin gets full access to new features

- **WHEN** a new feature is added to the features table
- **THEN** the `super_admin` role SHALL receive `action_level: 'edit'`, `edit_scope: 'company'`, `view_scope: 'company'` for that feature

#### Scenario: Custom role gets no access to new features

- **WHEN** a new feature is added and a custom (non-system) role exists
- **THEN** that custom role SHALL receive `action_level: 'none'`, `edit_scope: null`, `view_scope: null` for the new feature

---
### Requirement: Frontend module type supports L3 through L6

The `FeatureModule` TypeScript type SHALL include `'L3' | 'L4' | 'L5' | 'L6'` in addition to the existing `'L1' | 'L2' | 'SYS'`. The `MODULE_LABELS` and `MODULE_ORDER` constants SHALL include entries for all six business modules plus SYS.

#### Scenario: Module labels display correctly for L3-L6

- **WHEN** a tenant with L3-L6 features enabled opens the feature permission management page
- **THEN** the module headers SHALL display localized labels: "L3 教育訓練", "L4 專案管理", "L5 績效管理", "L6 文化管理"

#### Scenario: Module ordering is consistent

- **WHEN** features from multiple modules are displayed
- **THEN** they SHALL be ordered as: L1, L2, L3, L4, L5, L6, SYS

---
### Requirement: L1.decision feature definition

The `features` table seed data SHALL include `L1.decision` feature (module `L1`, name `面試決策`, sort_order `101.5` or inserted between 101 and 102). This feature SHALL be seeded on new tenant initialization and added via idempotent migration on existing tenants.

#### Scenario: L1.decision present in new tenant

- **WHEN** a new tenant database is initialized
- **THEN** the `features` table SHALL contain a row with `id = 'L1.decision'`, `module = 'L1'`, `name = '面試決策'`

#### Scenario: L1.decision added to existing tenants

- **WHEN** an existing tenant database is loaded and `features` table lacks `L1.decision`
- **THEN** the idempotent migration SHALL insert the row without affecting other features

#### Scenario: Feature listing API returns L1.decision

- **WHEN** tenant admin calls `GET /api/tenant-admin/features`
- **THEN** the L1 module group SHALL include `L1.decision` ordered after `L1.recruitment` (101) and before `L1.talent-pool` (102)


<!-- @trace
source: split-interview-decision-pages
updated: 2026-04-19
code:
  - bombus-system/server/src/routes/recruitment.js
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.ts
  - bombus-system/src/app/features/employee/models/candidate.model.ts
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/openspec/changes/split-interview-decision-pages/tasks.md
  - bombus-system/server/src/routes/jobs.js
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.scss
  - bombus-system/docs/~$現況與問題比對分析_20260406.xlsx
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-perm-frontend-gate/spec.md
  - bombus-system/src/app/shared/components/sidebar/sidebar.component.ts
  - ARCHITECTURE.md
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.scss
  - bombus-system/src/app/features/employee/services/onboarding.service.ts
  - bombus-system/docs/備份/現況與問題比對分析_20260406拷貝.xlsx
  - bombus-system/src/app/features/employee/employee.routes.ts
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.scss
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.html
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.html
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.html
  - bombus-system/src/app/features/employee/services/interview.service.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.scss
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.html
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-based-permissions/spec.md
  - bombus-system/src/app/features/employee/services/decision.service.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/approved-salary-field/spec.md
  - bombus-system/openspec/changes/split-interview-decision-pages/proposal.md
  - bombus-system/openspec/changes/split-interview-decision-pages/.openspec.yaml
  - bombus-system/openspec/changes/split-interview-decision-pages/design.md
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/interview-decision-page/spec.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/src/app/features/employee/models/job.model.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/decision-approval-workflow/spec.md
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.ts
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.html
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/employee-onboarding-automation/spec.md
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/services/decision.service.js
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.scss
  - bombus-system/docs/現況與問題比對分析_20260406.xlsx
  - bombus-system/server/src/routes/hr-onboarding.js
tests:
  - bombus-system/server/src/tests/test-decision-approval.js
-->

---
### Requirement: L1.decision default role permissions

The default role-feature seeding SHALL assign the following permissions for `L1.decision` during tenant initialization and via idempotent migration for existing tenants:

- `super_admin`: `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'`
- `subsidiary_admin`: `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'`
- `hr_manager`: `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'`
- `dept_manager`: `action_level = 'none'`
- `employee`: `action_level = 'none'`

#### Scenario: Super admin and subsidiary admin can edit decision

- **WHEN** a new tenant is initialized
- **THEN** both `super_admin` and `subsidiary_admin` roles SHALL have edit/company/company on `L1.decision`

#### Scenario: HR manager can edit decision

- **WHEN** a new tenant is initialized
- **THEN** the `hr_manager` role SHALL have edit/company/company on `L1.decision`

#### Scenario: Dept manager and employee cannot access decision

- **WHEN** a new tenant is initialized
- **THEN** both `dept_manager` and `employee` roles SHALL have `action_level = 'none'` on `L1.decision`

#### Scenario: Existing tenants receive default permissions via migration

- **WHEN** an existing tenant database is loaded and role-feature rows for `L1.decision` are missing
- **THEN** the idempotent migration SHALL insert the default permissions for the five system roles


<!-- @trace
source: split-interview-decision-pages
updated: 2026-04-19
code:
  - bombus-system/server/src/routes/recruitment.js
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.ts
  - bombus-system/src/app/features/employee/models/candidate.model.ts
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/openspec/changes/split-interview-decision-pages/tasks.md
  - bombus-system/server/src/routes/jobs.js
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.scss
  - bombus-system/docs/~$現況與問題比對分析_20260406.xlsx
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-perm-frontend-gate/spec.md
  - bombus-system/src/app/shared/components/sidebar/sidebar.component.ts
  - ARCHITECTURE.md
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.scss
  - bombus-system/src/app/features/employee/services/onboarding.service.ts
  - bombus-system/docs/備份/現況與問題比對分析_20260406拷貝.xlsx
  - bombus-system/src/app/features/employee/employee.routes.ts
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.scss
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.html
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.html
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.html
  - bombus-system/src/app/features/employee/services/interview.service.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.scss
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.html
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-based-permissions/spec.md
  - bombus-system/src/app/features/employee/services/decision.service.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/approved-salary-field/spec.md
  - bombus-system/openspec/changes/split-interview-decision-pages/proposal.md
  - bombus-system/openspec/changes/split-interview-decision-pages/.openspec.yaml
  - bombus-system/openspec/changes/split-interview-decision-pages/design.md
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/interview-decision-page/spec.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/src/app/features/employee/models/job.model.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/decision-approval-workflow/spec.md
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.ts
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.html
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/employee-onboarding-automation/spec.md
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/services/decision.service.js
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.scss
  - bombus-system/docs/現況與問題比對分析_20260406.xlsx
  - bombus-system/server/src/routes/hr-onboarding.js
tests:
  - bombus-system/server/src/tests/test-decision-approval.js
-->

---
### Requirement: API endpoints enforce L1.decision permission

The backend middleware SHALL require `action_level = 'edit'` on `L1.decision` for write endpoints `POST /api/recruitment/candidates/:id/submit-approval`. Approval and rejection endpoints (`approve`, `reject-approval`) SHALL additionally require the caller's role to be `subsidiary_admin` or `super_admin` regardless of feature permission.

#### Scenario: HR manager submits approval successfully

- **WHEN** an `hr_manager` with edit permission on `L1.decision` calls submit-approval
- **THEN** the request SHALL proceed

#### Scenario: HR manager approval attempt rejected

- **WHEN** an `hr_manager` calls `approve` endpoint
- **THEN** the system SHALL return HTTP 403 even though the user has edit permission on `L1.decision`, because the role check requires `subsidiary_admin` or `super_admin`

#### Scenario: Dept manager blocked by feature permission

- **WHEN** a `dept_manager` with `action_level = 'none'` on `L1.decision` attempts any decision API
- **THEN** the system SHALL return HTTP 403 via the feature permission middleware

<!-- @trace
source: split-interview-decision-pages
updated: 2026-04-19
code:
  - bombus-system/server/src/routes/recruitment.js
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.ts
  - bombus-system/src/app/features/employee/models/candidate.model.ts
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/openspec/changes/split-interview-decision-pages/tasks.md
  - bombus-system/server/src/routes/jobs.js
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.scss
  - bombus-system/docs/~$現況與問題比對分析_20260406.xlsx
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-perm-frontend-gate/spec.md
  - bombus-system/src/app/shared/components/sidebar/sidebar.component.ts
  - ARCHITECTURE.md
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.scss
  - bombus-system/src/app/features/employee/services/onboarding.service.ts
  - bombus-system/docs/備份/現況與問題比對分析_20260406拷貝.xlsx
  - bombus-system/src/app/features/employee/employee.routes.ts
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.scss
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.html
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.html
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.html
  - bombus-system/src/app/features/employee/services/interview.service.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.scss
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.html
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-based-permissions/spec.md
  - bombus-system/src/app/features/employee/services/decision.service.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/approved-salary-field/spec.md
  - bombus-system/openspec/changes/split-interview-decision-pages/proposal.md
  - bombus-system/openspec/changes/split-interview-decision-pages/.openspec.yaml
  - bombus-system/openspec/changes/split-interview-decision-pages/design.md
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/interview-decision-page/spec.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/src/app/features/employee/models/job.model.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/decision-approval-workflow/spec.md
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.ts
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.html
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/employee-onboarding-automation/spec.md
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/services/decision.service.js
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.scss
  - bombus-system/docs/現況與問題比對分析_20260406.xlsx
  - bombus-system/server/src/routes/hr-onboarding.js
tests:
  - bombus-system/server/src/tests/test-decision-approval.js
-->