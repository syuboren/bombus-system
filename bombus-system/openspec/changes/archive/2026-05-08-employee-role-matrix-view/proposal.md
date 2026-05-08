## Why

中型企業（50–500 員工）的 HR/管理員在 `/settings/users`（系統設定 → 租戶管理 → 員工與帳號管理）目前只能用「列表」看員工，**必須逐個點選員工開啟「帳號與權限」modal 才能看到該員工的角色與權限指派狀況**。當需要稽核「全公司哪些人有總公司權限」、「業務部所有人是否都已指派員工角色」時，沒有橫向鳥瞰視角，只能逐筆點開——這是 D-03（員工權限可視化雙模式）客戶回饋的核心痛點。

同時，過程中發現 `permission-visualization-page` 與 `user-management-page` 兩個元件已寫好但**未掛載任何路由也未出現在 sidebar**，是死碼孤兒；且 `user-overview-lite` spec 描述的「精簡頁」與實際路由載入完整 HR hub 的事實不符，需藉本次調整收斂為單一真理。

## What Changes

- **新增「角色矩陣」視圖**（view mode = `roleMatrix`）至 `/settings/users` 頁面：
  - 預設仍為既有「列表」視圖；右上角新增 `<app-view-toggle>` 切換 `[列表 | 角色矩陣]`
  - 矩陣呈現：行 = 員工（含工號、姓名、所屬部門）、列 = 該租戶所有角色（系統角色 + 自訂角色）
  - 格子內容：未指派為空白；已指派顯示「●」+ scope 標籤（全/子公司名/部門名）
  - 點員工列 → 開啟既有 `AccountPermissionComponent` modal（複用，零修改）
  - 篩選：搜尋（姓名/工號/Email）、部門（樹狀選擇）、角色（多選）、帳號狀態
  - 規模支援：使用 Angular CDK Virtual Scroll 支撐 200+ 員工流暢渲染
- **角色欄頭點擊** → 反向視角彈窗：列出持有此角色的所有員工 + 各自 scope（純檢視，不可編輯）
- **匯出按鈕**（員工視角，CSV）：匯出當前篩選後的員工 × 角色矩陣為 CSV，欄位含員工/部門/角色/scope/帳號狀態。HTML/PDF 與角色視角匯出留待 D-04 統整實作（**Non-Goal，本變更僅員工視角 CSV**）
- **清理孤兒元件**：刪除 `permission-visualization-page` 與 `user-management-page` 兩個未掛載元件及其檔案，避免未來開發者誤用
- **修正 `user-overview-lite` spec**：移除「精簡頁不含詳細角色管理」的限制，改為描述「列表 + 角色矩陣雙視圖、共用既有 AccountPermissionComponent modal」的現況與新行為
- **不新增後端 API**：完全使用既有 `GET /api/tenant-admin/users`、`GET /api/tenant-admin/roles`、`GET /api/tenant-admin/users/:id/roles` 端點組合，前端做矩陣聚合

## Non-Goals

- **不在 scope 內**：
  - row-level（資料列級）權限可視化 — 屬 D-02 範疇
  - 角色視角的 CSV/HTML 匯出 — 屬 D-04 範疇
  - PDF 匯出按鈕 — 由 HTML 列印代替
  - 矩陣中直接編輯角色（指派/撤除） — 透過 modal 進行，避免雙入口維護負擔
  - 改變 `/settings/users` 路由所載入的元件（仍是 `EmployeeManagementPageComponent`）
- **拒絕的替代方案**：
  - 模組熱力圖（員工 × 模組顏色深淺）：粒度太粗、500 人時欄位密度仍然爆掉，擇優選矩陣
  - 樹狀勾選 UI：屬角色管理頁範疇（D-03 文件原誤標）

## Capabilities

### New Capabilities

（無——本次重用既有頁面與既有 modal 元件，僅在現有頁面內加入新視圖）

### Modified Capabilities

- `user-overview-lite`: 將「精簡頁、不含角色管理」的限制改為「雙視圖（列表 + 角色矩陣）、點員工開啟既有 AccountPermissionComponent modal」；新增「角色矩陣視圖」、「角色欄頭反向查詢」、「員工視角 CSV 匯出」三項需求

## Impact

- **影響模組**：L0 系統設定 / 租戶管理（無跨 L1~L6 影響）
- **影響路由**：`/settings/users`（行為新增、路由不改）
- **影響前端檔案**：
  - `src/app/features/organization/pages/employee-management-page/employee-management-page.component.ts` + `.html` + `.scss`（加 viewMode signal、矩陣模板、篩選列、CSV 匯出）
  - 新元件 `src/app/features/organization/components/employee-role-matrix/employee-role-matrix.component.{ts,html,scss}`（矩陣視圖容器，含 Virtual Scroll）
  - 新元件 `src/app/features/organization/components/role-holders-popover/role-holders-popover.component.{ts,html,scss}`（角色欄頭反向查詢彈窗）
  - 新工具 `src/app/features/organization/utils/role-matrix-csv.ts`（CSV 匯出）
- **刪除檔案**（清理孤兒）：
  - `src/app/features/tenant-admin/pages/permission-visualization-page/`（整個資料夾）
  - `src/app/features/tenant-admin/pages/user-management-page/`（整個資料夾）
- **影響後端**：無新 API；複用 `GET /api/tenant-admin/users`、`/roles`、`/users/:id/roles`
- **影響 spec**：`openspec/specs/user-overview-lite/spec.md`（modified）
- **依賴前端套件**：`@angular/cdk/scrolling`（Virtual Scroll，需確認已安裝；未安裝則加入 `package.json`）
- **A11y/響應式**：1280px 以上完整矩陣；1024px–1280px 員工列固定、角色欄水平捲動；< 1024px 提示切回列表視圖
