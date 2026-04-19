# Bombus 專案架構參考

> 此文件為 CLAUDE.md 的補充參考資料。Claude 需要時可按需讀取。

## 專案架構

### 前端模組結構（src/app/）
```
core/services/      → 全域單例服務（AuthService, SidebarService, NotificationService 等）
shared/components/  → 通用 UI 元件（Header, Sidebar, Pagination, StatusBadge, SignaturePad 等）
features/           → 功能模組（延遲載入）
```

### 功能模組與路由對應

| 路由前綴 | 模組 | 說明 |
| ---------- | ------ | ------ |
| `/employee` | L1 員工管理 | 招募、AI 智能面試、**面試決策**、員工檔案、入職、會議、人才庫 |
| `/competency` | L2 職能管理 | 職等職級、職務說明書、職能框架、評估 |
| `/training` | L3 教育訓練 | 課程、學習地圖、九宮格、人才儀表板 |
| `/project` | L4 專案管理 | 專案列表、損益、報表 |
| `/performance` | L5 績效管理 | 毛利、獎金、目標、評核 |
| `/culture` | L6 文化管理 | 手冊、EAP、獎項、文件 |
| `/public` | 公開路由 | 候選人回覆面試（無需登入） |

### 後端 API 結構（server/src/routes/）

所有 API 以 `/api` 為前綴。業務路由需 `authMiddleware + tenantMiddleware`。

| 類別 | 路由 | 保護方式 |
| ------ | ------ | ---------- |
| 認證 | `/api/auth` | authLimiter（可透過 `AUTH_RATE_LIMIT` 環境變數設定） |
| 平台管理 | `/api/platform` | authMiddleware + platformAdminMiddleware |
| 租戶管理 | `/api/tenant-admin` | authMiddleware + tenantMiddleware + requireRole |
| 審計日誌 | `/api/audit` | authMiddleware |
| 組織管理 | `/api/organization` | authMiddleware + tenantMiddleware |
| 業務 API | `/api/employee`, `/api/grade-matrix`, `/api/competency-mgmt`, `/api/recruitment`, `/api/talent-pool`, `/api/jobs`, `/api/meetings`, `/api/onboarding`, `/api/monthly-checks`, `/api/quarterly-reviews`, `/api/export`, `/api/upload` 等 | authMiddleware + tenantMiddleware |

### SCSS 樣式系統（src/assets/styles/）

- `_variables.scss` — 色彩、間距、圓角、陰影、斷點
- `_mixins.scss` — 常用 mixin（詳見 `bombus-system/CLAUDE.md` 及 `DESIGN_SYSTEM.md`）
- 每個功能模組 SCSS 頂部定義 `$module-color: $color-lX-xxx;`

## L1 招募/面試/決策 流程（拆分架構）

L1 員工管理模組內的招募流程跨 3 個頁面、2 個 feature 權限：

| 頁面 | 路由 | Feature | 主要職責 |
| ------ | ------ | ------ | ------ |
| 招募職缺管理 | `/employee/jobs` | `L1.jobs` | 建立/編輯職缺（含**職等 grade** 選單）、同步 104 |
| AI 智能面試 | `/employee/recruitment` | `L1.recruitment` | 面試官評分（17 題倒扣制）、AI 量化分析、面試錄音錄影 |
| 面試決策 | `/employee/decision` | `L1.decision` | 職缺詳情 + 評分/AI（只讀）+ 錄用決策 + 薪資核定 + 主管簽核 |

### 候選人狀態機（含簽核）

```
interview → pending_ai → pending_decision ──┐
                                            │  HR 送簽
                                            ▼
                                      pending_approval
                                            │
          ┌─── subsidiary_admin 退回（可無限輪迴） ──┘
          ▼
    pending_decision                        │  subsidiary_admin 通過
                                            ▼
                                        offered / not_hired
                                            │
                                            ▼  候選人接受
                                        offer_accepted
                                            │
                                            ▼  HR 轉入職（須 APPROVED）
                                        onboarded
```

**狀態轉換端點：**
- `POST /api/recruitment/candidates/:id/submit-approval` — HR 送簽
- `POST /api/recruitment/candidates/:id/approve` — 主管簽核通過（role: subsidiary_admin/super_admin）
- `POST /api/recruitment/candidates/:id/reject-approval` — 主管退回（要求 approval_note）
- `GET /api/recruitment/candidates/:id/salary-range` — 依 `job.grade` 查詢薪資範圍

### 資料表對應

| 資料項 | 表 | 欄位 |
| ------ | ------ | ------ |
| 薪資核定（候選人層級） | `candidates` | `approved_salary_type` / `approved_salary_amount` / `approved_salary_out_of_range` |
| 簽核歷程（決策事件層級） | `invitation_decisions` | `approval_status` / `approver_id` / `approved_at` / `approval_note` / `submitted_for_approval_at` |
| 職等（職缺層級） | `jobs` | `grade INTEGER REFERENCES grade_levels(grade)` |
| 薪資範圍計算 | `grade_salary_levels` | `SELECT MIN/MAX(salary) WHERE grade = ? AND (org_unit_id = ? OR org_unit_id IS NULL)` |

### 預設角色權限（L1.decision）

| 角色 | action_level | 可送簽？ | 可簽核？ |
| ------ | ------ | ------ | ------ |
| super_admin | edit/company | ✅ | ✅ |
| subsidiary_admin | edit/company | ✅ | ✅ |
| hr_manager | edit/company | ✅ | ❌（feature 過但 role 擋） |
| dept_manager | none | ❌ | ❌ |
| employee | none | ❌ | ❌ |

### 相關服務/元件

- **後端**：[server/src/services/decision.service.js](bombus-system/server/src/services/decision.service.js) — 集中狀態機與薪資驗證
- **前端**：[src/app/features/employee/services/decision.service.ts](bombus-system/src/app/features/employee/services/decision.service.ts) — API 封裝
- **元件**：[src/app/features/employee/pages/decision-page/](bombus-system/src/app/features/employee/pages/decision-page/) — 決策頁 standalone component
- **整合測試**：[server/src/tests/test-decision-approval.js](bombus-system/server/src/tests/test-decision-approval.js) — 34/34 passed
- **變更提案**：[openspec/changes/split-interview-decision-pages/](bombus-system/openspec/changes/split-interview-decision-pages/)

## Multi-Tenant SaaS 架構（已完成）

此專案已完成 multi-tenant SaaS 架構升級（Database-per-Tenant 隔離策略）。**全部 57/57 任務已完成**。

### 文件參考

- **任務進度**：`bombus-system/openspec/changes/multi-tenant-saas/tasks.md`（57/57 ✓）
- **迭代日誌**：`.claude/ralph-loop-saas.log`（Loop A/B/C 完整記錄）
- **設計文件**：`bombus-system/openspec/changes/multi-tenant-saas/design.md`

### 架構概覽

| 層級 | 元件 | 檔案 |
| ------ | ------ | ------ |
| DB 抽象層 | DBAdapter + SqliteAdapter | `server/src/db/db-adapter.js` |
| 平台資料庫 | platform.db（tenants/plans/admins/audit_logs） | `server/src/db/platform-db.js` |
| 租戶管理器 | TenantDBManager（LRU Cache 30min） | `server/src/db/tenant-db-manager.js` |
| 租戶 Schema | 69 業務表 + 7 RBAC 表 | `server/src/db/tenant-schema.js` |
| Demo 遷移 | onboarding.db → tenant_demo.db | `server/src/db/migrate-demo.js` |
| 認證中間件 | JWT Access Token 15min + Refresh 7d | `server/src/middleware/auth.js` |
| 租戶中間件 | 注入 req.tenantDB + 租戶狀態檢查 | `server/src/middleware/tenant.js` |
| 權限中間件 | requirePermission / requireRole | `server/src/middleware/permission.js` |

### 前端 Multi-Tenant 元件

| 功能 | 檔案位置 |
| ------ | ---------- |
| Auth 模型 | `features/auth/models/auth.model.ts` |
| Auth 服務 | `features/auth/services/auth.service.ts` |
| HTTP 攔截器 | `core/interceptors/auth.interceptor.ts` |
| 權限服務 | `core/services/permission.service.ts` |
| Guards | `core/guards/{auth,permission,platform-admin}.guard.ts` |
| 權限指令 | `shared/directives/has-permission.directive.ts` |
| 租戶管理頁面 | `features/tenant-admin/pages/` |
| 平台管理頁面 | `features/platform-admin/pages/` |

### 整合測試（153/153 passed）

```bash
cd bombus-system/server && node src/tests/test-e2e-flow.js              # 11.1 (41/41)
cd bombus-system/server && node src/tests/test-tenant-isolation.js       # 11.2 (22/22)
cd bombus-system/server && node src/tests/test-demo-tenant.js            # 11.3 (32/32)
cd bombus-system/server && node src/tests/test-permission-inheritance.js # 11.4 (24/24)
cd bombus-system/server && node src/tests/test-audit-logs.js             # 11.5 (34/34)
```

### 環境變數（server/.env）

- `JWT_SECRET`、`JWT_ACCESS_EXPIRES`（15m）、`JWT_REFRESH_EXPIRES`（7d）
- `PLATFORM_ADMIN_EMAIL`、`PLATFORM_ADMIN_PASSWORD`
- `AUTH_RATE_LIMIT`（認證端點頻率限制，預設 100 次/15 分鐘）

## Headless Mode 整合測試

可使用 Claude Code 無頭模式自動執行整合測試：

```bash
# 執行全部整合測試並自動修復失敗
claude -p "執行 test-e2e-flow.js，修復失敗的測試，重跑直到全部通過" --allowedTools "Edit,Read,Bash,Grep"

# 單一測試群組
claude -p "執行 test-tenant-isolation.js 並報告結果" --allowedTools "Read,Bash,Grep"

# 型別檢查 + 建置驗證
claude -p "在 bombus-system/ 執行 tsc --noEmit 和 ng build，修復所有錯誤" --allowedTools "Edit,Read,Bash,Grep,Glob"
```
