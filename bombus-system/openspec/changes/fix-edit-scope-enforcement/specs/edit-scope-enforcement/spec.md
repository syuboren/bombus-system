## ADDED Requirements

### Requirement: Employee update endpoint enforces edit_scope

The PUT `/api/employee/:id` endpoint SHALL validate the requesting user's `edit_scope` against the target employee record before performing the update. If the user's `edit_scope` does not permit editing the target record, the system SHALL return 403 Forbidden.

#### Scenario: User with edit_scope=self updates own record

- **WHEN** a user with `edit_scope=self` sends PUT `/api/employee/:id` where `:id` matches their own employee record
- **THEN** the system SHALL allow the update

#### Scenario: User with edit_scope=self updates another employee

- **WHEN** a user with `edit_scope=self` sends PUT `/api/employee/:id` where `:id` does NOT match their own employee record
- **THEN** the system SHALL return 403 Forbidden with message indicating insufficient edit permissions

#### Scenario: User with edit_scope=department updates employee in same department

- **WHEN** a user with `edit_scope=department` sends PUT `/api/employee/:id` where the target employee belongs to the user's department
- **THEN** the system SHALL allow the update

### Requirement: Document endpoints enforce edit_scope

The POST, PUT, and DELETE endpoints for employee documents SHALL validate the requesting user's `edit_scope` against the document owner's employee record before performing the operation.

#### Scenario: User with edit_scope=self uploads document for another employee

- **WHEN** a user with `edit_scope=self` sends POST `/api/employee/documents` with an `employee_id` that does NOT match their own employee record
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: User with edit_scope=self deletes another employee's document

- **WHEN** a user with `edit_scope=self` sends DELETE `/api/employee/documents/:id` for a document owned by another employee
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Account creation endpoint enforces edit_scope

The POST `/api/employee/:id/create-account` endpoint SHALL validate the requesting user's `edit_scope` against the target employee record before creating the account.

#### Scenario: User with edit_scope=self creates account for another employee

- **WHEN** a user with `edit_scope=self` sends POST `/api/employee/:id/create-account` where `:id` does NOT match their own employee record
- **THEN** the system SHALL return 403 Forbidden

### Requirement: Employee creation endpoint enforces edit_scope

The POST `/api/employee` endpoint SHALL validate the requesting user's `edit_scope` before allowing employee creation. Users with `edit_scope=self` SHALL NOT be permitted to create new employees.

#### Scenario: User with edit_scope=self attempts to create employee

- **WHEN** a user with `edit_scope=self` sends POST `/api/employee`
- **THEN** the system SHALL return 403 Forbidden
