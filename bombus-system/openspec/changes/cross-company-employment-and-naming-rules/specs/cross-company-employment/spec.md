## ADDED Requirements

### Requirement: Employee assignments table for 1:N subsidiary relationships

The system SHALL provide an `employee_assignments` table that records each employee's assignments across one or more subsidiaries, replacing the previously single `employees.org_unit_id` column as the source of truth for cross-company employment. Each row SHALL include `employee_id`, `org_unit_id`, `position`, `grade`, `level`, `is_primary`, `start_date`, and `end_date` (NULL for active assignments).

The table SHALL enforce at most one primary assignment per employee via a partial UNIQUE index `(employee_id) WHERE is_primary=1`. The legacy `employees.org_unit_id` column SHALL be preserved and SHALL remain synchronized with the employee's `is_primary=1` assignment to maintain backward compatibility with existing query callers.

#### Scenario: Employee with primary-only assignment

- **WHEN** a new employee is created via `POST /api/employee` with subsidiary `'sub-A'`
- **THEN** the system SHALL insert one row in `employee_assignments` with `is_primary=1, org_unit_id='sub-A'`, AND set `employees.org_unit_id='sub-A'`

#### Scenario: Adding a secondary assignment

- **WHEN** HR adds a second active assignment for an employee already assigned to `sub-A` with a new assignment to `sub-B`
- **THEN** the system SHALL insert one row with `is_primary=0, org_unit_id='sub-B'`, leave the existing `is_primary=1` row unchanged, AND keep `employees.org_unit_id='sub-A'`

#### Scenario: Primary swap

- **WHEN** HR designates the `sub-B` assignment as the new primary
- **THEN** the system SHALL set the previous primary to `is_primary=0`, set the new row to `is_primary=1`, AND update `employees.org_unit_id='sub-B'` — all within a single transaction

##### Example: Primary uniqueness enforced

| Action | employee_assignments after |
| ------ | -------------------------- |
| Create employee → sub-A | (id1, sub-A, primary=1) |
| Add secondary → sub-B | (id1, sub-A, primary=1), (id2, sub-B, primary=0) |
| Promote sub-B to primary | (id1, sub-A, primary=0), (id2, sub-B, primary=1) |
| Attempt to mark id1 as primary too | INSERT/UPDATE SHALL fail due to partial UNIQUE index |

---

### Requirement: Assignment service maintains employees.org_unit_id consistency

The system SHALL provide an `EmployeeAssignmentService` that centralizes all assignment writes. The service SHALL be the only writer of `employees.org_unit_id` after this change, ensuring the value always matches the current `is_primary=1` assignment's `org_unit_id`. Direct writes to `employees.org_unit_id` from other code paths SHALL be migrated to call `EmployeeAssignmentService.setPrimary(employeeId, orgUnitId, ...)`.

#### Scenario: Service guarantees synchronization

- **WHEN** any caller invokes `EmployeeAssignmentService.setPrimary(employeeId, 'sub-C')`
- **THEN** the service SHALL update both `employee_assignments` (toggling `is_primary` flags) AND `employees.org_unit_id='sub-C'` within one transaction; failure of either operation SHALL roll back both

#### Scenario: Assignment end_date does not affect primary

- **WHEN** the primary assignment's `end_date` is set to a past date
- **THEN** the `is_primary` flag SHALL remain `1` until another assignment is explicitly promoted; `employees.org_unit_id` SHALL remain unchanged. The employee status SHALL be reflected via `employees.status` separately.

---

### Requirement: API endpoints for cross-company assignment management

The system SHALL provide REST endpoints scoped to `L1.profile.edit` permission for managing employee assignments:

- `GET /api/employee/:id/assignments` — list all assignments (active and historical) for an employee
- `POST /api/employee/:id/assignments` — create a new assignment
- `PATCH /api/employee/:id/assignments/:assignmentId` — update assignment fields (position / grade / end_date / is_primary)
- `DELETE /api/employee/:id/assignments/:assignmentId` — remove an assignment

When an action would leave the employee with zero active assignments, the API SHALL respond `400 Bad Request` to prevent orphan employees.

#### Scenario: List assignments

- **WHEN** `GET /api/employee/emp-001/assignments` is called by an HR with `L1.profile.view`
- **THEN** the response SHALL contain an array of assignment records with all fields, ordered by `is_primary DESC, start_date ASC`

#### Scenario: Cannot delete last active assignment

- **WHEN** an employee has only one active assignment and HR attempts `DELETE /api/employee/:id/assignments/:assignmentId`
- **THEN** the API SHALL respond `400` with error `"員工至少需保留一筆有效任職紀錄"`

#### Scenario: Promotion requires existing primary toggle

- **WHEN** HR sends `PATCH .../:assignmentId` with `is_primary=true` for an assignment that is not currently primary
- **THEN** the system SHALL atomically demote the existing primary to `is_primary=0` and promote the target assignment to `is_primary=1`

---

### Requirement: Cross-company assignment management UI in employee detail page

The system SHALL provide a "任職紀錄" section in the employee detail page showing all assignments (active and historical) for the employee. HR users with `L1.profile.edit` SHALL be able to add, edit, and end assignments via a modal dialog. The modal SHALL allow selection of subsidiary (filtered to ones the user has scope for), department, position, grade, level, start date, and primary toggle.

#### Scenario: HR opens task management modal

- **WHEN** an HR user clicks the "新增任職" button on an employee's detail page
- **THEN** the system SHALL open a modal with fields: 子公司 (dropdown), 部門 (dropdown), 職位, 職等, 職級, 起始日期, 主任職切換

#### Scenario: Subsidiary dropdown respects user scope

- **WHEN** an HR with `view_scope='department'` opens the assignment modal
- **THEN** the subsidiary dropdown SHALL list only subsidiaries within the user's org_unit subtree

#### Scenario: Cross-company badge in employee list

- **WHEN** the employee list (card or list view) renders an employee with two or more active assignments
- **THEN** a "跨公司" badge SHALL appear adjacent to the employee name, AND hover SHALL display a tooltip listing all active subsidiaries

---

### Requirement: Migration backfills primary assignments for existing employees

The system SHALL include a one-time migration that populates `employee_assignments` from existing `employees` rows where `org_unit_id IS NOT NULL`. Each existing employee SHALL receive one row with `is_primary=1`, `start_date` defaulted to the employee's `hire_date` (or `created_at` if hire_date is NULL), and `end_date=NULL`. The migration SHALL be idempotent.

#### Scenario: First migration run

- **WHEN** the migration is executed against a tenant with 247 existing employees (all with non-NULL `org_unit_id`)
- **THEN** the migration SHALL insert 247 rows in `employee_assignments`, all with `is_primary=1, end_date=NULL`, AND `employees.org_unit_id` SHALL remain unchanged

#### Scenario: Re-running migration is idempotent

- **WHEN** the migration is executed a second time on the same tenant
- **THEN** no duplicate rows SHALL be inserted (the migration SHALL check existing assignments before INSERT)

---

### Requirement: Dual migration list synchronization

The system SHALL include the new `employee_assignments` table and `employees.cross_company_code` ALTER in BOTH `tenant-schema.js:initTenantSchema()` (for new tenants) AND `tenant-db-manager.js:_runMigrations()` (for existing tenants). The migrations SHALL be wrapped with `IF NOT EXISTS` (CREATE TABLE) and exception-swallowing try/catch (ALTER TABLE) for idempotency.

#### Scenario: New tenant init applies schema

- **WHEN** a new tenant is provisioned
- **THEN** `initTenantSchema()` SHALL create `employee_assignments` and apply the `cross_company_code` ALTER alongside other employee migrations

#### Scenario: Existing tenant migrates on next request

- **WHEN** an existing tenant DB is opened after deployment
- **THEN** `_runMigrations()` SHALL apply the new table and column without erroring on already-existent state
