## 1. 後端：Login response includes employee_id（Decision 1: 身份推導機制）

- [x] 1.1 實作 Login response includes employee_id：修改 `server/src/routes/auth.js` 登入回應，加入 `employee_id` 欄位（從 users.employee_id 讀取，nullable）。同時確認 refresh token 回應若有回傳 user 也需包含 `employee_id`。**驗證**：使用 `admin@demo.com` 登入，回應 JSON 包含 `employee_id` 欄位（可能為 null 或實際 ID）

## 2. 前端 Model 與 Service：Login response includes employee_id

- [x] 2.1 修改 `features/auth/models/auth.model.ts` 的 `User` interface，新增 `employee_id?: string | null` 欄位。**驗證**：TypeScript 編譯無錯誤
- [x] 2.2 確認 `features/auth/services/auth.service.ts` 正確將 `employee_id` 存入 currentUser signal（login + refresh 流程）。**驗證**：登入後 `authService.currentUser()?.employee_id` 有值

## 3. 前端元件：Identity-based permission derivation（Decision 3: 權限計算）

- [x] 3.1 實作 Identity-based permission derivation：在 `shared/components/employee-detail/employee-detail.component.ts` inject `AuthService` 與 `FeatureGateService`，新增 `isSelf`、`canSign`、`canUpload` computed signals。**驗證**：員工登入查看自己 → `isSelf=true`；HR 查看他人 → `isSelf=false, canUpload=true`

## 4. 前端 UI：Onboarding signature section in documents tab（Decision 2: documents tab 互動升級）

- [x] 4.1 實作 Onboarding signature section in documents tab：重構 `employee-detail.component.html` 的 documents tab，新增入職文件簽署區塊：顯示 `signatureSubmissions` 列表、狀態 badge（待簽署/已簽署/已核准/已拒絕）。`isSelf && status === 'DRAFT'` 時顯示「前往簽署」按鈕（`window.open` 新分頁至 `/employee/onboarding/sign/:token`）。**驗證**：員工看自己有「前往簽署」按鈕；HR 看他人只有狀態顯示
- [x] 4.2 處理無 submissions 空狀態：顯示友善提示訊息。**驗證**：無入職文件時顯示「尚無入職文件」提示

## 5. 前端 UI：Document upload section in documents tab

- [x] 5.1 實作 Document upload section in documents tab：重構 documents tab 新增入職資料上傳區塊：5 種固定文件類型（id_card、bank_account、health_report、photo、education_cert）+ 其他文件。`canUpload` 時顯示上傳/重傳/刪除按鈕，否則僅顯示狀態與下載連結。使用 `OnboardingService` 方法操作。**驗證**：canUpload=true 時可見上傳按鈕；canUpload=false 時只有下載
- [x] 5.2 實作檔案上傳互動：file input 觸發、上傳中 loading 狀態、成功/失敗 toast 通知。**驗證**：選擇檔案後上傳成功，顯示成功 toast
- [x] 5.3 實作重新上傳與刪除功能：重傳呼叫 `reuploadDocument()`，刪除需確認對話框後呼叫 `deleteUploadedDocument()`。**驗證**：重傳後檔案更新；刪除前彈出確認框
- [x] 5.4 實作「新增其他文件」功能：可輸入自訂名稱，上傳 type='other' 文件，無數量限制。**驗證**：可連續新增多筆其他文件

## 6. 前端 UI：Refresh documents after operations

- [x] 6.1 實作 Refresh documents after operations：操作完成後自動重新載入文件列表（upload/reupload/delete 成功後 refresh `uploadedDocuments` signal）。在簽署區塊加入「重新整理」按鈕，點擊後重新載入 `signatureSubmissions`。**驗證**：上傳後列表即時更新；點重新整理後簽署狀態更新

## 7. 樣式與收尾

- [x] 7.1 更新 `employee-detail.component.scss`：簽署區塊與上傳區塊使用 `@include card`、狀態使用 `@include status-badge`、按鈕使用 `@include button-module($color-l1-sage)`。確保 Soft UI 風格與響應式佈局。**驗證**：視覺與 L1 模組風格一致，手機板面正常顯示
- [x] 7.2 Angular build 驗證：執行 `cd bombus-system && npx ng build --configuration=development` 確認無編譯錯誤。**驗證**：build 成功，0 errors
