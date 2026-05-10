# recruitment-referral Specification

## Purpose

TBD - created by syncing change 'recruitment-hr-initiated-referral'. Update Purpose after archive.

This capability covers HR-initiated referral invitations: HR creates a referral invitation tied to a published job and a recommender employee, the system returns a public referral link with a single-use 7-day token for HR to share manually (no system email), and candidates submit applications via that link. Submitted candidates are tagged with `reg_source='referral'` and surface recommender details in the candidate list.

## Requirements

### Requirement: HR initiates referral invitation from a published job

The system SHALL allow an HR user with `L1.recruitment.edit` permission to initiate a referral invitation from the detail row of any `published` job. The initiation form SHALL capture the recommender's employee number, the candidate's email, and an optional custom message. The system SHALL reject invitations where the job is not in `published` status. The system SHALL NOT send any email; the referral link SHALL be returned in the API response for HR to copy and share manually through external channels (email, IM, or other).

#### Scenario: Successful invitation creation returns referral link for manual sharing

- **WHEN** an HR user with `L1.recruitment.edit` permission submits the referral invitation form for a published job, providing a valid recommender employee number and a candidate email not already invited to the same job
- **THEN** the system SHALL create one `referral_invitations` row with `status='pending'`, generate a UUIDv4 token, set `expires_at` to 7 days from creation, and return HTTP 201 with `{ invitationId, referralLink }` where `referralLink` is the absolute URL `<FRONTEND_URL>/public/referral/<token>` for HR to share

#### Scenario: Reject invitation for non-published job

- **WHEN** an HR user submits a referral invitation for a job with status `draft`, `closed`, or any value other than `published`
- **THEN** the system SHALL return HTTP 400 with an error message indicating the job is not open for referrals and SHALL NOT create any invitation record

#### Scenario: Reject invitation without edit permission

- **WHEN** a user without `L1.recruitment.edit` permission attempts to POST `/api/recruitment/referrals`
- **THEN** the system SHALL return HTTP 403 and SHALL NOT create any invitation record


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: Recommender employee number is validated against active employees

When an HR user provides a recommender employee number, the system SHALL validate that an employee with that number exists within the current tenant and has `status='active'` in the `employees` table. The system SHALL return the recommender's full name for HR confirmation during form entry.

#### Scenario: Valid active employee number resolves to name preview

- **WHEN** an HR user types a recommender employee number that matches an employee whose `employees.status='active'` in the current tenant
- **THEN** the system SHALL respond with HTTP 200 containing the employee identifier and full name for UI preview

#### Scenario: Inactive or non-existent employee number is rejected

- **WHEN** an HR user submits a referral invitation with an employee number that does not exist in the current tenant, or belongs to an employee whose `employees.status` is not `'active'`
- **THEN** the system SHALL return HTTP 400 with an error identifying the employee number as invalid and SHALL NOT create any invitation record


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: Duplicate pending invitations for the same job and email are prevented

The system SHALL enforce that at most one `referral_invitations` row with `status='pending'` exists per `(job_id, candidate_email)` combination within a tenant. Invitations with status `submitted`, `cancelled`, or `expired` SHALL NOT block new invitations for the same combination.

#### Scenario: Second pending invitation is rejected

- **WHEN** an HR user submits a referral invitation for a `(job_id, candidate_email)` combination that already has a pending invitation in the same tenant
- **THEN** the system SHALL return HTTP 409 with an error indicating a pending invitation already exists and SHALL NOT create a second record

#### Scenario: Re-invitation after cancellation is allowed

- **WHEN** an HR user submits a new referral invitation for a `(job_id, candidate_email)` combination whose previous invitation has `status='cancelled'`, `status='submitted'`, or `status='expired'`
- **THEN** the system SHALL create a new invitation record with `status='pending'` and a fresh token


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: Referral token is single-use with 7-day expiration

Each referral token SHALL be valid for exactly 7 days from invitation creation and SHALL be consumed on successful candidate submission. The system SHALL reject access attempts to expired, cancelled, or already-submitted tokens.

#### Scenario: Active token resolves invitation context

- **WHEN** a candidate requests `GET /api/public/referrals/:token` within 7 days of creation, and the invitation status is `pending`
- **THEN** the system SHALL return HTTP 200 with the job title, job department, recommender full name, and custom message

#### Scenario: Expired token is rejected

- **WHEN** a candidate requests any endpoint with a token whose invitation `expires_at` is earlier than the current server time
- **THEN** the system SHALL update the invitation status to `expired`, return HTTP 410 Gone, and SHALL NOT expose any job or recommender information

#### Scenario: Already-submitted token cannot be reused

- **WHEN** a candidate POSTs `/api/public/referrals/:token/submit` with a token whose invitation `status` is `submitted`
- **THEN** the system SHALL return HTTP 410 Gone with a message indicating the invitation has already been completed


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: Public referral intake page validates token and preloads recommender context

The system SHALL serve a public page at `/public/referral/:token` that requires no login. The page SHALL pre-validate the token via a route guard and display the job title, recommender name, and custom message above the candidate form. The form SHALL reuse the existing candidate application fields used by HR when manually creating a candidate.

#### Scenario: Valid token loads intake page

- **WHEN** a candidate navigates to `/public/referral/:token` with an active token
- **THEN** the page SHALL display the job title, department, recommender full name, optional custom message, and the candidate application form with the candidate's email pre-filled and non-editable

#### Scenario: Invalid token redirects to error page

- **WHEN** a candidate navigates to `/public/referral/:token` where the token is expired, cancelled, already submitted, or unknown
- **THEN** the page SHALL redirect to `/public/referral-invalid` and display a message corresponding to the specific failure reason


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: Candidate submission creates candidate record and marks referral source

When a candidate completes and submits the intake form, the system SHALL create a `candidates` row with `reg_source='referral'` and `source_detail` containing the invitation identifier, recommender employee number, and recommender full name as captured at submission time. The system SHALL update the invitation to `status='submitted'`, record `submitted_at`, and link `submitted_candidate_id` to the new candidate row.

#### Scenario: Successful candidate submission

- **WHEN** a candidate submits the intake form with valid field values and an active token
- **THEN** the system SHALL create a `candidates` row with `reg_source='referral'` and `source_detail` JSON containing `{invitation_id, recommender_employee_no, recommender_name}`, update the invitation to `submitted`, and return HTTP 200

#### Scenario: Email already applied to same job is rejected

- **WHEN** a candidate submits the intake form and a `candidates` row with the same email and same `job_id` already exists and is active in the tenant
- **THEN** the system SHALL return HTTP 409, mark the invitation as `cancelled` with reason `duplicate`, and notify the originating HR user


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: Invitation link is retrievable and copyable from HR interface for manual distribution

The system SHALL NOT send any email. The referral link SHALL be available to HR through two paths: (1) the HTTP 201 response body of the create-invitation endpoint, and (2) the invitation list endpoint for previously created invitations. The HR interface SHALL provide a visible copy-to-clipboard action on each pending invitation.

#### Scenario: Create response contains referral link

- **WHEN** `POST /api/recruitment/referrals` succeeds
- **THEN** the response body SHALL include `referralLink` as an absolute URL of the form `<FRONTEND_URL>/public/referral/<token>`

#### Scenario: List response exposes referral link for pending and expired invitations

- **WHEN** an HR user requests `GET /api/recruitment/referrals?job_id=<id>`
- **THEN** the response SHALL include `referralLink` in each invitation object whose status is `pending` or `expired`, and SHALL NOT include `referralLink` for invitations whose status is `submitted` or `cancelled`


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: HR can cancel a pending referral invitation

The system SHALL allow an HR user with `L1.recruitment.edit` permission to cancel a referral invitation whose status is `pending`. Cancellation SHALL set the invitation status to `cancelled` and invalidate the token. The system SHALL reject cancellation attempts on invitations that are not in `pending` status.

#### Scenario: Successful cancellation of pending invitation

- **WHEN** an HR user POSTs to `/api/recruitment/referrals/:id/cancel` for an invitation with `status='pending'`
- **THEN** the system SHALL update the invitation status to `cancelled`, invalidate the token, and return HTTP 200

#### Scenario: Cancellation of non-pending invitation is rejected

- **WHEN** an HR user attempts to cancel an invitation whose status is `submitted`, `cancelled`, or `expired`
- **THEN** the system SHALL return HTTP 409 with a message indicating the invitation cannot be cancelled in its current state


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: HR can renew a pending or expired referral invitation to extend expiry

The system SHALL provide a renew action that resets `expires_at` to 7 days from the current time, preserves the existing token, and is available for invitations whose status is `pending` or `expired`. For `expired` invitations, renew SHALL also reset the status back to `pending`. Renew SHALL NOT be allowed when status is `submitted` or `cancelled`. The renew response SHALL include the refreshed `referralLink` so HR can re-share it if needed.

#### Scenario: Successful renew of pending invitation

- **WHEN** an HR user with `L1.recruitment.edit` permission POSTs to `/api/recruitment/referrals/:id/renew` for an invitation with `status='pending'`
- **THEN** the system SHALL update `expires_at` to the current time plus 7 days, keep the same token, and return HTTP 200 with the refreshed `referralLink`

#### Scenario: Successful renew of expired invitation resets status to pending

- **WHEN** an HR user renews an invitation whose status is `expired`
- **THEN** the system SHALL update `status` to `pending`, update `expires_at` to the current time plus 7 days, keep the same token, and return HTTP 200 with the refreshed `referralLink`

#### Scenario: Renew of submitted or cancelled invitation is rejected

- **WHEN** an HR user attempts to renew an invitation whose status is `submitted` or `cancelled`
- **THEN** the system SHALL return HTTP 409 with a message indicating the invitation cannot be renewed in its current state


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: HR can list referral invitations for a job

The system SHALL provide a list endpoint that returns all referral invitations for a given job, filtered optionally by status. The response SHALL include invitation metadata, recommender display name, candidate email, created/submitted timestamps, and linked candidate identifier when submitted.

#### Scenario: List invitations by job

- **WHEN** an HR user with `L1.recruitment.view` permission requests `GET /api/recruitment/referrals?job_id=<id>`
- **THEN** the system SHALL return an array of invitation objects for that job in the current tenant, sorted by `created_at` descending

#### Scenario: List invitations filtered by status

- **WHEN** an HR user requests `GET /api/recruitment/referrals?job_id=<id>&status=pending`
- **THEN** the system SHALL return only invitations whose status matches the filter value


<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->

---
### Requirement: Candidate list displays referral source with recommender details

The candidate list page SHALL display a visual source badge on each candidate row indicating the candidate origin (`referral`, `104`, `manual`, or other). For candidates with `reg_source='referral'`, the badge SHALL be hoverable to reveal the recommender's full name and employee number from `source_detail`.

#### Scenario: Referral candidate shows recommender on hover

- **WHEN** an HR user hovers over the source badge of a candidate whose `reg_source='referral'` and whose `source_detail` contains `recommender_employee_no` and `recommender_name`
- **THEN** the UI SHALL display a tooltip showing the recommender's full name and employee number

#### Scenario: Non-referral candidate shows static source badge

- **WHEN** an HR user views the source badge of a candidate whose `reg_source` is `104` or `manual` or any value other than `referral`
- **THEN** the UI SHALL display a static badge with the corresponding label and no recommender tooltip

<!-- @trace
source: recruitment-hr-initiated-referral
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/changes/department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/department-template-import/tasks.md
  - bombus-system/openspec/changes/department-template-import/proposal.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/recruitment-referral/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/design.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/tasks.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/proposal.md
  - bombus-system/openspec/changes/department-template-import/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/specs/tenant-management/spec.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/archive/2026-05-10-department-template-import/.openspec.yaml
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/department-template-import/specs/industry-classification/spec.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
-->