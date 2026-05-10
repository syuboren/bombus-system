## MODIFIED Requirements

### Requirement: Employee list with dual view mode

The employee list SHALL support both card view and list (table) view, toggled by view mode buttons. The list SHALL support search, filter by subsidiary/department/status, and server-side pagination via the `employee-list-pagination` capability.

The list view SHALL use the paginated endpoint contract (`GET /api/employee/list?page=N&pageSize=M&search=...&sort=...&order=...`) and SHALL render a paginator control with size options `[20, 50, 100, 200]` and a default page size of 20 (chosen so pagination is visible at typical small-tenant scale of 30-50 employees; the backend's default of 50 only applies when the client omits `pageSize` entirely). The card view and the matrix view (from `user-overview-lite`) SHALL continue to use the legacy non-paginated array response, since they have their own rendering optimizations (responsive grid for cards, CDK Virtual Scroll for matrix).

The card and list views SHALL render a "跨公司" badge adjacent to the employee name when the employee has two or more active assignments (from `cross-company-employment` capability). The list view SHALL include an optional "跨公司編號" column (visibility toggled by super_admin via column-visibility menu, hidden by default for non-super_admin users) populated from `crossCompanyCode` (from `cross-company-employee-id` capability).

#### Scenario: Card view displays employee cards

- **WHEN** the view mode is set to "card"
- **THEN** the system SHALL display employees as a responsive card grid (min-width 280px per card), each card showing: avatar, name, english name, employee number, primary position, department, company, status badge, tenure, and cross-company badge (if applicable). The card view SHALL use the legacy non-paginated array response.

#### Scenario: List view displays paginated data table

- **WHEN** the view mode is set to "list"
- **THEN** the system SHALL display employees in a data table with columns: employee (avatar + name + email), employee number, primary position, department, company, tenure, status, and action buttons (view/edit). The list view SHALL fetch data via the paginated endpoint and render a paginator with size options [20, 50, 100, 200] (default 20)

#### Scenario: List view sortable column headers

- **WHEN** the user clicks a sortable column header (name, hire_date, employee_no, department) in the list view
- **THEN** the list SHALL re-fetch with `sort=<column>&order=<asc|desc>`, toggling the order on subsequent clicks of the same column. Pagination SHALL reset to page 1.

#### Scenario: Search input with debounce

- **WHEN** the user types in the list-view search input
- **THEN** the list SHALL debounce keystrokes by 300ms, then re-fetch with the `search` parameter. Pagination SHALL reset to page 1.

#### Scenario: Filter and search

- **WHEN** the user applies filters or enters a search keyword
- **THEN** the employee list SHALL filter by: subsidiary (org_unit), department, status (active/probation/on_leave/resigned), and keyword (matching name, employee number, email, english name). Pagination SHALL reset to page 1.

#### Scenario: Page size change

- **WHEN** the user selects a different page size from the paginator dropdown
- **THEN** the list SHALL re-fetch at page 1 with the new `pageSize`

#### Scenario: Matrix view unaffected

- **WHEN** the view mode is set to "matrix" (the employee × role matrix from `user-overview-lite`)
- **THEN** the matrix SHALL continue to use the legacy non-paginated array response with `?all=true`, rendered via CDK Virtual Scroll, unaffected by the list-view paginator state

#### Scenario: Cross-company badge appears for multi-assignment employees

- **WHEN** an employee in the list (any view) has `assignments.filter(a => a.endDate == null).length >= 2`
- **THEN** a "跨公司" badge SHALL render adjacent to the employee name; hover SHALL display a tooltip with the comma-separated names of all active subsidiaries

#### Scenario: Super_admin toggles cross_company_code column

- **WHEN** super_admin opens the column-visibility menu in the list view and toggles "跨公司編號"
- **THEN** the list SHALL render the column populated from `crossCompanyCode` (em-dash for NULL); the toggle state SHALL persist to user preferences. Non-super_admin users SHALL NOT see the toggle entry.

## ADDED Requirements

### Requirement: Employee detail page assignments section

The employee detail page SHALL include a "任職紀錄" section listing all assignments (active and historical) for the employee, ordered by `is_primary DESC, start_date ASC`. Users with `L1.profile.edit` permission SHALL see action buttons for "新增任職", "編輯", and "結束任職" on each row. The section SHALL display, per row: 子公司名稱, 部門, 職位, 職等, 職級, 起始日期, 結束日期 (or "在職中" if NULL), 主任職標記.

#### Scenario: HR opens assignment management modal

- **WHEN** an HR user with `L1.profile.edit` clicks "新增任職" in the employee detail page
- **THEN** a modal SHALL open with fields: 子公司 (dropdown, filtered by user's view scope), 部門 (dropdown, filtered by selected 子公司), 職位, 職等, 職級, 起始日期, 是否設為主任職 (checkbox)

#### Scenario: Modal subsidiary dropdown respects scope

- **WHEN** an HR user with `view_scope='department'` opens the modal
- **THEN** the 子公司 dropdown SHALL list only subsidiaries within the user's `org_unit` subtree

#### Scenario: Read-only view for self-service

- **WHEN** an employee with `view_scope='self'` opens their own detail page
- **THEN** the "任職紀錄" section SHALL render in read-only mode (no action buttons), showing all their active and historical assignments
