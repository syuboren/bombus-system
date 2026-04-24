# interview-calendar-integration Specification

## Purpose

TBD - created by archiving change 'interviewer-selection-at-invitation'. Update Purpose after archive.

## Requirements

### Requirement: Conflict-check API for interviewer and candidate

The system SHALL provide an endpoint `POST /api/recruitment/interviews/check-conflicts` that accepts `{ interviewerId, candidateId, slots: [{ start, end? }] }` and returns per-slot conflict information by querying both `interviews` (for the interviewer's and candidate's other interviews) and `meeting_attendees` joined with `meetings` (for the interviewer's calendar events). Each slot in the response MUST include either `{ status: "available" }` or `{ status: "conflict", conflicts: [{ type, id, title, startTime, endTime, reason }] }`.

#### Scenario: Interviewer has overlapping meeting

- **WHEN** the client submits `{ interviewerId: 42, candidateId: 7, slots: [{ start: "2026-04-21T14:00", end: "2026-04-21T15:00" }] }` and employee `42` has a meeting `m1` titled "Weekly Sync" scheduled `14:30-15:30`
- **THEN** the response SHALL list the slot as `conflict` with `conflicts: [{ type: "meeting", id: "m1", title: "Weekly Sync", startTime: "2026-04-21T14:30", endTime: "2026-04-21T15:30", reason: "Interviewer has meeting 'Weekly Sync'" }]`

#### Scenario: Candidate has overlapping interview

- **WHEN** the client submits a slot and the candidate has another `interviews` row whose `interview_at` falls within the slot window
- **THEN** the response SHALL list that slot as `conflict` with `conflicts: [{ type: "interview", id, reason: "Candidate has another interview" }]`

#### Scenario: Interviewer and candidate both free

- **WHEN** neither the interviewer nor the candidate has any overlap in the requested slot
- **THEN** the response SHALL return `{ status: "available" }` for that slot

#### Scenario: Cancelled interviews are ignored

- **WHEN** an existing `interviews` row with `cancelled_at IS NOT NULL` overlaps with the requested slot
- **THEN** the conflict check SHALL ignore the cancelled interview and MUST NOT report it as a conflict


<!-- @trace
source: interviewer-selection-at-invitation
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
-->

---
### Requirement: Conflict resolution at 15-minute granularity

The conflict-check logic SHALL normalize all timestamps to the nearest lower 15-minute boundary before comparing overlap. Two time ranges `[a_start, a_end)` and `[b_start, b_end)` SHALL overlap if and only if `a_start < b_end AND b_start < a_end` after normalization.

#### Scenario: Adjacent slots at 15-minute boundary

- **WHEN** interview A occupies `14:00-15:00` and the HR user proposes a slot at `15:00-16:00`
- **THEN** the conflict check SHALL NOT report a conflict because the ranges are adjacent but not overlapping

#### Scenario: Slot within same 15-minute window as existing interview

- **WHEN** interview A occupies `14:00-15:00` and the HR user proposes a slot at `14:07-15:07`
- **THEN** the API SHALL first reject the slot with HTTP `400` error `SLOT_NOT_ALIGNED` because the input is not 15-minute-aligned


<!-- @trace
source: interviewer-selection-at-invitation
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
-->

---
### Requirement: Interview creation synchronizes to meetings table

When the backend creates an `interviews` row via `POST /api/recruitment/interviews`, it SHALL within the same database transaction insert a corresponding `meetings` row with `type = 'interview'` and an `meeting_attendees` row linking the interviewer as organizer. Both writes MUST succeed or both MUST be rolled back.

#### Scenario: Interview created with mirrored meeting

- **WHEN** the HR user successfully schedules an interview for interviewer `42` with candidate `7` at `2026-04-21T14:00`
- **THEN** the system SHALL persist: (a) one `interviews` row with `interviewer_id=42`, (b) one `meetings` row with `type='interview'` and times matching the interview, (c) one `meeting_attendees` row with `employee_id=42` and `is_organizer=1` referencing the new meeting

#### Scenario: Meeting insert fails during transaction

- **WHEN** the `meetings` insert fails for any reason during interview creation
- **THEN** the entire transaction SHALL be rolled back and no `interviews` row SHALL remain


<!-- @trace
source: interviewer-selection-at-invitation
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
-->

---
### Requirement: Interview cancellation synchronizes meeting status

When an interview is cancelled (i.e., `interviews.cancelled_at` is set), the system SHALL update the corresponding mirrored `meetings` row's `status` to `cancelled` within the same database transaction.

#### Scenario: HR cancels a scheduled interview

- **WHEN** the HR user cancels interview `i1` which has a mirrored meeting `m1`
- **THEN** the system SHALL set `interviews.cancelled_at` to the cancellation timestamp AND set `meetings.status = 'cancelled'` for `m1` within a single transaction

#### Scenario: Legacy interview without mirrored meeting

- **WHEN** an interview row exists without a mirrored meeting (legacy data prior to this change)
- **THEN** the cancellation SHALL still succeed by updating only the `interviews` row, without raising a missing-meeting error


<!-- @trace
source: interviewer-selection-at-invitation
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
-->

---
### Requirement: Hard-block conflict policy on invitation and interview creation

Both `POST /api/recruitment/invitations` and `POST /api/recruitment/interviews` SHALL invoke the same conflict-check logic before writing. If any conflict is detected the endpoint MUST reject the write with HTTP `409` and a body `{ conflicts: [...] }`. The API MUST NOT provide a flag to override or bypass the conflict check.

#### Scenario: Invitation rejected due to conflict in all proposed slots

- **WHEN** every proposed slot in an invitation request conflicts with the interviewer's existing meetings or interviews
- **THEN** the system SHALL reject `POST /api/recruitment/invitations` with HTTP `409` and list all conflicts per slot; no invitation SHALL be created

#### Scenario: Invitation accepted when at least one slot is free

- **WHEN** a proposed-slot set contains some slots with conflicts and some without
- **THEN** the invitation SHALL be accepted (HTTP `201`) because the candidate will pick from the slots offered; the frontend is responsible for showing per-slot status before submission

#### Scenario: Final interview creation blocked by late-arriving conflict

- **WHEN** `POST /api/recruitment/interviews` is called and the chosen time now conflicts with a meeting added after the invitation was sent
- **THEN** the endpoint SHALL reject with HTTP `409` and the HR user SHALL be shown the conflict to resolve manually

<!-- @trace
source: interviewer-selection-at-invitation
updated: 2026-04-24
code:
  - bombus-system/openspec/changes/job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-employee-model/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/design.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/design.md
  - bombus-system/openspec/changes/unified-employee-management/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/tasks.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/specs/job-platform-publishing/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/proposal.md
  - bombus-system/openspec/changes/archive/2026-04-24-unified-employee-management/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/archive/2026-04-24-job-multi-platform-publishing/.openspec.yaml
  - bombus-system/openspec/changes/unified-employee-management/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/user-overview-lite/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/unified-employee-management/tasks.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/changes/unified-employee-management/specs/batch-employee-import/spec.md
  - bombus-system/openspec/changes/job-multi-platform-publishing/design.md
-->