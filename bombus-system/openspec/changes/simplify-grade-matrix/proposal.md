## Why

目前職等職級薪資對照表採用「集團預設 + 子公司覆寫」的繼承機制，`org_unit_id = NULL` 代表集團預設值，子公司可選擇覆寫或 fallback 到預設。這導致幾個實務痛點：

1. **設定邏輯對管理者不直覺** — 管理者無法清楚看到「目前這個子公司用的到底是自己的還是集團預設的」
2. **薪資代碼雙向 cascade 過於複雜** — 新增/刪除薪資級距時，系統自動推移所有高於該職等的代碼（~180 行邏輯），容易出現非預期的連鎖變動
3. **集團預設修改會影響所有尚未覆寫的子公司** — 一個操作可能影響整個組織，管理者缺乏掌控感

簡化為「每個公司獨立維護自己的職等薪資表」，並提供「從母公司範本一鍵帶入」功能，讓設定流程更透明、更安全。

## What Changes

- **移除 `org_unit_id = NULL` fallback 機制** — 每筆 `grade_salary_levels`、`grade_track_entries`、`department_positions`、`promotion_criteria` 都必須綁定明確的 `org_unit_id` **BREAKING**
- **移除 `cascadeSalaryCodes()` / `cascadeSalaryCodesDown()` 雙向推移邏輯** — 薪資代碼改為各公司獨立管理，不再跨職等連鎖調整
- **集團（母公司）資料重新定位為「範本 + 生效資料」** — 集團本身的職等薪資表同時作為模板，可被子公司複製
- **新增「從母公司帶入」API 與 UI 按鈕** — 子公司管理者在空狀態下可一鍵將母公司的完整職等薪資資料複製為自己的初始資料
- **前端空狀態引導** — 子公司尚未設定時，顯示空狀態畫面與「從母公司帶入」引導按鈕
- **既有資料遷移** — 將現有 `org_unit_id = NULL` 的資料遷移為集團 org_unit 的資料

## Non-Goals

- 不改變 `grade_levels`（職等定義）的全域共用結構 — 職等數量和名稱仍為租戶級別共用
- 不引入「範本庫」獨立資料表 — 直接以母公司的實際資料作為範本來源
- 不做跨公司的薪資同步或自動更新機制 — 複製後各自獨立
- 不改動 L1 員工管理、L3~L6 等其他模組的資料結構

## Capabilities

### New Capabilities

- `grade-matrix-template-import`: 從母公司（集團）一鍵帶入職等薪資範本資料至子公司，包含 salary levels、track entries、promotion criteria、department positions 的完整複製

### Modified Capabilities

（無既有 spec 需修改）

## Impact

- **影響模組**: L2 職能管理 (`/competency/grade-matrix`)、L1 員工管理 (`/employee/onboarding` 入職薪資查詢)
- **影響後端檔案**:
  - `server/src/routes/grade-matrix.js` — 核心改動，移除 cascade、移除 NULL fallback、新增範本複製 API
  - `server/src/routes/hr-onboarding.js` — 入職流程薪資查詢移除 NULL fallback
  - `server/src/db/tenant-schema.js` — 移除 COALESCE unique constraint、更新種子資料
- **影響前端檔案**:
  - `src/app/features/competency/pages/grade-matrix-page/` — 移除 fallback 顯示邏輯、新增空狀態 + 範本帶入按鈕
  - `src/app/features/competency/services/competency.service.ts` — 新增範本複製 API 呼叫
- **資料遷移**: 既有 `org_unit_id = NULL` 資料需遷移為集團 org_unit_id
- **新增 API**: `POST /api/grade-matrix/import-template` — 從來源 org_unit_id 複製完整職等薪資資料到目標 org_unit_id
