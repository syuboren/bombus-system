## MODIFIED Requirements

### Requirement: CSV required fields validation

The validation endpoint SHALL enforce the following required fields for each row: name (姓名), email, subsidiary (子公司), department (部門), hire_date (到職日期), level (職等), grade (職級), position (職稱). The `employee_no` (工號) field SHALL be optional — when blank, the system SHALL auto-generate a value during execute via the `code-naming-rules` capability if a rule is configured for `target='employee'`. Missing other required fields SHALL result in validation failure for that row.

#### Scenario: Missing required field

- **WHEN** a CSV row is missing the `email` field
- **THEN** the validation result for that row SHALL have `status: "error"` with error message "必填欄位「Email」缺失"

#### Scenario: All required fields present

- **WHEN** a CSV row has all required fields filled
- **THEN** the validation SHALL proceed to format and reference validation

#### Scenario: Optional employee_no with rule configured

- **WHEN** a CSV row omits `employee_no` AND a `code_naming_rules` row exists for `target='employee'` with `enabled=1`
- **THEN** the validation SHALL succeed for the missing field, AND the validate response SHALL include a preview annotation `"預計分配 <prefix>NNNN"` showing the projected sequence value

#### Scenario: Optional employee_no without rule

- **WHEN** a CSV row omits `employee_no` AND no `code_naming_rules` row exists (or `enabled=0`) for `target='employee'`
- **THEN** the validation result for that row SHALL have `status: "error"` with error message "工號未填且系統未設定員工編號規則，請填寫或聯絡 super_admin 設定規則"

## ADDED Requirements

### Requirement: Validate-phase preview of auto-generated employee numbers

The validation endpoint SHALL include a per-batch preview of auto-generated employee numbers when the rule is configured. The preview SHALL be computed by counting blank `employee_no` rows in CSV order and projecting against `current_seq + 1, current_seq + 2, ...`. The response SHALL include a top-level `previewedSequence` array listing the projected codes per blank row index.

The validate endpoint SHALL NOT consume `current_seq` — only execute does. The validate response SHALL include a warning message `"並發匯入時實際分配可能與預覽不同，請以執行結果為準"` whenever any rows are projected.

#### Scenario: Validate previews sequence without consumption

- **WHEN** a CSV with 3 blank `employee_no` rows is validated, with rule `{ prefix='E', padding=4, current_seq=10 }`
- **THEN** the response SHALL include `previewedSequence: ['E0011', 'E0012', 'E0013']` AND `current_seq` SHALL remain `10` after the request

#### Scenario: Mixed manual and auto rows preview correctly

- **WHEN** a CSV has rows in order: row 1 with `employee_no='X-001'` (manual), row 2 blank, row 3 with `employee_no='X-002'` (manual), row 4 blank, with rule `{ current_seq=20 }`
- **THEN** the previewedSequence SHALL contain entries only for rows 2 and 4: `[null, 'E0021', null, 'E0022']` — manual rows occupy their CSV slot but contribute `null` to the preview

---

### Requirement: Execute-phase atomic seq consumption with concurrent protection

The execute endpoint SHALL wrap the entire batch insertion in a single database transaction. Within the transaction, for each blank `employee_no` row, the endpoint SHALL invoke `codeGenerator.tryNext('employee', ctx)` to obtain the next code; manual `employee_no` values SHALL be written as-is without modifying `current_seq`. Concurrent batches SHALL be serialized at the transaction boundary, ensuring no two batches receive overlapping codes.

When `tryNext` returns `null` mid-batch (rule disabled between validate and execute), the transaction SHALL ROLLBACK and respond `409 Conflict` with message `"員工編號規則已被停用，請重新驗證"`.

#### Scenario: Concurrent batches do not overlap

- **WHEN** Batch A and Batch B execute simultaneously, each requesting 50 auto-generated employee codes against rule `{ current_seq=100 }`
- **THEN** Batch A and Batch B SHALL receive non-overlapping ranges (e.g., Batch A gets 101-150, Batch B gets 151-200), and final `current_seq` SHALL be 200

#### Scenario: Mid-batch failure rolls back seq

- **WHEN** an execute batch consumes codes for rows 1-25, then row 26 fails validation (e.g., manager_no reference invalid)
- **THEN** the transaction SHALL ROLLBACK, `current_seq` SHALL revert to its pre-transaction value, AND the entire batch SHALL be reported as failed

#### Scenario: Manual values do not consume seq

- **WHEN** a CSV with 5 rows (3 manual `employee_no` values, 2 blank) is executed with rule `{ current_seq=50 }`
- **THEN** `current_seq` SHALL advance to `52` after execute (only 2 blanks consumed), AND manual rows SHALL persist with their submitted `employee_no` values

#### Scenario: Rule disabled mid-flight rejects batch

- **WHEN** validate succeeds with rule enabled, then super_admin disables the rule, then HR clicks execute
- **THEN** the execute endpoint SHALL ROLLBACK with HTTP `409 Conflict` and message `"員工編號規則已被停用，請重新驗證"`

##### Example: Concurrent batch sequence allocation

| Time | Batch A action | Batch B action | current_seq after |
| ---- | -------------- | -------------- | ----------------- |
| T0   | (none) | (none) | 100 |
| T1   | BEGIN; consume 50 codes (101-150); | BEGIN (blocks waiting) | 150 (uncommitted) |
| T2   | COMMIT | (still waiting) | 150 (committed) |
| T3   | (done) | consume 50 codes (151-200); COMMIT | 200 (committed) |

---

### Requirement: Cross-company assignment is not handled by batch import

The batch import endpoint SHALL NOT create cross-company employment relationships. Each CSV row SHALL produce exactly one employee with one primary assignment (to the row's specified subsidiary). Cross-company assignments SHALL only be added afterward via the dedicated UI in the employee detail page (per `cross-company-employment` capability).

When a CSV contains two rows with the same `employee_no` value (or duplicate emails resolving to the same employee), the duplicate row SHALL fail validation as before — the system SHALL NOT attempt to interpret the second row as a cross-company assignment.

#### Scenario: Duplicate employee_no rejected as before

- **WHEN** a CSV contains row 1 with `employee_no='E001', subsidiary='sub-A'` and row 2 with `employee_no='E001', subsidiary='sub-B'`
- **THEN** row 2 SHALL fail validation with error `"工號 E001 在匯入檔案中重複（第 1 行）"`, AND the system SHALL NOT create a cross-company assignment

#### Scenario: cross_company_code never generated by batch import

- **WHEN** a batch import successfully creates 50 new employees, each with one primary assignment
- **THEN** all 50 employees SHALL have `cross_company_code = NULL`. The `employee_cross` rule SHALL NOT be invoked. Cross-company codes are generated only when a second active assignment is added via the dedicated UI (per `cross-company-employee-id` capability).
