## MODIFIED Requirements

### Requirement: 平台管理員可建立新租戶

系統 SHALL 提供 API 端點讓平台管理員建立新租戶。建立租戶時 SHALL 自動產生獨立的 SQLite 資料庫檔案，並初始化所有必要的表結構（RBAC 表 + L1~L6 業務表）。

當請求中包含 `industry` 欄位時，該值 SHALL 必須為 `platform.db.industries.code` 中已存在的有效代碼；否則系統 SHALL 回傳 400 Bad Request。`industry` 欄位 SHALL 為選填——未提供時 `tenants.industry` 寫入 NULL，租戶建立後仍可由平台管理員透過租戶編輯介面補填。

#### Scenario: 成功建立租戶

- **WHEN** 平台管理員提交租戶建立請求（包含 name、slug、plan_id、industry='manufacturing'）
- **THEN** 系統 SHALL 驗證 industry 代碼存在於 `industries` 表，建立 `server/data/tenants/tenant_{id}.db` 資料庫檔案，初始化所有表結構，在 platform.db 的 tenants 表新增記錄（含驗證過的 industry FK），並回傳租戶資訊

#### Scenario: slug 已存在

- **WHEN** 平台管理員提交的 slug 與既有租戶重複
- **THEN** 系統回傳 409 Conflict 錯誤，不建立任何資料

#### Scenario: 無效的 industry 代碼

- **WHEN** 平台管理員提交 `industry='nonexistent'`
- **THEN** 系統 SHALL 回傳 400 Bad Request，錯誤訊息指出 industry 代碼必須來自標準化 industries 列表，並 SHALL NOT 建立任何資料

#### Scenario: 未提供 industry

- **WHEN** 平台管理員提交租戶建立請求但未包含 industry 欄位
- **THEN** 系統 SHALL 將 `tenants.industry` 寫入 NULL 並正常建立租戶；租戶可在後續編輯流程中補填

---

## ADDED Requirements

### Requirement: tenants.industry 字串遷移為標準化代碼

系統 SHALL 在升版至本變更後，將既有 `platform.db.tenants.industry` 欄位中的 free-form 字串值對映至標準化 `industries.code`。對映 SHALL 透過 `platform-db.js` 內的冪等遷移邏輯執行，在 `initPlatformDB()` 中於 industries 表 seed 完成後呼叫一次。

對映表 SHALL 至少涵蓋：`'製造業'/'製造'/'Manufacturing' → 'manufacturing'`、`'科技業'/'科技'/'Tech'/'Technology' → 'tech'`、`'資訊服務業'/'IT Services' → 'it-services'`、`'零售業'/'Retail' → 'retail'`、`'餐飲業'/'F&B' → 'food-service'`、`'醫療'/'醫療機構'/'Healthcare' → 'healthcare'`、`'金融業'/'Finance' → 'finance'`、`'非營利'/'非營利組織'/'NPO' → 'nonprofit'`、`'教育'/'Education' → 'education'`、`'建築'/'Construction' → 'construction'`、`'物流'/'Logistics' → 'logistics'`。無法對映的字串 SHALL 被改寫為 `'other'`，並 SHALL 記錄一筆 console warning 含租戶 id 與原字串。

遷移完成後，`tenants.industry` 欄位 SHALL 全部為 NULL 或 industries.code 中存在的有效代碼。

#### Scenario: 已知字串自動對映

- **WHEN** 升版前 platform.db 中有租戶 A `industry='製造業'`、租戶 B `industry='Tech'`、租戶 C `industry=NULL`
- **THEN** 遷移執行後，租戶 A 的 industry SHALL 變為 `'manufacturing'`、租戶 B 變為 `'tech'`、租戶 C 仍為 NULL，且 SHALL 不會輸出任何警告

#### Scenario: 無法對映的字串歸入 other

- **WHEN** 升版前有租戶 D `industry='博物館經營'`（不在對映表中）
- **THEN** 遷移執行後租戶 D 的 industry SHALL 變為 `'other'`，並 SHALL 輸出一筆 console warning 包含租戶 D 的 id 與原始字串 `'博物館經營'` 供平台管理員後續手動修正

#### Scenario: 重複執行遷移為冪等

- **WHEN** 第二次啟動伺服器（既有租戶 industry 已是有效代碼）
- **THEN** 遷移邏輯 SHALL 偵測無需對映並 SHALL 不修改任何 row、SHALL 不輸出警告
