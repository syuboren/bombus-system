## Context

會議管理頁面（`/employee/meetings`）屬於 L1 員工管理模組。目前日曆的「公司」tab 和「個人」tab 缺少組織架構篩選下拉，會議列表也僅有類型與狀態篩選。此外，`meetings` 表的 `org_unit_id` 欄位雖已在後端路由中引用，但 DB schema 的 `subsidiaryMigrations` 陣列漏了 `meetings` 條目，導致該欄位實際不存在。建立會議時也無法指定歸屬部門。

### 現有元件與服務

- `OrgUnitService`（`core/services/org-unit.service.ts`）：提供 `subsidiaries` signal、`filterDepartments(subId)` computed、`loadOrgUnits()` 方法
- `meeting-page.component.ts`：已有 `selectedSubsidiaryId` / `filteredDepartments` / `selectedDepartment` signals，但僅在「部門」tab 使用
- `buildScopeFilters()` 方法：根據 calendarScope 組裝 API query params
- `saveMeeting()` 方法：已傳送 `org_unit_id`，但未傳送 `department`
- 模組識別色：`$module-color: $color-l1-sage`（鼠尾草綠 #8DA399）
- SCSS Mixins：`@include filter-bar($module-color)` 提供 `.filter-select` / `.filter-item` 樣式

## Goals / Non-Goals

**Goals:**

- 日曆各 tab 提供完整的組織架構篩選（公司 tab 加子公司；個人 tab 加子公司 + 部門）
- 會議列表 tab 加子公司 + 部門篩選
- 新增/編輯會議 modal 加歸屬欄位（子公司 + 部門），資料寫入 DB
- modal 出席人員選擇區加部門篩選
- 修正 `meetings` 表缺少 `org_unit_id` 欄位的 DB 遷移問題

**Non-Goals:**

- 不變更「部門」tab（已有完整篩選）
- 不新增權限控制或角色限制
- 不修改會議通知/提醒機制
- 不調整會議週期設定邏輯

## Decisions

### DB 遷移策略：idempotent ALTER TABLE

在 `tenant-schema.js` 的 `subsidiaryMigrations` 陣列新增 `{ table: 'meetings', index: 'idx_meeting_org_unit' }` 以補上 `org_unit_id` 欄位。另外用 try-catch 新增 `department TEXT` 欄位。選擇此方式而非修改 CREATE TABLE 語句，因為既有租戶資料庫已建立 meetings 表，ALTER TABLE 遷移才能涵蓋所有情境。

### 前端篩選：複用現有 signals

日曆各 tab 和會議列表複用 `selectedSubsidiaryId` 和 `selectedDepartment` 這兩個既有 signals，而非為每個 tab 建立獨立 signal。這樣切換 tab 時篩選狀態保持一致，簡化資料流。`buildScopeFilters()` 統一讀取這些 signals 來組裝 API query params。

### Modal 歸屬欄位：存入 newMeeting 物件

Modal 表單中的歸屬子公司與部門透過 `updateNewMeeting()` 寫入 `newMeeting` signal。`saveMeeting()` 從 `newMeeting` 讀取 `org_unit_id` 和 `department` 發送至後端。這符合既有的表單資料管理模式。

### Modal 出席人員篩選：獨立 signal

新增 `modalAttendeeDept` signal 和 `modalFilteredAttendees` computed，專門處理 modal 內的出席人員篩選。與全域 `selectedDepartment` 分離，避免 modal 內的篩選影響外部狀態。

### 後端 department 欄位：新增至 CREATE/UPDATE/GET

- `POST /api/meetings`：從 `req.body` 解構 `department`，加入 INSERT 語句
- `PUT /api/meetings/:id`：同上加入 UPDATE 語句
- `GET /api/meetings`：支援 `department` query param 篩選

## Risks / Trade-offs

- **[Risk] 既有會議 `org_unit_id` 和 `department` 為 NULL** → 可接受，篩選時 NULL 值在「全部」選項下仍會顯示
- **[Risk] `buildScopeFilters()` 邏輯複雜化** → 透過統一在方法內處理所有 scope 的 `orgUnitId` 和 `department` 來控制複雜度

## 修改檔案清單

| 層級 | 檔案路徑 | 變更摘要 |
|------|----------|---------|
| DB | `server/src/db/tenant-schema.js` | `subsidiaryMigrations` 加 meetings、新增 department 欄位遷移 |
| API | `server/src/routes/meetings.js` | CREATE/UPDATE 加 department、GET 加 department 篩選 |
| Model | `src/app/features/employee/models/meeting.model.ts` | `Meeting` interface 加 `department?: string` |
| Template | `src/app/features/employee/pages/meeting-page/meeting-page.component.html` | 各 tab 下拉、列表篩選、modal 歸屬 + 出席人員篩選 |
| TS | `src/app/features/employee/pages/meeting-page/meeting-page.component.ts` | `modalAttendeeDept` signal、`modalFilteredAttendees` computed、`buildScopeFilters()` 調整、`saveMeeting()` 傳 department |

## 複用服務與元件

- `OrgUnitService`：`subsidiaries`、`filterDepartments()`
- `NotificationService`：操作回饋
- SCSS：`@include filter-bar($module-color)`、`.filter-select` class、`.department-select` / `.employee-select` class
