## 設計概述

將矩陣標籤頁（`activeTab === 'matrix'`）內部拆分為子標籤頁結構，以「整體薪資架構 → 各軌道對照 → 部門職位」的邏輯順序呈現。軌道子標籤頁從 `grade_tracks` 表動態生成，支援未來新增軌道。

## 設計決策

### 1. 子標籤頁架構

**選擇**：在現有 `matrix` 頂層標籤頁內新增 `matrixSubTab` 信號控制子頁籤。

**子標籤頁定義**：
- **`overview`（固定）**：整體職等職級薪資對照表
- **`track:<trackCode>`（動態）**：各軌道對照表，從 `tracks()` signal 動態生成

```
matrixSubTab = signal<string>('overview');
// 'overview' | 'track:management' | 'track:professional' | 'track:<any-code>'
```

**理由**：
- 使用 `track:` 前綴區分軌道 Tab，避免與其他 Tab 名稱衝突
- `string` 類型而非 union type，支援動態軌道
- `overview` 為預設 Tab

### 2. Tab A — 整體職等職級薪資對照表

**結構**：表格形式，每行一個職等（由高到低排列）。

| 欄位 | 來源 |
|------|------|
| 職等 | `grade.grade` |
| 職級代碼 | `grade.codeRange` |
| 管理職職稱 | `grade.trackEntries[track='management'].title` |
| 專業職職稱 | `grade.trackEntries[track='professional'].title` |
| ...其他軌道 | 動態生成，一個軌道一個欄位 |
| 薪資範圍 | `NT$ {minSalary} - {maxSalary}` |
| 薪資級數 | `salaryLevels.length` 筆 |

**動態欄位生成**：使用 `tracks()` signal 迴圈產生軌道職稱欄位，而非硬編碼管理職/專業職。

**編輯功能**：
- 編輯模式下顯示「新增職等」按鈕（上方 filter-bar）
- 點擊表格行開啟現有 `GradeEditPanel` 側邊面板（僅顯示基本資訊 + 薪資級距）
- 側邊面板移除軌道 Tab 切換區塊（軌道編輯移至 Tab B/C 的行展開 Detail）

### 3. Tab B/C — 各軌道對照表

**結構**：表格形式，每行一個職等。

| 欄位 | 來源 |
|------|------|
| 職等 | `grade.grade` |
| 職稱 | 對應 `trackEntry.title` |
| 部門職位... | 各部門的職位名稱（`departmentPositions` 篩選 `track` + `grade`） |

**行展開 Detail**：
- 點擊某行時，該行下方展開一個 Detail 區塊
- 使用 `expandedGrade = signal<number | null>(null)` 控制展開狀態
- 同一時間只有一行可展開

**Detail 內容**：

| 欄位 | 來源 | 可編輯 |
|------|------|--------|
| 職稱 | `trackEntry.title` | 是 |
| 學歷要求 | `trackEntry.educationRequirement` | 是 |
| 職責描述 | `trackEntry.responsibilityDescription` | 是 |
| 所需技能與培訓 | `trackEntry.requiredSkillsAndTraining`（**新欄位**） | 是 |
| 晉升條件摘要 | `promotionCriteria[]` 篩選 `toGrade + track` | 顯示，點擊連結開啟現有 PromotionCriteriaEditModal |

**部門篩選**：沿用現有的子公司 + 部門 filter（`selectedSubsidiaryId`、`selectedDepartmentFilter`）。

### 4. 動態軌道支援

**DB 約束移除**：
```sql
-- 移除 grade_track_entries 的 CHECK 約束
-- 原本: CHECK(track IN ('management', 'professional'))
-- 改為: 無 CHECK 約束，依賴 grade_tracks.code 為 FK 參考
```

**TypeScript 型別變更**：
```typescript
// competency.model.ts

// 保留 GradeTrack union type（PromotionCriteria.track 需要 'both' 值）
export type GradeTrack = 'professional' | 'management' | 'both';

// GradeTrackEntry.track 改為 string，支援動態軌道
export interface GradeTrackEntry {
  id: string;
  grade: number;
  track: string;  // 改為 string（原本 'management' | 'professional'）
  title: string;
  educationRequirement: string;
  responsibilityDescription: string;
  requiredSkillsAndTraining: string;  // 新增欄位
  orgUnitId?: string | null;
}
```

**注意**：`PromotionCriteria.track` 維持 `GradeTrack` 型別不變，`'both'` 值表示該晉升條件適用於所有軌道。Tab B/C 的 Detail 中顯示晉升條件時，需篩選 `track === activeTrackCode || track === 'both'`。

**Tab 動態生成**：
```html
<!-- 子標籤頁列 -->
<button (click)="matrixSubTab.set('overview')" [class.active]="matrixSubTab() === 'overview'">
  整體對照表
</button>
@for (track of tracks(); track track.id) {
  <button (click)="matrixSubTab.set('track:' + track.code)"
          [class.active]="matrixSubTab() === 'track:' + track.code">
    {{ track.name }}
  </button>
}
```

### 5. GradeEditPanel 修改

**Tab A 場景（`context === 'overview'`）**：
- 顯示：職等、職級代碼範圍、薪資級距（動態新增/移除）
- 隱藏：管理職/專業職 Tab 切換區塊

**Tab B/C 場景**：

- 不使用 GradeEditPanel（軌道詳情改為在表格行展開的 Detail 區塊中 inline 編輯）
- Detail 區塊嵌在表格內，非側邊面板

**實作方式**：新增 `context` input 到 GradeEditPanel：
```typescript
context = input<'overview' | 'track-detail'>('overview');
```
當 `context() === 'overview'` 時隱藏 track tabs section。

### 6. 資料模型變更

**新增欄位**：
```sql
ALTER TABLE grade_track_entries ADD COLUMN required_skills_and_training TEXT DEFAULT '';
```

**遷移策略**：
- `tenant-db-manager.js` 的 `_runMigrations()` 新增 ALTER TABLE
- `migrate-demo.js` 更新 demo 資料（填入示範技能資料）

**API 回傳格式更新**：
```json
// GET /api/grade-matrix 回傳的 trackEntries[]
{
  "id": "...",
  "grade": 3,
  "track": "management",
  "title": "副理",
  "educationRequirement": "大學以上",
  "responsibilityDescription": "...",
  "requiredSkillsAndTraining": "專案管理、PMP 認證..."
}
```

## 前端元件結構

### 修改的檔案

| 檔案 | 變更 | 模組色 / Mixin |
|------|------|----------------|
| `grade-matrix-page.component.ts` | 新增 `matrixSubTab`、`expandedGrade` signal，新增 `activeTrackCode()` computed，重構矩陣區塊渲染邏輯 | — |
| `grade-matrix-page.component.html` | 替換 lines 73-306（雙軌卡片 + 部門表格 + 薪資參考）為子標籤頁結構 | — |
| `grade-matrix-page.component.scss` | 新增 `.matrix-subtabs`、`.overview-table`、`.track-table`、`.row-detail` 等樣式 | `$color-l2-terracotta`、`@include data-table`、`@include card` |
| `grade-edit-panel.component.ts` | 新增 `context` input，條件隱藏軌道區塊 | — |
| `grade-edit-panel.component.html` | `@if (context() !== 'overview')` 包裹軌道 Tab 區塊 | — |
| `competency.model.ts` | `GradeTrackEntry.track` 改為 `string`，新增 `requiredSkillsAndTraining` | — |
| `competency.service.ts` | API 回傳 mapping 新增 `requiredSkillsAndTraining` 欄位 | — |

### 需要複用的現有元件與服務

| 元件 / 服務 | 用途 |
|-------------|------|
| `GradeEditPanelComponent` | Tab A 的職等編輯側邊面板（簡化版） |
| `PromotionCriteriaEditModalComponent` | Tab B/C Detail 中的晉升條件編輯連結 |
| `CompetencyService` | 所有 API 呼叫（grade CRUD、track entry CRUD） |
| `OrgUnitService` | 子公司篩選 |
| `@include data-table` mixin | Tab A/B/C 的表格樣式 |
| `@include card` mixin | Detail 展開區塊樣式 |

## 後端變更

### SQL Schema 變更

```sql
-- 1. grade_track_entries 新增欄位
ALTER TABLE grade_track_entries ADD COLUMN required_skills_and_training TEXT DEFAULT '';

-- 2. 移除 track CHECK 約束（sql.js 不支援 ALTER TABLE DROP CONSTRAINT）
-- 需要在 tenant-schema.js 中修改 CREATE TABLE 語句，移除 CHECK
-- 遷移時對已存在的表不需變更（CHECK 只在 CREATE TABLE 時生效）
```

### API 端點變更

| 端點 | 變更 |
|------|------|
| `GET /api/grade-matrix` | trackEntries 回傳新增 `requiredSkillsAndTraining` 欄位 |
| `GET /api/grade-matrix/:grade` | trackEntries 回傳新增 `requiredSkillsAndTraining` 欄位 |
| `PUT /api/grade-matrix/track-entries/:id` | 支援更新 `required_skills_and_training` 欄位 |
| `POST /api/grade-matrix/grades/:grade/tracks` | 支援 `required_skills_and_training` 欄位 |

### 遷移步驟

1. `tenant-schema.js`：修改 `grade_track_entries` CREATE TABLE，移除 CHECK 約束，新增 `required_skills_and_training` 欄位
2. `tenant-db-manager.js`：`_runMigrations()` 新增 ALTER TABLE 為已存在的租戶 DB 加欄位
3. `grade-matrix.js`：更新 SELECT/INSERT/UPDATE 語句包含新欄位
4. `migrate-demo.js`：為 demo 租戶的 track entries 填入示範技能資料

## UI 視覺設計

### 子標籤頁列樣式

- 位於 filter-bar 下方
- 使用 pill-style 按鈕（圓角、`$module-color` 高亮）
- 與頂層標籤頁視覺區分：較小尺寸、淺色背景
- 動態軌道 Tab 顯示軌道的 icon + name

### Tab A 表格

- 使用 `@include data-table` mixin
- 動態軌道欄位依 `tracks()` 排序
- 編輯模式：行右側顯示編輯圖標
- 薪資範圍使用 `formatSalary()` 千分位格式

### Tab B/C 行展開 Detail

- 展開動畫：高度從 0 過渡，200ms ease-out
- Detail 區塊使用 `@include card` mixin，內嵌於表格行下方
- 編輯模式下欄位可編輯（input/textarea），非編輯模式為唯讀顯示
- 「所需技能與培訓」使用 textarea，支援多行輸入
