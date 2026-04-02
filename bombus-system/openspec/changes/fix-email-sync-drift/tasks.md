## 1. 後端：員工列表 API 回傳 userEmail

- [x] 1.1 後端：員工列表 API 回傳 users.email — 修改 `server/src/routes/employee.js` 的 `/api/employee/list` SQL JOIN，加入 `u.email AS userEmail`
  - 驗證：呼叫 API 確認回傳的 JSON 包含 `userEmail` 欄位

## 2. 後端：員工 email 更新同步 users.email

- [x] 2.1 修改 `server/src/routes/employee.js` 的 PUT `/api/employee/:id`，當 email 變更且 `user_id` 存在時，使用 `db.transaction()` 同步更新 `users.email`（employee email update synchronizes user login email）
  - 驗證：更新員工 email 後，查詢 `users` 表確認 email 已同步
- [x] 2.2 加入 email 唯一性衝突處理：若新 email 已被其他 user 使用，回傳 409 錯誤（email already in use conflict）
  - 驗證：嘗試更新為已存在的 email，確認收到 409 回應
  - 依賴：2.1

## 3. 前端：帳號對話框顯示 users.email

- [x] 3.1 修改 `employee-management.component.ts`，傳遞 `employee.userEmail ?? employee.email` 給帳號對話框（account management dialog displays user login email）
  - 驗證：開啟帳號對話框，確認「登入 Email」顯示的是 `users.email`
  - 依賴：1.1
- [x] 3.2 修改 `account-permission.component.ts` 和 `.html`，將 `employeeEmail` input 的語意改為接收 userEmail
  - 驗證：型別檢查通過、建置成功
  - 依賴：3.1

## 4. 驗證

- [x] 4.1 端到端測試：修改員工 email → 帳號對話框顯示新 email → 用新 email 登入成功
  - 依賴：2.1, 3.2
