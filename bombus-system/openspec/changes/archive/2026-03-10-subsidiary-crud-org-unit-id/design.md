## Context

承接 `subsidiary-data-association`，該變更完成了 DB Schema 遷移和 READ 端點的 org_unit_id 篩選，但 CRUD 操作的 org_unit_id 傳遞鏈不完整。本變更補齊所有 CRUD 操作的 org_unit_id 傳遞。

### 現有需修改的檔案

**後端**：
- `server/src/routes/grade-matrix.js`：新增 career paths CRUD 端點 + 審核流程

**前端 Service**：
- `features/competency/services/competency.service.ts`：CRUD 方法加 org_unit_id

**前端頁面**：
- `features/competency/pages/job-description-page/job-description-page.component.ts`
- `features/competency/pages/create-jd-page/create-jd-page.component.ts`

**前端 Modal**：
- `features/competency/components/competency-edit-modal/competency-edit-modal.component.ts`
- `features/competency/components/ksa-edit-modal/ksa-edit-modal.component.ts`
- `features/competency/components/position-edit-modal/position-edit-modal.component.ts`
- `features/competency/components/promotion-criteria-edit-modal/promotion-criteria-edit-modal.component.ts`

**前端 HTML**：
- `features/competency/pages/framework-page/framework-page.component.html`
- `features/competency/pages/grade-matrix-page/grade-matrix-page.component.html`

## Goals / Non-Goals

**Goals**：
- Career Paths 支援 POST/PUT/DELETE（走審核流程）
- 所有 L2 CRUD 操作正確帶入 org_unit_id
- JD 頁面職能參考跟隨子公司篩選

**Non-Goals**：
- 不改 grade-edit-modal / track-edit-modal（共用結構）

## API 變更

### grade-matrix.js — Career Paths CRUD

| 端點 | 說明 |
|------|------|
| `POST /career/paths` | 新增職涯路徑（進入審核流程），body 接受 `org_unit_id` |
| `PUT /career/paths/:id` | 更新職涯路徑（進入審核流程），body 接受 `org_unit_id` |
| `DELETE /career/paths/:id` | 刪除職涯路徑（進入審核流程） |

審核流程（applyCreate/applyUpdate/applyDelete）加入 `career` case：
- `applyCreate`：INSERT INTO career_paths (id, from_grade, to_grade, track, required_experience, required_certifications, org_unit_id)
- `applyUpdate`：UPDATE career_paths SET ... org_unit_id = ? WHERE id = ?
- `applyDelete`：DELETE FROM career_paths WHERE id = ?

## 前端設計

### CompetencyService CRUD 方法

| 方法 | 改動 |
|------|------|
| `createCompetency(cat, data)` | request body 加 `org_unit_id: (data as any).org_unit_id \|\| null` |
| `updateCompetency(cat, id, data)` | 同上 |
| `createKSACompetency(data)` | request body 加 `org_unit_id` |
| `updateKSACompetency(id, data)` | 同上 |
| `createCareerPath(data)` | 新方法，POST `/grade-matrix/career/paths` |
| `updateCareerPath(id, data)` | 新方法，PUT `/grade-matrix/career/paths/:id` |

### Modal org_unit_id 傳遞

所有 Modal 加入 `orgUnitId = input<string>('')`，父頁面傳入 `[orgUnitId]="selectedSubsidiaryId()"`。

| Modal | 父頁面 | 傳遞方式 |
|-------|--------|----------|
| CompetencyEditModal | framework-page | `[orgUnitId]="selectedSubsidiaryId()"` |
| KsaEditModal | framework-page | `[orgUnitId]="selectedSubsidiaryId()"` |
| PositionEditModal | grade-matrix-page | `[orgUnitId]="selectedSubsidiaryId()"` |
| PromotionCriteriaEditModal | grade-matrix-page | `[orgUnitId]="selectedSubsidiaryId()"` |

### JD 頁面職能篩選

| 頁面 | 改動 |
|------|------|
| job-description-page | 提取 `loadCompetencies()`，傳入 `selectedSubsidiaryId()`，effect 觸發時重載 |
| create-jd-page | `loadCompetencies()` 傳入 `selectedSubsidiaryId()`，`generateFromContent()` 帶入 `org_unit_id` |

## 向下相容

- 所有 `org_unit_id` 為 optional，不傳時行為與之前一致
- Modal 不傳 orgUnitId 時預設空字串，轉為 null 送出（等同共用資料）
