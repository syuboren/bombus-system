## MODIFIED Requirements

### Requirement: Department code generator hook for D-15

The import commit endpoint SHALL invoke the code generator at `codeGenerator.tryNext('department', { tenantId, orgUnitId })` for each newly inserted department. When the `code-naming-rules` capability has no rule configured for `target='department'` (or the rule has `enabled=0`), `tryNext` SHALL return `null` and the inserted row SHALL retain `code = NULL`. When a rule is configured and enabled, the returned code SHALL be applied to the new row inside the same transaction as the department INSERT.

The hook implementation in `routes/organization.js` (line 1135 reference at the time of D-16 archiving) SHALL be replaced with a real call to the `codeGenerator` service, no longer returning a hard-coded `null`.

#### Scenario: Rule absent — code remains NULL

- **WHEN** an import inserts new departments AND no `code_naming_rules` row exists for `target='department'`
- **THEN** `codeGenerator.tryNext('department', ctx)` SHALL return `null`, AND `departments.code` SHALL remain `NULL` for newly inserted rows

#### Scenario: Rule present — code applied

- **WHEN** super_admin configures `{ target='department', prefix='HR', padding=3, current_seq=0 }` and an import inserts 3 new departments
- **THEN** the three rows SHALL be inserted with `code='HR001'`, `code='HR002'`, `code='HR003'` respectively, AND `current_seq` SHALL advance to 3

#### Scenario: Rule disabled — fallback to NULL

- **WHEN** a rule exists with `enabled=0` for `target='department'` and an import inserts new departments
- **THEN** `codeGenerator.tryNext` SHALL return `null` (treating disabled as absent), AND `departments.code` SHALL be `NULL`

#### Scenario: Mid-import failure rolls back seq

- **WHEN** an import inserts 5 departments and fails on the 3rd due to a parent ID violation
- **THEN** the transaction SHALL ROLLBACK, the rule's `current_seq` SHALL revert to its pre-transaction value, AND no department rows SHALL persist
