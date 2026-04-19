# approved-salary-field Specification

## Purpose

TBD - created by archiving change 'split-interview-decision-pages'. Update Purpose after archive.

## Requirements

### Requirement: Approved salary columns on candidates table

The `candidates` table SHALL be extended with three columns: `approved_salary_type` (INTEGER, nullable, allowed values: 10=面議, 50=月薪, 60=年薪), `approved_salary_amount` (INTEGER, nullable, currency value in tenant's default currency), `approved_salary_out_of_range` (INTEGER, 0 or 1, default 0).

#### Scenario: Migration adds columns to existing tenants

- **WHEN** an existing tenant database is loaded and the `candidates` table lacks the three salary columns
- **THEN** migration `0003_add_decision_fields` SHALL add the columns with default values (`NULL` for type/amount, `0` for out_of_range flag)

#### Scenario: New tenant schema includes salary columns

- **WHEN** a new tenant database is initialized
- **THEN** the `candidates` CREATE TABLE statement SHALL include the three salary columns


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
### Requirement: Jobs grade column for salary range resolution

The `jobs` table SHALL be extended with a `grade` column (INTEGER, nullable, FOREIGN KEY REFERENCES `grade_levels(grade)`). The job management UI SHALL expose a grade selector when creating or editing a job. The decision page SHALL resolve salary range via: `SELECT MIN(salary) AS salary_low, MAX(salary) AS salary_high FROM grade_salary_levels WHERE grade = :job.grade AND (org_unit_id = :candidate.org_unit_id OR org_unit_id IS NULL)`.

#### Scenario: Migration adds grade column to jobs

- **WHEN** an existing tenant database is loaded and the `jobs` table lacks the `grade` column
- **THEN** the idempotent migration `0003_add_decision_fields` SHALL add the `grade` column with default NULL

#### Scenario: New tenant schema includes jobs.grade

- **WHEN** a new tenant database is initialized
- **THEN** the `jobs` CREATE TABLE SHALL include `grade INTEGER REFERENCES grade_levels(grade)`

#### Scenario: Job without grade shows absent range

- **WHEN** a candidate's job has `grade IS NULL`
- **THEN** the decision page SHALL display "此職缺未設定職等，無薪資範圍參考"; the salary amount input SHALL remain enterable but SHALL NOT trigger out-of-range warning on submit; `approved_salary_out_of_range` SHALL be persisted as 0

#### Scenario: Salary range API endpoint

- **WHEN** the decision page component loads a selected candidate
- **THEN** the backend `GET /api/recruitment/candidates/:id/salary-range` SHALL return `{ grade, grade_title, salary_low, salary_high, has_range }` where `has_range = false` when grade is null or no matching `grade_salary_levels` exist


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
### Requirement: Decision page salary input with range reference

When the user selects "已錄取" in the decision form, the page SHALL display two inputs: a salary type selector (下拉 月薪/年薪) and a numeric amount input. The page SHALL call `GET /api/recruitment/candidates/:id/salary-range` and display the resolved range from `grade_salary_levels` below the amount input.

#### Scenario: Salary inputs appear when offered

- **WHEN** a user selects decision = 已錄取 (Offered) on the decision form
- **THEN** the salary type selector and amount input SHALL become visible; when 未錄取 is selected, they SHALL be hidden

#### Scenario: Range reference label displayed when job has grade

- **WHEN** the salary range API returns `has_range = true`
- **THEN** a helper text SHALL display "職缺職等：{grade_title}；薪資範圍 {salary_low} ~ {salary_high}" below the amount input

#### Scenario: Range absent when job grade is null

- **WHEN** the salary range API returns `has_range = false` with reason `no_grade`
- **THEN** the helper text SHALL display "此職缺未設定職等，無薪資範圍參考"; the amount input SHALL still accept values

#### Scenario: Range absent when grade has no salary levels

- **WHEN** the salary range API returns `has_range = false` with reason `no_salary_levels`
- **THEN** the helper text SHALL display "此職等未設定薪資層級"; the amount input SHALL still accept values


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
### Requirement: Out-of-range warning without blocking submission

When the entered `approved_salary_amount` falls outside the resolved `[salary_low, salary_high]` range computed from `grade_salary_levels` for the job's grade, the page SHALL display a warning indicator (yellow background on the amount input and a warning message) but SHALL NOT disable or block the "送交簽核" action. The submission SHALL set `approved_salary_out_of_range = 1` in the persisted record when the amount falls outside the resolved range.

#### Scenario: Amount below resolved minimum

- **WHEN** the user enters `approved_salary_amount < salary_low` and `has_range = true`
- **THEN** a warning text "低於職等薪資下限" SHALL display and the input SHALL carry a warning style class; the "送交簽核" button SHALL remain enabled

#### Scenario: Amount above resolved maximum

- **WHEN** the user enters `approved_salary_amount > salary_high` and `has_range = true`
- **THEN** a warning text "高於職等薪資上限" SHALL display with warning style; the "送交簽核" button SHALL remain enabled

#### Scenario: Out-of-range flag persisted

- **WHEN** HR submits a decision with an out-of-range amount and the job has a resolvable grade range
- **THEN** the server SHALL re-compute the range from `grade_salary_levels` server-side (not trust client-sent flag) and persist `approved_salary_out_of_range = 1` alongside the amount

#### Scenario: In-range amount flag cleared

- **WHEN** HR submits with an amount within `[salary_low, salary_high]`
- **THEN** the server SHALL set `approved_salary_out_of_range = 0`

#### Scenario: No range available skips flag

- **WHEN** the job's grade is NULL or the grade has no `grade_salary_levels` rows
- **THEN** the server SHALL persist `approved_salary_out_of_range = 0` regardless of the amount value, and the submission SHALL succeed without warning


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
### Requirement: Salary validation on submit-approval endpoint

`POST /api/recruitment/candidates/:id/submit-approval` SHALL validate: when `decision = 'Offered'`, both `approved_salary_type` and `approved_salary_amount` MUST be present; `approved_salary_type` MUST be in {10, 50, 60}; `approved_salary_amount` MUST be a positive integer. Out-of-range amounts SHALL NOT be rejected but SHALL flag the record.

#### Scenario: Reject invalid salary type

- **WHEN** request body has `decision: 'Offered'` and `approved_salary_type = 99`
- **THEN** the system SHALL return HTTP 400 with validation error listing allowed values

#### Scenario: Reject non-positive amount

- **WHEN** request body has `approved_salary_amount = 0` or negative
- **THEN** the system SHALL return HTTP 400

#### Scenario: Accept out-of-range amount with flag

- **WHEN** request body has valid type and a positive amount outside job's range
- **THEN** the system SHALL accept the request and set `approved_salary_out_of_range = 1`


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
### Requirement: Approved salary display on approval and onboarding views

Once approval is complete, the decision page and onboarding page SHALL display the approved salary. The format SHALL be `{amount} / {type label}` (e.g., "60000 / 月薪"); if `approved_salary_out_of_range = 1`, an additional badge "超出職缺範圍" SHALL render next to the amount.

#### Scenario: Decision page shows approved salary after approval

- **WHEN** a candidate has `approval_status = 'APPROVED'` and `approved_salary_amount` is set
- **THEN** the decision page SHALL display the salary in the approval result block

#### Scenario: Out-of-range badge displayed

- **WHEN** the displayed salary has `approved_salary_out_of_range = 1`
- **THEN** a "超出職缺範圍" badge SHALL render adjacent to the amount with warning-colored styling

#### Scenario: Onboarding page reads approved salary

- **WHEN** a candidate is converted via `POST /api/hr/onboarding/convert-candidate`
- **THEN** the employee record SHALL store the approved salary (if columns exist on employees) or the approved salary SHALL be accessible via the candidate reference for reporting

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