## ADDED Requirements

### Requirement: Cross-company employee identifier column

The system SHALL add a `cross_company_code TEXT` column to the `employees` table with a `UNIQUE` constraint scoped per tenant. The value SHALL be NULL for employees who have never had multiple active assignments. Once populated, the value SHALL be permanent and SHALL NOT be released even when the employee returns to a single active assignment.

#### Scenario: Default state is NULL

- **WHEN** a new employee is created with only one assignment
- **THEN** `employees.cross_company_code` SHALL be NULL

#### Scenario: Permanent retention after single-assignment return

- **WHEN** an employee with a populated `cross_company_code='HQ-005'` later has all secondary assignments ended (only the primary remains active)
- **THEN** `cross_company_code` SHALL remain `'HQ-005'`, NOT cleared

##### Example: Lifecycle states

| Lifecycle stage | active assignments | cross_company_code |
| --------------- | ------------------ | ------------------ |
| Hired into sub-A | 1 (sub-A) | NULL |
| Adds sub-B assignment | 2 (sub-A, sub-B) | `HQ-005` (newly generated) |
| Ends sub-B assignment | 1 (sub-A) | `HQ-005` (preserved) |
| Adds sub-C assignment later | 2 (sub-A, sub-C) | `HQ-005` (unchanged, still valid) |

---

### Requirement: Auto-generation triggered by adding second active assignment

The system SHALL automatically generate `cross_company_code` for an employee when `EmployeeAssignmentService.addAssignment` results in two or more active assignments AND `employees.cross_company_code IS NULL`. The service SHALL invoke `codeGenerator.tryNext('employee_cross', { tenantId, employeeId })` to obtain the next code, then UPDATE the employees row within the same transaction.

When `tryNext` returns `null` (no rule configured), the assignment SHALL still succeed but `cross_company_code` SHALL remain NULL until a rule is configured and the employee is re-triggered (e.g., adding another assignment).

#### Scenario: Trigger on second assignment with rule active

- **WHEN** an employee has one active assignment and HR adds a second active assignment, with `code_naming_rules` configured `{ target='employee_cross', prefix='HQ-', padding=3, current_seq=4 }`
- **THEN** the system SHALL set `employees.cross_company_code='HQ-005'` AND advance `current_seq` to 5, all within the assignment-creation transaction

#### Scenario: Trigger when rule absent

- **WHEN** the same scenario occurs but no `employee_cross` rule exists
- **THEN** the assignment SHALL succeed, `cross_company_code` SHALL remain NULL, and a follow-up trigger upon adding a third assignment SHALL still attempt generation

#### Scenario: No re-trigger when already populated

- **WHEN** an employee has `cross_company_code='HQ-005'` (already populated) and HR adds a third active assignment
- **THEN** the system SHALL NOT call `tryNext` and SHALL NOT modify `cross_company_code`

---

### Requirement: Display in employee list and detail pages

The system SHALL display `cross_company_code` adjacent to the employee's `employee_no` in the employee detail page header (when populated). The employee list SHALL include a "跨公司編號" column that is hidden by default and can be toggled visible by super_admin via a column-visibility setting. Employees with NULL `cross_company_code` SHALL display an em-dash `—` in that column.

#### Scenario: Employee detail header shows code

- **WHEN** an employee with `cross_company_code='HQ-005'` opens their detail page
- **THEN** the header SHALL render `"E0042 · HQ-005"` (or equivalent visual separator) where `E0042` is `employee_no`

#### Scenario: List column hidden by default

- **WHEN** a non-super_admin user opens the employee list
- **THEN** the "跨公司編號" column SHALL not be rendered, AND the column-toggle option SHALL not appear in the column-visibility menu

#### Scenario: Super_admin toggles column visible

- **WHEN** super_admin opens the column-visibility menu and toggles "跨公司編號" on
- **THEN** the column SHALL render for all subsequent renders for that user; persisted to user preferences

---

### Requirement: Audit trail in employee history

The system SHALL emit an audit log entry when `cross_company_code` is generated, recording `employee_id`, generated `code`, `triggering_assignment_id`, and `actor` (user who added the triggering assignment). The employee detail page's history section SHALL render this audit entry as `"系統指派跨公司編號 HQ-005（觸發：新增任職 sub-B）"`.

#### Scenario: Audit entry written on generation

- **WHEN** `cross_company_code` is generated for an employee
- **THEN** an `audit_logs` row SHALL be inserted with `action='cross_company_code_generated'`, `target_id=<employee_id>`, AND a JSON detail field containing the new code and triggering assignment id

#### Scenario: Audit visible in employee history

- **WHEN** any user with `L1.profile.view` opens the employee's history tab
- **THEN** the cross-company-code audit entry SHALL appear chronologically with the formatted message
