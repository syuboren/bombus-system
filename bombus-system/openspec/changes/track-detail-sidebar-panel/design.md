## Context

L2 職能管理模組的職等職級矩陣頁面 (`/competency/grade-matrix`) 包含三個子標籤頁：

- **Tab A「職等職級薪資對照表」**：使用 `grade-edit-panel` 側邊面板編輯職等基本資訊與薪資
- **Tab B/C「管理職」/「專業職」**：使用行展開 inline 編輯軌道明細（學歷、職責、技能、晉升條件摘要）

現況問題：行展開的顯示空間受限，晉升條件只能顯示摘要；「新增晉升條件」按鈕在工具列，與特定職等缺乏直覺關聯。

**模組識別色**：`$color-l2-terracotta` (#D6A28C)

## Goals / Non-Goals

**Goals:**

- Tab B/C 的職等明細編輯改為側邊面板形式，與 Tab A 操作體驗一致
- 晉升條件管理（含 chip 輸入）直接嵌入面板內，自動綁定 `fromGrade`
- 面板支援唯讀（瀏覽模式）與可編輯（編輯模式）雙態
- 單一「儲存」按鈕合併軌道條目 + 晉升條件兩項資料的儲存

**Non-Goals:**

- 不修改後端 API 或 DB schema
- 不修改 Tab A 的 `grade-edit-panel` 元件
- 不刪除 `promotion-criteria-edit-modal` 元件
- 不修改部門×職位名稱的 inline 編輯

## Decisions

### 新建獨立元件 `track-detail-edit-panel`

**選擇**：新建 `TrackDetailEditPanelComponent`，而非擴展現有 `GradeEditPanelComponent`。

**理由**：
- `grade-edit-panel` 管理的是**職等層級資料**（grade number、code、salary levels、track titles）
- 新面板管理的是**單一軌道的條目資料**（track entry fields + promotion criteria）
- 兩者的資料模型、表單結構、儲存邏輯完全不同
- 分離元件避免 `grade-edit-panel` 過度膨脹

**替代方案**：在 `grade-edit-panel` 新增 context mode — 會使元件過於龐大且難以維護。

### 面板寬度 420px

**選擇**：面板寬度設為 420px（比 `grade-edit-panel` 的 400px 寬 20px）。

**理由**：面板內含 chip 輸入（必備技能、必修課程、KPI 指標、附加條件），需要更多水平空間容納多個 chip 標籤的 flex-wrap 排列。

### 合併儲存策略（switchMap 串聯）

**選擇**：軌道條目和晉升條件使用 `switchMap` 串聯儲存（先 track entry → 再 promotion criteria）。

**理由**：
- 兩者是獨立 API 呼叫，需確保第一個成功後才發送第二個
- 若軌道條目儲存失敗，不應發送晉升條件請求
- 若晉升條件未填寫任何內容，跳過第二個請求（`of(null)`）

**替代方案**：`forkJoin` 並行 — 風險是第一個成功但第二個失敗時的狀態不一致。

### 晉升條件 fromGrade / toGrade 自動綁定

**選擇**：
- `fromGrade` = 面板所在的職等（唯讀，自動帶入）
- `toGrade` = `fromGrade + 1`（預設值，使用者可修改）
- `track` = 面板所在的軌道 code（唯讀，自動帶入）

**理由**：使用者在 Tab B（管理職）點擊 Grade 5 的行時，晉升條件自然是「從 Grade 5 晉升到 Grade 6 的管理職」，不應需要手動選擇這三個欄位。

### 晉升條件查詢方式修正

**選擇**：新增 `getPromotionFromGrade(grade, track)` 方法，搜尋 `c.fromGrade === grade`。

**理由**：現有 `getPromotionToGrade(grade + 1, track)` 只搜尋 `toGrade`，可能誤匹配其他來源職等的晉升條件。精確搜尋 `fromGrade` 更符合語意。

## 複用的現有元件與服務

| 項目 | 來源路徑 |
|------|----------|
| 側邊面板 SCSS 模式 | `components/grade-edit-panel/grade-edit-panel.component.scss` |
| Chip 輸入邏輯 | `components/promotion-criteria-edit-modal/promotion-criteria-edit-modal.component.ts` |
| `CompetencyService` | `services/competency.service.ts` — `updateTrackEntry()`, `createTrackEntry()`, `createPromotionCriteria()`, `updatePromotionCriteria()` |
| SCSS 變數 / Mixin | `src/assets/styles/_variables.scss`, `_mixins.scss` |

## 需修改的現有檔案

| 檔案 | 修改內容 |
|------|----------|
| `grade-matrix-page.component.ts` | 新增面板控制 signals + 開啟/關閉/儲存方法 + 新增 `getPromotionFromGrade()` |
| `grade-matrix-page.component.html` | 移除行展開區塊、修改行點擊行為、移除「新增晉升條件」按鈕、加入面板元件 |
| `grade-matrix-page.component.scss` | 移除行展開樣式、新增 `.track-row.active` 高亮 |

## Risks / Trade-offs

| 風險 | 緩解 |
|------|------|
| 面板內容較長（軌道 4 欄位 + 晉升 6 欄位），可能需要大量滾動 | 面板 `panel-content` 設為 `overflow-y: auto`，並以分隔線明確區分兩個 section |
| 最高職等無下一職等可晉升 | 偵測 `gradeNumber >= maxGrade` 時隱藏晉升條件 section 或顯示「已達最高職等」提示 |
| Track entry 不存在時（新 Grade 尚未建立 track entry） | 面板以空表單開啟，儲存時呼叫 `createTrackEntry()` 而非 `updateTrackEntry()` |
| 合併儲存中途失敗（track entry 成功但 promotion criteria 失敗） | 錯誤訊息明確標示哪部分失敗，使用者可重試（track entry 已儲存不會重複建立） |
