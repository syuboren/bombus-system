# departments-org-isolation Specification

## Purpose

TBD - created by archiving change 'fix-departments-org-isolation'. Update Purpose after archive.

## Requirements

### Requirement: Department org unit isolation

Each record in the `departments` table SHALL be bound to a specific `org_unit_id` representing the owning subsidiary or group. The `org_unit_id` SHALL always refer to an org_unit of type `subsidiary` or `group`, never a department (even for nested departments). The UNIQUE constraint SHALL be `UNIQUE(name, org_unit_id)` instead of `UNIQUE(name)`, allowing different subsidiaries to have departments with identical names.

#### Scenario: Two subsidiaries create departments with the same name

- **WHEN** subsidiary A creates a department named "業務部" and subsidiary B also creates a department named "業務部"
- **THEN** both records SHALL exist in the `departments` table with different `org_unit_id` values

#### Scenario: Duplicate department within same subsidiary

- **WHEN** a subsidiary already has a department named "業務部" and attempts to create another "業務部"
- **THEN** the system SHALL reject the request due to the `UNIQUE(name, org_unit_id)` constraint
- **AND** the system SHALL return a meaningful error message (not silently ignore via INSERT OR IGNORE)

#### Scenario: Nested department org_unit_id resolution

- **WHEN** a department is nested under another department (parent_id points to a department, not a subsidiary)
- **THEN** the `org_unit_id` SHALL be set to the nearest ancestor of type `subsidiary` or `group`, found by walking up the org_units hierarchy


<!-- @trace
source: fix-departments-org-isolation
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/employee-document-portal/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/employee-document-portal/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
-->

---
### Requirement: Department queries scoped by org unit

All SQL queries that read from the `departments` table using name-based matching SHALL include an `org_unit_id` condition to prevent cross-company data leakage. Existing `TRIM() COLLATE NOCASE` matching SHALL be preserved in JOIN conditions.

#### Scenario: LEFT JOIN departments in organization tree

- **WHEN** the system queries the organization tree with department details
- **THEN** the JOIN condition SHALL match both `name` and `org_unit_id`, and SHALL include `AND ou.type = 'department'` guard to prevent matching on group/subsidiary rows

#### Scenario: Department list filtered by subsidiary

- **WHEN** a user views departments for a specific subsidiary
- **THEN** the query SHALL return only departments where `org_unit_id` matches the subsidiary ID

#### Scenario: Department statistics in competency module

- **WHEN** the system computes department-level competency statistics
- **THEN** the query SHALL scope results by `org_unit_id` to prevent merging statistics across subsidiaries with same-named departments


<!-- @trace
source: fix-departments-org-isolation
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/employee-document-portal/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/employee-document-portal/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
-->

---
### Requirement: Department mutations scoped by org unit

All INSERT, UPDATE, and DELETE operations on the `departments` table SHALL include the `org_unit_id` in the WHERE clause to prevent cross-company data modification. The system SHALL NOT use `INSERT OR IGNORE` for department creation.

#### Scenario: Updating a department that shares name with another subsidiary

- **WHEN** an admin updates department "業務部" in subsidiary A
- **THEN** only the record with `org_unit_id` matching subsidiary A SHALL be modified
- **AND** the same-named department in subsidiary B SHALL remain unchanged

#### Scenario: Deleting a department that shares name with another subsidiary

- **WHEN** an admin deletes department "業務部" from subsidiary A
- **THEN** only the record with `org_unit_id` matching subsidiary A SHALL be deleted
- **AND** the same-named department in subsidiary B SHALL remain intact

#### Scenario: Creating a department with explicit org_unit_id

- **WHEN** an admin creates a new department
- **THEN** the INSERT statement SHALL include the `org_unit_id` parameter
- **AND** if the INSERT fails due to a constraint violation, the system SHALL return an error (not silently ignore)


<!-- @trace
source: fix-departments-org-isolation
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/employee-document-portal/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/employee-document-portal/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
-->

---
### Requirement: Foreign key constraint migration

The `department_positions` and `job_descriptions` tables have `FOREIGN KEY (department) REFERENCES departments(name)`. Since `departments.name` will no longer be UNIQUE, these FK constraints SHALL be removed via table rebuild. Data consistency SHALL be enforced at the application layer.

#### Scenario: Creating department positions after FK removal

- **WHEN** an admin creates a department position referencing a department name
- **THEN** the system SHALL validate the department exists in the application layer before insertion


<!-- @trace
source: fix-departments-org-isolation
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/employee-document-portal/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/employee-document-portal/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
-->

---
### Requirement: Data migration for existing departments

Upon tenant database initialization, the system SHALL migrate all existing `departments` records to set `org_unit_id`. The migration SHALL use recursive ancestor lookup to find the owning subsidiary/group. This migration SHALL be idempotent.

#### Scenario: Existing department with matching org unit

- **WHEN** a `departments` record has `org_unit_id = NULL` and an `org_units` record exists with the same name and `type = 'department'`
- **THEN** the migration SHALL walk up the org_units hierarchy from that department's `parent_id` to find the nearest `subsidiary` or `group` ancestor, and set `departments.org_unit_id` to that ancestor's ID

#### Scenario: Orphan department with no matching org unit

- **WHEN** a `departments` record has `org_unit_id = NULL` and no matching `org_units` entry exists
- **THEN** the migration SHALL assign the department to the group-level org_unit as a fallback
- **AND** the migration SHALL log a warning for each orphan department

#### Scenario: Migration runs on already-migrated data

- **WHEN** the migration runs on a tenant where all `departments` records already have a non-NULL `org_unit_id`
- **THEN** no records SHALL be modified


<!-- @trace
source: fix-departments-org-isolation
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/employee-document-portal/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/employee-document-portal/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
-->

---
### Requirement: Schema synchronization for new tenants

The `tenant-schema.js` CREATE TABLE definition for `departments` SHALL include the `org_unit_id` column and use `UNIQUE(name, org_unit_id)` instead of `UNIQUE(name)`. New tenants SHALL receive the updated schema without requiring migration.

#### Scenario: New tenant creation after migration

- **WHEN** a new tenant is created
- **THEN** the `departments` table SHALL be created with `org_unit_id TEXT REFERENCES org_units(id)` and `UNIQUE(name, org_unit_id)`


<!-- @trace
source: fix-departments-org-isolation
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/employee-document-portal/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/employee-document-portal/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
-->

---
### Requirement: Table rebuild safety

The table rebuild operations (CREATE -> COPY -> DROP -> RENAME) for removing old UNIQUE constraints SHALL be wrapped in a transaction with row count verification.

#### Scenario: Table rebuild succeeds

- **WHEN** the migration rebuilds a table
- **THEN** the system SHALL verify the row count matches before dropping the original table
- **AND** the entire operation SHALL be atomic (wrapped in BEGIN/COMMIT)

#### Scenario: Table rebuild fails mid-way

- **WHEN** any step of the rebuild fails
- **THEN** the system SHALL ROLLBACK the entire operation
- **AND** the original table SHALL remain intact

<!-- @trace
source: fix-departments-org-isolation
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/employee-document-portal/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/email-sync/spec.md
  - bombus-system/openspec/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/specs/interview-invitation-flow/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/fix-email-sync-drift/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/design.md
  - bombus-system/openspec/changes/employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/proposal.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/specs/email-sync/spec.md
  - bombus-system/openspec/changes/employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/changes/employee-document-portal/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/proposal.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-employee-document-portal/specs/employee-document-portal/spec.md
  - bombus-system/openspec/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-interviewer-selection-at-invitation/specs/interview-calendar-integration/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-email-sync-drift/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-fix-edit-scope-enforcement/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/fix-edit-scope-enforcement/specs/edit-scope-enforcement/spec.md
  - bombus-system/openspec/changes/fix-email-sync-drift/proposal.md
-->