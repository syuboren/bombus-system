## Context

`/settings/users` 路由（系統設定 → 租戶管理 → 員工與帳號管理）目前載入 `EmployeeManagementPageComponent`（位於 `src/app/features/organization/pages/employee-management-page/`）。該頁已支援員工列表 (`viewMode = 'list'` / `'card'`)、建檔、批次匯入、開啟「帳號與權限」modal（共用 `AccountPermissionComponent`，提供角色指派、停啟用、改密碼、有效權限總覽）。

**痛點**：HR 想看「全公司哪些人有總公司權限」、「業務部所有人是否都已指派員工角色」時，必須逐筆點員工開 modal 才能看到。對 50–500 人中型企業而言，這會花費大量時間，且無法快速比對。

**現況技術摘要**：
- 後端 API 已備齊：`GET /api/tenant-admin/users`、`GET /api/tenant-admin/roles`、`GET /api/tenant-admin/users/:id/roles`
- 前端共用元件 `AccountPermissionComponent` 已涵蓋單員工視角的所有需求
- 兩個孤兒元件 `permission-visualization-page`、`user-management-page` 寫好但未掛載任何路由與 sidebar，是死碼
- `ViewToggleComponent` 目前只支援 `'card' | 'list'` 兩模式
- `@angular/cdk` 尚未安裝（無 Virtual Scroll 套件）
- spec `user-overview-lite` 描述的「精簡頁、不含詳細角色管理」與實際路由載入完整 HR hub 的事實不符

**利害關係人**：
- 系統管理員 / HR 主管：主要使用者，看全員工權限分布做稽核與盤點
- 部門主管：可選使用者，看自己部門員工的角色狀況
- 內控/法遵：未來透過匯出 CSV 留存稽核記錄

## Goals / Non-Goals

**Goals:**

- 在不改變既有路由與既有元件職責的前提下，於 `/settings/users` 內加入「角色矩陣」第三種視圖
- 矩陣視圖支援 200+ 員工流暢渲染（虛擬捲動），中型企業 500 人為效能設計上限
- 點員工列維持「開既有 `AccountPermissionComponent` modal」的下鑽路徑（單一真理）
- 反向視角（角色欄頭 → 持有者列表）僅作為 popover，不與既有功能重疊
- 員工視角 CSV 匯出與 D-04（角色視角匯出 + HTML 格式）共用未來統整的 `role-export.service.js`，但本次只實作員工視角 CSV 簡版
- 清理孤兒元件，避免文件/搜尋誤導未來開發者
- spec `user-overview-lite` 與實際代碼收斂為單一真理

**Non-Goals:**

- 不在矩陣視圖上做角色指派/撤除（避免雙入口同步問題；統一從 modal 進）
- 不做 row-level 權限可視化（屬 D-02 範疇）
- 不做角色視角匯出、HTML/PDF 格式（屬 D-04 範疇）
- 不改變 `EmployeeManagementPageComponent` 的元件名稱、檔案位置、現有路由
- 不改造 sidebar 結構或選單 label
- 不引入新後端 API（僅前端聚合）

## Decisions

### Decision 1: View toggle 從兩模式擴充為三模式（card / list / matrix）

**選項**:
- A. 擴充 `ViewToggleComponent` 支援 `'card' | 'list' | 'matrix'`，icon 用 `ri-grid-fill` 或 `ri-table-fill`
- B. 在 `EmployeeManagementPageComponent` 內**並列**兩個 toggle：原有 card/list 一個，矩陣切換一個
- C. 完全在頁面內 inline 三按鈕 toggle，不複用元件

**選擇**: **A**

**理由**:
- 視覺上單一 toggle 控制所有視圖最直觀；多 toggle 易混淆（card/list 與 matrix 是同一抽象層級）
- `ViewToggleComponent` 目前是 `@Input/@Output` 寫法（舊式），本次趁機改為 `input()/output()` Signal API，符合專案規範
- 影響面：4 個既有使用點（job-description、framework、course-management、employee-management）只需確認 type 仍相容；矩陣 icon 為新增模式，不會回打到既有用例
- 切換邏輯由各頁自己處理（`viewMode` signal），元件本身只負責 emit

**取捨**: 修改共用元件需波及四個既有頁，但只是 typing 擴充（向下相容），相比方案 B/C 維護價值更高

### Decision 2: 使用 `@angular/cdk/scrolling` 的 `cdk-virtual-scroll-viewport`

**選項**:
- A. 安裝 `@angular/cdk` 並使用 `cdk-virtual-scroll-viewport`（標準 Angular 方案）
- B. 自製 IntersectionObserver-based 虛擬列表
- C. 不做虛擬捲動，靠 CSS `content-visibility: auto` + 分頁

**選擇**: **A**

**理由**:
- CDK 是 Angular 官方 18.2 相容、API 穩定；500 人 × 20 角色 = 10,000 cells 不做虛擬化會卡頓
- 自製虛擬列表（B）是不必要的輪子；`content-visibility`（C）對 cross-row 對齊與 sticky header 支援差
- 加裝 `@angular/cdk@^18.2.0` 是輕量依賴（單一 peer dependency 已具備）

**取捨**: 增加一個 npm 依賴，但這是專案後續其他大列表（人才庫、稽核日誌）也會受惠的基礎設施

### Decision 3: 矩陣資料聚合策略 — 單次 GET /users?all=true

**選項**:
- A. **單次 fetch**：`GET /api/tenant-admin/users?all=true` — 該 API 已內嵌 `roles` 陣列（每個 user 含 role_id/role_name/scope_type/scope_id/scope_name），全租戶員工 × 角色一次拿齊
- B. forkJoin 對每員工 N 次：`GET /users` + N 個 `GET /users/:id/roles`
- C. 新增聚合 API `/users/role-matrix`

**選擇**: **A**（搭配前端 signal cache）

**理由**:
- **預飛檢查發現**：`GET /api/tenant-admin/users` 已 JOIN `user_roles` 並嵌入完整 roles 陣列（見 `server/src/routes/tenant-admin.js:612-637`）；不需要每員工再發請求
- 既有 API 唯一缺陷是預設 `limit=20` 分頁；採方案 B `?all=true` 跳過 LIMIT/OFFSET 是最小改動（後端加一個 if branch）
- 500 員工單次 payload 預估 < 200KB（gzip 壓縮後 < 50KB），首載 < 1 秒
- 完全避免方案 B 的 N+1 query 模式與方案 C 的新 API 設計成本
- 矩陣切換一次後存入 signal cache，後續切換不再重發

**取捨**: 修改既有 `/users` 端點需把 `?all=true` 行為加 audit 註記避免誤用（payload 大小可能影響稽核）；前端只在 `viewMode === 'matrix'` 才送 `?all=true`，列表/卡片仍用既有分頁

### Decision 0: API 與 Type 對齊（前置必做）

**背景**: 預飛檢查發現現有 API 與前端型別有四項不一致，必須在 Task Group 1 開工前先處理，否則矩陣視圖、CSV 匯出、部門樹篩選都會直接踩坑。

**四項對齊**（合成單一決策以利追蹤）:

1. **`GET /api/tenant-admin/users` 加 `?all=true`** — 跳過 `LIMIT/OFFSET` 全量回傳；保留既有 pagination 預設行為（`?all` 缺省時不變），前端僅 matrix 視圖傳此參數
2. **API SQL 加 select `e.employee_no`** — CSV 匯出第一欄需要員工編號，目前 SELECT 沒選；同步在 `TenantUser` interface 加 `employee_no?: string | null`
3. **修正 `TenantUser.is_active: number` → `status: 'active' | 'inactive' | 'locked'`** — 現有 interface 與後端實際回傳的 status 字串不一致；既有死碼 `user-management-page` 用 `is_active === 1` 判斷，永遠不成立（會在孤兒清理時一併刪除）；其他可能引用點需 grep 同步修正
4. **API SQL 加 select `e.org_unit_id`** — 部門樹狀篩選需用 ID 做樹形包含判斷（包含子節點），不可用字串 `e.department` 比對；同步在 `TenantUser` interface 加 `org_unit_id?: string | null`

**選擇**: **以 Task Group 0 形式集中處理**，作為其他所有任務的前置 dependency。

**理由**:
- 四項都是必做且彼此鬆耦合，但都是 Task Group 1+ 的隱含 prerequisite
- 集中為 Group 0 比散落各 Group 更容易做端到端驗證（一次 build + smoke test）
- TS 型別修正涉及 grep 多處引用，獨立 group 才不會卡住矩陣主線開發

**影響面**:
- 後端：`server/src/routes/tenant-admin.js` GET /users（SQL select + ?all=true 分支）
- 前端 model：`src/app/features/tenant-admin/models/tenant-admin.model.ts`（`TenantUser` interface 三欄變更）
- 前端 service：`src/app/features/tenant-admin/services/tenant-admin.service.ts`（`getUsers(options?: { all?: boolean })` 簽名擴充）
- 引用點 grep：`is_active` 全 src 搜尋並修正或刪除

**取捨**: Group 0 增加 ~5 個前置任務，但避免後續 Group 3、5、7 反覆碰 API/型別問題

### Decision 4: 矩陣 cell 顯示策略 — 「●符號 + 完整 scope 分類標籤」+ 取最廣 scope

**選項**:
- A. 「●」+ scope 1 字縮寫（全/子/部）+ tooltip 補完整名稱
- B. 純色塊（不同顏色代表不同 scope）
- C. 「●」+ **完整 scope 分類標籤**（全集團/子公司/部門）+ tooltip 補實際 scope_name 或多 scope 詳情
- D. 多 chip 顯示所有指派的具體 scope_name（如「● 台北 ● 高雄」）

**選擇**: **C**（取最廣 scope 單一 chip + 完整中文分類 + tooltip 補細節）

**理由（從用戶回饋多輪迭代而成）**:

1. **完整中文分類取代縮寫**（C 勝過 A）
   - 縮寫「全/子/部」對非熟用者不夠直覺；客戶實測時看不懂
   - 欄寬調至 176px 後可容納「子公司 +1」最寬情境，密度仍可接受
2. **取最廣 scope 而非列出所有指派**（C 勝過 D）
   - 後端權限合併邏輯本就是「取最廣值」（`account-permission.component.ts` 的 `loadMergedPerms()` 對 perm 取 max）；矩陣 cell 反映 effective 權限結果是更誠實的呈現
   - 列出所有具體 scope（D）會把 cell 變很長且資訊重複；實際具體 scope 由 tooltip / modal 提供
3. **避開 B（純色）的 A11y 問題**
   - 莫蘭迪色系飽和度低差異不明；色盲不友善
4. **global / group 視覺合併為「全集團」**
   - 在單集團租戶下兩者權限等價（permission middleware 也不區分）
   - 用「全集團」而非「全公司」避免與功能權限的編輯範圍 (`perm_scope='company'` → 「全公司」) 名詞衝突
5. **tooltip 完整列出所有 scope**
   - 即使 cell 只顯示最廣分類，hover 仍可看到「全集團 · TEST」這種詳細指派細節以利稽核

**最終呈現規則**:
- 三類分類 chip：`全集團 / 子公司 / 部門`（按廣度排序：global, group > subsidiary > department）
- 多筆指派 → 取最廣那筆 scope 作為 chip
- Tooltip → 列出所有指派的 scope_name（global/group 統一顯示「全集團」），多筆以「 · 」連接
- cell 沒有顯示具體 scope_name；想看哪一個分公司/部門 → tooltip 或開 modal

**取捨**:
- 取最廣 scope 的 chip 失去「在 N 個分公司被指派」的鳥瞰感 → 由 tooltip 補
- 欄寬 176px 對 1280px 以上螢幕適中；< 1024px 自動切回列表視圖

### Decision 5: 角色欄頭點擊行為 — popover 純檢視

**選項**:
- A. 角色欄頭點擊 → 顯示 popover（彈出小卡）列出持有者
- B. 點擊 → 跳轉「角色管理頁」對應角色（既有頁面）
- C. 點擊 → 開啟 modal 顯示完整角色詳細 + 持有者列表

**選擇**: **A**

**理由**:
- 不打斷當前矩陣視圖的脈絡（保留篩選狀態）
- 既有「角色管理頁」職責是設定，不是「看持有者」；跳過去反而增加認知負擔
- popover 適合輕量資訊（持有者姓名 + scope 標籤），無需 modal 全螢幕
- 點 popover 中員工姓名 → 直接開既有 `AccountPermissionComponent` modal（連動）

### Decision 6: CSV 匯出格式 — 員工視角扁平化

**選項**:
- A. 員工視角扁平：每行一個員工 × 角色組合（員工有 N 個角色 = N 行）
- B. 員工視角寬表：每行一個員工，每個角色一個欄位（值為 scope 或空）
- C. JSON 結構化匯出

**選擇**: **A**

**理由**:
- 扁平 (long format) 易於 Excel 樞紐分析、再分組、再篩選
- 寬表 (wide format) 在角色數變動時欄位不穩，難以版本比較
- JSON 不利非工程使用者
- 欄位：員工編號、姓名、Email、所屬部門、角色名稱、scope_type、scope_name、帳號狀態、匯出時間

**取捨**: 同一員工有多角色時行數膨脹，需在第一欄加重複員工編號；可用 Excel「分組」功能重組

### Decision 7: 孤兒元件清理範圍 — 完整刪除 + 搜尋無殘留

**選項**:
- A. 完全刪除（含資料夾、SCSS、TS、HTML）
- B. 註解但保留（加 `@deprecated`）
- C. 移到 `_deprecated/` 資料夾

**選擇**: **A**

**理由**:
- 兩個元件確認**未掛任何路由、未在 sidebar、未被其他元件 import**（已 grep 確認）
- 留著只會在搜尋結果中誤導開發者（「為什麼有兩個帳號管理頁？」）
- 專案規則「禁止汙染根目錄、單一真理來源」要求徹底
- Git 歷史保留可追溯性，無需另存資料夾

**取捨**: 完全刪除後若日後有新需求需要孤兒中的某段邏輯，要從 git log 撈；但機率極低（兩元件功能都已被 `AccountPermissionComponent` modal 涵蓋）

### Decision 8: spec `user-overview-lite` 修改方式 — 修改現有 spec，不新建

**選項**:
- A. 修改 `user-overview-lite/spec.md`，把「精簡頁不含角色管理」改為描述新雙視圖行為
- B. 廢棄 `user-overview-lite`，新建 `employee-account-management` spec
- C. 新建 `employee-role-matrix` spec，與 `user-overview-lite` 並存

**選擇**: **A**

**理由**:
- spec 名稱 `user-overview-lite` 描述的就是 `/settings/users` 這個頁，職責一致
- 廢棄重建（B）會破壞 trace 連結（多個 spec 引用過它）
- 並存（C）會造成 `/settings/users` 一頁有兩個 spec，違反「單一真理」
- 修改 Purpose + 新增矩陣需求 + 移除「不含角色管理」限制，是最小破壞

**取捨**: spec 名稱 `user-overview-lite` 與「lite」字面不再吻合，但改名比修內容代價更高（trace、PR 標題、引用鏈）；接受名稱與內容稍有不協調，未來若需要可獨立 rename change

### Decision 9: 矩陣容器元件獨立或 inline 在主頁

**選項**:
- A. 獨立 `EmployeeRoleMatrixComponent`（standalone 子元件）
- B. inline 在 `EmployeeManagementPageComponent` 模板中

**選擇**: **A**

**理由**:
- `EmployeeManagementPageComponent` 已 488 行 ts + 380 行 html，再加矩陣會超過維護單檔合理上限
- 矩陣有獨立的 Virtual Scroll、欄頭 popover、cell 互動，邏輯封裝後更易測試
- 主頁傳入 `users`、`roles`、`userRoles` 三個 input，emit `(employeeClick)` 給主頁開 modal

**取捨**: 多一個元件檔；但符合 Angular 18 常見元件粒度

## Risks / Trade-offs

- **[Risk] 500 員工 × 20 角色聚合首載慢（5–8 秒）** → 顯示骨架屏 + 進度條；未來必要時升級為後端聚合 API（D-04 一併處理）
- **[Risk] `ViewToggleComponent` 改為 Signal API 影響既有 4 個使用頁** → tasks 中明列回歸測試這 4 頁（job-description、framework、course-management、employee-management）；行為不變只是 typing 擴充
- **[Risk] CDK Virtual Scroll 對 sticky header 支援有限** → 第一行（角色欄頭）使用 `position: sticky; top: 0`，與 viewport 互動需測試（已知 CDK 文件有範例）
- **[Risk] 删除孤兒元件後若日後需要其中某段邏輯** → 仰賴 git log 撈回；機率極低（功能已被 modal 覆蓋）
- **[Risk] 角色與員工資料不一致時矩陣顯示錯誤（如員工有 role_id 但角色已被刪）** → 加 defensive 過濾：聚合時若 `role_id` 不在 roles 列表中跳過該指派並記 console.warn
- **[Risk] 1024px 以下螢幕矩陣不可用** → < 1024px 強制切到 list 視圖並顯示 toast「此尺寸建議使用列表」；不阻擋使用其他功能
- **[Trade-off] 不做後端聚合** → 首載稍慢，但避免新 API 設計成本；可接受
- **[Trade-off] 矩陣不能直接編輯** → 用戶需多一步開 modal，但避免雙編輯入口的同步問題；統一從 modal 進
- **[已知限制] Scope 為 metadata-only（不影響實際權限判斷）** → 後端 `middleware/permission.js:93-105` 的權限檢查 SQL 雖然 SELECT 了 `r.scope_type` 與 `ur.org_unit_id`，但實際 `hasPermission` 比對只看 `(resource, action)`，完全忽略 scope。也就是說：
  - 同一角色不論指派為「全集團」或「特定子公司/部門」，使用者實際取得的權限**完全相同**（聯集所有 user_roles 的 role_permissions）
  - 矩陣 cell 顯示的「● 全集團 / 子公司 / 部門」反映的是 `user_roles.org_unit_id` 寫入紀錄，不是真實權限邊界
  - 角色定義的 `scope_type` 目前僅作前端 UI hint：控制指派 dropdown 可選的 scope 選項；後端 API 也未驗證指派 scope 是否符合角色定義
  - 客戶端可見 UI 不暴露此限制（不在矩陣加說明 icon），避免引發疑慮；面向 admin 的角色編輯 modal 描述已調整為「（僅控制指派時的可選範圍）」較中性的措辭
  - **後續處理**：屬 D-02（三層權限控管）範疇 — 真正落實 row-level / scope-bound 權限時，須擴充 middleware 加入 scope 比對。本變更不修 middleware，避免擾動既有功能

## Migration Plan

1. **資料相容**: 無 schema 變更，無需資料遷移
2. **部署順序**:
   - 第一步：合併本變更（前端純新增 + 移除孤兒）
   - 第二步：開發環境 smoke test 200 員工矩陣首載與 Virtual Scroll
   - 第三步：staging 驗證 4 個既有 ViewToggle 使用頁無回歸
   - 第四步：prod 部署（GitHub Pages）
3. **回滾策略**:
   - 矩陣有問題：`viewMode` 預設仍為 `'list'`，使用者不切換就完全不受影響；回滾僅需 revert PR
   - `ViewToggleComponent` 改 Signal API 有問題：可單獨 revert 該檔案，矩陣容器仍可運作（自帶 toggle）
4. **使用者通知**: HR 主管社群公告新功能位置（`/settings/users` → 切換視圖按鈕）

## Open Questions

1. **匯出是否需要 audit log？** D-04 將整合，本變更可暫時直接前端產 CSV（不經後端 = 不需 audit log）；待 D-04 上線後改走後端統一記錄
2. **矩陣是否要顯示「無角色」的員工？** 預設顯示（行內全空白）以利稽核盤點；若 HR 反映干擾，加篩選 toggle「只看有角色員工」
3. **角色欄順序如何排序？** 預設：系統角色（5 個）依固定順序在前，自訂角色按建立時間在後；可加欄頭點擊排序（屬未來增強，本變更不做）
