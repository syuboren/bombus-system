## 1. 後端 — DB Schema 與遷移（Decision 1: Feature 定義採靜態表而非動態配置、Decision 6: DB Schema 設計）

- [x] 1.1 在 `tenant-schema.js` 的 `initTenantSchema()` 新增 `features` 和 `role_feature_perms` CREATE TABLE 語句，依 Decision 6: DB Schema 設計。Feature 定義採靜態表而非動態配置（Decision 1）。對應需求：Feature definition table、Role-feature permission model、權限定義、角色定義與管理（現有資料表結構擴充）。驗證：新建租戶 DB 後確認兩張表存在且欄位正確
- [x] 1.2 在 `tenant-schema.js` 新增 16 個 feature seed data INSERT 語句，涵蓋 L1（5 個）、L2（7 個）、SYS（4 個）模組，依 Decision 3: Feature 清單分模組折疊。對應需求：Feature definition table — Features pre-seeded on tenant initialization 場景。驗證：新建租戶 DB 後 `SELECT COUNT(*) FROM features` = 16
- [x] 1.3 在 `tenant-schema.js` 新增 5 個預設角色的 role_feature_perms seed data，依 Decision 5: 預設角色權限映射。對應需求：Default role feature permission seeding、預設角色初始化。驗證：新建租戶 DB 後各角色的 feature perms 與映射表一致
- [x] 1.4 在 `tenant-db-manager.js` 的 `_runMigrations()` 新增冪等遷移：CREATE TABLE IF NOT EXISTS features / role_feature_perms，以及 INSERT OR IGNORE seed data。對應需求：Feature definition table — Features pre-seeded on existing tenant migration 場景。驗證：重啟伺服器載入既有 demo DB，確認表和資料建立完成
- [x] 1.5 在 `tenant-db-manager.js` 的 `_runMigrations()` 新增既有自訂角色（is_system=0）的 feature perms 遷移：為無 role_feature_perms 記錄的自訂角色建立預設 `action_level = 'none'` 的 feature perms。驗證：既有自訂角色在遷移後擁有 16 筆 role_feature_perms（全部為 none）

## 2. 後端 — API 端點（Decision 7: API 端點設計）

- [x] 2.1 在 `tenant-admin.js` 新增 `GET /api/tenant-admin/features` 端點，回傳所有 features 按 module 分組並按 sort_order 排序，依 Decision 7: API 端點設計。對應需求：Feature definition table — Feature list API 場景。驗證：curl 呼叫確認回傳 16 筆 features，按 L1/L2/SYS 分組
- [x] 2.2 在 `tenant-admin.js` 新增 `GET /api/tenant-admin/roles/:id/feature-perms` 端點，JOIN features 表回傳角色的所有 feature 權限，依 Decision 7: API 端點設計。對應需求：Read role feature permissions。驗證：查詢 super_admin 回傳 16 筆，查詢不存在的角色回傳空陣列
- [x] 2.3 在 `tenant-admin.js` 新增 `PUT /api/tenant-admin/roles/:id/feature-perms` 端點，在 transaction 內 DELETE + INSERT 批量替換，依 Decision 7: API 端點設計。對應需求：Bulk update role feature permissions。包含驗證：action_level/scope 組合合法性（Role-feature permission model — Invalid scope combination rejected 場景）、feature_id 存在性、view_scope >= edit_scope。驗證：成功更新後 GET 確認資料一致；送出非法 scope 組合回傳 400

## 3. 後端 — 權限檢查中間件（Decision 4: 新舊模型並存過渡策略）

- [x] 3.1 在 `permission.js` 新增 `requireFeaturePerm(featureId, requiredLevel)` 中間件函式（2 參數，scope 不作為參數），依 Decision 4: 新舊模型並存過渡策略、Decision 9: 多角色權限合併演算法、Decision 10: Scope 執行機制與 scope_type 關係。查詢使用者所有角色的 feature perms，依 Decision 9 合併取最高權限，將合併結果注入 `req.featurePerm`。對應需求：Feature permission check middleware — User with sufficient feature permission passes / User without feature permission is denied 場景；Multi-role permission merging。驗證：以不同角色使用者呼叫受保護端點，確認 200/403 回應正確
- [x] 3.2 在路由處理器中實作 Scope check：比對 `req.featurePerm.edit_scope` / `req.featurePerm.view_scope` 與目標資料的 org_unit_id（使用者所屬部門透過 `user_roles.org_unit_id` 判定），依 Decision 10: Scope 執行機制與 scope_type 關係。對應需求：Feature permission check middleware — Scope check for department-level access 場景。驗證：dept_manager 查詢自己部門員工 200、查詢其他部門 403

## 4. 後端 — 使用者 Feature Perms API（Decision 8: 前端權限服務擴充）

- [x] 4.1 在 `auth.js` 新增 `GET /api/auth/my-feature-perms` 端點（需掛載 authMiddleware + tenantMiddleware），回傳目前登入使用者的合併 feature 權限，依 Decision 9: 多角色權限合併演算法（取所有角色的最高 action_level 和最大 scope）及 Decision 8: 前端權限服務擴充。對應需求：User effective feature permissions API、Frontend feature permission service — Feature permissions loaded after login 場景、Multi-role permission merging。驗證：以不同角色帳號登入後呼叫，確認回傳與 DB 一致；多角色使用者回傳合併後最高權限

## 5. 前端 — 資料模型與服務（Decision 8: 前端權限服務擴充）

- [x] 5.1 在 `tenant-admin.model.ts` 新增 Feature、RoleFeaturePerm、FeaturePermPayload 介面定義。對應需求：Feature definition table、Role-feature permission model。驗證：TypeScript 編譯無錯誤
- [x] 5.2 在 `tenant-admin.service.ts` 新增 `getFeatures()`、`getRoleFeaturePerms(roleId)`、`updateRoleFeaturePerms(roleId, perms)` 方法。對應需求：Feature definition table — Feature list API、Read role feature permissions、Bulk update role feature permissions。驗證：TypeScript 編譯無錯誤
- [x] 5.3 在 `permission.service.ts` 新增 `featurePerms` Signal 和 `hasFeaturePerm(featureId, level, scope?)` 方法；登入成功後從 `/api/auth/my-feature-perms` 載入，依 Decision 8: 前端權限服務擴充。對應需求：Frontend feature permission service、前端權限感知。驗證：登入後 featurePerms Signal 有值，hasFeaturePerm 回傳正確

## 6. 前端 — 角色管理頁面重構（Decision 2: 漸進式三欄 UI（操作等級 → 編輯範圍 → 查看範圍））

- [x] 6.1 重寫 `role-management-page.component.ts` 的角色編輯邏輯：載入 features + 角色 feature perms，建立以 feature_id 為 key 的 Signal 狀態管理，依 Decision 2: 漸進式三欄 UI（操作等級 → 編輯範圍 → 查看範圍）。實作漸進式三欄互動邏輯。複用的現有服務與元件包含 NotificationService、OrgUnitService。需要修改的現有檔案：role-management-page 三檔。對應需求：角色權限設定介面 — 操作等級切換重設範圍、查看範圍自動校正 場景。驗證：開啟角色編輯 Modal，切換操作等級時 scope dropdown 正確顯示/隱藏/自動校正
- [x] 6.2 重寫 `role-management-page.component.html` 模板：模組分區可折疊的 feature 清單（Decision 3: Feature 清單分模組折疊），每行三欄（操作等級 dropdown、編輯範圍 dropdown、查看範圍 dropdown）。對應需求：角色權限設定介面 — 模組分區可折疊、編輯角色權限 — 漸進式三欄 場景；標籤完整中文化 — 所有功能標籤顯示中文、所有操作等級標籤顯示中文、所有範圍標籤顯示中文 場景。驗證：畫面無英文 fallback，所有 feature 名稱/操作/範圍為中文
- [x] 6.3 重寫 `role-management-page.component.scss` 樣式：使用 SCSS Mixins（@include card）、莫蘭迪色系風格、漸進式三欄排版。對應需求：角色權限設定介面。驗證：視覺檢查符合 Design System 風格
- [x] 6.4 實作角色權限唯讀檢視模式：檢視時 dropdown 改為文字標籤。對應需求：角色權限設定介面 — 角色權限唯讀檢視 場景。驗證：點擊角色卡片的「檢視權限」按鈕，顯示唯讀版面
- [x] 6.5 實作儲存功能：收集所有 feature permission 狀態，呼叫 `updateRoleFeaturePerms()`，成功後刷新角色列表並顯示 NotificationService 通知。對應需求：角色權限設定介面 — 儲存角色權限 場景；Bulk update role feature permissions。驗證：修改權限後儲存，重新載入角色確認資料已更新

## 7. 前端 — 權限可視化頁面適配

- [x] 7.1 修改 `permission-visualization-page` 以支援 feature-based permissions 顯示：選擇使用者後顯示 feature 權限矩陣。對應需求：權限可視化頁面適配 — 使用者有效權限顯示 feature 模型 場景。驗證：選擇使用者後顯示 feature 分模組權限表

## 8. 前端 — 標籤修復（即時修正）（Decision 4: 新舊模型並存過渡策略）

- [x] 8.1 修復 `role-management-page.component.ts` 中 `getResourceLabel()` 和 `getActionLabel()` 的映射，補齊所有缺失的中文標籤（approval→簽核管理、audit→審計日誌、export→匯出功能、reject→拒絕、meeting→會議管理、job_description→職務說明書 等）。對應需求：標籤完整中文化 — 舊版權限標籤也顯示中文 場景。驗證：現有角色權限檢視頁面所有標籤為中文
- [x] 8.2 同步修復 `permission-visualization-page.component.ts` 中的 `getResourceLabel()` 和 `getActionLabel()` 映射。對應需求：標籤完整中文化 — 舊版權限標籤也顯示中文 場景。驗證：權限可視化頁面所有標籤為中文

## 9. 整合驗證

- [x] 9.1 Angular build 驗證：`cd bombus-system && npx ng build --configuration=development` 無錯誤。驗證：build 成功，無 TS 錯誤
- [x] 9.2 後端伺服器重啟驗證：重啟 server，確認 demo 租戶 DB 遷移成功（features 表 16 筆、5 個預設角色 feature perms 正確）。對應需求：Feature definition table、Default role feature permission seeding。驗證：`SELECT * FROM features` 回傳 16 筆
- [x] 9.3 端到端流程測試：以 admin@demo.com 登入 → 進入 settings/roles → 編輯 hr_manager 角色權限 → 修改 recruitment_jobs 為 view/company → 儲存 → 重新開啟確認已儲存。對應需求：角色權限設定介面 — 儲存角色權限 場景。驗證：資料持久化且 UI 顯示正確
