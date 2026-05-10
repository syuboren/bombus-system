# Admin Portal — 管理後台

## Purpose

定義 Bombus 的平台管理後台與租戶自助管理入口，包含平台管理員的租戶/方案管理介面，以及租戶管理員的組織架構、角色權限、使用者管理介面。

## Requirements

### Requirement: 平台管理後台入口
系統 SHALL 提供獨立的平台管理後台（路由 `/platform`），僅限平台管理員存取。

#### Scenario: 平台管理員存取後台
- **WHEN** 已登入的平台管理員存取 `/platform`
- **THEN** 系統顯示平台管理後台，包含租戶列表、方案管理等功能

#### Scenario: 非平台管理員被拒絕
- **WHEN** 一般租戶使用者嘗試存取 `/platform`
- **THEN** 系統攔截並導向登入頁面或顯示無權限提示

---
### Requirement: 租戶管理介面
平台管理後台 SHALL 提供租戶管理介面，包含租戶列表、新增、編輯、暫停、退租等操作。

#### Scenario: 租戶列表頁面
- **WHEN** 平台管理員進入租戶管理頁面
- **THEN** 系統以表格顯示所有租戶，包含名稱、slug、狀態、方案、建立日期，支援搜尋與狀態篩選

#### Scenario: 新增租戶表單
- **WHEN** 平台管理員點擊「新增租戶」
- **THEN** 系統顯示表單，包含：租戶名稱、slug、選擇方案、初始管理員 email/密碼

#### Scenario: 編輯租戶資訊
- **WHEN** 平台管理員點擊租戶列表中的「編輯」
- **THEN** 系統顯示編輯表單，可修改名稱、方案、狀態

#### Scenario: 軟刪除租戶
- **WHEN** 平台管理員對租戶執行退租
- **THEN** 租戶狀態設為 deleted（軟刪除），資料保留，使用者無法登入

#### Scenario: 恢復軟刪除的租戶
- **WHEN** 平台管理員對 deleted 租戶點擊「恢復」
- **THEN** 租戶狀態恢復為 active

---
### Requirement: 方案管理介面
平台管理後台 SHALL 提供訂閱方案管理介面。

#### Scenario: 方案列表
- **WHEN** 平台管理員進入方案管理頁面
- **THEN** 系統顯示所有方案，包含名稱、人數上限、子公司上限、功能限制

#### Scenario: 新增/編輯方案
- **WHEN** 平台管理員新增或編輯方案
- **THEN** 系統提供表單設定 name、max_users、max_subsidiaries、features

---
### Requirement: 租戶自助管理入口
系統 SHALL 提供租戶管理設定入口（路由 `/settings`），供租戶管理員（super_admin 或 subsidiary_admin）管理自己組織的設定。

#### Scenario: 租戶管理員存取設定
- **WHEN** 具有管理權限的使用者存取 `/settings`
- **THEN** 系統顯示租戶管理設定頁面，包含組織架構、角色權限、使用者管理

#### Scenario: 一般員工無法存取
- **WHEN** 僅有 employee 角色的使用者存取 `/settings`
- **THEN** 系統攔截並顯示無權限提示

---
### Requirement: 組織架構管理介面

租戶設定 SHALL 提供組織架構的視覺化編輯介面，與既有的組織管理模組（`features/organization/`）共用 Canvas/List 視圖模式，支援新增/編輯/刪除集團→子公司→部門的樹狀結構。

「新增部門」按鈕 SHALL 展開為三選項菜單：「自行新增」、「範本庫導入」、「批次匯入」。「自行新增」SHALL 沿用既有單筆表單流程；「範本庫導入」與「批次匯入」SHALL 啟動匯入工作流（詳見 `department-template-import` 規格）。

「新增子公司」按鈕 SHALL 維持單筆新增行為，不受本次變更影響。

#### Scenario: 顯示組織架構樹

- **WHEN** 管理員進入組織架構管理
- **THEN** 系統以可互動的樹狀圖顯示完整組織結構（來自 org_units 表），支援展開/收縮

#### Scenario: 新增子公司

- **WHEN** 管理員在集團節點下點擊「新增子公司」
- **THEN** 系統顯示表單輸入名稱，提交後在 org_units 表新增記錄，樹狀圖即時更新

#### Scenario: 新增部門按鈕展開三選項

- **WHEN** 管理員在公司節點下點擊「新增部門」按鈕
- **THEN** UI SHALL 顯示包含「自行新增」、「範本庫導入」、「批次匯入」三個選項的下拉或分割按鈕菜單

#### Scenario: 自行新增沿用既有行為

- **WHEN** 管理員選擇「自行新增」
- **THEN** 系統 SHALL 顯示既有的單筆部門表單，提交後呼叫 `POST /api/organization/departments`，與本次變更前的單筆建立流程完全一致

#### Scenario: 範本庫導入啟動匯入工作流

- **WHEN** 管理員選擇「範本庫導入」
- **THEN** 系統 SHALL 開啟 `import-from-template-modal`，引導使用者完成「選產業 → 選規模 → 勾選部門 → 選擇模式 → 預檢確認」流程

#### Scenario: 批次匯入啟動 CSV 上傳工作流

- **WHEN** 管理員選擇「批次匯入」
- **THEN** 系統 SHALL 開啟 `import-from-csv-modal`，引導使用者完成「上傳 CSV → 系統驗證 → 選擇模式 → 預檢確認」流程


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: 平台後台部門範本管理頁面

平台管理後台 SHALL 提供「部門範本管理」頁面（路由 `/platform/department-templates`），僅限平台管理員存取。頁面 SHALL 採「以產業為主視角」的雙層導覽結構：左側為產業列表（含獨立的「跨產業共通部門池」分頁入口），右側顯示選定產業的部門指派列表，包含每筆的 `applicable_sizes` 標籤與「編輯」按鈕。

「編輯」按鈕 SHALL 開啟統一彈窗（unified modal），可同時編輯該指派對應的「部門名稱」、「Value（最終產出價值）」與「適用規模」三項欄位，避免使用者為了改名稱／Value 還要跳到共通池分頁。當編輯標記為「共通」的範本時，彈窗 SHALL 顯示警示提醒「修改名稱與 Value 會同步影響其他使用此範本的產業；適用規模僅影響本產業」。

任何指派或共通範本變動（建立／納入／編輯／刪除）SHALL 觸發左側產業列表的 `assignment_count` 重新拉取，使數字即時反映實際狀態，無需手動重整。

頁面 SHALL 提供以下動作入口：

- 「新增該產業專屬部門」：建立新的 department_template 並自動建立指派
- 「從共通池納入」：從 `is_common=true` 的範本中挑選並設定該產業適用的 sizes
- 「編輯共通部門」（僅在共通池分頁出現）：開啟編輯彈窗修改名稱與 Value，套用至所有使用此範本的產業

#### Scenario: 平台管理員存取範本管理頁

- **WHEN** 已登入的平台管理員存取 `/platform/department-templates`
- **THEN** 系統 SHALL 顯示「部門範本管理」頁面，左側產業導覽列出所有 `is_active=true` 的產業（按 display_order 排序）並包含「共通部門池」分頁

#### Scenario: 進入產業頁顯示其指派列表

- **WHEN** 平台管理員點選「製造業」分頁
- **THEN** 系統 SHALL 顯示所有 `industry_dept_assignments` 中 `industry_code='manufacturing'` 的列，每筆顯示部門名稱、Value、適用 sizes 標籤，以及「編輯」（開啟統一彈窗）與「移除」按鈕

#### Scenario: 從共通池納入

- **WHEN** 平台管理員在「製造業」分頁點擊「從共通池納入」並挑選「人資部」
- **THEN** 系統 SHALL 顯示對話框讓管理員設定該指派的 sizes_json，提交後建立一筆 industry_dept_assignment(`manufacturing`, `人資部 template id`, `[...]`)

#### Scenario: 「編輯」按鈕開啟統一彈窗

- **WHEN** 平台管理員點擊某指派列的「編輯」按鈕
- **THEN** 系統 SHALL 開啟單一彈窗，內含「部門名稱」、「Value」、「適用規模」三組可編輯欄位；提交時 SHALL 先 PUT department_template 更新名稱與 Value，再 PUT industry_dept_assignment 更新 sizes_json；任一階段失敗 SHALL 顯示錯誤而不關閉彈窗

#### Scenario: 編輯共通範本顯示警示

- **WHEN** 平台管理員在某產業頁開啟標記為「共通」的列的編輯彈窗
- **THEN** 彈窗 SHALL 顯示警示文案「修改名稱與 Value 會同步影響其他使用此範本的產業；適用規模僅影響本產業」

#### Scenario: 指派變動即時刷新左側計數

- **WHEN** 平台管理員在某產業頁完成「新增指派」、「從共通池納入」、「移除指派」或「編輯」其中任一動作
- **THEN** 系統 SHALL 重新拉取 `GET /api/platform/industries?active=true` 更新左側產業列表的 `assignment_count`；此重整 SHALL NOT 觸發頁面 loading 遮罩，避免閃爍

#### Scenario: 非平台管理員無權存取

- **WHEN** 一般租戶使用者嘗試存取 `/platform/department-templates`
- **THEN** 系統 SHALL 攔截並導向登入頁面或顯示無權限提示


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: 平台後台產業類別維護頁面

平台管理後台 SHALL 提供「產業類別維護」頁面（路由 `/platform/industries`），僅限平台管理員存取。頁面 SHALL 顯示 `industries` 表的列表，欄位包含 code、name、display_order、is_active、tenant_count（使用此產業的租戶數）、assignment_count（指派至此產業的範本數）。

頁面 SHALL 支援以下操作：

- 新增產業：填寫 code（必填、kebab-case）、name、display_order
- 編輯產業：可改 name、display_order、is_active；不可改 code（避免 FK 失效）
- 刪除產業：當 tenant_count > 0 或 assignment_count > 0 時 SHALL 阻擋並顯示參照關係，引導改用「停用」（is_active=0）

#### Scenario: 平台管理員存取產業維護頁

- **WHEN** 已登入的平台管理員存取 `/platform/industries`
- **THEN** 系統 SHALL 顯示「產業類別維護」頁面，包含所有產業（按 display_order 排序），每列顯示 tenant_count 與 assignment_count

#### Scenario: 新增產業

- **WHEN** 平台管理員提交新增表單 `{ code: 'agriculture', name: '農業', display_order: 50 }`
- **THEN** 系統 SHALL 驗證 code 為 kebab-case 且未重複，於 industries 表新增列，回傳成功並重新整理列表

#### Scenario: 阻擋刪除使用中的產業

- **WHEN** 平台管理員嘗試刪除「製造業」（tenant_count=3、assignment_count=8）
- **THEN** 系統 SHALL 阻擋刪除並顯示對話框列出 3 個租戶名稱與 8 個指派部門名稱，建議改用「停用」操作

#### Scenario: 停用產業隱藏於新表單

- **WHEN** 平台管理員將「教育業」設為 is_active=0
- **THEN** 後續開啟「新增租戶」表單時，產業下拉清單 SHALL 不顯示「教育業」；既有 `industry='education'` 的租戶顯示不變


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: 新增/編輯租戶 industry 欄位改下拉選單

平台後台「新增租戶」與「編輯租戶」表單的 industry 欄位 SHALL 由 free-form 文字輸入改為下拉選單，選項來源為 `GET /api/platform/industries?active=true`。下拉顯示 `name`（中文），提交時送出 `code`。

新增租戶時 industry 欄位 SHALL 為選填——使用者可選擇「不指定」，後續再補填。

#### Scenario: 新增租戶下拉顯示中文產業名稱

- **WHEN** 平台管理員開啟「新增租戶」表單
- **THEN** industry 欄位 SHALL 為下拉選單，選項顯示「製造業」、「科技業」、「服務業」等中文名稱（按 display_order 排序），且包含「不指定」選項

#### Scenario: 編輯租戶顯示既有 industry

- **WHEN** 平台管理員開啟「編輯租戶」表單，租戶當前 industry='manufacturing'
- **THEN** 下拉選單 SHALL 預選顯示「製造業」；若 industry='other'，SHALL 預選「其他」


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: 產業類別排序使用上下箭頭按鈕

平台後台「產業類別維護」頁面 SHALL 提供以「上移」、「下移」icon button 為主的排序操作，取代直接編輯 `display_order` 數字欄位。新增產業表單 SHALL 不顯示「顯示順序」輸入欄——新建項目 SHALL 自動排在 `code='other'` 之前的最末位（值為非-other 列的 `max(display_order) + 10`）。

`code='other'` SHALL 視為固定錨點：其列上不顯示上下箭頭、且相鄰計算時 SHALL 被跳過。

後端 SHALL 提供 `POST /api/platform/industries/:code/move` 端點，接受 `{ direction: 'up' | 'down' }`，以 transaction 包裹相鄰列的 `display_order` 互換。當已位於頂端／底端而無相鄰可換時 SHALL 回傳 409 Conflict；嘗試移動 `'other'` 時 SHALL 回傳 400 Bad Request。

#### Scenario: 點擊下移交換相鄰列

- **WHEN** 平台管理員在某非-other 列點擊「下移」
- **THEN** 系統 SHALL 呼叫 `POST /api/platform/industries/:code/move` with `{ direction: 'down' }`，後端以 transaction 互換該列與下一列（跳過 `'other'`）的 `display_order`，列表重新拉取後該列下移一格

#### Scenario: 已位於頂端時上移回 409

- **WHEN** 平台管理員對最頂端的非-other 列點擊「上移」
- **THEN** 系統 SHALL 回傳 `409 Conflict`，訊息為「已位於最上方」；前端 SHALL disable 該列「上移」按鈕避免再次觸發

#### Scenario: 'other' 為固定錨點不可移動

- **WHEN** 平台管理員嘗試對 `code='other'` 的列觸發 move
- **THEN** 後端 SHALL 回傳 `400 Bad Request` 訊息「'other' 為固定錨點，無法移動」；前端 SHALL 在該列以「—」取代上下箭頭以避免使用者誤操作

#### Scenario: 新增產業自動排末（無 display_order 欄位）

- **WHEN** 平台管理員提交新增產業表單，僅填寫 `code` 與 `name`
- **THEN** 前端 SHALL 自動帶入 `display_order = max(display_order of non-other) + 10`，新項目落在 `'other'` 之前的最末位；表單 SHALL NOT 顯示「顯示順序」欄位


<!-- @trace
source: department-template-import
updated: 2026-05-10
code:
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/tasks.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/department-template-import/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/proposal.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/proposal.md
  - bombus-system/openspec/changes/employee-list-pagination/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/employee-list-pagination/spec.md
  - bombus-system/openspec/specs/industry-classification/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/employee-list-pagination/design.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/.openspec.yaml
  - bombus-system/openspec/specs/tenant-management/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/design.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/changes/archive/2026-05-10-employee-list-pagination/tasks.md
-->

---
### Requirement: 角色權限設定介面
The tenant settings SHALL provide a role management interface with role list, role CRUD, and a feature-based permission editor. The permission editor SHALL present features grouped by module (L1, L2, SYS) with collapsible sections. Each feature row SHALL use a progressive three-column layout: action level dropdown, edit scope dropdown (visible only when action_level = 'edit'), and view scope dropdown (visible when action_level = 'view' or 'edit'). This replaces the legacy resource × action checkbox matrix.

#### Scenario: 角色列表
- **WHEN** a tenant admin opens the role management page
- **THEN** the system SHALL display all roles as cards with role name, description, scope type, and the number of active feature permissions. System roles SHALL be marked as non-deletable.

#### Scenario: 編輯角色權限 — 漸進式三欄
- **WHEN** a tenant admin opens the role permission editor
- **THEN** the system SHALL display all features grouped by module, with each feature showing:
  - An action level dropdown (無權限 / 僅查看 / 可編輯)
  - An edit scope dropdown (自己 / 部門 / 公司) — visible only when action level is '可編輯'
  - A view scope dropdown (自己 / 部門 / 公司) — visible when action level is '僅查看' or '可編輯'

#### Scenario: 查看範圍自動校正
- **WHEN** a tenant admin sets edit_scope to 'department' and view_scope is currently 'self'
- **THEN** the system SHALL automatically upgrade view_scope to 'department' (view_scope must be >= edit_scope)

#### Scenario: 操作等級切換重設範圍
- **WHEN** a tenant admin changes action_level from 'edit' to 'view'
- **THEN** the system SHALL clear edit_scope (set to NULL) and preserve or reset view_scope
- **WHEN** a tenant admin changes action_level from 'view' to 'none'
- **THEN** the system SHALL clear both edit_scope and view_scope

#### Scenario: 模組分區可折疊
- **WHEN** a tenant admin clicks on a module section header (e.g., "L1 員工管理")
- **THEN** the section SHALL toggle between collapsed and expanded states, preserving unsaved changes

#### Scenario: 儲存角色權限
- **WHEN** a tenant admin clicks the save button after editing feature permissions
- **THEN** the system SHALL call `PUT /api/tenant-admin/roles/:id/feature-perms` with the complete permission set, and display a success notification upon completion

#### Scenario: 新增自訂角色
- **WHEN** a tenant admin creates a new role
- **THEN** the system SHALL provide a form for role name, scope_type, and the feature-based permission editor. All features SHALL default to `action_level = 'none'` (no permissions) until explicitly configured by the admin.

#### Scenario: 角色權限唯讀檢視
- **WHEN** a tenant admin views a role's permissions (read-only mode)
- **THEN** the system SHALL display the same feature-grouped layout but with all controls disabled, showing current permission values as text labels instead of dropdowns

---
### Requirement: 使用者管理介面

租戶設定 SHALL 提供精簡版使用者帳號總覽介面，顯示帳號清單（姓名、email、角色摘要、狀態、最後登入）。使用者帳號 SHALL 與既有 employees 表的員工資料關聯。帳號建立功能 SHALL 移至 HR 員工管理中心（`/organization/employee-management`），不在此頁面提供。

#### Scenario: 使用者列表

- **WHEN** 管理員進入使用者管理
- **THEN** 系統顯示所有使用者帳號清單，包含姓名、email、角色摘要（逗號分隔角色名稱）、帳號狀態、最後登入時間

#### Scenario: 快速操作 — 啟用/停用

- **WHEN** 管理員點擊帳號的啟用/停用切換
- **THEN** 系統更新帳號狀態並顯示成功通知

#### Scenario: 快速操作 — 密碼重設

- **WHEN** 管理員點擊「重設密碼」按鈕
- **THEN** 系統顯示確認對話框，確認後產生新隨機密碼、顯示在 Modal 中、設定 `must_change_password = 1`

#### Scenario: 導向 HR 管理中心

- **WHEN** 管理員點擊帳號列的「管理」連結
- **THEN** 系統導向 `/organization/employee-management?userId={userId}`，在 HR 管理中心開啟該員工的詳情 Modal 並切換至「帳號與權限」Tab

#### Scenario: 無新增使用者功能

- **WHEN** 管理員檢視使用者管理頁面
- **THEN** 頁面 SHALL NOT 顯示「新增使用者」按鈕或使用者建立表單。頁面標題或說明文字 SHALL 指示新帳號透過「組織管理 > 員工管理」建立


<!-- @trace
source: unified-employee-management
updated: 2026-04-24
code:
  - bombus-system/openspec/specs/user-overview-lite/spec.md
  - bombus-system/openspec/specs/batch-employee-import/spec.md
  - bombus-system/openspec/specs/shared-employee-detail/spec.md
  - bombus-system/openspec/changes/interviewer-selection-at-invitation/tasks.md
  - bombus-system/openspec/specs/admin-portal/spec.md
  - bombus-system/openspec/changes/recruitment-hr-initiated-referral/tasks.md
  - bombus-system/openspec/specs/employee-self-service/spec.md
  - bombus-system/openspec/specs/unified-account-creation/spec.md
  - bombus-system/openspec/specs/hr-employee-hub/spec.md
  - bombus-system/openspec/specs/employee-onboarding-automation/spec.md
  - bombus-system/openspec/specs/unified-employee-model/spec.md
-->

---
### Requirement: 標籤完整中文化
All resource names, action names, feature names, and scope labels displayed in the role management and permission visualization interfaces SHALL use Chinese labels. No English fallback SHALL be visible in the UI.

#### Scenario: 所有功能標籤顯示中文
- **WHEN** the role management page displays feature names
- **THEN** every feature SHALL show its Chinese `name` from the features table (e.g., "招募職缺管理", "員工檔案管理")

#### Scenario: 所有操作等級標籤顯示中文
- **WHEN** the UI displays action level options
- **THEN** the options SHALL be labeled "無權限", "僅查看", "可編輯" (not "none", "view", "edit")

#### Scenario: 所有範圍標籤顯示中文
- **WHEN** the UI displays scope options
- **THEN** the options SHALL be labeled "自己", "部門", "公司" (not "self", "department", "company")

#### Scenario: 舊版權限標籤也顯示中文
- **WHEN** the legacy permission view displays resource or action labels
- **THEN** all labels SHALL use Chinese mappings with no English fallback

---
### Requirement: 權限可視化頁面適配
The permission visualization page SHALL support displaying feature-based permissions in addition to or instead of legacy permissions.

#### Scenario: 使用者有效權限顯示 feature 模型
- **WHEN** a tenant admin selects a user on the permission visualization page
- **THEN** the system SHALL display the user's effective feature permissions grouped by module, showing action level and scope for each feature