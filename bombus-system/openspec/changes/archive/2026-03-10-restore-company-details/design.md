## Context

`unified-org-structure` 變更已將三個組織架構頁面合併為統一的 `/settings/org-structure`，但合併過程中簡化了公司（group/subsidiary）的詳情功能。本變更在現有統一元件基礎上恢復豐富詳情。

### 現有需修改的檔案
- `server/src/db/tenant-schema.js`：org_units 表欄位擴充
- `server/src/routes/organization.js`：公司 CRUD API 擴充 + 子部門支援
- `features/organization/models/organization.model.ts`：OrgTreeNode 新增欄位
- `features/organization/services/organization.service.ts`：createCompany/updateCompany 擴充
- `features/tenant-admin/pages/org-structure-page/*.{ts,html,scss}`：UI 恢復

### 現有需複用的服務與元件
- `OrganizationService`（`features/organization/services/organization.service.ts`）：已有 getSubsidiaries()、createCompany()、updateCompany()
- `TenantAdminService`（`features/tenant-admin/services/tenant-admin.service.ts`）：org-units CRUD

## Goals / Non-Goals

**Goals:**
- 恢復原 group-structure 頁面的公司詳情 Modal（聯絡資訊、簡介、子公司列表）
- 恢復完整的公司編輯表單（11 欄位）
- 節點卡片增加部門數 + 營運狀態標籤
- 後端 org_units 表新增公司詳情欄位
- 後端 API 支援所有新欄位的 CRUD
- 支援多層級子部門（department 下建 department）

**Non-Goals:**
- 不改 org_units 表基本結構（id/name/type/parent_id/level）
- 不合併 departments 表到 org_units
- 不做公司 Logo 上傳

## Decisions

### D1：公司詳情存放位置 — 擴充 org_units 表

**選擇**：在 org_units 表直接新增 8 個公司詳情欄位

**替代方案**：
- 新建 company_details 表：增加 JOIN 複雜度，且 org_units 已有 company 相關記錄
- 擴充 departments 表：departments 是部門用的，語意不符

**為什麼**：
1. org_units 表的 group/subsidiary 記錄就是代表公司，直接擴充最自然
2. GET /tree API 已查詢 org_units，不需要額外 JOIN
3. ALTER TABLE 搭配 try-catch 保證冪等，與現有 departments 遷移模式一致

### D2：公司詳情 Modal — 依節點類型分派

**選擇**：openNodeDetail() 方法依 node.type 顯示不同內容

```
group/subsidiary 節點 → 公司詳情：聯絡資訊、簡介、子公司列表、部門列表
department 節點     → 部門詳情：主管、員工、責任、KPI、職能（已有）
```

**為什麼**：
1. 重用同一個 Modal 容器，透過 `@if (node.type !== 'department')` 切換區塊
2. 避免新建獨立 Modal 元件

### D3：公司編輯表單 — 三區塊佈局

**選擇**：將公司編輯表單分為三個 form-section 區塊

```
Section 1 基本資訊：名稱(required)、代碼、類型(group/subsidiary)、上級單位
Section 2 聯絡資訊：地址(full-width)、電話、Email(2-column)
Section 3 詳細資訊：統編、成立日期(2-column)、狀態(active/inactive)、簡介(textarea)
```

**為什麼**：與現有的部門編輯表單（6 區塊）風格一致，使用相同的 `.form-section` / `.form-row` / `.form-group` CSS 結構。

### D4：子部門支援 — 放寬 parent 類型驗證

**選擇**：`POST /departments` 的 parent 驗證從 `type IN ('group','subsidiary')` 改為 `type IN ('group','subsidiary','department')`

**替代方案**：
- 新增 'sub-department' type 到 org_units：增加類型複雜度，影響所有查詢
- 前端虛擬層級不存後端：資料不一致

**為什麼**：
1. org_units 的 parent_id 自參考已支援任意巢狀
2. level 欄位自動計算（parent.level + 1）
3. 前端 tree 構建邏輯已支援遞迴（buildTree computed）
4. 自動排列算法（subtreeWidth）已支援多層級

**需額外處理**：
- `DELETE /departments/:id` 新增子部門存在檢查
- 前端 `getValidChildTypes()` 允許 department → department

### D5：節點卡片增強 — 狀態標籤 + 部門數

**選擇**：group/subsidiary 節點卡片新增兩個資訊

```html
<!-- 狀態標籤：node header 右側 -->
<span class="org-node__status status--active">營運中</span>

<!-- 部門數：node meta 區域 -->
<span><i class="ri-organization-chart"></i> 7 部門</span>
```

**樣式**：
```scss
.org-node__status {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: $radius-full;
  &.status--active { background: rgba($color-success, 0.12); color: $color-success; }
  &.status--inactive { background: rgba($color-error, 0.12); color: $color-error; }
}
```

## Risks / Trade-offs

### R1：既有 group/subsidiary 資料無詳情欄位
- **風險**：現有 org_units 記錄的新欄位全為 NULL
- **緩解**：前端以 `node.address || '未設定'` 顯示，不影響現有功能

### R2：org_units 表膨脹
- **風險**：新增 8 個欄位讓 org_units 表更寬
- **緩解**：大多為 TEXT 欄位，SQLite 處理高效；且多數記錄（department type）不會填這些欄位

### R3：PUT /companies 需區分 null 與 undefined
- **風險**：前端送空字串 vs 不送欄位的語意不同
- **緩解**：後端用 `if (field !== undefined)` 判斷是否更新

## SQL Schema 變更

### org_units 表擴充（ALTER TABLE 遷移）

```sql
ALTER TABLE org_units ADD COLUMN code TEXT;
ALTER TABLE org_units ADD COLUMN address TEXT;
ALTER TABLE org_units ADD COLUMN phone TEXT;
ALTER TABLE org_units ADD COLUMN email TEXT;
ALTER TABLE org_units ADD COLUMN description TEXT;
ALTER TABLE org_units ADD COLUMN tax_id TEXT;
ALTER TABLE org_units ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE org_units ADD COLUMN established_date TEXT;
```

## Migration Plan

### Phase 1：後端（無前端破壞性）
1. org_units 表 ALTER TABLE 遷移（8 欄位）
2. 擴充公司 CRUD API（POST/PUT/GET 支援新欄位）
3. 擴充 GET /tree 回傳新欄位
4. POST /departments 放寬 parent 驗證
5. DELETE /departments 新增子部門檢查

### Phase 2：前端 Model + Service
1. OrgTreeNode 新增 9 個可選欄位
2. createCompany/updateCompany 送全欄位

### Phase 3：前端 UI
1. 公司詳情 Modal 恢復（聯絡資訊、簡介、子公司列表）
2. 公司編輯表單擴充（三區塊 11 欄位）
3. 節點卡片增強（部門數 + 狀態標籤）
4. 列表模式增強

### Phase 4：驗證
1. Angular 建置驗證
2. Playwright E2E 測試

**回滾策略**：Phase 1 為非破壞性變更（新欄位有默認值），可獨立回滾。Phase 2-3 為前端變更，git revert 即可。
