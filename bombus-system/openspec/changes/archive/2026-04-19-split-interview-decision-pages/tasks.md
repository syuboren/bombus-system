## 1. 資料庫與後端 Schema 變更

- [x] 1.1 於 `server/src/db/tenant-schema.js` 的 `FEATURE_SEED_DATA` 陣列新增 L1.decision feature definition（id、module、name、sort_order），驗證方式：新租戶初始化後 `SELECT * FROM features WHERE id='L1.decision'` 回傳一筆
- [x] 1.2 於 `tenant-schema.js` 的 `DEFAULT_ROLE_FEATURE_PERMS` 為五個角色加入 L1.decision default role permissions（super_admin / subsidiary_admin / hr_manager = edit/company；dept_manager / employee = none）
- [x] 1.3 於 `tenant-schema.js` 的 `candidates` CREATE TABLE 加入薪資核定 3 欄（approved salary columns on candidates table）：approved_salary_type、approved_salary_amount、approved_salary_out_of_range
- [x] 1.4 於 `tenant-schema.js` 的 `invitation_decisions` CREATE TABLE 加入簽核 5 欄（invitation decisions approval status columns）：approval_status、approver_id、approved_at、approval_note、submitted_for_approval_at
- [x] 1.5 於 `tenant-schema.js` 的 `jobs` CREATE TABLE 加入 `grade INTEGER REFERENCES grade_levels(grade)` 欄位（jobs grade column for salary range resolution）
- [x] 1.6 撰寫 idempotent migration `0003_add_decision_fields`：ALTER TABLE candidates（+3 欄）、ALTER TABLE invitation_decisions（+5 欄）、ALTER TABLE jobs（+grade）、INSERT L1.decision feature、INSERT 五個角色的預設權限（採 try/catch 吞重複錯誤確保冪等）
- [x] 1.7 於 `server/src/db/tenant-db-manager.js` 的 `_runMigrations()` 雙遷移清單同步加入 `0003_add_decision_fields`，並於本機以既有 demo 租戶驗證兩次啟動皆通過
- [x] 1.8 驗證 `features` 表 API `GET /api/tenant-admin/features` 的 L1 群組中有 L1.decision，位於 L1.recruitment 之後

## 2. 後端 API 實作（Express）

- [x] 2.1 建立 `server/src/services/decision.service.js`，集中管理簽核狀態轉換邏輯（submitForApproval / approve / rejectApproval），採 β 方案（subsidiary_admin 簽核）的角色檢查
- [x] 2.2 實作 `POST /api/recruitment/candidates/:id/submit-approval`（submit decision for approval endpoint）：檢查 feature edit perm、驗證候選人狀態為 pending_decision、寫入 decision 與薪資欄位、狀態改為 pending_approval，採 `db.transaction()` 與 Prepared Statements
- [x] 2.3 實作 `POST /api/recruitment/candidates/:id/approve`（approve decision endpoint）：檢查呼叫者 role 為 subsidiary_admin/super_admin、依原始 decision 轉為 offered 或 not_hired、產 offer UUID link
- [x] 2.4 實作 `POST /api/recruitment/candidates/:id/reject-approval`（reject approval endpoint）：檢查 role、要求 approval_note、狀態回到 pending_decision，可無限輪迴
- [x] 2.5 實作 salary validation on submit-approval endpoint：type 必須 ∈ {10,50,60}、amount 必須為正整數、超出職缺範圍時計算 approved_salary_out_of_range flag 但不阻擋；with 薪資核定採「方案 2」範圍提示 + 超範圍警告
- [x] 2.6 於現有 API endpoints enforce L1.decision permission：在新 3 個端點套用 `featurePermMiddleware('L1.decision', 'edit')`
- [x] 2.7 實作 approval audit trail：每次 submit / approve / reject 寫入 audit_logs（action、candidate_id、from_status、to_status、actor、approval_note）
- [x] 2.8 於 `GET /api/recruitment/candidates` 回傳欄位 JOIN `invitation_decisions` 帶出 approval_status / approver_id / approved_at / approval_note 與 candidates 的 approved_salary_* 共 8 欄
- [x] 2.9 實作 `GET /api/recruitment/candidates/:id/salary-range`（salary range API endpoint）：查詢 candidate → job → jobs.grade → grade_levels 取 title、`SELECT MIN/MAX(salary) FROM grade_salary_levels WHERE grade = ? AND (org_unit_id = ? OR org_unit_id IS NULL)`；回傳 `{grade, grade_title, salary_low, salary_high, has_range, reason}`
- [x] 2.10 於 `server/src/routes/jobs.js` 擴充 POST/PUT `/api/jobs` 的 body 欄位接受 `grade`（jobs grade column for salary range resolution 的 API 支援），INSERT/UPDATE 寫入 grade 欄位

## 3. 前端資料模型與服務

- [x] 3.1 更新 `src/app/features/employee/models/candidate.model.ts`：`CandidateStatus` type 加入 `pending_approval`（candidate status machine extended with pending_approval）、Candidate 介面加 approved_salary_type/amount/out_of_range 及 approval_status/approver_id/approved_at/approval_note/submitted_for_approval_at 共 8 欄位
- [x] 3.2 更新 `src/app/features/employee/models/job.model.ts`：Job 介面加 `grade?: number | null`、`grade_title?: string`（對應 jobs.grade 欄位）
- [x] 3.3 建立 `src/app/features/employee/services/decision.service.ts`：封裝 submitForApproval / approve / rejectApproval / getSalaryRange 四個 API 呼叫，回傳 RxJS Observable
- [x] 3.4 驗證 `FeatureGateService.canEdit('L1.decision')` / `canView('L1.decision')` 與後端權限種子一致（於權限管理頁面快照驗證）

## 4. 前端：面試決策頁（新建）

- [x] 4.1 建立 `src/app/features/employee/pages/decision-page/decision-page.component.ts`：standalone + OnPush + inject + Signal APIs；涵蓋 decision page route and navigation（以獨立路由與頁面實現面試決策頁）
- [x] 4.2 實作 decision page candidate sidebar with status tabs：`全部 / 待決策 / 已決策` 三個 tab，computed filteredCandidates 依 status 群組過濾
- [x] 4.3 實作 decision page main content sections：`① 候選人基本資料 ② 職缺詳情（職等/薪資範圍/期望薪資/JD 摘要）③ 面試評分（只讀）④ AI 量化分析（只讀）⑤ 錄用決策 ⑥ Offer 連結`，ai 量化分析僅在面試頁觸發、決策頁純讀
- [x] 4.4 實作 decision page salary input with range reference：已錄取時顯示薪資類型（月薪/年薪）+ 核定金額輸入；依 GET /salary-range 回傳 `{grade_title, salary_low, salary_high, has_range}` 顯示提示；has_range=false 時顯示「未設定職等」或「此職等未設定薪資層級」
- [x] 4.5 實作 out-of-range warning without blocking submission：amount < salaryLow 或 > salaryHigh 時顯示黃色警告樣式與提示文字，但「送交簽核」按鈕仍可按
- [x] 4.6 實作「送交簽核」按鈕呼叫 decision.service.submitForApproval
- [x] 4.7 實作簽核中／已通過／已退回狀態顯示：approval_status badge、approver_id 對應 user name、approved_at 時間、approval_note（若有退回原因）
- [x] 4.8 實作 read-only mode for decided candidates：只讀模式透過 canEdit() + 區塊 [class.locked] 控制，涵蓋 pending_approval/offered/offer_accepted/offer_declined/onboarded/not_hired
- [x] 4.9 實作 approved salary display on approval and onboarding views：已通過時顯示 `{amount} / {type 中文}`；若 out_of_range = 1 顯示「超出職缺範圍」badge
- [x] 4.10 實作 module design system compliance：SCSS 使用 L1 模組色 `$color-l1-sage` (#8DA399)；套用 `@include card`、`@include filter-bar`、`@include status-badge`、`@include button-module` mixins；無硬編碼色碼
- [x] 4.11 於 `src/app/features/employee/employee.routes.ts` 註冊路由 `/employee/decision` 搭配 permissionGuard（featureId L1.decision）
- [x] 4.12 實作 route guard enforces L1.decision access：未授權直接存取 URL 時導回 `/dashboard` + 錯誤通知

## 5. 前端：面試頁面調整

- [x] 5.1 於 `recruitment-page.component.html` 移除整個 `section.decision-section`，使 recruitment page no longer contains decision section
- [x] 5.2 於 `recruitment-page.component.ts` 移除 decision、decisionReason、decisionSubmitting、offerResponseLink、isOfferPending、submitDecision、copyOfferLink 等 signal 與方法
- [x] 5.3 調整 `statusFilter` 字面量與 Tab 顯示字為 `全部 / 待面試 / 已評分`（面試頁 Tab 命名）；擴充「已評分」涵蓋 pending_ai 以後所有狀態
- [x] 5.4 面試頁「評分儲存」為轉手時機：確認評分儲存後狀態自動轉 pending_ai，AI 分析儲存後轉 pending_decision；狀態 ≥ pending_decision 時整頁 readonly，顯示 hint 指向決策頁（若當前使用者有 L1.decision 權限則提供連結）
- [x] 5.5 更新候選人 status badge：新增 `pending_approval` case 顯示「簽核中」

## 6. 側邊欄與導航

- [x] 6.1 於 `src/app/shared/components/sidebar/sidebar.component.ts` 的 L1 員工管理 children 陣列在 AI智能面試 之後、人才庫與再接觸管理 之前插入「面試決策」項目（featureId: `L1.decision`, route: `/employee/decision`）
- [x] 6.2 驗證 sidebar filters items by feature permission：以 dept_manager 帳號登入確認看不到「面試決策」；以 hr_manager 確認看得到

## 6b. 職缺管理頁面擴充 grade 選單

- [x] 6b.1 於 `src/app/features/employee/pages/jobs-page/jobs-page.component.ts` 建立/編輯職缺 Modal 新增職等下拉選單（options 來源：呼叫 `GET /api/grade-matrix/grade-levels` 或類似 API）
- [x] 6b.2 於 jobs-page 表單 submit payload 帶上 grade 欄位，驗證 POST/PUT `/api/jobs` 寫入 DB
- [x] 6b.3 於職缺列表顯示 grade_title 一欄（可選，若空間允許）

## 7. 入職流程串接

- [x] 7.1 更新 onboarding 服務與 `POST /api/hr/onboarding/convert-candidate`：限制僅 `approval_status = 'APPROVED'` 才允許轉換，對應 automatic user account creation during candidate conversion 的更新規則
- [x] 7.2 實作 approved salary carried into employee record：轉換時保留 candidates.approved_salary_* 欄位並由 employees 保留回溯鏈結
- [x] 7.3 前端入職管理頁顯示 approved salary（若有）

## 8. 整合測試與驗證

- [x] 8.1 撰寫整合測試 `server/src/tests/test-decision-approval.js`：涵蓋 submit → approve（Offered/Rejected 兩條路徑）、submit → reject → resubmit → approve 輪迴、權限檢查（hr_manager 不能 approve、dept_manager 完全擋）
- [x] 8.2 撰寫整合測試覆蓋 salary validation：無效 type、負數 amount、超出範圍但接受並 flag
- [x] 8.3 端到端驗證：demo 租戶登入 hr_manager → 決策頁挑候選人 → 送簽 → 切換 subsidiary_admin → 通過 → 候選人狀態 offered → email 連結可產生
- [x] 8.4 執行 `cd bombus-system && npx tsc --noEmit`，確認無型別錯誤
- [x] 8.5 執行 `cd bombus-system && npx ng build --configuration=development`，確認前端建置成功
- [x] 8.6 跑 `npm test --silent` 確認原有 Karma 單元測試通過 — **N/A：專案無任何 `*.spec.ts` 檔案**（`find src -name "*.spec.ts" | wc -l` = 0）；Karma/Jasmine 配置存在但從未撰寫單元測試，屬既有專案狀態。已由整合測試（`server/src/tests/test-decision-approval.js`, 34/34 通過）覆蓋新功能核心路徑。
- [x] 8.7 UI 手測檢核：莫蘭迪色與圓角一致、cursor: pointer、響應式 375~1920 無水平捲軸、空狀態友善訊息

## 9. 文件與收尾

- [x] 9.1 更新 `bombus-system/ARCHITECTURE.md`：L1 模組新增面試決策頁、簽核流程圖
- [x] 9.2 更新根目錄 `bombus-system/docs/現況與問題比對分析_20260406.xlsx` 的 D-12/D-13/D-15 執行狀態為「已實作」
- [x] 9.3 執行 `/spectra:verify split-interview-decision-pages` 通過後，執行 `/spectra:archive split-interview-decision-pages`

## 10. 設計決策落實對照（Design Decisions Coverage）

- [x] 10.1 落實 Decision: 以獨立路由與頁面實現面試決策頁 — 由任務 4.1、4.11 實作，驗收 `/employee/decision` 為獨立 Component 而非現有 Tab
- [x] 10.2 落實 Decision: 面試頁「評分儲存」為轉手時機 — 由任務 5.4 實作，驗收評分送出後自動進 pending_ai；AI 分析完成進 pending_decision，並於決策頁列表出現
- [x] 10.3 落實 Decision: AI 量化分析僅在面試頁觸發 — 由任務 4.3 實作，驗收決策頁無觸發按鈕、結果 read-only
- [x] 10.4 落實 Decision: 薪資核定採「方案 2」範圍提示 + 超範圍警告 — 由任務 2.5、4.4、4.5 實作，驗收超出範圍僅警告不阻擋送出
- [x] 10.5 落實 Decision: 簽核採 β 方案（subsidiary_admin 簽核）— 由任務 2.1、2.3、2.4 實作，驗收 hr_manager 無法 approve、subsidiary_admin 可 approve/reject
- [x] 10.6 落實 Decision: 簽核欄位併入 invitation_decisions，薪資欄位加於 candidates — 由任務 1.3、1.4、1.6 實作，驗收 invitation_decisions +5、candidates +3、無新建子表
- [x] 10.6b 落實 Decision: 職缺薪資範圍以 grade 關聯 grade_salary_levels 取得 — 由任務 1.5、2.9、2.10、6b.* 實作，驗收 jobs 表新增 grade 欄位並能經 API 查出範圍
- [x] 10.7 落實 Decision: 面試頁 Tab 命名 `全部 / 待面試 / 已評分` — 由任務 5.3 實作，驗收 UI 文字與 filter 範圍對應
- [x] 10.8 落實 Decision: SCSS 使用 L1 模組色 `$color-l1-sage` (#8DA399) — 由任務 4.10 實作，grep 無硬編碼色碼
- [x] 10.9 落實 Decision: 只讀模式透過 `canEdit()` + 區塊 `[class.locked]` 控制 — 由任務 4.8、5.4 實作，驗收狀態 ≥ pending_approval 時面試頁、決策頁皆鎖定

## 11. 實作後期精進（Post-Implementation Refinements, 2026-04-19）

- [x] 11.1 落實 Interview page lock deferred to decision submission — AI 智能面試頁鎖定時機延後：`isDecisionSubmitted` 從 `pending_decision+` 縮窄到 `pending_approval+`；HR 在 pending_decision 階段仍可修改評分與重跑 AI；驗證：狀態 pending_decision 時 scoring/AI 區塊仍可編輯、無「已鎖定」badge
- [x] 11.2 AI 智能面試列表過濾收斂：`filteredCandidates` 僅保留 `interview / pending_ai / pending_decision`；pending_approval 以後一律交決策頁；「已評分」tab 覆蓋 pending_ai + pending_decision；驗證：已 offered 的候選人不再出現於 AI 面試頁列表
- [x] 11.3 落實 Interview date filter on recruitment page — 面試日期篩選 UI：於 AI 智能面試頁 sidebar 狀態 tabs 下方新增日期篩選區塊；實作 `dateFilter` signal（all/today/3days/7days/custom）+ `customDate` + `getDateRange()` computed；HTML 含 `<input type="date">` + 四個快速 tabs；CSS 使用 `$color-l1-sage` active 態
- [x] 11.4 落實 Candidate list date column shows latest interview time（及 Candidate list endpoint preloads approval actor metadata 的 `latest_interview_at` 欄位）：後端 list 查詢新增 `(SELECT iv.interview_at ... ORDER BY iv.interview_at DESC LIMIT 1) as latest_interview_at`；前端 `interview.service.ts` / `decision.service.ts` 把 `interviewDate` 來源改為 `c.latest_interview_at || c.apply_date`；HTML 改用 `{{ interviewDate | date:'yyyy-MM-dd HH:mm' }}` 並加 `ri-calendar-line` icon
- [x] 11.5 落實 Decision page prefills form on rejected resubmit — 退回重送表單自動回填：後端 list 查詢新增 `decision_reason` / `decision_type` 子查詢；`Candidate` model 加 `decision_reason?: string | null` + `decision_type?: 'Offered' \| 'Rejected' \| null`；`selectCandidate()` 偵測 `status==='pending_decision' && approval_status==='REJECTED'` 時預填 `decisionValue` / `decisionReason` / `salaryType` / `salaryAmount`
- [x] 11.6 `<select>` 薪資類型綁定修正：從 `[value]="salaryType()"` 改為 `[ngModel]="salaryType()" (ngModelChange)="salaryType.set($event)"` 配合 `<option [ngValue]="50">`，避免 Angular 無法正確反映數字型 signal 至 DOM selected option
- [x] 11.7 落實 Decision result view shows approver and submitter identity（及 Candidate list endpoint preloads approval actor metadata 的 `approver_name` / `decided_by_name` 欄位）：後端 list 查詢新增 `approver_name` / `decided_by_name`（透過 `SELECT u.name FROM users u WHERE u.id = (SELECT ... approver_id/decided_by ...)`）；`Candidate` model 加對應欄位；決策結果視圖在「簽核時間」上方增加「送簽人員 / 簽核人員」兩行；簽核時間改用 `{{ approved_at | date:'yyyy-MM-dd HH:mm' }}`
- [x] 11.8 落實 Offer response link reloads after approval success — 簽核通過後 Offer 連結重載：`loadCandidates()` 完成後，若仍有 `selectedCandidateId`，用刷新後的候選人物件重新呼叫 `selectCandidate()` 觸發 offer response link 的重新載入；驗證：主管按「簽核通過」後不需切換候選人即可看到 Offer 回覆連結區塊
- [x] 11.9 落實 Scoring modal readOnly mode locks label wrappers — 評分表 Modal readOnly 模式雙重鎖定：SCSS `.scoring-modal--readonly` 的 `pointer-events: none` 擴及 `.checklist-item / .radio-option / .recommendation-option` 三個 label 容器；TS 的 `setScoringLevel / toggleChecklist / setAssessmentValue / setAssessmentOther / setRecommendation` 全部加 `if (this.readOnly()) return;` 守衛；未選項目 opacity 0.45 以突顯已選狀態
- [x] 11.10 決策頁 UI/外框樣式對齊 AI 智能面試：`.main-content` 加 `padding: $spacing-lg` + `padding-top: header-height + 20px`；`.content-container` max-width 1600px 無 padding；`.decision-layout` 加 `min-height`；`.candidate-sidebar` 加 `position: sticky`；`.empty-state` 對齊 recruitment-page 的 `@include card` + `min-height: 500px` + 80px muted icon 版本
- [x] 11.11 AI 量化分析面板底色與結構對齊：四個 panel 底色從 `$color-soft-gray` 改為 `$color-cloud-gray`；`.keyword-match-item` 由 grid + border-left 改為 flex layout；`.insight-item` 移除左側 border，改用 icon 顏色區分 strength/concern；radar chart 資料路徑從錯誤的 `ai.skillScores` 修正為 `ai.keywordAnalysis.dimensionBreakdown`
- [x] 11.12 更新 spec artifacts：proposal.md 新增「Post-Implementation Refinements」段落；tasks.md 新增「11. 實作後期精進」章節；`decision-approval-workflow/spec.md` 與 `interview-decision-page/spec.md` 同步新增/調整對應 requirements 與 scenarios
