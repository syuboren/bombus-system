## Why

統一組織架構頁面（`/settings/org-structure`）在 `unified-org-structure` 變更中成功合併了三個分散的組織管理頁面，但合併過程中**簡化了公司（group/subsidiary）層級的詳情功能**：

1. **公司詳情遺失**：原本 group-structure 頁面的公司 Modal 包含完整的聯絡資訊（地址、電話、Email）、公司簡介、統一編號、成立日期、營運狀態、轄下子公司列表等。合併後的詳情 Modal 只顯示名稱和員工數
2. **公司編輯表單簡化**：原本可以編輯公司的地址、電話、Email、簡介、統編、狀態等 10+ 個欄位。合併後只剩名稱、類型、上級單位三個欄位
3. **節點卡片資訊不足**：原本節點卡片顯示員工人數 + 部門數 + 營運狀態標籤。合併後缺少部門數和狀態標籤
4. **無法建立子部門**：後端 `POST /departments` 驗證上層必須是 company（group/subsidiary），不允許 department 作為上層，導致無法建立多層級部門結構（如「研發部 → 前端組 → React Team」）
5. **缺少新增子節點入口**：畫布上的節點缺少「新增子公司」「新增部門」「新增子部門」的快捷操作

**使用者影響**：管理員無法在統一組織架構頁面中完整管理公司資訊，體驗比合併前退步。部門只能建在公司下，無法反映實際的多層級部門組織。

**影響範圍**：組織架構管理功能。L1~L6 業務模組不受影響。

## What Changes

### 恢復公司豐富詳情

- **org_units 表擴充**：新增 8 個公司詳情欄位（code、address、phone、email、description、tax_id、status、established_date）
- **公司詳情 Modal 恢復**：group/subsidiary 節點點擊後顯示聯絡資訊（地址、電話、Email、統編、成立日期）、公司簡介、營運狀態、轄下子公司/部門列表
- **公司編輯表單恢復**：完整的三區塊表單（基本資訊 / 聯絡資訊 / 詳細資訊）
- **節點卡片增強**：group/subsidiary 卡片顯示部門數 + 營運狀態標籤

### 支援多層級子部門

- **後端放寬**：`POST /departments` 允許 department 作為上層（parent type 從 `IN ('group','subsidiary')` 改為 `IN ('group','subsidiary','department')`）
- **刪除保護**：`DELETE /departments/:id` 新增子部門存在檢查

### 節點操作增強

- **新增子節點入口**：每個節點的詳情 Modal 中提供「新增子節點」按鈕，根據節點類型決定可建立的子節點類型：
  - Group → 子公司、部門
  - Subsidiary → 部門
  - Department → 子部門

## Non-goals（不在範圍內）

- **不改 org_units 表的基本結構**：id/name/type/parent_id/level 維持不變
- **不合併 departments 表到 org_units**：兩表並存，departments 表仍用於員工關聯
- **不做公司 Logo 上傳**：僅支援文字欄位
- **不做公司間財務關係**：不涉及股權、損益等商業關係
- **不做部門拖拉重組**：移動節點仍需透過編輯表單修改上級單位

## Capabilities

### New Capabilities

- `company-rich-detail`：公司節點（group/subsidiary）的豐富詳情展示，包含聯絡資訊、公司簡介、子公司列表、部門列表
- `sub-department`：支援部門下建立子部門，形成多層級部門結構
- `contextual-child-creation`：根據節點類型提供對應的「新增子節點」操作入口

### Modified Capabilities

- `unified-org-canvas`：節點卡片增強（部門數 + 狀態標籤）、列表模式增強（部門數 + 狀態欄）
- `org-structure`：公司編輯表單從 3 欄位擴充為 11 欄位
- `organization-service`：`createCompany()` 和 `updateCompany()` 支援所有新欄位

## Impact

### 資料庫（sql.js/SQLite 租戶 DB）

- 擴充 `org_units` 表：新增 `code`、`address`、`phone`、`email`、`description`、`tax_id`、`status`、`established_date` 欄位（ALTER TABLE 遷移）

### 後端 API（server/src/routes/organization.js）

擴充端點：
- `GET /api/organization/companies/:id` — 回傳所有新欄位 + 子公司列表 + 部門列表
- `GET /api/organization/companies/:id/subsidiaries` — 增加員工數
- `POST /api/organization/companies` — 接收所有新欄位
- `PUT /api/organization/companies/:id` — 從只更新 name → 動態更新所有欄位
- `GET /api/organization/tree` — group/subsidiary 節點回傳新欄位 + departmentCount
- `POST /api/organization/departments` — 放寬 parent 類型驗證（支援子部門）
- `DELETE /api/organization/departments/:id` — 新增子部門存在檢查

### 前端（src/app/）

修改檔案：
- `features/organization/models/organization.model.ts` — OrgTreeNode 新增 9 個可選欄位（8 個對應 DB 欄位 + 1 個 computed `departmentCount`）
- `features/organization/services/organization.service.ts` — 擴充 createCompany/updateCompany/mapCompany
- `features/tenant-admin/pages/org-structure-page/*.{ts,html,scss}` — 公司表單、詳情 Modal、節點卡片、SCSS

### 概略資料模型

**org_units 表擴充欄位**

| 欄位 | 型別 | 說明 |
| ---- | ---- | ---- |
| code | TEXT | 公司代碼 |
| address | TEXT | 公司地址 |
| phone | TEXT | 聯絡電話 |
| email | TEXT | 電子郵件 |
| description | TEXT | 公司簡介 |
| tax_id | TEXT | 統一編號 |
| status | TEXT DEFAULT 'active' | 營運狀態（active/inactive） |
| established_date | TEXT | 成立日期 |
