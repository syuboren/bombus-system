# email-sync Specification

## Purpose

TBD - created by archiving change 'fix-email-sync-drift'. Update Purpose after archive.

## Requirements

### Requirement: Employee email update synchronizes user login email

When an administrator updates an employee's email address, the system SHALL synchronize the change to the corresponding user login record. The `users.email` field MUST always reflect the current `employees.email` for employees who have an associated user account.

#### Scenario: Admin updates employee email with existing user account

- **WHEN** an administrator updates `employees.email` for an employee who has a linked `users` record
- **THEN** the system SHALL update `users.email` to match the new `employees.email` within the same transaction

#### Scenario: Admin updates employee email to one already in use

- **WHEN** an administrator updates `employees.email` to a value that already exists in `users.email` for a different user
- **THEN** the system SHALL reject the update with a 409 conflict error and a message indicating the email is already in use

#### Scenario: Admin updates employee email for employee without user account

- **WHEN** an administrator updates `employees.email` for an employee who has no linked `users` record (`user_id` is null)
- **THEN** the system SHALL update only `employees.email` without error


<!-- @trace
source: fix-email-sync-drift
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/unified-account-creation/spec.md
-->

---
### Requirement: Account management dialog displays user login email

The account management dialog SHALL display the actual login email from the `users` table, not the `employees` table email. This ensures administrators see the correct email that the employee must use to authenticate.

#### Scenario: Account dialog shows login email

- **WHEN** an administrator opens the account management dialog for an employee
- **THEN** the "登入 Email" field SHALL display the `users.email` value

#### Scenario: Employee list API returns user email

- **WHEN** the employee list API is called
- **THEN** the response SHALL include a `userEmail` field containing `users.email` for each employee with a linked user account

<!-- @trace
source: fix-email-sync-drift
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/unified-account-creation/spec.md
-->