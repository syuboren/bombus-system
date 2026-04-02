## Problem

L1 員工管理的寫入端點（編輯員工、上傳/更新/刪除文件、建立帳號）完全未檢查 `edit_scope` 權限。

以 `dept_manager` 角色為例：
- `L1.profile` 設定為 `view_scope=department, edit_scope=self`
- 預期：可檢視部門內所有員工，但只能**編輯自己的**資料
- 實際：可以編輯部門內**所有員工**的資料、上傳文件、甚至建立帳號

這是一個嚴重的權限漏洞 — 低權限使用者可以修改不應觸及的員工記錄。

## Root Cause

`checkEditScope()` 函數已在 `permission.js` 中正確實作並匯出，也在 `employee.js` 中匯入，但**從未被任何寫入端點呼叫**。

寫入端點（如 PUT `/:id`）錯誤地使用 `buildScopeFilter()`（設計給讀取操作、檢查 `view_scope`）來驗證寫入權限，導致 `edit_scope=self` 的使用者可以編輯整個部門的資料。

其他寫入端點（文件上傳/更新/刪除、建立員工、建立帳號）則完全沒有任何 scope 檢查。

## Proposed Solution

在所有 6 個寫入端點加入 `checkEditScope()` 驗證：

1. **PUT `/employee/:id`** — 更新員工前呼叫 `checkEditScope()`，不通過則回傳 403
2. **POST `/employee/documents`** — 上傳文件前驗證 `employee_id` 的 edit_scope
3. **PUT `/employee/documents/:id`** — 更新文件前驗證文件擁有者的 edit_scope
4. **DELETE `/employee/documents/:id`** — 刪除文件前驗證文件擁有者的 edit_scope
5. **POST `/employee`** — 建立員工時驗證 `org_unit_id` 的 edit_scope
6. **POST `/employee/:id/create-account`** — 建立帳號前驗證目標員工的 edit_scope

## Non-Goals

- 不修改 `checkEditScope()` 函數本身（已正確實作）
- 不處理其他模組（L2~L6）的 edit_scope 問題（僅修復 L1）
- 不修改前端 UI（前端已根據權限隱藏按鈕，但後端缺少防護）

## Success Criteria

1. `edit_scope=self` 的使用者更新**非自己**的員工記錄時，收到 403 回應
2. `edit_scope=self` 的使用者上傳/更新/刪除**非自己**的文件時，收到 403 回應
3. `edit_scope=department` 的使用者更新**部門外**的員工記錄時，收到 403 回應
4. 現有整合測試不受影響（super_admin 不受 scope 限制）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

（無 — 此為實作層安全修復，edit scope 驗證邏輯已存在，只是未被呼叫）

## Impact

- 影響模組：L1 員工管理（`/employee`）
- 影響後端檔案：
  - `server/src/routes/employee.js` — 6 個寫入端點需加入 edit scope 驗證
