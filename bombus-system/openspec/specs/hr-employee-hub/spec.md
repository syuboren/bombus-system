# HR Employee Management Hub — HR 員工管理中心

## Purpose

Define the unified HR management hub at `/organization/employee-management` that consolidates employee management operations (dashboard, list with dual view, add, batch import, editable detail modal) for users with `L1.profile` edit permission.

## Requirements

### Requirement: HR employee management hub page

The system SHALL provide an HR management hub page at route `/organization/employee-management` that serves as the primary entry point for all employee management operations. The page SHALL include: HR dashboard, employee list with dual view (card/list), add employee, batch import, and the shared `EmployeeDetailComponent` in editable mode. The page SHALL require `L1.profile` edit permission.

#### Scenario: HR accesses the management hub

- **WHEN** a user with `L1.profile` edit permission navigates to `/organization/employee-management`
- **THEN** the page SHALL display the HR dashboard, employee list, and management action buttons

#### Scenario: User without edit permission is blocked

- **WHEN** a user without `L1.profile` edit permission navigates to `/organization/employee-management`
- **THEN** the system SHALL redirect the user via `featureGateGuard`


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
### Requirement: HR dashboard with KPI cards and sidebar

The HR management hub SHALL display a dashboard area with KPI statistics cards and a sidebar panel containing operational alerts and insights. The dashboard SHALL reuse the existing employee API endpoints (`GET /api/employee/stats`, `GET /api/employee/expiring-documents`, `GET /api/employee/department-roi`) that are currently consumed by the employee profile page.

#### Scenario: KPI cards display employee statistics

- **WHEN** the HR dashboard loads
- **THEN** the system SHALL display KPI cards showing: total employees, active employees, probation count, average tenure (months), and expiring documents count. Data SHALL be loaded from `GET /api/employee/stats`

#### Scenario: Sidebar displays expiring documents

- **WHEN** the sidebar panel loads
- **THEN** the system SHALL display documents expiring within 30 days, loaded from `GET /api/employee/expiring-documents`

#### Scenario: Sidebar displays department ROI overview

- **WHEN** the sidebar panel loads
- **THEN** the system SHALL display department-level ROI summary, loaded from `GET /api/employee/department-roi`

#### Scenario: Sidebar displays upcoming work anniversaries

- **WHEN** the sidebar panel loads
- **THEN** the system SHALL display employees with work anniversaries in the upcoming 30 days


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
### Requirement: Employee list with dual view mode

The employee list SHALL support both card view and list (table) view, toggled by view mode buttons. The list SHALL support search, filter by subsidiary/department/status, and pagination.

#### Scenario: Card view displays employee cards

- **WHEN** the view mode is set to "card"
- **THEN** the system SHALL display employees as a responsive card grid (min-width 280px per card), each card showing: avatar, name, english name, employee number, primary position, department, company, status badge, tenure, and cross-company badge (if applicable)

#### Scenario: List view displays data table

- **WHEN** the view mode is set to "list"
- **THEN** the system SHALL display employees in a data table with columns: employee (avatar + name + email), employee number, primary position, department, company, tenure, status, and action buttons (view/edit)

#### Scenario: Filter and search

- **WHEN** the user applies filters or enters a search keyword
- **THEN** the employee list SHALL filter by: subsidiary (org_unit), department, status (active/probation/on_leave/resigned), and keyword (matching name, employee number, email, english name). Pagination SHALL reset to page 1


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
### Requirement: Add employee with automatic account creation

The HR management hub SHALL provide an "Add Employee" button that opens a creation form. Upon submission, the system SHALL create both the employee record and a linked user account via the unified account creation service.

#### Scenario: Add employee form fields

- **WHEN** HR clicks "Add Employee"
- **THEN** the system SHALL display a modal form with required fields (name, email, employee_no, subsidiary, department, hire_date, level, grade, position) and optional fields (english_name, phone, mobile, gender, contract_type, work_location)

#### Scenario: Successful employee creation

- **WHEN** HR submits the form with valid data
- **THEN** the system SHALL call `POST /api/employee` which uses the unified account creation service, display the initial password in a success modal, and refresh the employee list

#### Scenario: Duplicate email or employee number

- **WHEN** HR submits the form with an email or employee number that already exists
- **THEN** the system SHALL display an error notification without creating any records


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
### Requirement: Batch import entry point

The HR management hub SHALL provide a "Batch Import" button that opens the batch import workflow (upload CSV → validate → preview → confirm → execute → report).

#### Scenario: Batch import button visible

- **WHEN** HR views the management hub
- **THEN** a "Batch Import" button SHALL be visible in the page header area alongside the "Add Employee" button

#### Scenario: Batch import workflow modal

- **WHEN** HR clicks "Batch Import"
- **THEN** the system SHALL open a full-workflow modal with steps: file upload → validation progress → preview report (each row with ✓/✗) → confirm button (disabled if errors exist) → execution progress → result report with download button


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
### Requirement: Editable employee detail modal

When HR clicks on an employee (card or table row), the page SHALL open the shared `EmployeeDetailComponent` with `readonly = false` and `moduleColor` set to organization purple (`$color-l4-mauve`).

#### Scenario: Click employee opens editable detail

- **WHEN** HR clicks on an employee in the list
- **THEN** the system SHALL open the shared employee detail component as a modal overlay with `readonly = false`, displaying 7 tabs including "Account & Permissions" (if the user has `SYS.user-management` permission)

#### Scenario: Edit triggers list refresh

- **WHEN** HR saves changes in the employee detail modal and the `employeeUpdated` event fires
- **THEN** the employee list SHALL refresh to reflect the updated data


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
### Requirement: Deep link from settings/users

The HR management hub SHALL support a query parameter `?userId=xxx` that, when present, automatically opens the employee detail modal for the employee linked to the specified user ID, with the "Account & Permissions" tab active.

#### Scenario: Deep link with userId parameter

- **WHEN** a user navigates to `/organization/employee-management?userId=abc123`
- **THEN** the system SHALL find the employee linked to user ID `abc123`, open the employee detail modal, and activate the "Account & Permissions" tab

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