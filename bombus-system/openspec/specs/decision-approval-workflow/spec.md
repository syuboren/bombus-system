# decision-approval-workflow Specification

## Purpose

TBD - created by archiving change 'split-interview-decision-pages'. Update Purpose after archive.

## Requirements

### Requirement: Invitation decisions approval status columns

The `invitation_decisions` table SHALL be extended with five columns to track the approval workflow: `approval_status` (TEXT, default `'NONE'`, allowed values: `NONE`, `PENDING`, `APPROVED`, `REJECTED`), `approver_id` (TEXT, nullable, foreign key to `users.id`), `approved_at` (DATETIME, nullable), `approval_note` (TEXT, nullable, stores rejection reason or approval comment), `submitted_for_approval_at` (DATETIME, nullable).

#### Scenario: Migration adds columns to existing tenants

- **WHEN** an existing tenant database is loaded and the `invitation_decisions` table lacks the five approval columns
- **THEN** the idempotent migration `0003_add_decision_fields` SHALL add the columns with default values and SHALL NOT modify existing rows beyond setting defaults

#### Scenario: New tenant schema includes approval columns

- **WHEN** a new tenant database is initialized
- **THEN** the `invitation_decisions` CREATE TABLE statement in `tenant-schema.js` SHALL include the five approval columns

#### Scenario: Existing decision rows preserved with default status

- **WHEN** migration runs against a tenant with existing `invitation_decisions` rows
- **THEN** each row's `approval_status` SHALL default to `'NONE'`; downstream queries SHALL treat `NONE` as equivalent to "legacy decision without approval" and exempt from approval checks


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
### Requirement: Submit decision for approval endpoint

The system SHALL provide `POST /api/recruitment/candidates/:id/submit-approval` that transitions a candidate from `pending_decision` to `pending_approval`. The request body SHALL include `decision` (`'Offered'` | `'Rejected'`), `decision_reason` (string), and if `Offered`: `approved_salary_type` (10/50/60) and `approved_salary_amount` (integer). The endpoint SHALL require `L1.decision` edit permission. The endpoint SHALL create or update an `invitation_decisions` row associated with the candidate, setting `approval_status = 'PENDING'` and `submitted_for_approval_at = NOW()`.

#### Scenario: HR submits offered decision for approval

- **WHEN** a user with edit permission on `L1.decision` calls the endpoint for a candidate with status `pending_decision`, passing `decision: 'Offered'` and valid salary fields
- **THEN** the system SHALL update the candidate's status to `pending_approval`, write `approved_salary_type` and `approved_salary_amount` to `candidates`, create or update the latest `invitation_decisions` row with `decision`, `reason = decision_reason`, `submitted_for_approval_at = NOW()`, `approval_status = 'PENDING'`

#### Scenario: HR submits rejected decision for approval

- **WHEN** a user submits `decision: 'Rejected'` with `decision_reason`
- **THEN** the system SHALL update candidate status to `pending_approval`; `invitation_decisions.approval_status` SHALL be `'PENDING'`; `candidates.approved_salary_type/amount/out_of_range` SHALL remain null

#### Scenario: Submit rejected when status is not pending_decision

- **WHEN** a user calls the endpoint for a candidate whose status is not `pending_decision`
- **THEN** the system SHALL return HTTP 409 with a message indicating the candidate is not ready for approval submission

#### Scenario: Missing salary on offered decision

- **WHEN** a user submits `decision: 'Offered'` without `approved_salary_amount` or `approved_salary_type`
- **THEN** the system SHALL return HTTP 400 with a validation error


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
### Requirement: Approve decision endpoint

The system SHALL provide `POST /api/recruitment/candidates/:id/approve` that transitions a candidate from `pending_approval` to `offered` (if decision was `Offered`) or `not_hired` (if decision was `Rejected`). The endpoint SHALL require the caller's role to be `subsidiary_admin` or `super_admin`. The request body SHALL accept an optional `approval_note`; when omitted the field SHALL remain null.

#### Scenario: Subsidiary admin approves offered decision

- **WHEN** a subsidiary_admin calls the approve endpoint for a candidate with status `pending_approval` whose latest `invitation_decisions.decision` is `Offered`
- **THEN** the system SHALL update candidate status to `offered`, set `invitation_decisions.approval_status = 'APPROVED'`, `approver_id = current_user.id`, `approved_at = NOW()`, and generate `response_token` with `reply_deadline` for the offer response link

#### Scenario: Subsidiary admin approves rejected decision

- **WHEN** a subsidiary_admin approves a candidate whose decision was `Rejected`
- **THEN** the system SHALL update candidate status to `not_hired`, `invitation_decisions.approval_status = 'APPROVED'`, and set `approver_id`, `approved_at` accordingly

#### Scenario: Non-approver role rejected

- **WHEN** a user whose role is neither `subsidiary_admin` nor `super_admin` calls the approve endpoint
- **THEN** the system SHALL return HTTP 403 with a message indicating insufficient approval authority

#### Scenario: Approve candidate not in pending approval state

- **WHEN** an authorized user calls the approve endpoint for a candidate with status ≠ `pending_approval`
- **THEN** the system SHALL return HTTP 409


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
### Requirement: Reject approval endpoint

The system SHALL provide `POST /api/recruitment/candidates/:id/reject-approval` that sends a candidate back from `pending_approval` to `pending_decision`. The endpoint SHALL require `subsidiary_admin` or `super_admin` role and SHALL require `approval_note` in the body (rejection reason). Rejection SHALL be permitted unlimited times.

#### Scenario: Rejection records reason and resets status

- **WHEN** a subsidiary_admin calls the reject endpoint with `approval_note: "薪資超過核准上限"`
- **THEN** the system SHALL update candidate status to `pending_decision`, `invitation_decisions.approval_status = 'REJECTED'`, `approval_note` SHALL store the reason, `approver_id` and `approved_at` SHALL record the rejector

#### Scenario: HR can resubmit after rejection

- **WHEN** HR modifies the decision and calls submit-approval again on a candidate previously rejected
- **THEN** the system SHALL accept the resubmission; `approval_status` SHALL transition back to `'PENDING'`; the prior `approval_note` SHALL be preserved through `audit_logs` entries, while the current `invitation_decisions.approval_note` SHALL be cleared to null upon resubmission

#### Scenario: Rejection without reason

- **WHEN** a subsidiary_admin calls reject-approval without `approval_note` or with empty string
- **THEN** the system SHALL return HTTP 400 with a validation error


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
### Requirement: Candidate status machine extended with pending_approval

The `CandidateStatus` type SHALL include `pending_approval` between `pending_decision` and `offered`. The status flow SHALL be: `interview → pending_ai → pending_decision → pending_approval → offered → offer_accepted | offer_declined → onboarded`, with `pending_approval → pending_decision` allowed via rejection.

#### Scenario: Status badge displays 簽核中 for pending_approval

- **WHEN** a candidate has status `pending_approval`
- **THEN** any status badge rendering SHALL display text "簽核中" with a modifier class distinct from `pending_decision`

#### Scenario: Onboarding trigger waits for approval

- **WHEN** a candidate accepts the offer (status `offer_accepted`)
- **THEN** the employee_onboarding-automation conversion flow SHALL proceed; the approval history SHALL be preserved on the resulting employee record for audit


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
### Requirement: Approval audit trail

The system SHALL emit audit log entries for each approval state transition, capturing `candidate_id`, `from_status`, `to_status`, `actor_user_id`, `actor_role`, `approval_note`, and `timestamp`. The audit entries SHALL follow the existing audit-logging capability schema.

#### Scenario: Submit approval logged

- **WHEN** HR calls submit-approval
- **THEN** an audit entry SHALL be created with action `candidate.submit_approval`

#### Scenario: Approval and rejection logged

- **WHEN** subsidiary_admin calls approve or reject-approval
- **THEN** audit entries SHALL be created with actions `candidate.approve` or `candidate.reject_approval` respectively, including `approval_note` in the metadata


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
### Requirement: Candidate list endpoint preloads approval actor metadata

The candidate list endpoint `GET /api/recruitment/candidates` SHALL preload approval actor metadata so the decision page can render approver and submitter information without a separate detail fetch. The response SHALL include the following computed columns for each candidate row: `approver_name` (joined from `users.name` via the latest `invitation_decisions.approver_id`), `decided_by_name` (joined from `users.name` via `invitation_decisions.decided_by`), `decision_reason` (from `invitation_decisions.reason`), `decision_type` (from `invitation_decisions.decision`, valued `'Offered'` or `'Rejected'`), and `latest_interview_at` (from the latest row of `interviews` for that candidate).

#### Scenario: Approver name surfaces on list response

- **WHEN** a client calls `GET /api/recruitment/candidates` for a candidate whose latest `invitation_decisions` row has `approval_status = 'APPROVED'`
- **THEN** the response row SHALL include `approver_name` equal to `users.name` where `users.id = invitation_decisions.approver_id`; null when `approver_id` is null

#### Scenario: Decision reason and type preloaded for rejected candidates

- **WHEN** a client fetches the candidate list after a rejection (`approval_status = 'REJECTED'`, candidate status back to `pending_decision`)
- **THEN** each affected row SHALL expose `decision_reason`, `decision_type`, and salary fields (`approved_salary_type`, `approved_salary_amount`) from the most recent `invitation_decisions` and `candidates` rows so the UI can prefill the resubmit form without an additional detail fetch

#### Scenario: Latest interview time preloaded

- **WHEN** a client fetches the candidate list
- **THEN** each row SHALL include `latest_interview_at` taken from `(SELECT iv.interview_at FROM interviews iv WHERE iv.candidate_id = c.id ORDER BY iv.interview_at DESC LIMIT 1)`; null when the candidate has no scheduled interviews


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
### Requirement: Interview page lock deferred to decision submission

The AI interview page (`/employee/recruitment`) SHALL remain fully editable while a candidate's status is `interview`, `pending_ai`, or `pending_decision`. The page SHALL only enter read-only mode once the candidate reaches `pending_approval` or later (i.e., HR has formally submitted for approval). This replaces the earlier behavior that locked the page at `pending_decision`.

#### Scenario: Scoring editable after evaluation save

- **WHEN** HR saves the interviewer scoring form and the candidate status transitions to `pending_ai`
- **THEN** the AI interview page SHALL continue to allow edits to the scoring modal, media uploads, and AI analysis triggers; no "已鎖定" badge SHALL display

#### Scenario: Scoring editable after AI analysis completion

- **WHEN** AI analysis completes and the candidate status transitions to `pending_decision`
- **THEN** the AI interview page SHALL remain editable; a non-blocking hint card SHALL indicate the candidate is ready for decision (with a link to `/employee/decision` if the user has `L1.decision` permission)

#### Scenario: Lock engages on approval submission

- **WHEN** HR submits the decision for approval and status transitions to `pending_approval`
- **THEN** the AI interview page SHALL enter full read-only mode for this candidate; a handoff notice SHALL display indicating the decision has been submitted for sign-off

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