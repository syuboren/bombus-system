## ADDED Requirements

### Requirement: Platform admin manages department template dictionary

The system SHALL provide a platform-level department template dictionary stored in `platform.db`. Each template SHALL have a unique id, a `name` (department label, e.g. "製造部門"), a `value` field (TEXT, JSON array of strings), and an `is_common` flag indicating whether the template applies across all industries.

Only platform admins (authenticated via `authMiddleware + platformAdminMiddleware`) SHALL be permitted to create, update, or delete templates. Tenants SHALL only have read access via tenant-side endpoints.

#### Scenario: Platform admin creates a department template

- **WHEN** a platform admin submits `POST /api/platform/department-templates` with `{ name: "製造部門", value: ["生產製造", "品質管控"], is_common: false }`
- **THEN** the system SHALL persist the template to `platform.db.department_templates`, return 201 Created with the new id, and audit log the action

#### Scenario: Tenant cannot mutate templates

- **WHEN** a tenant user (any role) attempts `POST /api/platform/department-templates`
- **THEN** the system SHALL return 403 Forbidden because `platformAdminMiddleware` rejects non-platform-admin tokens

---

### Requirement: Industry × department × size assignment table

The system SHALL provide an `industry_dept_assignments` junction table that links each department template to one or more industries, with per-(industry, template) `sizes_json` (JSON array of company size codes such as `'micro'`, `'small'`, `'medium'`, `'large'`).

The combination `(industry_code, dept_template_id)` SHALL be unique. Deleting a department template SHALL cascade to its assignments. Deleting an industry SHALL be blocked while assignments reference it.

#### Scenario: Same template assigned to two industries with different size profiles

- **WHEN** a platform admin assigns template "業務部" to industry `manufacturing` with `sizes_json=["medium","large"]` and to industry `retail` with `sizes_json=["micro","small","medium","large"]`
- **THEN** the system SHALL persist two separate rows in `industry_dept_assignments`, and reading templates for `(industry=manufacturing, size=small)` SHALL NOT pre-check "業務部", whereas `(industry=retail, size=small)` SHALL pre-check "業務部"

##### Example: pre-check resolution table

| Industry      | Selected Size | Template `applicable_sizes` | `pre_checked` |
| ------------- | ------------- | --------------------------- | ------------- |
| manufacturing | small         | [micro, small, medium, large] | true        |
| manufacturing | small         | [medium, large]             | false         |
| manufacturing | large         | [medium, large]             | true          |
| retail        | small         | [micro, small, medium, large] | true        |

---

### Requirement: Tenant retrieves department templates filtered by industry and size

The system SHALL provide `GET /api/organization/department-templates?industry=<code>&size=<code>` for authenticated tenant users (`authMiddleware + tenantMiddleware`). The response SHALL include all templates assigned to the requested industry plus all templates with `is_common=true`, regardless of size match. Each item SHALL include a `pre_checked` boolean indicating whether the requested size is within the template's `applicable_sizes`.

The endpoint SHALL read from `platform.db` via `getPlatformDB()` in read-only mode and SHALL NOT modify any platform-level state.

#### Scenario: Tenant lists templates for manufacturing × small

- **WHEN** a tenant admin requests `GET /api/organization/department-templates?industry=manufacturing&size=small`
- **THEN** the system SHALL return all manufacturing-assigned templates plus all `is_common=true` templates, with each item carrying its `applicable_sizes` array and a `pre_checked` flag where `pre_checked = applicable_sizes.includes('small')`

#### Scenario: Industry parameter is required

- **WHEN** a tenant admin requests `GET /api/organization/department-templates` without `industry`
- **THEN** the system SHALL return 400 Bad Request with an error message indicating that `industry` is required

---

### Requirement: Three entry points for adding departments

The org-structure page SHALL replace the single "新增部門" button with a three-option menu: "自行新增", "範本庫導入", "批次匯入". Each option SHALL launch its own dedicated workflow.

The "自行新增" option SHALL preserve the existing single-form behavior unchanged. The "範本庫導入" and "批次匯入" options SHALL share a common preview/conflict-confirm/commit subflow.

#### Scenario: Default entry expands the menu

- **WHEN** a tenant admin clicks "新增部門" on a company node
- **THEN** the UI SHALL display a dropdown or split-button with three labeled options, and clicking any option SHALL open its respective dialog

#### Scenario: 自行新增 preserves existing behavior

- **WHEN** the admin selects "自行新增"
- **THEN** the system SHALL display the existing single-department form and call `POST /api/organization/departments` on submit, with no change to the legacy single-create flow

---

### Requirement: Template import flow with smart-default checkboxes

The "範本庫導入" workflow SHALL guide the tenant admin through: (1) industry selection (required, sourced from the standardized industries lookup), (2) company-size selection (required, one of micro/small/medium/large), (3) a checkbox list of all templates returned by the API. Templates with `pre_checked=true` SHALL appear pre-selected; all rows SHALL remain user-toggleable.

The UI SHALL provide three control buttons: 全選 (select all), 全取消 (deselect all), and 恢復智慧預設 (reset to API-provided pre_checked state).

#### Scenario: Smart defaults can be overridden manually

- **WHEN** the admin selects industry=manufacturing and size=small, then manually checks a row whose `pre_checked=false`
- **THEN** the row SHALL become selected and remain selected when the admin proceeds to the next step

#### Scenario: 恢復智慧預設 restores API state

- **WHEN** the admin manually toggles several rows and then clicks "恢復智慧預設"
- **THEN** every row's checked state SHALL be reset to its `pre_checked` value from the API response

---

### Requirement: CSV batch import with validation

The "批次匯入" workflow SHALL accept a CSV file upload. The CSV format SHALL contain at minimum a `name` column (required, non-empty string); optional columns SHALL include `value` (parsed as a comma-or-newline-separated list, then stored as JSON array of strings). The system SHALL accept UTF-8 (with or without BOM) encoding and SHALL reject files larger than 1000 data rows.

Parsing SHALL surface clear, row-numbered errors before the user proceeds to mode selection.

#### Scenario: CSV with valid rows

- **WHEN** the admin uploads a CSV containing rows `[{name: "業務部", value: "拓展業務,客戶關係"}, {name: "研發部", value: "新產品開發"}]`
- **THEN** the system SHALL parse 2 valid items and proceed to mode selection

#### Scenario: CSV with empty name

- **WHEN** the admin uploads a CSV where row 3 has an empty `name` field
- **THEN** the system SHALL reject the file and display an error referencing row 3 with the message "name 欄位不可為空"

#### Scenario: Oversized CSV

- **WHEN** the admin uploads a CSV with more than 1000 data rows
- **THEN** the system SHALL reject the file with a message instructing the user to split the file

---

### Requirement: Validate-then-execute import flow modeled on batch-employee-import

Both the template import and CSV import workflows SHALL follow the validate-then-execute pattern established by `routes/batch-import.js` (`/api/employee/batch-import/validate` + `/execute`). The validate endpoint `POST /api/organization/companies/:id/departments/import/validate` SHALL accept a JSON body containing `{ items: [{name, value?}], mode: 'overwrite' | 'merge' }` from either template selection (items derived from user-checked templates) or frontend-parsed CSV (items derived from the uploaded file after the frontend parses it). The endpoint SHALL return `{ totalRows, validRows, errorRows, items: [{name, value, status, errors[]}], conflicts: [{name, existing_id, ...}], to_insert: [{name, value}] }`.

CSV parsing (UTF-8 / UTF-8 BOM detection, header field mapping, row-numbered errors) SHALL be performed in the frontend before sending JSON to the backend, mirroring the architecture of `routes/batch-import.js` where `req.body.rows` is already parsed.

A conflict SHALL be defined as an item whose `name` already exists in `org_units` for the target company (i.e. `parent_id = companyId AND type = 'department'`). The validate endpoint SHALL NOT mutate any database state.

The conflict source SHALL be `org_units` (the tree's single source of truth) rather than the `departments` extension table, because the two tables can drift (legacy pre-D-16 data or arrhythmic delete paths may leave orphan rows in either direction). Querying `org_units` ensures the import flow agrees with what the user sees on the org-tree UI.

The frontend SHALL display the conflict list in `conflict-confirm-modal`, allowing the admin to confirm or cancel before execute.

#### Scenario: Validate detects conflicts

- **WHEN** the admin imports `["人資部", "財務部"]` to a company that already has "人資部" registered
- **THEN** the validate response SHALL include "人資部" in `conflicts[]` with the existing department id, and "財務部" in `to_insert[]`

#### Scenario: Validate never writes data

- **WHEN** validate is called and conflicts exist
- **THEN** the database state SHALL remain unchanged; no `departments` or `org_units` row SHALL be inserted or modified

#### Scenario: Validate accepts the same JSON body for template and CSV paths

- **WHEN** the admin selects 5 templates from the template library OR uploads a CSV that the frontend parses into 5 items
- **THEN** both paths SHALL POST the same JSON body shape `{ items, mode }` to the validate endpoint, and the endpoint SHALL return the unified response shape regardless of source — confirming the two entry points share a single backend pathway

---

### Requirement: Execute imports atomically with overwrite or merge mode

The system SHALL provide `POST /api/organization/companies/:id/departments/import/execute` accepting `{ items, mode: 'overwrite' | 'merge' }`. The implementation SHALL wrap all writes in `req.tenantDB.transaction()` to ensure atomicity across `org_units` and `departments` tables.

In `overwrite` mode, the system SHALL update `departments.value` keyed by `(name, targetOrgUnitId)`, preserving `id`, `org_unit_id`, `manager_id`, and any employee bindings. If the `(name, targetOrgUnitId)` UPDATE matches zero rows (i.e. an `org_units` department exists but the `departments` extension row is missing — orphan/legacy data), the system SHALL fallback to INSERT a fresh `departments` row to restore consistency. Non-conflicting items SHALL be inserted into both `org_units` (type='department', parent_id=companyId) and `departments`.

In `merge` mode, conflicting rows SHALL be skipped entirely; only non-conflicting items SHALL be inserted.

The response SHALL include `{ created: [{id, name}], updated: [{id, name}], skipped: [{name}] }`.

#### Scenario: Overwrite mode updates value, preserves bindings

- **WHEN** the admin imports "人資部" with `value=["招募", "教育訓練"]` in overwrite mode, and "人資部" already exists with id `dept-001` and 5 bound employees
- **THEN** the system SHALL update `departments.value` to the new array for `dept-001`, the row id and employee bindings SHALL remain unchanged, and the response SHALL list `dept-001` under `updated[]`

#### Scenario: Merge mode skips conflicts

- **WHEN** the admin imports "人資部" and "資安部" in merge mode, and "人資部" already exists
- **THEN** the system SHALL insert "資安部" only, return `created: [{id: <new>, name: "資安部"}]` and `skipped: [{name: "人資部"}]`, and "人資部" SHALL remain unchanged

#### Scenario: Transaction rolls back on failure

- **WHEN** an INSERT fails midway through a 10-item import
- **THEN** the system SHALL roll back the entire transaction; no partial writes SHALL persist; the response SHALL return 500 with the transaction error message; the response payload SHALL include an empty `partial: { created: [], updated: [], skipped: [] }` so the frontend can prompt the user to retry the entire batch (sql.js + tenantDB.transaction wraps the whole batch and cannot reliably identify the per-row failure index without per-row sub-transactions, which are intentionally not implemented for cost/benefit reasons)

---

### Requirement: Conflict check key matches the org-tree single source of truth

The conflict detection key SHALL be `(parent_id = companyId, name)` against `org_units` filtered to `type = 'department'`. The matching `companyId` is the URL parameter directly — no parent walking is needed at this layer because the org-tree shows departments as direct children of the company.

The lookup SHALL prefer `org_units` over the `departments` extension table because the two can drift (legacy pre-D-16 data, prior delete bugs leaving orphan rows in either direction). Using `org_units` as the single source guarantees the import flow agrees with what the user sees on the org-tree UI.

The legacy single-create endpoint `POST /api/organization/departments` SHALL also dedup against `org_units` (in addition to its existing `departments`-table check) so all department creation paths share the same source of truth.

#### Scenario: Same name under different companies is not a conflict

- **WHEN** the admin imports "人資部" to subsidiary A, and "人資部" already exists only under subsidiary B (a sibling)
- **THEN** the preview SHALL return zero conflicts (different `parent_id`); the new "人資部" under subsidiary A SHALL be inserted normally

#### Scenario: Orphan departments row does not block import

- **WHEN** the admin imports "業務部" to a company where `departments` table contains a stale row named "業務部" with the company's `org_unit_id` but no matching `org_units` row (legacy/orphan data)
- **THEN** the preview SHALL return zero conflicts because the `org_units` lookup misses; the import SHALL proceed and the orphan `departments` row SHALL be reused via the `(name, targetOrgUnitId)` UPDATE-then-INSERT pattern in execute (see "Execute imports atomically with overwrite or merge mode")

---

### Requirement: Department code generator hook for D-15

The import commit endpoint SHALL invoke an optional code generator at `codeGenerator.tryNext('department', { tenantId, orgUnitId })` for each newly inserted department. When the D-15 code naming feature is not enabled, `tryNext` SHALL return `null` and the inserted row SHALL retain `code = NULL`. When D-15 is enabled and configured for `target_table='departments'`, the returned code SHALL be applied to the new row.

This requirement SHALL NOT introduce the D-15 implementation itself; it SHALL only define the integration contract.

#### Scenario: D-15 disabled

- **WHEN** an import inserts new departments and D-15 is not configured
- **THEN** `code_generator.tryNext` SHALL return null, and `departments.code` SHALL be NULL for newly inserted rows

#### Scenario: D-15 enabled (forward-looking)

- **WHEN** D-15 is enabled with prefix='HR' for departments and an import inserts a new department
- **THEN** `code_generator.tryNext` SHALL return a value such as `'HR-001'`, and the inserted row SHALL persist that value in `departments.code`

---

### Requirement: Rename departments.responsibilities to departments.value

The system SHALL rename the column `departments.responsibilities` to `departments.value`. The column data type SHALL remain `TEXT DEFAULT '[]'` (a JSON array of strings). All existing data SHALL be preserved via `ALTER TABLE departments RENAME COLUMN`.

The migration SHALL be implemented in BOTH `tenant-schema.js:initTenantSchema()` (for newly created tenants) AND `tenant-db-manager.js:_runMigrations()` (for existing tenants), each guarded by an idempotent `PRAGMA table_info` check.

The rename SHALL NOT affect `job_descriptions.responsibilities` or any L2 competency/JD code path.

#### Scenario: Existing tenant database is upgraded on next load

- **WHEN** an existing tenant database with `departments.responsibilities` is loaded after the upgrade
- **THEN** `_runMigrations()` SHALL execute `ALTER TABLE departments RENAME COLUMN responsibilities TO value`, and the tenant SHALL retain all prior values now accessible via the `value` column

#### Scenario: Migration is idempotent

- **WHEN** `_runMigrations()` is invoked twice on the same database
- **THEN** the second invocation SHALL detect that `value` already exists and SHALL NOT execute the rename again, raising no error

#### Scenario: New tenant gets the renamed column directly

- **WHEN** a brand-new tenant database is initialized via `initTenantSchema()`
- **THEN** the `departments` table SHALL be created with the column `value` (not `responsibilities`)

#### Scenario: JD responsibilities is untouched

- **WHEN** the migration completes
- **THEN** `job_descriptions.responsibilities` SHALL remain unchanged in both schema and data

---

### Requirement: First-run seed of department templates per industry

The system SHALL seed department templates on first initialization of `platform.db`, covering at least 7 templates per industry (mix of common-pool and industry-specific). The seed SHALL be implemented via a dedicated module (e.g. `server/src/db/seeds/dept-template-seed.js`) and invoked once from `platform-db.js` after the `industries` table is seeded. Seeding SHALL be idempotent.

The common pool SHALL include at least: 人資部 (HR), 財務部 (Finance), 資訊部 (IT), 行政管理部 (Admin), 法務部 (Legal), 行銷部 (Marketing), 業務部 (Sales), 採購部 (Procurement). Each common-pool template SHALL be assigned (via `industry_dept_assignments`) to all 12 industries with appropriate `sizes_json`.

Each industry SHALL additionally have at least 4-7 industry-specific templates so that the combined visible list (common + specific) reaches 7-12 templates. Examples per industry SHALL include but are not limited to:

| Industry         | Industry-specific examples                             |
| ---------------- | ------------------------------------------------------ |
| `it-services`    | 軟體開發部, 系統維運部, 雲端架構部, 客戶支援部, 產品管理部 |
| `tech`           | 研發中心, 產品設計部, 技術支援部, 創新實驗室             |
| `manufacturing`  | 製造部, 品保部, 生產管理部 (PMC), 研發部, 廠務部, 物料管理部 |
| `retail`         | 門市營運部, 商品企劃部, 倉儲物流部, 視覺陳列部           |
| `food-service`   | 廚務部, 外場服務部, 餐廳營運部, 食品安全部, 中央廚房     |
| `healthcare`     | 醫療部, 護理部, 醫務管理部, 藥劑部, 醫療品質部           |
| `finance`        | 風險管理部, 法令遵循部, 投資管理部, 信貸部, 稽核部       |
| `nonprofit`      | 募款發展部, 計畫執行部, 志工管理部, 公共關係部           |
| `education`      | 教務部, 學務部, 教學發展部, 招生中心                     |
| `construction`   | 工程部, 設計部, 工務部, 安全衛生部, 土地開發部           |
| `logistics`      | 倉儲部, 配送部, 車隊管理部, 報關部                       |
| `other`          | (uses common pool only — no specific seed templates)   |

#### Scenario: First-run seeds templates for all 12 industries

- **WHEN** `platform-db.js:initPlatformDB()` runs against an empty `platform.db`
- **THEN** the system SHALL seed all common-pool templates (`is_common=1`) and all industry-specific templates, and SHALL create `industry_dept_assignments` rows so that every industry has at least 7 templates visible (common + specific) when queried via `GET /api/platform/department-templates`

#### Scenario: Seed is idempotent

- **WHEN** the platform DB is restarted with seeding already complete
- **THEN** the seed function SHALL detect existing rows by template name + assignment uniqueness and SHALL NOT duplicate any data

---

### Requirement: Audit logging for import actions

Every successful template or CSV import commit SHALL record an audit log entry in `platform.db.audit_logs` with `action='import_departments'`, `tenant_id`, `user_id`, and `details` containing the company id, mode, and counts of `created/updated/skipped`.

#### Scenario: Successful import logs an audit entry

- **WHEN** a tenant admin commits an import with mode='merge' resulting in `created.length=5, skipped.length=2`
- **THEN** `audit_logs` SHALL gain one new row with the user id, tenant id, and details JSON containing `{ companyId, mode: "merge", created: 5, skipped: 2 }`

#### Scenario: Failed import does not log success

- **WHEN** a transaction rolls back due to an error
- **THEN** no audit log entry with `action='import_departments'` SHALL be created for that attempt
