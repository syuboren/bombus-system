# Tenant Isolation — 租戶資料隔離

## Purpose

定義 Bombus 多租戶架構的資料隔離策略，確保每個租戶的資料完全獨立，互不干擾。採用 Database-per-Tenant 模式，每個租戶擁有獨立的 SQLite 資料庫檔案。

## Requirements

### Requirement: Database-per-Tenant 資料隔離
系統 SHALL 為每個租戶維護獨立的 SQLite 資料庫檔案（`tenant_{id}.db`）。租戶 A 的任何 API 請求 SHALL 絕不能存取租戶 B 的資料庫。

#### Scenario: 正常請求使用正確的租戶資料庫
- **WHEN** 租戶 A 的使用者發送 API 請求
- **THEN** 系統從 JWT 中解析 tenant_id，載入 `tenant_A.db`，所有 SQL 操作僅在此資料庫上執行

#### Scenario: 偽造 tenant_id 被拒絕
- **WHEN** 使用者的 JWT 中 tenant_id 為 A，但請求試圖存取租戶 B 的資源
- **THEN** 系統 SHALL 拒絕請求並回傳 403 Forbidden

### Requirement: TenantDBManager 管理多資料庫實例
系統 SHALL 提供 TenantDBManager 單例服務，負責載入、快取和卸載租戶資料庫實例。

#### Scenario: 載入活躍租戶的資料庫
- **WHEN** 收到某租戶的第一個請求且該租戶 DB 尚未載入
- **THEN** TenantDBManager 從檔案系統載入 `tenant_{id}.db` 至記憶體，並快取供後續請求使用

#### Scenario: 自動卸載非活躍租戶
- **WHEN** 某租戶資料庫閒置超過 30 分鐘
- **THEN** TenantDBManager 將該資料庫實例從記憶體中卸載（先持久化至檔案）

#### Scenario: 暫停租戶的請求被攔截
- **WHEN** 狀態為 suspended 或 deleted 的租戶使用者發送 API 請求
- **THEN** Tenant Context Middleware 回傳 403，不載入租戶資料庫

### Requirement: DBAdapter 抽象層
系統 SHALL 提供 DBAdapter 介面，封裝資料庫操作。所有路由 SHALL 透過 DBAdapter 操作資料，不直接使用 sql.js API。

#### Scenario: 透過 DBAdapter 執行查詢
- **WHEN** 路由處理器需要讀取資料
- **THEN** 使用 `req.tenantDB.query(sql, params)` 執行 Prepared Statement，回傳結果陣列

#### Scenario: 透過 DBAdapter 執行交易
- **WHEN** 路由處理器需要執行多步驟寫入
- **THEN** 使用 `req.tenantDB.transaction(fn)` 封裝，確保原子性

### Requirement: 租戶上下文中介層
系統 SHALL 提供 Tenant Context Middleware，從 JWT Token 中解析 tenant_id 並注入租戶資料庫實例至 `req.tenantDB`。

#### Scenario: 中介層正確注入租戶 DB
- **WHEN** 已認證的請求經過 Tenant Context Middleware
- **THEN** `req.tenantDB` 被設定為對應租戶的 DBAdapter 實例，`req.tenantId` 被設定為租戶 ID

#### Scenario: 無效的 tenant_id
- **WHEN** JWT 中的 tenant_id 在 platform.db 中不存在
- **THEN** 中介層回傳 401 Unauthorized

### Requirement: 平台資料庫獨立存在
系統 SHALL 維護獨立的 platform.db 儲存平台級資料（租戶清單、方案、平台管理員、審計日誌）。平台資料庫 SHALL 永遠常駐記憶體。

#### Scenario: 平台 API 使用平台資料庫
- **WHEN** 平台管理員呼叫 `/api/platform/*` 端點
- **THEN** 系統使用 platform.db 而非租戶 DB

### Requirement: 租戶軟刪除與硬刪除分離
系統 SHALL 預設採用軟刪除（狀態設為 deleted），保留租戶資料庫檔案。僅在平台管理員明確執行「永久刪除」時，才進行硬刪除（刪除資料庫檔案）。

#### Scenario: 軟刪除租戶（預設）
- **WHEN** 平台管理員對租戶執行退租操作
- **THEN** 租戶狀態設為 deleted，資料庫檔案 SHALL 保留，使用者無法登入，但資料可在需要時恢復

#### Scenario: 恢復軟刪除的租戶
- **WHEN** 平台管理員對 deleted 狀態的租戶執行恢復操作
- **THEN** 租戶狀態恢復為 active，使用者可重新登入，所有資料完整保留

#### Scenario: 硬刪除需二次確認
- **WHEN** 平台管理員對 deleted 租戶執行「永久刪除」
- **THEN** 系統要求二次確認（例如輸入租戶名稱確認），確認後從記憶體卸載 DB 並刪除 `tenant_{id}.db` 檔案，記錄審計日誌

#### Scenario: 不可硬刪除非 deleted 狀態的租戶
- **WHEN** 平台管理員嘗試永久刪除 active 或 suspended 的租戶
- **THEN** 系統回傳 400 錯誤，要求先進行軟刪除
