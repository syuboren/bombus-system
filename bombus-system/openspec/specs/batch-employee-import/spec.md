# Batch Employee Import — 員工批次匯入

## Purpose

Provide CSV-based batch employee import with a validate-then-execute workflow. Validation runs all business rules without persisting data so HR can review errors before committing; execution then creates employee + user account pairs via the unified account creation service with per-row isolation and an auditable import job record.

## Requirements

### Requirement: CSV validation endpoint

The system SHALL provide `POST /api/employee/batch-import/validate` endpoint that accepts a CSV file (multipart upload), parses all rows, validates each row against business rules, and returns a validation report without persisting any data.

#### Scenario: All rows pass validation

- **WHEN** HR uploads a CSV where all rows have valid data
- **THEN** the endpoint SHALL return `{ totalRows: N, validRows: N, errorRows: 0, rows: [...] }` where each row has `status: "valid"` and parsed `data` object

#### Scenario: Some rows fail validation

- **WHEN** HR uploads a CSV where some rows have invalid data
- **THEN** the endpoint SHALL return the full validation report with failing rows marked as `status: "error"` and an `errors` array listing each validation failure (e.g., "Email 格式不正確", "部門「行銷部」不存在於組織架構中")

#### Scenario: Empty CSV file

- **WHEN** HR uploads an empty CSV file (no data rows)
- **THEN** the endpoint SHALL return a 400 error with message indicating the file contains no data


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: CSV required fields validation

The validation endpoint SHALL enforce the following required fields for each row: name (姓名), email, employee_no (工號), subsidiary (子公司), department (部門), hire_date (到職日期), level (職等), grade (職級), position (職稱). Missing required fields SHALL result in validation failure for that row.

#### Scenario: Missing required field

- **WHEN** a CSV row is missing the `email` field
- **THEN** the validation result for that row SHALL have `status: "error"` with error message "必填欄位「Email」缺失"

#### Scenario: All required fields present

- **WHEN** a CSV row has all required fields filled
- **THEN** the validation SHALL proceed to format and reference validation


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: CSV format and reference validation

The validation endpoint SHALL validate data formats and cross-reference against existing database records.

#### Scenario: Invalid email format

- **WHEN** a CSV row has an email value that does not match RFC 5322 format
- **THEN** the row SHALL fail with error "Email 格式不正確"

#### Scenario: Duplicate email within CSV

- **WHEN** two or more CSV rows have the same email address
- **THEN** the duplicate rows (2nd occurrence onwards) SHALL fail with error "Email 在匯入檔案中重複（第 N 行）"

#### Scenario: Email already exists in database

- **WHEN** a CSV row has an email that already exists in `employees.email` or `users.email`
- **THEN** the row SHALL fail with error "Email 已存在於系統中"

#### Scenario: Duplicate employee number within CSV

- **WHEN** two or more CSV rows have the same employee_no
- **THEN** the duplicate rows SHALL fail with error "工號在匯入檔案中重複（第 N 行）"

#### Scenario: Employee number already exists in database

- **WHEN** a CSV row has an employee_no that already exists in `employees.employee_no`
- **THEN** the row SHALL fail with error "工號已存在於系統中"

#### Scenario: Subsidiary does not exist in org_units

- **WHEN** a CSV row has a subsidiary name or code that does not match any `org_units` record with `type = 'subsidiary'`
- **THEN** the row SHALL fail with error "子公司「XXX」不存在於組織架構中"

#### Scenario: Department does not exist under subsidiary

- **WHEN** a CSV row has a department name that does not match any `org_units` record with `type = 'department'` under the specified subsidiary
- **THEN** the row SHALL fail with error "部門「XXX」不存在於子公司「YYY」下"

#### Scenario: Grade level does not exist

- **WHEN** a CSV row has a level/grade combination that does not exist in the `grade_levels` table
- **THEN** the row SHALL fail with error "職等「X」或職級「Y」不存在於職等職級表中"

#### Scenario: Invalid date format

- **WHEN** a CSV row has a hire_date that is not in ISO 8601 (`YYYY-MM-DD`) or `YYYY/MM/DD` format
- **THEN** the row SHALL fail with error "到職日期格式不正確，請使用 YYYY-MM-DD 或 YYYY/MM/DD"

#### Scenario: Manager field is optional

- **WHEN** a CSV row has an empty manager field
- **THEN** the row SHALL pass validation for that field (manager is allowed to be filled later)

#### Scenario: Manager field has value but reference not found

- **WHEN** a CSV row has a manager value (employee_no or email) that does not exist in the database or in preceding CSV rows
- **THEN** the row SHALL pass validation with a warning "主管「XXX」目前不存在，將在匯入後手動補填" (non-blocking warning, not an error)


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: Batch import execution endpoint

The system SHALL provide `POST /api/employee/batch-import/execute` endpoint that accepts the validated row data, creates an import job record, and processes the import asynchronously in the background.

#### Scenario: Import job created and processing starts

- **WHEN** HR submits validated data to the execute endpoint
- **THEN** the system SHALL create an `import_jobs` record with `status = 'processing'`, return the `jobId` immediately, and begin background processing

#### Scenario: Import blocked when validation has errors

- **WHEN** HR submits data that contains rows with `status: "error"`
- **THEN** the endpoint SHALL return a 400 error with message "匯入資料中有錯誤，請先修正後重新驗證"

#### Scenario: Each row creates employee and user account

- **WHEN** the background processor processes a valid row
- **THEN** the system SHALL call `createEmployeeWithAccount()` from the unified account creation service, increment `import_jobs.processed_rows` and `success_count`, and store the result in `import_results`

#### Scenario: Row processing failure is isolated

- **WHEN** a row fails during import execution (e.g., race condition on email uniqueness)
- **THEN** the system SHALL record the error in `import_results` with `status = 'error'` and `error_message`, increment `import_jobs.error_count`, and continue processing remaining rows

#### Scenario: Import completion updates job status

- **WHEN** all rows have been processed
- **THEN** the system SHALL update `import_jobs.status` to `'completed'`, set `completed_at` timestamp, and write an audit log entry with action `'batch_import_completed'`


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: Import progress polling endpoint

The system SHALL provide `GET /api/employee/batch-import/:jobId/status` endpoint that returns the current progress of a batch import job.

#### Scenario: Job in progress

- **WHEN** a client polls the status endpoint while the job is processing
- **THEN** the endpoint SHALL return `{ jobId, status: 'processing', totalRows, processedRows, successCount, errorCount }`

#### Scenario: Job completed

- **WHEN** a client polls the status endpoint after the job completes
- **THEN** the endpoint SHALL return `{ jobId, status: 'completed', totalRows, processedRows, successCount, errorCount, completedAt }`


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: Import result report endpoint

The system SHALL provide `GET /api/employee/batch-import/:jobId/report` endpoint that returns the detailed import results for download.

#### Scenario: Download import report as JSON

- **WHEN** HR requests the report for a completed import job
- **THEN** the endpoint SHALL return an array of result records, each containing: `rowNumber`, `status` (success/error), `employeeName`, `email`, `employeeNo`, `initialPassword` (for successful records), and `errorMessage` (for failed records)

#### Scenario: Report includes initial passwords

- **WHEN** the import report is downloaded
- **THEN** each successful record SHALL include the `initialPassword` field containing the plaintext password generated during account creation


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: Import audit logging

All batch import operations SHALL be recorded in the platform audit logs.

#### Scenario: Import job audit trail

- **WHEN** a batch import job completes
- **THEN** the system SHALL write an audit log entry with `action = 'batch_import_completed'`, `resource = 'import_job'`, and details including `jobId`, `totalRows`, `successCount`, `errorCount`, and the filename


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: Import database schema

The system SHALL create `import_jobs` and `import_results` tables in the tenant database to track batch import operations.

#### Scenario: import_jobs table created

- **WHEN** a tenant database is initialized or migrated
- **THEN** the `import_jobs` table SHALL exist with columns: `id` (TEXT PK), `status` (TEXT, default 'pending'), `total_rows` (INTEGER), `processed_rows` (INTEGER, default 0), `success_count` (INTEGER, default 0), `error_count` (INTEGER, default 0), `file_name` (TEXT), `created_by` (TEXT FK users), `created_at` (TEXT), `completed_at` (TEXT)

#### Scenario: import_results table created

- **WHEN** a tenant database is initialized or migrated
- **THEN** the `import_results` table SHALL exist with columns: `id` (TEXT PK), `job_id` (TEXT FK import_jobs), `row_number` (INTEGER), `status` (TEXT), `employee_id` (TEXT), `user_id` (TEXT), `initial_password` (TEXT), `error_message` (TEXT), `created_at` (TEXT)


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: CSV template with full field support

The system SHALL support CSV import with the following columns, where required fields are enforced and optional fields are accepted when present.

#### Scenario: CSV header mapping

- **WHEN** the system parses an uploaded CSV file
- **THEN** the system SHALL recognize the following column headers (Chinese or English): 姓名/name, Email/email, 工號/employee_no, 英文名/english_name, 電話/phone, 手機/mobile, 性別/gender, 生日/birth_date, 子公司/subsidiary, 部門/department, 職稱/position, 職等/level, 職級/grade, 到職日期/hire_date, 合約類型/contract_type, 工作地點/work_location, 主管工號/manager_no, 學歷/education, 技能/skills, 底薪/base_salary, 津貼/allowances

<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->