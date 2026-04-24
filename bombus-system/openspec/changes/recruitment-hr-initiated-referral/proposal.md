## Why

目前候選人只能由 HR 手動建檔或從 104 同步匯入，公司內部員工的人脈無法透過系統正式轉化為招募來源。依《現況與問題比對分析_20260406》D-05 指出，業主希望建立內部推薦機制，讓 HR 可以在系統內代表特定職缺發起內推邀請，並由被推薦的候選人自行填寫履歷，縮短 HR 與候選人之間的往返、正式紀錄推薦人資訊以利後續追蹤。

此變更先落實「HR 代發起」的最小可用版本（對應 D-04 UUID 連結機制 + D-05 內推流程），採「系統產生連結、HR 自行分享」模式（與既有 4 種 token 一致），為未來員工自助內推、官網自薦（D-06）預留共用的 token 與公開頁基礎建設。

## What Changes

### L1 招募模組新增「內部推薦」流程（核心）

- **職缺詳情頁新增「發起內推」動作**：[jobs-page](src/app/features/employee/pages/jobs-page/jobs-page.component.ts) 為每筆職缺提供「發起內推」按鈕，打開專屬 Modal。
- **HR 內推 Modal**：新元件 `features/employee/components/referral-invitation-modal/`，必填欄位：
  - 推薦人員編（`recommender_employee_no`）— 驗證該員編在當前租戶 `employees` 表存在且狀態為在職
  - 候選人 email — 驗證格式；檢查該 email 在此職缺下是否已存在「進行中」的邀請或候選人紀錄（避免重複邀請）
  - 自訂備註（可選，會併入邀請信內文）
- **候選人專屬填寫頁**：新公開頁 `features/public/pages/referral-intake-page/:token`，無須登入，提交後導向感謝頁。表單欄位基於 `candidates` schema 自行設計（MVP 最小可用集）：姓名 / email (readonly) / 電話 / 目前公司 / 目前職稱 / 工作年資 / 期望薪資 / 履歷連結或檔案。
- **邀請連結取得與分享（採既有 token pattern）**：API 建立邀請後直接回傳 `referralLink = '/public/referral/:token'`，HR 在 Modal 內以「複製連結」按鈕將連結送到剪貼簿，由 HR 透過 email/IM 自行傳給候選人。與 [recruitment.js:918-925](src/../server/src/routes/recruitment.js#L918) 的 `responseLink` 既有 pattern 一致；系統不寄送 email。
- **候選人提交後狀態追蹤（取代主動通知）**：候選人送出表單後邀請 `status` 變為 `submitted`，HR 下次開啟職缺的內推列表即可看到狀態變化；候選人自動出現在候選人列表（`reg_source='referral'`）。推薦人通知留給 HR 後續手動告知或 Phase 2 在建立 in-app 通知系統時一併補。
- **候選人來源標記**：候選人成功建立後，`candidates.reg_source = 'referral'`、`source_detail` 記錄推薦人員編與 `referral_invitations.id`，以便未來篩選與推薦統計。
- **候選人列表顯示「內推」來源標籤**：[candidates-page](src/app/features/employee/pages/candidates-page/) 依 `reg_source` 顯示色彩標籤（內推／104／其他），hover 顯示推薦人姓名與員編。

### 資料模型

新增 `referral_invitations` 表（tenant schema；對齊既有 `jobs` / `candidates` / `employees` 使用 `TEXT PRIMARY KEY` + UUID 字串慣例）：
- `id` TEXT PRIMARY KEY（UUIDv4）
- `token` TEXT UNIQUE NOT NULL（UUIDv4，候選人專屬連結使用）
- `job_id` TEXT NOT NULL FK → `jobs.id`
- `recommender_employee_id` TEXT NOT NULL FK → `employees.id`
- `candidate_email` TEXT NOT NULL（HR 邀請時輸入的 email，用於去重；候選人提交時 email 鎖定為此值不可改）
- `status` TEXT NOT NULL（`pending` / `submitted` / `expired` / `cancelled`）
- `custom_message` TEXT（HR 自訂備註，於候選人填寫頁頂顯示）
- `expires_at` TEXT NOT NULL（預設邀請發出後 7 天）
- `submitted_at` TEXT（候選人送出表單時間）
- `submitted_candidate_id` TEXT FK → `candidates.id`（送出後關聯的候選人紀錄）
- `created_by` TEXT FK → `employees.id`（發起此邀請的 HR）
- `created_at` / `updated_at`
- UNIQUE(job_id, candidate_email) WHERE status='pending' 部分索引避免同職缺同 email 重複 pending 邀請

`candidates` 表擴充：
- `source_detail` TEXT（JSON，內推時存 `{ invitation_id, recommender_employee_no, recommender_name }`）

### API 端點

- **HR 端**（需 `L1.recruitment.edit` 權限 + 租戶隔離）：
  - `POST /api/recruitment/referrals` 發起邀請
  - `GET /api/recruitment/referrals?job_id=&status=` 列出此職缺的內推邀請（追蹤用）
  - `POST /api/recruitment/referrals/:id/cancel` 取消未送出的邀請
  - `POST /api/recruitment/referrals/:id/renew` 延長邀請（重設 `expires_at = now + 7 days`，維持原 token，回傳刷新後的 `referralLink` 供 HR 重新複製分享）
- **公開端**（免登入、透過 token）：
  - `GET /api/public/referrals/:token` 驗證 token 有效並回傳職缺摘要 + 推薦人姓名
  - `POST /api/public/referrals/:token/submit` 候選人提交表單，建立 `candidates` 紀錄，更新邀請狀態為 `submitted` 並觸發通知

## Non-Goals

- **系統自動寄送 Email**：系統內目前沒有 email 寄送基礎建設（無 nodemailer / SMTP 配置），且既有 4 種 token（面試邀約/取消、面試表單、offer 回覆）皆採「API 回傳連結、HR 自行分享」模式，本變更對齊此 pattern；email 寄送整合為獨立議題，未來可另行變更統一處理。
- **自動通知 HR / 推薦人**：候選人提交後不主動通知，HR 從內推列表查看狀態；推薦人通知留待 Phase 2 建立 in-app 通知系統時一併補。
- **員工自助發起內推**：本次只做 HR 代發起，員工自行發起內推的介面待後續變更。
- **官網自薦（D-06）**：對應公開應徵流程單獨提案。
- **外部 API 給官網串接（D-04 第 3 條）**：本次只做內推通道的 token，外部網站串接留給 D-06。
- **內推獎勵制度**：不處理獎金計算、發放流程。
- **多平台同步發布（D-02）**：不在本變更範圍，另行 `job-multi-platform-publishing` 處理。
- **排程引擎（D-03）**：不建立 cron / job queue。
- **CAPTCHA 與防爬**：公開頁以「需持有有效 token」即可進入作為唯一守門，不加 CAPTCHA（內推是定向邀請，非公開表單）。

## Capabilities

### New Capabilities

- `recruitment-referral`: HR 代發起內推邀請、候選人透過 token 連結自助填寫履歷、完成後通知相關人員並將來源標記為「內推」的完整流程。

### Modified Capabilities

(無 — 本變更不修改既有規格的行為)

## Impact

- **受影響模組 / 路由**：
  - L1 招募 (`/employee/jobs`, `/employee/candidates`)
  - 新增公開路由 `/public/referral/:token`
- **受影響程式碼**：
  - 前端新增：`features/employee/components/referral-invitation-modal/`、`features/public/pages/referral-intake-page/`、`features/public/pages/referral-invalid-page/`、`features/public/pages/referral-success-page/`
  - 前端修改：`features/employee/pages/jobs-page/`（新增「發起內推」按鈕）、`features/employee/pages/candidates-page/`（來源標籤）、`features/public/public.routes.ts`（註冊新路由）
  - 後端新增：`server/src/routes/recruitment-referrals.js`、`server/src/routes/public-referrals.js`
  - 後端修改：`server/src/db/tenant-schema.js`（新表 + 候選人欄位）、`server/src/db/tenant-db-manager.js`（遷移清單）、`server/src/app.js`（路由註冊）
- **相依系統**：
  - 既有 token 一次性驗證 pattern（recruitment.js 各 token 端點共通寫法）
  - 既有 `FRONTEND_URL` env 變數（用於組出絕對 `referralLink` 供 HR 複製分享）
- **DB 遷移**：需同步更新 tenant-schema 的 `initTenantSchema` 與 tenant-db-manager 的 `_runMigrations`（既有租戶自動套用新表與欄位）。
