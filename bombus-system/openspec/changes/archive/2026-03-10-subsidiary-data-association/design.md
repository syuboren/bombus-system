## Context

Bombus 的多租戶架構中，每個租戶有獨立的資料庫（Database-per-Tenant）。但租戶內部的子公司（subsidiary）層級缺乏資料隔離。L2 職能管理的三類核心資料（JD、職能模型、職等職級）需要支援子公司維度的篩選和歸屬。

### 現有需複用的服務與元件

- `OrgUnitService`（`core/services/org-unit.service.ts`）：共用組織單位服務，提供子公司列表和部門篩選
- `CompetencyService`（`features/competency/services/competency.service.ts`）：L2 所有 API 方法
- `OrgUnit` model（`core/models/org-unit.model.ts`）：組織單位介面

### 現有需修改的檔案

**後端**：
- `server/src/db/tenant-schema.js`：6 張表 ALTER TABLE ADD COLUMN
- `server/src/routes/job-descriptions.js`：JD CRUD 端點
- `server/src/routes/competency-management.js`：職能 CRUD 端點
- `server/src/routes/competency.js`：職能列表查詢端點
- `server/src/routes/grade-matrix.js`：職等職級全部端點

**前端**：
- `features/competency/services/competency.service.ts`：API 方法加參數
- `features/competency/pages/job-description-page/*.{ts,html}`：JD 頁面
- `features/competency/pages/framework-page/*.{ts,html}`：職能頁面
- `features/competency/pages/grade-matrix-page/*.{ts,html}`：職等頁面

## Goals / Non-Goals

**Goals**：
- 6 張表加入 `org_unit_id` nullable 欄位
- 所有相關 API 支援 `?org_unit_id=` 篩選
- 三個前端頁面的子公司下拉實際影響資料顯示

**Non-Goals**：
- 不改 `grade_levels`、`grade_tracks` 表結構
- 不做資料遷移（舊資料保持 NULL）
- 不做跨子公司資料複製

## Data Model

### Schema 變更

6 張表各新增一個欄位：

```sql
-- 每張表都加這個欄位
org_unit_id TEXT REFERENCES org_units(id)  -- nullable, NULL = 全組織共用
```

| 表名 | 新增欄位 | 索引 |
|------|---------|------|
| `job_descriptions` | `org_unit_id TEXT` | `idx_jd_org_unit` |
| `competencies` | `org_unit_id TEXT` | `idx_comp_org_unit` |
| `grade_salary_levels` | `org_unit_id TEXT` | `idx_gsl_org_unit` |
| `department_positions` | `org_unit_id TEXT` | `idx_dp_org_unit` |
| `promotion_criteria` | `org_unit_id TEXT` | `idx_pc_org_unit` |
| `career_paths` | `org_unit_id TEXT` | `idx_cp_org_unit` |

### 遷移策略

在 `tenant-schema.js` 的 `initTenantSchema()` migration 區段（現有 ALTER TABLE 區塊後），用 try-catch 包裝每個 ALTER TABLE：

```javascript
// 子公司資料關聯遷移
const subsidiaryMigrations = [
  { table: 'job_descriptions', index: 'idx_jd_org_unit' },
  { table: 'competencies', index: 'idx_comp_org_unit' },
  { table: 'grade_salary_levels', index: 'idx_gsl_org_unit' },
  { table: 'department_positions', index: 'idx_dp_org_unit' },
  { table: 'promotion_criteria', index: 'idx_pc_org_unit' },
  { table: 'career_paths', index: 'idx_cp_org_unit' }
];

for (const { table, index } of subsidiaryMigrations) {
  try {
    db.run(`ALTER TABLE ${table} ADD COLUMN org_unit_id TEXT REFERENCES org_units(id)`);
  } catch (e) { /* column already exists */ }
  db.run(`CREATE INDEX IF NOT EXISTS ${index} ON ${table}(org_unit_id)`);
}
```

### 查詢邏輯

所有 READ 端點統一使用以下篩選模式：

```sql
-- 有指定 org_unit_id 時：顯示共用 + 指定子公司
WHERE (org_unit_id IS NULL OR org_unit_id = ?)

-- 未指定 org_unit_id 時：顯示全部
-- （不加 org_unit_id 條件）
```

## API 變更

### job-descriptions.js

| 端點 | 變更 |
|------|------|
| `GET /` | 加 `?org_unit_id=` 查詢參數 |
| `POST /` | body 接受 `org_unit_id`，INSERT 時帶入 |
| `PUT /:id` | body 接受 `org_unit_id`，UPDATE 時帶入 |

### competency-management.js

| 端點 | 變更 |
|------|------|
| `GET /:category` | 加 `?org_unit_id=` 查詢參數，SQL 加 `AND (org_unit_id IS NULL OR org_unit_id = ?)` |
| `POST /:category` | body 接受 `org_unit_id`，INSERT 時帶入 |
| `PUT /:category/:id` | body 接受 `org_unit_id`，UPDATE 時帶入 |

### competency.js

| 端點 | 變更 |
|------|------|
| `GET /competencies` | 加 `?org_unit_id=` 查詢參數 |

### grade-matrix.js

| 端點 | 變更 |
|------|------|
| `GET /` | 加 `?org_unit_id=`，salary_levels 子查詢加篩選 |
| `GET /positions/list` | 加 `?org_unit_id=` 篩選 |
| `GET /promotion/criteria` | 加 `?org_unit_id=` 篩選 |
| `GET /career/paths` | 加 `?org_unit_id=` 篩選 |
| `POST /grades/:grade/salaries` | new_data JSON 接受 org_unit_id |
| `PUT /grades/:grade/salaries/:id` | new_data JSON 接受 org_unit_id |
| `POST /positions` | new_data JSON 接受 org_unit_id |
| `PUT /positions/:id` | new_data JSON 接受 org_unit_id |
| `POST /promotion/criteria` | new_data JSON 接受 org_unit_id |
| `PUT /promotion/criteria/:id` | new_data JSON 接受 org_unit_id |
| `POST /career/paths` | new_data JSON 接受 org_unit_id |
| `PUT /career/paths/:id` | new_data JSON 接受 org_unit_id |

#### 審核流程 org_unit_id 傳遞路徑

grade-matrix 的 CRUD 使用兩階段審核（Log-Then-Apply）：

1. **建立變更請求**：前端 POST/PUT → `grade_change_history` 記錄，`new_data` JSON 中包含 `org_unit_id`
2. **審核通過**：POST `/changes/:id/approve` → 呼叫 `applyCreate()` / `applyUpdate()` / `applyDelete()`
3. **寫入實際表**：`applyCreate` 從 `JSON.parse(change.new_data)` 取出 `org_unit_id`，INSERT 時帶入對應表（`grade_salary_levels`、`department_positions`、`promotion_criteria`、`career_paths`）；`applyUpdate` 同理，UPDATE SET `org_unit_id = ?`

## 前端設計

### CompetencyService 變更

**READ 方法**：加入可選 `orgUnitId` 參數，傳入 API 時附加 `?org_unit_id=` query string：

| 方法 | 改動 |
|------|------|
| `getJobDescriptions(params?)` | params 加 `orgUnitId?: string` |
| `getCoreCompetenciesWithLevels()` | 加 `orgUnitId?: string` 參數 |
| `getManagementCompetenciesWithLevels()` | 加 `orgUnitId?: string` 參數 |
| `getProfessionalCompetenciesWithLevels()` | 加 `orgUnitId?: string` 參數 |
| `getKSACompetencies()` | 加 `orgUnitId?: string` 參數 |
| `getGradeMatrixFromAPI()` | 加 `orgUnitId?: string` 參數 |
| `getDepartmentPositions()` | 加 `orgUnitId?: string` 參數 |
| `getPromotionCriteria()` | 加 `orgUnitId?: string` 參數 |
| `getCareerPathsFromAPI()` | 加 `orgUnitId?: string` 參數 |

**CRUD 方法**：data 物件加入 `org_unit_id` 欄位（透過 `grade_change_history.new_data` JSON 傳遞）：

| 方法 | 改動 |
|------|------|
| `createJobDescription(data)` | data 加 `org_unit_id` |
| `updateJobDescription(id, data)` | data 加 `org_unit_id` |
| `createSalaryLevel(grade, data)` | data 加 `org_unit_id` |
| `updateSalaryLevel(grade, id, data)` | data 加 `org_unit_id` |
| `createPosition(data)` | data 加 `org_unit_id` |
| `updatePosition(id, data)` | data 加 `org_unit_id` |
| `createPromotionCriteria(data)` | data 加 `org_unit_id` |
| `updatePromotionCriteria(id, data)` | data 加 `org_unit_id` |
| `createCareerPath(data)` | data 加 `org_unit_id` |
| `updateCareerPath(id, data)` | data 加 `org_unit_id` |

```typescript
// READ 範例
getJobDescriptions(params?: { status?: string; department?: string; orgUnitId?: string }): Observable<JobDescription[]> {
  let url = '/api/job-descriptions';
  const queryParams: string[] = [];
  if (params?.status) queryParams.push(`status=${params.status}`);
  if (params?.department) queryParams.push(`department=${params.department}`);
  if (params?.orgUnitId) queryParams.push(`org_unit_id=${params.orgUnitId}`);
  if (queryParams.length) url += '?' + queryParams.join('&');
  return this.http.get<JobDescription[]>(url);
}
```

### 職務說明書頁面（job-description-page）

**現狀**：已注入 OrgUnitService，已有 `selectedSubsidiaryId` signal + subsidiary dropdown。
**改法**：
1. 加入 `effect`：當 `selectedSubsidiaryId` 變化時，重新呼叫 `loadJobDescriptions()`
2. `loadJobDescriptions()` 傳入 `orgUnitId: this.selectedSubsidiaryId()`
3. 建立新 JD 時自動帶入 `org_unit_id`

### 職能模型基準頁面（framework-page）

**現狀**：無 OrgUnitService，無子公司概念。
**改法**：
1. 注入 `OrgUnitService`
2. 加入 `selectedSubsidiaryId` signal + `subsidiaries` computed
3. `ngOnInit` 載入 org units + 鎖定子公司
4. 加入 `effect`：`selectedSubsidiaryId` 變化時重新載入四類職能
5. HTML：在頁面頂部篩選區加入子公司下拉（使用標準模式）
6. 建立新職能時自動帶入 `org_unit_id`

### 職等職級管理頁面（grade-matrix-page）

**現狀**：已注入 OrgUnitService，已有 `selectedSubsidiaryId` signal + subsidiary dropdown。
**改法**：
1. 加入 `effect`：`selectedSubsidiaryId` 變化時重新載入資料
2. 各載入方法傳入 `orgUnitId`：`getGradeMatrixFromAPI()`、`getDepartmentPositions()`、`getPromotionCriteria()`、`getCareerPathsFromAPI()`
3. CRUD 操作帶入 `org_unit_id`（透過 grade_change_history 審核流程）

## 向下相容

- 所有 `org_unit_id` 欄位為 nullable，現有資料保持 NULL
- API 不傳 `org_unit_id` 時行為與之前完全一致（回傳全部資料）
- 前端子公司下拉選「全部子公司」（空值）時顯示所有資料
