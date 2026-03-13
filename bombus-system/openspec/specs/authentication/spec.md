# Authentication — 認證系統

## Purpose

定義 Bombus 多租戶架構的認證機制，包含 JWT 登入、Token 刷新、登出、密碼安全、前端攔截器，以及平台管理員的獨立認證流程。

## Requirements

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

---
### Requirement: Token 刷新
系統 SHALL 提供 `/api/auth/refresh` 端點，使用 Refresh Token 取得新的 Access Token。

#### Scenario: 成功刷新 Token
- **WHEN** 使用者提交有效的 Refresh Token
- **THEN** 系統回傳新的 Access Token，Refresh Token 維持不變（直到過期）

#### Scenario: Refresh Token 已過期
- **WHEN** 使用者提交已過期的 Refresh Token
- **THEN** 系統回傳 401 Unauthorized，使用者需重新登入

#### Scenario: Refresh Token 被撤銷
- **WHEN** 使用者提交已被登出撤銷的 Refresh Token
- **THEN** 系統回傳 401 Unauthorized

---
### Requirement: 登出
系統 SHALL 提供 `/api/auth/logout` 端點，撤銷該使用者的 Refresh Token。

#### Scenario: 成功登出
- **WHEN** 使用者呼叫登出 API
- **THEN** 系統刪除該使用者的 Refresh Token 記錄，後續使用該 Token 刷新 SHALL 失敗

---
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

---
### Requirement: Auth Middleware 保護路由
系統 SHALL 提供 Auth Middleware，驗證請求的 JWT Access Token。所有受保護路由 SHALL 使用此中介層。

#### Scenario: 有效 Token 通過
- **WHEN** 請求攜帶有效的 JWT Access Token
- **THEN** 中介層解析 Token，將 user_id、tenant_id、roles、scope 注入 req.user，繼續處理

#### Scenario: 無 Token 或 Token 無效
- **WHEN** 請求未攜帶 Token 或 Token 無效/過期
- **THEN** 中介層回傳 401 Unauthorized

---
### Requirement: 平台管理員認證
系統 SHALL 為平台管理員提供獨立的登入端點 `/api/auth/platform-login`，使用 platform.db 的 platform_admins 表驗證。

#### Scenario: 平台管理員成功登入
- **WHEN** 平台管理員提交正確的 email 和 password
- **THEN** 系統回傳 JWT Token（payload 包含 `isPlatformAdmin: true`，不含 tenant_id）

#### Scenario: 平台管理員存取租戶 API
- **WHEN** 平台管理員的 Token 嘗試存取需要 tenant_id 的 API
- **THEN** 系統回傳 403 Forbidden（平台管理員需要明確指定操作對象租戶）

---
### Requirement: 前端 AuthInterceptor 自動管理 Token
前端 SHALL 提供 AuthInterceptor，自動在每個 HTTP 請求的 Header 中附加 JWT Access Token。

#### Scenario: 自動附加 Authorization Header
- **WHEN** 前端發送 API 請求
- **THEN** AuthInterceptor 自動在 Header 加入 `Authorization: Bearer {access_token}`

#### Scenario: Access Token 過期自動刷新
- **WHEN** API 回傳 401 且使用者持有有效 Refresh Token
- **THEN** AuthInterceptor 自動呼叫 `/api/auth/refresh` 取得新 Token，然後重送原始請求

#### Scenario: Refresh Token 也過期
- **WHEN** Refresh Token 過期且刷新失敗
- **THEN** AuthInterceptor 清除本地 Token 並導向登入頁面

---
### Requirement: 租戶選擇機制
登入時使用者 SHALL 指定租戶（透過 tenant_slug）。系統 SHALL 支援以 email 域名自動建議匹配的租戶。

#### Scenario: 使用者手動選擇租戶
- **WHEN** 使用者在登入頁面輸入或選擇 tenant_slug
- **THEN** 系統以該 slug 查詢 platform.db 取得 tenant_id 進行認證

#### Scenario: 依 email 域名建議租戶
- **WHEN** 使用者輸入 email 且系統有對應域名的租戶
- **THEN** 登入表單自動建議可能的租戶（使用者仍可手動選擇其他）
