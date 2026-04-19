# interview-decision-page Specification

## Purpose

TBD - created by archiving change 'split-interview-decision-pages'. Update Purpose after archive.

## Requirements

### Requirement: Decision page route and navigation

The system SHALL provide a dedicated decision page at `/employee/decision` under the L1 employee module. The page SHALL be registered in `employee.routes.ts` as a lazy-loaded standalone component. A sidebar menu item labeled "面試決策" SHALL appear in the L1 module section between "AI智能面試" and "人才庫與再接觸管理" when the current user has view or edit permission on `L1.decision`.

#### Scenario: Authorized user sees decision menu item

- **WHEN** a user with `action_level = 'edit'` or `action_level = 'view'` on `L1.decision` loads the sidebar
- **THEN** the sidebar SHALL display "面試決策" under L1 員工管理, linking to `/employee/decision`

#### Scenario: Unauthorized user cannot access decision page

- **WHEN** a user with `action_level = 'none'` on `L1.decision` attempts to navigate to `/employee/decision`
- **THEN** the route guard SHALL redirect to `/dashboard` and the sidebar SHALL NOT show the "面試決策" item

#### Scenario: Decision page loads candidate list on activation

- **WHEN** an authorized user navigates to `/employee/decision`
- **THEN** the page SHALL call `GET /api/recruitment/candidates` filtered to statuses `pending_decision`, `pending_approval`, `offered`, `offer_accepted`, `offer_declined`, `onboarded`, `not_hired`


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
### Requirement: Decision page candidate sidebar with status tabs

The decision page SHALL display a candidate list sidebar with three status tabs: `全部`, `待決策`, `已決策`. The `待決策` tab SHALL include candidates with status `pending_decision` or `pending_approval`. The `已決策` tab SHALL include candidates with status `offered`, `offer_accepted`, `offer_declined`, `onboarded`, or `not_hired`.

#### Scenario: Filter by waiting decision tab

- **WHEN** a user clicks the "待決策" tab
- **THEN** the list SHALL show only candidates with status `pending_decision` or `pending_approval`

#### Scenario: Filter by decided tab

- **WHEN** a user clicks the "已決策" tab
- **THEN** the list SHALL show only candidates with status in {`offered`, `offer_accepted`, `offer_declined`, `onboarded`, `not_hired`}

#### Scenario: Search by name or position

- **WHEN** a user types in the search input
- **THEN** the list SHALL filter candidates whose `name` or `position` contains the query (case-insensitive)


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
### Requirement: Decision page main content sections

When a candidate is selected, the decision page main area SHALL display six sections in order: (1) candidate profile header, (2) job details block, (3) interviewer scoring (read-only), (4) AI quantitative analysis (read-only), (5) hire decision form, (6) approval status and offer response link.

#### Scenario: Job details block shows required fields

- **WHEN** a candidate is selected on the decision page
- **THEN** the job details block SHALL display: job grade title (from `grade_levels.title_management` or `title_professional` looked up via `jobs.grade`), salary range resolved from `grade_salary_levels` (MIN/MAX salary for that grade within the candidate's `org_unit_id` scope), candidate's expected salary (`candidates.expected_salary`), and JD summary (first 200 chars of `jobs.description`)

#### Scenario: Job without grade shows fallback

- **WHEN** a selected candidate's job has `grade IS NULL`
- **THEN** the job details block SHALL display "未設定職等" in the grade field and "無薪資範圍" in the range field, while still showing expected salary and JD summary

#### Scenario: Interview scoring displayed read-only

- **WHEN** a candidate is selected on the decision page
- **THEN** the interviewer scoring block SHALL display total score, recommendation (Pass/Hold/Reject), and per-item scores from `candidates.evaluation.scoringItems`, with no edit controls visible

#### Scenario: AI analysis displayed read-only

- **WHEN** a candidate is selected on the decision page and `candidates.ai_analysis_result` exists
- **THEN** the AI analysis block SHALL display keyword analysis, semantic analysis, radar chart, and overall score, with no "開始 AI 分析" or "重新分析" buttons visible

#### Scenario: AI analysis empty state

- **WHEN** a selected candidate has no `ai_analysis_result`
- **THEN** the AI analysis block SHALL display a message "面試官尚未完成 AI 分析" with no edit controls


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
### Requirement: Read-only mode for decided candidates

The decision page SHALL enter read-only mode when the selected candidate's status is `pending_approval`, `offered`, `offer_accepted`, `offer_declined`, `onboarded`, or `not_hired`. In read-only mode, the decision form inputs, salary fields, and action buttons SHALL be disabled or hidden.

#### Scenario: Pending approval locks decision form

- **WHEN** a candidate has status `pending_approval`
- **THEN** the decision radio options, decision reason textarea, salary inputs SHALL be disabled; the "送交簽核" button SHALL be hidden; a "簽核中" badge SHALL display

#### Scenario: Offered candidate shows approval result and offer link

- **WHEN** a candidate has status `offered`, `offer_accepted`, or `offer_declined`
- **THEN** all decision inputs SHALL be disabled; the approval history (approver name, approved_at, approval_note if any) SHALL display; the offer response link SHALL be visible with copy button


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
### Requirement: Recruitment page no longer contains decision section

The AI interview page at `/employee/recruitment` SHALL remove the "錄用決策" section entirely. Decision-related signals (`decision`, `decisionReason`, `decisionSubmitting`, `offerResponseLink`) SHALL be removed from the component.

#### Scenario: Decision section absent

- **WHEN** a user loads `/employee/recruitment`
- **THEN** the page SHALL NOT render any element with class `decision-section` or text "錄用決策"

#### Scenario: Tab renamed from 面試後 to 已評分

- **WHEN** a user loads `/employee/recruitment`
- **THEN** the status filter tabs SHALL display `全部 / 待面試 / 已評分`; the `已評分` tab SHALL show candidates with status in {`pending_ai`, `pending_decision`} (candidates whose decision has been submitted for approval — `pending_approval` and later — are handled exclusively by the decision page and SHALL NOT appear in the interview page list)

#### Scenario: Candidate list scope limited to evaluation phase

- **WHEN** a user loads `/employee/recruitment`
- **THEN** the candidate list SHALL only display candidates whose status is `interview`, `pending_ai`, or `pending_decision`; candidates with status `pending_approval` or later SHALL be filtered out of the list entirely

#### Scenario: Approval-submitted candidate shown read-only on interview page

- **WHEN** a candidate on `/employee/recruitment` has status `pending_approval` or later
- **THEN** the interview page SHALL display all scoring, media, and AI analysis as read-only; a handoff notice SHALL appear indicating the decision has been submitted for sign-off

#### Scenario: Pending decision remains editable with guidance

- **WHEN** a candidate on `/employee/recruitment` has status `pending_decision`
- **THEN** the interview page SHALL remain editable (scoring, media, AI analysis all writable) but SHALL display a non-blocking hint card indicating the candidate is ready for decision; the hint SHALL link to `/employee/decision` when the user has `L1.decision` permission


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
### Requirement: Module design system compliance

The decision page SHALL use the L1 module color `$color-l1-sage` (#8DA399) and apply the standard SCSS mixins: `@include card` for panels, `@include filter-bar($color-l1-sage)` for filter areas, `@include status-badge` for status pills, `@include button-module($color-l1-sage)` for primary actions. No hardcoded color values SHALL be used.

#### Scenario: Primary action button uses module color

- **WHEN** rendering the "送交簽核" primary action button
- **THEN** its background SHALL resolve to `$color-l1-sage` via the `button-module` mixin

#### Scenario: Status badges use status-badge mixin

- **WHEN** rendering a candidate's status in the sidebar list
- **THEN** the badge element SHALL use the `status-badge` mixin with modifier classes matching status semantic (pending/approved/declined/hired)


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
### Requirement: Interview date filter on recruitment page

The AI interview page (`/employee/recruitment`) SHALL provide a date-range filter for the candidate sidebar, enabling HR to narrow the list by recent interview activity. The filter SHALL appear below the status tabs and above the search input, and SHALL include: (a) a native HTML date input for picking a specific date, and (b) four quick-filter buttons: `全部`, `今日`, `近 3 天`, `近 7 天`. The active quick-filter SHALL use the L1 module color for its active state.

#### Scenario: Quick filter today narrows to candidates interviewed today

- **WHEN** a user clicks the "今日" quick-filter button
- **THEN** the candidate list SHALL display only candidates whose `interviewDate` falls within today's local-time window (00:00:00 to 23:59:59.999); candidates without an `interviewDate` SHALL be filtered out

#### Scenario: Quick filter last 3 days uses today-inclusive window

- **WHEN** a user clicks "近 3 天"
- **THEN** the candidate list SHALL display candidates whose `interviewDate` falls within `[today - 2 days, today 23:59:59.999]`; for "近 7 天" the window SHALL be `[today - 6 days, today 23:59:59.999]`

#### Scenario: Custom date selection overrides quick filter

- **WHEN** a user picks a date from the date input
- **THEN** the quick-filter selection SHALL switch to `custom`; the candidate list SHALL display only candidates whose `interviewDate` falls on that chosen date (00:00 to 23:59:59.999 of that day)

#### Scenario: Switching to quick filter clears custom date

- **WHEN** a user clicks any quick-filter button (`全部`, `今日`, `近 3 天`, `近 7 天`) after selecting a custom date
- **THEN** the custom date input SHALL be cleared and the corresponding range SHALL apply (or no range for `全部`)

#### Scenario: Date filter combines with status and search filters

- **WHEN** a user has an active status filter (`待面試` / `已評分`) and a search query, and applies a date filter
- **THEN** the candidate list SHALL intersect all three filters; a candidate must match status, search, AND date range to appear


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
### Requirement: Candidate list date column shows latest interview time

Both the AI interview page and the decision page SHALL display the candidate's latest scheduled interview time in the candidate list card (and in the selected-candidate profile header). The value SHALL be sourced from `latest_interview_at` (preloaded by the list API from the latest row of `interviews` for that candidate); when unavailable, the value SHALL fall back to `apply_date`. The display format SHALL be `yyyy-MM-dd HH:mm` using Angular's `date` pipe and SHALL be preceded by a calendar icon.

#### Scenario: Candidate card displays latest interview time

- **WHEN** a candidate has one or more rows in `interviews`
- **THEN** the sidebar candidate card SHALL display the `interview_at` value of the most recent interview row, formatted as `yyyy-MM-dd HH:mm`

#### Scenario: Fallback to application date when no interview scheduled

- **WHEN** a candidate has no `interviews` rows
- **THEN** the card SHALL display `apply_date` (formatted `yyyy-MM-dd HH:mm`) or hide the date line if both are null


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
### Requirement: Decision page prefills form on rejected resubmit

When the decision page selects a candidate whose status is `pending_decision` AND whose latest `invitation_decisions.approval_status` is `'REJECTED'`, the decision form SHALL be prefilled with the prior submission's values so HR can adjust and resubmit without re-entering all fields.

#### Scenario: Rejected candidate selection prefills decision type

- **WHEN** HR selects a candidate meeting the rejected-resubmit condition
- **THEN** the decision radio option (`已錄取` / `未錄取`) SHALL be preselected according to `decision_type` from the list row; the decision reason textarea SHALL contain the prior `decision_reason` value

#### Scenario: Rejected offered candidate prefills salary inputs

- **WHEN** the prior `decision_type` was `Offered` and `approved_salary_amount` is non-null on the candidate row
- **THEN** the salary type select SHALL show the prior `approved_salary_type` (month/year); the salary amount input SHALL contain the prior `approved_salary_amount`

#### Scenario: Non-rejected candidate selection starts blank

- **WHEN** HR selects a candidate whose status is `pending_decision` but `approval_status` is `'NONE'` (fresh candidate, never submitted)
- **THEN** the decision form fields SHALL all start empty; salary fields SHALL default to `salaryType = 50` (月薪) and blank amount


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
### Requirement: Decision result view shows approver and submitter identity

When the decision page displays a candidate whose approval has been completed (status `offered`, `offer_accepted`, `offer_declined`, `onboarded`, or `not_hired`), the result section SHALL include: submitter name (`decided_by_name`), approver name (`approver_name`), approval timestamp (`approved_at` formatted as `yyyy-MM-dd HH:mm`), and approval note (`approval_note`, when non-null and status is not `not_hired`).

#### Scenario: Four actor/metadata rows rendered in order

- **WHEN** the decision result view renders for an approved candidate
- **THEN** the rows SHALL appear in order: `送簽人員` → `簽核人員` → `簽核時間` → `簽核備註`; any row whose underlying field is null SHALL be omitted rather than show "—"

#### Scenario: Approval timestamp formatted with date pipe

- **WHEN** rendering the `簽核時間` row
- **THEN** the value SHALL be formatted via the Angular `date` pipe with pattern `yyyy-MM-dd HH:mm`; raw ISO strings SHALL NOT be shown directly


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
### Requirement: Offer response link reloads after approval success

When approval succeeds and the candidate transitions to `offered`, the decision page SHALL automatically reload the candidate's offer response link so the Offer response link block becomes visible without requiring the user to reselect the candidate manually.

#### Scenario: Approve triggers reselect with refreshed data

- **WHEN** a subsidiary_admin presses the `簽核通過` button and the API succeeds
- **THEN** the decision page SHALL call `GET /api/recruitment/candidates` to refresh the list; if a candidate was previously selected, the page SHALL reselect that candidate using the refreshed record, triggering side effects that include reloading the offer response link via `GET /api/recruitment/candidates/:id/offer-response-link`

#### Scenario: Offer link block visible immediately after approval

- **WHEN** the approval transition completes (status becomes `offered`)
- **THEN** the decision result view SHALL display the Offer 回覆連結 block (with copy button and pending-response status badge) without requiring the user to switch candidates and back


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
### Requirement: Scoring modal readOnly mode locks label wrappers

The interviewer scoring modal (`interview-scoring-modal`) opened from the decision page SHALL enforce read-only semantics at both the CSS pointer-events layer and the TypeScript handler layer. `pointer-events: none` SHALL be applied not only to input/textarea/select and button elements but also to the `<label>` wrappers `.checklist-item`, `.radio-option`, and `.recommendation-option`, because browser default label→input association would otherwise allow clicks on the label to toggle the associated input.

#### Scenario: Label click cannot toggle checkbox in readOnly

- **WHEN** the modal is open with `readOnly = true` and the user clicks a label wrapping a process checklist checkbox
- **THEN** the checkbox state SHALL NOT change; `toggleChecklist()` SHALL return early because `this.readOnly()` is true

#### Scenario: Recommendation option click guarded in TS

- **WHEN** the modal is open with `readOnly = true` and the user clicks a `.recommendation-option` label
- **THEN** `setRecommendation()` SHALL early-return without mutating the recommendation signal

#### Scenario: Visual hierarchy distinguishes selected options in readOnly

- **WHEN** the modal renders in readOnly mode
- **THEN** un-selected `.level-btn`, `.recommendation-option`, and similar interactive elements SHALL display at `opacity: 0.45` so the already-selected option is visually prominent

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