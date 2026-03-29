## ADDED Requirements

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
