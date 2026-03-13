## Why

目前候選人被錄取並接受 Offer 後，轉為員工的流程存在三個關鍵問題：

1. **Critical Bug**：`employees` 資料表缺少 6 個欄位（`job_title`、`candidate_id`、`probation_end_date`、`probation_months`、`onboarding_status`、`converted_at`），導致 `convert-candidate` API 完全無法運作——INSERT 語句引用了不存在的欄位
2. **流程斷裂**：候選人轉為員工後，HR 必須手動到「使用者管理」頁面建立帳號並指派角色，這增加了操作步驟且容易遺漏
3. **資料未關聯**：`employees.department` 是純文字欄位，未與 `org_units` 表建立 FK 關聯，導致 RBAC 角色指派無法自動綁定部門範圍

此變更的商業價值在於：**讓 HR 在單一步驟內完成候選人→員工→系統帳號的全流程**，新員工在報到當天即可使用系統登入，無需額外的手動設定。

## What Changes

- **修復 DB Schema**：新增 `employees` 表缺失的 6 個欄位 + `org_unit_id` FK，新增 `users` 表 `must_change_password` 欄位
- **自動建帳**：`convert-candidate` API 在建立員工後自動建立使用者帳號（初始密碼 = 候選人 email），同時指派 `employee` 角色 + 部門 scope
- **首次改密碼**：新增 `POST /api/auth/change-password` 端點，登入時偵測 `must_change_password` 旗標並導向改密碼頁
- **前端改密碼頁面**：新建 `/change-password` 路由頁面，與登入頁同視覺風格
- **轉換 Modal 升級**：新增組織單位選擇（自動匹配部門名稱）、成功畫面顯示帳號資訊
- **既有帳號保護**：若候選人 email 已有帳號，關聯而非重建

### Non-goals（不在範圍內）

- 不改動招聘流程 UX（面試、錄取、Offer 流程維持不變）
- 不修改既有使用者管理頁面功能
- 不實作 email 寄送通知（僅在 Modal 顯示帳號資訊供 HR 告知）
- 不支援批量轉換（維持逐一轉換）

## Capabilities

### New Capabilities

- `employee-onboarding-automation`: 候選人轉員工時自動建立使用者帳號、指派角色、綁定組織單位的完整自動化流程
- `forced-password-change`: 首次登入強制改密碼機制，包含後端端點與前端改密碼頁面

### Modified Capabilities

- `authentication`: 新增 `must_change_password` 登入回應欄位 + `POST /change-password` 端點
- `rbac`: 員工轉換時自動指派 `employee` 角色 + 部門 scope（org_unit_id）

## Impact

**影響模組**：L1 員工管理（/employee）— 入職轉換流程

**後端（server/src/）**：
- `db/tenant-schema.js` — 8 條 ALTER TABLE 遷移（employees 7 欄 + users 1 欄）
- `routes/hr-onboarding.js` — convert-candidate 修正 + 自動建帳邏輯 + `GET /org-units` 端點
- `routes/auth.js` — login 查詢/回應擴充 + `POST /change-password` 端點

**前端（src/app/）**：
- `features/auth/models/auth.model.ts` — User/TokenResponse 型別擴充 + 2 新 interface
- `features/auth/services/auth.service.ts` — login 合併 must_change_password + changePassword()
- `features/auth/pages/change-password-page/*` — **新建** 3 個檔案（改密碼頁面）
- `features/auth/pages/login-page/login-page.component.ts` — must_change_password 攔截導向
- `app.routes.ts` — 新增 /change-password 路由
- `features/employee/services/onboarding.service.ts` — Request/Response 型別 + getOrgUnits()
- `features/employee/components/onboarding-convert-modal/*` — org_unit 選擇 + 帳號結果顯示

**API 變更**：
- `POST /api/hr/onboarding/convert-candidate` — request 新增 `org_unit_id`，response 新增 `user_account`
- `GET /api/hr/onboarding/org-units` — 新端點
- `POST /api/auth/login` — response 新增 `must_change_password`
- `POST /api/auth/change-password` — 新端點

**資料模型概述**：
- `employees` 新增欄位：`job_title TEXT`、`candidate_id TEXT`、`probation_end_date TEXT`、`probation_months INTEGER`、`onboarding_status TEXT`、`converted_at TEXT`、`org_unit_id TEXT REFERENCES org_units(id)`
- `users` 新增欄位：`must_change_password INTEGER DEFAULT 0`
