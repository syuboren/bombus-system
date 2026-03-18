## 1. 後端 — Feature 種子資料更新（tenant-schema.js）

- [x] 1.1 更新 `FEATURE_SEED_DATA`：將 16 筆改為 40 筆，Decision 1：採用側邊欄 `L#.xxx` 作為統一 ID 格式，確保 Feature IDs match sidebar identifiers — 檔案：`server/src/db/tenant-schema.js:35-55`；驗證：陣列長度 40，每個 ID 與 `sidebar.component.ts` featureId 一致
- [x] 1.2 更新 `DEFAULT_ROLE_FEATURE_PERMS`：使用新 ID 格式，Decision 5：DEFAULT_ROLE_FEATURE_PERMS 擴展策略，為 5 個系統角色設定 Default role permissions for new features — 檔案：`server/src/db/tenant-schema.js:63-154`；驗證：每個角色有 40 個功能映射

## 2. 後端 — 既有租戶遷移邏輯（tenant-db-manager.js）

- [x] 2.1 在 `_runMigrations()` 的 `seedFeatureData()` 之前新增 Existing tenant data migration 遷移區塊，Decision 2：遷移順序 — 先 rename 再 seed — 先 UPDATE `role_feature_perms`（FK），再 UPDATE `features`（PK），最後 DELETE 移除 `career_path`/`ai_career` — 檔案：`server/src/db/tenant-db-manager.js:366` 之後；驗證：既有租戶 DB 載入後舊 ID 正確重命名

## 3. 後端 — API 方案過濾（tenant-admin.js）

- [x] [P] 3.1 新增共用 helper `getEnabledModules(req)` — Decision 3：API 過濾邏輯 — 抽取共用 helper，查詢平台 DB 的 `subscription_plans.features` 回傳 Set 或 null — 檔案：`server/src/routes/tenant-admin.js`；驗證：helper 正確解析 modules 格式
- [x] [P] 3.2 修改 `GET /features` 端點，加入 API filters features by tenant subscription plan 邏輯 — SYS 始終可見，無方案時優雅降級不過濾 — 檔案：`server/src/routes/tenant-admin.js:773-788`；驗證：只開通 L1/L2 的租戶只收到 L1/L2/SYS 功能
- [x] [P] 3.3 修改 `GET /roles/:id/feature-perms` 端點，加入相同的模組過濾邏輯 — 檔案：`server/src/routes/tenant-admin.js:794-806`；驗證：feature-perms 回傳也依方案過濾

## 4. 前端 — TypeScript 型別與常數更新

- [x] [P] 4.1 更新 `FeatureModule` 型別 — Frontend module type supports L3 through L6，Decision 4：前端模組常數擴展 — 檔案：`src/app/features/tenant-admin/models/tenant-admin.model.ts`；驗證：型別包含 L1-L6 + SYS
- [x] [P] 4.2 更新 `merge-feature-perms.ts` 的 `MODULE_LABELS` 和 `MODULE_ORDER` — 加入 L3-L6 標籤 — 檔案：`src/app/features/tenant-admin/utils/merge-feature-perms.ts:28-37`；驗證：MODULE_ORDER 為 7 個元素
- [x] [P] 4.3 更新 `role-management-page.component.ts` 本地 `MODULE_LABELS` 和 `moduleOrder` — 加入 L3-L6 標籤 — 檔案：`src/app/features/tenant-admin/pages/role-management-page/role-management-page.component.ts:31-35, 112-115`；驗證：本地常數與共用常數一致

## 5. 驗證

- [x] 5.1 執行 `cd bombus-system && npx ng build --configuration=development` 確認全專案編譯通過
