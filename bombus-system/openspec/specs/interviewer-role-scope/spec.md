# interviewer-role-scope Specification

## Purpose

TBD - created by archiving change 'rbac-row-level-and-interview-scope'. Update Purpose after archive.

## Requirements

### Requirement: Interviewer system role with locked semantics

The system SHALL provide a sixth system-locked role `interviewer` (in addition to the existing 5: super_admin, subsidiary_admin, hr_manager, dept_manager, employee). The role SHALL be seeded into every tenant database during initialization with `is_system=1`. Tenant administrators SHALL be permitted to assign and unassign this role to users, SHALL be permitted to modify its `role_feature_perms` entries, but SHALL NOT be permitted to delete or rename it. The role's default permissions SHALL grant `edit` access to `L1.recruitment` (the existing recruitment feature_id covering candidates list, invitations, interviews, AND evaluations endpoints — all sharing the same `requireFeaturePerm('L1.recruitment')` gate per `recruitment.js:512/642/676/777/1036`) with `view_scope='company'`, `edit_scope='company'`, AND `row_filter_key='interview_assigned'`. All other features SHALL default to `action_level='none'` for this role.

#### Scenario: Interviewer role is seeded into new tenant

- **WHEN** a new tenant database is initialized via `seedTenantRBAC`
- **THEN** the `roles` table SHALL contain a record with `code='interviewer'`, `is_system=1`, `name_zh='面試官'`

#### Scenario: Interviewer role is added to existing tenants on next startup

- **WHEN** an existing tenant database without `interviewer` role is loaded
- **THEN** `tenant-db-manager.js:_runMigrations` SHALL execute `INSERT OR IGNORE INTO roles` to add the interviewer role and its default `role_feature_perms` entries

#### Scenario: Tenant admin cannot delete the interviewer role

- **WHEN** a tenant admin sends `DELETE /api/tenant-admin/roles/<id>` for the interviewer role
- **THEN** the API SHALL return HTTP 400 with an error message indicating system roles cannot be deleted

#### Scenario: Tenant admin can modify interviewer role permissions

- **WHEN** a tenant admin sends `PUT /api/tenant-admin/roles/<id>` to update `feature_perms` of the interviewer role
- **THEN** the API SHALL allow the modification and update `role_feature_perms` accordingly

##### Example: Default seed values for interviewer role

| Feature ID | action_level | view_scope | edit_scope | can_approve | row_filter_key |
|---|---|---|---|---|---|
| `L1.recruitment` | `edit` | `company` | `company` | 0 | `interview_assigned` |
| `L1.decision` | `none` | NULL | NULL | 0 | NULL |
| All other features (`L1.jobs`, `L1.profile`, `L2.*`, `L3.*`, `L4.*`, `L5.*`, `L6.*`, `SYS.*`) | `none` | NULL | NULL | 0 | NULL |


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
### Requirement: Interviewer dropdown filters by interviewer role

When HR composes interview invitations or schedules interviews, the interviewer selection dropdown SHALL display only employees who hold the `interviewer` role. The backend SHALL provide a query parameter `role=<code>` on `GET /api/employees` that returns only employees whose linked user has been assigned that role with an active account status.

#### Scenario: Backend filters employees by role code

- **WHEN** the client sends `GET /api/employees?role=interviewer`
- **THEN** the API SHALL return only employees whose linked `users` record has a `user_roles` entry pointing to a `roles` record with `code='interviewer'`, AND whose `users.status` is `'active'` or NULL

#### Scenario: Invite candidate modal shows only interviewers

- **WHEN** HR opens `invite-candidate-modal` to compose an invitation
- **THEN** the interviewer dropdown SHALL fetch employees via `?role=interviewer` and display only matching employees

#### Scenario: Schedule interview modal shows only interviewers

- **WHEN** HR opens `schedule-interview-modal` to schedule an interview
- **THEN** the interviewer dropdown SHALL fetch employees via `?role=interviewer` and display only matching employees

#### Scenario: Employees without user account are excluded

- **WHEN** an employee record exists but no `users` record is linked (no system account)
- **THEN** that employee SHALL NOT appear in the `?role=interviewer` result, even if they would conceptually be interviewers


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
### Requirement: Interviewer-assigned row filter for candidates and evaluations

The system SHALL provide a `row_filter_key='interview_assigned'` predicate registered in the middleware `ROW_FILTERS` registry. When applied to `candidates` queries, the predicate SHALL restrict results to candidates linked to interview invitations or interviews where the requesting user is the assigned `interviewer_id`, excluding cancelled invitations. When applied to `interview_evaluations` queries, the predicate SHALL restrict results to evaluations whose `candidate_id` matches a candidate the user is assigned to.

#### Scenario: Interviewer queries candidate list

- **WHEN** a user with the `interviewer` role queries `GET /api/recruitment/candidates`
- **THEN** the response SHALL contain only candidates linked via `interview_invitations` (status NOT IN 'Cancelled') or `interviews` to the requesting user's `userId` as `interviewer_id`

#### Scenario: Interviewer queries interview evaluations

- **WHEN** a user with the `interviewer` role queries `GET /api/recruitment/candidates/:id/evaluation` (the evaluation endpoint protected by `requireFeaturePerm('L1.recruitment', 'view')` at `recruitment.js:642`)
- **THEN** the response SHALL contain only evaluations whose `candidate_id` is among the user's assigned candidates

#### Scenario: Cancelled invitation excludes candidate from row filter

- **WHEN** an invitation with `interviewer_id=user-A` and `candidate_id=cand-X` has `status='Cancelled'`, AND no other invitation or interview links user-A to cand-X
- **THEN** user-A's candidate query SHALL NOT include cand-X

#### Scenario: HR with full access bypasses interviewer row filter

- **WHEN** a user with `hr_manager` role (whose `L1.recruitment` permission has `row_filter_key=NULL`) queries candidates
- **THEN** the response SHALL include all candidates without row filtering

##### Example: Row filter clause for interview_assigned

- **GIVEN** the predicate is invoked with `req.user.userId='emp-001'` and options `{candidateTableAlias: 'c', candidateIdColumn: 'id'}` (default)
- **WHEN** the registry resolves `interview_assigned`
- **THEN** the SQL clause SHALL be:
  ```sql
  EXISTS (
    SELECT 1 FROM interview_invitations ii
    WHERE ii.interviewer_id = ? AND ii.candidate_id = c.id
      AND ii.status NOT IN ('Cancelled')
    UNION
    SELECT 1 FROM interviews i
    WHERE i.interviewer_id = ? AND i.candidate_id = c.id
  )
  ```
- **AND** the params SHALL be `['emp-001', 'emp-001']`
- **AND** the same predicate invoked with options `{candidateTableAlias: 'ie', candidateIdColumn: 'candidate_id'}` SHALL produce a clause referencing `ie.candidate_id` instead, allowing reuse on the `interview_evaluations` table


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
### Requirement: Three-layer defense for interviewer scope

The interviewer access control SHALL be enforced through three independent layers. Each layer SHALL be sufficient to block unauthorized access on its own.

1. **UI defense (frontend dropdown filter)**: The interviewer dropdown in `invite-candidate-modal` and `schedule-interview-modal` SHALL be populated only with employees holding the `interviewer` role.
2. **Feature gate (middleware action_level)**: A user without the `interviewer` role (or any other role granting `L1.recruitment` permission) SHALL receive HTTP 403 from `requireFeaturePerm` middleware before any row filtering is applied.
3. **Row filter (middleware row predicate)**: A user with the `interviewer` role SHALL only see candidates assigned to them, enforced by the `interview_assigned` predicate in the SQL `WHERE` clause.

#### Scenario: User without interviewer role cannot access candidates feature

- **WHEN** a user without `interviewer` role (and no other role granting candidate access) calls `GET /api/recruitment/candidates`
- **THEN** the middleware SHALL return HTTP 403 (action_level='none') without reaching the row filter logic

#### Scenario: Interviewer with no assignments sees empty list

- **WHEN** a user with `interviewer` role but with zero invitations/interviews where they are `interviewer_id` queries candidates
- **THEN** the response SHALL be an empty array (the EXISTS clause matches no rows)

#### Scenario: HR misassigns interviewer to non-interviewer employee

- **WHEN** HR somehow assigns `interviewer_id=emp-X` in `interview_invitations` where `emp-X` lacks the `interviewer` role
- **THEN** emp-X attempting to query candidates SHALL be blocked at the feature gate (action_level='none') before row filter executes
- **AND** HR SHALL NOT be able to make this misassignment from the UI because the dropdown filters by role (defense layer 1)

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