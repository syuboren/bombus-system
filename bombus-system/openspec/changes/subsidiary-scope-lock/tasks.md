## 1. 後端 — 子公司判斷與 Scope 過濾（Decision 1~3）

- [x] 1.1 在 `permission.js` 新增 `findUserSubsidiaryId(db, orgUnitId)` helper（Decision 1：後端子公司判斷 — 從 org_unit 向上走 parent chain），實作 backend subsidiary determination，找到 subsidiary 或 group 類型。驗證：單獨呼叫 helper 傳入 department/subsidiary/group/null 四種情境，確認回傳正確 ID
- [x] 1.2 在 `tenant.js` 注入 `req.user.subsidiaryId`（Decision 2：tenant.js 注入 subsidiaryId），呼叫 `findUserSubsidiaryId()` 設定 tenant middleware injects subsidiaryId。驗證：啟動 server，登入後在任意 API 加 console.log 確認 req.user.subsidiaryId 有值
- [x] [P] 1.3 更新 `buildScopeFilter()` 的 company scope 邏輯（Decision 3：buildScopeFilter company scope 改為子公司過濾），實作 company scope filters by subsidiary。super_admin → 1=1，有 subsidiaryId → IN (子公司 org_units)，無 subsidiaryId → 1=1。驗證：用非 super_admin 帳號呼叫 `/api/employee/list`，確認只回傳所屬子公司員工
- [x] [P] 1.4 更新 `checkEditScope()` 的 company 邏輯，實作 company edit scope filters by subsidiary。super_admin 不限，其他檢查目標 org_unit_id 是否在子公司範圍內。驗證：嘗試編輯不屬於自己子公司的記錄，預期被拒絕

## 2. 後端 — 登入/刷新回應（Decision 4）

- [x] [P] 2.1 更新 `/api/auth/login` 回應，加入 `subsidiary_id`（Decision 4：登入/刷新回應加入 subsidiary_id），實作 login response includes subsidiary_id。查詢 employee_id → org_unit_id → findUserSubsidiaryId()。驗證：POST `/api/auth/login`，確認回應 user 物件含 subsidiary_id
- [x] [P] 2.2 更新 `/api/auth/refresh` 回應，加入 `subsidiary_id`，實作 token refresh response includes subsidiary_id。驗證：POST `/api/auth/refresh`，確認回應 user 物件含 subsidiary_id

## 3. 前端 — Model 與 Service（Decision 5）

- [x] 3.1 在 `auth.model.ts` 的 User interface 新增 `subsidiary_id?: string | null`，實作 frontend User model includes subsidiary_id。驗證：TypeScript 編譯無錯誤
- [x] 3.2 更新 `org-unit.service.ts`（Decision 5：前端 OrgUnitService 集中鎖定邏輯），實作 OrgUnitService provides subsidiary locking signals。更新 `lockedSubsidiaryId`（只有 super_admin 不鎖定），新增 `visibleSubsidiaries` 和 `isSubsidiaryLocked` computed signals。驗證：`ng build --configuration=development` 編譯通過

## 4. 前端 L1 頁面 — 子公司 Dropdown 鎖定（Decision 6）

- [x] [P] 4.1 更新 profile-page（TS + HTML），實作 page subsidiary dropdown locking 與 subsidiary initialization prevents double API calls（Decision 6：前端頁面統一使用 visibleSubsidiaries）。初始化 locked 值，鎖定時 disabled + 隱藏全部子公司選項。驗證：company scope 使用者只看到自己子公司
- [x] [P] 4.2 更新 jobs-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 4.3 更新 meeting-page（TS + HTML），同 4.1 模式（calendar scope 切換需同步限制）。驗證：dropdown 鎖定正確
- [x] [P] 4.4 更新 recruitment-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 4.5 更新 talent-pool-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 4.6 更新 onboarding-convert-modal（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確

## 5. 前端 L2 頁面 — 子公司 Dropdown 鎖定（Decision 6~7）

- [x] [P] 5.1 更新 grade-matrix-page（TS + HTML），實作 grade matrix group defaults exception（Decision 7：Grade Matrix 例外處理）。Tab A 保留全部子公司選項但用 visibleSubsidiaries，Tab B/C 完全鎖定。驗證：鎖定使用者 Tab A 可切換集團預設，Tab B/C 鎖定到自己子公司
- [x] [P] 5.2 更新 assessment-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 5.3 更新 job-description-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 5.4 更新 framework-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 5.5 更新 template-manage-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 5.6 更新 create-jd-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 5.7 更新 position-edit-modal（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確

## 6. 前端 L3~L5 頁面 — 子公司 Dropdown 鎖定（Decision 6）

- [x] [P] 6.1 更新 nine-box-tab（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 6.2 更新 key-talent-tab（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 6.3 更新 heatmap-tab（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 6.4 更新 project-list-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 6.5 更新 profit-settings-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確
- [x] [P] 6.6 更新 goal-task-page（TS + HTML），同 4.1 模式。驗證：dropdown 鎖定正確

## 7. 驗證

- [x] 7.1 Angular 編譯驗證：`cd bombus-system && npx ng build --configuration=development` 確認無錯誤
- [x] 7.2 整合測試：super_admin 登入可自由切換子公司，company scope 使用者 dropdown 鎖定且 API 資料限制在所屬子公司
