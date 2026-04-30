## Context

Bombus 多租戶 SaaS 平台目前的「組織架構圖」功能（位於 `tenant-admin/pages/org-structure-page`）僅提供單筆部門新增——`POST /api/organization/departments` 接受 `{ name, companyId }` 並同時 INSERT `org_units`（type=department）與 `departments` 兩張表。新租戶上線時必須逐筆輸入每個部門名稱，使用者反映耗時且容易遺漏。

平台層 `platform-db.js` 已有 `tenants.industry TEXT`（free-form），但無標準化 lookup，導致後續無法以「產業」為篩選條件提供標準化能力。租戶層 `departments` 表已有 `responsibilities/kpi_items/competency_focus` 三個 JSON 陣列欄位，但 D-16 討論決定範本僅承載「Value（取代 responsibilities 語意）」，並一併把欄位重新命名以避免「責任清單」與「最終產出價值」的概念漂移。

既有約束：
- sql.js 1.13 內建 SQLite ≥ 3.41，支援 `ALTER TABLE RENAME COLUMN`
- sql.js `db.export()` 在 transaction 中會 ROLLBACK——`db-adapter.js` 已修復，照常用 `db.transaction()` 即可
- 雙清單遷移：`tenant-schema.js:initTenantSchema()` 與 `tenant-db-manager.js:_runMigrations()` 必須同步加入 RENAME COLUMN
- L0-RBAC：平台路由走 `authMiddleware + platformAdminMiddleware`、租戶路由走 `authMiddleware + tenantMiddleware`；租戶讀範本透過 `getPlatformDB()` 唯讀，無跨 DB 交易

利害關係人：
- 系統管理商（platform admin）：維護範本字典、產業類別
- 租戶管理員（super_admin / hr_manager）：使用三入口建立部門
- L2 職能管理：JD 自有 `job_descriptions.responsibilities`，本提案不動

## Goals / Non-Goals

**Goals：**
- 把「新租戶建立 10+ 部門」從 10+ 次表單操作壓縮成「選產業 → 選規模 → 勾選 → 確認」四步驟
- 建立平台級「產業類別」標準化 lookup，為未來功能（產業別範本擴充、跨租戶基準分析）奠基
- 範本維護一份、所有租戶共享最新版本，平台管理員修改即時生效
- 三入口（自行 / 範本 / CSV）共用衝突預檢/確認子流程，UX 一致
- 雙遷移清單同步、保證新舊租戶資料一致

**Non-Goals：**
- 不支援部門子層階層（範本只到第一層）
- 不在範本中預填 KPI 事項或職能框架分類
- 不提供範本版本管理或歷史快照
- 不處理「同一部門跨產業內容差異化」
- 不影響 L2 職務說明書的 `responsibilities` 欄位
- Redis / 分布式快取屬 D-17 範圍

## Decisions

### Junction schema for industry × department × size

採用三表結構（platform DB）：

```sql
CREATE TABLE industries (
  code TEXT PRIMARY KEY,                  -- 'manufacturing', 'tech', ...
  name TEXT NOT NULL,                     -- '製造業', '科技業', ...
  display_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE department_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                     -- '製造部門', '人資部', ...
  value TEXT DEFAULT '[]',                -- JSON array of strings（與 departments.value 同格式）
  is_common INTEGER DEFAULT 0,            -- 1 = 跨產業共通部門
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE industry_dept_assignments (
  id TEXT PRIMARY KEY,
  industry_code TEXT NOT NULL REFERENCES industries(code),
  dept_template_id TEXT NOT NULL REFERENCES department_templates(id) ON DELETE CASCADE,
  sizes_json TEXT NOT NULL DEFAULT '[]',  -- JSON array: ['micro','small','medium','large']
  display_order INTEGER DEFAULT 0,
  UNIQUE(industry_code, dept_template_id)
);
```

**Why Junction over flat tags：** 同一部門（如「業務部」）在不同產業的適用規模可不同（製造業 [中,大]、零售業 [微,小,中,大]），junction 自然表達；若用 flat `industries[]/sizes[]` 標籤，需強制全產業共用同一組 sizes，彈性不足。Junction 也讓平台管理 UI 自然以「產業」為主視角呈現。

**Alternatives considered：**
- Flat schema with tags（rejected）— sizes 跨產業差異需求無法直接表達
- Per-industry duplicated dictionary（rejected）— 共通部門（HR/Finance）會被重複維護

### Industry standardization via lookup + FK migration

`tenants.industry` 由 free-form `TEXT` 改為 `TEXT REFERENCES industries(code)`。既有租戶的字串值用對映表處理：

```js
const INDUSTRY_MIGRATION_MAP = {
  '製造業': 'manufacturing', '製造': 'manufacturing', 'Manufacturing': 'manufacturing',
  '科技業': 'tech', '科技': 'tech', 'Technology': 'tech',
  '服務業': 'service', 'Service': 'service',
  // ... 約 8-10 個主要產業
};
// 無法對映者寫入 'other' code 並 console.warn 提醒平台管理員手動修正
```

遷移時機：`platform-db.js:createPlatformTables()` 內以冪等檢查執行（先建 industries 表 + seed 預設值，再以 PRAGMA 檢查是否已遷移）。

**Alternatives considered：**
- CHECK constraint（rejected）— 將 enum 寫死 SQL，未來新增產業需 schema 遷移
- 保留 free-form 但加 `industry_code` 欄位並存（rejected）— 兩個欄位易產生分歧

### Rename departments.responsibilities → value（限 departments）

雙清單同步加入 RENAME COLUMN：

```js
// tenant-schema.js deptMigrations 與 tenant-db-manager.js _runMigrations()
const cols = db.exec('PRAGMA table_info(departments)')[0]?.values?.map(r => r[1]) || [];
if (cols.includes('responsibilities') && !cols.includes('value')) {
  db.run('ALTER TABLE departments RENAME COLUMN responsibilities TO value');
}
```

格式維持 `TEXT DEFAULT '[]'` JSON array of strings。UI 端 `org-structure-page` form 邏輯（addListItem/removeListItem）保留，僅標籤文字改稱「Value」。

**為何只改 departments：** `job_descriptions.responsibilities` 屬 L2 職能管理範疇，語意是「職務說明書的職責清單」，與部門的 Value 為兩個不同概念。雖然欄位名相同，但兩者並無語意關聯，避免「為了統一而統一」造成 L2 不必要破壞。

### Three entry points share validate/execute subflow (modeled on batch-employee-import)

「新增部門」按鈕展開為三選項，後二者共用同一服務並對齊既有 `routes/batch-import.js` 的 `validate → execute` 兩階段模式：

```
              ┌──────────────────────────────┐
              │ DeptImportService            │
              │  • parseCsv(file): items[]   │
              │  • validateImport(            │
              │      companyId, items, mode  │
              │    ): { conflicts[], ok[] }  │
              │  • executeImport(             │
              │      companyId, items, mode  │
              │    ): { created[], updated[]}│
              └──────────────────────────────┘
                 ▲                    ▲
                 │                    │
        範本庫導入                批次匯入
        （items 來自勾選）        （items 來自前端 CSV 解析）
```

對應端點：
- `POST /api/organization/companies/:id/departments/import/validate` — 接受 JSON `{ items, mode }`（items 來自範本勾選或前端解析後的 CSV），回傳 `{ totalRows, validRows, errorRows, conflicts[], to_insert[] }`，**不寫入 DB**
- `POST /api/organization/companies/:id/departments/import/execute` — 接受 JSON `{ items, mode }`，包 transaction 寫入

**Why a shared service & validate-then-execute pattern：** 範本與 CSV 的差別只在 `items[]` 來源，後續預檢、衝突展示、寫入皆相同；統一服務層避免兩條路徑邏輯漂移。命名與 `batch-import.js` 對齊降低後端開發者學習成本。CSV 解析（UTF-8 + BOM 偵測、欄位對映、row-numbered errors）由**前端**完成，與 `batch-import.js` 既有架構（後端只收 `req.body.rows`）一致——後端是純 JSON-only 的，不接收 multipart 上傳。

### Pre-check defaults vs hard filter

選產業 + 規模後，UI **列出該產業全部部門**（含共通池納入），規模符合者預勾、不符者不預勾，但全部可手動切換。提供：
- 全選 / 全取消 / 恢復智慧預設 三顆按鈕
- 每筆顯示 `applicable_sizes`（讓使用者理解平台建議的適用規模）

**Why not hard filter：** 客戶情境多元——一家「即將擴張到中型」的小公司可能想預先把中型才用的「PMC 部門」一併建好。智慧預設兼顧引導與彈性。

API 設計：`GET /api/organization/department-templates?industry=&size=` 回傳該產業全部 assignment + 每筆的 `pre_checked: boolean` 旗標（後端依當前 size 是否在 sizes_json 內計算）。回應同時帶出該範本的 `applicable_sizes` 陣列，前端用來在每筆 row 顯示適用規模標籤。

### Conflict detection key

衝突檢查以 `(parent_id = companyId, name)` 為主鍵，從 **`org_units`** 表（type='department'）查詢——而非 `departments` 擴充表。原因：兩表可能不一致（D-16 之前的舊資料、過去刪除流程留下孤兒列），`org_units` 才是組織樹 UI 的真實來源；以它為衝突源能保證匯入流程與使用者所見口徑一致。

`POST /departments` 單筆建立流程也 SHALL 同步 dedup 兩表（既有 `departments` 檢查 + 新增 `org_units` 檢查），所有部門新增路徑共享同一真相。

匯入模式：
- **覆蓋（overwrite）**：對同名衝突以 `(name, targetOrgUnitId)` 為 key 更新 `departments.value`（保留 ID、不影響員工綁定）；若 UPDATE 匹配 0 列（孤兒情境：`org_units` 有對應但 `departments` 行缺失）則 fallback INSERT 補建，恢復雙表一致；無衝突項目正常 INSERT
- **合併（merge）**：跳過所有同名衝突，僅 INSERT 無衝突項目

validate 階段不寫入 DB，僅回傳 `{ totalRows, validRows, errorRows, conflicts: [{ name, existing_id, ... }], to_insert: [...] }`（與 batch-import.js validate 端點同一響應形狀；其中 `existing_id` 為 `org_units.id`，反映樹真實狀態），前端用 `conflict-confirm-modal` 列出衝突供使用者最終確認。

### Atomic batch write with transaction

批次匯入跨多筆，每筆需同時 INSERT `org_units`（type=department）與 `departments`，必須包 `db.transaction()`：

```js
req.tenantDB.transaction(() => {
  for (const item of items) {
    if (mode === 'overwrite' && conflictMap.has(item.name)) {
      // UPDATE departments SET value = ? WHERE id = ?
    } else {
      // INSERT INTO org_units (id, name, type='department', parent_id, level)
      // INSERT INTO departments (id, name, org_unit_id, value)
    }
  }
});
```

`db-adapter.js` 已處理 sql.js 的 export/transaction 互斥問題（`_inTransaction` 旗標），交易中錯誤會正確 ROLLBACK。

### Code generator hook for D-15

匯入時，每個新部門的 code 預留呼叫點：

```js
const code = await codeGenerator.tryNext('department', { tenantId, orgUnitId })
            || null;  // D-15 未啟用時為 null，沿用既有「無 code」狀態
```

D-15 完成前回傳 null；D-15 啟用後自動套用前綴規則。本提案不實作 codeGenerator 本身，僅預留呼叫接口。

### Platform admin UX: industry-first navigation

平台管理頁採「產業導覽 + 共通池雙視角」結構（避免 flat table 維護地獄）：

```
左側產業列表 (含共通部門池；assignment_count 隨指派變動即時刷新)
右側：選定產業的 assignment 列表
    + [新增該產業專屬]
    + [從共通池納入]
    + 每筆 [編輯]（開啟統一彈窗：名稱 + Value + 適用規模）
    + 每筆 [移除]（解除該產業對該範本的指派，不刪範本本身）
編輯共通部門 → 跳轉「共通池」分頁開啟同類型彈窗（僅名稱 + Value）
```

**Why unified modal over inline sizes-only editing：** 第一版設計只開放 sizes 行內編輯，但實際使用回饋發現：(1) 名稱與 Value 才是平台管理員最常需要微調的欄位、(2) Value 必須跨產業同步（共通範本）這層語意行內編輯難以表達警示。改成統一彈窗一次處理三欄，並在共通範本附上跨產業同步警示，整體心智負擔反而更低。

模組識別色：使用 SaaS 後台中性色系（沿用 `admin-portal` spec 既有風格），不掛 L1~L6 模組色。元件依 [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md) Soft UI 風格，使用 `@include card`、`@include data-table`、`@include button-base`，圓角 12px、間距 24px。

## Risks / Trade-offs

- **Risk：雙清單遷移漏一邊** → Mitigation：實作時把 RENAME 邏輯抽成共用 helper（如 `migrations/rename-dept-responsibilities.js`），於兩處 `require` 同一函式；測試需涵蓋「新建租戶」與「升版舊租戶」兩個路徑

- **Risk：industries 對映表無法涵蓋所有既有租戶字串** → Mitigation：未匹配的字串寫入 `'other'` code 並 audit log 記錄；平台管理員可在升版後檢視並手動修正

- **Risk：批次匯入 transaction 失敗回滾後使用者狀態混亂** → Mitigation：execute 端點失敗時回傳 500 含整體錯誤訊息與空 `partial: { created: [], updated: [], skipped: [] }`；前端清楚提示「整批失敗、需重試」並保留勾選狀態。註：sql.js + tenantDB.transaction 包整批，無法精準辨識 mid-batch 失敗第 N 列；硬要支援需拆 per-row 子交易，成本高效益低，不在第一版實作。

- **Risk：覆蓋模式可能誤改已有員工綁定的部門 Value** → Mitigation：覆蓋僅更新 `value` 欄位，不動 `departments.id`、`org_unit_id`、`manager_id`、員工關聯；衝突確認頁明確顯示「將更新 N 個部門的 Value，員工綁定不受影響」

- **Risk：CSV 上傳大檔案造成前端解析卡頓** → Mitigation：限制 CSV 最大 1000 列；超過時拒收並提示分批上傳；解析使用 streaming 讀取（避免一次性 JSON.stringify 大物件）

- **Trade-off：範本維護一份、租戶不可客製範本本身** → 理由：客戶痛點是「初次建立省力」，範本即時更新對所有租戶有利；若租戶要客製，匯入後在組織頁面編輯該部門即可

- **Trade-off：Junction 比 flat tags 多一張表** → 理由：彈性與管理 UX 直觀度的代價可接受；表結構簡單、查詢性能差異可忽略

## Migration Plan

部署順序：
1. **Backend 升版**：
   - 升版前：備份 `data/platform.db`、所有 `data/tenants/*.db`
   - 升版後 `platform-db.js:initPlatformDB()` 自動建立 industries / department_templates / industry_dept_assignments 三表並 seed 預設產業
   - 自動執行 `tenants.industry` 字串對映遷移（冪等，重複執行安全）
   - 各租戶 DB 在下次 `loadTenantDB()` 觸發時自動執行 `_runMigrations()`，含 RENAME COLUMN（冪等）
2. **Frontend 升版**：與後端同版本部署；舊版前端打到新版後端時 `responsibilities` 欄位仍透過 API 回傳「`value` alias」相容（API 端兼容期保留 `responsibilities` 別名 1 個版本）
3. **平台管理員操作**：升版後登入平台後台 → 產業類別維護頁面 → 確認 8-10 個預設產業已就緒；部門範本管理頁面 → 由平台管理員依客戶實際業界補齊範本內容
4. **租戶通知**：透過系統公告提示「公司頁新增部門已支援範本快速導入」

回滾策略：
- 若升版後發現重大問題，可：
  1. 還原 backup（platform.db + 各 tenant.db）
  2. 還原前後端版本
- DB 結構變更為**新增 + 改名**，無刪除動作；rename column 可逆（再執行 `ALTER TABLE departments RENAME COLUMN value TO responsibilities`）

## Resolved Decisions

以下四題為原本的 Open Questions，已於 2026-04-29 經 stakeholder 拍板：

1. **預設提供的產業類別（12 個）：**
   - 資訊服務業 (`it-services`)
   - 科技業 (`tech`)
   - 製造業 (`manufacturing`)
   - 零售業 (`retail`)
   - 餐飲業 (`food-service`)
   - 醫療機構 (`healthcare`)
   - 金融業 (`finance`)
   - 非營利組織 (`nonprofit`)
   - 教育業 (`education`)
   - 建築業 (`construction`)
   - 物流業 (`logistics`)
   - 其他 (`other`)

   固化於 `industries` 表的 seed 資料；display_order 依上述順序由 10 遞增至 110，`other` 為 999。

2. **首發部門範本內容：每個產業 7-12 個常見部門。**
   實作 `server/src/db/seeds/dept-template-seed.js` 內建：
   - 共通池（`is_common=1`）8 個：人資部、財務部、資訊部、行政管理部、法務部、行銷部、業務部、採購部
   - 各產業專屬 4-7 個（具體清單見 `specs/department-template-import/spec.md` 的「First-run seed of department templates per industry」requirement）
   - 透過 `industry_dept_assignments` 把共通池掛到全部 12 個產業，使每個產業可見部門數達 7-12 個

3. **CSV 編碼：僅支援 UTF-8 / UTF-8 BOM。**
   實作上參考 `server/src/routes/batch-import.js`（員工批次匯入）的整體模式：**前端**負責 CSV 解析（BOM 偵測剝離、row-numbered errors、欄位對映），**後端**僅接收 JSON `req.body.rows`/`req.body.items` 已解析陣列。Big5 等其他編碼由前端明確拒收並提示使用者轉碼。

4. **範本變更不做主動通知。**
   範本更新後，租戶在「下次點開範本庫導入」時自動看到最新版。第一版不實作 push notification、Email 公告或站內訊息。
