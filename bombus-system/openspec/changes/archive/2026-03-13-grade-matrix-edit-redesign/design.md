## Context

L2 職能管理的「職等職級管理」頁面（`/competency/grade-matrix`）提供雙軌制（管理職 / 專業職）的職等職級維護功能。目前的實作有以下問題：

**資料模型**：`grade_levels` 表使用 `title_management`、`title_professional` 分離了雙軌職稱，但 `education_requirement` 與 `responsibility_description` 仍為共用欄位。在真實業務中，副理（管理職）與資深工程師（專業職）在同一職等下的學歷要求和職責完全不同。

**編輯體驗**：使用 Modal 彈窗（`GradeEditModalComponent`）進行職等的新增與編輯，彈窗遮蔽矩陣視圖，使用者無法在編輯時感知上下文。

**現有檔案**：
- Model：`features/competency/models/competency.model.ts`（`GradeLevelNew` 介面，L76-87）
- Modal：`features/competency/components/grade-edit-modal/`（177 行 TS + 112 行 HTML）
- 主頁面：`features/competency/pages/grade-matrix-page/`
- 後端：`server/src/routes/grade-matrix.js`（1230 行，含 CRUD + 審核流程）
- Schema：`server/src/db/tenant-schema.js`（`grade_levels`、`grade_salary_levels`）

## Goals / Non-Goals

**Goals:**

- 將管理職與專業職的軌道屬性（職稱、學歷、職責）拆為獨立實體，消除共用欄位邏輯錯誤
- 用側邊面板取代 Modal，讓矩陣始終可見，提供編輯上下文
- 保留現有的審核流程（`grade_change_history`）不變

**Non-Goals:**

- 不改動薪資結構（薪資跟職等走，不分軌道）
- 不改動晉升條件、職涯路徑、AI 助手、部門職位對照表的編輯方式
- 不改動 `grade_tracks` 表（管理職/專業職軌道的基本設定）

## Decisions

### 資料模型拆分：GradeLevel + GradeTrackEntry

**決策**：在 `grade_levels` 表保留職等共用屬性（grade、code_range），移除 `title_management`、`title_professional`、`education_requirement`、`responsibility_description` 四個欄位，新增 `grade_track_entries` 表儲存軌道獨立屬性。

**替代方案**：在 `grade_levels` 表內新增 `education_management`、`education_professional`、`responsibility_management`、`responsibility_professional` 欄位（方案 A 欄位分離）。此方案較簡單但不具擴展性——如果未來新增第三條軌道（如行政職），需再改表結構。

**SQL Schema 變更**：

```sql
-- 新增表
CREATE TABLE IF NOT EXISTS grade_track_entries (
  id TEXT PRIMARY KEY,
  grade INTEGER NOT NULL,
  track TEXT NOT NULL CHECK(track IN ('management', 'professional')),
  title TEXT NOT NULL,
  education_requirement TEXT DEFAULT '',
  responsibility_description TEXT DEFAULT '',
  org_unit_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(grade, track, org_unit_id)
);

-- 移除 grade_levels 表的軌道欄位（遷移時處理）
-- 保留: id, grade, code_range, org_unit_id, created_at, updated_at
-- 移除: title_management, title_professional, education_requirement, responsibility_description
```

**TypeScript 模型**：

```typescript
// 新增介面
export interface GradeTrackEntry {
  id: string;
  grade: number;
  track: 'management' | 'professional';
  title: string;
  educationRequirement: string;
  responsibilityDescription: string;
  orgUnitId?: string;
}

// 修改 GradeLevelNew → 移除軌道欄位，新增 trackEntries
export interface GradeLevelNew {
  id: string;
  grade: number;
  codeRange: string;
  salaryLevels: SalaryLevel[];
  minSalary: number;
  maxSalary: number;
  trackEntries: GradeTrackEntry[];  // 管理職 + 專業職各一筆
}
```

### 側邊面板取代 Modal

**決策**：將 `GradeEditModalComponent`（Modal 彈窗）改為 `GradeEditPanelComponent`（側邊面板），主頁面佈局改為左右分欄。

**設計系統**：
- 模組識別色：`$color-l2-terracotta`（#D6A28C 陶土橙）
- 面板使用 `@include card` mixin
- 面板寬度：400px（固定），矩陣區域自適應剩餘寬度
- 面板滑入/滑出使用 `transform: translateX` 動畫（200ms ease-out）

**面板內部結構**：
```
┌─ 面板標題 ──────────────────────────┐
│ ✏️ 編輯 Grade 3    [×]              │
├─────────────────────────────────────┤
│ ── 基本資訊 ────────────────────── │
│ 職等: [3]  (新增時可編輯)           │
│ 職級代碼: [BS07-BS09]              │
├─────────────────────────────────────┤
│ ── 薪資級距 ────────────────────── │
│ BS07: [45,000]  [×]                │
│ BS08: [48,000]  [×]                │
│ BS09: [52,000]  [×]                │
│ [+ 新增薪資級別]                    │
├─────────────────────────────────────┤
│ ── 軌道設定 ─── [管理職] [專業職] ─ │
│                                     │
│ 職稱: [副理              ]         │
│ 學歷要求: [大學以上       ]         │
│ 職責描述:                           │
│ [帶領團隊、預算管理、決策...  ]     │
│ [                              ]     │
├─────────────────────────────────────┤
│         [取消]    [儲存]            │
└─────────────────────────────────────┘
```

**管理職 / 專業職 Tab 切換**：面板下半部使用兩個 Tab 按鈕，選中的 Tab 加底線高亮（使用 `$module-color`），切換時載入對應的 `GradeTrackEntry` 資料。

**替代方案**：Inline 編輯（直接在卡片上點擊即編輯）——空間太小，無法容納薪資列表和多行職責描述。分步驟精靈——增加操作步驟，不適合「偶爾修改」的使用情境。

### 矩陣高亮與上下文提示

**決策**：當側邊面板開啟時，左側矩陣中被編輯的職等卡片加粗邊框（`border: 2px solid $module-color`），其他卡片降低透明度（`opacity: 0.6`）。新增職等時，矩陣底部的「+ 新增職等」按鈕變為已有職等列表概覽。

### 保留編輯模式開關

**決策**：維持現有的 `editMode` signal 開關。使用者大部分時間在瀏覽，編輯模式開關作為防誤觸保護。進入編輯模式後，卡片右上角顯示編輯圖標，底部顯示「+ 新增職等」按鈕。

### API 調整策略

**決策**：GET API 回傳結構調整為巢狀格式（`trackEntries` 陣列嵌入 GradeLevel），CUD API 新增 track entry 的獨立端點。

**新增端點**：

| 方法 | 端點 | 說明 |
|------|------|------|
| GET | `/api/grade-matrix/grades/:grade/tracks` | 取得單一職等的所有軌道項目 |
| POST | `/api/grade-matrix/grades/:grade/tracks` | 新增軌道項目（進入審核） |
| PUT | `/api/grade-matrix/track-entries/:id` | 編輯軌道項目（進入審核） |
| DELETE | `/api/grade-matrix/track-entries/:id` | 刪除軌道項目（進入審核） |

**現有端點調整**：
- `GET /api/grade-matrix` — 回傳 `trackEntries[]` 陣列取代 `titleManagement` / `titleProfessional` / `educationRequirement` / `responsibilityDescription`
- `POST /api/grade-matrix/grades` — 移除軌道欄位，新增時同時建立管理職/專業職兩筆 track entry
- `PUT /api/grade-matrix/grades/:grade` — 僅更新共用欄位（code_range），軌道欄位走獨立端點

### 資料遷移策略

**決策**：修改 `migrate-demo.js`，將現有 `grade_levels` 中的 `title_management`、`title_professional`、`education_requirement`、`responsibility_description` 資料遷移至 `grade_track_entries` 表。遷移採 idempotent upsert 模式。

```sql
-- 從現有資料建立 track entries
INSERT OR IGNORE INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description, org_unit_id)
SELECT
  id || '-mgmt', grade, 'management', title_management, education_requirement, responsibility_description, org_unit_id
FROM grade_levels WHERE title_management IS NOT NULL;

INSERT OR IGNORE INTO grade_track_entries (id, grade, track, title, education_requirement, responsibility_description, org_unit_id)
SELECT
  id || '-prof', grade, 'professional', title_professional, education_requirement, responsibility_description, org_unit_id
FROM grade_levels WHERE title_professional IS NOT NULL;
```

## Risks / Trade-offs

| 風險 | 緩解措施 |
|------|----------|
| `grade_levels` 表結構變更可能影響現有查詢 | 遷移時保留舊欄位為 deprecated（下一版本再移除），API 回傳格式向後相容 |
| 側邊面板在小螢幕上可能擠壓矩陣空間 | 在 tablet 以下斷點改為全寬 overlay 面板（類似 modal 但保留面板結構） |
| 審核流程需支援新的 `track-entry` 實體類型 | `grade_change_history.entity_type` 新增 `'track-entry'` 值，`applyCreate/Update/Delete` 方法新增對應處理 |
| Demo 資料遷移需確保完整性 | 遷移腳本使用 transaction + 驗證查詢，確保所有職等的雙軌資料都成功建立 |

## Open Questions

（無——所有設計決策已在討論中確認）

## 複用的現有服務與元件

| 元件/服務 | 用途 |
|-----------|------|
| `CompetencyService` | 擴充 track entry API 方法 |
| `NotificationService` | 儲存成功/失敗提示 |
| `OrgUnitService` | 子公司篩選聯動 |
| SCSS Mixins: `@include card`, `@include button-module` | 面板與按鈕樣式 |

## 受影響檔案清單

**前端（新增）**：
- `features/competency/components/grade-edit-panel/grade-edit-panel.component.ts`
- `features/competency/components/grade-edit-panel/grade-edit-panel.component.html`
- `features/competency/components/grade-edit-panel/grade-edit-panel.component.scss`

**前端（修改）**：
- `features/competency/models/competency.model.ts` — 新增 `GradeTrackEntry`，修改 `GradeLevelNew`
- `features/competency/pages/grade-matrix-page/grade-matrix-page.component.ts` — 佈局改左右分欄
- `features/competency/pages/grade-matrix-page/grade-matrix-page.component.html` — 側邊面板整合
- `features/competency/pages/grade-matrix-page/grade-matrix-page.component.scss` — 分欄佈局樣式
- `features/competency/services/competency.service.ts` — 新增 track entry API 方法

**前端（移除）**：
- `features/competency/components/grade-edit-modal/` — 整個目錄由 grade-edit-panel 取代

**後端（修改）**：
- `server/src/db/tenant-schema.js` — 新增 `grade_track_entries` 表
- `server/src/routes/grade-matrix.js` — 新增 track entry CRUD 端點，修改 GET 回傳格式
- `server/src/db/migrate-demo.js` — 資料遷移腳本
