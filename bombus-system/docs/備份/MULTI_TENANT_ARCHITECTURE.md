# Bombus 多租戶 SaaS 架構技術說明文件

> 版本：1.0 ｜ 最後更新：2026-03-06
> 對象：客戶端工程師、PM

---

## 目錄

1. [系統概覽](#1-系統概覽)
2. [技術棧](#2-技術棧)
3. [架構總覽](#3-架構總覽)
4. [資料隔離策略 — Database-per-Tenant](#4-資料隔離策略--database-per-tenant)
5. [資料庫結構](#5-資料庫結構)
   - 5.1 平台資料庫 (platform.db)
   - 5.2 租戶資料庫 (tenant_{id}.db)
   - 5.3 RBAC 權限表
   - 5.4 業務表清單
6. [認證與授權](#6-認證與授權)
   - 6.1 JWT 認證機制
   - 6.2 Token 結構與刷新流程
   - 6.3 RBAC 權限模型
   - 6.4 權限繼承規則
7. [後端架構](#7-後端架構)
   - 7.1 中介層管線 (Middleware Pipeline)
   - 7.2 DBAdapter 抽象層
   - 7.3 TenantDBManager
   - 7.4 API 路由分類
8. [前端架構](#8-前端架構)
   - 8.1 認證流程
   - 8.2 HTTP Interceptor
   - 8.3 Route Guards
   - 8.4 權限控制
   - 8.5 功能閘門 (Feature Gate)
9. [管理介面](#9-管理介面)
   - 9.1 平台管理後台
   - 9.2 租戶管理設定
10. [方案與功能閘門](#10-方案與功能閘門)
11. [安全機制](#11-安全機制)
12. [API 完整端點清單](#12-api-完整端點清單)
13. [環境設定與部署](#13-環境設定與部署)
14. [遷移路徑](#14-遷移路徑)
15. [已知限制與風險](#15-已知限制與風險)

---

## 1. 系統概覽

Bombus 是一套多租戶（Multi-Tenant）HR SaaS 系統，涵蓋六大功能模組：

| 模組 | 代號 | 說明 |
|------|------|------|
| 員工管理 | L1 | 招募、面試、員工檔案、入職管理、會議、人才庫 |
| 職能管理 | L2 | 職等職級、職務說明書、職能框架、評估 |
| 教育訓練 | L3 | 課程管理、學習地圖、九宮格、人才儀表板 |
| 專案管理 | L4 | 專案列表、損益預測、報表 |
| 績效管理 | L5 | 毛利監控、獎金分配、目標管理、考核 |
| 文化管理 | L6 | 企業文化手冊、EAP、獎項、文件管理 |

系統採用 **Database-per-Tenant** 資料隔離策略，每個租戶擁有獨立的 SQLite 資料庫檔案，實現物理級別的資料隔離。

---

## 2. 技術棧

| 層級 | 技術 | 版本 |
|------|------|------|
| 前端框架 | Angular (Standalone Components) | 18.2 |
| 前端語言 | TypeScript | 5.x |
| 樣式 | SCSS（莫蘭迪色系 Soft UI） | — |
| 後端框架 | Express.js | 4.18 |
| 資料庫 | sql.js (SQLite in-memory with file persistence) | — |
| 認證 | JWT (jsonwebtoken) + bcryptjs | — |
| 安全 | helmet, express-rate-limit, CORS | — |
| 部署 | GitHub Pages (前端) + Node.js Server (後端) | — |

---

## 3. 架構總覽

```
┌──────────────────────────────────────────────────────────┐
│                     Angular 18.2 SPA                     │
│                                                          │
│  ┌────────────┐ ┌──────────────┐ ┌─────────────────────┐ │
│  │ AuthService│ │PermissionSvc │ │FeatureGateService   │ │
│  │ (JWT管理)  │ │ (RBAC檢查)   │ │(方案功能閘門)       │ │
│  └─────┬──────┘ └──────┬───────┘ └──────────┬──────────┘ │
│        │               │                    │            │
│  ┌─────▼───────────────▼────────────────────▼──────────┐ │
│  │           AuthInterceptor (自動附加 JWT)             │ │
│  │           ↳ 401 攔截 → 自動刷新 Token               │ │
│  └─────────────────────┬───────────────────────────────┘ │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTP (proxy → :3001)
┌────────────────────────▼─────────────────────────────────┐
│                   Express.js 4.18                         │
│                                                          │
│  Request → [helmet] → [rate-limit] → [CORS]              │
│    ↓                                                     │
│  [Auth Middleware]     ← JWT 驗證，解析 user/tenant       │
│    ↓                                                     │
│  [Tenant Middleware]   ← 載入租戶 DB，注入 req.tenantDB   │
│    ↓                                                     │
│  [Permission MW]       ← 檢查角色/權限（選用）            │
│    ↓                                                     │
│  [Route Handler]       ← 使用 req.tenantDB 操作資料      │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              TenantDBManager (單例)                  │ │
│  │  ┌───────┐ ┌───────┐ ┌───────┐        LRU Cache    │ │
│  │  │Tenant │ │Tenant │ │Tenant │        30min 閒置    │ │
│  │  │  A DB │ │  B DB │ │  C DB │        自動卸載      │ │
│  │  └───────┘ └───────┘ └───────┘                      │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌──────────────────┐                                    │
│  │  platform.db     │  ← 常駐記憶體（租戶/方案/審計）    │
│  └──────────────────┘                                    │
└──────────────────────────────────────────────────────────┘

server/data/
├── platform.db              ← 平台資料庫
└── tenants/
    ├── tenant_demo.db       ← Demo 租戶
    ├── tenant_acme.db       ← ACME 集團
    └── tenant_{id}.db       ← 各租戶獨立 DB
```

---

## 4. 資料隔離策略 — Database-per-Tenant

### 設計決策

| 策略 | Bombus 選擇 | 替代方案 |
|------|-------------|---------|
| **Database-per-Tenant** | ✅ 採用 | — |
| Shared DB + tenant_id | ❌ 未採用 | 隔離弱，SQL 遺漏 WHERE 條件即洩漏 |
| Table-prefix-per-Tenant | ❌ 未採用 | 管理複雜，sql.js 不支援 schema |

### 優勢

- **物理隔離**：租戶 A 的資料庫檔案與租戶 B 完全獨立
- **退租清除**：刪除單一 `.db` 檔案即可，零殘留
- **備份/還原**：以租戶為單位匯出單一檔案
- **效能獨立**：單一租戶的大量查詢不影響其他租戶
- **遷移友好**：未來遷移 PostgreSQL Schema-per-Tenant 時邏輯層可直接對應

### TenantDBManager 生命週期

```
1. Request 到達 → JWT 解析取得 tenant_id
2. TenantMiddleware 呼叫 TenantDBManager.getDB(tenant_id)
3. getDB() 檢查 LRU Cache：
   ├─ 命中 → 更新 lastAccess，重設 idle timer，回傳 DBAdapter
   └─ 未命中 → 從磁碟載入 .db 檔案 → 執行冪等遷移 → 放入 Cache
4. 閒置 30 分鐘 → 自動持久化到磁碟 → 從記憶體卸載
```

**關鍵檔案**：
| 檔案 | 職責 |
|------|------|
| `server/src/db/db-adapter.js` | DBAdapter 抽象層（query/run/prepare/transaction） |
| `server/src/db/platform-db.js` | platform.db 初始化與管理 |
| `server/src/db/tenant-db-manager.js` | 多租戶 DB 實例管理（LRU Cache） |
| `server/src/db/tenant-schema.js` | 租戶 DB Schema 定義（69+ 業務表 + 7 RBAC 表） |

---

## 5. 資料庫結構

### 5.1 平台資料庫 (platform.db)

儲存跨租戶的平台級資料，伺服器啟動時自動載入，永遠常駐記憶體。

```sql
-- 租戶清單
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,           -- URL 識別符（如 'demo', 'acme'）
  status TEXT DEFAULT 'active'         -- active | suspended | deleted
    CHECK(status IN ('active','suspended','deleted')),
  plan_id TEXT REFERENCES subscription_plans(id),
  db_file TEXT NOT NULL,               -- 租戶 DB 檔案路徑
  logo_url TEXT,
  industry TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 訂閱方案
CREATE TABLE subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                  -- 如 'Starter', 'Professional'
  max_users INTEGER DEFAULT 50,
  max_subsidiaries INTEGER DEFAULT 5,
  max_storage_gb INTEGER DEFAULT 5,
  features TEXT DEFAULT '{}',          -- JSON 陣列：啟用的功能 ID
  price_monthly REAL DEFAULT 0,
  price_yearly REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 平台管理員
CREATE TABLE platform_admins (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,         -- bcryptjs hash
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 審計日誌（跨租戶）
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,                      -- NULL = 平台級操作
  user_id TEXT,
  action TEXT NOT NULL,                -- 如 'tenant_create', 'user_login'
  resource TEXT,                       -- 如 'tenant', 'user', 'employee'
  details TEXT,                        -- JSON 詳情
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.2 租戶資料庫 (tenant_{id}.db)

每個租戶擁有獨立的資料庫，包含 RBAC 權限表 + 全部業務表。

### 5.3 RBAC 權限表（7 張表）

```sql
-- 使用者帳號
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  employee_id TEXT REFERENCES employees(id),  -- 關聯員工
  avatar TEXT,
  status TEXT DEFAULT 'active'
    CHECK(status IN ('active','inactive','locked')),
  must_change_password INTEGER DEFAULT 0,     -- 首次登入強制改密碼
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 組織架構（4 層）
CREATE TABLE org_units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL
    CHECK(type IN ('group','subsidiary','department')),
  parent_id TEXT REFERENCES org_units(id),    -- 樹狀結構
  level INTEGER DEFAULT 0,                    -- 0=集團, 1=子公司, 2=部門
  code TEXT,                                  -- 公司統一編號等
  address TEXT,
  phone TEXT,
  email TEXT,
  description TEXT,
  tax_id TEXT,
  status TEXT DEFAULT 'active',
  established_date TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 角色定義
CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                         -- 如 'super_admin', 'hr_manager'
  description TEXT,
  scope_type TEXT NOT NULL
    CHECK(scope_type IN ('global','subsidiary','department')),
  is_system INTEGER DEFAULT 0,               -- 系統內建角色不可刪除
  created_at TEXT DEFAULT (datetime('now'))
);

-- 權限定義
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  resource TEXT NOT NULL,                     -- 如 'employee', 'recruitment'
  action TEXT NOT NULL,                       -- 如 'read', 'write', 'delete'
  description TEXT,
  UNIQUE(resource, action)
);

-- 角色-權限關聯
CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- 使用者-角色指派（含組織範圍）
CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  org_unit_id TEXT REFERENCES org_units(id),  -- 角色作用範圍
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, role_id, org_unit_id)
);

-- Refresh Token
CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 5.4 業務表清單

以下為各模組的資料表（均存在於租戶 DB 中）：

| 模組 | 表名 | 說明 |
|------|------|------|
| **共用** | `departments` | 部門（含 manager_id, head_count） |
| **共用** | `department_collaborations` | 部門協作關係 |
| **L1 員工管理** | `employees` | 員工基本資料（含 org_unit_id FK） |
| | `employee_education` | 教育背景 |
| | `employee_experience` | 工作經歷 |
| | `employee_certifications` | 證照資料 |
| | `employee_emergency_contacts` | 緊急聯絡人 |
| | `jobs` | 招募職缺 |
| | `candidates` | 候選人 |
| | `candidate_notes` | 候選人備註 |
| | `candidate_tags` | 候選人標籤 |
| | `candidate_documents` | 候選人文件 |
| | `interviews` | 面試排程 |
| | `interview_feedback` | 面試評估 |
| | `offer_responses` | Offer 回覆記錄 |
| | `talent_pool` | 人才庫 |
| | `talent_pool_candidates` | 人才庫候選人關聯 |
| | `onboarding_templates` | 入職文件範本 |
| | `onboarding_submissions` | 入職文件提交 |
| | `meetings` | 會議記錄 |
| | `meeting_participants` | 會議參與者 |
| **L2 職能管理** | `grade_levels` | 職等（1-7 級） |
| | `grade_salary_levels` | 職級薪資（BS01-BS20） |
| | `grade_tracks` | 職涯軌道 |
| | `department_positions` | 部門職位 |
| | `promotion_criteria` | 晉升標準 |
| | `career_paths` | 職涯路徑 |
| | `grade_change_history` | 職等異動記錄 |
| | `job_descriptions` | 職務說明書 |
| | `job_description_versions` | 版本管理 |
| | `job_description_approvals` | 審核紀錄 |
| | `competency_frameworks` | 職能基準 |
| | `competency_items` | 職能項目 |
| | `competency_levels` | 職能等級 |
| | `competency_indicators` | 行為指標 |
| | `employee_competency_assessments` | 職能評估 |
| | `employee_competency_details` | 評估明細 |
| | `competency_gap_analyses` | 落差分析 |
| **L3 教育訓練** | `monthly_check_templates` | 月考核範本 |
| | `monthly_checks` | 月考核記錄 |
| | `weekly_reports` | 週報 |
| | `quarterly_reviews` | 季度評核 |
| | `satisfaction_questions` | 滿意度問卷 |

> 完整 Schema 定義見 `server/src/db/tenant-schema.js`

---

## 6. 認證與授權

### 6.1 JWT 認證機制

系統採用 **Access Token + Refresh Token** 雙 Token 架構：

| Token | 效期 | 用途 | 儲存位置 |
|-------|------|------|----------|
| Access Token | 15 分鐘 | API 請求認證 | 前端 localStorage |
| Refresh Token | 7 天 | 刷新 Access Token | 前端 localStorage + 後端 DB |

### 6.2 Token 結構與刷新流程

**Access Token Payload**：
```json
{
  "sub": "user-uuid",           // 使用者 ID
  "tid": "tenant-uuid",         // 租戶 ID
  "email": "user@example.com",
  "roles": ["hr_manager"],      // 角色名稱陣列
  "scope": {                    // 角色作用範圍
    "type": "subsidiary",
    "id": "subsidiary-uuid"
  },
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Token 刷新流程**：

```
1. 前端發送 API 請求，附帶 Authorization: Bearer <access_token>
2. 後端 Auth Middleware 驗證 Token：
   ├─ 有效 → 繼續處理請求
   └─ 過期 → 回傳 401
3. 前端 AuthInterceptor 攔截 401：
   a. 呼叫 POST /api/auth/refresh（附帶 refresh_token）
   b. 後端驗證 refresh_token 有效性（查 DB + 比對 hash + 檢查過期）
   c. 核發新的 access_token + refresh_token
   d. 前端儲存新 Token，重送原始請求
4. 若 refresh_token 也過期 → 導向登入頁
```

**並發請求處理**：AuthInterceptor 使用 `refreshInProgress` flag + `BehaviorSubject` 佇列，確保多個 401 請求只觸發一次 refresh，其餘請求等待新 Token 後重送。

### 6.3 RBAC 權限模型

**4 層組織架構**：
```
集團（Group）          ← level 0
 └── 子公司（Subsidiary）  ← level 1
      └── 部門（Department）   ← level 2
           └── 使用者 + 角色
```

**Scoped Roles（角色作用範圍）**：
```
user_roles 表：(user_id, role_id, org_unit_id)
                                    ↑
                              角色的作用範圍
                              NULL = 全域
                              org_unit_id = 限定組織單位
```

**預設系統角色**：

| 角色 | scope_type | 說明 | 權限範圍 |
|------|-----------|------|---------|
| `super_admin` | global | 集團超級管理員 | 所有資源的所有操作 |
| `subsidiary_admin` | subsidiary | 子公司管理員 | 該子公司下所有資源 |
| `hr_manager` | subsidiary/dept | HR 主管 | 員工、招募、入職等 |
| `dept_manager` | department | 部門主管 | 該部門員工資料 |
| `employee` | department | 一般員工 | 唯讀自己的資料 |

**權限格式**：`resource:action`
```
employee:read         — 讀取員工資料
employee:write        — 新增/編輯員工
employee:delete       — 刪除員工
recruitment:manage    — 管理招募流程
grade-matrix:edit     — 編輯職等矩陣
report:export         — 匯出報表
onboarding:manage     — 管理入職流程
```

### 6.4 權限繼承規則

```
global 角色
 ├── 自動擁有所有 subsidiary 範圍的權限
 └── 自動擁有所有 department 範圍的權限

subsidiary 角色
 └── 自動擁有該子公司下所有 department 的權限

department 角色
 └── 僅限於該部門
```

**後端 Permission Middleware 實作邏輯**：
1. 從 JWT 取得 `roles` 和 `scope`
2. 查詢 `role_permissions` 取得該角色的所有權限
3. 檢查 `org_unit_id` 繼承鏈（向上遍歷 parent_id）
4. `super_admin` 角色跳過所有權限檢查

---

## 7. 後端架構

### 7.1 中介層管線 (Middleware Pipeline)

```
Request
  │
  ▼
┌─────────────────────┐
│ helmet              │  Content Security Policy, XSS Protection
│ cors                │  Cross-Origin Resource Sharing
│ express.json(50mb)  │  JSON Body Parser（支援大型 Base64 PDF）
│ rate-limit          │  API: 1000/15min, Auth: 100/15min
└─────────┬───────────┘
          │
    ┌─────▼─────┐
    │ 路由分發  │
    └─────┬─────┘
          │
  ┌───────┼────────┐──────────┐
  ▼       ▼        ▼          ▼
公開路由  認證路由  平台管理   業務路由
/health   /auth    /platform  /employee, /recruitment ...
                    │          │
                    ▼          ▼
              platformAdmin  authMiddleware
              Middleware     + tenantMiddleware
                             + [permissionMiddleware]
```

### 7.2 DBAdapter 抽象層

為未來遷移 PostgreSQL 預留介面，目前使用 sql.js 實作：

```javascript
class DBAdapter {
  query(sql, params)         // SELECT → 回傳 rows 陣列
  queryOne(sql, params)      // SELECT → 回傳單筆 row 或 null
  run(sql, params)           // INSERT/UPDATE/DELETE → 回傳 { changes }
  prepare(sql)               // Prepared Statement
  transaction(fn)            // 交易封裝
  save()                     // 持久化到磁碟
  close()                    // 釋放記憶體
}

class SqliteAdapter extends DBAdapter {
  constructor(db, dbPath)    // sql.js Database 實例 + 檔案路徑
  get raw                    // 直接存取 sql.js Database（遷移/特殊用途）
}
```

**遷移 PostgreSQL 時的影響**：

| 需要改的 | 不需要改的 |
|----------|-----------|
| `SqliteAdapter` → `PostgresAdapter` | `DBAdapter` 介面 |
| 檔案操作 → Schema DDL | `TenantDBManager` 公開 API |
| 少量 SQL 型別差異 | 所有 Prepared Statements |
| — | JWT、RBAC、所有中介層 |
| — | 前端完全不變 |

### 7.3 TenantDBManager

```javascript
class TenantDBManager {
  async init()                              // 初始化 sql.js engine
  getDB(tenantId): SqliteAdapter            // 取得租戶 DB（LRU Cache）
  createTenantDB(tenantId, initSchema)      // 建立新租戶 DB
  deleteTenantDB(tenantId)                  // 硬刪除租戶 DB
  unloadDB(tenantId)                        // 卸載（持久化 + 從記憶體移除）
  exists(tenantId): boolean                 // 檢查 DB 檔案是否存在
  get loadedCount: number                   // 已載入的租戶數
  closeAll()                                // 關閉所有連線
}
```

**LRU Cache 策略**：
- 活躍租戶的 DB 保持在記憶體中
- 閒置超過 30 分鐘自動卸載（`IDLE_TIMEOUT_MS = 30 * 60 * 1000`）
- < 100 租戶時，所有 DB 可常駐記憶體（每個空 DB ≈ 幾 KB）
- platform.db 永遠常駐，不受 LRU 管理

**冪等遷移（_runMigrations）**：
載入既有租戶 DB 時自動執行 ALTER TABLE 補欄位，使用 try-catch 忽略「欄位已存在」錯誤：

```javascript
// 範例：employees 表新增欄位
const employeeMigrations = [
  'ALTER TABLE employees ADD COLUMN job_title TEXT',
  'ALTER TABLE employees ADD COLUMN candidate_id TEXT',
  'ALTER TABLE employees ADD COLUMN org_unit_id TEXT REFERENCES org_units(id)'
];
for (const sql of employeeMigrations) {
  try { db.run(sql); } catch (e) { /* 欄位已存在則忽略 */ }
}
```

### 7.4 API 路由分類

| 類別 | 路徑前綴 | 保護方式 | 說明 |
|------|---------|---------|------|
| 健康檢查 | `/api/health` | 無 | 服務健康狀態 |
| 認證 | `/api/auth` | `authLimiter` | 登入、登出、刷新 Token、改密碼 |
| 平台管理 | `/api/platform` | `authMiddleware` + `platformAdminMiddleware` | 租戶 CRUD、方案管理 |
| 審計日誌 | `/api/audit` | `authMiddleware` | 查詢操作日誌 |
| 租戶管理 | `/api/tenant-admin` | `authMiddleware` + `tenantMiddleware` + `requireRole` | 組織架構、角色權限、使用者 |
| 組織管理 | `/api/organization` | `authMiddleware` + `tenantMiddleware` | 組織單位 CRUD |
| 業務 API | `/api/employee`, `/api/recruitment`, `/api/jobs`, `/api/meetings`, `/api/talent-pool`, `/api/hr/onboarding`, `/api/grade-matrix`, `/api/competency-mgmt`, `/api/job-descriptions`, `/api/monthly-checks`, `/api/weekly-reports`, `/api/quarterly-reviews`, `/api/export`, `/api/upload` | `authMiddleware` + `tenantMiddleware` | L1~L6 業務功能 |

---

## 8. 前端架構

### 8.1 認證流程

```
使用者開啟登入頁 (/login)
    │
    ├── 租戶模式（Tenant Login）
    │   ├─ 輸入：tenant_slug + email + password
    │   ├─ POST /api/auth/login
    │   ├─ 回傳：access_token + refresh_token + user（含 roles, permissions, enabled_features）
    │   ├─ 儲存到 localStorage：bombus_access_token, bombus_refresh_token, bombus_user
    │   ├─ 檢查 must_change_password → true 時導向 /change-password
    │   └─ 載入 permissions → 導向 /dashboard
    │
    └── 平台模式（Platform Login）
        ├─ 輸入：email + password
        ├─ POST /api/auth/platform-login
        └─ 導向 /platform（平台管理後台）
```

**AuthService 核心方法**：

```typescript
class AuthService {
  // Signal-based 狀態
  currentUser: Signal<User | null>
  isLoggedIn: Signal<boolean>

  // 操作方法
  login(request: LoginRequest): Observable<LoginResponse>
  platformLogin(email, password): Observable<LoginResponse>
  logout(): void
  refreshToken(): Observable<TokenResponse>
  changePassword(request: ChangePasswordRequest): Observable<ChangePasswordResponse>

  // Token 管理
  getAccessToken(): string | null
  getRefreshToken(): string | null
}
```

### 8.2 HTTP Interceptor

`AuthInterceptor` 功能：
1. **自動附加 Token**：所有 `/api/*` 請求自動加上 `Authorization: Bearer <token>` header
2. **排除路徑**：`/api/auth/login`, `/api/auth/register`, `/api/auth/refresh` 不附加 Token
3. **401 自動刷新**：收到 401 回應時自動呼叫 refresh endpoint，成功後重送原始請求
4. **並發保護**：使用 `refreshInProgress` 避免多個請求同時觸發 refresh
5. **刷新失敗處理**：refresh 也失敗時呼叫 `authService.logout()` 導回登入頁

### 8.3 Route Guards

| Guard | 檔案 | 保護邏輯 |
|-------|------|---------|
| `authGuard` | `core/guards/auth.guard.ts` | 檢查 `isLoggedIn` signal，未登入導向 `/login` |
| `permissionGuard` | `core/guards/permission.guard.ts` | 檢查路由 `data.requiredPermission`，無權限導向 `/dashboard` |
| `platformAdminGuard` | `core/guards/platform-admin.guard.ts` | 檢查 `isPlatformAdmin`，非平台管理員導向 `/login` |
| `featureGateGuard` | `core/guards/feature-gate.guard.ts` | 檢查路由 `data.requiredFeaturePrefix`，功能未啟用導向 `/dashboard` |

**路由設定範例**：
```typescript
{
  path: 'employee',
  canActivate: [authGuard, featureGateGuard],
  data: { requiredFeaturePrefix: 'L1' },
  loadChildren: () => import('./features/employee/employee.routes')
}
```

### 8.4 權限控制

**PermissionService**（Signal-based）：

```typescript
class PermissionService {
  permissions: Signal<UserPermission[]>
  roles: Signal<string[]>

  hasPermission(resource: string, action: string): boolean
  hasRole(roleName: string): boolean
  hasAnyRole(roleNames: string[]): boolean
  loadPermissions(): Observable<void>   // 從後端載入最新權限
}
```

**Has Permission Directive**：

```html
<!-- 只有擁有 employee:write 權限的使用者才能看到此按鈕 -->
<button *appHasPermission="'employee:write'">新增員工</button>
```

### 8.5 功能閘門 (Feature Gate)

根據租戶訂閱方案，控制功能模組的可用性：

```typescript
class FeatureGateService {
  enabledFeatures: Signal<Set<string>>

  // 精確比對 + 模組級別比對
  isFeatureEnabled(featureId: string): boolean
  // 例：isFeatureEnabled('L1.jobs') → 檢查 L1.jobs 或 L1 是否啟用

  isModuleEnabled(prefix: string): boolean
  // 例：isModuleEnabled('L1') → 檢查是否有任何 L1.* 功能
}
```

**優雅降級**：無方案資料時（`features.size === 0`），所有功能預設開放。

**功能 ID 體系**：

| 模組 | 功能 ID | 說明 |
|------|---------|------|
| L1 | `L1.jobs` | 招募職缺管理 |
| L1 | `L1.recruitment` | AI 智能面試 |
| L1 | `L1.talent-pool` | 人才庫管理 |
| L1 | `L1.profile` | 員工檔案管理 |
| L1 | `L1.meeting` | 會議管理 |
| L1 | `L1.onboarding` | 入職管理 |
| L2 | `L2.grade-matrix` | 職等職級管理 |
| L2 | `L2.framework` | 職能模型基準 |
| L2 | `L2.job-description` | 職務說明書 |
| L2 | `L2.assessment` | 職能評估系統 |
| L3 | `L3.course-management` | 課程管理 |
| L3 | `L3.learning-map` | 學習地圖 |
| L3 | `L3.nine-box` | 人才九宮格 |
| L4 | `L4.list` | 專案列表 |
| L4 | `L4.profit-prediction` | AI 損益預測 |
| L5 | `L5.profit-dashboard` | 毛利監控 |
| L5 | `L5.bonus-distribution` | 獎金分配 |
| L5 | `L5.review` | 績效考核 |
| L6 | `L6.handbook` | 企業文化手冊 |
| L6 | `L6.eap` | EAP 員工協助 |
| L6 | `L6.documents` | 文件儲存庫 |

---

## 9. 管理介面

### 9.1 平台管理後台（路由 `/platform`）

**需要平台管理員帳號登入**（見環境變數 `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD`）

| 頁面 | 功能 |
|------|------|
| 租戶管理 | 租戶列表（搜尋/篩選/分頁）、新增租戶（含首位管理員）、編輯、軟刪除/硬刪除、狀態管理（active/suspended/deleted） |
| 方案管理 | 方案列表、新增/編輯方案、設定功能模組（勾選 L1~L6 子功能）、定價、使用量限制 |
| 審計日誌 | 跨租戶操作日誌查詢（分頁 + 時間/動作/資源篩選） |

**新增租戶流程**：
```
1. 填寫：租戶名稱、slug、選擇方案、管理員 email/密碼
2. 後端處理：
   a. 在 platform.db 建立 tenants 記錄
   b. 呼叫 TenantDBManager.createTenantDB() 建立獨立 DB
   c. initTenantSchema() 初始化 69+ 表
   d. 建立首位管理員帳號（super_admin 角色）
   e. 建立預設部門與組織架構
   f. 寫入審計日誌
3. 回傳租戶資訊（含 DB 檔案路徑）
```

### 9.2 租戶管理設定（路由 `/settings`）

| 頁面 | 功能 |
|------|------|
| 組織架構 | 樹狀圖編輯（集團→子公司→部門）、拖放排序 |
| 角色權限 | 角色列表 CRUD、權限矩陣（resource × action） |
| 使用者管理 | 使用者列表、帳號建立、角色指派（含 org_unit_id 範圍） |

---

## 10. 方案與功能閘門

### 方案如何控制功能

```
subscription_plans.features = '["L1.jobs","L1.recruitment","L2.grade-matrix"]'
                                    │
                                    ▼
tenant → plan → features → Login Response: enabled_features 陣列
                                    │
                                    ▼
前端 FeatureGateService.enabledFeatures (Signal<Set<string>>)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             featureGateGuard  FeatureGateService  側邊欄過濾
             (路由層攔截)      .isFeatureEnabled() (隱藏未啟用模組)
```

### 前端與後端的雙重驗證

| 層級 | 驗證方式 | 說明 |
|------|---------|------|
| 前端路由 | `featureGateGuard` | 未啟用的模組路由直接導回 dashboard |
| 前端 UI | `FeatureGateService.isFeatureEnabled()` | 側邊欄選單隱藏未啟用功能 |
| 後端 | （可選）`requireFeature` middleware | 檢查 `subscription_plans.features` 是否包含所需功能 |

---

## 11. 安全機制

| 機制 | 實作 | 說明 |
|------|------|------|
| **密碼加密** | bcryptjs (salt rounds: 10) | 所有密碼以 hash 儲存，不可逆 |
| **JWT Secret** | 環境變數 `JWT_SECRET` | Token 簽名金鑰，生產環境須更換 |
| **HTTPS** | helmet 強制 | Content-Security-Policy, XSS 保護 |
| **Rate Limiting** | express-rate-limit | API: 1000/15min, Auth: 可設定（預設 100/15min） |
| **SQL Injection 防護** | Prepared Statements | 所有 SQL 使用參數化查詢 |
| **CORS** | cors middleware | 控制跨域請求 |
| **審計日誌** | 所有關鍵操作寫入 audit_logs | 租戶建立/刪除、使用者登入/權限變更 |
| **租戶狀態檢查** | Tenant Middleware | `suspended`/`deleted` 狀態的租戶請求被拒絕 (403) |
| **首次登入改密碼** | `must_change_password` flag | 自動建立的帳號首次登入強制變更密碼 |
| **Refresh Token 安全** | Hash 後存入 DB | Token 外洩後可從 DB 撤銷 |
| **刪除二次確認** | 硬刪除需 `{ confirm: true }` | 防止意外刪除租戶 |

---

## 12. API 完整端點清單

### 認證 API (`/api/auth`)

| 方法 | 路徑 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/auth/login` | 租戶使用者登入 | 無 |
| POST | `/api/auth/platform-login` | 平台管理員登入 | 無 |
| POST | `/api/auth/refresh` | 刷新 Access Token | 無（需 refresh_token） |
| POST | `/api/auth/logout` | 登出（撤銷 refresh_token） | Bearer Token |
| POST | `/api/auth/change-password` | 變更密碼 | Bearer Token |
| GET | `/api/auth/me` | 取得當前使用者資訊 | Bearer Token |

### 平台管理 API (`/api/platform`)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/platform/tenants` | 租戶列表（分頁+搜尋+狀態篩選） |
| POST | `/api/platform/tenants` | 建立新租戶（含首位管理員） |
| GET | `/api/platform/tenants/:id` | 取得租戶詳情 |
| PUT | `/api/platform/tenants/:id` | 更新租戶資料 |
| PUT | `/api/platform/tenants/:id/status` | 變更租戶狀態 |
| DELETE | `/api/platform/tenants/:id` | 軟刪除租戶 |
| DELETE | `/api/platform/tenants/:id/purge` | 硬刪除租戶（需二次確認） |
| GET | `/api/platform/plans` | 方案列表 |
| POST | `/api/platform/plans` | 建立方案 |
| PUT | `/api/platform/plans/:id` | 更新方案 |

### 審計日誌 API (`/api/audit`)

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/audit/logs` | 查詢審計日誌（分頁+篩選） |
| PUT/PATCH/DELETE | `/api/audit/logs` | 405 Method Not Allowed（不可修改） |

### 業務 API（需 `authMiddleware` + `tenantMiddleware`）

| 路徑前綴 | 說明 |
|---------|------|
| `/api/employee` | 員工 CRUD |
| `/api/recruitment` | 招募管理（候選人、面試、Offer） |
| `/api/jobs` | 職缺管理 |
| `/api/meetings` | 會議管理 |
| `/api/talent-pool` | 人才庫 |
| `/api/hr/onboarding` | 入職管理（候選人轉換、文件範本） |
| `/api/onboarding/templates` | 入職文件範本 |
| `/api/onboarding/sign` | 入職文件簽署 |
| `/api/grade-matrix` | 職等職級矩陣 |
| `/api/job-descriptions` | 職務說明書 |
| `/api/competency-mgmt` | 職能基準庫 |
| `/api/monthly-checks` | 月考核 |
| `/api/weekly-reports` | 週報 |
| `/api/quarterly-reviews` | 季度評核 |
| `/api/organization` | 組織架構管理 |
| `/api/export` | Excel 匯出 |
| `/api/upload` | 檔案上傳 |

---

## 13. 環境設定與部署

### 環境變數 (server/.env)

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `PORT` | 後端服務埠 | `3001` |
| `JWT_SECRET` | JWT 簽名金鑰 | `bombus-dev-secret-key-change-in-production` |
| `JWT_ACCESS_EXPIRES` | Access Token 效期 | `15m` |
| `JWT_REFRESH_EXPIRES` | Refresh Token 效期 | `7d` |
| `PLATFORM_ADMIN_EMAIL` | 初始平台管理員 email | — |
| `PLATFORM_ADMIN_PASSWORD` | 初始平台管理員密碼 | — |
| `AUTH_RATE_LIMIT` | 認證端點頻率限制（次/15分鐘） | `100` |
| `FRONTEND_URL` | 前端網址（QR Code 用） | — |

### 啟動指令

```bash
# 後端
cd bombus-system/server
npm install
npm run dev        # 開發模式（nodemon, port 3001）

# 前端
cd bombus-system
npm install
npm start          # 開發模式（port 4200, proxy → 3001）
```

### 前端代理設定 (proxy.conf.json)

```json
{
  "/api":     { "target": "http://localhost:3001" },
  "/uploads": { "target": "http://localhost:3001" }
}
```

### Demo 帳號

| 身份 | Email | 密碼 | 租戶 |
|------|-------|------|------|
| 租戶管理員 | `admin@demo.com` | `admin123` | `demo` |
| 平台管理員 | 見 `.env` PLATFORM_ADMIN_EMAIL | 見 `.env` PLATFORM_ADMIN_PASSWORD | — |

### 資料目錄結構

```
server/data/
├── platform.db
└── tenants/
    └── tenant_demo.db
```

---

## 14. 遷移路徑

### 遷移至 PostgreSQL

系統已預留 DBAdapter 抽象層，遷移 PostgreSQL 的影響範圍：

| 需要新增/修改 | 預估工作量 | 說明 |
|-------------|-----------|------|
| `PostgresAdapter` | 1 檔案 | 實作 `DBAdapter` 介面 |
| `TenantDBManager` | 修改連線管理 | 檔案操作 → Schema DDL |
| SQL 語法微調 | 少量 | TEXT → VARCHAR, datetime('now') → NOW() |
| 連線池設定 | 新增 | pg-pool 設定 |

**不需要修改**：
- 所有 Route Handler 的 SQL（已使用 Prepared Statements）
- 所有中介層（JWT、RBAC、Tenant）
- 所有前端程式碼

### 擴展策略

| 租戶規模 | 策略 | 說明 |
|---------|------|------|
| < 100 | 現行架構 | 所有 DB 可常駐記憶體 |
| 100-1000 | LRU Cache 調優 | 調整 `IDLE_TIMEOUT_MS`，增加伺服器記憶體 |
| 1000+ | 遷移 PostgreSQL | Schema-per-Tenant，使用連線池 |

---

## 15. 已知限制與風險

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| sql.js 記憶體限制 | 多租戶同時在線可能記憶體不足 | LRU Cache 自動卸載；< 100 租戶可全部常駐 |
| sql.js 無原生加密 | DB 檔案明文儲存 | 生產環境遷移 PostgreSQL 使用 SSL + 加密存儲 |
| JWT Secret 單一 | 洩漏影響所有租戶 | 使用強密碼；未來可改為租戶級 Secret |
| 無 SSO/SAML | 大型企業整合不便 | 原型階段，後續可擴展 |
| 無跨區域部署 | 單一伺服器 | 原型階段，後續可擴展 |
| 無自動備份 | 需手動備份 | 可設定 cron job 定期備份 data/ 目錄 |

---

## 附錄 A：整合測試

```bash
# 端對端流程測試（41/41）
cd bombus-system/server && node src/tests/test-e2e-flow.js

# 租戶隔離測試（22/22）
cd bombus-system/server && node src/tests/test-tenant-isolation.js

# Demo 租戶測試（32/32）
cd bombus-system/server && node src/tests/test-demo-tenant.js

# 權限繼承測試（24/24）
cd bombus-system/server && node src/tests/test-permission-inheritance.js

# 審計日誌測試（34/34）
cd bombus-system/server && node src/tests/test-audit-logs.js

# 候選人→員工→帳號串連測試（36/36）
cd bombus-system/server && node src/tests/test-candidate-user-linking.js
```

**總計：189/189 assertions passed**

---

## 附錄 B：檔案索引

### 後端核心檔案

| 檔案路徑 | 說明 |
|---------|------|
| `server/src/index.js` | 伺服器入口，路由註冊 |
| `server/src/db/db-adapter.js` | DBAdapter 抽象層 |
| `server/src/db/platform-db.js` | 平台 DB 管理 |
| `server/src/db/tenant-db-manager.js` | 租戶 DB 實例管理 |
| `server/src/db/tenant-schema.js` | 租戶 Schema 定義 |
| `server/src/db/migrate-demo.js` | Demo 租戶遷移腳本 |
| `server/src/middleware/auth.js` | JWT 認證中介層 |
| `server/src/middleware/tenant.js` | 租戶上下文中介層 |
| `server/src/middleware/permission.js` | 權限檢查中介層 |
| `server/src/routes/auth.js` | 認證路由 |
| `server/src/routes/platform.js` | 平台管理路由 |
| `server/src/routes/audit.js` | 審計日誌路由 |
| `server/src/routes/tenant-admin.js` | 租戶管理路由 |
| `server/src/routes/organization.js` | 組織架構路由 |

### 前端核心檔案

| 檔案路徑 | 說明 |
|---------|------|
| `src/app/features/auth/models/auth.model.ts` | Auth 資料模型 |
| `src/app/features/auth/services/auth.service.ts` | 認證服務 |
| `src/app/core/interceptors/auth.interceptor.ts` | HTTP 攔截器 |
| `src/app/core/services/permission.service.ts` | 權限服務 |
| `src/app/core/services/feature-gate.service.ts` | 功能閘門服務 |
| `src/app/core/guards/auth.guard.ts` | 認證 Guard |
| `src/app/core/guards/permission.guard.ts` | 權限 Guard |
| `src/app/core/guards/platform-admin.guard.ts` | 平台管理員 Guard |
| `src/app/core/guards/feature-gate.guard.ts` | 功能閘門 Guard |
| `src/app/shared/directives/has-permission.directive.ts` | 權限指令 |
| `src/app/features/platform-admin/` | 平台管理頁面 |
| `src/app/features/auth/pages/change-password-page/` | 改密碼頁面 |
