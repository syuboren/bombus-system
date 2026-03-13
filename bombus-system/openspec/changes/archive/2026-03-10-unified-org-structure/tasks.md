## 1. 後端：DB 遷移

- [x] 1.1 擴充 `departments` 表欄位 — 修改 `server/src/db/tenant-schema.js` 的 `initTenantSchema()` 函數（L1233 後），新增 5 個 ALTER TABLE 遷移（manager_id、head_count、responsibilities、kpi_items、competency_focus），每個用 try-catch 包裹保證冪等。**驗證**：啟動 server `cd bombus-system/server && npm run dev`，重新載入 demo 租戶後，執行 `SELECT * FROM pragma_table_info('departments')` 確認新欄位存在
- [x] 1.2 新增 `department_collaborations` 表 — 修改 `server/src/db/tenant-schema.js` 的 `BUSINESS_TABLES_SQL` 字串（L1216 結束引號前），新增 CREATE TABLE IF NOT EXISTS department_collaborations（id, source_dept_id, target_dept_id, relation_type, description, created_at）。**驗證**：啟動 server 後，執行 `SELECT name FROM sqlite_master WHERE type='table' AND name='department_collaborations'` 回傳結果

> 依賴：無前置依賴

## 2. 後端：新 API 端點

- [x] 2.1 新增 `GET /tree` API — 修改 `server/src/routes/organization.js`（module.exports 前），查詢 org_units LEFT JOIN departments，回傳含 id、name、type、parentId、level、managerId、managerName、employeeCount、responsibilities、kpiItems、competencyFocus 的完整節點列表。**驗證**：`curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/organization/tree` 回傳 JSON 陣列，包含 group/subsidiary/department 節點
- [x] 2.2 新增 `GET /departments/:id/employees` API — 修改 `server/src/routes/organization.js`，透過 org_units.name 查詢 employees 表，回傳 id、name、employeeNo、position、avatar、status。**驗證**：以已知部門 ID 呼叫，回傳該部門員工列表（或空陣列）
- [x] 2.3 新增 `GET /departments/:id/positions` API — 修改 `server/src/routes/organization.js`，查詢 department_positions LEFT JOIN grade_levels，回傳 id、title、track、grade、gradeTitle。**驗證**：以已知部門 ID 呼叫，回傳職務配置列表
- [x] 2.4 擴充 `PUT /departments/:id` — 修改 `server/src/routes/organization.js`（L483 後），新增 responsibilities、kpiItems、competencyFocus 欄位更新邏輯（JSON.stringify 存入 departments 表）。**驗證**：PUT 請求帶 `{"responsibilities":["任務A","任務B"]}` 後，GET /tree 回傳該部門包含正確 responsibilities
- [x] 2.5 新增協作關係 CRUD API — 修改 `server/src/routes/organization.js`，新增 4 個端點：GET /collaborations（列表含 source_name/target_name）、POST /collaborations（建立，需 sourceDeptId/targetDeptId/relationType）、PUT /collaborations/:id（更新 relationType/description）、DELETE /collaborations/:id。**驗證**：POST 建立 → GET 列表包含 → PUT 更新 → DELETE 移除 → GET 列表不包含

> 依賴：2.1~2.5 依賴 Group 1（departments 表需先有新欄位）

## 3. 前端：Model + Service 擴充

- [x] 3.1 新增統一節點型別 — 修改 `src/app/features/organization/models/organization.model.ts`（L203 後），新增 4 個 interface：OrgTreeNode（id/name/type/parentId/level/managerId/managerName/employeeCount/responsibilities/kpiItems/competencyFocus）、DepartmentEmployee（id/name/employeeNo/position/avatar/status）、DepartmentPositionInfo（id/title/track/grade/gradeTitle）、SimpleCollaboration（id/sourceDeptId/targetDeptId/relationType/description）。同時移除舊的 `CollaborationType`（4 種→2 種）和 `DepartmentCollaboration` 介面（L52-64，已被 `SimpleCollaboration` 取代），新增 `SimpleCollaborationType = 'parallel' | 'downstream'`。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無型別錯誤
- [x] 3.2 擴充 OrganizationService — 修改 `src/app/features/organization/services/organization.service.ts`，新增 8 個方法：getOrgTree()、getDepartmentEmployees(deptId)、getDepartmentPositions(deptId)、getCollaborations()、createCollaboration()、updateCollaboration()、deleteCollaboration()、updateDepartmentExtended()。替換 getDepartmentCollaborations() stub。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無型別錯誤

> 依賴：3.1 → 3.2（service 需要先有 model type）

## 4. 前端：統一畫布元件

- [x] 4.1 覆寫 `org-structure-page.component.ts` — 覆寫 `src/app/features/tenant-admin/pages/org-structure-page/org-structure-page.component.ts`，實作完整畫布+列表元件（~1100 行）。包含：Signal 狀態（orgTree、collaborations、viewMode、canvasScale/Pan、nodePositions、isEditMode、showEmployees、showCollaborations）、computed（tree、flatList、stats、collaborationLines、departmentNodes）、畫布方法（沿用 group-structure L228-474 的 pan/zoom/drag/alignment/undo，新增 redo stack 實作 Redo 功能）、自動排列（沿用 department-structure L222-268 的遞迴 subtreeWidth）、SVG 連線（修改 getConnectionPath 支援 getNodeDimensions）、CRUD 方法。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無編譯錯誤
- [x] 4.2 覆寫 `org-structure-page.component.html` — 覆寫 `src/app/features/tenant-admin/pages/org-structure-page/org-structure-page.component.html`，實作模板（~800 行）。包含：Header + 統計卡片、視圖切換 + 畫布工具列、編輯工具列（8 種對齊+Undo/Redo+自動排列）、Canvas 區域（SVG 連線 + 混合節點 + 員工末端節點 + Legend）、列表區域（遞迴樹）、5 個 Modal（公司表單、部門表單、協作表單、節點詳情、刪除確認）。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無模板錯誤
- [x] 4.3 覆寫 `org-structure-page.component.scss` — 覆寫 `src/app/features/tenant-admin/pages/org-structure-page/org-structure-page.component.scss`，實作樣式（~600 行）。包含：模組色 `$module-color: $color-brand-main`、使用 @include card / button-module / data-table / status-badge mixin、節點卡片 4 種型別（group/subsidiary/department/employee）、畫布容器 + grid-overlay、連線 SVG、列表模式、Modal 共用、響應式。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無樣式錯誤
- [x] 4.4 實作部門編輯 Modal — 在 4.1/4.2 中包含部門編輯 Modal 的 6 個區塊：基本資訊（名稱 + 主管 select + 上級單位 select）、負責任務（動態文字列表 add/remove）、KPI 事項（動態文字列表 add/remove）、職能框架分類（4 checkbox：core/management/professional/ksa）、職務配置（唯讀表格，來自 getDepartmentPositions 懶載入）、協作關係（列表 + 新增/刪除按鈕，開啟協作 Modal）。**驗證**：在開發環境中點擊部門節點 → 開啟詳情 → 點擊編輯 → 表單包含 6 個區塊
- [x] 4.5 實作 PNG 匯出 — 安裝 `html2canvas`（`cd bombus-system && npm install html2canvas`），在 TS 中實作 `exportPNG()` 方法：動態 import html2canvas、暫存 transform、設定 scale=2 + backgroundColor #ffffff、產生 download link。**驗證**：在畫布模式點擊「匯出 PNG」按鈕 → 瀏覽器下載 `組織架構圖_YYYY-MM-DD.png`

> 依賴：Group 3 完成後才能開始；4.1 → 4.2 → 4.3（三者互相依賴）；4.4 含在 4.1/4.2 中但獨立驗證；4.5 可與 4.1~4.3 平行

## 5. 前端：路由與選單清理

- [x] 5.1 刪除舊元件 — 刪除目錄 `src/app/features/organization/pages/group-structure-page/`（group-structure-page.component.ts、.html、.scss）和 `src/app/features/organization/pages/department-structure-page/`（department-structure-page.component.ts、.html、.scss），共 6 個檔案。**驗證**：`ls src/app/features/organization/pages/` 僅剩 `employee-management-page/`
- [x] 5.2 更新路由 — 修改 `src/app/features/organization/organization.routes.ts`，移除 group-structure 和 department-structure 路由，保留 employee-management，將預設 redirect 改為 `employee-management`，新增 `{ path: '**', redirectTo: 'employee-management' }` wildcard 路由確保舊書籤（`/organization/group-structure`、`/organization/department-structure`）能正確重導。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無路由引用錯誤
- [x] 5.3 更新側邊欄 — 修改 `src/app/shared/components/sidebar/sidebar.component.ts`（L158-177），將「組織管理」區塊改為僅保留「員工管理」（route: `/organization/employee-management`），移除「集團組織圖」和「部門結構管理」。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無編譯錯誤；開發環境側邊欄「組織管理」僅顯示「員工管理」

> 依賴：Group 4 完成後才能開始（先確保新元件正常再刪除舊元件）

## 6. 驗證與驗收

- [x] 6.1 Angular 建置驗證 — 執行 `cd bombus-system && npx ng build --configuration=development`，確認 0 errors、0 NG8107 warnings。**驗證**：建置成功且無錯誤輸出
- [x] 6.2 Playwright E2E 測試 — 撰寫 Playwright 腳本（`/tmp/test-unified-org.py`），使用 `scripts/with_server.py` 啟動前後端，驗證：①登入 demo 帳號 → ②導航 `/settings/org-structure` → ③畫布模式載入顯示組織樹節點（9個）→ ④切換列表模式（9列）→ ⑤驗證側邊欄無「集團組織圖」和「部門結構管理」→ ⑥詳情 Modal 開啟 → ⑦舊路由 group-structure/department-structure 重導至 employee-management。**驗證**：14/14 全部通過

> 依賴：Groups 1~5 全部完成後才能開始
