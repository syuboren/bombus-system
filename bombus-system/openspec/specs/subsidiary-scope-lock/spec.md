# Subsidiary Scope Lock — 子公司範圍鎖定

## Purpose

定義子公司範圍鎖定機制，包含後端子公司判定、租戶中介層注入、company scope 的子公司篩選、前端 OrgUnitService 鎖定信號、頁面下拉選單鎖定、職等矩陣特例。

## Requirements

### Requirement: Backend subsidiary determination

The system SHALL determine each user's subsidiary by traversing the org_units tree upward from the employee's `org_unit_id`.

- If the employee's org_unit type is `subsidiary`, the system SHALL return that org_unit ID.
- If the employee's org_unit type is `group`, the system SHALL return that org_unit ID (group-level employees are locked to their group).
- If the employee's org_unit type is `department`, the system SHALL walk up via `parent_id` until a `subsidiary` or `group` type org_unit is found.
- If the employee has no org_unit or no employee record, the system SHALL return `null` (graceful degradation).

#### Scenario: Department employee subsidiary lookup

- **WHEN** an employee belongs to a department whose parent is subsidiary-A
- **THEN** the system returns subsidiary-A's ID as the user's subsidiary

#### Scenario: Subsidiary employee subsidiary lookup

- **WHEN** an employee's org_unit_id directly points to a subsidiary
- **THEN** the system returns that subsidiary's ID

#### Scenario: Group-level employee subsidiary lookup

- **WHEN** an employee's org_unit_id directly points to the group org_unit
- **THEN** the system returns the group's ID (employee is locked to the group)

#### Scenario: User without employee record

- **WHEN** a user has no linked employee record
- **THEN** the system returns `null` and the user is not locked to any subsidiary

---

### Requirement: Tenant middleware injects subsidiaryId

The tenant middleware SHALL set `req.user.subsidiaryId` on every authenticated request by calling the subsidiary determination function with the user's `departmentId`.

#### Scenario: Authenticated request with employee record

- **WHEN** an authenticated user with a linked employee record makes an API request
- **THEN** `req.user.subsidiaryId` is set to the determined subsidiary/group ID

#### Scenario: Authenticated request without employee record

- **WHEN** an authenticated user without a linked employee record makes an API request
- **THEN** `req.user.subsidiaryId` is set to `null`

---

### Requirement: Company scope filters by subsidiary

The `buildScopeFilter()` function SHALL restrict `company` scope to the user's subsidiary tree instead of returning unrestricted access (`1=1`).

- If the user has `super_admin` role, the function SHALL return `1=1` (unrestricted).
- If the user has a `subsidiaryId`, the function SHALL use a recursive CTE to find all org_unit IDs under that subsidiary and filter the query to those IDs.
- If the user has no `subsidiaryId`, the function SHALL return `1=1` (graceful degradation).

#### Scenario: Super admin with company scope

- **WHEN** a super_admin user accesses an API with `view_scope = 'company'`
- **THEN** the scope filter returns `1=1` (no restriction)

#### Scenario: Regular user with company scope and subsidiary

- **WHEN** a non-super_admin user with `subsidiaryId = 'sub-A'` accesses an API with `view_scope = 'company'`
- **THEN** the scope filter returns `org_unit_id IN (sub-A, dept-A1, dept-A2, ...)` covering all org_units under subsidiary-A

#### Scenario: Group-level employee with company scope

- **WHEN** a non-super_admin user with `subsidiaryId = 'group-1'` accesses an API with `view_scope = 'company'`
- **THEN** the scope filter returns `org_unit_id IN (group-1, sub-A, sub-B, dept-A1, ...)` covering all org_units under the group

#### Scenario: User without subsidiary with company scope

- **WHEN** a user with `subsidiaryId = null` accesses an API with `view_scope = 'company'`
- **THEN** the scope filter returns `1=1` (graceful degradation)

---

### Requirement: Company edit scope filters by subsidiary

The `checkEditScope()` function SHALL restrict `company` edit scope to the user's subsidiary tree.

- If the user has `super_admin` role, editing SHALL be allowed without restriction.
- If the user has a `subsidiaryId`, the target record's `org_unit_id` MUST be within the user's subsidiary tree.

#### Scenario: Super admin editing with company scope

- **WHEN** a super_admin user edits a record with `edit_scope = 'company'`
- **THEN** the edit is allowed regardless of the record's org_unit_id

#### Scenario: Regular user editing within own subsidiary

- **WHEN** a non-super_admin user edits a record whose org_unit_id is within their subsidiary tree
- **THEN** the edit is allowed

#### Scenario: Regular user editing outside own subsidiary

- **WHEN** a non-super_admin user attempts to edit a record whose org_unit_id is NOT within their subsidiary tree
- **THEN** the edit is denied with an appropriate error message

---

### Requirement: Login response includes subsidiary_id

The login endpoint (`/api/auth/login`) SHALL include `subsidiary_id` in the user object of the response.

#### Scenario: Login with employee record

- **WHEN** a user with a linked employee record logs in
- **THEN** the response includes `subsidiary_id` set to the user's determined subsidiary/group ID

#### Scenario: Login without employee record

- **WHEN** a user without a linked employee record logs in
- **THEN** the response includes `subsidiary_id` set to `null`

---

### Requirement: Token refresh response includes subsidiary_id

The token refresh endpoint (`/api/auth/refresh`) SHALL include `subsidiary_id` in the user object of the response.

#### Scenario: Token refresh with employee record

- **WHEN** a user with a linked employee record refreshes their token
- **THEN** the response includes `subsidiary_id` set to the user's determined subsidiary/group ID

---

### Requirement: Frontend User model includes subsidiary_id

The `User` TypeScript interface SHALL include an optional `subsidiary_id` field of type `string | null`.

#### Scenario: User model type check

- **WHEN** a developer uses the `User` interface
- **THEN** the `subsidiary_id` field is available as an optional property

---

### Requirement: OrgUnitService provides subsidiary locking signals

The `OrgUnitService` SHALL provide computed signals for subsidiary locking:

- `lockedSubsidiaryId`: Returns the user's `subsidiary_id` or `null` for super_admin users.
- `visibleSubsidiaries`: Returns only the user's subsidiary when locked, or all subsidiaries when not locked.
- `isSubsidiaryLocked`: Returns `true` when the user is locked to a subsidiary.

#### Scenario: Super admin subsidiary signals

- **WHEN** a super_admin user accesses the service
- **THEN** `lockedSubsidiaryId` returns `null`, `visibleSubsidiaries` returns all subsidiaries, `isSubsidiaryLocked` returns `false`

#### Scenario: Regular user subsidiary signals

- **WHEN** a non-super_admin user with `subsidiary_id = 'sub-A'` accesses the service
- **THEN** `lockedSubsidiaryId` returns `'sub-A'`, `visibleSubsidiaries` returns only subsidiary-A, `isSubsidiaryLocked` returns `true`

#### Scenario: User without subsidiary_id

- **WHEN** a user with `subsidiary_id = null` accesses the service
- **THEN** `lockedSubsidiaryId` returns `null`, `visibleSubsidiaries` returns all subsidiaries, `isSubsidiaryLocked` returns `false`

---

### Requirement: Page subsidiary dropdown locking

All pages and components with subsidiary dropdown filters SHALL use `visibleSubsidiaries` from `OrgUnitService` and respect the locking state.

- When locked, the dropdown SHALL be disabled and pre-selected to the user's subsidiary.
- When locked, the "all subsidiaries" option SHALL NOT be displayed.
- When not locked, all subsidiaries SHALL be displayed with free switching.

#### Scenario: Locked user views subsidiary dropdown

- **WHEN** a locked user views a page with a subsidiary dropdown
- **THEN** the dropdown shows only their subsidiary, is disabled, and the "all subsidiaries" option is hidden

#### Scenario: Super admin views subsidiary dropdown

- **WHEN** a super_admin user views a page with a subsidiary dropdown
- **THEN** the dropdown shows all subsidiaries with the "all subsidiaries" option and is freely switchable

---

### Requirement: Grade matrix group defaults exception

The grade matrix page Tab A (overview) SHALL allow viewing group-level defaults even for locked users by retaining the "all subsidiaries" option.

- Tab A: The "all subsidiaries" option (showing group defaults) SHALL remain visible for locked users, but other subsidiaries outside the user's scope SHALL NOT be shown.
- Tab B/C: The subsidiary dropdown SHALL be fully locked to the user's subsidiary (no "all subsidiaries" option).

#### Scenario: Locked user views grade matrix Tab A

- **WHEN** a locked user accesses grade matrix Tab A
- **THEN** the dropdown shows "all subsidiaries" (group defaults) and the user's own subsidiary as the only options

#### Scenario: Locked user views grade matrix Tab B/C

- **WHEN** a locked user accesses grade matrix Tab B or Tab C
- **THEN** the dropdown is locked to the user's subsidiary with no "all subsidiaries" option

---

### Requirement: Subsidiary initialization prevents double API calls

When a page component initializes with a locked subsidiary, the `selectedSubsidiaryId` signal SHALL be initialized with the locked value at declaration time to prevent the reactive subscription from firing twice (once with empty string, once with the locked value).

#### Scenario: Page initialization with locked subsidiary

- **WHEN** a locked user navigates to a page with a reactive subsidiary subscription
- **THEN** the subscription fires exactly once with the locked subsidiary ID, not twice
