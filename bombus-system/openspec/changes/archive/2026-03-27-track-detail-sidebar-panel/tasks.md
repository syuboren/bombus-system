## 1. 新建獨立元件 `track-detail-edit-panel`（面板寬度 420px）

- [x] 1.1 建立 `src/app/features/competency/components/track-detail-edit-panel/track-detail-edit-panel.component.ts`：新建獨立元件（Standalone + OnPush + Signal APIs），定義所有 input/output signal（`visible`, `gradeNumber`, `trackCode`, `trackName`, `trackEntry`, `promotionCriteria`, `editMode`, `orgUnitId`, `closed`, `saved`）。定義表單 signal（`formTrack`, `formPromotion`, `chipInput`）、`saving`/`error` 狀態。實作 `initFormFromInputs()`（effect 監聽 `visible` 變化時初始化表單，晉升條件 fromGrade / toGrade 自動綁定）、`onClose()`、`resetForm()`。驗證：TypeScript 編譯通過
- [x] 1.2 建立 `track-detail-edit-panel.component.html`：Panel displays track entry fields — overlay + 側邊面板。Section 1：軌道資訊（職稱、學歷、職責、技能），支援 `@if (editMode())` 切換唯讀/編輯。Section 2：Panel embeds promotion criteria management（績效門檻 select、晉升程序、4 組 chip input），支援雙態。Footer：唯讀顯示「關閉」、編輯顯示「取消」+「儲存」。最高職等隱藏晉升條件 section。驗證：`npx ng build --configuration=development` 成功
- [x] 1.3 建立 `track-detail-edit-panel.component.scss`：複用 `grade-edit-panel` 的 overlay/panel/header/content/footer SCSS 結構（`$panel-width: 420px`），新增 `.grade-badge`、`.section-divider`、`.read-only-value`、`.chip-readonly` 樣式。Chip 樣式從 `promotion-criteria-edit-modal` 移入並改用 SCSS 變數。驗證：視覺呈現正確

## 2. 元件邏輯：Chip input for dynamic list fields 與合併儲存策略（switchMap 串聯）

- [x] 2.1 在 `track-detail-edit-panel.component.ts` 實作 chip input for dynamic list fields 邏輯：`addChip(category, value)`、`removeChip(category, index)`、`onChipKeyDown(event, category, value)`、`updateChipInput(field, value)`。參考 `promotion-criteria-edit-modal` 的 chip 邏輯複用。驗證：chip 新增/移除/Enter 鍵觸發正常
- [x] 2.2 在 `track-detail-edit-panel.component.ts` 實作合併儲存策略（switchMap 串聯）— combined save for track entry and promotion criteria：`onSave()` 方法先呼叫 `updateTrackEntry`/`createTrackEntry`，成功後再呼叫 `updatePromotionCriteria`/`createPromotionCriteria`（若有填寫晉升條件）。空晉升條件時跳過第二步。錯誤處理區分兩階段失敗訊息。驗證：TypeScript 編譯通過，API 呼叫邏輯正確

## 3. 父元件整合：面板控制與晉升條件查詢方式修正

- [x] 3.1 修改 `grade-matrix-page.component.ts`：Import `TrackDetailEditPanelComponent`。新增 signals（`showTrackDetailPanel`, `editingTrackEntry`, `editingTrackPromotion`, `editingTrackGrade`, `editingTrackCode`, `editingTrackName`）。新增 `openTrackDetailPanel(grade, trackCode)` — 設定所有面板資料並開啟面板（sidebar panel opens on track detail row click）。新增 `closeTrackDetailPanel()` 與 `onTrackDetailSaved()`。實作晉升條件查詢方式修正：新增 `getPromotionFromGrade(grade, track)` 方法（搜尋 `c.fromGrade === grade`）。驗證：TypeScript 編譯通過
- [x] 3.2 修改 `grade-matrix-page.component.html`：Tab B/C 表格行的 `(click)` 改為 `openTrackDetailPanel(grade, trackCode)`，移除 `[class.expanded]` 改為 `[class.active]`（active row highlighting）。移除整個行展開區塊（`@if (expandedGrade() === grade.grade)` 的 `<tr class="row-detail-expand">`）。Toolbar promotion button removed from track detail（移除工具列中的「新增晉升條件」按鈕）。圖例文字改為「點擊職等行開啟明細面板」。在模板底部新增 `<app-track-detail-edit-panel>` 元件引用。確保 position inline editing preserved（position cell 的 `$event.stopPropagation()` 不變）。驗證：`npx ng build --configuration=development` 成功

## 4. 樣式清理與收尾

- [x] 4.1 修改 `grade-matrix-page.component.scss`：新增 `.track-row.active` 高亮樣式（`background: rgba($module-color, 0.06); border-left: 3px solid $module-color`）。移除不再使用的行展開相關樣式（`.row-detail-expand`, `.row-detail-content`, `.detail-field`, `.detail-label`, `.detail-input`, `.detail-textarea`, `.detail-value`, `.promotion-summary`, `.btn-edit-link`, `.row-detail-empty`）。驗證：視覺呈現正確
- [x] 4.2 移除 `grade-matrix-page.component.ts` 中不再使用的 `expandedGrade` signal 和 `toggleGradeExpand()` 方法。確認無其他引用。驗證：TypeScript 編譯通過

## 5. 驗證與收尾

- [x] 5.1 執行 `npx ng build --configuration=development` 確認 Angular 建置無錯誤
- [x] 5.2 端對端手動驗證：
  - Tab B/C 點擊行 → 側邊面板滑出，顯示軌道資訊 + 晉升條件
  - 唯讀模式 → 面板顯示資料但不可編輯，chip 為靜態標籤
  - 編輯模式 → 可修改所有欄位、chip 新增/移除正常、點擊「儲存」成功
  - 最高職等 → 晉升條件區塊隱藏
  - position inline editing 不受影響
  - 點擊不同行 → 面板內容切換；點擊同一行 → 面板關閉
