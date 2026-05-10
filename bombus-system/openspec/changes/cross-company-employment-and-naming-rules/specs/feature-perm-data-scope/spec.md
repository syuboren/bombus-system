## MODIFIED Requirements

### Requirement: Shared scope filter utility for backend routes

The backend SHALL provide a shared utility function `buildScopeFilter(req, featureId, tableAlias)` that generates SQL WHERE clause fragments based on the user's effective `view_scope` for a given feature, AND additionally applies the `row_filter_key` predicate when present. The function SHALL:
- Query the user's merged feature permissions (using the existing `mergeFeaturePerms` logic in permission.js)
- Return `{ clause: string, params: any[] }` with the appropriate SQL filter
- For `view_scope: 'self'` — filter by `employee_id = ?` (the user's linked employee ID) or `created_by = ?`
- For `view_scope: 'department'` — when filtering employees, filter by employees who have **any active assignment** within the user's `org_unit` subtree (cross-company union semantics) OR whose `org_unit_id` is in the subtree (legacy fallback for un-migrated rows). For non-employee tables (e.g., interview_invitations), filter by the table's `org_unit_id` column against the subtree as before.
- For `view_scope: 'company'` — return an empty clause for the scope portion (no scope restriction)
- For users with no permission (`action_level: 'none'`) — return a clause that matches nothing (`1=0`)
- **NEW**: When `row_filter_key` is non-NULL, resolve the predicate via `ROW_FILTERS` registry and AND-combine its clause with the scope clause. If the registry returns `1=0` (e.g., unknown key, empty subtree), the combined clause SHALL also be `1=0` (short-circuit). If the scope portion is `1=0`, the combined clause SHALL remain `1=0` regardless of row filter result.

#### Scenario: Self scope generates employee-level filter

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'self'` and `row_filter_key: NULL` for feature `L1.profile`
- **THEN** the returned clause filters to only the user's own employee record

#### Scenario: Department scope generates union via assignments

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'department'` and `row_filter_key: NULL` for feature `L1.profile` against the `employees` table
- **THEN** the returned clause SHALL filter to employees who have any active assignment within the user's department subtree, formatted as: `employees.id IN (SELECT DISTINCT employee_id FROM employee_assignments WHERE end_date IS NULL AND org_unit_id IN (?,?,...)) OR employees.org_unit_id IN (?,?,...)`. The `OR ... org_unit_id IN ...` portion serves as a fallback for migration-edge cases where assignments may not yet be backfilled.

#### Scenario: Department scope on non-employee table unchanged

- **WHEN** `buildScopeFilter` is called for a user with `view_scope: 'department'` against the `interview_invitations` table
- **THEN** the returned clause SHALL filter by `interview_invitations.org_unit_id IN (?,?,...)` only (no assignments union — assignments table is for employees only)

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

#### Scenario: Cross-company employee visible to multiple HR managers

- **WHEN** an employee has active assignments in subsidiaries `sub-A` and `sub-B`, and HR managers `hr1` (scope: sub-A subtree) and `hr2` (scope: sub-B subtree) both query the employee list
- **THEN** both `hr1` and `hr2` SHALL see this employee in their list results (union semantics enforced via the assignments-based clause)

##### Example: Combined clause output

| view_scope | row_filter_key | Output clause |
|---|---|---|
| `company` | NULL | `''` (empty) |
| `company` | `interview_assigned` | `EXISTS (...interviewer_id=?...UNION...)` |
| `department` (employees table) | NULL | `(employees.id IN (SELECT ... assignments) OR employees.org_unit_id IN (...))` |
| `department` (other tables) | `subordinate_only` | `(<dept clause>) AND (<table>.manager_id = ?)` |
| `none` | (any) | `1=0` |
| `company` | `<unknown_key>` | `1=0` (registry safety fallback) |
