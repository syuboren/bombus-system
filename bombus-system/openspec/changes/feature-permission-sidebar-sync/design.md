## Context

功能權限系統（Feature-Based Permission）的 features 表使用 `recruitment_jobs` 風格的 ID，而側邊欄（`sidebar.component.ts`）使用 `L1.jobs` 風格的 featureId。兩套 ID 系統從未統一，導致：

1. 權限管理頁面顯示的功能名稱與用戶在側邊欄看到的不同
2. `GET /api/tenant-admin/features` 回傳全部功能（含租戶未開通的模組）
3. L3-L6 共 25 個側邊欄功能未定義在 features 表中

現有架構：
- **FeatureGateService**（前端）：讀取 `currentUser().enabled_features`（來自 `subscription_plans.features`），使用 `L#.xxx` 格式做模組前綴比對，控制側邊欄可見性
- **features + role_feature_perms 表**（租戶 DB）：用 `recruitment_jobs` 風格 ID，與 FeatureGateService 完全斷裂
- **subscription_plans.features**（平台 DB）：JSON 格式 `{ modules: ['L1', 'L2', ...] }`，記錄租戶可用模組

需要修改的現有檔案：
- `server/src/db/tenant-schema.js` — FEATURE_SEED_DATA + DEFAULT_ROLE_FEATURE_PERMS
- `server/src/db/tenant-db-manager.js` — _runMigrations()
- `server/src/routes/tenant-admin.js` — GET /features + GET /roles/:id/feature-perms
- `src/app/features/tenant-admin/models/tenant-admin.model.ts` — FeatureModule 型別
- `src/app/features/tenant-admin/utils/merge-feature-perms.ts` — MODULE_LABELS / MODULE_ORDER
- `src/app/features/tenant-admin/pages/role-management-page/role-management-page.component.ts` — 本地 MODULE_LABELS

需要複用的現有服務：
- `getPlatformDB()`（`server/src/db/platform-db.js`）— 查詢訂閱方案
- `seedFeatureData()` / `seedDefaultRoleFeaturePerms()`（`tenant-schema.js`）— 冪等種子插入

## Goals / Non-Goals

**Goals：**

- 統一 Feature ID 格式為側邊欄的 `L#.xxx` 格式
- 功能清單從 16 筆擴充至 40 筆，完全對齊側邊欄
- API 依租戶訂閱方案過濾，SYS 模組始終可見
- 既有租戶 DB 無縫遷移（舊 ID 重命名、舊功能刪除）

**Non-Goals：**

- 不修改 FeatureGateService 邏輯
- 不修改側邊欄 featureId 格式
- 不新增 L3-L6 的實際功能頁面
- 不修改 subscription_plans 管理介面

## Decisions

### Decision 1：採用側邊欄 `L#.xxx` 作為統一 ID 格式

**選擇**：修改後端 FEATURE_SEED_DATA 的 ID 格式，統一為側邊欄已使用的 `L#.xxx` 格式。

**替代方案**：修改前端側邊欄改用後端的 `snake_case` 格式 → 拒絕，因為 FeatureGateService 的模組前綴比對（`featureId.split('.')[0]`）依賴點號分隔，改動範圍更大。

### Decision 2：遷移順序 — 先 rename 再 seed

在 `_runMigrations()` 中，遷移邏輯放在 `seedFeatureData()` **之前**：

1. `UPDATE role_feature_perms SET feature_id = 新ID WHERE feature_id = 舊ID`（先改 FK）
2. `UPDATE features SET id = 新ID WHERE id = 舊ID`（再改 PK）
3. `DELETE` 移除 `career_path`、`ai_career`（側邊欄無對應）
4. `seedFeatureData(db)` — `INSERT OR IGNORE` 補入新功能
5. `seedDefaultRoleFeaturePerms(db, roleMap)` — 補新角色權限

sql.js 的 `features` 表無 FK constraint（純 application-level 參照），因此 UPDATE 順序只要先改 role_feature_perms 即可。

### Decision 3：API 過濾邏輯 — 抽取共用 helper

在 `tenant-admin.js` 中新增 `getEnabledModules(req)` helper：

```
function getEnabledModules(req) {
  const platformDB = getPlatformDB();
  const tenant = platformDB.queryOne(
    'SELECT plan_id FROM tenants WHERE id = ?', [req.tenantId]
  );
  if (!tenant?.plan_id) return null; // 優雅降級：不過濾
  const plan = platformDB.queryOne(
    'SELECT features FROM subscription_plans WHERE id = ? AND is_active = 1',
    [tenant.plan_id]
  );
  if (!plan?.features) return null;
  try {
    const parsed = JSON.parse(plan.features);
    const modules = Array.isArray(parsed) ? parsed : parsed?.modules;
    return (Array.isArray(modules) && modules.length > 0) ? new Set(modules) : null;
  } catch { return null; }
}
```

過濾規則：`f.module === 'SYS' || enabledModules.has(f.module)`。當 `enabledModules` 為 null 時不過濾（與 FeatureGateService 的優雅降級策略一致）。

此 helper 用於 `GET /features` 和 `GET /roles/:id/feature-perms` 兩個端點。

### Decision 4：前端模組常數擴展

`FeatureModule` 型別擴展為 `'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6' | 'SYS'`。

MODULE_LABELS 和 MODULE_ORDER 同步擴展，需要修改三處：
1. `merge-feature-perms.ts`（共用工具）
2. `role-management-page.component.ts`（本地常數）
3. `permission-visualization-page.component.ts`（若有本地常數）

### Decision 5：DEFAULT_ROLE_FEATURE_PERMS 擴展策略

新增功能的預設權限遵循既有角色的權限等級模式：

| 角色 | L1-L6 業務功能 | SYS 功能 |
|------|---------------|----------|
| super_admin | edit / company / company | edit / company / company |
| subsidiary_admin | edit / company / company | view / company |
| hr_manager | edit / company / company | none |
| dept_manager | view / — / department | none |
| employee | view / — / self | none |

特例：`SYS.role-management` 只有 super_admin 可 edit，其餘 none。

## Risks / Trade-offs

**[Risk] 既有租戶的自訂角色權限遺失** → 遷移只做 ID rename（`UPDATE`），不會刪除使用者已設定的 action_level / scope。新增的功能會由 `seedDefaultRoleFeaturePerms` 對系統角色補預設值，自訂角色則由既有邏輯補 `none`。

**[Risk] 遷移冪等性** → 使用 `UPDATE ... WHERE feature_id = ?`，若舊 ID 不存在則影響 0 行，不會報錯。`INSERT OR IGNORE` 確保重複執行不會出問題。

**[Risk] sql.js `db.run()` 在事務外靜默吞錯** → 遷移區塊在 `_runMigrations()` 中執行，此方法在結尾呼叫 `adapter.save()`。根據已知 gotcha（見 MEMORY.md），不在事務中執行避免 `export()` 破壞事務。

**[Trade-off] 40 個功能 × 5 角色 = 200 條預設權限** → 資料量可控，`INSERT OR IGNORE` 效能可接受。

## Migration Plan

1. 後端部署時，`_runMigrations()` 自動執行：
   - 舊 ID rename → seedFeatureData 補新功能 → seedDefaultRoleFeaturePerms 補權限
2. 若需 rollback：手動將新 ID rename 回舊 ID（反向 UPDATE），但一般不需要
3. 前端無狀態變更，部署即生效

## Open Questions

（無）
