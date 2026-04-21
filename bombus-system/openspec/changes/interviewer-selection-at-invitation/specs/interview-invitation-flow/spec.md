## ADDED Requirements

### Requirement: Interviewer selection at invitation time

The system SHALL require the HR user to select an interviewer when sending a candidate interview invitation. The invitation MUST NOT be created without an `interviewer_id` referencing an active employee in the `employees` table of the current tenant.

#### Scenario: HR creates invitation with valid interviewer

- **WHEN** an HR user submits `POST /api/recruitment/invitations` with a valid `interviewerId`, `candidateId`, `jobId`, and one or more `proposedSlots`
- **THEN** the system SHALL persist the invitation with `interviewer_id` set to the provided employee ID and return HTTP `201` with the invitation payload

#### Scenario: HR submits invitation without interviewer

- **WHEN** an HR user submits `POST /api/recruitment/invitations` without `interviewerId` or with `interviewerId` that does not match any active employee in the current tenant
- **THEN** the system SHALL reject the request with HTTP `400` and an error code `INTERVIEWER_REQUIRED` or `INTERVIEWER_INVALID`

#### Scenario: Legacy client sends invitation without interviewer field

- **WHEN** a legacy client calls `POST /api/recruitment/invitations` omitting `interviewerId`
- **THEN** the system SHALL NOT silently accept the request and SHALL return HTTP `400`

### Requirement: Interviewer dropdown sourced from active employees

The invite-candidate modal SHALL populate the interviewer dropdown by calling `GET /api/employee/list?status=active`. The dropdown MUST display each option with the format `{name} | {department} | {title}`. By default the list SHALL be filtered to employees whose department matches the job's department; the UI MUST provide a toggle to remove the department filter and show all active employees.

#### Scenario: Default load filters by job department

- **WHEN** the invite-candidate modal opens for a job whose department is `Engineering`
- **THEN** the dropdown SHALL show only active employees from the `Engineering` department, formatted as `{name} | {department} | {title}`

#### Scenario: HR removes department filter

- **WHEN** the HR user clicks the "Show all departments" toggle
- **THEN** the dropdown SHALL refresh to include all active employees across all departments

#### Scenario: Department has no active employees

- **WHEN** the job's department contains zero active employees
- **THEN** the dropdown SHALL automatically fall back to showing all active employees and SHALL display an informational hint "No active employees in the job's department; showing all employees"

### Requirement: Proposed slots use 15-minute granularity

Time inputs used to define proposed interview slots and final interview times SHALL accept only values aligned to 15-minute boundaries. The frontend MUST set `step="900"` on `datetime-local` inputs; the backend MUST reject any timestamp not aligned to a 15-minute boundary with HTTP `400`.

#### Scenario: HR picks a 15-minute-aligned slot

- **WHEN** the HR user selects `2026-04-21T14:15` in the proposed slot input
- **THEN** the system SHALL accept the value and persist it unchanged

#### Scenario: API receives a non-aligned timestamp

- **WHEN** a client submits `2026-04-21T14:07` as a proposed slot or interview time
- **THEN** the API SHALL reject the request with HTTP `400` and an error code `SLOT_NOT_ALIGNED`

### Requirement: Per-slot conflict indicator in invite modal

The invite-candidate modal SHALL display a visual indicator next to each proposed slot showing whether the selected interviewer is available at that slot. When the interviewer or any slot changes, the UI MUST call `POST /api/recruitment/interviews/check-conflicts` (debounced by 300ms) and render per-slot status as either `Available` or `Conflict` with a short reason (e.g., "Interviewer has meeting 'Sprint Review'").

#### Scenario: All slots available

- **WHEN** the selected interviewer has no conflicts in any proposed slot
- **THEN** each slot row SHALL display an `Available` indicator

#### Scenario: One slot conflicts with an existing meeting

- **WHEN** one proposed slot overlaps with a meeting in `meetings` where the interviewer is an attendee
- **THEN** that specific slot row SHALL display a `Conflict` indicator with the meeting title as the reason, while other slots retain their own status

#### Scenario: Slot conflicts with candidate's other interview

- **WHEN** one proposed slot overlaps with another interview where the same candidate is scheduled
- **THEN** that slot row SHALL display a `Conflict` indicator with reason "Candidate has another interview"

### Requirement: Schedule interview modal displays interviewer read-only

The schedule-interview modal (used after the candidate replies with a chosen slot) SHALL display the interviewer as read-only text. The modal MUST NOT include an interviewer dropdown or allow the interviewer to be changed at this stage. The displayed interviewer SHALL be the one persisted on the invitation record.

#### Scenario: HR opens schedule modal after candidate reply

- **WHEN** the HR user opens the schedule-interview modal for a candidate who has accepted an invitation
- **THEN** the modal SHALL show the interviewer's name, department, and title as read-only text, with no dropdown control

#### Scenario: Invitation has no interviewer (legacy data)

- **WHEN** the invitation record has `interviewer_id = NULL` (legacy row prior to migration)
- **THEN** the modal SHALL display "Interviewer not yet assigned - please reissue invitation" and the confirm button SHALL be disabled

### Requirement: Final-stage conflict verification before scheduling

Before creating the `interviews` record via `POST /api/recruitment/interviews`, the backend SHALL re-verify that the selected interview time does not conflict with any existing interview, cancelled interview, or meeting involving the same interviewer or candidate. If a conflict is detected the system MUST reject the request with HTTP `409` and a payload listing the conflicting items.

#### Scenario: Final time is still free

- **WHEN** the HR user confirms a final interview time that has no conflict for the interviewer or candidate
- **THEN** the system SHALL create the `interviews` row and return HTTP `201`

#### Scenario: Conflict appeared between invite and schedule

- **WHEN** a new meeting was added to the interviewer's calendar after the invitation was sent but before the HR user confirms the final schedule, and the chosen slot overlaps with that meeting
- **THEN** the system SHALL reject `POST /api/recruitment/interviews` with HTTP `409` and a payload `{ conflicts: [{ type: "meeting", id, title, start_time, end_time }] }`
