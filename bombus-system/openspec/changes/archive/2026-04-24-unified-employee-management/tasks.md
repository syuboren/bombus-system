## 1. 資料庫 Schema 變更與遷移

- [x] 1.1 **[後端]** Employee database schema extensions — 在 `tenant-schema.js:initTenantSchema()` 和 `tenant-db-manager.js:_runMigrations()` 新增 employees 表欄位：`english_name`, `mobile`, `gender`, `birth_date`, `address`, `emergency_contact_name`, `emergency_contact_relation`, `emergency_contact_phone`, `import_job_id`（雙遷移清單同步）。驗證：啟動 server，檢查 demo 租戶 DB 新欄位存在
- [x] 1.2 **[後端]** Import database schema — 在兩處遷移清單新增 `import_jobs` 表（id, status, total_rows, processed_rows, success_count, error_count, file_name, created_by, created_at, completed_at）和 `import_results` 表（id, job_id, row_number, status, employee_id, user_id, initial_password, error_message, created_at）。驗證：啟動 server，確認表結構正確

## 2. 統一 Employee 資料模型（前端）

- [x] 2.1 **[前端]** Unified Employee interface — 建立 `shared/models/employee.model.ts`，定義 `UnifiedEmployee` 和 `UnifiedEmployeeDetail` 介面，合併跨公司 positions[] 與完整歷程欄位（含 userId、userStatus、userRoles）。驗證：`npx ng build --configuration=development` 編譯通過
- [x] 2.2 **[前端]** Deprecated legacy Employee interfaces — 在 `organization.model.ts` 的 Employee 和 `talent-pool.model.ts` 的 EmployeeDetail 加上 `@deprecated` JSDoc 標註，指向統一模型。驗證：IDE 顯示棄用警告

## 3. 統一後端 Employee API

- [x] 3.1 **[後端]** Unified Employee list API response — 擴充 `GET /api/employee/list` 回傳 `positions[]` 陣列（JOIN org_units 取得公司/部門名稱）和 `userId`/`userStatus` 欄位（LEFT JOIN users）。驗證：curl 呼叫 API 確認回傳結構包含 positions 和 userId
- [x] 3.2 **[後端]** Unified Employee detail API response — 擴充 `GET /api/employee/:id` 回傳完整 UnifiedEmployeeDetail 結構（含 workHistory、documents、training、performance、roi、auditLogs、userRoles）。驗證：curl 呼叫 API 確認回傳所有歷程資料
- [x] 3.3 **[後端]** 新增 `POST /api/employee` 端點（新增員工 + 自動建帳號），呼叫統一帳號建立服務（依賴 4.1）。驗證：curl POST 建立員工，確認同時建立 User 帳號和預設角色
- [x] 3.4 **[後端]** 新增 `PUT /api/employee/:id` 端點（更新員工基本資料）。驗證：curl PUT 更新員工姓名/Email 等欄位，確認 DB 更新

## 4. 統一帳號建立服務

- [x] 4.1 **[後端]** Shared account creation service — 建立 `server/src/services/account-creation.js`，實作 `createEmployeeWithAccount()` 函數（transaction 內建立 Employee + User + 指派角色），含 Password generation strategy（crypto.randomBytes）、Default role assignment、SMTP readiness interface（notifyMethod 參數）。同時實作 Password reset service（`resetUserPassword()` 函數）和 Link user to employee（`linkUserToEmployee()` 函數，處理孤立帳號的連結/建立員工）。驗證：撰寫單元測試或整合測試呼叫三個函數，確認各自回傳正確結果
- [x] 4.4 **[後端]** 新增 `POST /api/tenant-admin/users/:id/reset-password` 端點，呼叫 `resetUserPassword()` 回傳新密碼，寫入 audit_log。驗證：curl 呼叫確認回傳 newPassword 且 DB 中 must_change_password = 1
- [x] 4.2 **[後端]** Automatic user account creation during candidate conversion — 重構 `hr-onboarding.js` 的 convert-candidate 端點，改用統一帳號建立服務替代現有的密碼產生與 User 建立邏輯。保留 Automatic employee role assignment 行為。驗證：執行現有整合測試 `test-e2e-flow.js` 確認入職流程不中斷
- [x] 4.3 **[後端]** 重構 `tenant-admin.js` 的使用者建立邏輯，移除獨立的 User 建立程式碼（使用者管理介面不再負責建立帳號）。驗證：確認 POST /api/tenant-admin/users 端點已移除或回傳 410 Gone

## 5. 批次匯入（後端）

- [x] 5.1 **[後端]** CSV validation endpoint — 建立 `server/src/routes/batch-import.js`，實作 `POST /api/employee/batch-import/validate`，含 CSV template with full field support（中英文欄位名對應）、CSV required fields validation（必填欄位檢查）、CSV format and reference validation（email 格式、工號唯一性、組織架構比對、職等職級比對、日期格式）。驗證：上傳含錯誤的測試 CSV，確認每筆驗證結果正確
- [x] 5.2 **[後端]** Batch import execution endpoint — 實作 `POST /api/employee/batch-import/execute`，建立 import_jobs 記錄、以 setImmediate 背景迴圈處理每筆資料（呼叫 createEmployeeWithAccount）、更新進度。驗證：匯入 10 筆測試資料，確認 employees + users 表記錄數正確
- [x] 5.3 **[後端]** Import progress polling endpoint — 實作 `GET /api/employee/batch-import/:jobId/status`，回傳匯入進度資訊。驗證：匯入過程中輪詢，確認 processedRows 遞增
- [x] 5.4 **[後端]** Import result report endpoint — 實作 `GET /api/employee/batch-import/:jobId/report`，回傳含 initialPassword 的完整結果。含 Import audit logging（寫入 audit_logs）。驗證：下載報告確認包含密碼和錯誤訊息
- [x] 5.5 **[後端]** 將 batch-import 路由註冊到 Express app，套用 authMiddleware + tenantMiddleware + requireFeaturePerm('L1.profile', 'edit')。驗證：無認證呼叫返回 401

## 6. 共用員工詳情元件（前端）

- [x] 6.1 **[前端]** 共用員工詳情元件架構 — 建立 `shared/components/employee-detail/` 元件骨架（Standalone + OnPush），實作 Shared employee detail component with mode control（employeeId、readonly、moduleColor signal inputs + employeeUpdated output）。驗證：元件可在測試頁面中渲染空殼
- [x] 6.2 **[前端]** Tab structure and content — 基本資料 Tab：從 profile-page 搬入基本資訊、職位列表（跨公司支援）、學歷、技能、證照、緊急聯絡人、候選人來源、入職進度、操作記錄。驗證：開啟 Modal 確認基本資料正確顯示
- [x] 6.3 **[前端]** Tab structure and content — 職務異動 Tab：從 profile-page 搬入 Timeline 視圖。驗證：確認異動記錄時間軸正確渲染
- [x] 6.4 **[前端]** Tab structure and content — 文件管理 Tab：從 profile-page 搬入簽署文件 + 上傳文件區塊。驗證：確認文件清單與下載功能正常
- [x] 6.5 **[前端]** Tab structure and content — 訓練紀錄 Tab：從 profile-page 搬入訓練卡片 Grid。驗證：確認訓練記錄卡片正確顯示
- [x] 6.6 **[前端]** Tab structure and content — 績效評核 Tab：從 profile-page 搬入績效卡片（含目標達成進度條）。驗證：確認績效記錄正確顯示
- [x] 6.7 **[前端]** Tab structure and content — ROI 分析 Tab：從 profile-page 搬入 KPI 卡片 + ECharts 趨勢圖。驗證：確認圖表正確渲染
- [x] 6.8 **[前端]** Account and permissions tab with independent access control — 實作第 7 Tab「帳號與權限」，整合 TenantAdminService 取得 userRoles、角色指派/撤銷、權限預覽（mergeFeaturePerms）、密碼重設、帳號啟用/停用。以 FeatureGateService 檢查 SYS.user-management 權限控制 Tab 顯示。驗證：有 SYS.user-management 權限時顯示 Tab，無權限時隱藏
- [x] 6.9 **[前端]** Data loading and event emission — 實作 employeeId 變更時呼叫 API 載入資料、Tab 切換時 on-demand 載入、編輯成功後 emit employeeUpdated 事件。驗證：切換不同員工時資料正確更新，編輯後父元件收到事件
- [x] 6.10 **[前端]** 共用元件 SCSS 樣式 — 使用 CSS 自訂屬性 `--module-color` 實作動態套色，複用的現有服務與元件（@include card、data-table、status-badge-color 等 SCSS Mixin）。驗證：分別以 L1 sage 和 L4 mauve 顏色渲染，確認視覺正確

## 7. HR 員工管理中心（前端）

- [x] 7.1 **[前端]** 頁面角色重新分配 — 重構 `employee-management-page` 為 HR employee management hub page，整合 HR dashboard with KPI cards and sidebar（從 profile-page 搬入 KPI 卡片 + 側邊欄三區塊：到期文件、部門 ROI、週年提醒）。驗證：HR 儀表板各區塊資料正確載入
- [x] 7.2 **[前端]** Employee list with dual view mode — 保留現有卡片/列表雙視圖，改用 UnifiedEmployee 模型和擴充後的 EmployeeService。驗證：雙視圖切換正常，篩選搜尋正常
- [x] 7.3 **[前端]** Add employee with automatic account creation — 實作新增員工 Modal 表單（必填/選填欄位），呼叫 `POST /api/employee`，成功後顯示 initialPassword。驗證：新增員工成功，帳號同時建立
- [x] 7.4 **[前端]** Batch import entry point — 實作批次匯入工作流 Modal（批次匯入兩階段設計：上傳 CSV → 驗證進度 → 預覽報告每筆 ✓/✗ → 確認按鈕 → 執行進度 → 結果報告下載）。驗證：完整走過匯入流程，結果報告可下載
- [x] 7.5 **[前端]** Editable employee detail modal — 整合共用元件 `<app-employee-detail [readonly]="false" [moduleColor]="moduleColor" />`，實作 employeeUpdated 事件監聽刷新列表。驗證：開啟員工詳情可編輯，儲存後列表更新
- [x] 7.6 **[前端]** Deep link from settings/users — 實作 `?userId=xxx` 查詢參數支援，自動開啟對應員工的 Modal 並切換至帳號與權限 Tab。驗證：從 settings/users 點擊管理按鈕，正確導向並開啟 Modal

## 8. 員工自助頁面（前端）

- [x] 8.1 **[前端]** Employee self-service profile page — 重構 `profile-page` 為自助頁面，移除 HR 儀表板（KPI 卡片、側邊欄），實作 Self-service page layout（搜尋、部門篩選、狀態篩選、分頁表格）。驗證：頁面無 HR 專屬元素
- [x] 8.2 **[前端]** Self-service detail modal — 整合共用元件 `<app-employee-detail [readonly]="true" [moduleColor]="sageColor" />`，確認 6 Tab 唯讀顯示。驗證：點擊員工開啟 Modal，所有 Tab 無編輯按鈕
- [x] 8.3 **[前端]** Feature gate and permission — 確認路由 `featureGateGuard` 以 `L1.profile` 為門檻，view_scope 控制可見員工範圍（company/department/self）。驗證：不同權限帳號看到不同範圍的員工

## 9. 帳號總覽精簡版（前端）

- [x] 9.1 **[前端]** Simplified user overview page — 重構 `user-management-page` 為精簡版帳號總覽，實作 Remove user creation from settings（移除新增使用者表單、角色指派 Modal、權限預覽），移除「從既有員工建立帳號」功能（已遷移至 HR 管理中心的帳號與權限 Tab），保留帳號清單表格（現有檔案修改清單中 user-management-page 的精簡）。驗證：頁面無新增按鈕、無角色指派 Modal
- [x] 9.2 **[前端]** Quick actions on user overview — 實作啟用/停用切換和密碼重設快速操作。驗證：切換帳號狀態成功，重設密碼顯示新密碼
- [x] 9.3 **[前端]** Navigate to employee management for detailed operations — 實作「管理」連結導向 `/organization/employee-management?userId=xxx`。驗證：點擊管理按鈕正確導向

## 10. 前端服務整合與入職流程修改

- [x] 10.1 **[前端]** 更新 `EmployeeService` 新增 API 方法：createEmployee、updateEmployee、batchImportValidate、batchImportExecute、batchImportStatus、batchImportReport。驗證：所有新方法可正常呼叫後端 API
- [x] 10.2 **[前端]** Conversion success view displays account information — 更新入職轉正成功畫面，顯示統一服務回傳的 initialPassword（而非 email-based 密碼提示）。驗證：轉正成功時顯示隨機密碼
- [x] 10.3 **[前端]** 移除 OrganizationService 中員工相關方法（遷移至 EmployeeService），更新所有引用。驗證：`npx ng build --configuration=development` 編譯通過

## 11. 驗證與整合測試

- [x] 11.1 **[後端]** 執行現有整合測試（test-e2e-flow、test-tenant-isolation、test-demo-tenant、test-permission-inheritance、test-audit-logs），確認無回歸。驗證：153/153 assertions passed
- [x] 11.2 **[後端]** 撰寫批次匯入整合測試：驗證 CSV 驗證（格式錯誤、重複偵測、組織架構比對）、匯入執行、進度查詢、結果報告。驗證：所有測試案例通過
- [x] 11.3 **[前端]** Angular 全專案編譯驗證。驗證：`npx ng build --configuration=development` 零錯誤
