## ADDED Requirements

### Requirement: Employee email update synchronizes user login email

When an administrator updates an employee's email address, the system SHALL synchronize the change to the corresponding user login record. The `users.email` field MUST always reflect the current `employees.email` for employees who have an associated user account.

#### Scenario: Admin updates employee email with existing user account

- **WHEN** an administrator updates `employees.email` for an employee who has a linked `users` record
- **THEN** the system SHALL update `users.email` to match the new `employees.email` within the same transaction

#### Scenario: Admin updates employee email to one already in use

- **WHEN** an administrator updates `employees.email` to a value that already exists in `users.email` for a different user
- **THEN** the system SHALL reject the update with a 409 conflict error and a message indicating the email is already in use

#### Scenario: Admin updates employee email for employee without user account

- **WHEN** an administrator updates `employees.email` for an employee who has no linked `users` record (`user_id` is null)
- **THEN** the system SHALL update only `employees.email` without error

### Requirement: Account management dialog displays user login email

The account management dialog SHALL display the actual login email from the `users` table, not the `employees` table email. This ensures administrators see the correct email that the employee must use to authenticate.

#### Scenario: Account dialog shows login email

- **WHEN** an administrator opens the account management dialog for an employee
- **THEN** the "登入 Email" field SHALL display the `users.email` value

#### Scenario: Employee list API returns user email

- **WHEN** the employee list API is called
- **THEN** the response SHALL include a `userEmail` field containing `users.email` for each employee with a linked user account
