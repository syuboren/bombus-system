## Why

會議管理頁面（L1 `/employee/meetings`）目前缺乏完整的組織架構篩選能力。日曆「公司」tab 無子公司下拉、「個人」tab 缺少部門篩選，會議列表也沒有子公司與部門的篩選欄位。更關鍵的是，建立會議時無法指定歸屬的子公司與部門，導致會議資料缺少組織歸屬，無法按組織架構回溯與管理。此問題在多子公司環境下尤為嚴重——管理者無法有效篩選自己負責範圍的會議。

## What Changes

- **日曆公司 tab**：新增子公司下拉選單，使用者可按子公司篩選公司層級會議
- **日曆個人 tab**：在員工下拉前新增子公司 + 部門下拉，提供級聯篩選
- **會議列表 tab**：篩選列新增子公司 + 部門篩選項目
- **新增/編輯會議 modal**：基本資訊區新增「歸屬子公司」與「歸屬部門」欄位，會議建立時寫入 DB
- **出席人員選擇**：modal 出席人員區塊新增部門篩選，方便從特定部門找人
- **DB schema**：`meetings` 表補上 `org_unit_id` 與 `department` 欄位（修正既有缺漏）
- **後端 API**：CREATE / UPDATE 寫入 `department`；GET 支援 `department` 查詢參數

### Non-goals（不在範圍內）

- 不變更日曆「部門」tab（已有完整的子公司 + 部門篩選）
- 不新增會議相關的權限控制或角色限制
- 不修改會議通知或提醒機制
- 不調整會議的週期設定邏輯

## Capabilities

### New Capabilities

（無新建 spec）

### Modified Capabilities

- `l1-subsidiary-filtering`：會議管理頁面各 tab 及會議列表需支援子公司與部門篩選
- `l1-subsidiary-attribution`：會議建立時除了 `org_unit_id`，還需寫入 `department` 欄位

## Impact

- **影響模組**：L1 員工管理（`/employee/meetings`）
- **影響路由**：`GET /api/meetings`、`POST /api/meetings`、`PUT /api/meetings/:id`
- **資料模型變更**：`meetings` 表新增 `org_unit_id TEXT`（補遷移）+ `department TEXT`
- **前端檔案**：
  - `features/employee/pages/meeting-page/meeting-page.component.html`
  - `features/employee/pages/meeting-page/meeting-page.component.ts`
  - `features/employee/models/meeting.model.ts`
- **後端檔案**：
  - `server/src/db/tenant-schema.js`
  - `server/src/routes/meetings.js`
