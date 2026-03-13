## 1. DB Schema 遷移（Employee schema migration + Users table must_change_password column）

> 依賴：無（第一步）
> 驗證：重啟 server，console 無 migration 錯誤；employees 表有 7 個新欄位，users 表有 must_change_password 欄位

- [x] 1.1 Employee schema migration：在 `tenant-schema.js` 的 `initTenantSchema()` 中 orgUnitMigrations 之後新增 employeeMigrations（7 欄：job_title, candidate_id, probation_end_date, probation_months, onboarding_status, converted_at, org_unit_id REFERENCES org_units(id)）— 使用 try-catch idempotent 模式（DB Schema 遷移策略）
- [x] 1.2 Users table must_change_password column：在 `tenant-schema.js` 中新增 userMigrations（1 欄：must_change_password INTEGER DEFAULT 0）— 使用相同 try-catch 模式

## 2. 後端 — convert-candidate 修正 + 自動建帳

> 依賴：Group 1 完成
> 驗證：`POST /api/hr/onboarding/convert-candidate` 回傳 201，response 包含 user_account 物件；DB 中 employees 有 org_unit_id，users 有 must_change_password=1，user_roles 有 employee 角色

- [x] 2.1 convert-candidate 改為 async：在 `hr-onboarding.js` 新增 `const bcrypt = require('bcryptjs')` import，路由改為 async
- [x] 2.2 Employee org_unit_id foreign key：在 `hr-onboarding.js` convert-candidate request body 解構加 `org_unit_id`，INSERT employees 語句加 `org_unit_id` 欄位
- [x] 2.3 Automatic user account creation during candidate conversion：在 `hr-onboarding.js` 員工 INSERT 後加自動建帳邏輯（自動建帳邏輯（非致命模式））— bcrypt hash 密碼、建立 users 記錄（must_change_password=1）、查找 employee 角色並指派，含 Email shorter than 8 characters 防禦處理。若 Existing user account with same email 則 UPDATE employee_id 而非重建
- [x] 2.4 Automatic employee role assignment：查找 employee 系統角色（is_system=1），指派 user_roles 記錄綁定 org_unit_id（使用者角色指派（Scoped Roles）自動化）
- [x] 2.5 在 `hr-onboarding.js` response 加 `org_unit_id` 和 `user_account` 物件
- [x] 2.6 Organization unit listing for conversion modal：在 `hr-onboarding.js` 新增 `GET /org-units` 端點，查詢 org_units 表回傳 id/name/type/parent_id/level

## 3. 後端 — Auth 改密碼端點

> 依賴：Group 1 完成（users 表需有 must_change_password 欄位）
> 驗證：login response 包含 must_change_password 欄位；`POST /api/auth/change-password` 正確驗證舊密碼並更新

- [x] 3.1 JWT 登入認證 modified：在 `auth.js` login 查詢加 `must_change_password` 欄位，response user 物件加 `must_change_password: !!user.must_change_password`（Login response includes must_change_password）
- [x] 3.2 Change password API endpoint：在 `auth.js` 新增 `POST /change-password` 端點 — 驗證 Bearer token、驗證舊密碼（密碼安全 modified）、檢查新密碼長度≥8、新舊不同、bcrypt hash 更新、Password change clears must_change_password flag

## 4. 前端 — Auth Model + Service

> 依賴：Group 3 完成（後端 API 須先於前端串接）
> 驗證：TypeScript 編譯無錯誤；AuthService.changePassword() 方法存在

- [x] 4.1 在 `auth.model.ts` 的 User interface 加 `must_change_password?: boolean`，TokenResponse 加 `must_change_password?: boolean`，新增 ChangePasswordRequest 和 ChangePasswordResponse interface
- [x] 4.2 tenant_slug 保存機制：在 `auth.service.ts` import 擴充 + login() 方法合併 must_change_password 到 user 物件 + 保存 tenant_slug
- [x] 4.3 在 `auth.service.ts` 新增 `changePassword()` 方法，成功後更新 localStorage 中 user 的 must_change_password flag

## 5. 前端 — 前端改密碼頁面 + 登入攔截

> 依賴：Group 4 完成（型別與 service 須先就緒）
> 驗證：`ng build --configuration=development` 無錯誤；登入 must_change_password 使用者後被導向 /change-password；改密碼成功後導向 /dashboard

- [x] 5.1 Change password page：新建 `change-password-page.component.ts`（Standalone + OnPush + Signal APIs + inject()）— 包含 currentPassword / newPassword / confirmPassword signals + canSubmit computed + onSubmit 方法
- [x] 5.2 新建 `change-password-page.component.html` — 卡片表單含 3 個密碼欄位 + First-time login notice 提示 + 送出按鈕
- [x] 5.3 新建 `change-password-page.component.scss` — 複用登入頁視覺風格
- [x] 5.4 在 `app.routes.ts` 新增 `/change-password` 路由（canActivate: authGuard）
- [x] 5.5 Login redirect for forced password change：在 `login-page.component.ts` 的 onTenantLogin() 加 must_change_password 檢查，true 時導向 /change-password

## 6. 前端 — 轉換 Modal 更新（既有組織管理模組整合 — 員工轉換部分）

> 依賴：Group 2 完成（後端 org-units API + convert response 須就緒）
> 驗證：轉換 Modal 選部門後 Frontend org_unit auto-matching 自動匹配 org_unit；成功畫面顯示帳號資訊區塊

- [x] 6.1 既有組織管理模組整合（員工轉換串接）：在 `onboarding.service.ts` 擴充 ConvertCandidateRequest 加 `org_unit_id`、ConvertCandidateResponse.data 加 `user_account`、新增 OrgUnitOption interface + getOrgUnits() 方法
- [x] 6.2 Frontend org_unit auto-matching + org_unit_id 自動匹配：在 `onboarding-convert-modal.component.ts` 新增 orgUnitId / orgUnits signals + departmentOrgUnits computed + loadOptions() 加載 org_units + onDepartmentChange() 自動匹配 + submit() 加 org_unit_id
- [x] 6.3 Conversion success view displays account information：在 `onboarding-convert-modal.component.html` 部門選擇後加 org_unit 手動下拉（當自動匹配失敗時）+ 成功畫面加帳號資訊區塊
- [x] 6.4 在 `onboarding-convert-modal.component.scss` 新增 `.user-account-info` 樣式

## 7. 驗證

> 依賴：Group 1~6 全部完成
> 驗證：build 無錯誤 + 既有整合測試通過

- [x] 7.1 執行 `cd bombus-system && npx ng build --configuration=development`，確認 0 errors
- [x] 7.2 執行既有整合測試 `cd bombus-system/server && node src/tests/test-e2e-flow.js`，34/39 passed（5 個失敗與 platform.js 租戶建立相關，非本次變更範圍）
