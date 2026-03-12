## Why

職等職級矩陣（L2 職能管理 `/competency/grade-matrix`）的編輯介面存在三個核心問題：

1. **資料模型邏輯錯誤**：管理職與專業職共用同一組「學歷要求」與「職責描述」欄位，但實際上副理（管理職）與資深工程師（專業職）的職責與學歷要求完全不同，共用欄位無法正確描述雙軌制的差異。
2. **編輯模式缺乏上下文**：進入編輯模式後，使用者無法看到目前已有哪些職等、每個職等的完整度，新增職等時完全脫離矩陣脈絡。
3. **Modal 式編輯體驗差**：彈窗遮蔽矩陣視圖，使用者失去「我正在改矩陣哪個位置」的空間感知，操作後需要重新定位。

此重構將提升 HR 人員在維護職等職級架構時的操作效率與資料正確性。

## What Changes

- **資料模型重構**：將 `GradeLevelNew` 拆分為 `GradeLevel`（職等 + 薪資帶）與 `GradeTrackEntry`（軌道獨立實體：職稱、學歷、職責），實現管理職與專業職各自獨立管理
- **新增資料表**：後端新增 `grade_track_entries` 表，儲存每個職等 × 軌道的獨立屬性
- **API 調整**：grade-matrix 相關 CRUD API 支援軌道獨立實體的讀寫
- **編輯介面改造**：將 Modal 式彈窗替換為側邊面板（Side Panel），左側矩陣始終可見，右側面板內用 Tab 切換管理職/專業職設定
- **矩陣高亮**：編輯中的職等卡片在矩陣上加粗高亮，提供空間定位
- **保留編輯模式開關**：預設唯讀瀏覽，切換後才出現編輯圖標與新增按鈕

### Non-goals（不在範圍內）

- 不改動薪資結構（薪資仍跟職等走，不分軌道）
- 不改動晉升條件（PromotionCriteria）的編輯方式
- 不改動職涯發展路徑（Career Paths）功能
- 不改動 AI 職涯規劃助手
- 不改動部門職位對照表的編輯方式
- 不改動變更審核流程（ChangeRecord 機制維持不變）

## Capabilities

### New Capabilities

- `grade-track-entity`: 軌道獨立實體管理 — 每個職等的管理職與專業職擁有各自獨立的職稱、學歷要求、職責描述，支援獨立 CRUD 操作

### Modified Capabilities

（無既有 spec 層級的行為變更）

## Impact

- **影響模組**：L2 職能管理（`/competency/grade-matrix`）
- **影響路由**：`/competency` 下的職等職級管理頁面

### 資料模型概述

```
GradeLevel（職等共用層）:
  - grade (integer): 職等編號
  - code_range (text): 職級代碼範圍
  - salary_levels (JSON): 薪資級距
  - min_salary / max_salary (integer)

GradeTrackEntry（軌道獨立層，新增）:
  - id (text): 主鍵
  - grade (integer): 所屬職等，FK → grade_levels
  - track (text): 'management' | 'professional'
  - title (text): 職稱
  - education_requirement (text): 學歷要求
  - responsibility_description (text): 職責描述
  - org_unit_id (text): 子公司隔離
```

### 受影響檔案

**前端**:
- `features/competency/models/competency.model.ts` — 新增 GradeTrackEntry 介面
- `features/competency/pages/grade-matrix-page/` — 主頁面佈局改為左右分欄
- `features/competency/components/grade-edit-modal/` → 改為 `grade-edit-panel/`（側邊面板）
- `features/competency/services/competency.service.ts` — API 調整

**後端**:
- `server/src/db/tenant-schema.js` — 新增 grade_track_entries 表
- `server/src/routes/grade-matrix.js` — CRUD API 調整
- `server/src/db/migrate-demo.js` — Demo 資料遷移（拆分現有共用欄位）
