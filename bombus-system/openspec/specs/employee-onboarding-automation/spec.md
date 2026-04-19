# employee-onboarding-automation Specification

## Purpose

TBD - created by archiving change 'candidate-employee-user-linking'. Update Purpose after archive.

## Requirements

### Requirement: Automatic user account creation during candidate conversion

The system SHALL automatically create a user account in the `users` table when a candidate is converted to an employee via `POST /api/hr/onboarding/convert-candidate`. Conversion SHALL only be permitted for candidates whose `approval_status = 'APPROVED'` (i.e., the decision has passed subsidiary_admin approval) and whose status is `offer_accepted`. The initial password SHALL be the candidate's email address. The `must_change_password` flag SHALL be set to `1`.

#### Scenario: New user account created successfully

- **WHEN** HR converts a candidate (status=offer_accepted, approval_status=APPROVED) to an employee and no user account with the same email exists
- **THEN** the system creates a new user record with `email = candidate.email`, `password_hash = bcrypt(candidate.email)`, `employee_id = new_employee_id`, `status = 'active'`, and `must_change_password = 1`

#### Scenario: Conversion blocked when approval not completed

- **WHEN** HR attempts to convert a candidate whose `approval_status` is `PENDING`, `REJECTED`, or `NONE`
- **THEN** the system SHALL return HTTP 409 with a message indicating the decision has not passed approval and conversion SHALL NOT proceed

#### Scenario: Existing user account with same email

- **WHEN** HR converts a candidate whose email already exists in the `users` table
- **THEN** the system SHALL NOT create a duplicate account but SHALL update the existing user's `employee_id` to link to the new employee record, and the response SHALL indicate `already_existed: true`

#### Scenario: User account creation failure is non-fatal

- **WHEN** user account creation fails due to a database error during candidate conversion
- **THEN** the employee record SHALL still be created successfully, and the response SHALL include an error message in the `user_account` field indicating manual account creation is needed

#### Scenario: Email shorter than 8 characters used as password

- **WHEN** the candidate's email is shorter than 8 characters
- **THEN** the system SHALL pad the initial password to at least 8 characters (e.g., append '1234')


<!-- @trace
source: split-interview-decision-pages
updated: 2026-04-19
code:
  - bombus-system/server/src/routes/recruitment.js
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.ts
  - bombus-system/src/app/features/employee/models/candidate.model.ts
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/openspec/changes/split-interview-decision-pages/tasks.md
  - bombus-system/server/src/routes/jobs.js
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.scss
  - bombus-system/docs/~$現況與問題比對分析_20260406.xlsx
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-perm-frontend-gate/spec.md
  - bombus-system/src/app/shared/components/sidebar/sidebar.component.ts
  - ARCHITECTURE.md
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.scss
  - bombus-system/src/app/features/employee/services/onboarding.service.ts
  - bombus-system/docs/備份/現況與問題比對分析_20260406拷貝.xlsx
  - bombus-system/src/app/features/employee/employee.routes.ts
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.scss
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.html
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.html
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.html
  - bombus-system/src/app/features/employee/services/interview.service.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.scss
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.html
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-based-permissions/spec.md
  - bombus-system/src/app/features/employee/services/decision.service.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/approved-salary-field/spec.md
  - bombus-system/openspec/changes/split-interview-decision-pages/proposal.md
  - bombus-system/openspec/changes/split-interview-decision-pages/.openspec.yaml
  - bombus-system/openspec/changes/split-interview-decision-pages/design.md
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/interview-decision-page/spec.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/src/app/features/employee/models/job.model.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/decision-approval-workflow/spec.md
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.ts
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.html
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/employee-onboarding-automation/spec.md
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/services/decision.service.js
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.scss
  - bombus-system/docs/現況與問題比對分析_20260406.xlsx
  - bombus-system/server/src/routes/hr-onboarding.js
tests:
  - bombus-system/server/src/tests/test-decision-approval.js
-->

---
### Requirement: Automatic employee role assignment

The system SHALL automatically assign the `employee` system role to the newly created user account, with the department scope (`org_unit_id`) matching the employee's assigned organizational unit.

#### Scenario: Role assigned with department scope

- **WHEN** a user account is created during candidate conversion and `org_unit_id` is provided
- **THEN** the system inserts a `user_roles` record with `role_id` = the system `employee` role ID and `org_unit_id` = the provided organizational unit ID

#### Scenario: Role assigned without org_unit_id

- **WHEN** a user account is created during candidate conversion and `org_unit_id` is not provided
- **THEN** the system inserts a `user_roles` record with `role_id` = the system `employee` role ID and `org_unit_id = NULL` (global scope)

#### Scenario: Employee system role does not exist

- **WHEN** a user account is created but the `employee` system role (is_system=1) does not exist in the `roles` table
- **THEN** the user account SHALL still be created, but no role assignment occurs; the response SHALL indicate `default_role: null`

---
### Requirement: Employee org_unit_id foreign key

The `employees` table SHALL include an `org_unit_id` column as a foreign key referencing `org_units(id)`, linking employees to the organizational structure. The existing `department` TEXT column SHALL be preserved for backward compatibility.

#### Scenario: Employee created with org_unit_id

- **WHEN** HR converts a candidate and selects an organizational unit (department)
- **THEN** the employee record SHALL have `org_unit_id` set to the selected `org_units.id`, and `department` set to the department name string

#### Scenario: Employee created without org_unit_id

- **WHEN** HR converts a candidate without selecting an organizational unit
- **THEN** the employee record SHALL have `org_unit_id = NULL` while `department` remains as the text value

---
### Requirement: Employee schema migration

The `employees` table SHALL be migrated to include 7 new columns required by the convert-candidate API: `job_title TEXT`, `candidate_id TEXT`, `probation_end_date TEXT`, `probation_months INTEGER`, `onboarding_status TEXT`, `converted_at TEXT`, and `org_unit_id TEXT REFERENCES org_units(id)`. Migrations SHALL be idempotent (ignore errors for already-existing columns).

#### Scenario: Schema migration on startup

- **WHEN** the tenant database initializes via `initTenantSchema()`
- **THEN** all 7 employee columns and 1 user column (`must_change_password`) SHALL be added if not already present, using try-catch to skip existing columns

---
### Requirement: Organization unit listing for conversion modal

The system SHALL provide `GET /api/hr/onboarding/org-units` endpoint to return the list of organizational units for the conversion modal's department-to-org-unit mapping.

#### Scenario: List all org units

- **WHEN** HR opens the onboarding conversion modal
- **THEN** the frontend calls `GET /api/hr/onboarding/org-units` and receives a list of org units with `id`, `name`, `type`, `parent_id`, and `level`, sorted by level ascending then name ascending

---
### Requirement: Frontend org_unit selection with subsidiary scope

The onboarding conversion modal SHALL include a subsidiary selector that filters department org units by the selected subsidiary. The available subsidiaries SHALL be determined by the logged-in user's role scope.

#### Scenario: Group-level admin — can select any subsidiary

- **WHEN** the logged-in user has a group-level (global) scope role
- **THEN** the subsidiary dropdown SHALL display the group itself and all subsidiaries, and the department dropdown SHALL filter to departments under the selected subsidiary

#### Scenario: Subsidiary-level admin — locked to own subsidiary

- **WHEN** the logged-in user has a subsidiary-level scope role
- **THEN** the subsidiary dropdown SHALL be pre-selected and locked (disabled) to the user's own subsidiary, and the department dropdown SHALL only show departments under that subsidiary

#### Scenario: Department auto-matching within subsidiary

- **WHEN** HR selects a department name and there is exactly one org_unit of type 'department' with the same name under the selected subsidiary
- **THEN** the `org_unit_id` field SHALL be automatically populated with the matching org unit's ID

#### Scenario: Multiple same-name departments under different subsidiaries

- **WHEN** multiple org_units of type 'department' share the same name (e.g., both Subsidiary A and B have '研發部')
- **THEN** the subsidiary selection filters the candidates, ensuring unambiguous matching within the selected subsidiary's scope

#### Scenario: No matching org unit found

- **WHEN** HR selects a department but no matching org unit exists under the selected subsidiary
- **THEN** a manual dropdown of department-type org units (filtered by subsidiary) SHALL be displayed for HR to select from

---
### Requirement: Conversion success view displays account information

After successful candidate conversion, the success view in the conversion modal SHALL display user account information including login email, default password hint, and assigned role.

#### Scenario: New account created — show credentials hint

- **WHEN** conversion succeeds and a new user account was created
- **THEN** the success view SHALL display: login email, a hint that the default password is the same as the email (without showing the actual password), and the assigned default role (employee)

#### Scenario: Existing account linked — show status

- **WHEN** conversion succeeds and an existing user account was linked
- **THEN** the success view SHALL display a message indicating the employee was linked to an existing account

#### Scenario: Account creation failed — show warning

- **WHEN** conversion succeeds but user account creation failed
- **THEN** the success view SHALL display a warning message indicating manual account creation is needed

---
### Requirement: Approved salary carried into employee record

When a candidate is converted to an employee, the system SHALL carry forward the approved salary information from the candidate record to enable downstream HR processes. The employee record SHALL reference the source candidate such that `candidates.approved_salary_amount`, `candidates.approved_salary_type`, and `candidates.approved_salary_out_of_range` remain retrievable for reporting.

#### Scenario: Candidate approved salary accessible after conversion

- **WHEN** a candidate with `approved_salary_amount = 60000` is converted to an employee
- **THEN** the candidate record SHALL retain the approved salary fields and the employee record SHALL preserve the link via `employees.candidate_id` (if column exists) or via `employees.source_candidate_id`

#### Scenario: Approval metadata retained on approved candidates

- **WHEN** a candidate is converted (status transitions to `onboarded`)
- **THEN** the candidate's `approval_status`, `approver_id`, `approved_at`, `approval_note` SHALL NOT be cleared, and SHALL be queryable for audit purposes

<!-- @trace
source: split-interview-decision-pages
updated: 2026-04-19
code:
  - bombus-system/server/src/routes/recruitment.js
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.ts
  - bombus-system/src/app/features/employee/models/candidate.model.ts
  - bombus-system/server/src/db/tenant-schema.js
  - bombus-system/openspec/changes/split-interview-decision-pages/tasks.md
  - bombus-system/server/src/routes/jobs.js
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.scss
  - bombus-system/docs/~$現況與問題比對分析_20260406.xlsx
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-perm-frontend-gate/spec.md
  - bombus-system/src/app/shared/components/sidebar/sidebar.component.ts
  - ARCHITECTURE.md
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.scss
  - bombus-system/src/app/features/employee/services/onboarding.service.ts
  - bombus-system/docs/備份/現況與問題比對分析_20260406拷貝.xlsx
  - bombus-system/src/app/features/employee/employee.routes.ts
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.scss
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.html
  - bombus-system/src/app/features/employee/pages/decision-page/decision-page.component.html
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.html
  - bombus-system/src/app/features/employee/services/interview.service.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.scss
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.html
  - bombus-system/src/app/features/employee/pages/recruitment-page/recruitment-page.component.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/feature-based-permissions/spec.md
  - bombus-system/src/app/features/employee/services/decision.service.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/approved-salary-field/spec.md
  - bombus-system/openspec/changes/split-interview-decision-pages/proposal.md
  - bombus-system/openspec/changes/split-interview-decision-pages/.openspec.yaml
  - bombus-system/openspec/changes/split-interview-decision-pages/design.md
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/interview-decision-page/spec.md
  - bombus-system/server/src/db/platform-db.js
  - bombus-system/src/app/features/employee/models/job.model.ts
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/decision-approval-workflow/spec.md
  - bombus-system/src/app/features/employee/components/interview-scoring-modal/interview-scoring-modal.component.ts
  - bombus-system/src/app/features/employee/pages/jobs-page/jobs-page.component.ts
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.html
  - bombus-system/openspec/changes/split-interview-decision-pages/specs/employee-onboarding-automation/spec.md
  - bombus-system/server/src/db/tenant-db-manager.js
  - bombus-system/server/src/services/decision.service.js
  - bombus-system/src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.scss
  - bombus-system/docs/現況與問題比對分析_20260406.xlsx
  - bombus-system/server/src/routes/hr-onboarding.js
tests:
  - bombus-system/server/src/tests/test-decision-approval.js
-->