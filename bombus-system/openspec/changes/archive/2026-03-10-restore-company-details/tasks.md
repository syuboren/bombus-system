## 1. 後端：DB 遷移

- [x] 1.1 擴充 `org_units` 表欄位 — 修改 `server/src/db/tenant-schema.js` 的 `initTenantSchema()` 函數，在 `deptMigrations` 區塊之後新增 `orgUnitMigrations` 陣列，新增 8 個 ALTER TABLE 遷移（code、address、phone、email、description、tax_id、status、established_date），每個用 try-catch 包裹保證冪等。**驗證**：啟動 server `cd bombus-system/server && npm run dev`，重新載入 demo 租戶後，執行 `SELECT * FROM pragma_table_info('org_units')` 確認新欄位存在

> 依賴：無前置依賴

## 2. 後端：API 擴充

- [x] 2.1 擴充 `POST /companies` — 修改 `server/src/routes/organization.js`，從只接收 name/type/parentCompanyId → 額外接收 code、address、phone、email、description、taxId、status、establishedDate，INSERT 語句改為包含所有新欄位。**驗證**：`curl -X POST` 帶 address/phone 欄位 → 回傳包含新欄位
- [x] 2.2 擴充 `PUT /companies/:id` — 修改 `server/src/routes/organization.js`，從只更新 name → 動態構建 UPDATE SET 子句，支援所有新欄位（name、code、address、phone、email、description、taxId、status、establishedDate），使用 `if (field !== undefined)` 判斷。**驗證**：PUT 帶 `{"address":"台北市"}` → GET 確認已更新
- [x] 2.3 擴充 `GET /companies/:id` — 修改回傳物件，包含所有新欄位（address、phone、email、description、taxId、status、establishedDate），並新增 subsidiaries 陣列（子公司 id/name/employeeCount）和 departments 陣列（直屬部門 id/name/employeeCount）。**驗證**：GET 已知公司 → 回傳包含 address 等欄位
- [x] 2.4 擴充 `GET /companies/:id/subsidiaries` — 回傳增加 employeeCount 和 status 欄位。**驗證**：GET → 每個子公司有 employeeCount
- [x] 2.5 擴充 `GET /tree` — group/subsidiary 節點也回傳 code、address、phone、email、description、taxId、status、establishedDate、departmentCount。**驗證**：GET /tree → group 節點包含 address 等欄位
- [x] 2.6 放寬 `POST /departments` parent 驗證 — 將 `type IN ('group', 'subsidiary')` 改為 `type IN ('group', 'subsidiary', 'department')`，允許部門下建子部門。**驗證**：POST 以另一個 department ID 為 companyId → 成功建立
- [x] 2.7 擴充 `DELETE /departments/:id` 子部門檢查 — 在刪除前檢查 `SELECT COUNT(*) FROM org_units WHERE parent_id = ? AND type = 'department'`，有子部門則回傳 400 錯誤。**驗證**：嘗試刪除有子部門的部門 → 回傳 `此部門下有 N 個子部門，請先刪除子部門`

> 依賴：2.1~2.7 依賴 Group 1（org_units 表需先有新欄位）

## 3. 前端：Model + Service 擴充

- [x] 3.1 擴充 `OrgTreeNode` 介面 — 修改 `src/app/features/organization/models/organization.model.ts`，在 `OrgTreeNode` 介面新增 9 個可選欄位：code?、address?、phone?、email?、description?、taxId?、status?('active'|'inactive')、establishedDate?、departmentCount?。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無型別錯誤
- [x] 3.2 擴充 `OrganizationService` — 修改 `src/app/features/organization/services/organization.service.ts`，更新 `createCompany()` 傳送所有新欄位、`updateCompany()` 從只送 name 改為送所有欄位、`mapCompany()` 映射新欄位。**驗證**：`cd bombus-system && npx ng build --configuration=development` 無型別錯誤

> 依賴：3.1 → 3.2（service 需要先有 model type）

## 4. 前端：Component TS 邏輯

- [x] 4.1 擴充 `companyForm` signal — 修改 `src/app/features/tenant-admin/pages/org-structure-page/org-structure-page.component.ts`，companyForm signal 從 3 欄位（name/type/parent_id）擴充為 11 欄位（加 code、address、phone、email、description、tax_id、status、established_date）。**驗證**：build 無錯誤
- [x] 4.2 恢復公司編輯方法 — 修改同檔案，`openEditCompanyForm(node)` 從 OrgTreeNode 填入所有公司欄位；`saveCompanyForm()` 透過 `orgService.updateCompany()` / `createCompany()` 傳送所有欄位（不再透過 tenantAdminService）。**驗證**：build 無錯誤
- [x] 4.3 恢復公司詳情載入 — 修改同檔案，新增 `nodeDetailSubsidiaries` signal；`openNodeDetail()` 在 group/subsidiary 節點時載入子公司列表（`getCompanyById()`）和直屬部門列表。**驗證**：build 無錯誤
- [x] 4.4 新增子節點邏輯 — 修改同檔案，新增 `getValidChildTypes(node)` 方法（group→['subsidiary','department']、subsidiary→['department']、department→['department']）；新增 `openCreateChildNode(parent)` 方法開啟對應表單；新增 `getStatusLabel(status)` 和 `getStatusClass(status)` 輔助方法。**驗證**：build 無錯誤

> 依賴：Group 3 完成後才能開始

## 5. 前端：HTML 模板

- [x] 5.1 增強節點卡片 — 修改 `src/app/features/tenant-admin/pages/org-structure-page/org-structure-page.component.html`，group/subsidiary 節點卡片增加部門數（`node.departmentCount`）和營運狀態標籤（`getStatusLabel(node.status)`）。**驗證**：build 無錯誤
- [x] 5.2 恢復公司詳情 Modal — 修改同檔案，在 Node Detail Modal 中，group/subsidiary 區塊顯示：聯絡資訊區塊（地址、電話、Email、統編、成立日期、狀態）、公司簡介、子公司列表（nodeDetailSubsidiaries）、部門列表（nodeDetailDepartments）。footer 加「新增子節點」按鈕。**驗證**：build 無錯誤
- [x] 5.3 恢復公司編輯表單 — 修改同檔案，將現有 3 欄位公司表單替換為三區塊完整表單：基本資訊（名稱、代碼、類型、上級單位）、聯絡資訊（地址、電話、Email）、詳細資訊（統編、成立日期、狀態、簡介）。Modal 使用 `modal-container--lg`。**驗證**：build 無錯誤
- [x] 5.4 增強列表模式 — 修改同檔案，列表表頭新增「部門數」「狀態」欄位；操作欄新增「新增子節點」按鈕。**驗證**：build 無錯誤

> 依賴：Group 4 完成後才能開始

## 6. 前端：SCSS 樣式

- [x] 6.1 新增狀態標籤樣式 — 修改 `src/app/features/tenant-admin/pages/org-structure-page/org-structure-page.component.scss`，新增 `.org-node__status`（營運中綠色/已停止紅色）、`.status--inactive`、`.company-description`（公司簡介文字）、`.detail-item--full`（全寬詳情項目）、`.modal-footer__spacer`（按鈕間距）。**驗證**：build 無樣式錯誤

> 依賴：可與 Group 5 平行進行

## 7. 驗證與驗收

- [x] 7.1 Angular 建置驗證 — 執行 `cd bombus-system && npx ng build --configuration=development`，確認 0 errors。**驗證**：建置成功且無錯誤輸出
- [x] 7.2 Playwright E2E 測試 — 撰寫 Playwright 腳本（`/tmp/test-restore-company-details.py`），驗證 21 項：①登入 → ②導航 → ③畫布節點狀態標籤 → ④公司詳情 Modal（聯絡資訊+子節點按鈕）→ ⑤編輯表單三區塊 → ⑥列表模式增強欄位。**驗證**：21/21 全部通過

> 依賴：Groups 1~6 全部完成後才能開始
