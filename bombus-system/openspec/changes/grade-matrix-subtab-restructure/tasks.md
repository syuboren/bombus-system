## 1. 後端：資料模型與 API 更新

- [ ] [P] 1.1 修改 `server/src/db/tenant-schema.js`：在 `grade_track_entries` CREATE TABLE 中移除 `CHECK(track IN ('management', 'professional'))` 約束，新增 `required_skills_and_training TEXT DEFAULT ''` 欄位。驗證：啟動 server，新建租戶 DB 的 `grade_track_entries` 表無 CHECK 約束且含新欄位
- [ ] [P] 1.2 修改 `server/src/db/tenant-db-manager.js`：在 `_runMigrations()` 中新增 ALTER TABLE 為已存在的租戶 DB 的 `grade_track_entries` 加入 `required_skills_and_training` 欄位（需先檢查欄位是否已存在）。驗證：重啟 server，已存在的 `tenant_demo.db` 的 `grade_track_entries` 表含新欄位
- [ ] [P] 1.3 修改 `server/src/routes/grade-matrix.js`：更新 GET `/api/grade-matrix` 與 GET `/api/grade-matrix/:grade` 的 SELECT 語句，在 trackEntries 中回傳 `required_skills_and_training` 欄位（camelCase: `requiredSkillsAndTraining`）。更新 PUT `/api/grade-matrix/track-entries/:id` 端點支援 request body 中的 `requiredSkillsAndTraining` 欄位（對應 DB `required_skills_and_training`）。更新 POST `/api/grade-matrix/grades/:grade/tracks` 端點同樣支援此欄位。驗證：curl GET `/api/grade-matrix` 回傳含 `requiredSkillsAndTraining` 欄位的 trackEntries；curl PUT track-entries 可更新此欄位
- [ ] 1.4 修改 `server/src/db/migrate-demo.js`：為 demo 租戶的每筆 grade_track_entries 補填 `required_skills_and_training` 示範資料。驗證：執行遷移後 demo 資料含技能欄位

## 2. 前端：TypeScript 模型與 Service 更新

- [ ] [P] 2.1 修改 `src/app/features/competency/models/competency.model.ts`：`GradeTrackEntry.track` 從 `'management' | 'professional'` 改為 `string`，新增 `requiredSkillsAndTraining: string` 欄位。注意：保留 `GradeTrack` union type（`'professional' | 'management' | 'both'`）不變，因 `PromotionCriteria.track` 仍需使用 `'both'` 值。僅修改 `GradeTrackEntry` 介面。驗證：`npx ng build --configuration=development` 無型別錯誤
- [ ] [P] 2.2 修改 `src/app/features/competency/services/competency.service.ts`：更新 grade matrix API response mapping，確保新增的 `requiredSkillsAndTraining` 欄位被正確 mapping。驗證：TypeScript 編譯通過

## 3. 前端：矩陣子標籤頁結構

- [ ] 3.1 修改 `grade-matrix-page.component.ts`：新增 `matrixSubTab = signal<string>('overview')` 與 `expandedGrade = signal<number | null>(null)` signal。新增 `activeTrackCode = computed(() => ...)` 從 `matrixSubTab` 解析當前軌道 code。新增 `getTrackTitle(grade, trackCode)` 方法從 `trackEntries` 取得指定軌道的職稱。新增 `getTrackEntry(grade, trackCode)` 方法取得完整 trackEntry。新增 `toggleGradeExpand(grade)` 方法控制行展開收起。新增 `saveTrackEntryField(entryId, field, value)` 方法呼叫 `updateTrackEntry` API 更新單一欄位。驗證：TypeScript 編譯通過
- [ ] 3.2 修改 `grade-matrix-page.component.html`：替換矩陣區塊（現有 lines 73-306 的雙軌卡片 + 部門表格 + 薪資參考）為以下結構：
  - (a) **子標籤頁列**：固定 `overview` 按鈕 + `@for` 動態生成軌道按鈕
  - (b) **Tab overview**：表格顯示 職等 | 職級代碼 | 動態軌道職稱欄(N) | 薪資範圍 | 薪資級數。編輯模式下行右側顯示編輯圖標
  - (c) **Tab track:xxx**：表格顯示 職等 | 該軌道職稱 | 部門職位欄(N)。點擊行展開 Detail 區塊，含學歷要求、職責描述、所需技能與培訓、晉升條件摘要
  - 驗證：`npx ng build --configuration=development` 成功且子標籤頁切換正常
- [ ] 3.3 修改 `grade-matrix-page.component.scss`：新增子標籤頁列（`.matrix-subtabs`）、Tab A 表格（`.overview-table`）、Tab B/C 表格（`.track-detail-table`）、行展開 Detail（`.row-detail-expand`）的 SCSS 樣式。使用 `$module-color`（`$color-l2-terracotta`）、`@include data-table`、`@include card` mixin。驗證：視覺呈現符合設計，動畫流暢

## 4. 前端：GradeEditPanel 修改

- [ ] 4.1 修改 `grade-edit-panel.component.ts`：新增 `context = input<'overview' | 'track-detail'>('overview')` input。說明：Tab A 使用 `context='overview'` 開啟面板（僅顯示基本資訊 + 薪資），Tab B/C 不使用此面板（改用 inline Detail 編輯）。驗證：TypeScript 編譯通過
- [ ] 4.2 修改 `grade-edit-panel.component.html`：使用 `@if (context() !== 'overview')` 條件包裹「軌道資訊」section（現有 lines 69-107 的 track-tabs + track-form），在 `overview` context 下隱藏軌道編輯區塊。目前 grade-matrix-page 中使用此面板時預設 context 為 `'overview'`，因此軌道區塊預設不顯示。驗證：從 Tab A 開啟面板不顯示軌道區塊

## 5. 前端：Tab B/C 行展開 Detail 互動

- [ ] 5.1 在 `grade-matrix-page.component.html` 的 Tab track 表格中，實作行展開 Detail：點擊行時 `toggleGradeExpand(grade.grade)`，展開行下方顯示 `@include card` 樣式的 Detail 區塊。Detail 包含：學歷要求（text input）、職責描述（textarea）、所需技能與培訓（textarea）、晉升條件摘要（唯讀，附「編輯」連結觸發 `openEditPromotionCriteria()`）。編輯模式下欄位可編輯，非編輯模式為唯讀。修改後的值透過 `saveTrackEntryField()` 方法儲存。驗證：點擊行展開/收起動畫正常，編輯欄位可儲存
- [ ] 5.2 在 `grade-matrix-page.component.scss` 新增行展開動畫：使用 `max-height` 過渡（0 → auto，200ms ease-out），展開時 Detail 下方有 `$spacing-md` 間距。驗證：展開/收起動畫視覺流暢

## 6. 驗證與收尾

- [ ] 6.1 執行 `npx ng build --configuration=development` 確認 Angular 建置無錯誤
- [ ] 6.2 啟動後端 server，執行遷移腳本，驗證 demo 租戶的 grade_track_entries 資料含 `required_skills_and_training` 欄位
- [ ] 6.3 端對端手動驗證：
  - 瀏覽模式 → 切換子標籤頁（overview / 管理職 / 專業職）
  - Tab A 顯示所有職等、動態軌道欄位、薪資範圍
  - Tab B/C 顯示該軌道的職等 × 部門矩陣
  - 點擊 Tab B/C 某行 → 展開 Detail → 顯示學歷、職責、技能
  - 編輯模式 → Tab A 點擊行開啟側邊面板（無軌道區塊）
  - 編輯模式 → Tab B/C Detail 中修改欄位 → 儲存成功
