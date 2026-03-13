# 設計：職等職級薪資對照表 — 子公司獨立薪資管理

## 架構概覽

```
                    集團層級 (org_unit_id = NULL)
                 ┌──────────────────────────────┐
                 │  grade_levels (Grade 1-7)     │  ← 不改
                 │  grade_tracks (管理/專業)      │  ← 不改
                 │  grade_salary_levels (預設薪資) │  ← 改約束
                 │  grade_track_entries (預設職稱) │  ← 已有 org_unit_id
                 └──────────┬───────────────────┘
                            │ 繼承 (fallback)
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     子公司 A          子公司 B          子公司 C
  (org_unit_id=a)   (org_unit_id=b)   (org_unit_id=c)
  ┌────────────┐   ┌────────────┐   ┌────────────┐
  │ 覆寫薪資    │   │ 用集團預設  │   │ 覆寫薪資    │
  └────────────┘   └────────────┘   └────────────┘
```

## 資料模型變更

### DB Schema 變更

**`grade_salary_levels` 表**：移除 `code UNIQUE NOT NULL`，改為複合唯一約束。

```sql
-- 現有約束（需移除）
code TEXT UNIQUE NOT NULL

-- 新約束
code TEXT NOT NULL
-- + 複合唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_gsl_code_org
  ON grade_salary_levels(code, COALESCE(org_unit_id, '__NULL__'))
```

> 注意：SQLite 的 UNIQUE 約束對 NULL 值不生效（每個 NULL 被視為不同值），所以用 `COALESCE(org_unit_id, '__NULL__')` 來處理。

### 遷移策略

sql.js 不支援 `ALTER TABLE ... DROP CONSTRAINT`，需透過以下步驟：
1. 在 `tenant-db-manager.js` 的 `_runMigrations()` 中：
   - 建立新表（無 `UNIQUE` 在 code 上）
   - 複製資料
   - 刪除舊表
   - 重新命名
   - 建立複合唯一索引
2. 新建租戶 DB 直接使用新 schema（修改 `tenant-schema.js`）

## 後端 API 變更

### GET `/api/grade-matrix`

現有行為已支援 `org_unit_id` 查詢參數。需調整薪資查詢的 fallback 邏輯：

```
查詢策略：
1. 若提供 org_unit_id → 查詢 WHERE (org_unit_id = ? OR org_unit_id IS NULL)
   → JS 層面 per-grade dedup（同一 grade 若有子公司記錄則忽略集團預設）
2. 若未提供 org_unit_id → 查詢 WHERE org_unit_id IS NULL（僅集團預設）
```

> **W3 修正**：未提供 `org_unit_id` 時，必須明確加入 `WHERE org_unit_id IS NULL` 條件，確保只回傳集團預設值，排除所有子公司覆寫記錄。不能用無條件查詢（會回傳所有子公司 + 集團的混合記錄）。

提供 org_unit_id 時：

```sql
-- 優先子公司，fallback 集團預設
WHERE (org_unit_id = ? OR org_unit_id IS NULL)
ORDER BY org_unit_id DESC  -- 非 NULL 優先
```

然後在 JS 層面做 per-grade dedup：同一 grade 若有子公司專屬記錄，忽略集團預設記錄。

未提供 org_unit_id 時：

```sql
-- 僅集團預設
WHERE org_unit_id IS NULL
```

### POST/PUT 薪資相關端點

已支援 `org_unit_id` body 參數，不需修改。

## 前端變更

### 元件：`grade-matrix-page.component`

**模組識別色**：`$color-l2-terracotta`

#### 整體對照表加入子公司篩選器

> **W1 修正**：Tab A（整體對照表）使用獨立的 `overviewSubsidiaryId` signal，與 Tab B/C 的 `selectedSubsidiaryId` 分離，避免切換 Tab 時互相干擾。

在 Tab A（整體對照表）的頂部加入子公司篩選 `<select>`，使用**獨立的** `overviewSubsidiaryId` signal。

```html
<!-- 在 subtab-actions 旁加入篩選器 -->
<div class="overview-filter-bar">
  <select class="filter-select-sm" [ngModel]="overviewSubsidiaryId()"
    (ngModelChange)="onOverviewSubsidiaryChange($event)">
    <option value="">集團預設</option>
    @for (sub of subsidiaries(); track sub.id) {
    <option [value]="sub.id">{{ sub.name }}</option>
    }
  </select>
</div>
```

#### 資料載入

> **W2 修正**：`loadDataNew()` 不直接改動，而是在呼叫 `getGradeMatrix()` 時根據當前 Tab 決定是否傳入 `orgUnitId`。Tab A 讀取 `overviewSubsidiaryId()`，Tab B/C 不受影響（track entries 已有獨立的 org_unit_id 過濾）。

```typescript
// 新增獨立 signal
overviewSubsidiaryId = signal<string>('');

loadDataNew(): void {
  // 薪資查詢帶入 Tab A 的子公司篩選
  const salaryOrgUnitId = this.overviewSubsidiaryId();
  this.competencyService.getGradeMatrix(salaryOrgUnitId || undefined).subscribe(...)
}
```

子公司切換時重新載入資料（僅影響 Tab A）：

```typescript
onOverviewSubsidiaryChange(id: string): void {
  this.overviewSubsidiaryId.set(id);
  this.loadDataNew();  // 重新載入以取得該子公司薪資
}
```

### 元件：`grade-edit-panel.component`

新增 `orgUnitId = input<string>('')` input，儲存時帶入 payload：

```typescript
payload.orgUnitId = this.orgUnitId() || null;
```

### 服務：`competency.service.ts`

`getGradeMatrix()` 方法加入可選的 `orgUnitId` 參數：

```typescript
getGradeMatrix(orgUnitId?: string): Observable<GradeLevelNew[]> {
  const params = orgUnitId ? { org_unit_id: orgUnitId } : {};
  return this.http.get('/api/grade-matrix', { params }).pipe(...);
}
```

## 複用現有元件與服務

- `OrgUnitService`：已有 `subsidiaries` signal 和 `filterDepartments()` 方法
- `selectedSubsidiaryId` signal：已存在於 `grade-matrix-page.component.ts`
- `filter-select-sm` SCSS class：已有樣式定義
- 後端 `org_unit_id` 查詢機制：已在 `grade-matrix.js` 中實作

## 不需要修改的檔案

- `grade_levels` 表和對應查詢
- `grade_tracks` 表和對應查詢
- `grade_track_entries` 相關邏輯（上期已完成子公司篩選）
- `department_positions`、`promotion_criteria` 相關邏輯
