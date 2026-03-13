# 提案：職等職級薪資對照表 — 子公司獨立薪資管理（混合制）

## Why

目前整體對照表（Overview Tab）的薪資級距是全租戶共用的，所有子公司看到的是同一份薪資表。但在實際企業管理中，不同子公司因地區、產業、規模等因素，往往需要各自獨立的薪資級距。例如台北總部的 Grade 3 起薪可能是 45K，而深圳分公司可能是 38K。

目前的 DB schema 已有部分支援（`grade_salary_levels` 和 `grade_track_entries` 都有 `org_unit_id` 欄位），但前端 UI 尚未利用此能力，導致整體對照表無法按子公司篩選。

本變更採用**混合制（模式 C）**：
- **職等框架**（Grade 1-7）集團統一
- **軌道定義**（管理職/專業職）集團統一
- **薪資級距**依子公司獨立管理（可覆寫集團預設值）
- **軌道職稱/學歷/職責**已按子公司獨立（上一期已完成）

## What Changes

1. **DB**：`grade_salary_levels.code` 的 `UNIQUE NOT NULL` 約束改為 `UNIQUE(code, org_unit_id)`，允許不同子公司使用相同薪資代碼
2. **前端 — 整體對照表**：加入子公司篩選器（與軌道明細表一致），選擇子公司後顯示該子公司的薪資級距
3. **前端 — 編輯面板**：新增/編輯職等薪資時自動帶入當前選擇的子公司 `orgUnitId`
4. **後端 API**：調整薪資查詢的 fallback 邏輯（子公司覆寫 > 集團預設）
5. **Demo 資料**：為 demo 租戶建立不同子公司的差異化薪資範例

## Capabilities

### New Capabilities

- `subsidiary-salary-override`：子公司可覆寫集團預設薪資級距，未覆寫時自動繼承集團值
- `overview-subsidiary-filter`：整體對照表支援子公司篩選器，顯示各子公司的薪資差異

### Modified Capabilities

- `grade-edit-panel`：編輯面板新增 orgUnitId 綁定，新增/編輯薪資時標記所屬子公司

## Non-goals（不在範圍內）

- 不改變 `grade_levels` 表結構（職等框架繼續集團統一）
- 不改變 `grade_tracks` 表結構（軌道定義繼續集團統一）
- 不新增「子公司薪資批量複製」功能（後續需求再議）
- 不處理幣別差異（目前統一使用 NT$）

## Impact

- 影響模組：L2 職能管理 (`/competency`)
- 影響資料表：`grade_salary_levels`（約束變更）
- 影響後端：`server/src/routes/grade-matrix.js`、`server/src/db/tenant-schema.js`、`server/src/db/tenant-db-manager.js`、`server/src/db/migrate-demo.js`
- 影響前端：`grade-matrix-page.component.{ts,html,scss}`、`grade-edit-panel.component.{ts,html}`、`competency.service.ts`
