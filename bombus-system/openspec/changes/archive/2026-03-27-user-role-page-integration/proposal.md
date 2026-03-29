## Why

使用者管理頁面的「角色指派 Modal」與角色權限管理頁面完全斷裂 — 管理員在指派角色給使用者時，看不到該角色擁有哪些功能權限（等於盲選），且角色管理頁也無法得知有多少人正在使用某個角色。這導致權限管理的操作效率低落，管理員必須在兩個頁面之間來回切換才能完成一次角色指派決策。

此變更影響 **系統管理** 模組（`/tenant-admin`）的「使用者管理」與「角色權限管理」兩個子頁面。

## What Changes

**使用者管理頁面（角色指派 Modal 增強）**：
- 選擇角色時，即時顯示該角色的功能權限預覽（compact tag 格式）
- 已指派的每個角色旁新增「查看權限」按鈕，可展開該角色的完整功能權限明細表
- Modal 底部新增可收合的「有效權限（合併後）」區塊，顯示使用者所有角色合併後的最高功能權限

**角色權限管理頁面**：
- 每張角色卡片顯示「已指派 N 位使用者」，點擊可彈出使用者清單 Modal

**共用基礎設施**：
- 抽取權限合併邏輯為共用工具函式（避免 permission-visualization-page 與 user-management-page 重複實作）
- 新增後端 API `GET /api/tenant-admin/roles/:id/users` 查詢角色指派清單
- `Role` 介面補齊 `user_count` 欄位（後端已回傳但前端未對接）

## Non-goals（不在範圍內）

- 不改動功能權限的編輯流程（仍在角色管理頁的既有 Modal 操作）
- 不新增「從角色頁直接指派使用者」的功能（指派仍在使用者管理頁完成）
- 不改動 permission-visualization-page 的 UI，僅重構其合併邏輯為共用函式

## Capabilities

### New Capabilities

- `role-permission-preview`: 角色功能權限預覽 — 在使用者管理的角色指派流程中，提供角色權限的即時預覽、已指派角色權限展開、以及合併後有效權限顯示
- `role-user-listing`: 角色使用者清單 — 在角色管理頁面顯示角色被指派的人數，並提供使用者清單查詢

### Modified Capabilities

（無）

## Impact

- 影響模組：系統管理（`/tenant-admin`）
- 影響路由：`/tenant-admin/users`、`/tenant-admin/roles`
- 新增 API：`GET /api/tenant-admin/roles/:id/users`
- 新增資料模型：`RoleUser { id, name, email, scope_name? }`
- 修改資料模型：`Role` 加 `user_count?: number`
- 新建檔案：`features/tenant-admin/utils/merge-feature-perms.ts`（共用合併邏輯）
- 修改檔案：
  - `server/src/routes/tenant-admin.js`（新增端點）
  - `features/tenant-admin/models/tenant-admin.model.ts`
  - `features/tenant-admin/services/tenant-admin.service.ts`
  - `pages/user-management-page/*.{ts,html,scss}`
  - `pages/role-management-page/*.{ts,html,scss}`
  - `pages/permission-visualization-page/permission-visualization-page.component.ts`（重構合併邏輯）
