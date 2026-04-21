## Why

目前招募流程中，面試官的選定時機錯置：HR 需等候選人回覆可用時段後，才在「安排面試時段」頁面選擇面試官。這導致三個實務問題：

1. **面試官時間未確認就發邀約**：HR 先把時段丟給候選人選，等候選人選完才發現面試官那個時間根本沒空，必須重跑邀約流程，候選人體驗差。
2. **面試官清單與真實員工脫鉤**：[schedule-interview-modal.component.ts:40-45](src/app/features/employee/components/schedule-interview-modal/schedule-interview-modal.component.ts#L40-L45) 硬編碼 4 位虛構人員（`INT-001`~`INT-004`），無法反映真實組織。
3. **面試與系統行事曆未整合**：面試安排後不會出現在 `meetings` 表，面試官無法透過系統內行事曆看到自己的面試排程，也無法偵測與其他會議/面試的時段衝突。

D-07 的調整把面試官選擇與衝突檢查提前到發邀約階段，並統一使用系統內建行事曆（不走 ICS 企業行事曆整合），讓 HR 在送出邀約前就確保面試官與候選人雙方皆無時段衝突。

## What Changes

### L1 招募流程調整（核心）

- **「發送面試邀約」頁新增面試官選擇**：[invite-candidate-modal](src/app/features/employee/components/invite-candidate-modal/invite-candidate-modal.component.ts) 新增「面試官」必填欄位，下拉清單呼叫 `GET /api/employee/list`，預設篩選「與職缺同部門」，每個選項顯示「姓名｜部門｜職稱」便於辨識。
- **建議時段顯示衝突狀態**：HR 新增/編輯建議時段時，即時呼叫新 API 檢查該面試官在該時段的可用性，UI 以標籤（可用／衝突+原因）標示，HR 可依此調整時段。
- **「安排面試時段」頁改為唯讀顯示面試官**：[schedule-interview-modal](src/app/features/employee/components/schedule-interview-modal/schedule-interview-modal.component.ts) 移除面試官下拉，改顯示邀約時已決定的面試官（唯讀），並在儲存前對最終時段再做一次衝突驗證。
- **時間選擇以 15 分鐘為單位**：兩個 modal 的時間輸入統一使用 `step="900"`，分鐘選項只有 `00 / 15 / 30 / 45`。
- **BREAKING**：`POST /api/recruitment/invitations` 新增必填欄位 `interviewerId`，無此欄位的舊呼叫將回 `400`。

### L1 衝突檢查與行事曆整合

- **新增衝突檢查 API**：`POST /api/recruitment/interviews/check-conflicts` 接收 `interviewerId`、`candidateId`、`slots[]`，回傳每個時段的衝突清單（交叉查詢 `interviews` + `meeting_attendees`），衝突粒度對齊 15 分鐘。
- **硬擋衝突**：`POST /api/recruitment/invitations` 與 `POST /api/recruitment/interviews` 在建立前呼叫衝突檢查，若存在重疊即回 `409` 並附衝突明細，不允許覆寫。
- **面試同步寫入 `meetings`**：`POST /api/recruitment/interviews` 成功後，同步建立一筆 `meetings` 紀錄（type=`interview`），並把面試官、候選人（以外部參與者身份）寫入 `meeting_attendees`，讓面試官在行事曆頁看得到面試排程。

### 資料模型

- `invitations` 表新增 `interviewer_id INTEGER`（儲存 HR 發邀約時選定的面試官）。
- `interviews.interviewer_id` 由字串改為 `INTEGER`，新增 FK → `employees.id`；遷移腳本需把既有 `INT-001`~`INT-004` 映射到 demo 員工資料。
- 雙遷移清單同步更新：`tenant-schema.js` + `tenant-db-manager.js`。

### Demo 資料

- `/seed-verify` 後調整種子資料，把既有硬編碼面試官對應到實際 demo 員工（如技術主管 → demo 員工 E000x）。

## Capabilities

### New Capabilities

- `interview-invitation-flow`：面試邀約頁的資料流與 UI，包含面試官選擇、15 分鐘時間粒度、安排面試頁的唯讀顯示、兩階段衝突驗證（發邀約時 + 最終排程時）。
- `interview-calendar-integration`：面試與系統內行事曆的雙向同步能力，包含衝突檢查 API、`interviews` ↔ `meetings` 同步、`meeting_attendees` 參與者寫入。

### Modified Capabilities

(none)

## Impact

- **影響模組**：L1 員工管理（招募子模組）
- **影響路由**：`/employee/jobs/:id/candidates`（發邀約入口）、`/employee/candidates/:id`（安排面試入口）
- **影響 API**：
  - `POST /api/recruitment/invitations`（新增 `interviewerId` 欄位 + 衝突硬擋）
  - `POST /api/recruitment/interviews`（interviewer_id 型別改為 INTEGER + 衝突硬擋 + 同步 meetings）
  - `POST /api/recruitment/interviews/check-conflicts`（新端點）
- **影響前端檔案**：
  - [invite-candidate-modal.component.ts](src/app/features/employee/components/invite-candidate-modal/invite-candidate-modal.component.ts) / .html / .scss
  - [schedule-interview-modal.component.ts](src/app/features/employee/components/schedule-interview-modal/schedule-interview-modal.component.ts) / .html
  - [interview.service.ts](src/app/features/employee/services/interview.service.ts)（新增 checkConflicts 方法）
- **影響後端檔案**：
  - [server/src/routes/recruitment.js](server/src/routes/recruitment.js)（修改 invitations / interviews endpoints，新增 check-conflicts）
  - [server/src/db/tenant-schema.js](server/src/db/tenant-schema.js)（invitations.interviewer_id、interviews.interviewer_id FK 遷移）
  - [server/src/db/tenant-db-manager.js](server/src/db/tenant-db-manager.js)（同步遷移清單）
- **影響種子資料**：`server/src/db/seed/` 相關面試/邀約資料
- **多租戶影響**：所有變更均在 tenant schema 層，各租戶獨立
- **相鄰功能風險**：`interview-decision-page` 讀取 `interviews.interviewer_id`，需驗證資料遷移後決策頁仍可正確顯示面試官姓名
