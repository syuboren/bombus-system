## Why

功能權限管理頁面（角色管理 → 編輯/檢視功能權限）顯示的功能清單與使用者在側邊欄看到的功能項目完全不一致。這導致租戶管理員在設定角色權限時，無法直覺地對應「這個權限控制的是哪個畫面」，嚴重影響權限管理的使用體驗。

具體問題：
- **ID 格式斷裂**：後端 features 表用 `recruitment_jobs` 格式，側邊欄用 `L1.jobs` 格式，兩套系統各自獨立
- **名稱不一致**：如「員工檔案管理」vs 側邊欄的「員工檔案與歷程管理」
- **功能缺失**：L1 缺入職管理、L3-L6 全部 25 個功能未定義、SYS 缺角色權限管理
- **無租戶方案過濾**：`GET /features` API 回傳所有功能，未依租戶訂閱方案過濾，導致只開通 L1/L2 的租戶也看到 L3-L6（但這些模組根本不可用）

**影響模組**：L1-L6 全部模組 + SYS 系統管理，涉及路由 `/employee`、`/competency`、`/training`、`/project`、`/performance`、`/culture`、設定頁

## What Changes

- **統一 Feature ID 格式**：後端 `FEATURE_SEED_DATA` 改用側邊欄的 `L#.xxx` 格式（如 `L1.jobs`、`L2.grade-matrix`），因為側邊欄是用戶面對的 UI 真實來源，且 `FeatureGateService` 已用此格式做模組前綴比對
- **補齊全部功能定義**：從 16 筆擴充至 40 筆，完全對齊側邊欄 `sidebar.component.ts` 中的功能項目
- **新增遷移邏輯**：在 `tenant-db-manager.js` 的 `_runMigrations()` 中加入舊 ID → 新 ID 的重命名遷移，確保既有租戶資料無縫升級
- **API 方案過濾**：`GET /features` 和 `GET /roles/:id/feature-perms` 依租戶的 `subscription_plans.features` 過濾回傳，SYS 模組始終可見
- **前端型別擴展**：`FeatureModule` 型別加入 L3-L6，`MODULE_LABELS` / `MODULE_ORDER` 常數同步擴展

### Non-goals（不在範圍內）

- 不修改側邊欄的 featureId 格式（它是正確的來源）
- 不修改 `FeatureGateService` 邏輯（已正確運作）
- 不新增 L3-L6 的實際功能頁面（僅補齊權限定義）
- 不修改 `subscription_plans` 的資料結構或管理介面

## Capabilities

### New Capabilities

- `feature-permission-plan-filtering`: 功能權限 API 依租戶訂閱方案過濾，只回傳該租戶已開通模組的功能項目

### Modified Capabilities

（無既有 specs）

## Impact

- 受影響的 API：`GET /api/tenant-admin/features`、`GET /api/tenant-admin/roles/:id/feature-perms`
- 受影響的後端檔案：
  - `server/src/db/tenant-schema.js`（FEATURE_SEED_DATA + DEFAULT_ROLE_FEATURE_PERMS）
  - `server/src/db/tenant-db-manager.js`（遷移邏輯）
  - `server/src/routes/tenant-admin.js`（API 過濾）
- 受影響的前端檔案：
  - `src/app/features/tenant-admin/models/tenant-admin.model.ts`（FeatureModule 型別）
  - `src/app/features/tenant-admin/utils/merge-feature-perms.ts`（MODULE_LABELS / MODULE_ORDER）
  - `src/app/features/tenant-admin/pages/role-management-page/role-management-page.component.ts`（本地常數）
- 資料遷移：既有租戶 DB 中 `features` 和 `role_feature_perms` 表的 ID 欄位將被重命名
