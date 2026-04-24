## Context

`permission.js` 已有完整的 `checkEditScope(req, targetRecord, options)` 函數（第 428-489 行），接受目標記錄並根據 `perm.edit_scope` 驗證：
- `self`：`targetRecord.employee_id === req.user.employeeId`
- `department`：`targetRecord.org_unit_id` 在使用者部門及子部門內
- `company`：`targetRecord.org_unit_id` 在使用者子公司範圍內

此函數已匯出、已在 `employee.js` 匯入，但從未被呼叫。

修改僅涉及 `server/src/routes/employee.js` 一個檔案。

## Goals / Non-Goals

**Goals:**
- 所有 6 個 L1 寫入端點在執行寫入前呼叫 `checkEditScope()` 驗證
- 驗證失敗時回傳 403 Forbidden

**Non-Goals:**
- 不修改 `checkEditScope()` 函數本身
- 不處理 L2~L6 模組
- 不修改前端

## Decisions

### 在 PUT /:id 加入 edit_scope 驗證

目前使用 `buildScopeFilter()` 確認員工存在且在 view_scope 內。保留此查詢（仍需確認員工可見），但在實際更新前加入 `checkEditScope()` 驗證：

```javascript
const employee = req.tenantDB.prepare('SELECT * FROM employees WHERE id = ?').get(id);
const editCheck = checkEditScope(req, employee, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
if (!editCheck.allowed) {
  return res.status(403).json({ error: editCheck.message });
}
```

注意：`checkEditScope` 的 `employeeIdField` 預設為 `employee_id`，但 employees 表的主鍵是 `id`，需傳入 `{ employeeIdField: 'id' }`。

### 在文件端點加入 edit_scope 驗證

文件端點操作的對象是 `employee_documents` 表。需先查出文件對應的 `employee_id`，再用該員工的記錄做 scope 檢查：

```javascript
const employee = req.tenantDB.prepare('SELECT * FROM employees WHERE id = ?').get(doc.employee_id);
const editCheck = checkEditScope(req, employee, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
```

### 在建立員工端點加入 edit_scope 驗證

建立員工時尚無目標記錄，改為驗證 `org_unit_id` 是否在 edit_scope 範圍內：

```javascript
const editCheck = checkEditScope(req, { id: null, org_unit_id: req.body.org_unit_id }, { employeeIdField: 'id', orgUnitField: 'org_unit_id' });
```

`self` scope 的使用者因 `id: null !== req.user.employeeId` 會被拒絕（符合預期：個人 scope 不應建立新員工）。

### 在建立帳號端點加入 edit_scope 驗證

先查出目標員工記錄，再驗證 edit_scope。

## Risks / Trade-offs

- **[Risk] super_admin 繞過** → `checkEditScope()` 已在內部處理 super_admin（`action_level` 不為 none 且 roles 包含 super_admin 時回傳 allowed），無需額外處理
- **[Risk] 前端 403 體驗** → 前端已根據權限隱藏操作按鈕，403 只作為後端防護。如使用者透過非正常方式觸發，403 回應是合理的
