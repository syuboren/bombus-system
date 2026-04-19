## MODIFIED Requirements

### Requirement: Automatic user account creation during candidate conversion

The system SHALL automatically create a user account in the `users` table when a candidate is converted to an employee via `POST /api/hr/onboarding/convert-candidate`. Conversion SHALL only be permitted for candidates whose `approval_status = 'APPROVED'` (i.e., the decision has passed subsidiary_admin approval) and whose status is `offer_accepted`. The initial password SHALL be the candidate's email address. The `must_change_password` flag SHALL be set to `1`.

#### Scenario: New user account created successfully

- **WHEN** HR converts a candidate (status=offer_accepted, approval_status=APPROVED) to an employee and no user account with the same email exists
- **THEN** the system creates a new user record with `email = candidate.email`, `password_hash = bcrypt(candidate.email)`, `employee_id = new_employee_id`, `status = 'active'`, and `must_change_password = 1`

#### Scenario: Conversion blocked when approval not completed

- **WHEN** HR attempts to convert a candidate whose `approval_status` is `PENDING`, `REJECTED`, or `NONE`
- **THEN** the system SHALL return HTTP 409 with a message indicating the decision has not passed approval and conversion SHALL NOT proceed

#### Scenario: Existing user account with same email

- **WHEN** HR converts a candidate whose email already exists in the `users` table
- **THEN** the system SHALL NOT create a duplicate account but SHALL update the existing user's `employee_id` to link to the new employee record, and the response SHALL indicate `already_existed: true`

#### Scenario: User account creation failure is non-fatal

- **WHEN** user account creation fails due to a database error during candidate conversion
- **THEN** the employee record SHALL still be created successfully, and the response SHALL include an error message in the `user_account` field indicating manual account creation is needed

#### Scenario: Email shorter than 8 characters used as password

- **WHEN** the candidate's email is shorter than 8 characters
- **THEN** the system SHALL pad the initial password to at least 8 characters (e.g., append '1234')

---

## ADDED Requirements

### Requirement: Approved salary carried into employee record

When a candidate is converted to an employee, the system SHALL carry forward the approved salary information from the candidate record to enable downstream HR processes. The employee record SHALL reference the source candidate such that `candidates.approved_salary_amount`, `candidates.approved_salary_type`, and `candidates.approved_salary_out_of_range` remain retrievable for reporting.

#### Scenario: Candidate approved salary accessible after conversion

- **WHEN** a candidate with `approved_salary_amount = 60000` is converted to an employee
- **THEN** the candidate record SHALL retain the approved salary fields and the employee record SHALL preserve the link via `employees.candidate_id` (if column exists) or via `employees.source_candidate_id`

#### Scenario: Approval metadata retained on approved candidates

- **WHEN** a candidate is converted (status transitions to `onboarded`)
- **THEN** the candidate's `approval_status`, `approver_id`, `approved_at`, `approval_note` SHALL NOT be cleared, and SHALL be queryable for audit purposes
