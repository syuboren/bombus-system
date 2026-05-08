## ADDED Requirements

### Requirement: Approve action verb independent from view/edit

The `role_feature_perms` schema SHALL support an independent approve action verb expressed via two new columns: `can_approve INTEGER NOT NULL DEFAULT 0` and `approve_scope TEXT DEFAULT NULL CHECK(approve_scope IN (NULL,'self','department','company'))`. The approve verb SHALL NOT be mutually exclusive with `action_level` (view/edit) — a single permission row MAY have any combination of view, edit, and approve enabled. Multi-role permission merging (`mergeFeaturePerms`) SHALL combine `can_approve` via logical OR (any role granting approve grants the permission) and `approve_scope` via maximum-scope rank (NULL < self < department < company).

#### Scenario: Approve column added with safe default

- **WHEN** the schema migration runs on an existing tenant database
- **THEN** all existing `role_feature_perms` rows SHALL have `can_approve=0` and `approve_scope=NULL` after migration completes, requiring no backfill

#### Scenario: Approve coexists with view and edit

- **WHEN** a role's permission for a feature has `action_level='edit'`, `edit_scope='company'`, `can_approve=1`, `approve_scope='department'`
- **THEN** the user SHALL be permitted to view, edit, AND approve, with edit scope = company and approve scope = department

#### Scenario: Multi-role approve merging

- **WHEN** a user holds two roles where role-A has `can_approve=0` and role-B has `can_approve=1` with `approve_scope='department'` for the same feature
- **THEN** the merged permission SHALL have `can_approve=1` and `approve_scope='department'`

##### Example: Approve scope rank merging

| Role A | Role B | Merged |
|---|---|---|
| `can_approve=0`, `approve_scope=NULL` | `can_approve=1`, `approve_scope='self'` | `can_approve=1`, `approve_scope='self'` |
| `can_approve=1`, `approve_scope='department'` | `can_approve=1`, `approve_scope='company'` | `can_approve=1`, `approve_scope='company'` |
| `can_approve=0`, `approve_scope=NULL` | `can_approve=0`, `approve_scope=NULL` | `can_approve=0`, `approve_scope=NULL` |

---

### Requirement: Row-level filter key in role_feature_perms

The `role_feature_perms` schema SHALL support row-level filtering via a new column `row_filter_key TEXT DEFAULT NULL`. The value SHALL reference a key registered in the backend `ROW_FILTERS` registry. NULL SHALL mean no row-level restriction (backward-compatible with existing behavior). The system SHALL NOT accept arbitrary SQL expressions, regular expressions, or user-defined predicates from clients — only registry-registered keys SHALL be valid values. Multi-role merging of `row_filter_key` SHALL pick the **least restrictive** outcome: if any role grants the same feature with `row_filter_key=NULL`, the merged result SHALL be NULL (no row restriction); otherwise the merged result SHALL retain a non-NULL key (logic for combining different non-NULL keys is undefined and SHALL be avoided by tenant admin convention — design a single key per role-feature pair).

#### Scenario: NULL row_filter_key preserves existing behavior

- **WHEN** all existing 200+ rows in `role_feature_perms` have `row_filter_key=NULL` after schema migration
- **THEN** queries SHALL behave identically to the pre-migration system, with only `view_scope`/`edit_scope` applied

#### Scenario: Non-NULL row_filter_key triggers predicate evaluation

- **WHEN** a user's merged permission for a feature has `row_filter_key='interview_assigned'`
- **THEN** SELECT queries on the relevant table SHALL include the SQL clause produced by the registry's `interview_assigned` predicate, AND-combined with the existing scope clause

#### Scenario: Unknown row_filter_key triggers safety fallback

- **WHEN** a tenant database contains a `row_filter_key` value not registered in `ROW_FILTERS` (e.g., from a stale row)
- **THEN** the middleware SHALL log a warning AND return a `1=0` clause (deny by default), NOT silently bypass row filtering

#### Scenario: Least-restrictive merging for row_filter_key

- **WHEN** a user has two roles for the same feature: role-A with `row_filter_key='interview_assigned'` and role-B with `row_filter_key=NULL`
- **THEN** the merged `row_filter_key` SHALL be NULL (least restrictive — role-B grants unrestricted access)

---

## MODIFIED Requirements

### Requirement: 預設角色初始化

The system SHALL create 6 default roles (super_admin, subsidiary_admin, hr_manager, dept_manager, employee, **interviewer**) during tenant database initialization. Each default role SHALL have both legacy `role_permissions` entries AND `role_feature_perms` entries pre-configured. For the existing 5 roles, all new columns (`can_approve`, `approve_scope`, `row_filter_key`) SHALL default to `0`/`NULL`/`NULL` (fail-safe: HR must opt in to approve and row-level filtering). The `interviewer` role SHALL be seeded with `L1.recruitment` granted at action_level='edit' with `row_filter_key='interview_assigned'` (the recruitment feature_id covers candidates, invitations, interviews, AND evaluations endpoints — confirmed via preflight against `recruitment.js`), all other features (including `L1.decision`) set to `action_level='none'`.

#### Scenario: 預設角色自動建立

- **WHEN** a new tenant database is initialized
- **THEN** the `roles` table SHALL contain 6 is_system=1 roles, each with corresponding entries in both `role_permissions` (legacy) and `role_feature_perms` (new model with all 5 columns: action_level, view_scope, edit_scope, can_approve, approve_scope, row_filter_key)

#### Scenario: Existing 5 roles get fail-safe defaults for new columns

- **WHEN** an existing tenant's `role_feature_perms` rows are migrated
- **THEN** every row SHALL have `can_approve=0`, `approve_scope=NULL`, `row_filter_key=NULL` regardless of the original role
- **AND** tenant admins SHALL opt in to approve permissions per-feature via the role management UI

#### Scenario: Interviewer role default seed

- **WHEN** the interviewer role is seeded
- **THEN** `role_feature_perms` for `L1.recruitment` SHALL be `(action_level='edit', view_scope='company', edit_scope='company', can_approve=0, approve_scope=NULL, row_filter_key='interview_assigned')`
- **AND** `role_feature_perms` for `L1.decision` SHALL be `(action_level='none', everything else NULL/0)`
- **AND** all other features (40+ entries including L1.jobs / L1.profile / L2.\* / L3.\* / L4.\* / L5.\* / L6.\* / SYS.\*) SHALL be `(action_level='none', everything else NULL/0)`
