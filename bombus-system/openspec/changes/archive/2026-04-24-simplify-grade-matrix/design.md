## Context

目前 L2 職能管理的職等薪資對照表使用 `org_unit_id = NULL` 代表「集團預設」，子公司可覆寫或 fallback。此機制帶來 ~180 行雙向 cascade 邏輯（`cascadeSalaryCodes` / `cascadeSalaryCodesDown`），以及前後端多處 `IS NULL` 判斷分支。

### 現有資料分佈（Demo 租戶）

- `grade_salary_levels`: org_unit_id=NULL 20 筆、org_unit_id=org-root 15 筆
- `grade_track_entries`: org_unit_id=NULL 14 筆、org_unit_id=org-root 13 筆
- 員工分佈：Demo集團(group) 12 人、TEST(subsidiary) 18 人

### 涉及檔案

| 層級 | 檔案 | 改動程度 |
|------|------|---------|
| 後端 | `server/src/routes/grade-matrix.js` | 大改 |
| 後端 | `server/src/routes/hr-onboarding.js` | 小改（3 處 fallback） |
| 後端 | `server/src/db/tenant-schema.js` | 微調（constraint + 種子） |
| 前端 | `src/app/features/competency/pages/grade-matrix-page/*.ts/html` | 中改 |
| 前端 | `src/app/features/competency/services/competency.service.ts` | 微調 |

### 複用元件與服務

- `NotificationService` — 範本帶入成功/失敗提示
- `OrgUnitService` — 取得當前組織單位與子公司列表
- 模組識別色：`$color-l2-terracotta` (#D6A28C)
- SCSS Mixins：`@include card`、`@include button-module($module-color)`、`@include empty-state`

## Goals / Non-Goals

**Goals:**

- 每個 org_unit（集團/子公司）各自擁有完整獨立的職等薪資資料
- 移除 `org_unit_id = NULL` fallback 機制與雙向 cascade 邏輯
- 提供「從母公司帶入」一鍵複製功能，降低子公司初始設定成本
- 既有資料零損失遷移

**Non-Goals:**

- 不建立獨立的「範本庫」資料表或管理介面
- 不改變 `grade_levels` 全域共用結構
- 不做跨公司同步或自動更新

## Decisions

### 資料歸屬：消滅 NULL，綁定明確 org_unit_id

所有 `grade_salary_levels`、`grade_track_entries`、`promotion_criteria`、`department_positions` 的 `org_unit_id` 不再允許 NULL。

- 既有 `org_unit_id = NULL` 資料 → 遷移為集團的 org_unit_id（`org-root`）
- UNIQUE constraint 從 `UNIQUE(code, COALESCE(org_unit_id, '__NULL__'))` 改為 `UNIQUE(code, org_unit_id)`
- 替代方案：保留 NULL 但改語意為「未分配」→ 拒絕，因 NULL 語意模糊是問題根源

### 移除 cascade 邏輯

刪除 `cascadeSalaryCodes()` 和 `cascadeSalaryCodesDown()` 兩個函數（~180 行）。

- 薪資代碼由管理者自行命名，系統不再自動推移
- 替代方案：簡化 cascade 只做單向 → 拒絕，根本問題是自動推移不符合管理者預期

### 範本複製 API 設計

新增 `POST /api/grade-matrix/import-template`

```
Request:
{
  "source_org_unit_id": "org-root",   // 來源（母公司）
  "target_org_unit_id": "subsidiary-x" // 目標（子公司）
}

Response:
{
  "success": true,
  "imported": {
    "salary_levels": 20,
    "track_entries": 14,
    "promotion_criteria": 5,
    "department_positions": 8
  }
}
```

- 使用 `db.transaction()` 確保原子性
- 目標公司若已有資料 → 回傳 400 錯誤，要求先清除（避免靜默覆寫）
- 複製範圍：`grade_salary_levels` + `grade_track_entries` + `promotion_criteria` + `department_positions`
- 複製時生成新的 UUID，`org_unit_id` 替換為目標值

### 前端空狀態設計

子公司切換到職等薪資頁面、若該公司無資料時：

- 顯示空狀態區塊（`@include empty-state` mixin）
- 中央放「從母公司帶入範本」按鈕（`@include button-module($color-l2-terracotta)`）
- 按鈕點擊後呼叫範本複製 API，成功後自動重載資料
- 若母公司也無資料 → 按鈕禁用並提示「母公司尚未設定職等薪資」

### GET API 查詢簡化

移除所有 `org_unit_id IS NULL` fallback 分支：

```sql
-- 舊：
WHERE org_unit_id IS NULL   -- 集團預設
WHERE org_unit_id = ?       -- 子公司覆寫（有的話用這個）

-- 新：
WHERE org_unit_id = ?       -- 統一，不管集團或子公司都用同一個查詢
```

### 資料遷移策略

在 `tenant-schema.js` 的 migration 區塊加入一次性遷移：

```sql
-- 將 NULL 資料歸屬給集團 org_unit
UPDATE grade_salary_levels SET org_unit_id = (SELECT id FROM org_units WHERE type = 'group' LIMIT 1)
  WHERE org_unit_id IS NULL;
UPDATE grade_track_entries SET org_unit_id = (SELECT id FROM org_units WHERE type = 'group' LIMIT 1)
  WHERE org_unit_id IS NULL;
UPDATE promotion_criteria SET org_unit_id = (SELECT id FROM org_units WHERE type = 'group' LIMIT 1)
  WHERE org_unit_id IS NULL;
UPDATE department_positions SET org_unit_id = (SELECT id FROM org_units WHERE type = 'group' LIMIT 1)
  WHERE org_unit_id IS NULL;
```

在 `tenant-db-manager.js` 的 `_runMigrations()` 同步加入此遷移。

## Risks / Trade-offs

- **[既有子公司未覆寫的資料會消失]** → 遷移只處理 NULL→集團。若子公司原本 fallback 到集團資料，遷移後該子公司會變成空狀態，需手動帶入範本。此行為是設計預期（讓管理者明確選擇）。
- **[薪資代碼不再自動排序]** → 管理者需自行管理代碼命名規則。但原本的自動推移本身就容易造成非預期變動，移除後反而更透明。
- **[遷移順序依賴]** → 遷移必須在 UNIQUE constraint 更新之前執行，否則可能因重複資料導致 constraint violation。
