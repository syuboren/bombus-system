## 1. 後端 — Auth Middleware 擴展

- [x] 1.1 修改 auth middleware — Decision 7：Auth Middleware 擴展 — 注入 employeeId 與 departmentId，JWT 驗證後查詢 tenant DB 取得 user 對應的 employee_id 和 department_id 注入到 `req.user` — 檔案：`server/src/middleware/auth.js`；驗證：登入後 `req.user.employeeId` 和 `req.user.departmentId` 有值

## 2. 後端 — Scope 過濾共用函式

- [x] 2.1 新增 Shared scope filter utility for backend routes — Decision 6：後端 Scope 過濾共用函式 — buildScopeFilter，根據 `req.featurePerm.view_scope` 自動生成 SQL WHERE clause（self/department/company），包含 `getUserDepartmentIds()` 遞迴查詢子部門 — 檔案：`server/src/middleware/permission.js`；驗證：self 回傳 employee_id 條件、department 回傳 org_unit_id IN 條件、company 回傳 1=1
- [x] 2.2 新增 Edit scope validation for write operations `checkEditScope()` — 寫入操作驗證目標記錄是否在 edit_scope 範圍內，self 檢查 employee_id、department 檢查 org_unit_id、company 不限 — 檔案：`server/src/middleware/permission.js`；驗證：self scope 編輯他人記錄回傳 403

## 3. 後端 — L1 路由掛載 requireFeaturePerm middleware integration on routes 與資料過濾

- [x] [P] 3.1 L1 employee routes enforce data scope — requireFeaturePerm middleware integration on routes，Decision 8：L1/L2 路由掛載 requireFeaturePerm 的範圍，掛載 `requireFeaturePerm('L1.profile', 'view'/'edit')` + `buildScopeFilter` 到 `/api/employee/*` 端點 — 檔案：`server/src/routes/employee.js`；驗證：self scope 只回傳自己的員工記錄、department scope 只回傳部門員工
- [x] [P] 3.2 L1 recruitment routes enforce — 掛載 `requireFeaturePerm('L1.recruitment')` + scope 過濾到 `/api/recruitment/*` 端點 — 檔案：`server/src/routes/recruitment.js`；驗證：無權限回傳 403、view scope 過濾候選人
- [x] [P] 3.3 L1 jobs routes enforce — 掛載 `requireFeaturePerm('L1.jobs')` + scope 過濾到 `/api/jobs/*` 端點 — 檔案：`server/src/routes/jobs.js`；驗證：employee 角色無法存取職缺列表（action_level=none → 403）
- [x] [P] 3.4 L1 meetings routes enforce — 掛載 `requireFeaturePerm('L1.meeting')` + scope 過濾到 `/api/meetings/*` 端點 — 檔案：`server/src/routes/meetings.js`；驗證：self scope 只看到自己參與的會議
- [x] [P] 3.5 L1 talent-pool routes enforce — 掛載 `requireFeaturePerm('L1.talent-pool')` + scope 過濾到 `/api/talent-pool/*` 端點 — 檔案：`server/src/routes/talent-pool.js`；驗證：employee 角色（none）回傳 403
- [x] [P] 3.6 L1 onboarding routes enforce — 掛載 `requireFeaturePerm('L1.onboarding')` + scope 過濾到 `/api/onboarding/*` 端點 — 檔案：`server/src/routes/onboarding.js`；驗證：self scope 只看到自己的入職記錄

## 4. 後端 — L2 路由掛載 requireFeaturePerm 與資料過濾

- [x] [P] 4.1 L2 competency routes enforce data scope — 掛載 `requireFeaturePerm('L2.framework'/'L2.assessment'/'L2.gap-analysis')` 到 `/api/competency-mgmt/*` 端點，參考資料（框架定義）不受 scope 限制、評估資料依 scope 過濾 — 檔案：`server/src/routes/competency.js`；驗證：employee 可查看框架定義但評估資料限本人
- [x] [P] 4.2 L2 grade-matrix routes enforce — 掛載 `requireFeaturePerm('L2.grade-matrix')` 到 `/api/grade-matrix/*` 端點 — 檔案：`server/src/routes/grade-matrix.js`；驗證：view 權限可查看、edit 權限可修改

## 5. 前端 — 登入流程載入功能權限

- [x] 5.1 Load user feature permissions on login — Decision 1：前端權限資料載入策略 — 登入後額外呼叫 feature-perms API，修改 AuthService 登入成功後呼叫 `GET /api/auth/feature-perms` 取得合併權限 Map，存入 signal + localStorage，token refresh 時重新載入 — 檔案：`features/auth/services/auth.service.ts`、`features/auth/models/auth.model.ts`；驗證：登入後 `authService.featurePerms()` 回傳 Map<string, UserFeaturePerm>

## 6. 前端 — FeatureGateService 升級

- [x] 6.1 FeatureGateService provides feature-level permission checks — Decision 2：FeatureGateService 雙層檢查架構，新增 `canView(featureId)`、`canEdit(featureId)`、`getFeaturePerm(featureId)`、`isFeatureAccessible(featureId)` 方法，結合模組啟用 + action_level 雙重檢查 — 檔案：`core/services/feature-gate.service.ts`；驗證：action_level=none → canView=false、action_level=view → canView=true+canEdit=false、action_level=edit → both true

## 7. 前端 — 側邊欄與路由守衛整合

- [x] [P] 7.1 Sidebar filters items by feature permission — Decision 3：側邊欄過濾整合方式，修改 `activeMenuSections` computed signal 使用 `isFeatureAccessible()` 取代 `isFeatureEnabled()`，action_level=none 項目隱藏，空模組區段隱藏 — 檔案：`shared/components/sidebar/sidebar.component.ts`；驗證：employee 帳號登入只看到有 view/edit 權限的側邊欄項目
- [x] [P] 7.2 Route guard enforces feature-level access — Decision 4：路由守衛升級策略 — 功能層級 requiredFeature，修改 `featureGateGuard` 支援 `route.data['requiredFeature']`，無權限時導向 dashboard + 通知 — 檔案：`core/guards/feature-gate.guard.ts`；驗證：直接輸入 URL 到無權限頁面被攔截導向 dashboard

## 8. 前端 — 各模組路由配置 requiredFeature

- [x] [P] 8.1 L1 employee routes 配置 requiredFeature — 在 employee.routes.ts 各子路由加入 `data: { requiredFeature: 'L1.xxx' }` — 檔案：`features/employee/employee.routes.ts`；驗證：每個子路由有正確的 requiredFeature
- [x] [P] 8.2 L2 competency routes 配置 requiredFeature — 在 competency.routes.ts 各子路由加入 `data: { requiredFeature: 'L2.xxx' }` — 檔案：`features/competency/competency.routes.ts`；驗證：每個子路由有正確的 requiredFeature
- [x] [P] 8.3 L3-L6 routes 配置 requiredFeature — 在 training/project/performance/culture routes 各子路由加入 `data: { requiredFeature: 'Lx.xxx' }` — 檔案：`features/training/training.routes.ts`、`features/project/project.routes.ts`、`features/performance/performance.routes.ts`、`features/culture/culture.routes.ts`；驗證：每個子路由有正確的 requiredFeature
- [x] [P] 8.4 SYS tenant-admin routes 配置 requiredFeature — 在 tenant-admin.routes.ts 各子路由加入 `data: { requiredFeature: 'SYS.xxx' }` — 檔案：`features/tenant-admin/tenant-admin.routes.ts`；驗證：每個子路由有正確的 requiredFeature

## 9. 前端 — L1/L2 頁面唯讀模式

- [x] [P] 9.1 Read-only mode for view-only permissions — L1 頁面，Decision 5：唯讀模式實作方式 — FeatureGateService 注入 + 條件渲染，L1 各頁面注入 FeatureGateService，action_level=view 時隱藏新增/編輯/刪除按鈕 — 檔案：L1 各頁面元件（jobs、recruitment、profile、meeting、talent-pool、onboarding）；驗證：view 權限登入看不到操作按鈕
- [x] [P] 9.2 Read-only mode for view-only permissions — L2 頁面，L2 各頁面注入 FeatureGateService，action_level=view 時隱藏新增/編輯/刪除按鈕 — 檔案：L2 各頁面元件（grade-matrix、framework、job-description、assessment、gap-analysis）；驗證：view 權限登入看不到操作按鈕

## 10. 驗證

- [x] 10.1 執行 `cd bombus-system && npx ng build --configuration=development` 確認全專案編譯通過
- [x] 10.2 端對端驗證 — 以 employee 帳號登入確認：側邊欄僅顯示有權限的項目、直接輸入 URL 被攔截、API 回傳依 scope 過濾的資料、view 權限頁面無操作按鈕
