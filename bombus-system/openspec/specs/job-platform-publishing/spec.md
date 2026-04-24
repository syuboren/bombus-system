# job-platform-publishing Specification

## Purpose

TBD - created by archiving change 'job-multi-platform-publishing'. Update Purpose after archive.

## Requirements

### Requirement: HR selects target platforms when creating or editing a job

The system SHALL present a multi-platform selector in the job create/edit modal, with 104 enabled and 518 / 1111 disabled with a tooltip displaying the string "平台尚未開放". When a platform is checked, platform-specific fields (e.g., 104 role/salary/edu) SHALL appear. Unchecking a platform SHALL hide those fields without destroying their entered values (for toggling convenience within the same session).

#### Scenario: Enabling 104 reveals 104-specific fields

- **WHEN** an HR user checks the 104 platform checkbox in the job modal
- **THEN** the UI SHALL display the 104 platform fields section (role, salary, edu, workShifts, etc.)

#### Scenario: 518 and 1111 are disabled with hint

- **WHEN** an HR user views the platform selector
- **THEN** the 518 and 1111 checkboxes SHALL be disabled AND a tooltip SHALL display the string "平台尚未開放"


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Publishing a job dispatches to all selected platforms in parallel

When a job transitions to `published` status (via save-and-publish or status change), the system SHALL invoke every selected platform's publisher adapter in parallel using `Promise.allSettled` semantics. Each platform's outcome SHALL be written independently to `job_publications` with `status='synced'` or `status='failed'`. A single platform failure SHALL NOT block other platforms from succeeding.

#### Scenario: All selected platforms succeed

- **WHEN** an HR user publishes a job with only 104 selected and the 104 adapter call returns success
- **THEN** the system SHALL create one `job_publications` row with `platform='104'`, `status='synced'`, `platform_job_id` set to the 104 returned job number, and `published_at` set to the current time

#### Scenario: One platform fails while others succeed

- **WHEN** publishing dispatches to multiple platforms and the 104 adapter throws an error while another platform succeeds
- **THEN** the system SHALL record the failing platform as `status='failed'` with the error message in `sync_error` and the successful platform as `status='synced'`


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Each job-platform pair has exactly one publications row

The system SHALL enforce a `UNIQUE(job_id, platform)` constraint on `job_publications` so a given job cannot have two publication rows on the same platform. Re-publishing or retrying on an existing row SHALL update that row in place rather than insert a new one.

#### Scenario: Retry overwrites existing row

- **WHEN** a job already has a `job_publications` row for platform `104` with `status='failed'` and HR retries
- **THEN** the system SHALL update the same row's `status`, `sync_error`, `last_sync_attempt_at`, and `platform_job_id` (if newly obtained) without creating a second row


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: HR can retry a failed platform synchronization

The system SHALL expose `POST /api/jobs/:jobId/publications/:platform/retry` to re-invoke the platform adapter for a single publication row. When `platform_job_id` exists, the adapter SHALL call `update()`; otherwise it SHALL call `publish()`. The request SHALL require `L1.jobs.edit` permission. Retry of a row whose `status='synced'` SHALL be allowed (forces re-sync); retry of a `closed` publication SHALL be rejected.

#### Scenario: Retry on failed publication

- **WHEN** an HR user with `L1.jobs.edit` permission posts to `/api/jobs/:jobId/publications/104/retry` for a row with `status='failed'`
- **THEN** the system SHALL call the 104 publisher adapter, update `status / sync_error / last_sync_attempt_at` on the same row, and return HTTP 200

#### Scenario: Retry on closed publication is rejected

- **WHEN** an HR user attempts to retry a publication row whose `status='closed'`
- **THEN** the system SHALL return HTTP 409 with an error message indicating the publication is closed and must be reopened first

#### Scenario: Retry on synced publication forces re-sync

- **WHEN** an HR user with `L1.jobs.edit` permission retries a publication row whose `status='synced'` and `platform_job_id` is set
- **THEN** the system SHALL call the platform adapter's `update(platformJobId, jobData)` method, refresh `last_sync_attempt_at`, keep `status='synced'` on success (or flip to `failed` with `sync_error` on failure), and return HTTP 200


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Closing a job cascades to all active platform publications

When a job transitions to `status='closed'`, the system SHALL iterate its `job_publications` rows whose status is `synced` and invoke each platform adapter's `close()` method in parallel. Results SHALL update `job_publications.status` to `closed` on success or leave as `failed` (with `sync_error` updated) on failure. A single platform close failure SHALL NOT prevent other platforms from closing.

#### Scenario: Closing a job with one synced platform

- **WHEN** an HR user sets a job's status to `closed` and the job has one `job_publications` row with `platform='104', status='synced'`
- **THEN** the system SHALL call the 104 adapter's `close()` method and update that row's status to `closed` on success


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Deleting a job closes platform publications before cascade removal

When a job is deleted via `DELETE /api/jobs/:id`, the system SHALL invoke `adapter.close(platformJobId)` on every `job_publications` row whose `status='synced'` before allowing the `ON DELETE CASCADE` constraint to remove those rows. The system SHALL NOT invoke any platform-specific `delete` method (e.g., `job104Service.deleteJob`) — the adapter interface has only `publish / update / close / reopen`. A single platform close failure SHALL NOT block the local deletion; failing closes SHALL be logged but MUST NOT prevent the job row from being removed.

#### Scenario: Deleting a job with a synced 104 publication

- **WHEN** an HR user deletes a job that has a `job_publications` row with `platform='104', status='synced', platform_job_id='J-001'`
- **THEN** the system SHALL call the 104 adapter's `close('J-001')` method, then delete the job row (which cascades to remove the `job_publications` row), and return HTTP 200

#### Scenario: Platform close failure does not block local deletion

- **WHEN** an HR user deletes a job and the 104 adapter's `close()` call throws an error
- **THEN** the system SHALL log the failure, still delete the local `jobs` row and its `job_publications` rows via cascade, and return HTTP 200 with a warning field indicating which platform's close call failed


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Job list displays per-platform publication chips

The job list page SHALL display a visual chip for each supported platform on every job row. A chip SHALL show one of: `synced` (green check), `failed` (red X with hover error summary), `pending` / `syncing` (neutral with loading icon), `closed` (grey), or `—` (platform not selected for this job). Clicking a non-empty chip SHALL open a detail modal showing platform, status, `platform_job_id`, `last_sync_attempt_at`, `sync_error`, and a retry button when the status permits retry.

#### Scenario: Job with only 104 published shows other platforms as unpublished

- **WHEN** an HR user views a job in the list that has a `job_publications` row only for `platform='104'`
- **THEN** the UI SHALL display `[104 ✅]` chip and `[518 —]`, `[1111 —]` placeholder chips for unselected platforms

#### Scenario: Detail modal exposes retry for failed publication

- **WHEN** an HR user clicks a `failed` platform chip
- **THEN** a detail modal SHALL open displaying the `sync_error` message and a "重試同步" button that, when clicked, calls the retry endpoint


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Legacy 104 data is migrated to job_publications on tenant DB load

When a tenant database is loaded, the migration step SHALL ensure every `jobs` row with a non-null `job104_no` has a corresponding `job_publications` row for platform `104`. The migration SHALL be idempotent: repeated runs SHALL NOT create duplicates. The existing `jobs.job104_no`, `jobs.sync_status`, `jobs.job104_data`, `jobs.synced_at` columns SHALL be preserved unchanged (deprecated but present for backward compatibility).

#### Scenario: Existing 104-synced job gets a publications row

- **WHEN** a tenant database is loaded that contains a `jobs` row with `job104_no='XYZ'`, `sync_status='104_synced'`, and `synced_at='2026-04-01T10:00:00Z'` but no matching `job_publications` row
- **THEN** the migration SHALL insert a `job_publications` row with `job_id` matching, `platform='104'`, `platform_job_id='XYZ'`, `status='synced'`, `published_at='2026-04-01T10:00:00Z'`

#### Scenario: Migration does not duplicate existing publications rows

- **WHEN** the migration runs a second time on a tenant that already has the `job_publications` row for a given `(job_id, platform='104')`
- **THEN** the migration SHALL NOT insert a second row (enforced by the `UNIQUE(job_id, platform)` constraint and a `WHERE NOT EXISTS` clause)


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Job base actions are unified regardless of external publication status

The job list page SHALL present the **same set of base actions** for every `status='published'` job, independent of whether the job has any external platform publication row. Base actions include: adding a candidate manually, initiating a referral invitation, closing the job, editing, deleting, and viewing candidates. The UI SHALL NOT hide any of these actions based on `job.source`, `job.job104_no`, or `job.sync_status`. Actions that directly depend on an external platform API (e.g. pulling applicant resumes from 104) SHALL be hidden unless the job has at least one `publications[].status='synced'` row.

#### Scenario: 104-published job still shows "Add candidate" action

- **WHEN** an HR user views a published job whose `publications` contains a `platform='104', status='synced'` row
- **THEN** the action column SHALL display the "Add candidate" button, the "Send referral" button, and the "Close job" button, identically to a published job with no external publication rows

#### Scenario: External sync action appears only for jobs with synced publications

- **WHEN** an HR user views a published job whose `publications` list is empty OR contains no row with `status='synced'`
- **THEN** the "Sync candidates from external platform" action SHALL NOT be visible
- **AND WHEN** another published job has at least one `publications[].status='synced'` row
- **THEN** that job row SHALL display the "Sync candidates from external platform" action in addition to all base actions


<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->

---
### Requirement: Platform adapter registry abstracts per-platform publish/update/close calls

The backend SHALL provide a `platform-publisher` service directory exporting a `getPublisher(platform)` function returning an adapter that implements `publish(jobData)`, `update(platformJobId, jobData)`, `close(platformJobId)`, and `reopen(platformJobId)`. The 104 adapter SHALL wrap the existing `services/104/job.service.js` methods without rewriting them. Adapters for 518 and 1111 SHALL exist but throw `NOT_IMPLEMENTED`; route callers SHALL catch such errors and record the publication as `status='failed'` with `sync_error='Platform not implemented'`.

#### Scenario: 104 adapter delegates to existing job service

- **WHEN** the 104 adapter's `publish(jobData)` method is called with valid 104 payload
- **THEN** it SHALL invoke `job104Service.postJob(jobData)` and return `{ platformJobId: result.jobNo }`

#### Scenario: 518 stub adapter throws NOT_IMPLEMENTED

- **WHEN** any method of the 518 adapter is invoked
- **THEN** it SHALL throw an error whose code is `NOT_IMPLEMENTED` and whose message indicates the platform is not yet supported

<!-- @trace
source: job-multi-platform-publishing
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
-->