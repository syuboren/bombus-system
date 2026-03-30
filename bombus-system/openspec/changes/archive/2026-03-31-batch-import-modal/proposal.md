## Why

`unified-employee-management` change 已完成後端 API（`/api/employee/batch-import/*`）、Service 方法（`EmployeeService.batchImportValidate/Execute/Status/Report`）、以及資料模型（`BatchImportRow`、`BatchValidationResult`、`BatchImportJob`、`BatchImportResult`），但前端 Modal UI 未實作。目前 `employee-management-page` 的「批次匯入」按鈕呼叫 `openBatchModal()` 只設定 `showBatchModal.set(true)`，模板中缺少對應的 `@if (showBatchModal())` 渲染區塊，導致按鈕點了沒反應。

此變更影響 SYS 系統管理模組（`/settings/users` 路由），路由載入的是 `EmployeeManagementPageComponent`。

## What Changes

- 在 `employee-management-page.component.html` 新增批次匯入 Modal 完整 UI，包含六步驟工作流：
  1. **上傳 CSV**：檔案選取 + 拖放區域 + CSV 範本下載連結
  2. **驗證中**：呼叫 `batchImportValidate()` 並顯示進度指示
  3. **預覽報告**：表格展示每筆驗證結果（✓/✗ + 錯誤原因），有錯時禁用確認按鈕
  4. **匯入中**：呼叫 `batchImportExecute()`，以 `batchImportStatus()` 輪詢進度條
  5. **匯入完成**：顯示成功/失敗統計
  6. **結果報告**：呼叫 `batchImportReport()` 顯示明細（含臨時密碼），提供下載按鈕
- 在 `employee-management-page.component.ts` 擴充批次匯入相關信號與方法（CSV 解析、步驟控制、輪詢、下載報告）
- 在 `employee-management-page.component.scss` 新增批次匯入 Modal 樣式

## Non-Goals

- 不修改後端 API（`batch-import.js` 已完成）
- 不修改 `EmployeeService`（API 方法已完成）
- 不修改資料模型（`BatchImportRow` 等已定義）
- 不支援 Excel（.xlsx）匯入，僅 CSV
- 不實作 SMTP 寄送密碼通知（未來擴充）

## Capabilities

### New Capabilities

- `batch-import-workflow-modal`: 批次匯入六步驟工作流 Modal UI，包含 CSV 上傳/解析、驗證預覽、匯入執行、進度輪詢、結果報告下載

### Modified Capabilities

（無）

## Impact

- 影響路由：`/settings/users`（SYS 系統管理模組）
- 影響程式碼：
  - `src/app/features/organization/pages/employee-management-page/employee-management-page.component.html`
  - `src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts`
  - `src/app/features/organization/pages/employee-management-page/employee-management-page.component.scss`
