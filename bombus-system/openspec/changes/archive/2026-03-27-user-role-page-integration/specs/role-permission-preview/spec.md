## ADDED Requirements

### Requirement: Role selection permission preview

When a tenant admin selects a role from the assignment dropdown in the User Management role assignment modal, the system SHALL display a compact preview of that role's feature permissions below the dropdown. The preview SHALL show only features with action_level other than "none", grouped by module (L1, L2, SYS). If the role has no feature permissions configured, the system SHALL display a message indicating no permissions are set.

#### Scenario: Admin selects a role with configured permissions

- **WHEN** admin selects a role from the "角色" dropdown in the role assignment modal
- **THEN** the system loads and displays a compact permission preview showing module groups with feature name and action level tags (e.g., "員工檔案：可編輯")

#### Scenario: Admin selects a role with no permissions

- **WHEN** admin selects a role that has no feature permissions configured
- **THEN** the system displays "此角色尚未設定功能權限" below the dropdown

#### Scenario: Admin clears role selection

- **WHEN** admin changes the role dropdown back to the empty placeholder option
- **THEN** the permission preview section is hidden

### Requirement: Assigned role permission detail expand

Each role listed in the "目前角色" section of the role assignment modal SHALL have a "查看權限" toggle button. Clicking the button SHALL expand an inline section showing that role's complete feature permissions in a 4-column table (Feature Name, Action Level, Edit Scope, View Scope), grouped by module. Clicking again SHALL collapse the section. The permission data SHALL be cached after the first load.

#### Scenario: Admin expands assigned role permissions

- **WHEN** admin clicks "查看權限" on an assigned role
- **THEN** the system loads (if not cached) and displays a compact feature permission table below that role item, grouped by module

#### Scenario: Admin collapses assigned role permissions

- **WHEN** admin clicks "收起權限" on an already-expanded assigned role
- **THEN** the permission detail section collapses

#### Scenario: Cached role permissions

- **WHEN** admin expands a role, collapses it, then expands it again
- **THEN** the system displays the cached data without making another API request

### Requirement: User effective permissions display

The role assignment modal SHALL include a collapsible "有效權限（合併後）" section at the bottom. When expanded, the system SHALL merge all assigned roles' feature permissions using the highest-privilege union rule: highest action_level wins, widest edit_scope wins, widest view_scope wins. The merged result SHALL be displayed in a 4-column feature permission table grouped by module.

#### Scenario: Admin views effective permissions for user with multiple roles

- **WHEN** admin expands the "有效權限（合併後）" section for a user with 2+ roles
- **THEN** the system displays the merged feature permissions where each feature shows the highest action_level and widest scopes across all assigned roles

#### Scenario: Effective permissions update after role change

- **WHEN** admin assigns or revokes a role while the effective permissions section is expanded
- **THEN** the effective permissions recalculate and update automatically

#### Scenario: User has no assigned roles

- **WHEN** user has no assigned roles
- **THEN** the effective permissions toggle button is not displayed

### Requirement: Shared permission merge utility

The system SHALL use a shared utility function `mergeFeaturePerms()` for merging feature permissions from multiple roles. This function SHALL implement the highest-privilege union rule. Both the User Management page and the Permission Visualization page SHALL use this shared utility to avoid duplicate logic.

#### Scenario: Permission merge produces correct result

- **WHEN** Role A grants feature X with action_level=view, view_scope=self AND Role B grants feature X with action_level=edit, edit_scope=department, view_scope=company
- **THEN** the merged result for feature X SHALL be action_level=edit, edit_scope=department, view_scope=company
