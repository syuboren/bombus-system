## Context

系統有兩張表各自維護 email：
- `employees.email` — HR 員工記錄，管理員可透過員工編輯功能修改
- `users.email` — 登入憑證，帳號建立時從 `employees.email` 複製，之後不再同步

當管理員修改員工 email 後，`users.email` 仍為舊值，但前端帳號管理 UI 顯示的是 `employees.email`，導致管理員誤以為登入 email 已更新。

現有檔案：
- 後端：`server/src/routes/employee.js`（員工 CRUD + 列表 API）
- 後端：`server/src/services/account-creation.js`（帳號建立 + 重設密碼）
- 前端：`src/app/shared/components/account-permission/account-permission.component.ts|html`
- 前端：`src/app/features/employee/pages/employee-management/employee-management.component.ts`

## Goals / Non-Goals

**Goals:**
- 員工 email 更新時，同步更新 `users.email`
- 帳號對話框顯示真正的登入 email（`users.email`）
- 員工列表 API 回傳 `users.email` 供前端使用

**Non-Goals:**
- 不實作 email 驗證流程（寄驗證信）
- 不回溯修復已脫鉤的歷史資料
- 不允許員工自行修改 email

## Decisions

### 後端：員工 email 更新同步 users.email

在 `employee.js` 的 PUT `/api/employee/:id` 路由中，當 `email` 欄位被修改時，同步執行：

```sql
UPDATE users SET email = ? WHERE id = (
  SELECT user_id FROM employees WHERE id = ?
)
```

- 使用 `db.transaction()` 確保 employees 和 users 的更新是原子操作
- 需處理 email 唯一性衝突：若新 email 已被其他 user 使用，回傳 409 錯誤

**為什麼不用 trigger**：sql.js 不支援 SQL trigger，且明確的應用層同步更易除錯。

### 後端：員工列表 API 回傳 users.email

在 `/api/employee/list` 的 SQL JOIN 中加入 `users.email AS user_email`：

```sql
SELECT e.*, u.id AS userId, u.status AS userStatus, u.email AS userEmail
FROM employees e
LEFT JOIN users u ON e.user_id = u.id
```

- 不改變現有 `e.email` 的回傳（保持向後相容）
- 新增 `userEmail` 欄位供帳號管理使用

### 前端：帳號對話框顯示 users.email

`account-permission.component.ts` 的 `employeeEmail` input 改為接收 `userEmail`：

- `employee-management.component.ts` 傳遞 `employee.userEmail ?? employee.email` 作為 fallback
- 帳號對話框的「登入 Email」欄位改為顯示此值

## Risks / Trade-offs

- **[Risk] email 唯一性衝突** → 若管理員將員工 email 改為已被其他使用者佔用的 email，更新會失敗。Mitigation：回傳明確的 409 錯誤訊息「此 email 已被其他帳號使用」
- **[Risk] 沒有 user 帳號的員工** → 部分員工可能尚未建立帳號（`user_id` 為 null）。Mitigation：僅在 `user_id` 存在時才同步 `users.email`
- **[Trade-off] 不回溯歷史資料** → 已脫鉤的資料需手動修復或後續寫 migration。選擇此方案是因為無法確定哪個 email 才是正確的
