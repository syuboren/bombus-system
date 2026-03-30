## Summary

為 `departments` 表加入 `org_unit_id` 欄位，解決多子公司架構下同名部門的跨公司資料污染問題。同時修正相關 FK 約束與統計查詢。

## Motivation

`departments` 表以 `name UNIQUE` 作為隱性主鍵，所有 JOIN 和 UPDATE 都用部門名稱匹配。在多子公司架構下，不同子公司可以有相同名稱的部門（例如每家都有「業務部」），目前的設計會導致：

1. **UPDATE/DELETE 跨公司影響** — 修改操作影響所有同名部門（目前用 ROWID LIMIT 1 暫時緩解但仍不精確）
2. **LEFT JOIN 匹配錯誤** — 同名部門時取到錯誤記錄
3. **重複檢查阻擋合法建立** — `name UNIQUE` 導致不同子公司無法建立同名部門
4. **FK 約束失效** — `department_positions` 和 `job_descriptions` 的 `FOREIGN KEY REFERENCES departments(name)` 在 `name` 不再 UNIQUE 後會失效
5. **部門統計跨公司合併** — competency.js 的部門統計未做 org scope

## Proposed Solution

1. `departments` 表新增 `org_unit_id`，語義為「所屬子公司/集團的 org_unit ID」
2. UNIQUE constraint 從 `UNIQUE(name)` 改為 `UNIQUE(name, org_unit_id)`
3. 遷移既有資料：遞迴向上找到 subsidiary/group 祖先回填 `org_unit_id`，孤兒部門歸入集團
4. 所有 name-based 查詢改為 `WHERE name = ? AND org_unit_id = ?`
5. 所有 LEFT JOIN 保留 `TRIM() COLLATE NOCASE` 並加入 `AND d.org_unit_id = ou.parent_id`
6. 移除 `department_positions` 和 `job_descriptions` 對 `departments(name)` 的 FK 約束
7. 同步修改 `tenant-schema.js` CREATE TABLE（新租戶 schema）
8. 清理 organization.js 中 `WHERE 1=0` 死代碼

## Non-Goals

- 不合併 `departments` 表到 `org_units` 表（保持向後相容）
- 不改動 `org_units` 表結構
- 不改動前端元件（純後端修正）
- 不改動 `db/index.js` 舊版單租戶 schema（已棄用）

## Capabilities

### New Capabilities

- `departments-org-isolation`: 部門表加入組織隔離，支援多子公司同名部門獨立管理

### Modified Capabilities

（無既有 spec 需修改）

## Impact

- **影響模組**: L1 員工管理、L2 職能管理、組織管理
- **影響後端檔案**:
  - `server/src/db/tenant-schema.js` — departments 表 schema + FK 修正
  - `server/src/db/tenant-db-manager.js` — 遷移邏輯
  - `server/src/routes/organization.js` — 部門 CRUD 全面修正 + 死代碼清理
  - `server/src/routes/hr-onboarding.js` — 入職流程部門查詢
  - `server/src/routes/grade-matrix.js` — 職等管理部門列表查詢
  - `server/src/routes/competency.js` — 部門統計加 org scope
  - `server/src/db/seed-import.js` — seed 帶入 org_unit_id
  - `server/src/db/migrate-demo.js` — demo 遷移同步
- **資料遷移**: 既有 `departments` 記錄回填 `org_unit_id`，UNIQUE + FK 約束重建
