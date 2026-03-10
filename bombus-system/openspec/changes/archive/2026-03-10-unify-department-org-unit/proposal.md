# 統一部門與組織單位資料來源

## Summary

將所有前端「部門」下拉選單統一以 `org_units`（type='department'）作為資料來源，涵蓋入職轉換 Modal（L1）與職等矩陣（L2）。後端新增統一的部門查詢 API，`departments` 表保留作為擴充屬性表（manager_id、responsibilities 等）。

## Motivation

目前系統存在兩套平行的部門資料：

| 表 | 角色 | 擴充欄位 |
|---|------|---------|
| `departments` | L2 職能管理種子資料 | manager_id, head_count, responsibilities, kpi_items, competency_focus |
| `org_units` (type='department') | RBAC 權限架構 | 無（僅 name, type, parent_id, level） |

`organization.js` 已經以 `org_units` 為主表、`departments` 為擴充屬性表在運作（LEFT JOIN on name），但前端各模組的部門下拉仍各自取資料：

| 模組 | API | 來源表 |
|------|-----|--------|
| 入職 Modal（L1） | `GET /api/hr/onboarding/departments` | `departments` |
| 入職 Modal（L1） | `GET /api/hr/onboarding/org-units` | `org_units` |
| 職等矩陣（L2） | `GET /api/grade-matrix/departments/list` | `departments` |
| 組織管理 | `GET /api/organization/departments` | `org_units LEFT JOIN departments` |

這導致：

1. **使用者困惑**：入職 Modal 出現兩個內容幾乎相同的下拉選單
2. **資料不一致風險**：新增部門時需同步兩張表，若遺漏則不一致
3. **維護成本**：三個不同 API 端點回傳幾乎相同的資料

## Proposed Solution

### 策略：`org_units` 為主表，`departments` 退化為擴充屬性表

正式化 `organization.js` 已在使用的架構模式：

```
org_units（主表）──── LEFT JOIN ────→ departments（擴充屬性）
  id, name, type,                      manager_id, head_count,
  parent_id, level                     responsibilities, kpi_items,
                                       competency_focus
```

### 後端變更

1. **`hr-onboarding.js`：`GET /departments` 改為查 `org_units`**
   - 改為 `SELECT id, name FROM org_units WHERE type = 'department'`
   - 支援 `?parentId=xxx` 參數按子公司篩選
   - 保持回傳格式不變（`{ id, name }`），不影響其他呼叫端

2. **`grade-matrix.js`：`GET /departments/list` 改為查 `org_units`**
   - 改為 `SELECT ou.id, ou.name, d.code, d.sort_order FROM org_units ou LEFT JOIN departments d ON d.name = ou.name WHERE ou.type = 'department'`
   - 保持回傳格式不變（`{ id, name, code }`）

### 前端變更

3. **入職 Modal（L1）：合併兩個下拉為一個**
   - 部門下拉改為從已載入的 `departmentOrgUnits()` 取值
   - 選擇時同時設定 `department`（name）和 `orgUnitId`（id）
   - 移除獨立的「組織單位權限範圍」下拉
   - 移除 `getDepartments()` API 呼叫（改用 `getOrgUnits()` 已載入的資料）

4. **職等矩陣（L2）：改為從 `org_units` 取部門**
   - `competencyService.getDepartments()` 改為查新的 API 端點
   - 或直接改 `grade-matrix.js` 的 SQL（方案 2 已涵蓋，無需前端改動）

### 不修改的部分

- `departments` 表結構（保留 CREATE TABLE + ALTER TABLE 遷移）
- `organization.js` 的同步寫入邏輯（建/改/刪部門時同步 departments 表）
- `department_positions` 表的 FK（仍參照 `departments.name`）
- `employees.department` 欄位（仍為 TEXT，存部門名稱）

## Non-goals（不在範圍內）

- **不刪除 `departments` 表**：組織管理 PUT API 使用其擴充欄位
- **不修改 `department_positions` FK**：仍參照 `departments.name`
- **不修改 `organization.js` CRUD**：同步機制保留
- **不修改組織管理前端頁面**：已使用 `GET /api/organization/departments`（本身就查 org_units）

## Impact

- 影響模組：L1 員工管理（入職 Modal）、L2 職能管理（職等矩陣篩選）
- 相關 specs：`rbac`（org_units 架構定義）
- 影響的程式碼：

### 後端（2 檔案）
| 檔案 | 變更 |
|------|------|
| `server/src/routes/hr-onboarding.js` | `GET /departments` SQL 改查 org_units |
| `server/src/routes/grade-matrix.js` | `GET /departments/list` SQL 改查 org_units LEFT JOIN departments |

### 前端（3 檔案）
| 檔案 | 變更 |
|------|------|
| `src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.ts` | 移除 departments signal + getDepartments()、改 onDepartmentChange |
| `src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.html` | 合併部門下拉、移除組織單位下拉 |
| `src/app/features/employee/components/onboarding-convert-modal/onboarding-convert-modal.component.scss` | 移除 .hint.success 樣式（不再需要） |
