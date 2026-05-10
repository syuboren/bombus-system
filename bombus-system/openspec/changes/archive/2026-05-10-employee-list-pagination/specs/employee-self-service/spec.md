## MODIFIED Requirements

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
