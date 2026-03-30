## Context

`unified-employee-management` 已完成後端 4 支 API（validate/execute/status/report）、前端 `EmployeeService` 的 4 個方法、以及完整的 TypeScript 資料模型。`employee-management-page` 元件有 `showBatchModal` signal 和 `openBatchModal()/closeBatchModal()` 方法，但 HTML 模板缺少 Modal 渲染區塊。

此變更純前端，不涉及後端修改。

## Goals / Non-Goals

**Goals:**

- 實作完整的六步驟批次匯入 Modal（upload → validating → preview → importing → complete → report）
- 使用者可上傳 CSV → 預覽驗證結果 → 確認匯入 → 下載報告
- 符合 Soft UI 設計系統風格
- CSV 範本下載功能

**Non-Goals:**

- 不修改任何後端 API
- 不支援 Excel（.xlsx）
- 不實作 SMTP 密碼通知

## Decisions

### Step-based modal with signal state machine

使用 `batchStep` signal 控制 Modal 內容切換，步驟為：`'upload' | 'validating' | 'preview' | 'importing' | 'complete'`。

每個步驟對應一個 `@switch` 分支，避免多個 `@if` 巢狀。

### CSV 解析使用原生 JavaScript

不引入第三方 CSV parser。CSV 格式簡單（不含引號嵌套），用 `split('\n')` + `split(',')` 即可。中英文欄位名對應表在元件內定義。

### 輪詢機制

匯入執行後以 `setInterval` 每 2 秒呼叫 `batchImportStatus(jobId)` 輪詢進度。`status === 'completed'` 時自動停止輪詢並載入結果報告。

### 結果報告下載

使用 `Blob` + `URL.createObjectURL` 產生 CSV 下載。報告包含：行號、姓名、Email、工號、狀態、臨時密碼、錯誤訊息。

## Risks / Trade-offs

**[風險] 大量資料 CSV 解析阻塞 UI** → 緩解：前端僅做格式轉換，驗證由後端 API 處理。

**[風險] 輪詢未清除導致記憶體洩漏** → 緩解：在 `closeBatchModal()` 和元件 `OnDestroy` 中清除 interval。

**[風險] CSV 欄位分隔符不一致（逗號 vs 分號）** → 緩解：初期僅支援逗號分隔，提供標準範本下載引導使用者。
