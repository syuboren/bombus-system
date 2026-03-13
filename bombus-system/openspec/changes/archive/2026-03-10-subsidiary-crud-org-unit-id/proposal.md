## Why

`subsidiary-data-association` 完成後，L2 的 READ 端點和三個頁面的子公司篩選已正常運作，但 **CRUD 操作**（建立/編輯）仍有以下缺口：

1. **Career Paths 缺少 CRUD 端點**：`grade-matrix.js` 只有 GET `/career/paths`，沒有 POST/PUT/DELETE，因此無法透過審核流程新增或修改職涯路徑
2. **JD 頁面職能參考未篩選**：JD 頁面和 create-jd-page 載入職能參考資料時未傳入 `orgUnitId`，使用者在特定子公司下看到的職能選項包含所有子公司的資料
3. **Modal CRUD 未帶 org_unit_id**：四個編輯 Modal（CompetencyEditModal、KsaEditModal、PositionEditModal、PromotionCriteriaEditModal）建立/編輯時不會帶入 `org_unit_id`，導致新建的資料一律為 NULL（全組織共用）
4. **CompetencyService CRUD 方法**：`createCompetency`/`updateCompetency`/`createKSACompetency`/`updateKSACompetency` 的 request body 未包含 `org_unit_id`

**業務影響**：使用者在子公司 A 下建立的 JD、職能、薪級、晉升條件都不會歸屬到該子公司，無法達到子公司專屬資料的目的。

## What Changes

### 後端

- `grade-matrix.js`：新增 POST/PUT/DELETE `/career/paths` 端點（走審核流程），`applyCreate`/`applyUpdate`/`applyDelete` 加入 `career` case

### 前端 — Service 層

- `competency.service.ts`：
  - 新增 `createCareerPath()` / `updateCareerPath()` 方法
  - `createCompetency` / `updateCompetency` request body 加 `org_unit_id`
  - `createKSACompetency` / `updateKSACompetency` request body 加 `org_unit_id`

### 前端 — 頁面層

- `job-description-page.component.ts`：`loadCompetencies()` 傳入 `selectedSubsidiaryId()`，effect 變更時重載職能
- `create-jd-page.component.ts`：`loadCompetencies()` 傳入 `selectedSubsidiaryId()`，`generateFromContent()` 帶入 `org_unit_id`

### 前端 — Modal 層

- 4 個 Modal 元件加入 `orgUnitId = input<string>('')`，onSave 帶入 `org_unit_id`
- 2 個父頁面 HTML 傳入 `[orgUnitId]="selectedSubsidiaryId()"`

## Capabilities

### New Capabilities

- `career-path-crud`：職涯路徑支援 POST/PUT/DELETE（走審核流程）

### Modified Capabilities

- `subsidiary-data-creation`：所有 L2 CRUD 操作正確帶入 `org_unit_id`
- `subsidiary-data-filtering`：JD 頁面職能參考跟隨子公司篩選

## Non-goals

- 不改 `grade-edit-modal`（職等定義為全組織共用）
- 不改 `track-edit-modal`（軌道定義為全組織共用）

## Impact

- 承接 `subsidiary-data-association` 的遺留項目
- Affected code:
  - `server/src/routes/grade-matrix.js`（career paths CRUD + applyCreate/applyUpdate/applyDelete）
  - `src/app/features/competency/services/competency.service.ts`（createCareerPath/updateCareerPath + CRUD org_unit_id）
  - `src/app/features/competency/pages/job-description-page/job-description-page.component.ts`
  - `src/app/features/competency/pages/create-jd-page/create-jd-page.component.ts`
  - `src/app/features/competency/components/competency-edit-modal/competency-edit-modal.component.ts`
  - `src/app/features/competency/components/ksa-edit-modal/ksa-edit-modal.component.ts`
  - `src/app/features/competency/components/position-edit-modal/position-edit-modal.component.ts`
  - `src/app/features/competency/components/promotion-criteria-edit-modal/promotion-criteria-edit-modal.component.ts`
  - `src/app/features/competency/pages/framework-page/framework-page.component.html`
  - `src/app/features/competency/pages/grade-matrix-page/grade-matrix-page.component.html`
