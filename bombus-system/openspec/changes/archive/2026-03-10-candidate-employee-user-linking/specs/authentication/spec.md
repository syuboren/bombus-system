## MODIFIED Requirements

### Requirement: JWT 登入認證
The system SHALL provide `/api/auth/login` endpoint that accepts email + password + tenant_slug, and upon successful verification, returns an Access Token and Refresh Token. The login query SHALL include the `must_change_password` column from the users table. The login response user object SHALL include `must_change_password: boolean` indicating whether the user is required to change their password on first login.

#### Scenario: 成功登入
- **WHEN** a user submits correct email, password, and tenant_slug
- **THEN** the system verifies the password hash, returns a JWT Access Token (valid for 15 minutes) and Refresh Token (valid for 7 days), with the Token embedding user_id, tenant_id, roles, scope. The response user object SHALL include `must_change_password` reflecting the user's `must_change_password` database value.

#### Scenario: 密碼錯誤
- **WHEN** a user submits an incorrect password
- **THEN** the system returns 401 Unauthorized without revealing whether the account or password is wrong

#### Scenario: 租戶已暫停
- **WHEN** a user attempts to log in to a suspended tenant
- **THEN** the system returns 403 Forbidden indicating the tenant is suspended

#### Scenario: 帳號已鎖定
- **WHEN** a user account status is locked or inactive
- **THEN** the system returns 403 Forbidden

#### Scenario: First login with must_change_password
- **WHEN** a user logs in successfully and `must_change_password = 1` in the database
- **THEN** the response user object SHALL contain `must_change_password: true`, and the frontend SHALL redirect to `/change-password` instead of `/dashboard`

### Requirement: 密碼安全
The system SHALL use bcryptjs to hash stored passwords, with a minimum password length of 8 characters. The system SHALL provide a `POST /api/auth/change-password` endpoint for users to change their password.

#### Scenario: 註冊時密碼雜湊
- **WHEN** a new user account is created
- **THEN** the password is hashed using bcryptjs (cost factor 10) before storage; the original password SHALL NOT be stored

#### Scenario: 密碼不符最低長度
- **WHEN** a password shorter than 8 characters is submitted
- **THEN** the system returns a 400 error

#### Scenario: Password change clears must_change_password flag
- **WHEN** a user successfully changes their password via `/api/auth/change-password`
- **THEN** the system sets `must_change_password = 0` for that user and returns `{ success: true }`
