# Unified Account Creation Service — 統一帳號建立服務

## Purpose

Provide a shared backend service that atomically creates an employee record together with a linked user account. All entry points — onboarding conversion, HR manual creation, and batch import — SHALL use this service so password generation, role assignment, and account linking stay consistent across flows.

## Requirements

### Requirement: Shared account creation service

The system SHALL provide a backend service module `server/src/services/account-creation.js` exporting a `createEmployeeWithAccount()` function that atomically creates an employee record and a linked user account within a database transaction. All three entry points (onboarding conversion, HR manual creation, batch import) SHALL use this shared service.

#### Scenario: Create employee with new user account

- **WHEN** `createEmployeeWithAccount()` is called with employee data and `createUser: true`
- **THEN** the service SHALL within a single transaction: insert the employee record, generate a random password via `crypto.randomBytes(12).toString('base64url')`, insert a user record with `password_hash = bcrypt(password)` and `must_change_password = 1`, assign the default `employee` system role with the provided `orgUnitId`, and return `{ employee, user, initialPassword }`

#### Scenario: Create employee without user account

- **WHEN** `createEmployeeWithAccount()` is called with `createUser: false`
- **THEN** the service SHALL only insert the employee record and return `{ employee, user: null, initialPassword: null }`

#### Scenario: Email already exists in users table

- **WHEN** `createEmployeeWithAccount()` is called and a user with the same email already exists
- **THEN** the service SHALL NOT create a duplicate user account but SHALL update the existing user's `employee_id` to link to the new employee, and return `{ employee, user: existingUser, initialPassword: null, alreadyExisted: true }`

#### Scenario: Employee number already exists

- **WHEN** `createEmployeeWithAccount()` is called and an employee with the same `employee_no` already exists
- **THEN** the service SHALL throw an error with message indicating the employee number is already in use

#### Scenario: Email already exists in employees table

- **WHEN** `createEmployeeWithAccount()` is called and an employee with the same email already exists
- **THEN** the service SHALL throw an error with message indicating the email is already in use


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
### Requirement: Password generation strategy

The unified account creation service SHALL generate initial passwords using `crypto.randomBytes(12).toString('base64url')` producing a 16-character URL-safe random string. The service SHALL set `must_change_password = 1` on all newly created user accounts.

#### Scenario: Password meets security requirements

- **WHEN** a new user account is created via the unified service
- **THEN** the generated password SHALL be at least 16 characters long, use URL-safe base64 characters, and be hashed with bcrypt (salt rounds = 10) before storage

#### Scenario: Password change enforced on first login

- **WHEN** a user logs in for the first time with the initial password
- **THEN** the system SHALL enforce password change before allowing access to any other page (via `must_change_password = 1` flag)


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
### Requirement: Default role assignment

The unified account creation service SHALL automatically assign the `employee` system role (where `is_system = 1` and `name = 'employee'`) to newly created user accounts, scoped to the provided `orgUnitId`.

#### Scenario: Role assigned with org_unit_id

- **WHEN** a user account is created with a specified `orgUnitId`
- **THEN** the service SHALL insert a `user_roles` record with the employee role ID and the provided `orgUnitId`

#### Scenario: Role assigned without org_unit_id

- **WHEN** a user account is created without an `orgUnitId` (null)
- **THEN** the service SHALL insert a `user_roles` record with `org_unit_id = NULL` (global scope)

#### Scenario: Employee role does not exist

- **WHEN** the `employee` system role does not exist in the `roles` table
- **THEN** the service SHALL still create the employee and user records but skip role assignment, and the returned result SHALL indicate `defaultRole: null`


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
### Requirement: SMTP readiness interface

The `createEmployeeWithAccount()` function SHALL accept an optional `notifyMethod` parameter (default: `'display'`). When set to `'display'`, the initial password SHALL be returned in the response for the caller to display. This parameter SHALL serve as the future extension point for email notification when SMTP is available.

#### Scenario: Display mode returns password

- **WHEN** `notifyMethod` is `'display'` (or not provided)
- **THEN** the service SHALL return the plaintext `initialPassword` in the response object

#### Scenario: Future email mode placeholder

- **WHEN** `notifyMethod` is `'email'`
- **THEN** the service SHALL throw an error with message "Email notification not yet implemented" until SMTP integration is available


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
### Requirement: Password reset service

The unified account creation service SHALL export a `resetUserPassword()` function that generates a new random password for an existing user account, updates the password hash, and sets `must_change_password = 1`. This function SHALL be used by both the user overview page quick action and the employee detail Account & Permissions tab.

#### Scenario: Reset password for active user

- **WHEN** `resetUserPassword(tenantDB, userId)` is called for an active user account
- **THEN** the service SHALL generate a new random password via `crypto.randomBytes(12).toString('base64url')`, update the user's `password_hash` with the bcrypt hash, set `must_change_password = 1`, and return `{ userId, newPassword }`

#### Scenario: Reset password for non-existent user

- **WHEN** `resetUserPassword(tenantDB, userId)` is called with a user ID that does not exist
- **THEN** the service SHALL throw an error with message indicating the user account was not found

#### Scenario: Password reset API endpoint

- **WHEN** an admin calls `POST /api/tenant-admin/users/:id/reset-password`
- **THEN** the endpoint SHALL call `resetUserPassword()`, return the new plaintext password in the response, and write an audit log entry with action `'user_password_reset'`


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
### Requirement: Link user to employee

The unified account creation service SHALL export a `linkUserToEmployee()` function that links an existing user account (without an employee record) to an existing employee record, or creates a new employee record for the user.

#### Scenario: Link existing user to existing employee

- **WHEN** `linkUserToEmployee(tenantDB, userId, employeeId)` is called with valid IDs
- **THEN** the service SHALL update `users.employee_id = employeeId` and return `{ userId, employeeId, linked: true }`

#### Scenario: Create employee for existing user

- **WHEN** `linkUserToEmployee(tenantDB, userId, null, employeeData)` is called with employee data but no employee ID
- **THEN** the service SHALL create a new employee record using the provided data, update `users.employee_id` to the new employee ID, and return `{ userId, employeeId: newId, created: true }`

#### Scenario: User already linked to an employee

- **WHEN** `linkUserToEmployee()` is called for a user that already has a non-null `employee_id`
- **THEN** the service SHALL throw an error with message indicating the user is already linked to an employee

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