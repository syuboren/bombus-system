## Context

Employee Detail Modal（`shared/components/employee-detail/`）的 documents tab 目前僅以唯讀方式展示入職文件簽署狀態與已上傳資料。入職文件的實際操作（簽署、上傳）必須到 `/employee/onboarding` 獨立模組才能進行。

此設計將 documents tab 升級為可互動介面，並透過身份自動推導決定操作權限。

**現有元件狀態**：
- `EmployeeDetailComponent` 已有 `signatureSubmissions` 與 `uploadedDocuments` signal
- 已 inject `OnboardingService`（含上傳/查詢方法）
- 接收 `employeeId` input（員工 ID，非 user ID）
- 接收 `readonly` input（目前控制 info tab 編輯模式）

**限制條件**：
- 登入 API 回應目前不含 `employee_id`，需補上
- `User` model 無 `employee_id` 欄位，需新增

## Goals / Non-Goals

**Goals:**

- 員工從 `/employee/profile` 開自己的詳情時，可在 documents tab 簽署入職文件（跳轉）+ 上傳入職資料（Modal 內）
- HR 從 `settings/user` 開任何員工詳情時，可查看簽署狀態 + 代為上傳入職資料
- 使用身份推導（`isSelf`）自動決定操作權限，無需父元件傳遞 mode
- HR 查看自己的檔案時，自動獲得「本人」權限（可簽署 + 上傳）

**Non-Goals:**

- 不在 Modal 內嵌簽名板元件（簽署走現有 `/employee/onboarding/sign/:token`）
- 不新增資料表
- 不調整 `/employee/onboarding` 模組本身

## Decisions

### Decision 1: 身份推導機制

**選擇**：在 `EmployeeDetailComponent` 中 inject `AuthService`，比對 `currentUser().employee_id` 與 `employeeId()` input，計算 `isSelf` computed signal。

**前提**：後端登入回應需新增 `employee_id` 欄位（從 `users.employee_id` 讀取）。

**替代方案**：
- 父元件傳 `mode` input → 拒絕，因為「HR 看自己的檔案」邊界情況無法正確處理
- 打額外 API 查詢 → 拒絕，登入時一次帶出更高效

**異動檔案**：
- `server/src/routes/auth.js` — 登入回應加 `employee_id`
- `features/auth/models/auth.model.ts` — `User` interface 加 `employee_id?: string | null`
- `features/auth/services/auth.service.ts` — refresh token 回應同步（若有回傳 user）

### Decision 2: documents tab 互動升級

**選擇**：重構 documents tab HTML 模板，分為兩個區塊：

1. **入職文件簽署區塊**：顯示 `signatureSubmissions` 列表
   - 每項顯示：文件名、狀態 badge（待簽署/已簽署/已核准/已拒絕）
   - `isSelf && status === 'DRAFT'` 時顯示「前往簽署」按鈕 → `window.open('/employee/onboarding/sign/' + token, '_blank')`
   - 非本人或已完成時僅顯示狀態

2. **入職資料上傳區塊**：顯示 5 種固定文件類型 + 其他文件
   - `canUpload`（`isSelf || hasEditPerm`）時顯示上傳/重傳/刪除按鈕
   - 上傳使用 `OnboardingService.uploadDocument()` / `reuploadDocument()`
   - 刪除使用 `OnboardingService.deleteUploadedDocument()`
   - 操作完成後 refresh 文件列表

**異動檔案**：
- `shared/components/employee-detail/employee-detail.component.ts`
- `shared/components/employee-detail/employee-detail.component.html`
- `shared/components/employee-detail/employee-detail.component.scss`

### Decision 3: 權限計算

```
isSelf    = !!authService.currentUser()?.employee_id && authService.currentUser()!.employee_id === employeeId()
canSign   = isSelf（只有本人能簽署自己的文件）
canUpload = isSelf || featureGateService.canEdit('L1.profile')
```

**複用**：inject 既有 `AuthService` + `FeatureGateService`，不新增服務。

**模組色**：`$color-l1-sage`（#8DA399），沿用 L1 員工管理模組色。
**SCSS Mixin**：`@include card`（文件卡片區塊）、`@include status-badge`（狀態標記）。

## Risks / Trade-offs

- **[Risk] `employee_id` 為 null（使用者未關聯員工）** → `isSelf` 永遠為 false，退化為 HR 唯讀模式。合理行為，無需特殊處理。
- **[Risk] 簽署完成後回到 Modal 狀態未更新** → 簽署頁面在新分頁開啟，使用者回到 Modal 時需手動重整。可在文件簽署區塊加「重新整理」按鈕，成本低。
- **[Trade-off] 登入 API 新增 `employee_id` 是微小的 API 變更** → 影響所有登入使用者，但 `employee_id` 本就存儲在 `users` 表且為公開資訊，無安全風險。既有前端欄位未使用不會 break。
