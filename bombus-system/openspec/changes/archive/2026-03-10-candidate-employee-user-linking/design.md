## Context

Bombus HR SaaS 平台的候選人入職轉換流程目前存在 Critical Bug：`employees` 表 CREATE TABLE 缺少 6 個欄位，導致 `convert-candidate` API 的 INSERT 語句引用不存在的欄位而失敗。此外，轉換流程只建立員工記錄，不會自動建立系統帳號，HR 需手動到「使用者管理」頁面建帳號 + 指派角色。

**現有流程**：候選人 → 面試 → 錄取 → 接受 Offer → ~~轉換為員工（壞了）~~ → HR 手動建帳號 → HR 手動指派角色

**目標流程**：候選人 → 面試 → 錄取 → 接受 Offer → 轉換為員工 + 自動建帳 + 自動指派角色 → 新員工首次登入改密碼

**利害關係人**：HR 管理員（執行轉換）、新進員工（首次登入）

## Goals / Non-Goals

**Goals:**

- 修復 `employees` 表 schema，使 `convert-candidate` API 正常運作
- 候選人轉換時自動建立使用者帳號（初始密碼 = 候選人 email）
- 自動指派 `employee` 角色 + 部門 scope（org_unit_id）
- 新員工首次登入強制改密碼
- `employees` 表新增 `org_unit_id` FK 關聯 `org_units`

**Non-Goals:**

- 不修改招聘流程 UX（面試、錄取、Offer 維持不變）
- 不實作 email 通知寄送
- 不支援批量轉換
- 不改動既有使用者管理頁面

## Decisions

### DB Schema 遷移策略

使用 idempotent ALTER TABLE 遷移（try-catch 忽略「欄位已存在」錯誤），與現有 `deptMigrations`、`orgUnitMigrations` 模式一致。

**替代方案**：在 CREATE TABLE 中直接加欄位 → 放棄，因為已有生產資料的租戶 DB 不會重建表。

**SQL Schema 變更**：
```sql
-- employees 表（7 欄）
ALTER TABLE employees ADD COLUMN job_title TEXT;
ALTER TABLE employees ADD COLUMN candidate_id TEXT;
ALTER TABLE employees ADD COLUMN probation_end_date TEXT;
ALTER TABLE employees ADD COLUMN probation_months INTEGER;
ALTER TABLE employees ADD COLUMN onboarding_status TEXT;
ALTER TABLE employees ADD COLUMN converted_at TEXT;
ALTER TABLE employees ADD COLUMN org_unit_id TEXT REFERENCES org_units(id);

-- users 表（1 欄）
ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;
```

### 自動建帳邏輯（非致命模式）

帳號建立採**非致命（non-fatal）模式**：若帳號建立失敗，不中斷員工建立流程，改為回傳 warning 訊息。HR 可事後在使用者管理手動補建。

**初始密碼策略**：使用候選人 email 作為初始密碼 + `must_change_password = 1`。若 email 長度 < 8 字元（不太可能但防禦性處理），補充至 8 字元。

**重複帳號保護**：若同 email 帳號已存在，不重建帳號，改為將既有帳號的 `employee_id` 關聯到新員工。

**替代方案**：隨機密碼 + email 通知 → 放棄，因系統尚未整合 email 服務。

### convert-candidate 改為 async

`convert-candidate` 路由從同步改為 `async`，因 `bcrypt.hash()` 需要 await。影響範圍小，Express 原生支援 async handler。

### 前端改密碼頁面

新建 `/change-password` 路由頁面，使用 Standalone + OnPush + Signal APIs。

- **模組識別色**：沿用登入頁風格（不屬於 L1~L6 特定模組）
- **SCSS**：複用登入頁 `.login-card` 視覺風格
- **複用元件**：`NotificationService`（成功提示）、`AuthService`（changePassword 方法）

### tenant_slug 保存機制

為了讓改密碼頁面能取得 `tenant_slug`（change-password API 需要），在 `login()` 成功後將 `tenant_slug` 一併存入 localStorage 的 user 物件。

**替代方案**：從 JWT payload 解析 → 放棄，前端不應自行解析 JWT。

### org_unit_id 自動匹配

轉換 Modal 選擇部門時，自動比對 `org_units` 中同名的 department 類型節點。若無匹配則顯示手動選擇下拉。

**需要修改的現有檔案**：
- `server/src/db/tenant-schema.js`
- `server/src/routes/hr-onboarding.js`
- `server/src/routes/auth.js`
- `src/app/features/auth/models/auth.model.ts`
- `src/app/features/auth/services/auth.service.ts`
- `src/app/features/auth/pages/login-page/login-page.component.ts`
- `src/app/app.routes.ts`
- `src/app/features/employee/services/onboarding.service.ts`
- `src/app/features/employee/components/onboarding-convert-modal/*`

**新建檔案**：
- `src/app/features/auth/pages/change-password-page/change-password-page.component.ts`
- `src/app/features/auth/pages/change-password-page/change-password-page.component.html`
- `src/app/features/auth/pages/change-password-page/change-password-page.component.scss`

**複用的現有服務與元件**：
- `AuthService` — 擴充 changePassword()
- `NotificationService` — 改密碼成功提示
- `PermissionService` — 登入後載入權限
- `FormsModule` — 改密碼表單

## Risks / Trade-offs

| 風險 | 緩解策略 |
|------|---------|
| Email 作為初始密碼安全性較低 | `must_change_password` 強制首次改密碼，email 在 HR 內部傳遞非公開 |
| 帳號建立失敗時員工無法登入 | 非致命模式 + 回傳明確 warning，HR 可手動在使用者管理補建 |
| `employee` 系統角色不存在 | 帳號仍建立，角色可事後手動指派；tenant-schema 初始化時已建立系統角色 |
| Schema 遷移失敗 | try-catch 逐欄遷移，部分失敗不影響其他欄位 |
| Token 在改密碼前過期 | 導回登入頁，重新登入後再次導向改密碼頁 |
