## 1. 共用基礎設施（Model + 共用合併工具函式 + Service）

- [x] 1.1 [P] 更新 `tenant-admin.model.ts`：`Role` 介面加 `user_count?: number`，新增 `RoleUser` 介面（現有元件與服務、現有 API 確認） — 驗證：TypeScript 編譯通過
- [x] 1.2 [P] 新建共用合併工具 `utils/merge-feature-perms.ts`（shared permission merge utility）：導出 `mergeFeaturePerms()`、`groupByModule()`、`MODULE_LABELS`、`MODULE_ORDER` — 驗證：import 後 TypeScript 編譯通過
- [x] 1.3 重構 `permission-visualization-page.component.ts`：移除內聯合併邏輯，改用 `mergeFeaturePerms()` 工具函式 — 驗證：Angular build 通過，權限可視化頁行為不變

## 2. 後端 — 新增後端端點（Role users API endpoint）

- [x] 2.1 實作 role users API endpoint：新增 `GET /api/tenant-admin/roles/:id/users` 至 `tenant-admin.js`，JOIN user_roles + users + org_units，回傳 `{ users: RoleUser[] }`，角色不存在時回傳 404 — 驗證：curl 測試回傳正確 JSON

## 3. Service 層更新

- [x] 3.1 `tenant-admin.service.ts` 新增 `getRoleUsers(roleId): Observable<RoleUser[]>` — 依賴 2.1；驗證：TypeScript 編譯通過

## 4. 角色管理頁 — Role card user count display + Role users list modal

- [x] 4.1 `role-management-page.component.ts`：新增 `showRoleUsers`/`roleUsersRole`/`roleUsers`/`loadingRoleUsers` signals + `openRoleUsers()`/`closeRoleUsers()` 方法（SCSS 模組色與樣式複用） — 依賴 3.1
- [x] 4.2 `role-management-page.component.html`：角色卡片加 `role-card__stats` 區塊顯示 role card user count display「已指派 N 位使用者」；新增 role users list modal 顯示使用者清單 — 依賴 4.1
- [x] 4.3 `role-management-page.component.scss`：新增 `.role-card__stats`/`.stat-link`/`.user-list`/`.user-list-item`/`.user-avatar`/`.user-detail` 樣式 — 依賴 4.2；驗證：Angular build 通過，角色卡片正確顯示人數，點擊彈出使用者列表

## 5. 使用者管理頁 — Role selection permission preview（角色預覽載入策略）

- [x] 5.1 `user-management-page.component.ts`：新增 `previewRolePerms`/`loadingPreview` signals + `onAssignRoleChange()`（角色預覽載入策略：on-demand 載入）+ computed `previewByModule`/`previewModules` + helper methods — 依賴 1.2
- [x] 5.2 `user-management-page.component.html`：角色 select (change) 改呼叫 `onAssignRoleChange()`，下方插入 `.role-preview` 區塊顯示 compact tag 權限預覽，實現 role selection permission preview — 依賴 5.1
- [x] 5.3 `user-management-page.component.scss`：新增 `.role-preview`/`.preview-label`/`.feature-perm-compact`/`.fpc-module`/`.fpc-features` + 共用 `.fp-tag`/`.spin` 樣式 — 依賴 5.2；驗證：Angular build 通過，選擇角色後顯示預覽

## 6. 使用者管理頁 — Assigned role permission detail expand

- [x] 6.1 `user-management-page.component.ts`：新增 `expandedRolePerms` Map + `expandedRoleIds`/`loadingRolePerms` Set + `toggleRolePermView()`/`isRoleExpanded()`/`isRoleLoading()`/`getRolePerms()`/`groupPermsByModule()` 方法，實現 assigned role permission detail expand — 依賴 5.1
- [x] 6.2 `user-management-page.component.html`：重構 `.current-role-item` 為 `.current-role-item-wrapper`，加「查看權限」按鈕 + 可折疊 `.role-perms-expand` 以 `.feature-perm-table--compact` 顯示 4 欄權限表 — 依賴 6.1
- [x] 6.3 `user-management-page.component.scss`：新增 `.current-role-item-wrapper`/`.role-actions`/`.btn-outline`/`.role-perms-expand` + `.feature-perm-table`/`.fpt-*`/`.fp-placeholder` 樣式 — 依賴 6.2；驗證：Angular build 通過，點擊「查看權限」展開權限明細

## 7. 使用者管理頁 — User effective permissions display（有效權限合併策略）

- [x] 7.1 `user-management-page.component.ts`：新增 `effectivePerms`/`showEffectivePerms`/`loadingEffective` signals + `toggleEffectivePerms()`/`loadEffectivePerms()`（有效權限合併策略：forkJoin + mergeFeaturePerms）+ computed `effectiveByModule`/`effectiveModules`，實現 user effective permissions display — 依賴 1.2, 6.1
- [x] 7.2 `user-management-page.component.html`：`assign-section` 下方插入 `.effective-section`，含收合按鈕「有效權限（合併後）」+ `.feature-perm-table` 顯示合併結果 — 依賴 7.1
- [x] 7.3 `user-management-page.component.scss`：新增 `.effective-section`/`.effective-toggle`/`.effective-perms-content` 樣式；Modal 尺寸調整加 `--xl { max-width: 900px }` — 依賴 7.2；驗證：Angular build 通過，有效權限正確合併顯示

## 8. 最終驗證

- [x] 8.1 執行 `cd bombus-system && npx ng build --configuration=development` 確認全專案編譯通過，無錯誤或警告
