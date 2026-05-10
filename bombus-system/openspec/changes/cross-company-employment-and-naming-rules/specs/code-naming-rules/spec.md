## ADDED Requirements

### Requirement: Code naming rules table for tenant-scoped sequence generation

The system SHALL provide a tenant-scoped `code_naming_rules` table keyed by `target` (an enum of `'employee' | 'department' | 'employee_cross'`), holding `prefix`, `padding`, `current_seq`, and `enabled` fields. Each tenant SHALL have at most one rule per target. When a rule does not exist for a given target, callers SHALL fall back to legacy behavior.

#### Scenario: Rule absent — caller fallback

- **WHEN** `codeGenerator.tryNext('employee', ctx)` is called and no row exists in `code_naming_rules` for `target='employee'`
- **THEN** the function SHALL return `null` and the caller SHALL preserve its existing fallback behavior

#### Scenario: Rule present — code generated

- **WHEN** `codeGenerator.tryNext('employee', ctx)` is called with a rule `{ prefix: 'E', padding: 4, current_seq: 47 }`
- **THEN** the function SHALL return `'E0048'` and `current_seq` SHALL advance to 48 within the same transaction

##### Example: Format outputs

| prefix | padding | current_seq before | Output | current_seq after |
| ------ | ------- | ------------------ | ------ | ----------------- |
| `E`    | 4       | 47                 | `E0048` | 48               |
| `HQ-`  | 3       | 0                  | `HQ-001` | 1               |
| `HR-`  | 3       | 999                | `HR-1000` | 1000           |
| (empty) | 5      | 9                  | `00010` | 10               |

---

### Requirement: Code generator service exposes tryNext and previewBatch APIs

The system SHALL provide a `services/code-generator.js` module exposing two functions: `tryNext(target, ctx)` for atomic single-code consumption inside a database transaction, and `previewBatch(target, count, ctx)` for non-consuming preview of the next N codes (used during validate phases). Both functions SHALL return `null` for `target` values not in the supported enum or when no rule exists.

#### Scenario: tryNext atomically consumes seq

- **WHEN** `tryNext('employee_cross', ctx)` is invoked inside a transaction
- **THEN** the function SHALL `SELECT` the rule row, compute the next code, `UPDATE current_seq` to the new value, and return the formatted code, all within the caller's transaction boundary

#### Scenario: previewBatch does not consume seq

- **WHEN** `previewBatch('employee', 3, ctx)` is invoked with a rule `{ current_seq: 50 }`
- **THEN** the function SHALL return `['E0051', 'E0052', 'E0053']` and `current_seq` SHALL remain 50 (no UPDATE issued)

#### Scenario: Unsupported target returns null

- **WHEN** `tryNext('job', ctx)` or `tryNext('candidate', ctx)` is called
- **THEN** the function SHALL return `null` because `'job'` and `'candidate'` are not in the supported target enum

---

### Requirement: Concurrent batch protection via row-level transaction lock

The `tryNext` function SHALL use the database transaction boundary to serialize concurrent consumers of the same rule row. The caller is responsible for opening the transaction; `tryNext` SHALL not open or commit on its own. When two concurrent batches consume the same target in a single tenant, one SHALL fully complete its sequence allocation before the other begins.

#### Scenario: Sequential batch execution

- **WHEN** Batch A executes inside `BEGIN TRANSACTION ... COMMIT` consuming 100 employee codes, and Batch B starts during Batch A's transaction
- **THEN** Batch B SHALL block until Batch A's COMMIT, then receive codes starting from `current_seq + 100`, with no overlap or gap

#### Scenario: Caller transaction failure rolls back seq

- **WHEN** a caller invokes `tryNext` then ROLLBACKs its transaction
- **THEN** `current_seq` SHALL revert to its pre-transaction value, and the unused codes are not consumed

---

### Requirement: Super_admin sets rules via dedicated settings page

The system SHALL provide a settings page at route `/settings/code-naming` accessible only to users with `role='super_admin'`. The page SHALL allow viewing, creating, editing, and toggling enable status for each target rule. Other roles SHALL receive HTTP 403 from `GET /api/tenant-admin/code-naming-rules` and SHALL NOT see the menu entry in the sidebar.

#### Scenario: Super_admin views and edits rules

- **WHEN** a super_admin navigates to `/settings/code-naming`
- **THEN** the page SHALL display all three target rules (employee / department / employee_cross) with current values and an editor for prefix / padding / enabled toggle

#### Scenario: Non-super_admin denied

- **WHEN** a user with `role='hr_manager'` attempts `GET /api/tenant-admin/code-naming-rules`
- **THEN** the API SHALL respond `403 Forbidden`, and the sidebar SHALL NOT render the "代碼命名規則" menu entry for that user

---

### Requirement: Rules apply only to records created after activation

The system SHALL apply naming rules only to records inserted after the rule's `enabled=1` state. Existing records SHALL NOT be retroactively renamed. Disabling a rule (`enabled=0`) SHALL preserve `current_seq` so re-enabling resumes from the previous counter.

#### Scenario: Rule activation does not retrofit

- **WHEN** super_admin activates an `employee` rule with `prefix='E', padding=4, current_seq=0` while 247 employees already exist with mixed historical numbering
- **THEN** the existing 247 employees SHALL retain their original `employee_no` values, and only employees inserted after activation SHALL receive auto-generated codes starting from `E0001`

#### Scenario: Disable preserves counter

- **WHEN** a rule is disabled with `current_seq=50`, then re-enabled later
- **THEN** the next `tryNext` call SHALL return the code corresponding to `current_seq=51`, not reset to 0

---

### Requirement: Manual code values do not bump current_seq

When a caller writes an entity with a manually-supplied code value (e.g., HR fills `employee_no` in CSV), the system SHALL NOT automatically advance `current_seq`. The system SHALL warn during validate phase when a manual code's numeric portion exceeds `current_seq`, but SHALL NOT auto-bump the counter.

#### Scenario: Manual code outside rule does not consume

- **WHEN** HR submits an employee creation with `employee_no='X-9999'` while the rule has `prefix='E', padding=4, current_seq=10`
- **THEN** the employee record SHALL be created with `employee_no='X-9999'`, and `current_seq` SHALL remain 10

#### Scenario: Manual code exceeds counter — validate warns

- **WHEN** a CSV row supplies `employee_no='E0050'` while the rule has `prefix='E', padding=4, current_seq=10`
- **THEN** the validate response SHALL include a warning: `"您手填的 'E0050' 已超過自動編號當前序號 10，建議調整 current_seq 以避免日後撞號"`, and execute SHALL still succeed without auto-bumping `current_seq`
