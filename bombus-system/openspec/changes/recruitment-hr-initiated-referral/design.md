## Context

Bombus 招募模組目前候選人來源僅有兩種：HR 手動建檔、104 API 同步匯入。內部員工人脈無法透過系統正式轉化為招募來源，也缺乏追蹤「推薦人 ↔ 候選人」關聯以供後續統計（如推薦成效、獎金計算）的資料結構。

既有基礎設施已具備實作此變更的條件：

- **Token + 連結分享 pattern**：[server/src/routes/recruitment.js](server/src/routes/recruitment.js) 已實作 4 種一次性 token（responseToken / cancelToken / formToken / offer responseToken），皆採「API 產生 token → 回傳 `responseLink` 字串 → HR 自行將連結傳給候選人 → 候選人於公開頁填寫」模式（非系統寄信）。例如 [recruitment.js:918-925](server/src/routes/recruitment.js#L918) 明確註解 `'HR can share the response link with candidate.'`。本變更沿用此模式。
- **公開頁 pattern**：[features/public/](src/app/features/public/) 已有不需登入的 Angular standalone 頁面範例（`interview-response/:token`、`offer-response/:token` 等）與統一的 `public.routes.ts` 路由檔。
- **候選人來源欄位**：`candidates.reg_source` 已存在（[tenant-schema.js:614](server/src/db/tenant-schema.js#L614)），本次新增 `source_detail` 延伸欄位而非重建結構。
- **主要實體 PK 型別**：`jobs.id` / `candidates.id` / `employees.id` 皆為 `TEXT PRIMARY KEY`（UUID 字串），新表 `referral_invitations` 沿用此慣例。
- **員工在職判定**：employees 表的在職欄位是 `employees.status TEXT DEFAULT 'active'`（非 `employment_status`）。

此設計沿用既有模式，只在必要處新增元件與表，避免引入新的架構概念。

## Goals / Non-Goals

**Goals:**

- 讓 HR 可從職缺詳情頁一鍵發起內部推薦邀請，在系統內完成「選職缺 → 指定推薦人 → 取得候選人專屬連結」的動作。
- 讓被推薦的候選人透過 HR 分享的連結進入專屬公開頁，自助填寫履歷。
- 候選人以 `reg_source='referral'` 標記並保留 `recommender_employee_id` 關聯；HR 可於內推列表查看 `pending → submitted` 狀態變化。
- 為未來員工自助發起內推（D-05 擴充）、官網自薦（D-06）、推薦獎勵統計預留資料結構。

**Non-Goals:**

- **系統自動寄送 Email**：倉庫無 nodemailer / SMTP 基礎建設，且既有 4 種 token 皆採「API 回傳連結、HR 分享」模式，本變更對齊此 pattern；email 整合為未來獨立議題。
- **自動通知 HR / 推薦人**：候選人提交後不主動通知，HR 透過內推列表查看狀態變化；推薦人通知延到 Phase 2 建立 in-app 通知系統時一併處理。
- 員工自助發起內推介面（本次僅 HR 代發起）。
- 官網公開應徵流程（D-06）與外部系統 API 串接。
- 推薦獎勵計算、發放、審批流程。
- CAPTCHA 與匿名防爬機制（內推為定向邀請，token 是唯一憑證）。
- 多平台職缺發布（D-02）、排程引擎（D-03）— 另行變更。
- Token 機制重構：維持與既有 4 種 token 一致的「DB 儲存 + 一次性」模式，不抽象為通用 Token Service。

## Decisions

### Token 使用 UUIDv4 儲存於 DB，非 JWT

**決策**：`referral_invitations.token` 欄位儲存 `crypto.randomUUID()` 產生的 UUIDv4 字串（36 字元），透過 DB 查詢驗證有效性。

**理由**：
- 與既有 4 種 token（responseToken/cancelToken/formToken/offer responseToken）實作模式一致，降低維護成本。
- DB-backed token 方便以狀態欄位（`status`、`expires_at`、`submitted_at`）做一次性 + 時效檢查，不需額外 revoke 機制。
- 候選人不需解析 payload，JWT 的自包含優勢在此場景無實益。
- 支援未來「HR 手動取消邀請」需求，只需 UPDATE status，無法對 JWT 達成同等效果。

**替代方案（已否決）**：
- JWT with 7d exp：無法取消；若要支援取消需額外 blacklist 表，等同回到 DB-backed。
- 短亂數 + HMAC：安全強度與 UUIDv4 相當，但需自行管理 key 旋轉，無顯著優勢。

### Token 有效期統一 7 天

**決策**：`expires_at = created_at + 7 days`。與既有 responseToken、offer responseToken 的 7 天一致（recruitment.js:654、:797）。

**理由**：候選人收到邀請後通常不會即時填寫，7 天足以涵蓋週末加繁忙期；過短會增加 HR 重發成本，過長增加 token 流落第三方的曝險窗口。

**Open**：需確認是否提供「HR 延長邀請效期」動作。本次暫不提供，必要時重發新邀請。

### 重複邀請政策：同職缺同 email 僅允許一筆 pending

**決策**：`UNIQUE(job_id, candidate_email) WHERE status = 'pending'` 部分索引阻擋重複 pending 邀請。狀態變為 `submitted` / `cancelled` / `expired` 後，可對同組合發新邀請。

**理由**：避免 HR 或系統誤送多張連結造成候選人困惑與資料重複。已完成或已取消的邀請不應阻擋未來重新邀請（例如同一候選人投遞其他職缺失敗後，下次由不同 HR 再邀請）。

**替代方案**：完全不去重交由前端提醒 — 會在 race condition 下產生兩筆併發邀請，不採用。

### 候選人提交去重：相同 email 已存在時拒絕 + 引導 HR

**決策**：候選人 POST `/api/public/referrals/:token/submit` 時，後端檢查同租戶 `candidates` 表是否存在 `email = 候選人 email AND job_id = invitation.job_id AND active = true`。若存在，回傳 `409 Conflict`，前端顯示「您已應徵過此職缺，請聯絡 HR」，並將 `referral_invitations.status` 標為 `cancelled`（原因：duplicate），同時通知 HR 異常狀況。

**理由**：候選人不應能透過內推通道繞過「重複應徵偵測」；由 HR 介入決定是否合併記錄比自動合併安全。

**替代方案**：自動合併到既有 candidate 並在 `source_detail` 疊加 — 延後處理，第一版寧可保守拒絕。

### 不寄送 Email，採「API 回傳連結 + HR 複製分享」

**決策**：系統不自動寄送任何 email；HR 建立邀請後 API 直接回傳 `referralLink` 字串（`<FRONTEND_URL>/public/referral/<token>`），HR 在 Modal 內按「複製連結」將其送到剪貼簿，自行透過既有溝通管道（email / Slack / IM）傳給候選人。候選人提交後只更新邀請 `status='submitted'`，不發出任何自動通知。

**理由**：
- **對齊既有 pattern**：現有 4 種 token 的 invitation / cancel / form / offer response 皆採此模式（recruitment.js 回傳 `responseLink`），HR 已熟悉此流程。
- **基礎建設缺口**：倉庫目前無 nodemailer / SendGrid / SMTP 配置，`.env.example` 無相關變數；在本變更同時建立 email 基礎建設會讓 scope 膨脹 2-3 天且影響多租戶（租戶 FROM address、寄信失敗重試等）。
- **低頻操作**：內推是 HR 主動行為，HR 本來就會與候選人溝通，多一步「複製貼上」負擔可接受。
- **Phase 2 空間**：未來若建立通用通知服務（email / in-app），可一次性把 4 種既有 token 和內推 token 都升級為自動寄送，無需回頭改本變更。

**影響到的行為**：
- 「候選人提交後通知 HR 與推薦人」：**不做**。HR 透過內推列表查看 `status='submitted'`；推薦人通知延到 Phase 2。
- 邀請建立的 email 失敗 rollback 邏輯：**不需要**。API 只要 DB transaction 成功即回 201。

**替代方案（已否決）**：
- 加入 nodemailer + SMTP：scope 膨脹，且無法驗證 SMTP 可連線會影響 CI。
- 使用第三方 API（SendGrid/Resend）：引入外部依賴，不符合「先小步可用」目標。

### 推薦人員編驗證：僅驗「存在且在職」，不驗職級

**決策**：後端收到 `recommender_employee_no` 後查 `employees` 表：
- 必須存在（同租戶）
- `status` 欄位必須是 `'active'`（在職）— 注意這是 `employees.status`，不是 `employees.employment_status`（後者不存在；候選人表另有 `candidates.employment_status` 但語意無關）
- **不限制**職級、部門、是否具招募權限

回傳 `employee_id` 與姓名供前端預覽確認（避免 HR 打錯員編卻不自知）。

**理由**：內推的本質是「員工人脈」，任何在職員工皆應能被推薦；離職員工不應能「追溯」推薦新人。如需進一步限制（例如排除試用期），應在推薦獎勵規則而非發起入口做控管。

### 公開端點以平台級 `public_tokens` 表解析租戶

**決策**：公開端點（`/api/public/referrals/*`）掛在 `authMiddleware` 之外，真正允許未登入訪問。租戶解析透過 platform DB 新增 `public_tokens` 表索引：

```sql
CREATE TABLE public_tokens (
  token TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  resource_type TEXT NOT NULL,   -- 'referral_invitation' 目前僅此類
  resource_id TEXT NOT NULL,     -- 對應 tenant DB 的 referral_invitations.id（觀測用）
  created_at TEXT DEFAULT (datetime('now'))
)
```

建立邀請時同一 transaction 在 tenant DB 插入 `referral_invitations` 並在 platform DB 插入 `public_tokens`。公開端點收到 token 後：
1. Platform DB 查 `public_tokens` → 解出 `tenant_id`，查無則回 410（不洩漏「此 token 是否曾存在」）
2. 用 `tenant_id` 透過 `tenantDBManager.getTenantDB(tenantId)` 載入租戶 DB
3. 走既有 tenant DB 驗證邏輯（狀態、過期、email 鎖定等）

**理由**：
- **候選人不需登入即可使用**：對齊業主需求（候選人收連結自行填寫），修正既有 4 種 token 的「假公開」缺陷（它們目前都還掛在 authMiddleware 下，實際上需要 HR session 才能打通）。
- **統一公開 token 機制**：未來其他公開 token（面試邀約、offer 回覆、官網自薦 D-06）都可走此平台索引，不必為每種 token 新增一個 routing 方案。
- **不洩漏租戶結構**：URL 只含 UUID，候選人不會看到 `tenant_slug`；platform 查不到 token 就當作無效，攻擊者無法列舉租戶。
- **Token 全域唯一性成立**：UUIDv4 碰撞機率可忽略，不需在 primary key 中加 tenant_id。

**生命週期**：
- 建立邀請 → INSERT 一筆 `public_tokens`（與 tenant DB 寫入同一邏輯交易，任一失敗皆 rollback）
- 候選人提交 / HR 取消 / 邀請過期 → **不刪除** platform 紀錄；tenant DB 的 `referral_invitations.status` 才是真實狀態來源。Platform 紀錄僅供「token → tenant 解析」，即使 stale 也不影響正確性。
- 邀請若是 renew（延長）→ 不動 platform 紀錄（token 不變）。

**替代方案（已否決）**：
- URL 嵌 `tenant_slug`（`/public/referral/:tenant_slug/:token`）：候選人可見 slug 違反「不洩漏租戶結構」原則。
- 所有 tenant DB 輪流查：sql.js 開所有 DB 代價高且無索引可用，N 租戶 O(N)。
- 將 tenant_id 編碼進 JWT-like token：需額外 key 管理且無法取消；不如 DB-backed 清楚。

### 公開頁路由：`/public/referral/:token` 以 token guard 守門

**決策**：新增 `features/public/pages/referral-intake-page/`，路由 `/public/referral/:token`，以 Angular route guard 呼叫 `GET /api/public/referrals/:token` 預檢：
- Token 無效 / 已使用 / 已過期 → 導向 `/public/referral-invalid` 頁面顯示對應訊息
- 成功 → 載入職缺摘要 + 推薦人姓名顯示於頁首，呈現既有候選人表單

**理由**：與既有面試回覆、Offer 回覆等公開頁走同一套模式（不需登入、token 即憑證），易於理解與維護。

### HR 可延長並重新取得分享連結（renew 單一動作）

**決策**：提供單一 `POST /api/recruitment/referrals/:id/renew` 端點，在同一 transaction 內：
- 重設 `expires_at = now + 7 days`
- 維持原 token（不產生新 UUID，以免 HR 先前已分享的連結突然失效）
- 若原 status 為 `expired`，重置為 `pending`
- 更新 `updated_at`
- 回傳刷新後的 `referralLink` 供 HR 重新複製分享

**理由**：
- **維持同 token** 讓 HR 之前已分享出去的連結在延長後仍可用（候選人不需收到第二條連結）。
- **HR 主動性**：HR 決定何時延長、是否要重新通知候選人（例如在 IM 上補一句「這個連結再給你 7 天喔」），系統不替 HR 做任何主動行為。
- 與「取消後重新發起（會產生新 token 與新紀錄）」有明確語意差異：renew = 延續同一邀請；cancel + new = 全新邀請，推薦人可能不同。

**限制**：
- 只對 `status='pending'` 或 `expired` 有效；`submitted` / `cancelled` 回 409。
- 不設 renew 次數上限（首版），若日後有濫用再加 rate limit。

**替代方案（已否決）**：
- 分開 `/extend` 與 `/resend` 兩端點：既有 pattern 只有延長需求，無寄信動作可 resend，兩個端點無必要。
- 每次 renew 產生新 token：先前分享出去的連結會失效，HR 必須重新聯繫候選人，UX 差。

### 前端元件：新建內推 Modal，職缺頁加按鈕

**決策**：
- 新建 `referral-invitation-modal.component.ts`（standalone + OnPush + Signal APIs，L1 鼠尾草綠 `$color-l1-primary`）。
- 修改 `jobs-page.component.html` 新增「發起內推」按鈕（於每列操作區），僅對 `status='published'` 的職缺顯示。
- Modal 樣式沿用 `@include card` / `@include button-module($color-l1-primary)`；員編輸入欄支援即時 debounce 驗證顯示推薦人姓名預覽。

**理由**：候選人表單的欄位已在 HR 新建候選人時完整驗證過，公開頁直接復用對應的 `candidate-form.component`（抽共用子元件）而非另寫一套表單，避免兩邊驗證邏輯漂移。

## Risks / Trade-offs

- **[Risk] Email token 被候選人轉寄給第三方後，第三方能搶先填寫並佔用職缺應徵紀錄** → **Mitigation**：邀請信在內文明確標示「此連結僅限您本人使用」；候選人提交後 token 立即作廢（一次性）；候選人 email 雖由 HR 輸入但 HR 可要求推薦人先確認信箱正確性。更高安全性（OTP / 身分證驗證）延後到未來強化。
- **[Risk] 推薦人於邀請發出與候選人提交之間離職** → **Mitigation**：候選人提交時後端再度檢查 `recommender_employee.status`，若已離職仍允許提交（候選人不應因推薦人離職而無法應徵），但在 `source_detail` 註記「推薦人提交時已離職」，供後續獎勵判斷使用。
- **[Risk] 租戶隔離：若 tenant-schema 或 tenant-db-manager 遷移清單只更新一處，新租戶或既有租戶會缺表** → **Mitigation**：`tasks.md` 明列「雙遷移清單同步」為獨立任務，並在 PR 檢查項中要求執行一次新租戶建立測試與 `/api/tenant/run-migrations`。
- **[Risk] HR 忘了把連結傳給候選人 → 邀請形同廢紙** → **Mitigation**：Modal 關閉前強制顯示「複製連結」按鈕並附上「請將連結傳給候選人」提示；職缺內推列表顯示「發起時間」讓 HR 自行追蹤 stale pending；到期前不主動提示（對齊「系統不替 HR 做主動行為」原則）。Phase 2 建立通知系統時可補自動提醒。
- **[Risk] HR 把連結貼錯對象 / 連結被轉發給第三方** → **Mitigation**：邀請連結是 UUIDv4 + 一次性 + 7 天過期，洩漏影響面有限；候選人提交時 email 鎖定為 HR 指定值，第三方無法冒充他人身分應徵；提交後 token 即作廢，不能重複提交。更高安全性（OTP / 身分證驗證）延後到未來強化。
- **[Trade-off] 不引入 token service 抽象 vs 未來 D-06 時要再抽** → 本次刻意保持 inline 實作與既有 4 種 token 一致；待 D-04 / D-06 需要公開外部 API token 時一併重構，避免過早抽象。
- **[Risk] 公開頁直接暴露職缺標題給持 token 第三方** → **Mitigation**：`GET /api/public/referrals/:token` 僅回傳職缺標題、部門、推薦人姓名、自訂訊息，不回傳職缺 JD 全文或薪資範圍。

## Migration Plan

1. 於 `tenant-schema.js` 新增 `referral_invitations` 表與 `candidates.source_detail` 欄位；同步更新 `tenant-db-manager.js` 的 `_runMigrations()` 清單（對既有租戶增量套用）。
2. 部署後首次啟動時，`_runMigrations` 會為所有現存租戶建立新表與欄位。
3. 無資料回填需求（既有候選人 `source_detail = NULL`，行為與未提供相同）。
4. **Rollback 策略**：若需回退，停用前端「發起內推」按鈕 + 下架公開路由即可。新表與欄位保留（DROP 會破壞已建立的內推紀錄），後續版本再決定清理策略。

## Open Questions

_以下問題均已於提案 review 階段由業主拍板，保留於此以利未來追溯。_

- **Q1（已定案：否）**：Email 模板是否支援租戶客製（含公司 LOGO、品牌色）？**決策：首版不支援**，採中性硬編碼模板；若後續租戶有品牌化需求再接入租戶設定。
- **Q2（已定案：是）**：「HR 延長邀請效期」或「重發邀請」動作是否本次提供？**決策：提供**，採單一 `renew` 動作（延長並重寄同一步到位），詳見 Decision「HR 可延長並重寄 pending 邀請（renew 單一動作）」。
- **Q3（已定案：鎖定）**：候選人提交時若輸入的 email 與 HR 邀請時指定的 email 不同（候選人手動改），如何處理？**決策：鎖定 HR 指定 email 不可改**，表單欄位 readonly 並以 HR 邀請時指定值為準。
