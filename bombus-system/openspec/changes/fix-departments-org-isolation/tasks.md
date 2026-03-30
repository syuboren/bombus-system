## 1. 後端：Schema 修改與資料遷移策略

- [x] 1.1 修改 `tenant-schema.js` CREATE TABLE departments 定義（schema synchronization for new tenants）：加入 `org_unit_id TEXT REFERENCES org_units(id)`，將 `name TEXT UNIQUE NOT NULL` 改為 `name TEXT NOT NULL`，新增 `UNIQUE(name, org_unit_id)`。同時移除 `department_positions` 和 `job_descriptions` 的 `FOREIGN KEY (department) REFERENCES departments(name)`（foreign key constraint migration）。涉及檔案：`tenant-schema.js`。驗證：新建租戶的 departments 表含 org_unit_id 欄位且無 name UNIQUE 約束
- [x] 1.2 實作 data migration for existing departments：在 `tenant-db-manager.js` 的 `_runMigrations()` 新增遷移，為 `departments` 表加入 `org_unit_id` 欄位（`ALTER TABLE ADD COLUMN`），遞迴向上查找 subsidiary/group 祖先回填（org_unit_id 語義定義），孤兒部門歸入集團並 console.warn（department org unit isolation）。參考現有問題分佈進行驗證。驗證：`SELECT COUNT(*) FROM departments WHERE org_unit_id IS NULL` 應為 0
- [x] 1.3 重建 `departments` 表 UNIQUE 約束（表重建安全措施 + table rebuild safety + schema 修改：departments 表加入 org_unit_id）：移除 `name UNIQUE`，改為 `UNIQUE(name, org_unit_id)`。使用 CREATE → COPY → DROP → RENAME 流程，包在 transaction 中，COPY 後比對 row count。同步重建 `department_positions` 和 `job_descriptions` 移除 name FK（foreign key constraint migration + FK 約束修正）。驗證：嘗試插入兩筆同名但不同 org_unit_id 的部門應成功

## 2. 後端：organization.js 修正 — department mutations scoped by org unit

- [x] 2.1 修正 POST（insert 修正）：INSERT 帶入 `org_unit_id`（從 `companyId` / `parent_id` 取得），移除 `INSERT OR IGNORE` 改為明確 INSERT + 錯誤處理（department queries scoped by org unit）。驗證：不同子公司可建立同名部門；constraint 違反回傳有意義的錯誤
- [x] 2.2 修正 PUT（update/delete 修正模式）：所有 `WHERE ROWID = (SELECT ROWID ... LIMIT 1)` 改為 `WHERE name = ? AND org_unit_id = ?`（department mutations scoped by org unit），`org_unit_id` 從 org_units 的 `parent_id` 取得。驗證：更新子公司 A 的部門不影響子公司 B 的同名部門
- [x] 2.3 修正 DELETE（update/delete 修正模式）：`DELETE FROM departments WHERE ROWID = ...` 改為 `WHERE name = ? AND org_unit_id = ?`（department mutations scoped by org unit）。驗證：刪除子公司 A 的部門不影響子公司 B 的同名部門
- [x] 2.4 修正 5 處 LEFT JOIN（JOIN 修正模式）：所有 `LEFT JOIN departments d ON TRIM(d.name) = TRIM(ou.name) COLLATE NOCASE` 改為加上 `AND d.org_unit_id = ou.parent_id`，組織樹端點額外確保 `AND ou.type = 'department'` 防護（複用元件與服務：無前端修改）。驗證：子公司 A 的部門不會讀到子公司 B 的 departments 資料
- [x] 2.5 清理 `WHERE 1=0` 死代碼子查詢（organization.js 約 line 42），移除含 name-based JOIN 反模式的 `_placeholder` 欄位。驗證：API 回傳正常，無 `_placeholder` 欄位

## 3. 後端：其他路由修正 — department queries scoped by org unit

- [x] 3.1 修正 `hr-onboarding.js` 的 LEFT JOIN（JOIN 修正模式 + department queries scoped by org unit）：`LEFT JOIN departments d ON TRIM(d.name) = TRIM(ou.name) COLLATE NOCASE` 改為加上 `AND d.org_unit_id = ou.parent_id`。驗證：入職流程部門下拉只顯示所屬子公司的部門
- [x] 3.2 修正 `grade-matrix.js` 的 LEFT JOIN（JOIN 修正模式 + department queries scoped by org unit）：同上模式。驗證：職等管理部門列表只顯示所屬子公司的部門
- [x] 3.3 修正 `competency.js` 的部門統計查詢：加入 `org_unit_id` scope（department queries scoped by org unit）。驗證：同名部門的統計不會跨子公司合併
- [x] 3.4 更新 `seed-import.js` 和 `migrate-demo.js`（資料遷移策略）：seed 匯入時帶入 `org_unit_id`，demo 遷移同步處理新欄位。驗證：seed-import 後 departments 的 org_unit_id 非 NULL

## 4. 驗證

- [x] 4.1 端對端驗證（資料遷移策略 + table rebuild safety）：重啟 server → 確認 departments 表 org_unit_id 全部非 NULL → 建立兩個子公司各建一個同名部門 → 更新其中一個不影響另一個 → 刪除其中一個不影響另一個 → department_positions 和 job_descriptions 的 CRUD 正常。後端無 console error
