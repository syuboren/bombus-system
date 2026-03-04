## Why

Bombus 目前是單租戶架構，僅服務單一組織。為了驗證多租戶 SaaS 模式的可行性，需要在現有 sql.js/SQLite 技術棧上建構多租戶原型。這解決了三個核心問題：

1. **產品方向驗證**：在不大幅重構的前提下，先驗證多租戶的隔離機制與權限模型是否可行
2. **資料安全驗證**：確保租戶 A 的用戶絕不能看到租戶 B 的資料，建立隔離保障的基礎
3. **權限模型設計**：建立集團→子公司→部門→角色的多層級權限體系原型

**影響範圍**：全模組（L1~L6）的 API 層，以及全新的認證授權與管理後台路由。

## What Changes

### 資料隔離層（基於 sql.js）
- 採用 **Database-per-Tenant** 策略：每個租戶一個獨立的 SQLite 資料庫檔案
- 平台級資料（租戶清單、平台管理員）使用獨立的 `platform.db`
- 租戶資料庫檔案命名：`tenant_{id}.db`，存放於 `server/data/tenants/`

### 身份認證與授權層
- 建立真實的 JWT 認證機制，取代目前的 Mock 登入
- 建立獨立的 RBAC 表結構（users、roles、permissions），與現有 `employees` 表並存。`employees.role` 欄位保留不變，RBAC 透過 `users.employee_id` 外鍵與員工資料關聯
- 實作多層級角色權限架構：集團 → 子公司 → 部門 → 角色（部門主管/員工/HR）
- 租戶感知的請求管道：每個 API 請求透過 JWT 自動綁定租戶上下文

### 後台管理
- 平台管理介面：租戶管理（CRUD）、租戶狀態監控
- 租戶管理員介面：組織架構設定、角色權限可視化設定
- 權限範圍可視化：樹狀圖呈現集團→子公司→部門→角色的權限繼承關係

### 資料安全
- 租戶資料庫檔案級隔離（最強隔離等級）
- 退租後可直接刪除整個租戶資料庫檔案，無殘留風險
- 審計日誌記錄敏感操作

## Non-goals（不在範圍內）

- **資料庫遷移**：不遷移至 PostgreSQL，保持 sql.js/SQLite（這是原型驗證階段）
- **計費系統整合**：不串接金流，僅建立方案的資料結構
- **SSO/SAML 單一登入**：初期使用帳密 + JWT
- **自訂佈景/白標**：不支援租戶級 UI 客製化
- **跨區域部署**：單一伺服器
- **既有功能重寫**：L1~L6 業務邏輯不變，僅加上租戶感知層
- **1,000+ 租戶的水平擴展**：原型階段專注於 <100 租戶的正確性
- **自動化壓力測試**：不在原型範圍內

## Capabilities

### New Capabilities
- `tenant-management`: 租戶生命週期管理（建立、設定、暫停、退租、資料庫檔案清除）
- `tenant-isolation`: Database-per-Tenant 資料隔離（每租戶獨立 SQLite 檔案）與租戶上下文中介層
- `authentication`: JWT 認證機制（登入、Token 刷新、密碼雜湊、Session 管理）
- `rbac`: 多層級角色權限架構（集團→子公司→部門→角色），含權限繼承與可視化設定介面
- `admin-portal`: 平台管理後台（租戶 CRUD、狀態監控）與租戶管理員設定介面
- `audit-logging`: 操作審計日誌（敏感操作記錄、登入追蹤）

### Modified Capabilities
（無既有 specs，此為全新建構）

## Impact

### 資料庫（維持 sql.js/SQLite）
- 新增 `server/data/platform.db`：平台級資料
- 新增 `server/data/tenants/tenant_{id}.db`：每租戶獨立資料庫
- 平台資料庫表：`tenants`、`subscription_plans`、`platform_admins`、`audit_logs`
- 租戶資料庫表（RBAC）：`users`、`roles`、`permissions`、`role_permissions`、`user_roles`、`org_units`、`refresh_tokens`
- 既有 L1~L6 業務表加入各租戶資料庫

### 後端 API（server/src/）
- 新增 Tenant Context Middleware：從 JWT 解析 tenant_id，載入對應租戶資料庫
- 新增 `/api/auth/*`：登入、登出、Token 刷新、密碼重設
- 新增 `/api/platform/*`：平台管理 API（僅平台管理員）
- 新增 `/api/tenant-admin/*`：租戶管理 API（組織架構、角色權限設定）
- 新增 `/api/audit/*`：審計日誌查詢
- 既有 L1~L6 路由加上認證中介層，SQL 操作自動使用租戶資料庫

### 前端（src/app/）
- 新增 `features/platform-admin/`：平台管理後台（路由 `/platform`）
- 新增 `features/tenant-admin/`：租戶管理設定（路由 `/settings`）
- 修改 `features/auth/`：真實 JWT 認證取代 Mock
- 新增 `core/services/`：TenantService、PermissionService
- 新增 `core/guards/`：AuthGuard、RoleGuard、PermissionGuard
- 新增 `core/interceptors/`：AuthInterceptor（自動注入 JWT Token）
- 修改 `app.routes.ts`：所有受保護路由加入 Guard

### 依賴套件
- 新增：`jsonwebtoken`、`bcryptjs`、`helmet`、`express-rate-limit`
- 維持：`sql.js`（不移除）

### 租戶規模設計（原型階段）
| 規模 | 策略 | 說明 |
|------|------|------|
| <100 | 單一伺服器 + 檔案級隔離 | 每租戶一個 .db 檔案，記憶體載入活躍租戶 |
| 未來 100+ | 遷移至 PostgreSQL | Schema-per-Tenant，本原型的邏輯層可復用 |

### 概略資料模型

**platform.db（平台級）**
- `tenants`：id, name, slug, status, plan_id, db_file, created_at, updated_at
- `subscription_plans`：id, name, max_users, max_subsidiaries, features, created_at
- `platform_admins`：id, email, password_hash, name, created_at
- `audit_logs`：id, tenant_id, user_id, action, resource, details, ip, created_at

**tenant_{id}.db（每租戶）**
- `users`：id, email, password_hash, name, employee_id, avatar, status, last_login, created_at, updated_at
- `org_units`：id, name, type(group/subsidiary/department), parent_id, level
- `roles`：id, name, scope_type(global/subsidiary/department), is_system, description, created_at
- `permissions`：id, resource, action, description
- `role_permissions`：role_id, permission_id
- `user_roles`：user_id, role_id, org_unit_id（權限範圍）
- 既有 L1~L6 業務表（employees, jobs, trainings 等）
