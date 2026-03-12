## 1. 後端：資料模型拆分（GradeLevel + GradeTrackEntry）

- [x] 1.1 在 `tenant-schema.js` 新增 `grade_track_entries` 表，含 id、grade、track、title、education_requirement、responsibility_description、org_unit_id 欄位，建立 UNIQUE(grade, track, org_unit_id) 約束。對應設計決策「資料模型拆分：GradeLevel + GradeTrackEntry」。驗證：啟動 server，確認 `grade_track_entries` 表存在且欄位正確
- [x] 1.2 修改 `migrate-demo.js`，實作「資料遷移策略」：將現有 grade_levels 中的 title_management、title_professional、education_requirement、responsibility_description 遷移至 grade_track_entries 表，使用 idempotent upsert。對應需求「Data migration from shared fields to track entries」與「Idempotent migration」。驗證：執行遷移腳本兩次，確認不產生重複資料且所有職等各有 management + professional 兩筆 track entry

## 2. 後端：Track Entry CRUD API

- [x] 2.1 在 `grade-matrix.js` 新增 track entry CRUD 端點：GET `/grades/:grade/tracks`、POST `/grades/:grade/tracks`、PUT `/track-entries/:id`、DELETE `/track-entries/:id`，所有 CUD 操作建立 change record。對應需求「Track entry CRUD operations with change approval」與設計決策「API 調整策略」。驗證：用 curl 測試各端點回傳正確格式與 change record
- [x] 2.2 修改 GET `/api/grade-matrix`（列表端點）與 GET `/api/grade-matrix/:grade`（單一職等詳情端點）回傳格式，將 trackEntries[] 巢狀嵌入各 grade level 取代 titleManagement/titleProfessional/educationRequirement/responsibilityDescription。對應需求「API returns track entries nested within grade levels」。驗證：兩個 GET 端點皆回傳含 trackEntries 陣列且不含舊欄位
- [x] 2.3 修改 POST `/api/grade-matrix/grades` 新增職等時自動建立 management + professional 兩筆 track entry。對應需求「Grade creation automatically creates both track entries」。驗證：新增職等後 grade_track_entries 有兩筆對應記錄
- [x] 2.4 修改 `applyCreate`/`applyUpdate`/`applyDelete` 方法支援 entity_type='track-entry'。對應設計「API 調整策略」。驗證：審核通過 track-entry 變更後資料正確套用
- [x] 2.5 確保 track entry 查詢支援 org_unit_id 篩選。對應需求「Track entries respect org_unit_id isolation」。驗證：帶 org_unit_id 參數查詢只回傳對應子公司資料

## 3. 前端：TypeScript 模型更新

- [x] 3.1 在 `competency.model.ts` 新增 `GradeTrackEntry` 介面（id、grade、track、title、educationRequirement、responsibilityDescription、orgUnitId），修改 `GradeLevelNew` 移除 titleManagement/titleProfessional/educationRequirement/responsibilityDescription，新增 trackEntries: GradeTrackEntry[]。同步確認 `GradeLevelDetail`（繼承 GradeLevelNew）的 promotionTo/promotionFrom 欄位不受影響，維持向後相容。對應需求「Grade track entries store track-specific attributes independently」與設計「資料模型拆分」。驗證：`npx ng build --configuration=development` 無型別錯誤

## 4. 前端：CompetencyService API 擴充

- [x] 4.1 在 `competency.service.ts` 新增 track entry API 方法：getTrackEntries(grade, orgUnitId)、createTrackEntry(grade, data)、updateTrackEntry(id, data)、deleteTrackEntry(id)，並更新現有 getGradeMatrixFromAPI 方法以處理新的回傳格式。驗證：TypeScript 編譯通過，方法簽名與後端 API 對應

## 5. 前端：側邊面板元件（取代 Modal）

- [x] 5.1 建立 `GradeEditPanelComponent`（standalone + OnPush），實作「側邊面板取代 Modal」設計：包含基本資訊區（職等、職級代碼）、薪資級距區（動態新增/移除）、管理職/專業職 Tab 切換區（各自的職稱、學歷、職責表單）。使用 Signal APIs（input/output）、模組色 `$color-l2-terracotta`、`@include card` mixin。驗證：元件獨立可渲染，Tab 切換正確載入不同 track 資料
- [x] 5.2 實作面板滑入/滑出動畫（transform: translateX，200ms ease-out），面板寬度 400px。對應設計「側邊面板取代 Modal」。驗證：開啟/關閉面板動畫流暢
- [x] 5.3 實作面板表單驗證與儲存邏輯：共用欄位走 updateGradeLevel API，軌道欄位走 track entry API，新增職等時同時建立 grade + 兩筆 track entry。對應需求「Grade creation automatically creates both track entries」。驗證：新增/編輯職等後資料正確寫入

## 6. 前端：主頁面佈局改造

- [x] 6.1 修改 `grade-matrix-page.component.html/scss`，將佈局改為左右分欄（矩陣 + 側邊面板）。整合 GradeEditPanelComponent 取代 GradeEditModalComponent。對應設計「矩陣高亮與上下文提示」：編輯中卡片加粗邊框、其他卡片降低透明度。對應需求「Side panel editing with matrix context」。驗證：點擊卡片開啟面板，矩陣可見且正在編輯的卡片高亮
- [x] 6.2 修改 `grade-matrix-page.component.ts`，更新資料載入邏輯以適配新的 GradeLevelNew（含 trackEntries），移除 GradeEditModal 相關 import，加入面板開關狀態管理。對應需求「Edit mode toggle for read-heavy usage」與「保留編輯模式開關」。驗證：編輯模式開關正常，瀏覽模式無編輯圖標
- [x] 6.3 移除 `grade-edit-modal` 目錄。驗證：`npx ng build --configuration=development` 成功且無遺留 import 錯誤

## 7. 驗證與收尾

- [x] 7.1 執行 `npx ng build --configuration=development` 確認 Angular 建置無錯誤
- [x] 7.2 啟動後端 server，執行遷移腳本，驗證 demo 租戶的 grade_track_entries 資料完整（每個職等各有 2 筆 track entry）
- [ ] 7.3 端對端手動驗證：瀏覽模式 → 編輯模式 → 點擊卡片開面板 → 切換管理職/專業職 Tab → 編輯儲存 → 新增職等 → 確認矩陣更新
