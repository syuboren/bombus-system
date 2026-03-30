## 1. 元件狀態與基礎架構

- [x] 1.1 **[前端]** Step-based modal with signal state machine — 在 `employee-management-page.component.ts` 新增 `batchStep` signal（`'upload' | 'validating' | 'preview' | 'importing' | 'complete'`）、`parsedRows` signal、`validationResult` signal、`importJobId` signal、`importJob` signal、`importResults` signal、`selectedFile` signal、`pollingInterval` 屬性。在 `closeBatchModal()` 中重置所有狀態並清除 polling interval。在 `OnDestroy` 中清除 interval（Polling cleanup on destroy）。驗證：呼叫 `openBatchModal()` 後 `batchStep()` 為 `'upload'`，呼叫 `closeBatchModal()` 後所有狀態重置

## 2. CSV 上傳步驟

- [x] 2.1 **[前端]** CSV upload step UI — 在 `employee-management-page.component.html` 的 `@if (showBatchModal())` 區塊中，實作 `@switch (batchStep())` 第一個 case `'upload'`：包含拖放區域（dragover/drop 事件）、檔案輸入、檔名顯示、「下載 CSV 範本」連結、「開始驗證」按鈕。驗證：Modal 正確顯示上傳介面
- [x] 2.2 **[前端]** CSV 解析使用原生 JavaScript — 在 TS 中實作 `onFileSelected(event)` 和 `onFileDrop(event)` 方法，使用 `FileReader` 讀取 CSV，`split('\n')` + `split(',')` 解析，中英文欄位名對應表轉換為 `BatchImportRow[]`。非 CSV 檔案顯示錯誤訊息「僅支援 CSV 格式」（Non-CSV file rejected）。驗證：選取或拖放 CSV 後 `parsedRows` 正確填充
- [x] 2.3 **[前端]** CSV template download — 實作 `downloadTemplate()` 方法，產生含所有支援欄位中文名的 CSV 範本（含一行範例資料），用 Blob + createObjectURL 觸發下載（CSV 範本下載）。驗證：點擊下載連結取得正確範本

## 3. 驗證步驟

- [x] 3.1 **[前端]** Validation step UI — 實作 `@switch` case `'validating'`，顯示 spinner + 「驗證中...」文字。在 `startValidation()` 方法中將 `batchStep` 設為 `'validating'`，呼叫 `employeeService.batchImportValidate(parsedRows())`，成功後存入 `validationResult` 並切換到 `'preview'`（Batch import modal rendering + Validation step）。驗證：呼叫驗證 API 時顯示 spinner，完成後自動切換步驟

## 4. 預覽報告步驟

- [x] 4.1 **[前端]** Preview report step UI — 實作 `@switch` case `'preview'`：可捲動表格顯示每筆驗證結果（行號、姓名、Email、狀態圖示 ✓/✗、錯誤訊息），錯誤筆標紅底（Error row highlighting），下方顯示統計（N 筆通過 / N 筆錯誤）。「確認匯入」按鈕在 `errorRows > 0` 時 disabled 並顯示 tooltip「請修正錯誤後重新上傳」（Confirm import button state），另有「重新上傳」按鈕回到 upload 步驟（Preview report step）。驗證：表格正確渲染，有錯誤時按鈕 disabled

## 5. 匯入執行步驟

- [x] 5.1 **[前端]** Import execution step UI — 實作 `@switch` case `'importing'`：進度條 + 「N / M 筆處理中...」文字。`confirmImport()` 方法呼叫 `employeeService.batchImportExecute()`，取得 `jobId` 後以 `setInterval` 每 2 秒輪詢 `batchImportStatus(jobId)`（輪詢機制），更新進度條。`status === 'completed'` 時清除 interval 並載入報告（Import execution step）。驗證：進度條隨輪詢更新，完成後自動切換步驟

## 6. 結果報告步驟

- [x] 6.1 **[前端]** Result report step UI — 實作 `@switch` case `'complete'`：統計摘要卡片（成功/失敗/總計）、結果表格（姓名、Email、工號、狀態、臨時密碼、錯誤訊息）、「下載報告」按鈕和「關閉」按鈕（Result report step）。驗證：統計與明細正確顯示
- [x] 6.2 **[前端]** 結果報告下載 — 實作 `downloadReport()` 方法，將 `importResults` 轉為 CSV（含 BOM 支援中文），用 Blob + createObjectURL 觸發下載。驗證：下載的 CSV 含密碼與錯誤訊息，Excel 開啟無亂碼

## 7. 樣式

- [x] 7.1 **[前端]** 批次匯入 Modal SCSS — 在 `employee-management-page.component.scss` 新增批次匯入 Modal 樣式：overlay 背景、Modal 容器（Soft UI 風格、圓角 12px、柔和陰影）、拖放區域（虛線邊框、hover 效果）、步驟指示器、進度條、預覽表格（@include data-table）、統計卡片、錯誤行紅底。驗證：UI 符合莫蘭迪色系 Soft UI 設計風格
