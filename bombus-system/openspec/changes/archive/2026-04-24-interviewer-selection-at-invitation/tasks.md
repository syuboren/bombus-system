## 1. 資料層遷移與種子資料

- [x] 1.1 在 `tenant-schema.js` 的 `initTenantSchema()` 中為 `invitations` 加 `interviewer_id INTEGER` 欄位與 `REFERENCES employees(id) ON DELETE RESTRICT`（對應 Decision: `invitations.interviewer_id` 為必填，但 `interviews.interviewer_id` FK 先不啟用 `NOT NULL`）；同步新增 index `idx_invitations_interviewer`。驗證：新建租戶後 `PRAGMA table_info(invitations)` 顯示新欄位
- [x] 1.2 在 `tenant-schema.js` 為 `interviews.interviewer_id` 新增 FK → `employees(id)` 與 index `idx_interviews_interviewer_at`；為 `meeting_attendees` 加 index `idx_meeting_attendees_employee_time`。驗證：`SELECT sql FROM sqlite_master WHERE name='interviews'` 顯示 FK
- [x] 1.3 在 `tenant-db-manager.js` 的 `_runMigrations()` 同步新增對應的 ALTER TABLE 遷移步驟（雙遷移清單同步）。驗證：既有租戶啟動後 migration 不報錯且 schema 一致
- [x] 1.4 建立 seed 重建腳本：清除 demo 租戶既有 `INT-001`~`INT-004` 面試紀錄，挑 4 位 demo 員工重建面試／邀約範例資料（對應 Decision: 既有 `INT-001`~`INT-004` 硬編碼資料改以「demo seed 重建」而非「線上遷移映射」）。驗證：`/seed-verify` 通過、決策頁仍可正確顯示面試官姓名

## 2. 後端 API — 衝突檢查（先行上線）

- [x] 2.1 在 `recruitment.js` 實作 `POST /api/recruitment/interviews/check-conflicts`，完成需求「Conflict-check API for interviewer and candidate」：接收 `{ interviewerId, candidateId, slots[] }`，回傳每個時段的可用/衝突狀態。驗證：unit test 涵蓋三情境（面試官衝突、候選人衝突、雙方皆可用）
- [x] 2.2 實作時段對齊正規化與重疊判斷函式，完成需求「Conflict resolution at 15-minute granularity」：將輸入 timestamp floor 到 15 分鐘邊界、用 `a_start < b_end AND b_start < a_end` 判定重疊。驗證：unit test 涵蓋相鄰時段（14:00-15:00 vs 15:00-16:00 不衝突）與重疊時段
- [x] 2.3 衝突查詢 SQL 使用 Prepared Statement，同時涵蓋 `interviews` 與 `meeting_attendees JOIN meetings`，並排除 `cancelled_at IS NOT NULL` 與 `meetings.status='cancelled'` 的紀錄（對應 Decision: 衝突檢查涵蓋「面試官行程 + 候選人既有面試」雙向範圍）。驗證：已取消的面試不被回報為衝突
- [x] 2.4 為 check-conflicts 端點加上 feature permission 中介軟體（`L1.recruitment` view 權限），與現有招募端點一致。驗證：無權限使用者呼叫回 403

## 3. 後端 API — 邀約與面試建立流程

- [x] 3.1 修改 `POST /api/recruitment/invitations`：新增 `interviewerId` 必填驗證（完成需求「Interviewer selection at invitation time」），驗證其為本租戶 `employees` 表中 active 員工，否則回 `400`（`INTERVIEWER_REQUIRED` / `INTERVIEWER_INVALID`）。驗證：缺欄位與無效 ID 皆回 400
- [x] 3.2 在 `POST /api/recruitment/invitations` 建立前呼叫衝突檢查邏輯（對應 Decision: 衝突檢查採「前端即時預檢 + 後端建立前硬擋」雙保險）以及需求「Hard-block conflict policy on invitation and interview creation」，若所有建議時段皆衝突則回 `409`；至少一時段可用則接受。驗證：整合測試驗證雙分支
- [x] 3.3 在 `POST /api/recruitment/invitations` 與 `POST /api/recruitment/interviews` 加入 15 分鐘對齊驗證，不符回 `400 SLOT_NOT_ALIGNED`，對應需求「Proposed slots use 15-minute granularity」的後端部分。驗證：送入 `14:07` 被拒
- [x] 3.4 修改 `POST /api/recruitment/interviews`：在建立前再次做衝突檢查（完成需求「Final-stage conflict verification before scheduling」），衝突回 `409 { conflicts: [...] }`。驗證：模擬邀約後新增衝突會議的情境
- [x] 3.5 實作 `interviews` 建立時在同一 transaction 內同步寫入 `meetings` 與 `meeting_attendees`，完成需求「Interview creation synchronizes to meetings table」（對應 Decision: 面試建立時同步寫入 `meetings` 表，採「同 transaction + 鏡像關聯」策略）。驗證：故意讓 meeting insert 失敗，interviews 也應 rollback
- [x] 3.6 修改面試取消流程：`interviews.cancelled_at` 被設定時同步更新鏡像 `meetings.status='cancelled'`（同 transaction），完成需求「Interview cancellation synchronizes meeting status」；legacy 無鏡像 meeting 的紀錄仍可取消。驗證：取消後 meeting 狀態變為 cancelled

## 4. 前端服務層

- [x] 4.1 在 `interview.service.ts` 新增 `checkConflicts(interviewerId, candidateId, slots[])` 方法串接新 API，回傳 Observable。驗證：service spec 模擬 HTTP 回應
- [x] 4.2 修改 `inviteCandidate()` 簽章加入 `interviewerId` 參數並傳入 payload。驗證：型別檢查通過
- [x] 4.3 在 `employee.service.ts`（或現有服務）確認 `listEmployees({ dept, status })` 可用；若無則新增呼叫 `GET /api/employee/list` 的方法。驗證：在 invite-candidate-modal 中可取得資料

## 5. 前端 — invite-candidate-modal（發邀約頁）

- [x] 5.1 新增面試官下拉欄位，實作需求「Interviewer dropdown sourced from active employees」（對應 Decision: 選用「全員工可選 + 依部門預設篩選」而非「面試官白名單」）：載入時預設用職缺的 department 篩選，下拉選項格式「姓名｜部門｜職稱」，提供「顯示全部部門」切換。驗證：切換時清單會刷新
- [x] 5.2 處理「同部門無員工」fallback：自動展開為全部員工並顯示提示訊息。驗證：手動將職缺 department 設為空部門測試
- [x] 5.3 時段輸入改為 `<input type="datetime-local" step="900">`，UI 限制為 15 分鐘為單位，對應需求「Proposed slots use 15-minute granularity」的前端部分。驗證：分鐘選項僅見 00/15/30/45
- [x] 5.4 實作時段衝突指示器：面試官或時段變動時以 debounce 300ms 呼叫 `checkConflicts`，於每個時段旁顯示 Available / Conflict 標籤（含原因），完成需求「Per-slot conflict indicator in invite modal」。驗證：模擬有衝突會議的情境看到 Conflict 標籤
- [x] 5.5 送出前強制再呼叫一次 `checkConflicts` 並等待結果，若任一時段仍衝突則 block 送出並顯示錯誤。驗證：debounce 未結束就按送出也能正確阻擋
- [x] 5.6 表單驗證：面試官為必填，無選擇時按鈕 disabled 且顯示紅字提示。驗證：未選面試官不可送出

## 6. 前端 — schedule-interview-modal（安排面試時段頁）

- [x] 6.1 移除面試官下拉控制，改為唯讀顯示區塊（姓名｜部門｜職稱），資料來源為邀約紀錄的 `interviewer_id`，完成需求「Schedule interview modal displays interviewer read-only」。驗證：任何操作都無法修改面試官
- [x] 6.2 處理 legacy 資料 fallback：當邀約無 interviewer_id 時顯示「尚未指派面試官，請重發邀約」並 disable 確認按鈕。驗證：手動把 demo 資料 interviewer_id 清空測試
- [x] 6.3 時間輸入加上 `step="900"` 限制 15 分鐘粒度。驗證：下拉分鐘選單僅 00/15/30/45
- [x] 6.4 送出前呼叫 `checkConflicts` 對最終時段做驗證，收到 409 時顯示衝突明細並 block 送出，完成需求「Final-stage conflict verification before scheduling」的前端部分。驗證：UI 正確顯示後端回傳的衝突清單

## 7. 整合測試與驗證

- [x] 7.1 撰寫後端整合測試：邀約流程端到端（發邀約 → 衝突檢查 → 候選人回覆 → 安排面試 → meeting 鏡像建立 → 取消同步）。驗證：全部情境通過
- [x] 7.2 撰寫前端 spec：invite-candidate-modal 含面試官下拉、15 分鐘 step、衝突標示；schedule-interview-modal 含唯讀顯示與最終驗證。驗證：`npm test` 全綠
- [x] 7.3 對相鄰功能做迴歸驗證：interview-decision-page 讀取 `interviews.interviewer_id` 應仍可正確顯示姓名（型別變更 + FK 新增的副作用）。驗證：決策頁候選人清單呈現正確的面試官
- [x] 7.4 執行 `/verify` 全流程：tsc 無錯、`ng build --configuration=development` 成功、API 手測三端點、欄位對應端到端驗證、檢查對相鄰元件無版面副作用
- [x] 7.5 執行 `/seed-verify` 確認 demo 資料完整且可重現所有情境（含有衝突的資料）。驗證：衝突標籤在 UI 正確出現
