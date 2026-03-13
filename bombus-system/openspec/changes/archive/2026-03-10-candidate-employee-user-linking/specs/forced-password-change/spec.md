## ADDED Requirements

### Requirement: Change password API endpoint

The system SHALL provide `POST /api/auth/change-password` endpoint that accepts `current_password`, `new_password`, and `tenant_slug`. The endpoint SHALL require a valid JWT Bearer token in the Authorization header.

#### Scenario: Successful password change

- **WHEN** an authenticated user submits a valid current password and a new password (at least 8 characters) that differs from the current password
- **THEN** the system updates the user's `password_hash` with the bcrypt hash of the new password, sets `must_change_password = 0`, and returns `{ success: true, message: '密碼已變更' }`

#### Scenario: Current password incorrect

- **WHEN** an authenticated user submits an incorrect current password
- **THEN** the system returns 401 Unauthorized with message '目前密碼錯誤'

#### Scenario: New password too short

- **WHEN** an authenticated user submits a new password shorter than 8 characters
- **THEN** the system returns 400 BadRequest with message '新密碼至少需要 8 個字元'

#### Scenario: New password same as current

- **WHEN** an authenticated user submits a new password identical to the current password
- **THEN** the system returns 400 BadRequest with message '新密碼不能與目前密碼相同'

#### Scenario: Missing required fields

- **WHEN** the request body is missing `current_password`, `new_password`, or `tenant_slug`
- **THEN** the system returns 400 BadRequest

#### Scenario: Invalid or expired token

- **WHEN** the JWT token in the Authorization header is invalid or expired
- **THEN** the system returns 401 Unauthorized

### Requirement: Forced password change enforcement

The system SHALL enforce password change for users with `must_change_password = true` at TWO levels:

1. **Login redirect**: The frontend login flow SHALL redirect to `/change-password` instead of `/dashboard`.
2. **Global guard**: The `authGuard` SHALL check `must_change_password` on EVERY protected route and redirect to `/change-password` if true. Only the `/change-password` route itself SHALL be exempt from this check.

#### Scenario: User with must_change_password flag — login redirect

- **WHEN** a user logs in successfully and `response.user.must_change_password` is true
- **THEN** the frontend navigates to `/change-password` without loading permissions

#### Scenario: User with must_change_password flag — route guard enforcement

- **WHEN** a user with `must_change_password = true` attempts to navigate to any protected route (e.g., `/dashboard`, `/employee`)
- **THEN** the `authGuard` SHALL redirect to `/change-password`

#### Scenario: User without must_change_password flag

- **WHEN** a user logs in successfully and `must_change_password` is false or undefined
- **THEN** the frontend loads permissions and navigates to `/dashboard` as normal

#### Scenario: After password change — guard allows navigation

- **WHEN** a user successfully changes their password (must_change_password cleared in local storage)
- **THEN** the `authGuard` SHALL allow navigation to all protected routes normally

### Requirement: Change password page

The system SHALL provide a `/change-password` route with a standalone Angular component that allows the user to change their password. The page SHALL require authentication (authGuard).

#### Scenario: Page layout and validation

- **WHEN** the user accesses `/change-password`
- **THEN** a form is displayed with fields for current password, new password (minimum 8 characters), and confirm password, plus a submit button that is disabled until all validation passes

#### Scenario: Successful password change redirects to dashboard

- **WHEN** the user submits a valid password change
- **THEN** the system updates the password, clears the `must_change_password` flag in local storage, shows a success notification, and navigates to `/dashboard`

#### Scenario: First-time login notice

- **WHEN** the user has `must_change_password = true`
- **THEN** the page SHALL display a prominent notice indicating this is a mandatory first-time password change

### Requirement: Password change does not invalidate other sessions

When a user changes their password, the system SHALL NOT invalidate other active sessions. Existing JWT Access Tokens remain valid until their natural expiry (15 minutes). This is a deliberate design choice given the stateless JWT architecture.

#### Scenario: Other session unaffected by password change

- **WHEN** a user changes their password on Device A while also logged in on Device B
- **THEN** the session on Device B SHALL remain valid until the Access Token expires naturally

### Requirement: Users table must_change_password column

The `users` table SHALL include a `must_change_password INTEGER DEFAULT 0` column. When set to 1, the login response SHALL include `must_change_password: true` in the user object.

#### Scenario: Login response includes must_change_password

- **WHEN** a user with `must_change_password = 1` logs in successfully
- **THEN** the login response user object SHALL include `must_change_password: true`

#### Scenario: Login response for normal user

- **WHEN** a user with `must_change_password = 0` logs in successfully
- **THEN** the login response user object SHALL include `must_change_password: false`
