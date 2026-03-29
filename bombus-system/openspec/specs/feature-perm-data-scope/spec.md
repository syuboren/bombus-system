# Feature Permission Data Scope — 功能權限資料範圍

## Purpose

定義後端功能權限的資料範圍過濾與寫入驗證機制，包含共用 scope filter 工具函式、edit scope 驗證、L1/L2 路由整合、requireFeaturePerm 中介層。

## Requirements

### Requirement: Shared scope filter utility for backend routes

The backend SHALL provide a shared utility function `buildScopeFilter(req, featureId, tableAlias)` that generates SQL WHERE clause fragments based on the user's effective `view_scope` for a given feature. The function SHALL:
- Query the user's merged feature permissions (using the existing `mergeFeaturePerms` logic in permission.js)
- Return `{ clause: string, params: any[] }` with the appropriate SQL filter
- For `view_scope: 'self'` — filter by `employee_id = ?` (the user's linked employee ID) or `created_by = ?`
- For `view_scope: 'department'` — filter by the user's department org_unit_id (including child departments)
- For `view_scope: 'company'` — return an empty clause (no restriction)
- For users with no permission (`action_level: 'none'`) — return a clause that matches nothing (`1=0`)

#### Scenario: Self scope generates employee-level filter

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'self'` for feature `L1.profile`
- **THEN** the returned clause filters to only the user's own employee record

#### Scenario: Department scope generates department-level filter

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'department'` for feature `L1.profile`
- **THEN** the returned clause filters to employees in the user's department (and child departments)

#### Scenario: Company scope generates no filter

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'company'` for feature `L1.profile`
- **THEN** the returned clause is empty (all records visible)

#### Scenario: No permission generates empty result filter

- **WHEN** `buildScopeFilter` is called for a user with `action_level: 'none'` for a feature
- **THEN** the returned clause is `1=0` which matches no records

---

### Requirement: Edit scope validation for write operations

For POST, PUT, and DELETE operations, the backend SHALL validate that the target record falls within the user's `edit_scope` for the relevant feature. A shared utility `checkEditScope(req, featureId, targetRecord)` SHALL verify:
- `edit_scope: 'self'` — the target record belongs to the user (employee_id match)
- `edit_scope: 'department'` — the target record belongs to the user's department
- `edit_scope: 'company'` — always allowed
- If validation fails, the API SHALL return HTTP 403 with a descriptive error message

#### Scenario: User tries to edit another user's record with self scope

- **WHEN** a user with `edit_scope: 'self'` for `L1.profile` tries to update employee ID "emp-002" (not their own)
- **THEN** the API SHALL return 403 Forbidden

#### Scenario: Department manager edits within their department

- **WHEN** a user with `edit_scope: 'department'` for `L1.profile` edits an employee in their department
- **THEN** the API SHALL allow the operation

#### Scenario: User with company edit scope edits any record

- **WHEN** a user with `edit_scope: 'company'` for `L1.profile` edits any employee record
- **THEN** the API SHALL allow the operation

---

### Requirement: L1 employee routes enforce data scope

The following L1 API endpoints SHALL use `buildScopeFilter` and `checkEditScope` with the `requireFeaturePerm` middleware:

| Endpoint | Feature ID | Scope Filter |
|----------|-----------|--------------|
| `GET /api/employee/list` | `L1.profile` | view_scope on employee records |
| `GET /api/recruitment/candidates` | `L1.recruitment` | view_scope on candidate records |
| `GET /api/jobs/*` | `L1.jobs` | view_scope on job records |
| `GET /api/meetings/` | `L1.meeting` | view_scope on meeting records |
| `GET /api/talent-pool/*` | `L1.talent-pool` | view_scope on talent pool records |
| `GET /api/onboarding/*` | `L1.onboarding` | view_scope on onboarding records |

Write endpoints (POST/PUT/DELETE) for each resource SHALL validate `edit_scope`.

#### Scenario: Employee user views only their own profile

- **WHEN** a user with `view_scope: 'self'` for `L1.profile` calls `GET /api/employee/list`
- **THEN** the API SHALL return only the user's own employee record

#### Scenario: Department manager views department employees

- **WHEN** a user with `view_scope: 'department'` for `L1.profile` calls `GET /api/employee/list`
- **THEN** the API SHALL return employees in the user's department and child departments

#### Scenario: HR manager views all employees

- **WHEN** a user with `view_scope: 'company'` for `L1.profile` calls `GET /api/employee/list`
- **THEN** the API SHALL return all employees without scope restriction

---

### Requirement: L2 competency routes enforce data scope

The following L2 API endpoints SHALL use scope enforcement:

| Endpoint | Feature ID |
|----------|-----------|
| `GET /api/grade-matrix/*` | `L2.grade-matrix` |
| `GET /api/competency-mgmt/*` | `L2.framework` |

L2 data is typically organization-wide reference data. For `view_scope: 'self'` or `view_scope: 'department'`, the system SHALL still allow viewing the reference data (grade definitions, competency frameworks) but restrict assessment data to the user's scope.

#### Scenario: Employee views grade matrix reference data

- **WHEN** a user with `view_scope: 'self'` for `L2.grade-matrix` calls `GET /api/grade-matrix/grades`
- **THEN** the API SHALL return all grade definitions (reference data is always visible)
- **THEN** salary or assessment details SHALL be scoped to the user's own data

#### Scenario: Department manager views competency assessments

- **WHEN** a user with `view_scope: 'department'` for `L2.assessment` calls assessment-related endpoints
- **THEN** the API SHALL return assessment records for the user's department only

---

### Requirement: requireFeaturePerm middleware integration on routes

Each business route group SHALL declare its required feature ID using `requireFeaturePerm` middleware. The middleware SHALL:
1. Query the user's merged permissions for the specified feature
2. Verify `action_level` meets the minimum required level ('view' for GET, 'edit' for POST/PUT/DELETE)
3. Inject `req.featurePerm` with the merged `{ action_level, edit_scope, view_scope }`
4. Return 403 if the user lacks sufficient permission

Routes SHALL be organized so that read endpoints require `'view'` level and write endpoints require `'edit'` level.

#### Scenario: GET endpoint requires view level

- **WHEN** a user with `action_level: 'view'` for `L1.jobs` calls `GET /api/jobs/`
- **THEN** the middleware SHALL allow the request and inject `req.featurePerm`

#### Scenario: POST endpoint requires edit level

- **WHEN** a user with `action_level: 'view'` for `L1.jobs` calls `POST /api/jobs/`
- **THEN** the middleware SHALL reject the request with 403 Forbidden

#### Scenario: User with no permission is blocked

- **WHEN** a user with `action_level: 'none'` for `L1.jobs` calls `GET /api/jobs/`
- **THEN** the middleware SHALL return 403 Forbidden
