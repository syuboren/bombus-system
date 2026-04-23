## Why

依《現況與問題比對分析_20260406》D-02，業主希望一個**內部職缺**能同時發布到多個外部平台（104、1111、518），而不是像現況般把 internal / 104 視為兩種獨立的職缺（列表用 Tab 切換、資料各自存）。目前 `jobs` 表雖已是單表 + 104 附加欄位（`job104_no` / `sync_status` / `job104_data`）— [tenant-schema.js:574-590](server/src/db/tenant-schema.js#L574)，但架構綁死 104，無法擴展。

同時關聯 D-03：各資料來源排程彈性架構，業主希望「新增來源不需改核心程式」。本變更會建立共用的資料模型骨架（`job_publications` 1:N 表 + platform-publisher strategy pattern），**不做** cron 排程引擎（延後）。

D-05 內推來源（`reg_source='referral'`）已於候選人側呈現 chip，本變更聚焦職缺側的多平台發布狀態追蹤。

業主明確要求：不需要即時進度條動畫，但需要**持久化的同步狀態**可查（避免目前 toast 一閃而過無法確認是否成功）。

## What Changes

### 資料模型

- **新增 `job_publications` 表**（1:N 對 jobs）：`job_id / platform / platform_job_id / status / platform_fields(JSON) / published_at / sync_error / last_sync_attempt_at / created_at / updated_at`
- **遷移既有資料**：把 jobs 表上既有的 `job104_no / sync_status / job104_data / synced_at` 轉成 `job_publications` 一筆 `platform='104'` 紀錄；原欄位保留為 `@deprecated` 不動（避免破壞既有查詢），未來另一次變更再移除
- **candidates.reg_source**：D-05 已處理，此變更不碰

### 後端 Strategy Pattern

- 新增 `server/src/services/platform-publisher/` 目錄：
  - `index.js`：registry（platform key → adapter 對應）
  - `base.js`：抽象介面 `{ publish(jobData), update(platformJobId, jobData), close(platformJobId), reopen(platformJobId), fetchStatus?(platformJobId) }`
  - `104.adapter.js`：包裝既有 `services/104/job.service.js`（postJob / updateJob / patchJobStatus / deleteJob）
  - `518.adapter.js` / `1111.adapter.js`：**stub 實作**（throw NOT_IMPLEMENTED，讓架構完整但不真的串接）
- Jobs 路由（[server/src/routes/jobs.js](server/src/routes/jobs.js)）的 publish / close / update 流程改為**並行呼叫所有勾選平台**（`Promise.allSettled`），每個平台結果獨立寫入 `job_publications`
- **BREAKING**：`POST /api/jobs`、`PATCH /api/jobs/:id/status` 回傳結構新增 `publications: [{platform, status, error?}]`；舊 `sync_status` 保留但從 publications aggregate 而來

### 前端 UI

- **開職缺 / 編輯職缺 Modal**：新增「發布平台」區塊，checkbox 勾選（104 可用；518 / 1111 disabled 並標「Coming soon」），勾選 104 時才顯示 104 專屬欄位（既有的 role / salary / edu / workShifts 等）
- **職缺列表**：
  - 移除 `dataSource: 'internal' | '104'` Tab 與對應切換／過濾邏輯
  - 每列顯示 per-platform chip：`[104 ✅]` / `[104 ❌ 失敗]` / `[104 ⏳ 同步中]` / `[104 —]`（未發布此平台）
  - 點 chip 開詳情 Modal：狀態、同步時間、錯誤訊息、**重試同步按鈕**（呼叫 `POST /api/jobs/:id/publications/:platform/retry`）
- **狀態來源單一真理**：列表、統計、詳情共同走 `job_publications.status`，不再分散於 `jobs.sync_status`

### API 端點

- `POST /api/jobs/:id/publications/:platform/retry` 新端點：重試指定平台同步，覆寫該 `job_publications` 列狀態與 `last_sync_attempt_at`
- 既有 `POST /api/jobs` / `PATCH /api/jobs/:id/status` 行為擴充為「並行多平台」；單一平台失敗不影響其他平台（status 獨立標記）

## Non-Goals

- **518 / 1111 實際串接**：僅保留 adapter 介面與 UI 勾選預留，不呼叫真平台 API。未來業主要啟用某平台時，只需補 adapter 實作 + 移除 UI disabled。
- **Cron / 排程引擎（D-03 完整版）**：不建立定時自動同步。HR 透過「重試同步」按鈕手動觸發。
- **進度百分比 polling / SSE**：只呈現狀態 chip，不做動畫條。
- **背景 Job Queue**：並行 `Promise.allSettled` 在 publish API 內同步執行，單一平台預期延遲 < 5s。
- **刪除 jobs 表上的 deprecated 欄位**（`job104_no / sync_status / job104_data / synced_at`）：保留相容既有查詢，另次變更再處理。
- **候選人端顯示來源 chip**：D-05 已完成（`candidates.reg_source`），不在本變更範圍。
- **通知候選人職缺已下架 / 改變**：屬 D-08 email 通知範疇。

## Capabilities

### New Capabilities

- `job-platform-publishing`: 一個職缺可同時發布到多個外部平台（104 等），以 `job_publications` 表記錄每平台的發布狀態、錯誤訊息、可重試同步；HR UI 以 per-platform chip 顯示狀態，點擊可查詳情並重試。

### Modified Capabilities

(無 — 本變更不修改既有 spec 的 requirements；僅擴充 jobs 路由行為，未涉及其他 capability 的驗收條件)

## Impact

- **受影響模組 / 路由**：
  - L1 招募（`/employee/jobs`）列表 + 開職缺 Modal + 編輯職缺 Modal
- **受影響程式碼**：
  - 後端新增：`server/src/services/platform-publisher/`（index.js、base.js、104.adapter.js、518.adapter.js、1111.adapter.js）
  - 後端修改：`server/src/db/tenant-schema.js` + `server/src/db/tenant-db-manager.js`（新表 + 遷移腳本）、`server/src/routes/jobs.js`（publish / close / update 流程改走 platform-publisher；新增 retry endpoint）
  - 前端修改：`features/employee/pages/jobs-page/`（移除 dataSource Tab、改顯示 per-platform chip、加入平台勾選器、詳情 Modal 含重試按鈕）
  - 前端修改：`features/employee/models/job.model.ts`（`Job.publications: JobPublication[]`）、`features/employee/services/job.service.ts`（retry API 呼叫）
- **相依系統**：
  - 既有 `services/104/job.service.js`（包裝進 104.adapter.js 不重寫）
  - `jobs.status` 狀態機（draft / review / published / closed）— 不變
- **DB 遷移**：
  - `tenant-schema.js initTenantSchema` 與 `tenant-db-manager.js _runMigrations` 雙清單同步：新增 `job_publications` 表 + 資料遷移 SQL（從既有 `jobs.job104_no` 塞一筆 `platform='104'` 紀錄）
