## ADDED Requirements

### Requirement: Named predicate registry for row-level filtering

The backend SHALL provide a `ROW_FILTERS` registry in `server/src/middleware/permission.js` that maps `row_filter_key` string values to predicate functions. Each predicate SHALL accept `(req, tableAlias)` and return `{ clause: string, params: any[] }`. The registry SHALL be the only mechanism by which `row_filter_key` values are interpreted — no other component SHALL evaluate `row_filter_key`. The registry SHALL include at minimum the following predicates at delivery: `interview_assigned`, `subordinate_only`, `self_only`, `org_unit_scope`. New predicates MAY be added in future changes by registering additional functions.

#### Scenario: Registry resolves known key

- **WHEN** `ROW_FILTERS['interview_assigned']` is invoked with `(req, 'c')`
- **THEN** the function SHALL return `{ clause, params }` where the clause is parameterized SQL referencing table alias `c` and params is an array matching the placeholders

#### Scenario: Registry rejects unknown key

- **WHEN** the middleware encounters a `row_filter_key` value not in the registry
- **THEN** the middleware SHALL log a warning containing the unknown key AND return `{ clause: '1=0', params: [] }` (deny by default)

#### Scenario: Registry never accepts client input as key

- **WHEN** any HTTP endpoint receives a `row_filter_key` value from the client request body or query string
- **THEN** the endpoint SHALL ignore that input — `row_filter_key` SHALL be sourced exclusively from `role_feature_perms` rows in the tenant database

##### Example: Initial registry contents

| Key | Predicate logic | Required indexes |
|---|---|---|
| `interview_assigned` | `EXISTS (interview_invitations WHERE interviewer_id=? AND candidate_id=<candidateTableAlias>.<candidateIdColumn> AND status NOT IN ('Cancelled')) UNION EXISTS (interviews WHERE interviewer_id=? AND candidate_id=<candidateTableAlias>.<candidateIdColumn>)` | `idx_invitations_interviewer`, `idx_interviews_interviewer_at` |
| `subordinate_only` | `<table>.manager_id = ?` | `idx_employees_manager` (add if missing) |
| `self_only` | `<table>.user_id = ?` | existing PK |
| `org_unit_scope` | `<table>.org_unit_id IN (<subtree_ids>)` | `idx_<table>_org_unit_id` |

---

### Requirement: requireApprovePerm middleware for approve actions

The backend SHALL provide a `requireApprovePerm(featureId)` middleware in `server/src/middleware/permission.js` analogous to the existing `requireFeaturePerm`. The middleware SHALL deny the request with HTTP 403 if the user's merged permissions for the feature do not include `can_approve=1`. The middleware SHALL also expose `req.user.approveScope` for downstream handlers to apply scope-based filtering on approve targets.

#### Scenario: User without can_approve is denied

- **WHEN** a user calls an endpoint protected by `requireApprovePerm('recruitment.decisions')` AND their merged `can_approve` for that feature is 0
- **THEN** the middleware SHALL return HTTP 403 with error message indicating approve permission is required

#### Scenario: User with can_approve passes through

- **WHEN** a user calls an endpoint protected by `requireApprovePerm('recruitment.decisions')` AND their merged `can_approve` for that feature is 1
- **THEN** the middleware SHALL allow the request to continue AND set `req.user.approveScope` to the merged `approve_scope` value

#### Scenario: Approve scope is exposed to handler

- **WHEN** a user with `can_approve=1` and `approve_scope='department'` passes through `requireApprovePerm`
- **THEN** the route handler SHALL be able to read `req.user.approveScope === 'department'` AND apply additional scope filtering on approve targets accordingly

---

## MODIFIED Requirements

### Requirement: Shared scope filter utility for backend routes

The backend SHALL provide a shared utility function `buildScopeFilter(req, featureId, tableAlias)` that generates SQL WHERE clause fragments based on the user's effective `view_scope` for a given feature, AND additionally applies the `row_filter_key` predicate when present. The function SHALL:
- Query the user's merged feature permissions (using the existing `mergeFeaturePerms` logic in permission.js)
- Return `{ clause: string, params: any[] }` with the appropriate SQL filter
- For `view_scope: 'self'` — filter by `employee_id = ?` (the user's linked employee ID) or `created_by = ?`
- For `view_scope: 'department'` — filter by the user's department org_unit_id (including child departments)
- For `view_scope: 'company'` — return an empty clause for the scope portion (no scope restriction)
- For users with no permission (`action_level: 'none'`) — return a clause that matches nothing (`1=0`)
- **NEW**: When `row_filter_key` is non-NULL, resolve the predicate via `ROW_FILTERS` registry and AND-combine its clause with the scope clause. If the registry returns `1=0` (e.g., unknown key, empty subtree), the combined clause SHALL also be `1=0` (short-circuit). If the scope portion is `1=0`, the combined clause SHALL remain `1=0` regardless of row filter result.

#### Scenario: Self scope generates employee-level filter

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'self'` and `row_filter_key: NULL` for feature `L1.profile`
- **THEN** the returned clause filters to only the user's own employee record

#### Scenario: Department scope generates department-level filter

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'department'` and `row_filter_key: NULL` for feature `L1.profile`
- **THEN** the returned clause filters to employees in the user's department (and child departments)

#### Scenario: Company scope generates no filter

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'company'` and `row_filter_key: NULL` for feature `L1.profile`
- **THEN** the returned clause is empty (all records visible)

#### Scenario: No permission generates empty result filter

- **WHEN** `buildScopeFilter` is called for a user with `action_level: 'none'` for a feature
- **THEN** the returned clause is `1=0` which matches no records

#### Scenario: Row filter combines with company scope

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'company'` AND `row_filter_key: 'interview_assigned'` for feature `L1.recruitment`
- **THEN** the returned clause SHALL be the row filter predicate alone (the company scope contributes no clause)
- **AND** params SHALL contain the predicate's parameters

#### Scenario: Row filter combines with department scope via AND

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'department'` AND `row_filter_key: 'subordinate_only'` for feature `L5.performance`
- **THEN** the returned clause SHALL be `(<department clause>) AND (<subordinate_only clause>)`
- **AND** params SHALL contain both clauses' parameters in order

#### Scenario: Row filter short-circuit when scope is 1=0

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'company'` but resolution produces a scope clause of `1=0` (e.g., empty subsidiary scope) AND `row_filter_key='interview_assigned'`
- **THEN** the returned clause SHALL be `1=0` and the row filter predicate SHALL NOT be evaluated unnecessarily

##### Example: Combined clause output

| view_scope | row_filter_key | Output clause |
|---|---|---|
| `company` | NULL | `''` (empty) |
| `company` | `interview_assigned` | `EXISTS (...interviewer_id=?...UNION...)` |
| `department` | `subordinate_only` | `(<dept clause>) AND (<table>.manager_id = ?)` |
| `none` | (any) | `1=0` |
| `company` | `<unknown_key>` | `1=0` (registry safety fallback) |
