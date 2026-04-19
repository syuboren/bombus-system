## Why

AI 智能面試頁面目前把「面試評分 / AI 分析 / 錄用決策」三種不同角色的任務塞在同一頁，導致操作流程混亂：面試官關心的是評分與分析結果，而人資真正關心的是「誰該錄取、薪資核定多少」。

此外，現況讓面試官也能看到薪資與錄用結論，違反敏感資訊分權原則（D-12）；決策頁也缺少薪資核定欄位（D-13）與決策 → 入職完整流程的簽核機制（D-15）。

拆分成兩個獨立頁面後，各角色動線清楚、權限分層乾淨、符合 0212 版需求中 D-12/D-13/D-15 三項需求。

## What Changes

- **新增「面試決策」獨立頁面**（`/employee/decision`）：僅人資與管理層可見，包含職缺詳情、面試評分（只讀）、AI 分析（只讀）、錄用決策、薪資核定、送交簽核
- **新增 `L1.decision` feature**：納入角色權限系統；預設 super_admin / subsidiary_admin / hr_manager = edit/company；dept_manager / employee = none
- **新增簽核流程**：HR 送出 → subsidiary_admin 簽核 → Offered；主管可無限次退回給 HR 修改重送
- **新增薪資核定欄位**：薪資類型（月薪/年薪）+ 核定金額，帶職缺薪資範圍提示，超出範圍僅警告不阻擋
- **修改 AI 智能面試頁**：
  - 移除「錄用決策」整個區塊（下移至決策頁）
  - Tab 命名調整：`全部 / 待面試 / 已評分`（原「面試後」改名並縮窄範圍）
  - 已決策候選人仍在列表顯示，但整頁切換為只讀模式
  - AI 分析按鈕保留在此頁（AI 分析僅在面試頁觸發，決策頁只讀）
- **候選人狀態機擴充**：`pending_decision` 後新增 `pending_approval` 狀態（簽核中）
- **資料表結構擴充**：
  - `candidates` 表新增 3 欄（薪資核定）：`approved_salary_type` / `approved_salary_amount` / `approved_salary_out_of_range`
  - `invitation_decisions` 表新增 5 欄（簽核）：`approval_status` / `approver_id` / `approved_at` / `approval_note` / `submitted_for_approval_at`
  - `jobs` 表新增 `grade INTEGER REFERENCES grade_levels(grade)` 欄位，薪資範圍由此關聯 `grade_salary_levels` 計算
- **職缺管理頁面 UI 新增 grade 選單**：建立/編輯職缺時可選擇職等（來源 `grade_levels`），L1.jobs feature 對應的表單與 API 需同步擴充
- **新增後端 API**：`POST /api/recruitment/candidates/:id/submit-approval`、`POST /api/recruitment/candidates/:id/approve`、`POST /api/recruitment/candidates/:id/reject-approval`、`GET /api/recruitment/candidates/:id/salary-range`（依 candidate.job.grade 計算）
- **側邊欄新增「面試決策」選單項目**：於 L1 員工管理內，排在「AI智能面試」之後

## Non-Goals

- 不修改 jobs 表新增 `hiring_manager_id` 欄位（「用人主管簽核」為後續迭代，此版僅做 subsidiary_admin 簽核）
- 不 backfill 既有 offered / onboarded 候選人的 `approval_status`（既有資料保持原狀，不觸發簽核；入職流程對既有資料豁免簽核檢查）
- 不處理 D-09 其他審核流程情境（刊登中新增候選人是否同步人才庫、刪除刊登後 104 同步關閉等）
- 不實作 offer letter PDF 自動產生（維持現有 email 連結機制）
- 不開放多層簽核（僅一層 HR → subsidiary_admin）
- 不調整入職管理頁面（`L1.onboarding`）——接收流程已於現版實作
- 不修改既有面試評分表（17 題倒扣制）內容或計分邏輯

## Capabilities

### New Capabilities

- `interview-decision-page`: 獨立「面試決策」頁面——候選人列表（Tab：全部/待決策/已決策）、職缺詳情、評分與 AI 分析只讀檢視、錄用決策表單、薪資核定欄位、簽核狀態顯示、Offer 連結
- `decision-approval-workflow`: 決策簽核工作流——HR 送出 → subsidiary_admin 簽核 → offered；含退回機制（可無限次輪迴）、簽核歷程欄位（approval_status / approver_id / approved_at / approval_note）
- `approved-salary-field`: 薪資核定欄位模型——薪資類型（月薪/年薪）+ 核定金額，帶職缺範圍比對、超出警告但不阻擋送出；audit trail 欄位 `approved_salary_out_of_range`

### Modified Capabilities

- `feature-based-permissions`: 新增 `L1.decision` feature 定義、預設角色權限映射
- `feature-perm-frontend-gate`: 側邊欄新增「面試決策」項目、路由守衛處理 `/employee/decision`
- `employee-onboarding-automation`: 入職觸發時機由「單純決策送出」調整為「簽核通過（approval_status = APPROVED）」

## Impact

**影響模組**：L1 員工管理（`/employee/recruitment` 與新增 `/employee/decision`）

**影響路由**：
- 修改：`/employee/recruitment`（移除決策區塊、Tab 重命名、只讀模式）
- 新增：`/employee/decision`

**影響前端程式碼**：
- `src/app/features/employee/pages/recruitment-page/recruitment-page.component.{ts,html,scss}`（移除決策區塊）
- `src/app/features/employee/pages/decision-page/*`（新建 3 檔）
- `src/app/features/employee/employee.routes.ts`（新增路由）
- `src/app/features/employee/services/decision.service.ts`（新建）
- `src/app/features/employee/models/candidate.model.ts`（`CandidateStatus` 擴充 `pending_approval`、新增核薪與簽核欄位）
- `src/app/shared/components/sidebar/sidebar.component.ts`（新增選單項目）
- `src/app/core/services/feature-gate.service.ts`（已通用，不需改）

**影響後端程式碼**：
- `server/src/db/tenant-schema.js`（`FEATURE_SEED_DATA` 新增 `L1.decision`、`DEFAULT_ROLE_FEATURE_PERMS` 四個角色；`CREATE TABLE candidates` 新增 8 欄；migration 新增 `0003_add_decision_fields`）
- `server/src/db/tenant-db-manager.js`（`_runMigrations()` 同步新增 migration）
- `server/src/routes/recruitment.js`（新增 3 個簽核 API、修改 submitDecision 流程為送簽核而非直接 offered）
- `server/src/services/decision.service.js`（新建——集中簽核狀態轉換邏輯）

**影響資料模型**：
- `candidates` 表 +3 欄（approved_salary_type / amount / out_of_range）
- `invitation_decisions` 表 +5 欄（approval_status / approver_id / approved_at / approval_note / submitted_for_approval_at）
- `jobs` 表 +1 欄（`grade INTEGER REFERENCES grade_levels(grade)`）
- `features` 表 +1 筆（L1.decision）
- `role_feature_permissions` 表 +N 筆（各角色對 L1.decision 的預設權限）

**影響依賴**：無新增第三方套件。

**相容性**：
- 既有候選人資料（狀態 ≠ `pending_decision`）不受影響
- 既有「待決策」候選人 migration 後仍可於新決策頁處理，首次提交後流程自動銜接簽核
- 已 `offered` / `offer_accepted` / `offer_declined` / `onboarded` 候選人不補簽核步驟，`approval_status` 保持預設 `NONE`，入職流程對既有資料豁免簽核檢查
- 既有 `jobs` 無 grade 資料：migration 後 `grade` 為 NULL；職缺詳情區塊若 grade 為 NULL 則顯示「職缺未設定職等」，薪資範圍比對不做超範圍警告（僅顯示核定金額）

## Post-Implementation Refinements (2026-04-19)

實作完成後經實際使用回饋，追加以下精進項目。已納入本次變更範圍，規格與任務同步更新：

- **鎖定時機延後**：AI 智能面試頁鎖定時機由「評分送出（pending_decision）」延後至「決策送簽（pending_approval）」。HR 在 pending_decision 階段仍可回頭修改評分或重跑 AI 分析，直到正式送簽才整頁唯讀。
- **AI 智能面試列表範圍收斂**：候選人列表僅保留 `interview / pending_ai / pending_decision`，pending_approval 以後的候選人完全交由決策頁處理；「已評分」tab 涵蓋 `pending_ai / pending_decision`。
- **面試日期篩選（AI 智能面試）**：候選人列表新增日期篩選區塊，含日期選擇器與「全部 / 今日 / 近 3 天 / 近 7 天」快速 tabs。篩選基準為候選人最新一場面試時間。
- **列表日期欄位語意改為面試時間**：兩頁候選人列表顯示的時間由原本的投遞日 (`apply_date`) 改為最新一場面試時間 (`latest_interview_at`)；若無面試紀錄則 fallback 至投遞日。格式統一為 `yyyy-MM-dd HH:mm`。
- **退回重送表單自動回填**：主管退回後候選人回到 `pending_decision` 且 `approval_status='REJECTED'` 時，決策頁選擇該候選人會自動預填先前的決策（Offered/Rejected）、決策理由、薪資類型與金額；HR 調整後可一鍵重送。
- **簽核者與送簽者姓名顯示**：候選人列表 API 預載 `approver_name` / `decided_by_name`（透過 `users.name` JOIN），決策結果視圖顯示「送簽人員 / 簽核人員 / 簽核時間 / 簽核備註」四行資訊，簽核時間以 `yyyy-MM-dd HH:mm` 格式顯示。
- **簽核通過後 Offer 連結自動重載**：主管簽核通過後，決策頁自動重新載入該候選人的 offer response link，不需手動切換候選人即可看到 Offer 回覆連結區塊。
- **評分表唯讀模式雙重鎖定**：面試決策頁打開的面試官評分表（只讀模式）除了 CSS `pointer-events: none` 鎖定 input，還需鎖定包裹 checkbox/radio 的 `<label>` 容器，並於 TS 方法（`setScoringLevel / toggleChecklist / setAssessmentValue / setAssessmentOther / setRecommendation`）加 `readOnly()` guard，防止透過 label click 繞過視覺鎖。
- **決策頁 UI/外框對齊 AI 智能面試**：決策頁 container padding、sidebar sticky 定位、max-width、空狀態卡片樣式與 AI 智能面試頁一致；AI 量化分析面板使用 `$color-cloud-gray` 底色（非較深的 `$color-soft-gray`）。

**相容性（追加項）**：

- 上述調整皆為前端與 API 查詢精進，不新增資料表或欄位
- list API 新增 SELECT 子查詢欄位：`latest_interview_at`、`decision_reason`、`decision_type`、`approver_name`、`decided_by_name`（皆為讀取性欄位，不影響既有 caller）
