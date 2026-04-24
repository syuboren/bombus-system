## ADDED Requirements

### Requirement: Employee self-service profile page

The system SHALL provide an employee self-service page at route `/employee/profile` that displays an employee list filtered by the current user's `L1.profile` `view_scope` permission. The page SHALL use the shared `EmployeeDetailComponent` in readonly mode. The page SHALL NOT include HR management features (dashboard, add employee, batch import, edit controls).

#### Scenario: Employee with view_scope company sees all employees

- **WHEN** a user with `L1.profile` view permission and `view_scope = 'company'` accesses `/employee/profile`
- **THEN** the page SHALL display all employees in the tenant, with search and filter controls

#### Scenario: Employee with view_scope department sees department only

- **WHEN** a user with `L1.profile` view permission and `view_scope = 'department'` accesses `/employee/profile`
- **THEN** the page SHALL display only employees within the user's department(s)

#### Scenario: Employee with view_scope self sees only themselves

- **WHEN** a user with `L1.profile` view permission and `view_scope = 'self'` accesses `/employee/profile`
- **THEN** the page SHALL display only the user's own employee record

---

### Requirement: Self-service page layout

The employee self-service page SHALL have a simplified layout without HR-specific features. The page SHALL include: a search bar, department filter, status filter, and an employee data table with pagination.

#### Scenario: Page renders without HR dashboard

- **WHEN** the self-service page loads
- **THEN** the page SHALL NOT display: KPI statistics cards, expiring documents sidebar, department ROI panel, work anniversary panel, "Add Employee" button, or "Batch Import" button

#### Scenario: Employee list with search and filter

- **WHEN** the user interacts with the filter controls
- **THEN** the page SHALL filter the employee list by keyword (name, employee number, position, email), department, and status, with results paginated

---

### Requirement: Self-service detail modal

When a user clicks on an employee in the list, the page SHALL open the shared `EmployeeDetailComponent` with `readonly = true` and `moduleColor` set to L1 sage green (`$color-l1-sage`). The modal SHALL display 6 tabs (excluding Account & Permissions).

#### Scenario: Click employee opens readonly detail

- **WHEN** the user clicks on an employee row in the list
- **THEN** the system SHALL open the shared employee detail component as a modal overlay with `readonly = true`, displaying 6 tabs: Info, History, Documents, Training, Performance, ROI

#### Scenario: No edit buttons visible

- **WHEN** the employee detail modal is open in self-service mode
- **THEN** no edit buttons, save buttons, or management action buttons SHALL be visible on any tab

---

### Requirement: Feature gate and permission

The self-service page SHALL be protected by the `L1.profile` feature gate. Users without any `L1.profile` permission SHALL be redirected.

#### Scenario: User without L1.profile permission

- **WHEN** a user without `L1.profile` permission navigates to `/employee/profile`
- **THEN** the system SHALL redirect the user away from the page (via `featureGateGuard`)
