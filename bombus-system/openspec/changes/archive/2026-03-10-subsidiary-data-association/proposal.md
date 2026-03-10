## Why

Bombus 的 L2 職能管理模組中，三類核心業務資料目前全部是租戶級共用，缺少子公司維度：

1. **職務說明書（JD）**：`job_descriptions` 表僅有 `department TEXT`，無法區分哪間子公司的 JD
2. **職能模型基準**：`competencies` 表無任何組織歸屬欄位，所有子公司共用同一套職能定義
3. **職等職級**：`grade_salary_levels`、`department_positions`、`promotion_criteria`、`career_paths` 均無子公司區分

**業務問題**：集團下的不同子公司（如 A 公司和 B 公司）在實務上有不同的：
- 薪資結構（同一職等的薪級範圍不同）
- 職位配置（部門設置的職位不同）
- 職能要求（專業職能因產業別而異）
- 職務說明書（同名稱職位的工作內容不同）

目前系統無法反映這些差異，管理者在三個頁面上看到的都是混合所有子公司的資料，無法切換查看特定子公司的數據。

**影響範圍**：主要影響 L2 職能管理模組（`/competency` 路由下的三個頁面）。涉及後端 4 個路由檔案 + DB Schema，以及前端 CompetencyService + 3 個頁面元件。

## What Changes

### 資料庫擴充

6 張業務表新增 `org_unit_id TEXT` 欄位（nullable，NULL = 全組織共用/舊資料）：
- `job_descriptions`
- `competencies`
- `grade_salary_levels`
- `department_positions`
- `promotion_criteria`
- `career_paths`

> `grade_levels`（職等 1-7 結構）和 `grade_tracks`（管理職/專業職軌道）保持共用，因為 `grade INTEGER UNIQUE` 約束被多個 FK 引用，拆分代價過高。

### API 篩選

所有相關 READ 端點加入 `?org_unit_id=` 查詢參數，查詢邏輯：
```sql
WHERE (org_unit_id IS NULL OR org_unit_id = ?)
```
選擇子公司時同時顯示「共用資料」和「子公司專屬資料」。

CREATE/UPDATE 端點接受 `org_unit_id` 欄位。

### 前端子公司篩選

- **職務說明書頁面**：已有子公司下拉 → 連接到 API 篩選
- **職能模型基準頁面**：新增 OrgUnitService 注入 + 子公司下拉 + 資料切換
- **職等職級管理頁面**：已有子公司下拉 → 連接到 API 篩選

## Capabilities

### New Capabilities

- `subsidiary-data-filtering`：API 支援 `org_unit_id` 篩選，前端三個頁面可依子公司切換資料視圖
- `subsidiary-data-creation`：建立新 JD/職能/薪級/職位時可指定所屬子公司

### Modified Capabilities

- `job-description-management`：JD CRUD 加入 org_unit_id 欄位
- `competency-framework-management`：職能 CRUD 加入 org_unit_id 欄位
- `grade-matrix-management`：薪級/職位/晉升/職涯 CRUD 加入 org_unit_id 欄位

## Non-goals（不在範圍內）

- **不改 `grade_levels` 表結構**：職等定義（1-7）保持全組織共用，避免破壞 UNIQUE 約束和所有 FK 引用
- **不改 `grade_tracks` 表結構**：軌道定義（管理職/專業職）保持共用
- **不做資料遷移腳本**：舊資料維持 `org_unit_id = NULL`（視為共用），不自動分配到特定子公司
- **不改其他頁面的 API 呼叫**：僅影響 L2 的三個頁面，不改動 L1（入職 Modal 等）的現有 API 呼叫
- **不做子公司間的資料複製功能**：本次僅做篩選和歸屬，不做「從 A 子公司複製 JD 到 B 子公司」

## Impact

- Affected specs: `rbac`（子公司 scope 篩選邏輯）、`tenant-isolation`（同租戶內的子公司級資料隔離）
- Affected code:
  - `server/src/db/tenant-schema.js`（6 個 ALTER TABLE + INDEX）
  - `server/src/routes/job-descriptions.js`（GET/POST/PUT 加 org_unit_id）
  - `server/src/routes/competency-management.js`（GET/POST/PUT 加 org_unit_id）
  - `server/src/routes/competency.js`（GET 加 org_unit_id）
  - `server/src/routes/grade-matrix.js`（多個端點加 org_unit_id）
  - `src/app/features/competency/services/competency.service.ts`（多個方法加 orgUnitId 參數）
  - `src/app/features/competency/pages/job-description-page/*.{ts,html}`
  - `src/app/features/competency/pages/framework-page/*.{ts,html}`
  - `src/app/features/competency/pages/grade-matrix-page/*.{ts,html}`
