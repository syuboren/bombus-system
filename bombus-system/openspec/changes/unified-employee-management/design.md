## Context

目前「人員管理」分散在三個頁面，各自有獨立的資料模型與 API：

| 頁面 | 路由 | 資料模型 | 服務 | 詳情深度 |
|------|------|----------|------|----------|
| settings/users | `/settings/users` | `TenantUser` (tenant-admin.model.ts) | TenantAdminService | 4 Section Modal |
| organization/employee-management | `/organization/employee-management` | `Employee` (organization.model.ts) | OrganizationService | 4 Section Modal |
| employee/profile | `/employee/profile` | `EmployeeDetail` (talent-pool.model.ts) | EmployeeService | 6 Tab Modal |

問題：
1. 深度功能（6 Tab 詳情、ROI、績效）蓋在自助頁面上，HR 管理頁面只有淺層 Modal
2. 兩套 Employee 介面（organization 的有 `positions[]` 跨公司支援，employee 的有完整歷程但無跨公司）
3. Employee 和 User 帳號建立完全獨立，缺乏企業導入的批次匯入支援
4. HR 需在多個頁面間切換才能完成一個人的完整管理

現有相關模組與複用元件：
- `HeaderComponent` (`shared/components/header/`)
- `PaginationComponent` (`shared/components/pagination/`)
- `StatusBadgeComponent` (`shared/components/status-badge/`)
- `HasPermissionDirective` (`shared/directives/has-permission.directive.ts`)
- `FeatureGateService` (`core/services/feature-gate.service.ts`)
- `NotificationService` (`core/services/notification.service.ts`)
- `AuthService` (`features/auth/services/auth.service.ts`)

## Goals / Non-Goals

**Goals:**

- 將 `organization/employee-management` 升級為 HR 管理中心（單一入口管理所有人員事務）
- 將 `employee/profile` 重新定位為員工自助頁面（按權限範圍唯讀查閱）
- 將 `settings/users` 精簡為帳號快速總覽（詳細操作導向 HR 管理中心）
- 統一 Employee 資料模型（合併跨公司 + 完整歷程）
- 統一帳號建立服務（三個入口共用）
- 新增批次員工匯入功能（支援企業導入場景）

**Non-Goals:**

- 不建置 SMTP 郵件發送功能
- 不提供員工自助編輯個人資料功能
- 不重構組織架構管理（公司/部門 CRUD 維持現狀）
- 不變更角色權限管理頁面（`settings/roles`）

## Decisions

### 共用員工詳情元件架構

**決策**：建立 `EmployeeDetailComponent`（`shared/components/employee-detail/`），透過 Signal input `readonly` 控制模式。

```
EmployeeDetailComponent
├── input: employeeId = input.required<string>()
├── input: readonly = input<boolean>(false)
├── input: moduleColor = input<string>('$color-l1-sage')
├── output: employeeUpdated = output<void>()
│
├── Tab: 基本資料     ── 需 L1.profile view
├── Tab: 職務異動     ── 需 L1.profile view
├── Tab: 文件管理     ── 需 L1.profile view
├── Tab: 訓練紀錄     ── 需 L1.profile view
├── Tab: 績效評核     ── 需 L1.profile view
├── Tab: ROI 分析     ── 需 L1.profile view
└── Tab: 帳號與權限   ── 需 SYS.user-management edit（readonly 模式不顯示）
```

**替代方案**：各頁面各自維護 Modal → 否決，因為 6 Tab 的 UI 重複維護成本過高。

**樣式策略**：元件接收 `moduleColor` input，使 HR 管理中心可用組織管理色（`$color-l4-mauve`）、員工自助可用 L1 色（`$color-l1-sage`）。SCSS 使用 CSS 自訂屬性 `--module-color` 動態套色。

### 統一 Employee 資料模型

**決策**：在 `shared/models/employee.model.ts` 建立單一 `UnifiedEmployee` 介面，合併兩套模型。

```typescript
interface UnifiedEmployee {
  // 基本資料（兩套共有）
  id: string;
  employeeNo: string;
  name: string;
  englishName?: string;
  email: string;
  phone: string;
  mobile?: string;
  gender: 'male' | 'female' | 'other';
  birthDate?: string;
  hireDate: string;
  status: EmployeeStatus;
  avatar?: string;
  contractType: ContractType;
  workLocation?: string;

  // 跨公司支援（來自 organization.model.ts）
  positions: EmployeePosition[];

  // 完整歷程（來自 talent-pool.model.ts，詳情時才載入）
  education?: EmployeeEducation[];
  skills?: string[];
  certifications?: EmployeeCertification[];
  emergencyContact?: EmergencyContact;

  // 關聯 User 帳號
  userId?: string;
  userStatus?: 'active' | 'inactive' | 'locked';
}

// 詳情延伸（getEmployeeById 時才回傳）
interface UnifiedEmployeeDetail extends UnifiedEmployee {
  workHistory: JobChange[];
  documents: EmployeeDocument[];
  training: EmployeeTraining[];
  performance: EmployeePerformance[];
  roi: EmployeeROI;
  candidateSource?: CandidateSource;
  onboardingProgress?: OnboardingProgress;
  auditLogs?: AuditLog[];
  userRoles?: UserRole[];
}
```

**遷移策略**：舊的 `organization.model.ts` Employee 和 `talent-pool.model.ts` EmployeeDetail 加上 `/** @deprecated */` 標註，漸進式遷移各頁面至統一模型。

### 統一後端 Employee API

**決策**：以現有 `/api/employee/` 為基礎擴充，不新建路由前綴。

| 端點 | 用途 | 變更 |
|------|------|------|
| `GET /api/employee/list` | 員工清單 | 擴充回傳 `positions[]`、`userId`、`userStatus` |
| `GET /api/employee/:id` | 員工詳情 | 擴充回傳完整歷程 + `userRoles[]` |
| `POST /api/employee` | 新增員工 | **新增**，呼叫統一帳號建立服務 |
| `PUT /api/employee/:id` | 更新員工 | **新增**，支援基本資料編輯 |
| `GET /api/employee/stats` | 統計 | 現有，不變 |
| `POST /api/employee/batch-import/validate` | 批次驗證 | **新增** |
| `POST /api/employee/batch-import/execute` | 批次匯入 | **新增** |
| `GET /api/employee/batch-import/:jobId/status` | 匯入進度 | **新增** |
| `GET /api/employee/batch-import/:jobId/report` | 匯入報告 | **新增** |

### 統一帳號建立服務

**決策**：建立後端共用模組 `server/src/services/account-creation.js`，三個入口皆呼叫此服務。

```javascript
// account-creation.js
async function createEmployeeWithAccount(tenantDB, {
  employeeData,   // 員工基本資料
  createUser,     // 是否同時建立 User（預設 true）
  defaultRole,    // 預設角色名稱（預設 'employee'）
  orgUnitId,      // 組織單位 ID
}) → { employee, user, initialPassword }
```

**密碼策略**：
- `crypto.randomBytes(12).toString('base64url')` 產生 16 字元隨機密碼
- `must_change_password = 1` 強制首次改密碼
- 現階段：密碼回傳給呼叫方（HR 畫面顯示 / 批次報告匯出）
- 預留 `notifyMethod` 參數，未來接入 SMTP 時切換為 email 驗證連結

**額外匯出函數**：

```javascript
// 密碼重設
async function resetUserPassword(tenantDB, userId)
  → { userId, newPassword }

// 使用者-員工連結（處理孤立帳號）
async function linkUserToEmployee(tenantDB, userId, employeeId, employeeData?)
  → { userId, employeeId, linked: true } 或 { userId, employeeId, created: true }
```

**密碼重設 API**：`POST /api/tenant-admin/users/:id/reset-password`（現有路由擴充，非新建）

**三個入口的呼叫方式**：

| 入口 | 呼叫方 | 密碼處理 |
|------|--------|----------|
| 面試錄取 | `hr-onboarding.js` 的 `convert-candidate` | 顯示在轉正結果 Modal |
| HR 手動新增 | `employee.js` 的 `POST /api/employee` | 顯示在新增成功 Modal |
| 批次匯入 | `batch-import.js` 的 `execute` | 包含在匯入結果報告（可下載） |

### 批次匯入兩階段設計

**階段一：驗證（同步 API）**

`POST /api/employee/batch-import/validate`

接收 CSV 原始內容（或 multipart file），逐筆驗證：

| 驗證項目 | 檢查內容 |
|---------|---------|
| 必填欄位 | 姓名、Email、工號、子公司、部門、到職日期、職等、職級、職稱 |
| Email 格式 | RFC 5322 正則驗證 |
| Email 唯一性 | 對比 DB `employees.email` + `users.email` + CSV 內部去重 |
| 工號唯一性 | 對比 DB `employees.employee_no` + CSV 內部去重 |
| 子公司/部門 | 必須存在於 `org_units` 表（比對 name 或 code） |
| 職等/職級 | 必須存在於 `grade_levels` 表 |
| 日期格式 | ISO 8601 或 `YYYY/MM/DD` |
| 主管 | 若提供，允許空值（事後補填），若有值則驗證工號或 email 存在 |

回傳格式：
```json
{
  "totalRows": 200,
  "validRows": 195,
  "errorRows": 5,
  "rows": [
    { "row": 1, "status": "valid", "data": { "name": "...", ... } },
    { "row": 2, "status": "error", "errors": ["Email 格式不正確", "部門「行銷部」不存在"] }
  ]
}
```

**全部通過才可提交**：前端在 `errorRows > 0` 時禁用「確認匯入」按鈕。

**階段二：執行（背景任務）**

`POST /api/employee/batch-import/execute`

- 建立 `import_jobs` 記錄（`id`, `status`, `total`, `processed`, `created_at`）
- 回傳 `jobId`，前端定期輪詢進度
- 背景迴圈處理每筆資料：
  1. 呼叫 `createEmployeeWithAccount()` 建立 Employee + User
  2. 更新 `import_jobs.processed` 計數
  3. 紀錄結果到 `import_results`（含 `initial_password`）
- 完成後：`import_jobs.status = 'completed'`，寫入 `audit_logs`

**效能考量**：500 筆 × bcrypt hash（~100ms/筆）≈ 50 秒。使用 `setImmediate()` 避免阻塞 event loop。

### 頁面角色重新分配

**HR 管理中心** (`organization/employee-management`)：
- 模組色：`$color-l4-mauve`（組織管理紫）
- 使用 SCSS Mixin：`@include card`、`@include data-table($module-color)`、`@include filter-bar`、`@include button-module($module-color)`、`@include status-badge-color`
- 主要區塊：HR 儀表板（從 profile-page 搬入 KPI 卡片 + 側邊欄）、員工清單（保留雙視圖）、新增/匯入按鈕
- 詳情 Modal：`<app-employee-detail [employeeId]="..." [readonly]="false" [moduleColor]="'$color-l4-mauve'" />`
- 權限：需 `L1.profile` edit

**員工自助** (`employee/profile`)：
- 模組色：`$color-l1-sage`（L1 鼠尾草綠）
- 精簡頁面：員工清單 + 篩選（按 `view_scope` 限制範圍），無儀表板、無側邊欄
- 詳情 Modal：`<app-employee-detail [employeeId]="..." [readonly]="true" [moduleColor]="'$color-l1-sage'" />`
- 權限：需 `L1.profile` view

**帳號總覽** (`settings/users`)：
- 模組色：`$color-brand-main`（品牌主色）
- 精簡表格：帳號、Email、角色摘要、狀態、最後登入
- 快速操作：啟用/停用、密碼重設
- 「管理」按鈕導向 `/organization/employee-management?userId=xxx`
- 移除：新增使用者表單、角色指派 Modal、權限預覽
- 權限：需 `SYS.user-management` view

### 資料庫 Schema 變更

**新增 `import_jobs` 表**：
```sql
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY,
  status TEXT DEFAULT 'pending',        -- pending/processing/completed/failed
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  file_name TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);
```

**新增 `import_results` 表**：
```sql
CREATE TABLE IF NOT EXISTS import_results (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES import_jobs(id),
  row_number INTEGER,
  status TEXT,                          -- success/error
  employee_id TEXT,
  user_id TEXT,
  initial_password TEXT,               -- 僅供結果報告下載，完成後可清除
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**`employees` 表新增欄位**（migration）：
```sql
ALTER TABLE employees ADD COLUMN english_name TEXT;
ALTER TABLE employees ADD COLUMN mobile TEXT;
ALTER TABLE employees ADD COLUMN gender TEXT DEFAULT 'other';
ALTER TABLE employees ADD COLUMN birth_date TEXT;
ALTER TABLE employees ADD COLUMN address TEXT;
ALTER TABLE employees ADD COLUMN emergency_contact_name TEXT;
ALTER TABLE employees ADD COLUMN emergency_contact_relation TEXT;
ALTER TABLE employees ADD COLUMN emergency_contact_phone TEXT;
ALTER TABLE employees ADD COLUMN import_job_id TEXT;
```

注意：需同步更新 `tenant-schema.js:initTenantSchema()`（新租戶）和 `tenant-db-manager.js:_runMigrations()`（現有租戶）兩處遷移清單。

### 現有檔案修改清單

| 檔案 | 修改內容 |
|------|---------|
| `features/organization/pages/employee-management-page/*` | 升級為 HR 管理中心，整合儀表板、新增/匯入功能 |
| `features/employee/pages/profile-page/*` | 精簡為自助頁面，改用共用元件 |
| `features/tenant-admin/pages/user-management-page/*` | 精簡為帳號總覽 |
| `features/organization/models/organization.model.ts` | 加 `@deprecated`，遷移至統一模型 |
| `features/employee/services/employee.service.ts` | 擴充 API 方法 |
| `features/organization/services/organization.service.ts` | 員工相關方法遷移至 EmployeeService |
| `features/tenant-admin/services/tenant-admin.service.ts` | 移除使用者建立方法 |
| `server/src/routes/employee.js` | 新增 CRUD + 批次匯入端點 |
| `server/src/routes/hr-onboarding.js` | 改用統一帳號建立服務 |
| `server/src/routes/tenant-admin.js` | 帳號建立邏輯遷移至共用服務 |
| `server/src/db/tenant-schema.js` | 新增 `import_jobs`、`import_results` 表 + employees 欄位 |
| `server/src/db/tenant-db-manager.js` | 同步遷移清單 |

### 複用的現有服務與元件

| 元件/服務 | 用途 |
|----------|------|
| `HeaderComponent` | 各頁面頁首 |
| `PaginationComponent` | 員工清單分頁 |
| `StatusBadgeComponent` | 員工/帳號狀態顯示 |
| `HasPermissionDirective` | Tab 層級權限控制 |
| `FeatureGateService` | 功能權限檢查（`canEdit`, `getFeaturePerm`） |
| `NotificationService` | 操作成功/失敗通知 |
| `TenantAdminService` | 角色/權限查詢（帳號與權限 Tab 使用） |
| `mergeFeaturePerms()` | 合併多角色權限（帳號與權限 Tab 使用） |

## Risks / Trade-offs

**[風險] 遷移期間兩套模型並存** → 緩解：舊模型加 `@deprecated` 標註，新頁面只用統一模型。舊模型在所有頁面遷移完成後移除。

**[風險] 批次匯入 bcrypt 效能瓶頸** → 緩解：使用 `setImmediate()` 避免阻塞 event loop，前端定期輪詢進度條。sql.js 為記憶體 DB，I/O 不是瓶頸。

**[風險] import_results 儲存明文密碼** → 緩解：結果報告下載後可提供「清除密碼」API，或設定 TTL 自動清除。初期可接受，未來接 SMTP 後此欄位不再使用。

**[風險] 搬移 HR 儀表板可能遺漏功能** → 緩解：profile-page 的 KPI 卡片、側邊欄（到期文件、ROI、週年）逐一搬移並對照原始程式碼驗證。

**[取捨] 共用元件增加耦合** → 接受：`EmployeeDetailComponent` 被兩個頁面使用，但透過 `readonly` + `moduleColor` input 保持彈性。若未來差異擴大可再拆分。

**[取捨] settings/users 功能大幅縮減** → 接受：精簡版仍保留帳號總覽與快速操作，詳細管理導向 HR 管理中心，使用者體驗不降級。
