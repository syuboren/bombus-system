---
description: "驗證單一欄位從 DB → API → Service → Component 端到端 mapping 一致性"
argument-hint: "<table>.<column> 或 <camelCaseField>（例：employees.avatar、grade、currentSalary）"
---

## 欄位 Mapping 驗證

針對 `$ARGUMENTS` 這個欄位，驗證它在四層之間的 mapping 是否一致。

> **使用情境**：bug 看起來像「前端沒拿到資料」、「新欄位儲存後查不到」、「自動帶入失效」時，先跑這個 skill 找出哪一層斷了。歷史教訓：avatar 是 service mapping 漏掉、grade 是 API response key 與前端欄位名不一致。

### 輸入解析

- 若 `$ARGUMENTS` 含 `.`（例：`employees.avatar`） → 視為 `table.column`，用 snake_case 為主名
- 若 `$ARGUMENTS` 為 camelCase（例：`currentSalary`）→ 推導 snake_case（`current_salary`）兩名都查
- 都查不到時主動詢問使用者要查哪個 entity / route 檔

### 步驟 1：DB schema 層

```bash
# 主 schema
grep -nE "(snake_name|camel_name)" /Users/alifrt/Desktop/Bombus/bombus-system/server/src/db/tenant-schema.js
# 既有租戶遷移
grep -nE "(snake_name)" /Users/alifrt/Desktop/Bombus/bombus-system/server/src/db/tenant-db-manager.js
```

確認：
- 該欄位在 CREATE TABLE 中宣告
- 若是新欄位，`tenant-db-manager.js:_runMigrations()` 必須有對應 `ALTER TABLE` 遷移（**雙遷移清單同步**）
- 欄位型別、NULL 約束、預設值

### 步驟 2：後端 Route 層

```bash
# 找出可能的路由檔（用 entity 名）
ls /Users/alifrt/Desktop/Bombus/bombus-system/server/src/routes/ | grep -i <entity>
# 在 routes 中找該欄位的 SELECT / INSERT / UPDATE
grep -rnE "(snake_name|AS [a-zA-Z_]*[Cc]olumn)" /Users/alifrt/Desktop/Bombus/bombus-system/server/src/routes/
```

確認：
- SELECT 有 SELECT 該欄位（不要是 `SELECT *` 然後忘記取出）
- INSERT/UPDATE 的欄位清單含該欄位
- response 物件 key 名（snake_case 或 camelCase？）
- 若有 `AS xxx` alias，記下 alias 名（前端取 key 用這個）

### 步驟 3：前端 Service 層

```bash
# 找該 entity 的 service
find /Users/alifrt/Desktop/Bombus/bombus-system/src/app -name "*.service.ts" | xargs grep -ln "<entity>"
# 在 service 中找 map* 函式 + 該欄位
grep -nE "(map[A-Z][a-zA-Z]*|snakeName|camelName)" <service-file>
```

確認：
- TypeScript Model interface 有宣告該欄位
- `map*` / `transform*` 函式有把 API response 的 key 對應到前端 model 的 key（**最常見漏點**）
- HTTP 呼叫的 payload 欄位名與後端期望一致

### 步驟 4：Component / Template 層

```bash
# 找實際使用該欄位的元件
grep -rnE "\.(camelName|snakeName)" /Users/alifrt/Desktop/Bombus/bombus-system/src/app --include="*.ts" --include="*.html"
```

確認：
- `.html` 中的 binding（`{{ ... }}`、`[value]`、`*ngIf` 條件）使用的 key 與 service 對應
- `.ts` 中存取該欄位的程式碼是否有適當的 null check / default

### 步驟 5：對齊矩陣

把四層找到的欄位名列成表，**檢查是否一致**：

```
| 層 | 欄位名 / Key | 檔案:行 |
|---|---|---|
| DB schema | snake_name | tenant-schema.js:123 |
| 既有遷移 | snake_name | tenant-db-manager.js:456（或：未遷移 ⚠️） |
| API SELECT | snake_name AS camelName | routes/employee.js:78 |
| API response key | camelName | routes/employee.js:90 |
| Service Model | camelName | employee.model.ts:45 |
| Service map* | API.camelName → model.camelName | employee.service.ts:120 |
| Component | model.camelName | profile-page.ts:200 |
| Template | {{ model.camelName }} | profile-page.html:50 |
```

### 報告格式

```
🔍 Mapping 驗證：$ARGUMENTS

✅ DB schema 存在：tenant-schema.js:行
✅ 遷移已加入：tenant-db-manager.js:行（或 ⚠️ 未加 → 既有租戶會缺欄位）
✅ API SELECT 有納入：routes/xxx.js:行
✅ Service map* 有對應：xxx.service.ts:行
✅ Template 使用一致：xxx.html:行

⚠️ 不一致發現：
- API 回傳 snake_case 但 Service map 預期 camelCase（routes/xxx.js:78 vs xxx.service.ts:120）
- 或：Service Model 有此欄位但 map* 函式沒處理（前端會收到 undefined）
- 或：tenant-schema.js 已加但 tenant-db-manager.js _runMigrations() 沒同步（既有租戶會 SQL error）

🛠 建議修復：
1. [具體修哪個檔案、改什麼]
2. ...
```

### 規則

- **不修任何檔**，這是純驗證 skill。發現不一致時只**提出**修復建議
- 若四層都對齊但 bug 仍在，往「資料層」找：直接 query DB 看那一筆 row 的該欄位實際值是什麼（avatar bug 就是這樣——mapping 全對，但 DB 存的是 name-initials 不是 URL）
- snake_case ↔ camelCase 是最常見不一致點，**優先檢查**
- 若該欄位是新加的，特別注意「tenant-schema.js 加了但 tenant-db-manager.js 沒加」這個雙清單陷阱

### 何時跳出此流程

如果欄位不存在於四層任一層，且使用者沒指定要新增 → 改用 `/preflight` 流程（新功能預飛）而非 verify-mapping（既有欄位驗證）。
