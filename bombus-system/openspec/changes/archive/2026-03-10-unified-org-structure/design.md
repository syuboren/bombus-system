## Context

Bombus 的組織架構管理目前分散在三個元件：

| 元件 | 路由 | 行數 (TS/HTML/SCSS) | 資料來源 |
| ---- | ---- | ---- | ---- |
| OrgStructurePageComponent | `/settings/org-structure` | 215/167/301 | `org_units`（全部 type） |
| GroupStructurePageComponent | `/organization/group-structure` | 706/655/? | `org_units` WHERE type IN ('group','subsidiary') |
| DepartmentStructurePageComponent | `/organization/department-structure` | 856/?/? | `org_units` WHERE type='department' + `departments` 表 |

三者共用同一張 `org_units` 表，畫布引擎邏輯（拖拉、縮放、SVG 連線、對齊工具）在 group-structure 和 department-structure 之間 ~80% 重複。

### 現有需複用的服務與元件
- `OrganizationService`（`features/organization/services/organization.service.ts`）：公司/部門/員工 API
- `TenantAdminService`（`features/tenant-admin/services/tenant-admin.service.ts`）：org-units CRUD
- `HeaderComponent`（`shared/components/header/header.component`）：頁面標題
- `HasPermissionDirective`（`shared/directives/has-permission.directive.ts`）：權限控制
- `NotificationService`（`core/services/notification.service.ts`）：操作通知

### 現有需修改的檔案
- `server/src/db/tenant-schema.js`：departments 表擴充 + department_collaborations 新表
- `server/src/routes/organization.js`：新增 API 端點 + 擴充 PUT
- `features/organization/models/organization.model.ts`：新增 interface
- `features/organization/services/organization.service.ts`：新增 API 方法
- `features/tenant-admin/pages/org-structure-page/*.{ts,html,scss}`：覆寫為統一元件
- `features/organization/organization.routes.ts`：移除舊路由
- `shared/components/sidebar/sidebar.component.ts`：移除舊選單項

## Goals / Non-Goals

**Goals:**
- 將三個重疊的組織架構元件合併為單一統一元件
- 沿用現有畫布引擎程式碼（group-structure 為主幹），避免重寫
- 支援 group/subsidiary/department/employee 四種節點型別混合渲染
- 擴充部門編輯功能：負責任務、KPI 事項、職能框架分類、職務配置（唯讀）
- 新增部門間協作關係管理（簡化版：parallel/downstream + description）
- 支援 PNG 匯出
- 修復 departments 表缺少 manager_id 欄位的 SQL 錯誤

**Non-Goals:**
- 不改 org_units 表結構（維持現有 id/name/type/parent_id/level）
- 不做即時多人協作編輯
- 不做 SVG 匯出（僅 PNG）
- 不做員工 CRUD（保留在獨立頁面）
- 不做複雜工作流程（協作關係僅兩種類型）
- 不合併 departments 表到 org_units（兩表並存維持相容）

## Decisions

### D1：統一畫布引擎架構 — 沿用 group-structure 為主幹

**選擇**：以 `GroupStructurePageComponent` 的畫布引擎為基礎，擴充支援混合節點型別

**替代方案**：
- 從 department-structure 為基礎：程式碼更多（856 行），包含公司篩選邏輯（統一版不需要）
- 從零重寫：風險最高，且現有畫布引擎已穩定

**為什麼選擇 group-structure 為主幹**：
1. group-structure 的畫布引擎更乾淨（706 行 vs 856 行），不含公司篩選
2. 核心方法（pan/zoom L228-308、node drag L339-373、alignment L389-474、Bézier 連線 L542-604）可直接沿用
3. department-structure 的遞迴 subtreeWidth 自動排列算法（L222-268）更優，單獨提取替換

**需修改的部分**：
- CSS class `.company-node` → `.org-node`
- `getConnectionPath()` 改呼叫 `getNodeDimensions(type)` 支援不同尺寸節點
- 新增協作關係虛線渲染

### D2：節點型別混合渲染 — 依 type 區分尺寸與樣式

**選擇**：依 org_units.type 區分節點尺寸和視覺樣式

```
group:       240×160px, 左邊框 $color-brand-main
subsidiary:  240×120px, 左邊框 $color-l3-petrol
department:  200×90px,  左邊框 $color-l2-clay
employee:    160×50px,  左邊框 $color-soft-gray (可選顯示)
```

**替代方案**：
- 統一尺寸：視覺上無法區分層級
- 依 level 動態計算：增加複雜度，且 level 不一定反映 type

**為什麼**：不同尺寸讓使用者一眼區分公司/部門/員工層級，且與現有 group-structure（240×160）和 department-structure（200×90）的設計一致。

### D3：自動排列算法 — 遞迴 subtreeWidth（來自 department-structure）

**選擇**：採用 department-structure 的遞迴 subtreeWidth 算法（L222-268），擴充支援混合節點型別

**替代方案**：
- group-structure 的簡單算法（L477-481）：僅適用於同一層級，不支援深層樹
- D3.js tree layout：引入額外依賴，過度設計

**為什麼**：department-structure 的算法已支援多層級遞迴，只需將固定的 `nodeWidth=200` 改為 `getNodeDimensions(type).width` 即可適配混合型別。

**核心邏輯**：
```typescript
getNodeDimensions(type: string): { width: number; height: number } {
  switch (type) {
    case 'group':      return { width: 240, height: 160 };
    case 'subsidiary': return { width: 240, height: 120 };
    case 'department': return { width: 200, height: 90  };
    default:           return { width: 160, height: 50  }; // employee
  }
}
```

### D4：協作關係簡化 — parallel + downstream

**選擇**：協作關係僅支援兩種類型 + 描述文字

| 類型 | 說明 | 畫布顏色 |
| ---- | ---- | ---- |
| parallel | 平行協作（部門間相互配合） | #CD853F（陶土色） |
| downstream | 下游流程（A 部門產出交付 B 部門） | #6B8E23（橄欖綠） |

**替代方案**：
- 四種類型（upstream/downstream/parallel/support）：support 與 parallel 區分度低，增加使用者理解成本
- 完整工作流程引擎：超出組織架構管理範圍，屬於未來 BPM 功能

**為什麼**：PM 確認只需「誰跟誰有關係」和「關係方向」，不需要複雜的溝通頻率或工作流程描述欄位。

### D5：部門編輯欄位擴充 — ALTER TABLE 遷移

**選擇**：透過 ALTER TABLE 在 `initTenantSchema()` 函數中遷移 departments 表，新增 5 個欄位

**替代方案**：
- 新建 department_extended 表：增加 JOIN 複雜度
- 將擴充欄位存在 org_units 表：破壞 org_units 的通用性

**為什麼**：
1. departments 表已存在且透過 `d.name = ou.name` 與 org_units 關聯
2. ALTER TABLE 在 SQLite 中是安全操作，搭配 try-catch 保證冪等
3. 後端 organization.js L316 已經在查詢 `d.manager_id`，只是欄位不存在導致 NULL

**遷移策略**：在 `initTenantSchema()` 的 `db.exec(RBAC_TABLES_SQL)` 之後、`adapter.save()` 之前，逐欄執行 ALTER TABLE：
```javascript
const deptMigrations = [
  'ALTER TABLE departments ADD COLUMN manager_id TEXT REFERENCES employees(id)',
  'ALTER TABLE departments ADD COLUMN head_count INTEGER DEFAULT 0',
  "ALTER TABLE departments ADD COLUMN responsibilities TEXT DEFAULT '[]'",
  "ALTER TABLE departments ADD COLUMN kpi_items TEXT DEFAULT '[]'",
  "ALTER TABLE departments ADD COLUMN competency_focus TEXT DEFAULT '[]'"
];
for (const sql of deptMigrations) {
  try { db.run(sql); } catch (e) { /* 欄位已存在則忽略 */ }
}
```

### D6：PNG 匯出 — html2canvas

**選擇**：使用 html2canvas 函式庫將畫布 DOM 轉為 Canvas 再匯出 PNG

**替代方案**：
- DOM-to-SVG + SVG-to-PNG：兩步轉換複雜
- 原生 Canvas API 重繪：需要重新實作所有節點渲染邏輯

**為什麼**：html2canvas 是業界標準，一行程式碼即可將 DOM 元素轉為圖片。唯一風險是 SVG 連線可能需要特殊處理（暫存 transform、設定 scale=2）。

### D7：員工懶載入 — Signal Map 快取

**選擇**：員工資料按部門懶載入，使用 `Map<deptId, DepartmentEmployee[]>` Signal 快取

**替代方案**：
- 一次載入全部員工：大組織可能有數千員工，DOM 過載
- 虛擬滾動：畫布模式下不適用（需要所有節點同時存在）

**為什麼**：
1. 預設模式僅顯示員工數（已在 /tree API 中回傳），不需要載入員工詳情
2. 切換為「顯示員工」模式時，才按部門逐一請求 `/departments/:id/employees`
3. 已載入的部門員工不重複請求（Map 快取）

## Risks / Trade-offs

### R1：html2canvas SVG 相容性
- **風險**：SVG 連接線在 html2canvas 中可能無法正確渲染
- **緩解**：匯出前暫時將 SVG 轉為 inline styles + 重置 CSS transform；匯出時 scale=2 確保清晰度

### R2：departments 遷移冪等性
- **風險**：ALTER TABLE 在欄位已存在時會拋出錯誤
- **緩解**：每個 ALTER TABLE 用 try-catch 包裹，錯誤時忽略（SQLite 的 ALTER TABLE 不支援 IF NOT EXISTS）

### R3：大組織畫布效能
- **風險**：100+ 節點 + 員工展開時 DOM 元素可能達數百個
- **緩解**：員工節點懶載入；使用 CSS `transform` 而非 `left/top` 屬性實現拖拉（GPU 加速）；OnPush 變更偵測減少重繪

### R4：departments 與 org_units 同步
- **風險**：新增/刪除部門時需同時操作兩張表
- **緩解**：沿用現有 POST/DELETE /departments 的同步邏輯（organization.js L400-526），統一元件的 CRUD 呼叫相同 API

### R5：舊路由訪問
- **風險**：使用者可能有書籤指向 `/organization/group-structure` 或 `/organization/department-structure`
- **緩解**：刪除路由後，Angular 會自動重導到 `/organization/employee-management`（default redirect）

## SQL Schema 變更

### departments 表擴充（ALTER TABLE 遷移）

```sql
ALTER TABLE departments ADD COLUMN manager_id TEXT REFERENCES employees(id);
ALTER TABLE departments ADD COLUMN head_count INTEGER DEFAULT 0;
ALTER TABLE departments ADD COLUMN responsibilities TEXT DEFAULT '[]';
ALTER TABLE departments ADD COLUMN kpi_items TEXT DEFAULT '[]';
ALTER TABLE departments ADD COLUMN competency_focus TEXT DEFAULT '[]';
```

### department_collaborations 新表（CREATE TABLE）

```sql
CREATE TABLE IF NOT EXISTS department_collaborations (
  id TEXT PRIMARY KEY,
  source_dept_id TEXT NOT NULL,
  target_dept_id TEXT NOT NULL,
  relation_type TEXT NOT NULL CHECK(relation_type IN ('parallel','downstream')),
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

> 注意：此表放在 `BUSINESS_TABLES_SQL` 字串中（L1216 結束引號前），不加 FOREIGN KEY 約束到 org_units（因為 org_units 在 RBAC_TABLES_SQL 中才建立，而 BUSINESS_TABLES_SQL 先執行）。

## Migration Plan

### Phase 1：後端 DB 遷移 + API（無前端破壞性）
1. departments 表 ALTER TABLE 遷移
2. department_collaborations 表 CREATE TABLE
3. 新增 /tree API 端點
4. 新增 /departments/:id/employees 和 /departments/:id/positions
5. 擴充 PUT /departments/:id
6. 新增 collaboration CRUD

### Phase 2：前端 Model + Service 擴充（非破壞性）
1. organization.model.ts 新增 4 個 interface
2. organization.service.ts 新增 8 個方法 + 替換 stub

### Phase 3：統一畫布元件（核心變更）
1. 覆寫 org-structure-page 的 TS/HTML/SCSS
2. 沿用 group-structure 畫布引擎 + department-structure 自動排列
3. 實作部門編輯 Modal（6 個區塊）
4. 實作 PNG 匯出

### Phase 4：路由與選單清理
1. 刪除 group-structure-page 和 department-structure-page
2. 更新 organization.routes.ts
3. 更新 sidebar 選單

### Phase 5：驗證
1. Angular 建置驗證
2. Playwright E2E 測試

**回滾策略**：Phase 1-2 為非破壞性變更，可獨立回滾。Phase 3-4 為核心變更，需整體回滾（git revert）。
