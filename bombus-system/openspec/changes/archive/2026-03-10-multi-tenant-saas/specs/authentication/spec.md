## ADDED Requirements

### Requirement: JWT 登入認證
系統 SHALL 提供 `/api/auth/login` 端點，接受 email + password + tenant_slug，驗證成功後回傳 Access Token 和 Refresh Token。

#### Scenario: 成功登入
- **WHEN** 使用者提交正確的 email、password 和 tenant_slug
- **THEN** 系統驗證密碼雜湊，回傳 JWT Access Token（有效期 15 分鐘）和 Refresh Token（有效期 7 天），Token 內嵌 user_id、tenant_id、roles、scope

#### Scenario: 密碼錯誤
- **WHEN** 使用者提交錯誤的密碼
- **THEN** 系統回傳 401 Unauthorized，不透露是帳號還是密碼錯誤

#### Scenario: 租戶已暫停
- **WHEN** 使用者嘗試登入已暫停的租戶
- **THEN** 系統回傳 403 Forbidden，提示租戶已暫停

#### Scenario: 帳號已鎖定
- **WHEN** 使用者帳號狀態為 locked 或 inactive
- **THEN** 系統回傳 403 Forbidden

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

### Requirement: 登出
系統 SHALL 提供 `/api/auth/logout` 端點，撤銷該使用者的 Refresh Token。

#### Scenario: 成功登出
- **WHEN** 使用者呼叫登出 API
- **THEN** 系統刪除該使用者的 Refresh Token 記錄，後續使用該 Token 刷新 SHALL 失敗

### Requirement: 密碼安全
系統 SHALL 使用 bcryptjs 雜湊儲存密碼，密碼最低 8 字元。

#### Scenario: 註冊時密碼雜湊
- **WHEN** 建立新使用者帳號
- **THEN** 密碼使用 bcryptjs（cost factor 10）雜湊後儲存，原始密碼 SHALL 不被儲存

#### Scenario: 密碼不符最低長度
- **WHEN** 提交少於 8 字元的密碼
- **THEN** 系統回傳 400 錯誤

### Requirement: Auth Middleware 保護路由
系統 SHALL 提供 Auth Middleware，驗證請求的 JWT Access Token。所有受保護路由 SHALL 使用此中介層。

#### Scenario: 有效 Token 通過
- **WHEN** 請求攜帶有效的 JWT Access Token
- **THEN** 中介層解析 Token，將 user_id、tenant_id、roles、scope 注入 req.user，繼續處理

#### Scenario: 無 Token 或 Token 無效
- **WHEN** 請求未攜帶 Token 或 Token 無效/過期
- **THEN** 中介層回傳 401 Unauthorized

### Requirement: 平台管理員認證
系統 SHALL 為平台管理員提供獨立的登入端點 `/api/auth/platform-login`，使用 platform.db 的 platform_admins 表驗證。

#### Scenario: 平台管理員成功登入
- **WHEN** 平台管理員提交正確的 email 和 password
- **THEN** 系統回傳 JWT Token（payload 包含 `isPlatformAdmin: true`，不含 tenant_id）

#### Scenario: 平台管理員存取租戶 API
- **WHEN** 平台管理員的 Token 嘗試存取需要 tenant_id 的 API
- **THEN** 系統回傳 403 Forbidden（平台管理員需要明確指定操作對象租戶）

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

### Requirement: 租戶選擇機制
登入時使用者 SHALL 指定租戶（透過 tenant_slug）。系統 SHALL 支援以 email 域名自動建議匹配的租戶。

#### Scenario: 使用者手動選擇租戶
- **WHEN** 使用者在登入頁面輸入或選擇 tenant_slug
- **THEN** 系統以該 slug 查詢 platform.db 取得 tenant_id 進行認證

#### Scenario: 依 email 域名建議租戶
- **WHEN** 使用者輸入 email 且系統有對應域名的租戶
- **THEN** 登入表單自動建議可能的租戶（使用者仍可手動選擇其他）
