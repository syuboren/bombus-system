## ADDED Requirements

### Requirement: Simplified user overview page

The system SHALL provide a simplified user account overview page at route `/settings/users` that displays a concise list of all user accounts with quick actions. The page SHALL NOT include user creation forms, detailed role assignment modals, or permission preview features. These capabilities SHALL be accessed via the HR employee management hub.

#### Scenario: User overview page loads

- **WHEN** a user with `SYS.user-management` view permission accesses `/settings/users`
- **THEN** the page SHALL display a data table of all user accounts with columns: name, email, role summary (comma-separated role names), account status (active/inactive/locked), and last login timestamp

#### Scenario: Search users

- **WHEN** the user enters a search keyword in the search bar
- **THEN** the list SHALL filter by matching name or email

---

### Requirement: Quick actions on user overview

The user overview page SHALL provide quick actions that can be performed without navigating away: enable/disable account and reset password.

#### Scenario: Toggle account status

- **WHEN** the admin clicks the enable/disable toggle for a user account
- **THEN** the system SHALL call `PUT /api/tenant-admin/users/:id` to update the status, display a success notification, and refresh the row

#### Scenario: Reset password

- **WHEN** the admin clicks "Reset Password" for a user account
- **THEN** the system SHALL display a confirmation dialog, generate a new random password via the unified account creation service's password generation logic, display the new password in a modal, and set `must_change_password = 1`

---

### Requirement: Navigate to employee management for detailed operations

The user overview page SHALL provide a "Manage" link for each user row that navigates to the HR employee management hub with the user ID as a query parameter, opening the employee detail modal with the Account & Permissions tab active.

#### Scenario: Click manage navigates to employee hub

- **WHEN** the admin clicks "Manage" on a user row
- **THEN** the system SHALL navigate to `/organization/employee-management?userId={userId}`, which opens the employee detail modal with the Account & Permissions tab active

#### Scenario: User without linked employee

- **WHEN** the admin clicks "Manage" on a user row where the user has no linked employee record
- **THEN** the system SHALL display a dialog with two options: (1) link to an existing employee record (showing a searchable employee list filtered to those without user accounts), or (2) create a new employee record for this user. Both options SHALL use the `linkUserToEmployee()` function from the unified account creation service. After linking, the system SHALL navigate to the employee detail modal

---

### Requirement: Remove user creation from settings

The user overview page SHALL NOT include a "Create User" button or user creation form. User accounts SHALL only be created through the HR employee management hub (manual add or batch import) or through the onboarding conversion flow.

#### Scenario: No create user button

- **WHEN** the admin views the user overview page
- **THEN** no "Create User", "Add User", or similar account creation button SHALL be visible

#### Scenario: Page header indicates where to create users

- **WHEN** the admin views the user overview page
- **THEN** the page header or a help text SHALL indicate that new user accounts are created via "Organization > Employee Management"
