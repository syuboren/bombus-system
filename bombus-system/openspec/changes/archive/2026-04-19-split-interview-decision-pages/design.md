## Context

現況 `/employee/recruitment`（AI 智能面試）單頁包含：
1. 候選人列表（Tab：全部 / 待面試 / 面試後）
2. 面試評分與紀錄（錄音錄影上傳 + 17 題倒扣制評分表）
3. AI 量化分析（關鍵字/語意/雷達/綜合評分）
4. 錄用決策（Offered / Rejected + 決策理由 + Offer 回覆連結）

問題：
- 角色混淆：面試官關心 ①②③；人資關心 ①③④ + 職缺詳情與薪資
- 資訊敏感：面試官也能看到錄用決定與 Offer 連結，違反 D-12 分權要求
- 缺薪資核定欄位（D-13）與主管簽核（D-15）

權限架構：既有 `feature_definitions` + `role_feature_permissions` 表，透過 `FeatureGateService.canEdit(featureId)` 檢查。現有角色：super_admin、subsidiary_admin、hr_manager、dept_manager、employee。L1.recruitment 目前 hr_manager 僅 `view/company`（因擔心誤觸決策）——拆分後可放寬為 `edit/company`。

候選人狀態現有 11 種；此版在 `pending_decision` 與 `offered` 之間插入 `pending_approval`，狀態機擴充為 12 種。

## Goals / Non-Goals

**Goals:**

- 拆分 AI 智能面試頁與新建面試決策頁，兩頁共用候選人資料但動線獨立
- 新增 `L1.decision` feature，透過 RBAC 精細控管決策頁可見性
- 提供薪資核定欄位，附職缺範圍比對與軟性警告
- 引入 HR → subsidiary_admin 一層簽核機制，可無限次退回重送
- 簽核通過才觸發入職流程（與 `employee-onboarding-automation` 銜接）

**Non-Goals:**

- 不建立用人主管（hiring_manager）簽核路徑（需先擴充 jobs 表）
- 不支援多層簽核
- 不自動產生 offer letter PDF
- 不修改 17 題評分表內容/計分
- 不處理 D-09 其他審核流程情境（另案）

## Decisions

### Decision: 以獨立路由與頁面實現面試決策頁

選擇新增 `/employee/decision` 路由與獨立 Component，而非在 `/employee/recruitment` 內加 Tab。

**Rationale:**
- RBAC 可用 Route Guard 整頁守護，比區塊級 `@if` 隱藏更可靠
- 職責單一：面試頁只處理面試流程、決策頁只處理錄用決策
- 側邊欄可用 `FeatureGateService` 自動過濾，無權角色看不到選單項目
- 未來擴充（如職缺候選人比較）有空間

**Alternatives considered:**
- 同頁加 Tab：權限控制靠區塊隱藏，容易漏檢；違背使用者「分開」的語意
- 同頁雙模式切換：頂部 toggle + sidebar 內容切換，仍是同頁，問題同上

### Decision: 面試頁「評分儲存」為轉手時機

候選人狀態從 `interview` → `pending_ai`（評分儲存時）→ `pending_decision`（AI 分析儲存時）。決策頁只顯示 `pending_decision` 及其後狀態。

**Rationale:**
- 評分儲存 = 面試官工作完成，邊界清楚
- AI 分析屬於「決策輔助資訊」，邏輯上歸屬面試產出，但觸發點在面試頁（面試官知道何時該分析）
- 不需新增「送交決策」按鈕，減少操作步驟

**Alternatives considered:**
- AI 分析完成為界：面試頁少一個 Tab（已評分 / 待 AI），較囉唆
- 明確按「送交決策」：多一步操作，且面試官可能忘記按

### Decision: AI 量化分析僅在面試頁觸發

面試頁保留「開始 AI 分析 / 重新分析」按鈕；決策頁僅讀取 `candidates.ai_analysis_result` 欄位。

**Rationale:**
- 避免同候選人被多次重跑產生結果不一致
- 避免人資與面試官對分析結果解讀不同時互相覆蓋
- 面試官較熟悉候選人背景，較適合判斷何時跑分析（例如：補充面試紀錄後重跑）

**Alternatives considered:**
- 兩邊都能觸發：會有 race condition 與結果漂移風險
- 只有決策頁能觸發：分析要等人資介入才跑，阻塞決策時程

### Decision: 薪資核定採「方案 2」範圍提示 + 超範圍警告

UI：`薪資類型（下拉：月薪/年薪）` + `核定金額（number input）`；超出 `job.salaryLow~salaryHigh` 時顯示黃色警告但仍可送出。DB 記錄 `approved_salary_out_of_range` flag 供 audit。

**Rationale:**
- 實務上常有「爭取/特例/挖角」超出範圍狀況
- 硬擋會讓人資繞過系統記錄，失去 audit
- 顯示範圍 + 警告既保護又留彈性
- `out_of_range` flag 可日後做稽核報表或簽核加嚴

**Alternatives considered:**
- 自由輸入無提示：資訊不足，容易誤打
- 強制範圍內：違反實務彈性

### Decision: 簽核採 β 方案（subsidiary_admin 簽核）

狀態流：`pending_decision` → (HR submit) → `pending_approval` → (subsidiary_admin approve) → `offered` | (subsidiary_admin reject) → `pending_decision`。

退回可無限次輪迴，每次退回需填 `approval_note`。

**Rationale:**
- jobs 表無 `hiring_manager_id`，做用人主管簽核需先擴充 schema
- subsidiary_admin 天然有子公司統籌視角，適合最後把關
- 符合 Bombus 既有 RBAC 層級（subsidiary_admin > hr_manager）
- 未來擴充 α 方案（用人主管）時，簽核流程本身不變，只換簽核人定位邏輯

**Alternatives considered:**
- α 用人主管：需先擴 jobs 表，工程量翻倍
- γ 職缺部門主管：需動態查部門 dept_manager，多租戶下邏輯複雜
- δ 自訂簽核人：建職缺時要選人，UI 要改職缺管理頁

### Decision: 簽核欄位併入 invitation_decisions，薪資欄位加於 candidates

簽核 5 欄（approval_status / approver_id / approved_at / approval_note / submitted_for_approval_at）加到既有 `invitation_decisions` 表；薪資核定 3 欄（approved_salary_type / approved_salary_amount / approved_salary_out_of_range）加到 `candidates` 表。

**Rationale:**
- `invitation_decisions` 已存在且語意就是「決策事件」，簽核屬於決策事件的延伸（提交 → 審核 → 通過/退回）
- 將簽核欄位放決策事件表，可自然支援未來多次決策（例如退回後重新提交產生新 invitation_decisions row）
- 薪資核定結果是候選人層級的最終屬性（Offer 內容），放 candidates 方便入職流程取用

**Alternatives considered:**
- 全部加到 candidates：職責分散，候選人表過度膨脹
- 建新 `candidate_approvals` 子表：與既有 invitation_decisions 疊床架屋
- 簽核與薪資都放 invitation_decisions：入職流程要 JOIN 取薪資，增加查詢成本

### Decision: 職缺薪資範圍以 grade 關聯 grade_salary_levels 取得

`jobs` 表新增 `grade INTEGER REFERENCES grade_levels(grade)` 欄位；職缺詳情的薪資範圍由 `SELECT MIN(salary), MAX(salary) FROM grade_salary_levels WHERE grade = ? AND (org_unit_id = ? OR org_unit_id IS NULL)` 計算；職等名稱 JOIN `grade_levels` 取 `title_management/title_professional` 依職缺屬性決定。

**Rationale:**
- `jobs` 表目前完全沒有 salary 欄位，104 回傳資料存在 `job104_data` JSON blob，內部職缺則無
- Bombus 已有 `grade_levels` 與 `grade_salary_levels` 的薪等制度，與 L2 職等管理模組一致
- 以 grade 關聯有助於子公司間薪資結構獨立（grade_salary_levels 已支援 org_unit_id 隔離）
- 職缺管理頁面加 grade 選單後，職務與薪資治理自動對齊

**Alternatives considered:**
- A. 從 `job104_data` JSON blob 解析：僅 104 來源有資料，內部職缺無薪資範圍，警告會部分失效
- B. jobs 表獨立新增 salary_low/high/type 欄位：與 grade_salary_levels 重複，職等調整時需雙寫

### Decision: 面試頁 Tab 命名 `全部 / 待面試 / 已評分`

原「面試後」改名為「已評分」，範圍縮窄為 `pending_ai` 以後的所有狀態（已決策候選人仍可見，只讀模式）。

**Rationale:**
- 「面試後」語意模糊；「已評分」對應面試官動作
- 決策頁有獨立 Tab 看後續狀態（待決策/已決策），不需面試頁重複切分
- 已決策候選人保留在面試頁有助面試官回顧自己的評分

### Decision: SCSS 使用 L1 模組色 `$color-l1-sage` (#8DA399)

決策頁延續 L1 員工管理模組識別色，使用 `@include card`、`@include filter-bar($color-l1-sage)`、`@include status-badge`、`@include button-module($color-l1-sage)` mixins。

**Rationale:**
- 兩頁屬同模組，顏色一致強化識別
- 符合既有設計系統，不需新增變數

### Decision: 只讀模式透過 `canEdit()` + 區塊 `[class.locked]` 控制

決策頁 HR 以上角色 `canEdit = true`；簽核中/已通過時整頁 `locked` class 禁用輸入。面試頁在候選人狀態 ≥ `pending_decision` 時切入只讀。

**Rationale:**
- 沿用面試頁既有 `isDecisionSubmitted` computed 模式
- 單一 computed signal 控制，比散落的 `disabled` 屬性好維護

## Risks / Trade-offs

**[Risk] 雙遷移清單漏同步** → `tenant-schema.js:initTenantSchema()` 與 `tenant-db-manager.js:_runMigrations()` 兩個 migration 清單都要加 `0003_add_decision_fields`，並手動於多租戶環境驗證新舊租戶皆通過（專案已知陷阱）。

**[Risk] 既有「待決策」候選人 migration 後狀態不一致** → migration 只新增欄位，不改既有狀態。既有 `pending_decision` 候選人維持該狀態；人資進決策頁正常處理，首次送出即進入新簽核流程。

**[Risk] 面試頁狀態切只讀時，已儲存的媒體/評分被誤顯示為可編輯** → 統一用 `isDecisionSubmitted` → 改名為 `isReadOnly` computed，覆蓋所有需要 disable 的按鈕；元件層面 `canEdit() && !isReadOnly()` 雙重守門。

**[Risk] 簽核無限輪迴可能被濫用** → 非技術風險，但可於未來加「最多退回 N 次」policy。本版預留 `approval_note` 欄位可供 audit report，若出現濫用可從資料層面觀察。

**[Risk] 超範圍薪資警告被人資忽略** → 記錄 `approved_salary_out_of_range=1` flag，未來稽核報表可撈取；主管簽核時應可見該 flag（決策頁「送交簽核」段顯示警告摘要）。

**[Risk] dept_manager 完全看不到決策結果** → 部門主管若需知道自家部門誰被錄取，目前只能靠 `L1.onboarding`（入職管理）間接看到。本版接受此取捨，未來若反饋強烈可加 β 權限至 `view/department`。

**[Risk] 拆頁可能破壞面試官既有操作習慣** → 面試頁上方增加 hint「候選人已完成評分，決策流程已轉交至面試決策頁」並提供連結（若有權限）。

**[Trade-off] 候選人 sidebar 分別顯示於兩頁** → 查看跨頁統計時要切兩頁，但資訊清晰度勝於整合成本。

**[Trade-off] 不做用人主管簽核** → 節省工程，但主管不主動介入招募決策可能有疑慮；留為下一階段擴充（`hiring_manager_id` 欄位 + 簽核人定位策略）。
