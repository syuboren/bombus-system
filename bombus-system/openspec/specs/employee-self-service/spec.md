# Employee Self-Service — 員工自助員工頁

## Purpose

Provide a read-only employee directory page at `/employee/profile` for non-HR users. The page reuses the shared `EmployeeDetailComponent` in readonly mode, filters results by the viewer's `L1.profile` `view_scope`, and excludes HR-only controls such as dashboards, add/import actions, and edit buttons.

## Requirements

### Requirement: Employee self-service profile page

The system SHALL provide an employee self-service page at route `/employee/profile` that displays an employee list filtered by the current user's `L1.profile` `view_scope` permission. The page SHALL use the shared `EmployeeDetailComponent` in readonly mode. The page SHALL NOT include HR management features (dashboard, add employee, batch import, edit controls).

The list SHALL use the server-side paginated endpoint contract (`GET /api/employee/list?page=N&pageSize=M&search=...&sort=...&order=...`) defined by the `employee-list-pagination` capability. The page SHALL render a paginator with size options `[20, 50, 100, 200]` (default 20, chosen to make pagination visible at small-tenant scale), sortable column headers (name / department / hire_date), and a debounced search input (300ms). Filters (subsidiary / department / status) SHALL trigger a server-side refetch and reset the page to 1.

#### Scenario: Employee with view_scope company sees all employees

- **WHEN** a user with `L1.profile` view permission and `view_scope = 'company'` accesses `/employee/profile`
- **THEN** the page SHALL display all employees in the tenant, paginated server-side with search and filter controls

#### Scenario: Employee with view_scope department sees department only

- **WHEN** a user with `L1.profile` view permission and `view_scope = 'department'` accesses `/employee/profile`
- **THEN** the page SHALL display only employees within the user's department(s); the paginator `total` SHALL reflect the post-scope count

#### Scenario: Employee with view_scope self sees only themselves

- **WHEN** a user with `L1.profile` view permission and `view_scope = 'self'` accesses `/employee/profile`
- **THEN** the page SHALL display only the user's own employee record; `total` SHALL be 1

#### Scenario: Sortable column headers

- **WHEN** the user clicks a sortable column header (name, department, hire_date) on `/employee/profile`
- **THEN** the list SHALL re-fetch with `sort=<column>&order=<asc|desc>`, toggling order on subsequent clicks of the same column. Pagination SHALL reset to page 1.

#### Scenario: Debounced search input

- **WHEN** the user types in the search input on `/employee/profile`
- **THEN** the list SHALL debounce keystrokes by 300ms, then re-fetch with the `search` parameter. Pagination SHALL reset to page 1.

#### Scenario: Page size selector

- **WHEN** the user selects a different page size from the paginator dropdown on `/employee/profile`
- **THEN** the list SHALL re-fetch at page 1 with the new `pageSize`


<!-- @trace
source: employee-list-pagination
updated: 2026-05-10
code:
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
-->

---
### Requirement: Self-service page layout

The employee self-service page SHALL have a simplified layout without HR-specific features. The page SHALL include: a search bar, department filter, status filter, and an employee data table with pagination.

#### Scenario: Page renders without HR dashboard

- **WHEN** the self-service page loads
- **THEN** the page SHALL NOT display: KPI statistics cards, expiring documents sidebar, department ROI panel, work anniversary panel, "Add Employee" button, or "Batch Import" button

#### Scenario: Employee list with search and filter

- **WHEN** the user interacts with the filter controls
- **THEN** the page SHALL filter the employee list by keyword (name, employee number, position, email), department, and status, with results paginated


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: Self-service detail modal

When a user clicks on an employee in the list, the page SHALL open the shared `EmployeeDetailComponent` with `readonly = true` and `moduleColor` set to L1 sage green (`$color-l1-sage`). The modal SHALL display 6 tabs (excluding Account & Permissions).

#### Scenario: Click employee opens readonly detail

- **WHEN** the user clicks on an employee row in the list
- **THEN** the system SHALL open the shared employee detail component as a modal overlay with `readonly = true`, displaying 6 tabs: Info, History, Documents, Training, Performance, ROI

#### Scenario: No edit buttons visible

- **WHEN** the employee detail modal is open in self-service mode
- **THEN** no edit buttons, save buttons, or management action buttons SHALL be visible on any tab


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: Feature gate and permission

The self-service page SHALL be protected by the `L1.profile` feature gate. Users without any `L1.profile` permission SHALL be redirected.

#### Scenario: User without L1.profile permission

- **WHEN** a user without `L1.profile` permission navigates to `/employee/profile`
- **THEN** the system SHALL redirect the user away from the page (via `featureGateGuard`)

<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->