## ADDED Requirements

### Requirement: Backward-compatible opt-in pagination on employee list endpoint

The `GET /api/employee/list` endpoint SHALL support optional pagination via query parameters and SHALL preserve the existing array response shape when no `page` parameter is supplied. The endpoint SHALL switch to a paginated object response (`{ data, total, page, pageSize, totalPages }`) only when the request includes a numeric `page` query parameter.

The endpoint MUST detect a missing `page` parameter using strict checks (`page` is `undefined` OR `parseInt(page)` is `NaN`) and fall back to the legacy array response in those cases, so that callers passing `?page=undefined` or `?page=` do not accidentally trigger pagination.

#### Scenario: Legacy array response when page parameter omitted

- **WHEN** a client calls `GET /api/employee/list` without a `page` query parameter
- **THEN** the response body SHALL be a JSON array of employee objects, identical in shape to the pre-D-13 contract

##### Example: legacy callers continue working

- **GIVEN** a tenant DB with 120 active employees
- **WHEN** the client calls `GET /api/employee/list`
- **THEN** the response is a JSON array with 120 elements, ordered by `(department, name)`, with `Content-Type: application/json`

#### Scenario: Paginated response when page parameter provided

- **WHEN** a client calls `GET /api/employee/list?page=1&pageSize=50`
- **THEN** the response SHALL be a JSON object with shape `{ data: Employee[], total: number, page: number, pageSize: number, totalPages: number }`, where `data.length <= pageSize` and `totalPages == Math.ceil(total / pageSize)`

##### Example: 120 employees paginated at 50 per page

- **GIVEN** a tenant DB with 120 active employees
- **WHEN** the client calls `GET /api/employee/list?page=2&pageSize=50`
- **THEN** the response is `{ data: Employee[50], total: 120, page: 2, pageSize: 50, totalPages: 3 }`

#### Scenario: Invalid page parameter falls back to array

- **WHEN** a client calls `GET /api/employee/list?page=undefined` or `GET /api/employee/list?page=`
- **THEN** the endpoint SHALL treat the page parameter as missing and return the legacy array response

---

### Requirement: pageSize bounds and default

The endpoint SHALL apply a default `pageSize` of 50 when pagination is active and `pageSize` is omitted, and SHALL cap any user-supplied `pageSize` at 200 without returning an error. The endpoint SHALL reject `pageSize <= 0` or non-numeric values by treating them as the default.

#### Scenario: Default pageSize when omitted

- **WHEN** a client calls `GET /api/employee/list?page=1` without `pageSize`
- **THEN** the response uses `pageSize: 50`

#### Scenario: pageSize cap at 200

- **WHEN** a client calls `GET /api/employee/list?page=1&pageSize=500`
- **THEN** the response uses `pageSize: 200` and the request succeeds with HTTP 200

##### Example: cap behavior

| Input pageSize | Effective pageSize | Notes |
| -------------- | ------------------ | ----- |
| (omitted)      | 50                 | default |
| 20             | 20                 | within range |
| 200            | 200                | at cap |
| 500            | 200                | clamped |
| 0              | 50                 | invalid → default |
| -10            | 50                 | invalid → default |
| "abc"          | 50                 | non-numeric → default |

---

### Requirement: Search across name email and employee number

When the `search` query parameter is supplied (and is a non-empty string after trimming), the endpoint SHALL filter results to employees where ANY of the following columns contain the search value as a substring (case-insensitive): `name`, `email`, `employee_no`. Search SHALL apply BEFORE pagination so `total` reflects the filtered set.

The endpoint MUST use parameterized SQL with `LIKE '%' || ? || '%' COLLATE NOCASE` (or equivalent), never string concatenation, to prevent SQL injection.

#### Scenario: Search matches name

- **WHEN** a client calls `GET /api/employee/list?search=alice`
- **THEN** the response includes employees whose `name` contains "alice" (case-insensitive), and excludes employees with no match in `name`, `email`, or `employee_no`

#### Scenario: Search matches employee number

- **WHEN** a client calls `GET /api/employee/list?search=EMP-001`
- **THEN** the response includes the employee with `employee_no = "EMP-001"` regardless of name or email

#### Scenario: Search is case-insensitive

- **WHEN** a client calls `GET /api/employee/list?search=ALICE` and an employee has `name = "alice"`
- **THEN** that employee appears in the response

#### Scenario: Empty search ignored

- **WHEN** a client calls `GET /api/employee/list?search=`
- **THEN** the search filter SHALL NOT be applied; the response is identical to a request without the `search` parameter

#### Scenario: Search combines with pagination total

- **WHEN** a client calls `GET /api/employee/list?page=1&pageSize=10&search=alice` and 7 employees match
- **THEN** the response is `{ data: Employee[7], total: 7, page: 1, pageSize: 10, totalPages: 1 }`

---

### Requirement: Whitelisted server-side sort

When the `sort` query parameter is supplied, the endpoint SHALL apply server-side ordering using ONLY the following whitelisted columns: `name`, `hire_date`, `employee_no`, `department`. The `order` parameter SHALL accept ONLY `asc` or `desc` (case-insensitive). Any value outside these whitelists SHALL be silently ignored and the endpoint SHALL fall back to the default ordering `ORDER BY department, name` (ascending).

The endpoint MUST NOT interpolate user-supplied `sort` or `order` values directly into the SQL string; it MUST use a server-side lookup table to map allowed values to SQL fragments.

#### Scenario: Valid sort applied

- **WHEN** a client calls `GET /api/employee/list?page=1&sort=hire_date&order=desc`
- **THEN** the response is ordered by `hire_date` descending

#### Scenario: Invalid sort column ignored

- **WHEN** a client calls `GET /api/employee/list?page=1&sort=password&order=asc`
- **THEN** the endpoint SHALL ignore the `sort` parameter and use the default ordering `(department, name) ASC`

#### Scenario: Invalid order direction ignored

- **WHEN** a client calls `GET /api/employee/list?page=1&sort=name&order=DESCENDING`
- **THEN** the endpoint SHALL ignore the `order` parameter and apply `ORDER BY name ASC`

#### Scenario: SQL injection attempt blocked

- **WHEN** a client calls `GET /api/employee/list?page=1&sort=name;DROP TABLE employees;--`
- **THEN** the endpoint SHALL ignore the `sort` parameter, use the default ordering, and NOT execute any injected SQL

---

### Requirement: Pagination composes with existing filters and scope

The pagination, search, and sort behaviors SHALL apply AFTER all existing filters (`dept`, `status`, `all`, `org_unit_id`, `role`) and AFTER the row-level scope filter from `buildScopeFilter`. The `total` SHALL reflect the count of rows visible to the requesting user (post-scope), not the raw row count of the `employees` table.

#### Scenario: Scope filter narrows total

- **WHEN** a user with `view_scope = 'department'` (visible to 30 employees out of 200 in the tenant) calls `GET /api/employee/list?page=1&pageSize=10`
- **THEN** the response is `{ data: Employee[10], total: 30, page: 1, pageSize: 10, totalPages: 3 }`

#### Scenario: Existing role filter still applies

- **WHEN** a client calls `GET /api/employee/list?page=1&role=interviewer`
- **THEN** the response includes only employees holding the `interviewer` role, paginated; `total` reflects the count of interviewers

#### Scenario: Existing dept filter combines with search

- **WHEN** a client calls `GET /api/employee/list?page=1&dept=Engineering&search=alice`
- **THEN** the response includes only employees in the Engineering department whose name/email/employee_no contains "alice"

---

### Requirement: Compound database index covering default sort path

The tenant database schema SHALL include a compound index `idx_employees_status_org_dept_name ON employees(status, org_unit_id, department, name)`. This index SHALL be created in BOTH the `tenant-schema.js initTenantSchema()` path (for newly created tenants) AND the `tenant-db-manager.js _runMigrations()` path (for existing tenants), using `CREATE INDEX IF NOT EXISTS` for idempotency.

#### Scenario: Index exists for newly created tenants

- **WHEN** a new tenant is created via `seedTenantRBAC` / `initTenantSchema`
- **THEN** the resulting tenant DB SHALL contain `idx_employees_status_org_dept_name` (verifiable via `SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='employees'`)

#### Scenario: Index exists for existing tenants after migration

- **WHEN** an existing tenant DB without `idx_employees_status_org_dept_name` is opened (triggering `_runMigrations`)
- **THEN** the migration SHALL execute `CREATE INDEX IF NOT EXISTS idx_employees_status_org_dept_name ...` and the index SHALL be present after the migration completes

#### Scenario: Migration is idempotent

- **WHEN** the migration runs a second time on a tenant that already has the index
- **THEN** the migration SHALL succeed without error and SHALL NOT create a duplicate index
