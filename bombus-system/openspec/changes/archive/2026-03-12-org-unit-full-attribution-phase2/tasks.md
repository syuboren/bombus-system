## 1. DB 遷移

- [x] 1.1 Grade tracks DB migration：修改 `server/src/db/tenant-db-manager.js` 的 `_runMigrations` 中 `subsidiaryMigrations` 陣列，新增 `{ table: 'grade_tracks', index: 'idx_gt_org_unit' }`。使用 DB 遷移策略（subsidiaryMigrations 陣列），觸發 SQL Schema 變更（ALTER TABLE + CREATE INDEX）。**驗證**：重啟後端，執行 `SELECT * FROM pragma_table_info('grade_tracks')` 確認 org_unit_id 欄位存在

> 依賴：無前置依賴

## 2. L1 後端 — 讀取篩選（GET）

- [x] 2.1 Recruitment candidate list filters by subsidiary：修改 `server/src/routes/recruitment.js`（line 601 附近）。GET `/candidates` 從 `req.query.org_unit_id` 取值，有值時加 `AND j.org_unit_id = ?`。使用候選人篩選策略（透過 JOIN jobs 繼承）和讀取篩選策略（直接比對）。SQL 使用 Prepared Statements（後端 API Prepared Statements 範例）。**驗證**：`curl "localhost:3001/api/recruitment/candidates?org_unit_id=org-root"` 只回傳該子公司職缺的候選人
- [x] 2.2 Talent pool list filters by subsidiary + Talent pool stats filter by subsidiary：修改 `server/src/routes/talent-pool.js`。GET `/`（line 330）加 `req.query.org_unit_id`，有值時 SQL 加 `AND tp.org_unit_id = ?`。GET `/stats`（line 516）所有統計查詢加 `WHERE org_unit_id = ?`。使用讀取篩選策略（直接比對）。**驗證**：`curl "localhost:3001/api/talent-pool?org_unit_id=org-root"` 回傳篩選後的人才列表
- [x] 2.3 Meeting list filters by subsidiary + Meeting dashboard stats filter by subsidiary + Meeting conclusions filter by subsidiary：修改 `server/src/routes/meetings.js`。GET `/`（line 155）加 `AND org_unit_id = ?`。GET `/dashboard/stats`（line 703）所有統計查詢加 `WHERE org_unit_id = ?`。GET `/conclusions`（line 82）JOIN meetings 加 `org_unit_id` 篩選。**驗證**：`curl "localhost:3001/api/meetings?org_unit_id=org-root"` 回傳篩選後的會議列表

> 依賴：Group 1

## 3. L1 後端 — 建立/編輯（POST/PUT）

- [x] 3.1 Meeting creation writes org_unit_id + Meeting update writes org_unit_id：修改 `server/src/routes/meetings.js`。POST `/`（line 242）：`req.body.org_unit_id` 加入 INSERT。PUT `/:id`（line 352）：UPDATE SET 加入 org_unit_id。使用後端 API Prepared Statements 範例。**驗證**：POST 建立會議帶 org_unit_id → GET 確認 DB 有值
- [x] 3.2 Talent pool creation writes org_unit_id + Talent pool update writes org_unit_id + Apply-to-job inherits org_unit_id from job：修改 `server/src/routes/talent-pool.js`。POST `/`（line 668）INSERT 加 org_unit_id。PUT `/:id`（line 747）UPDATE 加 org_unit_id。POST `/:id/apply-to-job`（line 1826）查詢 job 的 org_unit_id 繼承至新建 candidate。**驗證**：POST 建立人才帶 org_unit_id → GET 確認
- [x] 3.3 Import to talent pool inherits org_unit_id from job：修改 `server/src/routes/recruitment.js`（line 254）。`importToTalentPool()` INSERT INTO talent_pool 前查詢 candidate 關聯 job 的 org_unit_id 並帶入 INSERT。**驗證**：從候選人匯入人才庫 → talent_pool 記錄有正確 org_unit_id
- [x] 3.4 Job update writes org_unit_id：修改 `server/src/routes/jobs.js`（line 448 附近）。PUT `/:id` 若 `req.body` 含 org_unit_id 則 UPDATE SET 加入。**驗證**：PUT 更新職缺帶 org_unit_id → GET 確認

> 依賴：Group 1

## 4. L2 後端 — grade_tracks

- [x] 4.1 Grade tracks applyCreate writes org_unit_id + Grade tracks applyUpdate writes org_unit_id：修改 `server/src/routes/grade-matrix.js`。applyCreate grade_tracks（line 1077）INSERT 加 org_unit_id 欄位，值從 `JSON.parse(change.new_data).org_unit_id` 取出。applyUpdate grade_tracks（line 1103）UPDATE SET 加 org_unit_id。**驗證**：建立新 track 含 org_unit_id → approve → 確認 grade_tracks 表有值

> 依賴：Group 1

## 5. L1 前端 Service — 讀取方法

- [x] 5.1 修改 `src/app/features/employee/services/interview.service.ts`：getCandidates(orgUnitId?) 加 HttpParams `org_unit_id`。getScheduledCandidates(orgUnitId?) 透傳給 getCandidates。**驗證**：Angular build 無錯誤
- [x] 5.2 修改 `src/app/features/employee/services/talent-pool.service.ts`：getCandidates(filters) filters 加 `orgUnitId?: string`，API 呼叫加 HttpParams。getTalentPoolStats(orgUnitId?) 加 HttpParams。**驗證**：Angular build 無錯誤
- [x] 5.3 修改 `src/app/features/employee/services/meeting.service.ts`：getMeetings(filters) filters 加 `orgUnitId?: string`，API 呼叫加 HttpParams。getMeetingStats(orgUnitId?) 加 HttpParams。getCalendarEvents(filters) 透過 getMeetings 繼承。**驗證**：Angular build 無錯誤

> 依賴：Groups 2-3（API 端點先就緒）

## 6. L1 前端 Service — 建立/編輯方法

- [x] 6.1 Job creation writes org_unit_id from frontend：修改 `src/app/features/employee/services/job.service.ts`（line 429）。createJob() payload 加 `org_unit_id: job.org_unit_id`。**驗證**：Angular build 無錯誤
- [x] 6.2 修改 `src/app/features/employee/services/meeting.service.ts`：確認 createMeeting() 和 updateMeeting() 會透傳 meeting 物件中的 org_unit_id。若 Meeting model 缺少 org_unit_id 需補上。**驗證**：Angular build 無錯誤
- [x] 6.3 修改 `src/app/features/employee/services/talent-pool.service.ts`：addCandidate() 的 payload 加入 org_unit_id 欄位。**驗證**：Angular build 無錯誤

> 依賴：Groups 2-3

## 7. L1 前端 Page — 讀取連動

- [x] 7.1 Recruitment page subsidiary dropdown：修改 `src/app/features/employee/pages/recruitment-page/recruitment-page.component.ts`。注入 OrgUnitService，加 selectedSubsidiaryId signal + subsidiaries computed。使用前端 reactive 模式（toObservable + switchMap + takeUntilDestroyed）。修改 `.component.html` 加入前端子公司 dropdown 標準模板。**驗證**：選擇子公司 → 候選人列表更新
- [x] 7.2 Talent pool page subsidiary dropdown：修改 `src/app/features/employee/pages/talent-pool-page/talent-pool-page.component.ts`。注入 OrgUnitService，加 selectedSubsidiaryId signal + subsidiaries computed。使用前端 reactive 模式和前端子公司 dropdown 標準模板。修改 `.component.html` 加子公司 dropdown。**驗證**：選擇子公司 → 人才列表和統計更新
- [x] 7.3 Meeting page reactive subsidiary filtering：修改 `src/app/features/employee/pages/meeting-page/meeting-page.component.ts`。已有 selectedSubsidiaryId 和 dropdown。修改 buildScopeFilters() 加入 orgUnitId。加 reactive subscription：selectedSubsidiaryId 變化時觸發 loadData()。使用前端 reactive 模式（toObservable + switchMap + takeUntilDestroyed）。**驗證**：選擇子公司 → 會議列表和統計更新

> 依賴：Groups 5-6

## 8. L1 前端 Page — 建立/編輯呼叫

- [x] 8.1 修改 `src/app/features/employee/pages/jobs-page/jobs-page.component.ts`：createJob()（line 452）加 `org_unit_id: this.selectedSubsidiaryId() || this.modalSubsidiaryId()`。updateJob()（line 964）加 org_unit_id。**驗證**：選子公司 → 新增職缺 → DB 有正確 org_unit_id
- [x] 8.2 修改 `src/app/features/employee/pages/meeting-page/meeting-page.component.ts`：createMeeting()（line 920）cleanMeetingData 加 `org_unit_id: this.selectedSubsidiaryId()`。updateMeeting()（line 905）同上。**驗證**：選子公司 → 新增會議 → DB 有正確 org_unit_id
- [x] 8.3 修改 `src/app/features/employee/pages/talent-pool-page/talent-pool-page.component.ts`：addCandidate 呼叫加 `org_unit_id: this.selectedSubsidiaryId()`。**驗證**：選子公司 → 新增人才 → DB 有正確 org_unit_id

> 依賴：Group 7

## 9. Build 驗證

- [x] 9.1 執行 `cd bombus-system && npx ng build --configuration=development`，確認 0 errors。**驗證**：build 成功
- [x] 9.2 功能驗證：職缺建立帶 org_unit_id → 會議建立帶 org_unit_id → 招募管理切換子公司 → 人才庫切換子公司 → 會議管理切換子公司 → L2 職等軌道新增帶 org_unit_id → 不選子公司時顯示全部資料（向下相容）

> 依賴：Groups 1-8
