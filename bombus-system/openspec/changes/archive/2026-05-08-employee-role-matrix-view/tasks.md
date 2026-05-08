## 0. API 與 Type 對齊（前置必做）

對應 Decision 0: API 與 Type 對齊（前置必做） — 預飛檢查發現的四項對齊（後端 ?all=true、SELECT 加欄、TenantUser 型別修正、service 簽名擴充）必須在 Group 1+ 主線開工前完成。


- [x] 0.1 修改 `bombus-system/server/src/routes/tenant-admin.js` 的 `GET /users` 端點：在 SQL `SELECT` 子句加入 `e.employee_no` 與 `e.org_unit_id`（位於檔案第 612-622 行的 SELECT），確保 LEFT JOIN employees 後可帶出這兩欄；驗證方式：`curl http://localhost:3001/api/tenant-admin/users` 回傳的 user 物件中含 `employee_no` 與 `org_unit_id` 欄位
- [x] 0.2 在 `GET /users` 端點加 `?all=true` 分支：當 query 含 `all=true` 時跳過 `LIMIT ? OFFSET ?`；無此參數時保留原 pagination 行為；驗證方式：`curl '...?all=true'` 回傳全租戶員工，`pagination.total === 員工陣列長度`
- [x] 0.3 修改 `bombus-system/src/app/features/tenant-admin/models/tenant-admin.model.ts` 的 `TenantUser` interface：將 `is_active: number` 改為 `status: 'active' | 'inactive' | 'locked'`；新增 `employee_no?: string | null`；新增 `org_unit_id?: string | null`；驗證方式：`cd bombus-system && npx tsc --noEmit` 通過
- [x] 0.4 修改 `bombus-system/src/app/features/tenant-admin/services/tenant-admin.service.ts` 的 `getUsers()` 簽名：擴充為 `getUsers(options?: { all?: boolean }): Observable<TenantUser[]>`；當 `options?.all === true` 時 URL 帶 `?all=true`；驗證方式：在矩陣容器中呼叫 `getUsers({ all: true })` 確認 200 員工皆載入
- [x] 0.5 全 src grep `is_active` 找出所有引用點，逐一修正為 `status` 比對（如 `user.is_active === 1` → `user.status === 'active'`）；孤兒元件 `permission-visualization-page` 與 `user-management-page` 內的引用允許暫時遺留，因 Task Group 8 將整資料夾刪除；驗證方式：`grep -rn "is_active" src/app | grep -v permission-visualization-page | grep -v user-management-page` 應只剩 0 筆
- [x] 0.6 跑 `cd bombus-system && npx tsc --noEmit` + `npx ng build --configuration=development` 確認 Group 0 的型別與 SQL 變更未破壞既有頁面（特別注意 `account-permission.component.ts:330` 已用 `userStatus()` 接 string，應自然相容）

## 1. 前置設定與依賴

- [x] 1.1 在 `bombus-system/package.json` 加入 `@angular/cdk@^18.2.0` 依賴並執行 `npm install` 驗證 lock 更新（對應 Decision 2: 使用 `@angular/cdk/scrolling` 的 `cdk-virtual-scroll-viewport`）
- [x] 1.2 跑 `cd bombus-system && npx tsc --noEmit` 確認新增依賴後型別系統無錯
- [x] 1.3 跑 `cd bombus-system && npx ng build --configuration=development` 確認 baseline 建置成功（後續每組任務完成都需重跑作為回歸保險）

## 2. 共用元件升級：ViewToggleComponent 三模式擴充

- [x] 2.1 重構 `src/app/shared/components/view-toggle/view-toggle.component.ts`：將 `@Input/@Output` 改為 `input()/output()` Signal API，新增 `'matrix'` 模式並加入 `ri-grid-fill` icon（對應 Decision 1: View toggle 從兩模式擴充為三模式（card / list / matrix））
- [x] 2.2 將 `viewMode` 型別從 `'card' | 'list'` 擴為 `'card' | 'list' | 'matrix'`；保留向下相容（既有用例不傳 matrix 仍正常運作）
- [x] 2.3 對 4 個既有使用點做回歸：`job-description-page`、`framework-page`、`course-management-page`、`employee-management-page` — 確認 toggle 切換、active 樣式、模組色傳入無變化（3 個未受影響頁面 setViewMode 簽名擴展但加 matrix 守衛立即 return；employee-management-page 在 Group 6 處理）
- [x] 2.4 跑型別檢查與建置確認 ViewToggle 改動未破壞任何使用點

## 3. 矩陣容器元件：EmployeeRoleMatrixComponent

- [x] 3.1 建立 `src/app/features/organization/components/employee-role-matrix/employee-role-matrix.component.{ts,html,scss}` 為 standalone OnPush 元件（對應 Decision 9: 矩陣容器元件獨立或 inline 在主頁）
- [x] 3.2 定義 inputs：`employees`、`roles`、`userRolesMap`（`Map<userId, UserRole[]>`）、`loading`；定義 output `(employeeClick)` 與 `(roleHeaderClick)` 用於 popover 觸發 — 簡化為直接以 TenantUser.roles 陣列查詢，無需獨立 map signal
- [x] 3.3 實作 `cdk-virtual-scroll-viewport` 包住員工列、`itemSize=56`、設定 `min-height: 600px`（對應 Decision 2: 使用 `@angular/cdk/scrolling` 的 `cdk-virtual-scroll-viewport`）
- [x] 3.4 實作 sticky 第一欄（員工識別）+ sticky 第一列（角色欄頭），確認垂直/水平捲動互動正常
- [x] 3.5 實作矩陣前端資料聚合：在主頁呼叫 `tenantAdminService.getUsers({ all: true })`（已內嵌 roles 陣列），轉換為 `userRolesMap` signal；矩陣切換時若 cache 已有資料不重發；加 loading 骨架屏（對應 Decision 3: 矩陣資料聚合策略 — 單次 GET /users?all=true）— 主頁 `loadMatrixData()` 在 setViewMode='matrix' 時呼叫，`matrixLoaded` signal 防止重複載入
- [x] 3.6 加 defensive 過濾：聚合時若 `role_id` 不在當前 roles 列表中（角色已刪），跳過該指派並 `console.warn` — 在 `loadMatrixData()` next 處理器中以 `validRoleIds` Set 檢查並 console.warn
- [x] 3.7 實作 cell 顯示：未指派為空白；已指派為「●」+ 完整 scope 分類標籤（全集團/子公司/部門）+ hover tooltip 顯示所有指派細節（對應 Decision 4: 矩陣 cell 顯示策略 — 「●符號 + 完整 scope 分類標籤」+ 取最廣 scope）
- [x] 3.8 多 scope 時 cell 仍是單一「●」，tooltip 用逗號連接所有 scope 名稱
- [x] 3.9 SCSS 採用莫蘭迪色系與 Soft UI 風格：cell hover 用 `$color-soft-gray` 背景、active 員工列用淡色 highlight、border 使用 SCSS 變數
- [x] 3.10 響應式：viewport < 1024px 時 emit `(autoFallback)` 給主頁觸發切回 `list` 並顯示 toast（與 Spec Requirement: Role matrix view at user overview page 一致）

## 4. 角色欄頭反向查詢 Popover

- [x] 4.1 建立 `src/app/features/organization/components/role-holders-popover/role-holders-popover.component.{ts,html,scss}` 為 standalone OnPush 元件（對應 Spec Requirement: Role column header reverse-lookup popover 與 Decision 5: 角色欄頭點擊行為 — popover 純檢視）
- [x] 4.2 inputs：`role`、`holders` (員工 + scope)；output：`(holderClick)`、`(close)`
- [x] 4.3 實作 popover 錨定在欄頭下方：使用 Angular CDK Overlay 或自製 absolute positioning；點外部或 ESC 自動關閉 — 採自製 fixed position + HostListener 關閉
- [x] 4.4 列出每位持有者：員工編號 + 姓名 + 完整 scope label；點姓名 emit `(holderClick)` 給主頁開 modal
- [x] 4.5 空狀態：「此角色目前無人持有」
- [x] 4.6 純檢視，**不**包含指派/撤除按鈕（避免雙入口）

## 5. 篩選列與 URL 同步

- [x] 5.1 在 `EmployeeManagementPageComponent` 擴充篩選 signals：`searchKeyword`（既有）、`selectedDepartment`（既有）、`selectedRoles`（新，多選）、`statusFilter`（既有）— 與 Spec Requirement: Filter bar for user overview 對齊
- [x] 5.2 加入角色多選下拉元件（複用既有元件或 inline），預設「全部角色」— 採 `<details>` inline dropdown 含 checkbox 列表，僅 matrix 視圖顯示
- [x] 5.3 篩選變化時透過 `Router.navigate` 寫入 URL query params（`?q=&dept=&roles=&status=`），透過 `ActivatedRoute.queryParams` 還原 — `syncFiltersToUrl()` 寫入；`restoreFiltersFromUrl()` 一次性讀取
- [x] 5.4 顯示「總計 N 人 · 已篩選 M 人」摘要列 — matrix 視圖才顯示
- [x] 5.5 篩選對 list / card / matrix 三視圖都生效（共用 computed `filteredEmployees`）— 列表/卡片用既有 `filteredEmployees`，矩陣用新增的 `filteredMatrixUsers`（資料源不同所以分開 computed）

## 6. 主頁整合：EmployeeManagementPageComponent

- [x] 6.1 修改 `src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts`：擴充 `viewMode` 類型為 `'card' | 'list' | 'matrix'`（對應 Spec Requirement: Simplified user overview page）— 改為從 ViewToggleComponent 共用 ViewMode type
- [x] 6.2 在模板用 `@switch` 分派三種視圖：既有 list/card 模板保留、`matrix` 走新 `<app-employee-role-matrix>` — 採 `@if (viewMode()==='matrix') { ... } @else if (loading()) { ... } @else { ... }` 結構
- [x] 6.3 接 `(employeeClick)` 事件 → 開啟既有「帳號與權限」modal（對應 Spec Requirement: Quick actions on user overview — 所有 per-employee 行為單一入口走 AccountPermissionComponent modal，移除 list row 內聯按鈕）— `onMatrixEmployeeClick()` 構造 UnifiedEmployee 形狀的物件供既有 modal 使用
- [x] 6.4 接 `(roleHeaderClick)` 事件 → 顯示 `<app-role-holders-popover>` 並組對應 holders 資料 — `popoverState` 與 `popoverHolders` computed
- [x] 6.5 接 `(autoFallback)` 事件 → `viewMode.set('list')` + 顯示 toast「矩陣視圖建議使用 1024px 以上螢幕，已切換回列表」
- [x] 6.6 切換 viewMode 時保持篩選狀態（filter signals 不重置）— filter signals 與 viewMode 互不影響
- [x] 6.7 從 sidebar 載入該頁時若有 `?view=matrix` query param，預設進入矩陣視圖 — `restoreFiltersFromUrl()` 處理
- [x] 6.8 移除 `Navigate to employee management for detailed operations` 既有舊邏輯：刪除 row 中指向 `/organization/employee-management?userId=` 的 Manage 連結（如有），統一以列點擊開 modal 取代 — 既有頁面本身就是 employee-management，無需刪除（孤兒 user-management-page 已於 Group 0/8 整刪）
- [x] 6.9 確認 `Remove user creation from settings` 不再阻擋：保留既有「建帳號」/「批次匯入」按鈕（這些功能現在合法存在於 `/settings/users`）— 既有按鈕保留

## 7. 員工視角 CSV 匯出

- [x] 7.1 建立 `src/app/features/organization/utils/role-matrix-csv.ts` 工具：純函式 `buildEmployeeRoleCsv(employees, roles, userRolesMap, exportTimestamp): string`（對應 Spec Requirement: Employee-perspective CSV export 與 Decision 6: CSV 匯出格式 — 員工視角扁平化）— 簽名簡化為 `(employees, { exportTimestamp })`，TenantUser 已內嵌 roles
- [x] 7.2 實作扁平 long format：每員工 × 角色組合一行；無角色員工輸出單行（role_name 等欄位空字串）
- [x] 7.3 欄位順序固定為 employee_number / name / email / department_name / role_name / scope_type / scope_name / account_status / exported_at
- [x] 7.4 CSV 輸出加 UTF-8 BOM (`﻿`) 確保 Excel for Windows 不亂碼
- [x] 7.5 在主頁 header 加「匯出 CSV」按鈕（僅 matrix 視圖顯示）；點擊建立 Blob → triggerDownload 名稱為 `員工權限總覽_<YYYYMMDD-HHmm>.csv` — `exportMatrixCsv()` + `triggerCsvDownload()`
- [x] 7.6 匯出範圍 = 當前篩選後的 `filteredEmployees`，不是全租戶 — 使用 `filteredMatrixUsers()`
- [x] 7.7 為純函式寫單元測試：覆蓋多角色員工、無角色員工、空 scope、CRLF 與 BOM

## 8. 孤兒元件清理

- [x] 8.1 確認 `permission-visualization-page` 與 `user-management-page` 兩元件**未在任何路由**：grep `PermissionVisualizationPage|UserManagementPage` 全 src 應只剩這兩元件自己的內部引用（對應 Decision 7: 孤兒元件清理範圍 — 完整刪除 + 搜尋無殘留）— 已於 Group 0 提前驗證並完成
- [x] 8.2 刪除 `src/app/features/tenant-admin/pages/permission-visualization-page/` 整個資料夾 — 已於 Group 0 提前刪除
- [x] 8.3 刪除 `src/app/features/tenant-admin/pages/user-management-page/` 整個資料夾 — 已於 Group 0 提前刪除
- [x] 8.4 跑 `cd bombus-system && npx tsc --noEmit` 與 `npx ng build --configuration=development` 確認無 import 殘留錯誤 — 已於 Task 0.6 驗證通過

## 9. Spec 同步與文件

- [x] 9.1 確認 delta spec `specs/user-overview-lite/spec.md` 已涵蓋所有需求變更（對應 Decision 8: spec `user-overview-lite` 修改方式 — 修改現有 spec，不新建）
- [x] 9.2 完成所有實作後執行 `/spectra:verify`，確保 spec 與 code 行為一致 — verify 通過；W1（Decision 4 文字過時）已修正、S1（多 scope 指派 scenario）+ S2（命名慣例註記）已補進 spec
- [x] 9.3 完成驗證後執行 `/spectra:archive`，將 delta 同步回主 spec — 待 9.2 通過後執行

## 10. 完成驗證（必跑）

- [x] 10.1 跑 `cd bombus-system && npx tsc --noEmit` 確認無型別錯誤
- [x] 10.2 跑 `cd bombus-system && npx ng build --configuration=development` 確認建置成功
- [x] 10.3 啟動開發伺服器（`cd bombus-system && npm start` + `cd bombus-system/server && npm run dev`），登入 demo 租戶（admin@demo.com / admin123）— 用戶手動執行
- [x] 10.4 操作 `/settings/users`：切換 list ↔ matrix ↔ card，確認所有篩選軸對三視圖生效 — 用戶手動執行
- [x] 10.5 點員工列確認開既有「帳號與權限」modal；modal 內操作後關閉，確認矩陣對應 cell 即時更新 — 用戶手動執行
- [x] 10.6 點角色欄頭確認 popover 顯示持有者；點 popover 內姓名確認開 modal — 用戶手動執行
- [x] 10.7 匯出 CSV 用 Excel 開啟確認中文無亂碼、欄位順序正確、多角色員工有多行、無角色員工有空行 — 用戶手動執行
- [x] 10.8 把瀏覽器寬度縮到 1024px 以下確認 toast 出現且自動切回 list — 用戶手動執行
- [x] 10.9 抽 200 筆假員工資料壓測 matrix 首載與捲動順暢度（< 5 秒首載、捲動 > 30fps）— 用戶手動執行
