## 1. 後端：DBAdapter 抽象層與平台資料庫

- [x] 1.1 建立 `server/src/db/db-adapter.js` — DBAdapter 類別（query/run/transaction 介面）與 SqliteAdapter 實作，封裝 sql.js 操作。**驗證**：單元測試確認 query 回傳陣列、run 回傳 changes、transaction 回滾正常
- [x] 1.2 建立 `server/src/db/platform-db.js` — 初始化 platform.db，建立 tenants、subscription_plans、platform_admins、audit_logs 四張表。**驗證**：啟動伺服器後 `server/data/platform.db` 存在且表結構正確
- [x] 1.3 建立 `server/src/db/tenant-db-manager.js` — TenantDBManager 單例，負責 getDB(tenantId)、createTenantDB、deleteTenantDB、LRU Cache（30 分鐘閒置卸載）。**驗證**：連續呼叫 getDB 回傳同一實例，30 分鐘後卸載
- [x] 1.4a 建立 `server/src/db/tenant-schema.js`（RBAC 表部分） — 租戶資料庫初始化 SQL 的 RBAC 表：users（含 employee_id 外鍵）、org_units、roles、permissions、role_permissions、user_roles、refresh_tokens。**驗證**：新建租戶 DB 包含所有 RBAC 表且外鍵約束正確
- [x] 1.4b 建立 `server/src/db/tenant-schema.js`（業務表部分） — 從現有 `server/src/db/index.js` 提取所有 55+ 張 L1~L6 業務表的 CREATE TABLE SQL，整合至 tenant-schema。**驗證**：新建租戶 DB 包含所有業務表，表結構與現有 onboarding.db 一致

> 依賴：1.1 → 1.2, 1.3, 1.4a, 1.4b

## 2. 後端：認證系統（JWT + bcryptjs）

- [x] 2.1a 安裝依賴 `jsonwebtoken`、`bcryptjs`、`helmet`、`express-rate-limit`。**驗證**：package.json 更新且 npm install 成功
- [x] 2.1b 建立 `server/.env` 環境變數檔案 — 設定 JWT_SECRET、JWT_ACCESS_EXPIRES（15m）、JWT_REFRESH_EXPIRES（7d）、PLATFORM_ADMIN_EMAIL、PLATFORM_ADMIN_PASSWORD。建立 `server/.env.example` 作為範本，並將 `.env` 加入 `.gitignore`。**驗證**：`.env` 檔案存在且 `.gitignore` 包含 `.env`
- [x] 2.2 建立 `server/src/middleware/auth.js` — Auth Middleware，驗證 JWT Access Token，解析 user_id/tenant_id/roles/scope 注入 req.user。**驗證**：無 Token 回傳 401、有效 Token 注入 req.user
- [x] 2.3 建立 `server/src/middleware/tenant.js` — Tenant Context Middleware，從 req.user.tid 載入租戶 DB 至 req.tenantDB，檢查租戶狀態（suspended/deleted 回傳 403）。**驗證**：有效 tenant 注入 req.tenantDB、暫停租戶回傳 403
- [x] 2.4 建立 `server/src/middleware/permission.js` — Permission Middleware 工廠函數 `requirePermission('resource:action')`，檢查使用者角色是否具備權限且範圍正確。**須包含多角色權限聯集邏輯**：同一使用者擁有多個角色時，取所有角色權限的聯集（union）判定存取權。**驗證**：有權限通過、無權限回傳 403、多角色聯集正確
- [x] 2.5 建立 `server/src/routes/auth.js` — 認證路由：POST /api/auth/login（email+password+tenant_slug）、POST /api/auth/refresh、POST /api/auth/logout、POST /api/auth/platform-login。**驗證**：demo 帳號可登入取得 Token、錯誤密碼回傳 401、Token 可刷新
- [x] 2.6 建立 `server/src/utils/audit-logger.js` — 審計日誌寫入工具，提供 `logAudit(platformDB, { tenant_id, user_id, action, resource, details, ip })` 函數，寫入 platform.db 的 audit_logs 表。在認證路由中整合：login_success、login_failed 事件自動記錄。**驗證**：登入成功/失敗後 audit_logs 表有對應記錄
- [x] 2.7 在 `server/src/index.js` 註冊 helmet、rate-limit、auth 路由。**驗證**：伺服器啟動無錯誤、Security Headers 正確

> 依賴：2.1a + 2.1b → 2.2~2.7；2.2 → 2.3 → 2.4；2.5 依賴 Group 1（需 TenantDBManager 查詢租戶 DB）

## 3. 後端：租戶管理 API

- [x] 3.1 建立 `server/src/routes/platform.js` — 平台管理 API：GET/POST /api/platform/tenants（列表+新增）、PUT /api/platform/tenants/:id（更新狀態/方案，包含恢復 deleted→active）、DELETE /api/platform/tenants/:id（軟刪除）、DELETE /api/platform/tenants/:id/purge（硬刪除+二次確認）。整合 audit-logger 記錄 tenant_create、tenant_suspend、tenant_soft_delete、tenant_restore、tenant_purge 事件。**驗證**：CRUD 操作正確、slug 重複回傳 409、硬刪除非 deleted 租戶回傳 400、恢復 deleted 租戶成功
- [x] 3.2 建立 `server/src/routes/platform.js` 方案管理部分 — GET/POST/PUT /api/platform/plans。**驗證**：CRUD 操作正確
- [x] 3.3 建立 `server/src/routes/tenant-admin.js` — 租戶管理 API：組織架構 CRUD（/api/tenant-admin/org-units）、角色 CRUD（/api/tenant-admin/roles，整合 audit-logger 記錄 role_create/role_update/role_delete）、權限查詢（/api/tenant-admin/permissions）、使用者管理（/api/tenant-admin/users）、角色指派（/api/tenant-admin/user-roles，整合 audit-logger 記錄 user_role_assign/user_role_revoke）。**驗證**：各 CRUD 操作正確、系統角色不可刪除、審計日誌正確記錄
- [x] 3.4 建立 `server/src/routes/audit.js` — 審計日誌查詢 API：GET /api/audit/logs（支援分頁、篩選 tenant/action/時間範圍），平台管理員查全部、租戶管理員僅自家。**須明確回傳 405 Method Not Allowed**：對 PUT/PATCH/DELETE /api/audit/logs 請求回傳 405。**驗證**：篩選條件正確、PUT/DELETE 回傳 405（非 404）

> 依賴：Phase 1 (1.x) + Phase 2 (2.x) 完成後才能開始

## 4. 後端：既有路由加入認證與租戶感知

- [x] 4.1 修改 `server/src/index.js` — 所有 `/api/*` 路由（除 /api/auth）加上 authMiddleware + tenantMiddleware。**驗證**：無 Token 的請求回傳 401
- [x] 4.2a 修改既有路由檔案（第一批：核心業務） — 將以下 10 個路由檔案中直接引用 `db` 改為 `req.tenantDB`：employee.js、recruitment.js、grade-matrix.js、job-descriptions.js、competency-management.js、competency.js、meetings.js、talent-pool.js、hr-onboarding.js、jobs.js。**驗證**：登入後正常取得租戶資料
- [x] 4.2b 修改既有路由檔案（第二批：輔助功能） — 將以下 9 個路由檔案中直接引用 `db` 改為 `req.tenantDB`：templates.js、submissions.js、approvals.js、monthly-check-templates.js、weekly-reports.js、quarterly-reviews.js、export.js、upload.js、integration/104.js。**驗證**：所有 API 端點在認證後正常運作、不同租戶看到不同資料
- [x] 4.3 建立組織管理 API — 新增 `/api/organization/companies`（對應 org_units type=group/subsidiary）、`/api/organization/departments`（對應 org_units type=department + departments 表）、`/api/organization/stats`。**驗證**：回傳結構與 OrganizationService 模型匹配

> 依賴：Phase 1 (1.x) + Phase 2 (2.x) 完成後才能開始；4.1 → 4.2a, 4.2b, 4.3

## 5. 後端：Demo 租戶資料遷移

- [x] 5.1a 建立 `server/src/db/migrate-demo.js`（遷移框架 + 業務表遷移） — 遷移腳本框架：讀取 onboarding.db 的所有 55+ 張業務表資料（departments、employees、grade_levels、grade_salary_levels、department_positions、promotion_criteria、career_paths、grade_tracks 等），逐表遷移至 tenant_demo.db，記錄各表遷移筆數。整合 audit-logger 記錄 action=data_migration 事件。**驗證**：tenant_demo.db 各業務表記錄數與 onboarding.db 一致、audit_logs 有遷移記錄
- [x] 5.1b 在遷移腳本中遷移進階業務表 — 遷移 job_descriptions、competencies、templates、meetings、talent_pool、submissions、approvals、monthly_check_templates、weekly_reports、quarterly_reviews 等剩餘表。**驗證**：所有 55+ 張表遷移完成且記錄數一致
- [x] 5.2 在遷移腳本中建立 RBAC 種子資料 — 根據 employees 表的 12 名員工建立 users 帳號（employees.role='manager' → hr_manager、employees.role='employee' → employee，users.employee_id 關聯對應 employees.id），建立 org_units（集團根 + 預設子公司 + 7 部門），建立 5 個預設角色和全部權限定義。**驗證**：demo 帳號 admin/admin123 可登入取得 super_admin Token、既有員工 email 可登入
- [x] 5.3 建立預設訂閱方案種子資料 — 在 platform.db 建立 Free/Basic/Enterprise 三個方案，並建立預設平台管理員帳號。**驗證**：platform API 回傳 3 個方案、平台管理員可登入

> 依賴：Phase 1 (1.x) + Phase 2 (2.1a) 的 bcryptjs 安裝完成後才能開始

## 6. 前端：認證系統重構

- [x] 6.1 更新 `features/auth/models/auth.model.ts` — 擴充 User 介面（加入 tenant_id、roles、scope、permissions），新增 LoginRequest/TokenResponse 型別。**驗證**：TypeScript 編譯無錯誤
- [x] 6.2 重構 `features/auth/services/auth.service.ts` — Mock 登入改為呼叫 `/api/auth/login`，管理 Access Token 和 Refresh Token（存 localStorage），提供 Signal-based currentUser/isLoggedIn/permissions 狀態。**驗證**：以 demo 帳號登入成功取得 Token、登出清除 Token
- [x] 6.3 建立 `core/interceptors/auth.interceptor.ts` — AuthInterceptor：自動附加 Authorization Header、401 時自動刷新 Token 並重送請求、Refresh Token 也過期則導向登入頁。**驗證**：API 請求自動帶 Token、Token 過期自動刷新
- [x] 6.4 在 `app.config.ts` 註冊 AuthInterceptor（provideHttpClient(withInterceptors([authInterceptor]))）。**驗證**：Interceptor 生效
- [x] 6.5 更新 `features/auth/pages/login-page/` — 加入 tenant_slug 欄位（或選擇器），支援 email 域名自動建議租戶。**驗證**：可選擇租戶後登入

> 依賴：後端 Phase 2 完成後才能開始；6.1 → 6.2 → 6.3 → 6.4

## 7. 前端：權限系統

- [x] 7.1 建立 `core/services/permission.service.ts` — PermissionService（Signal-based），提供 hasPermission(resource, action)/hasRole(role)/getEffectivePermissions() 方法，登入後從 Token 解析並快取權限。**須包含多角色聯集邏輯**：合併所有角色的權限取聯集。**驗證**：登入後 hasPermission 回傳正確結果、多角色聯集正確
- [x] 7.2 建立 `core/guards/auth.guard.ts` — AuthGuard（canActivate），未登入導向 /login。**驗證**：未登入存取受保護路由被攔截
- [x] 7.3 建立 `core/guards/permission.guard.ts` — PermissionGuard，接受 route data 中的 requiredPermission 參數。另建立 `core/guards/platform-admin.guard.ts` — PlatformAdminGuard，檢查 Token 中 isPlatformAdmin 旗標，非平台管理員導向首頁。**驗證**：無權限使用者被攔截並顯示提示、非平台管理員無法存取 /platform
- [x] 7.4 建立 `shared/directives/has-permission.directive.ts` — HasPermissionDirective（Structural Directive），用於元件層控制顯示/隱藏。**驗證**：無權限時 DOM 元素不渲染
- [x] 7.5 更新 `app.routes.ts` — 所有功能路由加入 AuthGuard，/platform 路由加入 PlatformAdminGuard，/settings 路由加入 PermissionGuard（需 super_admin 或 subsidiary_admin），其餘管理路由加入對應 PermissionGuard。**驗證**：路由保護生效

> 依賴：6.2 完成後才能開始；7.1 → 7.2, 7.3, 7.4 → 7.5

## 8. 前端：組織管理模組遷移（Mock → 真實 API）

- [x] 8.1 重構 `features/organization/services/organization.service.ts` — 將所有 mock 方法（getCompanies、getDepartments、getEmployees 等）改為呼叫後端 API（/api/organization/*、/api/employee），移除 mockCompanies/mockDepartments/mockEmployees/mockCollaborations 等靜態資料。**驗證**：組織圖頁面載入顯示 onboarding.db 遷入的真實資料（7 部門、12 員工）
- [x] 8.2 更新組織管理三個頁面元件 — 確認 group-structure、department-structure、employee-management 正常使用重構後的 OrganizationService，畫布/列表視圖正常運作。**驗證**：頁面無報錯、資料正確顯示、CRUD 操作持久化至 DB
- [x] 8.3 加入權限控制 — 組織管理的編輯功能（新增/修改/刪除按鈕）使用 HasPermissionDirective 或 PermissionService 控制顯示，無 organization:manage 權限時隱藏編輯功能。**驗證**：employee 角色看不到編輯按鈕

> 依賴：後端 4.3 + 前端 7.1 完成後才能開始

## 9. 前端：平台管理後台

- [x] 9.1 建立 `features/platform-admin/` 模組結構 — 路由配置（/platform，受 PlatformAdminGuard 保護）、PlatformAdminService（呼叫 /api/platform/* API）。**驗證**：路由可存取、Lazy Load 正常
- [x] 9.2a 建立租戶管理頁面（列表與篩選） — 租戶列表（data-table）+ 搜尋篩選（filter-bar）+ 狀態篩選。**驗證**：列表顯示正確、搜尋與篩選正常運作
- [x] 9.2b 建立租戶管理頁面（表單與操作） — 新增/編輯租戶表單 + 狀態操作（暫停/恢復/軟刪除/恢復/硬刪除），硬刪除需二次確認對話框。**驗證**：CRUD 操作正確、狀態切換正確、硬刪除需二次確認
- [x] 9.3 建立方案管理頁面 — 方案列表 + 新增/編輯表單。**驗證**：CRUD 操作正確
- [x] 9.4 建立平台審計日誌頁面 — 日誌表格 + 篩選（租戶/動作/時間）。**驗證**：顯示全租戶日誌、篩選正常

> 依賴：後端 3.x + 前端 7.x 完成後才能開始

## 10. 前端：租戶管理設定

- [x] 10.1 建立 `features/tenant-admin/` 模組結構 — 路由配置（/settings，受 PermissionGuard 保護）、TenantAdminService（呼叫 /api/tenant-admin/* API）。**驗證**：路由可存取、Lazy Load 正常
- [x] 10.2a 建立組織架構管理頁面（樹狀圖渲染） — 以可互動的樹狀圖呈現集團→子公司→部門結構（讀取 /api/tenant-admin/org-units），支援展開/收縮。**驗證**：樹狀圖正確渲染現有組織架構
- [x] 10.2b 建立組織架構管理頁面（CRUD 操作） — 新增/編輯/刪除節點功能，部門建立時自動綁定上級子公司。**驗證**：CRUD 操作正確、樹狀圖即時更新
- [x] 10.3a 建立角色管理頁面（角色列表與 CRUD） — 角色列表 + 新增/編輯角色表單（名稱、scope_type 選擇），系統角色標註且不可刪除。**驗證**：角色 CRUD 正確、系統角色不可刪除
- [x] 10.3b 建立角色管理頁面（權限矩陣） — resource × action 的矩陣勾選介面，從 /api/tenant-admin/permissions 載入全部權限定義，編輯角色時可勾選/取消勾選。**驗證**：權限矩陣勾選生效並持久化
- [x] 10.4 建立使用者管理頁面 — 使用者列表 + 新增使用者/從員工建立帳號 + 角色指派（含作用範圍選擇）。**驗證**：使用者 CRUD 正確、角色指派含 scope 正確
- [x] 10.5a 建立權限可視化頁面（樹狀圖渲染） — 樹狀圖呈現組織架構 + 各角色權限範圍標註。**驗證**：樹狀圖正確渲染
- [x] 10.5b 建立權限可視化頁面（使用者權限查詢） — 選擇使用者後查看有效權限（聯集合併），高亮其角色的作用範圍。**驗證**：選擇使用者後正確高亮權限範圍
- [x] 10.6 建立租戶審計日誌頁面 — 日誌表格 + 篩選（動作/時間），僅顯示自家日誌。**驗證**：僅顯示當前租戶的日誌

> 依賴：後端 3.3 + 前端 7.x 完成後才能開始

## 11. 整合測試與驗收

- [x] 11.1 端到端流程測試 — 平台管理員登入 → 建立新租戶 → 新租戶管理員登入 → 設定組織架構 → 建立角色 → 指派使用者 → 使用者登入存取功能 → 驗證權限隔離。**驗證**：41/41 passed (`test-e2e-flow.js`)
- [x] 11.2 租戶隔離測試 — 以租戶 A 的 Token 嘗試存取租戶 B 的資料，確認回傳 403。**驗證**：22/22 passed (`test-tenant-isolation.js`)
- [x] 11.3 Demo 租戶驗收 — 確認 demo 租戶包含完整的 onboarding.db 資料（7 部門、12 員工、職等職級體系），既有 L1~L6 功能正常運作。**驗證**：32/32 passed (`test-demo-tenant.js`)
- [x] 11.4 權限繼承測試 — global 角色可存取所有部門、subsidiary 角色僅限所屬子公司、department 角色僅限所屬部門。**驗證**：24/24 passed (`test-permission-inheritance.js`)
- [x] 11.5 審計日誌完整性測試 — 驗證所有敏感操作（登入、租戶管理、角色變更、使用者指派）都有對應的 audit_logs 記錄。**驗證**：34/34 passed (`test-audit-logs.js`)

> 依賴：所有前置 Group (1~10) 完成後才能開始
