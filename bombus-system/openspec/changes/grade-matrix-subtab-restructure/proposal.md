## Why

職等職級矩陣頁面（L2 職能管理 `/competency/grade-matrix`）的「矩陣」標籤頁目前以**雙軌道卡片 + 混合式部門職位表格**呈現所有資訊，存在以下使用體驗問題：

1. **資訊過載**：管理職卡片列、專業職卡片列、部門職位對照表全部堆疊在同一視圖，HR 人員難以聚焦在單一維度的操作上
2. **建構順序不直觀**：使用者需要「先建立職等與薪資對照 → 再建立各軌道的職稱與條件 → 最後建立部門職位對照」，但目前 UI 沒有反映這個分層邏輯
3. **軌道資料耦合呈現**：管理職與專業職的資料交錯在同一張表格中，無法獨立檢視與編輯某一軌道的完整資訊
4. **軌道數量固定**：目前 DB 約束與 TypeScript 型別都硬編碼為 `'management' | 'professional'`，無法支援未來新增其他軌道（如專家職、技術職等）

此重構將矩陣標籤頁拆分為**動態子標籤頁**，讓 HR 人員依照「整體薪資架構 → 各軌道對照 → 部門職位」的邏輯順序操作，並為未來多軌道擴展奠定基礎。

## What Changes

- **矩陣標籤頁改為子標籤頁結構**：原本單一的「矩陣」視圖拆為 3+ 個子標籤頁：
  - **Tab A 整體職等職級薪資對照表**：顯示所有職等、各軌道職稱（N 欄動態生成）、薪資範圍（最低/最高）
  - **Tab B/C/... 各軌道對照表**：每個軌道一個 Tab（從 `grade_tracks` 表動態生成），顯示該軌道的「職等 × 部門」矩陣，點擊某行可展開詳情
- **行展開 Detail**：在 Tab B/C 中點擊某個職等行後，展開或收起該行的詳細資訊（晉升條件、學歷要求、職責描述、所需技能與培訓）
- **動態軌道支援**：移除 `CHECK(track IN ('management', 'professional'))` DB 約束與 TypeScript union type 硬編碼，改為從 `grade_tracks` 表動態讀取
- **新增「所需技能與培訓」欄位**：在 `grade_track_entries` 新增 `required_skills_and_training` 欄位
- **Tab A 職等新增/編輯**：在 Tab A 提供新增與編輯職等基本資訊（職等、代碼範圍、薪資級距）的功能
- **Tab B/C 軌道詳情編輯**：在行展開的 Detail 中提供該軌道各欄位的編輯功能

## Non-goals（不在範圍內）

- **不在此次新增軌道管理 UI**：雖然資料模型支援動態軌道，但本次不實作「新增/刪除軌道」的管理介面（沿用現有 `grade_tracks` CRUD API）
- **不修改晉升條件 CRUD**：現有的 `PromotionCriteriaEditModal` 保持不變
- **不修改 Career Path / AI Assistant / Pending / History 標籤頁**：只改「矩陣」標籤頁內的子結構
- **不修改後端審核流程**：現有的 change record 審核機制維持不變

## Capabilities

### New Capabilities

- `matrix-subtab-overview`: 矩陣子標籤頁 Tab A — 整體職等職級薪資對照表，動態顯示各軌道職稱欄位
- `matrix-subtab-track-detail`: 矩陣子標籤頁 Tab B/C — 各軌道獨立的職等 × 部門矩陣，含行展開 Detail
- `dynamic-track-tabs`: 從 `grade_tracks` 表動態生成軌道子標籤頁，支援未來新增軌道
- `track-entry-skills-field`: GradeTrackEntry 新增所需技能與培訓欄位

### Modified Capabilities

- `grade-edit-panel`: 修改側邊面板，在 Tab A 僅顯示基本資訊與薪資，軌道相關欄位移至 Tab B/C 行展開 Detail
- `grade-track-entry-model`: `GradeTrackEntry.track` 從 union type 改為 `string`，新增 `requiredSkillsAndTraining` 欄位

## Impact

- 影響模組：**L2 職能管理**（`/competency/grade-matrix`）
- 影響 API：GET `/api/grade-matrix`（回傳格式新增 `requiredSkillsAndTraining` 欄位）
- 資料模型變更：
  - `grade_track_entries` 新增 `required_skills_and_training TEXT DEFAULT ''` 欄位
  - `grade_track_entries` 移除 `CHECK(track IN ('management', 'professional'))` 約束
- Affected specs: 無直接影響的已存在 spec
- Affected code:
  - `server/src/db/tenant-schema.js` — 修改 grade_track_entries schema
  - `server/src/db/tenant-db-manager.js` — 新增遷移步驟
  - `server/src/db/migrate-demo.js` — 更新 demo 遷移
  - `server/src/routes/grade-matrix.js` — 更新 API 回傳格式
  - `src/app/features/competency/models/competency.model.ts` — 修改 GradeTrackEntry 介面
  - `src/app/features/competency/services/competency.service.ts` — 更新 service 方法
  - `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts` — 子標籤頁邏輯
  - `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html` — 子標籤頁 UI
  - `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss` — 子標籤頁樣式
  - `src/app/features/competency/components/grade-edit-panel/grade-edit-panel.component.ts/html` — 修改面板內容
