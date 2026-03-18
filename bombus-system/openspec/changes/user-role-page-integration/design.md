## Context

目前租戶管理模組包含「使用者管理」和「角色權限管理」兩個獨立頁面。使用者管理頁的角色指派 Modal 只有角色名稱下拉選單，管理員無法在指派流程中得知角色的功能權限內容。角色管理頁也沒有顯示角色被使用的情況。兩頁之間缺乏資訊串連。

### 現有元件與服務

| 元件/服務 | 路徑 | 狀態 |
|---|---|---|
| TenantAdminService | `features/tenant-admin/services/tenant-admin.service.ts` | 已有 `getRoleFeaturePerms()`，需加 `getRoleUsers()` |
| 角色管理頁 | `pages/role-management-page/*.{ts,html,scss}` | 已有功能權限檢視/編輯 Modal |
| 使用者管理頁 | `pages/user-management-page/*.{ts,html,scss}` | 需大幅增強角色指派 Modal |
| 權限可視化頁 | `pages/permission-visualization-page/*.ts` | 有合併邏輯，需抽取為共用工具 |
| NotificationService | `core/services/notification.service.ts` | 複用 |

### 現有 API

- `GET /api/tenant-admin/roles` — 已回傳 `user_count`（前端 `Role` 介面未接）
- `GET /api/tenant-admin/roles/:id/feature-perms` — 回傳 `{ featurePerms: RoleFeaturePerm[] }`
- `GET /api/tenant-admin/user-roles/:userId` — 回傳使用者已指派角色列表

## Goals / Non-Goals

**Goals:**

- 使用者管理的角色指派流程可即時預覽角色功能權限
- 已指派角色可一鍵展開權限明細
- 提供合併後有效權限總覽
- 角色管理頁顯示角色使用人數與使用者清單

**Non-Goals:**

- 不修改功能權限的編輯介面
- 不新增「從角色頁直接指派使用者」功能
- 不改動 permission-visualization-page 的 UI（僅重構合併邏輯）

## Decisions

### 共用合併工具函式

**決策**：從 `permission-visualization-page` 抽取合併邏輯至 `features/tenant-admin/utils/merge-feature-perms.ts`，導出 `mergeFeaturePerms()`、`groupByModule()`、`MODULE_LABELS`、`MODULE_ORDER`。

**替代方案**：建一個 `FeaturePermService` 注入服務。但合併邏輯為純函式，無副作用也不需依賴注入，工具函式更簡單且可 tree-shake。

### 新增後端端點

**決策**：新增 `GET /api/tenant-admin/roles/:id/users`，SQL JOIN `user_roles + users + org_units` 回傳 `{ users: RoleUser[] }`。

**替代方案**：前端從 `getUsers()` 做 client-side filter。但使用者清單可能很大，且跨頁重複載入浪費頻寬。

### 角色預覽載入策略

**決策**：在角色指派 Modal 中，選擇角色時 on-demand 呼叫 `getRoleFeaturePerms(roleId)` 載入預覽。已指派角色的權限展開也是 on-demand 且 cache 在 `expandedRolePerms` Map 中。

**替代方案**：Modal 開啟時批次載入所有角色權限。但角色數量不定，且大部分角色不會被選中，按需載入更經濟。

### 有效權限合併策略

**決策**：使用 `forkJoin` 並行載入所有已指派角色的 feature perms，再呼叫 `mergeFeaturePerms()` 合併。結果 cache 在 `effectivePerms` signal 中，指派/移除角色後重新計算。

**替代方案**：新增後端端點一次回傳合併結果。但 `/api/auth/my-feature-perms` 只對當前登入者有效，若要查詢任意使用者需新增端點。目前角色數通常 1-3 個，前端合併效率足夠。

### Modal 尺寸調整

**決策**：使用者管理的角色指派 Modal 從 `--lg (640px)` 擴大至 `--xl (900px)` 以容納功能權限表格。角色管理頁的使用者清單 Modal 維持預設 `480px`。

### SCSS 模組色與樣式複用

系統管理模組色為 `$module-color: $color-brand-main`。功能權限表格的 class 命名（`.feature-perm-table`、`.fpt-header`、`.fpt-row`、`.fp-tag` 等）在各頁面 SCSS 中獨立定義（Angular 元件封裝），保持與角色管理頁和權限可視化頁相同的視覺風格。

使用的 Mixins：`@include card`、`@include modal-*`、`@include button-base`、`@include button-primary`、`@include button-secondary`、`@include flex-start`、`@include flex-between`、`@include flex-center`、`@include flex-column`、`@include status-badge-color`、`@include fade-in`、`@include text-truncate`。

## Risks / Trade-offs

- **多次 API 呼叫**：有效權限合併需對每個角色各發一次 API 請求（`forkJoin`）。典型場景 1-3 個角色問題不大；若使用者有 5+ 角色可能略慢 → 後續可考慮新增後端合併端點
- **Template 中呼叫 `groupPermsByModule()`**：Feature 2 在 `@for` 內呼叫方法，每次 change detection 都會執行 → 資料量小（16 features）影響可忽略，必要時可改用 pre-computed Map
- **Modal 捲動**：角色指派 Modal 內容大幅增加（預覽 + 展開 + 有效權限），需確保 `modal-body` 的 `overflow-y: auto` + `max-height` 正常運作
