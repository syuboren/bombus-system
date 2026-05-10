## Why

現有租戶管理的「組織架構圖」功能在新增子公司部門時，必須逐筆手動 key 入每個部門名稱，使用者反映耗時且容易出錯。新租戶上線時尤其痛苦——一家中型製造業公司動輒要建立 10+ 個部門，從零開始輸入嚴重拖慢初始導入體驗。

商業價值：透過「平台維護 → 全租戶共享」的範本機制，把使用者「從零建構組織」的負擔降到「按產業×規模勾選」的數分鐘工作。同時藉由標準化產業分類，為未來功能（產業別範本擴充、跨租戶基準分析）奠定資料基礎。

## What Changes

新增能力：
- 系統管理商於平台後台維護「部門範本字典」（部門名稱 + Value 條列），並依產業×規模分類掛載
- 平台後台新增「產業類別」維護（取代現有 free-form text，建立標準化 lookup）
- 租戶端「公司頁面 → 新增部門」按鈕展開為三選項：自行新增（沿用現行）/ 範本庫導入 / CSV 批次匯入
- 範本庫導入流程：選產業（必選）→ 選規模（必選）→ 列出該產業全部部門（規模符合者預勾，使用者可手動覆寫；提供全選/全取消/恢復智慧預設）→ 選擇匯入模式 → 預檢顯示衝突 → 確認寫入
- CSV 批次匯入流程：上傳檔案（欄位：name 必填、value 選填）→ 系統驗證 → 選擇匯入模式 → 預檢顯示衝突 → 確認寫入
- 兩種匯入路徑共用「預檢 → 衝突確認 → 寫入」子流程；衝突檢查 key 為 `(當前公司 org_unit_id, departments.name)`；匯入模式分覆蓋（取代同名）/ 合併（保留現有，僅新增無衝突）

模組與路由影響：
- L0-SaaS（平台管理）：新增 `/platform/department-templates`、`/platform/industries`
- 租戶管理：擴充 `/admin/org-structure`（新增部門入口）
- 不影響 L1~L6 業務模組

資料模型概述：
- Platform DB 新表：`industries(code, name, display_order, is_active)`、`department_templates(id, name, value, is_common)`、`industry_dept_assignments(industry_code, dept_template_id, sizes_json, display_order)`
- Platform DB 修改：`tenants.industry` 由 free-form TEXT 改為 FK ref `industries.code`，含舊資料對映腳本
- Tenant DB 修改：**BREAKING** `departments.responsibilities` 重新命名為 `departments.value`（限 departments 表；JD 表的 responsibilities 不動）；格式維持 JSON array of strings；UI 標籤改稱「Value」

連動既有提案：
- D-11（部門結構管理）範圍縮小：「範本庫連動」由本提案吃下
- D-15（代碼命名規則）：匯入時若已啟用則新部門 code 走 codeGenerator.next()——介面預留 hook，實際生效隨 D-15 啟用

## Non-Goals

- 不支援部門子層階層（範本只到第一層；子組由租戶匯入後自行新增）
- 不在範本中預填 KPI 事項或職能框架分類（這些由租戶於部門詳情自行編輯）
- 不提供「範本版本管理」或「歷史快照」（所有租戶看到的就是最新版本）
- 不處理「同一部門跨產業內容差異化」的進階需求（共通部門使用單一定義）
- 不影響 L2 職務說明書（JD）的 responsibilities 欄位（為避免命名衝突，僅 departments 表進行 rename）
- Redis / 分布式快取不在此提案範圍（屬 D-17）

## Capabilities

### New Capabilities

- `department-template-import`: 平台維護部門範本 + 租戶端三入口（自行新增 / 範本庫導入 / CSV 批次匯入）+ 衝突預檢/確認/匯入子流程
- `industry-classification`: 平台級產業類別 lookup（標準化 code），供 `tenants.industry` 與 `industry_dept_assignments` 引用

### Modified Capabilities

- `tenant-management`: `tenants.industry` 由 free-form text 改 FK ref `industries.code`；建立/編輯租戶時 industry 必須從 lookup 選擇
- `admin-portal`: 平台管理後台新增「部門範本管理」與「產業類別維護」兩個頁面入口

## Impact

- Affected specs:
  - 新建 `specs/department-template-import/`、`specs/industry-classification/`
  - Modified `specs/tenant-management/`、`specs/admin-portal/`
- Affected backend:
  - `server/src/db/platform-db.js`（新建 3 表 + 既有 tenants.industry 遷移）
  - `server/src/db/tenant-schema.js` 與 `server/src/db/tenant-db-manager.js`（雙清單同步：departments rename column）
  - `server/src/routes/platform.js`（或拆 `routes/platform-templates.js` / `platform-industries.js`）
  - `server/src/routes/organization.js`（新增 import preview/commit 端點 + responsibilities → value）
  - `server/src/routes/job-descriptions.js`（**不動**——JD 自有 responsibilities）
  - `server/src/services/dept-import.service.js`（新建：CSV 解析 + 衝突檢查 + transaction 包裹的批次寫入）
  - `server/src/tests/test-org-tree-api.js`（responsibilities → value）
- Affected frontend:
  - 新建 `features/platform-admin/pages/department-template-page/`、`features/platform-admin/pages/industry-management-page/`
  - 新建彈窗元件：`import-from-template-modal`、`import-from-csv-modal`、`conflict-confirm-modal`
  - 擴充 `features/tenant-admin/pages/org-structure-page/`（「新增部門」三選項）
  - 擴充 `features/organization/services/organization.service.ts`、`features/platform-admin/services/platform-admin.service.ts`
  - 修改 `features/organization/models/organization.model.ts`（responsibilities → value）
  - 不動 `features/competency/`（JD 相關保留 responsibilities）
- Affected APIs:
  - 新增 9 個端點（Platform: 3 組 CRUD；Tenant: 1 GET + 2 POST，後者依 batch-import.js 模式採 `import/validate` + `import/execute` 兩階段）
  - 修改 `PUT /api/organization/departments/:id` 接受 `value`（取代 `responsibilities`）
- 部署注意事項：
  - 平台 DB 遷移腳本需在升版時執行一次（建立 industries 表 + 對映既有 tenants.industry 字串）
  - 各租戶 DB 自動於下次載入時 RENAME COLUMN（雙清單冪等檢查）
- 風險與技術考量：
  - 批次寫入須包 transaction 以維持 org_units + departments 兩表原子性
  - sql.js export() 在交易中行為已於 `db-adapter.js` 修復，照常使用 `db.transaction()` 即可
  - 雙清單遷移漏一邊會造成新舊租戶不一致——必須兩處同步修改並用 PRAGMA 檢查冪等
