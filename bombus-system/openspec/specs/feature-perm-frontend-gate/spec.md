# Feature Permission Frontend Gate — 前端功能權限閘道

## Purpose

定義前端功能層級權限的載入、檢查、側邊欄篩選、路由守衛、唯讀模式等機制。

## Requirements

### Requirement: Load user feature permissions on login

After successful authentication, the frontend SHALL call `GET /api/auth/feature-perms` to retrieve the user's merged feature permissions. The response SHALL be stored in AuthService as a `Map<string, UserFeaturePerm>` signal, where `UserFeaturePerm` contains `{ action_level, edit_scope, view_scope }`. The permissions SHALL persist in localStorage alongside the user object and SHALL be refreshed on token refresh.

#### Scenario: Successful login loads feature permissions

- **WHEN** user logs in successfully
- **THEN** the system calls `GET /api/auth/feature-perms` and stores the merged permissions map in AuthService
- **THEN** the permissions are available via `authService.featurePerms()` signal

#### Scenario: Token refresh updates feature permissions

- **WHEN** an access token is refreshed via `/api/auth/refresh`
- **THEN** the system re-fetches feature permissions from `/api/auth/feature-perms`
- **THEN** the stored permissions map is updated

#### Scenario: No feature permissions returned (graceful degradation)

- **WHEN** the `/api/auth/feature-perms` endpoint returns an empty array or fails
- **THEN** the system SHALL treat all features as `action_level: 'view'` with `view_scope: 'company'`
- **THEN** the user can access all pages in read-only mode

---
### Requirement: FeatureGateService provides feature-level permission checks

FeatureGateService SHALL expose methods to check individual feature permissions beyond module-level checks. The service SHALL provide: `canView(featureId): boolean` (action_level is 'view' or 'edit'), `canEdit(featureId): boolean` (action_level is 'edit'), and `getFeaturePerm(featureId): UserFeaturePerm | null`. These methods SHALL read from the AuthService feature permissions signal. Subscription plan filtering (module-level) SHALL remain as a prerequisite — a feature is accessible only if BOTH the plan includes its module AND the user's action_level is not 'none'.

#### Scenario: User with view permission on a feature

- **WHEN** a user has `action_level: 'view'` for feature `L1.jobs`
- **THEN** `canView('L1.jobs')` returns `true`
- **THEN** `canEdit('L1.jobs')` returns `false`

#### Scenario: User with edit permission on a feature

- **WHEN** a user has `action_level: 'edit'` for feature `L1.profile`
- **THEN** `canView('L1.profile')` returns `true`
- **THEN** `canEdit('L1.profile')` returns `true`

#### Scenario: User with no permission on a feature

- **WHEN** a user has `action_level: 'none'` for feature `L1.jobs`
- **THEN** `canView('L1.jobs')` returns `false`
- **THEN** `canEdit('L1.jobs')` returns `false`

#### Scenario: Feature not in user's permissions map

- **WHEN** a feature ID is not present in the user's permissions map
- **THEN** `canView(featureId)` returns `false`
- **THEN** `canEdit(featureId)` returns `false`

---
### Requirement: Sidebar filters items by feature permission

The sidebar `activeMenuSections` computed signal SHALL incorporate feature permission checks. A menu item with a `featureId` SHALL be visible only if `featureGateService.canView(featureId)` returns `true`. This check SHALL be layered on top of the existing module-level subscription plan check. Items without a `featureId` SHALL remain visible. The L1 员工管理 section SHALL include a "面試決策" item with `featureId = 'L1.decision'` positioned between "AI智能面試" and "人才庫與再接觸管理".

#### Scenario: Employee with no permission on recruitment features

- **WHEN** an employee has `action_level: 'none'` for `L1.jobs`, `L1.recruitment`, and `L1.decision`
- **THEN** the sidebar SHALL NOT display "招募職缺管理", "AI智能面試", or "面試決策" items
- **THEN** other L1 items with `action_level: 'view'` or `action_level: 'edit'` SHALL remain visible

#### Scenario: Module section becomes empty after filtering

- **WHEN** all items in a module section have `action_level: 'none'`
- **THEN** the entire module section (including its header) SHALL be hidden from the sidebar

#### Scenario: Tenant admin section visibility

- **WHEN** a user has `action_level: 'none'` for all SYS features
- **THEN** the "租戶管理" section SHALL be hidden from the sidebar

#### Scenario: HR manager sees interview and decision items

- **WHEN** an `hr_manager` has `action_level: 'edit'` on both `L1.recruitment` and `L1.decision`
- **THEN** the sidebar SHALL display both "AI智能面試" and "面試決策" under L1 員工管理, with "面試決策" appearing directly after "AI智能面試"

#### Scenario: Dept manager sees interview but not decision

- **WHEN** a `dept_manager` has permission on `L1.recruitment` but `action_level: 'none'` on `L1.decision`
- **THEN** the sidebar SHALL display "AI智能面試" but SHALL NOT display "面試決策"


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
### Requirement: Route guard enforces feature-level access

The `featureGateGuard` SHALL be enhanced to check feature-level permissions. Each route SHALL declare a `requiredFeature` in its route data (e.g., `data: { requiredFeature: 'L1.jobs' }`). The guard SHALL verify `featureGateService.canView(requiredFeature)` before allowing navigation. If the user lacks permission, the guard SHALL redirect to the dashboard with a notification message.

#### Scenario: User navigates to a feature they have no permission for

- **WHEN** a user with `action_level: 'none'` for `L1.jobs` navigates to `/employee/jobs`
- **THEN** the guard SHALL block navigation
- **THEN** the user SHALL be redirected to `/dashboard`
- **THEN** a notification SHALL inform the user they lack permission

#### Scenario: User navigates to a feature they have view permission for

- **WHEN** a user with `action_level: 'view'` for `L1.jobs` navigates to `/employee/jobs`
- **THEN** the guard SHALL allow navigation

#### Scenario: Direct URL access is blocked for unauthorized features

- **WHEN** a user manually enters a URL for a feature they have `action_level: 'none'`
- **THEN** the guard SHALL block the navigation and redirect to `/dashboard`

---
### Requirement: Read-only mode for view-only permissions

When a user has `action_level: 'view'` for a feature, the page SHALL display in read-only mode. Create/edit/delete action buttons SHALL be hidden or disabled. The FeatureGateService SHALL expose `canEdit(featureId)` that page components use to conditionally render action buttons. Each page component SHALL check `canEdit()` to determine whether to show mutation controls.

#### Scenario: View-only user sees data without action buttons

- **WHEN** a user with `action_level: 'view'` for `L2.grade-matrix` opens the grade matrix page
- **THEN** the data table is displayed normally
- **THEN** "新增"、"編輯"、"刪除" buttons SHALL NOT be visible

#### Scenario: Edit user sees full controls

- **WHEN** a user with `action_level: 'edit'` for `L2.grade-matrix` opens the grade matrix page
- **THEN** all action buttons ("新增"、"編輯"、"刪除") SHALL be visible and functional

---
### Requirement: Route guard enforces L1.decision access

The route `/employee/decision` SHALL be registered with the existing `permissionGuard` using `featureId: 'L1.decision'` and `requiredAction: 'view'`. Users without view permission SHALL be redirected to `/dashboard` with a notification indicating insufficient permissions.

#### Scenario: Unauthorized direct URL access

- **WHEN** a user with `action_level: 'none'` on `L1.decision` navigates directly to `/employee/decision`
- **THEN** the guard SHALL cancel the navigation and redirect to `/dashboard`; a notification "您沒有權限存取此功能" SHALL display

#### Scenario: Authorized access allowed

- **WHEN** a user with `action_level: 'edit'` or `'view'` on `L1.decision` navigates to `/employee/decision`
- **THEN** the guard SHALL permit the navigation and the decision page component SHALL load

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