## Context

Bombus 多租戶架構中，每個租戶有獨立的資料庫（Database-per-Tenant）。租戶內部的子公司（subsidiary）資料隔離已在 L2 職能管理完成（`subsidiary-data-association` change）。本次延伸至 L1 員工管理模組，並補齊全部 POST/PUT 端點的 org_unit_id 寫入。

**現有需複用的服務與元件**

- `OrgUnitService`（`core/services/org-unit.service.ts`）：提供 subsidiaries signal、filterDepartments()、lockedSubsidiaryId computed
- `AuthService`（`features/auth/services/auth.service.ts`）：取得使用者 RBAC scope（子公司鎖定）
- `toObservable()` + `switchMap()` + `takeUntilDestroyed()` pattern：已在 profile-page 和 jobs-page 驗證
- L1 識別色：`$color-l1-sage`（鼠尾草綠 #8DA399），使用 `@include filter-bar` mixin

**現有需修改的檔案**

**後端（5 檔）**：
- `server/src/db/tenant-db-manager.js`
- `server/src/routes/recruitment.js`
- `server/src/routes/talent-pool.js`
- `server/src/routes/meetings.js`
- `server/src/routes/grade-matrix.js`

**前端 Service（4 檔）**：
- `src/app/features/employee/services/interview.service.ts`
- `src/app/features/employee/services/talent-pool.service.ts`
- `src/app/features/employee/services/meeting.service.ts`
- `src/app/features/employee/services/job.service.ts`

**前端 Page（5 檔 + 2 HTML）**：
- `src/app/features/employee/pages/jobs-page/jobs-page.component.ts`
- `src/app/features/employee/pages/recruitment-page/recruitment-page.component.{ts,html}`
- `src/app/features/employee/pages/talent-pool-page/talent-pool-page.component.{ts,html}`
- `src/app/features/employee/pages/meeting-page/meeting-page.component.ts`

## Goals / Non-Goals

**Goals：**

- grade_tracks 表加入 org_unit_id nullable 欄位（DB 遷移）
- recruitment、talent-pool、meetings 三個後端 GET 端點加 org_unit_id 篩選
- 全部 L1 POST/PUT 端點寫入 org_unit_id（meetings、talent_pool、jobs、recruitment importToTalentPool）
- grade_tracks 的 applyCreate/applyUpdate 寫入 org_unit_id
- recruitment-page 和 talent-pool-page 新增子公司 dropdown + reactive subscription
- meeting-page 補齊 reactive subscription 和 create/update 的 org_unit_id 傳遞
- jobs-page 的 createJob/updateJob 傳 org_unit_id

**Non-Goals：**

- 不修改子表（interviews、meeting_attendees 等）結構
- 不做歷史資料回填腳本
- 不涵蓋 L3~L6 模組
- 不修改 grade_levels 表

## Decisions

### DB 遷移策略

**選擇**：在 `_runMigrations()` 的 `subsidiaryMigrations` 陣列新增 grade_tracks 條目，利用已有的 try-catch ALTER TABLE + CREATE INDEX 機制。

**原因**：已有 10 張表使用此機制，新增一筆設定即可。無需修改遷移邏輯本身。

**替代方案**：在 tenant-schema.js 的 CREATE TABLE 中直接加入 org_unit_id 欄位。但這只影響新租戶，不會遷移既有租戶的 DB。

### 讀取篩選策略

**選擇**：L1 模組使用直接比對 `WHERE org_unit_id = ?`，不含 `OR org_unit_id IS NULL`。

**原因**：L1 的業務資料（職缺、會議、人才）應明確歸屬某個子公司。與 L2 不同（L2 有「全組織共用」的職能定義），L1 資料沒有「共用」語意。未傳 org_unit_id 參數時回傳全部資料（向下相容）。

**替代方案**：使用 `(org_unit_id IS NULL OR org_unit_id = ?)`。但 L1 不需要「共用資料」概念，且 NULL 代表「未歸屬」而非「全部適用」。

### 候選人篩選策略

**選擇**：recruitment.js GET /candidates 透過 `LEFT JOIN jobs j ON c.job_id = j.id` 加 `AND j.org_unit_id = ?`，而非在 candidates 表直接篩選。

**原因**：candidates 的 org_unit_id 需求來自其關聯的職缺。透過 JOIN 篩選確保一致性，不需要維護兩處 org_unit_id。

### 前端 reactive 模式

**選擇**：使用 `toObservable(this.selectedSubsidiaryId).pipe(switchMap(id => loadData(id)), takeUntilDestroyed())` 模式。

**原因**：已在 profile-page 和 jobs-page 驗證此模式可行。switchMap 確保切換子公司時自動取消前一次請求。符合 Angular Signal + RxJS 混用的專案規範。

**替代方案**：使用 effect() + markForCheck()。但 effect 不支援 async/Observable 操作，且 toObservable + switchMap 已是專案建立的標準模式。

### 前端子公司 dropdown 標準模板

使用 `@if/@for` control flow + `ngModel` 雙向綁定（標準 L1 模式）：

```html
@if (subsidiaries().length > 0) {
  <div class="subsidiary-filter">
    <select [ngModel]="selectedSubsidiaryId()"
            (ngModelChange)="selectedSubsidiaryId.set($event)">
      <option value="">全部子公司</option>
      @for (sub of subsidiaries(); track sub.id) {
        <option [value]="sub.id">{{ sub.name }}</option>
      }
    </select>
  </div>
}
```

### SQL Schema 變更

grade_tracks 新增：

```sql
ALTER TABLE grade_tracks ADD COLUMN org_unit_id TEXT REFERENCES org_units(id);
CREATE INDEX IF NOT EXISTS idx_gt_org_unit ON grade_tracks(org_unit_id);
```

### 後端 API Prepared Statements 範例

meetings.js POST：

```sql
INSERT INTO meetings (id, title, type, status, location, is_online, meeting_link,
  start_time, end_time, duration, recurrence, recurrence_end_date, notes,
  org_unit_id, created_at, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

talent-pool.js GET：

```sql
SELECT tp.*, ... FROM talent_pool tp
LEFT JOIN talent_tag_mapping ttm ON tp.id = ttm.talent_id
WHERE 1=1 AND tp.org_unit_id = ?
```

## Risks / Trade-offs

- **[歷史資料不可見]** 切換子公司時，org_unit_id = NULL 的舊資料不會出現 → 使用者選「全部子公司」（空值）時可看到全部資料，此為預期行為
- **[候選人跨子公司]** 同一候選人應徵不同子公司的職缺時會出現多筆記錄 → 這是正確行為，透過 JOIN jobs 自然實現
- **[grade_tracks 遷移]** 首次重啟後端會觸發 ALTER TABLE → 使用 try-catch 包裝確保冪等
