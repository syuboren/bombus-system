## ADDED Requirements

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

### Requirement: Sidebar filters items by feature permission

The sidebar `activeMenuSections` computed signal SHALL incorporate feature permission checks. A menu item with a `featureId` SHALL be visible only if `featureGateService.canView(featureId)` returns `true`. This check SHALL be layered on top of the existing module-level subscription plan check. Items without a `featureId` SHALL remain visible.

#### Scenario: Employee with no permission on recruitment features

- **WHEN** an employee has `action_level: 'none'` for `L1.jobs` and `L1.recruitment`
- **THEN** the sidebar SHALL NOT display "招募職缺管理" or "AI智能面試" items
- **THEN** other L1 items with `action_level: 'view'` or `action_level: 'edit'` SHALL remain visible

#### Scenario: Module section becomes empty after filtering

- **WHEN** all items in a module section have `action_level: 'none'`
- **THEN** the entire module section (including its header) SHALL be hidden from the sidebar

#### Scenario: Tenant admin section visibility

- **WHEN** a user has `action_level: 'none'` for all SYS features
- **THEN** the "租戶管理" section SHALL be hidden from the sidebar

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

### Requirement: Read-only mode for view-only permissions

When a user has `action_level: 'view'` for a feature, the page SHALL display in read-only mode. Create/edit/delete action buttons SHALL be hidden or disabled. The FeatureGateService SHALL expose `canEdit(featureId)` that page components use to conditionally render action buttons. Each page component SHALL check `canEdit()` to determine whether to show mutation controls.

#### Scenario: View-only user sees data without action buttons

- **WHEN** a user with `action_level: 'view'` for `L2.grade-matrix` opens the grade matrix page
- **THEN** the data table is displayed normally
- **THEN** "新增"、"編輯"、"刪除" buttons SHALL NOT be visible

#### Scenario: Edit user sees full controls

- **WHEN** a user with `action_level: 'edit'` for `L2.grade-matrix` opens the grade matrix page
- **THEN** all action buttons ("新增"、"編輯"、"刪除") SHALL be visible and functional
