## MODIFIED Requirements

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

---

## ADDED Requirements

### Requirement: Route guard enforces L1.decision access

The route `/employee/decision` SHALL be registered with the existing `permissionGuard` using `featureId: 'L1.decision'` and `requiredAction: 'view'`. Users without view permission SHALL be redirected to `/dashboard` with a notification indicating insufficient permissions.

#### Scenario: Unauthorized direct URL access

- **WHEN** a user with `action_level: 'none'` on `L1.decision` navigates directly to `/employee/decision`
- **THEN** the guard SHALL cancel the navigation and redirect to `/dashboard`; a notification "您沒有權限存取此功能" SHALL display

#### Scenario: Authorized access allowed

- **WHEN** a user with `action_level: 'edit'` or `'view'` on `L1.decision` navigates to `/employee/decision`
- **THEN** the guard SHALL permit the navigation and the decision page component SHALL load
