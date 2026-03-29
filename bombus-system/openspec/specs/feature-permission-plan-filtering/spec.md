# Feature Permission Plan Filtering — 功能權限與方案篩選同步

## Purpose

定義 Feature IDs 與 Sidebar 識別符的對齊、既有租戶資料遷移、API 依租戶訂閱方案篩選功能、新功能預設權限、前端模組類型擴展。

## Requirements

### Requirement: Feature IDs match sidebar identifiers

The features table in each tenant database SHALL use the same identifier format as the sidebar component's `featureId` property (e.g., `L1.jobs`, `L2.grade-matrix`, `SYS.org-structure`). The features table SHALL contain one entry for every sidebar menu item that has a `featureId` defined. Feature names in the features table SHALL exactly match the sidebar menu item labels.

#### Scenario: Feature ID format consistency

- **WHEN** a tenant database is initialized or migrated
- **THEN** the `features` table SHALL contain entries with IDs in the `L#.xxx` format matching `sidebar.component.ts` featureIds

#### Scenario: Feature name matches sidebar label

- **WHEN** an administrator views the feature permission management page
- **THEN** each feature name displayed SHALL exactly match the corresponding sidebar menu item label (e.g., "員工檔案與歷程管理" not "員工檔案管理")

#### Scenario: All sidebar features are represented

- **WHEN** a tenant has all modules enabled (L1 through L6)
- **THEN** the features table SHALL contain entries for all sidebar menu items plus SYS system management features, totaling approximately 40 features

---

### Requirement: Existing tenant data migration

The system SHALL migrate existing tenant databases from the old feature ID format (`recruitment_jobs`) to the new format (`L1.jobs`) without data loss. The migration SHALL rename feature IDs in both the `features` table and the `role_feature_perms` table. Features that have no sidebar counterpart (`career_path`, `ai_career`) SHALL be removed along with their associated permission records.

#### Scenario: Successful ID migration for existing tenant

- **WHEN** an existing tenant database with old-format feature IDs is loaded
- **THEN** the system SHALL rename all feature IDs in `role_feature_perms` first, then in `features`, preserving all user-configured permission levels and scopes

#### Scenario: Removed features are cleaned up

- **WHEN** an existing tenant database contains features `career_path` or `ai_career`
- **THEN** the system SHALL delete these features and their associated `role_feature_perms` entries

#### Scenario: Migration is idempotent

- **WHEN** the migration runs on a tenant database that has already been migrated
- **THEN** the system SHALL produce no errors and no data changes (UPDATE affects 0 rows for already-renamed IDs)

---

### Requirement: API filters features by tenant subscription plan

The `GET /api/tenant-admin/features` endpoint SHALL return only features belonging to modules enabled in the tenant's subscription plan. The `GET /api/tenant-admin/roles/:id/feature-perms` endpoint SHALL likewise filter results by the tenant's enabled modules. SYS module features SHALL always be returned regardless of the subscription plan.

#### Scenario: Tenant with L1 and L2 modules only

- **WHEN** a tenant's subscription plan enables modules `["L1", "L2"]`
- **AND** the `GET /api/tenant-admin/features` endpoint is called
- **THEN** the response SHALL contain only features with module `L1`, `L2`, or `SYS`
- **AND** SHALL NOT contain features with module `L3`, `L4`, `L5`, or `L6`

#### Scenario: Tenant with all modules enabled

- **WHEN** a tenant's subscription plan enables modules `["L1", "L2", "L3", "L4", "L5", "L6"]`
- **AND** the `GET /api/tenant-admin/features` endpoint is called
- **THEN** the response SHALL contain features for all modules including SYS

#### Scenario: Graceful degradation when no plan is assigned

- **WHEN** a tenant has no subscription plan assigned (plan_id is NULL)
- **AND** the `GET /api/tenant-admin/features` endpoint is called
- **THEN** the response SHALL return all features without filtering (graceful degradation)

#### Scenario: Feature perms filtered for role detail

- **WHEN** a tenant's subscription plan enables only `["L1"]`
- **AND** the `GET /api/tenant-admin/roles/:id/feature-perms` endpoint is called
- **THEN** the response SHALL contain only feature permissions for L1 and SYS modules
- **AND** SHALL NOT include permission entries for disabled modules

---

### Requirement: Default role permissions for new features

When new features are added to the features table (via seed or migration), the system SHALL assign default permission levels to all five system roles (`super_admin`, `subsidiary_admin`, `hr_manager`, `dept_manager`, `employee`) using `INSERT OR IGNORE` for idempotency. Custom roles (non-system) SHALL receive `none` permissions for newly added features.

#### Scenario: Super admin gets full access to new features

- **WHEN** a new feature is added to the features table
- **THEN** the `super_admin` role SHALL receive `action_level: 'edit'`, `edit_scope: 'company'`, `view_scope: 'company'` for that feature

#### Scenario: Custom role gets no access to new features

- **WHEN** a new feature is added and a custom (non-system) role exists
- **THEN** that custom role SHALL receive `action_level: 'none'`, `edit_scope: null`, `view_scope: null` for the new feature

---

### Requirement: Frontend module type supports L3 through L6

The `FeatureModule` TypeScript type SHALL include `'L3' | 'L4' | 'L5' | 'L6'` in addition to the existing `'L1' | 'L2' | 'SYS'`. The `MODULE_LABELS` and `MODULE_ORDER` constants SHALL include entries for all six business modules plus SYS.

#### Scenario: Module labels display correctly for L3-L6

- **WHEN** a tenant with L3-L6 features enabled opens the feature permission management page
- **THEN** the module headers SHALL display localized labels: "L3 教育訓練", "L4 專案管理", "L5 績效管理", "L6 文化管理"

#### Scenario: Module ordering is consistent

- **WHEN** features from multiple modules are displayed
- **THEN** they SHALL be ordered as: L1, L2, L3, L4, L5, L6, SYS
