## Why

管理員更新員工 email 後，員工仍須使用「舊 email」才能登入系統。原因是系統維護了兩份 email：`employees.email`（HR 記錄）與 `users.email`（登入憑證），員工資料更新時只修改前者，後者未同步。帳號管理 UI 標示「登入 Email」卻顯示 `employees.email`，讓管理員誤以為登入 email 已更新，導致重設密碼後仍無法登入的嚴重使用體驗問題。

## What Changes

- 員工 email 更新時，同步更新對應 `users.email`，確保兩者永遠一致
- 帳號與權限對話框改為顯示 `users.email`（真正的登入 email），而非 `employees.email`
- 員工列表 API 回傳 `users.email` 欄位，供前端帳號管理使用

## Non-Goals

- 不處理員工帳號的 email 驗證流程（如寄送驗證信）
- 不實作讓員工自行修改 email 的功能
- 不回溯修復已脫鉤的歷史資料（可後續用 migration 處理）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

（無 — 此為實作層 bug 修復，不涉及 spec 層級的行為需求變更）

## Impact

- 影響模組：L1 員工管理（`/employee`）
- 影響後端檔案：
  - `server/src/routes/employee.js` — 員工更新 API 需同步 `users.email`；列表 API 需回傳 `users.email`
  - `server/src/services/account-creation.js` — 確認重設密碼流程無需修改（已正確）
- 影響前端檔案：
  - `src/app/shared/components/account-permission/account-permission.component.ts` — 接收並顯示 `users.email`
  - `src/app/shared/components/account-permission/account-permission.component.html` — 「登入 Email」顯示來源變更
  - `src/app/features/employee/pages/employee-management/employee-management.component.ts` — 傳遞 `userEmail` 給帳號對話框
