# 候選人→員工→使用者帳號 自動串連 — 手動測試指南

> **功能分支**：`feature/candidate-employee-user-linking`
> **最後更新**：2026-03-07
> **相關文件**：[design.md](./design.md) ｜ [tasks.md](./tasks.md) ｜ [test-candidate-user-linking.js](../../../server/src/tests/test-candidate-user-linking.js) ｜ [e2e-candidate-user-linking.py](../../../server/src/tests/e2e-candidate-user-linking.py)

---

## 目錄

1. [測試環境準備](#1-測試環境準備)
2. [場景 A：候選人轉換 + 自動建帳](#2-場景-a候選人轉換--自動建帳)
3. [場景 B：首次登入強制改密碼](#3-場景-b首次登入強制改密碼)
4. [場景 C：改密碼後正常登入](#4-場景-c改密碼後正常登入)
5. [場景 D：重複帳號保護](#5-場景-d重複帳號保護)
6. [場景 E：非致命模式 — 帳號建立失敗不影響員工建立](#6-場景-e非致命模式--帳號建立失敗不影響員工建立)
7. [場景 F：改密碼驗證邏輯](#7-場景-f改密碼驗證邏輯)
8. [自動化測試參考](#8-自動化測試參考)
9. [已知限制與注意事項](#9-已知限制與注意事項)

---

## 1. 測試環境準備

### 啟動服務

```bash
# Terminal 1 — 後端 API 伺服器
cd bombus-system/server && npm run dev
# → 啟動於 http://localhost:3001

# Terminal 2 — 前端開發伺服器
cd bombus-system && npm start
# → 啟動於 http://localhost:4200
```

### 測試帳號

| 角色 | 租戶代碼 | Email | 密碼 |
|------|---------|-------|------|
| Admin（HR） | `demo` | `admin@demo.com` | `admin123` |
| 新員工 | `demo` | （轉換時由候選人 email 決定） | （初始密碼 = email） |

### 前置條件

- [x] `demo` 租戶已初始化（`cd bombus-system/server && npm run init-db`）
- [x] 至少有一個候選人處於 `offer_accepted` 狀態（可透過招聘模組手動建立，或使用 seed 端點）
- [x] 至少有一個部門存在（用於轉換 Modal 選擇）

### 快速建立測試候選人（API Seed）

如果沒有 `offer_accepted` 候選人，可透過 API 快速建立：

```bash
# 1. 取得 Admin Token
TOKEN=$(curl -s http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"admin123","tenant_slug":"demo"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Seed 一個 offer_accepted 候選人
curl -X POST http://localhost:3001/api/hr/onboarding/test/seed-candidate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"王小明","email":"xiaoming.wang@example.com"}'
```

> **注意**：`test/seed-candidate` 端點僅供測試用途，生產環境應移除。

---

## 2. 場景 A：候選人轉換 + 自動建帳

**目的**：驗證 HR 將候選人轉換為員工時，系統自動建立使用者帳號並指派角色。

### 操作步驟

1. 以 `admin@demo.com` 登入（租戶代碼：`demo`）
2. 從側邊欄導航到 **員工管理 → 入職管理**（`/employee/onboarding`）
3. 在「入職進度」Tab 找到狀態為 **待入職** 的候選人
4. 點擊該候選人的 **「啟動入職」** 按鈕
5. 在轉換 Modal 中填寫：
   - **部門**：選擇一個可用部門（如「工程部」）
   - **職等**：選擇一個職等
   - **職位**：填寫或選擇職位（如「前端工程師」）
   - **職稱**：填寫（如「資深前端工程師」）
   - **到職日**：選擇一個未來日期
   - **試用期**：（選填）如3個月
6. 點擊 **「確認轉入」**

### 預期結果

| # | 檢查項目 | 預期行為 |
|---|---------|---------|
| A1 | 轉換成功畫面 | Modal 顯示 ✅ 成功畫面，包含員工編號（如 `EMP-001`） |
| A2 | 帳號資訊區塊 | 成功畫面顯示「系統帳號資訊」區塊 |
| A3 | 登入信箱 | 顯示候選人 email 作為登入帳號 |
| A4 | 密碼提示 | 顯示「預設密碼為登入信箱」或類似提示（不直接顯示密碼） |
| A5 | 首次登入提醒 | 顯示「首次登入需變更密碼」提示 |
| A6 | 預設角色 | 顯示指派角色為 `employee` |
| A7 | org_unit 自動匹配 | 如選擇的部門名稱在 org_units 中有對應，自動匹配；否則顯示手動選擇下拉 |

### 截圖參考點

- 轉換 Modal 填寫完成狀態
- 轉換成功畫面（含帳號資訊區塊）

---

## 3. 場景 B：首次登入強制改密碼

**目的**：驗證新員工首次登入時被強制導向改密碼頁面。

### 前置條件

- 場景 A 已完成（已建立新員工帳號）

### 操作步驟

1. **登出** Admin 帳號（或開啟無痕視窗）
2. 在登入頁面輸入：
   - **租戶代碼**：`demo`
   - **Email**：場景 A 中候選人的 email（如 `xiaoming.wang@example.com`）
   - **密碼**：與 email 相同（如 `xiaoming.wang@example.com`）
3. 點擊 **「登入」**

### 預期結果

| # | 檢查項目 | 預期行為 |
|---|---------|---------|
| B1 | 登入成功 | 不顯示登入錯誤訊息 |
| B2 | 導向改密碼頁 | 自動導向 `/change-password`（**不是** `/dashboard`） |
| B3 | 首次登入提示 | 頁面顯示醒目提示：「首次登入，請變更密碼後才能繼續使用系統」或類似文字 |
| B4 | 表單欄位 | 顯示三個密碼欄位：目前密碼、新密碼、確認新密碼 |
| B5 | 按鈕禁用 | 在欄位未填滿或驗證未通過前，「變更密碼」按鈕為禁用狀態 |

### 截圖參考點

- 改密碼頁面（含首次登入提示）

---

## 4. 場景 C：改密碼後正常登入

**目的**：驗證密碼變更成功後，新密碼生效且不再被強制改密碼。

### 前置條件

- 場景 B 已完成（已導向改密碼頁面）

### 操作步驟

1. 在改密碼頁面填寫：
   - **目前密碼**：候選人 email（如 `xiaoming.wang@example.com`）
   - **新密碼**：一個符合要求的新密碼（≥ 8 字元，如 `MyNewP@ss123`）
   - **確認新密碼**：與新密碼相同
2. 點擊 **「變更密碼」**
3. 觀察導向行為
4. **登出**
5. 用**新密碼**重新登入
6. 用**舊密碼（email）**嘗試登入

### 預期結果

| # | 檢查項目 | 預期行為 |
|---|---------|---------|
| C1 | 成功通知 | 顯示成功通知（如 Toast 或 Notification） |
| C2 | 導向 Dashboard | 自動導向 `/dashboard`（不是停留在改密碼頁） |
| C3 | 新密碼登入 | 用新密碼登入成功，直接進入 `/dashboard` |
| C4 | 不再強制改密碼 | 登入後**不再**被導向 `/change-password` |
| C5 | 舊密碼失效 | 用舊密碼（email）登入失敗，顯示錯誤訊息 |

### 截圖參考點

- 改密碼成功後的 Dashboard 畫面
- 舊密碼登入失敗的錯誤訊息

---

## 5. 場景 D：重複帳號保護

**目的**：驗證當候選人 email 與已存在的使用者帳號重複時，系統不會建立重複帳號。

### 前置條件

- 場景 A 已完成（已有一個使用者帳號）
- 需要另一個使用相同 email 的 `offer_accepted` 候選人

### 操作步驟

1. 使用 Seed API 建立一個 email 與現有帳號相同的候選人：
   ```bash
   curl -X POST http://localhost:3001/api/hr/onboarding/test/seed-candidate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"name":"王小明（二次入職）","email":"xiaoming.wang@example.com"}'
   ```
2. 以 Admin 登入，到入職管理頁面
3. 對新建的候選人執行「啟動入職」→ 填寫資料 → 確認轉入

### 預期結果

| # | 檢查項目 | 預期行為 |
|---|---------|---------|
| D1 | 員工建立成功 | 轉換成功，生成新的員工編號 |
| D2 | 帳號已連結提示 | 成功畫面的帳號資訊區塊顯示「已連結既有帳號」或類似提示 |
| D3 | 無重複帳號 | 資料庫中不會出現兩筆相同 email 的 users 記錄 |
| D4 | employee_id 更新 | 既有帳號的 `employee_id` 已更新為新員工的 ID |

---

## 6. 場景 E：非致命模式 — 帳號建立失敗不影響員工建立

**目的**：驗證即使帳號建立失敗，員工記錄仍成功建立。

> **說明**：此場景在正常環境下難以手動觸發（需要模擬資料庫錯誤），主要由自動化測試覆蓋。手動測試時可透過以下方式驗證設計理念。

### 驗證方式

透過後端整合測試確認非致命模式邏輯：

```bash
cd bombus-system/server && node src/tests/test-candidate-user-linking.js
```

### 設計說明

- 轉換 API 的回傳結構中，`user_account` 欄位可能有三種形態：
  1. **成功建帳**：`{ user_id, email, must_change_password: true, default_role: 'employee' }`
  2. **連結既有帳號**：`{ email, already_existed: true }`
  3. **建帳失敗**：`{ error: '...' }`
- 無論 `user_account` 結果如何，`employee_id` 和 `employee_no` 一定會回傳

---

## 7. 場景 F：改密碼驗證邏輯

**目的**：驗證改密碼 API 的各種邊界條件與錯誤處理。

### 前置條件

- 有一個已登入的使用者帳號（可用場景 B 的新員工帳號）

### 測試案例

| # | 操作 | 預期結果 |
|---|------|---------|
| F1 | 不輸入任何欄位，直接送出 | 按鈕為禁用狀態，無法送出 |
| F2 | 新密碼少於 8 字元（如 `1234567`） | 顯示錯誤提示：「新密碼至少需要 8 個字元」 |
| F3 | 新密碼與確認密碼不一致 | 顯示錯誤提示：「兩次輸入的密碼不一致」，按鈕禁用 |
| F4 | 新密碼與目前密碼相同 | 送出後顯示錯誤：「新密碼不能與目前密碼相同」 |
| F5 | 目前密碼輸入錯誤 | 送出後顯示錯誤：「目前密碼錯誤」 |
| F6 | 所有欄位正確填寫 | 密碼變更成功，導向 Dashboard |

### API 層驗證（可選，使用 curl）

```bash
# 取得新員工 Token（使用場景 C 設定的新密碼）
NEW_TOKEN=$(curl -s http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"xiaoming.wang@example.com","password":"MyNewP@ss123","tenant_slug":"demo"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# F2: 新密碼太短
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -d '{"current_password":"MyNewP@ss123","new_password":"1234567","tenant_slug":"demo"}'
# 預期: 400 {"error":"新密碼至少需要 8 個字元"}

# F4: 新舊密碼相同
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -d '{"current_password":"MyNewP@ss123","new_password":"MyNewP@ss123","tenant_slug":"demo"}'
# 預期: 400 {"error":"新密碼不能與目前密碼相同"}

# F5: 目前密碼錯誤
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -d '{"current_password":"wrongpassword","new_password":"AnotherP@ss456","tenant_slug":"demo"}'
# 預期: 401 {"error":"目前密碼錯誤"}

# 無 Token
curl -X POST http://localhost:3001/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"current_password":"test","new_password":"test12345","tenant_slug":"demo"}'
# 預期: 401 未授權
```

---

## 8. 自動化測試參考

本功能有兩套自動化測試，可搭配手動測試使用：

### 後端整合測試（36 assertions）

```bash
cd bombus-system/server && node src/tests/test-candidate-user-linking.js
```

**涵蓋範圍**：

| Part | 說明 | Assertions |
|------|------|-----------|
| A | 端點正常性（pending-conversions, org-units, departments, must_change_password 欄位） | 5 |
| B | 轉換流程 — seed → convert → user_account → 重複防護 | 12 |
| C | 首次登入 — must_change_password 攔截 + employee 角色 | 3 |
| D | 改密碼端點 — 缺欄位 / 太短 / 新舊相同 / 舊密碼錯 / 成功 | 6 |
| E | 改密碼後登入 — 舊密碼失敗 + 新密碼成功 + flag 清除 | 3 |
| F | convert-candidate 必填欄位 + 不存在候選人 | 2 |
| G | org-units 端點結構驗證 | 5 |
| H | change-password 無 Token 被拒絕 | 1 |

### Playwright E2E 測試（25 assertions）

```bash
cd bombus-system/server && python3 src/tests/e2e-candidate-user-linking.py
```

> **前提**：需安裝 Playwright（`pip3 install playwright && python3 -m playwright install chromium`），且前後端服務皆已啟動。

**涵蓋範圍**：

| Part | 說明 | Assertions |
|------|------|-----------|
| A | Admin 登入 → Dashboard | 1 |
| B | 導航到入職管理頁面 | 2 |
| C | 找到候選人 → 啟動入職 | 2 |
| D | 轉換 Modal 填寫 → 提交 → 成功畫面 + 帳號資訊 | 11 |
| E | 登出 → 新員工登入 → 導向 /change-password | 3 |
| F | 變更密碼 → 導向 Dashboard | 2 |
| G | 新密碼重新登入 → 直接進 Dashboard | 2 |
| H | 舊密碼登入失敗 | 2 |

---

## 9. 已知限制與注意事項

### 設計限制

| 項目 | 說明 |
|------|------|
| 初始密碼策略 | 使用候選人 email 作為初始密碼，安全性較低。由 `must_change_password` 強制改密碼機制緩解。 |
| Email 通知 | 系統尚未整合 email 服務，HR 需口頭或其他方式告知新員工帳號密碼。 |
| 批量轉換 | 不支援批量轉換，每次只能轉換一位候選人。 |
| Token 過期 | 若在改密碼頁面停留超過 15 分鐘（Access Token 過期），將被導回登入頁。重新登入後會再次導向改密碼頁。 |

### 測試注意事項

| 項目 | 說明 |
|------|------|
| Rate Limit | 頻繁登入可能觸發 auth rate limit（預設 100 次/15分鐘）。可透過 `server/.env` 的 `AUTH_RATE_LIMIT` 調高。 |
| Seed 端點 | `POST /api/hr/onboarding/test/seed-candidate` 為測試專用，生產環境部署前應移除。 |
| Demo 資料 | 測試會在 demo 租戶資料庫中建立額外記錄（員工、使用者），不影響其他租戶。 |
| 瀏覽器快取 | 測試登出/登入場景時，建議使用無痕模式或手動清除 localStorage，避免殘留的認證資訊影響測試結果。 |

---

## 測試紀錄範本

測試人員可複製以下表格記錄測試結果：

| 場景 | 測試日期 | 測試人員 | 結果 | 備註 |
|------|---------|---------|------|------|
| A — 候選人轉換 + 自動建帳 | | | ⬜ Pass / ⬜ Fail | |
| B — 首次登入強制改密碼 | | | ⬜ Pass / ⬜ Fail | |
| C — 改密碼後正常登入 | | | ⬜ Pass / ⬜ Fail | |
| D — 重複帳號保護 | | | ⬜ Pass / ⬜ Fail | |
| E — 非致命模式 | | | ⬜ Pass / ⬜ Fail | |
| F — 改密碼驗證邏輯 | | | ⬜ Pass / ⬜ Fail | |
