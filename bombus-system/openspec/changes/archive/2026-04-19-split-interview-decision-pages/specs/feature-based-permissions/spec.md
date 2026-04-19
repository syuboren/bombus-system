## ADDED Requirements

### Requirement: L1.decision feature definition

The `features` table seed data SHALL include `L1.decision` feature (module `L1`, name `面試決策`, sort_order `101.5` or inserted between 101 and 102). This feature SHALL be seeded on new tenant initialization and added via idempotent migration on existing tenants.

#### Scenario: L1.decision present in new tenant

- **WHEN** a new tenant database is initialized
- **THEN** the `features` table SHALL contain a row with `id = 'L1.decision'`, `module = 'L1'`, `name = '面試決策'`

#### Scenario: L1.decision added to existing tenants

- **WHEN** an existing tenant database is loaded and `features` table lacks `L1.decision`
- **THEN** the idempotent migration SHALL insert the row without affecting other features

#### Scenario: Feature listing API returns L1.decision

- **WHEN** tenant admin calls `GET /api/tenant-admin/features`
- **THEN** the L1 module group SHALL include `L1.decision` ordered after `L1.recruitment` (101) and before `L1.talent-pool` (102)

---

### Requirement: L1.decision default role permissions

The default role-feature seeding SHALL assign the following permissions for `L1.decision` during tenant initialization and via idempotent migration for existing tenants:

- `super_admin`: `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'`
- `subsidiary_admin`: `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'`
- `hr_manager`: `action_level = 'edit'`, `edit_scope = 'company'`, `view_scope = 'company'`
- `dept_manager`: `action_level = 'none'`
- `employee`: `action_level = 'none'`

#### Scenario: Super admin and subsidiary admin can edit decision

- **WHEN** a new tenant is initialized
- **THEN** both `super_admin` and `subsidiary_admin` roles SHALL have edit/company/company on `L1.decision`

#### Scenario: HR manager can edit decision

- **WHEN** a new tenant is initialized
- **THEN** the `hr_manager` role SHALL have edit/company/company on `L1.decision`

#### Scenario: Dept manager and employee cannot access decision

- **WHEN** a new tenant is initialized
- **THEN** both `dept_manager` and `employee` roles SHALL have `action_level = 'none'` on `L1.decision`

#### Scenario: Existing tenants receive default permissions via migration

- **WHEN** an existing tenant database is loaded and role-feature rows for `L1.decision` are missing
- **THEN** the idempotent migration SHALL insert the default permissions for the five system roles

---

### Requirement: API endpoints enforce L1.decision permission

The backend middleware SHALL require `action_level = 'edit'` on `L1.decision` for write endpoints `POST /api/recruitment/candidates/:id/submit-approval`. Approval and rejection endpoints (`approve`, `reject-approval`) SHALL additionally require the caller's role to be `subsidiary_admin` or `super_admin` regardless of feature permission.

#### Scenario: HR manager submits approval successfully

- **WHEN** an `hr_manager` with edit permission on `L1.decision` calls submit-approval
- **THEN** the request SHALL proceed

#### Scenario: HR manager approval attempt rejected

- **WHEN** an `hr_manager` calls `approve` endpoint
- **THEN** the system SHALL return HTTP 403 even though the user has edit permission on `L1.decision`, because the role check requires `subsidiary_admin` or `super_admin`

#### Scenario: Dept manager blocked by feature permission

- **WHEN** a `dept_manager` with `action_level = 'none'` on `L1.decision` attempts any decision API
- **THEN** the system SHALL return HTTP 403 via the feature permission middleware
