# 設計文件：統一部門與組織單位

## 架構概覽

### 現狀（Before）

```text
前端部門下拉資料來源（各自為政）：

入職 Modal（L1）
├── 部門下拉     ← getDepartments()       → /hr/onboarding/departments  → departments 表
├── 組織單位下拉 ← getOrgUnits()          → /hr/onboarding/org-units    → org_units 表
└── onDepartmentChange() → 名稱匹配 org_units → 設定 orgUnitId

職等矩陣（L2）
└── 部門篩選     ← getDepartments()       → /grade-matrix/departments/list → departments 表

組織管理
└── 部門列表     ← getDepartments()       → /organization/departments → org_units LEFT JOIN departments
```

### 目標（After）

```text
前端部門下拉資料來源（統一 org_units）：

入職 Modal（L1）
└── 部門下拉     ← departmentOrgUnits()（已由 getOrgUnits() 載入）
    ├── 選擇時同時設定 department（name）和 orgUnitId（id）
    └── 已按 selectedSubsidiaryId 篩選

職等矩陣（L2）
└── 部門篩選     ← getDepartments() → /grade-matrix/departments/list → org_units LEFT JOIN departments
    （後端 SQL 改，前端不動）

組織管理
└── 不變（本來就查 org_units）
```

## 後端變更

### hr-onboarding.js — `GET /departments`

```javascript
// Before：查 departments 表
SELECT id, name, code, sort_order FROM departments ORDER BY sort_order

// After：查 org_units，LEFT JOIN departments 取 code/sort_order
SELECT ou.id, ou.name, d.code, d.sort_order
FROM org_units ou
LEFT JOIN departments d ON d.name = ou.name
WHERE ou.type = 'department'
ORDER BY d.sort_order ASC, ou.name ASC
```

支援 `?parentId=xxx` 篩選子公司下的部門。保持回傳格式不變。

### grade-matrix.js — `GET /departments/list`

```javascript
// Before：查 departments 表
SELECT id, name, code, sort_order FROM departments ORDER BY sort_order

// After：查 org_units，LEFT JOIN departments 取 code/sort_order
SELECT ou.id, ou.name, d.code, d.sort_order
FROM org_units ou
LEFT JOIN departments d ON d.name = ou.name
WHERE ou.type = 'department'
ORDER BY d.sort_order ASC, ou.name ASC
```

回傳格式不變（`{ success, data: [{ id, name, code }] }`），前端不需修改。

## 前端變更

### onboarding-convert-modal.component.ts

#### 移除

```typescript
// 移除 signal
departments = signal<DepartmentOption[]>([]);

// 移除 loadOptions() 中的呼叫
this.onboardingService.getDepartments().subscribe({
  next: (depts) => this.departments.set(depts),
  error: () => this.departments.set([])
});
```

#### 修改 onDepartmentChange → onOrgUnitDepartmentChange

```typescript
// Before：接收部門名稱，再名稱匹配 org_unit
onDepartmentChange(dept: string): void {
  this.department.set(dept);
  this.position.set('');
  const matching = this.orgUnits().find(u =>
    u.type === 'department' && u.name === dept && ...
  );
  this.orgUnitId.set(matching?.id || '');
}

// After：接收 org_unit ID，反查名稱
onOrgUnitDepartmentChange(orgUnitId: string): void {
  this.orgUnitId.set(orgUnitId);
  const unit = this.orgUnits().find(u => u.id === orgUnitId);
  this.department.set(unit?.name || '');
  this.position.set('');
}
```

#### 保留

- `department` signal — 仍需儲存部門名稱（TEXT），用於 `employees.department`、`filteredPositions`、`filteredManagers`
- `orgUnitId` signal — 儲存 org_unit ID（用於 RBAC user_roles）

### onboarding-convert-modal.component.html

#### 部門欄位（替換整個區塊）

```html
<!-- Before：兩個下拉 -->
<select ... (ngModelChange)="onDepartmentChange($event)">
  @for (dept of departments(); track dept.name) { ... }
</select>
<!-- + 獨立的組織單位權限範圍下拉 -->

<!-- After：單一下拉 -->
<select id="department"
  [ngModel]="orgUnitId()"
  (ngModelChange)="onOrgUnitDepartmentChange($event)"
  [ngModelOptions]="{standalone: true}">
  <option value="">請選擇部門</option>
  @for (unit of departmentOrgUnits(); track unit.id) {
    <option [value]="unit.id">{{ unit.name }}</option>
  }
</select>
<span class="hint">同時用於 HR 部門歸屬與 RBAC 權限範圍</span>
```

#### 移除

- 整個「組織單位權限範圍」`@if` 區塊（L96-116）

### onboarding-convert-modal.component.scss

#### 移除

- `.hint.success` 樣式（不再需要自動匹配提示）

## 資料流

```text
使用者選擇部門（從 departmentOrgUnits 下拉）
  → orgUnitId = unit.id        （RBAC：user_roles.org_unit_id）
  → department = unit.name      （HR：employees.department TEXT）
  → position 重置               （依賴部門的 filteredPositions 重新篩選）
  → submit() 送出兩個值到後端
```

## 不修改的部分

| 項目 | 原因 |
| ---- | ---- |
| `departments` 表結構 | 組織管理 PUT API 使用其擴充欄位 |
| `organization.js` CRUD | 同步機制保留（建/改/刪部門時同步兩張表） |
| `department_positions` FK | 仍參照 `departments.name` |
| `employees.department` 欄位 | 仍為 TEXT，存部門名稱字串 |
| `onboarding.service.ts getDepartments()` | 保留方法定義，其他頁面可能引用 |
| 組織管理前端頁面 | 本來就用 `GET /api/organization/departments`（查 org_units） |
| `filteredPositions` computed | 仍用 `department()` 名稱比對 `department_positions` |
| `filteredManagers` computed | 仍用 `department()` 名稱比對 `managers` |

## 風險評估

| 風險 | 等級 | 緩解措施 |
| ---- | ---- | -------- |
| `filteredPositions` / `filteredManagers` 比對失效 | 低 | org_units.name 與 departments.name 由 organization.js 同步，保持一致 |
| 職等矩陣 departments 回傳順序改變 | 低 | ORDER BY 使用 `d.sort_order ASC, ou.name ASC`，與原排序一致 |
| `org_units` 有部門但 `departments` 無對應記錄 | 低 | LEFT JOIN 處理 null，code/sort_order 會是 null 但不影響顯示 |
| 其他前端頁面呼叫 `getDepartments()` | 無 | 後端 API 回傳格式不變，透明升級 |
