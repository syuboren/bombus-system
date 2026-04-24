## 1. 後端：員工更新端點加入 edit_scope 驗證

- [x] 1.1 在 PUT /:id 加入 edit_scope 驗證 — 更新前呼叫 `checkEditScope()`，不通過回傳 403（employee update endpoint enforces edit_scope）
  - 驗證：edit_scope=self 的使用者更新非自己的員工記錄，收到 403

## 2. 後端：文件端點加入 edit_scope 驗證

- [x] 2.1 在文件端點加入 edit_scope 驗證 — POST `/employee/documents` 上傳文件前驗證 employee_id（document endpoints enforce edit_scope）
  - 驗證：edit_scope=self 的使用者上傳非自己的文件，收到 403
- [x] 2.2 PUT `/employee/documents/:id` — 更新文件前查出文件擁有者，驗證 edit_scope
  - 驗證：edit_scope=self 的使用者更新非自己的文件，收到 403
  - 依賴：2.1
- [x] 2.3 DELETE `/employee/documents/:id` — 刪除文件前查出文件擁有者，驗證 edit_scope
  - 驗證：edit_scope=self 的使用者刪除非自己的文件，收到 403
  - 依賴：2.1

## 3. 後端：建立員工與帳號端點加入 edit_scope 驗證

- [x] 3.1 在建立員工端點加入 edit_scope 驗證 — POST `/employee` self scope 使用者不得建立新員工（employee creation endpoint enforces edit_scope）
  - 驗證：edit_scope=self 的使用者建立新員工，收到 403
- [x] 3.2 在建立帳號端點加入 edit_scope 驗證 — POST `/employee/:id/create-account` 驗證目標員工（account creation endpoint enforces edit_scope）
  - 驗證：edit_scope=self 的使用者為非自己建立帳號，收到 403

## 4. 整合測試

- [x] 4.1 撰寫 `test-edit-scope.js` — 驗證 edit_scope=self 的使用者無法編輯/上傳/刪除他人記錄、edit_scope=department 可編輯部門內員工
  - 依賴：1.1, 2.3, 3.2
