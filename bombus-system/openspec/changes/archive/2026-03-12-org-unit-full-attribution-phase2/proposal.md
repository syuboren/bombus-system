## Why

Bombus 在第一階段完成了員工檔案和職缺管理的子公司篩選後，集團管理者仍無法在招募管理、人才庫、會議管理三個頁面中依子公司查看資料。此外，所有新建/編輯操作（包含職缺、會議、人才）都沒有將 org_unit_id 寫入資料庫，導致新建的資料也無法被正確歸屬。L2 的 grade_tracks 表也存在前端已傳但後端未儲存的缺口。這使得子公司維度的資料管理功能無法真正運作。

**影響模組**：
- **L1 員工管理** (`/employee`)：招募管理（recruitment-page）、人才庫（talent-pool-page）、會議管理（meeting-page）、職缺管理（jobs-page）
- **L2 職能管理** (`/competency`)：職等軌道（grade_tracks 的 applyCreate/applyUpdate）

## What Changes

### 讀取篩選（GET）
- 招募管理 API：候選人列表透過 JOIN 職缺表，依子公司篩選
- 人才庫 API：人才列表和統計資料加入子公司篩選
- 會議管理 API：會議列表、儀表板統計和結論追蹤加入子公司篩選

### 建立/編輯寫入（POST/PUT）
- 職缺建立/更新：前端和後端完整傳遞 org_unit_id
- 會議建立/更新：INSERT/UPDATE 語句加入 org_unit_id 欄位
- 人才庫新增/更新：INSERT/UPDATE 語句加入 org_unit_id 欄位
- 人才庫「應徵職缺」和「匯入人才庫」操作：從關聯的職缺繼承 org_unit_id
- L2 職等軌道：applyCreate/applyUpdate 正確儲存 org_unit_id

### 前端子公司篩選 UI
- 招募管理頁面：新增子公司下拉選單 + 資料連動
- 人才庫頁面：新增子公司下拉選單 + 資料連動
- 會議管理頁面：已有下拉選單，補齊資料連動邏輯

### DB 遷移
- grade_tracks 表新增 org_unit_id 欄位（TEXT，nullable）

### 資料模型概覽

頂層表擁有自己的 org_unit_id，子表透過外鍵繼承：

| 頂層表（有 org_unit_id） | 子表（透過 FK 繼承） |
| --- | --- |
| jobs | candidates |
| meetings | meeting_attendees, meeting_agenda, meeting_conclusions |
| talent_pool | talent_contacts, talent_reminders |
| grade_tracks | （無直接子表） |

## Capabilities

### New Capabilities

- `l1-subsidiary-filtering`: L1 招募、人才庫、會議三個模組支援依子公司篩選列表資料和統計數據
- `l1-subsidiary-attribution`: L1 所有建立和編輯操作自動將記錄歸屬至目前選擇的子公司

### Modified Capabilities

（無現有 spec 需要修改）

## Non-goals（不在範圍內）

- **不修改子表結構**：interviews、meeting_attendees、candidate_education 等子表透過外鍵繼承 scope，不需要自己的 org_unit_id 欄位
- **不做歷史資料回填**：現有記錄保持 org_unit_id = NULL，視為未歸屬資料
- **不涵蓋 L3~L6 模組**：本次僅處理 L1 和 L2 的缺漏
- **不修改 grade_levels 表**：職等定義（G1~G7）保持全租戶共用
- **不做跨子公司資料複製功能**：僅做篩選和歸屬，不做「從 A 子公司複製到 B」

## Impact

- Affected specs: `tenant-isolation`（子公司級資料隔離擴展至 L1）、`rbac`（子公司 scope 篩選邏輯）
- Affected code:
  - `server/src/db/tenant-db-manager.js`（遷移加 grade_tracks）
  - `server/src/routes/recruitment.js`（GET 篩選 + importToTalentPool 繼承）
  - `server/src/routes/talent-pool.js`（GET 篩選 + POST/PUT 寫入 + apply-to-job 繼承）
  - `server/src/routes/meetings.js`（GET 篩選 + POST/PUT 寫入）
  - `server/src/routes/jobs.js`（PUT 更新 org_unit_id）
  - `server/src/routes/grade-matrix.js`（applyCreate/Update grade_tracks）
  - `src/.../services/interview.service.ts`（getCandidates 加 orgUnitId）
  - `src/.../services/talent-pool.service.ts`（getCandidates/stats + addCandidate）
  - `src/.../services/meeting.service.ts`（getMeetings/stats + createMeeting/updateMeeting）
  - `src/.../services/job.service.ts`（createJob payload）
  - `src/.../pages/jobs-page/jobs-page.component.ts`（createJob/updateJob 傳 org_unit_id）
  - `src/.../pages/recruitment-page/recruitment-page.component.{ts,html}`（加 dropdown + reactive）
  - `src/.../pages/talent-pool-page/talent-pool-page.component.{ts,html}`（加 dropdown + reactive）
  - `src/.../pages/meeting-page/meeting-page.component.ts`（reactive + create/update）
