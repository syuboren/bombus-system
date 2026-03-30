## Context

`departments` 表建立於 multi-tenant 架構之前，使用 `name TEXT UNIQUE NOT NULL` 作為隱性主鍵。所有業務邏輯透過名稱匹配關聯部門資料。在加入子公司（subsidiary）架構後，不同子公司可能有同名部門，導致多處 name-based 查詢產生跨公司資料污染。

### 現有問題分佈

| 類型 | 數量 | 檔案 | 風險 |
|------|------|------|------|
| UPDATE WHERE name (ROWID workaround) | 7 | organization.js | 修改到其他子公司的部門 |
| DELETE WHERE name (ROWID workaround) | 1 | organization.js | 刪除到其他子公司的部門 |
| LEFT JOIN ON name (TRIM COLLATE) | 5 | organization.js, hr-onboarding.js, grade-matrix.js | 查詢到錯誤記錄 |
| INSERT OR IGNORE | 1 | organization.js | 遮蔽 constraint 錯誤 |
| 死代碼 JOIN (WHERE 1=0) | 1 | organization.js | 未來移除 guard 會重現 bug |
| FK REFERENCES departments(name) | 2 | tenant-schema.js (department_positions, job_descriptions) | name 不再 UNIQUE 後 FK 失效 |
| 部門統計未 scope | 1 | competency.js | 同名部門統計合併 |

**注意**：現行程式碼的 UPDATE/DELETE 已在先前對話中改為 `ROWID LIMIT 1` workaround，非原始 `WHERE name = ?`。

### 涉及檔案

| 檔案 | 改動程度 |
|------|---------|
| `server/src/db/tenant-schema.js` | Schema 修改（CREATE TABLE + FK 修正） |
| `server/src/db/tenant-db-manager.js` | 遷移邏輯 |
| `server/src/routes/organization.js` | 大改（14 處 + 死代碼清理） |
| `server/src/routes/hr-onboarding.js` | 小改（1 處 JOIN） |
| `server/src/routes/grade-matrix.js` | 小改（1 處 JOIN） |
| `server/src/routes/competency.js` | 小改（部門統計加 org scope） |
| `server/src/db/seed-import.js` | 小改（seed 帶入 org_unit_id） |
| `server/src/db/migrate-demo.js` | 小改（demo 遷移同步） |

### 複用元件與服務

- 無前端修改，純後端重構

## Goals / Non-Goals

**Goals:**

- `departments` 表加入 `org_unit_id`，支援同名部門跨公司獨立存在
- 所有 name-based 查詢改為 name + org_unit_id 雙重匹配
- 修正 `department_positions` 和 `job_descriptions` 的 FK 約束
- 既有資料零損失遷移

**Non-Goals:**

- 不合併 `departments` 表到 `org_units` 表
- 不改動前端元件
- 不改動 `db/index.js` 舊版單租戶 schema（已棄用）

## Decisions

### org_unit_id 語義定義

`departments.org_unit_id` 存的是**所屬子公司或集團的 org_unit ID**（type = 'subsidiary' 或 'group'），而非直接父節點 ID。

對於嵌套部門（部門下再建子部門），遷移時需向上遞迴找到最近的 subsidiary/group 祖先：

```javascript
function findOwnerCompany(db, orgUnitId) {
  let currentId = orgUnitId;
  for (let i = 0; i < 10; i++) {
    const unit = db.exec("SELECT id, type, parent_id FROM org_units WHERE id = ?", [currentId]);
    if (!unit.length) return null;
    const row = unit[0].values[0];
    if (row[1] === 'subsidiary' || row[1] === 'group') return row[0];
    if (!row[2]) return null;
    currentId = row[2];
  }
  return null;
}
```

### Schema 修改：departments 表加入 org_unit_id

```sql
ALTER TABLE departments ADD COLUMN org_unit_id TEXT REFERENCES org_units(id);
```

- 重建表移除 `name UNIQUE` 約束
- 新增 `UNIQUE(name, org_unit_id)` 複合唯一索引
- **同步修改 `tenant-schema.js` 的 CREATE TABLE**（新租戶必須得到新 schema — CLAUDE.md Known Gotcha: Dual migration lists）

### FK 約束修正

`department_positions` 和 `job_descriptions` 的 `FOREIGN KEY (department) REFERENCES departments(name)` 會因 `name` 不再 UNIQUE 而失效。修正為移除此 FK 約束（透過表重建），改由應用層保證一致性。

### 資料遷移策略

```javascript
// 1. 為每個 departments 記錄找到同名 org_unit，向上遞迴取得所屬公司
for (const dept of allDepartments) {
  const orgUnit = db.exec("SELECT parent_id FROM org_units WHERE name = ? AND type = 'department' LIMIT 1", [dept.name]);
  if (orgUnit.length) {
    const companyId = findOwnerCompany(db, orgUnit[0].values[0][0]); // 遞迴向上找 subsidiary/group
    if (companyId) {
      db.run("UPDATE departments SET org_unit_id = ? WHERE ROWID = (SELECT ROWID FROM departments WHERE name = ? LIMIT 1)", [companyId, dept.name]);
    }
  }
}

// 2. 孤兒部門（org_units 中無對應記錄）→ 歸入集團
const groupId = db.exec("SELECT id FROM org_units WHERE type = 'group' LIMIT 1");
db.run("UPDATE departments SET org_unit_id = ? WHERE org_unit_id IS NULL", [groupId]);
```

遷移後驗證：`SELECT COUNT(*) FROM departments WHERE org_unit_id IS NULL` 應為 0。

### JOIN 修正模式

所有 `LEFT JOIN departments d ON TRIM(d.name) = TRIM(ou.name) COLLATE NOCASE` 統一改為：

```sql
LEFT JOIN departments d ON TRIM(d.name) = TRIM(ou.name) COLLATE NOCASE AND d.org_unit_id = ou.parent_id
```

**嵌套部門例外**：組織樹端點因包含所有 type，需確保只對 `ou.type = 'department'` 做 JOIN，且用 `findOwnerCompany` 的結果而非 `ou.parent_id`。實務上因目前系統僅支援一層部門（部門直接掛在子公司下），`ou.parent_id` 即為子公司 ID，但需加上 `AND ou.type = 'department'` 防護。

### UPDATE/DELETE 修正模式

所有現行 `WHERE ROWID = (SELECT ROWID FROM departments WHERE name = ? LIMIT 1)` 改為 `WHERE name = ? AND org_unit_id = ?`。`org_unit_id` 從 `org_units.parent_id` 取得（PUT/DELETE 端點已有 `org_units` 記錄在手）。

### INSERT 修正

新增部門時，用明確的 INSERT（非 `OR IGNORE`），帶入 `org_unit_id`：
```sql
INSERT INTO departments (id, name, org_unit_id) VALUES (?, ?, ?)
```
並在 constraint 違反時回傳有意義的錯誤訊息。

### 表重建安全措施

CREATE → COPY → DROP → RENAME 必須：
1. 包在 `BEGIN TRANSACTION ... COMMIT` 中
2. COPY 後比對 row count：`SELECT COUNT(*)` 一致才繼續
3. 失敗時 ROLLBACK 並 throw（不 catch-and-continue）

## Risks / Trade-offs

- **[SQLite 重建表]** → 需 transaction + row count 驗證。失敗時 ROLLBACK，不會損失資料
- **[孤兒部門]** → org_units 中無對應記錄的 departments 歸入集團，並 console.warn 提醒
- **[FK 移除]** → `department_positions` 和 `job_descriptions` 失去 FK 約束，改由應用層保證
- **[效能]** → 新增 org_unit_id 在 JOIN 中增加比對，但資料量小（< 1000 筆），影響可忽略
- **[不可逆]** → UNIQUE constraint 從 `(name)` 改為 `(name, org_unit_id)` 後，回滾需反向遷移。此為設計預期
