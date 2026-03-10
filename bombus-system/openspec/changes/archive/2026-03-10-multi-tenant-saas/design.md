## Context

Bombus 目前是單租戶 HR SaaS 原型系統，認證僅有前端 Mock 登入（`features/auth/services/auth.service.ts`），後端 API 完全開放無認證保護。資料庫使用 sql.js（純 JavaScript SQLite），單一 `onboarding.db` 檔案儲存所有資料。

需要在保持 sql.js 技術棧的前提下，建構多租戶架構原型，驗證以下核心機制：
- 租戶間資料隔離
- 多層級角色權限（集團→子公司→部門→角色）
- 平台管理與租戶自助管理

### 現有需複用的服務與元件
- `core/services/notification.service.ts`：NotificationService（成功/錯誤/警告通知）
- `core/services/sidebar.service.ts`：SidebarService（側邊欄狀態管理）
- `shared/components/`：StatusBadge、Pagination、Header、Sidebar
- `features/auth/pages/login-page/`：登入頁面（需重構為真實認證）
- `features/auth/models/auth.model.ts`：User/UserRole 型別定義（需擴充）

### 現有需修改的檔案
- `server/src/index.js`：加入認證中介層與租戶上下文
- `server/src/db/index.js`：改為多資料庫管理器
- `src/app/app.routes.ts`：加入 AuthGuard/RoleGuard
- `src/app/app.config.ts`：註冊 AuthInterceptor
- `src/app/features/auth/services/auth.service.ts`：Mock → 真實 JWT
- `src/app/features/auth/models/auth.model.ts`：擴充 User 模型
- `server/src/routes/*.js`：所有既有路由加認證中介層

## Goals / Non-Goals

**Goals:**
- 以 sql.js Database-per-Tenant 模式實現租戶資料完全隔離
- 建立 JWT 認證 + RBAC 多層級授權原型
- 提供平台管理與租戶管理的 API 和前端介面
- 既有 L1~L6 業務邏輯零修改，僅加上租戶感知層
- 建立資料庫抽象層（DBAdapter），為未來遷移 PostgreSQL 留下清晰介面

**Non-Goals:**
- 不做 PostgreSQL 遷移（保持 sql.js/SQLite，這是原型驗證階段）
- 不做計費系統整合（不串接金流，僅建立方案的資料結構）
- 不做 SSO/SAML 單一登入（初期使用帳密 + JWT）
- 不做租戶級 UI 客製化（不支援白標/佈景）
- 不做跨區域部署（單一伺服器）
- 不做既有功能重寫（L1~L6 業務邏輯不變，僅加上租戶感知層）
- 不做 1,000+ 租戶的水平擴展（原型階段專注於 <100 租戶的正確性）
- 不做自動化壓力測試

## Decisions

### D1：資料隔離策略 — Database-per-Tenant（檔案級隔離）

**選擇**：每個租戶擁有獨立的 SQLite 資料庫檔案

**替代方案**：
- Shared Database + tenant_id 欄位：最簡單，但隔離最弱，SQL 忘記 WHERE tenant_id 就洩漏
- Table-prefix-per-Tenant：管理複雜，sql.js 不支援 schema

**為什麼選擇 Database-per-Tenant**：
1. SQLite 天然支援獨立檔案，無額外複雜度
2. 隔離等級最高：租戶 A 的資料庫物理上與租戶 B 分離
3. 退租清除最簡單：刪除整個檔案即可，無殘留
4. 備份/還原以租戶為單位：匯出單一 `.db` 檔案
5. 未來遷移至 PostgreSQL Schema-per-Tenant 時，邏輯層可直接對應

**架構圖**：
```
server/data/
├── platform.db          ← 平台級資料（租戶清單、方案、平台管理員）
└── tenants/
    ├── tenant_acme.db   ← ACME 集團的所有資料
    ├── tenant_beta.db   ← Beta 公司的所有資料
    └── ...
```

### D2：資料庫抽象層 — DBAdapter（PostgreSQL 遷移準備）

**選擇**：建立統一的 DBAdapter 介面，封裝 sql.js 操作

```javascript
// DBAdapter 介面（未來 PostgreSQL 只需實作同一介面）
class DBAdapter {
  query(sql, params)      // SELECT → 回傳 rows
  run(sql, params)        // INSERT/UPDATE/DELETE → 回傳 { changes }
  transaction(fn)         // 交易封裝
}

// sql.js 實作
class SqliteAdapter extends DBAdapter { ... }

// 未來 PostgreSQL 實作（約 1 個檔案）
class PostgresAdapter extends DBAdapter { ... }
```

**遷移至 PostgreSQL 時的影響範圍**：
| 層面 | 需要改的 | 不需要改的 |
|------|----------|------------|
| DB Driver | SqliteAdapter → PostgresAdapter | DBAdapter 介面 |
| 租戶管理 | 檔案操作 → Schema DDL | TenantDBManager 公開 API |
| SQL 語法 | 少量型別差異（TEXT→VARCHAR） | 所有 Prepared Statements |
| 認證/授權 | 無 | JWT、RBAC、中介層全部不變 |
| 前端 | 無 | 完全不變 |

### D3：TenantDBManager — 多資料庫實例管理

**選擇**：建立 `TenantDBManager` 單例服務，管理多個 DBAdapter 實例

```
Request → JWT 解析 → tenant_id → TenantDBManager.getDB(tenant_id) → DBAdapter
```

**策略**：
- 活躍租戶的 DB 實例保持在記憶體中（LRU Cache）
- 非活躍租戶自動卸載（閒置 30 分鐘後）
- <100 租戶時，可全部常駐記憶體（每個空 DB ≈ 幾 KB）
- 平台 DB 永遠常駐

### D4：認證機制 — JWT + bcryptjs

**選擇**：Access Token (15min) + Refresh Token (7days)

**替代方案**：
- Session-based：需要 Session Store，增加伺服器狀態管理
- API Key：不適合互動式 Web 應用

**為什麼選擇 JWT**：
1. 無狀態，與多租戶架構天然契合（Token 內嵌 tenant_id）
2. 前端 Angular 的 Interceptor 模式完美搭配
3. 業界標準，未來遷移 SSO 更容易

**Token Payload**：
```json
{
  "sub": "user_id",
  "tid": "tenant_id",
  "roles": ["hr_manager"],
  "scope": { "type": "subsidiary", "id": "sub_001" },
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Token 刷新機制**：前端 AuthInterceptor 攔截 401 回應，自動使用 Refresh Token 取得新 Access Token，無縫重送原始請求。

**租戶識別**：登入時由使用者選擇租戶（或透過 email 域名自動匹配），Token 內嵌 `tid`，不放在 URL 中。

### D5：RBAC 權限模型 — 層級化角色 + 權限繼承

**選擇**：4 層組織架構 + 角色綁定範圍（Scoped Roles）

```
集團（Group）
 └── 子公司（Subsidiary）
      └── 部門（Department）
           └── 使用者 + 角色

角色範圍（Scope）：
- global：集團級，可存取所有子公司與部門
- subsidiary：子公司級，僅該子公司及其所有部門
- department：部門級，僅該部門
```

**權限格式**：`resource:action`
```
employee:read        — 讀取員工資料
employee:write       — 新增/編輯員工
employee:delete      — 刪除員工
recruitment:manage   — 管理招募流程
grade-matrix:edit    — 編輯職等矩陣
report:export        — 匯出報表
```

**預設角色**：
| 角色 | 範圍 | 說明 |
|------|------|------|
| `super_admin` | global | 集團超級管理員，全部權限 |
| `subsidiary_admin` | subsidiary | 子公司管理員 |
| `hr_manager` | subsidiary/department | HR 主管 |
| `dept_manager` | department | 部門主管 |
| `employee` | department | 一般員工（唯讀自己資料） |

**權限繼承規則**：
- `global` 角色自動擁有所有 `subsidiary` 和 `department` 範圍的權限
- `subsidiary` 角色自動擁有該子公司下所有 `department` 的權限
- 不支援跨子公司的組合權限（避免複雜度）

### D6：前端權限感知 — PermissionDirective + Route Guards

**選擇**：三層防護

1. **Route Guard**（`AuthGuard`/`RoleGuard`/`PermissionGuard`）：路由層攔截
2. **Permission Directive**（`appHasPermission`）：元件層條件渲染
3. **PermissionService**：Signal-based 權限狀態，提供 `hasPermission()` / `hasRole()`

元件規範：
- 所有新元件 Standalone + OnPush
- 使用 `inject()` 注入 PermissionService
- 使用 Signal APIs 管理權限狀態
- 使用 `@if` 控制流取代 `*ngIf`

### D7：管理介面設計

**平台管理後台**（路由 `/platform`，使用系統主色）
- 租戶列表（`@include data-table`）+ 搜尋/篩選（`@include filter-bar`）
- 租戶詳情（`@include card`）
- 新增/編輯租戶表單
- 方案管理

**租戶管理設定**（路由 `/settings`）
- 組織架構管理：樹狀圖編輯器（集團→子公司→部門）
- 角色權限設定：
  - 角色列表 + CRUD
  - 權限矩陣（resource × action 勾選介面）
- 使用者管理：使用者列表、角色指派
- 權限可視化：樹狀圖呈現權限繼承範圍

SCSS 使用：
- `@include card`：所有卡片容器
- `@include data-table`：列表表格
- `@include filter-bar`：搜尋篩選列
- `@include button-module($color)`：操作按鈕
- `@include status-badge`：狀態標籤（active/suspended/deleted）

### D8：API 設計 — 租戶上下文中介層

**請求流程**：
```
Client Request
  ↓
[helmet + rate-limit]        ← 安全防護層
  ↓
[Auth Middleware]             ← 驗證 JWT Token
  ↓
[Tenant Context Middleware]  ← 從 Token 取 tenant_id，載入租戶 DB
  ↓
[Permission Middleware]      ← 檢查角色權限
  ↓
[Route Handler]              ← 業務邏輯（使用 req.tenantDB）
```

**既有路由改造**：
- 所有 `/api/*` 路由加上 `authMiddleware` + `tenantMiddleware`
- Route Handler 從 `req.tenantDB` 取得租戶 DBAdapter 實例（取代直接引用 `db`）
- SQL 操作使用 Prepared Statements（維持既有規範）

**新增路由**：
- `/api/auth/*`：公開路由（不需 Tenant Middleware）
- `/api/platform/*`：需 Platform Admin 身份驗證
- `/api/tenant-admin/*`：需租戶管理員權限
- `/api/organization/*`：需租戶認證 + 組織管理權限（對應 org_units + departments + employees）
- `/api/audit/*`：需審計權限

### D9：Demo 租戶

建立預設 demo 租戶，包含：
- 租戶名稱：Demo Company
- 預設帳號：admin/admin123（super_admin）、user/user123（employee）
- 包含 L1~L6 的示範資料（從現有 `onboarding.db` 遷入）
- 密碼最低 8 字元

## Risks / Trade-offs

### R1：sql.js 記憶體限制
- **風險**：多租戶同時在線時，記憶體使用可能過高
- **緩解**：LRU Cache 自動卸載非活躍租戶 DB；<100 租戶時每個 DB 實例佔用很小

### R2：sql.js 無原生加密
- **風險**：SQLite 檔案無加密，伺服器被入侵則資料暴露
- **緩解**：原型階段可接受；生產環境遷移 PostgreSQL 時使用 SSL + 加密存儲

### R3：JWT Secret 管理
- **風險**：JWT Secret 外洩導致全租戶 Token 偽造
- **緩解**：使用環境變數存儲 Secret；未來可改為租戶級 Secret

### R4：既有路由改造範圍大
- **風險**：所有 L1~L6 路由都需加入中介層
- **緩解**：透過 Express Router 層級統一注入，各路由檔案僅需將 `db` 改為 `req.tenantDB`

### R5：DBAdapter 抽象層可能過度設計
- **風險**：為了未來 PostgreSQL 遷移而增加抽象層，可能拖慢原型開發
- **緩解**：保持抽象層極簡（僅 query/run/transaction 三個方法），不做過度泛化

## SQL Schema 變更

### platform.db

```sql
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','suspended','deleted')),
  plan_id TEXT REFERENCES subscription_plans(id),
  db_file TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_users INTEGER DEFAULT 50,
  max_subsidiaries INTEGER DEFAULT 5,
  features TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE platform_admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### tenant_{id}.db（RBAC 相關表）

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  employee_id TEXT REFERENCES employees(id),
  avatar TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','locked')),
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE org_units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('group','subsidiary','department')),
  parent_id TEXT REFERENCES org_units(id),
  level INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('global','subsidiary','department')),
  is_system INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  org_unit_id TEXT REFERENCES org_units(id),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id, org_unit_id)
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

既有 L1~L6 業務表（employees, jobs, trainings 等）維持不變，直接存在租戶 DB 中。

## Migration Plan

### Phase 1：基礎設施（無破壞性）
1. 建立 DBAdapter 抽象層 + SqliteAdapter 實作
2. 建立 `TenantDBManager` 和 `platform.db`
3. 建立認證中介層和 JWT 機制
4. 新增 API 路由（`/api/auth`, `/api/platform`, `/api/tenant-admin`）
5. 此階段既有功能不受影響

### Phase 2：前端認證整合
1. 重構 AuthService：Mock → 真實 JWT
2. 加入 AuthInterceptor 和 Route Guards
3. 建立 PermissionService 和 PermissionDirective
4. **回滾策略**：保留 Mock 登入作為 fallback flag

### Phase 3：租戶感知整合
1. 既有路由加入 `authMiddleware` + `tenantMiddleware`
2. Route Handler 改用 `req.tenantDB`
3. 資料遷移：將 `onboarding.db` 內容轉入 demo 租戶 DB
4. 建立 demo 租戶（admin/admin123、user/user123）

### Phase 4：管理介面
1. 平台管理後台
2. 租戶管理設定（組織架構、角色權限）
3. 權限可視化介面

**回滾策略**：每個 Phase 獨立可回滾，Phase 1~2 與既有功能並行，Phase 3 為唯一 breaking change。
