## 1. 資料層遷移

- [x] 1.1 在 `server/src/db/tenant-schema.js` 的 `BUSINESS_TABLES_SQL` 新增 `job_publications` 表：`id TEXT PRIMARY KEY / job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE / platform TEXT NOT NULL / platform_job_id TEXT / status TEXT NOT NULL DEFAULT 'pending' / platform_fields TEXT / sync_error TEXT / last_sync_attempt_at TEXT / published_at TEXT / created_at / updated_at`，對應 Decision「新表 `job_publications` 1:N vs 擴展 `jobs.publications` JSON 欄位」選擇前者。驗證：新建 demo 租戶後 `PRAGMA table_info(job_publications)` 顯示欄位齊全
- [x] 1.2 在 `initTenantSchema` 內建立 `UNIQUE INDEX idx_job_publications_job_platform ON job_publications(job_id, platform)` 與 `idx_job_publications_status ON job_publications(status)`，對應需求「Each job-platform pair has exactly one publications row」。驗證：EXPLAIN QUERY PLAN 使用 unique index
- [x] 1.3 在 `server/src/db/tenant-db-manager.js _runMigrations()` 同步新增 `CREATE TABLE IF NOT EXISTS job_publications ...` 與兩個索引（雙遷移清單同步，避免既有租戶缺表）。驗證：啟動後既有租戶 migration log 出現 `job_publications` 遷移步驟
- [x] 1.4 在 `_runMigrations()` 新增冪等資料遷移：`INSERT INTO job_publications (...) SELECT ... FROM jobs WHERE job104_no IS NOT NULL AND NOT EXISTS (SELECT 1 FROM job_publications WHERE job_id = jobs.id AND platform = '104')`；將既有 `jobs.job104_no / sync_status / job104_data / synced_at` 映射成一筆 `platform='104'` 紀錄（完成需求「Legacy 104 data is migrated to job_publications on tenant DB load」，對應 Decision「遷移既有 104 資料」與 Open Q1 歷史 pending 一律設為 pending）。驗證：跑兩次遷移仍只有一筆對應紀錄

## 2. 後端 Strategy Pattern — platform-publisher

- [x] 2.1 新建 `server/src/services/platform-publisher/base.js`：輸出 `BasePlatformPublisher` 抽象類別與 `NotImplementedError`，定義 `publish(jobData) / update(platformJobId, jobData) / close(platformJobId) / reopen(platformJobId)` 四個方法（預設 throw NotImplemented），對應 Decision「Strategy Pattern：platform-publisher service」。驗證：單元呼叫 base 方法會 throw
- [x] 2.2 新建 `server/src/services/platform-publisher/104.adapter.js`：繼承 base，四個方法分別包裝既有 `services/104/job.service.js` 的 postJob / updateJob / patchJobStatus(off) / patchJobStatus(on)，`publish` 回傳 `{ platformJobId: result.jobNo }`（完成需求「Platform adapter registry abstracts per-platform publish/update/close calls」的 104 分支）。驗證：mock job104Service 後呼叫 adapter 能正確轉發
- [x] 2.3 新建 `518.adapter.js` 與 `1111.adapter.js`：所有方法 throw `NotImplementedError('Platform not implemented')`（完成需求「518 stub adapter throws NOT_IMPLEMENTED」）。驗證：呼叫任一方法皆 throw 對應 code
- [x] 2.4 新建 `server/src/services/platform-publisher/index.js`：export `getPublisher(platform)` 從 registry 物件查 adapter，查無回 `null`；export `SUPPORTED_PLATFORMS = ['104', '518', '1111']` 與 `ENABLED_PLATFORMS = ['104']`（前端 UI 依此顯示 disabled）。驗證：`getPublisher('104') instanceof Publisher104`，`getPublisher('nope') === null`
- [x] 2.5 在 104.adapter 的 publish / update 外層加 15 秒 timeout wrapper（`Promise.race([call, timeout])`），超時 throw 特定 error（對應 Risk「單平台超時拖累整體延遲」）。驗證：mock job104Service 延遲 20s 時 adapter 於 15s 拋 timeout

## 3. 後端 Routes 整合 — jobs.js 改走 publisher registry

- [x] 3.1 重構 `server/src/routes/jobs.js` publish flow（status 轉 published 時）：**先依 payload.selectedPlatforms 對每個勾選平台 upsert pending 列**（`INSERT ... ON CONFLICT(job_id, platform) DO UPDATE SET status='pending', sync_error=NULL`，既有 failed 列一併被重置；未勾選的平台既有列保留不動不再 dispatch），**再讀取** `job_publications` 該 job 所有 `status='pending'` 或 `'failed'` 的列 → `Promise.allSettled` 並行呼叫各 adapter.publish → 結果寫回對應列的 status（synced / failed）、platform_job_id、sync_error、last_sync_attempt_at、published_at（完成需求「Publishing a job dispatches to all selected platforms in parallel」，對應 Decision「同步模式：`Promise.allSettled` 並行」）。驗證：整合測試 mock 兩個 adapter，一個成功一個失敗，驗兩列狀態獨立；另驗無 selectedPlatforms 的舊 payload 不會 upsert 新列
- [x] 3.2 重構 update flow（PUT /:id 偵測關鍵欄位變動）：對每個已發布平台（`status='synced'`）呼叫 adapter.update(platformJobId, payload)，Promise.allSettled，失敗該列改 `status='failed'` + sync_error，成功 `last_sync_attempt_at` 更新（對齊既有 D-09 update + close 邏輯）。驗證：mock 兩平台 update，其中一個失敗，驗前端能看到 `failed` chip
- [x] 3.3 重構 close flow（status 轉 closed 時）：對 `status='synced'` 的列呼叫 adapter.close，結果寫 `status='closed'` 或失敗則保留 failed + sync_error（完成需求「Closing a job cascades to all active platform publications」）。驗證：關閉職缺後列狀態正確轉 closed
- [x] 3.4 重構 delete flow（完成需求「Deleting a job closes platform publications before cascade removal」）：刪除 jobs 時對每個 `status='synced'` 的 publications 呼叫 `adapter.close(platformJobId)`（**不呼叫 `job104Service.deleteJob`**，對應 Decision「Delete flow：呼叫 `adapter.close()` 而非 `deleteJob()`」）；單一平台 close 失敗以 log 記錄但不中斷刪除；再讓 `ON DELETE CASCADE` 刪除 `job_publications` 列。驗證：(a) 刪除前有 104 synced 列時，確認 104 端職缺 switch 轉 off（非永久刪除）、(b) `jobs` 列與對應 `job_publications` 列皆已清除、(c) mock 104 adapter close 拋錯時本地仍刪除成功且回應含 warning
- [x] 3.5 新增 `POST /api/jobs/:jobId/publications/:platform/retry` 端點（require `L1.jobs.edit`）：查 `job_publications` 該列；若 `status='closed'` 回 409；若 `platform_job_id` 存在 → 呼叫 adapter.update，否則 → adapter.publish；結果覆寫同列 status/sync_error/last_sync_attempt_at（完成需求「HR can retry a failed platform synchronization」，對應 Decision「重試機制」單平台獨立 endpoint）。驗證：失敗列重試成功後 chip 變綠；closed 列重試回 409
- [x] 3.6 維持既有 `jobs.sync_status` / `jobs.job104_no` 欄位作為向後相容的 derived 資料：在**三個** publish 寫入路徑都同步回寫這些欄位（從 `job_publications` platform='104' 列 derive）：(a) `POST /api/jobs` 建立後首次 publish、(b) `PUT /api/jobs/:id` update 觸發重新 sync、(c) `PATCH /api/jobs/:id/status` 切 published/closed。對應 Risk「既有 API 回應增加 publications 可能破壞前端」，避免既有 recruitment.js / talent-pool.js / candidates-summary（[routes/jobs.js:735](server/src/routes/jobs.js#L735)）查詢看到過時資料。驗證：三條路徑皆用 SQL `SELECT sync_status, job104_no FROM jobs WHERE id = ?` 覆核與 publications 狀態一致
- [x] 3.7 `GET /api/jobs` 與 `GET /api/jobs/:id` 回應新增 `publications: [{platform, status, platform_job_id, sync_error, last_sync_attempt_at, published_at}]` 欄位，從 `job_publications` 列組成。驗證：API 回應 shape 含 publications 陣列

## 4. 前端 Model 與 Service

- [x] 4.1 在 `src/app/features/employee/models/job.model.ts` 新增 `JobPublicationStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'closed'`（對應 Decision「狀態機：`job_publications.status` 5 態」）與 `JobPublication` interface（`platform / status / platform_job_id? / sync_error? / last_sync_attempt_at? / published_at?`）；`Job` interface 新增 `publications?: JobPublication[]`。驗證：`npx tsc --noEmit` 通過
- [x] 4.2 `src/app/features/employee/services/job.service.ts` 的 `mapDbJobToLocal` 加映射 `publications` 陣列；新增 `retryPublication(jobId, platform): Observable<Job>` 呼叫新 retry endpoint。驗證：service spec 模擬 HTTP 回應後端 publications array，mapper 正確轉成前端 Job

## 5. 前端 UI — 開職缺 / 編輯職缺 Modal

- [x] 5.1 `features/employee/pages/jobs-page/jobs-page.component.ts` 新增「發布平台」選擇狀態 signal `selectedPlatforms = signal<string[]>(['104'])`；定義常數 `SUPPORTED_PLATFORMS` 與 `ENABLED_PLATFORMS`。驗證：開 Modal 預設勾 104
- [x] 5.2 更新開職缺 / 編輯職缺 Modal 的模板：新增平台 checkbox 區塊，104 enabled、518/1111 disabled + tooltip「平台尚未開放」；勾選 104 時顯示既有 104 欄位區塊（完成需求「HR selects target platforms when creating or editing a job」）。驗證：disabled checkbox 無法勾選、hover 顯示 tooltip
- [x] 5.3 送出新職缺 / 更新職缺時把 `selectedPlatforms` 帶進 payload，後端用於決定 publish 目標平台。驗證：payload 含 `selectedPlatforms` 陣列

## 6. 前端 UI — 職缺列表 Chip 與詳情 Modal

- [x] 6.0 **職缺基礎能力與外部發布解耦**（完成需求「Job base actions are unified regardless of external publication status」）：移除 [jobs-page.component.html](src/app/features/employee/pages/jobs-page/jobs-page.component.html) 所有 `job.source === '104'` / `!== '104'` 條件；published 職缺一律顯示「新增候選人 / 發起內推 / 關閉職缺」；另新增「從外部平台同步候選人」按鈕並以 `job.publications.some(p => p.status === 'synced')` 為顯示條件（本次為 UI stub，實際 104 Resume API 整合屬另立 `job-104-candidate-sync` 變更）。驗證：104 同步職缺與純內部職缺的操作列按鈕組相同；有 synced publication 的職缺多出一個雲端下載圖示按鈕
- [x] 6.1 移除 `dataSource: 'internal' | '104'` Tab 與相關切換邏輯（`switchDataSource` 方法、`filter(j => !j.job104No)` 過濾、HTML tab-group）— 對應 Decision「UI：Tab 移除 vs 保留」選擇移除。驗證：列表永遠顯示所有職缺
- [x] 6.2 職缺列表每列新增 per-platform chip 區塊（104 / 518 / 1111 三個固定位置）：根據 `job.publications` 該 platform 的 status 決定顯示：`synced` 綠勾 / `failed` 紅叉 + tooltip 錯誤 / `pending` `syncing` 灰色 loading / `closed` 深灰 / 無紀錄 `—`（完成需求「Job list displays per-platform publication chips」）。驗證：各狀態 chip 顯示正確
- [x] 6.3 新建 `features/employee/components/publication-detail-modal/` 元件（standalone + OnPush + Signal APIs，L1 鼠尾草綠）：`input()` 接 publication 物件，顯示平台 / 狀態 / platform_job_id / last_sync_attempt_at / sync_error，狀態為 `failed` 時顯示「重試同步」按鈕呼叫 `jobService.retryPublication`；`output()` 發 `retried` 事件通知父層重新載入（完成需求「Detail modal exposes retry for failed publication」）。驗證：點 failed chip 開 Modal，按重試後列表狀態更新
- [x] 6.4 jobs-page 掛載 publication-detail-modal，點 chip 時帶入對應 publication 資料；重試成功後 reload jobs list。驗證：整體流程順暢

## 7. 測試與收尾驗證

- [x] 7.1 撰寫後端整合測試 `server/src/tests/test-job-publications.js`：涵蓋遷移冪等（跑兩次）、publish 全平台成功、publish 單平台失敗其他成功、retry failed row、retry closed row 回 409、close 職缺級聯、518 stub 回 NOT_IMPLEMENTED 轉為 failed 寫入
- [x] 7.2 執行 `/verify` 技能：`npx tsc --noEmit`、`npx ng build --configuration=development`、後端整合測試全綠；**雙遷移清單驗證**（對應 CLAUDE.md「雙遷移清單同步」防護）：(a) 新建 demo 租戶流程 — 刪除 demo DB 後重跑 `npm run init-db`，執行 `PRAGMA table_info(job_publications)` 確認欄位齊全、`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='job_publications'` 確認 unique index 存在；(b) 既有租戶遷移流程 — 保留既有 DB 檔啟動 server，觀察 migration log 出現 `job_publications` 遷移步驟，執行 `SELECT COUNT(*) FROM job_publications WHERE platform='104'` 確認歷史 `job104_no` 被遷移；(c) 冪等性驗證 — 再次重啟 server 確認 publications 列數不變
- [x] 7.3 `/seed-verify` 確認 demo 職缺遷移後可在列表看到 104 chip，能走新 retry endpoint
- [x] 7.4 更新《現況與問題比對分析_20260406.xlsx》D-02 與 D-03 的「修改狀態」= 已修正，「修改說明」填入本次實作摘要（適度附 D-03 排程引擎留待未來說明）
