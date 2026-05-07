## ADDED Requirements

### Requirement: Role matrix view at user overview page

The system SHALL provide a role matrix view at `/settings/users` that displays all employees as rows and all tenant roles (system + custom) as columns, allowing administrators to inspect role assignments across the entire workforce without opening individual modals.

The view SHALL be selectable via a three-mode view toggle (`card | list | matrix`) on the page header, with `list` as the default mode.

The matrix SHALL render up to 500 employees using virtual scrolling (CDK `cdk-virtual-scroll-viewport`) to maintain frame-rate above 30 fps during scroll.

Each cell SHALL display:
- Empty state when the employee does not hold that role
- A single "● <label>" chip representing the **broadest** scope across all assignments of that role for that employee. Chip label uses one of three category buckets (reflecting the merged effective permission level):
  - `全集團` when the broadest scope_type is `global` or `group` (visually merged — both are functionally equivalent in single-tenant single-group setups)
  - `子公司` when the broadest scope_type is `subsidiary`
  - `部門` when the broadest scope_type is `department`
- Broadest is determined by the order: global / group > subsidiary > department
- An on-hover tooltip listing the full scope detail of every assignment (sorted broadest-first, deduplicated). For each assignment: its `scope_name` when present (e.g., "台北分公司", "業務部"), or the bucket label as fallback (`全集團` / `子公司` / `部門`). Multiple assignments concatenate with " · " separator

The first column (employee identity) SHALL be sticky-left; the first row (role headers) SHALL be sticky-top during vertical/horizontal scroll.

**Naming convention — DO NOT "unify" these two terms** (they refer to different RBAC layers and must remain distinct in UI):
- **「全集團」** — used for **role assignment scope** (`user_roles.org_unit_id` → derived `scope_type` of `global` or `group`). Appears in: matrix cell chips, role-holders popover, modal's assigned-role list, role management page's role card scope badge, role edit modal's "可指派層級" dropdown, CSV `scope_type` column.
- **「全公司」** — used for **functional permission scope** (`role_feature_perms.view_scope` / `edit_scope` value `company`). Appears in: role management page's per-feature 檢視範圍/編輯範圍 column, modal's 有效權限總覽 table.

Maintainers SHALL NOT unify these two terms even if they look similar in different contexts; doing so would re-introduce the original ambiguity that this distinction resolves.

#### Scenario: Switch from list to role matrix view

- **WHEN** the admin clicks the matrix icon in the view toggle on `/settings/users`
- **THEN** the page SHALL replace the list with the role matrix, preserving the current filter state (search keyword, department, role, status)

#### Scenario: Cell display with single role at department scope

- **GIVEN** employee "王小明" holds role "dept_manager" at scope `department / 業務部`
- **WHEN** the matrix renders
- **THEN** the cell at row "王小明", column "dept_manager" SHALL display "● 部門" and the tooltip SHALL show "業務部"

#### Scenario: Cell display with multiple scopes for the same role (same type)

- **GIVEN** employee "李小華" holds role "subsidiary_admin" at two scopes: `subsidiary / 台北分公司` and `subsidiary / 高雄分公司`
- **WHEN** the matrix renders
- **THEN** the cell SHALL display the single broadest-bucket chip "● 子公司" (both assignments are subsidiary type so the bucket is the same), and the tooltip SHALL list every assignment separated by " · ": "台北分公司 · 高雄分公司"

#### Scenario: Cell display with mixed-type multiple scopes

- **GIVEN** employee "田馥甄" holds role "hr_manager" at two different scope types: `global` (no `scope_name`) and `subsidiary / TEST`
- **WHEN** the matrix renders
- **THEN** the cell SHALL display "● 全集團" (the broadest scope wins because permissions effectively merge to the broadest), and the tooltip SHALL show "全集團 · TEST"

#### Scenario: Cell display deduplicates global and group at the same role

- **GIVEN** employee "李小華" holds role "hr_manager" at two assignments: `global` (org_unit_id=NULL) and `group` (org_unit_id pointing at the tenant's group root, e.g., "Demo集團")
- **WHEN** the matrix renders
- **THEN** the cell SHALL display "● 全集團", and the tooltip SHALL show a single deduplicated "全集團" entry (not "全集團 · 全集團")

#### Scenario: Click employee row opens existing AccountPermissionComponent modal

- **WHEN** the admin clicks on an employee row in the matrix view
- **THEN** the system SHALL open the existing `AccountPermissionComponent` modal for that employee, identical to the modal opened from list view

#### Scenario: Screen below 1024px width

- **WHEN** the matrix view is active and the viewport width drops below 1024px
- **THEN** the system SHALL automatically switch back to `list` view and display a non-blocking toast: "矩陣視圖建議使用 1024px 以上螢幕，已切換回列表"

##### Example: filter state preservation across view modes

| Before toggle (list view) | After toggle (matrix view) | Notes |
|---|---|---|
| keyword="王", dept="業務部" | keyword="王", dept="業務部" | filters persist |
| status="active" | status="active" | persists |
| sort="name asc" (list-only) | (no sort applied) | matrix has its own column order |

---

### Requirement: Role column header reverse-lookup popover

The matrix view SHALL provide a reverse-lookup popover when the admin clicks a role column header, listing all employees holding that role at any scope.

The popover SHALL be read-only (no assignment/revocation actions) and SHALL display, for each holder: employee name, employee number, scope label (full text), and a clickable link that opens the `AccountPermissionComponent` modal for that employee.

The popover SHALL close when the admin clicks outside it or presses Escape.

#### Scenario: Click role column header shows holders

- **WHEN** the admin clicks the column header for role "subsidiary_admin"
- **THEN** the system SHALL display a popover anchored below the header, listing all employees holding "subsidiary_admin" with their scope (e.g., "台北分公司")

#### Scenario: Click holder name in popover opens modal

- **WHEN** the admin clicks an employee name inside the role-holders popover
- **THEN** the popover SHALL close and the `AccountPermissionComponent` modal SHALL open for that employee

#### Scenario: Empty role with no holders

- **WHEN** the admin clicks the column header of a role with zero holders
- **THEN** the popover SHALL display the message "此角色目前無人持有"

---

### Requirement: Filter bar for user overview

The page SHALL provide a filter bar applicable to both list and matrix views, with the following controls:
- Search input matching employee name, employee number, or email (case-insensitive substring)
- Department selector (dropdown sourced from `org_units` where `type = 'department'`, scoped to the currently selected subsidiary)
- Role selector (multi-select; default "all")
- Account status selector (`active | inactive | locked | all`; default "all")

The filter state SHALL be reflected in URL query parameters (`?q=<keyword>&dept=<name>&roles=<ids>&status=<value>&view=<mode>`) so the view is shareable and back/forward navigation preserves state. The `dept` parameter uses the department's display name (matching the project-wide convention used by list/card views), not its ID.

The filter bar SHALL display a result count summary: "總計 N 人 · 已篩選 M 人" (matrix view only; list/card views retain pagination).

#### Scenario: Apply department filter

- **WHEN** the admin selects "業務部" from the department selector
- **THEN** the list/matrix SHALL display only employees whose `department` field matches the selected department name (case-sensitive equality), and the URL SHALL update to include `?dept=業務部`

#### Scenario: Multi-select roles filter

- **WHEN** the admin selects multiple roles ("hr_manager" and "dept_manager") from the role selector
- **THEN** the list/matrix SHALL display only employees holding at least one of the selected roles, and the count summary SHALL update

---

### Requirement: Employee-perspective CSV export

The page SHALL provide an "Export CSV" button that exports the currently filtered employee × role assignments as a flat CSV (long format), with one row per employee × role combination.

CSV columns (in order, with localized cell values):
1. `employee_number` (員工編號)
2. `name` (姓名)
3. `email` (Email)
4. `department_name` (部門)
5. `role_name` (角色名稱)
6. `scope_type` — Chinese category labels matching matrix UI: `全集團` (covers both `global` and `group` backend values), `子公司`, `部門`
7. `scope_name` (specific anchor name, e.g., 業務部 / 台北分公司; empty for `全集團` rows since global/group are visually merged with no anchor distinction)
8. `account_status` — Chinese labels: `啟用` / `停用` / `鎖定` (mapped from backend `active` / `inactive` / `locked`)
9. `exported_at` (ISO 8601 timestamp)

The CSV file name SHALL follow the pattern `員工權限總覽_<YYYYMMDD-HHmm>.csv`. UTF-8 BOM SHALL be prepended so Excel for Windows opens it without garbled Chinese characters.

Employees with zero roles SHALL still appear once in the CSV with `role_name`, `scope_type`, `scope_name` left empty (so the export is a complete employee roster).

#### Scenario: Export filtered results

- **GIVEN** the filter shows 47 employees
- **WHEN** the admin clicks "Export CSV"
- **THEN** the browser SHALL download a CSV containing only those 47 employees' role assignments

##### Example: employee with multiple roles produces multiple rows (with Chinese-localized cell values)

| employee_number | name | role_name | scope_type | scope_name | account_status |
|---|---|---|---|---|---|
| HR-001 | 李小華 | hr_manager | 全集團 | (empty) | 啟用 |
| HR-001 | 李小華 | dept_manager | 部門 | 業務部 | 啟用 |
| HR-001 | 李小華 | 招募官 | 全集團 | (empty) | 啟用 |

##### Example: employee with no roles produces single empty-role row

| employee_number | name | role_name | scope_type | scope_name | account_status |
|---|---|---|---|---|---|
| INTERN-09 | 林小新 | (empty) | (empty) | (empty) | 啟用 |

##### Example: group-anchored assignment merges into 全集團

| employee_number | name | role_name | scope_type | scope_name | account_status |
|---|---|---|---|---|---|
| ADMIN-01 | 趙大偉 | hr_manager | 全集團 | (empty) | 啟用 |

(Backend stored value: `scope_type='group'`, `scope_name='Demo集團'` — both are normalized to `全集團` + empty in CSV to match matrix UI semantics.)

## MODIFIED Requirements

### Requirement: Simplified user overview page

The system SHALL provide a user account overview page at route `/settings/users` that displays employees with their role assignments and account status. The page SHALL support three view modes (`card | list | matrix`) selectable via a view toggle, with `list` as the default. The page SHALL serve as the central hub for tenant-level user account management, including viewing role assignments, opening per-employee account & permission management via modal, and exporting role assignments.

#### Scenario: User overview page loads

- **WHEN** an administrator with `SYS.user-management` view permission accesses `/settings/users`
- **THEN** the page SHALL display the employee data in `list` view by default, including columns: name, employee number, email, role badges (comma-separated role names), account status, and creation date

#### Scenario: Search users

- **WHEN** the admin enters a search keyword in the search bar
- **THEN** the list or matrix SHALL filter by matching name, employee number, or email (case-insensitive substring), and the result count SHALL update

---

### Requirement: Quick actions on user overview

Per-employee account actions (toggle status, reset password) and role management (assign role, revoke role, view effective permissions) SHALL be performed inside the shared `AccountPermissionComponent` modal, opened by clicking an employee row in any view mode.

The modal SHALL be the single entry point for these actions; no inline buttons in list rows or matrix cells SHALL duplicate these capabilities. The previous direct row-action buttons (inline enable/disable, inline reset password) are superseded by the modal-based flow.

#### Scenario: Toggle account status from modal

- **WHEN** the admin clicks an employee row → modal opens → clicks "停用帳號" (or "啟用帳號")
- **THEN** the system SHALL call `PUT /api/tenant-admin/users/:id` to update the status, display a success notification, and refresh both the modal and the underlying list/matrix row

#### Scenario: Reset password from modal

- **WHEN** the admin clicks an employee row → modal opens → clicks "重設密碼"
- **THEN** the system SHALL generate a new random password, display the new password in the modal, and set `must_change_password = 1` for that user

#### Scenario: Assign role from modal

- **WHEN** the admin clicks an employee row → modal opens → selects a role and scope → clicks "指派角色"
- **THEN** the system SHALL persist the assignment, refresh the modal's role list, and update the underlying matrix cell to reflect the new assignment

#### Scenario: Assign the same role at different scopes

The role assignment dropdown SHALL show every available role (no exclusion based on existing assignments) so an employee can hold the same role at multiple scopes. The system SHALL detect a `(role_id, org_unit_id)` exact-duplicate combination and disable "指派角色" with an inline warning, preventing primary-key conflicts.

- **GIVEN** employee 田馥甄 already holds `hr_manager` at scope `subsidiary / TEST`
- **WHEN** admin opens the modal → selects `hr_manager` again → selects scope = `全集團` (global) → clicks "指派角色"
- **THEN** the assignment SHALL succeed and the modal's role list SHALL display two `hr_manager` rows: one at `TEST`, one at `全集團`
- **AND** if admin instead re-selects `hr_manager` + `TEST` (the existing combination), the warning text "此角色於相同 scope 已指派，請選擇不同 scope 或撤除既有指派" SHALL appear and the "指派角色" button SHALL be disabled

#### Scenario: Modal close refreshes matrix data

The matrix view caches role/user data fetched via `GET /api/tenant-admin/users?all=true`; this cache SHALL be invalidated when the modal closes if any change was made during the session, so role assignments / status changes immediately reflect in the matrix cells.

- **GIVEN** admin is on the matrix view
- **WHEN** admin clicks an employee row → modal opens → makes one or more changes (assign/revoke role, toggle status, reset password) → closes the modal
- **THEN** the matrix data SHALL be re-fetched and the affected cell(s) SHALL reflect the new state
- **AND** if admin closes the modal without making any changes, no re-fetch SHALL occur

## REMOVED Requirements

### Requirement: Navigate to employee management for detailed operations

**Reason**: The `/settings/users` page is now the employee management hub itself; navigating to a separate hub is redundant. Per-employee detailed actions are performed via the in-page `AccountPermissionComponent` modal.

**Migration**: Remove all "Manage" navigation links pointing to `/organization/employee-management?userId=<id>`. The modal opened by clicking an employee row replaces this navigation.

---

### Requirement: Remove user creation from settings

**Reason**: The `/settings/users` page is now the unified employee + account management hub and DOES support user account creation (via the existing employee creation flow inside `EmployeeManagementPageComponent`, which uses the unified account creation service). Forbidding user creation here contradicts the actual page behavior.

**Migration**: Remove the "no Create User button" assertion from this spec. User creation continues to work through the existing employee add flow on the same page.
