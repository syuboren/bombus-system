## 1. 資料層遷移

- [x] 1.1 在 `server/src/db/tenant-schema.js` 的 `initTenantSchema()` 新增 `referral_invitations` 表（所有 id / FK 皆用 `TEXT` 型別，對齊 `jobs` / `candidates` / `employees` 的 UUID 字串慣例），欄位：`id TEXT PRIMARY KEY / token TEXT UNIQUE NOT NULL / job_id TEXT NOT NULL REFERENCES jobs(id) / recommender_employee_id TEXT NOT NULL REFERENCES employees(id) / candidate_email TEXT NOT NULL / status TEXT NOT NULL / custom_message TEXT / expires_at TEXT NOT NULL / submitted_at TEXT / submitted_candidate_id TEXT REFERENCES candidates(id) / created_by TEXT REFERENCES employees(id) / created_at / updated_at`，並為 `(job_id, candidate_email) WHERE status='pending'` 建立 UNIQUE 部分索引（對應 Decision：重複邀請政策：同職缺同 email 僅允許一筆 pending）。驗證：新建 demo 租戶後 `PRAGMA table_info(referral_invitations)` 顯示所有欄位、FK 型別皆為 TEXT
- [x] 1.2 在 `tenant-schema.js` 的 `candidates` 表新增 `source_detail TEXT` 欄位用於儲存內推推薦人資訊 JSON（完成需求支撐「Candidate submission creates candidate record and marks referral source」）。驗證：新租戶的 `candidates` 表含此欄位
- [x] 1.3 在 `server/src/db/tenant-db-manager.js` 的 `_runMigrations()` 同步新增 `CREATE TABLE IF NOT EXISTS referral_invitations ...` 與 `ALTER TABLE candidates ADD COLUMN source_detail` 遷移步驟（雙遷移清單同步，避免既有租戶缺表）。驗證：啟動 server 後 demo 租戶 migration log 顯示新步驟執行成功
- [x] 1.4 為 `referral_invitations` 加入 index：`idx_referral_invitations_job_status (job_id, status)` 與 `idx_referral_invitations_token (token)`，供列表查詢與 token lookup 使用。驗證：`EXPLAIN QUERY PLAN` 使用 index
- [x] 1.5 在 `server/src/db/platform-db.js` 的 `createPlatformTables()` 新增 `public_tokens` 表：`token TEXT PRIMARY KEY / tenant_id TEXT NOT NULL REFERENCES tenants(id) / resource_type TEXT NOT NULL / resource_id TEXT NOT NULL / created_at`，並建 `idx_public_tokens_tenant` index（對應 Decision：公開端點以平台級 `public_tokens` 表解析租戶）。驗證：platform DB 重啟後 `PRAGMA table_info(public_tokens)` 顯示欄位齊全

## 2. 後端 API — HR 端內推邀請

- [x] 2.1 在 `server/src/routes/recruitment-referrals.js` 新建檔並於 `app.js` 掛載，所有路由以 `authMiddleware` + `requireFeaturePerm('L1.recruitment', 'edit')` 守門。驗證：未帶 token 呼叫回 401、權限不足回 403
- [x] 2.2 實作 `POST /api/recruitment/referrals` 發起邀請流程：驗證 job 屬當前租戶且 `status='published'`，否則回 400；驗證候選人 email 格式（完成需求「HR initiates referral invitation from a published job」）。驗證：非 published job 回 400
- [x] 2.3 在同一端點中驗證推薦人員編：查詢當前租戶 `employees` 表，條件為 `employee_no = ? AND status = 'active'`（注意是 `employees.status` 不是 `employment_status`，後者不存在），否則回 400 `RECOMMENDER_INVALID`（完成需求「Recommender employee number is validated against active employees」，對應 Decision：推薦人員編驗證：僅驗「存在且在職」，不驗職級）。驗證：離職員編被拒
- [x] 2.4 檢查 `(job_id, candidate_email)` 是否已有 pending 邀請，有則回 409 `DUPLICATE_PENDING_INVITATION`（完成需求「Duplicate pending invitations for the same job and email are prevented」）。驗證：連送兩筆相同組合第二筆回 409；第一筆取消後第三筆成功
- [x] 2.5 使用 `crypto.randomUUID()` 產生 token 與 invitation `id`，設定 `expires_at = now + 7 days`，於 `db.transaction()` 內 insert `referral_invitations`，**並在 platform DB 同步 insert `public_tokens` 一筆**（`resource_type='referral_invitation'`, `tenant_id=req.user.tenantId`, `resource_id=invitationId`）；任一失敗皆 rollback tenant transaction 並刪除 platform 記錄（補償式 cleanup）。回應 body 帶 `{ invitationId, referralLink }` 其中 `referralLink = ${FRONTEND_URL}/public/referral/${token}`（完成需求「Referral token is single-use with 7-day expiration」與「Invitation link is retrievable and copyable from HR interface for manual distribution」；對應 Decision：Token 使用 UUIDv4 儲存於 DB，非 JWT / Token 有效期統一 7 天 / 不寄送 Email，採「API 回傳連結 + HR 複製分享」 / 公開端點以平台級 `public_tokens` 表解析租戶）。驗證：insert 後 token 長度 36 字元、`expires_at` 為 7 天後、response 含 `referralLink` 絕對 URL、platform `public_tokens` 存在對應紀錄
- [x] 2.6 實作 `GET /api/recruitment/referrals?job_id=&status=` 列表端點，回傳邀請清單含推薦人姓名、候選人 email、時間戳、狀態；`pending` 與 `expired` 的邀請附 `referralLink`，`submitted` / `cancelled` 不附（完成需求「HR can list referral invitations for a job」與「Invitation link is retrievable and copyable from HR interface for manual distribution」的 list 分支）。驗證：未指定 status 回全部、指定 status='pending' 僅回 pending、submitted 項目不含 referralLink 欄位
- [x] 2.7 實作 `POST /api/recruitment/referrals/:id/cancel`，僅當 `status='pending'` 時允許並更新為 `cancelled`；其他狀態回 409（完成需求「HR can cancel a pending referral invitation」）。驗證：pending 可取消、submitted 回 409
- [x] 2.8 實作 `POST /api/recruitment/referrals/:id/renew`：於 `db.transaction()` 內重設 `expires_at = now + 7 days`、維持原 token、若原 status 為 `expired` 則改回 `pending`，回應 body 帶刷新後的 `referralLink`（完成需求「HR can renew a pending or expired referral invitation to extend expiry」，對應 Decision：HR 可延長並重新取得分享連結（renew 單一動作））。驗證：submitted / cancelled 回 409；pending 成功刷新；expired 被改回 pending；response 含新 `referralLink`（token 不變）
- [x] 2.9 實作員編預覽輔助端點 `GET /api/recruitment/referrals/recommender-preview?employee_no=`：回傳員工 id 與姓名或 400（供內推 Modal 的 debounce 驗證使用）。驗證：有效員編回 200 含姓名、無效回 400

## 3. 後端 API — 公開端 Token 流程

- [x] 3.1 在 `server/src/routes/public-referrals.js` 新建檔並掛載於 `/api/public/referrals`，此 router **不走** authMiddleware 與 tenantMiddleware（對齊 Decision：公開端點以平台級 `public_tokens` 表解析租戶）；實作 `resolveTenantByToken(token)` 工具函式：先查 platform DB `public_tokens` 取得 `tenant_id`，再呼叫 `tenantDBManager.getTenantDB(tenantId)` 取 tenantDB，查無 token 回 `{ tenantDB: null }` 讓 caller 回 410（不區分「token 不存在」vs「其他錯誤」以免資訊洩漏）。驗證：無登入情況下可打到路由；有效 token 能取回 tenantDB；不存在 token 回 null
- [x] 3.2 實作 `GET /api/public/referrals/:token`：查詢 token 對應邀請，驗證狀態為 `pending` 且 `expires_at > now`，否則依情況回 410（過期、已使用、已取消）；過期者同步更新 status 為 `expired`（完成需求「Referral token is single-use with 7-day expiration」與「Public referral intake page validates token and preloads recommender context」）。驗證：過期 token 被標為 expired 並回 410
- [x] 3.3 `GET` 回應只包含 `{ job: { id, title, department }, recommender: { name }, custom_message, candidate_email }`，不含 JD 全文或薪資（對應 Risk：公開頁直接暴露職缺標題給持 token 第三方）。驗證：回應 JSON 不含 salary/jd_detail 欄位
- [x] 3.4 實作 `POST /api/public/referrals/:token/submit`：在 `db.transaction()` 內再次驗證 token 狀態、檢查同租戶同 job_id 同 email 候選人是否已存在，若存在回 409 並將邀請 status 標為 `cancelled` 原因 `duplicate`（完成需求「Candidate submission creates candidate record and marks referral source」，對應 Decision：候選人提交去重：相同 email 已存在時拒絕 + 引導 HR）。驗證：重複 email 回 409
- [x] 3.5 在同一 transaction 內建立 `candidates` 紀錄：`reg_source='referral'`、`source_detail` 存 `{ invitation_id, recommender_employee_no, recommender_name }`，email 鎖為 HR 邀請時指定值不接受 override（對應 Open Q3）。驗證：即使 request 傳入不同 email，DB 寫入的 email 仍為邀請原 email
- [x] 3.6 更新 `referral_invitations` 為 `status='submitted'`、`submitted_at=now`、`submitted_candidate_id=<新 id>`，token 即作廢（完成需求「Referral token is single-use with 7-day expiration」的消耗部分）。驗證：同一 token 再次 POST 回 410

## 4. 連結組裝工具

- [x] 4.1 在 `server/src/routes/recruitment-referrals.js`（或新建 `server/src/utils/referral-link.js`）新增 `buildReferralLink(token)` 輔助函式，回傳 `\`${process.env.FRONTEND_URL}/public/referral/${token}\``；若 `FRONTEND_URL` 未設定則 fallback 為相對路徑 `/public/referral/:token` 並記 warning log（對應 Decision：不寄送 Email，採「API 回傳連結 + HR 複製分享」）。驗證：設 FRONTEND_URL 時回絕對 URL、未設時回相對路徑並有 warning
- [x] 4.2 確認 `.env.example` 的 `FRONTEND_URL` 變數仍存在且註解清楚其用途；若需要更明確文件化，增一條註解說明「此值用於產生對外分享連結（面試、offer、內推等）」。驗證：`.env.example` 內容清楚

## 5. 前端服務層

- [x] 5.1 在 `src/app/features/employee/services/` 新增 `referral-invitation.service.ts`，提供 `createInvitation(payload)`、`listInvitations(jobId, status?)`、`cancelInvitation(id)`、`renewInvitation(id)`、`previewRecommender(employeeNo)` 五個方法回傳 Observable，型別定義於 `models/referral-invitation.model.ts`。驗證：`npx tsc --noEmit` 通過
- [x] 5.2 在 `src/app/features/public/services/` 新增 `public-referral.service.ts`，提供 `fetchInvitationByToken(token)` 與 `submitIntake(token, form)`。驗證：service spec 模擬 HTTP 回應成功與 410 失敗分支

## 6. 前端 — HR 內推 Modal 與職缺頁按鈕

- [x] 6.1 新建 `features/employee/components/referral-invitation-modal/referral-invitation-modal.component.{ts,html,scss}`，standalone + OnPush + Signal APIs（`input()` 接 job、`output()` 發 `invitationCreated`）；套 `@include card`、`@include button-module($color-l1-primary)`（對應 Decision：前端元件：新建內推 Modal，職缺頁加按鈕）。驗證：元件可載入且樣式符合 L1 鼠尾草綠
- [x] 6.2 Modal 表單欄位：推薦人員編（即時 debounce 400ms 呼叫 `previewRecommender` 顯示姓名 / 錯誤提示）、候選人 email（格式驗證）、自訂訊息（textarea, 200 字上限）。驗證：輸入無效員編時送出按鈕 disabled 且顯示「查無此員工或已離職」
- [x] 6.3 在 `features/employee/pages/jobs-page/jobs-page.component.html` 為 `status='published'` 的每列加「發起內推」按鈕，打開 Modal 並傳入 job 資訊；關閉時若有 `invitationCreated` 事件呼叫列表重新整理。驗證：draft 職缺無按鈕、published 職缺可點擊
- [x] 6.4 Modal 送出成功後切換為「已建立邀請」視圖：顯示 `referralLink` 唯讀文字框 + 大按鈕「複製連結」，以及提示「請將連結透過 email / IM 傳給候選人，連結 7 天內有效」；失敗時顯示具體錯誤（409 重複、400 員編無效）。驗證：模擬兩種後端錯誤皆顯示對應訊息；成功時使用者能一鍵複製連結到剪貼簿
- [x] 6.5 在職缺詳情頁或列表展開區塊新增「已發起內推」清單，呼叫 `listInvitations(jobId)`，每列顯示推薦人、候選人 email、狀態 chip、發起時間、到期時間；pending / expired 狀態顯示「複製連結」按鈕（使用 list response 中的 `referralLink`）、「延長效期」按鈕（呼叫 `renewInvitation` 並以新 referralLink 刷新按鈕可用性，對應需求「HR can renew a pending or expired referral invitation to extend expiry」）、「取消邀請」按鈕（僅 pending 可用）。驗證：取消後狀態變 cancelled、按鈕消失；延長效期後 expires_at 往後推 7 天、expired 變 pending、可再次複製連結；submitted 三個動作皆不出現

## 7. 前端 — 公開候選人填寫頁

- [x] 7.1 新建 `features/public/pages/referral-intake-page/referral-intake-page.component.{ts,html,scss}` 並註冊路由 `/public/referral/:token`（對應 Decision：公開頁路由：`/public/referral/:token` 以 token guard 守門）。驗證：瀏覽 `/public/referral/<dummy>` 可看到頁面骨架
- [x] 7.2 實作 route guard（或 resolver）呼叫 `fetchInvitationByToken`：無效 / 過期 / 已使用時導向 `/public/referral-invalid` 並傳 reason 參數顯示對應訊息（完成需求「Public referral intake page validates token and preloads recommender context」）。驗證：模擬 410 時導向正確、URL 顯示 reason
- [x] 7.3 頁首顯示職缺標題、部門、推薦人姓名、HR 自訂訊息；頁首以 L1 模組色作為視覺標識並套 `@include card`。驗證：視覺比對 Design System
- [x] 7.4 依 `candidates` schema 自行設計 intake 表單欄位（預飛發現：系統內目前無 HR 手動新建候選人表單可復用），MVP 欄位集：`name (必填) / email (readonly, pre-filled from invitation) / phone (必填) / current_company / current_position / experience_years / expected_salary / resume_url`；表單 UX 採 `@include card` 搭配 `@include button-module($color-l1-sage)`。驗證：email 欄位顯示 HR 指定值且 readonly；必填欄位未填時送出按鈕 disabled
- [x] 7.5 送出呼叫 `submitIntake`：成功導向 `/public/referral-success` 顯示感謝訊息與「請留意 HR 聯繫」；失敗 409 時顯示「您已應徵過此職缺」並引導聯絡 HR。驗證：手動模擬 409 情境看到引導文案
- [x] 7.6 建立 `/public/referral-invalid` 與 `/public/referral-success` 兩個靜態狀態頁。驗證：兩頁皆可直接瀏覽並呈現正確訊息

## 8. 前端 — 候選人列表來源標籤

- [x] 8.1 在 `features/employee/pages/candidates-page/candidates-page.component.html` 的列表欄位新增「來源」欄，以 `@include status-badge` 呈現 `reg_source`：referral（L1 鼠尾草綠）/ 104（品牌橘）/ manual（中性灰）/ other；完成需求「Candidate list displays referral source with recommender details」。驗證：不同來源顯示對應顏色
- [x] 8.2 對 `reg_source='referral'` 的列 hover 時以 tooltip 顯示 `source_detail.recommender_name` 與 `recommender_employee_no`；其他來源無 tooltip。驗證：hover 看到推薦人姓名與員編
- [x] 8.3 在 candidates-page 服務層確認載入時帶回 `reg_source` 與 `source_detail`；型別加入 `Candidate.sourceDetail` 欄位（nullable）。驗證：`npx tsc --noEmit` 通過

## 9. 權限、測試與收尾驗證

- [x] 9.1 於 `server/src/config/permissions.js`（或等效設定）確認 `L1.recruitment.edit / view` 已包含內推相關端點；HR 端 routes 以 `requireFeaturePerm` 掛載。驗證：整合測試模擬 view 僅能 list、edit 才能發起／取消
- [ ] 9.2 撰寫後端整合測試 `server/src/tests/test-recruitment-referrals.js`：涵蓋成功邀請（驗證 response 含絕對 URL referralLink）/ 員編無效（離職員工被拒，用 `employees.status='terminated'` 建資料）/ 重複 pending（UNIQUE 部分索引生效）/ 取消 / renew 延長（pending 與 expired 兩分支，驗 expired→pending 且 referralLink 含同一 token）/ token 過期自動轉 expired / token 重用被拒 / 候選人重複 email（409 + 邀請標 cancelled+duplicate）；每個場景對應 spec 中的 requirement（含完整流程斷言）
- [ ] 9.3 撰寫 Angular 元件 spec：`referral-invitation-modal.component.spec.ts`（表單驗證與員編預覽 debounce 行為）、`referral-intake-page.component.spec.ts`（guard 導向與提交成功）。驗證：`npm test -- --watch=false` 通過
- [x] 9.4 執行 `/verify` 技能：`npx tsc --noEmit`、`npx ng build --configuration=development`、後端 integration test 全綠、新建租戶驗證遷移兩份清單一致（對應 CLAUDE.md「雙遷移清單同步」防護規則）。驗證：`/verify` 回報全部通過
- [x] 9.5 `/seed-verify` 確認 demo 租戶示範資料可選擇既有員工作為推薦人員編（employee_no 需存在）。驗證：demo 帳號可完整走過一次內推流程
- [ ] 9.6 產出操作手冊片段（README 或 docs）：說明 HR 如何發起內推、候選人收信後的操作、取消邀請流程。驗證：PM 閱讀後能獨立操作一次
