## Context

Bombus 目前職缺只支援內部 + 104 二分模式：

- `jobs` 表是單一事實表但綁 104 欄位：`job104_no / sync_status / job104_data / synced_at`（[tenant-schema.js:574-590](server/src/db/tenant-schema.js#L574)）
- `services/104/job.service.js` 已完整實作 104 B2B push API（postJob / updateJob / patchJobStatus / deleteJob）
- `routes/jobs.js` 在 publish（status→published）時自動呼叫 `postJob()`（[:400](server/src/routes/jobs.js#L400)）、close 時呼叫 `patchJobStatus(off)`（[:445](server/src/routes/jobs.js#L445)）、update 既已同步 104（[:696](server/src/routes/jobs.js#L696)）、刪除時連 104 刪除（[:890](server/src/routes/jobs.js#L890)）
- 前端 `jobs-page` 有 `dataSource: 'internal' | '104'` Tab 切換，用 `job.job104No` 存在與否過濾

既有架構實際上已經完成 80% 的 104 整合，但：
1. **資料模型綁死 104**：新增 518 / 1111 要改 `jobs` 表欄位與 `jobs.js` 所有分支
2. **同步狀態分散**：`sync_status` 只能反映 104 一個平台，無法同時代表多平台
3. **UI 分兩種職缺**：Tab 切換讓使用者感覺是兩個系統，違背業主「一職缺多平台」的心智模型
4. **失敗無法重試**：既有流程若 104 push 失敗只回 toast，HR 無法事後重試（只能編輯職缺觸發 update）

本變更目標是**在不打破既有 104 流程的前提下**，抽出一層 publisher 抽象並以新表 `job_publications` 做多平台狀態追蹤。

## Goals / Non-Goals

**Goals:**

- 一個 `jobs` 紀錄可同時發布到多個平台，每平台獨立儲存狀態與錯誤訊息
- 現有 104 push 行為保留（不重寫 `services/104/job.service.js`），但改經 adapter 介面呼叫
- HR 在職缺列表直接看到每平台狀態 chip，點擊可查詳情並**重試失敗同步**
- 架構可擴展：未來啟用 518 / 1111 時，只需補 adapter 實作，不改核心 routes/UI
- 資料遷移無痛：既有職缺的 104 狀態自動轉為一筆 `job_publications` 紀錄，既有 API 回應格式向後相容

**Non-Goals:**

- **518 / 1111 真正串接**：只預留 adapter stub + UI disabled，不實作真實 API 呼叫
- **定時自動同步（D-03 cron 引擎）**：只提供手動重試按鈕
- **同步進度條 / SSE / polling**：只持久化狀態，由 HR 主動刷新列表查看
- **背景 Job Queue**：同步呼叫夠用；單平台 < 5s、多平台 Promise.allSettled 並行
- **刪除 deprecated 欄位**：`jobs.job104_no` 等保留避免破壞既有查詢
- **候選人來源 chip**：D-05 已處理，不碰
- **通知候選人職缺變動**：屬 D-08 範疇

## Decisions

### 新表 `job_publications` 1:N vs 擴展 `jobs.publications` JSON 欄位

**決策**：**新表 1:N**。
`job_publications` 欄位：

```sql
CREATE TABLE job_publications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,               -- '104' | '518' | '1111'
  platform_job_id TEXT,                 -- 遠端平台回傳的 ID（104: job104_no）
  status TEXT NOT NULL DEFAULT 'pending',-- pending / syncing / synced / failed / closed
  platform_fields TEXT,                 -- JSON，各平台特殊欄位（104 的 role/salary/edu 等）
  sync_error TEXT,                      -- 最近一次失敗訊息
  last_sync_attempt_at TEXT,
  published_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE(job_id, platform)
);
```

**理由**：

- **報表查詢友善**：「本月 104 發布了幾個職缺」、「失敗超過 3 次的平台」這類跨職缺查詢，1:N 表可直接 GROUP BY，JSON 搜尋不利索引
- **狀態獨立演化**：每平台的 status/error/platform_fields 各自是 first-class row，避免 UPDATE JSON 字段的並行 race
- **UNIQUE(job_id, platform) 保證**：同職缺同平台只有一筆發布紀錄，不會重複 push

**替代方案（已否決）**：
- `jobs.publications JSON`：JSON 操作需額外函式（`json_extract` / `json_set`），並行寫入易 race；未來要 index 特定平台狀態困難

### Strategy Pattern：platform-publisher service

**決策**：在 `server/src/services/platform-publisher/` 建立 adapter registry。

```js
// base.js
class BasePlatformPublisher {
  async publish(jobData) { throw new NotImplemented(); }
  async update(platformJobId, jobData) { throw new NotImplemented(); }
  async close(platformJobId) { throw new NotImplemented(); }
  async reopen(platformJobId) { throw new NotImplemented(); }
}

// 104.adapter.js
class Publisher104 extends BasePlatformPublisher {
  async publish(jobData) {
    const result = await job104Service.postJob(jobData);  // 沿用既有 service
    return { platformJobId: result.jobNo };
  }
  async update(id, data) { return job104Service.updateJob(id, data); }
  async close(id) { return job104Service.patchJobStatus(id, { switch: 'off' }); }
  async reopen(id) { return job104Service.patchJobStatus(id, { switch: 'on' }); }
}

// index.js
const registry = { '104': new Publisher104(), '518': new Publisher518(), '1111': new Publisher1111() };
function getPublisher(platform) { return registry[platform] || null; }
```

**理由**：
- 包裝**已有**的 `services/104/job.service.js`，避免重寫已 battle-tested 的 104 整合
- 新平台只需實作 5 個方法，對 `routes/jobs.js` 透明
- 518 / 1111 先用 stub（throw 'NOT_IMPLEMENTED'），對應 UI 標示 disabled

**替代方案（已否決）**：
- Function 陣列 / 直接在 routes/jobs.js switch 分支：無抽象邊界，加平台又要改核心路由

### 同步模式：`Promise.allSettled` 並行

**決策**：publish / update / close 時收集所有勾選平台，`Promise.allSettled` 並行呼叫所有 adapter，結果獨立寫入 `job_publications`。**單一平台失敗不影響其他平台成功**。

```js
const publications = await Promise.allSettled(
  selectedPlatforms.map(p => getPublisher(p).publish(jobData))
);
// 每筆 fulfilled / rejected 分別寫入 job_publications.status='synced'/'failed'
```

**理由**：
- 並行 → 總延遲 ≈ 最慢那個平台（而非累加）
- `allSettled` 而非 `all` → 一個平台失敗不中斷其他成功的寫入
- 與業主「不需進度條，只要知道哪個平台成功 / 失敗」的需求一致

### 重試機制

**決策**：`POST /api/jobs/:id/publications/:platform/retry` 獨立端點，**單平台**重試。

- 讀取 `job_publications` 該列的 `platform_fields`（之前 publish 時存的）
- 若 `platform_job_id` 存在 → 呼叫 `update()`；不存在 → 呼叫 `publish()`
- 結果覆寫 `status / sync_error / last_sync_attempt_at`

**理由**：
- 比「重新 publish 整筆職缺」更明確，不會誤動到已成功的平台
- HR 看到失敗 chip 直接按「重試」，體驗直觀

### Delete flow：呼叫 `adapter.close()` 而非 `deleteJob()`

**決策**：本地刪除職缺（`DELETE /api/jobs/:id`）時，對每個 `status='synced'` 的 `job_publications` 列呼叫 `adapter.close(platformJobId)`，**不**在 adapter 介面新增 `delete()` 方法。本地列由 `jobs ON DELETE CASCADE` 自動清除。

**理由**：

- **介面最小化**：adapter 介面保持 4 方法（publish / update / close / reopen），不因單一平台（104）曾有 `deleteJob` 就擴張介面；518 / 1111 未來接入時也不必實作 delete
- **外部平台歷史可追溯**：104 端保留「已關閉」紀錄比「無紀錄」對稽核、候選人查詢都更友善（候選人若有投遞履歷仍可追溯職缺歷史）
- **使用者感知一致**：HR 點「刪除」後本地列不再出現；外部平台狀態「已關閉」不等於「消失」，但實際上 104 前台已不顯示 off 狀態職缺
- **既有 `deleteJob` 端點保留**：`services/104/job.service.js.deleteJob()` 不刪除程式碼，僅從 routes/jobs.js delete flow 移除呼叫；若未來需要強制清理 104 資料，可獨立實作「從 104 端點觸發刪除」的管理介面

**替代方案（已否決）**：

- adapter.delete() 與 close() 並存：增加實作負擔（stub 也要多寫一份），語意模糊（「刪除」在各平台定義不同，104 是永久刪除、1111 可能只是下架）
- 保留 `job104Service.deleteJob` 呼叫：違背 strategy pattern「routes 不認識特定平台」原則

**影響範圍**：[routes/jobs.js:890](server/src/routes/jobs.js#L890) 的 delete flow 需改寫；本變更不觸及 `services/104/job.service.js` 本體。

### 狀態機：`job_publications.status` 5 態

```
pending   → 尚未嘗試過（勾選平台但尚未 trigger publish）
syncing   → publish 呼叫中（Promise 未 resolve）— 短暫狀態
synced    → 已成功同步至該平台
failed    → 最近一次嘗試失敗，sync_error 有內容，可重試
closed    → 已呼叫 adapter.close()（jobs.status='closed' 時批次標記）
```

**理由**：避免過度細分；HR 需要區分的主要是「成功 / 失敗 / 還沒發」3 種，加 `closed` 以區分「職缺下架後仍需保留歷史」。

### 遷移既有 104 資料

**決策**：租戶 DB 遷移時，對 `jobs` 表每列 `job104_no IS NOT NULL` 的紀錄，寫一筆 `job_publications` row：

```sql
INSERT INTO job_publications (id, job_id, platform, platform_job_id, status, platform_fields, published_at, created_at)
SELECT
  lower(hex(randomblob(16))),  -- 新 uuid
  id, '104', job104_no,
  CASE sync_status
    WHEN '104_synced' THEN 'synced'
    WHEN '104_pending' THEN 'pending'
    ELSE 'pending'
  END,
  job104_data,                  -- JSON 移到 platform_fields
  synced_at,
  created_at
FROM jobs
WHERE job104_no IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM job_publications WHERE job_id = jobs.id AND platform = '104');
```

**理由**：
- 冪等（`NOT EXISTS` 防重複）
- 既有欄位保留不動，既有查詢不破壞，另次變更再清理 deprecated 欄位

### UI：Tab 移除 vs 保留

**決策**：**移除** `dataSource: 'internal' | '104'` Tab。列表永遠顯示所有職缺，每列右側以 chip 顯示已發布平台。

**理由**：
- Tab 切換違背「一職缺多平台」的心智模型
- 使用者現在用 Tab 主要是找「還沒發到 104 的職缺」— 未來要做可改為「依平台篩選」的 filter（放在 filter bar 而非 Tab），本變更直接於 filter bar 新增「所有平台 / 104 / 518 / 1111 / 僅內部」下拉

### 職缺基礎能力與外部發布解耦

**決策**：每個職缺的基礎能力（**新增候選人 / 發起內推 / 關閉職缺 / 編輯 / 刪除 / 查看候選人**）不受「是否發布到外部平台」影響。外部平台是**管道**，不是職缺類型。僅有「從外部平台同步候選人」這類直接依賴外部 API 的功能，才會依 `publications[].status='synced'` 條件顯示。

**理由**：

- 業主心智模型：「職缺本質都是內部職缺，104/518/1111 只是發布管道」。HR 不論職缺是否發到 104 都會希望能手動新增候選人或發起內推 — 這些是通用的招聘動作，不屬於特定平台
- 舊行為：UI 用 `job.source === '104'` 條件把「新增候選人」按鈕藏起來（僅在非 104 職缺顯示），造成 HR 看到 104 職缺時無法直接新增候選人，必須從其他路徑繞道
- 新行為：
  - **共通動作** — `status='published'` 的職缺一律顯示「新增候選人 / 發起內推 / 關閉職缺」等基礎按鈕
  - **外部依賴動作** — 僅當 `job.publications.some(p => p.status === 'synced')` 時顯示「從外部平台同步候選人」按鈕（本次為 UI stub，實際 104 Resume API 整合屬後續 `job-104-candidate-sync` 變更範圍）
- 前端 `Job.source` 欄位從此視為 **deprecated**，僅供舊查詢相容，UI 條件判斷一律改讀 `publications`

**影響範圍**：[jobs-page.component.html](src/app/features/employee/pages/jobs-page/jobs-page.component.html) 移除所有 `job.source === '104'` 條件判斷，改以 `publications` 作為條件來源。

## Risks / Trade-offs

- **[Risk] 遷移腳本對大量職缺 tenant 延遲** → **Mitigation**：tenant-db-manager 遷移跑於租戶首次載入；demo 租戶預期職缺 < 50 筆可忽略。對既有客戶部署時建議離峰執行並記錄遷移時間。
- **[Risk] 既有 API 回應增加 `publications` 欄位可能破壞前端** → **Mitigation**：只 `add` 不 `remove` 欄位；`sync_status` 暫時保留（從 publications 中 104 的 status 同步 derive），新舊前端並存。
- **[Risk] Promise.allSettled 單平台超時拖累整體延遲** → **Mitigation**：adapter 層加 15s timeout wrapper；超時寫入 `failed` 而非卡死。
- **[Risk] 518 / 1111 adapter stub 若不慎被呼叫** → **Mitigation**：stub throw `NOT_IMPLEMENTED`，routes 層 try/catch 轉為 `failed` 寫入，前端顯示「平台尚未開放」。UI disabled checkbox 為第一道防線。
- **[Trade-off] 不在本次清理 `jobs.job104_no / sync_status / job104_data / synced_at` 等 deprecated 欄位** → 保留相容既有查詢（recruitment.js / talent-pool.js 皆讀）；清理為另次變更，待確認無他人使用再拆。
- **[Trade-off] 不做 518 / 1111 真實 adapter** → UI 先灰色預留。業主需要啟用時補 adapter 即可，不需動核心。

## Migration Plan

1. `tenant-schema.js` 新增 `job_publications` CREATE TABLE 至 BUSINESS_TABLES_SQL
2. `tenant-db-manager.js _runMigrations()` 同步新增：
   - `CREATE TABLE IF NOT EXISTS job_publications ...`
   - `CREATE UNIQUE INDEX IF NOT EXISTS idx_job_publications_job_platform ON job_publications(job_id, platform)`
   - 資料遷移 INSERT（冪等，WHERE NOT EXISTS）
3. 部署後首次啟動時每個租戶自動跑遷移；遷移完成後新 UI 立即可用
4. **Rollback**：若需回退：
   - 停用前端平台 chip / 重試按鈕 + 恢復舊 dataSource Tab
   - 後端 publish flow 恢復呼叫 `job104Service.postJob` 直接寫 `jobs.job104_no`
   - `job_publications` 表保留（不破壞資料），下版再決定是否清理

## Open Questions

- **Q1：歷史「發布失敗」的職缺遷移時狀態設為何？**
  現況 `sync_status='104_pending'` 可能代表「尚未 push」或「push 失敗」— 資料上不可區分。
  建議：遷移時一律設為 `pending`，HR 可手動「重試同步」明確重新驗證。
- **Q2：518 / 1111 UI 是否顯示「Coming soon」還是完全隱藏？**
  建議：disabled checkbox + hover tooltip「平台尚未開放，聯繫 PM 啟用」。讓業主 / 客戶看到功能已預留。
- **Q3：重試按鈕是否對 closed 狀態的職缺開放？**
  建議：closed 職缺顯示 chip 但不給重試；必須先 reopen 職缺再重試，避免邏輯衝突。
