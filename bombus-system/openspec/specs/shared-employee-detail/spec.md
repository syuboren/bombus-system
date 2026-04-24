# Shared Employee Detail Component — 共用員工詳細資料元件

## Purpose

Provide a single reusable Angular component (`EmployeeDetailComponent`) that renders comprehensive employee information across 7 tabs. Both the HR management hub (editable) and the employee self-service page (readonly) consume this component, so schema changes and UX updates stay centralized.

## Requirements

### Requirement: Shared employee detail component with mode control

The system SHALL provide a shared Angular component `EmployeeDetailComponent` (`shared/components/employee-detail/`) that displays comprehensive employee information across 7 tabs. The component SHALL accept a required `employeeId` signal input and an optional `readonly` signal input (default `false`). When `readonly` is `true`, all editing controls (save buttons, input fields, action buttons) SHALL be hidden. The component SHALL also accept a `moduleColor` signal input to customize the visual theme.

#### Scenario: Component renders in readonly mode

- **WHEN** the component is rendered with `[readonly]="true"` and a valid `employeeId`
- **THEN** the component SHALL display employee data across 6 tabs (Info, History, Documents, Training, Performance, ROI) with all fields in read-only state, no edit buttons visible, and the "Account & Permissions" tab SHALL NOT be rendered

#### Scenario: Component renders in editable mode

- **WHEN** the component is rendered with `[readonly]="false"` and a valid `employeeId`
- **THEN** the component SHALL display employee data across 7 tabs including the "Account & Permissions" tab, with edit buttons and input fields enabled on each tab

#### Scenario: Module color theming

- **WHEN** the component receives a `moduleColor` input value
- **THEN** the component SHALL apply the color via CSS custom property `--module-color` to all themed elements (tab active indicator, buttons, badges, headers)


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
### Requirement: Tab structure and content

The shared employee detail component SHALL organize employee information into the following tabs, each loading data on-demand when the tab is activated.

#### Scenario: Info tab displays basic information

- **WHEN** the user activates the Info tab
- **THEN** the system SHALL display: employee name, employee number, email, phone, mobile, gender, hire date, tenure, status, contract type, work location, manager, positions (with cross-company badge if applicable), education, skills, certifications, emergency contact, candidate source (if probation), onboarding progress (if probation), and audit logs

#### Scenario: History tab displays job changes

- **WHEN** the user activates the History tab
- **THEN** the system SHALL display a timeline view of all job changes (promotions, transfers, demotions, salary adjustments) ordered by effective date descending

#### Scenario: Documents tab displays employee documents

- **WHEN** the user activates the Documents tab
- **THEN** the system SHALL display two sections: signed submission documents (with status and download links) and uploaded file documents (with type categorization and status)

#### Scenario: Training tab displays training records

- **WHEN** the user activates the Training tab
- **THEN** the system SHALL display training records as cards showing course name, type, completion date, score, hours, cost, and certificate status

#### Scenario: Performance tab displays reviews

- **WHEN** the user activates the Performance tab
- **THEN** the system SHALL display performance review cards with overall score, goal achievement progress bar, strengths, improvements, reviewer name, and review date

#### Scenario: ROI tab displays analysis

- **WHEN** the user activates the ROI tab
- **THEN** the system SHALL display 4 KPI summary cards (salary cost, training cost, revenue generated, calculated ROI) and an ECharts trend chart comparing quarterly ROI data


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
### Requirement: Account and permissions tab with independent access control

The 7th tab "Account & Permissions" SHALL only be rendered when the user has `SYS.user-management` edit permission AND the component is in editable mode (`readonly = false`). This tab SHALL display and manage the linked user account and role assignments.

#### Scenario: User has SYS.user-management permission in editable mode

- **WHEN** the component is in editable mode and the current user has `SYS.user-management` edit permission
- **THEN** the "Account & Permissions" tab SHALL be visible, displaying: account status (active/inactive/locked), role assignments with scope, permission preview (merged effective permissions), and action buttons (enable/disable account, reset password, assign/revoke role)

#### Scenario: User lacks SYS.user-management permission

- **WHEN** the current user does NOT have `SYS.user-management` edit permission
- **THEN** the "Account & Permissions" tab SHALL NOT be rendered regardless of the `readonly` setting

#### Scenario: Employee has no linked user account

- **WHEN** the Account & Permissions tab is displayed for an employee with no linked user account (`userId` is null)
- **THEN** the tab SHALL display a message indicating no account exists and provide a "Create Account" button that triggers account creation via the unified account creation service


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
### Requirement: Data loading and event emission

The component SHALL load employee detail data via `EmployeeService.getEmployeeById()` when `employeeId` changes. After any successful edit operation, the component SHALL emit an `employeeUpdated` output event to notify the parent component.

#### Scenario: Employee data loaded on ID change

- **WHEN** the `employeeId` input signal value changes
- **THEN** the component SHALL call `GET /api/employee/:id` to load the full `UnifiedEmployeeDetail` and update all tab contents

#### Scenario: Edit operation triggers parent notification

- **WHEN** an edit operation (update info, assign role, reset password) completes successfully in editable mode
- **THEN** the component SHALL emit the `employeeUpdated` output event and display a success notification via `NotificationService`

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