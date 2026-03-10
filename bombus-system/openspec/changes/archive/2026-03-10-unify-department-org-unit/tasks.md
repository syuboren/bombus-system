
## Group 1：後端 API SQL 統一


### 1.1 修改 hr-onboarding.js `GET /departments`

- [x] 將 SQL 從 `SELECT FROM departments` 改為 `SELECT FROM org_units LEFT JOIN departments`
- [x] 加入 `?parentId=xxx` 參數支援按子公司篩選
- [x] 保持回傳格式不變（`[{ id, name, code?, sort_order? }]`）
- [x] 保留 fallback 邏輯（若 org_units 無資料，從 employees.department 取）


### 1.2 修改 grade-matrix.js `GET /departments/list`

- [x] [P] 將 SQL 從 `SELECT FROM departments` 改為 `SELECT FROM org_units LEFT JOIN departments`
- [x] 保持回傳格式不變（`{ success, data: [{ id, name, code, sort_order }] }`）


## Group 2：前端入職 Modal 合併


### 2.1 修改 onboarding-convert-modal.component.ts

- [x] 移除 `departments` signal 宣告
- [x] 移除 `loadOptions()` 中的 `getDepartments()` 呼叫
- [x] 將 `onDepartmentChange(dept: string)` 改為 `onOrgUnitDepartmentChange(orgUnitId: string)`：接收 org_unit ID，反查 name，設定 department + orgUnitId，重置 position
- [x] 確認 `filteredPositions`、`filteredManagers` 仍正常（使用 `department()` 名稱比對，不受影響）


### 2.2 修改 onboarding-convert-modal.component.html

- [x] 將「部門」下拉資料來源從 `departments()` 改為 `departmentOrgUnits()`
- [x] `ngModel` 綁定改為 `orgUnitId()`，`ngModelChange` 改為 `onOrgUnitDepartmentChange($event)`
- [x] option 的 `[value]` 改為 `unit.id`，顯示文字為 `unit.name`
- [x] 移除「組織單位權限範圍」整個 `@if` 區塊
- [x] 加入 hint：「同時用於 HR 部門歸屬與 RBAC 權限範圍」


### 2.3 清理 onboarding-convert-modal.component.scss

- [x] [P] 移除 `.hint.success` 樣式（不再需要自動匹配提示）


## Group 3：驗證與測試


### 3.1 Build 驗證

- [x] 執行 `cd bombus-system && npx ng build --configuration=development`，確認 0 errors ✓

### 3.2 功能驗證場景（手動測試）

- [x] **場景 A — 入職 Modal**：開啟入職 Modal → 只有一個「部門」下拉 → 選擇部門 → 職位篩選正常 → 主管篩選正常
- [x] **場景 B — 子公司篩選**：切換子公司 → 部門列表更新 → 選部門 → orgUnitId 正確
- [x] **場景 C — 完整轉換**：完成候選人轉員工 → employees 有 department + org_unit_id → user_roles 有 org_unit_id
- [x] **場景 D — 職等矩陣**：開啟職等矩陣頁 → 部門篩選下拉正常 → 篩選功能正常
