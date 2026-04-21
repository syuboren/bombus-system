## Context

**現行流程**
L1 招募模組目前的面試排程流程：

```
HR 發邀約 (invite-candidate-modal)     候選人回覆可用時段          HR 安排面試 (schedule-interview-modal)
──────────────────────────────    ──────────────────────    ──────────────────────────────
- 邀約訊息                              - 從建議時段中挑選           - 日期 / 時間
- 建議時段 (1~N 個)                    - 或要求改期                - 面試官（硬編碼 4 位）← 問題點
                                                                  - 面試方式 / 地點
```

**四個缺陷**：
1. 面試官延後到最後一步才指定，HR 無法預先確認面試官檔期，常發生候選人選了時段後面試官卻沒空
2. [schedule-interview-modal.component.ts:40-45](src/app/features/employee/components/schedule-interview-modal/schedule-interview-modal.component.ts#L40-L45) 硬編碼 `INT-001`~`INT-004`，與真實員工資料斷裂
3. 無衝突檢查：同一面試官可被重複排在同一時段
4. 面試不進 `meetings` 表，面試官無法透過系統內行事曆看到自己的排程

**既有基礎設施**
- **員工清單 API** `GET /api/employee/list`（支援 `dept` / `status` / `org_unit_id` 篩選）✅
- **行事曆資料模型** `meetings` + `meeting_attendees` + `meeting_reminders`（[tenant-schema.js:1198-1238](server/src/db/tenant-schema.js#L1198-L1238)）✅
- **行事曆前端服務** [meeting.service.ts](src/app/features/employee/services/meeting.service.ts) ✅
- **招募 API 層** [server/src/routes/recruitment.js](server/src/routes/recruitment.js)（POST invitations、POST interviews、invitation response）✅

**約束**
- 多租戶 SaaS：所有變更在 tenant schema 層，每租戶獨立遷移
- sql.js `db.export()` 在 BEGIN..COMMIT 內會毀壞 transaction，需遵循 [db-adapter.js](server/src/db/db-adapter.js) 既有 `_inTransaction` 機制
- 雙遷移清單：`tenant-schema.js` + `tenant-db-manager.js` 必須同步
- 不使用 ICS / 企業行事曆整合，統一使用系統內建行事曆

## Goals / Non-Goals

**Goals:**

- HR 在發邀約階段就決定面試官，並在送出前確認該面試官在所有建議時段的可用性
- 面試官清單來自實際員工資料（`employees` 表），支援依職缺部門預設篩選
- 面試排程後自動出現在系統內行事曆（`meetings`），讓面試官可見
- 時間選擇粒度限制為 15 分鐘，避免 14:07 這種難以對齊的時段
- 衝突採硬擋策略：存在重疊時 API 回 409，UI 阻止送出

**Non-Goals:**

- **不整合企業行事曆**：本變更不涉及 Google Calendar / Outlook / ICS 匯出匯入
- **不支援多面試官（Panel Interview）**：同一場面試仍僅一位面試官；若未來需要面試小組，會另開變更擴充 `meeting_attendees` 語意
- **不允許覆寫衝突**：不提供「知道衝突仍要排」的選項，避免 HR 誤按。若實務有跨部門協調需求，先請 HR 與面試官溝通調整既有排程
- **不做智慧時段推薦**：系統只回報衝突，不主動建議替代時段
- **不重構 interview-decision-page**：決策頁只因 `interviewer_id` 型別變更而調整讀取邏輯，流程本身不動
- **不支援面試取消後自動釋放 meeting 紀錄的行事曆提醒**：僅同步建立，取消邏輯（`interviews.cancelled_at`）同步更新 `meetings.status` 即可，不做額外推播

## Decisions

### Decision: 選用「全員工可選 + 依部門預設篩選」而非「面試官白名單」

**選項比較：**

| 方案 | 優點 | 缺點 |
|------|------|------|
| 全員工可選，依職缺部門預設篩選 | 簡單、彈性、無需額外旗標 | 理論上任何員工都可被選為面試官 |
| 在 `employees` 加 `is_interviewer` 旗標 | 明確白名單 | 多一層維護、需先建立設定畫面 |
| 依角色/職等自動判定 | 不需人工維護 | 規則複雜、例外多 |

**決定**：全員工可選 + 預設篩選「與職缺同部門（active 在職）」。

**理由**：
- 實務上台灣中小企業面試官經常跨部門（技術長可面試產品職、行銷副總可面試業務職）
- 加白名單旗標會要求 HR 先做設定，增加首次使用成本
- 下拉清單顯示「姓名｜部門｜職稱」讓 HR 一眼辨識是否誤選
- 預設篩選同部門，HR 可取消篩選看全員

### Decision: 衝突檢查採「前端即時預檢 + 後端建立前硬擋」雙保險

**選項比較：**

| 方案 | 優點 | 缺點 |
|------|------|------|
| 僅後端檢查 | 實作簡單 | UI 反饋慢，HR 要送出才知道衝突 |
| 僅前端檢查 | 即時反饋 | 可被繞過、不適合多人同時操作 |
| 前端預檢 + 後端硬擋 | 體驗好 + 資料安全 | 兩邊實作 |

**決定**：採雙保險。前端每次時段變動都呼叫 `POST /api/recruitment/interviews/check-conflicts`（debounce 300ms），即時以標籤顯示各時段狀態；後端 `POST /api/recruitment/invitations` 與 `POST /api/recruitment/interviews` 建立前再做一次檢查，若衝突回 `409` + `{ conflicts: [...] }`。

**理由**：UI 即時標示讓 HR 能直接調整（Q6 選 c）；後端強制檢查防止多人同時發邀約時 race condition 造成 double-booking。

### Decision: 衝突檢查涵蓋「面試官行程 + 候選人既有面試」雙向範圍

**邏輯**：給定 `(interviewerId, candidateId, slotStart, slotEnd)`：

```sql
-- 面試官衝突：該人在此區間內的面試 or 會議出席
SELECT ... FROM interviews WHERE interviewer_id = ? AND cancelled_at IS NULL
  AND time_overlap(interview_at, interview_at + 60min, ?, ?)
UNION
SELECT ... FROM meeting_attendees ma JOIN meetings m ON ma.meeting_id = m.id
  WHERE ma.employee_id = ? AND m.status != 'cancelled'
  AND time_overlap(m.start_time, m.end_time, ?, ?)

-- 候選人衝突：該候選人在此區間的其他面試
SELECT ... FROM interviews WHERE candidate_id = ? AND cancelled_at IS NULL
  AND time_overlap(interview_at, interview_at + 60min, ?, ?)
```

**面試預設長度**：以 60 分鐘計算衝突區間（目前系統無 `duration` 欄位，後續若需彈性化可另擴充）。

**15 分鐘對齊**：所有時段輸入會在後端先向下取整到最接近的 15 分鐘邊界（`Math.floor(timestamp / 900) * 900 * 1000`），避免 14:07 與 14:15 被判為不重疊。

### Decision: 面試建立時同步寫入 `meetings` 表，採「同 transaction + 鏡像關聯」策略

**選項比較：**

| 方案 | 優點 | 缺點 |
|------|------|------|
| 只存 `interviews`，行事曆查詢時 JOIN interviews | 無冗餘 | 查詢複雜、需改 meeting 服務 |
| 面試同步建 `meetings` 鏡像紀錄 | 行事曆查詢單純 | 資料雙寫需維護一致性 |
| 把面試改成 meetings 的 subtype | 架構清爽 | 重構成本大，超出本次範疇 |

**決定**：方案 B。`POST /api/recruitment/interviews` 在同一 `db.transaction()` 內：
1. INSERT 到 `interviews`
2. INSERT 到 `meetings`（type=`interview`，`external_ref_type=interview`, `external_ref_id=<interview_id>`）
3. INSERT 面試官到 `meeting_attendees`（`is_organizer=1`）
4. 候選人不存在 `employees` 表，以外部參與者身份記錄在 `meetings.notes` 或新增 `meeting_external_attendees`（本次先放 notes，避免擴張 schema）

**理由**：現有 meeting 前端服務已支援列表/日曆檢視，複用比新開查詢介面便宜。鏡像紀錄讓行事曆查詢不需跨表 UNION，效能可預測。

**一致性維護**：面試取消（`interviews.cancelled_at` 被設定）時，同步把對應 meeting 的 `status` 設為 `cancelled`；面試改期時，刪除舊 meeting、建立新 meeting（比更新簡單，反正沒有第三方整合）。

### Decision: 既有 `INT-001`~`INT-004` 硬編碼資料改以「demo seed 重建」而非「線上遷移映射」

**背景**：本系統目前僅有 demo 租戶有面試資料。`INT-001`~`INT-004` 是硬編碼假資料，不是真員工 ID。

**方案**：
- 不寫 data migration（避免遷移腳本把假資料映射錯）
- 改由 `/seed-verify` 重建：
  1. 清除 demo 租戶既有 `interviews`（如有）的 `interviewer_id` 為 `INT-*` 的紀錄
  2. 從 demo `employees` 挑 4 位員工充當面試官，重建面試紀錄

**理由**：demo 資料可隨時重建，寫遷移反而增加維護成本。生產環境暫無此問題。

### Decision: `invitations.interviewer_id` 為必填，但 `interviews.interviewer_id` FK 先不啟用 `NOT NULL`

**原因**：
- 新發的邀約必須指定面試官（應用層驗證 `interviewerId` 必填 → 400）
- 但 `interviews` 表透過 invitation 轉換產生，理論上一定有 interviewer_id；為避免遷移既有 demo 資料時衝突，DB 層仍允許 NULL（應用層保證）
- FK 使用 `REFERENCES employees(id) ON DELETE RESTRICT`，員工在職期間不得刪除；若員工離職，改走 `employees.status = inactive` 流程，不實際 DELETE

## Risks / Trade-offs

**[風險 1] 同部門員工過少導致面試官選項空白** → Mitigation：預設篩選找不到結果時，下拉自動展開為「全員工」並顯示提示訊息「同部門無在職員工，已顯示全體」

**[風險 2] 15 分鐘對齊可能破壞既有未結束面試紀錄** → Mitigation：僅對新建紀錄套用，既有 `interviews` 不做回溯對齊

**[風險 3] meeting 鏡像紀錄與 interviews 不同步（例：只更新 interviews 忘了更 meetings）** → Mitigation：所有 interviews 的寫入都走單一 service 函式（`interviewService.scheduleInterview` / `cancelInterview`），內部保證 meeting 同步；寫 unit test 驗證取消 → meeting.status=cancelled

**[風險 4] 衝突檢查 API 在大量資料下效能衰退** → Mitigation：`interviews.interviewer_id` 與 `meeting_attendees.employee_id` 加 index（遷移時一併建立）

**[風險 5] 前端 debounce 期間使用者按送出可能送出過時的衝突狀態** → Mitigation：送出時前端強制再呼叫一次 check-conflicts 等待結果；後端建立時也會再檢查，雙保險

**[風險 6] 候選人在多家公司面試時資料散落，候選人衝突檢查僅限本租戶** → 可接受：跨租戶隔離是 SaaS 特性，此處明確限定本租戶範圍

## Migration Plan

1. **資料表遷移**（`tenant-schema.js` + `tenant-db-manager.js` 雙清單）：
   - `ALTER TABLE invitations ADD COLUMN interviewer_id INTEGER REFERENCES employees(id)`
   - `ALTER TABLE interviews` 加 `interviewer_id INTEGER REFERENCES employees(id)` index
   - 建立 index `idx_interviews_interviewer_at`、`idx_meeting_attendees_employee_time`

2. **後端上線順序**：
   - 先上線 `check-conflicts` API（唯讀，不影響既有流程）
   - 再上線 `invitations` / `interviews` 的 `interviewerId` 必填 + 衝突硬擋（Breaking change）
   - 最後上線 `interviews` → `meetings` 同步寫入

3. **前端上線順序**：
   - 先改 `invite-candidate-modal`（新增面試官欄位 + 時段衝突標示）
   - 再改 `schedule-interview-modal`（面試官改唯讀 + 送出前最終驗證）

4. **Demo 資料重建**：`/seed-verify` 清除 INT-* 紀錄後重建

**Rollback 策略**：因 BREAKING 變更，若線上回滾需還原 tenant schema + 後端兩版本 API。建議部署前先在 staging 跑完 `/verify` 全流程。

## Open Questions

（無。所有關鍵決策已於 discuss 階段與使用者確認：Q1~Q7）
