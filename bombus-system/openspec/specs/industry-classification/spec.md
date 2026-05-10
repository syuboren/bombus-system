# Industry Classification — 產業類別標準化

## Purpose

定義 Bombus 平台層級的產業類別標準化機制：以 `platform.db.industries` 表作為產業代碼／顯示名稱的單一真實來源，提供平台管理員 CRUD 維護介面，並把 `tenants.industry` 從 free-form 字串轉為對 `industries.code` 的外鍵參照。此能力支援部門範本依產業分群、租戶建立時的標準化選單，以及未來其他需要依產業分流的功能。

## Requirements

### Requirement: Platform-level industries lookup table

The system SHALL provide a platform-level `industries` table in `platform.db` containing `(code TEXT PRIMARY KEY, name TEXT NOT NULL, display_order INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT)`.

The `code` column SHALL be a stable kebab-case ASCII identifier (e.g. `'manufacturing'`, `'tech'`, `'service'`). The `name` column SHALL hold the localized display label (e.g. `'製造業'`, `'科技業'`).

The system SHALL seed the table with at least the following 12 codes on first initialization (confirmed by stakeholder 2026-04-29):

| code            | name (繁體中文)   | display_order |
| --------------- | ----------------- | ------------- |
| `it-services`   | 資訊服務業        | 10            |
| `tech`          | 科技業            | 20            |
| `manufacturing` | 製造業            | 30            |
| `retail`        | 零售業            | 40            |
| `food-service` | 餐飲業            | 50            |
| `healthcare`   | 醫療機構          | 60            |
| `finance`      | 金融業            | 70            |
| `nonprofit`    | 非營利組織        | 80            |
| `education`    | 教育業            | 90            |
| `construction` | 建築業            | 100           |
| `logistics`    | 物流業            | 110           |
| `other`        | 其他              | 999           |

Seeding SHALL be idempotent.

#### Scenario: First-run seeds default industries

- **WHEN** `platform-db.js:initPlatformDB()` runs against an empty `platform.db`
- **THEN** the `industries` table SHALL be created and SHALL contain exactly 12 rows with the default codes listed above, each with a Traditional Chinese `name` and the specified `display_order`

#### Scenario: Seeding is idempotent

- **WHEN** `initPlatformDB()` is invoked a second time on the same database
- **THEN** the seeding step SHALL NOT duplicate rows; no error SHALL be raised


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: Platform admin manages industries via CRUD API

The system SHALL expose `GET / POST / PUT / DELETE /api/platform/industries` to platform admins (authenticated via `authMiddleware + platformAdminMiddleware`). Tenant users SHALL only have implicit read access via the standardized industry select on tenant management forms.

The DELETE endpoint SHALL block deletion when an industry is referenced by any `tenants.industry` value or any `industry_dept_assignments.industry_code` row. Such attempts SHALL return 409 Conflict with a list of references.

The `is_active` flag SHALL allow soft-deactivation: an inactive industry SHALL be hidden from new tenant creation forms but SHALL remain visible for already-assigned tenants.

#### Scenario: Platform admin lists industries

- **WHEN** a platform admin requests `GET /api/platform/industries`
- **THEN** the system SHALL return all rows ordered by `display_order ASC, code ASC`, including both active and inactive ones, with each row containing `code`, `name`, `display_order`, `is_active`, and a derived `tenant_count` and `assignment_count`

#### Scenario: Platform admin creates a new industry

- **WHEN** a platform admin posts `{ code: 'agriculture', name: '農業', display_order: 50 }` to `POST /api/platform/industries`
- **THEN** the system SHALL insert the row, return 201 Created, and the new code SHALL be available for assignment selection

#### Scenario: Cannot delete an industry in use

- **WHEN** a platform admin attempts `DELETE /api/platform/industries/manufacturing` while at least one tenant has `industry='manufacturing'`
- **THEN** the system SHALL return 409 Conflict with a body listing the referencing tenant ids and recommending soft-deactivation via `PUT { is_active: 0 }` instead

#### Scenario: Soft-deactivate hides industry from new forms

- **WHEN** a platform admin sets `is_active=0` for an industry
- **THEN** subsequent calls to `GET /api/platform/industries?active=true` SHALL exclude that row, but tenants previously assigned to it SHALL retain the assignment unchanged


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: tenants.industry referenced as foreign key

The system SHALL change `platform.db.tenants.industry` from a free-form `TEXT` column to a foreign key referencing `industries.code`. New tenants SHALL only accept industry values that exist in `industries`.

The migration SHALL include a one-time mapping of existing free-form values to standardized codes via a hard-coded mapping table covering at least: `'製造業'/'製造'/'Manufacturing' → 'manufacturing'`, `'科技業'/'科技'/'Technology' → 'tech'`, `'資訊服務業'/'IT Services' → 'it-services'`, `'零售業'/'Retail' → 'retail'`, `'餐飲業'/'F&B' → 'food-service'`, `'醫療'/'醫療機構'/'Healthcare' → 'healthcare'`, `'金融業'/'Finance' → 'finance'`, `'非營利'/'非營利組織'/'NPO' → 'nonprofit'`, `'教育'/'Education' → 'education'`, `'建築'/'Construction' → 'construction'`, `'物流'/'Logistics' → 'logistics'`. Unmapped values SHALL be set to `'other'` and a warning SHALL be logged listing each affected tenant.

The migration SHALL be idempotent — re-running it after success SHALL produce no further changes.

#### Scenario: Migration maps known free-form values

- **WHEN** the platform DB upgrade runs against a database where one tenant has `industry='製造業'` and another has `industry='Tech'`
- **THEN** the migration SHALL update those rows to `industry='manufacturing'` and `industry='tech'` respectively

#### Scenario: Unmapped value falls back to other

- **WHEN** the migration encounters a tenant with `industry='博物館經營'` (not in the mapping)
- **THEN** the migration SHALL set that tenant's industry to `'other'` and log a warning containing the tenant id and the original string for the platform admin to review

#### Scenario: Re-running migration is a no-op

- **WHEN** the migration runs after a previous successful migration
- **THEN** all tenants already have valid industry codes; no row SHALL be modified; no warning SHALL be logged

#### Scenario: Tenant creation enforces FK

- **WHEN** a platform admin creates a tenant with `industry='nonexistent_code'`
- **THEN** the system SHALL return 400 Bad Request indicating the industry code is invalid


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: Industry display labels are localized

The system SHALL store `industries.name` in Traditional Chinese for the Bombus deployment. Frontend consumers SHALL display `name` (not `code`) wherever an industry is shown to a user.

#### Scenario: Tenant create form displays Chinese names

- **WHEN** a platform admin opens the "新增租戶" form
- **THEN** the industry dropdown SHALL display Traditional Chinese names sourced from `industries.name`, with the `code` value submitted to the backend on form submit

<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->