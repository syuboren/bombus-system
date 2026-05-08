# edit-scope-enforcement Specification

## Purpose

TBD - created by archiving change 'fix-edit-scope-enforcement'. Update Purpose after archive.

## Requirements

### Requirement: Employee update endpoint enforces edit_scope

The PUT `/api/employee/:id` endpoint SHALL validate the requesting user's `edit_scope` against the target employee record before performing the update. If the user's `edit_scope` does not permit editing the target record, the system SHALL return 403 Forbidden.

#### Scenario: User with edit_scope=self updates own record

- **WHEN** a user with `edit_scope=self` sends PUT `/api/employee/:id` where `:id` matches their own employee record
- **THEN** the system SHALL allow the update

#### Scenario: User with edit_scope=self updates another employee

- **WHEN** a user with `edit_scope=self` sends PUT `/api/employee/:id` where `:id` does NOT match their own employee record
- **THEN** the system SHALL return 403 Forbidden with message indicating insufficient edit permissions

#### Scenario: User with edit_scope=department updates employee in same department

- **WHEN** a user with `edit_scope=department` sends PUT `/api/employee/:id` where the target employee belongs to the user's department
- **THEN** the system SHALL allow the update


<!-- @trace
source: fix-edit-scope-enforcement
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
-->

---
### Requirement: Document endpoints enforce edit_scope

The POST, PUT, and DELETE endpoints for employee documents SHALL validate the requesting user's `edit_scope` against the document owner's employee record before performing the operation.

#### Scenario: User with edit_scope=self uploads document for another employee

- **WHEN** a user with `edit_scope=self` sends POST `/api/employee/documents` with an `employee_id` that does NOT match their own employee record
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: User with edit_scope=self deletes another employee's document

- **WHEN** a user with `edit_scope=self` sends DELETE `/api/employee/documents/:id` for a document owned by another employee
- **THEN** the system SHALL return 403 Forbidden


<!-- @trace
source: fix-edit-scope-enforcement
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
-->

---
### Requirement: Account creation endpoint enforces edit_scope

The POST `/api/employee/:id/create-account` endpoint SHALL validate the requesting user's `edit_scope` against the target employee record before creating the account.

#### Scenario: User with edit_scope=self creates account for another employee

- **WHEN** a user with `edit_scope=self` sends POST `/api/employee/:id/create-account` where `:id` does NOT match their own employee record
- **THEN** the system SHALL return 403 Forbidden


<!-- @trace
source: fix-edit-scope-enforcement
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
-->

---
### Requirement: Employee creation endpoint enforces edit_scope

The POST `/api/employee` endpoint SHALL validate the requesting user's `edit_scope` before allowing employee creation. Users with `edit_scope=self` SHALL NOT be permitted to create new employees.

#### Scenario: User with edit_scope=self attempts to create employee

- **WHEN** a user with `edit_scope=self` sends POST `/api/employee`
- **THEN** the system SHALL return 403 Forbidden

<!-- @trace
source: fix-edit-scope-enforcement
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
-->

---
### Requirement: Approve endpoints enforce can_approve and approve_scope

Any endpoint that performs an approve action (e.g., approving a candidate decision, approving a salary change, approving a leave request) SHALL apply the `requireApprovePerm(featureId)` middleware before the handler executes. The handler SHALL additionally validate that the target record falls within `req.user.approveScope`, mirroring the pattern of `checkEditScope` for edit operations:
- `approve_scope: 'self'` — the target record SHALL belong to the user (employee_id match or created_by match where applicable)
- `approve_scope: 'department'` — the target record SHALL belong to the user's department or child departments
- `approve_scope: 'company'` — always permitted within tenant
- If validation fails, the API SHALL return HTTP 403 with a descriptive error message naming the feature and the user's current approve_scope.

This requirement SHALL apply to any future approve endpoint added to the system. No approve endpoints are added in this change — this requirement establishes the enforcement contract for future implementations.

#### Scenario: User with can_approve=0 is rejected

- **WHEN** a user without `can_approve=1` for the relevant feature calls an approve endpoint
- **THEN** the API SHALL return HTTP 403 from `requireApprovePerm` middleware before reaching the handler

#### Scenario: User with company approve_scope can approve any record

- **WHEN** a user with `can_approve=1` and `approve_scope='company'` calls an approve endpoint
- **THEN** the API SHALL allow the operation regardless of the target record's organizational unit

#### Scenario: User with department approve_scope is rejected for cross-department record

- **WHEN** a user with `can_approve=1` and `approve_scope='department'` (bound to department-A) calls an approve endpoint targeting a record in department-B
- **THEN** the API SHALL return HTTP 403 with error message indicating the target is outside the user's approve scope

#### Scenario: Approve action and edit action enforced independently

- **WHEN** a user has `action_level='view'`, `view_scope='company'`, `can_approve=1`, `approve_scope='department'` for a feature
- **THEN** the user SHALL be permitted to view all records (no edit), AND approve only records within their department

##### Example: Approve enforcement matrix

| User permissions | Action attempted | Target | Result |
|---|---|---|---|
| `can_approve=0` | approve | any | 403 (no approve perm) |
| `can_approve=1, approve_scope='company'` | approve | any record in tenant | allowed |
| `can_approve=1, approve_scope='department'` (dept-A) | approve | record in dept-A | allowed |
| `can_approve=1, approve_scope='department'` (dept-A) | approve | record in dept-B | 403 (out of scope) |
| `can_approve=1, approve_scope='self'` | approve | record where employee_id matches user | allowed |
| `can_approve=1, approve_scope='self'` | approve | record belonging to other user | 403 |

<!-- @trace
source: rbac-row-level-and-interview-scope
updated: 2026-05-08
code:
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).pdf
  - bombus-system/docs/測試計畫/測試計畫與驗收標準(範本).md
  - bombus-system/docs/系統優化紀錄_20260416-20260430.xlsx
  - bombus-system/docs/系統流程優化與介面調整紀錄_20260506（to心偲).xlsx
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
-->