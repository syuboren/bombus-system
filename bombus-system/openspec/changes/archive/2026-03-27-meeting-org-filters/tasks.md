## 1. 後端：DB 遷移策略：idempotent ALTER TABLE

- [x] 1.1 在 `tenant-schema.js` 的 `subsidiaryMigrations` 陣列加入 `{ table: 'meetings', index: 'idx_meeting_org_unit' }`，修正 meetings table org_unit_id migration fix（meetings 表 org_unit_id 遷移缺漏）
  - 驗證：重啟後端，確認 `meetings` 表有 `org_unit_id` 欄位與 `idx_meeting_org_unit` 索引
- [x] 1.2 在 `tenant-schema.js` 新增 meetings table department column migration（department 欄位遷移），使用 `try { db.run('ALTER TABLE meetings ADD COLUMN department TEXT'); } catch(e) {}` 模式
  - 驗證：重啟後端，確認 `meetings` 表有 `department` 欄位

## 2. 後端 department 欄位：新增至 CREATE/UPDATE/GET

- [x] 2.1 修改 `meetings.js` POST `/` 路由，從 req.body 解構 `department` 並加入 INSERT 語句，實現 meeting creation writes department
  - 驗證：使用 curl 建立會議帶 `department` 欄位，確認 DB 寫入正確
  - 依賴：1.1, 1.2
- [x] 2.2 修改 `meetings.js` PUT `/:id` 路由，加入 `department` 到 UPDATE 語句，實現 meeting update writes department
  - 驗證：使用 curl 更新會議的 `department`，確認 DB 更新正確
  - 依賴：1.1, 1.2
- [x] 2.3 修改 `meetings.js` GET `/` 路由，支援 `department` query param 篩選，實現 meeting list filters by department
  - 驗證：使用 curl 呼叫 `GET /api/meetings?department=xxx`，確認回傳正確篩選結果
  - 依賴：1.1, 1.2

## 3. 前端：Model 更新（複用現有元件與服務）

- [x] 3.1 在 `meeting.model.ts` 的 `Meeting` interface 加入 `department?: string`，實現 meeting model includes department field
  - 驗證：`npx ng build --configuration=development` 編譯通過

## 4. 前端篩選：複用現有 signals + Modal 出席人員篩選：獨立 signal

- [x] 4.1 在 `meeting-page.component.ts` 新增 `modalAttendeeDept` signal 和 `modalFilteredAttendees` computed（modal 出席人員篩選：獨立 signal），實現 meeting modal attendee department filter 的資料層
  - 驗證：編譯通過，signal 與 computed 正確宣告
  - 依賴：3.1
- [x] 4.2 修改 `buildScopeFilters()` 方法（前端篩選：複用現有 signals）：公司 scope 加入 `orgUnitId`、個人 scope 加入 `department`，實現 meeting page reactive subsidiary filtering 的擴展
  - 驗證：切換各 tab 時 API 請求帶正確的 query params
  - 依賴：3.1
- [x] 4.3 修改 `saveMeeting()` 方法（modal 歸屬欄位：存入 newMeeting 物件）：從 `newMeeting` 讀取 `department` 傳送至後端，實現 meeting modal ownership fields 的資料提交
  - 驗證：建立會議時 POST 請求包含 `department` 欄位
  - 依賴：3.1
- [x] 4.4 修改 `initNewMeetingForm()` 方法：重置 `modalAttendeeDept` signal
  - 驗證：開啟新增 modal 時 attendee 篩選重置為空

## 5. 前端：HTML 模板（現有元件與服務）

- [x] 5.1 日曆公司 tab 加入子公司下拉選單，實現 meeting page company tab subsidiary dropdown
  - 驗證：瀏覽器確認公司 tab 出現子公司下拉，選擇後日曆資料重新載入
  - 依賴：4.2
- [x] 5.2 日曆個人 tab 加入子公司 + 部門下拉選單，實現 meeting page personal tab subsidiary and department dropdowns
  - 驗證：瀏覽器確認個人 tab 出現子公司、部門、員工三個下拉，部門依子公司級聯
  - 依賴：4.2
- [x] 5.3 會議列表 tab 篩選列加入子公司 + 部門 filter-item，實現 meeting list tab subsidiary and department filters
  - 驗證：瀏覽器確認會議列表篩選列出現子公司和部門下拉
  - 依賴：4.2
- [x] 5.4 新增/編輯 modal 基本資訊區加入歸屬子公司 + 部門欄位（department cascades from subsidiary in modal），實現 meeting modal ownership fields
  - 驗證：瀏覽器確認 modal 有歸屬子公司和部門欄位，部門依子公司級聯
  - 依賴：4.3
- [x] 5.5 新增/編輯 modal 出席人員區加入部門篩選下拉，連接 `modalFilteredAttendees`，實現 meeting modal attendee department filter 的 UI 層
  - 驗證：瀏覽器確認出席人員區有部門篩選，選擇後只顯示對應部門人員
  - 依賴：4.1

## 6. 驗證

- [x] 6.1 執行 `cd bombus-system && npx ng build --configuration=development` 確認編譯通過
  - 驗證：零錯誤完成建置
- [x] 6.2 重啟後端確認 DB 遷移成功，手動測試完整流程
  - 驗證：建立會議含歸屬 → 列表篩選 → 日曆各 tab 切換，均正常運作
