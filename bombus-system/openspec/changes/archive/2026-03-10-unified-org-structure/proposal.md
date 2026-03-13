## Why

Bombus 目前有三個獨立功能在處理「組織架構」概念，分散在不同位置但操作同一張 `org_units` 資料表：

1. **組織架構管理**（`/settings/org-structure`）：簡易樹狀 CRUD，僅能新增/編輯/刪除 org_units 節點
2. **集團組織圖**（`/organization/group-structure`）：Canvas 畫布模式呈現 group/subsidiary 公司結構，含拖拉、縮放、對齊工具
3. **部門結構管理**（`/organization/department-structure`）：Canvas 畫布模式呈現部門結構，含公司篩選、協作關係線、自動排列

這造成三個核心問題：

1. **使用者體驗混亂**：PM 或管理員必須在三個不同頁面間切換才能完整管理組織，且不清楚哪個頁面管什麼
2. **維護成本高**：畫布引擎邏輯（拖拉、縮放、SVG 連線、對齊工具）在 group-structure（706 行 TS）和 department-structure（856 行 TS）之間重複 ~80%
3. **功能不一致**：三個頁面各自實作不同的子集功能，沒有統一的「組織全貌」視圖，也無法在同一畫面看到母公司→子公司→部門的完整層級

此外，後端 `departments` 表目前缺少 `manager_id` 等欄位，導致 GET /departments API 查詢 `d.manager_id, d.head_count` 時產生 SQL 錯誤。

**影響範圍**：主要影響「系統設定」與「組織管理」功能區域。L1~L6 業務模組不受影響。

## What Changes

### 合併為統一組織架構元件

將三個分散的組織管理功能合併為單一頁面 `/settings/org-structure`，支援：
- **完整層級**：母公司（group）→ 子公司（subsidiary）→ 部門（department，支援動態多層級）→ 員工（可選顯示）
- **雙視圖模式**：Canvas 畫布（拖拉/縮放/對齊/自動排列）+ 列表模式
- **PNG 匯出**：將組織架構圖匯出為圖片
- **部門詳情編輯**：名稱、主管、負責任務、KPI 事項、職能框架分類、職務配置（唯讀）
- **協作關係**：部門間簡單關聯（平行協作/下游流程），僅記錄類型 + 描述

### 後端擴充

- 擴充 `departments` 表欄位（manager_id、head_count、responsibilities、kpi_items、competency_focus）
- 新增 `department_collaborations` 表
- 新增 API 端點：統一組織樹、部門員工列表、部門職務配置、協作關係 CRUD
- 擴充 PUT /departments/:id 支援新欄位

### 前端清理

- 刪除 `group-structure-page` 和 `department-structure-page` 兩個重複元件（共 6 個檔案）
- 更新組織管理路由和側邊欄選單

## Non-goals（不在範圍內）

- **不改 org_units 表結構**：維持現有 id/name/type/parent_id/level 欄位不變
- **不做即時多人協作編輯**：畫布僅支援單人操作
- **不做 SVG 匯出**：僅支援 PNG 格式
- **不做跨公司員工指派**：employees.department 欄位維持不變
- **不做員工 CRUD**：員工管理保留在 `/organization/employee-management` 獨立頁面
- **不做複雜工作流程**：協作關係簡化為兩種類型（parallel/downstream）+ 描述文字
- **不做 org_units 表遷移**：不合併 departments 表到 org_units，兩表並存維持向後相容

## Capabilities

### New Capabilities

- `unified-org-canvas`：統一組織架構畫布元件，支援 group/subsidiary/department/employee 四種節點型別混合渲染，含拖拉、縮放、8 種對齊工具、Undo/Redo、自動排列、Grid Snap
- `department-collaboration`：部門間協作關係管理（平行協作/下游流程），含 CRUD API 和畫布上的虛線視覺化
- `png-export`：組織架構圖 PNG 匯出（html2canvas）
- `department-detail-edit`：擴充部門編輯功能，支援負責任務、KPI 事項、職能框架分類、職務配置唯讀展示

### Modified Capabilities

- `org-structure`（`tenant-admin/pages/org-structure-page/`）：從簡易樹狀 CRUD 升級為完整畫布+列表雙模式元件
- `organization-service`（`organization/services/organization.service.ts`）：新增統一組織樹、協作關係、擴充部門更新等 API 方法

### Removed Capabilities

- `group-structure`（`organization/pages/group-structure-page/`）：功能已合併至 unified-org-canvas
- `department-structure`（`organization/pages/department-structure-page/`）：功能已合併至 unified-org-canvas

## Impact

### 資料庫（sql.js/SQLite 租戶 DB）

- 擴充 `departments` 表：新增 `manager_id`、`head_count`、`responsibilities`、`kpi_items`、`competency_focus` 欄位（ALTER TABLE 遷移）
- 新增 `department_collaborations` 表：`id`、`source_dept_id`、`target_dept_id`、`relation_type`、`description`、`created_at`

### 後端 API（server/src/routes/organization.js）

新增端點：
- `GET /api/organization/tree` — 統一組織樹（含員工數、主管名、擴充欄位）
- `GET /api/organization/departments/:id/employees` — 部門員工列表（輕量）
- `GET /api/organization/departments/:id/positions` — 部門職務配置（唯讀）
- `GET /api/organization/collaborations` — 協作關係列表
- `POST /api/organization/collaborations` — 新增協作關係
- `PUT /api/organization/collaborations/:id` — 更新協作關係
- `DELETE /api/organization/collaborations/:id` — 刪除協作關係

擴充端點：
- `PUT /api/organization/departments/:id` — 新增 responsibilities、kpiItems、competencyFocus 欄位支援

### 前端（src/app/）

修改檔案：
- `features/organization/models/organization.model.ts` — 新增 4 個 interface
- `features/organization/services/organization.service.ts` — 新增 8 個方法
- `features/tenant-admin/pages/org-structure-page/*.{ts,html,scss}` — 覆寫為統一元件
- `features/organization/organization.routes.ts` — 移除 2 路由
- `shared/components/sidebar/sidebar.component.ts` — 移除 2 選單項

刪除檔案：
- `features/organization/pages/group-structure-page/` — 3 個檔案（.ts, .html, .scss）
- `features/organization/pages/department-structure-page/` — 3 個檔案（.ts, .html, .scss）

### 依賴套件

- 新增：`html2canvas`（PNG 匯出）

### 概略資料模型

**departments 表擴充欄位**

| 欄位 | 型別 | 說明 |
| ---- | ---- | ---- |
| manager_id | TEXT | 部門主管 employee ID（FK → employees.id） |
| head_count | INTEGER | 部門人數（冗餘快取） |
| responsibilities | TEXT | 負責任務 JSON 陣列 |
| kpi_items | TEXT | KPI 事項 JSON 陣列 |
| competency_focus | TEXT | 職能框架分類 JSON 陣列（core/management/professional/ksa） |

**department_collaborations 新表**

| 欄位 | 型別 | 說明 |
| ---- | ---- | ---- |
| id | TEXT PRIMARY KEY | UUID |
| source_dept_id | TEXT NOT NULL | 來源部門 org_units.id |
| target_dept_id | TEXT NOT NULL | 目標部門 org_units.id |
| relation_type | TEXT NOT NULL | 關係類型：parallel / downstream |
| description | TEXT | 描述文字 |
| created_at | TEXT | 建立時間 |
