## ADDED Requirements

### Requirement: Approve endpoints enforce can_approve and approve_scope

Any endpoint that performs an approve action (e.g., approving a candidate decision, approving a salary change, approving a leave request) SHALL apply the `requireApprovePerm(featureId)` middleware before the handler executes. The handler SHALL additionally validate that the target record falls within `req.user.approveScope`, mirroring the pattern of `checkEditScope` for edit operations:
- `approve_scope: 'self'` — the target record SHALL belong to the user (employee_id match or created_by match where applicable)
- `approve_scope: 'department'` — the target record SHALL belong to the user's department or child departments
- `approve_scope: 'company'` — always permitted within tenant
- If validation fails, the API SHALL return HTTP 403 with a descriptive error message naming the feature and the user's current approve_scope.

This requirement SHALL apply to any future approve endpoint added to the system. No approve endpoints are added in this change — this requirement establishes the enforcement contract for future implementations.

#### Scenario: User with can_approve=0 is rejected

- **WHEN** a user without `can_approve=1` for the relevant feature calls an approve endpoint
- **THEN** the API SHALL return HTTP 403 from `requireApprovePerm` middleware before reaching the handler

#### Scenario: User with company approve_scope can approve any record

- **WHEN** a user with `can_approve=1` and `approve_scope='company'` calls an approve endpoint
- **THEN** the API SHALL allow the operation regardless of the target record's organizational unit

#### Scenario: User with department approve_scope is rejected for cross-department record

- **WHEN** a user with `can_approve=1` and `approve_scope='department'` (bound to department-A) calls an approve endpoint targeting a record in department-B
- **THEN** the API SHALL return HTTP 403 with error message indicating the target is outside the user's approve scope

#### Scenario: Approve action and edit action enforced independently

- **WHEN** a user has `action_level='view'`, `view_scope='company'`, `can_approve=1`, `approve_scope='department'` for a feature
- **THEN** the user SHALL be permitted to view all records (no edit), AND approve only records within their department

##### Example: Approve enforcement matrix

| User permissions | Action attempted | Target | Result |
|---|---|---|---|
| `can_approve=0` | approve | any | 403 (no approve perm) |
| `can_approve=1, approve_scope='company'` | approve | any record in tenant | allowed |
| `can_approve=1, approve_scope='department'` (dept-A) | approve | record in dept-A | allowed |
| `can_approve=1, approve_scope='department'` (dept-A) | approve | record in dept-B | 403 (out of scope) |
| `can_approve=1, approve_scope='self'` | approve | record where employee_id matches user | allowed |
| `can_approve=1, approve_scope='self'` | approve | record belonging to other user | 403 |
