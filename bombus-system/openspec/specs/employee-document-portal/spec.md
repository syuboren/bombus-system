# employee-document-portal Specification

## Purpose

TBD - created by archiving change 'employee-document-portal'. Update Purpose after archive.

## Requirements

### Requirement: Identity-based permission derivation

The Employee Detail Modal documents tab SHALL derive operation permissions automatically by comparing the logged-in user's `employee_id` with the viewed employee's ID. The system SHALL NOT require parent components to pass a mode parameter.

- `isSelf` = logged-in user's `employee_id` is non-null AND equals the viewed `employeeId`
- `canSign` = `isSelf` (only the employee themselves can sign their own documents)
- `canUpload` = `isSelf` OR user has `L1.profile` edit permission

#### Scenario: Employee views own profile

- **WHEN** an employee opens their own Employee Detail Modal from `/employee/profile`
- **THEN** `isSelf` SHALL be `true`, granting both sign and upload capabilities

#### Scenario: HR views another employee's profile

- **WHEN** an HR user opens another employee's Employee Detail Modal from `settings/user`
- **THEN** `isSelf` SHALL be `false`, granting upload capability (via L1.profile edit permission) but NOT sign capability

#### Scenario: HR views their own profile

- **WHEN** an HR user opens their own Employee Detail Modal
- **THEN** `isSelf` SHALL be `true`, granting both sign and upload capabilities regardless of entry point

#### Scenario: User without linked employee record

- **WHEN** a user whose `employee_id` is null opens any Employee Detail Modal
- **THEN** `isSelf` SHALL be `false` (null SHALL NOT match any employeeId, including null), and the documents tab SHALL fall back to read-only or upload-only mode based on feature permissions


<!-- @trace
source: employee-document-portal
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
-->

---
### Requirement: Login response includes employee_id

The login API (`POST /api/auth/login`) response SHALL include the `employee_id` field in the user object. The value SHALL be the `employee_id` from the `users` table (nullable — null when user has no linked employee record).

#### Scenario: User with linked employee

- **WHEN** a user with a linked employee record logs in
- **THEN** the login response user object SHALL contain `employee_id` set to the linked employee's ID

#### Scenario: User without linked employee

- **WHEN** a user without a linked employee record logs in
- **THEN** the login response user object SHALL contain `employee_id` set to `null`


<!-- @trace
source: employee-document-portal
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
-->

---
### Requirement: Onboarding signature section in documents tab

The documents tab SHALL display an onboarding signature section listing all signature submissions for the viewed employee. Each item SHALL show the template name, current status (draft, signed, approved, rejected), and signed date (if applicable).

#### Scenario: Employee views own pending signatures

- **WHEN** `isSelf` is `true` AND a submission has status `DRAFT`
- **THEN** the system SHALL display a "Go to Sign" action that opens `/employee/onboarding/sign/:token` in a new browser tab

#### Scenario: Non-self user views signatures

- **WHEN** `isSelf` is `false`
- **THEN** the system SHALL display submission status only, with NO sign action buttons

#### Scenario: Signed submission display

- **WHEN** a submission has status `SIGNED` or approval_status `APPROVED`
- **THEN** the system SHALL display a status badge indicating completion, with NO further actions

#### Scenario: No submissions exist

- **WHEN** the employee has no signature submissions
- **THEN** the system SHALL display an empty state message


<!-- @trace
source: employee-document-portal
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
-->

---
### Requirement: Document upload section in documents tab

The documents tab SHALL display a document upload section showing 5 fixed document types (id_card, bank_account, health_report, photo, education_cert) and any additional "other" documents. Users with `canUpload` permission SHALL be able to upload, re-upload, and delete documents directly within the Modal.

#### Scenario: Upload a new document

- **WHEN** `canUpload` is `true` AND a document type has no uploaded file
- **THEN** the system SHALL display an upload button that triggers a file picker and uploads the selected file via `OnboardingService.uploadDocument()`

#### Scenario: Re-upload an existing document

- **WHEN** `canUpload` is `true` AND a document type already has an uploaded file
- **THEN** the system SHALL display a re-upload button and a download button

#### Scenario: Delete an uploaded document

- **WHEN** `canUpload` is `true` AND a document has been uploaded
- **THEN** the system SHALL allow deletion via `OnboardingService.deleteUploadedDocument()` with a confirmation prompt

#### Scenario: Add other documents

- **WHEN** `canUpload` is `true`
- **THEN** the system SHALL allow adding unlimited documents of type "other" with a custom name

#### Scenario: Read-only document view

- **WHEN** `canUpload` is `false`
- **THEN** the system SHALL display document status and download links only, with NO upload/delete actions


<!-- @trace
source: employee-document-portal
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
-->

---
### Requirement: Refresh documents after operations

After any document operation (upload, re-upload, delete) or when returning from a signature page, the documents tab SHALL provide a mechanism to refresh the document and submission lists.

#### Scenario: After successful upload

- **WHEN** a document upload completes successfully
- **THEN** the system SHALL refresh the uploaded documents list and display a success notification

#### Scenario: Manual refresh for signatures

- **WHEN** the user returns to the Modal after signing in a separate tab
- **THEN** the system SHALL display a refresh button that reloads signature submissions

<!-- @trace
source: employee-document-portal
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
-->